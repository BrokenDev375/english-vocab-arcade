-- Migration 0003: Study sessions, attempts, progress and atomic RPCs
-- Complies with docs/03-database-and-security.md

SET search_path = '';

-- ==========================================
-- 1. Study Sessions Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  set_id uuid REFERENCES public.learning_sets(id) ON DELETE SET NULL,
  mode text NOT NULL CHECK (mode IN (
    'flashcard', 'learn', 'test', 'match',
    'arcade_typing', 'arcade_recall',
    'dictation', 'speak', 'grammar', 'reading', 'translate'
  )),
  content_revision bigint NOT NULL CHECK (content_revision > 0),
  content_snapshot jsonb NOT NULL,
  ordered_card_ids uuid[] NOT NULL,
  seed text NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  state_version int NOT NULL DEFAULT 1 CHECK (state_version > 0),
  active_elapsed_ms bigint NOT NULL DEFAULT 0 CHECK (active_elapsed_ms >= 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Constraint: Only one active or paused session per (user_id, set_id, mode)
CREATE UNIQUE INDEX IF NOT EXISTS study_sessions_unique_active_idx
  ON public.study_sessions (user_id, set_id, mode)
  WHERE status IN ('active', 'paused');

CREATE INDEX IF NOT EXISTS study_sessions_user_updated_idx
  ON public.study_sessions (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS study_sessions_lookup_idx
  ON public.study_sessions (user_id, set_id, mode, status);

-- ==========================================
-- 2. Study Attempts Table (Idempotent per client_event_id)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.study_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id uuid REFERENCES public.vocabulary_cards(id) ON DELETE SET NULL,
  client_event_id uuid NOT NULL,
  question_key text NOT NULL CHECK (char_length(question_key) <= 160),
  attempt_kind text NOT NULL CHECK (attempt_kind IN ('answer', 'self_rating', 'game_hit', 'game_miss')),
  answer_text text CHECK (answer_text IS NULL OR char_length(answer_text) <= 2000),
  is_correct boolean,
  grade_source text NOT NULL CHECK (grade_source IN ('rule', 'reference_match', 'self_rating', 'ai_feedback')),
  feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
  active_elapsed_ms int NOT NULL DEFAULT 0 CHECK (active_elapsed_ms >= 0 AND active_elapsed_ms <= 600000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_attempts_session_event_unique UNIQUE (session_id, client_event_id)
);

CREATE INDEX IF NOT EXISTS study_attempts_user_created_idx
  ON public.study_attempts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS study_attempts_card_user_idx
  ON public.study_attempts (card_id, user_id);

-- ==========================================
-- 3. Study Progress Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.study_progress (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.vocabulary_cards(id) ON DELETE CASCADE,
  correct_count int NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  incorrect_count int NOT NULL DEFAULT 0 CHECK (incorrect_count >= 0),
  correct_streak int NOT NULL DEFAULT 0 CHECK (correct_streak >= 0),
  mastery text NOT NULL DEFAULT 'new' CHECK (mastery IN ('new', 'learning', 'mastered')),
  due_at timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS study_progress_user_due_idx
  ON public.study_progress (user_id, due_at);

-- ==========================================
-- 4. RLS for Study Tables
-- ==========================================
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;

-- study_sessions: Only own user can SELECT
CREATE POLICY "Users can view own study sessions"
  ON public.study_sessions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- study_attempts: Only own user can SELECT. NO DIRECT INSERT/UPDATE/DELETE!
CREATE POLICY "Users can view own study attempts"
  ON public.study_attempts
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- study_progress: Only own user can SELECT. NO DIRECT INSERT/UPDATE/DELETE!
CREATE POLICY "Users can view own study progress"
  ON public.study_progress
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ==========================================
-- 5. Atomic RPC Functions (SECURITY DEFINER)
-- ==========================================

-- Function: save_session_state_v1 (Optimistic lock + state version check)
CREATE OR REPLACE FUNCTION public.save_session_state_v1(
  p_session_id uuid,
  p_expected_version int,
  p_state jsonb,
  p_active_elapsed_ms bigint,
  p_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session record;
  v_new_status text;
BEGIN
  -- Lock session row for update
  SELECT * INTO v_session
  FROM public.study_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found', 'code', 'NOT_FOUND');
  END IF;

  -- Verify owner
  IF v_session.user_id <> auth.uid() AND auth.role() <> 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied', 'code', 'FORBIDDEN');
  END IF;

  -- Prevent reviving terminal sessions (completed or abandoned)
  IF v_session.status IN ('completed', 'abandoned') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot update completed or abandoned session', 'code', 'TERMINAL_SESSION');
  END IF;

  -- Optimistic version check
  IF v_session.state_version <> p_expected_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Version conflict',
      'code', 'VERSION_CONFLICT',
      'latest_version', v_session.state_version,
      'current_state', v_session.state
    );
  END IF;

  v_new_status := coalesce(p_status, v_session.status);

  UPDATE public.study_sessions
  SET state = p_state,
      state_version = state_version + 1,
      active_elapsed_ms = p_active_elapsed_ms,
      status = v_new_status,
      completed_at = CASE WHEN v_new_status IN ('completed', 'abandoned') THEN now() ELSE completed_at END,
      updated_at = now()
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_version', v_session.state_version + 1,
    'status', v_new_status
  );
END;
$$;

-- Function: record_attempt_v1 (Atomic event check, attempt insert, progress update, version bump)
CREATE OR REPLACE FUNCTION public.record_attempt_v1(
  p_session_id uuid,
  p_user_id uuid,
  p_card_id uuid,
  p_client_event_id uuid,
  p_question_key text,
  p_attempt_kind text,
  p_answer_text text,
  p_is_correct boolean,
  p_grade_source text,
  p_feedback jsonb,
  p_active_elapsed_ms int,
  p_expected_version int,
  p_next_state jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session record;
  v_existing_attempt record;
  v_progress record;
  v_new_streak int;
  v_new_mastery text;
  v_new_due_at timestamptz;
BEGIN
  -- 1. Lock session row
  SELECT * INTO v_session
  FROM public.study_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found', 'code', 'NOT_FOUND');
  END IF;

  -- Verify session user matches
  IF v_session.user_id <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'User mismatch', 'code', 'FORBIDDEN');
  END IF;

  -- 2. Check duplicate event (Idempotency)
  SELECT * INTO v_existing_attempt
  FROM public.study_attempts
  WHERE session_id = p_session_id AND client_event_id = p_client_event_id;

  IF FOUND THEN
    -- Return existing outcome without re-incrementing progress
    RETURN jsonb_build_object(
      'success', true,
      'is_duplicate', true,
      'attempt_id', v_existing_attempt.id,
      'version', v_session.state_version
    );
  END IF;

  -- 3. Version conflict check
  IF v_session.state_version <> p_expected_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Version conflict',
      'code', 'VERSION_CONFLICT',
      'latest_version', v_session.state_version
    );
  END IF;

  -- 4. Insert attempt record
  INSERT INTO public.study_attempts (
    session_id, user_id, card_id, client_event_id,
    question_key, attempt_kind, answer_text, is_correct,
    grade_source, feedback, active_elapsed_ms, created_at
  ) VALUES (
    p_session_id, p_user_id, p_card_id, p_client_event_id,
    p_question_key, p_attempt_kind, p_answer_text, p_is_correct,
    p_grade_source, coalesce(p_feedback, '{}'::jsonb), p_active_elapsed_ms, now()
  );

  -- 5. Update study_progress if this attempt has learning significance (answer or game recall)
  IF p_card_id IS NOT NULL AND p_attempt_kind IN ('answer', 'game_hit', 'game_miss') AND p_is_correct IS NOT NULL THEN
    SELECT * INTO v_progress
    FROM public.study_progress
    WHERE user_id = p_user_id AND card_id = p_card_id
    FOR UPDATE;

    IF NOT FOUND THEN
      -- Create initial progress row
      IF p_is_correct THEN
        v_new_streak := 1;
        v_new_mastery := 'learning';
        v_new_due_at := now() + interval '10 minutes';
      ELSE
        v_new_streak := 0;
        v_new_mastery := 'learning';
        v_new_due_at := now() + interval '10 minutes';
      END IF;

      INSERT INTO public.study_progress (
        user_id, card_id, correct_count, incorrect_count, correct_streak,
        mastery, due_at, last_reviewed_at, updated_at
      ) VALUES (
        p_user_id, p_card_id,
        CASE WHEN p_is_correct THEN 1 ELSE 0 END,
        CASE WHEN p_is_correct THEN 0 ELSE 1 END,
        v_new_streak, v_new_mastery, v_new_due_at, now(), now()
      );
    ELSE
      -- Update existing progress row
      IF p_is_correct THEN
        v_new_streak := v_progress.correct_streak + 1;
        -- Mastered after 4 consecutive correct answers
        IF v_new_streak >= 4 THEN
          v_new_mastery := 'mastered';
          v_new_due_at := now() + interval '14 days';
        ELSE
          v_new_mastery := 'learning';
          v_new_due_at := CASE
            WHEN v_new_streak = 1 THEN now() + interval '10 minutes'
            WHEN v_new_streak = 2 THEN now() + interval '1 day'
            WHEN v_new_streak = 3 THEN now() + interval '3 days'
            ELSE now() + interval '7 days'
          END;
        END IF;

        UPDATE public.study_progress
        SET correct_count = correct_count + 1,
            correct_streak = v_new_streak,
            mastery = v_new_mastery,
            due_at = v_new_due_at,
            last_reviewed_at = now(),
            updated_at = now()
        WHERE user_id = p_user_id AND card_id = p_card_id;
      ELSE
        v_new_streak := 0;
        v_new_mastery := 'learning';
        v_new_due_at := now() + interval '10 minutes';

        UPDATE public.study_progress
        SET incorrect_count = incorrect_count + 1,
            correct_streak = 0,
            mastery = 'learning',
            due_at = v_new_due_at,
            last_reviewed_at = now(),
            updated_at = now()
        WHERE user_id = p_user_id AND card_id = p_card_id;
      END IF;
    END IF;
  END IF;

  -- 6. Bump session state and version if p_next_state is supplied
  IF p_next_state IS NOT NULL THEN
    UPDATE public.study_sessions
    SET state = p_next_state,
        state_version = state_version + 1,
        active_elapsed_ms = active_elapsed_ms + p_active_elapsed_ms,
        updated_at = now()
    WHERE id = p_session_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_duplicate', false,
    'new_version', v_session.state_version + CASE WHEN p_next_state IS NOT NULL THEN 1 ELSE 0 END
  );
END;
$$;

-- Grant execute to service_role, revoke from public/authenticated/anon
REVOKE ALL ON FUNCTION public.record_attempt_v1 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_attempt_v1 TO service_role;

GRANT EXECUTE ON FUNCTION public.save_session_state_v1 TO authenticated, service_role;
