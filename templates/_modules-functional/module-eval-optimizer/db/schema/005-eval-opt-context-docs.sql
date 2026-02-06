-- ============================================================================
-- Module: module-eval-optimizer
-- Migration: 006-eval-opt-context-docs
-- Description: Context documents for RAG-based domain knowledge extraction (Phase 4A)
-- ============================================================================

-- ============================================================================
-- CONTEXT DOCUMENTS TABLE
-- ============================================================================

-- Create eval_opt_context_docs table
CREATE TABLE IF NOT EXISTS eval_opt_context_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ws_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    doc_id UUID NOT NULL,  -- kb_docs.id (uploaded to module-kb)
    doc_type VARCHAR(50) NOT NULL CHECK (doc_type IN ('standard', 'guide', 'requirement', 'example')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    
    -- RAG extraction metadata
    extraction_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
    extraction_completed_at TIMESTAMPTZ,
    extracted_concepts JSONB,  -- Array of key concepts/terms extracted
    /*
    Example:
    {
      "key_concepts": ["CJIS 5.4.1", "encryption at rest", "multi-factor authentication"],
      "standards": ["CJIS Security Policy 5.10", "NIST SP 800-53"],
      "terminology": {
        "encryption": "Process of encoding information...",
        "authentication": "Verification of identity..."
      }
    }
    */
    
    -- Audit columns
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add table comment
COMMENT ON TABLE eval_opt_context_docs IS 'Context documents for domain-aware prompt optimization (Phase 4A)';
COMMENT ON COLUMN eval_opt_context_docs.ws_id IS 'Workspace foreign key';
COMMENT ON COLUMN eval_opt_context_docs.doc_id IS 'Reference to kb_docs.id (document stored in module-kb)';
COMMENT ON COLUMN eval_opt_context_docs.doc_type IS 'Type of context document (standard, guide, requirement, example)';
COMMENT ON COLUMN eval_opt_context_docs.is_primary IS 'Whether this is the primary reference document';
COMMENT ON COLUMN eval_opt_context_docs.extraction_status IS 'Status of RAG extraction (pending, processing, completed, failed)';
COMMENT ON COLUMN eval_opt_context_docs.extracted_concepts IS 'JSON object with extracted domain knowledge';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_opt_context_docs_workspace 
    ON eval_opt_context_docs(ws_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_context_docs_status 
    ON eval_opt_context_docs(ws_id, extraction_status);
CREATE INDEX IF NOT EXISTS idx_eval_opt_context_docs_primary 
    ON eval_opt_context_docs(ws_id, is_primary);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_eval_opt_context_docs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_opt_context_docs_updated_at ON eval_opt_context_docs;
CREATE TRIGGER eval_opt_context_docs_updated_at
    BEFORE UPDATE ON eval_opt_context_docs
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_opt_context_docs_updated_at();

-- ============================================================================
-- End of migration
-- ============================================================================