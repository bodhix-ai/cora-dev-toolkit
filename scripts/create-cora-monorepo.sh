#!/bin/bash

# Create CORA Monorepo Project
# Creates a single mono-repo combining infrastructure and application code
#
# Usage: ./create-cora-monorepo.sh <project-name> [OPTIONS]

set -e

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOLKIT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATE_MONOREPO="${TOOLKIT_ROOT}/templates/_project-monorepo-template"

# Defaults
PROJECT_NAME=""
PROJECT_FOLDER=""
GITHUB_ORG=""
AWS_REGION="us-east-1"
OUTPUT_DIR="."
CREATE_REPOS=false
INIT_GIT=true
DRY_RUN=false
WITH_CORE_MODULES=false
ENABLED_MODULES=()  # Functional modules specified via --modules
INPUT_CONFIG=""  # Path to setup.config.yaml file

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

show_help() {
  cat << EOF
Create CORA Monorepo Project

Creates a single monorepo combining infrastructure (Terraform, Lambdas) and 
application code (Next.js apps, CORA modules) in one repository.

Usage: $0 <project-name> [OPTIONS]

Arguments:
  project-name        Name of the project (e.g., 'ai-sec', 'pm-app')

Options:
  --output <dir>      Output directory (default: current directory)
  --github-org <org>  GitHub organization name
  --region <region>   AWS region (default: us-east-1)
  --with-core-modules Include all core CORA modules (access, ai, ws, mgmt, kb, chat)
  --modules <list>    Comma-separated list of functional modules to include
                      (e.g., --modules eval,voice)
  --config <file>     Path to setup.config.yaml file
  --create-repos      Create GitHub repositories (requires gh CLI)
  --no-git            Skip git initialization
  --dry-run           Show what would be created without creating it
  --help              Show this help message

Examples:
  # Create basic monorepo
  $0 ai-sec

  # Create with core modules
  $0 ai-sec --with-core-modules

  # Create with core + functional modules
  $0 ai-sec --with-core-modules --modules eval,voice

  # Use config file
  $0 ai-sec --config setup.config.example.yaml

Available Modules:
  Core (included with --with-core-modules):
    - module-access: Identity & access control
    - module-ai: AI provider management
    - module-ws: Workspace management
    - module-mgmt: Platform management & monitoring
    - module-kb: Knowledge base & RAG
    - module-chat: Chat & messaging

  Functional (opt-in via --modules):
    - module-eval: Model evaluation & testing
    - module-voice: Voice interaction capabilities
    - module-eval-studio: Evaluation Studio (Premium)

EOF
}

