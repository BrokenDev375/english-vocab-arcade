-- Migration 0002: Auth triggers, invariants, and RLS policies
-- Complies with docs/03-database-and-security.md

SET search_path = '';

-- ==========================================
-- 1. Triggers & Security Functions
-- ==========================================

-- Trigger to create a profile automatically when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  initial_name text;
BEGIN
  initial_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    'User_' || substr(new.id::text, 1, 8)
  );

  -- Constrain display_name length between 1 and 80 chars
  IF char_length(initial_name) > 80 THEN
    initial_name := substr(initial_name, 1, 80);
  ELSIF char_length(initial_name) < 1 THEN
    initial_name := 'User_' || substr(new.id::text, 1, 8);
  END IF;

  INSERT INTO public.profiles (id, display_name, timezone, created_at, updated_at)
  VALUES (new.id, initial_name, 'Asia/Ho_Chi_Minh', now(), now())
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to prevent transferring set ownership (immutable owner)
CREATE OR REPLACE FUNCTION public.check_immutable_set_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.owner_id <> OLD.owner_id THEN
    RAISE EXCEPTION 'Cannot change owner_id of learning_set (immutable owner violation)';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_immutable_set_owner ON public.learning_sets;
CREATE TRIGGER enforce_immutable_set_owner
  BEFORE UPDATE ON public.learning_sets
  FOR EACH ROW EXECUTE FUNCTION public.check_immutable_set_owner();

-- Trigger to increment set revision and enforce card limit (max 5,000 cards per set)
CREATE OR REPLACE FUNCTION public.sync_card_changes_to_set()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_set_id uuid;
  total_cards int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_set_id := OLD.set_id;
  ELSE
    target_set_id := NEW.set_id;
  END IF;

  -- Enforce max 5,000 cards per set on INSERT
  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO total_cards
    FROM public.vocabulary_cards
    WHERE set_id = target_set_id;

    IF total_cards > 5000 THEN
      RAISE EXCEPTION 'Cannot exceed maximum limit of 5,000 cards per set';
    END IF;
  END IF;

  -- Lock and bump parent set revision
  UPDATE public.learning_sets
  SET content_revision = content_revision + 1,
      updated_at = now()
  WHERE id = target_set_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS on_card_change ON public.vocabulary_cards;
CREATE TRIGGER on_card_change
  AFTER INSERT OR UPDATE OR DELETE ON public.vocabulary_cards
  FOR EACH ROW EXECUTE FUNCTION public.sync_card_changes_to_set();


-- ==========================================
-- 2. Row Level Security (RLS) Policies
-- ==========================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_cards ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- Profiles Policies (Strict Own-User Only)
-- Explore page must NEVER query profiles directly
-- ------------------------------------------
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ------------------------------------------
-- Learning Sets Policies
-- ------------------------------------------
CREATE POLICY "Public or own learning sets are viewable"
  ON public.learning_sets
  FOR SELECT
  TO public
  USING (is_public = true OR (SELECT auth.uid()) = owner_id);

CREATE POLICY "Users can create learning sets"
  ON public.learning_sets
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Users can update own learning sets"
  ON public.learning_sets
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = owner_id)
  WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Users can delete own learning sets"
  ON public.learning_sets
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

-- ------------------------------------------
-- Vocabulary Cards Policies
-- ------------------------------------------
CREATE POLICY "Cards viewable if parent set is public or own"
  ON public.vocabulary_cards
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_sets s
      WHERE s.id = set_id
        AND (s.is_public = true OR s.owner_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "Cards insertable if user owns parent set"
  ON public.vocabulary_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_sets s
      WHERE s.id = set_id
        AND s.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Cards updatable if user owns parent set"
  ON public.vocabulary_cards
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_sets s
      WHERE s.id = set_id
        AND s.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_sets s
      WHERE s.id = set_id
        AND s.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Cards deletable if user owns parent set"
  ON public.vocabulary_cards
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_sets s
      WHERE s.id = set_id
        AND s.owner_id = (SELECT auth.uid())
    )
  );
