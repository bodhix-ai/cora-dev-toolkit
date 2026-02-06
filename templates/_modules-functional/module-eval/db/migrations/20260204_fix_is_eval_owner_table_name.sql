-- ============================================================================
-- Module: module-eval
-- Migration: 20260204_fix_is_eval_owner_table_name
-- Date: 2026-02-04
-- Description: Fix is_eval_owner function to use correct table name
-- Issue: Function references eval_doc_summary (singular) instead of eval_doc_summaries (plural)
-- ADR: ADR-011 (Table Naming Standards - all tables must be plural)
-- ============================================================================

-- Update the is_eval_owner function to use correct table name (ADR-011 compliant)
CREATE OR REPLACE FUNCTION is_eval_owner(p_user_id UUID, p_eval_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM eval_doc_summaries  -- Fixed: was eval_doc_summary (singular)
        WHERE id = p_eval_id
        AND created_by = p_user_id
    );
END;
$$;

COMMENT ON FUNCTION is_eval_owner IS 'Check if user created the evaluation (ADR-011 compliant table name)';

-- ============================================================================
-- End of migration
-- ============================================================================