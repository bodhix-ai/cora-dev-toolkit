# Deploy Single Lambda Workflow

This workflow deploys a single Lambda function from a CORA functional module.

**Usage**: `/deploy-lambda.md <module-name>/<lambda-name>`

**Example**: `/deploy-lambda.md module-eval/eval-processor`

---

## Architecture Overview

**CORA uses a two-repo pattern with different deployment strategies:**

### Stack Repo (`{project}-stack`)
- **Contains:** Lambda source code and build scripts
- **Functional modules:** `packages/module-{name}/backend/`
  - Lambda source: `lambdas/{lambda-name}/lambda_function.py`
  - Build script: `build.sh` (builds ALL Lambdas in the module)
  - Build output: `.build/{lambda-name}.zip`

### Infra Repo (`{project}-infra`)
- **Contains:** Build artifacts, Terraform configs, deployment scripts
- **Build artifacts:** `build/module-{name}/*.zip` (copied from stack repo)
- **Terraform:** `envs/{env}/main.tf` (references zips from build/)
- **Deployment:** `scripts/deploy-terraform.sh` (full Terraform deployment)

---

## CRITICAL: Two Different Deployment Patterns

### Pattern 1: Functional Module Lambdas (module-eval, module-kb, module-chat, etc.)
✅ **Use this workflow for functional module Lambdas**

**Characteristics:**
- Source in stack repo: `packages/module-{name}/backend/lambdas/`
- Build in stack repo: `packages/module-{name}/backend/build.sh`
- Deploy via Terraform modules: `deploy-terraform.sh`

### Pattern 2: Infrastructure Lambdas (authorizer only)
❌ **NOT covered by this workflow**

**Characteristics:**
- Source in infra repo: `lambdas/api-gateway-authorizer/`
- Build in infra repo: `lambdas/api-gateway-authorizer/build.sh`
- Deploy via script: `scripts/deploy-lambda.sh authorizer`

---

## Step-by-Step: Deploy Functional Module Lambda

### Step 1: Sync Lambda Code to Stack Repo

The Lambda source code must be in the stack repo (this is where it lives):

```bash
# Get project paths from memory-bank/activeContext.md
STACK_PATH="<stack-repo-path>"  # e.g., ~/code/bodhix/testing/test-optim/ai-sec-stack
MODULE="<module-name>"           # e.g., module-eval
LAMBDA="<lambda-name>"           # e.g., eval-processor

# Sync from template to stack repo using toolkit script
cd /path/to/cora-dev-toolkit
./scripts/sync-fix-to-project.sh ${STACK_PATH} "${MODULE}/backend/lambdas/${LAMBDA}/lambda_function.py"

# This copies:
# FROM: templates/_modules-functional/${MODULE}/backend/lambdas/${LAMBDA}/lambda_function.py
# TO:   ${STACK_PATH}/packages/${MODULE}/backend/lambdas/${LAMBDA}/lambda_function.py
```

**Note:** This step is usually done by `fix-and-sync.md` workflow.

---

### Step 2: Build Lambda in Stack Repo

Functional modules use a module-level build script that builds ALL Lambdas in that module:

```bash
cd ${STACK_PATH}/packages/${MODULE}/backend

# Build ALL Lambdas in this module
bash build.sh

# This creates zips in: .build/{lambda-name}.zip
# Example outputs:
#   .build/eval-config.zip
#   .build/eval-processor.zip
#   .build/eval-results.zip
```

**Important:** You CANNOT build individual Lambdas. The build.sh script builds all Lambdas in the module.

---

### Step 3: Copy Build Artifacts to Infra Repo

After building, copy the zips to the infra repo's build directory:

```bash
INFRA_PATH="<infra-repo-path>"  # e.g., ~/code/bodhix/testing/test-optim/ai-sec-infra

# Copy ALL built zips to infra build directory
cp ${STACK_PATH}/packages/${MODULE}/backend/.build/*.zip \
   ${INFRA_PATH}/build/${MODULE}/

# Verify the copy
ls -lh ${INFRA_PATH}/build/${MODULE}/
```

