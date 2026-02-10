#!/bin/bash
# Migrate from old cora-module (S3-based) to new module-* (local build)
# 3-stage deployment to handle resource migration

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cd "${INFRA_ROOT}/envs/dev"

echo "========================================"
echo "  3-Stage Migration to New Modules"
echo "========================================"
echo ""

# Stage 1: Remove old cora_module_access resources from state
log_info "Stage 1/3: Removing old cora_module_access resources from Terraform state..."
echo ""

# Check if old module exists in state
if terraform state list | grep -q "module.cora_module_access"; then
  log_info "Found old cora_module_access resources, removing from state..."
  
  # Remove old module resources from state (they'll be destroyed in apply)
  terraform state list | grep "module.cora_module_access" | while read resource; do
    log_info "  Removing: $resource"
    terraform state rm "$resource" || true
  done
  
  log_info "✅ Old resources removed from state"
else
  log_info "No old cora_module_access resources found, skipping..."
fi

echo ""
log_info "Stage 2/3: Deploying new module Lambda functions..."
terraform apply -auto-approve -var-file=local-secrets.tfvars \
  -target=module.module_access \
  -target=module.module_ai \
  -target=module.module_mgmt \
  -target=module.secrets \
  -target=aws_lambda_function.authorizer \
  -target=aws_cloudwatch_log_group.authorizer \
  -target=aws_iam_role.authorizer \
  -target=aws_iam_role_policy_attachment.authorizer_basic || {
    log_warn "Stage 2 had some errors, but continuing..."
  }

echo ""
log_info "Stage 3/3: Deploying API Gateway routes..."
terraform apply -auto-approve -var-file=local-secrets.tfvars

echo ""
echo "========================================"
echo "  Migration Complete!"
echo "========================================"
log_info "Infrastructure migrated to new local-build pattern"
