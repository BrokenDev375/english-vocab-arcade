-- Additive migration: applied migrations remain unchanged.
CREATE OR REPLACE FUNCTION public.reserve_ai_batch_v1(
  p_user_id uuid,
  p_set_id uuid,
  p_mode text,
  p_card_ids uuid[],
  p_content_revision bigint,
  p_cache_key text,
  p_prompt_version text,
  p_schema_version text,
  p_lease_token uuid,
  p_daily_limit int DEFAULT 5,
  p_minute_limit int DEFAULT 2
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_batch public.ai_batches%ROWTYPE;
  v_scope text := 'user:' || p_user_id::text;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_minute timestamptz := date_trunc('minute', now());
  v_daily int; v_rate int; v_id uuid; v_existing boolean;
BEGIN
  IF p_daily_limit < 1 OR p_minute_limit < 1 THEN RAISE EXCEPTION 'Invalid quota'; END IF;
  -- Serialize first inserts and retries for the same user, including a new cache key.
  PERFORM pg_advisory_xact_lock(hashtextextended('eva:ai:' || p_user_id::text, 0));
  SELECT * INTO v_batch FROM public.ai_batches WHERE user_id=p_user_id AND cache_key=p_cache_key FOR UPDATE;
  v_existing := FOUND;
  IF v_existing THEN
    IF v_batch.status='ready' THEN RETURN jsonb_build_object('status','ready','batch_id',v_batch.id,'output',v_batch.output,'model_id',v_batch.model_id); END IF;
    IF v_batch.status='pending' AND v_batch.lease_until > now() THEN RETURN jsonb_build_object('status','pending','batch_id',v_batch.id,'retry_after',v_batch.retry_after); END IF;
    IF v_batch.retry_after > now() THEN RETURN jsonb_build_object('status','rate_limited','code','RETRY_COOLDOWN','batch_id',v_batch.id); END IF;
  END IF;
  SELECT reserved_operations INTO v_daily FROM public.ai_usage_daily WHERE scope_key=v_scope AND usage_date=v_today;
  IF NOT v_existing AND coalesce(v_daily,0) >= p_daily_limit THEN RETURN jsonb_build_object('status','quota_exceeded','code','DAILY_QUOTA_EXCEEDED'); END IF;
  SELECT operation_count INTO v_rate FROM public.ai_rate_buckets WHERE scope_key=v_scope AND bucket_start=v_minute;
  IF coalesce(v_rate,0) >= p_minute_limit THEN RETURN jsonb_build_object('status','rate_limited','code','RATE_LIMITED'); END IF;
  INSERT INTO public.ai_rate_buckets(scope_key,bucket_start,operation_count) VALUES(v_scope,v_minute,1)
    ON CONFLICT(scope_key,bucket_start) DO UPDATE SET operation_count=public.ai_rate_buckets.operation_count+1,updated_at=now();
  IF v_existing THEN
    UPDATE public.ai_batches SET status='pending',lease_token=p_lease_token,lease_until=now()+interval '45 seconds',retry_after=now()+interval '50 seconds',updated_at=now() WHERE id=v_batch.id;
    v_id := v_batch.id;
  ELSE
    INSERT INTO public.ai_usage_daily(scope_key,usage_date,reserved_operations) VALUES(v_scope,v_today,1)
      ON CONFLICT(scope_key,usage_date) DO UPDATE SET reserved_operations=public.ai_usage_daily.reserved_operations+1,updated_at=now();
    INSERT INTO public.ai_batches(user_id,set_id,mode,card_ids,content_revision,cache_key,prompt_version,schema_version,status,lease_token,lease_until,retry_after)
      VALUES(p_user_id,p_set_id,p_mode,p_card_ids,p_content_revision,p_cache_key,p_prompt_version,p_schema_version,'pending',p_lease_token,now()+interval '45 seconds',now()+interval '50 seconds') RETURNING id INTO v_id;
  END IF;
  RETURN jsonb_build_object('status','lease_acquired','batch_id',v_id,'lease_token',p_lease_token);
END; $$;

CREATE OR REPLACE FUNCTION public.reserve_ai_provider_call_v1(p_user_id uuid,p_global_daily_limit int DEFAULT 100,p_global_minute_limit int DEFAULT 10,p_user_daily_limit int DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_minute timestamptz := date_trunc('minute',now());
  v_user text := 'user:' || p_user_id::text;
  v_global int; v_personal int; v_rate int;
BEGIN
  IF least(p_global_daily_limit,p_global_minute_limit,p_user_daily_limit)<1 THEN RAISE EXCEPTION 'Invalid provider budget'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('eva:provider:gemini',0));
  SELECT reserved_calls INTO v_global FROM public.ai_usage_daily WHERE scope_key='provider:gemini' AND usage_date=v_today;
  SELECT reserved_calls INTO v_personal FROM public.ai_usage_daily WHERE scope_key=v_user AND usage_date=v_today;
  SELECT operation_count INTO v_rate FROM public.ai_rate_buckets WHERE scope_key='provider:gemini' AND bucket_start=v_minute;
  IF coalesce(v_global,0)>=p_global_daily_limit OR coalesce(v_personal,0)>=p_user_daily_limit OR coalesce(v_rate,0)>=p_global_minute_limit THEN
    RETURN jsonb_build_object('success',false,'code','PROVIDER_BUDGET_EXCEEDED');
  END IF;
  INSERT INTO public.ai_usage_daily(scope_key,usage_date,reserved_calls) VALUES('provider:gemini',v_today,1),(v_user,v_today,1)
    ON CONFLICT(scope_key,usage_date) DO UPDATE SET reserved_calls=public.ai_usage_daily.reserved_calls+1,updated_at=now();
  INSERT INTO public.ai_rate_buckets(scope_key,bucket_start,operation_count) VALUES('provider:gemini',v_minute,1)
    ON CONFLICT(scope_key,bucket_start) DO UPDATE SET operation_count=public.ai_rate_buckets.operation_count+1,updated_at=now();
  RETURN jsonb_build_object('success',true);
END; $$;
REVOKE ALL ON FUNCTION public.reserve_ai_provider_call_v1 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_provider_call_v1 TO service_role;
REVOKE ALL ON FUNCTION public.reserve_ai_batch_v1 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_batch_v1 TO service_role;

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

  IF v_session.status IN ('completed','abandoned') THEN
    RETURN jsonb_build_object('success',false,'code','SESSION_TERMINATED');
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
  IF v_session.mode <> 'arcade_typing' AND p_card_id IS NOT NULL AND p_attempt_kind IN ('answer', 'game_hit', 'game_miss') AND p_is_correct IS NOT NULL THEN
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

  IF p_next_state IS NULL THEN
    UPDATE public.study_sessions SET active_elapsed_ms=active_elapsed_ms+p_active_elapsed_ms,updated_at=now() WHERE id=p_session_id;
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
