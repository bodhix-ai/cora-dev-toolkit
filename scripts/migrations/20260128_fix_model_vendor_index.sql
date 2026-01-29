-- =============================================
-- Migration: Fix model-vendor Index Naming
-- =============================================
-- Date: January 28, 2026
-- Purpose: Ensure model_vendor index follows ADR-011 naming standards
-- Related: Database Naming Standards Rule (idx_ prefix required)

-- =============================================
-- DROP ANY INCORRECTLY NAMED INDEX
-- =============================================

-- Drop index if it exists with incorrect name (covering potential naming issues)
DROP INDEX IF EXISTS public."FOR";
DROP INDEX IF EXISTS public.idx_model_vendor;
DROP INDEX IF EXISTS public.ai_models_vendor;

-- =============================================
-- CREATE CORRECTLY NAMED INDEX
-- =============================================

-- Create index with correct ADR-011 compliant name
CREATE INDEX IF NOT EXISTS idx_ai_models_vendor ON public.ai_models(model_vendor);

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify index exists with correct name
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'ai_models' 
        AND indexname = 'idx_ai_models_vendor'
    ) THEN
        RAISE EXCEPTION 'Migration failed: idx_ai_models_vendor index not found';
    END IF;
    
    RAISE NOTICE 'Migration successful: idx_ai_models_vendor index verified';
END $$;

-- =============================================
-- ROLLBACK SCRIPT (if needed)
-- =============================================

-- To rollback this migration (should not be needed):
-- DROP INDEX IF EXISTS public.idx_ai_models_vendor;