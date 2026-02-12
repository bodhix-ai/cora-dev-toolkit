#!/bin/bash

# generate-terraform-vars.sh
# Generates Terraform variables file for CORA monorepo project from config file
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
Generate Terraform Variables

Generates local-secrets.tfvars file from a CORA config file.

Usage: $0 --config CONFIG --target TARGET

Arguments:
  --config CONFIG    Path to setup config YAML file
  --target TARGET    Path to target project directory
  --help            Show this help message

Examples:
  $0 --config setup.config.yaml --target /path/to/project

Generated Files:
  - envs/dev/local-secrets.tfvars    (Terraform sensitive variables)
EOF
}

# --- Parse Arguments ---
CONFIG_FILE=""
TARGET_DIR=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --config)
      CONFIG_FILE="$2"
      shift 2
      ;;
    --target)
      TARGET_DIR="$2"
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
if [[ -z "$CONFIG_FILE" ]]; then
  log_error "Config file is required (--config)"
  show_help
  exit 1
fi

if [[ -z "$TARGET_DIR" ]]; then
  log_error "Target directory is required (--target)"
  show_help
  exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  log_error "Config file not found: $CONFIG_FILE"
  exit 1
fi

if [[ ! -d "$TARGET_DIR" ]]; then
  log_error "Target directory not found: $TARGET_DIR"
  exit 1
fi

# --- Extract Values ---
log_info "Generating Terraform variables from config..."

# Extract values using yq (or grep fallback)
if command -v yq &> /dev/null; then
  GITHUB_OWNER=$(yq '.github.organization' "$CONFIG_FILE")
  GITHUB_REPO=$(yq '.github.mono_repo_stack // .project.name + "-stack"' "$CONFIG_FILE")
  SUPABASE_URL=$(yq '.supabase.url' "$CONFIG_FILE")
  SUPABASE_ANON_KEY=$(yq '.supabase.anon_key' "$CONFIG_FILE")
  SUPABASE_SERVICE_KEY=$(yq '.supabase.service_role_key' "$CONFIG_FILE")
  SUPABASE_JWT_SECRET=$(yq '.supabase.jwt_secret' "$CONFIG_FILE")
  OKTA_ISSUER=$(yq '.auth.okta.issuer // ""' "$CONFIG_FILE")
  OKTA_AUDIENCE=$(yq '.auth.okta.audience // "api://default"' "$CONFIG_FILE")
else
  log_warn "yq not available, using grep fallback"
  GITHUB_OWNER=$(grep "^  organization:" "$CONFIG_FILE" | sed 's/.*organization: *"\([^"]*\)".*/\1/' || echo "")
  GITHUB_REPO=$(grep "^  mono_repo_stack:" "$CONFIG_FILE" | sed 's/.*mono_repo_stack: *"\([^"]*\)".*/\1/' || echo "")
  SUPABASE_URL=$(grep -A5 "^supabase:" "$CONFIG_FILE" | grep "url:" | sed 's/.*url: *"\([^"]*\)".*/\1/' || echo "")
  SUPABASE_ANON_KEY=$(grep "anon_key:" "$CONFIG_FILE" | sed 's/.*anon_key: *"\([^"]*\)".*/\1/' || echo "")
  SUPABASE_SERVICE_KEY=$(grep "service_role_key:" "$CONFIG_FILE" | sed 's/.*service_role_key: *"\([^"]*\)".*/\1/' || echo "")
  SUPABASE_JWT_SECRET=$(grep "jwt_secret:" "$CONFIG_FILE" | sed 's/.*jwt_secret: *"\([^"]*\)".*/\1/' || echo "")
  OKTA_ISSUER=$(grep "issuer:" "$CONFIG_FILE" | sed 's/.*issuer: *"\([^"]*\)".*/\1/' || echo "")
  OKTA_AUDIENCE=$(grep "audience:" "$CONFIG_FILE" | sed 's/.*audience: *"\([^"]*\)".*/\1/' || echo "api://default")
fi

# --- Create envs/dev/local-secrets.tfvars ---
mkdir -p "${TARGET_DIR}/envs/dev"
cat > "${TARGET_DIR}/envs/dev/local-secrets.tfvars" << TFVARSEOF
# Generated from config file: $(basename "$CONFIG_FILE")
# DO NOT COMMIT THIS FILE
# This file contains sensitive credentials for Terraform

github_owner = "${GITHUB_OWNER}"
github_repo  = "${GITHUB_REPO}"

supabase_url                    = "${SUPABASE_URL}"
supabase_anon_key_value         = "${SUPABASE_ANON_KEY}"
supabase_service_role_key_value = "${SUPABASE_SERVICE_KEY}"
supabase_jwt_secret_value       = "${SUPABASE_JWT_SECRET}"

auth_provider = "okta"
okta_issuer   = "${OKTA_ISSUER}"
okta_audience = "${OKTA_AUDIENCE}"
TFVARSEOF

log_info "✅ Created envs/dev/local-secrets.tfvars"

echo ""
log_info "Terraform variables generated successfully"
exit 0