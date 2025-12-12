#!/bin/bash

# Build CORA Modules for {{PROJECT_NAME}}
# Builds Docker images for all CORA modules and pushes to ECR
#
# Usage: ./build-cora-modules.sh [OPTIONS]

set -e

# --- Configuration ---
PROJECT_NAME="${PROJECT_NAME:-{{PROJECT_NAME}}}"
AWS_REGION="${AWS_REGION:-{{AWS_REGION}}}"
AWS_PROFILE="${AWS_PROFILE:-default}"
STACK_DIR="${STACK_DIR:-../../{{PROJECT_NAME}}-stack}"

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
Build CORA Modules for {{PROJECT_NAME}}

Usage: $0 [OPTIONS]

Builds Docker images for all CORA modules in the stack repository
and pushes them to ECR.

Options:
  --module NAME       Build only the specified module
  --no-push           Build images but don't push to ECR
  --force             Force rebuild even if no changes
  --help              Show this help message

Environment Variables:
  PROJECT_NAME        Project name (default: {{PROJECT_NAME}})
  AWS_REGION          AWS region
  AWS_PROFILE         AWS profile to use
  STACK_DIR           Path to stack repository

Examples:
  $0
  $0 --module module-access
  $0 --no-push

EOF
}

# --- Parse Arguments ---
SINGLE_MODULE=""
NO_PUSH=false
FORCE_BUILD=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --module)
      SINGLE_MODULE="$2"
      shift 2
      ;;
    --no-push)
      NO_PUSH=true
      shift
      ;;
    --force)
      FORCE_BUILD=true
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

# --- Main Script ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Resolve stack directory
if [[ ! -d "${STACK_DIR}" ]]; then
  STACK_DIR="${INFRA_ROOT}/../${PROJECT_NAME}-stack"
fi

if [[ ! -d "${STACK_DIR}" ]]; then
  log_error "Stack directory not found: ${STACK_DIR}"
  exit 1
fi

echo "========================================"
echo "  CORA Module Build"
echo "========================================"
echo ""
log_info "Project:    ${PROJECT_NAME}"
log_info "AWS Region: ${AWS_REGION}"
log_info "Stack Dir:  ${STACK_DIR}"
echo ""

export AWS_PROFILE
export AWS_REGION

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Authenticate with ECR
log_info "Authenticating with ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_BASE_URI}

# Find CORA modules
MODULES_DIR="${STACK_DIR}/packages"
if [[ -n "${SINGLE_MODULE}" ]]; then
  MODULES=("${MODULES_DIR}/${SINGLE_MODULE}")
else
  MODULES=(${MODULES_DIR}/module-*)
fi

# Output file for image URIs
IMAGE_ENV_FILE="${INFRA_ROOT}/.cora-module-images.env"
> "${IMAGE_ENV_FILE}"

for MODULE_PATH in "${MODULES[@]}"; do
  if [[ ! -d "${MODULE_PATH}" ]]; then
    continue
  fi
  
  MODULE_NAME=$(basename "${MODULE_PATH}")
  DOCKERFILE="${MODULE_PATH}/backend/Dockerfile"
  
  if [[ ! -f "${DOCKERFILE}" ]]; then
    log_warn "No Dockerfile found for ${MODULE_NAME}, skipping"
    continue
  fi
  
  log_info "Building ${MODULE_NAME}..."
  
  # Create ECR repository if it doesn't exist
  REPO_NAME="${PROJECT_NAME}-${MODULE_NAME}"
  if ! aws ecr describe-repositories --repository-names "${REPO_NAME}" 2>/dev/null; then
    log_info "Creating ECR repository: ${REPO_NAME}"
    aws ecr create-repository --repository-name "${REPO_NAME}"
  fi
  
  # Build image
  IMAGE_TAG="${ECR_BASE_URI}/${REPO_NAME}:latest"
  
  docker build -t "${IMAGE_TAG}" -f "${DOCKERFILE}" "${MODULE_PATH}/backend"
  
  if ! $NO_PUSH; then
    log_info "Pushing ${MODULE_NAME} to ECR..."
    docker push "${IMAGE_TAG}"
    
    # Get image digest
    IMAGE_DIGEST=$(aws ecr describe-images \
      --repository-name "${REPO_NAME}" \
      --image-ids imageTag=latest \
      --query 'imageDetails[0].imageDigest' \
      --output text)
    
    # Store image URI with digest
    IMAGE_URI="${ECR_BASE_URI}/${REPO_NAME}@${IMAGE_DIGEST}"
    VAR_NAME="IMAGE_URI_$(echo ${MODULE_NAME} | tr '-' '_' | tr '[:lower:]' '[:upper:]')"
    echo "${VAR_NAME}=${IMAGE_URI}" >> "${IMAGE_ENV_FILE}"
    
    log_info "Built: ${IMAGE_URI}"
  fi
  
  echo ""
done

echo "========================================"
echo "  Build Complete"
echo "========================================"
echo ""

if ! $NO_PUSH; then
  log_info "Image URIs saved to: ${IMAGE_ENV_FILE}"
  log_info "Run ./deploy-cora-modules.sh to deploy"
fi
