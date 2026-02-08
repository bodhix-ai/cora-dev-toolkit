-- ============================================================================
-- Module: module-eval-optimizer
-- Migration: 007-add-run-workflow-columns
-- Description: Add doc_type_id, criteria_set_id columns and make prompt fields nullable
--              for the new workflow where runs are created before optimization
-- Created: 2026-02-07
-- ============================================================================

-- Add doc_type_id column (links to eval_cfg_org_doc_types)
ALTER TABLE eval_opt_runs 
ADD COLUMN IF NOT EXISTS doc_type_id UUID;

-- Add criteria_set_id column (links to eval_cfg_org_criteria_sets)
ALTER TABLE eval_opt_runs 
ADD COLUMN IF NOT EXISTS criteria_set_id UUID;

-- Add progress column for tracking optimization progress
ALTER TABLE eval_opt_runs 
ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0;

-- Add progress_message column for status messages
ALTER TABLE eval_opt_runs 
ADD COLUMN IF NOT EXISTS progress_message TEXT;

-- Add thoroughness column
ALTER TABLE eval_opt_runs 
ADD COLUMN IF NOT EXISTS thoroughness VARCHAR(50) DEFAULT 'balanced';

-- Add best_variation column (name of the winning prompt variation)
ALTER TABLE eval_opt_runs 
ADD COLUMN IF NOT EXISTS best_variation VARCHAR(255);

-- Add recommendations column (JSON array of actionable recommendations)
ALTER TABLE eval_opt_runs 
ADD COLUMN IF NOT EXISTS recommendations JSONB;

-- Add variation_summary column (summary of all variation results)
ALTER TABLE eval_opt_runs 
ADD COLUMN IF NOT EXISTS variation_summary JSONB;

-- Add meta_prompt_model_id for LLM configuration
ALTER TABLE eval_opt_runs 
ADD COLUMN IF NOT EXISTS meta_prompt_model_id UUID;

-- Add eval_model_id for LLM configuration
ALTER TABLE eval_opt_runs 
ADD COLUMN IF NOT EXISTS eval_model_id UUID;

-- Make prompt fields nullable (they're filled in during optimization, not at creation)
ALTER TABLE eval_opt_runs 
ALTER COLUMN system_prompt DROP NOT NULL;

ALTER TABLE eval_opt_runs 
ALTER COLUMN user_prompt_template DROP NOT NULL;

ALTER TABLE eval_opt_runs 
ALTER COLUMN temperature DROP NOT NULL;

ALTER TABLE eval_opt_runs 
ALTER COLUMN max_tokens DROP NOT NULL;

-- Update status constraint to include 'draft' and 'processing' statuses
-- First drop the old constraint if it exists
ALTER TABLE eval_opt_runs 
DROP CONSTRAINT IF EXISTS eval_opt_runs_status_check;

-- Add new constraint with updated values
ALTER TABLE eval_opt_runs
ADD CONSTRAINT eval_opt_runs_status_check
CHECK (status IN ('draft', 'pending', 'processing', 'running', 'completed', 'failed', 'cancelled'));

-- Add comments for new columns
COMMENT ON COLUMN eval_opt_runs.doc_type_id IS 'Document type for this optimization run';
COMMENT ON COLUMN eval_opt_runs.criteria_set_id IS 'Criteria set for this optimization run';
COMMENT ON COLUMN eval_opt_runs.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN eval_opt_runs.progress_message IS 'Current progress status message';
COMMENT ON COLUMN eval_opt_runs.thoroughness IS 'Optimization thoroughness: fast, balanced, thorough';
COMMENT ON COLUMN eval_opt_runs.best_variation IS 'Name of the best performing prompt variation';
COMMENT ON COLUMN eval_opt_runs.recommendations IS 'JSON array of actionable improvement recommendations';
COMMENT ON COLUMN eval_opt_runs.variation_summary IS 'Summary of all tested variations and their metrics';

-- Create index on doc_type_id
CREATE INDEX IF NOT EXISTS idx_eval_opt_run_doc_type
    ON eval_opt_runs(doc_type_id);

-- Create index on criteria_set_id  
CREATE INDEX IF NOT EXISTS idx_eval_opt_run_criteria_set
    ON eval_opt_runs(criteria_set_id);

-- ============================================================================
-- End of migration
-- ============================================================================