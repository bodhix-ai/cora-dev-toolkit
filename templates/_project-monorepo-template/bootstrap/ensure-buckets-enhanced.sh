#!/bin/bash

# Ensure S3 Buckets Exist (Enhanced with AWS Profile Security)
# Creates S3 buckets for Lambda artifacts and Terraform state if they don't exist
#
# Usage: ./ensure-buckets.sh [OPTIONS]

set -e

# --- Configuration ---
PROJECT_NAME="{{PROJECT_NAME}}"
AWS_REGION="${AWS_REGION:-{{AWS_REGION}}}"

# Enhanced AWS Profile Handling
# Priority: 1) CLI flag, 2) Env var, 3) Project-specific profile, 4) Error (no default)
RECOMMENDED_PROFILE="${PROJECT_NAME}-terraform"
AWS_PROFILE="${AWS_PROFILE:-}"

LAMBDA_BUCKET="${PROJECT_NAME}-lambda-artifacts"
STATE_BUCKET="${PROJECT_NAME}-terraform-state-${AWS_REGION}"
BOOTSTRAP_STATE=false
SKIP_PROFILE_CHECK=false

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_security() { echo -e "${BLUE}[SECURITY]${NC} $1"; }

show_help() {
  cat << EOF
Ensure S3 Buckets Exist (Enhanced Security)

Usage: $0 [OPTIONS]

Creates S3 buckets for Lambda artifacts and Terraform state if they don't already exist.

Options:
  --profile <name>        AWS profile to use (recommended: ${RECOMMENDED_PROFILE})
  --lambda-bucket <name>  Override Lambda artifacts bucket name (default: ${LAMBDA_BUCKET})
  --bootstrap-state       Also bootstrap Terraform state (calls bootstrap_tf_state.sh)
  --skip-profile-check    Skip AWS profile security validation (NOT RECOMMENDED)
  --help                  Show this help message

Environment Variables:
  AWS_PROFILE             AWS profile to use
  AWS_REGION              AWS region (default: {{AWS_REGION}})

Security Best Practices:
  ⚠️  DO NOT use admin or SSO profiles for Terraform deployments
  ✅  Create a dedicated IAM role with minimal permissions
  ✅  Use a profile like: ${RECOMMENDED_PROFILE}

Examples:
  # Use recommended profile
  $0 --profile ${RECOMMENDED_PROFILE}
  
  # Set via environment variable
  AWS_PROFILE=${RECOMMENDED_PROFILE} $0
  
  # Bootstrap state backend too
  $0 --profile ${RECOMMENDED_PROFILE} --bootstrap-state

Setup Instructions:
  1. Create IAM role: ${PROJECT_NAME}-terraform-deployer
  2. Attach minimal permissions policy (see docs/ai-sec-setup-guide.md)
  3. Configure AWS profile in ~/.aws/config:
     
     [profile ${RECOMMENDED_PROFILE}]
     role_arn = arn:aws:iam::YOUR_ACCOUNT_ID:role/${PROJECT_NAME}-terraform-deployer
     source_profile = default
     region = ${AWS_REGION}

EOF
}

# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
  case $1 in
    --profile)
      AWS_PROFILE="$2"
      shift 2
      ;;
    --lambda-bucket)
      LAMBDA_BUCKET="$2"
      shift 2
      ;;
    --bootstrap-state)
      BOOTSTRAP_STATE=true
      shift
      ;;
    --skip-profile-check)
      SKIP_PROFILE_CHECK=true
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

