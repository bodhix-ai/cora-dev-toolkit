# OIDC Provider Multi-Environment Implementation Plan

**Created:** December 23, 2025  
**Status:** Ready for Implementation  
**Complexity:** Medium  
**Estimated Time:** 4-6 hours

---

## Executive Summary

This plan implements a proper multi-environment OIDC provider architecture that:
- Creates ONE OIDC provider per AWS account (not per environment)
- Automatically detects existing OIDC providers
- Supports 4 environments across 2 AWS accounts
- Eliminates "EntityAlreadyExists" errors
- Requires no manual imports or quick fixes

---

## Current State

### Problem
- OIDC provider creation fails with `EntityAlreadyExists` error
- Each environment tries to create its own OIDC provider
- Manual imports required for each deployment
- Not scalable to 4 environments

### Current Architecture
```
envs/dev/  → Creates OIDC provider ❌
envs/tst/  → Creates OIDC provider ❌ (fails, already exists)
envs/stg/  → Creates OIDC provider ❌
envs/prd/  → Creates OIDC provider ❌ (fails, already exists)
```

---

## Target State

### Solution
- Shared infrastructure module per AWS account
- Environments reference shared OIDC provider
- Auto-detection of existing providers
- Clean separation of concerns

### Target Architecture
```
shared/nonprod/ → OIDC provider (ONE for dev & tst)
shared/prod/    → OIDC provider (ONE for stg & prd)

envs/dev/  → References shared/nonprod ✅
envs/tst/  → References shared/nonprod ✅
envs/stg/  → References shared/prod ✅
envs/prd/  → References shared/prod ✅
```

---

## Environment Mapping

| Environment | AWS Account | OIDC Provider Source | IAM Role Name |
|-------------|-------------|---------------------|---------------|
| dev | non-prod | shared/nonprod | `{{PROJECT_NAME}}-github-actions-dev` |
| tst | non-prod | shared/nonprod | `{{PROJECT_NAME}}-github-actions-tst` |
| stg | prod | shared/prod | `{{PROJECT_NAME}}-github-actions-stg` |
| prd | prod | shared/prod | `{{PROJECT_NAME}}-github-actions-prd` |

---

## Implementation Tasks

### Phase 1: Create Shared OIDC Provider Module (1-2 hours)

#### Task 1.1: Create Module Directory Structure
```bash
mkdir -p cora-dev-toolkit/templates/_project-infra-template/modules/shared-oidc-provider
```

**Files to create:**
- `modules/shared-oidc-provider/main.tf`
- `modules/shared-oidc-provider/outputs.tf`

#### Task 1.2: Implement Auto-Detection Logic

**File:** `modules/shared-oidc-provider/main.tf`

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Data source to check if OIDC provider exists
data "aws_iam_openid_connect_providers" "existing" {}

locals {
  github_oidc_url = "https://token.actions.githubusercontent.com"
  
  # Check if GitHub OIDC provider already exists
  existing_providers = [
    for provider in data.aws_iam_openid_connect_providers.existing.arns :
    provider if endswith(provider, "oidc-provider/token.actions.githubusercontent.com")
  ]
  
  provider_exists = length(local.existing_providers) > 0
  provider_arn    = local.provider_exists ? local.existing_providers[0] : aws_iam_openid_connect_provider.github[0].arn
}

# Create OIDC provider only if it doesn't exist
resource "aws_iam_openid_connect_provider" "github" {
  count = local.provider_exists ? 0 : 1
  
  url = local.github_oidc_url
  
  client_id_list = [
    "sts.amazonaws.com"
  ]
  
  # GitHub OIDC thumbprints (updated 2024)
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]
  
  tags = {
    Name        = "github-actions-oidc-provider"
    ManagedBy   = "terraform"
    Description = "Shared OIDC provider for GitHub Actions across all environments"
  }
}
```

**File:** `modules/shared-oidc-provider/outputs.tf`

```hcl
output "oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider (existing or newly created)"
  value       = local.provider_arn
}

