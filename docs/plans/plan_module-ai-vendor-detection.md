# Module-AI Vendor Detection & Inference Profile Enhancement

**Status**: 📋 PLANNED - Blocked by module-eval inference profile work  
**Priority**: HIGH  
**Estimated Duration**: 2-3 hours  
**Created**: January 20, 2026  
**Dependencies**: Follows `plan_eval-inference-profile-fix.md`

---

## Executive Summary

**Problem**: The `ai_models` table doesn't track which vendor (Anthropic, Amazon, Meta, Mistral, etc.) provides each model through AWS Bedrock. This prevents vendor-specific logic for inference profile routing, region selection, and marketplace requirements.

**Solution**: Add `model_vendor` column to `ai_models` table and enhance the AI validation service to populate it by parsing `model_id` and `display_name` patterns.

**Scope**: Module-ai validation service updates only. Module-eval will consume the new column.

---

## Database Changes

### Migration: Add model_vendor Column

**File**: `templates/_modules-core/module-ai/db/schema/004-model-vendor-column.sql`

```sql
-- Add model_vendor column to ai_models table
-- Enables vendor-specific logic for inference profiles, regions, and marketplace requirements

ALTER TABLE ai_models 
ADD COLUMN model_vendor VARCHAR(50);

COMMENT ON COLUMN ai_models.model_vendor IS 'AI model vendor (anthropic, amazon, meta, mistral, cohere, etc.) - auto-detected from model_id pattern';

-- Create index for vendor-based queries
CREATE INDEX idx_ai_models_vendor ON ai_models(model_vendor);

-- Backfill existing records with vendor detection
UPDATE ai_models
SET model_vendor = CASE
    -- Handle inference profiles (strip region prefix first)
    WHEN model_id ~ '^(us|eu|ap|ca|global)\.' THEN
        CASE
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.anthropic\.' THEN 'anthropic'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.amazon\.' THEN 'amazon'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.meta\.' THEN 'meta'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.mistral\.' THEN 'mistral'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.cohere\.' THEN 'cohere'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.stability\.' THEN 'stability'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.twelvelabs\.' THEN 'twelvelabs'
            WHEN model_id ~ '^(us|eu|ap|ca|global)\.deepseek\.' THEN 'deepseek'
            ELSE 'unknown'
        END
    -- Handle foundation models (no region prefix)
    WHEN model_id ~ '^anthropic\.' THEN 'anthropic'
    WHEN model_id ~ '^amazon\.' THEN 'amazon'
    WHEN model_id ~ '^meta\.' THEN 'meta'
    WHEN model_id ~ '^mistral\.' THEN 'mistral'
    WHEN model_id ~ '^cohere\.' THEN 'cohere'
    WHEN model_id ~ '^ai21\.' THEN 'ai21'
    WHEN model_id ~ '^stability\.' THEN 'stability'
    WHEN model_id ~ '^google\.' THEN 'google'
    WHEN model_id ~ '^nvidia\.' THEN 'nvidia'
    WHEN model_id ~ '^openai\.' THEN 'openai'
    WHEN model_id ~ '^qwen\.' THEN 'qwen'
    WHEN model_id ~ '^minimax\.' THEN 'minimax'
    WHEN model_id ~ '^twelvelabs\.' THEN 'twelvelabs'
    WHEN model_id ~ '^deepseek\.' THEN 'deepseek'
    ELSE 'unknown'
END
WHERE provider_id IN (SELECT id FROM ai_providers WHERE provider_type = 'aws_bedrock');
```

---

## Validation Service Updates

### File: Module-AI Validation Lambda

**Location**: `templates/_modules-core/module-ai/backend/lambdas/ai-validation/lambda_function.py`

### Function: `detect_model_vendor()`

Add vendor detection function:

```python
def detect_model_vendor(model_id: str, display_name: str = '') -> str:
    """
    Detect the model vendor from model_id pattern.
    
    Args:
        model_id: The Bedrock model ID (e.g., 'anthropic.claude-3-5-sonnet-20241022-v2:0')
        display_name: Optional display name for additional context
    
    Returns:
        Vendor name (anthropic, amazon, meta, mistral, etc.) or 'unknown'
    """
    # Strip region prefix if present (us., eu., ap., ca., global.)
    clean_model_id = model_id
    if re.match(r'^(us|eu|ap|ca|global)\.', model_id):
        clean_model_id = model_id.split('.', 1)[1]
    
    # Detect vendor from model_id prefix
    vendor_patterns = {
        'anthropic': r'^anthropic\.',
        'amazon': r'^amazon\.',
        'meta': r'^meta\.',
        'mistral': r'^mistral\.',
        'cohere': r'^cohere\.',
        'ai21': r'^ai21\.',
        'stability': r'^stability\.',
        'google': r'^google\.',
        'nvidia': r'^nvidia\.',
        'openai': r'^openai\.',
        'qwen': r'^qwen\.',
        'minimax': r'^minimax\.',
        'twelvelabs': r'^twelvelabs\.',
        'deepseek': r'^deepseek\.'
    }
    
    for vendor, pattern in vendor_patterns.items():
        if re.match(pattern, clean_model_id):
            return vendor
    
    # Fallback: Try to detect from display_name
    if display_name:
        display_lower = display_name.lower()
        if 'anthropic' in display_lower or 'claude' in display_lower:
            return 'anthropic'
        if 'amazon' in display_lower or 'nova' in display_lower or 'titan' in display_lower:
            return 'amazon'
        if 'meta' in display_lower or 'llama' in display_lower:
            return 'meta'
        if 'mistral' in display_lower:
            return 'mistral'
        if 'cohere' in display_lower:
            return 'cohere'
    
    return 'unknown'
```

