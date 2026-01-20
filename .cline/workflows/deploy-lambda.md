# Deploy Single Lambda Workflow

This workflow deploys a single Lambda function efficiently without running deploy-all.sh.

**Usage**: `/deploy-lambda.md <module-name>/<lambda-name>`

**Example**: `/deploy-lambda.md module-eval/eval-results`

---

## Architecture Overview

**CORA uses a two-repo pattern:**

- **Stack Repo** (`{project}-stack`): Original Lambda source code
  - Functional modules: `packages/module-{name}/backend/lambdas/{lambda-name}/`
  - Example: `packages/module-eval/backend/lambdas/eval-results/lambda_function.py`

- **Infra Repo** (`{project}-infra`): Build, deployment, and Terraform
  - Lambda build directories: `lambdas/module-{name}/{lambda-name}/`
  - Deployment script: `scripts/deploy-lambda.sh`
  - Terraform configs: `envs/{env}/`

**Important:** Lambda code must be synced from stack repo to infra repo before deployment.

---

## Step 1: Sync Lambda Code to Infra Repo

The Lambda source is in the stack repo, but must be copied to infra repo for deployment:

```bash
# Get project paths from memory-bank/activeContext.md
STACK_PATH="<stack-repo-path>"
INFRA_PATH="<infra-repo-path>"
MODULE="<module-name>"
LAMBDA="<lambda-name>"

# Option A: Use sync script (recommended)
cd /path/to/cora-dev-toolkit
./scripts/sync-fix-to-project.sh ${STACK_PATH} "${MODULE}/backend/lambdas/${LAMBDA}/lambda_function.py"

# Option B: Manual copy (for reference)
cp ${STACK_PATH}/packages/${MODULE}/backend/lambdas/${LAMBDA}/lambda_function.py \
   ${INFRA_PATH}/lambdas/${MODULE}/${LAMBDA}/lambda_function.py
```

**Note:** This step is usually done by `fix-and-sync.md` workflow.

---

## Step 2: Deploy Lambda

Use the deployment script from the infra repo:

```bash
# Get infra project path from memory-bank/activeContext.md
INFRA_PATH="<infra-repo-path>"

cd ${INFRA_PATH}

# Deploy the specific Lambda
# Format: module-name/lambda-name (e.g., module-eval/eval-results)
./scripts/deploy-lambda.sh ${MODULE}/${LAMBDA}

# Special case: authorizer Lambda
./scripts/deploy-lambda.sh authorizer
```

**What deploy-lambda.sh does:**
1. **Runs build.sh** - Packages Lambda with dependencies into zip
2. **Uploads to S3** - Stores zip in Lambda artifacts bucket
3. **Runs Terraform** - Updates Lambda via Terraform (detects code changes via source_code_hash)

**Options:**
- `--skip-build` - Use existing zip (faster if only redeploying)
- `--skip-upload` - Use existing S3 artifact
- `--auto-approve` - Skip Terraform confirmation prompt
- `--env stg` - Deploy to staging instead of dev
- `--list` - Show all available Lambdas

**Example with options:**
```bash
# Build and deploy (full process)
./scripts/deploy-lambda.sh module-eval/eval-results

# Redeploy existing build (faster)
./scripts/deploy-lambda.sh module-eval/eval-results --skip-build

# Auto-approve (for CI/CD)
./scripts/deploy-lambda.sh module-eval/eval-results --auto-approve
```

---

## Step 3: Verify Deployment

Check the Lambda was deployed successfully:

```bash
# Get Lambda function name from Terraform output
# Format: {project}-{env}-{module}-{lambda}
FUNCTION_NAME="${PROJECT}-dev-${MODULE/module-/}-${LAMBDA}"

# Verify deployment
aws lambda get-function-configuration \
  --function-name ${FUNCTION_NAME} \
  --region us-east-1 \
  --profile <aws-profile> \
  --query '[FunctionName,LastModified,Runtime,CodeSize]' \
  --output table
```

---

## Step 4: Monitor Logs (Optional)

Watch CloudWatch logs to verify the Lambda is working:

```bash
# Tail logs for the Lambda
aws logs tail /aws/lambda/${FUNCTION_NAME} \
  --follow \
  --since 5m \
  --region us-east-1 \
  --profile <aws-profile>
```

---

## Step 5: Notify User

Tell the user:
- "✅ Lambda deployed: `{module}/{lambda}`"
- "Function name: `{function-name}`"
- "Test the API endpoint to verify the fix"
- "Logs available at: `/aws/lambda/{function-name}`"

---

## Common Lambda Deployments

### Functional Module Lambdas

| Module | Lambda | Command |
|--------|--------|---------|
| module-eval | eval-results | `./scripts/deploy-lambda.sh module-eval/eval-results` |
| module-eval | eval-processor | `./scripts/deploy-lambda.sh module-eval/eval-processor` |
| module-kb | kb-docs | `./scripts/deploy-lambda.sh module-kb/kb-docs` |
| module-kb | kb-query | `./scripts/deploy-lambda.sh module-kb/kb-query` |
| module-chat | chat-handler | `./scripts/deploy-lambda.sh module-chat/chat-handler` |
| module-ws | ws-management | `./scripts/deploy-lambda.sh module-ws/ws-management` |

### Core Module Lambdas

| Module | Lambda | Command |
|--------|--------|---------|
| module-access | orgs | `./scripts/deploy-lambda.sh module-access/orgs` |
| module-access | invites | `./scripts/deploy-lambda.sh module-access/invites` |
| module-access | authorizer | `./scripts/deploy-lambda.sh authorizer` (special case) |

---

## Troubleshooting

### Error: "Lambda not found"

**Cause:** Lambda doesn't exist in stack repo or wrong path

**Solution:**
```bash
# Find the Lambda in stack repo
find ${STACK_PATH} -name "lambda_function.py" -path "*/${MODULE}/*"
```

### Error: "deploy-lambda.sh not found"

**Cause:** Running from wrong directory

**Solution:**
```bash
# Always run from infra repo root
cd ${INFRA_PATH}
pwd  # Should show: .../ai-sec-infra
```

### Error: "Terraform state locked"

**Cause:** Another deployment is in progress

**Solution:**
```bash
# Wait for other deployment to finish, or force unlock (dangerous!)
cd ${INFRA_PATH}
terraform force-unlock <lock-id>
```

---

## When to Use This Workflow

✅ **Use deploy-lambda.md when:**
- You fixed a bug in a single Lambda
- You're testing changes to one Lambda
- You want fast deployment (seconds, not minutes)

❌ **Don't use deploy-lambda.md when:**
- Multiple Lambdas changed (use `deploy-all.sh`)
- Infrastructure changed (Terraform configs)
- First deployment after project creation (use `deploy-all.sh`)

---

## Related Workflows

- **fix-and-sync.md** - Fix template and sync to test project (includes deployment)
- **fix-backend.md** - Backend-specific fixes with deployment
- **validate-backend.md** - Validate Lambda code before deployment
