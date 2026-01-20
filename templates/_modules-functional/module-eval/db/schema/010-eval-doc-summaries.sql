-- ============================================================================
-- Module: module-eval
-- Migration: 010-eval-doc-summaries
-- Description: Main evaluation record with summaries and status
-- Naming: Follows Rule 2 (plural main noun)
-- ============================================================================

-- Create eval_doc_summaries table (one row per evaluation)
CREATE TABLE IF NOT EXISTS eval_doc_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    doc_type_id UUID REFERENCES eval_doc_types(id) ON DELETE RESTRICT,
    criteria_set_id UUID REFERENCES eval_criteria_sets(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    progress INTEGER NOT NULL DEFAULT 0,
    doc_summary TEXT,
    eval_summary TEXT,
    compliance_score DECIMAL(5,2),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    CONSTRAINT eval_doc_summaries_status_check
        CHECK (status IN ('draft', 'pending', 'processing', 'completed', 'failed')),
    CONSTRAINT eval_doc_summaries_progress_check 
        CHECK (progress >= 0 AND progress <= 100)
);

-- Add table comment
COMMENT ON TABLE eval_doc_summaries IS 'Main evaluation record with summaries and status';
COMMENT ON COLUMN eval_doc_summaries.workspace_id IS 'Workspace this evaluation belongs to';
COMMENT ON COLUMN eval_doc_summaries.doc_type_id IS 'Document type being evaluated (nullable for draft)';
COMMENT ON COLUMN eval_doc_summaries.criteria_set_id IS 'Criteria set used for evaluation (nullable for draft)';
COMMENT ON COLUMN eval_doc_summaries.name IS 'Evaluation name/title';
COMMENT ON COLUMN eval_doc_summaries.status IS 'Processing status: draft, pending, processing, completed, failed';
COMMENT ON COLUMN eval_doc_summaries.progress IS 'Processing progress (0-100)';
COMMENT ON COLUMN eval_doc_summaries.doc_summary IS 'AI-generated document summary';
COMMENT ON COLUMN eval_doc_summaries.eval_summary IS 'AI-generated evaluation summary';
COMMENT ON COLUMN eval_doc_summaries.compliance_score IS 'Overall compliance percentage';
COMMENT ON COLUMN eval_doc_summaries.error_message IS 'Error details if failed';
COMMENT ON COLUMN eval_doc_summaries.started_at IS 'Processing start time';
COMMENT ON COLUMN eval_doc_summaries.completed_at IS 'Processing completion time';
COMMENT ON COLUMN eval_doc_summaries.is_deleted IS 'Soft delete flag';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_doc_summaries_workspace 
    ON eval_doc_summaries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_eval_doc_summaries_status 
    ON eval_doc_summaries(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_eval_doc_summaries_doc_type 
    ON eval_doc_summaries(doc_type_id);
CREATE INDEX IF NOT EXISTS idx_eval_doc_summaries_deleted 
    ON eval_doc_summaries(workspace_id, is_deleted);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_eval_doc_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_doc_summaries_updated_at ON eval_doc_summaries;
CREATE TRIGGER eval_doc_summaries_updated_at
    BEFORE UPDATE ON eval_doc_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_doc_summaries_updated_at();

-- ============================================================================
-- End of migration
-- ============================================================================
