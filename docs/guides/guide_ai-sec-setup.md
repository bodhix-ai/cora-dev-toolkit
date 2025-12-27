# AI-Sec Project Setup Guide

This guide covers setting up the ai-sec CORA project from scratch.

## Prerequisites

- Node.js 18+ and pnpm
- AWS CLI configured with credentials
- Terraform 1.5+
- Supabase account (or self-hosted)
- Clerk account (for authentication)
- GitHub CLI (`gh`) for creating remote repos

---

## AWS Profile Configuration (Security Best Practices)

### Recommended Approach: Dedicated Terraform Profile

**⚠️ IMPORTANT:** Do NOT use admin or SSO profiles for Terraform deployments in production or automated workflows.

#### 1. Create a Dedicated IAM Role for Terraform

Create a dedicated IAM role with minimal required permissions:

**Required Permissions:**

- S3: Read/write for artifacts and state buckets
- Lambda: Create/update functions and layers
- API Gateway: Create/update HTTP APIs and routes
- IAM: Limited role creation for Lambda execution
- CloudWatch Logs: Create/update log groups
- Secrets Manager: Read secrets for deployment

**Example IAM Policy (Least Privilege):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::ai-sec-lambda-artifacts/*",
        "arn:aws:s3:::ai-sec-terraform-state/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:CreateFunction",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:PublishLayerVersion",
        "lambda:GetFunction",
        "lambda:GetLayerVersion"
      ],
      "Resource": "arn:aws:lambda:*:*:function:ai-sec-*"
    },
    {
      "Effect": "Allow",
      "Action": ["apigateway:*"],
      "Resource": "arn:aws:apigateway:*::/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:GetRole",
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PassRole"
      ],
      "Resource": "arn:aws:iam::*:role/ai-sec-*"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:PutRetentionPolicy"],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/ai-sec-*"
    }
  ]
}
```

#### 2. Configure AWS Profile

Add to `~/.aws/config`:

```ini
[profile ai-sec-terraform]
role_arn = arn:aws:iam::YOUR_ACCOUNT_ID:role/terraform-deployer
source_profile = default
region = us-east-1
```

#### 3. Use Profile in Scripts

```bash
# Set before running any infrastructure scripts
export AWS_PROFILE=ai-sec-terraform

# Run bootstrap
./bootstrap/ensure-buckets.sh

# Build and deploy
./scripts/build-cora-modules.sh
./scripts/deploy-cora-modules.sh
./scripts/deploy-terraform.sh dev
```

### Development vs Production Profiles

| Environment    | Profile Type               | Use Case                       |
| -------------- | -------------------------- | ------------------------------ |
| **Local Dev**  | Named profile with MFA     | Manual testing and development |
| **CI/CD**      | OIDC role (GitHub Actions) | Automated deployments          |
| **Production** | Dedicated IAM role         | Terraform state management     |

### Why NOT to Use Admin Profiles

❌ **Security Risks:**

- Over-privileged access violates least-privilege principle
- If credentials leak, entire AWS account is compromised
- No audit trail for specific Terraform actions
- Cannot enforce MFA for automated deployments

✅ **Best Practice:**

- Create role-specific profiles for each tool (Terraform, CDK, etc.)
- Use temporary credentials with STS AssumeRole
- Enable CloudTrail logging for all deployments
- Rotate credentials regularly

---

## 1. Environment Variables Configuration

### 1.1 Create .env.local in apps/web

```bash
cd ~/code/sts/security/ai-sec-stack/apps/web
cp .env.example .env.local
```

### 1.2 Configure Required Variables

Edit `.env.local` with your values:

```env
# ======================
# CLERK AUTHENTICATION
# ======================
# Get these from https://dashboard.clerk.com
# Create a new Clerk application for ai-sec

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Clerk webhook secret (for user sync)
CLERK_WEBHOOK_SECRET=whsec_xxx

# ======================
# SUPABASE DATABASE
# ======================
# Create a new Supabase project at https://supabase.com
# or use self-hosted Supabase

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx  # For backend operations

# ======================
# API ENDPOINTS
# ======================
# These will be created after deploying infrastructure
# Leave empty initially, update after Terraform deploy

NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_CORA_API_URL=
NEXT_PUBLIC_WS_BASE_URL=
```

### 1.3 Configure Infrastructure Variables

```bash
cd ~/code/sts/security/ai-sec-infra/envs/dev
```

Edit `variables.tf` and create `terraform.tfvars`:

```hcl
# terraform.tfvars
project_name     = "ai-sec"
environment      = "dev"
aws_region       = "us-east-1"
github_org       = "keepitsts"

# Supabase
supabase_url     = "https://your-project.supabase.co"
supabase_key     = "your-service-role-key"

# Clerk
clerk_secret_key = "sk_test_xxx"
```

---

## 2. Build and Run Local Dev Server

### 2.1 Install Dependencies

```bash
cd ~/code/sts/security/ai-sec-stack

# Install all dependencies
pnpm install
```

### 2.2 Build Packages

```bash
# Build all packages (modules)
pnpm -r build
```

### 2.3 Run Development Server

```bash
cd apps/web
pnpm dev
```

Open http://localhost:3000

### 2.4 Troubleshooting Build Issues

If you see TypeScript errors:

```bash
# Check for type errors
pnpm -r typecheck

# Fix lint issues
pnpm -r lint --fix
```

Common issues:

- Missing dependencies: Check `package.json` in each module
- Import errors: Verify module paths in `tsconfig.json`
- Type mismatches: May need to update shared types

---

## 3. Create Database Tables

### 3.1 Apply Module Schemas (Production-Aligned)

> **Updated December 2025:** Schema files have been consolidated and verified against `pm-app-stack` production database.

Each module has its own database schema in `db/schema/`. Apply them in order:

```bash
# Connect to Supabase SQL Editor or use psql
# Get connection string from Supabase Dashboard > Settings > Database

# 1. module-access (Tier 1) - Apply first
# Creates: orgs, profiles, org_members tables with RLS policies
psql $SUPABASE_CONNECTION_STRING < packages/module-access/db/schema/001-orgs.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-access/db/schema/002-profiles.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-access/db/schema/003-org-members.sql

# 2. module-ai (Tier 2)
# Creates: ai_providers, ai_models tables with RLS policies
psql $SUPABASE_CONNECTION_STRING < packages/module-ai/db/schema/001-ai-providers.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-ai/db/schema/002-ai-models.sql
```

**Production Schema Summary:**
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `orgs` | id (UUID), name, slug, owner_id | Multi-tenant organizations |
| `profiles` | id (BIGINT), user_id (UUID), email, full_name, current_org_id | One per auth.users |
| `org_members` | org_id, user_id, role, added_by | Organization membership |
| `ai_providers` | name, provider_type, credentials_secret_path | Platform-level |
| `ai_models` | provider_id, model_id, capabilities, description, validation_category | Platform-level |

### 3.2 Apply Migrations (Optional)

If you need the module registry tables:

```bash
psql $SUPABASE_CONNECTION_STRING < packages/module-mgmt/db/migrations/001-platform-module-registry.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-mgmt/db/migrations/002-platform-module-usage.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-mgmt/db/migrations/003-platform-module-rls.sql
```

### 3.3 Using Supabase Dashboard

Alternatively, use the Supabase SQL Editor:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Paste and run each schema file in order

---

## 4. Run Validation Scripts

### 4.1 Structure Validation

```bash
cd ~/code/sts/security/ai-sec-stack

# Validate project structure
python ../../../policy/cora-dev-toolkit/validation/cora-validate.py \
  --mode project \
  --path .
```

### 4.2 Module Validation

```bash
# Validate individual modules
python ../../../policy/cora-dev-toolkit/validation/cora-validate.py \
  --mode module \
  --path packages/module-access

python ../../../policy/cora-dev-toolkit/validation/cora-validate.py \
  --mode module \
  --path packages/module-ai

python ../../../policy/cora-dev-toolkit/validation/cora-validate.py \
  --mode module \
  --path packages/module-mgmt
```

### 4.3 Portability Validation

```bash
# Check for hardcoded values
python ../../../policy/cora-dev-toolkit/validation/portability-validator/portability_validator.py \
  --path . \
  --project-name ai-sec
```

### 4.4 Full Validation Suite

```bash
# Run all validators
python ../../../policy/cora-dev-toolkit/validation/cora-validate.py \
  --mode project \
  --path . \
  --validators structure,portability \
  --format markdown \
  --output validation-report.md
```

---

## 5. Deploy Infrastructure

### 5.1 Bootstrap Terraform State

```bash
cd ~/code/sts/security/ai-sec-infra

# Create S3 bucket for Terraform state
./bootstrap/bootstrap_tf_state.sh
```

### 5.2 Deploy Infrastructure

```bash
# Initialize Terraform
cd envs/dev
terraform init

# Plan deployment
terraform plan -var-file=terraform.tfvars

# Apply
terraform apply -var-file=terraform.tfvars
```

### 5.3 Update API Endpoints

After Terraform completes, get the API Gateway URLs from outputs:

```bash
terraform output api_gateway_url
terraform output cora_api_url
terraform output websocket_url
```

Update your `.env.local` with these values.

---

## 6. Create GitHub Remote Repos

```bash
# Create private repos in keepitsts org
gh repo create keepitsts/ai-sec-infra --private --source ~/code/sts/security/ai-sec-infra --push
gh repo create keepitsts/ai-sec-stack --private --source ~/code/sts/security/ai-sec-stack --push
```

---

## Quick Reference

| Task           | Command                                           |
| -------------- | ------------------------------------------------- |
| Install deps   | `pnpm install`                                    |
| Run dev server | `cd apps/web && pnpm dev`                         |
| Build all      | `pnpm -r build`                                   |
| Type check     | `pnpm -r typecheck`                               |
| Lint           | `pnpm -r lint`                                    |
| Validate       | `python cora-validate.py --mode project --path .` |
| Deploy infra   | `cd envs/dev && terraform apply`                  |

---

## Troubleshooting

### "Module not found" errors

- Ensure pnpm-workspace.yaml includes all packages
- Run `pnpm install` in root directory

### Supabase connection errors

- Verify SUPABASE_URL and keys in .env.local
- Check RLS policies allow your user

### Clerk authentication not working

- Verify Clerk keys are correct
- Check Clerk dashboard for your application

### API Gateway 403 errors

- Verify authorizer Lambda is deployed
- Check API Gateway integration settings
