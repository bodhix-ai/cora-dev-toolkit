-- ============================================================================
-- Module: module-eval
-- Migration: 005-eval-cfg-org-prompts
-- Description: Organization-level prompt overrides (only if ai_config_delegated = true)
-- Naming: Follows Rule 8 (Config Tables - _cfg_ infix pattern)
-- ============================================================================

-- Create eval_cfg_org_prompts table
CREATE TABLE IF NOT EXISTS eval_cfg_org_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    prompt_type TEXT NOT NULL,
    ai_provider_id UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
    ai_model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    system_prompt TEXT,
    user_prompt_template TEXT,
    temperature DECIMAL(3,2),
    max_tokens INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    CONSTRAINT eval_cfg_org_prompts_org_type_unique UNIQUE (org_id, prompt_type),
    CONSTRAINT eval_cfg_org_prompts_type_check 
        CHECK (prompt_type IN ('doc_summary', 'evaluation', 'eval_summary')),
    CONSTRAINT eval_cfg_org_prompts_temp_check 
        CHECK (temperature IS NULL OR (temperature >= 0 AND temperature <= 1))
);

-- Add table comment
COMMENT ON TABLE eval_cfg_org_prompts IS 'Organization-level prompt overrides (only used if ai_config_delegated = true)';
COMMENT ON COLUMN eval_cfg_org_prompts.org_id IS 'Organization this config belongs to';
COMMENT ON COLUMN eval_cfg_org_prompts.prompt_type IS 'Type: doc_summary, evaluation, or eval_summary';
COMMENT ON COLUMN eval_cfg_org_prompts.system_prompt IS 'System prompt override (NULL = use sys default)';
COMMENT ON COLUMN eval_cfg_org_prompts.user_prompt_template IS 'User prompt template override';
COMMENT ON COLUMN eval_cfg_org_prompts.temperature IS 'Temperature override (NULL = use sys default)';
COMMENT ON COLUMN eval_cfg_org_prompts.max_tokens IS 'Max tokens override (NULL = use sys default)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_cfg_org_prompts_org 
    ON eval_cfg_org_prompts(org_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_eval_cfg_org_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_cfg_org_prompts_updated_at ON eval_cfg_org_prompts;
CREATE TRIGGER eval_cfg_org_prompts_updated_at
    BEFORE UPDATE ON eval_cfg_org_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_cfg_org_prompts_updated_at();

-- ============================================================================
-- End of migration
-- ============================================================================
