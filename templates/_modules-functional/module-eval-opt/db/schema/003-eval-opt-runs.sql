-- ============================================================================
-- Module: module-eval-optimizer
-- Migration: 003-eval-opt-runs
-- Description: Optimization runs and run results
-- ============================================================================

-- ============================================================================
-- OPTIMIZATION RUNS
-- ============================================================================

-- Create eval_opt_runs table
CREATE TABLE IF NOT EXISTS eval_opt_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ws_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    prompt_version_id UUID,  -- Future: REFERENCES eval_opt_prompt_versions(id)
    
    -- Prompt configuration (stored for this run)
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    temperature DECIMAL(3,2) NOT NULL,
    max_tokens INTEGER NOT NULL,
    
    -- Phase 4 Redesign: Context docs and response structure
    context_doc_ids UUID[],  -- Array of KB doc IDs used for RAG
    response_structure_id UUID,  -- Future: REFERENCES eval_opt_response_structures(id)
    generated_prompts JSONB,  -- Array of prompt variations generated and tested
    
    -- Run metadata
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Results summary
    total_samples INTEGER NOT NULL DEFAULT 0,
    total_criteria INTEGER NOT NULL DEFAULT 0,
    overall_accuracy DECIMAL(5,2),  -- Percentage
    
    -- Audit fields
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE eval_opt_runs IS 'Optimization runs with prompt configurations and results';
COMMENT ON COLUMN eval_opt_runs.ws_id IS 'Workspace foreign key';
COMMENT ON COLUMN eval_opt_runs.name IS 'Run name';
COMMENT ON COLUMN eval_opt_runs.prompt_version_id IS 'Prompt version foreign key (future)';
COMMENT ON COLUMN eval_opt_runs.system_prompt IS 'System prompt used for this run';
COMMENT ON COLUMN eval_opt_runs.user_prompt_template IS 'User prompt template used for this run';
COMMENT ON COLUMN eval_opt_runs.temperature IS 'Temperature parameter (0.0-1.0)';
COMMENT ON COLUMN eval_opt_runs.max_tokens IS 'Maximum tokens for AI response';
COMMENT ON COLUMN eval_opt_runs.context_doc_ids IS 'Array of context document IDs used for RAG';
COMMENT ON COLUMN eval_opt_runs.response_structure_id IS 'Response structure foreign key (future)';
COMMENT ON COLUMN eval_opt_runs.generated_prompts IS 'Array of prompt variations generated and tested';
COMMENT ON COLUMN eval_opt_runs.status IS 'Run status: pending, running, completed, failed';
COMMENT ON COLUMN eval_opt_runs.overall_accuracy IS 'Overall accuracy percentage';

-- Add constraint for status values (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'eval_opt_runs_status_check'
    ) THEN
        ALTER TABLE eval_opt_runs 
          ADD CONSTRAINT eval_opt_runs_status_check 
          CHECK (status IN ('pending', 'running', 'completed', 'failed'));
    END IF;
END $$;

-- Add constraint for temperature range (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'eval_opt_runs_temperature_check'
    ) THEN
        ALTER TABLE eval_opt_runs 
          ADD CONSTRAINT eval_opt_runs_temperature_check 
          CHECK (temperature >= 0.0 AND temperature <= 1.0);
    END IF;
END $$;

-- Add constraint for accuracy range (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'eval_opt_runs_accuracy_check'
    ) THEN
        ALTER TABLE eval_opt_runs 
          ADD CONSTRAINT eval_opt_runs_accuracy_check 
          CHECK (overall_accuracy IS NULL OR (overall_accuracy >= 0.0 AND overall_accuracy <= 100.0));
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_opt_run_workspace 
    ON eval_opt_runs(ws_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_run_status 
    ON eval_opt_runs(ws_id, status);
CREATE INDEX IF NOT EXISTS idx_eval_opt_run_created_by 
    ON eval_opt_runs(created_by);
CREATE INDEX IF NOT EXISTS idx_eval_opt_run_created_at 
    ON eval_opt_runs(ws_id, created_at DESC);

-- ============================================================================
-- RUN RESULTS
-- ============================================================================

-- Create eval_opt_run_results table
CREATE TABLE IF NOT EXISTS eval_opt_run_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES eval_opt_runs(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES eval_opt_doc_groups(id),
    criteria_item_id UUID NOT NULL REFERENCES eval_criteria_items(id),
    truth_key_id UUID NOT NULL REFERENCES eval_opt_truth_keys(id),
    
    -- AI evaluation results
    ai_status_id UUID NOT NULL REFERENCES eval_sys_status_options(id),
    ai_confidence INTEGER CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
    ai_explanation TEXT NOT NULL,
    ai_citations JSONB,
    
    -- Comparison to truth key
    status_match BOOLEAN NOT NULL,
    confidence_diff INTEGER,
    
    -- Classification
    result_type VARCHAR(50) NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(run_id, group_id, criteria_item_id)
);

-- Add table comment
COMMENT ON TABLE eval_opt_run_results IS 'Detailed results per criterion per sample for each run';
COMMENT ON COLUMN eval_opt_run_results.run_id IS 'Run foreign key';
COMMENT ON COLUMN eval_opt_run_results.group_id IS 'Document group foreign key';
COMMENT ON COLUMN eval_opt_run_results.criteria_item_id IS 'Criteria item foreign key';
COMMENT ON COLUMN eval_opt_run_results.truth_key_id IS 'Truth key foreign key';
COMMENT ON COLUMN eval_opt_run_results.ai_status_id IS 'AI assessment status (from eval_sys_status_options)';
COMMENT ON COLUMN eval_opt_run_results.ai_confidence IS 'AI assessment confidence (0-100)';
COMMENT ON COLUMN eval_opt_run_results.ai_explanation IS 'AI assessment explanation';
COMMENT ON COLUMN eval_opt_run_results.ai_citations IS 'AI-generated citations';
COMMENT ON COLUMN eval_opt_run_results.status_match IS 'Whether AI status matched truth status';
COMMENT ON COLUMN eval_opt_run_results.confidence_diff IS 'Absolute difference in confidence';
COMMENT ON COLUMN eval_opt_run_results.result_type IS 'Classification: true_positive, true_negative, false_positive, false_negative';

-- Add constraint for result_type values (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'eval_opt_run_results_type_check'
    ) THEN
        ALTER TABLE eval_opt_run_results 
          ADD CONSTRAINT eval_opt_run_results_type_check 
          CHECK (result_type IN ('true_positive', 'true_negative', 'false_positive', 'false_negative'));
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_opt_result_run 
    ON eval_opt_run_results(run_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_result_group 
    ON eval_opt_run_results(group_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_result_criteria 
    ON eval_opt_run_results(criteria_item_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_result_truth_key 
    ON eval_opt_run_results(truth_key_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_result_status_match 
    ON eval_opt_run_results(run_id, status_match);
CREATE INDEX IF NOT EXISTS idx_eval_opt_result_type 
    ON eval_opt_run_results(run_id, result_type);

-- ============================================================================
-- End of migration
-- ============================================================================
