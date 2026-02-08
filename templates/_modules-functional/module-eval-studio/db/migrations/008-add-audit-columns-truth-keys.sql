-- ============================================================================
-- Module: module-eval-studio
-- Migration: 008-add-audit-columns-truth-keys
-- Description: Add standard audit columns to eval_opt_truth_keys
-- ADR Reference: ADR-015 (Module Entity Audit Columns)
-- ============================================================================

-- Add audit columns to eval_opt_truth_keys
ALTER TABLE eval_opt_truth_keys
ADD COLUMN IF NOT EXISTS created_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Remove default from created_by and updated_by after adding (these should be explicitly set)
ALTER TABLE eval_opt_truth_keys
ALTER COLUMN created_by DROP DEFAULT,
ALTER COLUMN updated_by DROP DEFAULT;

-- Add column comments
COMMENT ON COLUMN eval_opt_truth_keys.created_by IS 'User who created this record (audit column per ADR-015)';
COMMENT ON COLUMN eval_opt_truth_keys.updated_by IS 'User who last updated this record (audit column per ADR-015)';
COMMENT ON COLUMN eval_opt_truth_keys.created_at IS 'Record creation timestamp (audit column per ADR-015)';
COMMENT ON COLUMN eval_opt_truth_keys.updated_at IS 'Record last update timestamp (audit column per ADR-015)';

-- Create trigger function to auto-update updated_at and updated_by
CREATE OR REPLACE FUNCTION update_eval_opt_truth_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    -- Note: updated_by should be set by application code (org_common handles this)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS eval_opt_truth_keys_updated_at_trigger ON eval_opt_truth_keys;
CREATE TRIGGER eval_opt_truth_keys_updated_at_trigger
    BEFORE UPDATE ON eval_opt_truth_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_opt_truth_keys_updated_at();

-- ============================================================================
-- Migration complete
-- ============================================================================