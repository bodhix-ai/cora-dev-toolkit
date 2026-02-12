#!/bin/bash

# generate-env-files.sh
# Generates .env files for CORA monorepo project from config file
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
Generate Environment Files

Generates .env.local and validation .env files from a CORA config file.

Usage: $0 --config CONFIG --target TARGET

Arguments:
  --config CONFIG    Path to setup config YAML file
  --target TARGET    Path to target project directory
  --help            Show this help message

Examples:
  $0 --config setup.config.yaml --target /path/to/project

Generated Files:
  - apps/web/.env.local           (Next.js environment variables)
  - scripts/validation/.env       (Validation script credentials)
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
log_info "Generating environment files from config..."

# Extract values using yq (or grep fallback)
if command -v yq &> /dev/null; then
  AUTH_PROVIDER=$(yq '.auth_provider // "okta"' "$CONFIG_FILE")
  AWS_REGION=$(yq '.aws.region' "$CONFIG_FILE")
  SUPABASE_URL=$(yq '.supabase.url' "$CONFIG_FILE")
  SUPABASE_ANON_KEY=$(yq '.supabase.anon_key' "$CONFIG_FILE")
  SUPABASE_SERVICE_KEY=$(yq '.supabase.service_role_key' "$CONFIG_FILE")
  OKTA_DOMAIN=$(yq '.auth.okta.domain // ""' "$CONFIG_FILE")
  OKTA_CLIENT_ID=$(yq '.auth.okta.client_id // ""' "$CONFIG_FILE")
  OKTA_CLIENT_SECRET=$(yq '.auth.okta.client_secret // ""' "$CONFIG_FILE")
  OKTA_ISSUER=$(yq '.auth.okta.issuer // ""' "$CONFIG_FILE")
  SUPABASE_DB_HOST=$(yq '.supabase.db.host' "$CONFIG_FILE")
  SUPABASE_DB_PORT=$(yq '.supabase.db.port // 6543' "$CONFIG_FILE")
  SUPABASE_DB_NAME=$(yq '.supabase.db.name // "postgres"' "$CONFIG_FILE")
  SUPABASE_DB_USER=$(yq '.supabase.db.user' "$CONFIG_FILE")
  SUPABASE_DB_PASSWORD=$(yq '.supabase.db.password' "$CONFIG_FILE")
  AWS_CONFIG_PROFILE=$(yq '.aws.profile // ""' "$CONFIG_FILE")
  AWS_API_GATEWAY_ID=$(yq '.aws.api_gateway.id // ""' "$CONFIG_FILE")
  AWS_API_GATEWAY_ENDPOINT=$(yq '.aws.api_gateway.endpoint // ""' "$CONFIG_FILE")
