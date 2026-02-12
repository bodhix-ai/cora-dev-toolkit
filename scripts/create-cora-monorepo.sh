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
  
  # Convert module name to Terraform format (dashes → underscores)
  local module_underscore="${module_name//-/_}"
  local module_upper=$(echo "${module_name}" | tr '[:lower:]' '[:upper:]')
  
  # Check if module already exists (Terraform uses underscores in module names)
  if grep -q "module \"${module_underscore}\"" "$main_tf"; then
    log_info "Module ${module_name} already in Terraform config, skipping"
    return 0
  fi
  
  log_info "Adding ${module_name} to Terraform configuration..."
  
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

# --- Inline functions removed - now using standalone scripts ---
# generate_env_files() → scripts/monorepo/generate-env-files.sh
# generate_terraform_vars() → scripts/monorepo/generate-terraform-vars.sh

# --- Merge Module Configurations ---
merge_module_configs() {
  local config_file="$1"
  local project_dir="$2"
  
  log_step "Merging module configurations..."
  
  # Check if config file exists
  if [[ ! -f "$config_file" ]]; then
    log_warn "Config file not found: $config_file"
    log_info "Skipping module config merging. Module configurations will use defaults."
    return
  fi
  
  # Registry file location
  local REGISTRY_FILE="${TOOLKIT_ROOT}/templates/_modules-core/module-registry.yaml"
  
  # Read enabled functional modules from config
  local enabled_modules=()
  if command -v yq &> /dev/null; then
    # Use yq to read the enabled modules array
    while IFS= read -r module; do
      [[ -n "$module" && "$module" != "null" ]] && enabled_modules+=("$module")
    done < <(yq '.modules.enabled[]' "$config_file" 2>/dev/null)
  else
    # Fallback: grep-based extraction (limited)
    log_warn "Using grep fallback for module list (yq not available)"
    while IFS= read -r line; do
      # Extract module names from "- module-name" format
      if [[ "$line" =~ ^[[:space:]]*-[[:space:]]*(module-[a-z]+) ]]; then
        enabled_modules+=("${BASH_REMATCH[1]}")
      fi
    done < <(sed -n '/^modules:/,/^[^ ]/p' "$config_file" | grep -E '^\s+- module-')
  fi
  
  # Always include ALL core modules (dynamically from registry)
  local all_modules=()
  
  # Get all core modules from registry
  if [[ -f "$REGISTRY_FILE" ]]; then
    if command -v yq &> /dev/null; then
      # Use yq to get all modules where type == "core"
      while IFS= read -r module; do
        [[ -n "$module" && "$module" != "null" ]] && all_modules+=("$module")
      done < <(yq '.modules | to_entries | .[] | select(.value.type == "core") | .key' "$REGISTRY_FILE" 2>/dev/null)
    else
      # Fallback: hardcode all 6 core modules
      log_warn "yq not available, using hardcoded core modules list"
      all_modules=("module-access" "module-ai" "module-ws" "module-chat" "module-kb" "module-mgmt")
    fi
  else
    log_warn "Module registry not found, using hardcoded core modules list"
    all_modules=("module-access" "module-ai" "module-ws" "module-chat" "module-kb" "module-mgmt")
  fi
  
  log_info "Core modules to merge: ${all_modules[*]}"
  
  # Add enabled functional modules from config file
  for module in "${enabled_modules[@]}"; do
    if [[ ! " ${all_modules[*]} " =~ " ${module} " ]]; then
      all_modules+=("$module")
    fi
  done
  
  # Create output directory for merged config
  mkdir -p "${project_dir}/apps/web/config"
  
  # Start merged config file
  local merged_config="${project_dir}/apps/web/config/cora-modules.config.yaml"
  cat > "$merged_config" << 'CONFIGHEADER'
# =============================================================================
# CORA Modules Configuration
# =============================================================================
# This file is auto-generated by merging all enabled module configurations.
# DO NOT EDIT MANUALLY - changes will be overwritten!
#
# Generated by: create-cora-monorepo.sh
# To modify: Update individual module.config.yaml files and regenerate
# =============================================================================

CONFIGHEADER
  
  # Merge each module's config
  local modules_merged=0
  for module in "${all_modules[@]}"; do
    # Determine module path (core vs functional) using helper function
    local module_type=""
    if command -v yq &> /dev/null && [[ -f "$REGISTRY_FILE" ]]; then
      module_type=$(yq -r ".modules.${module}.type // \"\"" "$REGISTRY_FILE" 2>/dev/null | tr -d '[:space:]')
    fi
    
    # Fallback if yq not available or module not in registry
    if [[ -z "$module_type" ]]; then
      # Determine by checking which directory contains the module
      if [[ -d "${TOOLKIT_ROOT}/templates/_modules-core/${module}" ]]; then
        module_type="core"
      elif [[ -d "${TOOLKIT_ROOT}/templates/_modules-functional/${module}" ]]; then
        module_type="functional"
      fi
    fi
    
    local module_config_file=""
    
    if [[ "$module_type" == "core" ]]; then
      module_config_file="${TOOLKIT_ROOT}/templates/_modules-core/${module}/module.config.yaml"
    elif [[ "$module_type" == "functional" ]]; then
      module_config_file="${TOOLKIT_ROOT}/templates/_modules-functional/${module}/module.config.yaml"
    else
      log_warn "Unknown module type for ${module}: ${module_type}"
      continue
    fi
    
    # Check if module config exists
    if [[ ! -f "$module_config_file" ]]; then
      log_warn "Module config not found: ${module_config_file}"
      log_info "Skipping ${module} (no configuration file)"
      continue
    fi
    
    # Append module config to merged file
    echo "" >> "$merged_config"
    echo "# -----------------------------------------------------------------------------" >> "$merged_config"
    echo "# Module: ${module} (${module_type})" >> "$merged_config"
    echo "# -----------------------------------------------------------------------------" >> "$merged_config"
    echo "" >> "$merged_config"
    
    # Copy the module config content (skip comments at top)
    sed '/^# =/,/^$/d' "$module_config_file" >> "$merged_config"
    
    modules_merged=$((modules_merged + 1))
    log_info "  ✅ Merged ${module} configuration"
  done
  
  log_info "Merged ${modules_merged} module configurations"
  log_info "Created: ${merged_config}"
  
  # Create a .gitkeep in config directory to ensure it's tracked
  touch "${project_dir}/apps/web/config/.gitkeep"
  
  echo ""
}

