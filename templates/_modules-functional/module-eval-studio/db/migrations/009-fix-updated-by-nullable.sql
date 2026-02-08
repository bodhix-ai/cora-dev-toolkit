-- ============================================================================
-- Module: module-eval-studio
-- Migration: 009-fix-updated-by-nullable
-- Description: Fix updated_by to be nullable (standard audit column pattern)
-- ADR Reference: ADR-015 (Module Entity Audit Columns)
-- ============================================================================

-- Make updated_by nullable (standard audit pattern: only set on UPDATE, not INSERT)
ALTER TABLE eval_opt_truth_keys
ALTER COLUMN updated_by DROP NOT NULL;

-- Add comment explaining the pattern
COMMENT ON COLUMN eval_opt_truth_keys.updated_by IS 'User who last updated this record (NULL until first update, audit column per ADR-015)';

-- ============================================================================
-- Migration complete
-- ============================================================================
