# CORA Standard: Internal Python Naming Conventions

## Purpose

This standard clarifies naming conventions for Python code **within Lambda functions** (not API responses).

## The Rule

**Internal Python dictionaries use snake_case** for:
1. Data that will be written to the database
2. Data passed between internal functions
3. Temporary data structures

**camelCase is ONLY used at the API boundary** (in response wrappers like `success_response()`).

## Data Flow Example

```
AWS Bedrock API (camelCase)     →  _parse_bedrock_model()  →  internal dict (snake_case)
                                                           ↓
                                   handle_discover_models() →  reads dict (snake_case)
                                                           ↓
                                   common.insert_one()     →  database (snake_case columns)
                                                           ↓
                                   success_response()      →  API response (camelCase via format_record)
```

## Correct Pattern

```python
def _parse_bedrock_model(model_summary):
    """Parse Bedrock API response into internal format (snake_case)"""
    return {
        'model_id': model_summary.get('modelId'),      # Convert API camelCase → internal snake_case
        'display_name': model_summary.get('modelName'),
        'cost_per_1k_tokens': 0.001,
    }

def handle_discover_models():
    """Handler that uses internal data and writes to DB"""
    for model_info in discovered_models:
        model_data = {
            'model_id': model_info['model_id'],         # Internal access (snake_case)
            'display_name': model_info['display_name'],
        }
        common.insert_one('ai_models', model_data)      # DB uses snake_case
    
    # Only at API boundary: convert to camelCase
    return common.success_response(common.format_records(saved_models))
```

## Why This Matters

- **Prevents KeyError bugs**: Parser returns same keys handler expects
- **Database compatibility**: DB columns are snake_case
- **Python convention**: snake_case is standard Python style
- **Clear API boundary**: camelCase transformation happens in ONE place (`format_record`)

## Validator

Run `validation/python-key-consistency-validator/validate_python_key_consistency.py` to detect mismatches.
