-- ============================================================================
-- Module: module-eval
-- Migration: Add score value columns to preserve historical accuracy
-- Description: Capture score_value at evaluation/edit time to prevent 
--              retroactive changes when organizations update status options
-- Date: January 21, 2026
-- Issue: #9 from plan_ui-enhancements.md
-- ============================================================================

-- Step 1: Add ai_score_value column to eval_criteria_results
-- ============================================================================
ALTER TABLE eval_criteria_results 
ADD COLUMN IF NOT EXISTS ai_score_value DECIMAL(5,2);

COMMENT ON COLUMN eval_criteria_results.ai_score_value IS 'Score value captured at evaluation time (0-100)';

-- Add CHECK constraint (drop first if exists to make idempotent)
DO $$ BEGIN
    ALTER TABLE eval_criteria_results
    ADD CONSTRAINT eval_criteria_results_score_check
        CHECK (ai_score_value IS NULL OR (ai_score_value >= 0 AND ai_score_value <= 100));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Add edited_score_value column to eval_result_edits
-- ============================================================================
ALTER TABLE eval_result_edits
ADD COLUMN IF NOT EXISTS edited_score_value DECIMAL(5,2);

COMMENT ON COLUMN eval_result_edits.edited_score_value IS 'Score value captured at edit time (0-100)';

-- Add CHECK constraint (drop first if exists to make idempotent)
DO $$ BEGIN
    ALTER TABLE eval_result_edits
    ADD CONSTRAINT eval_result_edits_score_check
        CHECK (edited_score_value IS NULL OR (edited_score_value >= 0 AND edited_score_value <= 100));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Step 3: Backfill existing eval_criteria_results with current status option scores
-- ============================================================================
-- This captures the CURRENT score_value from status options
-- Note: This is best-effort since we don't know what the score was at evaluation time

UPDATE eval_criteria_results r
SET ai_score_value = (
    -- Try org-level status options first
    SELECT COALESCE(
        (SELECT score_value FROM eval_org_status_options 
         WHERE id = r.ai_status_id AND is_active = true),
        (SELECT score_value FROM eval_sys_status_options 
         WHERE id = r.ai_status_id)
    )
)
WHERE ai_status_id IS NOT NULL
  AND ai_score_value IS NULL;

-- Step 4: Backfill existing eval_result_edits with current status option scores
-- ============================================================================
UPDATE eval_result_edits e
SET edited_score_value = (
    -- Try org-level status options first
    SELECT COALESCE(
        (SELECT score_value FROM eval_org_status_options 
         WHERE id = e.edited_status_id AND is_active = true),
        (SELECT score_value FROM eval_sys_status_options 
         WHERE id = e.edited_status_id)
    )
)
WHERE edited_status_id IS NOT NULL
  AND edited_score_value IS NULL;

-- ============================================================================
-- Verification queries (commented out - run manually if needed)
-- ============================================================================

-- Check how many rows were backfilled
-- SELECT 
--     COUNT(*) as total_results,
--     COUNT(ai_status_id) as with_status,
--     COUNT(ai_score_value) as with_score,
--     COUNT(*) - COUNT(ai_score_value) as missing_score
-- FROM eval_criteria_results;

-- SELECT 
--     COUNT(*) as total_edits,
--     COUNT(edited_status_id) as with_status,
--     COUNT(edited_score_value) as with_score,
--     COUNT(*) - COUNT(edited_score_value) as missing_score
-- FROM eval_result_edits;

-- Sample results with scores
-- SELECT 
--     r.id,
--     r.ai_status_id,
--     r.ai_score_value,
--     COALESCE(o.name, s.name) as status_name
-- FROM eval_criteria_results r
-- LEFT JOIN eval_org_status_options o ON o.id = r.ai_status_id
-- LEFT JOIN eval_sys_status_options s ON s.id = r.ai_status_id
-- LIMIT 10;

-- ============================================================================
-- End of migration
-- ============================================================================
