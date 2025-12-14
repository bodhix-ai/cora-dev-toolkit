#!/usr/bin/env bash
# Deploy CORA Modules (Zip-Based Deployment)
# Uploads Lambda zip packages to S3 for Terraform consumption
#
# Usage: ./deploy-cora-modules.sh [--bucket <name>]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
PROJECT_NAME="{{PROJECT_NAME}}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BUILD_DIR="${INFRA_ROOT}/build"
ENVIRONMENT="${1:-dev}"  # First positional arg: dev, tst, stg, prd

# Environment-specific S3 bucket naming
# Pattern: {project}-{env}-lambda-artifacts
S3_BUCKET="${S3_BUCKET:-${PROJECT_NAME}-${ENVIRONMENT}-lambda-artifacts}"

# Load AWS profile from .env if available
if [ -f "${INFRA_ROOT}/.env" ]; then
  source "${INFRA_ROOT}/.env"
fi

# Environment-specific AWS profile
# dev/stg -> nonprod profile, prd -> prod profile
if [ "${ENVIRONMENT}" = "prd" ]; then
  AWS_PROFILE="${AWS_PROFILE:-${PROJECT_NAME}-prod}"
else
  AWS_PROFILE="${AWS_PROFILE:-${PROJECT_NAME}-nonprod}"
fi
AWS_REGION="${AWS_REGION:-us-east-1}"

# Shift off the environment arg if it was provided
if [[ "${1:-}" =~ ^(dev|tst|stg|prd)$ ]]; then
  shift
fi

# Parse remaining arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --bucket)
      S3_BUCKET="$2"
      shift 2
      ;;
    --profile)
      AWS_PROFILE="$2"
      shift 2
      ;;
    --region)
      AWS_REGION="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [dev|tst|stg|prd] [--bucket <name>] [--profile <profile>] [--region <region>]"
      echo ""
      echo "Deploy Lambda zip packages to S3 for a specific environment"
      echo ""
      echo "Arguments:"
      echo "  dev|tst|stg|prd    Target environment (default: dev)"
      echo ""
      echo "Options:"
      echo "  --bucket <name>    S3 bucket name (default: ${PROJECT_NAME}-{env}-lambda-artifacts)"
      echo "  --profile <name>   AWS profile (default: auto-detected from env)"
      echo "  --region <name>    AWS region (default: us-east-1)"
      echo "  --help             Show this help"
      echo ""
      echo "Examples:"
      echo "  $0 dev             Deploy to dev environment"
      echo "  $0 tst             Deploy to test environment"
      echo "  $0 stg             Deploy to staging environment"
      echo "  $0 prd             Deploy to production environment"
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "========================================"
echo "  CORA Module Deploy (Zip-Based)"
echo "========================================"
echo ""
log_info "Project:     ${PROJECT_NAME}"
log_info "Environment: ${ENVIRONMENT}"
log_info "S3 Bucket:   ${S3_BUCKET}"
log_info "AWS Region:  ${AWS_REGION}"
log_info "AWS Profile: ${AWS_PROFILE}"
echo ""

# Check if build directory exists
if [ ! -d "${BUILD_DIR}" ]; then
  log_error "Build directory not found: ${BUILD_DIR}"
  log_error "Run ./build-cora-modules.sh first"
  exit 1
fi

# Check if bucket exists, create if not
if ! aws s3 ls "s3://${S3_BUCKET}" --profile "${AWS_PROFILE}" --region "${AWS_REGION}" >/dev/null 2>&1; then
  log_info "Creating S3 bucket: ${S3_BUCKET}"
  aws s3 mb "s3://${S3_BUCKET}" --profile "${AWS_PROFILE}" --region "${AWS_REGION}"
fi

# Upload each module's artifacts
for module_dir in "${BUILD_DIR}"/module-*; do
  if [ ! -d "${module_dir}" ]; then
    continue
  fi
  
  module_name=$(basename "${module_dir}")
  log_info "Uploading ${module_name} artifacts..."
  
  # Upload layer zips to s3://bucket/layers/
  for layer_zip in "${module_dir}"/*-layer.zip; do
    if [ -f "${layer_zip}" ]; then
      layer_name=$(basename "${layer_zip}")
      log_info "  → layers/${layer_name}"
      aws s3 cp "${layer_zip}" "s3://${S3_BUCKET}/layers/${layer_name}" \
        --profile "${AWS_PROFILE}" --region "${AWS_REGION}"
    fi
  done
  
  # Upload Lambda function zips to s3://bucket/lambdas/
  for lambda_zip in "${module_dir}"/*.zip; do
    if [ -f "${lambda_zip}" ] && [[ ! "${lambda_zip}" =~ -layer\.zip$ ]]; then
      lambda_name=$(basename "${lambda_zip}")
      log_info "  → lambdas/${lambda_name}"
      aws s3 cp "${lambda_zip}" "s3://${S3_BUCKET}/lambdas/${lambda_name}" \
        --profile "${AWS_PROFILE}" --region "${AWS_REGION}"
    fi
  done
done

echo ""
echo "========================================"
echo "  Deploy Complete"
echo "========================================"
echo ""
log_info "Artifacts uploaded to: s3://${S3_BUCKET}"
log_info "Run terraform to provision infrastructure"
log_info ""
log_info "Next steps:"
log_info "  cd envs/dev"
log_info "  terraform init"
log_info "  terraform plan -var-file=local-secrets.tfvars"
log_info "  terraform apply -var-file=local-secrets.tfvars"