### Update: `validate_bedrock_model()`

Enhance model validation to populate `model_vendor`:

```python
def validate_bedrock_model(model_id: str, provider_id: str) -> Dict[str, Any]:
    """
    Validate a Bedrock model and detect vendor.
    
    Returns:
        Dict with validation results including model_vendor
    """
    try:
        # ... existing validation logic ...
        
        # Detect vendor
        vendor = detect_model_vendor(model_id, display_name)
        
        # Build model record
        model_data = {
            'provider_id': provider_id,
            'model_id': model_id,
            'display_name': display_name,
            'description': description,
            'model_vendor': vendor,  # NEW FIELD
            'capabilities': json.dumps(capabilities),
            'status': status,
            'validation_category': validation_category,
            'cost_per_1k_tokens_input': cost_input,
            'cost_per_1k_tokens_output': cost_output,
            'last_discovered_at': datetime.now(timezone.utc).isoformat()
        }
        
        return model_data
        
    except Exception as e:
        logger.error(f"Error validating model {model_id}: {e}")
        return None
```

---

## Vendor-Specific Logic Examples

### Inference Profile Region Selection

Different vendors may have different regional preferences:

```python
def get_preferred_region(vendor: str, org_preferences: Dict = None) -> str:
    """
    Get preferred region for inference profile based on vendor and org preferences.
    
    Args:
        vendor: Model vendor (anthropic, amazon, etc.)
        org_preferences: Optional org-level region preferences
    
    Returns:
        Region prefix (us, eu, ap, ca, global)
    """
    # Check org preferences first
    if org_preferences and vendor in org_preferences:
        return org_preferences[vendor]
    
    # Default vendor preferences
    vendor_defaults = {
        'anthropic': 'us',      # Anthropic models typically in US
        'amazon': 'us',         # Amazon Nova/Titan in US
        'meta': 'us',           # Meta Llama in US
        'mistral': 'eu',        # Mistral AI based in Europe
        'cohere': 'us',         # Cohere in US
        'stability': 'us',      # Stability AI in US
    }
    
    return vendor_defaults.get(vendor, 'us')  # Default to US
```

---

## Testing

### Test Cases

1. **Vendor Detection**:
   - `anthropic.claude-3-5-sonnet-20241022-v2:0` → `anthropic`
   - `us.anthropic.claude-sonnet-4-5-20250929-v1:0` → `anthropic`
   - `amazon.nova-pro-v1:0` → `amazon`
   - `meta.llama3-3-70b-instruct-v1:0` → `meta`
   - `mistral.ministral-3-8b-instruct` → `mistral`

2. **Backfill Migration**:
   - Run migration on test database
   - Verify all existing models have correct vendor
   - Check unknown vendors are properly flagged

3. **Validation Service**:
   - Trigger model discovery
   - Verify new models get vendor populated
   - Check logs show vendor detection events

---

## Success Criteria

- [x] Migration adds `model_vendor` column to `ai_models` table
- [x] Migration backfills existing records with correct vendors
- [ ] Validation service populates `model_vendor` for new models
- [ ] All Bedrock models have vendor = one of: anthropic, amazon, meta, mistral, cohere, stability, ai21, google, nvidia, openai, qwen, minimax, twelvelabs, deepseek, unknown
- [ ] Vendor detection handles both foundation models and inference profiles
- [ ] Module-eval can query and use `model_vendor` for routing decisions

---

## Module-Eval Integration

**Dependent Plan**: `plan_eval-inference-profile-fix.md`

Once this work is complete, module-eval will:
1. Read `model_vendor` from `ai_models` table
2. Use vendor-specific region selection for inference profiles
3. Log vendor information in CloudWatch for observability
4. Support org-level vendor preferences (future enhancement)

---

**Document Status**: 📋 PLAN - Ready for implementation  
**Next Steps**: Implement migration and validation service updates
