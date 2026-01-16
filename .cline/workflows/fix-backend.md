# CORA Backend Fix Workflow

This workflow provides backend expertise for fixing Lambda, API Gateway, and authorization issues.

**Use this workflow when:**
- The `cora-toolkit-validation-backend` skill doesn't activate
- You want guaranteed access to backend remediation knowledge

## Lambda Standards (7 Rules)

1. **source_code_hash**: Always use `filebase64sha256(var.lambda_zip)`
2. **Runtime**: Must be `python3.11` (matches org-common layer)
3. **Layers**: Must include `var.org_common_layer_arn`
4. **Lifecycle**: Use `create_before_destroy = true`
5. **Never** use `ignore_changes` on `source_code_hash`
6. **Route Docstrings**: Document routes in module docstring
7. **Authorization**: Use appropriate authorizer per endpoint

For complete reference: [Lambda Deployment Standard](../docs/standards/standard_LAMBDA-DEPLOYMENT.md)

## Two-Repo Pattern

| Code Location | Target Repo |
|---------------|-------------|
| `packages/module-*/backend/` | `{project}-stack` |
| `lambdas/authorizer/` | `{project}-infra` |

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

### Common Issues
- Missing route docstrings → API tracer can't match routes
- Wrong HTTP method → 502 errors
- Missing authorizer attachment → Unauthorized access

## Remediation Workflow

1. **Identify the template**: Find the source in `templates/`
2. **Fix the template FIRST**: Never fix only the test project
3. **Sync**: Use `/fix-and-sync.md <filename>` or `sync-fix-to-project.sh`
4. **Deploy**: For Lambda changes, run `deploy-lambda.sh`
5. **Verify**: Re-run validation

## Common Fixes

### Lambda Not Updating
```hcl
# Ensure source_code_hash is present
resource "aws_lambda_function" "my_function" {
  filename         = var.lambda_zip
  source_code_hash = filebase64sha256(var.lambda_zip)  # REQUIRED
  runtime          = "python3.11"
  
  lifecycle {
    create_before_destroy = true
  }
}
```

### 502 Gateway Error
1. Check Lambda logs for Python errors
2. Verify route docstring matches API Gateway route
3. Check authorizer is returning correct response format

### Authorization Failures
1. Verify token is being passed in Authorization header
2. Check authorizer Lambda logs
3. Verify user has required permissions in database