# --- AWS Profile Security Validation ---
validate_aws_profile() {
  # Check if profile is set
  if [ -z "${AWS_PROFILE}" ]; then
    log_error "No AWS profile specified!"
    echo ""
    log_security "For security, you must explicitly specify an AWS profile."
    log_security "Recommended: --profile ${RECOMMENDED_PROFILE}"
    echo ""
    echo "Options:"
    echo "  1. Use CLI flag:        $0 --profile ${RECOMMENDED_PROFILE}"
    echo "  2. Set environment var: export AWS_PROFILE=${RECOMMENDED_PROFILE}"
    echo ""
    echo "Available profiles:"
    aws configure list-profiles 2>/dev/null | sed 's/^/    - /' || echo "    (none found)"
    echo ""
    log_info "See docs/ai-sec-setup-guide.md for AWS profile setup instructions"
    exit 1
  fi
  
  # Validate profile exists
  if ! aws configure list-profiles 2>/dev/null | grep -q "^${AWS_PROFILE}$"; then
    log_error "AWS profile '${AWS_PROFILE}' not found in ~/.aws/config"
    echo ""
    echo "Available profiles:"
    aws configure list-profiles 2>/dev/null | sed 's/^/  - /' || echo "  (none found)"
    echo ""
    log_info "Create the profile or choose an existing one"
    exit 1
  fi
  
  # Warn about admin/risky profiles
  local profile_lower=$(echo "${AWS_PROFILE}" | tr '[:upper:]' '[:lower:]')
  if [[ "${profile_lower}" =~ (admin|root|master|sso) ]]; then
    log_warn "⚠️  SECURITY WARNING ⚠️"
    log_warn "You are using profile: ${AWS_PROFILE}"
    log_warn "This appears to be an admin or high-privilege profile."
    echo ""
    log_security "Best Practice: Use a dedicated Terraform profile with minimal permissions"
    log_security "Recommended profile name: ${RECOMMENDED_PROFILE}"
    echo ""
    
    if [ "${SKIP_PROFILE_CHECK}" = false ]; then
      read -p "Continue anyway? (yes/no): " -r
      if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Aborted. Please create a dedicated Terraform profile."
        log_info "See: docs/ai-sec-setup-guide.md - AWS Profile Configuration"
        exit 1
      fi
    fi
  fi
  
  # Validate credentials work
  log_info "Validating AWS credentials for profile: ${AWS_PROFILE}..."
  if ! aws sts get-caller-identity --profile "${AWS_PROFILE}" >/dev/null 2>&1; then
    log_error "Failed to validate AWS credentials for profile: ${AWS_PROFILE}"
    log_error "Check that:"
    echo "  1. Profile is correctly configured in ~/.aws/config"
    echo "  2. Credentials are valid (not expired)"
    echo "  3. You have network access to AWS"
    exit 1
  fi
  
  # Show caller identity
  local identity=$(aws sts get-caller-identity --profile "${AWS_PROFILE}" 2>/dev/null)
  local account=$(echo "${identity}" | jq -r '.Account' 2>/dev/null || echo "unknown")
  local arn=$(echo "${identity}" | jq -r '.Arn' 2>/dev/null || echo "unknown")
  
  log_info "✅ Authenticated as:"
  echo "     Account: ${account}"
  echo "     ARN:     ${arn}"
}

# Function to check if bucket exists
bucket_exists() {
  local bucket_name=$1
  aws s3api head-bucket --bucket "${bucket_name}" --profile "${AWS_PROFILE}" 2>/dev/null
  return $?
}

# Function to create bucket with proper configuration
create_bucket() {
  local bucket_name=$1
  local bucket_type=$2
  
  log_info "Creating ${bucket_type} bucket: ${bucket_name}..."
  
  # Create bucket (different syntax for us-east-1 vs other regions)
  if [ "${AWS_REGION}" = "us-east-1" ]; then
    aws s3api create-bucket \
      --bucket "${bucket_name}" \
      --profile "${AWS_PROFILE}"
  else
    aws s3api create-bucket \
      --bucket "${bucket_name}" \
      --create-bucket-configuration LocationConstraint="${AWS_REGION}" \
      --profile "${AWS_PROFILE}"
  fi
  
  # Enable versioning for state bucket
  if [ "${bucket_type}" = "Terraform state" ]; then
    log_info "Enabling versioning on ${bucket_name}..."
    aws s3api put-bucket-versioning \
      --bucket "${bucket_name}" \
      --versioning-configuration Status=Enabled \
      --profile "${AWS_PROFILE}"
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
    }' \
    --profile "${AWS_PROFILE}"
  
  # Block public access
  log_info "Blocking public access on ${bucket_name}..."
  aws s3api put-public-access-block \
    --bucket "${bucket_name}" \
    --public-access-block-configuration \
      "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
    --profile "${AWS_PROFILE}"
  
  log_info "✅ ${bucket_type} bucket created: ${bucket_name}"
}

# --- Main Script ---
echo "========================================"
echo "  Ensure S3 Buckets Exist"
echo "========================================"
echo ""

# Validate AWS profile first
if [ "${SKIP_PROFILE_CHECK}" = false ]; then
  validate_aws_profile
  echo ""
fi

log_info "Project:            ${PROJECT_NAME}"
log_info "AWS Profile:        ${AWS_PROFILE}"
log_info "AWS Region:         ${AWS_REGION}"
log_info "Lambda Bucket:      ${LAMBDA_BUCKET}"
log_info "Bootstrap TF State: ${BOOTSTRAP_STATE}"
echo ""

export AWS_PROFILE
export AWS_REGION

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
