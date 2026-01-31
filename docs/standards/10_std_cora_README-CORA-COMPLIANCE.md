# CORA Compliance Checker

Enhanced compliance checker for CORA standards and infrastructure validation.

## Overview

The `check-cora-compliance.py` script provides two modes of operation:

1. **Standard CORA Compliance Checks** (default) - Validates Lambda code against 7 CORA standards
2. **Infrastructure Validation Checks** (`--infrastructure` flag) - Validates infrastructure alignment between Lambda, API Gateway, and Database

## Installation

### Required Dependencies

```bash
# For standard CORA checks (no additional dependencies needed)
python3 scripts/check-cora-compliance.py

# For infrastructure checks
pip install boto3 supabase
```

### Environment Setup for Infrastructure Checks

```bash
# AWS credentials (use your AWS profile)
export AWS_PROFILE=career-nonprod-tf
export AWS_REGION=us-east-1

# Supabase credentials (from .env.dev or .env.prd)
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Gateway ID (optional, defaults to imf2i0ntpg)
export API_GATEWAY_ID=imf2i0ntpg
```

## Usage

### Standard CORA Compliance Checks

Check all Lambda functions for CORA standards compliance:

```bash
python3 scripts/check-cora-compliance.py
```

Scan a specific directory:

```bash
python3 scripts/check-cora-compliance.py /path/to/project
```

### Infrastructure Validation Checks

Run infrastructure validation checks:

```bash
python3 scripts/check-cora-compliance.py --infrastructure
```

With custom API Gateway ID:

```bash
python3 scripts/check-cora-compliance.py --infrastructure --api-gateway-id YOUR_API_ID
```

## Standard CORA Compliance Checks (7 Standards)

### 1. org_common Response Format
- ✅ Checks for `org_common` import
- ✅ Validates use of standard response functions
- ❌ Flags direct `statusCode` returns (anti-pattern)

### 2. Authentication & Authorization
- ✅ JWT extraction (`get_user_from_event`)
- ✅ Okta→Supabase mapping
- ✅ Email validation patterns

### 3. Multi-tenancy
- ✅ `org_id` usage in database operations
- ✅ Multi-tenant data isolation

### 4. Validation
- ✅ `ValidationError`, `ForbiddenError`, `NotFoundError`
- ✅ Existence checks
- ✅ Email matching patterns

### 5. Database Helpers
- ✅ Abstracted DB helpers (`common.find_one`, `supabase.table()`)
- ❌ Raw SQL detection (anti-pattern)

### 6. Error Handling
- ✅ Exception handling patterns
- ✅ org_common exception types
- ✅ Generic exception catch (safety net)

### 7. Batch Operations
- ✅ Batch size constants
- ✅ Range-based chunking loops
- ✅ Chunking/batching logic

## Infrastructure Validation Checks (5 Checks)

### 1. CORS Headers Alignment (HIGH severity)

**What it checks:**
- Compares headers accessed in Lambda code vs. API Gateway CORS `allow_headers`
- Detects when Lambda uses headers not in CORS configuration

**Example failure:**
```
Lambda 'campaign-management' uses headers not in CORS allow_headers: x-org-id
```

**Fix:**
Add missing headers to `sts-career-infra/terraform/modules/api-gateway-http/main.tf`:

```terraform
cors_configuration {
  allow_headers = [
    "content-type",
    "authorization", 
    "x-amz-date",
    "x-api-key",
    "x-amz-security-token",
    "x-org-id"  # Add missing header
  ]
}
```

### 2. Payload Format Version Compatibility (HIGH severity)

**What it checks:**
- Validates Lambda event format matches API Gateway payload format version
- Detects v1.0 patterns (should use v2.0)

**v1.0 anti-patterns (detected):**
```python
event['httpMethod']  # v1.0
event['path']        # v1.0
event['resource']    # v1.0
```

**v2.0 correct patterns:**
```python
event['requestContext']['http']['method']  # v2.0
event['rawPath']                           # v2.0
```

**Fix:**
Update Lambda code to use API Gateway HTTP API v2.0 event format.

### 3. Database Function Existence (HIGH severity)

**What it checks:**
- Validates all `.rpc('function_name')` calls in Lambda code
- Verifies functions exist in Supabase database

**Example failure:**
```
Lambda 'campaign-management' calls .rpc('get_campaigns_for_org') but function doesn't exist in database
```

**Fix:**
Apply missing database migration:

```bash
cd sts-career-stack
./scripts/apply-migration.sh sql/migrations/005_add_campaign_functions.sql
```

### 4. Route Integration Existence (CRITICAL severity)

**What it checks:**
- Validates all API Gateway routes have Lambda integrations
- Detects routes pointing to non-existent integrations

**Example failure:**
```
Route 'GET /cert_campaign' has no integration
```

**Fix:**
Add missing integration in Terraform:

```terraform
resource "aws_apigatewayv2_integration" "cert_campaign" {
  api_id             = aws_apigatewayv2_api.this.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.cert_campaign.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "cert_campaign_get" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "GET /cert_campaign"
  target    = "integrations/${aws_apigatewayv2_integration.cert_campaign.id}"
}
```

### 5. Lambda Invocation Permissions (CRITICAL severity)

**What it checks:**
- Validates API Gateway has permission to invoke Lambda functions
- Checks Lambda resource policies

**Example failure:**
```
Lambda 'campaign-management' missing API Gateway invoke permission
```

**Fix:**
Add `aws_lambda_permission` resource in Terraform:

```terraform
resource "aws_lambda_permission" "campaign_management_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.campaign_management.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}
```