output "oidc_provider_url" {
  description = "URL of the GitHub OIDC provider"
  value       = local.github_oidc_url
}

output "provider_exists" {
  description = "Whether the provider already existed"
  value       = local.provider_exists
}
```

**Validation:**
- [ ] Module created
- [ ] Auto-detection logic works
- [ ] Outputs defined

---

### Phase 2: Create Shared Infrastructure Deployments (1 hour)

#### Task 2.1: Create Shared/NonProd Infrastructure

**Directory Structure:**
```bash
mkdir -p cora-dev-toolkit/templates/_project-infra-template/shared/nonprod
```

**File:** `shared/nonprod/main.tf`

```hcl
terraform {
  required_version = ">= 1.5.0"
  
  backend "s3" {
    # Shared state for non-prod OIDC provider
    key = "shared/nonprod/terraform.tfstate"
    # bucket, region, dynamodb_table set via backend config
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

module "github_oidc" {
  source = "../../modules/shared-oidc-provider"
}

output "oidc_provider_arn" {
  description = "ARN of shared GitHub OIDC provider for non-prod environments (dev, tst)"
  value       = module.github_oidc.oidc_provider_arn
}

output "oidc_provider_url" {
  description = "URL of GitHub OIDC provider"
  value       = module.github_oidc.oidc_provider_url
}

output "provider_already_existed" {
  description = "Whether the provider was already created in a previous deployment"
  value       = module.github_oidc.provider_exists
}
```

**File:** `shared/nonprod/variables.tf`

```hcl
variable "aws_region" {
  description = "AWS region for non-prod account"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS profile for non-prod account"
  type        = string
}
```

**File:** `shared/nonprod/backend.hcl`

```hcl
bucket         = "{{PROJECT_NAME}}-terraform-state"
region         = "us-east-1"
dynamodb_table = "{{PROJECT_NAME}}-terraform-locks"
encrypt        = true
```

#### Task 2.2: Create Shared/Prod Infrastructure

**Directory Structure:**
```bash
mkdir -p cora-dev-toolkit/templates/_project-infra-template/shared/prod
```

**File:** `shared/prod/main.tf`

```hcl
terraform {
  required_version = ">= 1.5.0"
  
  backend "s3" {
    # Shared state for prod OIDC provider
    key = "shared/prod/terraform.tfstate"
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

module "github_oidc" {
  source = "../../modules/shared-oidc-provider"
}

output "oidc_provider_arn" {
  description = "ARN of shared GitHub OIDC provider for prod environments (stg, prd)"
  value       = module.github_oidc.oidc_provider_arn
}

output "oidc_provider_url" {
  description = "URL of GitHub OIDC provider"
  value       = module.github_oidc.oidc_provider_url
}

output "provider_already_existed" {
  description = "Whether the provider was already created in a previous deployment"
  value       = module.github_oidc.provider_exists
}
```

**File:** `shared/prod/variables.tf`

```hcl
variable "aws_region" {
  description = "AWS region for prod account"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS profile for prod account"
  type        = string
}
```

**File:** `shared/prod/backend.hcl`

```hcl
# NOTE: For prod account, you might use a different S3 bucket
bucket         = "{{PROJECT_NAME}}-prod-terraform-state"
region         = "us-east-1"
dynamodb_table = "{{PROJECT_NAME}}-prod-terraform-locks"
encrypt        = true
```

**Validation:**
- [ ] Shared nonprod infrastructure created
- [ ] Shared prod infrastructure created
- [ ] Backend configs defined
- [ ] Outputs defined

---

### Phase 3: Update GitHub OIDC Role Module (30 minutes)

#### Task 3.1: Remove OIDC Provider Creation from Module

**File:** `modules/github-oidc-role/main.tf`

**Changes:**
1. Remove the `aws_iam_openid_connect_provider` resource
2. Update to accept existing OIDC provider ARN
3. Remove `count` conditional logic

**Updated Module:**

```hcl
# modules/github-oidc-role/main.tf

variable "oidc_provider_arn" {
  description = "ARN of existing GitHub OIDC provider (from shared infrastructure)"
  type        = string
}

variable "role_name" {
  description = "Name of IAM role for GitHub Actions"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, tst, stg, prd)"
  type        = string
}

variable "github_org" {
  description = "GitHub organization name"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

# IAM role that trusts the shared OIDC provider
resource "aws_iam_role" "github_actions" {
  name = var.role_name
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"
          }
        }
      }
    ]
  })
  
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# IAM policy for GitHub Actions role
resource "aws_iam_role_policy" "github_actions" {
  name = "${var.role_name}-policy"
  role = aws_iam_role.github_actions.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::{{PROJECT_NAME}}-lambda-packages",
          "arn:aws:s3:::{{PROJECT_NAME}}-lambda-packages/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:GetFunction"
        ]
        Resource = "arn:aws:lambda:*:*:function:{{PROJECT_NAME}}-*"
      }
    ]
  })
}

