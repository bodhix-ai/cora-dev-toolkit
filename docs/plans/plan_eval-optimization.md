# Evaluation Processing Optimization - Implementation Plan

**Status**: 📋 PLANNING  
**Priority**: HIGH  
**Estimated Duration**: 4-6 hours  
**Created**: January 19, 2026  
**Branch**: `eval-optimization`  
**Dependencies**: Evaluation processing pipeline (working)

---

## Executive Summary

This plan validates and optimizes the document evaluation processing pipeline. The core processing infrastructure is working correctly (status updates, progress tracking, document processing), but AI provider configuration needs to be set up and the evaluation quality needs to be optimized.

**Current State:**
- ✅ Evaluation creation and SQS message triggering working
- ✅ Progress polling and status updates functional
- ✅ Document summarization pipeline operational
- ✅ Criteria evaluation pipeline running
- ❌ AI provider not configured (placeholder responses)
- ❌ Evaluation quality not validated

**Goal:** Configure AI providers, validate evaluation quality, and optimize processing performance.

---

## ⚠️ BLOCKER: Org Admin Page Not Rendering

**Status**: 🔴 BLOCKING - Must resolve before proceeding  
**Impact**: Prevents access to org-level eval configuration UI

### Issue Description

The org admin page for module-eval (`/admin/org/eval`) is not rendering - no error displayed, just blank/not showing page content or tabs. However, the sys admin page (`/admin/sys/eval`) renders correctly.

### Root Cause Analysis

**Investigation completed**: 2026-01-20 08:19 AM

1. **Routes exist correctly**: Both `/admin/org/eval/page.tsx` and `/admin/sys/eval/page.tsx` are present in the test project
2. **Key difference identified**:
   - **Sys admin page**: No dependencies, renders immediately
   - **Org admin page**: Depends on `OrgContext.currentOrg` to render

**Code comparison**:
```typescript
// Org admin page (NOT WORKING)
const context = useContext(OrgContext);
const currentOrg = context?.currentOrg;

if (!currentOrg) {
  return (
    <Alert severity="warning">
      Please select an organization to manage evaluation settings.
    </Alert>
  );
}

// Sys admin page (WORKING)
export default function SysEvalAdminPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('config');
  return (/* renders immediately */)
}
```

### Root Cause Hypothesis

**OrgContext is not providing `currentOrg`**, causing the org admin page to:
1. Show the warning "Please select an organization to manage evaluation settings"
2. Never render the tabs or actual content
3. Appear as "not rendering" to the user

### Possible Causes

1. **OrgContext not initialized properly** in the app layout
2. **User hasn't selected an organization** in the current session
3. **OrgSelector component not working** correctly
4. **Context provider missing** from layout hierarchy
5. **Race condition** - page renders before context loads

### Resolution Steps

**Before proceeding with eval optimization, must resolve:**

1. **Verify OrgContext provider exists in layout**:
   - Check `apps/web/app/layout.tsx` or `apps/web/app/admin/layout.tsx`
   - Ensure `OrgContextProvider` wraps the admin routes

2. **Test org selection**:
   - Navigate to `/admin/org/eval`
   - Check browser console for errors
   - Check if OrgSelector component is visible/functional
   - Try selecting an org and see if page renders

3. **Add debugging**:
   - Add console.log in org admin page to check `currentOrg` value
   - Verify OrgContext is being provided correctly
   - Check if other org admin pages work (e.g., `/admin/org/kb`)

4. **Compare with working pages**:
   - Check if `/admin/org/kb` or `/admin/org/ws` render correctly
   - If they work, the issue may be specific to eval page
   - If they don't work, the issue is with OrgContext provision

### Next Actions

**Do NOT proceed with AI provider configuration until this is resolved**, as the org admin page is needed to:
- View organization-level eval configuration
- Test org-specific prompt overrides
- Manage org eval settings

**Priority**: Resolve this blocker FIRST, then proceed with Phase 1.

