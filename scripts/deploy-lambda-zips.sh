#!/usr/bin/env bash
# Deploy Lambda ZIP packages to S3
# Part of: CORA Module Build & Deployment Standardization (Phase 1)
# Purpose: Uploads zip-based Lambda deployments to S3 for Terraform consumption
#
# Usage: deploy-lambda-zips.sh --bucket <name> [OPTIONS]
#
# This script:
# 1. Uploads layer zips to s3://{bucket}/layers/
# 2. Uploads function zips to s3://{bucket}/lambdas/
# 3. Outputs S3 URIs for Terraform
# 4. Writes .cora-module-artifacts.env file
#
# Input: build/*/  (output from build-cora-modules.sh)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Configuration ---
S3_BUCKET=""
BUILD_DIR="build"
DRY_RUN=false
FORCE_UPLOAD=false
AWS_PROFILE="${AWS_PROFILE:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# --- Parse Arguments ---
show_help() {
  cat << EOF
Usage: $(basename "$0") --bucket <name> [OPTIONS]

Deploy Lambda ZIP packages to S3 for Terraform consumption.

Required:
  --bucket <name>         S3 bucket name for Lambda artifacts

Options:
  --build-dir <path>      Build directory (default: build/)
  --force-upload          Force upload even if files unchanged
  --dry-run              Show what would be uploaded without uploading
  --profile <name>        AWS profile to use (default: \$AWS_PROFILE)
  --region <name>         AWS region (default: us-east-1)
  --help                 Show this help message

Examples:
  # Deploy all built modules
  $(basename "$0") --bucket pm-app-lambda-artifacts

  # Dry run to see what would be uploaded
  $(basename "$0") --bucket pm-app-lambda-artifacts --dry-run

  # Force upload with specific profile
  $(basename "$0") --bucket pm-app-lambda-artifacts --force-upload --profile policy-admin

Environment Variables:
  AWS_PROFILE            AWS profile to use
  AWS_REGION             AWS region (default: us-east-1)

Input Structure (from build-cora-modules.sh):
  build/
  ├── module-ai/
  │   ├── common-ai.zip              → s3://bucket/layers/common-ai.zip
  │   ├── ai-config-handler.zip      → s3://bucket/lambdas/ai-config-handler.zip
  │   └── provider.zip               → s3://bucket/lambdas/provider.zip
  └── module-mgmt/
      ├── common-mgmt.zip            → s3://bucket/layers/common-mgmt.zip
      └── lambda-mgmt.zip            → s3://bucket/lambdas/lambda-mgmt.zip

Output:
  .cora-module-artifacts.env - Environment variables for Terraform
    LAYER_S3_KEY_MODULE_AI=layers/common-ai.zip
    LAMBDA_S3_KEY_AI_CONFIG_HANDLER=lambdas/ai-config-handler.zip
    LAMBDA_S3_KEY_PROVIDER=lambdas/provider.zip
    ...

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --bucket)
      S3_BUCKET="$2"
      shift 2
      ;;
    --build-dir)
      BUILD_DIR="$2"
      shift 2
      ;;
    --force-upload)
      FORCE_UPLOAD=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
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
      show_help
      exit 0
      ;;
    *)
      echo -e "${RED}ERROR: Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# --- Logging Functions ---
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_section() {
  echo ""
  echo -e "${CYAN}========================================${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}========================================${NC}"
}

# --- Validation ---

if [ -z "$S3_BUCKET" ]; then
  log_error "--bucket is required"
  echo "Use --help for usage information"
  exit 1
fi

if [ ! -d "$BUILD_DIR" ]; then
  log_error "Build directory not found: ${BUILD_DIR}"
  echo ""
  echo "Run build-cora-modules.sh first to create build artifacts"
  exit 1
fi