output "role_arn" {
  description = "ARN of the IAM role for GitHub Actions"
  value       = aws_iam_role.github_actions.arn
}

output "role_name" {
  description = "Name of the IAM role"
  value       = aws_iam_role.github_actions.name
}
```

**Validation:**
- [ ] OIDC provider creation removed
- [ ] Module accepts existing provider ARN
- [ ] IAM role creation logic intact
- [ ] Outputs defined

---

### Phase 4: Update Environment Deployments (1 hour)

#### Task 4.1: Update Dev Environment

**File:** `envs/dev/main.tf`

**Add remote state reference:**

```hcl
# Reference shared OIDC provider for non-prod account
data "terraform_remote_state" "shared_oidc" {
  backend = "s3"
  
  config = {
    bucket = "{{PROJECT_NAME}}-terraform-state"
    key    = "shared/nonprod/terraform.tfstate"
    region = "us-east-1"
  }
}

# Update github_oidc_role module call
module "github_oidc_role" {
  source = "../../modules/github-oidc-role"
  
  oidc_provider_arn = data.terraform_remote_state.shared_oidc.outputs.oidc_provider_arn
  
  role_name     = "{{PROJECT_NAME}}-github-actions-dev"
  environment   = "dev"
  github_org    = var.github_org
  github_repo   = var.github_repo
}
```

#### Task 4.2: Update Tst Environment

**File:** `envs/tst/main.tf`

**Same as dev (references shared/nonprod):**

```hcl
data "terraform_remote_state" "shared_oidc" {
  backend = "s3"
  
  config = {
    bucket = "{{PROJECT_NAME}}-terraform-state"
    key    = "shared/nonprod/terraform.tfstate"  # Same as dev
    region = "us-east-1"
  }
}

module "github_oidc_role" {
  source = "../../modules/github-oidc-role"
  
  oidc_provider_arn = data.terraform_remote_state.shared_oidc.outputs.oidc_provider_arn
  
  role_name     = "{{PROJECT_NAME}}-github-actions-tst"
  environment   = "tst"
  github_org    = var.github_org
  github_repo   = var.github_repo
}
```

#### Task 4.3: Update Stg Environment

**File:** `envs/stg/main.tf`

**References shared/prod:**

```hcl
data "terraform_remote_state" "shared_oidc" {
  backend = "s3"
  
  config = {
    bucket = "{{PROJECT_NAME}}-prod-terraform-state"  # Prod bucket
    key    = "shared/prod/terraform.tfstate"
    region = "us-east-1"
  }
}

module "github_oidc_role" {
  source = "../../modules/github-oidc-role"
  
  oidc_provider_arn = data.terraform_remote_state.shared_oidc.outputs.oidc_provider_arn
  
  role_name     = "{{PROJECT_NAME}}-github-actions-stg"
  environment   = "stg"
  github_org    = var.github_org
  github_repo   = var.github_repo
}
```

#### Task 4.4: Update Prd Environment

**File:** `envs/prd/main.tf`

**Same as stg (references shared/prod):**

```hcl
data "terraform_remote_state" "shared_oidc" {
  backend = "s3"
  
  config = {
    bucket = "{{PROJECT_NAME}}-prod-terraform-state"
    key    = "shared/prod/terraform.tfstate"  # Same as stg
    region = "us-east-1"
  }
}

