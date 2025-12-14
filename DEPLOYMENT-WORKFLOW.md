# CORA Project Automated Deployment Workflow

**Version:** 1.0  
**Date:** December 12, 2025  
**Status:** Production Ready

This document describes the fully automated deployment workflow for CORA projects using zip-based Lambda deployment.

---

## Overview

The CORA deployment workflow consists of three main phases:

1. **Project Creation** - Bootstrap new CORA project with core modules
2. **Build & Deploy** - Build Lambda zips and upload to S3
3. **Infrastructure Provisioning** - Deploy with Terraform

---

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform 1.2+ installed
- Python 3.11+ (for Lambda functions)
- Bash shell

---

## Phase 1: Project Creation

Create a new CORA project with core modules included:

```bash
cd cora-dev-toolkit

# Create new project with core modules
./scripts/create-cora-project.sh my-project --with-core-modules --org "My Organization"

# This creates:
# - my-project-infra/ (infrastructure repo)
# - my-project-stack/ (application repo with module-access, module-ai, module-mgmt)
```

### What Gets Created

**my-project-infra/**
- Bootstrap script for Terraform state
- Terraform modules (github-oidc-role, secrets, modular-api-gateway)
- Build/deploy scripts (zip-based)
- Backend configuration (pre-configured)
- Main.tf with CORA modules ready

**my-project-stack/**
- Next.js application shell
- Core modules: module-access, module-ai, module-mgmt
- Each module has backend/lambdas and backend/layers
- Build scripts for zip creation

---

## Phase 2: Configuration

### 2.1 Configure Secrets

Edit `my-project-infra/envs/dev/local-secrets.tfvars`:

```hcl
# Supabase Configuration
supabase_url              = "https://your-project.supabase.co"
supabase_anon_key_value   = "your-anon-key"
supabase_service_role_key_value = "your-service-role-key"
supabase_jwt_secret_value = "your-jwt-secret"

# Authentication Provider (Okta or Clerk)
auth_provider      = "okta"
okta_issuer        = "https://your-tenant.okta.com/oauth2/default"
okta_audience      = "api://default"

# Optional: Clerk
# auth_provider      = "clerk"
# clerk_jwt_issuer   = "https://your-clerk-domain.clerk.accounts.dev"
# clerk_jwt_audience = "your-audience"

# GitHub (for OIDC)
github_owner = "your-github-org"
github_repo  = "my-project-infra"
```

### 2.2 Bootstrap Terraform State

```bash
cd my-project-infra

# Bootstrap S3 backend (creates bucket and DynamoDB table)
AWS_PROFILE=your-profile ./bootstrap/bootstrap_tf_state.sh

# Output:
# ✓ Created S3 bucket: my-project-terraform-state-us-east-1
# ✓ Created DynamoDB table: my-project-terraform-locks
```

---

## Phase 3: Build & Deploy

### 3.1 Build Lambda Zips

```bash
cd my-project-infra/scripts

# Build all CORA modules (zip-based)
AWS_PROFILE=your-profile ./build-cora-modules.sh

# Output:
# Building module-access...
# Building module-ai...
# Building module-mgmt...
# ✓ Artifacts saved to: build/
```

**Build Directory Structure:**
```
build/
├── module-access/
│   ├── org-common-layer.zip
│   ├── identities-management.zip
│   ├── profiles.zip
│   ├── orgs.zip
│   ├── members.zip
│   └── idp-config.zip
├── module-ai/
│   ├── common-ai-layer.zip
│   ├── ai-config-handler.zip
│   └── provider.zip
└── module-mgmt/
    ├── lambda-mgmt-common-layer.zip
    └── lambda-mgmt.zip
```

### 3.2 Deploy to S3

```bash
# Upload zips to S3 (creates bucket if needed)
AWS_PROFILE=your-profile ./deploy-cora-modules.sh

# Output:
# ✓ Creating S3 bucket: my-project-lambda-artifacts
# Uploading module-access artifacts...
#   → layers/org-common-layer.zip
#   → lambdas/identities-management.zip
#   → lambdas/profiles.zip
#   ...
# ✓ Artifacts uploaded to: s3://my-project-lambda-artifacts
```

---

## Phase 4: Infrastructure Provisioning

### 4.1 Initialize Terraform

```bash
cd ../envs/dev

# Initialize Terraform (uses S3 backend created in Phase 2.2)
AWS_PROFILE=your-profile terraform init

# Output:
# Initializing the backend...
# Successfully configured the backend "s3"!
```

### 4.2 Plan Deployment

```bash
# Review infrastructure changes
AWS_PROFILE=your-profile terraform plan -var-file=local-secrets.tfvars

# Output shows:
# - Lambda functions (from S3 zips)
# - Lambda layers
# - API Gateway routes
# - Secrets Manager resources
# - IAM roles/policies
```

### 4.3 Apply Infrastructure

```bash
# Deploy infrastructure
AWS_PROFILE=your-profile terraform apply -var-file=local-secrets.tfvars

# Confirm with 'yes'

# Output:
# Apply complete! Resources: 45 added, 0 changed, 0 destroyed.
# 
# Outputs:
# modular_api_gateway_url = "https://abc123xyz.execute-api.us-east-1.amazonaws.com"
```

---

## Phase 5: Validation

### 5.1 Run API Tracer Validation

```bash
cd ../../../my-project-stack

# Validate API contracts (Frontend → Gateway → Lambda)
python ../cora-dev-toolkit/validation/api-tracer/cli.py \
  --path . \
  --output json

# Output:
# {
#   "status": "passed",
#   "summary": {
#     "frontend_calls": 42,
#     "gateway_routes": 38,
#     "lambda_handlers": 35,
#     "mismatches": 0
#   }
# }
```

### 5.2 Test Endpoints

```bash
# Get API Gateway URL from Terraform outputs
cd ../my-project-infra/envs/dev
API_URL=$(terraform output -raw modular_api_gateway_url)

# Test health endpoint
curl -X GET "${API_URL}/health"

# Test authenticated endpoint (requires JWT)
curl -X GET "${API_URL}/organizations" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Complete Automated Workflow

For a fully automated deployment (CI/CD):

```bash
#!/bin/bash
set -e

PROJECT_NAME="my-project"
AWS_PROFILE="your-profile"

# 1. Create project
cd cora-dev-toolkit
./scripts/create-cora-project.sh ${PROJECT_NAME} --with-core-modules

# 2. Configure secrets (in CI/CD, use environment variables)
cd ../${PROJECT_NAME}-infra/envs/dev
# ... copy secrets from secret store ...

# 3. Bootstrap Terraform state
cd ../../
AWS_PROFILE=${AWS_PROFILE} ./bootstrap/bootstrap_tf_state.sh

# 4. Build Lambda zips
cd scripts
AWS_PROFILE=${AWS_PROFILE} ./build-cora-modules.sh

# 5. Deploy to S3
AWS_PROFILE=${AWS_PROFILE} ./deploy-cora-modules.sh

# 6. Provision infrastructure
cd ../envs/dev
AWS_PROFILE=${AWS_PROFILE} terraform init
AWS_PROFILE=${AWS_PROFILE} terraform apply -var-file=local-secrets.tfvars -auto-approve

# 7. Validate deployment
cd ../../../${PROJECT_NAME}-stack
python ../cora-dev-toolkit/validation/api-tracer/cli.py --path . --output json

echo "✓ Deployment complete!"
```

---

## Key Improvements from Previous Workflow

**Before (Docker-based):**
- ❌ Slow builds (2-5 min per image)
- ❌ Cold starts (1-3s additional latency)
- ❌ Required Docker Desktop
- ❌ ECR authentication complexity
- ❌ Manual module configuration

**After (Zip-based):**
- ✅ Fast builds (10-30 sec total)
- ✅ Fast cold starts (~500ms)
- ✅ No Docker required
- ✅ Simple S3 upload
- ✅ Fully automated with templates

---

## Troubleshooting

### Build Issues

**Problem:** "No build.sh found for module-xxx"
- **Solution:** Ensure module has `backend/build.sh` script
- **Check:** `ls packages/module-*/backend/build.sh`

### Deploy Issues

**Problem:** "Build directory not found"
- **Solution:** Run `./build-cora-modules.sh` first

**Problem:** "Access Denied" when uploading to S3
- **Solution:** Check AWS credentials: `aws sts get-caller-identity --profile your-profile`

### Terraform Issues

**Problem:** "Backend initialization required"
- **Solution:** Run `terraform init` in envs/dev directory

**Problem:** "No such file" for Lambda zips
- **Solution:** Ensure `./deploy-cora-modules.sh` completed successfully
- **Check:** `aws s3 ls s3://your-project-lambda-artifacts/lambdas/`

---

## Reference

- [Module Build & Deployment Standardization Plan](docs/module-build-deployment-standardization-plan.md)
- [CORA Core Modules](docs/cora-core-modules.md)
- [API Tracer Validation](validation/api-tracer/README.md)

---

**Maintained by:** CORA Development Team  
**Last Updated:** December 12, 2025
