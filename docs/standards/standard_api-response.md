# CORA Module API Response Standard

## Overview

All CORA module Lambda functions MUST use the standardized response format provided by the `org_common` layer. This ensures consistency across all APIs and simplifies frontend integration.

## Standard Response Format

### Success Responses

**Backend (Lambda):**

```python
import org_common as common

# Success response
return common.success_response(data)
```

**Resulting HTTP Response:**

```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  },
  "body": "{\"success\": true, \"data\": {...}}"
}
```

**Frontend receives (after JSON parsing):**

```typescript
{
  success: true,
  data: {...}  // ← Access your data here
}
```

### Error Responses

**Backend (Lambda):**

```python
# Built-in error response helpers
return common.bad_request_response("Missing required field")
return common.unauthorized_response()
return common.forbidden_response("Insufficient permissions")
return common.not_found_response("Resource not found")
return common.internal_error_response()
```

**Resulting HTTP Response:**

```json
{
  "statusCode": 400,
  "headers": {...},
  "body": "{\"success\": false, \"error\": \"Missing required field\"}"
}
```

**Frontend receives:**

```typescript
{
  success: false,
  error: "Missing required field"
}
```

## Frontend Integration

### Accessing Response Data

**Correct:**

```typescript
const result = await apiClient.someEndpoint();
const items = result.data; // ✅ Access .data property
```

**Incorrect:**

```typescript
const result = await apiClient.someEndpoint();
const items = result; // ❌ Wrong - missing .data
```

### Example with Certifications

**Backend:**

```python
certifications = [
    {"id": "123", "name": "AWS Certified..."},
    {"id": "456", "name": "Google Cloud..."}
]
return common.success_response(certifications)
```

**Frontend:**

```typescript
const result = await apiClient.certifications.list();
const certs = result.data; // Array of certifications
```

## Response Helper Functions

The `org_common` module provides these helper functions:

| Function                           | Status Code | Use Case                  |
| ---------------------------------- | ----------- | ------------------------- |
| `success_response(data)`           | 200         | Standard success response |
| `created_response(data)`           | 201         | Resource created          |
| `no_content_response()`            | 204         | Success with no content   |
| `bad_request_response(msg)`        | 400         | Invalid request           |
| `unauthorized_response(msg)`       | 401         | Authentication required   |
| `forbidden_response(msg)`          | 403         | Insufficient permissions  |
| `not_found_response(msg)`          | 404         | Resource not found        |
| `conflict_response(msg)`           | 409         | Resource conflict         |
| `internal_error_response(msg)`     | 500         | Server error              |
| `method_not_allowed_response(msg)` | 405         | HTTP method not allowed   |

## Migration Guide

### For New Lambdas

1. Import org_common:

   ```python
   import org_common as common
   ```

2. Use standard response helpers:

   ```python
   # Success
   return common.success_response({"items": items})

   # Error
   return common.bad_request_response("Invalid input")
   ```

### For Existing Lambdas

**Before (Non-standard):**

```python
return {
    "statusCode": 200,
    "headers": {"Content-Type": "application/json"},
    "body": json.dumps({"items": items})
}
```

**After (Standard):**

```python
return common.success_response({"items": items})
```

**Frontend Update:**

```typescript
// Before
const items = result.items;

// After
const items = result.data.items;
```

## Benefits

1. **Consistency** - All APIs follow the same structure
2. **Error Handling** - Standard error format across all endpoints
3. **CORS** - Automatic CORS headers on all responses
4. **Type Safety** - Frontend can rely on consistent structure
5. **Maintainability** - Single source of truth for response format
6. **Debugging** - `success` flag makes it easy to identify errors

## Compliance Checking

### Automated Compliance Checker

A compliance checker script is available to scan all Lambda functions and verify they follow the API response standard.

**Run manually:**

```bash
# From project root
npm run api:compliance

# Or directly with Python
python3 scripts/check-api-compliance.py
```

**Pre-commit Hook:**
The compliance checker runs automatically on Lambda function changes via `lint-staged`. When you modify a `lambda_function.py` file, the checker will:

- ✅ Pass if the Lambda uses org_common response functions
- ❌ Fail if non-compliant patterns are detected
- Show detailed error messages with fix suggestions

**Features:**

- Scans all Lambda functions across all CORA modules dynamically
- Groups results by module for easy navigation
- Detects missing org_common imports
- Identifies direct statusCode returns
- Provides actionable fix suggestions
- Exit code 0 for compliance, 1 for non-compliance

**Sample Output:**

```
API Response Standard Compliance Report

Total Lambda Functions: 20
✅ Compliant: 8
❌ Non-Compliant: 12

Scanned Modules: certification-module, org-module, other

--------------------------------------------------------------------------------
✅ COMPLIANT LAMBDA FUNCTIONS
--------------------------------------------------------------------------------
  📦 certification-module (4 Lambdas)
     ✓ campaign-management
     ✓ certification-management
     ✓ credly-integration
```

**Bypassing Pre-commit Hook:**
If you need to commit non-compliant code (e.g., work in progress):

```bash
git commit --no-verify -m "WIP: updating lambda"
```

## Testing

Verify your Lambda follows the standard:

```bash
# Test response structure
curl -X GET https://api.example.com/endpoint | jq .

# Should return:
{
  "success": true,
  "data": {...}
}
```

## Enforcement

- All new Lambda functions MUST use `org_common` response helpers
- Code reviews should verify standard response format usage
- Frontend API clients should access `result.data` for all endpoints

## Non-Compliance

If a Lambda doesn't follow this standard:

- File a bug ticket
- Mark as technical debt
- Plan migration in next sprint

## Related Documents

- [org_common Module Documentation](../org-module/backend/layers/org-common/)
- [API Gateway Integration](./API_GATEWAY.md)
- [Frontend API Client](../packages/api-client/)

---

**Last Updated:** 2025-11-08  
**Status:** Active Standard  
**Applies To:** All CORA module Lambda functions
