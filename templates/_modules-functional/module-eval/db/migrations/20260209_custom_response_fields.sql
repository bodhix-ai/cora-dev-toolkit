-- Migration: Add Custom Response Fields (compliance_gaps as integrated findings+recommendations)
-- Date: February 9, 2026 (v2 - integrated format)
-- Sprint: S5 (Scoring Architecture - Phase 1 Testing)
-- Purpose: Update eval_cfg_sys_prompts to produce thorough evaluations with custom fields
--
-- Changes:
-- 1. Rewrites system_prompt from manual CJIS-specific carryover to professional evaluator
-- 2. Updates user_prompt_template to request 1 integrated custom field
-- 3. Increases max_tokens from 2000 to 3000 (more response sections need more tokens)
--
-- Custom Fields Added:
--   - compliance_gaps (array of objects): Each gap has a finding + recommendation pair
--     This replaces separate non_compliance_findings and recommendations fields
--     for better UX (renders as a table with Finding | Recommendation columns)
--
-- Fixed Fields (unchanged):
--   - score (0-100), confidence (0-100), explanation (text), citations (array)

-- Update system prompt and user prompt template
UPDATE eval_cfg_sys_prompts
SET
  system_prompt = 'You are an expert compliance evaluation analyst. Your role is to rigorously evaluate documents against specific regulatory criteria and provide thorough, evidence-based assessments.

Your evaluations must be:
- **Precise**: Reference the exact language of the criteria requirement when identifying gaps
- **Thorough**: Provide detailed explanations that go beyond surface-level assessment
- **Actionable**: Include specific, implementable recommendations for any deficiencies found
- **Evidence-based**: Cite specific passages, sections, or statements from the source document
- **Objective**: Assess compliance neutrally without bias toward leniency or strictness

When evaluating, consider:
1. Whether the document explicitly addresses each element of the requirement
2. Whether evidence is sufficient to demonstrate compliance (not just mentioned)
3. Whether there are gaps between what the requirement demands and what the document provides
4. Whether implementation details are specific enough to verify compliance

Always respond with valid JSON in the exact format specified in the user prompt.',

  user_prompt_template = 'Evaluate the following document against the given criteria.

CRITERIA:
ID: {criteria_id}
Requirement: {requirement}
Description: {description}

DOCUMENT CONTEXT:
{context}

SCORING RUBRIC (use this to determine your numerical score):
{scoring_rubric}

IMPORTANT: You must return a JSON object with ALL of the following fields:

REQUIRED FIELDS:
- "score": A numerical value from 0-100 based on the scoring rubric above (required, must be a number, not null)
- "confidence": Your confidence level from 0-100 in this assessment (required, must be a number)
- "explanation": A thorough explanation of your assessment covering what the document does well, where it falls short, and how the score was determined. This should be 2-4 sentences minimum, not a single sentence. (required, must be a string)
- "citations": Array of relevant quotes from the document that support your assessment (required, must be an array)

ADDITIONAL RESPONSE SECTIONS:
- "compliance_gaps": An array of objects, where each object pairs a specific non-compliance finding with its actionable recommendation. Each object MUST have exactly two keys:
  - "finding": A specific non-compliance issue tied to the criteria requirement language. Explain exactly which part of the requirement is not met and why.
  - "recommendation": An actionable, implementable step to address this specific finding and achieve compliance.
  If the document is fully compliant, return an empty array [].
  If partially compliant, include one entry per gap identified.
  (required, must be an array of objects)

DO NOT include a "status" field. The system derives status from the numerical score.
DO NOT return separate "non_compliance_findings" and "recommendations" fields. Use the integrated "compliance_gaps" format instead.

Example response format:
{
  "score": 35,
  "confidence": 85,
  "explanation": "The document partially addresses the requirement but has significant gaps. While Section 3.1 mentions the need for access controls, it does not specify automatic disabling of inactive accounts within the required timeframe. The policy references a 10-week inactivity threshold, which substantially exceeds the 1-week maximum required by the criteria.",
  "citations": [
    {
      "text": "Inactive user accounts shall be reviewed and disabled after 10 weeks of no activity.",
      "relevance": "Demonstrates the policy exists but with a non-compliant 10-week threshold instead of the required 1-week maximum"
    },
    {
      "text": "Access control procedures are documented in Section 3.1 of the security policy.",
      "relevance": "Shows the document acknowledges access control requirements but lacks specificity on automated enforcement"
    }
  ],
  "compliance_gaps": [
    {
      "finding": "The inactivity threshold of 10 weeks exceeds the required maximum of 1 week, violating the requirement to automatically disable inactive accounts within the specified timeframe.",
      "recommendation": "Reduce the inactivity threshold from 10 weeks to 1 week or less and configure the identity management system to enforce this automatically."
    },
    {
      "finding": "No evidence of automated enforcement mechanism - the policy describes a manual review process rather than automatic system-level disabling as required.",
      "recommendation": "Implement automated account disabling at the system level (e.g., Active Directory policy or IAM rule) rather than relying on manual periodic reviews."
    },
    {
      "finding": "The policy does not document retention of evidence for the configured inactivity threshold and system enforcement settings.",
      "recommendation": "Create an evidence retention procedure that captures system configuration screenshots, audit logs, and policy approval records on a quarterly basis."
    }
  ]
}

Now evaluate the document:',

  max_tokens = 3000,
  updated_at = NOW()
WHERE prompt_type = 'evaluation';

-- Verify the update
SELECT
  prompt_type,
  LEFT(system_prompt, 100) as system_prompt_preview,
  LEFT(user_prompt_template, 100) as user_prompt_preview,
  max_tokens,
  updated_at
FROM eval_cfg_sys_prompts
WHERE prompt_type = 'evaluation';