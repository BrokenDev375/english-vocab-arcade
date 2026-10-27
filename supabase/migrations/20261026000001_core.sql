-- Migration 0001: Core tables for profiles, learning_sets, and vocabulary_cards
-- Complies with docs/03-database-and-security.md

SET search_path = '';

-- 1. Profiles Table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 80),
  timezone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  preferred_voice text CHECK (preferred_voice IS NULL OR preferred_voice IN ('en-US', 'en-GB')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Learning Sets Table
CREATE TABLE IF NOT EXISTS public.learning_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 160),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  language text NOT NULL DEFAULT 'en' CHECK (language = 'en'),
  cefr_level text NOT NULL CHECK (cefr_level IN ('A1', 'A2', 'B1', 'mixed')),
  topic text NOT NULL CHECK (char_length(topic) >= 1 AND char_length(topic) <= 80),
  is_public boolean NOT NULL DEFAULT false,
  content_revision bigint NOT NULL DEFAULT 1 CHECK (content_revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for learning_sets
CREATE INDEX IF NOT EXISTS learning_sets_owner_id_idx ON public.learning_sets (owner_id);
CREATE INDEX IF NOT EXISTS learning_sets_public_created_idx ON public.learning_sets (is_public, created_at DESC, id);
CREATE INDEX IF NOT EXISTS learning_sets_level_topic_idx ON public.learning_sets (cefr_level, topic);

-- 3. Vocabulary Cards Table
CREATE TABLE IF NOT EXISTS public.vocabulary_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.learning_sets(id) ON DELETE CASCADE,
  term text NOT NULL CHECK (char_length(term) >= 1 AND char_length(term) <= 80),
  meaning_vi text NOT NULL CHECK (char_length(meaning_vi) >= 1 AND char_length(meaning_vi) <= 300),
  part_of_speech text NOT NULL CHECK (part_of_speech IN ('noun', 'verb', 'adjective', 'adverb', 'phrase', 'other')),
  ipa text CHECK (ipa IS NULL OR char_length(ipa) <= 120),
  cefr_level text CHECK (cefr_level IS NULL OR cefr_level IN ('A1', 'A2', 'B1')),
  example_en text CHECK (example_en IS NULL OR char_length(example_en) <= 500),
  example_vi text CHECK (example_vi IS NULL OR char_length(example_vi) <= 500),
  accepted_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  position int NOT NULL DEFAULT 0 CHECK (position >= 0),
  content_source text CHECK (content_source IS NULL OR char_length(content_source) <= 300),
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'reviewed', 'verified')),
  import_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Partial unique index for import_key per set
CREATE UNIQUE INDEX IF NOT EXISTS vocabulary_cards_set_id_import_key_idx
  ON public.vocabulary_cards (set_id, import_key)
  WHERE import_key IS NOT NULL;

-- Position index for cards ordering
CREATE INDEX IF NOT EXISTS vocabulary_cards_set_id_position_idx
  ON public.vocabulary_cards (set_id, position, id);