---

## Phase 1: AI Provider Configuration (1-2 hours)

### Step 1.1: Database Schema Validation

**Verify required tables exist:**

```sql
-- Check AI provider tables
SELECT table_name FROM information_schema.tables 
WHERE table_name IN (
    'ai_providers',
    'ai_models',
    'eval_cfg_sys',
    'eval_cfg_org',
    'eval_cfg_sys_prompts',
    'eval_cfg_org_prompts'
);
```

**Expected tables:**
- `ai_providers` - Provider credentials (OpenAI, Anthropic, Bedrock)
- `ai_models` - Model configurations
- `eval_cfg_sys` - System-level evaluation config
- `eval_cfg_org` - Org-level evaluation config overrides
- `eval_cfg_sys_prompts` - System prompt templates with AI settings
- `eval_cfg_org_prompts` - Org-specific prompt overrides

**Actions if missing:**
- [ ] Run database migrations to create missing tables
- [ ] Verify foreign key constraints
- [ ] Add indexes for performance

---

### Step 1.2: Configure AI Provider (Choose One)

#### Option A: OpenAI (Recommended for Testing)

**Pros:** Easy setup, familiar API, good documentation  
**Cons:** Requires API key, costs per token

```sql
-- Insert OpenAI provider
WITH new_provider AS (
    INSERT INTO ai_providers (
        id,
        org_id,
        provider_type,
        provider_name,
        api_key,
        api_endpoint,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        '{ORG_ID}',
        'openai',
        'OpenAI GPT-4',
        '{OPENAI_API_KEY}',
        'https://api.openai.com/v1',
        true,
        now(),
        now()
    )
    RETURNING id
),
new_model AS (
    INSERT INTO ai_models (
        id,
        provider_id,
        model_name,
        model_display_name,
        model_type,
        context_window,
        max_output_tokens,
        supports_streaming,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        (SELECT id FROM new_provider),
        'gpt-4-turbo',
        'GPT-4 Turbo',
        'chat',
        128000,
        4096,
        true,
        true,
        now(),
        now()
    )
    RETURNING id, provider_id
)
UPDATE eval_cfg_sys_prompts
SET 
    ai_provider_id = (SELECT provider_id FROM new_model),
    ai_model_id = (SELECT id FROM new_model),
    updated_at = now()
WHERE prompt_type IN ('evaluation', 'doc_summary', 'eval_summary');
```

#### Option B: AWS Bedrock (Recommended for Production)

**Pros:** No API key needed (IAM role), compliance-friendly, cost-effective  
**Cons:** Requires AWS setup, region-specific

```sql
-- Insert Bedrock provider
WITH new_provider AS (
    INSERT INTO ai_providers (
        id,
        org_id,
        provider_type,
        provider_name,
        aws_region,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        '{ORG_ID}',
        'bedrock',
        'AWS Bedrock Claude',
        'us-east-1',
        true,
        now(),
        now()
    )
    RETURNING id
),
new_model AS (
    INSERT INTO ai_models (
        id,
        provider_id,
        model_name,
        model_display_name,
        model_type,
        context_window,
        max_output_tokens,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        (SELECT id FROM new_provider),
        'anthropic.claude-3-sonnet-20240229-v1:0',
        'Claude 3 Sonnet',
        'chat',
        200000,
        4096,
        true,
        now(),
        now()
    )
    RETURNING id, provider_id
)
UPDATE eval_cfg_sys_prompts
SET 
    ai_provider_id = (SELECT provider_id FROM new_model),
    ai_model_id = (SELECT id FROM new_model),
    updated_at = now()
WHERE prompt_type IN ('evaluation', 'doc_summary', 'eval_summary');
```

**For Bedrock, also update Lambda IAM role:**

```hcl
# In module-eval/infrastructure/main.tf
statement {
  effect = "Allow"
  actions = [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream"
  ]
  resources = [
    "arn:aws:bedrock:*::foundation-model/*"
  ]
}
```

