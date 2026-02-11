-- ============================================================================
-- Module: module-eval-studio
-- Migration: Add Execution Concept
-- Date: 2026-02-10
-- Description: Sprint 6 - Add execution table to enable multiple optimization
--              runs with different parameters while reusing truth sets
-- ============================================================================

-- ============================================================================
-- STEP 1: Create eval_opt_run_executions table
-- ============================================================================

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

-- Add constraint for status values
ALTER TABLE eval_opt_run_executions
  ADD CONSTRAINT eval_opt_run_executions_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));

-- Add constraint for accuracy range
ALTER TABLE eval_opt_run_executions
  ADD CONSTRAINT eval_opt_run_executions_accuracy_check
  CHECK (overall_accuracy IS NULL OR (overall_accuracy >= 0.0 AND overall_accuracy <= 100.0));

-- Add constraint for temperature range
ALTER TABLE eval_opt_run_executions
  ADD CONSTRAINT eval_opt_run_executions_temperature_min_check
  CHECK (temperature_min IS NULL OR (temperature_min >= 0.0 AND temperature_min <= 1.0));

ALTER TABLE eval_opt_run_executions
  ADD CONSTRAINT eval_opt_run_executions_temperature_max_check
  CHECK (temperature_max IS NULL OR (temperature_max >= 0.0 AND temperature_max <= 1.0));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_opt_executions_run_id
    ON eval_opt_run_executions(run_id);

CREATE INDEX IF NOT EXISTS idx_eval_opt_executions_status
    ON eval_opt_run_executions(status);

CREATE INDEX IF NOT EXISTS idx_eval_opt_executions_created_at
    ON eval_opt_run_executions(run_id, created_at DESC);

-- ============================================================================
-- STEP 2: Add execution_id to eval_opt_run_results
-- ============================================================================

-- Add execution_id column (nullable for backward compatibility with existing results)
ALTER TABLE eval_opt_run_results
  ADD COLUMN IF NOT EXISTS execution_id UUID REFERENCES eval_opt_run_executions(id) ON DELETE CASCADE;

-- Add index for execution_id
CREATE INDEX IF NOT EXISTS idx_eval_opt_result_execution_id
    ON eval_opt_run_results(execution_id);

-- Add comment
COMMENT ON COLUMN eval_opt_run_results.execution_id IS 'Execution reference (nullable for backward compat with pre-S6 results)';

-- ============================================================================
-- STEP 3: Migrate existing results to execution model (data migration)
-- ============================================================================

-- For each existing run with results, create execution_number = 1
DO $$
DECLARE
    run_record RECORD;
    new_execution_id UUID;
BEGIN
    -- Find all runs that have results but no executions yet
    FOR run_record IN 
        SELECT DISTINCT r.id, r.ws_id, r.status, r.overall_accuracy, r.best_variation, 
               r.started_at, r.completed_at, r.created_by, r.thoroughness
        FROM eval_opt_runs r
        WHERE EXISTS (
            SELECT 1 FROM eval_opt_run_results rr 
            WHERE rr.run_id = r.id AND rr.execution_id IS NULL
        )
    LOOP
        -- Create execution #1 for this run
        INSERT INTO eval_opt_run_executions (
            run_id,
            execution_number,
            status,
            max_trials,
            overall_accuracy,
            best_variation,
            started_at,
            completed_at,
            created_by
        )
        VALUES (
            run_record.id,
            1,
            CASE 
                WHEN run_record.status = 'completed' THEN 'completed'
                WHEN run_record.status = 'failed' THEN 'failed'
                WHEN run_record.status = 'running' THEN 'running'
                ELSE 'completed'
            END,
            CASE run_record.thoroughness
                WHEN 'fast' THEN 3
                WHEN 'thorough' THEN 12
                ELSE 7
            END,
            run_record.overall_accuracy,
            run_record.best_variation,
            run_record.started_at,
            run_record.completed_at,
            run_record.created_by
        )
        RETURNING id INTO new_execution_id;
        
        -- Link all existing results to this execution
        UPDATE eval_opt_run_results
        SET execution_id = new_execution_id
        WHERE run_id = run_record.id
          AND execution_id IS NULL;
        
        RAISE NOTICE 'Migrated run % to execution %', run_record.id, new_execution_id;
    END LOOP;
END $$;

-- ============================================================================
-- End of migration
-- ============================================================================