module "github_oidc_role" {
  source = "../../modules/github-oidc-role"
  
  oidc_provider_arn = data.terraform_remote_state.shared_oidc.outputs.oidc_provider_arn
  
  role_name     = "{{PROJECT_NAME}}-github-actions-prd"
  environment   = "prd"
  github_org    = var.github_org
  github_repo   = var.github_repo
}
```

**Validation:**
- [ ] All 4 environments updated
- [ ] dev & tst reference shared/nonprod
- [ ] stg & prd reference shared/prod
- [ ] Remote state data sources configured

---

### Phase 5: Create Deployment Scripts (1 hour)

#### Task 5.1: Create Shared Infrastructure Deployment Script

**File:** `scripts/deploy-shared-infrastructure.sh`

```bash
#!/bin/bash
# scripts/deploy-shared-infrastructure.sh
#
# Deploy shared infrastructure (OIDC provider) for a given AWS account
#
# Usage: ./deploy-shared-infrastructure.sh <nonprod|prod>

set -e

ACCOUNT_TYPE="${1:-nonprod}"

if [[ "$ACCOUNT_TYPE" != "nonprod" && "$ACCOUNT_TYPE" != "prod" ]]; then
  echo "Usage: $0 <nonprod|prod>"
  echo ""
  echo "Examples:"
  echo "  $0 nonprod   # Deploy OIDC provider for dev & tst"
  echo "  $0 prod      # Deploy OIDC provider for stg & prd"
  exit 1
fi

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

echo "=========================================="
echo "  Deploy Shared Infrastructure"
echo "  Account: $ACCOUNT_TYPE"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SHARED_DIR="${INFRA_ROOT}/shared/${ACCOUNT_TYPE}"

if [[ ! -d "$SHARED_DIR" ]]; then
  log_error "Shared directory not found: $SHARED_DIR"
  exit 1
fi

cd "$SHARED_DIR"

# Load environment variables
if [[ "$ACCOUNT_TYPE" == "nonprod" ]]; then
  ENV_FILE="${INFRA_ROOT}/.env"
else
  ENV_FILE="${INFRA_ROOT}/.env.prod"
fi

if [[ -f "$ENV_FILE" ]]; then
  log_info "Loading AWS credentials from $ENV_FILE"
  set -a
  source "$ENV_FILE"
  set +a
  log_info "Using AWS profile: $AWS_PROFILE"
else
  log_error "Environment file not found: $ENV_FILE"
  exit 1
fi

# Initialize Terraform
log_step "Initializing Terraform..."
terraform init -backend-config=backend.hcl

# Plan
log_step "Planning changes..."
terraform plan \
  -var="aws_profile=$AWS_PROFILE" \
  -var="aws_region=${AWS_REGION:-us-east-1}" \
  -out=tfplan

# Apply
log_step "Applying changes..."
terraform apply tfplan

echo ""
echo "=========================================="
echo "  Shared Infrastructure Deployed"
echo "=========================================="
echo ""

# Show outputs
log_info "OIDC Provider ARN:"
terraform output -raw oidc_provider_arn
echo ""

PROVIDER_EXISTED=$(terraform output -raw provider_already_existed)
if [[ "$PROVIDER_EXISTED" == "true" ]]; then
  log_info "✅ Existing OIDC provider detected and imported into state"
else
  log_info "✅ New OIDC provider created"
fi

echo ""
log_info "This OIDC provider will be used by:"
if [[ "$ACCOUNT_TYPE" == "nonprod" ]]; then
  echo "  - dev environment"
  echo "  - tst environment"
else
  echo "  - stg environment"
  echo "  - prd environment"
fi

echo ""
```

**Make executable:**
```bash
chmod +x cora-dev-toolkit/templates/_project-infra-template/scripts/deploy-shared-infrastructure.sh
```

#### Task 5.2: Update deploy-terraform.sh

**File:** `scripts/deploy-terraform.sh`

**Add dependency check before main deployment logic:**

```bash
#!/bin/bash
# scripts/deploy-terraform.sh
#
# Deploy environment-specific infrastructure
# (existing script with added shared infrastructure check)