---

### Step 1.3: Verify Configuration

```sql
-- Verify provider setup
SELECT 
    p.id,
    p.provider_type,
    p.provider_name,
    p.is_active,
    COUNT(m.id) as model_count
FROM ai_providers p
LEFT JOIN ai_models m ON p.id = m.provider_id AND m.is_active = true
WHERE p.is_active = true
GROUP BY p.id, p.provider_type, p.provider_name, p.is_active;

-- Verify prompt configuration
SELECT 
    prompt_type,
    pr.provider_name,
    m.model_display_name,
    p.temperature,
    p.max_tokens,
    LENGTH(p.system_prompt) as system_prompt_length,
    LENGTH(p.user_prompt_template) as user_prompt_length
FROM eval_cfg_sys_prompts p
LEFT JOIN ai_providers pr ON p.ai_provider_id = pr.id
LEFT JOIN ai_models m ON p.ai_model_id = m.id;
```

**Expected output:**
- Provider with 1+ active models
- All 3 prompt types configured (evaluation, doc_summary, eval_summary)
- Non-null provider_name and model_display_name

---

## Phase 2: End-to-End Validation (1 hour)

### Step 2.1: Trigger Test Evaluation

1. **Navigate to workspace Doc Eval tab**
2. **Create new evaluation:**
   - Select test document (known content)
   - Select document type
   - Select criteria set
3. **Click EVALUATE**
4. **Monitor progress:**
   - Status: `draft` → `pending` → `processing` → `completed`
   - Progress: 0% → 10% → 50% → 90% → 100%

### Step 2.2: Monitor CloudWatch Logs

```bash
# Watch eval-results Lambda (SQS message send)
AWS_PROFILE=ai-sec-nonprod aws logs tail \
  /aws/lambda/ai-sec-dev-eval-eval-results \
  --since 5m --follow | grep "Sent processing message"

# Watch eval-processor Lambda (AI calls)
AWS_PROFILE=ai-sec-nonprod aws logs tail \
  /aws/lambda/ai-sec-dev-eval-eval-processor \
  --since 5m --follow | grep -E "(Phase|OpenAI|Bedrock|API|Error)"
```

**Expected logs:**
```
[INFO] Phase 1: Generating document summaries for eval {eval_id}
[INFO] Phase 2: Evaluating 15 criteria items for eval {eval_id}
[INFO] Phase 3: Generating evaluation summary for eval {eval_id}
[INFO] Evaluation {eval_id} completed successfully. Score: 85.2%
```

### Step 2.3: Validate Results Quality

```sql
-- Check evaluation results
SELECT 
    ds.id,
    ds.name,
    ds.status,
    ds.progress,
    ds.compliance_score,
    LENGTH(ds.doc_summary) as doc_summary_length,
    LENGTH(ds.eval_summary) as eval_summary_length,
    ds.completed_at
FROM eval_doc_summaries ds
WHERE ds.status = 'completed'
ORDER BY ds.created_at DESC
LIMIT 5;

-- Check criteria results quality
SELECT 
    ci.criteria_id,
    ci.requirement,
    so.name as status,
    cr.ai_confidence,
    LENGTH(cr.ai_result) as explanation_length,
    LENGTH(cr.ai_citations) as citations_length
FROM eval_criteria_results cr
JOIN eval_criteria_items ci ON cr.criteria_item_id = ci.id
LEFT JOIN eval_sys_status_options so ON cr.ai_status_id = so.id
WHERE cr.eval_summary_id = '{TEST_EVAL_ID}'
ORDER BY ci.order_index;
```

**Quality checklist:**
- [ ] All criteria have status (not null)
- [ ] Confidence scores are reasonable (50-95%)
- [ ] Explanations are substantive (> 100 chars)
- [ ] Citations are provided (non-empty)
- [ ] No placeholder responses
- [ ] Compliance score calculated correctly

---

## Phase 3: Prompt Optimization (2-3 hours)

