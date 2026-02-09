-- ============================================================================
-- Module: module-eval
-- Migration: 012-eval-criteria-results
-- Description: AI-generated evaluation results (immutable for audit)
-- ============================================================================

-- Create eval_criteria_results table (one row per criteria item per evaluation)
CREATE TABLE IF NOT EXISTS eval_criteria_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eval_summary_id UUID NOT NULL REFERENCES eval_doc_summaries(id) ON DELETE CASCADE,
    criteria_item_id UUID NOT NULL REFERENCES eval_criteria_items(id) ON DELETE RESTRICT,
    ai_result JSONB,
    ai_status_id UUID,
    ai_score_value DECIMAL(5,2),
    ai_confidence INTEGER,
    ai_citations JSONB DEFAULT '[]'::jsonb,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT eval_criteria_results_eval_criteria_unique 
        UNIQUE (eval_summary_id, criteria_item_id),
    CONSTRAINT eval_criteria_results_confidence_check 
        CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 100)),
    CONSTRAINT eval_criteria_results_score_check
        CHECK (ai_score_value IS NULL OR (ai_score_value >= 0 AND ai_score_value <= 100))
);

-- Add table comment
COMMENT ON TABLE eval_criteria_results IS 'AI-generated evaluation results (immutable for audit)';
COMMENT ON COLUMN eval_criteria_results.eval_summary_id IS 'Evaluation this result belongs to';
COMMENT ON COLUMN eval_criteria_results.criteria_item_id IS 'Criteria item being evaluated';
COMMENT ON COLUMN eval_criteria_results.ai_result IS 'AI-generated structured response (JSONB with sections defined by response_structure)';
COMMENT ON COLUMN eval_criteria_results.ai_status_id IS 'DEPRECATED: Status option selected by AI. New evaluations use ai_score_value directly. Frontend derives status label from score.';
COMMENT ON COLUMN eval_criteria_results.ai_score_value IS 'Score value captured at evaluation time (0-100)';
COMMENT ON COLUMN eval_criteria_results.ai_confidence IS 'AI confidence score (0-100)';
COMMENT ON COLUMN eval_criteria_results.ai_citations IS 'Array of citation objects (JSONB)';
COMMENT ON COLUMN eval_criteria_results.processed_at IS 'When this item was processed';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_criteria_results_eval 
    ON eval_criteria_results(eval_summary_id);
CREATE INDEX IF NOT EXISTS idx_eval_criteria_results_criteria 
    ON eval_criteria_results(criteria_item_id);

-- ============================================================================
-- End of migration
-- ============================================================================
