-- Schema: Optimization Variation Progress Tracking
-- Sprint 5 Phase 2: Track per-variation evaluation progress within Phase 4

BEGIN;

-- Variation progress tracking table (one row per variation per run)
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

COMMIT;