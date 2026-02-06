-- ============================================================================
-- Module: module-eval-optimizer
-- Migration: 006-eval-opt-prompt-versions
-- Description: Prompt versioning and deployment tracking
-- ============================================================================

-- ============================================================================
-- PROMPT VERSIONS
-- ============================================================================

-- Create eval_opt_prompt_versions table
CREATE TABLE IF NOT EXISTS eval_opt_prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proj_id UUID NOT NULL REFERENCES eval_opt_projects(id) ON DELETE CASCADE,
    prompt_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Prompt configuration
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
    max_tokens INTEGER NOT NULL DEFAULT 4096,
    
    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    parent_version_id UUID REFERENCES eval_opt_prompt_versions(id),
    
    -- Deployment status
    is_deployed BOOLEAN NOT NULL DEFAULT false,
    deployed_to_doc_type_id UUID REFERENCES eval_doc_types(id),
    
    -- Performance metrics (from best run)
    best_run_id UUID REFERENCES eval_opt_runs(id),
    best_accuracy DECIMAL(5,2),
    
    -- Audit fields
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add table comment
COMMENT ON TABLE eval_opt_prompt_versions IS 'Prompt versions with deployment tracking';
COMMENT ON COLUMN eval_opt_prompt_versions.proj_id IS 'Project foreign key';
COMMENT ON COLUMN eval_opt_prompt_versions.prompt_name IS 'Prompt name';
COMMENT ON COLUMN eval_opt_prompt_versions.description IS 'Version description';
COMMENT ON COLUMN eval_opt_prompt_versions.system_prompt IS 'System prompt text';
COMMENT ON COLUMN eval_opt_prompt_versions.user_prompt_template IS 'User prompt template';
COMMENT ON COLUMN eval_opt_prompt_versions.version IS 'Version number';
COMMENT ON COLUMN eval_opt_prompt_versions.parent_version_id IS 'Parent version (for lineage)';
COMMENT ON COLUMN eval_opt_prompt_versions.is_deployed IS 'Whether this version is deployed';
COMMENT ON COLUMN eval_opt_prompt_versions.deployed_to_doc_type_id IS 'Doc type this version is deployed to';
COMMENT ON COLUMN eval_opt_prompt_versions.best_run_id IS 'Best optimization run for this version';
COMMENT ON COLUMN eval_opt_prompt_versions.best_accuracy IS 'Best accuracy achieved';

-- Add constraint for temperature range (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'eval_opt_prompt_versions_temp_check'
    ) THEN
        ALTER TABLE eval_opt_prompt_versions 
          ADD CONSTRAINT eval_opt_prompt_versions_temp_check 
          CHECK (temperature >= 0.0 AND temperature <= 1.0);
    END IF;
END $$;

-- Add constraint for accuracy range (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'eval_opt_prompt_versions_accuracy_check'
    ) THEN
        ALTER TABLE eval_opt_prompt_versions 
          ADD CONSTRAINT eval_opt_prompt_versions_accuracy_check 
          CHECK (best_accuracy IS NULL OR (best_accuracy >= 0.0 AND best_accuracy <= 100.0));
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_opt_prompt_ver_proj 
    ON eval_opt_prompt_versions(proj_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_prompt_ver_name 
    ON eval_opt_prompt_versions(proj_id, prompt_name);
CREATE INDEX IF NOT EXISTS idx_eval_opt_prompt_ver_version 
    ON eval_opt_prompt_versions(proj_id, version);
CREATE INDEX IF NOT EXISTS idx_eval_opt_prompt_ver_deployed 
    ON eval_opt_prompt_versions(is_deployed, deployed_to_doc_type_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_prompt_ver_parent 
    ON eval_opt_prompt_versions(parent_version_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_eval_opt_prompt_versions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_opt_prompt_versions_updated_at ON eval_opt_prompt_versions;
CREATE TRIGGER eval_opt_prompt_versions_updated_at
    BEFORE UPDATE ON eval_opt_prompt_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_opt_prompt_versions_updated_at();

-- ============================================================================
-- PROMPT DEPLOYMENTS
-- ============================================================================

-- Create eval_opt_prompt_deployments table
CREATE TABLE IF NOT EXISTS eval_opt_prompt_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_version_id UUID NOT NULL REFERENCES eval_opt_prompt_versions(id),
    doc_type_id UUID NOT NULL REFERENCES eval_doc_types(id),
    
    -- Deployment metadata
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    deployed_at TIMESTAMPTZ,
    deployed_by UUID REFERENCES auth.users(id),
    rollback_at TIMESTAMPTZ,
    rollback_by UUID REFERENCES auth.users(id),
    rollback_reason TEXT,
    
    -- Pre-deployment validation
    validation_run_id UUID REFERENCES eval_opt_runs(id),
    validation_accuracy DECIMAL(5,2),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE eval_opt_prompt_deployments IS 'Deployment history for prompt versions';
COMMENT ON COLUMN eval_opt_prompt_deployments.prompt_version_id IS 'Prompt version foreign key';
COMMENT ON COLUMN eval_opt_prompt_deployments.doc_type_id IS 'Document type foreign key';
COMMENT ON COLUMN eval_opt_prompt_deployments.status IS 'Deployment status: pending, deployed, rolled_back';
COMMENT ON COLUMN eval_opt_prompt_deployments.validation_run_id IS 'Validation run before deployment';
COMMENT ON COLUMN eval_opt_prompt_deployments.validation_accuracy IS 'Accuracy from validation run';

-- Add constraint for status values (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'eval_opt_prompt_deployments_status_check'
    ) THEN
        ALTER TABLE eval_opt_prompt_deployments 
          ADD CONSTRAINT eval_opt_prompt_deployments_status_check 
          CHECK (status IN ('pending', 'deployed', 'rolled_back', 'failed'));
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_opt_deploy_prompt_ver 
    ON eval_opt_prompt_deployments(prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_deploy_doc_type 
    ON eval_opt_prompt_deployments(doc_type_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_deploy_status 
    ON eval_opt_prompt_deployments(status, deployed_at);

-- ============================================================================
-- End of migration
-- ============================================================================