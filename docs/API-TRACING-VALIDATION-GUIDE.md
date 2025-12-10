# API Tracing Validation Guide

**Last Updated:** November 25, 2025  
**Tool Location:** `pm-app-stack/scripts/validation/api-tracer/`  
**Status:** ✅ Operational

---

## Overview

The API Full Stack Tracing Validator ensures API contracts are consistent across the entire stack:
**Frontend → API Gateway → Lambda**

This prevents common integration issues:

- ❌ 404 errors (frontend calls non-existent routes)
- ❌ Parameter mismatches (frontend sends different params than Lambda expects)
- ❌ Response format errors (wrapped vs unwrapped data)

## Quick Start

### Run Validation Manually

```bash
# Validate entire project
cd pm-app-stack
python scripts/validation/api-tracer/cli.py --path . --output text

# Validate specific module
python scripts/validation/api-tracer/cli.py --path packages/kb-module --output text

# JSON output for CI/CD
python scripts/validation/api-tracer/cli.py --path . --output json
```

### Output Formats

- `text` - Human-readable terminal output (default)
- `json` - Machine-readable for CI/CD
- `markdown` - Formatted for PR comments
- `summary` - Quick overview (errors only)

## How It Works

### 1. Frontend Parser

Extracts API calls from TypeScript/React files:

```typescript
// packages/kb-module/frontend/hooks/useKnowledgeBases.ts
const api = createAuthenticatedClient(token);
const response = await api.get<KnowledgeBase[]>(`/orgs/${orgId}/kb/bases`);
```

**Detected Contract:**

- Method: `GET`
- Path: `/orgs/{orgId}/kb/bases`
- Path Params: `orgId`
- Expected Response: `KnowledgeBase[]`

### 2. API Gateway Parser

Parses Terraform route definitions:

```hcl
# packages/kb-module/backend/outputs.tf
output "api_routes" {
  value = [
    {
      path   = "/orgs/{orgId}/kb/bases"
      method = "GET"
      lambda = "kb-base-handler"
    }
  ]
}
```

### 3. Lambda Parser

Extracts route handlers from Lambda functions:

```python
# packages/kb-module/backend/lambdas/kb-base/lambda_function.py
def lambda_handler(event, context):
    method = event["httpMethod"]
    path = event["path"]

    if method == "GET" and "/kb/bases" in path:
        return handle_list_bases(event)
```

### 4. Cross-Layer Validation

Validates that all three layers agree:

✅ **Frontend → Gateway Match**

- Frontend calls exist in Gateway routes
- HTTP methods match
- Path parameters match

✅ **Gateway → Lambda Match**

- Gateway routes have Lambda handlers
- Lambda handles all expected methods
- Parameter extraction works correctly

## Validation Results

### Example: Successful Validation

```
======================================================================
API Full Stack Validation Report
======================================================================

✅ Frontend API Calls: 35 calls detected
✅ API Gateway Routes: 16 routes detected
✅ Lambda Handlers: 58 handlers detected
✅ Cross-Layer Validation: 0 errors, 0 warnings

Status: PASSED
======================================================================
```

### Example: Validation Errors

```
======================================================================
API Full Stack Validation Report
======================================================================

❌ 3 error(s) found

──────────────────────────────────────────────────────────────────────
ERROR #1: Route Not Found
──────────────────────────────────────────────────────────────────────
Frontend File: packages/kb-module/frontend/hooks/useKnowledgeBases.ts
Line: 42
Issue: Frontend calls endpoint that doesn't exist in API Gateway

  Frontend Request:
    GET /orgs/{orgId}/kb/bases

  API Gateway Routes:
    (no matching route found)

💡 Suggestion: Add route to API Gateway or fix frontend endpoint

──────────────────────────────────────────────────────────────────────
ERROR #2: Parameter Mismatch
──────────────────────────────────────────────────────────────────────
Frontend File: packages/ai-config-module/frontend/hooks/useAIConfig.ts
Lambda File: packages/ai-config-module/backend/lambdas/ai-config-handler/lambda_function.py

Issue: Frontend sends 'order_by' but Lambda expects 'order'

  Frontend sends:
    GET /admin/ai/models?order_by=name

  Lambda expects:
    GET /admin/ai/models?order=name

💡 Suggestion: Update frontend to use 'order' parameter

──────────────────────────────────────────────────────────────────────
ERROR #3: Missing Lambda Handler
──────────────────────────────────────────────────────────────────────
API Gateway Route: POST /admin/ai/providers/test

Issue: API Gateway route exists but Lambda handler not found

💡 Suggestion: Implement handler in Lambda or remove route from Gateway

Status: FAILED
======================================================================
```

## Common Errors and Solutions

### Error: Route Not Found

**Cause:** Frontend calls an endpoint that doesn't exist in API Gateway

**Solutions:**

1. Add route to `packages/*/backend/outputs.tf`
2. Update frontend to use correct endpoint
3. Check for typos in path

**Example Fix:**

```hcl
# packages/kb-module/backend/outputs.tf
output "api_routes" {
  value = [
    {
      path   = "/orgs/{orgId}/kb/bases"  # Add missing route
      method = "GET"
      lambda = module.kb_base_lambda.lambda_arn
    }
  ]
}
```

### Error: Parameter Mismatch