# ... existing color definitions and functions ...

# NEW FUNCTION: Check shared infrastructure
check_shared_infrastructure() {
  local environment=$1
  local account_type=""
  
  # Determine account type based on environment
  case $environment in
    dev|tst)
      account_type="nonprod"
      ;;
    stg|prd)
      account_type="prod"
      ;;
    *)
      log_error "Unknown environment: $environment"
      return 1
      ;;
  esac
  
  log_info "Checking shared infrastructure for ${account_type} account..."
  
  # Determine S3 bucket based on account type
  local bucket=""
  if [[ "$account_type" == "nonprod" ]]; then
    bucket="${TERRAFORM_BUCKET}"
  else
    bucket="${TERRAFORM_BUCKET}-prod"
  fi
  
  # Check if shared OIDC provider state exists
  aws s3 ls "s3://${bucket}/shared/${account_type}/terraform.tfstate" \
    --profile "$AWS_PROFILE" > /dev/null 2>&1
  
  if [ $? -ne 0 ]; then
    log_warn "Shared infrastructure not deployed for ${account_type} account"
    log_warn "Required for: $([ "$account_type" == "nonprod" ] && echo "dev & tst" || echo "stg & prd")"
    echo ""
    log_warn "Run: bash scripts/deploy-shared-infrastructure.sh ${account_type}"
    echo ""
    
    read -p "Deploy shared infrastructure now? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      log_step "Deploying shared infrastructure..."
      bash "${SCRIPT_DIR}/deploy-shared-infrastructure.sh" "$account_type"
      
      if [ $? -ne 0 ]; then
        log_error "Failed to deploy shared infrastructure"
        exit 1
      fi
    else
      log_error "Cannot proceed without shared infrastructure"
      log_error "The OIDC provider is required for GitHub Actions authentication"
      exit 1
    fi
  else
    log_info "✅ Shared infrastructure exists for ${account_type} account"
  fi
}

# ... existing argument parsing ...

# NEW: Add check before deployment
ENVIRONMENT="${1:-dev}"

log_step "Checking prerequisites..."
check_shared_infrastructure "$ENVIRONMENT"

# ... rest of existing deploy-terraform.sh logic ...
```

**Validation:**
- [ ] deploy-shared-infrastructure.sh created
- [ ] deploy-terraform.sh updated with dependency check
- [ ] Scripts are executable
- [ ] Auto-prompts to deploy shared infra if missing

---

### Phase 6: Update deploy-all.sh (15 minutes)

**File:** `scripts/deploy-all.sh`

**No changes needed!** The updated `deploy-terraform.sh` already handles the shared infrastructure check.

**Optional enhancement:** Add informational message

```bash
# scripts/deploy-all.sh
# ... existing code ...

# After environment validation, before Step 1:
echo ""
log_info "Note: This deployment uses shared OIDC provider architecture"
log_info "Shared infrastructure will be verified automatically"
echo ""

# ... rest of existing script ...
```

**Validation:**
- [ ] deploy-all.sh still works
- [ ] Informational message added (optional)

---

### Phase 7: Update Template Documentation (30 minutes)

#### Task 7.1: Update Project README

**File:** `templates/_project-infra-template/README.md`

**Add section:**

```markdown
## Shared Infrastructure

This project uses shared infrastructure for resources that are common across environments within the same AWS account.

### OIDC Provider for GitHub Actions

The GitHub OIDC provider is deployed once per AWS account:

**Non-Prod Account:** Used by dev & tst environments
**Prod Account:** Used by stg & prd environments

#### Initial Deployment

Before deploying any environments, deploy the shared infrastructure:

```bash
# Deploy shared OIDC provider for non-prod account (dev & tst)
bash scripts/deploy-shared-infrastructure.sh nonprod

# Later, when ready for production environments:
bash scripts/deploy-shared-infrastructure.sh prod
```

