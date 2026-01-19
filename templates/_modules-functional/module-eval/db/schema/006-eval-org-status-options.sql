-- ============================================================================
-- Module: module-eval
-- Migration: 006-eval-org-status-options
-- Description: Organization-level status options (override system defaults)
-- ============================================================================

-- Create eval_org_status_options table
CREATE TABLE IF NOT EXISTS eval_org_status_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#9e9e9e',
    score_value DECIMAL(5,2),
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    CONSTRAINT eval_org_status_options_org_name_unique UNIQUE (org_id, name)
);

-- Add table comment
COMMENT ON TABLE eval_org_status_options IS 'Organization-level status options (override system defaults)';
COMMENT ON COLUMN eval_org_status_options.org_id IS 'Organization this status option belongs to';
COMMENT ON COLUMN eval_org_status_options.name IS 'Status display name';
COMMENT ON COLUMN eval_org_status_options.color IS 'Hex color code for UI display';
COMMENT ON COLUMN eval_org_status_options.score_value IS 'Numerical score (0-100) for aggregation';
COMMENT ON COLUMN eval_org_status_options.order_index IS 'Display order (lower = first)';
COMMENT ON COLUMN eval_org_status_options.is_active IS 'Soft delete flag';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_org_status_options_org 
    ON eval_org_status_options(org_id);
CREATE INDEX IF NOT EXISTS idx_eval_org_status_options_active 
    ON eval_org_status_options(org_id, is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_eval_org_status_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_org_status_options_updated_at ON eval_org_status_options;
CREATE TRIGGER eval_org_status_options_updated_at
    BEFORE UPDATE ON eval_org_status_options
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_org_status_options_updated_at();

-- ============================================================================
-- End of migration
-- ============================================================================
