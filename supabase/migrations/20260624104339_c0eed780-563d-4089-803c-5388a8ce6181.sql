ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS extracted jsonb,
  ADD COLUMN IF NOT EXISTS extracted_text text,
  ADD COLUMN IF NOT EXISTS extraction_status text NOT NULL DEFAULT 'pending';