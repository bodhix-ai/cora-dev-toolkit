-- ============================================================================
-- Migration: Make ai_explanation nullable in eval_opt_run_results
-- Date: 2026-02-09
-- Description: With score-based architecture (Sprint 5 Phase 3), the full
--              AI response is stored in ai_result JSONB. The ai_explanation
--              column is now redundant and should be nullable to avoid
--              constraint violations when storing score-based results.
-- ============================================================================

-- Make ai_explanation nullable (it's redundant with ai_result JSONB)
ALTER TABLE eval_opt_run_results 
ALTER COLUMN ai_explanation DROP NOT NULL;

-- Update comment to reflect new optional status
COMMENT ON COLUMN eval_opt_run_results.ai_explanation IS 'DEPRECATED: AI assessment explanation (use ai_result JSONB instead, this column is nullable for backward compatibility)';

-- Verification
DO $$
BEGIN
    -- Check that the column is now nullable
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'eval_opt_run_results' 
        AND column_name = 'ai_explanation' 
        AND is_nullable = 'YES'
    ) THEN
        RAISE NOTICE '✅ Migration successful: ai_explanation is now nullable';
    ELSE
        RAISE EXCEPTION '❌ Migration failed: ai_explanation is still NOT NULL';
    END IF;
END $$;