-- ============================================================================
-- Migration: Add variation_name to eval_opt_run_results
-- Description: Adds variation_name column and updates unique constraint
-- to support multiple prompt variations per optimization run.
-- ============================================================================

-- 1. Add variation_name column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eval_opt_run_results' 
        AND column_name = 'variation_name'
    ) THEN
        ALTER TABLE eval_opt_run_results 
        ADD COLUMN variation_name VARCHAR(255) NOT NULL DEFAULT 'default';
    END IF;
END $$;

-- 2. Drop old unique constraint
ALTER TABLE eval_opt_run_results
DROP CONSTRAINT IF EXISTS eval_opt_run_results_run_id_group_id_criteria_item_id_key;

-- 3. Add new unique constraint including variation_name
-- Using idempotent approach just in case
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'eval_opt_run_results_unique_variation'
    ) THEN
        ALTER TABLE eval_opt_run_results
        ADD CONSTRAINT eval_opt_run_results_unique_variation
        UNIQUE(run_id, group_id, criteria_item_id, variation_name);
    END IF;
END $$;

-- 4. Add index for variation lookup
CREATE INDEX IF NOT EXISTS idx_eval_opt_result_variation 
    ON eval_opt_run_results(run_id, variation_name);

-- 5. Remove the default value (only needed for existing rows)
ALTER TABLE eval_opt_run_results
ALTER COLUMN variation_name DROP DEFAULT;

-- Verification
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eval_opt_run_results' 
        AND column_name = 'variation_name'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        RAISE EXCEPTION 'Migration failed: variation_name column not found';
    END IF;
END $$;
