-- ============================================================================
-- Migration: Add draft status and make doc_type_id/criteria_set_id nullable
-- Module: module-eval
-- Date: 2026-01-19
-- Description: Support draft evaluations that can be configured before processing
-- ============================================================================

-- Make doc_type_id nullable (for draft evaluations)
ALTER TABLE eval_doc_summaries 
  ALTER COLUMN doc_type_id DROP NOT NULL;

-- Make criteria_set_id nullable (for draft evaluations)
ALTER TABLE eval_doc_summaries 
  ALTER COLUMN criteria_set_id DROP NOT NULL;

-- Add 'draft' status to check constraint
ALTER TABLE eval_doc_summaries 
  DROP CONSTRAINT IF EXISTS eval_doc_summaries_status_check;

ALTER TABLE eval_doc_summaries 
  ADD CONSTRAINT eval_doc_summaries_status_check 
  CHECK (status IN ('draft', 'pending', 'processing', 'completed', 'failed'));

-- Update comment to reflect draft status
COMMENT ON COLUMN eval_doc_summaries.status IS 'Processing status: draft, pending, processing, completed, failed';
COMMENT ON COLUMN eval_doc_summaries.doc_type_id IS 'Document type being evaluated (nullable for draft)';
COMMENT ON COLUMN eval_doc_summaries.criteria_set_id IS 'Criteria set used for evaluation (nullable for draft)';

-- ============================================================================
-- End of migration
-- ============================================================================