# Function to read YAML config
read_yaml_config() {
  local config_file="$1"
  
  if [[ ! -f "$config_file" ]]; then
    log_error "Config file not found: $config_file"
    exit 1
  fi
  
  log_info "Reading configuration from: $config_file"
  
  # Parse project settings
  # Read project.name (base identifier used for package names)
  PROJECT_NAME=$(grep "^  name:" "$config_file" | head -1 | sed 's/.*name: *"\([^"]*\)".*/\1/')
  
  # Read project.display_name (human-readable name for UI)
  PROJECT_DISPLAY_NAME=$(grep "^  display_name:" "$config_file" | head -1 | sed 's/.*display_name: *"\([^"]*\)".*/\1/')

  # Read github.mono_repo_stack (directory/repo name, defaults to PROJECT_NAME-stack)
  REPO_NAME=$(grep "^  mono_repo_stack:" "$config_file" | sed 's/.*mono_repo_stack: *"\([^"]*\)".*/\1/' || echo "${PROJECT_NAME}-stack")
  
  GITHUB_ORG=$(grep "^  organization:" "$config_file" | sed 's/.*organization: *"\([^"]*\)".*/\1/')
  AWS_REGION=$(grep "^  region:" "$config_file" | sed 's/.*region: *"\([^"]*\)".*/\1/')

  # Read folder_path and folder_name from config (if not specified via CLI)
  if command -v yq &> /dev/null; then
    [[ -z "$PROJECT_FOLDER" ]] && PROJECT_FOLDER=$(yq '.project.folder_name // ""' "$config_file")
    [[ -z "$OUTPUT_DIR" || "$OUTPUT_DIR" == "." ]] && OUTPUT_DIR=$(yq '.project.folder_path // "."' "$config_file")
  else
    [[ -z "$PROJECT_FOLDER" ]] && PROJECT_FOLDER=$(grep "^  folder_name:" "$config_file" | head -1 | sed 's/.*folder_name: *"\([^"]*\)".*/\1/' || echo "")
    [[ -z "$OUTPUT_DIR" || "$OUTPUT_DIR" == "." ]] && OUTPUT_DIR=$(grep "^  folder_path:" "$config_file" | head -1 | sed 's/.*folder_path: *"\([^"]*\)".*/\1/' || echo ".")
  fi
  
  # Core modules are always enabled in monorepo
  WITH_CORE_MODULES=true
  
  # Parse modules.enabled array
  local in_modules_section=false
  while IFS= read -r line; do
    # Detect modules: section
    if [[ "$line" =~ ^modules: ]]; then
      in_modules_section=true
      continue
    fi
    
    # Exit modules section when we hit another top-level key
    if $in_modules_section && [[ "$line" =~ ^[a-z_]+: ]]; then
      in_modules_section=false
    fi
    
    # Parse module entries (e.g., "    - module-voice")
    if $in_modules_section && [[ "$line" =~ ^[[:space:]]*-[[:space:]]*(module-[a-z-]+) ]]; then
      local module_name="${BASH_REMATCH[1]}"
      # Remove "module-" prefix for ENABLED_MODULES array
      local module_short="${module_name#module-}"
      ENABLED_MODULES+=("$module_short")
    fi
  done < "$config_file"
  
  log_info "Parsed from config:"
  log_info "  Project: ${PROJECT_NAME}"
  log_info "  Org: ${GITHUB_ORG}"
  log_info "  Region: ${AWS_REGION}"
  log_info "  Core modules: enabled (always)"
  if [[ ${#ENABLED_MODULES[@]} -gt 0 ]]; then
    log_info "  Functional modules: ${ENABLED_MODULES[*]}"
  fi
}

# Function to add module to Terraform configuration
add_module_to_terraform() {
  local module_name="$1"
  local project_dir="$2"
  local project_name="$3"
  local main_tf="${project_dir}/envs/dev/main.tf"
  
  if [[ ! -f "$main_tf" ]]; then
    log_warn "main.tf not found at $main_tf, skipping Terraform registration"
    return 1
  fi
  
  # Check if module already exists
  if grep -q "module \"${module_name}\"" "$main_tf"; then
    log_info "Module ${module_name} already in Terraform config, skipping"
    return 0
  fi
  
  log_info "Adding ${module_name} to Terraform configuration..."
  
  local module_underscore="${module_name//-/_}"
  local module_upper=$(echo "${module_name}" | tr '[:lower:]' '[:upper:]')
  
  # Module declaration (monorepo uses local path)
  local module_declaration="
# ${module_upper} - CORA Module
module \"${module_underscore}\" {
  source = \"../../packages/${module_name}/infrastructure\"

  project_name     = var.project_name
  environment      = var.environment
  aws_region       = var.aws_region
  lambda_bucket    = aws_s3_bucket.lambda_artifacts.bucket
  api_gateway_id   = module.modular_api_gateway.api_gateway_id
  api_gateway_execution_arn = module.modular_api_gateway.api_gateway_execution_arn
  authorizer_uri   = aws_lambda_function.authorizer.invoke_arn
  org_common_layer_arn = aws_lambda_layer_version.org_common.arn
  
  supabase_url            = var.supabase_url
  supabase_anon_key_value = var.supabase_anon_key_value
  supabase_service_key    = var.supabase_service_key
  
  common_tags = var.common_tags
}
"
  
  # Append to main.tf
  echo "$module_declaration" >> "$main_tf"
  
  log_info "✅ Added ${module_name} to Terraform configuration"
}

# Function to add module as workspace dependency in web app
add_module_to_web_deps() {
  local module_name="$1"
  local project_dir="$2"
  local project_name="$3"
  local web_package_json="${project_dir}/apps/web/package.json"
  
  if [[ ! -f "$web_package_json" ]]; then
    log_warn "web package.json not found at $web_package_json, skipping dependency injection"
    return 1
  fi
  
  local dep_key="@${project_name}/${module_name}"
  
  # Check if dependency already exists
  if grep -q "\"${dep_key}\"" "$web_package_json"; then
    log_info "Dependency ${dep_key} already in web package.json, skipping"
    return 0
  fi
  
  log_info "Adding ${dep_key} to web app dependencies..."
  
  # Use jq if available for precise JSON manipulation
  if command -v jq &> /dev/null; then
    jq --arg key "$dep_key" '.dependencies[$key] = "workspace:*"' "$web_package_json" > "${web_package_json}.tmp"
    mv "${web_package_json}.tmp" "$web_package_json"
  else
    # Fallback to sed (insert before closing brace of dependencies)
    # Find the last dependency line and add after it
    sed -i.bak "/\"dependencies\": {/,/^[[:space:]]*}/ {
      /^[[:space:]]*\"@${project_name}\/module-[^\"]*\": \"workspace:\*\",\?/! {
        /^[[:space:]]*}/ i\\
    \"${dep_key}\": \"workspace:*\",
      }
    }" "$web_package_json"
    rm -f "${web_package_json}.bak"
  fi
  
  log_info "✅ Added ${dep_key} to web dependencies"
}

