-- ============================================================================
-- Module: module-eval
-- Migration: 008-eval-criteria-sets
-- Description: Collections of evaluation criteria linked to document types
-- ============================================================================

-- Create eval_criteria_sets table
CREATE TABLE IF NOT EXISTS eval_criteria_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type_id UUID NOT NULL REFERENCES eval_doc_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    version TEXT DEFAULT '1.0',
    use_weighted_scoring BOOLEAN NOT NULL DEFAULT false,
    source_file_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    CONSTRAINT eval_criteria_sets_doc_type_name_version_unique 
        UNIQUE (doc_type_id, name, version)
);

-- Add table comment
COMMENT ON TABLE eval_criteria_sets IS 'Collections of evaluation criteria linked to document types';
COMMENT ON COLUMN eval_criteria_sets.doc_type_id IS 'Document type this criteria set applies to';
COMMENT ON COLUMN eval_criteria_sets.name IS 'Criteria set name';
COMMENT ON COLUMN eval_criteria_sets.description IS 'Set description';
COMMENT ON COLUMN eval_criteria_sets.version IS 'Version identifier';
COMMENT ON COLUMN eval_criteria_sets.use_weighted_scoring IS 'Use weights for score calculation';
COMMENT ON COLUMN eval_criteria_sets.source_file_name IS 'Original import file name';
COMMENT ON COLUMN eval_criteria_sets.is_active IS 'Soft delete flag';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_criteria_sets_doc_type 
    ON eval_criteria_sets(doc_type_id);
CREATE INDEX IF NOT EXISTS idx_eval_criteria_sets_active 
    ON eval_criteria_sets(doc_type_id, is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_eval_criteria_sets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_criteria_sets_updated_at ON eval_criteria_sets;
CREATE TRIGGER eval_criteria_sets_updated_at
    BEFORE UPDATE ON eval_criteria_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_criteria_sets_updated_at();

-- ============================================================================
-- End of migration
-- ============================================================================
