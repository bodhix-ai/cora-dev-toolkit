-- ============================================================================
-- Migration: Fix doc group status constraint
-- Date: 2026-02-07
-- Description: Change 'pending_evaluation' to 'pending' for better clarity
-- ============================================================================

-- Drop existing constraint
ALTER TABLE eval_opt_doc_groups 
    DROP CONSTRAINT IF EXISTS eval_opt_doc_groups_status_check;

-- Add updated constraint with 'pending' instead of 'pending_evaluation'
ALTER TABLE eval_opt_doc_groups 
    ADD CONSTRAINT eval_opt_doc_groups_status_check 
    CHECK (status IN ('pending', 'evaluated', 'validated'));

-- Update any existing rows with 'pending_evaluation' to 'pending'
UPDATE eval_opt_doc_groups 
SET status = 'pending' 
WHERE status = 'pending_evaluation';