#!/bin/bash

# Deploy Terraform for {{PROJECT_NAME}}
# Applies Terraform configuration for the specified environment
#
# Usage: ./deploy-terraform.sh <environment> [OPTIONS]

set -e

# --- Load .env file if exists ---
SCRIPT_DIR_TEMP="$(cd "$(dirname "$0")" && pwd)"
INFRA_ROOT_TEMP="$(cd "${SCRIPT_DIR_TEMP}/.." && pwd)"
ENV_FILE="${INFRA_ROOT_TEMP}/.env"

if [ -f "${ENV_FILE}" ]; then
  echo "Loading configuration from ${ENV_FILE}"
  # Export all variables from .env file
  set -a
  source "${ENV_FILE}"
  set +a
fi

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
  --no-auto-approve   Require interactive approval (default: auto-approve)
  --plan-only         Run terraform plan only (no apply)
  --help              Show this help message

Environment Variables:
  AWS_PROFILE         AWS profile to use
  AWS_REGION          AWS region

Examples:
  $0 dev                      # Auto-approve by default
  $0 stg --no-auto-approve    # Require confirmation
  $0 prd --plan-only          # Plan only, no apply

Note: Auto-approve is enabled by default to increase efficiency.
      Use --no-auto-approve to require interactive confirmation.

EOF
}

# --- Parse Arguments ---
AUTO_APPROVE="-auto-approve"  # Default to auto-approve (like pm-app-infra)
PLAN_ONLY=false

shift || true  # Skip first arg (environment)

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-auto-approve)
      AUTO_APPROVE=""
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
terraform init -reconfigure

# Check for secrets file
SECRETS_FILE="local-secrets.tfvars"
VAR_FILES_ARG=""
if [ -f "$SECRETS_FILE" ]; then
  log_info "Using ${SECRETS_FILE} for variables"
  VAR_FILES_ARG="-var-file=${SECRETS_FILE}"
fi

# --- 2-Stage Deployment ---
# Skip full plan as it will fail with "count depends on computed values" error
# Instead, use targeted applies to deploy in stages

if $PLAN_ONLY; then
  log_info "Running Terraform plan (--plan-only specified)..."
  log_info "Note: Full plan may fail with 'count depends on computed values' error"
  log_info "Use without --plan-only for staged deployment"
  terraform plan ${VAR_FILES_ARG}
  exit 0
fi
log_info "Deploying infrastructure in 2 stages to avoid dependency issues..."
echo ""

# Stage 1: Deploy Lambda modules + Authorizer first
log_info "Stage 1/2: Deploying Lambda functions and Authorizer..."
terraform apply ${AUTO_APPROVE} ${VAR_FILES_ARG} \
  -target=module.module_access \
  -target=module.module_ai \
  -target=module.module_mgmt \
  -target=module.secrets \
  -target=aws_lambda_function.authorizer \
  -target=aws_cloudwatch_log_group.authorizer \
  -target=aws_iam_role.authorizer \
  -target=aws_iam_role_policy_attachment.authorizer_basic

echo ""
log_info "Stage 2/2: Deploying remaining resources (API Gateway, routes)..."
terraform apply ${AUTO_APPROVE} ${VAR_FILES_ARG}

# Cleanup plan file
rm -f tfplan

echo ""
echo "========================================"
echo "  Deployment Complete"
echo "========================================"
echo ""
log_info "Environment ${ENVIRONMENT} deployed successfully"

# --- Update Environment Files with Terraform Outputs ---
UPDATE_ENV_SCRIPT="${SCRIPT_DIR}/update-env-from-terraform.sh"
if [ -f "$UPDATE_ENV_SCRIPT" ]; then
  echo ""
  log_info "Updating environment files with Terraform outputs..."
  chmod +x "$UPDATE_ENV_SCRIPT"
  "$UPDATE_ENV_SCRIPT" "${ENVIRONMENT}"
else
  log_warn "update-env-from-terraform.sh not found. Skipping env file updates."
  log_info "You can manually run: ./scripts/update-env-from-terraform.sh ${ENVIRONMENT}"
fi
