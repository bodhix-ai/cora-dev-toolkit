#!/bin/bash

# Deploy Terraform for {{PROJECT_NAME}}
# Applies Terraform configuration for the specified environment
#
# Usage: ./deploy-terraform.sh <environment> [OPTIONS]

set -e

# --- Configuration ---
ENVIRONMENT="${1:-dev}"
AWS_PROFILE="${AWS_PROFILE:-default}"
AWS_REGION="${AWS_REGION:-{{AWS_REGION}}}"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
  cat << EOF
Deploy Terraform for {{PROJECT_NAME}}

Usage: $0 <environment> [OPTIONS]

Arguments:
  environment         Target environment (dev, stg, prd) - default: dev

Options:
  --auto-approve      Skip interactive approval
  --plan-only         Run terraform plan only (no apply)
  --help              Show this help message

Environment Variables:
  AWS_PROFILE         AWS profile to use
  AWS_REGION          AWS region

Examples:
  $0 dev
  $0 stg --auto-approve
  $0 prd --plan-only

EOF
}

# --- Parse Arguments ---
AUTO_APPROVE=""
PLAN_ONLY=false

shift || true  # Skip first arg (environment)

while [[ $# -gt 0 ]]; do
  case $1 in
    --auto-approve)
      AUTO_APPROVE="-auto-approve"
      shift
      ;;
    --plan-only)
      PLAN_ONLY=true
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
INFRA_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_DIR="${INFRA_ROOT}/envs/${ENVIRONMENT}"

if [ ! -d "${ENV_DIR}" ]; then
  log_error "Environment directory not found: ${ENV_DIR}"
  exit 1
fi

echo "========================================"
echo "  Terraform Deployment"
echo "========================================"
echo ""
log_info "Environment: ${ENVIRONMENT}"
log_info "AWS Profile: ${AWS_PROFILE}"
log_info "AWS Region:  ${AWS_REGION}"
log_info "Directory:   ${ENV_DIR}"
echo ""

export AWS_PROFILE
export AWS_REGION

cd "${ENV_DIR}"

# Initialize Terraform
log_info "Initializing Terraform..."
terraform init -reconfigure -backend-config=backend.hcl

# Check for secrets file
SECRETS_FILE="local-secrets.tfvars"
VAR_FILES_ARG=""
if [ -f "$SECRETS_FILE" ]; then
  log_info "Using ${SECRETS_FILE} for variables"
  VAR_FILES_ARG="-var-file=${SECRETS_FILE}"
fi

# Run Terraform plan
log_info "Running Terraform plan..."
terraform plan ${VAR_FILES_ARG} -out=tfplan

if $PLAN_ONLY; then
  log_info "Plan complete (--plan-only specified)"
  exit 0
fi

# Apply changes
log_info "Applying Terraform changes..."
terraform apply ${AUTO_APPROVE} tfplan

# Cleanup plan file
rm -f tfplan

echo ""
echo "========================================"
echo "  Deployment Complete"
echo "========================================"
echo ""
log_info "Environment ${ENVIRONMENT} deployed successfully"