**Why this step?** Terraform in the infra repo references these zips via relative paths.

---

### Step 4: Deploy via Terraform

Deploy the Lambda using the full Terraform deployment script:

```bash
cd ${INFRA_PATH}

# Full Terraform deployment (deploys ALL resources, but only updates changed Lambdas)
./scripts/deploy-terraform.sh dev

# Terraform will detect the changed source_code_hash and update only the modified Lambdas
```

**Why not a single Lambda script?** Functional module Lambdas are defined as Terraform modules, not individual Lambda resources. The `deploy-lambda.sh` script doesn't support this architecture.

**What Terraform does:**
1. Detects changed Lambda zips via `source_code_hash`
2. Uploads new version to Lambda
3. Updates the `live` alias to point to the new version
4. Zero-downtime blue-green deployment

---

### Step 5: Verify Deployment

Check the Lambda was deployed successfully:

```bash
# Get Lambda function name from Terraform
# Format: {project}-{env}-{module-without-prefix}-{lambda}
# Example: ai-sec-dev-eval-eval-processor
FUNCTION_NAME="${PROJECT}-dev-${MODULE#module-}-${LAMBDA}"

# Verify deployment
aws lambda get-function-configuration \
  --function-name ${FUNCTION_NAME} \
  --region us-east-1 \
  --profile <aws-profile> \
  --query '[FunctionName,LastModified,Runtime,CodeSize,Version]' \
  --output table

# Check the alias points to the new version
aws lambda get-alias \
  --function-name ${FUNCTION_NAME} \
  --name live \
  --region us-east-1 \
  --profile <aws-profile>
```

---

### Step 6: Monitor Logs

Watch CloudWatch logs to verify the Lambda is working:

```bash
# Tail logs for the Lambda
aws logs tail /aws/lambda/${FUNCTION_NAME} \
  --follow \
  --since 5m \
  --region us-east-1 \
  --profile <aws-profile>

# Or without --follow to just see recent logs
aws logs tail /aws/lambda/${FUNCTION_NAME} \
  --since 10m \
  --region us-east-1 \
  --profile <aws-profile> | tail -100
```

---

### Step 7: Notify User

Tell the user:
- "✅ Lambda deployed: `{module}/{lambda}`"
- "Function name: `{function-name}`"
- "Test the API endpoint to verify the fix"
- "Logs: `aws logs tail /aws/lambda/{function-name} --since 10m --region us-east-1 --profile {profile}`"

---

## Complete Example: Deploy module-eval/eval-processor

```bash
# Variables
TOOLKIT_PATH="/path/to/cora-dev-toolkit"
STACK_PATH="~/code/bodhix/testing/test-optim/ai-sec-stack"
INFRA_PATH="~/code/bodhix/testing/test-optim/ai-sec-infra"
MODULE="module-eval"
LAMBDA="eval-processor"
PROJECT="ai-sec"

# Step 1: Sync code to stack repo
cd ${TOOLKIT_PATH}
./scripts/sync-fix-to-project.sh ${STACK_PATH} "${MODULE}/backend/lambdas/${LAMBDA}/lambda_function.py"

# Step 2: Build ALL Lambdas in module
cd ${STACK_PATH}/packages/${MODULE}/backend
bash build.sh

# Step 3: Copy zips to infra
cp .build/*.zip ${INFRA_PATH}/build/${MODULE}/
ls -lh ${INFRA_PATH}/build/${MODULE}/

# Step 4: Deploy via Terraform
cd ${INFRA_PATH}
./scripts/deploy-terraform.sh dev

# Step 5: Verify
aws lambda get-function-configuration \
  --function-name ai-sec-dev-eval-eval-processor \
  --region us-east-1 \
  --profile ai-sec-nonprod \
  --query '[FunctionName,LastModified,Version]'

# Step 6: Check logs
aws logs tail /aws/lambda/ai-sec-dev-eval-eval-processor \
  --since 5m \
  --region us-east-1 \
  --profile ai-sec-nonprod
```

---

## Common Functional Module Lambdas