# --- Environment File Generation ---
generate_env_files() {
  local config_file="$1"
  local project_dir="$2"
  
  if [[ ! -f "$config_file" ]]; then
    log_warn "Config file not found: $config_file"
    log_info "Skipping .env generation."
    return
  fi
  
  log_step "Generating .env files from config..."
  
  # Extract values using yq
  if command -v yq &> /dev/null; then
    AUTH_PROVIDER=$(yq '.auth_provider // "okta"' "$config_file")
    SUPABASE_URL=$(yq '.supabase.url' "$config_file")
    SUPABASE_ANON_KEY=$(yq '.supabase.anon_key' "$config_file")
    SUPABASE_SERVICE_KEY=$(yq '.supabase.service_role_key' "$config_file")
    OKTA_DOMAIN=$(yq '.auth.okta.domain // ""' "$config_file")
    OKTA_CLIENT_ID=$(yq '.auth.okta.client_id // ""' "$config_file")
    OKTA_CLIENT_SECRET=$(yq '.auth.okta.client_secret // ""' "$config_file")
    OKTA_ISSUER=$(yq '.auth.okta.issuer // ""' "$config_file")
    SUPABASE_DB_HOST=$(yq '.supabase.db.host' "$config_file")
    SUPABASE_DB_PORT=$(yq '.supabase.db.port // 6543' "$config_file")
    SUPABASE_DB_NAME=$(yq '.supabase.db.name // "postgres"' "$config_file")
    SUPABASE_DB_USER=$(yq '.supabase.db.user' "$config_file")
    SUPABASE_DB_PASSWORD=$(yq '.supabase.db.password' "$config_file")
    AWS_CONFIG_PROFILE=$(yq '.aws.profile // ""' "$config_file")
    AWS_API_GATEWAY_ID=$(yq '.aws.api_gateway.id // ""' "$config_file")
    AWS_API_GATEWAY_ENDPOINT=$(yq '.aws.api_gateway.endpoint // ""' "$config_file")
  else
    log_warn "yq not available, using grep fallback"
    AUTH_PROVIDER=$(grep "^auth_provider:" "$config_file" | sed 's/.*auth_provider: *"\([^"]*\)".*/\1/' || echo "okta")
    SUPABASE_URL=$(grep -A5 "^supabase:" "$config_file" | grep "url:" | sed 's/.*url: *"\([^"]*\)".*/\1/' || echo "")
    SUPABASE_ANON_KEY=$(grep "anon_key:" "$config_file" | sed 's/.*anon_key: *"\([^"]*\)".*/\1/' || echo "")
    SUPABASE_SERVICE_KEY=$(grep "service_role_key:" "$config_file" | sed 's/.*service_role_key: *"\([^"]*\)".*/\1/' || echo "")
    OKTA_DOMAIN=$(grep -A5 "^auth:" "$config_file" | grep "domain:" | sed 's/.*domain: *"\([^"]*\)".*/\1/' || echo "")
    OKTA_CLIENT_ID=$(grep "client_id:" "$config_file" | head -1 | sed 's/.*client_id: *"\([^"]*\)".*/\1/' || echo "")
    OKTA_CLIENT_SECRET=$(grep "client_secret:" "$config_file" | head -1 | sed 's/.*client_secret: *"\([^"]*\)".*/\1/' || echo "")
    OKTA_ISSUER=$(grep "issuer:" "$config_file" | sed 's/.*issuer: *"\([^"]*\)".*/\1/' || echo "")
  fi
  
  # Generate NEXTAUTH_SECRET
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  
  # Create apps/web/.env.local
  cat > "${project_dir}/apps/web/.env.local" << ENVEOF
# Generated from config file
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
ENVEOF
  
  log_info "Created apps/web/.env.local"
  
  # Create validation .env
  mkdir -p "${project_dir}/scripts/validation"
  cat > "${project_dir}/scripts/validation/.env" << ENVEOF
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
  
  log_info "Created scripts/validation/.env"
}

