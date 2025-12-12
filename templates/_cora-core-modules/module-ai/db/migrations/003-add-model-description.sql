-- Add description field to ai_models table for better UX
-- This helps admins understand what each model is best suited for

ALTER TABLE public.ai_models 
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.ai_models.description IS 'Human-readable description of the model and its use cases';
