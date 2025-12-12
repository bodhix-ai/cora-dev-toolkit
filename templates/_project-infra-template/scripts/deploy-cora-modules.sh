#!/bin/bash

# Deploy CORA Modules for {{PROJECT_NAME}}
# Deploys CORA module infrastructure using Terraform
#
# Usage: ./deploy-cora-modules.sh <environment> [OPTIONS]

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
Deploy CORA Modules for {{PROJECT_NAME}}

Usage: $0 <environment> [OPTIONS]

Deploys CORA module infrastructure using Terraform.
Requires ./build-cora-modules.sh to be run first.

Arguments:
  environment         Target environment (dev, stg, prd) - default: dev

Options:
  --auto-approve      Skip interactive approval
  --help              Show this help message

Environment Variables:
  AWS_PROFILE         AWS profile to use
  AWS_REGION          AWS region

Prerequisites:
  1. Run ./build-cora-modules.sh first to build Docker images
  2. Ensure .cora-module-images.env exists with image URIs

Examples:
  $0 dev
  $0 stg --auto-approve

EOF
}

# --- Parse Arguments ---
AUTO_APPROVE=""

shift || true  # Skip first arg (environment)

while [[ $# -gt 0 ]]; do
  case $1 in
    --auto-approve)
      AUTO_APPROVE="-auto-approve"
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

# Check for image URIs file
IMAGE_ENV_FILE="${INFRA_ROOT}/.cora-module-images.env"
if [ ! -f "${IMAGE_ENV_FILE}" ]; then
  log_error "Image URIs file not found: ${IMAGE_ENV_FILE}"
  echo ""
  echo "You must run the build script first:"
  echo "  ./scripts/build-cora-modules.sh"
  exit 1
fi

echo "========================================"
echo "  CORA Module Deployment"
echo "========================================"
echo ""
log_info "Environment: ${ENVIRONMENT}"
log_info "AWS Profile: ${AWS_PROFILE}"
log_info "AWS Region:  ${AWS_REGION}"
echo ""

# Load image URIs
log_info "Loading image URIs from ${IMAGE_ENV_FILE}..."
set -a
source "${IMAGE_ENV_FILE}"
set +a

export AWS_PROFILE
export AWS_REGION

# Run Terraform deployment
ENV_DIR="${INFRA_ROOT}/envs/${ENVIRONMENT}"

if [ ! -d "${ENV_DIR}" ]; then
  log_error "Environment directory not found: ${ENV_DIR}"
  exit 1
fi

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

# Build variable arguments for image URIs
IMAGE_VARS=""
while IFS='=' read -r key value; do
  if [[ -n "$key" && -n "$value" ]]; then
    # Convert IMAGE_URI_MODULE_ACCESS to module_access_lambda_image_uri
    var_name=$(echo "$key" | sed 's/IMAGE_URI_//' | tr '[:upper:]' '[:lower:]')_lambda_image_uri
    IMAGE_VARS="${IMAGE_VARS} -var=\"${var_name}=${value}\""
  fi
done < "${IMAGE_ENV_FILE}"

# Run Terraform apply
log_info "Applying Terraform changes..."
eval terraform apply ${AUTO_APPROVE} ${VAR_FILES_ARG} ${IMAGE_VARS}

# Get outputs
echo ""
echo "========================================"
echo "  Deployment Complete"
echo "========================================"
echo ""

API_GATEWAY_URL=$(terraform output -raw modular_api_gateway_url 2>/dev/null || echo "N/A")

log_info "Environment: ${ENVIRONMENT}"
log_info "API Gateway URL: ${API_GATEWAY_URL}"
echo ""
log_info "Test with: curl ${API_GATEWAY_URL}/health"
