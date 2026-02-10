-- ============================================================================
-- Module: module-eval-optimizer
-- Migration: 002-eval-opt-truth-keys
-- Description: Truth keys (manual evaluations) for optimization training
-- ============================================================================

-- ============================================================================
-- TRUTH KEYS
-- ============================================================================

-- Create eval_opt_truth_keys table
CREATE TABLE IF NOT EXISTS eval_opt_truth_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES eval_opt_doc_groups(id) ON DELETE CASCADE,
    criteria_item_id UUID NOT NULL REFERENCES eval_criteria_items(id),
    
    -- CRITICAL: Version truth keys against doc type + criteria set
    doc_type_id UUID NOT NULL REFERENCES eval_doc_types(id),
    criteria_set_id UUID NOT NULL REFERENCES eval_criteria_sets(id),
    criteria_set_version INTEGER NOT NULL,
    
    -- Manual assessment by analyst
    truth_status_id UUID NOT NULL REFERENCES eval_sys_status_options(id),
    truth_confidence INTEGER CHECK (truth_confidence >= 0 AND truth_confidence <= 100),
    truth_explanation TEXT NOT NULL,
    truth_citations JSONB,  -- Array of quotes from document
    section_responses JSONB,  -- Complete section responses JSON from frontend (score, justification, citations, custom fields)
    
    -- Metadata
    evaluated_by UUID NOT NULL REFERENCES auth.users(id),
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    validated BOOLEAN NOT NULL DEFAULT false,
    validated_by UUID REFERENCES auth.users(id),
    validated_at TIMESTAMPTZ,
    
    -- Validity tracking
    is_valid BOOLEAN NOT NULL DEFAULT true,
    invalidated_at TIMESTAMPTZ,
    invalidation_reason TEXT,
    
    -- Audit columns (ADR-015)
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),  -- Nullable: only set on UPDATE, not INSERT
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(group_id, criteria_item_id)
);

-- Add table comment
COMMENT ON TABLE eval_opt_truth_keys IS 'Manual evaluations (truth keys) used for optimization training';
COMMENT ON COLUMN eval_opt_truth_keys.group_id IS 'Document group foreign key';
COMMENT ON COLUMN eval_opt_truth_keys.criteria_item_id IS 'Criteria item foreign key';
COMMENT ON COLUMN eval_opt_truth_keys.doc_type_id IS 'Document type foreign key (for versioning)';
COMMENT ON COLUMN eval_opt_truth_keys.criteria_set_id IS 'Criteria set foreign key (for versioning)';
COMMENT ON COLUMN eval_opt_truth_keys.criteria_set_version IS 'Criteria set version at evaluation time';
COMMENT ON COLUMN eval_opt_truth_keys.truth_status_id IS 'Manual assessment status (from eval_sys_status_options)';
COMMENT ON COLUMN eval_opt_truth_keys.truth_confidence IS 'Manual assessment confidence (0-100)';
COMMENT ON COLUMN eval_opt_truth_keys.truth_explanation IS 'Manual assessment explanation';
COMMENT ON COLUMN eval_opt_truth_keys.truth_citations IS 'Quotes from document supporting assessment';
COMMENT ON COLUMN eval_opt_truth_keys.section_responses IS 'Complete section responses JSON from frontend (score, justification, citations, custom fields)';
COMMENT ON COLUMN eval_opt_truth_keys.evaluated_by IS 'Analyst who performed manual evaluation';
COMMENT ON COLUMN eval_opt_truth_keys.evaluated_at IS 'Manual evaluation timestamp';
COMMENT ON COLUMN eval_opt_truth_keys.validated IS 'Whether truth key has been validated by second analyst';
COMMENT ON COLUMN eval_opt_truth_keys.is_valid IS 'Whether truth key is still valid (false if criteria changed)';
COMMENT ON COLUMN eval_opt_truth_keys.created_by IS 'User who created this record (audit column per ADR-015)';
COMMENT ON COLUMN eval_opt_truth_keys.updated_by IS 'User who last updated this record (NULL until first update, audit column per ADR-015)';
COMMENT ON COLUMN eval_opt_truth_keys.created_at IS 'Record creation timestamp (audit column per ADR-015)';
COMMENT ON COLUMN eval_opt_truth_keys.updated_at IS 'Record last update timestamp (audit column per ADR-015)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_opt_truth_key_group 
    ON eval_opt_truth_keys(group_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_truth_key_criteria 
    ON eval_opt_truth_keys(criteria_item_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_truth_key_doc_type 
    ON eval_opt_truth_keys(doc_type_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_truth_key_criteria_set 
    ON eval_opt_truth_keys(criteria_set_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_truth_key_status 
    ON eval_opt_truth_keys(truth_status_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_truth_key_evaluated_by 
    ON eval_opt_truth_keys(evaluated_by);
CREATE INDEX IF NOT EXISTS idx_eval_opt_truth_key_validated 
    ON eval_opt_truth_keys(group_id, validated);
CREATE INDEX IF NOT EXISTS idx_eval_opt_truth_key_valid 
    ON eval_opt_truth_keys(group_id, is_valid);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_eval_opt_truth_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    -- Note: updated_by should be set by application code (org_common handles this)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS eval_opt_truth_keys_updated_at_trigger ON eval_opt_truth_keys;
CREATE TRIGGER eval_opt_truth_keys_updated_at_trigger
    BEFORE UPDATE ON eval_opt_truth_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_opt_truth_keys_updated_at();

-- ============================================================================
-- End of migration
-- ============================================================================
