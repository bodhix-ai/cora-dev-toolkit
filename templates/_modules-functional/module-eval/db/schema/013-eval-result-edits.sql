-- ============================================================================
-- Module: module-eval
-- Migration: 013-eval-result-edits
-- Description: Human edits to AI results with version control
-- ============================================================================

-- Create eval_result_edits table (multiple rows per criteria result - version history)
CREATE TABLE IF NOT EXISTS eval_result_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    criteria_result_id UUID NOT NULL REFERENCES eval_criteria_results(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    edited_result TEXT,
    edited_status_id UUID,
    edit_notes TEXT,
    is_current BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    CONSTRAINT eval_result_edits_result_version_unique 
        UNIQUE (criteria_result_id, version)
);

-- Add table comment
COMMENT ON TABLE eval_result_edits IS 'Human edits to AI results with version control';
COMMENT ON COLUMN eval_result_edits.criteria_result_id IS 'Criteria result being edited';
COMMENT ON COLUMN eval_result_edits.version IS 'Edit version number';
COMMENT ON COLUMN eval_result_edits.edited_result IS 'Human-edited explanation';
COMMENT ON COLUMN eval_result_edits.edited_status_id IS 'Human-selected status';
COMMENT ON COLUMN eval_result_edits.edit_notes IS 'Notes about the edit';
COMMENT ON COLUMN eval_result_edits.is_current IS 'Is this the current version?';
COMMENT ON COLUMN eval_result_edits.created_by IS 'User who made the edit';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_result_edits_result 
    ON eval_result_edits(criteria_result_id);
CREATE INDEX IF NOT EXISTS idx_eval_result_edits_current 
    ON eval_result_edits(criteria_result_id, is_current);

-- ============================================================================
-- End of migration
-- ============================================================================
