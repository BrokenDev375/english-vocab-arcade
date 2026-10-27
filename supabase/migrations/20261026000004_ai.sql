-- Migration 0004: AI batches, quota buckets, idempotency keys, and atomic lease RPCs
-- Complies with docs/03-database-and-security.md

SET search_path = '';

-- ==========================================
-- 1. AI Batches Table (Persistent Cache per User)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ai_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  set_id uuid NOT NULL REFERENCES public.learning_sets(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('context', 'grammar', 'reading', 'translation')),
  card_ids uuid[] NOT NULL,
  content_revision bigint NOT NULL CHECK (content_revision > 0),
  cache_key text NOT NULL,
  prompt_version text NOT NULL,
  schema_version text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
  lease_until timestamptz,
  lease_token uuid,
  retry_after timestamptz,
  output jsonb,
  model_id text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_batches_user_cache_key_unique UNIQUE (user_id, cache_key)
);

CREATE INDEX IF NOT EXISTS ai_batches_user_created_idx
  ON public.ai_batches (user_id, created_at DESC);

-- ==========================================
-- 2. Daily Quota Tracking (Atomic)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  scope_key text NOT NULL,
  usage_date date NOT NULL,
  reserved_calls int NOT NULL DEFAULT 0 CHECK (reserved_calls >= 0),
  reserved_operations int NOT NULL DEFAULT 0 CHECK (reserved_operations >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_key, usage_date)
);

-- ==========================================
-- 3. Rate Limit Buckets (1-Minute UTC Buckets)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ai_rate_buckets (
  scope_key text NOT NULL,
  bucket_start timestamptz NOT NULL,
  operation_count int NOT NULL DEFAULT 0 CHECK (operation_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_key, bucket_start)
);

-- ==========================================
-- 4. Idempotency Request Keys
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ai_request_keys (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  batch_id uuid REFERENCES public.ai_batches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, idempotency_key)
);

-- ==========================================
-- 5. RLS Policies
-- ==========================================
ALTER TABLE public.ai_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_rate_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_request_keys ENABLE ROW LEVEL SECURITY;

-- Users can only SELECT their own AI batches (private cache). No direct writes!
CREATE POLICY "Users can view own ai batches"
  ON public.ai_batches
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Explicitly deny all client access to budget/quota/rate tables
-- (Accessible exclusively via server-only SECURITY DEFINER RPCs)

-- ==========================================
-- 6. Privileged AI Lease & Quota RPCs (Server Role Only)
-- ==========================================

-- Function: reserve_ai_batch_v1
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
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_batch record;
  v_user_scope text := 'user:' || p_user_id::text;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_minute_bucket timestamptz := date_trunc('minute', now() AT TIME ZONE 'UTC');
  v_daily record;
  v_rate record;
  v_batch_id uuid;