### Step 3.1: Review Default Prompts

Check current system prompt templates:

```sql
SELECT 
    prompt_type,
    system_prompt,
    user_prompt_template,
    temperature,
    max_tokens
FROM eval_cfg_sys_prompts;
```

### Step 3.2: Optimize Evaluation Prompt

**Current evaluation prompt issues:**
- Generic instructions
- May not enforce JSON response format
- Variable placeholders not filled correctly (`{criteria_requirement}`, `{criteria_description}`)

**Improved evaluation prompt:**

```sql
UPDATE eval_cfg_sys_prompts
SET 
    system_prompt = 'You are an expert compliance evaluator. Analyze documents against specific criteria with precision and provide evidence-based assessments. Always respond in valid JSON format.',
    user_prompt_template = 'Evaluate the following document against the compliance criteria.

CRITERIA DETAILS:
- ID: {criteria_id}
- Requirement: {requirement}
- Description: {description}

DOCUMENT CONTEXT:
{context}

AVAILABLE STATUS OPTIONS:
{status_options}

Analyze the document and respond with a JSON object:
{
  "status": "exact status option name from the list above",
  "confidence": 85,
  "explanation": "detailed assessment explaining why this status applies, referencing specific document content",
  "citations": ["relevant quote 1", "relevant quote 2"]
}

Requirements:
- Status MUST be one of the exact names from the status options list
- Confidence should be 0-100 based on evidence strength
- Explanation should be 2-3 paragraphs with specific references
- Include 2-5 direct quotes as citations',
    temperature = 0.2,
    max_tokens = 2000,
    updated_at = now()
WHERE prompt_type = 'evaluation';
```

### Step 3.3: Optimize Document Summary Prompt

```sql
UPDATE eval_cfg_sys_prompts
SET 
    system_prompt = 'You are an expert document analyst. Provide clear, comprehensive summaries that capture key information, structure, and compliance-relevant content.',
    user_prompt_template = 'Analyze and summarize the following document:

{document_content}

Provide a comprehensive summary (300-500 words) covering:
1. Document purpose and scope
2. Key policies, requirements, or procedures
3. Compliance-relevant sections
4. Overall structure and organization

Focus on content that would be relevant for compliance evaluation.',
    temperature = 0.3,
    max_tokens = 2000,
    updated_at = now()
WHERE prompt_type = 'doc_summary';
```

### Step 3.4: Optimize Evaluation Summary Prompt

```sql
UPDATE eval_cfg_sys_prompts
SET 
    system_prompt = 'You are an expert at synthesizing compliance evaluation results into executive summaries.',
    user_prompt_template = 'Based on the evaluation results below, provide an executive summary.

DOCUMENT SUMMARY:
{doc_summary}

OVERALL COMPLIANCE SCORE: {compliance_score}

DOCUMENT TYPE: {doc_type}
TOTAL CRITERIA EVALUATED: {total_criteria}

DETAILED CRITERIA RESULTS:
{criteria_results}

Provide a professional executive summary (400-600 words) with these sections:

## Overall Assessment
Brief overview of compliance status and score context.

## Key Findings
- List 3-5 most significant findings (both positive and negative)
- Prioritize by compliance impact

## Areas of Concern
- Highlight any non-compliant or partially compliant criteria
- Explain potential risks or gaps

## Strengths
- Note fully compliant areas
- Recognize strong controls or policies

## Recommendations
- Provide 3-5 actionable recommendations to improve compliance
- Prioritize by impact and effort

Use professional, clear language appropriate for executives.',
    temperature = 0.3,
    max_tokens = 2500,
    updated_at = now()
WHERE prompt_type = 'eval_summary';
```

---

## Phase 4: Performance Optimization (1 hour)

### Step 4.1: Analyze Processing Time

