-- Migration: Update eval_opt_run_results for score-based architecture
-- Date: 2026-02-09
-- Sprint: S5 Phase 3
-- Description: Migrate opt-orchestrator evaluation results to score-based storage (matches Phase 1)

-- Step 1: Add new score-based columns
ALTER TABLE eval_opt_run_results
  ADD COLUMN IF NOT EXISTS ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  ADD COLUMN IF NOT EXISTS ai_result JSONB,
  ADD COLUMN IF NOT EXISTS score_diff INTEGER;

-- Step 2: Make ai_status_id nullable (backward compatibility during transition)
ALTER TABLE eval_opt_run_results
  ALTER COLUMN ai_status_id DROP NOT NULL;

-- Step 3: Update column comments
COMMENT ON COLUMN eval_opt_run_results.ai_score IS 'AI assessment score (0-100, direct from AI)';
COMMENT ON COLUMN eval_opt_run_results.ai_result IS 'Full AI response JSON (score, confidence, explanation, citations, custom fields)';
COMMENT ON COLUMN eval_opt_run_results.score_diff IS 'Absolute difference between AI score and truth score';
COMMENT ON COLUMN eval_opt_run_results.status_match IS 'Reinterpreted: Whether AI score within tolerance of truth score (±10 points)';
COMMENT ON COLUMN eval_opt_run_results.ai_status_id IS 'DEPRECATED: Legacy status option reference (nullable for backward compat)';

-- Step 4: Add index on ai_score for analytics queries
CREATE INDEX IF NOT EXISTS idx_eval_opt_result_score
    ON eval_opt_run_results(ai_score);

-- Verification
DO $$
BEGIN
    -- Verify ai_score column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eval_opt_run_results' AND column_name = 'ai_score'
    ) THEN
        RAISE EXCEPTION 'Migration failed: ai_score column not created';
    END IF;

    -- Verify ai_result column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eval_opt_run_results' AND column_name = 'ai_result'
    ) THEN
        RAISE EXCEPTION 'Migration failed: ai_result column not created';
    END IF;

    -- Verify ai_status_id is nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eval_opt_run_results' 
          AND column_name = 'ai_status_id'
          AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION 'Migration failed: ai_status_id should be nullable';
    END IF;

    RAISE NOTICE '✅ Migration 20260209_opt_run_results_scoring.sql completed successfully';
END $$;