BEGIN
  -- 1. Check if batch already exists in cache
  SELECT * INTO v_batch
  FROM public.ai_batches
  WHERE user_id = p_user_id AND cache_key = p_cache_key
  FOR UPDATE;

  IF FOUND THEN
    -- If already ready, return cached output immediately
    IF v_batch.status = 'ready' THEN
      RETURN jsonb_build_object(
        'status', 'ready',
        'batch_id', v_batch.id,
        'output', v_batch.output,
        'model_id', v_batch.model_id
      );
    END IF;

    -- If pending with an active unexpired lease, tell worker to wait
    IF v_batch.status = 'pending' AND v_batch.lease_until > now() THEN
      RETURN jsonb_build_object(
        'status', 'pending',
        'batch_id', v_batch.id,
        'wait', true,
        'retry_after', v_batch.retry_after
      );
    END IF;

    -- Lease expired or failed: take over the lease
    UPDATE public.ai_batches
    SET status = 'pending',
        lease_token = p_lease_token,
        lease_until = now() + interval '45 seconds',
        retry_after = now() + interval '50 seconds',
        updated_at = now()
    WHERE id = v_batch.id;

    RETURN jsonb_build_object(
      'status', 'lease_acquired',
      'batch_id', v_batch.id,
      'lease_token', p_lease_token
    );
  END IF;

  -- 2. Quota Check: Daily Operations Limit
  SELECT * INTO v_daily
  FROM public.ai_usage_daily
  WHERE scope_key = v_user_scope AND usage_date = v_today
  FOR UPDATE;

  IF FOUND THEN
    IF v_daily.reserved_operations >= p_daily_limit THEN
      RETURN jsonb_build_object(
        'status', 'quota_exceeded',
        'error', 'Daily AI generation limit reached for today',
        'code', 'DAILY_QUOTA_EXCEEDED'
      );
    END IF;

    UPDATE public.ai_usage_daily
    SET reserved_operations = reserved_operations + 1,
        updated_at = now()
    WHERE scope_key = v_user_scope AND usage_date = v_today;
  ELSE
    INSERT INTO public.ai_usage_daily (scope_key, usage_date, reserved_calls, reserved_operations, updated_at)
    VALUES (v_user_scope, v_today, 0, 1, now());
  END IF;

  -- 3. Rate Limit Check: Operations Per Minute
  SELECT * INTO v_rate
  FROM public.ai_rate_buckets
  WHERE scope_key = v_user_scope AND bucket_start = v_minute_bucket
  FOR UPDATE;

  IF FOUND THEN
    IF v_rate.operation_count >= p_minute_limit THEN
      RETURN jsonb_build_object(
        'status', 'rate_limited',
        'error', 'Too many requests this minute. Please wait.',
        'code', 'RATE_LIMITED'
      );
    END IF;

    UPDATE public.ai_rate_buckets
    SET operation_count = operation_count + 1,
        updated_at = now()
    WHERE scope_key = v_user_scope AND bucket_start = v_minute_bucket;
  ELSE
    INSERT INTO public.ai_rate_buckets (scope_key, bucket_start, operation_count, updated_at)
    VALUES (v_user_scope, v_minute_bucket, 1, now());
  END IF;

  -- 4. Create new pending batch with acquired lease
  INSERT INTO public.ai_batches (
    user_id, set_id, mode, card_ids, content_revision,
    cache_key, prompt_version, schema_version, status,
    lease_token, lease_until, retry_after, created_at, updated_at
  ) VALUES (
    p_user_id, p_set_id, p_mode, p_card_ids, p_content_revision,
    p_cache_key, p_prompt_version, p_schema_version, 'pending',
    p_lease_token, now() + interval '45 seconds', now() + interval '50 seconds', now(), now()
  )
  RETURNING id INTO v_batch_id;

  RETURN jsonb_build_object(
    'status', 'lease_acquired',
    'batch_id', v_batch_id,
    'lease_token', p_lease_token
  );
END;
$$;

-- Function: finalize_ai_batch_v1
CREATE OR REPLACE FUNCTION public.finalize_ai_batch_v1(
  p_batch_id uuid,
  p_lease_token uuid,
  p_status text,
  p_output jsonb DEFAULT NULL,
  p_model_id text DEFAULT NULL,
  p_error_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_batch record;
BEGIN
  SELECT * INTO v_batch
  FROM public.ai_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found', 'code', 'NOT_FOUND');
  END IF;

  -- Lease token validation
  IF v_batch.lease_token IS DISTINCT FROM p_lease_token THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid lease token', 'code', 'INVALID_LEASE');
  END IF;

  UPDATE public.ai_batches
  SET status = p_status,
      output = coalesce(p_output, output),
      model_id = coalesce(p_model_id, model_id),
      error_code = p_error_code,
      lease_token = NULL,
      lease_until = NULL,
      updated_at = now()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$;

-- Revoke execute from public/anon/authenticated; grant to service_role only
REVOKE ALL ON FUNCTION public.reserve_ai_batch_v1 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_batch_v1 TO service_role;

REVOKE ALL ON FUNCTION public.finalize_ai_batch_v1 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_ai_batch_v1 TO service_role;