| Module | Lambda | Build Command | Function Name |
|--------|--------|---------------|---------------|
| module-eval | eval-config | `cd packages/module-eval/backend && bash build.sh` | `{project}-dev-eval-eval-config` |
| module-eval | eval-processor | `cd packages/module-eval/backend && bash build.sh` | `{project}-dev-eval-eval-processor` |
| module-eval | eval-results | `cd packages/module-eval/backend && bash build.sh` | `{project}-dev-eval-eval-results` |
| module-kb | kb-docs | `cd packages/module-kb/backend && bash build.sh` | `{project}-dev-kb-kb-docs` |
| module-kb | kb-query | `cd packages/module-kb/backend && bash build.sh` | `{project}-dev-kb-kb-query` |
| module-chat | chat-handler | `cd packages/module-chat/backend && bash build.sh` | `{project}-dev-chat-chat-handler` |
| module-ws | workspace | `cd packages/module-ws/backend && bash build.sh` | `{project}-dev-ws-workspace` |

**Note:** Build command builds ALL Lambdas in the module, not just one.

---

## Troubleshooting

### Error: "Lambda not found in stack repo"

**Cause:** Lambda doesn't exist or wrong path

**Solution:**
```bash
# Find the Lambda in stack repo
find ${STACK_PATH} -name "lambda_function.py" -path "*/${MODULE}/*"
```

### Error: "build.sh not found"

**Cause:** Running from wrong directory

**Solution:**
```bash
# Build script is at MODULE level, not Lambda level
cd ${STACK_PATH}/packages/${MODULE}/backend
pwd  # Should show: .../packages/module-eval/backend
```

### Error: "Terraform state locked"

**Cause:** Another deployment is in progress

**Solution:**
```bash
# Wait for other deployment to finish, or force unlock (use with caution!)
cd ${INFRA_PATH}/envs/dev
terraform force-unlock <lock-id>
```

### Error: "Lambda didn't update after deployment"

**Cause:** Zip file wasn't copied to infra repo or Terraform didn't detect the change

**Solution:**
```bash
# 1. Verify zip exists in infra build directory
ls -lh ${INFRA_PATH}/build/${MODULE}/${LAMBDA}.zip

# 2. Check the zip's timestamp (should be recent)
stat ${INFRA_PATH}/build/${MODULE}/${LAMBDA}.zip

# 3. Force Terraform to update by tainting the resource
cd ${INFRA_PATH}/envs/dev
terraform taint module.${MODULE//-/_}.aws_lambda_function.${LAMBDA//-/_}
terraform apply -var-file=local-secrets.tfvars
```

---

## When to Use This Workflow

✅ **Use this workflow for:**
- Functional module Lambdas (module-eval, module-kb, module-chat, module-ws, etc.)
- After fixing a bug in a single Lambda
- Testing changes to one Lambda

❌ **Don't use this workflow for:**
- Infrastructure Lambdas (authorizer) - use `deploy-lambda.sh authorizer` instead
- First deployment after project creation - use `deploy-all.sh`
- Multiple module changes - use `deploy-all.sh` for full rebuild

---

## Key Differences from Infrastructure Lambdas

| Aspect | Functional Module Lambdas | Infrastructure Lambdas |
|--------|---------------------------|------------------------|
| Source Location | Stack repo: `packages/module-{name}/backend/` | Infra repo: `lambdas/api-gateway-authorizer/` |
| Build Location | Stack repo (module-level build.sh) | Infra repo (Lambda-level build.sh) |
| Build Scope | Builds ALL Lambdas in module | Builds single Lambda |
| Build Output | `.build/*.zip` (multiple zips) | `./function.zip` (single zip) |
| Deployment Method | `deploy-terraform.sh` (full Terraform) | `deploy-lambda.sh` (targeted script) |
| Terraform Structure | Terraform module per functional module | Individual Lambda resources |

---

## Related Workflows

- **fix-and-sync.md** - Fix template, sync to test project, build, and deploy (full workflow)
- **fix-backend.md** - Backend-specific fixes with deployment guidance
- **validate-backend.md** - Validate Lambda code before deployment
- **deploy-all.sh** - Full deployment of all modules (use when multiple modules changed)
