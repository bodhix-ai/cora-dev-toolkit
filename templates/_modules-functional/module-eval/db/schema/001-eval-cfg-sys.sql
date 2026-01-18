-- ============================================================================
-- Module: module-eval
-- Migration: 001-eval-cfg-sys
-- Description: Platform-wide default settings for the evaluation module
-- Naming: Follows Rule 8 (Config Tables - _cfg_ infix pattern)
-- ============================================================================

-- Create eval_cfg_sys table (single row configuration)
CREATE TABLE IF NOT EXISTS eval_cfg_sys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categorical_mode TEXT NOT NULL DEFAULT 'detailed',
    show_numerical_score BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    CONSTRAINT eval_cfg_sys_categorical_mode_check
        CHECK (categorical_mode IN ('boolean', 'detailed'))
);

-- Add table comment
COMMENT ON TABLE eval_cfg_sys IS 'Platform-wide default settings for the evaluation module (single row)';
COMMENT ON COLUMN eval_cfg_sys.categorical_mode IS 'Default scoring mode: boolean (pass/fail) or detailed (multiple levels)';
COMMENT ON COLUMN eval_cfg_sys.show_numerical_score IS 'Whether to display numerical compliance scores';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_eval_cfg_sys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_cfg_sys_updated_at ON eval_cfg_sys;
CREATE TRIGGER eval_cfg_sys_updated_at
    BEFORE UPDATE ON eval_cfg_sys
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_cfg_sys_updated_at();

-- Insert default configuration (idempotent)
INSERT INTO eval_cfg_sys (categorical_mode, show_numerical_score)
SELECT 'detailed', true
WHERE NOT EXISTS (SELECT 1 FROM eval_cfg_sys);

-- ============================================================================
-- End of migration
-- ============================================================================
