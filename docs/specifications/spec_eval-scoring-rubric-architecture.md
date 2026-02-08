# Specification: Evaluation Scoring Rubric Architecture

**Status:** Draft  
**Created:** February 7, 2026  
**Context:** Sprint 4 - Eval Optimization  
**Related:** [spec_eval-optimization-conops.md](spec_eval-optimization-conops.md)

---

## Executive Summary

**Problem:** Module-eval currently derives `ai_score_value` from status options (AI picks "Compliant" → system assigns score 100), resulting in binary scoring (100 or 0) with no granularity.

**Solution:** AI provides numerical score directly (0-100) with rubric guidance, UI derives status label from score.

**Impact:** Enables granular scoring essential for optimization module to measure incremental improvements.

---

## Current Architecture (WRONG)

### Current Flow

```
1. AI picks status: "Compliant"
2. System finds status option: {name: "Compliant", score_value: 100}
3. System stores: ai_score_value = 100
4. Result: All scores are 100 or 0 (binary)
```

### Current Prompt

```python
user_prompt_template = '''
Evaluate the following document against the given criteria.

AVAILABLE STATUS OPTIONS:
- Compliant (score: 100)
- Non-Compliant (score: 0)
- Partially Compliant (score: 50)

Respond with a JSON object containing:
- "status": The status option name that best matches
- "confidence": Your confidence level (0-100)
- "explanation": Detailed explanation of your assessment
- "citations": Array of relevant quotes from the document
'''
```

### Issues

- ❌ No granularity (only 0, 50, 100)
- ❌ AI forced to pick category instead of scoring
- ❌ Optimization can't measure incremental improvement
- ❌ Truth keys can't specify nuanced scores (e.g., 73)

---

## New Architecture (CORRECT)

### New Flow

```
1. AI receives scoring rubric
2. AI analyzes document compliance
3. AI provides numerical score: 73
4. System stores: ai_score_value = 73 (directly from AI)
5. UI derives status label: getStatusLabel(73) = "Mostly Compliant"
```

### New Prompt

```python
user_prompt_template = '''
Evaluate the following document against the given criteria.

CRITERIA:
ID: {criteria_id}
Requirement: {requirement}
Description: {description}

DOCUMENT CONTEXT:
{context}

SCORING RUBRIC:
{scoring_rubric}

RESPONSE STRUCTURE:
{response_sections}

Respond with a JSON object containing:
- "score": Numerical compliance score (0-100) based on the rubric above
- "confidence": Your confidence level (0-100)
{dynamic_section_fields}
- "citations": Array of relevant quotes from the document
'''
```

---

## Database Schema Changes

### 1. Update `eval_criteria_results` Table

**Change `ai_result` from TEXT to JSONB:**

```sql
-- Migration: Convert ai_result to JSONB
ALTER TABLE eval_criteria_results 
  ALTER COLUMN ai_result TYPE JSONB 
  USING CASE 
    WHEN ai_result IS NULL THEN NULL
    WHEN ai_result = '' THEN '{}'::jsonb
    ELSE json_build_object('explanation', ai_result)::jsonb
  END;

-- Update column comment
COMMENT ON COLUMN eval_criteria_results.ai_result IS 
  'AI-generated structured response (JSONB with sections defined by response_structure)';
```

**Rationale:**
- Supports structured sections (justification, findings, recommendations)
- Consistent with `ai_citations` (already JSONB)
- Enables per-section accuracy analysis in optimization
- Backward compatible (existing TEXT converted to `{"explanation": "old text"}`)

### 2. Add `scoring_rubric` to `eval_criteria_sets`

```sql
-- Add scoring rubric column to criteria sets
ALTER TABLE eval_criteria_sets
ADD COLUMN scoring_rubric JSONB DEFAULT '{
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
```

**Rationale:**
- Stored in database (not hardcoded) - can be updated without code changes
- Default 5-tier rubric matches existing status labels
- Configurable per criteria set (e.g., NIST vs HIPAA can have different rubrics)
- Can be customized via admin UI

---

## Prompt Template Changes

### Current Prompt Variables

```python
variables = {
    'criteria_id': criteria_id,
    'requirement': requirement,
    'description': description,
    'context': context,
    'status_options': status_options_text  # ← REMOVE THIS
}
```

### New Prompt Variables

```python
variables = {
    'criteria_id': criteria_id,
    'requirement': requirement,
    'description': description,
    'context': context,
    'scoring_rubric': format_scoring_rubric(criteria_set['scoring_rubric']),  # ← NEW
    'response_sections': format_response_sections(response_structure),  # ← NEW (from opt module)
    'dynamic_section_fields': build_section_fields(response_structure)  # ← NEW
}
```

### Rubric Formatting Function