#### Automatic Checks

The `deploy-terraform.sh` script automatically checks if shared infrastructure exists and prompts you to deploy it if needed.

#### Manual Deployment

If you need to manually deploy or update shared infrastructure:

```bash
cd shared/nonprod  # or shared/prod
terraform init -backend-config=backend.hcl
terraform plan -var="aws_profile=<profile-name>"
terraform apply
```
```

#### Task 7.2: Create Architecture Diagram

**File:** `docs/SHARED-INFRASTRUCTURE-ARCHITECTURE.md`

```markdown
# Shared Infrastructure Architecture

## Overview

The OIDC provider infrastructure is shared across environments within the same AWS account to prevent resource duplication and "EntityAlreadyExists" errors.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Non-Prod Account                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Shared Infrastructure (deployed once)                    │  │
│  │                                                            │  │
│  │  • GitHub OIDC Provider                                   │  │
│  │    URL: token.actions.githubusercontent.com               │  │
│  │    ARN: arn:aws:iam::ACCOUNT:oidc-provider/token...      │  │
│  │                                                            │  │
│  │  Terraform State: shared/nonprod/terraform.tfstate        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ▲                                   │
│                              │                                   │
│            ┌─────────────────┴─────────────────┐                │
│            │                                   │                │
│  ┌─────────┴─────────┐           ┌────────────┴──────────┐     │
│  │  Dev Environment  │           │  Tst Environment      │     │
│  │                   │           │                       │     │
│  │  • IAM Role       │           │  • IAM Role           │     │
│  │    (dev-specific) │           │    (tst-specific)     │     │
│  │  • Trusts shared  │           │  • Trusts shared      │     │
│  │    OIDC provider  │           │    OIDC provider      │     │
│  └───────────────────┘           └───────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        AWS Prod Account                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Shared Infrastructure (deployed once)                    │  │
│  │                                                            │  │
│  │  • GitHub OIDC Provider                                   │  │
│  │    URL: token.actions.githubusercontent.com               │  │
│  │    ARN: arn:aws:iam::ACCOUNT:oidc-provider/token...      │  │
│  │                                                            │  │
│  │  Terraform State: shared/prod/terraform.tfstate           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ▲                                   │
│                              │                                   │
│            ┌─────────────────┴─────────────────┐                │
│            │                                   │                │
│  ┌─────────┴─────────┐           ┌────────────┴──────────┐     │
│  │  Stg Environment  │           │  Prd Environment      │     │
│  │                   │           │                       │     │
│  │  • IAM Role       │           │  • IAM Role           │     │
│  │    (stg-specific) │           │    (prd-specific)     │     │
│  │  • Trusts shared  │           │  • Trusts shared      │     │
│  │    OIDC provider  │           │    OIDC provider      │     │
│  └───────────────────┘           └───────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Benefits

1. **No Resource Duplication**: One OIDC provider per AWS account
2. **No EntityAlreadyExists Errors**: Auto-detection prevents conflicts
3. **Clean State Management**: Shared infrastructure in dedicated state files
4. **Easy Rollout**: Deploy shared infrastructure once, then all environments
5. **Account Isolation**: Prod and non-prod accounts remain separate

## Deployment Order

### First Time Setup

1. Deploy shared infrastructure for non-prod:
   ```bash
   bash scripts/deploy-shared-infrastructure.sh nonprod
   ```

2. Deploy dev environment:
   ```bash
   bash scripts/deploy-terraform.sh dev
   ```

3. Deploy tst environment:
   ```bash
   bash scripts/deploy-terraform.sh tst
   ```

4. Deploy shared infrastructure for prod:
   ```bash
   bash scripts/deploy-shared-infrastructure.sh prod
   ```

5. Deploy stg environment:
   ```bash
   bash scripts/deploy-terraform.sh stg
   ```

6. Deploy prd environment:
   ```bash
   bash scripts/deploy-terraform.sh prd
   ```

### Subsequent Deployments

Shared infrastructure rarely changes. Just deploy environments:

