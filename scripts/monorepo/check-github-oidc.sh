#!/bin/bash

# check-github-oidc.sh
# Checks for existing GitHub OIDC provider in AWS account
# Part of the CORA monorepo creation toolkit

set -e

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
  cat << EOF
Check GitHub OIDC Provider

Checks if a GitHub OIDC provider already exists in the AWS account.
This prevents duplicate provider creation during deployment.

Usage: $0 --region REGION [OPTIONS]

Arguments:
  --region REGION       AWS region to check
  --help               Show this help message

Optional:
  --profile PROFILE     AWS CLI profile to use

Examples:
  $0 --region us-east-1
  $0 --region us-east-1 --profile ai-sec-nonprod

Exit Codes:
  0 - OIDC provider exists
  1 - OIDC provider not found or error
EOF
}

# --- Parse Arguments ---
AWS_REGION=""
AWS_PROFILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --region)
      AWS_REGION="$2"
      shift 2
      ;;
    --profile)
      AWS_PROFILE="$2"
      shift 2
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

# --- Validate Arguments ---
if [[ -z "$AWS_REGION" ]]; then
  log_error "AWS region is required (--region)"
  show_help
  exit 1
fi

# --- Check AWS CLI ---
if ! command -v aws &> /dev/null; then
  log_warn "AWS CLI not found. Install from https://aws.amazon.com/cli/"
  log_info "Skipping OIDC provider check."
  exit 1
fi

# --- Check for GitHub OIDC Provider ---
log_info "Checking for GitHub OIDC provider in AWS account..."

# Build AWS command
AWS_CMD="aws iam list-open-id-connect-providers"
if [[ -n "$AWS_PROFILE" ]]; then
  AWS_CMD="$AWS_CMD --profile $AWS_PROFILE"
fi
AWS_CMD="$AWS_CMD --region $AWS_REGION"

# Check for provider
OIDC_PROVIDERS=$($AWS_CMD 2>/dev/null || echo "")

if [[ -z "$OIDC_PROVIDERS" ]]; then
  log_warn "Unable to query AWS IAM. Check AWS credentials."
  exit 1
fi

# Look for GitHub provider
if echo "$OIDC_PROVIDERS" | grep -q "token.actions.githubusercontent.com"; then
  log_info "✅ GitHub OIDC provider already exists"
  echo ""
  log_info "Provider ARN:"
  echo "$OIDC_PROVIDERS" | grep -A1 "token.actions.githubusercontent.com" | grep "Arn" | sed 's/.*"Arn": *"\(.*\)".*/  \1/'
  echo ""
  log_info "Terraform will use existing provider (no duplicate will be created)"
  exit 0
else
  log_info "GitHub OIDC provider not found"
  log_info "Terraform will create a new provider during deployment"
  exit 1
fi