# Plan: Fix BadRequestError - org_common Exception Standardization

**Status:** ✅ COMPLETE  
**Created:** February 8, 2026  
**Priority:** HIGH (Breaks Lambda execution)  
**Scope:** All CORA Lambdas  
**Affected Teams:** All teams with Lambda functions

---

## Problem Statement

Lambda functions are using `common.BadRequestError()` which **does not exist** in the org_common layer, causing `AttributeError` exceptions at runtime.

### Error Manifestation

```python
# ❌ This code FAILS:
raise common.BadRequestError("Missing required field")

# Runtime error:
# AttributeError: module 'org_common' has no attribute 'BadRequestError'
```

---

## Root Cause

The `org_common` layer provides a **limited set of exception classes** for Lambda error handling. The correct pattern uses `ValidationError` for request validation failures.

---

## CORA Exception Standards (org_common)

| Exception Class | HTTP Status | When to Use | Example |
|----------------|-------------|-------------|---------|
| `common.ValidationError` | 400 | Invalid input, missing fields, format errors | `raise common.ValidationError("Missing user_id")` |
| `common.NotFoundError` | 404 | Resource not found in database | `raise common.NotFoundError("Run not found")` |
| `common.ForbiddenError` | 403 | Permission/authorization denied | `raise common.ForbiddenError("Access denied")` |
| `common.UnauthorizedError` | 401 | Authentication required/invalid | `raise common.UnauthorizedError("Invalid token")` |

**Direct Response Functions (Alternative Pattern):**

| Function | HTTP Status | When to Use |
|----------|-------------|-------------|
| `common.bad_request_response(msg)` | 400 | Direct HTTP 400 return |
| `common.not_found_response(msg)` | 404 | Direct HTTP 404 return |
| `common.forbidden_response(msg)` | 403 | Direct HTTP 403 return |
| `common.unauthorized_response(msg)` | 401 | Direct HTTP 401 return |

---

## The Fix

### Pattern 1: Raise Exception (Recommended)

**Use when:** Inside nested functions where centralized error handling will catch it

```python
# ❌ WRONG:
if not criteria_set_id:
    raise common.BadRequestError("Missing criteria_set_id")

# ✅ CORRECT:
if not criteria_set_id:
    raise common.ValidationError("Missing criteria_set_id")
```

**Why this works:**
```python
# Standard CORA Lambda handler pattern:
def lambda_handler(event, context):
    try:
        # ... route to handlers ...
    except common.ValidationError as e:
        return common.bad_request_response(str(e))  # ← Auto-converts to HTTP 400
    except common.NotFoundError as e:
        return common.not_found_response(str(e))
    # ... other exception handlers ...
```

### Pattern 2: Return Response (Direct)

**Use when:** At handler function level, returning directly to API Gateway

```python
# ❌ WRONG:
if not criteria_set_id:
    raise common.BadRequestError("Missing criteria_set_id")

# ✅ CORRECT:
if not criteria_set_id:
    return common.bad_request_response("Missing criteria_set_id")
```

---

## Implementation Steps

### Step 1: Find All Occurrences

```bash
# Search for BadRequestError usage
grep -rn "BadRequestError" templates/_modules-functional/ templates/_modules-core/
grep -rn "BadRequestError" {project}-stack/packages/
```

### Step 2: Replace with ValidationError

For each occurrence:

1. **If inside a nested function** (not lambda_handler):
   ```python
   # Change this:
   raise common.BadRequestError("message")
   # To this:
   raise common.ValidationError("message")
   ```

2. **If at handler function level**:
   ```python
   # Change this:
   raise common.BadRequestError("message")
   # To this (preferred):
   raise common.ValidationError("message")
   # OR this (alternative):
   return common.bad_request_response("message")
   ```

### Step 3: Verify Lambda Handler

Ensure your lambda_handler has the exception handler:

```python
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    try:
        # ... your code ...
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.NotFoundError as e:
        return common.not_found_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        logger.exception(f'Error: {str(e)}')
        return common.internal_error_response('Internal server error')
```

### Step 4: Test

1. **Unit test the fix:**
   ```python
   # Test that ValidationError is raised correctly
   with pytest.raises(common.ValidationError):
       handle_function(invalid_input)
   ```

2. **Integration test:**
   - Deploy Lambda
   - Send request with missing/invalid field
   - Verify HTTP 400 response with error message

---

## Known Affected Files (February 2026)

### Templates (Fixed)
- ✅ `templates/_modules-functional/module-eval-studio/backend/lambdas/opt-orchestrator/lambda_function.py` (3 occurrences → replaced with `common.ValidationError`, local `BadRequestError` class removed)

### Projects Requiring Fix
Check these locations in **your project**:
- `{project}-stack/packages/module-eval-studio/backend/lambdas/opt-orchestrator/lambda_function.py`
- Any Lambda you've created/modified recently

**Search command:**
```bash
cd ~/code/{org}/{project}/{project}-stack
grep -rn "BadRequestError" packages/
```

---

## Checklist

- [x] Search codebase for `BadRequestError`
- [x] Replace with `ValidationError` (or `bad_request_response()`)
- [x] Verify lambda_handler catches `ValidationError`
- [x] Test with invalid input → HTTP 400 response
- [x] Update template if changes were in test project
- [x] Sync fix to any other projects using same code

---

## Why This Matters

1. **Runtime Failures:** `BadRequestError` causes Lambda execution to fail with `AttributeError`
2. **Inconsistent Error Handling:** Different teams using different patterns
3. **API Contract:** Frontend expects consistent HTTP 400 for validation errors
4. **Logging:** Proper exceptions log correctly in CloudWatch

---

## References

- **ADR-019b:** Auth Backend Standardization (uses ValidationError)
- **org_common layer:** `templates/_project-stack-template/packages/org-common/`
- **Standard Lambda template:** All CORA Lambdas follow this pattern

---

## Questions?

Contact: Platform Team or check `#cora-dev` Slack channel