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
    
    -- Document type and criteria set for this run
    doc_type_id UUID,  -- References eval_cfg_org_doc_types
    criteria_set_id UUID,  -- References eval_cfg_org_criteria_sets
    
    prompt_version_id UUID,  -- Future: REFERENCES eval_opt_prompt_versions(id)

    -- Prompt configuration (nullable - filled during optimization)
    system_prompt TEXT,
    user_prompt_template TEXT,
    temperature DECIMAL(3,2),
    max_tokens INTEGER,

    -- Phase 4 Redesign: Context docs and response structure
    context_doc_ids UUID[],  -- Array of KB doc IDs used for RAG
    response_structure_id UUID,  -- Future: REFERENCES eval_opt_response_structures(id)
    generated_prompts JSONB,  -- Array of prompt variations generated and tested

    -- Run metadata
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    progress INTEGER NOT NULL DEFAULT 0,
    progress_message TEXT,
    thoroughness VARCHAR(50) DEFAULT 'balanced',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Phase tracking (Sprint 5 Phase 2)
    current_phase INTEGER,
    current_phase_name VARCHAR(255),

    -- Results summary
    total_samples INTEGER NOT NULL DEFAULT 0,
    total_criteria INTEGER NOT NULL DEFAULT 0,
    overall_accuracy DECIMAL(5,2),  -- Percentage
    best_variation VARCHAR(255),
    recommendations JSONB,
    variation_summary JSONB,
    
    -- LLM configuration
    meta_prompt_model_id UUID,
    eval_model_id UUID,

    -- Audit fields
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE eval_opt_runs IS 'Optimization runs with prompt configurations and results';
COMMENT ON COLUMN eval_opt_runs.ws_id IS 'Workspace foreign key';
COMMENT ON COLUMN eval_opt_runs.name IS 'Run name';
COMMENT ON COLUMN eval_opt_runs.doc_type_id IS 'Document type for this optimization run';
COMMENT ON COLUMN eval_opt_runs.criteria_set_id IS 'Criteria set for this optimization run';
COMMENT ON COLUMN eval_opt_runs.prompt_version_id IS 'Prompt version foreign key (future)';
COMMENT ON COLUMN eval_opt_runs.system_prompt IS 'System prompt used for this run';
COMMENT ON COLUMN eval_opt_runs.user_prompt_template IS 'User prompt template used for this run';
COMMENT ON COLUMN eval_opt_runs.temperature IS 'Temperature parameter (0.0-1.0)';
COMMENT ON COLUMN eval_opt_runs.max_tokens IS 'Maximum tokens for AI response';
COMMENT ON COLUMN eval_opt_runs.context_doc_ids IS 'Array of context document IDs used for RAG';
COMMENT ON COLUMN eval_opt_runs.response_structure_id IS 'Response structure foreign key (future)';
COMMENT ON COLUMN eval_opt_runs.generated_prompts IS 'Array of prompt variations generated and tested';
COMMENT ON COLUMN eval_opt_runs.status IS 'Run status: draft, pending, processing, running, completed, failed, cancelled';
COMMENT ON COLUMN eval_opt_runs.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN eval_opt_runs.progress_message IS 'Current progress status message';
COMMENT ON COLUMN eval_opt_runs.thoroughness IS 'Optimization thoroughness: fast, balanced, thorough';
COMMENT ON COLUMN eval_opt_runs.overall_accuracy IS 'Overall accuracy percentage';
COMMENT ON COLUMN eval_opt_runs.best_variation IS 'Name of the best performing prompt variation';
COMMENT ON COLUMN eval_opt_runs.recommendations IS 'JSON array of actionable improvement recommendations';
COMMENT ON COLUMN eval_opt_runs.variation_summary IS 'Summary of all tested variations and their metrics';

-- Add constraint for status values (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'eval_opt_runs_status_check'
    ) THEN
        ALTER TABLE eval_opt_runs
          ADD CONSTRAINT eval_opt_runs_status_check
          CHECK (status IN ('draft', 'pending', 'processing', 'running', 'completed', 'failed', 'cancelled'));
    END IF;
END $$;

