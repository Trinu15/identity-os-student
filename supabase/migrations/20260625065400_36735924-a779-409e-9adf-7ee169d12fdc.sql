ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS confidence numeric;

CREATE INDEX IF NOT EXISTS documents_user_category_idx
  ON public.documents (user_id, category);