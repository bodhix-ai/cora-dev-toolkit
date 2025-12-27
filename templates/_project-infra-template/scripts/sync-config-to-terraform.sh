#!/bin/bash

# Sync Configuration to Terraform Variables
# 
# This script regenerates local-secrets.tfvars from setup.config.yaml
# ensuring Terraform variables are always in sync with the config file.
#
# Usage: ./sync-config-to-terraform.sh [ENV]
#
# Should be run before deployment to ensure config changes are applied.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV="${1:-dev}"

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

# Extract project name from project.json
PROJECT_NAME=$(jq -r '.name' "${INFRA_ROOT}/project.json" 2>/dev/null || echo "")
if [[ -z "$PROJECT_NAME" ]]; then
  log_error "Could not determine project name from project.json"
  exit 1
fi

STACK_DIR="${INFRA_ROOT}/../${PROJECT_NAME}-stack"
CONFIG_FILE="${STACK_DIR}/setup.config.${PROJECT_NAME}.yaml"
TFVARS_FILE="${INFRA_ROOT}/envs/${ENV}/local-secrets.tfvars"

log_step "Syncing configuration from ${CONFIG_FILE} to ${TFVARS_FILE}..."

# Check if config file exists
if [[ ! -f "$CONFIG_FILE" ]]; then
  log_error "Config file not found: $CONFIG_FILE"
  log_info "Cannot sync Terraform variables without a config file."
  exit 1
fi

# Check if yq is available
if ! command -v yq &> /dev/null; then
  log_warn "yq not found. Install with: brew install yq"
  log_info "Falling back to grep-based extraction (less reliable)..."
  
  # Fallback: grep-based extraction
  GITHUB_OWNER=$(grep -A2 "^github:" "$CONFIG_FILE" | grep "owner:" | sed 's/.*owner: *"\([^"]*\)".*/\1/' || echo "")
  GITHUB_REPO=$(grep -A2 "^github:" "$CONFIG_FILE" | grep "repo_infra:" | sed 's/.*repo_infra: *"\([^"]*\)".*/\1/' || echo "")
  SUPABASE_URL=$(grep -A10 "^supabase:" "$CONFIG_FILE" | grep "url:" | sed 's/.*url: *"\([^"]*\)".*/\1/' || echo "")
  SUPABASE_ANON_KEY=$(grep "anon_key:" "$CONFIG_FILE" | sed 's/.*anon_key: *"\([^"]*\)".*/\1/' || echo "")
  SUPABASE_SERVICE_KEY=$(grep "service_role_key:" "$CONFIG_FILE" | sed 's/.*service_role_key: *"\([^"]*\)".*/\1/' || echo "")
  SUPABASE_JWT_SECRET=$(grep -A10 "^supabase:" "$CONFIG_FILE" | grep "jwt_secret:" | sed 's/.*jwt_secret: *"\([^"]*\)".*/\1/' || echo "")
  AUTH_PROVIDER=$(grep "^auth_provider:" "$CONFIG_FILE" | sed 's/.*auth_provider: *"\([^"]*\)".*/\1/' || echo "okta")
  OKTA_ISSUER=$(grep -A10 "okta:" "$CONFIG_FILE" | grep "issuer:" | sed 's/.*issuer: *"\([^"]*\)".*/\1/' || echo "")
  OKTA_AUDIENCE=$(grep -A10 "okta:" "$CONFIG_FILE" | grep "audience:" | sed 's/.*audience: *\([^ ]*\).*/\1/' || echo "api://default")
  CLERK_SECRET_KEY=$(grep -A5 "^clerk:" "$CONFIG_FILE" | grep "secret_key:" | sed 's/.*secret_key: *"\([^"]*\)".*/\1/' || echo "")
  CLERK_PUBLISHABLE_KEY=$(grep -A5 "^clerk:" "$CONFIG_FILE" | grep "publishable_key:" | sed 's/.*publishable_key: *"\([^"]*\)".*/\1/' || echo "")