# --- Inline function removed - now using standalone script ---
# consolidate_database_schemas() + run_migrations() → scripts/monorepo/setup-database.sh

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
    
    # Build web app + dynamically build only the modules that were copied
    log_info "Building web app and enabled CORA modules..."
    
    # Start with web app filter
    local build_filters=("--filter=${PROJECT_NAME}-web")
    
    # Add core modules if enabled
    if [[ "$WITH_CORE_MODULES" == "true" ]]; then
      for module in "module-access" "module-ai" "module-ws" "module-mgmt" "module-kb" "module-chat"; do
        build_filters+=("--filter=@${PROJECT_NAME}/${module}")
      done
    fi
    
    # Add functional modules that were enabled in config
    for module in "${ENABLED_MODULES[@]}"; do
      build_filters+=("--filter=@${PROJECT_NAME}/module-${module}")
    done
    
    # Execute build with dynamic filters
    pnpm "${build_filters[@]}" build 2>&1 | tail -20
  )
  
  log_info "✅ Packages built (only enabled modules)"
}

# --- Run Database Migrations ---
run_migrations() {
  local project_dir="$1"
  
  log_step "Running database migrations..."
  
  # Check if database credentials are available
  if [[ ! -f "${project_dir}/scripts/validation/.env" ]]; then
    log_warn "Database credentials not found at ${project_dir}/scripts/validation/.env"
    log_info "Skipping automatic migrations. Run migrations manually after setup."
    return
  fi
  
  # Load database credentials
  source "${project_dir}/scripts/validation/.env"
  
  # Verify required credentials are set
  if [[ -z "$SUPABASE_DB_HOST" ]] || [[ -z "$SUPABASE_DB_USER" ]] || [[ -z "$SUPABASE_DB_PASSWORD" ]]; then
    log_warn "Database credentials incomplete. Required: SUPABASE_DB_HOST, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD"
    log_info "Skipping automatic migrations. Run migrations manually."
    return
  fi
  
  # Check if psql is available
  if ! command -v psql &> /dev/null; then
    log_warn "psql not found. Install PostgreSQL client to enable automatic migrations."
    log_info "On macOS: brew install postgresql"
    log_info "Skipping automatic migrations. Run migrations manually using Supabase Dashboard."
    return
  fi
  
  # URL-encode password for PostgreSQL connection string
  url_encode_password() {
    python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=''))" "$1"
  }
  
  # Build connection string with URL-encoded password
  local encoded_password=$(url_encode_password "$SUPABASE_DB_PASSWORD")
  local conn_string="postgresql://${SUPABASE_DB_USER}:${encoded_password}@${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT:-6543}/${SUPABASE_DB_NAME:-postgres}"
  
  # Execute setup-database.sql
  if [[ -f "${project_dir}/scripts/setup-database.sql" ]]; then
    log_info "Executing setup-database.sql..."
    echo ""
    
    local psql_output=$(mktemp)
    local psql_errors=$(mktemp)
    
    psql "$conn_string" -f "${project_dir}/scripts/setup-database.sql" \
         --echo-errors \
         > "$psql_output" 2> "$psql_errors"
    local psql_exit_code=$?
    
    # Check for actual errors
    local has_errors=false
    if grep -q "^ERROR:" "$psql_errors" 2>/dev/null; then
      has_errors=true
    fi
    
    if [[ $psql_exit_code -eq 0 ]] || ! $has_errors; then
      
      # Show summary of what was executed
      log_info "Schema creation completed. Summary:"
      echo ""
      
      # Count and show created objects
      local tables_created=$(grep -c "CREATE TABLE" "$psql_output" 2>/dev/null || echo "0")
      local indexes_created=$(grep -c "CREATE INDEX" "$psql_output" 2>/dev/null || echo "0")
      local functions_created=$(grep -c "CREATE FUNCTION\|CREATE OR REPLACE FUNCTION" "$psql_output" 2>/dev/null || echo "0")
      local policies_created=$(grep -c "CREATE POLICY" "$psql_output" 2>/dev/null || echo "0")
      local inserts_done=$(grep -c "INSERT INTO" "$psql_output" 2>/dev/null || echo "0")
      
      echo "  📊 Objects Created:"
      echo "     - Tables: $tables_created"
      echo "     - Indexes: $indexes_created"
      echo "     - Functions: $functions_created"
      echo "     - Policies: $policies_created"
      echo "     - Data Inserts: $inserts_done"
      echo ""
      
      # Check for any warnings or notices in output
      if grep -q "NOTICE\|WARNING" "$psql_output" 2>/dev/null; then
        log_warn "Notices/Warnings detected:"
        grep "NOTICE\|WARNING" "$psql_output" | sed 's/^/     /'
        echo ""
      fi
      
      log_info "✅ Database schema created successfully"
      
    else
      log_error "❌ Failed to execute setup-database.sql"
      echo ""
      log_error "PostgreSQL Errors:"
      cat "$psql_errors" | sed 's/^/     /'
      echo ""
      
      if grep -q "does not exist" "$psql_errors"; then
        log_warn "💡 Possible causes:"
        echo "     - Table referenced in policy/constraint doesn't exist yet"
        echo "     - Schema files may be in wrong order"
        echo "     - Check for typos in table names (e.g., 'profiles' vs 'user_profiles')"
        echo ""
      fi
      
      log_warn "You may need to run migrations manually:"
      echo "  psql \"${conn_string}\" -f ${project_dir}/scripts/setup-database.sql"
      echo ""
      log_info "Or run with verbose output to see details:"
      echo "  psql \"${conn_string}\" -f ${project_dir}/scripts/setup-database.sql -v ON_ERROR_STOP=1 --echo-all"
      
      rm -f "$psql_output" "$psql_errors"
      return 1
    fi
    
    rm -f "$psql_output" "$psql_errors"
  fi
  
  echo ""
  log_info "🎉 Database migrations completed successfully!"
}