## Output Format

### Standard CORA Compliance Report

```
================================================================================
CORA STANDARDS COMPLIANCE REPORT
================================================================================

Total Lambda Functions: 21
✅ Fully Compliant (7/7): 2
⚠️  Partially Compliant: 19
📊 Average CORA Score: 54.5%

--------------------------------------------------------------------------------
📦 MODULE: certification-module
   Lambdas: 5 | Avg Score: 63.0%
--------------------------------------------------------------------------------

✅ campaign-management
   Score: [██████████] 100.0%
   
   ✅ 1. org_common Response Format (100%)
   ✅ 2. Authentication & Authorization (100%)
   ✅ 3. Multi-tenancy (100%)
   ...
```

### Infrastructure Compliance Report

```
================================================================================
INFRASTRUCTURE COMPLIANCE REPORT
================================================================================

Total Checks: 5
✅ Passed: 4
❌ Failed: 1
📊 Overall Score: 80.0%

--------------------------------------------------------------------------------
❌ CORS Headers Alignment (HIGH)
   Score: [░░░░░░░░░░] 0%

   ❌ Lambda 'campaign-management' uses headers not in CORS allow_headers: x-org-id
   💡 Fix: Add missing headers to sts-career-infra/terraform/modules/api-gateway-http/main.tf cors_configuration.allow_headers

--------------------------------------------------------------------------------
✅ Payload Format Version Compatibility (HIGH)
   Score: [██████████] 100%
   
   ✓ Lambda 'campaign-management' uses v2.0 event format
   ✓ API Gateway integrations use payload format version 2.0
```

## Exit Codes

- **0**: All checks passed
- **1**: One or more checks failed

Useful for CI/CD pipelines:

```bash
python3 scripts/check-cora-compliance.py --infrastructure
if [ $? -ne 0 ]; then
  echo "Infrastructure validation failed!"
  exit 1
fi
```

## Real-World Example: CORS Headers Issue

### The Problem

After deploying certification module endpoints, all requests were failing with CORS errors:

```
Access to fetch at 'https://api.example.com/cert_campaign' from origin 'https://app.example.com' 
has been blocked by CORS policy: Request header field x-org-id is not allowed by 
Access-Control-Allow-Headers in preflight response.
```

### Investigation (took hours)

1. ✅ Checked database migrations (all applied)
2. ✅ Verified Lambda code returns CORS headers
3. ✅ Confirmed API Gateway routes exist
4. ✅ Verified Lambda permissions
5. ❌ **Root Cause**: `x-org-id` header missing from API Gateway CORS `allow_headers`

### The Fix

```terraform
# sts-career-infra/terraform/modules/api-gateway-http/main.tf
cors_configuration {
  allow_headers = [
    "content-type",
    "authorization",
    "x-amz-date",
    "x-api-key",
    "x-amz-security-token",
    "x-org-id"  # Added this!
  ]
}
```

### How the Enhanced Script Catches This

```bash
python3 scripts/check-cora-compliance.py --infrastructure
```

Output:

```
❌ CORS Headers Alignment (HIGH)
   ❌ Lambda 'campaign-management' uses headers not in CORS allow_headers: x-org-id
   💡 Fix: Add missing headers to sts-career-infra/terraform/modules/api-gateway-http/main.tf
```

**Result:** Would have caught the issue **instantly** instead of hours of debugging!

## CI/CD Integration

### GitHub Actions Example

```yaml
name: CORA Compliance Check

on: [push, pull_request]

jobs:
  cora-compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      
      - name: Install dependencies
        run: pip install boto3 supabase
      
      - name: Run standard CORA checks
        run: python3 scripts/check-cora-compliance.py
      
      - name: Run infrastructure checks
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: python3 scripts/check-cora-compliance.py --infrastructure
```

### Pre-deployment Check

Add to your deployment script:

```bash
#!/bin/bash
set -e

echo "Running CORA compliance checks..."
python3 scripts/check-cora-compliance.py --infrastructure

if [ $? -ne 0 ]; then
  echo "❌ Infrastructure validation failed!"
  echo "Fix the issues above before deploying."
  exit 1
fi

echo "✅ All checks passed! Proceeding with deployment..."
terraform apply
```

## Troubleshooting

### boto3 not found

```bash
pip install boto3
```

### AWS credentials not configured

```bash
# Option 1: Use AWS profile
export AWS_PROFILE=career-nonprod-tf

# Option 2: Use AWS credentials
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Supabase connection failed

```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Load from .env file
set -a
source .env.dev
set +a
```

### API Gateway ID not found

```bash
# Get API Gateway ID from AWS Console or CLI
aws apigatewayv2 get-apis --query 'Items[?Name==`career-dev-api`].ApiId' --output text

# Set environment variable
export API_GATEWAY_ID=imf2i0ntpg

# Or pass as argument
python3 scripts/check-cora-compliance.py --infrastructure --api-gateway-id YOUR_API_ID
```

## Next Steps

1. Run enhanced compliance check against all modules
2. Fix any detected issues
3. Add to GitHub Actions CI/CD workflow
4. Add to pre-deployment checklist
5. Document findings in CORA standards guide

## Related Documentation

- [CORA Standards Guide](../docs/standards/cora-standards.md)
- [API Gateway Configuration](../../sts-career-infra/terraform/modules/api-gateway-http/)
- [Database Migrations](../sql/migrations/)
- [Lambda Functions](../packages/)

## Support

For issues or questions:
- Check existing documentation
- Review error messages and suggested fixes
- Consult AWS and Supabase documentation
- Review Terraform configuration files
