#!/bin/bash

# Ensure S3 Buckets Exist
# Creates S3 buckets for Lambda artifacts and Terraform state if they don't exist
#
# Usage: ./ensure-buckets.sh [OPTIONS]

set -e

# --- Configuration ---
PROJECT_NAME="{{PROJECT_NAME}}"
AWS_REGION="${AWS_REGION:-{{AWS_REGION}}}"
AWS_PROFILE="${AWS_PROFILE:-default}"

LAMBDA_BUCKET="${PROJECT_NAME}-lambda-artifacts"
STATE_BUCKET="${PROJECT_NAME}-terraform-state-${AWS_REGION}"
BOOTSTRAP_STATE=false

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
Ensure S3 Buckets Exist

Usage: $0 [OPTIONS]

Creates S3 buckets for Lambda artifacts and Terraform state if they don't already exist.

Options:
  --lambda-bucket <name>  Override Lambda artifacts bucket name (default: ${LAMBDA_BUCKET})
  --bootstrap-state       Also bootstrap Terraform state (calls bootstrap_tf_state.sh)
  --help                  Show this help message

Environment Variables:
  AWS_PROFILE             AWS profile to use (default: default)
  AWS_REGION              AWS region (default: {{AWS_REGION}})

Examples:
  $0
  $0 --lambda-bucket my-custom-lambda-bucket
  AWS_PROFILE=myprofile $0

EOF
}

# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
  case $1 in
    --lambda-bucket)
      LAMBDA_BUCKET="$2"
      shift 2
      ;;
    --bootstrap-state)
      BOOTSTRAP_STATE=true
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
echo "========================================"
echo "  Ensure S3 Buckets Exist"
echo "========================================"
echo ""
log_info "Project:            ${PROJECT_NAME}"
log_info "AWS Profile:        ${AWS_PROFILE}"
log_info "AWS Region:         ${AWS_REGION}"
log_info "Lambda Bucket:      ${LAMBDA_BUCKET}"
log_info "Bootstrap TF State: ${BOOTSTRAP_STATE}"
echo ""

export AWS_PROFILE
export AWS_REGION

# Function to check if bucket exists
bucket_exists() {
  local bucket_name=$1
  aws s3api head-bucket --bucket "${bucket_name}" 2>/dev/null
  return $?
}

# Function to create bucket with proper configuration
create_bucket() {
  local bucket_name=$1
  local bucket_type=$2
  
  log_info "Creating ${bucket_type} bucket: ${bucket_name}..."
  
  # Create bucket (different syntax for us-east-1 vs other regions)
  if [ "${AWS_REGION}" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "${bucket_name}"
  else
    aws s3api create-bucket \
      --bucket "${bucket_name}" \
      --create-bucket-configuration LocationConstraint="${AWS_REGION}"
  fi
  
  # Enable versioning for state bucket
  if [ "${bucket_type}" = "Terraform state" ]; then
    log_info "Enabling versioning on ${bucket_name}..."
    aws s3api put-bucket-versioning \
      --bucket "${bucket_name}" \
      --versioning-configuration Status=Enabled
  fi
  
  # Enable server-side encryption
  log_info "Enabling encryption on ${bucket_name}..."
  aws s3api put-bucket-encryption \
    --bucket "${bucket_name}" \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }]
    }'
  
  # Block public access
  log_info "Blocking public access on ${bucket_name}..."
  aws s3api put-public-access-block \
    --bucket "${bucket_name}" \
    --public-access-block-configuration \
      "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
  
  log_info "✅ ${bucket_type} bucket created: ${bucket_name}"
}

# --- Bootstrap Terraform State (Optional) ---
if [ "${BOOTSTRAP_STATE}" = true ]; then
  log_info "Bootstrapping Terraform state backend..."
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  
  if [ -f "${SCRIPT_DIR}/bootstrap_tf_state.sh" ]; then
    bash "${SCRIPT_DIR}/bootstrap_tf_state.sh"
  else
    log_error "bootstrap_tf_state.sh not found in ${SCRIPT_DIR}"
    exit 1
  fi
  echo ""
fi

# --- Create Lambda Artifacts Bucket ---
if bucket_exists "${LAMBDA_BUCKET}"; then
  log_info "✅ Lambda artifacts bucket already exists: ${LAMBDA_BUCKET}"
else
  create_bucket "${LAMBDA_BUCKET}" "Lambda artifacts"
fi

echo ""
echo "========================================"
echo "  Bootstrap Complete"
echo "========================================"
echo ""
log_info "Lambda artifacts bucket: s3://${LAMBDA_BUCKET}"

if [ "${BOOTSTRAP_STATE}" = true ]; then
  log_info "Terraform state bucket:  s3://${STATE_BUCKET}"
  log_info "DynamoDB lock table:     ${PROJECT_NAME}-terraform-locks"
fi

echo ""
log_info "Next steps:"
if [ "${BOOTSTRAP_STATE}" = false ]; then
  echo "  1. Run ./bootstrap/bootstrap_tf_state.sh to set up Terraform state backend"
  echo "  2. Run scripts/build-cora-modules.sh to build Lambda functions"
  echo "  3. Run scripts/deploy-cora-modules.sh to upload to S3"
  echo "  4. Run scripts/deploy-terraform.sh to deploy infrastructure"
else
  echo "  1. Run scripts/build-cora-modules.sh to build Lambda functions"
  echo "  2. Run scripts/deploy-cora-modules.sh to upload to S3"
  echo "  3. Run scripts/deploy-terraform.sh to deploy infrastructure"
fi
echo ""