# --- Stamp Project Version ---
stamp_project_version() {
  local project_dir="$1"
  local version_file="${project_dir}/.cora-version.yaml"
  
  log_step "Stamping project with toolkit and module versions..."
  
  # Check if .cora-version.yaml template exists
  if [[ ! -f "$version_file" ]]; then
    log_warn ".cora-version.yaml template not found at ${version_file}"
    log_info "Skipping version stamping"
    return
  fi
  
  # Read toolkit version from VERSION file
  local toolkit_version="unknown"
  if [[ -f "${TOOLKIT_ROOT}/VERSION" ]]; then
    toolkit_version=$(cat "${TOOLKIT_ROOT}/VERSION" | tr -d '[:space:]')
    log_info "Toolkit version: ${toolkit_version}"
  else
    log_warn "VERSION file not found at ${TOOLKIT_ROOT}/VERSION"
  fi
  
  # Get current date
  local created_date=$(date +%Y-%m-%d)
  
  # Replace toolkit version and dates
  sed -i '' "s/{{TOOLKIT_VERSION}}/${toolkit_version}/g" "$version_file" 2>/dev/null || \
  sed -i "s/{{TOOLKIT_VERSION}}/${toolkit_version}/g" "$version_file"
  
  sed -i '' "s/{{CREATED_DATE}}/${created_date}/g" "$version_file" 2>/dev/null || \
  sed -i "s/{{CREATED_DATE}}/${created_date}/g" "$version_file"
  
  # Read module versions from module-registry.yaml
  local REGISTRY_FILE="${TOOLKIT_ROOT}/templates/_modules-core/module-registry.yaml"
  if [[ -f "$REGISTRY_FILE" ]]; then
    local modules=("module-access" "module-ai" "module-ws" "module-mgmt" "module-kb" "module-chat" "module-eval" "module-voice")
    
    for module in "${modules[@]}"; do
      local module_version="unknown"
      
      if command -v yq &> /dev/null; then
        module_version=$(yq ".modules.${module}.version // \"unknown\"" "$REGISTRY_FILE" | tr -d '[:space:]')
      else
        module_version=$(grep -A20 "^  ${module}:" "$REGISTRY_FILE" | grep "version:" | head -1 | sed 's/.*version: *"\([^"]*\)".*/\1/' | tr -d '[:space:]')
        [[ -z "$module_version" ]] && module_version="unknown"
      fi
      
      local placeholder="{{MODULE_${module#module-}_VERSION}}"
      local placeholder_upper=$(echo "$placeholder" | tr '[:lower:]' '[:upper:]' | sed 's/-/_/g')
      
      sed -i '' "s/${placeholder_upper}/${module_version}/g" "$version_file" 2>/dev/null || \
      sed -i "s/${placeholder_upper}/${module_version}/g" "$version_file"
      
      log_info "  ${module}: ${module_version}"
    done
  else
    log_warn "Module registry not found: ${REGISTRY_FILE}"
  fi
  
  log_info "✅ Project version stamped"
}