# --- Terraform Variables Generation ---
generate_terraform_vars() {
  local config_file="$1"
  local project_dir="$2"
  
  if [[ ! -f "$config_file" ]]; then
    log_warn "Config file not found: $config_file"
    return
  fi
  
  log_step "Generating Terraform variables from config..."
  
  if command -v yq &> /dev/null; then
    GITHUB_OWNER=$(yq '.github.owner' "$config_file")
    GITHUB_REPO=$(yq '.github.repo_infra' "$config_file")
    SUPABASE_URL=$(yq '.supabase.url' "$config_file")
    SUPABASE_ANON_KEY=$(yq '.supabase.anon_key' "$config_file")
    SUPABASE_SERVICE_KEY=$(yq '.supabase.service_role_key' "$config_file")
    SUPABASE_JWT_SECRET=$(yq '.supabase.jwt_secret' "$config_file")
    OKTA_ISSUER=$(yq '.auth.okta.issuer // ""' "$config_file")
    OKTA_AUDIENCE=$(yq '.auth.okta.audience // "api://default"' "$config_file")
  fi
  
  cat > "${project_dir}/envs/dev/local-secrets.tfvars" << TFVARSEOF
# Generated from config file
# DO NOT COMMIT THIS FILE

github_owner = "${GITHUB_OWNER}"
github_repo  = "${GITHUB_REPO}"
supabase_url                    = "${SUPABASE_URL}"
supabase_anon_key_value         = "${SUPABASE_ANON_KEY}"
supabase_service_role_key_value = "${SUPABASE_SERVICE_KEY}"
supabase_jwt_secret_value       = "${SUPABASE_JWT_SECRET}"
auth_provider = "okta"
okta_issuer = "${OKTA_ISSUER}"
okta_audience = "${OKTA_AUDIENCE}"
TFVARSEOF
  
  log_info "Created envs/dev/local-secrets.tfvars"
}

