-- ============================================================================
-- Module: module-eval-studio
-- Schema: 009-eval-opt-run-executions
-- Description: Optimization run executions (Sprint 6 - Execution concept)
-- ============================================================================

-- ============================================================================
-- OPTIMIZATION RUN EXECUTIONS
-- ============================================================================

-- Create eval_opt_run_executions table
CREATE TABLE IF NOT EXISTS eval_opt_run_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES eval_opt_runs(id) ON DELETE CASCADE,
    execution_number INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Execution parameters
    max_trials INT NOT NULL DEFAULT 7,
    temperature_min NUMERIC(3,2),
    temperature_max NUMERIC(3,2),
    max_tokens_min INT,
    max_tokens_max INT,
    strategies JSONB,  -- Which prompt strategies to use
    
    -- Results
    overall_accuracy NUMERIC(5,2),
    best_variation VARCHAR(255),
    results JSONB,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INT,
    
    -- Error handling
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(run_id, execution_number)
);

-- Add table comment
COMMENT ON TABLE eval_opt_run_executions IS 'Multiple optimization executions per run with different parameters';
COMMENT ON COLUMN eval_opt_run_executions.run_id IS 'Parent run reference';
COMMENT ON COLUMN eval_opt_run_executions.execution_number IS 'Sequential execution number (1, 2, 3...)';
COMMENT ON COLUMN eval_opt_run_executions.status IS 'Execution status: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN eval_opt_run_executions.max_trials IS 'Number of prompt variations to test';
COMMENT ON COLUMN eval_opt_run_executions.temperature_min IS 'Minimum temperature for variations';
COMMENT ON COLUMN eval_opt_run_executions.temperature_max IS 'Maximum temperature for variations';
COMMENT ON COLUMN eval_opt_run_executions.max_tokens_min IS 'Minimum token limit';
COMMENT ON COLUMN eval_opt_run_executions.max_tokens_max IS 'Maximum token limit';
COMMENT ON COLUMN eval_opt_run_executions.strategies IS 'Array of prompt strategies to use';
COMMENT ON COLUMN eval_opt_run_executions.overall_accuracy IS 'Overall accuracy percentage for this execution';
COMMENT ON COLUMN eval_opt_run_executions.best_variation IS 'Name of best performing variation';
COMMENT ON COLUMN eval_opt_run_executions.results IS 'Full execution results JSON';

-- Add constraint for status values (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'eval_opt_run_executions_status_check'
    ) THEN
        ALTER TABLE eval_opt_run_executions
          ADD CONSTRAINT eval_opt_run_executions_status_check
          CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));
    END IF;
END $$;

-- Add constraint for accuracy range (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'eval_opt_run_executions_accuracy_check'
    ) THEN
        ALTER TABLE eval_opt_run_executions
          ADD CONSTRAINT eval_opt_run_executions_accuracy_check
          CHECK (overall_accuracy IS NULL OR (overall_accuracy >= 0.0 AND overall_accuracy <= 100.0));
    END IF;
END $$;

-- Add constraint for temperature range (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'eval_opt_run_executions_temperature_min_check'
    ) THEN
        ALTER TABLE eval_opt_run_executions
          ADD CONSTRAINT eval_opt_run_executions_temperature_min_check
          CHECK (temperature_min IS NULL OR (temperature_min >= 0.0 AND temperature_min <= 1.0));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'eval_opt_run_executions_temperature_max_check'
    ) THEN
        ALTER TABLE eval_opt_run_executions
          ADD CONSTRAINT eval_opt_run_executions_temperature_max_check
          CHECK (temperature_max IS NULL OR (temperature_max >= 0.0 AND temperature_max <= 1.0));
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_opt_executions_run_id
    ON eval_opt_run_executions(run_id);

CREATE INDEX IF NOT EXISTS idx_eval_opt_executions_status
    ON eval_opt_run_executions(status);

CREATE INDEX IF NOT EXISTS idx_eval_opt_executions_created_at
    ON eval_opt_run_executions(run_id, created_at DESC);

-- ============================================================================
-- End of schema
-- ============================================================================