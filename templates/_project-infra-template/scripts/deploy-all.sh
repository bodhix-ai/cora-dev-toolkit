#!/bin/bash

# Deploy All - Full Build and Deploy Pipeline
# Orchestrates the complete build and deployment process
#
# Usage: ./deploy-all.sh <environment> [OPTIONS]

set -e

# --- Configuration ---
ENVIRONMENT="${1}"
SKIP_BUILD=false
SKIP_VALIDATION=false
AUTO_APPROVE=""

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

show_help() {
  cat << EOF
Deploy All - Full Build and Deploy Pipeline

Usage: $0 <environment> [OPTIONS]

Orchestrates the complete deployment process:
  0. Sync config to Terraform variables (sync-config-to-terraform.sh)
  1. Build Lambda zip packages (build-cora-modules.sh)
  2. Upload packages to S3 (deploy-cora-modules.sh)
  3. Apply Terraform infrastructure (deploy-terraform.sh)
  4. Update frontend environment variables (update-env-from-terraform.sh)

Arguments:
  environment         Target environment (dev, stg, prd) - default: dev

Options:
  --skip-build        Skip build step (use existing build artifacts)
  --skip-validation   Skip import validation during build (use when validator has false positives)
  --auto-approve      Skip interactive approval in Terraform
  --help              Show this help message

Environment Variables:
  AWS_PROFILE         AWS profile to use
  AWS_REGION          AWS region
  SKIP_VALIDATION     Skip validation (can also use --skip-validation flag)

Examples:
  # Full deployment to dev
  $0 dev

  # Skip rebuild, just redeploy
  $0 dev --skip-build

  # Automated deployment (CI/CD)
  $0 prd --auto-approve

EOF
}

# --- Parse Arguments ---
shift || true  # Skip first arg (environment)

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-validation)
      SKIP_VALIDATION=true
      shift
      ;;
    --auto-approve)
      AUTO_APPROVE="--auto-approve"
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# --- Validate Environment ---
if [ -z "$ENVIRONMENT" ]; then
  log_error "Environment parameter is required"
  echo ""
  echo "Usage: $0 <environment> [OPTIONS]"
  echo "Valid environments: dev, stg, prd"
  echo ""
  echo "Examples:"
  echo "  $0 dev"
  echo "  $0 prd --auto-approve"
  exit 1
fi

case $ENVIRONMENT in
  dev|stg|prd)
    ;;
  *)
    log_error "Invalid environment: $ENVIRONMENT"
    echo "Valid environments: dev, stg, prd"
    exit 1
    ;;
esac

# --- Main Script ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo "  {{PROJECT_NAME}} - Full Deployment"
echo "========================================"
echo ""
log_info "Environment: ${ENVIRONMENT}"
log_info "Skip Build:  ${SKIP_BUILD}"
log_info "Skip Validation: ${SKIP_VALIDATION}"
echo ""

# Step 0: Sync configuration to Terraform variables
log_step "Step 0/4: Syncing configuration to Terraform variables..."
if [ -f "${SCRIPT_DIR}/sync-config-to-terraform.sh" ]; then
  "${SCRIPT_DIR}/sync-config-to-terraform.sh" "${ENVIRONMENT}"
  echo ""
else
  log_warn "sync-config-to-terraform.sh not found - skipping config sync"
  log_info "Terraform will use existing local-secrets.tfvars"
  echo ""
fi

# Step 1: Build Lambda packages
if ! $SKIP_BUILD; then
  log_step "Step 1/4: Building Lambda packages..."
  
  # Build CORA modules (module-mgmt, module-ai, module-access)
  # Pass SKIP_VALIDATION to build script
  export SKIP_VALIDATION="${SKIP_VALIDATION}"
  "${SCRIPT_DIR}/build-cora-modules.sh"
  echo ""
  
  # Build infrastructure Lambdas (authorizer)
  log_info "Building API Gateway Authorizer..."
  INFRA_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
  if [ -f "${INFRA_ROOT}/lambdas/api-gateway-authorizer/build.sh" ]; then
    cd "${INFRA_ROOT}/lambdas/api-gateway-authorizer"
    bash build.sh
    cd "${SCRIPT_DIR}"
    echo ""
  else
    log_warn "Authorizer build script not found - skipping"
    echo ""
  fi
else
  log_warn "Skipping build (--skip-build specified)"
  echo ""
fi

# Step 1.4: Ensure Terraform providers are initialized
log_step "Step 1.4/4: Checking Terraform initialization..."
INFRA_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_DIR="${INFRA_ROOT}/envs/${ENVIRONMENT}"

if [ ! -d "${ENV_DIR}/.terraform" ]; then
  log_info "Terraform not initialized for ${ENVIRONMENT} - running terraform init..."
  cd "${ENV_DIR}"
  terraform init
  cd "${SCRIPT_DIR}"
  log_info "✅ Terraform initialized successfully"
  echo ""
else
  log_info "✅ Terraform already initialized"
  echo ""
fi

# Step 1.5: Pre-deployment validation (validates build artifacts before expensive Terraform)
log_step "Step 1.5/4: Running pre-deployment validation..."
if [ -f "${SCRIPT_DIR}/pre-deploy-check.sh" ]; then
  if ! "${SCRIPT_DIR}/pre-deploy-check.sh" --skip-typecheck; then
    log_error "Pre-deployment validation failed!"
    log_error "Fix the errors above before proceeding."
    log_info "This check saves ~5 minutes of failed Terraform deployment."
    exit 1
  fi
  echo ""
else
  log_warn "pre-deploy-check.sh not found - skipping pre-deployment validation"
  echo ""
fi

# Step 2: Upload to S3
log_step "Step 2/4: Uploading artifacts to S3..."
"${SCRIPT_DIR}/deploy-cora-modules.sh"
echo ""

# Step 3: Apply Terraform (includes environment variable updates)
log_step "Step 3/4: Applying Terraform infrastructure..."
"${SCRIPT_DIR}/deploy-terraform.sh" "${ENVIRONMENT}" ${AUTO_APPROVE}
echo ""

# Note: deploy-terraform.sh already calls update-env-from-terraform.sh
# so we don't need to call it again here

# --- Summary ---
echo "========================================"
echo "  Deployment Complete"
echo "========================================"
echo ""
log_info "Environment ${ENVIRONMENT} deployed successfully"
log_info ""
log_info "Next steps:"
log_info "  • View API Gateway URL in Terraform outputs"
log_info "  • Test endpoints with api-tracer"
log_info "  • Run validation suite"
echo ""
log_info ""
