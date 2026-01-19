-- ============================================================================
-- Module: module-eval
-- Migration: 002-eval-cfg-sys-prompts
-- Description: Default AI prompts and model configurations for evaluation processing
-- Naming: Follows Rule 8 (Config Tables - _cfg_ infix pattern)
-- ============================================================================

-- Create eval_cfg_sys_prompts table
CREATE TABLE IF NOT EXISTS eval_cfg_sys_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_type TEXT NOT NULL,
    ai_provider_id UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
    ai_model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    system_prompt TEXT,
    user_prompt_template TEXT,
    temperature DECIMAL(3,2) NOT NULL DEFAULT 0.3,
    max_tokens INTEGER NOT NULL DEFAULT 2000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    CONSTRAINT eval_cfg_sys_prompts_type_unique UNIQUE (prompt_type),
    CONSTRAINT eval_cfg_sys_prompts_type_check 
        CHECK (prompt_type IN ('doc_summary', 'evaluation', 'eval_summary')),
    CONSTRAINT eval_cfg_sys_prompts_temp_check 
        CHECK (temperature >= 0 AND temperature <= 1)
);

-- Add table comment
COMMENT ON TABLE eval_cfg_sys_prompts IS 'Default AI prompts and model configurations for evaluation processing';
COMMENT ON COLUMN eval_cfg_sys_prompts.prompt_type IS 'Type: doc_summary, evaluation, or eval_summary';
COMMENT ON COLUMN eval_cfg_sys_prompts.system_prompt IS 'System prompt template';
COMMENT ON COLUMN eval_cfg_sys_prompts.user_prompt_template IS 'User prompt template with placeholders';
COMMENT ON COLUMN eval_cfg_sys_prompts.temperature IS 'AI temperature (0.0-1.0)';
COMMENT ON COLUMN eval_cfg_sys_prompts.max_tokens IS 'Maximum response tokens';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_eval_cfg_sys_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_cfg_sys_prompts_updated_at ON eval_cfg_sys_prompts;
CREATE TRIGGER eval_cfg_sys_prompts_updated_at
    BEFORE UPDATE ON eval_cfg_sys_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_cfg_sys_prompts_updated_at();

-- Insert default prompts (idempotent)
-- doc_summary prompt
INSERT INTO eval_cfg_sys_prompts (prompt_type, system_prompt, user_prompt_template, temperature, max_tokens)
SELECT 
    'doc_summary',
    'You are a document analysis assistant. Provide concise, accurate summaries that capture the key points, scope, and purpose of the document.',
    'Summarize the following document:

Document: {document_name}

{document_content}

Provide a comprehensive summary that includes:
1. Document purpose and scope
2. Key topics covered
3. Main conclusions or requirements
4. Notable gaps or limitations (if any)',
    0.3,
    2000
WHERE NOT EXISTS (SELECT 1 FROM eval_cfg_sys_prompts WHERE prompt_type = 'doc_summary');

-- evaluation prompt
INSERT INTO eval_cfg_sys_prompts (prompt_type, system_prompt, user_prompt_template, temperature, max_tokens)
SELECT 
    'evaluation',
    'You are a compliance evaluation assistant. Evaluate documents against criteria objectively and provide evidence-based assessments with specific citations from the source documents.',
    'Evaluate the following compliance criteria against the provided document context.

CRITERIA:
ID: {criteria_id}
Requirement: {criteria_requirement}
Description: {criteria_description}

DOCUMENT CONTEXT:
{context}

AVAILABLE STATUS OPTIONS:
{status_options}

Provide your evaluation in the following JSON format:
{
  "status": "<select from available options>",
  "confidence": <0-100>,
  "explanation": "<detailed explanation of your assessment>",
  "citations": [
    {
      "text": "<exact quote from document>",
      "relevance": "<why this supports your assessment>"
    }
  ]
}',
    0.3,
    2000
WHERE NOT EXISTS (SELECT 1 FROM eval_cfg_sys_prompts WHERE prompt_type = 'evaluation');

-- eval_summary prompt
INSERT INTO eval_cfg_sys_prompts (prompt_type, system_prompt, user_prompt_template, temperature, max_tokens)
SELECT 
    'eval_summary',
    'You are a compliance summary assistant. Synthesize evaluation results into actionable executive summaries that highlight key findings, risks, and recommendations.',
    'Generate an executive summary of the following evaluation:

DOCUMENT SUMMARY:
{doc_summary}

EVALUATION RESULTS:
{criteria_results}

COMPLIANCE SCORE: {compliance_score}%

Provide an executive summary that includes:
1. Overall compliance assessment
2. Key strengths identified
3. Critical gaps or non-compliance areas
4. Prioritized recommendations for improvement
5. Risk assessment',
    0.4,
    3000
WHERE NOT EXISTS (SELECT 1 FROM eval_cfg_sys_prompts WHERE prompt_type = 'eval_summary');

-- ============================================================================
-- End of migration
-- ============================================================================