```bash
bash scripts/deploy-terraform.sh <environment>
```

The script will verify shared infrastructure exists automatically.
```

**Validation:**
- [ ] README updated
- [ ] Architecture documentation created
- [ ] Deployment workflows documented

---

## Testing Strategy

### Unit Testing (per phase)

**Phase 1: Shared OIDC Module**
```bash
cd modules/shared-oidc-provider
terraform init
terraform validate
terraform plan  # Should detect existing or create new
```

**Phase 2: Shared Infrastructure**
```bash
cd shared/nonprod
terraform init -backend-config=backend.hcl
terraform validate
terraform plan -var="aws_profile=nonprod-profile"
# Should show: Will create OIDC provider OR Will use existing
```

**Phase 3-4: Environment Updates**
```bash
cd envs/dev
terraform init
terraform validate
# Should not show errors about missing data source
```

**Phase 5: Scripts**
```bash
# Test shared infrastructure deployment
bash scripts/deploy-shared-infrastructure.sh nonprod --help
# Should show usage

# Test dependency check
bash scripts/deploy-terraform.sh dev
# Should check for shared infrastructure
```

### Integration Testing

**Test Scenario 1: Fresh Deployment**

1. No OIDC provider exists in AWS
2. Deploy shared/nonprod
3. Verify OIDC provider created
4. Deploy dev environment
5. Verify dev references shared OIDC provider

**Test Scenario 2: Existing OIDC Provider**

1. OIDC provider already exists
2. Deploy shared/nonprod
3. Verify it detects existing provider
4. Verify no "EntityAlreadyExists" error
5. Verify outputs show correct ARN

**Test Scenario 3: Multiple Environments**

1. Shared nonprod deployed
2. Deploy dev (should succeed)
3. Deploy tst (should succeed)
4. Both should reference same OIDC provider ARN

**Test Scenario 4: Cross-Account**

1. Deploy shared/nonprod (non-prod account)
2. Deploy shared/prod (prod account)
3. Verify two different OIDC providers exist
4. Verify correct environments reference correct providers

### Validation Checklist

- [ ] No "EntityAlreadyExists" errors
- [ ] OIDC provider ARN matches across environments in same account
- [ ] OIDC provider ARN differs between prod and nonprod accounts
- [ ] All environments can assume their IAM roles
- [ ] GitHub Actions can authenticate successfully
- [ ] Terraform state shows proper dependencies
- [ ] No duplicate resources created

---

## Rollout Strategy

### Rollout to Existing Projects (e.g., test3)

**For projects with existing OIDC provider:**

1. **Backup current state:**
   ```bash
   cd envs/dev
   terraform state pull > dev-state-backup.json
   ```

2. **Deploy shared infrastructure:**
   ```bash
   # Will detect existing OIDC provider
   bash scripts/deploy-shared-infrastructure.sh nonprod
   ```

3. **Update environment code:**
   - Add remote state data source
   - Update module call to use shared OIDC ARN

4. **Plan environment changes:**
   ```bash
   cd envs/dev
   terraform plan
   # Should show:
   # - No changes to OIDC provider (not managed here anymore)
   # - Changes to IAM role (references shared provider)
   ```

5. **Apply changes:**
   ```bash
   terraform apply
   ```

6. **Verify:**
   ```bash
   # Check IAM role trusts correct OIDC provider
   aws iam get-role --role-name ai-sec-github-actions-dev
   ```

7. **Repeat for tst, stg, prd**

### Rollout to New Projects

**Projects created with new template:**

1. Bootstrap infrastructure (S3, DynamoDB)
2. Deploy shared infrastructure:
   ```bash
   bash scripts/deploy-shared-infrastructure.sh nonprod
   ```
3. Deploy environments normally:
   ```bash
   bash scripts/deploy-all.sh dev
   ```

Everything "just works"! ✅

---

## Troubleshooting

### Issue: "EntityAlreadyExists" Error

**Symptom:**
```
Error: creating IAM OIDC Provider: EntityAlreadyExists: 
Provider with url https://token.actions.githubusercontent.com already exists
```

**Cause:** OIDC provider exists but isn't in Terraform state

**Fix:**
```bash
cd shared/nonprod  # or shared/prod
terraform apply
# The auto-detection logic will find existing provider
```

### Issue: Remote State Not Found

**Symptom:**
```
Error: Error loading state: NoSuchKey
```

**Cause:** Shared infrastructure not deployed yet

**Fix:**
```bash
bash scripts/deploy-shared-infrastructure.sh nonprod  # or prod
```

### Issue: Wrong OIDC Provider ARN

**Symptom:** Environment references wrong account's OIDC provider

**Cause:** Remote state data source pointing to wrong account

**Fix:**
Check `data.terraform_remote_state.shared_oidc` configuration:
- dev & tst should reference `shared/nonprod/terraform.tfstate`
- stg & prd should reference `shared/prod/terraform.tfstate`

### Issue: Permission Denied Accessing Shared State

**Symptom:**
```
Error: error configuring S3 Backend: error validating provider credentials
```

**Cause:** AWS credentials don't have access to shared state bucket

**Fix:**
1. Verify AWS profile has S3 read access to Terraform state bucket
2. Check bucket policy allows cross-environment access
3. Verify IAM role/user has necessary permissions

---

## Success Criteria

### Technical Validation

- [ ] OIDC provider created only once per AWS account
- [ ] All environments reference correct shared provider
- [ ] No "EntityAlreadyExists" errors
- [ ] Auto-detection works for existing providers
- [ ] Terraform state properly separated (shared vs env-specific)
- [ ] No manual imports required

### Operational Validation

- [ ] Deployment scripts work end-to-end
- [ ] Documentation is clear and complete
- [ ] Team can deploy without assistance
- [ ] Rollback procedure documented
- [ ] Monitoring/alerting configured (if applicable)

### Business Validation

- [ ] All 4 environments deployable
- [ ] CI/CD pipeline integration works
- [ ] No production impact
- [ ] Timeline met
- [ ] Budget met (if applicable)

---

## Timeline Estimate

| Phase | Task | Estimated Time | Priority |
|-------|------|----------------|----------|
| 1 | Create shared OIDC module | 1-2 hours | HIGH |
| 2 | Create shared infrastructure | 1 hour | HIGH |
| 3 | Update GitHub OIDC role module | 30 mins | HIGH |
| 4 | Update environment deployments | 1 hour | HIGH |
| 5 | Create deployment scripts | 1 hour | MEDIUM |
| 6 | Update deploy-all.sh | 15 mins | LOW |
| 7 | Update documentation | 30 mins | MEDIUM |
| **Total** | **4-6 hours** | | |

**Testing:** +2-3 hours  
**Total with Testing:** 6-9 hours

---

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Existing OIDC provider conflicts | HIGH | LOW | Auto-detection logic handles this |
| State file corruption | HIGH | LOW | Backup states before changes |
| Wrong ARN referenced | MEDIUM | MEDIUM | Validation scripts, clear docs |
| Team confusion | LOW | MEDIUM | Comprehensive documentation |
| Production downtime | HIGH | LOW | Deploy to nonprod first |

---

## Rollback Plan

If implementation fails:

1. **Revert environment code:**
   ```bash
   git revert <commit-hash>
   terraform apply
   ```

2. **Remove shared infrastructure (if safe):**
   ```bash
   cd shared/nonprod
   terraform destroy
   ```

3. **Restore previous OIDC provider setup:**
   - Re-add provider creation to github-oidc-role module
   - Remove remote state data sources
   - Apply changes

4. **Verify environments work:**
   ```bash
   bash scripts/deploy-terraform.sh dev
   ```

---

## Next Steps

1. Review this plan with team
2. Get approval for implementation
3. Schedule implementation window
4. Assign tasks
5. Execute phases sequentially
6. Test thoroughly
7. Deploy to production
8. Monitor and validate

---

**Status:** Ready for Implementation  
**Approval Required:** Yes  
**Implementation Date:** TBD  
**Owner:** TBD
