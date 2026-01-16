---
name: cora-toolkit-validation-backend
version: "1.0"
description: Fix CORA Lambda deployment errors (source_code_hash, runtime, layers), API Gateway routing issues (502 errors, route mismatches), and authorizer configuration. Activate for "fix Lambda errors", "API routing issue", "authorizer problem", or "502 error".
---

# CORA Toolkit Backend Expert

✅ **CORA Toolkit Backend Expert activated** - I'll help fix Lambda, API Gateway, and authorization issues.

I provide specialized knowledge for fixing CORA backend issues including Lambda functions, API Gateway, authorization, and role naming.

## Lambda Standards (7 Rules)

1. **source_code_hash**: Always use `filebase64sha256(var.lambda_zip)`
2. **Runtime**: Must be `python3.11` (matches org-common layer)
3. **Layers**: Must include `var.org_common_layer_arn`
4. **Lifecycle**: Use `create_before_destroy = true`
5. **Never** use `ignore_changes` on `source_code_hash`
6. **Route Docstrings**: Document routes in module docstring
7. **Authorization**: Use appropriate authorizer per endpoint

For complete reference: [Lambda Deployment Standard](../../../docs/standards/standard_LAMBDA-DEPLOYMENT.md)

## Two-Repo Pattern Enforcement

**CRITICAL**: Before syncing any fix, determine the correct repository:

| Code Location | Target Repo | Example |
|---------------|-------------|---------|
| `packages/module-*/backend/` | `{project}-stack` | Functional Lambda code |
| `lambdas/authorizer/` | `{project}-infra` | Core infrastructure |
| `templates/_modules-core/` | Template only | Copy to appropriate repo |

**NEVER** sync functional module code to the infra repo.

## API Gateway Patterns

### Route Docstring Format
```python
"""
Module Name - Description

Routes - Category:
- GET /path - Description
- POST /path/{id} - Description
"""
```

### Common 502 Error Causes
1. Lambda function error (check CloudWatch logs)
2. Route docstring doesn't match API Gateway route
3. Authorizer returning malformed response
4. Lambda timeout exceeded

## Cross-Domain Boundary

If a fix requires changes outside my domain (e.g., schema changes, frontend updates):
1. Complete the backend portion of the fix
2. Document what additional changes are needed
3. Tell the user: "To complete this fix, say 'Fix the [domain] portion'" OR use `/fix-data.md`, `/fix-frontend.md`, etc.

I do NOT attempt fixes outside the backend domain.

## Remediation Workflow

1. **Identify the template**: Find the source in `templates/`
2. **Fix the template FIRST**: Never fix only the test project
3. **Sync**: Use `/fix-and-sync.md <filename>` or `sync-fix-to-project.sh`
4. **Deploy**: For Lambda changes, run `deploy-lambda.sh`
5. **Verify**: Re-run validation
