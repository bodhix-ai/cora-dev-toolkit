#!/bin/bash

# Deploy Lambda - Build and deploy a single Lambda function
# Reduces cycle time by targeting specific Lambda changes
#
# Usage: ./deploy-lambda.sh <lambda-name> [OPTIONS]

set -e

# --- Configuration ---
ENVIRONMENT="${ENVIRONMENT:-dev}"
SKIP_BUILD=false
SKIP_UPLOAD=false
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

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

show_help() {
  cat << EOF
Deploy Lambda - Build and deploy a single Lambda function

This script builds and deploys a specific Lambda function without running
the full deploy-all.sh pipeline. Useful for testing Lambda code changes.

Usage: $0 <lambda-name> [OPTIONS]

Arguments:
  lambda-name         Name of the Lambda to deploy. Can be:
                      - Module Lambda: module-access/invites, module-ai/ai-config, etc.
                      - Infra Lambda: authorizer

Options:
  --env <env>         Target environment (dev, stg, prd) - default: dev
  --skip-build        Skip build step (use existing zip)
  --skip-upload       Skip S3 upload (use existing S3 artifact)
  --auto-approve      Skip Terraform approval prompt
  --list              List available Lambda functions
  --help              Show this help message

Examples:
  # Build and deploy invites Lambda
  $0 module-access/invites

  # Deploy authorizer Lambda
  $0 authorizer

  # Skip build, just redeploy
  $0 module-access/invites --skip-build

  # Deploy to staging
  $0 module-ai/ai-config --env stg

Available Lambda Paths:
  CORE MODULES:
    module-access/invites     - Invitation management
    module-access/orgs        - Organization operations
    module-access/users       - User management
    module-ai/ai-config       - AI configuration
    module-mgmt/mgmt-api      - Platform management

  INFRASTRUCTURE:
    authorizer                - API Gateway authorizer

EOF
}

list_lambdas() {
  echo "Available Lambda Functions:"
  echo ""
  echo "CORE MODULES:"
  
  # Find module Lambdas
  for module_dir in "${INFRA_ROOT}/lambdas/module-"*; do
    if [[ -d "$module_dir" ]]; then
      module_name=$(basename "$module_dir")
      echo "  ${module_name}:"
      for lambda_dir in "${module_dir}/"*/; do
        if [[ -d "$lambda_dir" && -f "${lambda_dir}lambda_function.py" ]]; then
          lambda_name=$(basename "$lambda_dir")
          echo "    - ${module_name}/${lambda_name}"
        fi
      done
    fi
  done
  
  echo ""
  echo "INFRASTRUCTURE:"
  
  # Check for authorizer
  if [[ -d "${INFRA_ROOT}/lambdas/api-gateway-authorizer" ]]; then
    echo "    - authorizer"
  fi
  
  echo ""
}

# --- Parse Arguments ---
LAMBDA_NAME=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-upload)
      SKIP_UPLOAD=true
      shift
      ;;
    --auto-approve)
      AUTO_APPROVE="-auto-approve"
      shift
      ;;
    --list)
      list_lambdas
      exit 0
      ;;
    --help)
      show_help
      exit 0
      ;;
    -*)
      log_error "Unknown option: $1"
      show_help
      exit 1
      ;;
    *)
      if [[ -z "$LAMBDA_NAME" ]]; then
        LAMBDA_NAME="$1"
      else
        log_error "Too many arguments"
        show_help
        exit 1
      fi
      shift
      ;;
  esac
done

# --- Validate Arguments ---
if [[ -z "$LAMBDA_NAME" ]]; then
  log_error "Lambda name is required"
  show_help
  exit 1
fi

# --- Determine Lambda Path ---
LAMBDA_DIR=""
ZIP_NAME=""

if [[ "$LAMBDA_NAME" == "authorizer" ]]; then
  LAMBDA_DIR="${INFRA_ROOT}/lambdas/api-gateway-authorizer"
  ZIP_NAME="authorizer.zip"
elif [[ "$LAMBDA_NAME" == *"/"* ]]; then
  # Module Lambda (e.g., module-access/invites)
  LAMBDA_DIR="${INFRA_ROOT}/lambdas/${LAMBDA_NAME}"
  ZIP_NAME="${LAMBDA_NAME//\//-}.zip"  # Convert / to -
else
  log_error "Invalid Lambda name format: $LAMBDA_NAME"
  log_info "Use format: module-name/lambda-name (e.g., module-access/invites)"
  exit 1
fi