```python
def format_scoring_rubric(rubric: Dict[str, Any]) -> str:
    """Format scoring rubric for inclusion in prompt."""
    if not rubric or 'tiers' not in rubric:
        # Fallback to default
        return """
- 0-20 (Non-Compliant): Criterion not addressed or completely fails requirement
- 21-40 (Mostly Non-Compliant): Significant gaps exist, fails key aspects
- 41-60 (Partially Compliant): Addresses some requirements but incomplete
- 61-80 (Mostly Compliant): Meets most requirements with minor gaps
- 81-100 (Fully Compliant): Fully meets or exceeds requirement with clear evidence
"""
    
    lines = []
    for tier in rubric['tiers']:
        min_val = tier['min']
        max_val = tier['max']
        label = tier['label']
        desc = tier['description']
        lines.append(f"- {min_val}-{max_val} ({label}): {desc}")
    
    return '\n'.join(lines)
```

---

## Response Parsing Changes

### Current Parser

```python
def parse_evaluation_response(response: str, status_options: List) -> Dict:
    # Extract status name
    status_name = parsed.get('status')
    
    # Match to status option
    status_option = find_matching_status(status_name, status_options)
    
    # Get score from status option
    ai_score_value = status_option['score_value']  # ← WRONG!
    
    return {
        'status_id': status_option['id'],
        'ai_score_value': ai_score_value,  # Binary: 0, 50, or 100
        'explanation': parsed.get('explanation')
    }
```

### New Parser

```python
def parse_evaluation_response(
    response: str, 
    response_structure: Optional[Dict] = None
) -> Dict:
    """Parse AI response with direct scoring and structured sections."""
    
    parsed = extract_json_from_response(response)
    
    # Extract score directly from AI
    ai_score_value = parsed.get('score')  # 0-100 from AI
    if ai_score_value is not None:
        ai_score_value = max(0, min(100, float(ai_score_value)))
    
    # Extract confidence
    ai_confidence = parsed.get('confidence')
    if ai_confidence is not None:
        ai_confidence = max(0, min(100, int(ai_confidence)))
    
    # Extract structured sections based on response_structure
    ai_result = {}
    if response_structure and 'sections' in response_structure:
        for section in response_structure['sections']:
            section_key = section['id']
            section_value = parsed.get(section_key, '')
            ai_result[section_key] = section_value
    else:
        # Fallback: Store as explanation
        ai_result = {'explanation': parsed.get('explanation', response)}
    
    # Extract citations (already JSONB)
    ai_citations = parsed.get('citations', [])
    
    # Status ID is now optional/deprecated
    # Frontend derives status label from ai_score_value
    
    return {
        'ai_score_value': ai_score_value,  # Direct from AI
        'ai_confidence': ai_confidence,
        'ai_result': ai_result,  # JSONB structured sections
        'ai_citations': ai_citations,
        'ai_status_id': None  # Deprecated (UI derives from score)
    }
```

---

## Frontend Changes

### Status Label Derivation

```typescript
// New utility function in frontend
export function getStatusFromScore(score: number): {
  label: string;
  color: string;
  tier: number;
} {
  if (score >= 81) return { label: "Fully Compliant", color: "green", tier: 5 };
  if (score >= 61) return { label: "Mostly Compliant", color: "lime", tier: 4 };
  if (score >= 41) return { label: "Partially Compliant", color: "yellow", tier: 3 };
  if (score >= 21) return { label: "Mostly Non-Compliant", color: "orange", tier: 2 };
  return { label: "Non-Compliant", color: "red", tier: 1 };
}

// Usage in components
const result = criteriaResult; // From API
const status = getStatusFromScore(result.ai_score_value);

return (
  <div>
    <Badge color={status.color}>{status.label}</Badge>
    <Text>Score: {result.ai_score_value}/100</Text>
  </div>
);
```

### Structured Sections Display

```typescript
// Display structured sections from JSONB
const aiResult = criteriaResult.ai_result; // JSONB object

return (
  <div>
    {aiResult.justification && (
      <Section title="Justification">
        <Text>{aiResult.justification}</Text>
      </Section>
    )}
    
    {aiResult.non_compliance_findings && (
      <Section title="Non-Compliance Findings">
        <Text>{aiResult.non_compliance_findings}</Text>
      </Section>
    )}
    
    {aiResult.recommendations && (
      <Section title="Recommendations">
        <Text>{aiResult.recommendations}</Text>
      </Section>
    )}
  </div>
);
```

---

## Integration with Optimization Module

### Truth Key Creation

**Analysts enter:**
- Numerical score (0-100) - matches AI scoring
- Structured section text per defined sections

**Truth key schema already supports this:**
```sql
CREATE TABLE eval_opt_truth_keys (
    score_range INTEGER,  -- Tier (1-5) derived from numerical score
    response_sections JSONB,  -- {"justification": "...", "findings": "...", "recommendations": "..."}
    ...
);
```

### Optimization Accuracy Calculation

