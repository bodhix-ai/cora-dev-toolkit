#!/bin/bash

# Bootstrap Terraform State Backend
# Creates S3 bucket and DynamoDB table for Terraform state management
#
# Usage: ./bootstrap_tf_state.sh [OPTIONS]
#
# This script should be run once when setting up a new CORA project.

set -e

# --- Configuration ---
PROJECT_NAME="${PROJECT_NAME:-{{PROJECT_NAME}}}"
AWS_REGION="${AWS_REGION:-{{AWS_REGION}}}"
AWS_PROFILE="${AWS_PROFILE:-default}"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# --- Functions ---
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
  cat << EOF
Bootstrap Terraform State Backend

Usage: $0 [OPTIONS]

Creates the S3 bucket and DynamoDB table required for Terraform state management.

Options:
  --project-name NAME    Project name (default: ${PROJECT_NAME})
  --region REGION        AWS region (default: ${AWS_REGION})
  --profile PROFILE      AWS profile (default: ${AWS_PROFILE})
  --dry-run              Show what would be created without making changes
  --help                 Show this help message

Environment Variables:
  PROJECT_NAME           Project name
  AWS_REGION             AWS region
  AWS_PROFILE            AWS profile to use

Examples:
  $0 --project-name my-app --region us-east-1
  $0 --dry-run
  AWS_PROFILE=admin $0

EOF
}

# --- Parse Arguments ---
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --project-name)
      PROJECT_NAME="$2"
      shift 2
      ;;
    --region)
      AWS_REGION="$2"
      shift 2
      ;;
    --profile)
      AWS_PROFILE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
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

# --- Validate Configuration ---
if [[ "$PROJECT_NAME" == "{{PROJECT_NAME}}" ]]; then
  log_error "PROJECT_NAME is not set. Use --project-name or set PROJECT_NAME environment variable."
  exit 1
fi

if [[ "$AWS_REGION" == "{{AWS_REGION}}" ]]; then
  log_error "AWS_REGION is not set. Use --region or set AWS_REGION environment variable."
  exit 1
fi

# --- Derived Values ---
BUCKET_NAME="${PROJECT_NAME}-terraform-state-${AWS_REGION}"
DYNAMODB_TABLE="${PROJECT_NAME}-terraform-locks"

# --- Main Script ---
echo "=========================================="
echo "  Terraform State Bootstrap"
echo "=========================================="
echo ""
log_info "Project Name:    ${PROJECT_NAME}"
log_info "AWS Region:      ${AWS_REGION}"
log_info "AWS Profile:     ${AWS_PROFILE}"
log_info "S3 Bucket:       ${BUCKET_NAME}"
log_info "DynamoDB Table:  ${DYNAMODB_TABLE}"
echo ""

if $DRY_RUN; then
  log_warn "DRY RUN - No changes will be made"
  echo ""
fi

export AWS_PROFILE
export AWS_REGION

# --- Create S3 Bucket ---
log_info "Creating S3 bucket for Terraform state..."

if $DRY_RUN; then
  log_info "[DRY RUN] Would create bucket: ${BUCKET_NAME}"
else
  if aws s3api head-bucket --bucket "${BUCKET_NAME}" 2>/dev/null; then
    log_warn "Bucket ${BUCKET_NAME} already exists"
  else
    aws s3api create-bucket \
      --bucket "${BUCKET_NAME}" \
      --region "${AWS_REGION}" \
      $(if [ "${AWS_REGION}" != "us-east-1" ]; then echo "--create-bucket-configuration LocationConstraint=${AWS_REGION}"; fi)
    
    log_info "Created bucket: ${BUCKET_NAME}"
    
    # Enable versioning
    aws s3api put-bucket-versioning \
      --bucket "${BUCKET_NAME}" \
      --versioning-configuration Status=Enabled
    
    log_info "Enabled versioning on bucket"
    
    # Enable server-side encryption
    aws s3api put-bucket-encryption \
      --bucket "${BUCKET_NAME}" \
      --server-side-encryption-configuration '{
        "Rules": [{
          "ApplyServerSideEncryptionByDefault": {
            "SSEAlgorithm": "AES256"
          }
        }]
      }'
    
    log_info "Enabled server-side encryption"
    
    # Block public access
    aws s3api put-public-access-block \
      --bucket "${BUCKET_NAME}" \
      --public-access-block-configuration '{
        "BlockPublicAcls": true,
        "IgnorePublicAcls": true,
        "BlockPublicPolicy": true,
        "RestrictPublicBuckets": true
      }'
    
    log_info "Blocked public access"
  fi
fi

# --- Create DynamoDB Table ---
log_info "Creating DynamoDB table for state locking..."

if $DRY_RUN; then
  log_info "[DRY RUN] Would create table: ${DYNAMODB_TABLE}"
else
  if aws dynamodb describe-table --table-name "${DYNAMODB_TABLE}" 2>/dev/null; then
    log_warn "Table ${DYNAMODB_TABLE} already exists"
  else
    aws dynamodb create-table \
      --table-name "${DYNAMODB_TABLE}" \
      --attribute-definitions AttributeName=LockID,AttributeType=S \
      --key-schema AttributeName=LockID,KeyType=HASH \
      --billing-mode PAY_PER_REQUEST \
      --region "${AWS_REGION}"
    
    log_info "Created DynamoDB table: ${DYNAMODB_TABLE}"
    
    # Wait for table to be active
    log_info "Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name "${DYNAMODB_TABLE}"
    log_info "Table is now active"
  fi
fi

# --- Generate Backend Configuration ---
echo ""
log_info "Generating backend configuration..."

BACKEND_HCL="backend.hcl"

if $DRY_RUN; then
  log_info "[DRY RUN] Would generate ${BACKEND_HCL}:"
  echo ""
  cat << EOF
bucket         = "${BUCKET_NAME}"
key            = "terraform.tfstate"
region         = "${AWS_REGION}"
dynamodb_table = "${DYNAMODB_TABLE}"
encrypt        = true
EOF
else
  cat << EOF > "${BACKEND_HCL}"
bucket         = "${BUCKET_NAME}"
key            = "terraform.tfstate"
region         = "${AWS_REGION}"
dynamodb_table = "${DYNAMODB_TABLE}"
encrypt        = true
EOF
  log_info "Generated ${BACKEND_HCL}"
fi

# --- Summary ---
echo ""
echo "=========================================="
echo "  Bootstrap Complete"
echo "=========================================="
echo ""
log_info "Next steps:"
echo "  1. Copy ${BACKEND_HCL} to each environment directory (envs/dev/, envs/stg/, envs/prd/)"
echo "  2. Update the 'key' value for each environment:"
echo "     - dev: key = \"dev/terraform.tfstate\""
echo "     - stg: key = \"stg/terraform.tfstate\""
echo "     - prd: key = \"prd/terraform.tfstate\""
echo "  3. Run 'terraform init -backend-config=backend.hcl' in each environment"
echo ""
