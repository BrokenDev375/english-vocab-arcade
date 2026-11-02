-- Add English dialogue without changing existing sessions, attempts, or cache entries.
SET search_path = '';
ALTER TABLE public.study_sessions DROP CONSTRAINT study_sessions_mode_check;
ALTER TABLE public.study_sessions ADD CONSTRAINT study_sessions_mode_check CHECK (mode IN (
  'flashcard', 'learn', 'test', 'match', 'arcade_typing', 'arcade_recall',
  'dictation', 'speak', 'grammar', 'reading', 'translate', 'dialogue'
));
ALTER TABLE public.ai_batches DROP CONSTRAINT ai_batches_mode_check;
ALTER TABLE public.ai_batches ADD CONSTRAINT ai_batches_mode_check CHECK (mode IN ('context', 'grammar', 'reading', 'translation', 'dialogue'));
NOTIFY pgrst, 'reload schema';
