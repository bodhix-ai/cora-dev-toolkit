-- =============================================
-- MODULE-AI: AI Model Vendor Detection
-- =============================================
-- Purpose: Add vendor tracking to ai_models table
-- Version: 1.0 (January 2026)
-- Note: Enables vendor-specific logic for inference profiles, regions, and marketplace requirements

-- =============================================
-- ADD MODEL_VENDOR COLUMN
-- =============================================

ALTER TABLE public.ai_models 
ADD COLUMN IF NOT EXISTS model_vendor VARCHAR(50);

COMMENT ON COLUMN public.ai_models.model_vendor IS 'AI model vendor (anthropic, amazon, meta, mistral, cohere, etc.) - auto-detected from model_id pattern';

-- =============================================
-- CREATE INDEX FOR VENDOR QUERIES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ai_models_vendor ON public.ai_models(model_vendor);

-- =============================================
-- BACKFILL EXISTING RECORDS
-- =============================================

-- Backfill existing records with vendor detection
-- This handles both foundation models and inference profiles
UPDATE public.ai_models
SET model_vendor = CASE
    -- Handle inference profiles (strip region prefix first)
    WHEN model_id ~ '^(us|eu|ap|ca|global)\.' THEN
        CASE
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.anthropic\.' THEN 'anthropic'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.amazon\.' THEN 'amazon'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.meta\.' THEN 'meta'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.mistral\.' THEN 'mistral'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.cohere\.' THEN 'cohere'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.stability\.' THEN 'stability'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.twelvelabs\.' THEN 'twelvelabs'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.deepseek\.' THEN 'deepseek'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.ai21\.' THEN 'ai21'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.google\.' THEN 'google'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.nvidia\.' THEN 'nvidia'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.openai\.' THEN 'openai'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.qwen\.' THEN 'qwen'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.minimax\.' THEN 'minimax'
            ELSE 'unknown'
        END
    -- Handle foundation models (no region prefix)
    WHEN model_id ~ '^anthropic\.' THEN 'anthropic'
    WHEN model_id ~ '^amazon\.' THEN 'amazon'
    WHEN model_id ~ '^meta\.' THEN 'meta'
    WHEN model_id ~ '^mistral\.' THEN 'mistral'
    WHEN model_id ~ '^cohere\.' THEN 'cohere'
    WHEN model_id ~ '^ai21\.' THEN 'ai21'
    WHEN model_id ~ '^stability\.' THEN 'stability'
    WHEN model_id ~ '^google\.' THEN 'google'
    WHEN model_id ~ '^nvidia\.' THEN 'nvidia'
    WHEN model_id ~ '^openai\.' THEN 'openai'
    WHEN model_id ~ '^qwen\.' THEN 'qwen'
    WHEN model_id ~ '^minimax\.' THEN 'minimax'
    WHEN model_id ~ '^twelvelabs\.' THEN 'twelvelabs'
    WHEN model_id ~ '^deepseek\.' THEN 'deepseek'
    ELSE 'unknown'
END
WHERE provider_id IN (SELECT id FROM public.ai_providers WHERE provider_type = 'aws_bedrock')
  AND model_vendor IS NULL;

-- =============================================
-- VERIFICATION QUERY (commented out)
-- =============================================

-- Uncomment to verify vendor distribution after migration:
-- SELECT model_vendor, COUNT(*) as count
-- FROM public.ai_models
-- WHERE provider_id IN (SELECT id FROM public.ai_providers WHERE provider_type = 'aws_bedrock')
-- GROUP BY model_vendor
-- ORDER BY count DESC;
