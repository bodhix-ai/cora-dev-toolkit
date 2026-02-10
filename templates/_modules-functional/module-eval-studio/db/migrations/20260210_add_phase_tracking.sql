-- Migration: Add Phase Tracking for Optimization Stepper UI
-- Sprint 5 Phase 2: Enables frontend to display 5-step pipeline with live progress
-- Uses separate tables for better queryability, monitoring, and analytics

BEGIN;

-- Add current phase tracking to eval_opt_runs (quick status check)
ALTER TABLE eval_opt_runs 
ADD COLUMN IF NOT EXISTS current_phase INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_phase_name TEXT;

COMMENT ON COLUMN eval_opt_runs.current_phase IS 'Current phase number (1-5) in optimization pipeline';
COMMENT ON COLUMN eval_opt_runs.current_phase_name IS 'Human-readable phase name for display';

-- Create phase tracking table (one row per phase per run)
CREATE TABLE IF NOT EXISTS eval_opt_run_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES eval_opt_runs(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL,
    phase_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'complete', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(run_id, phase_number)
);

CREATE INDEX IF NOT EXISTS idx_eval_opt_run_phases_run_id ON eval_opt_run_phases(run_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_run_phases_status ON eval_opt_run_phases(status) WHERE status = 'running';

COMMENT ON TABLE eval_opt_run_phases IS 'Tracks progress of each optimization phase for real-time monitoring';
COMMENT ON COLUMN eval_opt_run_phases.phase_number IS 'Phase number (1=RAG, 2=Meta-prompt, 3=Variations, 4=Evaluation, 5=Analysis)';
COMMENT ON COLUMN eval_opt_run_phases.duration_ms IS 'Phase duration in milliseconds (completed_at - started_at)';

-- Create variation progress tracking table (one row per variation per run)
CREATE TABLE IF NOT EXISTS eval_opt_variation_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES eval_opt_runs(id) ON DELETE CASCADE,
    variation_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'complete', 'failed')),
    criteria_completed INTEGER DEFAULT 0,
    criteria_total INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(run_id, variation_name)
);

CREATE INDEX IF NOT EXISTS idx_eval_opt_variation_progress_run_id ON eval_opt_variation_progress(run_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_variation_progress_status ON eval_opt_variation_progress(status) WHERE status = 'running';

COMMENT ON TABLE eval_opt_variation_progress IS 'Tracks per-variation evaluation progress within Phase 4';
COMMENT ON COLUMN eval_opt_variation_progress.criteria_completed IS 'Number of criteria evaluated for this variation';
COMMENT ON COLUMN eval_opt_variation_progress.criteria_total IS 'Total criteria to evaluate for this variation';
COMMENT ON COLUMN eval_opt_variation_progress.duration_ms IS 'Variation execution duration in milliseconds';

-- Verification
DO $$
DECLARE
    v_col_count INTEGER;
    v_table_count INTEGER;
BEGIN
    -- Check columns
    SELECT COUNT(*) INTO v_col_count
    FROM information_schema.columns
    WHERE table_name = 'eval_opt_runs'
    AND column_name IN ('current_phase', 'current_phase_name');
    
    -- Check tables
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_name IN ('eval_opt_run_phases', 'eval_opt_variation_progress');
    
    IF v_col_count = 2 AND v_table_count = 2 THEN
        RAISE NOTICE 'Phase tracking schema created successfully';
    ELSE
        RAISE EXCEPTION 'Phase tracking schema incomplete (columns: %, tables: %)', v_col_count, v_table_count;
    END IF;
END $$;

COMMIT;
