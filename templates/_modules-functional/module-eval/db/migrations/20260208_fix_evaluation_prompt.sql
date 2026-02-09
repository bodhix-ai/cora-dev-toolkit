-- Migration: Fix Evaluation Prompt for Scoring Architecture
-- Date: February 8, 2026
-- Sprint: S5 (Scoring Architecture)
-- Purpose: Update eval_cfg_sys_prompts to use new scoring architecture
--
-- This migration fixes the evaluation prompt to:
-- 1. Request numerical scores (0-100) instead of status labels
-- 2. Fix variable name mismatches (criteria_requirement → requirement, etc.)
-- 3. Use {scoring_rubric} instead of {status_options}
--
-- Background:
-- The Sprint 5 migration changed the database schema to support JSONB scoring,
-- but the system prompt was never updated from the old status-based format.
-- This caused the AI to return status labels instead of numerical scores.

-- Update the evaluation prompt template
UPDATE eval_cfg_sys_prompts
SET 
  user_prompt_template = 'Evaluate the following document against the given criteria.

CRITERIA:
ID: {criteria_id}
Requirement: {requirement}
Description: {description}

DOCUMENT CONTEXT:
{context}

SCORING RUBRIC (for reference - return ONLY the numerical score):
{scoring_rubric}

IMPORTANT: You must return a JSON object with EXACTLY these fields:
- "score": A numerical value from 0-100 (required, must be a number, not null)
- "confidence": Your confidence level from 0-100 (required, must be a number)
- "explanation": Detailed explanation of your assessment (required, must be a string)
- "citations": Array of relevant quotes from the document (required, must be an array)

DO NOT include a "status" field. Only return the numerical score.

Example response format:
{
  "score": 85,
  "confidence": 90,
  "explanation": "The document demonstrates strong compliance...",
  "citations": [
    {
      "text": "Quote from document...",
      "relevance": "Why this supports the assessment"
    }
  ]
}

Now evaluate the document:',
  updated_at = NOW()
  -- updated_by column removed - not critical for this migration
WHERE prompt_type = 'evaluation';

-- Verify the update
SELECT 
  prompt_type, 
  LEFT(user_prompt_template, 200) as prompt_preview,
  updated_at
FROM eval_cfg_sys_prompts
WHERE prompt_type = 'evaluation';

-- Expected result:
-- The prompt should now:
-- - Use {requirement} and {description} (not {criteria_requirement}, {criteria_description})
-- - Use {scoring_rubric} (not {status_options})
-- - Ask for "score" field (not "status" field)
-- - Include clear example of expected JSON format