# Check if build directory has any modules
MODULE_COUNT=$(find "$BUILD_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
if [ "$MODULE_COUNT" -eq 0 ]; then
  log_error "No modules found in ${BUILD_DIR}"
  echo ""
  echo "Run build-cora-modules.sh first to create build artifacts"
  exit 1
fi

# --- AWS Configuration ---

log_section "Lambda ZIP Deployment to S3"
echo "S3 Bucket: ${S3_BUCKET}"
echo "Build Directory: ${BUILD_DIR}"
echo "AWS Region: ${AWS_REGION}"
if [ -n "$AWS_PROFILE" ]; then
  echo "AWS Profile: ${AWS_PROFILE}"
fi
echo "Dry Run: ${DRY_RUN}"
echo "Force Upload: ${FORCE_UPLOAD}"
echo ""

# Set AWS CLI options
AWS_OPTS=""
if [ -n "$AWS_PROFILE" ]; then
  AWS_OPTS="--profile $AWS_PROFILE"
fi
AWS_OPTS="$AWS_OPTS --region $AWS_REGION"

# Verify AWS credentials
if [ "$DRY_RUN" = false ]; then
  log_info "Verifying AWS credentials..."
  if ! aws sts get-caller-identity $AWS_OPTS > /dev/null 2>&1; then
    log_error "AWS credentials not configured or invalid"
    exit 1
  fi
  log_success "AWS credentials verified"
  echo ""
fi

# Check if S3 bucket exists
if [ "$DRY_RUN" = false ]; then
  log_info "Checking S3 bucket: ${S3_BUCKET}"
  if ! aws s3api head-bucket --bucket "$S3_BUCKET" $AWS_OPTS 2>/dev/null; then
    log_error "S3 bucket does not exist or is not accessible: ${S3_BUCKET}"
    echo ""
    echo "Create the bucket first:"
    echo "  aws s3 mb s3://${S3_BUCKET} --region ${AWS_REGION}"
    exit 1
  fi
  log_success "S3 bucket exists and is accessible"
  echo ""
fi

# --- Upload Functions ---

# Calculate S3 ETag for local file
calculate_etag() {
  local file=$1
  local md5=$(md5 -q "$file" 2>/dev/null || md5sum "$file" 2>/dev/null | awk '{print $1}')
  echo "$md5"
}

# Check if file needs upload (compare with S3 ETag)
needs_upload() {
  local local_file=$1
  local s3_key=$2
  
  if [ "$FORCE_UPLOAD" = true ]; then
    return 0  # true - needs upload
  fi
  
  # Get S3 ETag
  local s3_etag=$(aws s3api head-object --bucket "$S3_BUCKET" --key "$s3_key" $AWS_OPTS --query 'ETag' --output text 2>/dev/null | tr -d '"')
  
  if [ -z "$s3_etag" ]; then
    return 0  # true - file doesn't exist in S3
  fi
  
  # Get local file hash
  local local_etag=$(calculate_etag "$local_file")
  
  if [ "$local_etag" = "$s3_etag" ]; then
    return 1  # false - files match
  else
    return 0  # true - files differ
  fi
}

# Upload file to S3
upload_file() {
  local local_file=$1
  local s3_key=$2
  local file_type=$3  # "layer" or "lambda"
  
  local file_name=$(basename "$local_file")
  local file_size=$(du -h "$local_file" | awk '{print $1}')
  
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would upload: ${file_name} → s3://${S3_BUCKET}/${s3_key}"
    return 0
  fi
  
  # Check if upload is needed
  if needs_upload "$local_file" "$s3_key"; then
    log_info "Uploading ${file_name} (${file_size})..."
    
    if aws s3 cp "$local_file" "s3://${S3_BUCKET}/${s3_key}" $AWS_OPTS --quiet; then
      log_success "Uploaded: ${file_name} → s3://${S3_BUCKET}/${s3_key}"
      return 0
    else
      log_error "Failed to upload: ${file_name}"
      return 1
    fi
  else
    log_success "Unchanged: ${file_name} (skipping upload)"
    return 0
  fi
}

# --- Process Modules ---

UPLOADED_LAYERS=()
UPLOADED_LAMBDAS=()
SKIPPED_FILES=()
FAILED_UPLOADS=()
TERRAFORM_VARS=()

log_section "Processing Build Artifacts"
echo ""

# Process each module directory
for module_dir in "$BUILD_DIR"/*/; do
  if [ ! -d "$module_dir" ]; then
    continue
  fi
  
  module_name=$(basename "$module_dir")
  log_info "Processing module: ${module_name}"
  
  # Process all zip files in module directory
  for zip_file in "$module_dir"/*.zip; do
    if [ ! -f "$zip_file" ]; then
      continue
    fi
    
    zip_name=$(basename "$zip_file")
    
    # Determine if this is a layer or lambda based on naming convention
    if [[ "$zip_name" == common-* ]]; then
      # This is a layer
      s3_key="layers/${zip_name}"
      file_type="layer"
      
      # Generate Terraform variable name
      # common-ai.zip → LAYER_S3_KEY_AI
      layer_suffix=$(echo "$zip_name" | sed 's/common-//' | sed 's/.zip$//' | tr '[:lower:]-' '[:upper:]_')
      var_name="LAYER_S3_KEY_${layer_suffix}"
      
    else
      # This is a lambda function
      s3_key="lambdas/${zip_name}"
      file_type="lambda"
      
      # Generate Terraform variable name
      # ai-config-handler.zip → LAMBDA_S3_KEY_AI_CONFIG_HANDLER
      lambda_name=$(echo "$zip_name" | sed 's/.zip$//' | tr '[:lower:]-' '[:upper:]_')
      var_name="LAMBDA_S3_KEY_${lambda_name}"
    fi
    
    # Upload file
    if upload_file "$zip_file" "$s3_key" "$file_type"; then
      if [ "$DRY_RUN" = false ]; then
        if [[ "$file_type" == "layer" ]]; then
          UPLOADED_LAYERS+=("$zip_name")
        else
          UPLOADED_LAMBDAS+=("$zip_name")
        fi
      fi
      
      # Store Terraform variable
      TERRAFORM_VARS+=("${var_name}=${s3_key}")
    else
      FAILED_UPLOADS+=("$zip_name")
    fi
  done
  
  echo ""
done

# --- Upload Summary ---

log_section "Upload Summary"
echo ""

if [ ${#UPLOADED_LAYERS[@]} -gt 0 ]; then
  echo -e "${GREEN}✓ Layers uploaded (${#UPLOADED_LAYERS[@]}):${NC}"
  for layer in "${UPLOADED_LAYERS[@]}"; do
    echo "  - ${layer}"
  done
  echo ""
fi

if [ ${#UPLOADED_LAMBDAS[@]} -gt 0 ]; then
  echo -e "${GREEN}✓ Lambdas uploaded (${#UPLOADED_LAMBDAS[@]}):${NC}"
  for lambda in "${UPLOADED_LAMBDAS[@]}"; do
    echo "  - ${lambda}"
  done
  echo ""
fi

if [ ${#FAILED_UPLOADS[@]} -gt 0 ]; then
  echo -e "${RED}✗ Failed uploads (${#FAILED_UPLOADS[@]}):${NC}"
  for file in "${FAILED_UPLOADS[@]}"; do
    echo "  - ${file}"
  done
  echo ""
  exit 1
fi

# --- Generate Terraform Variables ---

if [ "$DRY_RUN" = false ] && [ ${#TERRAFORM_VARS[@]} -gt 0 ]; then
  ENV_FILE=".cora-module-artifacts.env"
  
  log_section "Terraform Variables"
  echo ""
  
  echo "# CORA Module Artifacts - S3 Keys" > "$ENV_FILE"
  echo "# Generated: $(date)" >> "$ENV_FILE"
  echo "# Bucket: ${S3_BUCKET}" >> "$ENV_FILE"
  echo "# Region: ${AWS_REGION}" >> "$ENV_FILE"
  echo "" >> "$ENV_FILE"
  echo "S3_BUCKET=${S3_BUCKET}" >> "$ENV_FILE"
  echo "" >> "$ENV_FILE"
  
  for var in "${TERRAFORM_VARS[@]}"; do
    echo "$var" >> "$ENV_FILE"
  done
  
  log_success "Terraform variables written to: ${ENV_FILE}"
  echo ""
  
  echo -e "${BLUE}To use in Terraform:${NC}"
  echo ""
  echo "  # Load environment variables"
  echo "  source .cora-module-artifacts.env"
  echo ""
  echo "  # In Terraform:"
  echo "  terraform apply -var=\"lambda_bucket=\${S3_BUCKET}\" \\"
  echo "                  -var=\"layer_s3_key=\${LAYER_S3_KEY_AI}\" \\"
  echo "                  -var=\"lambda_s3_key=\${LAMBDA_S3_KEY_PROVIDER}\""
  echo ""
  
  echo -e "${BLUE}All variables:${NC}"
  cat "$ENV_FILE" | grep -v '^#' | grep -v '^$'
  echo ""
fi

# --- Final Output ---

if [ "$DRY_RUN" = true ]; then
  echo -e "${BLUE}ℹ Dry run complete. No files were uploaded.${NC}"
  echo ""
else
  total_uploaded=$((${#UPLOADED_LAYERS[@]} + ${#UPLOADED_LAMBDAS[@]}))
  echo -e "${GREEN}✅ DEPLOYMENT COMPLETE: ${total_uploaded} artifact(s) uploaded to S3.${NC}"
  echo ""
  echo "S3 Bucket: s3://${S3_BUCKET}"
  echo "  - Layers: s3://${S3_BUCKET}/layers/"
  echo "  - Lambdas: s3://${S3_BUCKET}/lambdas/"
  echo ""
  echo "Next step: Deploy infrastructure with Terraform"
  echo ""
fi
