-- Migration: Add run_id to eval_opt_doc_groups
-- Purpose: Scope truth sets to specific optimization runs (not just workspace)
-- Bug: Truth sets from all runs in a workspace were showing in every run
-- Date: 2026-02-09

-- Step 1: Add run_id column (nullable first for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eval_opt_doc_groups' AND column_name = 'run_id'
    ) THEN
        ALTER TABLE eval_opt_doc_groups
        ADD COLUMN run_id UUID REFERENCES eval_opt_runs(id) ON DELETE CASCADE;

        COMMENT ON COLUMN eval_opt_doc_groups.run_id IS 'Optimization run this truth set belongs to';
    END IF;
END $$;

-- Step 2: Create index for run_id lookups
CREATE INDEX IF NOT EXISTS idx_eval_opt_doc_groups_run_id
    ON eval_opt_doc_groups(run_id);

-- Step 3: Create composite index for run + status queries
CREATE INDEX IF NOT EXISTS idx_eval_opt_doc_groups_run_status
    ON eval_opt_doc_groups(run_id, status);

-- Verification
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eval_opt_doc_groups' AND column_name = 'run_id'
    ) THEN
        RAISE NOTICE '✅ Migration successful: run_id column added to eval_opt_doc_groups';
    ELSE
        RAISE EXCEPTION '❌ Migration failed: run_id column not found';
    END IF;
END $$;