else
  log_warn "yq not available, using grep fallback"
  AUTH_PROVIDER=$(grep "^auth_provider:" "$CONFIG_FILE" | sed 's/.*auth_provider: *"\([^"]*\)".*/\1/' || echo "okta")
  AWS_REGION=$(grep "^  region:" "$CONFIG_FILE" | sed 's/.*region: *"\([^"]*\)".*/\1/' || echo "us-east-1")
  SUPABASE_URL=$(grep -A5 "^supabase:" "$CONFIG_FILE" | grep "url:" | sed 's/.*url: *"\([^"]*\)".*/\1/' || echo "")
  SUPABASE_ANON_KEY=$(grep "anon_key:" "$CONFIG_FILE" | sed 's/.*anon_key: *"\([^"]*\)".*/\1/' || echo "")
  SUPABASE_SERVICE_KEY=$(grep "service_role_key:" "$CONFIG_FILE" | sed 's/.*service_role_key: *"\([^"]*\)".*/\1/' || echo "")
  OKTA_DOMAIN=$(grep -A5 "^auth:" "$CONFIG_FILE" | grep "domain:" | sed 's/.*domain: *"\([^"]*\)".*/\1/' || echo "")
  OKTA_CLIENT_ID=$(grep "client_id:" "$CONFIG_FILE" | head -1 | sed 's/.*client_id: *"\([^"]*\)".*/\1/' || echo "")
  OKTA_CLIENT_SECRET=$(grep "client_secret:" "$CONFIG_FILE" | head -1 | sed 's/.*client_secret: *"\([^"]*\)".*/\1/' || echo "")
  OKTA_ISSUER=$(grep "issuer:" "$CONFIG_FILE" | sed 's/.*issuer: *"\([^"]*\)".*/\1/' || echo "")
  SUPABASE_DB_HOST=$(grep "host:" "$CONFIG_FILE" | head -1 | sed 's/.*host: *"\([^"]*\)".*/\1/' || echo "")
  SUPABASE_DB_PORT=$(grep "port:" "$CONFIG_FILE" | head -1 | sed 's/.*port: *\([0-9]*\).*/\1/' || echo "6543")
  SUPABASE_DB_NAME=$(grep "name:" "$CONFIG_FILE" | head -1 | sed 's/.*name: *"\([^"]*\)".*/\1/' || echo "postgres")
  SUPABASE_DB_USER=$(grep "user:" "$CONFIG_FILE" | head -1 | sed 's/.*user: *"\([^"]*\)".*/\1/' || echo "")
  SUPABASE_DB_PASSWORD=$(grep "password:" "$CONFIG_FILE" | head -1 | sed 's/.*password: *"\([^"]*\)".*/\1/' || echo "")
  AWS_CONFIG_PROFILE=$(grep "profile:" "$CONFIG_FILE" | head -1 | sed 's/.*profile: *"\([^"]*\)".*/\1/' || echo "")
  AWS_API_GATEWAY_ID=$(grep "id:" "$CONFIG_FILE" | grep -A1 "api_gateway:" | tail -1 | sed 's/.*id: *"\([^"]*\)".*/\1/' || echo "")
  AWS_API_GATEWAY_ENDPOINT=$(grep "endpoint:" "$CONFIG_FILE" | head -1 | sed 's/.*endpoint: *"\([^"]*\)".*/\1/' || echo "")
fi

# Generate NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# --- Create apps/web/.env.local ---
mkdir -p "${TARGET_DIR}/apps/web"
cat > "${TARGET_DIR}/apps/web/.env.local" << ENVEOF
# Generated from config file: $(basename "$CONFIG_FILE")
# DO NOT COMMIT THIS FILE

NEXT_PUBLIC_AUTH_PROVIDER="${AUTH_PROVIDER}"
NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_KEY}"
OKTA_DOMAIN="${OKTA_DOMAIN}"
OKTA_CLIENT_ID="${OKTA_CLIENT_ID}"
OKTA_CLIENT_SECRET="${OKTA_CLIENT_SECRET}"
OKTA_ISSUER="${OKTA_ISSUER}"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXT_PUBLIC_CORA_API_URL="${AWS_API_GATEWAY_ENDPOINT}"
AWS_REGION="${AWS_REGION}"
AUTH_TRUST_HOST="true"
ENVEOF

log_info "✅ Created apps/web/.env.local"

# --- Create scripts/validation/.env ---
mkdir -p "${TARGET_DIR}/scripts/validation"
cat > "${TARGET_DIR}/scripts/validation/.env" << ENVEOF
# Generated from config file: $(basename "$CONFIG_FILE")
# DO NOT COMMIT THIS FILE

SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_KEY}"
SUPABASE_DB_HOST="${SUPABASE_DB_HOST}"
SUPABASE_DB_PORT="${SUPABASE_DB_PORT}"
SUPABASE_DB_NAME="${SUPABASE_DB_NAME}"
SUPABASE_DB_USER="${SUPABASE_DB_USER}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD}"
AWS_REGION="${AWS_REGION}"
AWS_PROFILE="${AWS_CONFIG_PROFILE}"
API_GATEWAY_ID="${AWS_API_GATEWAY_ID}"
API_GATEWAY_ENDPOINT="${AWS_API_GATEWAY_ENDPOINT}"
ENVEOF

log_info "✅ Created scripts/validation/.env"

echo ""
log_info "Environment files generated successfully"
exit 0