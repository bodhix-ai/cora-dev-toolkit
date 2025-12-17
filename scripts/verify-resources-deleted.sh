#!/usr/bin/env bash
# Verify CORA Project Resources Deleted
# Checks AWS account for any remaining resources from a CORA project
#
# Usage: ./verify-resources-deleted.sh <project-name> <environment> [aws-profile]
# Example: ./verify-resources-deleted.sh ai-sec dev ai-sec-nonprod

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Parse arguments
PROJECT_NAME="${1:-}"
ENVIRONMENT="${2:-dev}"
AWS_PROFILE="${3:-${AWS_PROFILE:-}}"

if [ -z "$PROJECT_NAME" ]; then
  echo "Usage: $0 <project-name> <environment> [aws-profile]"
  echo ""
  echo "Arguments:"
  echo "  project-name    CORA project name (e.g., ai-sec, pm-app)"
  echo "  environment     Environment (dev, tst, stg, prd) - default: dev"
  echo "  aws-profile     AWS profile to use (optional, uses AWS_PROFILE env var if set)"
  echo ""
  echo "Example:"
  echo "  $0 ai-sec dev ai-sec-nonprod"
  exit 1
fi

# Set AWS profile if provided
if [ -n "$AWS_PROFILE" ]; then
  export AWS_PROFILE
  echo "Using AWS Profile: $AWS_PROFILE"
fi

PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"

echo "=========================================="
echo "  Verifying Resources Deleted"
echo "=========================================="
echo ""
echo "Project:     $PROJECT_NAME"
echo "Environment: $ENVIRONMENT"
echo "Prefix:      $PREFIX"
echo ""

# Track overall status
ALL_CLEAN=true

# === Lambda Functions ===
echo "=== Lambda Functions ==="
FUNCTIONS=$(aws lambda list-functions --query "Functions[?contains(FunctionName, \`${PREFIX}\`)].FunctionName" --output text 2>/dev/null || echo "")
if [ -z "$FUNCTIONS" ]; then
  log_success "No Lambda functions found"
else
  log_error "Found Lambda functions:"
  echo "$FUNCTIONS" | tr '\t' '\n' | sed 's/^/  - /'
  ALL_CLEAN=false
fi
echo ""

# === Lambda Layers ===
echo "=== Lambda Layers ==="
LAYERS=$(aws lambda list-layers --query "Layers[?contains(LayerName, \`${PREFIX}\`)].LayerName" --output text 2>/dev/null || echo "")
if [ -z "$LAYERS" ]; then
  log_success "No Lambda layers found"
else
  log_error "Found Lambda layers:"
  echo "$LAYERS" | tr '\t' '\n' | sed 's/^/  - /'
  ALL_CLEAN=false
fi
echo ""

# === IAM Roles ===
echo "=== IAM Roles ==="
ROLES=$(aws iam list-roles --query "Roles[?contains(RoleName, \`${PROJECT_NAME}\`)].RoleName" --output text 2>/dev/null || echo "")
if [ -z "$ROLES" ]; then
  log_success "No IAM roles found"
else
  log_error "Found IAM roles:"
  echo "$ROLES" | tr '\t' '\n' | sed 's/^/  - /'
  ALL_CLEAN=false
fi
echo ""

# === IAM Policies ===
echo "=== IAM Policies ==="
POLICIES=$(aws iam list-policies --scope Local --query "Policies[?contains(PolicyName, \`${PREFIX}\`)].PolicyName" --output text 2>/dev/null || echo "")
if [ -z "$POLICIES" ]; then
  log_success "No custom IAM policies found"
else
  log_error "Found custom IAM policies:"
  echo "$POLICIES" | tr '\t' '\n' | sed 's/^/  - /'
  ALL_CLEAN=false
fi
echo ""

# === API Gateways ===
echo "=== API Gateways ==="
APIS=$(aws apigatewayv2 get-apis --query "Items[?contains(Name, \`${PREFIX}\`)].{Name:Name,Id:ApiId}" --output text 2>/dev/null || echo "")
if [ -z "$APIS" ]; then
  log_success "No API Gateways found"
else
  log_error "Found API Gateways:"
  echo "$APIS" | sed 's/^/  - /'
  ALL_CLEAN=false
fi
echo ""

# === Secrets Manager ===
echo "=== Secrets Manager ==="
SECRETS=$(aws secretsmanager list-secrets --query "SecretList[?contains(Name, \`${PREFIX}\`)].Name" --output text 2>/dev/null || echo "")
if [ -z "$SECRETS" ]; then
  log_success "No Secrets Manager secrets found"
else
  log_error "Found Secrets Manager secrets:"
  echo "$SECRETS" | tr '\t' '\n' | sed 's/^/  - /'
  ALL_CLEAN=false
fi
echo ""

# === CloudWatch Log Groups ===
echo "=== CloudWatch Log Groups ==="
LOGS=$(aws logs describe-log-groups --query "logGroups[?contains(logGroupName, \`${PROJECT_NAME}\`)].logGroupName" --output text 2>/dev/null || echo "")
if [ -z "$LOGS" ]; then
  log_success "No CloudWatch log groups found"
else
  log_error "Found CloudWatch log groups:"
  echo "$LOGS" | tr '\t' '\n' | sed 's/^/  - /'
  ALL_CLEAN=false
fi
echo ""

# === S3 Buckets ===
echo "=== S3 Buckets ==="
BUCKETS=$(aws s3api list-buckets --query "Buckets[?contains(Name, \`${PREFIX}\`)].Name" --output text 2>/dev/null || echo "")
if [ -z "$BUCKETS" ]; then
  log_success "No S3 buckets found"
else
  log_error "Found S3 buckets:"
  echo "$BUCKETS" | tr '\t' '\n' | sed 's/^/  - /'
  ALL_CLEAN=false
fi
echo ""

# === DynamoDB Tables ===
echo "=== DynamoDB Tables ==="
TABLES=$(aws dynamodb list-tables --query "TableNames[?contains(@, \`${PREFIX}\`)]" --output text 2>/dev/null || echo "")
if [ -z "$TABLES" ]; then
  log_success "No DynamoDB tables found"
else
  log_error "Found DynamoDB tables:"
  echo "$TABLES" | tr '\t' '\n' | sed 's/^/  - /'
  ALL_CLEAN=false
fi
echo ""

# === Summary ===
echo "=========================================="
echo "  Summary"
echo "=========================================="

if [ "$ALL_CLEAN" = true ]; then
  log_success "ALL $PREFIX resources have been deleted!"
  log_success "AWS account is clean and ready for fresh deployment"
  echo ""
  echo "Next steps:"
  echo "  1. cd ${PROJECT_NAME}-infra/scripts"
  echo "  2. ./deploy-terraform.sh $ENVIRONMENT"
  exit 0
else
  log_warn "Some resources still exist (see above)"
  log_warn "Clean up remaining resources before deploying"
  echo ""
  echo "To delete Lambda functions:"
  echo "  for fn in \$(aws lambda list-functions --query 'Functions[?contains(FunctionName, \`${PREFIX}\`)].FunctionName' --output text); do"
  echo "    aws lambda delete-function --function-name \"\$fn\""
  echo "  done"
  echo ""
  echo "To delete IAM roles (use the delete-iam-roles.sh script in this directory)"
  exit 1
fi
