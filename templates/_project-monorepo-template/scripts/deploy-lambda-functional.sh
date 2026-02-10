#!/bin/bash

# Deploy Functional Module Lambda - Build and deploy a functional module Lambda
# Specifically for functional module Lambdas (module-eval, module-kb, module-chat, etc.)
#
# Usage: ./deploy-lambda-functional.sh <module-name>/<lambda-name> [OPTIONS]

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
Deploy Functional Module Lambda

This script builds and deploys functional module Lambdas (module-eval, module-kb, etc.).

**NOT for infrastructure Lambdas** - Use deploy-lambda-infra.sh instead.

Usage: $0 <module>/<lambda> [OPTIONS]

Arguments:
  module/lambda       Module and Lambda name (e.g., module-eval/eval-processor)
                      Examples:
                        - module-eval/eval-processor
                        - module-kb/kb-document
                        - module-chat/chat-message

Options:
  --env <env>         Target environment (dev, stg, prd) - default: dev
  --skip-build        Skip build step (use existing zip)
  --no-auto-approve   Require manual Terraform approval
  --help              Show this help message

Examples:
  # Build and deploy eval-processor Lambda
  $0 module-eval/eval-processor

  # Deploy to staging
  $0 module-kb/kb-document --env stg

  # Skip build (use existing zips)
  $0 module-chat/chat-message --skip-build

Notes:
  - This script builds ALL Lambdas in the module (not just one)
  - The module's build.sh is in the stack repo
  - Deployment uses Terraform to update the Lambda

EOF
}

# --- Parse Arguments ---
LAMBDA_PATH=""

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
      if [[ -z "$LAMBDA_PATH" ]]; then
        LAMBDA_PATH="$1"
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
if [[ -z "$LAMBDA_PATH" ]]; then
  log_error "Lambda path is required"
  show_help
  exit 1
fi

if [[ ! "$LAMBDA_PATH" =~ ^module-[a-z]+/[a-z-]+$ ]]; then
  log_error "Invalid Lambda path format: $LAMBDA_PATH"
  log_info "Expected format: module-name/lambda-name (e.g., module-eval/eval-processor)"
  exit 1
fi

# --- Extract Module and Lambda Names ---
MODULE_NAME=$(echo "$LAMBDA_PATH" | cut -d'/' -f1)
LAMBDA_NAME=$(echo "$LAMBDA_PATH" | cut -d'/' -f2)

# --- Detect Stack Repo ---
PROJECT_NAME=$(basename "${INFRA_ROOT}" | sed 's/-infra$//')
STACK_REPO=$(cd "${INFRA_ROOT}/../${PROJECT_NAME}-stack" 2>/dev/null && pwd || echo "")

# Fallback to STACK_DIR environment variable
if [[ -z "${STACK_REPO}" || ! -d "${STACK_REPO}" ]]; then
  if [[ -n "${STACK_DIR}" ]]; then
    STACK_REPO="${STACK_DIR}"
  fi
fi

if [[ -z "${STACK_REPO}" || ! -d "${STACK_REPO}" ]]; then
  log_error "Stack repository not found"
  log_info "Expected at: ${INFRA_ROOT}/../${PROJECT_NAME}-stack"
  log_info "Or set STACK_DIR environment variable"
  exit 1
fi

MODULE_DIR="${STACK_REPO}/packages/${MODULE_NAME}"
if [[ ! -d "${MODULE_DIR}" ]]; then
  log_error "Module directory not found: ${MODULE_DIR}"
  exit 1
fi

# --- Main Script ---
echo "========================================"
echo "  Deploy Functional Module Lambda"
echo "========================================"
echo ""
log_info "Module:      ${MODULE_NAME}"
log_info "Lambda:      ${LAMBDA_NAME}"
log_info "Environment: ${ENVIRONMENT}"
log_info "Stack Repo:  ${STACK_REPO}"
echo ""

# Step 1: Build Module in Stack Repo
if [[ "$SKIP_BUILD" == "false" ]]; then
  log_step "Step 1/3: Building module in stack repo..."
  
  if [[ ! -f "${MODULE_DIR}/backend/build.sh" ]]; then
    log_error "Build script not found: ${MODULE_DIR}/backend/build.sh"
    exit 1
  fi
  
  log_info "Building ALL Lambdas in ${MODULE_NAME}..."
  cd "${MODULE_DIR}/backend"
  bash build.sh
  
  # Verify the specific Lambda was built
  if [[ ! -f ".build/${LAMBDA_NAME}.zip" ]]; then
    log_error "Lambda zip not found after build: .build/${LAMBDA_NAME}.zip"
    log_info "Build may have failed or Lambda name incorrect"
    exit 1
  fi
  
  log_info "✅ Built: .build/${LAMBDA_NAME}.zip"
  cd "${SCRIPT_DIR}"
  echo ""
else
  log_warn "Skipping build (--skip-build specified)"
  echo ""
fi

# Step 2: Copy Zips to Infra Build Directory
log_step "Step 2/3: Copying zips to infra build directory..."

BUILD_DIR="${INFRA_ROOT}/build/${MODULE_NAME}"
mkdir -p "${BUILD_DIR}"

log_info "Copying from: ${MODULE_DIR}/backend/.build/"
log_info "Copying to:   ${BUILD_DIR}/"

cp "${MODULE_DIR}/backend/.build/"*.zip "${BUILD_DIR}/"

log_info "✅ Copied $(ls -1 ${BUILD_DIR}/*.zip | wc -l) Lambda zips"
echo ""

# Step 3: Deploy via Terraform
log_step "Step 3/3: Deploying via Terraform..."

cd "${INFRA_ROOT}/envs/${ENVIRONMENT}"

# Convert module and lambda names to Terraform resource format
# e.g., module-eval/eval-processor -> module.module_eval.aws_lambda_function.eval_processor
MODULE_TF=$(echo "${MODULE_NAME}" | sed 's/-/_/g')
LAMBDA_TF=$(echo "${LAMBDA_NAME}" | sed 's/-/_/g')
TERRAFORM_TARGET="module.${MODULE_TF}.aws_lambda_function.${LAMBDA_TF}"

log_info "Terraform target: ${TERRAFORM_TARGET}"
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
log_info "Module:      ${MODULE_NAME}"
log_info "Lambda:      ${LAMBDA_NAME}"
log_info "Environment: ${ENVIRONMENT}"
echo ""
log_info "Next steps:"
log_info "  • Test the API endpoint"
log_info "  • Check CloudWatch logs: /aws/lambda/${PROJECT_NAME}-${ENVIRONMENT}-${MODULE_NAME#module-}-${LAMBDA_NAME}"
echo ""