if [[ ! -d "$LAMBDA_DIR" ]]; then
  log_error "Lambda directory not found: $LAMBDA_DIR"
  list_lambdas
  exit 1
fi

# --- Main Script ---
echo "========================================"
echo "  Deploy Lambda: ${LAMBDA_NAME}"
echo "========================================"
echo ""
log_info "Environment: ${ENVIRONMENT}"
log_info "Lambda Dir:  ${LAMBDA_DIR}"
echo ""

# Step 1: Build
if [[ "$SKIP_BUILD" == "false" ]]; then
  log_step "Step 1/3: Building Lambda..."
  
  if [[ -f "${LAMBDA_DIR}/build.sh" ]]; then
    cd "${LAMBDA_DIR}"
    bash build.sh
    cd "${SCRIPT_DIR}"
  else
    log_warn "No build.sh found in ${LAMBDA_DIR}"
    log_info "Assuming Lambda code is ready to deploy"
  fi
  echo ""
else
  log_warn "Skipping build (--skip-build specified)"
  echo ""
fi

# Step 2: Upload to S3
if [[ "$SKIP_UPLOAD" == "false" ]]; then
  log_step "Step 2/3: Uploading to S3..."
  
  # Get S3 bucket from Terraform outputs or config
  S3_BUCKET=""
  
  # Try to get from Terraform outputs
  if [[ -f "${INFRA_ROOT}/envs/${ENVIRONMENT}/terraform.tfstate" ]]; then
    S3_BUCKET=$(cd "${INFRA_ROOT}/envs/${ENVIRONMENT}" && terraform output -raw lambda_artifacts_bucket 2>/dev/null || true)
  fi
  
  # Fallback: try to get from local-secrets.tfvars
  if [[ -z "$S3_BUCKET" && -f "${INFRA_ROOT}/envs/${ENVIRONMENT}/local-secrets.tfvars" ]]; then
    S3_BUCKET=$(grep 'lambda_bucket' "${INFRA_ROOT}/envs/${ENVIRONMENT}/local-secrets.tfvars" | cut -d'"' -f2 || true)
  fi
  
  if [[ -z "$S3_BUCKET" ]]; then
    log_error "Could not determine S3 bucket for Lambda artifacts"
    log_info "Run deploy-terraform.sh first to create the bucket, or check Terraform outputs"
    exit 1
  fi
  
  # Find the zip file
  ZIP_PATH=""
  if [[ -f "${LAMBDA_DIR}/build/${ZIP_NAME}" ]]; then
    ZIP_PATH="${LAMBDA_DIR}/build/${ZIP_NAME}"
  elif [[ -f "${LAMBDA_DIR}/${ZIP_NAME}" ]]; then
    ZIP_PATH="${LAMBDA_DIR}/${ZIP_NAME}"
  elif [[ -f "${LAMBDA_DIR}/build/authorizer.zip" && "$LAMBDA_NAME" == "authorizer" ]]; then
    ZIP_PATH="${LAMBDA_DIR}/build/authorizer.zip"
  else
    log_error "Could not find zip file for ${LAMBDA_NAME}"
    log_info "Expected at: ${LAMBDA_DIR}/build/${ZIP_NAME}"
    exit 1
  fi
  
  log_info "Uploading ${ZIP_PATH} to s3://${S3_BUCKET}/lambdas/${ZIP_NAME}"
  aws s3 cp "${ZIP_PATH}" "s3://${S3_BUCKET}/lambdas/${ZIP_NAME}"
  echo ""
else
  log_warn "Skipping upload (--skip-upload specified)"
  echo ""
fi

# Step 3: Update Lambda via Terraform
log_step "Step 3/3: Updating Lambda via Terraform..."

cd "${INFRA_ROOT}/envs/${ENVIRONMENT}"

# Run targeted Terraform apply
# Note: This will detect the zip hash change and update the Lambda
log_info "Running terraform apply (will detect code changes via source_code_hash)..."

if [[ -f "local-secrets.tfvars" ]]; then
  terraform apply -var-file=local-secrets.tfvars ${AUTO_APPROVE}
else
  terraform apply ${AUTO_APPROVE}
fi

cd "${SCRIPT_DIR}"

# --- Summary ---
echo ""
echo "========================================"
echo "  Lambda Deployed Successfully"
echo "========================================"
echo ""
log_info "Lambda:      ${LAMBDA_NAME}"
log_info "Environment: ${ENVIRONMENT}"
echo ""
log_info "Next steps:"
log_info "  • Test the API endpoint"
log_info "  • Check CloudWatch logs if issues occur"
echo ""