# --- Check Dependencies ---
check_dependencies() {
  log_step "Checking required dependencies..."
  
  local missing_deps=()
  
  # Check for yq (required for YAML parsing)
  if ! command -v yq &> /dev/null; then
    log_warn "yq not found - YAML parsing will use grep fallback (less reliable)"
    log_info "Install yq for better reliability: brew install yq"
  else
    local yq_version=$(yq --version 2>&1 | head -1)
    log_info "✅ yq found: ${yq_version}"
  fi
  
  # Check for git (required for repo initialization)
  if $INIT_GIT && ! command -v git &> /dev/null; then
    log_error "git not found but git initialization enabled"
    missing_deps+=("git")
  fi
  
  # Check for gh CLI (required for GitHub repo creation)
  if $CREATE_REPOS && ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) not found but --create-repos specified"
    log_info "Install from: https://cli.github.com/"
    missing_deps+=("gh")
  fi
  
  # Check for openssl (required for secret generation)
  if ! command -v openssl &> /dev/null; then
    log_error "openssl not found (required for secret generation)"
    missing_deps+=("openssl")
  fi
  
  # Fail if critical dependencies are missing
  if [[ ${#missing_deps[@]} -gt 0 ]]; then
    log_error "Missing required dependencies: ${missing_deps[*]}"
    exit 1
  fi
  
  log_info "Dependency check complete"
  echo ""
}

# --- Run Post-Creation Validation ---
run_post_creation_validation() {
  local project_dir="$1"
  
  log_step "Running validation suite..."
  
  # Check if cora-validate.py exists
  if [[ ! -f "${project_dir}/scripts/validation/cora-validate.py" ]]; then
    log_warn "Validation orchestrator not found: ${project_dir}/scripts/validation/cora-validate.py"
    log_info "Skipping post-creation validation."
    return
  fi
  
  # Check if python3 is available
  if ! command -v python3 &> /dev/null; then
    log_warn "python3 not found. Skipping validation."
    return
  fi
  
  # Run all validators (full validation suite)
  cd "${project_dir}/scripts/validation"
  
  # Capture exit code while still showing output
  python3 cora-validate.py project "${project_dir}" \
    --format text
  local exit_code=$?
  
  cd - > /dev/null
  
  # Report results based on exit code
  if [[ $exit_code -eq 0 ]]; then
    log_info "✅ Initial validation passed"
  else
    log_warn "⚠️  Validation found issues (exit code: ${exit_code})"
    log_info "Review validation output above for details"
  fi
  
  echo ""
  log_info "Run full validation after deploying: cd scripts/validation && python3 cora-validate.py project ../.."
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

# --- Check Dependencies ---
if [[ "$DRY_RUN" == "false" ]]; then
  check_dependencies
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

# --- Copy Config File to Project (if provided) ---
if [[ -n "$INPUT_CONFIG" ]] && [[ "$DRY_RUN" == "false" ]]; then
  log_info "Copying config file to project..."
  
  # Copy config file with project-specific name
  cp "$INPUT_CONFIG" "${PROJECT_FOLDER}/setup.config.${PROJECT_NAME}.yaml"
  
  log_info "✅ Config file saved as: setup.config.${PROJECT_NAME}.yaml"
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
        
        # Copy module routes to web app if they exist
        CORE_MODULE_TEMPLATE="${TOOLKIT_ROOT}/templates/_modules-core/${module}"
        core_routes_dir="${CORE_MODULE_TEMPLATE}/routes"
        if [[ -d "$core_routes_dir" ]]; then
          app_routes_dir="${PROJECT_FOLDER}/apps/web/app"
          log_info "  Copying routes from ${module}..."

          # Copy each route file (using -print0 to handle special chars like [id])
          route_files=()
          while IFS= read -r -d '' route_file; do
            route_files+=("$route_file")
          done < <(find "$core_routes_dir" \( -name "page.tsx" -o -name "layout.tsx" \) -print0)
          
          # Process each route file
          for route_file in "${route_files[@]}"; do
            relative_path="${route_file#$core_routes_dir/}"
            target_dir="${app_routes_dir}/$(dirname "$relative_path")"

            # Use -- to prevent option parsing issues, quote paths for [id] bracket handling
            mkdir -p -- "$target_dir"
            cp -- "$route_file" "$target_dir/"

            # Replace placeholders in the copied route file
            target_file="${target_dir}/$(basename "$route_file")"
            sed -i '' "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$target_file" 2>/dev/null || \
            sed -i "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$target_file"

            log_info "    ✅ Created route: /$(dirname "$relative_path")"
          done
        fi
        
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
        
        # Copy module routes to web app if they exist
        FUNCTIONAL_MODULE_TEMPLATE="${TOOLKIT_ROOT}/templates/_modules-functional/${module_name}"
        func_routes_dir="${FUNCTIONAL_MODULE_TEMPLATE}/routes"
        if [[ -d "$func_routes_dir" ]]; then
          app_routes_dir="${PROJECT_FOLDER}/apps/web/app"
          log_info "  Copying routes from ${module_name}..."

          # Copy each route file (using -print0 to handle special chars like [id])
          route_files=()
          while IFS= read -r -d '' route_file; do
            route_files+=("$route_file")
          done < <(find "$func_routes_dir" \( -name "page.tsx" -o -name "layout.tsx" \) -print0)
          
          # Process each route file
          for route_file in "${route_files[@]}"; do
            relative_path="${route_file#$func_routes_dir/}"
            target_dir="${app_routes_dir}/$(dirname "$relative_path")"

            # Use -- to prevent option parsing issues, quote paths for [id] bracket handling
            mkdir -p -- "$target_dir"
            cp -- "$route_file" "$target_dir/"

            # Replace placeholders in the copied route file
            target_file="${target_dir}/$(basename "$route_file")"
            sed -i '' "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$target_file" 2>/dev/null || \
            sed -i "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$target_file"

            log_info "    ✅ Created route: /$(dirname "$relative_path")"
          done
        fi
        
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
  # Copy validation scripts first (needed for validation)
  log_step "Copying validation scripts to project..."
  mkdir -p "${PROJECT_FOLDER}/scripts/validation"
  if [[ -d "${TOOLKIT_ROOT}/validation" ]]; then
    cp -r "${TOOLKIT_ROOT}/validation/"* "${PROJECT_FOLDER}/scripts/validation/"
    log_info "✅ Validation scripts copied"
  else
    log_warn "Validation directory not found in toolkit"
  fi
  echo ""
  
  # Call standalone scripts for automation
  "${SCRIPT_DIR}/monorepo/generate-env-files.sh" --config "$INPUT_CONFIG" --target "$PROJECT_FOLDER"
  merge_module_configs "$INPUT_CONFIG" "$PROJECT_FOLDER"
  "${SCRIPT_DIR}/monorepo/generate-terraform-vars.sh" --config "$INPUT_CONFIG" --target "$PROJECT_FOLDER"
  
  if [[ "$WITH_CORE_MODULES" == "true" ]] || [[ ${#ENABLED_MODULES[@]} -gt 0 ]]; then
    "${SCRIPT_DIR}/monorepo/setup-database.sh" --target "$PROJECT_FOLDER" --provision
    install_validation_deps "$PROJECT_FOLDER"
    build_packages "$PROJECT_FOLDER"
  fi
  
  stamp_project_version "$PROJECT_FOLDER"
  
  # Run validation suite at the end
  run_post_creation_validation "$PROJECT_FOLDER"
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