```sql
-- Get evaluation processing duration
SELECT 
    id,
    name,
    status,
    EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds,
    progress,
    compliance_score
FROM eval_doc_summaries
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 10;

-- Average processing time per criteria
SELECT 
    AVG(EXTRACT(EPOCH FROM (ds.completed_at - ds.started_at)) / 
        (SELECT COUNT(*) FROM eval_criteria_results WHERE eval_summary_id = ds.id)) 
    as avg_seconds_per_criteria
FROM eval_doc_summaries ds
WHERE ds.status = 'completed' AND ds.completed_at IS NOT NULL;
```

### Step 4.2: Optimize Context Retrieval

**Current issue:** Simple keyword matching for RAG context (not vector search)

**Optimization options:**

1. **Enable Vector Search (Recommended):**
   - Use pgvector extension in Supabase
   - Store embeddings in `kb_chunks` table
   - Use cosine similarity search

2. **Improve Keyword Matching (Short-term):**
   - Add TF-IDF scoring
   - Use PostgreSQL full-text search
   - Weight by chunk position

**Code change location:** `eval-processor/lambda_function.py` lines 530-570

### Step 4.3: Parallel Processing Optimization

**Current:** Sequential criteria evaluation (one at a time)

**Optimization:** Batch criteria evaluation (5-10 at a time)

```python
# In eval-processor Lambda
# Replace sequential loop with batched processing
import concurrent.futures

def evaluate_criteria_batch(criteria_batch):
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [
            executor.submit(evaluate_criteria_item, ...)
            for item in criteria_batch
        ]
        return [f.result() for f in concurrent.futures.as_completed(futures)]
```

**Estimated improvement:** 3-5x faster for evaluations with 15+ criteria

### Step 4.4: Token Usage Optimization

```sql
-- Analyze token usage patterns
SELECT 
    prompt_type,
    AVG(max_tokens) as avg_max_tokens,
    temperature
FROM eval_cfg_sys_prompts
GROUP BY prompt_type, temperature;
```

**Optimizations:**
- Reduce `max_tokens` where responses are consistently shorter
- Adjust temperature for more deterministic results (0.1-0.2)
- Truncate context more aggressively (30K → 20K tokens)

---

## Phase 5: Error Handling & Resilience (1 hour)

### Step 5.1: Add Retry Logic

**Update eval-processor to retry failed AI calls:**

```python
# In generate_ai_response function
def generate_ai_response_with_retry(prompt_config, context, variables, max_retries=3):
    for attempt in range(max_retries):
        try:
            return generate_ai_response(prompt_config, context, variables)
        except Exception as e:
            logger.warning(f"AI call failed (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                raise
```

### Step 5.2: Handle Rate Limits

**Add rate limiting awareness:**

```python
# Check for rate limit errors
if "rate_limit" in str(e).lower() or "429" in str(e):
    logger.warning("Rate limit hit, waiting 60s...")
    time.sleep(60)
    return generate_ai_response_with_retry(...)
```

### Step 5.3: Improve Error Messages

```sql
-- Check failed evaluations
SELECT 
    id,
    name,
    error_message,
    created_at,
    started_at
FROM eval_doc_summaries
WHERE status = 'failed'
ORDER BY created_at DESC;
```

**Improve error messages to be actionable:**
- "AI provider not configured" → "AI provider not configured. Please add provider credentials to ai_providers table."
- "Document not found" → "Document {doc_id} not found in workspace KB. Ensure document was uploaded successfully."

---

## Phase 6: Testing & Validation (1 hour)

### Test Cases

#### Test Case 1: Single Document, Simple Criteria
- **Document:** 5-page policy document
- **Criteria Set:** 5 basic criteria
- **Expected:** Complete in < 2 minutes, all criteria evaluated

#### Test Case 2: Multiple Documents, Complex Criteria
- **Documents:** 3 documents (10-20 pages each)
- **Criteria Set:** 20 detailed criteria
- **Expected:** Complete in < 5 minutes, accurate cross-document references