# --- Database Schema Consolidation ---
consolidate_database_schemas() {
  local project_dir="$1"
  
  log_step "Consolidating database schemas..."
  
  if [[ ! -d "${project_dir}/packages" ]]; then
    log_warn "Packages directory not found"
    return
  fi
  
  local tier1_modules=("module-access")
  local tier2_modules=("module-ai" "module-ws")
  local tier3_modules=("module-chat" "module-kb" "module-mgmt")
  local functional_modules=("module-eval" "module-voice" "module-eval-studio")
  
  local schema_files=()
  
  add_module_schemas() {
    local module_name="$1"
    local module_dir="${project_dir}/packages/${module_name}/db/schema"
    
    if [[ -d "$module_dir" ]]; then
      while IFS= read -r schema_file; do
        [[ -n "$schema_file" ]] && schema_files+=("$schema_file")
      done < <(find "$module_dir" -name "*.sql" -not -path "*/archive/*" -type f 2>/dev/null | sort)
    fi
  }
  
  for module in "${tier1_modules[@]}" "${tier2_modules[@]}" "${tier3_modules[@]}" "${functional_modules[@]}"; do
    add_module_schemas "$module"
  done
  
  if [[ ${#schema_files[@]} -eq 0 ]]; then
    log_warn "No database schema files found"
    return
  fi
  
  mkdir -p "${project_dir}/scripts"
  cat > "${project_dir}/scripts/setup-database.sql" << 'SQLHEADER'
-- CORA Database Setup Script
-- Consolidated from all modules
-- Idempotent and safe to run multiple times

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SQLHEADER
  
  for schema_file in "${schema_files[@]}"; do
    local module_name=$(basename "$(dirname "$(dirname "$(dirname "$schema_file")")")")
    echo "" >> "${project_dir}/scripts/setup-database.sql"
    echo "-- Module: ${module_name}" >> "${project_dir}/scripts/setup-database.sql"
    cat "$schema_file" >> "${project_dir}/scripts/setup-database.sql"
    log_info "  Added ${module_name}/$(basename "$schema_file")"
  done
  
  log_info "Created scripts/setup-database.sql"
}

# --- Install Validation Dependencies ---
install_validation_deps() {
  local project_dir="$1"
  local venv_dir="${project_dir}/scripts/validation/.venv"
  
  log_step "Setting up validation environment..."
  
  if ! command -v python3 &> /dev/null; then
    log_warn "python3 not found, skipping validation setup"
    return
  fi
  
  python3 -m venv "${venv_dir}" 2>/dev/null
  "${venv_dir}/bin/pip" install --quiet boto3 supabase python-dotenv click colorama requests 2>/dev/null
  
  log_info "✅ Validation environment created"
}

# --- Build Packages ---
build_packages() {
  local project_dir="$1"
  
  log_step "Building packages..."
  
  if ! command -v pnpm &> /dev/null; then
    log_warn "pnpm not found, skipping build"
    return
  fi
  
  (
    cd "$project_dir" || return 1
    pnpm install 2>&1 | tail -10
    pnpm build 2>&1 | tail -20
  )
  
  log_info "✅ Packages built"
}

# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
  case $1 in
    --output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --github-org)
      GITHUB_ORG="$2"
      shift 2
      ;;
    --region)
      AWS_REGION="$2"
      shift 2
      ;;
    --with-core-modules)
      WITH_CORE_MODULES=true
      shift
      ;;
    --modules)
      IFS=',' read -ra ENABLED_MODULES <<< "$2"
      shift 2
      ;;
    --config)
      INPUT_CONFIG="$2"
      shift 2
      ;;
    --create-repos)
      CREATE_REPOS=true
      shift
      ;;
    --no-git)
      INIT_GIT=false
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    -*)
      log_error "Unknown option: $1"
      show_help
      exit 1
      ;;
    *)
      if [[ -z "$PROJECT_NAME" ]]; then
        PROJECT_NAME="$1"
      else
        log_error "Too many arguments"
        show_help
        exit 1
      fi
      shift
      ;;
  esac
done

