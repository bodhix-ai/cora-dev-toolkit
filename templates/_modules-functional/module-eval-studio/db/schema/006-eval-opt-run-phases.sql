-- Schema: Optimization Run Phase Tracking
-- Sprint 5 Phase 2: Real-time monitoring of optimization pipeline phases

BEGIN;

-- Phase tracking table (one row per phase per run)
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

COMMIT;