#### Test Case 3: Large Document, Many Criteria
- **Document:** 50-page compliance manual
- **Criteria Set:** 30 criteria
- **Expected:** Complete in < 8 minutes, handle context limits gracefully

#### Test Case 4: Error Scenarios
- [ ] Invalid document ID
- [ ] Missing criteria set
- [ ] AI provider unavailable
- [ ] Document with no extractable text

### Validation Checklist

**Functional:**
- [ ] All evaluations complete successfully
- [ ] Status updates work correctly
- [ ] Progress tracking is accurate
- [ ] Results are stored in database

**Quality:**
- [ ] AI responses are relevant and specific
- [ ] Citations are accurate quotes
- [ ] Compliance scores are calculated correctly
- [ ] Summaries are comprehensive

**Performance:**
- [ ] Processing time is acceptable (< 10 min for 30 criteria)
- [ ] No timeout errors
- [ ] No memory errors
- [ ] SQS messages processed reliably

---

## Success Criteria

### Phase 1: Configuration
- [x] AI provider configured in database
- [x] AI model linked to prompts
- [ ] Configuration verified with test query

### Phase 2: Validation
- [ ] End-to-end evaluation completes successfully
- [ ] All criteria receive AI-generated assessments
- [ ] No placeholder responses
- [ ] Logs show successful AI API calls

### Phase 3: Optimization
- [ ] Prompts updated for better quality
- [ ] Variable placeholders correctly populated
- [ ] JSON response parsing works consistently
- [ ] Citations are meaningful and accurate

### Phase 4: Performance
- [ ] Processing time < 5 min for 15 criteria
- [ ] No performance bottlenecks identified
- [ ] Token usage optimized
- [ ] (Optional) Vector search implemented

### Phase 5: Resilience
- [ ] Retry logic handles transient failures
- [ ] Rate limit handling works
- [ ] Error messages are actionable
- [ ] Failed evaluations can be retried

### Phase 6: Testing
- [ ] All test cases pass
- [ ] Validation checklist complete
- [ ] Performance benchmarks met
- [ ] Ready for production use

---

## Rollback Plan

If optimization changes cause issues:

1. **Revert prompt changes:**
   ```sql
   UPDATE eval_cfg_sys_prompts
   SET 
       system_prompt = [previous_value],
       user_prompt_template = [previous_value],
       updated_at = now()
   WHERE prompt_type = 'evaluation';
   ```

2. **Disable optimizations:**
   - Remove parallel processing
   - Restore original context size
   - Remove retry logic

3. **Verify basic functionality still works**

---

## Monitoring & Metrics

### Key Metrics to Track

```sql
-- Evaluation success rate
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / COUNT(*), 1) as success_rate
FROM eval_doc_summaries
WHERE created_at > now() - interval '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Average processing time
SELECT 
    DATE(created_at) as date,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
    MIN(EXTRACT(EPOCH FROM (completed_at - started_at))) as min_duration_seconds,
    MAX(EXTRACT(EPOCH FROM (completed_at - started_at))) as max_duration_seconds
FROM eval_doc_summaries
WHERE status = 'completed' AND created_at > now() - interval '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Quality metrics
SELECT 
    AVG(compliance_score) as avg_compliance_score,
    AVG(LENGTH(doc_summary)) as avg_doc_summary_length,
    AVG(LENGTH(eval_summary)) as avg_eval_summary_length
FROM eval_doc_summaries
WHERE status = 'completed';
```

---

## Next Steps After Completion

1. **Document AI provider setup** in deployment guide
2. **Create prompt tuning guide** for organizations
3. **Add evaluation quality dashboard** to admin UI
4. **Implement vector search** for improved context retrieval
5. **Add cost tracking** for AI API usage
6. **Create organization-level prompt customization** UI

---

**Document Status:** 📋 Ready for implementation  
**Branch:** `eval-optimization`  
**Estimated Duration:** 4-6 hours (can be split across multiple sessions)  
**Dependencies:** Evaluation processing pipeline functional (✅ Complete)
