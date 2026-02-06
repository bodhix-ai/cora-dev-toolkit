-- ============================================================================
-- Module: module-eval-optimizer
-- Migration: 004-eval-opt-prompt-versions
-- Description: Prompt versioning and deployment tracking (FUTURE - not needed for Phase 4)
-- ============================================================================

-- NOTE: This table is not needed for Phase 4 redesign.
-- Phase 4 uses automatic prompt generation via RAG + LLM meta-prompting.
-- Prompt versioning may be added in a future phase if needed.

-- ============================================================================
-- RESPONSE STRUCTURES (Phase 4B)
-- ============================================================================

-- Create eval_opt_response_structures table
CREATE TABLE IF NOT EXISTS eval_opt_response_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ws_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Structure definition (JSON schema)
    structure_schema JSONB NOT NULL,
    /*
    Example:
    {
      "sections": [
        {
          "key": "score_justification",
          "label": "Score Justification",
          "type": "text",
          "required": true,
          "description": "Explain the reasoning behind the compliance score"
        },
        {
          "key": "compliance_gaps",
          "label": "Compliance Gaps",
          "type": "array",
          "required": true,
          "description": "List specific areas of non-compliance"
        },
        {
          "key": "recommendations",
          "label": "Recommendations",
          "type": "array",
          "required": true,
          "description": "Actionable steps to achieve compliance"
        }
      ]
    }
    */
    
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add table comment
COMMENT ON TABLE eval_opt_response_structures IS 'JSON response structure definitions for optimization runs';
COMMENT ON COLUMN eval_opt_response_structures.ws_id IS 'Workspace foreign key';
COMMENT ON COLUMN eval_opt_response_structures.structure_schema IS 'JSON schema defining desired AI response format';
COMMENT ON COLUMN eval_opt_response_structures.version IS 'Version number';
COMMENT ON COLUMN eval_opt_response_structures.is_active IS 'Whether this structure is active';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_opt_response_struct_workspace 
    ON eval_opt_response_structures(ws_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_response_struct_active 
    ON eval_opt_response_structures(ws_id, is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_eval_opt_response_structures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_opt_response_structures_updated_at ON eval_opt_response_structures;
CREATE TRIGGER eval_opt_response_structures_updated_at
    BEFORE UPDATE ON eval_opt_response_structures
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_opt_response_structures_updated_at();

-- ============================================================================
-- End of migration
-- ============================================================================