else
  # Use yq for proper YAML parsing
  GITHUB_OWNER=$(yq '.github.owner' "$CONFIG_FILE")
  GITHUB_REPO=$(yq '.github.repo_infra' "$CONFIG_FILE")
  SUPABASE_URL=$(yq '.supabase.url' "$CONFIG_FILE")
  SUPABASE_ANON_KEY=$(yq '.supabase.anon_key' "$CONFIG_FILE")
  SUPABASE_SERVICE_KEY=$(yq '.supabase.service_role_key' "$CONFIG_FILE")
  SUPABASE_JWT_SECRET=$(yq '.supabase.jwt_secret // "null"' "$CONFIG_FILE")
  AUTH_PROVIDER=$(yq '.auth_provider // "okta"' "$CONFIG_FILE")
  OKTA_ISSUER=$(yq '.auth.okta.issuer // ""' "$CONFIG_FILE")
  OKTA_AUDIENCE=$(yq '.auth.okta.audience // "api://default"' "$CONFIG_FILE")
  CLERK_SECRET_KEY=$(yq '.auth.clerk.secret_key // "null"' "$CONFIG_FILE")
  CLERK_PUBLISHABLE_KEY=$(yq '.auth.clerk.publishable_key // ""' "$CONFIG_FILE")
fi

# Validate required fields based on auth provider
if [[ "$AUTH_PROVIDER" == "okta" ]]; then
  if [[ -z "$OKTA_ISSUER" || "$OKTA_ISSUER" == "null" ]]; then
    log_error "OKTA_ISSUER is required when auth_provider=okta"
    log_info "Please set auth.okta.issuer in ${CONFIG_FILE}"
    exit 1
  fi
  log_info "Auth Provider: Okta"
  log_info "  Issuer: ${OKTA_ISSUER}"
  log_info "  Audience: ${OKTA_AUDIENCE}"
elif [[ "$AUTH_PROVIDER" == "clerk" ]]; then
  if [[ -z "$CLERK_SECRET_KEY" || "$CLERK_SECRET_KEY" == "null" ]]; then
    log_error "CLERK_SECRET_KEY is required when auth_provider=clerk"
    log_info "Please set auth.clerk.secret_key in ${CONFIG_FILE}"
    exit 1
  fi
  log_info "Auth Provider: Clerk"
else
  log_error "Invalid auth_provider: ${AUTH_PROVIDER}"
  log_info "Must be 'okta' or 'clerk'"
  exit 1
fi

# Create backup of existing tfvars file
if [[ -f "$TFVARS_FILE" ]]; then
  cp "$TFVARS_FILE" "${TFVARS_FILE}.backup"
  log_info "Created backup: ${TFVARS_FILE}.backup"
fi

# Generate local-secrets.tfvars in HCL format
cat > "$TFVARS_FILE" << TFVARSEOF
# =============================================================================
# Terraform Variables for ${PROJECT_NAME}
# =============================================================================
# Generated from setup.config.${PROJECT_NAME}.yaml by sync-config-to-terraform.sh
# DO NOT COMMIT THIS FILE

# GitHub Configuration
github_owner = "${GITHUB_OWNER}"
github_repo  = "${GITHUB_REPO}"

# Supabase Credentials
supabase_url                    = "${SUPABASE_URL}"
supabase_anon_key_value         = "${SUPABASE_ANON_KEY}"
supabase_service_role_key_value = "${SUPABASE_SERVICE_KEY}"
supabase_jwt_secret_value       = "${SUPABASE_JWT_SECRET}"

# Authentication Provider
auth_provider = "${AUTH_PROVIDER}"

# Okta Configuration (when auth_provider = "okta")
okta_issuer = "${OKTA_ISSUER}"
okta_audience = "${OKTA_AUDIENCE}"

# Clerk Configuration (when auth_provider = "clerk")
clerk_secret_key_value = "${CLERK_SECRET_KEY}"
clerk_jwt_issuer = "${CLERK_PUBLISHABLE_KEY}"
clerk_jwt_audience = ""
clerk_jwks_url = ""
TFVARSEOF

log_info "✅ Updated ${TFVARS_FILE}"
echo ""
log_info "Configuration synced successfully!"
log_info "You can now run: ./deploy-terraform.sh ${ENV}"
echo ""
