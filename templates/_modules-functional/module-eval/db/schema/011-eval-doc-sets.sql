-- ============================================================================
-- Module: module-eval
-- Migration: 011-eval-doc-sets
-- Description: Links evaluations to documents (supports multi-document evaluations)
-- Naming: Follows Rule 2 (plural main noun)
-- ============================================================================

-- Create eval_doc_sets table (multiple rows per evaluation)
CREATE TABLE IF NOT EXISTS eval_doc_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eval_summary_id UUID NOT NULL REFERENCES eval_doc_summaries(id) ON DELETE CASCADE,
    kb_doc_id UUID NOT NULL,
    doc_summary TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT eval_doc_sets_eval_doc_unique UNIQUE (eval_summary_id, kb_doc_id)
);

-- Add table comment
COMMENT ON TABLE eval_doc_sets IS 'Links evaluations to documents (supports multi-document evaluations)';
COMMENT ON COLUMN eval_doc_sets.eval_summary_id IS 'Evaluation this document belongs to';
COMMENT ON COLUMN eval_doc_sets.kb_doc_id IS 'Reference to kb_documents (module-kb)';
COMMENT ON COLUMN eval_doc_sets.doc_summary IS 'Individual document summary';
COMMENT ON COLUMN eval_doc_sets.order_index IS 'Document order (primary first)';
COMMENT ON COLUMN eval_doc_sets.is_primary IS 'Is this the primary document?';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_doc_sets_eval 
    ON eval_doc_sets(eval_summary_id);
CREATE INDEX IF NOT EXISTS idx_eval_doc_sets_doc 
    ON eval_doc_sets(kb_doc_id);

-- ============================================================================
-- End of migration
-- ============================================================================
