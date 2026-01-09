# CORA Standard: Lambda Deployment and Code Change Detection

**Version:** 1.0  
**Status:** Active  
**Last Updated:** January 9, 2026  
**Related ADRs:** None  
**Related Standards:** [MODULE-INTEGRATION](standard_module-integration-spec.md)

---

## Table of Contents

1. [Overview](#overview)
2. [The Problem](#the-problem)
3. [Correct Pattern](#correct-pattern)
4. [Anti-Patterns](#anti-patterns)
5. [Implementation Guide](#implementation-guide)
6. [Validation Checklist](#validation-checklist)
7. [Testing Procedures](#testing-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This standard defines the **correct Terraform patterns for Lambda deployment** in CORA modules to ensure code changes are properly detected and deployed.

### Why This Standard Exists

During module-ws development (January 2026), we discovered that Lambda functions were not updating when code changed, causing significant testing delays (2-8 hours per module). The root cause was an incorrect Terraform `lifecycle` configuration that prevented Terraform from detecting code changes.

**This standard prevents that issue from recurring.**

### Goals

1. **Reliable Deployments**: Lambda code updates when changed
2. **Zero-Downtime**: Blue-green deployment pattern
3. **Correct Versioning**: Source code hash tracks actual code changes
4. **Layer Compatibility**: Proper handling of layer updates

---

## The Problem

### Problematic Pattern (DO NOT USE)

```hcl
resource "aws_lambda_function" "my_function" {
  filename = var.lambda_zip
  # ... other config ...
  
  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash  # ❌ BLOCKS code change detection!
    ]
  }
}
```

### Impact of This Anti-Pattern

**What happens:**
1. Developer rebuilds Lambda code with changes
2. Developer runs `terraform apply`
3. Terraform sees `ignore_changes = [source_code_hash]`
4. Terraform skips updating the Lambda function
5. **Old code remains deployed** despite rebuild
6. Testing fails with stale code
7. Developer spends hours debugging "functional" issues that are actually deployment issues

**Real cost:** 2-8 hours of wasted development time per module.

### Why This Pattern Existed

The `ignore_changes` pattern may have been used to:
- Avoid "unnecessary" updates when layers change
- Prevent Terraform from detecting manual deployments
- Workaround for perceived Terraform issues

**However, these reasons are incorrect:**
- Layer updates **should** trigger Lambda updates (to reference new layer version)
- Manual deployments create drift and should be avoided
- The "issues" were actually proper Terraform behavior

---

## Correct Pattern

### ✅ Standard Lambda Configuration

```hcl
resource "aws_lambda_function" "my_function" {
  function_name    = "${local.name_prefix}-my-function"
  filename         = var.lambda_zip
  source_code_hash = filebase64sha256(var.lambda_zip)  # ✅ Detects changes
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"  # MUST match layer Python version
  role             = aws_iam_role.lambda.arn

  layers = [var.org_common_layer_arn]

  environment {
    variables = {
      ENVIRONMENT         = var.environment
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      LOG_LEVEL           = var.log_level
    }
  }

  timeout     = var.lambda_timeout
  memory_size = var.lambda_memory_size

  tags = local.default_tags

  lifecycle {
    create_before_destroy = true  # ✅ Blue-green deployment
  }
}
```

### Key Elements

#### 1. `source_code_hash` (REQUIRED)

```hcl
source_code_hash = filebase64sha256(var.lambda_zip)
```

**Purpose:** Terraform uses this hash to detect when code has changed.

**How it works:**
1. You rebuild Lambda → ZIP file content changes → Hash changes
2. Terraform detects hash change → Triggers Lambda update
3. New code deployed ✅

**Without this:** Terraform cannot detect code changes reliably.

#### 2. `create_before_destroy` (RECOMMENDED)

```hcl
lifecycle {
  create_before_destroy = true
}
```

**Purpose:** Blue-green deployment pattern for zero-downtime updates.

**How it works:**
1. Terraform creates new Lambda version with new code
2. API Gateway switches to new version
3. Terraform deletes old version
4. No downtime during deployment ✅

**Alternative:** Omit this block if you don't need zero-downtime (rare).

#### 3. Python Runtime Version (CRITICAL)

```hcl
runtime = "python3.11"  # MUST match org_common layer
```

**Purpose:** Binary compatibility with Lambda layers.

**CRITICAL RULE:** Lambda runtime MUST match the Python version used to build the `org_common` layer.

**Current standard:** `python3.11` (as of January 2026)

**Symptom if wrong:** `ImportModuleError: No module named 'pydantic_core._pydantic_core'`

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Using `ignore_changes` on `source_code_hash`

```hcl
lifecycle {
  ignore_changes = [source_code_hash]  # ❌ NEVER do this
}
```

**Why it's wrong:** Prevents code updates entirely.

**When you might think you need it:** Never. There is no valid use case.

---

### ❌ Anti-Pattern 2: Omitting `source_code_hash`

```hcl
resource "aws_lambda_function" "my_function" {
  filename = var.lambda_zip
  # Missing: source_code_hash
}
```

**Why it's wrong:** Terraform may not reliably detect code changes.

**Fix:** Always include `source_code_hash = filebase64sha256(var.lambda_zip)`

---

### ❌ Anti-Pattern 3: Hardcoding the hash

```hcl
source_code_hash = "abc123..."  # ❌ Static hash
```

**Why it's wrong:** Hash never changes, so updates never happen.

**Fix:** Use `filebase64sha256(var.lambda_zip)` to compute hash dynamically.

---

### ❌ Anti-Pattern 4: Mismatched Python runtime

```hcl
runtime = "python3.13"  # ❌ Doesn't match org_common layer (3.11)
```

**Why it's wrong:** Binary incompatibility with layers causes import errors.

**Fix:** Use `python3.11` (or whatever version the org_common layer uses).

---

## Implementation Guide

### For New Modules

When creating a new module from template:

1. **Template already correct** ✅
   - As of January 2026, `templates/_module-template/infrastructure/main.tf` has the correct pattern
   - No changes needed when using `create-cora-module.sh`

2. **Verify after scaffolding:**
   ```bash
   cd packages/{module}/infrastructure
   grep -A 5 "aws_lambda_function" main.tf
   ```

3. **Check for:**
   - ✅ `source_code_hash = filebase64sha256(...)`
   - ✅ `lifecycle { create_before_destroy = true }`
   - ❌ NO `ignore_changes` blocks

### For Existing Modules (Retrofit)

If you have existing modules with the problematic pattern:

#### Step 1: Identify problematic Lambdas

```bash
cd packages/{module}/infrastructure
grep -B 5 -A 10 "ignore_changes" main.tf
```

Look for any Lambda resources with `ignore_changes = [source_code_hash]` or `ignore_changes = [filename]`.

#### Step 2: Update Terraform configuration

For each problematic Lambda:

**Remove:**
```hcl
lifecycle {
  ignore_changes = [
    filename,
    source_code_hash
  ]
}
```

**Add:**
```hcl
source_code_hash = filebase64sha256(var.{lambda_name}_zip)

lifecycle {
  create_before_destroy = true
}
```

#### Step 3: Plan and apply

```bash
cd {project}-infra/envs/dev
terraform plan -var-file=local-secrets.tfvars
```

**Expected output:** Terraform will show an update to the Lambda function(s).

**If you see:** `source_code_hash` changing from `null` or a static value to a computed hash.

```bash
terraform apply -var-file=local-secrets.tfvars
```

#### Step 4: Test code change detection

1. Make a trivial change to Lambda code (e.g., add a comment)
2. Rebuild Lambda: `cd packages/{module}/backend/lambdas/{name} && ./build.sh`
3. Run Terraform plan again
4. **Verify:** Terraform detects the change and wants to update the Lambda

If Terraform does NOT detect the change, the fix was not applied correctly.

---

## Validation Checklist

Use this checklist for all new and existing Lambda functions:

### Per-Lambda Checklist

For each Lambda function in `infrastructure/main.tf`:

- [ ] **Has `source_code_hash`:** `source_code_hash = filebase64sha256(var.{name}_zip)`
- [ ] **Hash is dynamic:** Uses `filebase64sha256()`, not a static string
- [ ] **Has `create_before_destroy`:** `lifecycle { create_before_destroy = true }`
- [ ] **NO `ignore_changes` on code:** No `ignore_changes = [source_code_hash]` or `[filename]`
- [ ] **Runtime matches layer:** `runtime = "python3.11"` (or current standard)
- [ ] **Has layer attached:** `layers = [var.org_common_layer_arn]`

### Module-Level Checklist

- [ ] **All Lambdas validated:** Every Lambda in module passes per-Lambda checklist
- [ ] **Variables defined:** All `{name}_lambda_zip` variables exist in `variables.tf`
- [ ] **Build scripts exist:** Each Lambda has `build.sh` script
- [ ] **Infrastructure README updated:** Documents Lambda deployment pattern

---

## Testing Procedures

### Test 1: Code Change Detection

**Purpose:** Verify Terraform detects Lambda code changes.

**Steps:**

1. **Baseline deployment:**
   ```bash
   cd {project}-infra/envs/dev
   terraform apply -var-file=local-secrets.tfvars
   ```
   Wait for completion.

2. **Make trivial code change:**
   ```bash
   cd {project}-stack/packages/{module}/backend/lambdas/{name}
   # Add a comment to lambda_function.py
   echo "# Test change" >> lambda_function.py
   ```

3. **Rebuild Lambda:**
   ```bash
   ./build.sh
   ```

4. **Check Terraform detects change:**
   ```bash
   cd {project}-infra/envs/dev
   terraform plan -var-file=local-secrets.tfvars
   ```

5. **Expected output:**
   ```
   # aws_lambda_function.{name} will be updated in-place
   ~ resource "aws_lambda_function" "{name}" {
       ~ source_code_hash = "abc123..." -> "def456..."
       # ... other fields unchanged
     }
   
   Plan: 0 to add, 1 to change, 0 to destroy.
   ```

6. **✅ PASS if:** Terraform shows Lambda will be updated due to `source_code_hash` change
7. **❌ FAIL if:** Terraform shows "No changes" or doesn't detect the code change

### Test 2: Functional Code Update

**Purpose:** Verify new code actually runs after deployment.

**Steps:**

1. **Add a log message to Lambda:**
   ```python
   def lambda_handler(event, context):
       print("DEPLOYMENT TEST: Code version 2.0")  # Add this line
       # ... rest of handler
   ```

2. **Rebuild and deploy:**
   ```bash
   cd {project}-stack/packages/{module}/backend/lambdas/{name}
   ./build.sh
   
   cd {project}-infra/envs/dev
   terraform apply -var-file=local-secrets.tfvars
   ```

3. **Invoke Lambda (via API or direct):**
   ```bash
   # Via API
   curl -H "Authorization: Bearer $TOKEN" \
     "https://api.{domain}/api/{module}/{endpoint}?orgId={uuid}"
   
   # Or direct invoke
   aws lambda invoke --function-name {env}-{project}-{name} output.json
   ```

4. **Check CloudWatch Logs:**
   ```bash
   aws logs tail /aws/lambda/{env}-{project}-{name} --since 5m
   ```

5. **✅ PASS if:** Log message "DEPLOYMENT TEST: Code version 2.0" appears in logs
6. **❌ FAIL if:** Old log messages or no new messages (old code still running)

### Test 3: Layer Update Handling

**Purpose:** Verify Lambda updates when layer changes (expected behavior).

**Steps:**

1. **Check current layer version:**
   ```bash
   aws lambda get-function-configuration \
     --function-name {env}-{project}-{name} \
     --query 'Layers[0].Arn'
   ```
   Note the version number (e.g., `:1`).

2. **Update org_common layer** (simulate by updating a dependency)

3. **Redeploy infrastructure:**
   ```bash
   terraform apply -var-file=local-secrets.tfvars
   ```

4. **Expected:** Terraform updates Lambda to reference new layer version

5. **✅ PASS if:** Lambda references new layer version after apply
6. **❌ FAIL if:** Lambda still references old layer version

**Note:** Layer updates triggering Lambda updates is **correct behavior**, not a bug. The Lambda needs to update its layer reference.

---

## Troubleshooting

### Issue 1: Terraform doesn't detect code changes

**Symptoms:**
- You rebuild Lambda ZIP
- Run `terraform plan`
- Terraform shows "No changes"

**Diagnosis:**

Check if `source_code_hash` is present:
```bash
grep "source_code_hash" infrastructure/main.tf
```

**Fixes:**

1. **If missing:** Add `source_code_hash = filebase64sha256(var.{name}_zip)`
2. **If static:** Change from static string to `filebase64sha256(...)`
3. **If using `ignore_changes`:** Remove the `ignore_changes` block entirely

---

### Issue 2: Code changes detected but new code doesn't run

**Symptoms:**
- Terraform shows Lambda updating
- Apply succeeds
- But old code still runs when invoked

**Diagnosis:**

Check Lambda permissions:
```bash
aws lambda get-policy --function-name {env}-{project}-{name}
```

Verify API Gateway has permission to invoke the Lambda.

**Fix:**

Add Lambda permission in Terraform:
```hcl
resource "aws_lambda_permission" "apigw" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.{name}.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}
```

**Alternatively:** Try a full `terraform apply` (not targeted):
```bash
# Don't use -target
terraform apply -var-file=local-secrets.tfvars
```

This ensures all related resources (permissions, routes) are updated.

---

### Issue 3: Import errors after Lambda update

**Symptoms:**
- Lambda updates successfully
- But crashes with: `ImportModuleError: No module named 'pydantic_core._pydantic_core'`

**Diagnosis:**

Check Python runtime version:
```bash
aws lambda get-function-configuration \
  --function-name {env}-{project}-{name} \
  --query 'Runtime'
```

Check org_common layer Python version:
```bash
# In layer build directory
cat bootstrap  # Or check build script
```

**Fix:**

Update Lambda runtime to match layer:
```hcl
resource "aws_lambda_function" "{name}" {
  runtime = "python3.11"  # Must match layer
  # ...
}
```

Then redeploy:
```bash
terraform apply -var-file=local-secrets.tfvars
```

---

### Issue 4: Every deployment updates many Lambdas

**Symptoms:**
- You change one Lambda's code
- Terraform wants to update 5-10 Lambdas

**Diagnosis:**

Check if layer version changed:
```bash
terraform plan | grep "org_common_layer"
```

If the org_common layer version changed, all dependent Lambdas will update.

**Expected behavior:** This is **correct**. Lambdas must update to reference the new layer version.

**Optimization (future):** Make layer builds conditional on dependency changes:
```bash
# Only rebuild layer if requirements.txt changed
if [ requirements.txt -nt layer.zip ]; then
  ./build-layer.sh
fi
```

This is not a bug, but can be optimized in future iterations.

---

## Related Documentation

- [MODULE-INTEGRATION Standard](standard_module-integration-spec.md) - Full module integration patterns
- [Module Development Process Guide](../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md) - Complete development workflow
- [Module Build and Deployment Requirements](../guides/guide_MODULE-BUILD-AND-DEPLOYMENT-REQUIREMENTS.md) - Build script patterns

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-09 | CORA Team | Initial standard based on module-ws lessons learned |

---

**Document Status:** ✅ Active  
**Review Cycle:** Quarterly  
**Next Review:** April 2026