# Read config file if provided and resolve to absolute path
if [[ -n "$INPUT_CONFIG" ]]; then
  # Resolve to absolute path before cd'ing
  if [[ "$INPUT_CONFIG" != /* ]]; then
    INPUT_CONFIG="$(cd "$(dirname "$INPUT_CONFIG")" && pwd)/$(basename "$INPUT_CONFIG")"
  fi
  read_yaml_config "$INPUT_CONFIG"
fi

# Validate arguments
if [[ -z "$PROJECT_NAME" ]]; then
  log_error "Project name is required"
  show_help
  exit 1
fi

# Validate template exists
if [[ ! -d "$TEMPLATE_MONOREPO" ]]; then
  log_error "Monorepo template not found: $TEMPLATE_MONOREPO"
  log_info "Expected: ${TOOLKIT_ROOT}/templates/_project-monorepo-template/"
  exit 1
fi

# Expand tilde in OUTPUT_DIR
OUTPUT_DIR="${OUTPUT_DIR/#\~/$HOME}"

# Set project folder
# If PROJECT_FOLDER (folder_name) is specified, create parent directory structure
# Use REPO_NAME for directory (e.g., ai-mod-stack), PROJECT_NAME for package names (e.g., @ai-mod/...)
if [[ -n "$PROJECT_FOLDER" ]]; then
  PROJECT_FOLDER="${OUTPUT_DIR}/${PROJECT_FOLDER}/${REPO_NAME}"
else
  # No parent folder - create project directly in OUTPUT_DIR
  PROJECT_FOLDER="${OUTPUT_DIR}/${REPO_NAME}"
fi

# --- Summary ---
echo ""
echo "=========================================="
echo "  CORA Monorepo Project Creation"
echo "=========================================="
echo ""
log_info "Project Name:    ${PROJECT_NAME}"
log_info "Project Folder:  ${PROJECT_FOLDER}"
log_info "AWS Region:      ${AWS_REGION}"
log_info "GitHub Org:      ${GITHUB_ORG:-<not specified>}"
log_info "Template:        ${TEMPLATE_MONOREPO}"
echo ""

if [[ "$WITH_CORE_MODULES" == "true" ]]; then
  log_info "Core Modules:    ✅ Enabled (6 modules)"
else
  log_info "Core Modules:    ⏭️ Skipped"
fi

if [[ ${#ENABLED_MODULES[@]} -gt 0 ]]; then
  log_info "Functional Modules: ${ENABLED_MODULES[*]}"
else
  log_info "Functional Modules: ⏭️ None"
fi

echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  log_warn "🔍 DRY RUN MODE - No files will be created"
  echo ""
fi

# Check if project folder exists
if [[ -d "$PROJECT_FOLDER" ]] && [[ "$DRY_RUN" == "false" ]]; then
  log_error "Project folder already exists: $PROJECT_FOLDER"
  log_info "Remove it first or choose a different name"
  exit 1
fi

# --- Create Project ---
log_step "Step 1/5: Creating project structure..."

if [[ "$DRY_RUN" == "false" ]]; then
  mkdir -p "$PROJECT_FOLDER"
  
  # Copy monorepo template
  log_info "Copying monorepo template..."
  rsync -a --exclude='.git' "${TEMPLATE_MONOREPO}/" "${PROJECT_FOLDER}/"
  
  log_info "✅ Project structure created"
else
  log_info "Would create: ${PROJECT_FOLDER}"
  log_info "Would copy: ${TEMPLATE_MONOREPO}/ → ${PROJECT_FOLDER}/"
fi

echo ""

# --- Replace Placeholders ---
log_step "Step 2/5: Configuring project settings..."

if [[ "$DRY_RUN" == "false" ]]; then
  log_info "Replacing placeholders..."
  
  # Find all files and replace placeholders
  find "$PROJECT_FOLDER" -type f \( -name "*.tf" -o -name "*.yml" -o -name "*.yaml" -o -name "*.json" -o -name "*.ts" -o -name "*.tsx" -o -name "*.sh" -o -name "*.md" -o -name "*.mjs" \) -exec sed -i.bak \
    -e "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" \
    -e "s/{{PROJECT_DISPLAY_NAME}}/${PROJECT_DISPLAY_NAME}/g" \
    -e "s/{{AWS_REGION}}/${AWS_REGION}/g" \
    -e "s/{{GITHUB_ORG}}/${GITHUB_ORG}/g" \
    {} \;
  
  # Remove backup files
  find "$PROJECT_FOLDER" -name "*.bak" -delete
  
  # Replace ${project} in package.json files (special syntax for package names)
  find "$PROJECT_FOLDER" -name "package.json" -exec sed -i.bak \
    -e "s/\${project}/${PROJECT_NAME}/g" \
    {} \;
  find "$PROJECT_FOLDER" -name "*.bak" -delete
  
  log_info "✅ Project configured for: ${PROJECT_NAME}"
else
  log_info "Would replace placeholders:"
  log_info "  {{PROJECT_NAME}} → ${PROJECT_NAME}"
  log_info "  {{PROJECT_DISPLAY_NAME}} → ${PROJECT_DISPLAY_NAME}"
  log_info "  {{AWS_REGION}} → ${AWS_REGION}"
  log_info "  {{GITHUB_ORG}} → ${GITHUB_ORG}"
fi

echo ""

# --- Copy Modules ---
if [[ "$WITH_CORE_MODULES" == "true" ]] || [[ ${#ENABLED_MODULES[@]} -gt 0 ]]; then
  log_step "Step 3/5: Adding CORA modules..."
  
  # Core modules
  if [[ "$WITH_CORE_MODULES" == "true" ]]; then
    CORE_MODULES=("module-access" "module-ai" "module-ws" "module-mgmt" "module-kb" "module-chat")
    
    for module in "${CORE_MODULES[@]}"; do
      log_info "Adding core module: ${module}..."
      
      if [[ "$DRY_RUN" == "false" ]]; then
        cp -r "${TOOLKIT_ROOT}/templates/_modules-core/${module}" "${PROJECT_FOLDER}/packages/"
        
        # Replace placeholders in copied module files
        MODULE_DIR="${PROJECT_FOLDER}/packages/${module}"
        find "$MODULE_DIR" -type f \( -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.tf" -o -name "*.md" -o -name "*.sql" -o -name "*.mjs" \) | while read -r file; do
          sed -i.bak "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file"
          rm -f "${file}.bak"
        done
        
        add_module_to_terraform "$module" "$PROJECT_FOLDER" "$PROJECT_NAME"
      else
        log_info "Would copy: _modules-core/${module} → packages/${module}"
        log_info "Would register in Terraform: envs/dev/main.tf"
      fi
    done
  fi
  
  # Functional modules
  for module in "${ENABLED_MODULES[@]}"; do
    module_name="module-${module}"
    log_info "Adding functional module: ${module_name}..."
    
    if [[ "$DRY_RUN" == "false" ]]; then
      if [[ -d "${TOOLKIT_ROOT}/templates/_modules-functional/${module_name}" ]]; then
        cp -r "${TOOLKIT_ROOT}/templates/_modules-functional/${module_name}" "${PROJECT_FOLDER}/packages/"
        
        # Replace placeholders in copied module files
        MODULE_DIR="${PROJECT_FOLDER}/packages/${module_name}"
        find "$MODULE_DIR" -type f \( -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.tf" -o -name "*.md" -o -name "*.sql" -o -name "*.mjs" \) | while read -r file; do
          sed -i.bak "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file"
          rm -f "${file}.bak"
        done
        
        add_module_to_terraform "$module_name" "$PROJECT_FOLDER" "$PROJECT_NAME"
        add_module_to_web_deps "$module_name" "$PROJECT_FOLDER" "$PROJECT_NAME"
      else
        log_warn "Functional module not found: ${module_name}"
      fi
    else
      log_info "Would copy: _modules-functional/${module_name} → packages/${module_name}"
      log_info "Would register in Terraform: envs/dev/main.tf"
    fi
  done
  
  log_info "✅ Modules added successfully"
else
  log_step "Step 3/5: Skipping modules (none specified)"
fi

echo ""

# --- Initialize Git ---
if [[ "$INIT_GIT" == "true" ]]; then
  log_step "Step 4/5: Initializing git repository..."
  
  if [[ "$DRY_RUN" == "false" ]]; then
    cd "$PROJECT_FOLDER"
    git init
    git add .
    git commit -m "Initial commit: CORA monorepo for ${PROJECT_NAME}"
    cd "$SCRIPT_DIR"
    
    log_info "✅ Git repository initialized"
  else
    log_info "Would run: git init"
    log_info "Would run: git add ."
    log_info "Would run: git commit -m 'Initial commit'"
  fi
else
  log_step "Step 4/5: Skipping git initialization (--no-git)"
fi

echo ""

# --- Create GitHub Repo ---
if [[ "$CREATE_REPOS" == "true" ]]; then
  log_step "Step 5/5: Creating GitHub repository..."
  
  if ! command -v gh &> /dev/null; then
    log_warn "GitHub CLI (gh) not found, skipping repo creation"
    log_info "Install with: brew install gh"
  else
    if [[ "$DRY_RUN" == "false" ]]; then
      cd "$PROJECT_FOLDER"
      
      if [[ -n "$GITHUB_ORG" ]]; then
        gh repo create "${GITHUB_ORG}/${PROJECT_NAME}" --private --source=. --remote=origin
      else
        gh repo create "${PROJECT_NAME}" --private --source=. --remote=origin
      fi
      
      git push -u origin main
      cd "$SCRIPT_DIR"
      
      log_info "✅ GitHub repository created"
    else
      log_info "Would run: gh repo create ${GITHUB_ORG:+${GITHUB_ORG}/}${PROJECT_NAME}"
      log_info "Would run: git push -u origin main"
    fi
  fi
else
  log_step "Step 5/5: Skipping GitHub repo creation (--create-repos not specified)"
fi

echo ""

# --- Run Automation (if config file provided) ---
if [[ -n "$INPUT_CONFIG" ]] && [[ "$DRY_RUN" == "false" ]]; then
  generate_env_files "$INPUT_CONFIG" "$PROJECT_FOLDER"
  generate_terraform_vars "$INPUT_CONFIG" "$PROJECT_FOLDER"
  
  if [[ "$WITH_CORE_MODULES" == "true" ]] || [[ ${#ENABLED_MODULES[@]} -gt 0 ]]; then
    consolidate_database_schemas "$PROJECT_FOLDER"
    install_validation_deps "$PROJECT_FOLDER"
    build_packages "$PROJECT_FOLDER"
  fi
fi

echo ""

# --- Summary ---
echo "=========================================="
echo "  ✅ Project Created Successfully"
echo "=========================================="
echo ""
log_info "Project: ${PROJECT_NAME}"
log_info "Location: ${PROJECT_FOLDER}"
echo ""

if [[ "$DRY_RUN" == "false" ]]; then
  log_info "Next steps:"
  echo ""
  echo "  1. Navigate to project:"
  echo "     cd ${PROJECT_FOLDER}"
  echo ""
  echo "  2. Install dependencies:"
  echo "     pnpm install"
  echo ""
  echo "  3. Configure secrets:"
  echo "     cp envs/dev/local-secrets.tfvars.example envs/dev/local-secrets.tfvars"
  echo "     # Edit local-secrets.tfvars with your values"
  echo ""
  echo "  4. Bootstrap Terraform state:"
  echo "     ./bootstrap/bootstrap_tf_state.sh"
  echo ""
  echo "  5. Deploy infrastructure:"
  echo "     cd envs/dev"
  echo "     terraform init"
  echo "     terraform plan -var-file=local-secrets.tfvars"
  echo "     terraform apply -var-file=local-secrets.tfvars"
  echo ""
  echo "  6. Start development server:"
  echo "     cd apps/web"
  echo "     pnpm run dev"
  echo ""
else
  log_warn "DRY RUN completed - no files were created"
fi

echo ""