**Cause:** Frontend and Lambda use different parameter names

**Solutions:**

1. Standardize parameter names across stack
2. Update frontend to match Lambda expectations
3. Update Lambda to match frontend expectations

**Example Fix:**

```typescript
// Before (WRONG)
const response = await api.get(`/admin/ai/models?order_by=name`);

// After (CORRECT)
const response = await api.get(`/admin/ai/models?order=name`);
```

### Error: Missing Lambda Handler

**Cause:** API Gateway route exists but Lambda doesn't handle it

**Solutions:**

1. Implement handler in Lambda
2. Remove route from API Gateway if not needed
3. Check Lambda routing logic

**Example Fix:**

```python
# packages/*/backend/lambdas/*/lambda_function.py
def lambda_handler(event, context):
    method = event["httpMethod"]
    path = event["path"]

    # Add missing handler
    if method == "POST" and "/providers/test" in path:
        return handle_test_provider(event)
```

## CI/CD Integration

### GitHub Actions Workflow

The validator runs automatically on pull requests that modify:

- Frontend API clients (`**/frontend/lib/api.ts`, `**/frontend/hooks/**`)
- API Gateway routes (`**/backend/outputs.tf`)
- Lambda handlers (`**/lambda_function.py`)

**Workflow:** `.github/workflows/api-validation.yml`

### PR Comment Example

When validation fails, a comment is posted on the PR:

```markdown
## 🔍 API Full Stack Validation Report

❌ Validation failed: 3 errors found

### Error #1: Route Not Found

Frontend calls `/orgs/{orgId}/kb/bases` but route doesn't exist in API Gateway

**File:** packages/kb-module/frontend/hooks/useKnowledgeBases.ts:42
**Suggestion:** Add route to API Gateway

---

_This report validates API contracts across Frontend → API Gateway → Lambda layers_
```

### Blocking Merges

The workflow **blocks PR merges** if validation fails, ensuring:

- No 404 errors reach production
- Parameter contracts are consistent
- All API routes have handlers

## Pre-Commit Hook (Optional)

API validation can be slow (30-60 seconds), so it's **optional** for pre-commit:

```bash
# Install pre-commit hook (includes API validation)
cp pm-app-stack/scripts/git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Recommendation:** Use pre-push hook instead:

```bash
# Pre-push includes all validators
cp pm-app-stack/scripts/git-hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

## Best Practices

### 1. Define API Contracts Early

Before implementing features:

1. Define frontend API client interface
2. Add API Gateway routes
3. Implement Lambda handlers
4. Run validator to verify consistency

### 2. Use TypeScript Types

```typescript
// Define API response types
export interface KnowledgeBase {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
}

// Use in API client
const response = await api.get<KnowledgeBase[]>(`/orgs/${orgId}/kb/bases`);
```

### 3. Standardize Parameter Names

**Recommended Conventions:**

- Path params: `{camelCase}` → `{orgId}`, `{userId}`
- Query params: `snake_case` → `order`, `limit`, `offset`
- Request body: `snake_case` (matches Python/database)

### 4. Document API Contracts

Add JSDoc comments to API client methods:

```typescript
/**
 * Get knowledge bases for an organization
 * @param orgId - Organization UUID
 * @param options - Query options (limit, offset, order)
 * @returns Array of knowledge bases
 */
async getKnowledgeBases(
  orgId: string,
  options?: { limit?: number; offset?: number; order?: string }
): Promise<KnowledgeBase[]>
```

## Troubleshooting

### Validator Not Detecting Routes

**Check:**

1. Terraform outputs are in correct format (`outputs.tf`)
2. Lambda files are named `lambda_function.py`
3. Frontend API clients use `authenticatedClient` pattern

### False Positives

**Common causes:**

1. Dynamic route construction (use static paths when possible)
2. Proxy routes (validator may not detect wildcards)
3. Legacy code patterns (migrate to standard patterns)

**Report Issues:**

```bash
# If you encounter false positives, run with verbose output
python scripts/validation/api-tracer/cli.py --path . --output text --verbose
```

### Validation Too Slow

**Optimization tips:**

1. Validate specific modules instead of entire project
2. Use `--output summary` for quick checks
3. Run in CI/CD only (skip pre-commit hook)

## Advanced Usage

### Validate Specific Module

```bash
python scripts/validation/api-tracer/cli.py \
  --path packages/kb-module \
  --output text
```

### Debug Output

```bash
python scripts/validation/api-tracer/cli.py \
  --path . \
  --output text \
  --verbose
```

### JSON Output for Automation

```bash
python scripts/validation/api-tracer/cli.py \
  --path . \
  --output json > api-validation.json

# Parse with jq
cat api-validation.json | jq '.summary.error_count'
```

## Related Documentation

- [Schema Validation Guide](./SCHEMA-VALIDATION-GUIDE.md) - Validate database queries
- [Import Validation Guide](./IMPORT-VALIDATION-GUIDE.md) - Validate Lambda imports
- [Phase 1 Implementation Plan](../../docs/implementation/phase-1-validation-tools-implementation-plan.md)

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review validation output for suggestions
3. Consult implementation plan for context

---

**Tool Version:** 1.0  
**Last Tested:** November 25, 2025  
**Maintainer:** Cline AI Agent
