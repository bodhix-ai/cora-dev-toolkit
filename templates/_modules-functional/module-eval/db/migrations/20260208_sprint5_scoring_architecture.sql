-- ============================================================================
-- Module: module-eval
-- Migration: Sprint 5 - Scoring Architecture
-- Description: Convert ai_result to JSONB and add scoring_rubric to criteria sets
-- Date: February 8, 2026
-- Reference: docs/specifications/spec_eval-scoring-rubric-architecture.md
-- ============================================================================

-- ============================================================================
-- Part 1: Add scoring_rubric to eval_criteria_sets
-- ============================================================================

-- Add scoring_rubric column with default 5-tier rubric
ALTER TABLE eval_criteria_sets
ADD COLUMN IF NOT EXISTS scoring_rubric JSONB DEFAULT '{
  "tiers": [
    {
      "min": 0, 
      "max": 20, 
      "label": "Non-Compliant", 
      "description": "Criterion not addressed or completely fails to meet requirement. No evidence of compliance found."
    },
    {
      "min": 21, 
      "max": 40, 
      "label": "Mostly Non-Compliant", 
      "description": "Some attempt made but significant gaps exist. Fails to address key aspects of the requirement."
    },
    {
      "min": 41, 
      "max": 60, 
      "label": "Partially Compliant", 
      "description": "Addresses some requirements but incomplete or unclear. Mixed evidence of compliance."
    },
    {
      "min": 61, 
      "max": 80, 
      "label": "Mostly Compliant", 
      "description": "Meets most requirements with minor gaps or areas for improvement. Strong evidence overall."
    },
    {
      "min": 81, 
      "max": 100, 
      "label": "Fully Compliant", 
      "description": "Fully meets or exceeds the requirement with clear, comprehensive evidence."
    }
  ]
}'::jsonb;

-- Add column comment
COMMENT ON COLUMN eval_criteria_sets.scoring_rubric IS 
  'Scoring guidance for AI (JSONB). Defines tier ranges, labels, and descriptions for consistent scoring.';

-- ============================================================================
-- Part 2: Convert ai_result from TEXT to JSONB
-- ============================================================================

-- Convert ai_result to JSONB (backward compatible)
-- Existing TEXT values converted to {"explanation": "old text"}
-- NULL and empty string preserved
ALTER TABLE eval_criteria_results 
  ALTER COLUMN ai_result TYPE JSONB 
  USING CASE 
    WHEN ai_result IS NULL THEN NULL
    WHEN ai_result = '' THEN '{}'::jsonb
    WHEN ai_result ~ '^\s*\{.*\}\s*$' THEN ai_result::jsonb  -- Already JSON
    ELSE json_build_object('explanation', ai_result)::jsonb  -- Legacy TEXT
  END;

-- Update column comment to reflect new JSONB structure
COMMENT ON COLUMN eval_criteria_results.ai_result IS 
  'AI-generated structured response (JSONB with sections defined by response_structure)';

-- ============================================================================
-- Part 3: Notes on Deprecated Columns
-- ============================================================================

-- ai_status_id is now deprecated but kept for backward compatibility
-- New evaluations will set ai_status_id to NULL
-- Frontend derives status label from ai_score_value using getStatusFromScore()
-- Migration does NOT drop ai_status_id to preserve existing data

-- Update comment to mark as deprecated
COMMENT ON COLUMN eval_criteria_results.ai_status_id IS 
  'DEPRECATED: Status option selected by AI. New evaluations use ai_score_value directly. Frontend derives status label from score.';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify migration success
DO $$
DECLARE
    rubric_count INTEGER;
    jsonb_count INTEGER;
BEGIN
    -- Check scoring_rubric added
    SELECT COUNT(*) INTO rubric_count
    FROM information_schema.columns
    WHERE table_name = 'eval_criteria_sets' AND column_name = 'scoring_rubric';
    
    IF rubric_count = 0 THEN
        RAISE EXCEPTION 'Migration failed: scoring_rubric column not added';
    END IF;
    
    -- Check ai_result converted to JSONB
    SELECT COUNT(*) INTO jsonb_count
    FROM information_schema.columns
    WHERE table_name = 'eval_criteria_results' 
      AND column_name = 'ai_result' 
      AND data_type = 'jsonb';
    
    IF jsonb_count = 0 THEN
        RAISE EXCEPTION 'Migration failed: ai_result not converted to JSONB';
    END IF;
    
    RAISE NOTICE 'Migration successful: scoring_rubric added, ai_result converted to JSONB';
END $$;

-- ============================================================================
-- End of migration
-- ============================================================================