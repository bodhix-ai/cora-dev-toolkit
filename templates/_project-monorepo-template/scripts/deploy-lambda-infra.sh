#!/bin/bash

# Deploy Infrastructure Lambda - Build and deploy an infrastructure Lambda function
# Specifically for infrastructure Lambdas like the API Gateway authorizer
#
# Usage: ./deploy-lambda-infra.sh <lambda-name> [OPTIONS]

set -e

# --- Configuration ---
ENVIRONMENT="${ENVIRONMENT:-dev}"
SKIP_BUILD=false
AUTO_APPROVE="-auto-approve"  # Default to auto-approve for fast iteration

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
Deploy Infrastructure Lambda

This script builds and deploys infrastructure Lambdas (like the authorizer).

**NOT for functional module Lambdas** - Use deploy-lambda-functional.sh instead.

Usage: $0 <lambda-name> [OPTIONS]

Arguments:
  lambda-name         Name of the Lambda to deploy. Currently supported:
                      - authorizer (API Gateway authorizer)

Options:
  --env <env>         Target environment (dev, stg, prd) - default: dev
  --skip-build        Skip build step (use existing zip)
  --no-auto-approve   Require manual Terraform approval
  --help              Show this help message

Examples:
  # Build and deploy authorizer Lambda
  $0 authorizer

  # Deploy to staging
  $0 authorizer --env stg

EOF
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
    --no-auto-approve)
      AUTO_APPROVE=""
      shift
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
TERRAFORM_TARGET=""

if [[ "$LAMBDA_NAME" == "authorizer" ]]; then
  LAMBDA_DIR="${INFRA_ROOT}/lambdas/api-gateway-authorizer"
  TERRAFORM_TARGET="aws_lambda_function.authorizer"
else
  log_error "Unknown infrastructure Lambda: $LAMBDA_NAME"
  log_info "Supported infrastructure Lambdas: authorizer"
  log_info ""
  log_info "If you're trying to deploy a functional module Lambda (module-eval, module-kb, etc.),"
  log_info "use deploy-lambda-functional.sh instead."
  exit 1
fi

if [[ ! -d "$LAMBDA_DIR" ]]; then
  log_error "Lambda directory not found: $LAMBDA_DIR"
  exit 1
fi

# --- Main Script ---
echo "========================================"
echo "  Deploy Infrastructure Lambda"
echo "========================================"
echo ""
log_info "Lambda:      ${LAMBDA_NAME}"
log_info "Environment: ${ENVIRONMENT}"
log_info "Lambda Dir:  ${LAMBDA_DIR}"
echo ""

# Step 1: Build
if [[ "$SKIP_BUILD" == "false" ]]; then
  log_step "Step 1/2: Building Lambda..."
  
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

# Step 2: Deploy via Terraform
log_step "Step 2/2: Deploying via Terraform..."

cd "${INFRA_ROOT}/envs/${ENVIRONMENT}"

log_info "Running terraform apply for: ${TERRAFORM_TARGET}"
log_info "(Terraform will detect code changes via source_code_hash)"

if [[ -f "local-secrets.tfvars" ]]; then
  terraform apply -target="${TERRAFORM_TARGET}" -var-file=local-secrets.tfvars ${AUTO_APPROVE}
else
  terraform apply -target="${TERRAFORM_TARGET}" ${AUTO_APPROVE}
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
log_info "  • Check CloudWatch logs: /aws/lambda/${PROJECT_NAME:-ai-sec}-${ENVIRONMENT}-api-gateway-authorizer"
echo ""
