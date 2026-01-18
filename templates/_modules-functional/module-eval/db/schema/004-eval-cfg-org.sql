-- ============================================================================
-- Module: module-eval
-- Migration: 004-eval-cfg-org
-- Description: Organization-specific evaluation settings and delegation control
-- Naming: Follows Rule 8 (Config Tables - _cfg_ infix pattern)
-- ============================================================================

-- Create eval_cfg_org table (one row per organization)
CREATE TABLE IF NOT EXISTS eval_cfg_org (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    ai_config_delegated BOOLEAN NOT NULL DEFAULT false,
    categorical_mode TEXT,
    show_numerical_score BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT REFERENCES user_profiles(id) ON DELETE SET NULL,
    updated_by BIGINT REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    CONSTRAINT eval_cfg_org_unique UNIQUE (org_id),
    CONSTRAINT eval_cfg_org_mode_check 
        CHECK (categorical_mode IS NULL OR categorical_mode IN ('boolean', 'detailed'))
);

-- Add table comment
COMMENT ON TABLE eval_cfg_org IS 'Organization-specific evaluation settings and delegation control';
COMMENT ON COLUMN eval_cfg_org.org_id IS 'Organization this config belongs to';
COMMENT ON COLUMN eval_cfg_org.ai_config_delegated IS 'Whether org can customize AI prompts/models';
COMMENT ON COLUMN eval_cfg_org.categorical_mode IS 'Override scoring mode (NULL = use sys default)';
COMMENT ON COLUMN eval_cfg_org.show_numerical_score IS 'Override score display (NULL = use sys default)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_cfg_org_org 
    ON eval_cfg_org(org_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_eval_cfg_org_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_cfg_org_updated_at ON eval_cfg_org;
CREATE TRIGGER eval_cfg_org_updated_at
    BEFORE UPDATE ON eval_cfg_org
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_cfg_org_updated_at();

-- ============================================================================
-- End of migration
-- ============================================================================