```python
def calculate_accuracy(ai_result, truth_key):
    """
    Compare AI score vs truth key score.
    
    Returns:
    - score_diff: Absolute difference (0-100)
    - tier_match: Boolean (same tier?)
    - section_accuracy: Per-section text similarity
    """
    
    # Score accuracy
    score_diff = abs(ai_result['ai_score_value'] - truth_key['expected_score'])
    
    # Tier accuracy (more forgiving)
    ai_tier = get_tier_from_score(ai_result['ai_score_value'])
    truth_tier = get_tier_from_score(truth_key['expected_score'])
    tier_match = (ai_tier == truth_tier)
    
    # Section accuracy (semantic similarity)
    section_accuracy = {}
    for section_id, truth_text in truth_key['response_sections'].items():
        ai_text = ai_result['ai_result'].get(section_id, '')
        similarity = calculate_semantic_similarity(ai_text, truth_text)
        section_accuracy[section_id] = similarity
    
    return {
        'score_diff': score_diff,
        'tier_match': tier_match,
        'section_accuracy': section_accuracy,
        'overall_accuracy': 1.0 - (score_diff / 100)  # 0.0 to 1.0
    }
```

---

## Migration Strategy

### Phase 1: Database Schema (Immediate)

1. Add `scoring_rubric` to `eval_criteria_sets` with default 5-tier rubric
2. Convert `ai_result` from TEXT to JSONB (backward compatible migration)
3. Mark `ai_status_id` as deprecated (keep for backward compat, set to NULL going forward)

### Phase 2: Backend Updates (Sprint 5)

1. Update `parse_evaluation_response()` to extract score directly
2. Update prompt templates to include rubric and response sections
3. Update `evaluate_criteria_item()` to use new parser
4. Deploy to test environment

### Phase 3: Frontend Updates (Sprint 5)

1. Add `getStatusFromScore()` utility
2. Update criteria result display to show score prominently
3. Update section rendering for JSONB structure
4. Deploy to test environment

### Phase 4: Validation (Sprint 5-6)

1. Run evaluations with new scoring approach
2. Verify granular scores (not just 0/100)
3. Validate with optimization module truth keys
4. Measure accuracy improvement

---

## Admin UI Enhancements (Future)

### Rubric Configuration Page

**Route:** `/admin/org/eval/criteria-sets/{id}/rubric`

**Features:**
- View current rubric tiers
- Edit tier ranges, labels, descriptions
- Preview rubric in prompt format
- Reset to default rubric
- Save changes (updates JSONB column)

### Response Structure Configuration

**Route:** `/admin/org/eval/criteria-sets/{id}/response-structure`

**Features:**
- Define expected response sections
- Set section types (text, list, number)
- Mark sections as required/optional
- Preview prompt with sections
- Save structure (integrates with optimization module)

---

## Testing & Validation

### Unit Tests

```python
def test_parse_evaluation_with_direct_score():
    response = '''{
        "score": 73,
        "confidence": 85,
        "justification": "Policy meets most requirements...",
        "non_compliance_findings": "No quarterly review schedule...",
        "recommendations": "Add specific review schedule...",
        "citations": ["Section 3.2"]
    }'''
    
    result = parse_evaluation_response(response)
    
    assert result['ai_score_value'] == 73
    assert result['ai_confidence'] == 85
    assert result['ai_result']['justification'] == "Policy meets most requirements..."
    assert len(result['ai_citations']) == 1
    assert result['ai_status_id'] is None  # Deprecated
```

### Integration Tests

1. Create evaluation with new rubric
2. Verify AI returns granular scores (not just 0/100)
3. Verify UI displays correct status label from score
4. Verify optimization module can compare scores accurately

---

## Success Criteria

- [ ] Database schema updated (scoring_rubric added, ai_result converted to JSONB)
- [ ] AI returns numerical scores from 0-100 (not just tier values)
- [ ] UI derives status labels from scores correctly
- [ ] Optimization module can measure granular accuracy
- [ ] Existing evaluations still render correctly (backward compat)
- [ ] Admin UI can edit rubrics (future)

---

## Open Questions

1. **Rubric customization scope:** Should rubrics be editable per criteria set, or system-wide default only?
   - **Recommendation:** Start with per-criteria-set (more flexible), default to system rubric

2. **Migration of existing data:** How to handle existing `ai_status_id` values?
   - **Recommendation:** Keep column for backward compat, set to NULL for new evaluations, UI ignores it

3. **Response section defaults:** Should there be system-wide default sections?
   - **Recommendation:** Yes - default to `{"explanation": "text"}` for backward compat

---

**Next Steps:**
1. Review this spec
2. Create database migration scripts
3. Update Lambda parser and prompt logic
4. Test with optimization module
5. Deploy to test environment

**Document Status:** Draft v1.0  
**Review Status:** Pending user approval  
**Implementation Timeline:** Sprint 5-6 (post-optimization module testing)