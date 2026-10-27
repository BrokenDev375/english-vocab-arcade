-- Explicit API grants for hosted projects with automatic exposure disabled.
-- Older applied migrations are unchanged. RLS remains enabled.
SET search_path = '';
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
REVOKE ALL ON TABLE public.profiles, public.learning_sets, public.vocabulary_cards, public.study_sessions, public.study_attempts, public.study_progress, public.ai_batches, public.ai_usage_daily, public.ai_rate_buckets, public.ai_request_keys FROM PUBLIC, anon, authenticated;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_rate_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_request_keys ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.learning_sets, public.vocabulary_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.learning_sets, public.vocabulary_cards TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.study_sessions, public.study_attempts, public.study_progress, public.ai_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles, public.learning_sets, public.vocabulary_cards, public.study_sessions, public.study_attempts, public.study_progress, public.ai_batches, public.ai_usage_daily, public.ai_rate_buckets, public.ai_request_keys TO service_role;

-- Accounts may already exist in Auth before this application's schema is installed.
INSERT INTO public.profiles (id, display_name)
SELECT id, coalesce(nullif(left(coalesce(raw_user_meta_data->>'display_name',raw_user_meta_data->>'full_name',''),80),''), 'User_' || left(id::text,8))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

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
  IF p_expected_version IS NULL OR p_expected_version < 1 OR p_active_elapsed_ms IS NULL OR p_active_elapsed_ms < 0 OR p_state IS NULL OR jsonb_typeof(p_state) <> 'object' OR (p_status IS NOT NULL AND p_status NOT IN ('active','paused','completed','abandoned')) THEN
    RETURN jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR');
  END IF;
  -- Lock session row for update
  SELECT * INTO v_session
  FROM public.study_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found', 'code', 'NOT_FOUND');
  END IF;

  -- Verify owner
  IF auth.role() IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM v_session.user_id THEN
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
REVOKE ALL ON FUNCTION public.save_session_state_v1(uuid,integer,jsonb,bigint,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_session_state_v1(uuid,integer,jsonb,bigint,text) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