-- Add constraint for temperature range (idempotent) - nullable so check for NULL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'eval_opt_runs_temperature_check'
    ) THEN
        ALTER TABLE eval_opt_runs
          ADD CONSTRAINT eval_opt_runs_temperature_check
          CHECK (temperature IS NULL OR (temperature >= 0.0 AND temperature <= 1.0));
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
CREATE INDEX IF NOT EXISTS idx_eval_opt_run_doc_type
    ON eval_opt_runs(doc_type_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_run_criteria_set
    ON eval_opt_runs(criteria_set_id);

-- ============================================================================
-- RUN RESULTS
-- ============================================================================

-- Create eval_opt_run_results table
CREATE TABLE IF NOT EXISTS eval_opt_run_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES eval_opt_runs(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES eval_opt_run_executions(id) ON DELETE CASCADE,  -- Sprint 6: Execution reference
    group_id UUID NOT NULL REFERENCES eval_opt_doc_groups(id),
    criteria_item_id UUID NOT NULL REFERENCES eval_criteria_items(id),
    truth_key_id UUID NOT NULL REFERENCES eval_opt_truth_keys(id),
    
    -- AI evaluation results (score-based architecture - Sprint 5 Phase 3)
    ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
    ai_result JSONB,
    ai_status_id UUID REFERENCES eval_sys_status_options(id),  -- DEPRECATED (nullable for backward compat)
    ai_confidence INTEGER CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
    ai_explanation TEXT,  -- DEPRECATED: Use ai_result JSONB instead (nullable for backward compatibility)
    ai_citations JSONB,
    
    -- Comparison to truth key
    status_match BOOLEAN NOT NULL,  -- Reinterpreted: score within tolerance (±10 points)
    confidence_diff INTEGER,
    score_diff INTEGER,  -- Absolute difference between AI score and truth score
    
    -- Classification
    result_type VARCHAR(50) NOT NULL,
    
    -- Variation Tracking
    variation_name VARCHAR(255) NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(run_id, group_id, criteria_item_id, variation_name)
);

-- Add table comment
COMMENT ON TABLE eval_opt_run_results IS 'Detailed results per criterion per sample for each run';
COMMENT ON COLUMN eval_opt_run_results.run_id IS 'Run foreign key';
COMMENT ON COLUMN eval_opt_run_results.execution_id IS 'Execution reference (nullable for backward compat with pre-S6 results)';
COMMENT ON COLUMN eval_opt_run_results.group_id IS 'Document group foreign key';
COMMENT ON COLUMN eval_opt_run_results.criteria_item_id IS 'Criteria item foreign key';
COMMENT ON COLUMN eval_opt_run_results.truth_key_id IS 'Truth key foreign key';
COMMENT ON COLUMN eval_opt_run_results.ai_score IS 'AI assessment score (0-100, direct from AI)';
COMMENT ON COLUMN eval_opt_run_results.ai_result IS 'Full AI response JSON (score, confidence, explanation, citations, custom fields)';
COMMENT ON COLUMN eval_opt_run_results.ai_status_id IS 'DEPRECATED: Legacy status option reference (nullable for backward compat)';
COMMENT ON COLUMN eval_opt_run_results.ai_confidence IS 'AI assessment confidence (0-100)';
COMMENT ON COLUMN eval_opt_run_results.ai_explanation IS 'DEPRECATED: AI assessment explanation (use ai_result JSONB instead, nullable for backward compatibility)';
COMMENT ON COLUMN eval_opt_run_results.ai_citations IS 'AI-generated citations';
COMMENT ON COLUMN eval_opt_run_results.status_match IS 'Reinterpreted: Whether AI score within tolerance of truth score (±10 points)';
COMMENT ON COLUMN eval_opt_run_results.confidence_diff IS 'Absolute difference in confidence';
COMMENT ON COLUMN eval_opt_run_results.score_diff IS 'Absolute difference between AI score and truth score';
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
CREATE INDEX IF NOT EXISTS idx_eval_opt_result_score
    ON eval_opt_run_results(ai_score);
CREATE INDEX IF NOT EXISTS idx_eval_opt_result_status_match 
    ON eval_opt_run_results(run_id, status_match);
CREATE INDEX IF NOT EXISTS idx_eval_opt_result_type 
    ON eval_opt_run_results(run_id, result_type);
CREATE INDEX IF NOT EXISTS idx_eval_opt_result_variation 
    ON eval_opt_run_results(run_id, variation_name);
CREATE INDEX IF NOT EXISTS idx_eval_opt_result_execution_id
    ON eval_opt_run_results(execution_id);

-- ============================================================================
-- End of migration
-- ============================================================================
