-- ============================================================================
-- Module: module-eval
-- Migration: 007-eval-doc-types
-- Description: Document categories that can be evaluated (per organization)
-- ============================================================================

-- Create eval_doc_types table
CREATE TABLE IF NOT EXISTS eval_doc_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    CONSTRAINT eval_doc_types_org_name_unique UNIQUE (org_id, name)
);

-- Add table comment
COMMENT ON TABLE eval_doc_types IS 'Document categories that can be evaluated (per organization)';
COMMENT ON COLUMN eval_doc_types.org_id IS 'Organization this document type belongs to';
COMMENT ON COLUMN eval_doc_types.name IS 'Document type name (e.g., "IT Security Policy")';
COMMENT ON COLUMN eval_doc_types.description IS 'Description of the document type';
COMMENT ON COLUMN eval_doc_types.is_active IS 'Soft delete flag';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_doc_types_org 
    ON eval_doc_types(org_id);
CREATE INDEX IF NOT EXISTS idx_eval_doc_types_active 
    ON eval_doc_types(org_id, is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_eval_doc_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_doc_types_updated_at ON eval_doc_types;
CREATE TRIGGER eval_doc_types_updated_at
    BEFORE UPDATE ON eval_doc_types
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_doc_types_updated_at();

-- ============================================================================
-- End of migration
-- ============================================================================
