#!/bin/bash

# Create CORA Project
# Creates both {project}-infra and {project}-stack repositories from templates
#
# Usage: ./create-cora-project.sh <project-name> [OPTIONS]

set -e

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOLKIT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATE_INFRA="${TOOLKIT_ROOT}/templates/_project-infra-template"
TEMPLATE_STACK="${TOOLKIT_ROOT}/templates/_project-stack-template"

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

# Function to add CORA module to Terraform configuration
add_module_to_terraform() {
  local module_name="$1"
  local infra_dir="$2"
  local project_name="$3"
  local main_tf="${infra_dir}/envs/dev/main.tf"
  
  # Skip if dry run or file doesn't exist
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
  
  # Generate module declaration based on module type
  local module_declaration=""
  local module_underscore="${module_name//-/_}"
  
  # Determine module type and description prefix
  local module_type=$(get_module_metadata "$module_name" "type" 2>/dev/null || echo "functional")
  local module_prefix=""
  local module_description=""
  
  case "$module_name" in
    module-access)
      module_prefix="CORE-ACCESS"
      module_description="Identity & Access Control"
      ;;
    module-ai)
      module_prefix="CORE-AI"
      module_description="AI Provider Management"
      ;;
    module-mgmt)
      module_prefix="CORE-MGMT"
      module_description="Platform Management & Monitoring"
      ;;
    module-ws)
      module_prefix="FUNC-WS"
      module_description="Workspace Management"
      ;;
    module-kb)
      module_prefix="FUNC-KB"
      module_description="Knowledge Base"
      ;;
    module-chat)
      module_prefix="FUNC-CHAT"
      module_description="Chat & Messaging"
      ;;
    module-project)
      module_prefix="FUNC-PROJECT"
      module_description="Project Management"
      ;;
    *)
      # Generic functional module
      module_prefix="FUNC-$(echo ${module_name#module-} | tr '[:lower:]' '[:upper:]')"
      module_description="$(echo ${module_name#module-} | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2));}1')"
      ;;
  esac
  
  case "$module_name" in
    module-ws)
      module_declaration="
# ========================================================================
# ${module_prefix}: ${module_description}
# ========================================================================

module \"${module_underscore}\" {
  source = \"../../../${project_name}-stack/packages/${module_name}/infrastructure\"

  project_name         = \"${project_name}\"
  environment          = \"dev\"
  org_common_layer_arn = module.module_access.layer_arn
  supabase_secret_arn  = module.secrets.supabase_secret_arn
  aws_region           = var.aws_region
  log_level            = var.log_level

  # Lambda deployment packages
  workspace_lambda_zip = \"../../../${project_name}-stack/packages/${module_name}/backend/.build/workspace.zip\"
  cleanup_lambda_zip   = \"../../../${project_name}-stack/packages/${module_name}/backend/.build/cleanup.zip\"

  common_tags = {
    Environment = \"dev\"
    Project     = \"${project_name}\"
    ManagedBy   = \"terraform\"
    Module      = \"${module_name}\"
    ModuleType  = \"CORA\"
  }
}
"
      ;;
    *)
      # Generic functional module template
      module_declaration="
# ========================================================================
# ${module_prefix}: ${module_description}
# ========================================================================

module \"${module_underscore}\" {
  source = \"../../../${project_name}-stack/packages/${module_name}/infrastructure\"

  project_name         = \"${project_name}\"
  environment          = \"dev\"
  org_common_layer_arn = module.module_access.layer_arn
  supabase_secret_arn  = module.secrets.supabase_secret_arn
  aws_region           = var.aws_region
  log_level            = var.log_level

  common_tags = {
    Environment = \"dev\"
    Project     = \"${project_name}\"
    ManagedBy   = \"terraform\"
    Module      = \"${module_name}\"
    ModuleType  = \"CORA\"
  }
}
"
      ;;
  esac
  
  # Find insertion point (before "# CORA Modular API Gateway")
  local marker="# CORA Modular API Gateway"
  local line_num=$(grep -n "$marker" "$main_tf" | head -1 | cut -d: -f1)
  
  if [[ -z "$line_num" ]]; then
    log_error "Could not find insertion marker in main.tf"
    return 1
  fi
  
  # Insert module declaration before the marker
  # Create temp file with module declaration inserted
  {
    head -n $((line_num - 1)) "$main_tf"
    echo "$module_declaration"
    tail -n +$line_num "$main_tf"
  } > "${main_tf}.tmp"
  
  mv "${main_tf}.tmp" "$main_tf"
  log_info "✅ Added ${module_name} to Terraform configuration"

  # Also add the module's api_routes to the modular_api_gateway module_routes
  # This ensures the module's API endpoints are registered with the API Gateway
  local module_underscore="${module_name//-/_}"
  local routes_pattern="module.module_mgmt.api_routes,"
  local new_routes="module.module_mgmt.api_routes,\n    module.${module_underscore}.api_routes,"
  
  if grep -q "module.${module_underscore}.api_routes" "$main_tf"; then
    log_info "  Module routes already in API Gateway config"
  else
    # Add the module's api_routes to the concat
    sed -i '' "s|${routes_pattern}|${new_routes}|" "$main_tf" 2>/dev/null || \
    sed -i "s|${routes_pattern}|${new_routes}|" "$main_tf"
    log_info "  ✅ Added ${module_name} API routes to API Gateway"
  fi

  return 0
}

show_help() {
  cat << EOF
Create CORA Project

Usage: $0 <project-name> [OPTIONS]

Creates both {project}-infra and {project}-stack repositories from CORA templates.

Arguments:
  project-name          Name of the project (e.g., "ai-sec")
                        Used for repo folder names: ai-sec-infra, ai-sec-stack
                        Also used for package naming: @ai-sec/module-access

Options:
  --folder <name>       Parent directory name (e.g., "test-ws-06")
                        If specified, repos created in: <folder-path>/<folder>/{project}-{infra,stack}
                        If not specified, repos created directly in folder-path
  --org, --github-org   GitHub organization/owner for the repositories
                        Required if using --create-repos
  --region              AWS region for infrastructure (default: us-east-1)
  --output-dir          Base directory path (default: current directory)
                        This is the folder_path where parent folder is created
  --create-repos        Create GitHub repositories (requires gh CLI)
  --with-core-modules   Include scaffolding for the 3 core CORA modules:
                        module-access, module-ai, module-mgmt
  --no-git              Don't initialize git repositories
  --dry-run             Show what would be created without making changes
  --help                Show this help message

Environment Variables:
  GITHUB_ORG            Default GitHub organization (can be overridden with --org)
  AWS_REGION            Default AWS region

Examples:
  # Create in parent folder (recommended)
  $0 ai-sec --folder test-ws-06 --output-dir ~/code/sts --with-core-modules
  # Creates: ~/code/sts/test-ws-06/ai-sec-infra and ~/code/sts/test-ws-06/ai-sec-stack

  # Create directly in output dir (no parent folder)
  $0 my-app --output-dir ~/projects
  # Creates: ~/projects/my-app-infra and ~/projects/my-app-stack

EOF
}

# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
  case $1 in
    --folder|--project-folder)
      PROJECT_FOLDER="$2"
      shift 2
      ;;
    --org|--github-org)
      GITHUB_ORG="$2"
      shift 2
      ;;
    --region)
      AWS_REGION="$2"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --create-repos)
      CREATE_REPOS=true
      shift
      ;;
    --with-core-modules)
      WITH_CORE_MODULES=true
      shift
      ;;
    --modules)
      # Parse comma-separated list of modules
      IFS=',' read -ra ENABLED_MODULES <<< "$2"
      shift 2
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
        log_error "Unexpected argument: $1"
        show_help
        exit 1
      fi
      shift
      ;;
  esac
done

# --- Validate Arguments ---
if [[ -z "$PROJECT_NAME" ]]; then
  log_error "Project name is required"
  show_help
  exit 1
fi

# Validate project name format (lowercase, alphanumeric with hyphens)
if ! [[ "$PROJECT_NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
  log_error "Invalid project name: $PROJECT_NAME"
  echo "Project name must:"
  echo "  - Start with a lowercase letter"
  echo "  - Contain only lowercase letters, numbers, and hyphens"
  exit 1
fi

# GitHub org is required for repo creation
if $CREATE_REPOS && [[ -z "$GITHUB_ORG" ]]; then
  log_error "--org is required when using --create-repos"
  exit 1
fi

# Use environment variable if --org not specified
if [[ -z "$GITHUB_ORG" ]]; then
  GITHUB_ORG="${GITHUB_ORG:-}"
fi

# Check templates exist
if [[ ! -d "$TEMPLATE_INFRA" ]]; then
  log_error "Infra template not found: $TEMPLATE_INFRA"
  exit 1
fi

# --- Derived Values ---
INFRA_NAME="${PROJECT_NAME}-infra"
STACK_NAME="${PROJECT_NAME}-stack"

# If PROJECT_FOLDER is specified, create parent directory and place repos inside
if [[ -n "$PROJECT_FOLDER" ]]; then
  PARENT_DIR="${OUTPUT_DIR}/${PROJECT_FOLDER}"
  INFRA_DIR="${PARENT_DIR}/${INFRA_NAME}"
  STACK_DIR="${PARENT_DIR}/${STACK_NAME}"
else
  # No parent folder - create repos directly in OUTPUT_DIR
  INFRA_DIR="${OUTPUT_DIR}/${INFRA_NAME}"
  STACK_DIR="${OUTPUT_DIR}/${STACK_NAME}"
fi

# --- Generate Secrets ---
# Generate NEXTAUTH_SECRET for NextAuth.js (used with Okta)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# --- Display Configuration ---
echo "========================================"
echo "  Create CORA Project"
echo "========================================"
echo ""
log_info "Project Name:    ${PROJECT_NAME}"
log_info "GitHub Org:      ${GITHUB_ORG:-"(not specified)"}"
log_info "AWS Region:      ${AWS_REGION}"
log_info "Output Dir:      ${OUTPUT_DIR}"
log_info "Create Repos:    ${CREATE_REPOS}"
log_info "Core Modules:    ${WITH_CORE_MODULES}"
log_info "Init Git:        ${INIT_GIT}"
echo ""
log_info "Will create:"
echo "  - ${INFRA_DIR}"
echo "  - ${STACK_DIR}"
echo ""

if $DRY_RUN; then
  log_warn "DRY RUN - No changes will be made"
  echo ""
fi

# --- Dependency Check ---
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
    log_error "git not found but --init-git specified"
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

# --- Module Registry Functions ---
REGISTRY_FILE="${TOOLKIT_ROOT}/templates/_modules-core/module-registry.yaml"

# Load module metadata from registry
get_module_metadata() {
  local module_name="$1"
  local field="$2"
  
  if [[ ! -f "$REGISTRY_FILE" ]]; then
    log_error "Module registry not found: ${REGISTRY_FILE}"
    return 1
  fi
  
  if command -v yq &> /dev/null; then
    # Use -r flag to output raw strings without quotes, and trim whitespace
    yq -r ".modules.${module_name}.${field} // \"\"" "$REGISTRY_FILE" | tr -d '[:space:]'
  else
    # Fallback: grep-based extraction (limited functionality)
    log_warn "Using grep fallback for module registry (yq not available)"
    grep -A10 "^  ${module_name}:" "$REGISTRY_FILE" | grep "    ${field}:" | sed "s/.*${field}: *\"*\\([^\"]*\\)\"*.*/\\1/" | head -1
  fi
}

# Resolve module dependencies recursively (bash 3.x compatible)
resolve_module_dependencies() {
  local enabled_modules_var="$1"
  local resolved_modules_var="$2"
  
  log_step "Resolving module dependencies..."
  
  if [[ ! -f "$REGISTRY_FILE" ]]; then
    log_error "Module registry not found: ${REGISTRY_FILE}"
    return 1
  fi
  
  # Get input arrays using eval (bash 3.x compatible indirect reference)
  eval "local modules_to_process=(\"\${${enabled_modules_var}[@]}\")"
  
  # Track processed modules using space-delimited string (bash 3.x compatible)
  local processed_modules=" "
  local _resolved_list=()  # Use underscore prefix to avoid shadowing output variable
  
  while [[ ${#modules_to_process[@]} -gt 0 ]]; do
    local current_module="${modules_to_process[0]}"
    # Remove first element (bash 3.x compatible)
    local new_queue=()
    for ((i=1; i<${#modules_to_process[@]}; i++)); do
      new_queue+=("${modules_to_process[$i]}")
    done
    modules_to_process=("${new_queue[@]}")
    
    # Skip if already processed (check space-delimited string)
    if [[ "$processed_modules" == *" $current_module "* ]]; then
      continue
    fi
    
    # Mark as processed (add to space-delimited string)
    processed_modules="${processed_modules}${current_module} "
    
    # Check if module exists in registry
    local module_type=$(get_module_metadata "$current_module" "type")
    if [[ -z "$module_type" ]]; then
      log_error "Module not found in registry: ${current_module}"
      return 1
    fi
    
    log_info "  Processing ${current_module} (type: ${module_type})"
    
    # Get dependencies for this module
    local dependencies=""
    if command -v yq &> /dev/null; then
      dependencies=$(yq ".modules.${current_module}.dependencies[]" "$REGISTRY_FILE" 2>/dev/null | tr '\n' ' ')
    else
      # Fallback: extract dependencies array (limited)
      dependencies=$(grep -A10 "^  ${current_module}:" "$REGISTRY_FILE" | grep "dependencies:" | sed 's/.*dependencies: *\[\(.*\)\].*/\1/' | tr ',' ' ')
    fi
    
    # Add dependencies to processing queue
    if [[ -n "$dependencies" ]]; then
      for dep in $dependencies; do
        dep=$(echo "$dep" | tr -d '[],\" ')  # Clean up formatting
        if [[ -n "$dep" ]]; then
          log_info "    Dependency: ${dep}"
          modules_to_process+=("$dep")
        fi
      done
    fi
    
    # Add current module to resolved list (if not already there)
    local already_in_resolved=false
    for mod in "${_resolved_list[@]}"; do
      if [[ "$mod" == "$current_module" ]]; then
        already_in_resolved=true
        break
      fi
    done
    if ! $already_in_resolved; then
      _resolved_list+=("$current_module")
    fi
  done
  
  # Return resolved modules by setting the output variable using eval
  # Note: Must escape the inner array so it expands AFTER eval, not before
  eval "${resolved_modules_var}=(\"\${_resolved_list[@]}\")"
  
  log_info "Dependency resolution complete. Modules to install:"
  for module in "${_resolved_list[@]}"; do
    log_info "  - ${module}"
  done
  echo ""
}

# Validate module compatibility (bash 3.x compatible)
validate_modules() {
  local modules_var="$1"
  
  log_step "Validating module configuration..."
  
  # Get array using eval (bash 3.x compatible)
  eval "local modules_to_validate=(\"\${${modules_var}[@]}\")"
  
  for module in "${modules_to_validate[@]}"; do
    local module_type=$(get_module_metadata "$module" "type")
    local required=$(get_module_metadata "$module" "required")
    
    # Core modules are always valid
    if [[ "$module_type" == "core" ]]; then
      log_info "  ✅ ${module} (core module, tier $(get_module_metadata "$module" "tier"))"
      continue
    fi
    
    # Functional modules need validation
    if [[ "$module_type" == "functional" ]]; then
      log_info "  ✅ ${module} (functional module)"
      continue
    fi
    
    log_warn "  ⚠️  ${module} (unknown type: ${module_type})"
  done
  
  echo ""
}

# Merge module configurations
merge_module_configs() {
  local config_file="$1"
  local stack_dir="$2"
  
  log_step "Merging module configurations..."
  
  # Check if config file exists
  if [[ ! -f "$config_file" ]]; then
    log_warn "Config file not found: $config_file"
    log_info "Skipping module config merging. Module configurations will use defaults."
    return
  fi
  
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
  
  # Always include core modules
  local all_modules=("module-access" "module-ai" "module-mgmt")
  
  # Add enabled functional modules from config file
  for module in "${enabled_modules[@]}"; do
    if [[ ! " ${all_modules[*]} " =~ " ${module} " ]]; then
      all_modules+=("$module")
    fi
  done
  
  # Also add functional modules from --modules command line parameter
  for module in "${ENABLED_MODULES[@]}"; do
    if [[ ! " ${all_modules[*]} " =~ " ${module} " ]]; then
      all_modules+=("$module")
    fi
  done
  
  # Resolve dependencies (don't use 'local' - eval needs to set this from the called function)
  resolved_modules=()
  if ! resolve_module_dependencies all_modules resolved_modules; then
    log_error "Failed to resolve module dependencies"
    return 1
  fi
  
  # Validate modules
  if ! validate_modules resolved_modules; then
    log_error "Module validation failed"
    return 1
  fi
  
  # Create output directory for merged config
  mkdir -p "${stack_dir}/apps/web/config"
  
  # Start merged config file
  local merged_config="${stack_dir}/apps/web/config/cora-modules.config.yaml"
  cat > "$merged_config" << 'CONFIGHEADER'
# =============================================================================
# CORA Modules Configuration
# =============================================================================
# This file is auto-generated by merging all enabled module configurations.
# DO NOT EDIT MANUALLY - changes will be overwritten!
#
# Generated by: create-cora-project.sh
# To modify: Update individual module.config.yaml files and regenerate
# =============================================================================

CONFIGHEADER
  
  # Merge each module's config
  local modules_merged=0
  for module in "${resolved_modules[@]}"; do
    # Determine module path (core vs functional)
    local module_type=$(get_module_metadata "$module" "type")
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
  touch "${stack_dir}/apps/web/config/.gitkeep"
  
  echo ""
}

# --- Helper Functions ---

# Run dependency check early (after functions are defined)
check_dependencies

# --- Create Parent Directory (if specified) ---
if [[ -n "$PROJECT_FOLDER" ]] && ! $DRY_RUN; then
  log_step "Creating parent directory: ${PARENT_DIR}"
  mkdir -p "$PARENT_DIR"
  log_info "Created ${PARENT_DIR}"
fi

replace_placeholders() {
  local dir="$1"
  
  log_info "Replacing placeholders in ${dir}..."
  
  # Find and replace in all files
  find "$dir" -type f \( -name "*.tf" -o -name "*.json" -o -name "*.md" -o -name "*.sh" -o -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.yaml" -o -name "*.yml" -o -name ".clinerules" \) | while read -r file; do
    if [[ -f "$file" ]]; then
      # Replace machine-readable project name
      sed -i '' "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file" 2>/dev/null || \
      sed -i "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file"
      
      # Replace display name (fallback to PROJECT_NAME if not set)
      PROJECT_DISPLAY_NAME="${PROJECT_DISPLAY_NAME:-${PROJECT_NAME}}"
      sed -i '' "s/{{PROJECT_DISPLAY_NAME}}/${PROJECT_DISPLAY_NAME}/g" "$file" 2>/dev/null || \
      sed -i "s/{{PROJECT_DISPLAY_NAME}}/${PROJECT_DISPLAY_NAME}/g" "$file"
      
      # Replace AWS region
      sed -i '' "s/{{AWS_REGION}}/${AWS_REGION}/g" "$file" 2>/dev/null || \
      sed -i "s/{{AWS_REGION}}/${AWS_REGION}/g" "$file"
      
      # Replace GitHub organization if provided
      if [[ -n "$GITHUB_ORG" ]]; then
        sed -i '' "s/{{GITHUB_ORG}}/${GITHUB_ORG}/g" "$file" 2>/dev/null || \
        sed -i "s/{{GITHUB_ORG}}/${GITHUB_ORG}/g" "$file"
        
        sed -i '' "s/{{ORGANIZATION_NAME}}/${GITHUB_ORG}/g" "$file" 2>/dev/null || \
        sed -i "s/{{ORGANIZATION_NAME}}/${GITHUB_ORG}/g" "$file"
      fi
    fi
  done
}

create_github_repo() {
  local repo_name="$1"
  local description="$2"
  local local_dir="$3"
  
  if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) not found. Install from https://cli.github.com/"
    exit 1
  fi
  
  log_step "Creating GitHub repository: ${GITHUB_ORG}/${repo_name}"
  
  if $DRY_RUN; then
    log_info "[DRY RUN] Would create repo: ${GITHUB_ORG}/${repo_name}"
    return
  fi
  
  # Create repository
  gh repo create "${GITHUB_ORG}/${repo_name}" \
    --private \
    --description "$description" \
    --source "$local_dir" \
    --remote origin \
    --push
  
  log_info "Created: https://github.com/${GITHUB_ORG}/${repo_name}"
}

# --- Create Infra Repository ---
log_step "Creating ${INFRA_NAME}..."

if $DRY_RUN; then
  log_info "[DRY RUN] Would copy template to ${INFRA_DIR}"
else
  if [[ -d "$INFRA_DIR" ]]; then
    log_error "Directory already exists: ${INFRA_DIR}"
    exit 1
  fi
  
  cp -r "$TEMPLATE_INFRA" "$INFRA_DIR"
  replace_placeholders "$INFRA_DIR"
  
  # Make scripts executable
  chmod +x "$INFRA_DIR"/scripts/*.sh 2>/dev/null || true
  chmod +x "$INFRA_DIR"/bootstrap/*.sh 2>/dev/null || true
  
  log_info "Created ${INFRA_DIR}"
fi

# --- Create Stack Repository ---
log_step "Creating ${STACK_NAME}..."

if $DRY_RUN; then
  log_info "[DRY RUN] Would copy template to ${STACK_DIR}"
else
  if [[ -d "$STACK_DIR" ]]; then
    log_error "Directory already exists: ${STACK_DIR}"
    exit 1
  fi
  
  if [[ -d "$TEMPLATE_STACK" ]]; then
    cp -r "$TEMPLATE_STACK" "$STACK_DIR"
    replace_placeholders "$STACK_DIR"
    
    # Keep setup.config.{project}.yaml if it exists, but ensure it's in .gitignore
    # This file contains secrets and should not be committed
    if [[ -f "${STACK_DIR}/setup.config.${PROJECT_NAME}.yaml" ]]; then
      log_info "Found setup.config.${PROJECT_NAME}.yaml - adding to .gitignore"
      
      # Add to .gitignore if not already there
      if [[ -f "${STACK_DIR}/.gitignore" ]]; then
        if ! grep -q "setup.config.*.yaml" "${STACK_DIR}/.gitignore"; then
          echo "" >> "${STACK_DIR}/.gitignore"
          echo "# Project-specific configuration (contains secrets)" >> "${STACK_DIR}/.gitignore"
          echo "setup.config.*.yaml" >> "${STACK_DIR}/.gitignore"
          echo "!setup.config.example.yaml" >> "${STACK_DIR}/.gitignore"
          log_info "Added setup.config.*.yaml to .gitignore"
        fi
      fi
      
      # Also add to validation .gitignore to exclude from validation
      VALIDATION_GITIGNORE="${STACK_DIR}/scripts/validation/.gitignore"
      if [[ ! -f "$VALIDATION_GITIGNORE" ]]; then
        mkdir -p "$(dirname "$VALIDATION_GITIGNORE")"
        cat > "$VALIDATION_GITIGNORE" << 'VALGITIGNORE'
# Validation environment and credentials
.venv/
.env

# Project configuration files (contain secrets)
../../setup.config.*.yaml
!../../setup.config.example.yaml
VALGITIGNORE
        log_info "Created validation .gitignore"
      else
        if ! grep -q "setup.config" "$VALIDATION_GITIGNORE"; then
          echo "" >> "$VALIDATION_GITIGNORE"
          echo "# Project configuration files (contain secrets)" >> "$VALIDATION_GITIGNORE"
          echo "../../setup.config.*.yaml" >> "$VALIDATION_GITIGNORE"
          echo "!../../setup.config.example.yaml" >> "$VALIDATION_GITIGNORE"
          log_info "Added setup.config exclusions to validation .gitignore"
        fi
      fi
    else
      log_info "No setup.config.${PROJECT_NAME}.yaml found in template"
      log_info "Copy setup.config.example.yaml to setup.config.${PROJECT_NAME}.yaml and configure before deployment"
    fi
    
    # Make scripts executable
    chmod +x "$STACK_DIR"/scripts/*.sh 2>/dev/null || true
    
    log_info "Created ${STACK_DIR}"
  else
    log_warn "Stack template not found: ${TEMPLATE_STACK}"
    log_info "Creating minimal stack directory structure..."
    
    mkdir -p "$STACK_DIR"/{apps/web,packages,scripts,docs,tests}
    
    # Create minimal project.json
    cat > "$STACK_DIR/project.json" << EOF
{
  "name": "${PROJECT_NAME}",
  "type": "stack",
  "version": "1.0.0",
  "description": "Application stack for ${PROJECT_NAME} CORA application",
  "cora": {
    "version": "1.0",
    "infraRepo": "${PROJECT_NAME}-infra"
  }
}
EOF
    
    # Create README
    cat > "$STACK_DIR/README.md" << EOF
# ${PROJECT_NAME}-stack

Application code repository for the ${PROJECT_NAME} CORA application.

## Setup

See the CORA Development Toolkit for setup instructions.
EOF
    
    log_info "Created minimal ${STACK_DIR}"
  fi
fi

# --- Replace Shared Package Placeholders ---
# The shared packages (api-client, shared-types, contracts) use ${project} placeholder
if [[ -d "${STACK_DIR}/packages" ]] && ! $DRY_RUN; then
  log_step "Configuring shared packages..."
  
  for pkg in api-client shared-types contracts; do
    if [[ -f "${STACK_DIR}/packages/${pkg}/package.json" ]]; then
      sed -i '' "s/\\\${project}/${PROJECT_NAME}/g" "${STACK_DIR}/packages/${pkg}/package.json" 2>/dev/null || \
      sed -i "s/\\\${project}/${PROJECT_NAME}/g" "${STACK_DIR}/packages/${pkg}/package.json"
    fi
  done
  
  log_info "Shared packages configured"
fi

# --- Create Core Modules ---
if $WITH_CORE_MODULES && ! $DRY_RUN; then
  log_step "Creating core CORA modules..."
  
  # Ensure packages directory exists
  mkdir -p "${STACK_DIR}/packages"
  
  CORE_MODULES=("module-access" "module-ai" "module-mgmt")
  CORE_MODULES_DIR="${TOOLKIT_ROOT}/templates/_modules-core"
  MODULE_TEMPLATE="${TOOLKIT_ROOT}/templates/_module-template"
  
  for module in "${CORE_MODULES[@]}"; do
    MODULE_DIR="${STACK_DIR}/packages/${module}"
    CORE_MODULE_TEMPLATE="${CORE_MODULES_DIR}/${module}"
    
    # Prefer actual core module templates if they exist
    if [[ -d "$CORE_MODULE_TEMPLATE" ]]; then
      log_info "Creating ${module} from core module template..."
      cp -r "$CORE_MODULE_TEMPLATE" "$MODULE_DIR"
      
      # Replace standardized placeholders ({{...}} format only)
      find "$MODULE_DIR" -type f \( -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.tf" -o -name "*.md" -o -name "*.sql" \) | while read -r file; do
        # Replace machine-readable project name
        sed -i '' "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file" 2>/dev/null || \
        sed -i "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file"
        
        # Replace display name (fallback to PROJECT_NAME if not set)
        PROJECT_DISPLAY_NAME="${PROJECT_DISPLAY_NAME:-${PROJECT_NAME}}"
        sed -i '' "s/{{PROJECT_DISPLAY_NAME}}/${PROJECT_DISPLAY_NAME}/g" "$file" 2>/dev/null || \
        sed -i "s/{{PROJECT_DISPLAY_NAME}}/${PROJECT_DISPLAY_NAME}/g" "$file"
      done
    elif [[ -d "$MODULE_TEMPLATE" ]]; then
      log_info "Creating ${module} from generic template..."
      cp -r "$MODULE_TEMPLATE" "$MODULE_DIR"
      
      # Replace placeholders in module
      find "$MODULE_DIR" -type f | while read -r file; do
        sed -i '' "s/{{MODULE_NAME}}/${module}/g" "$file" 2>/dev/null || \
        sed -i "s/{{MODULE_NAME}}/${module}/g" "$file"
        sed -i '' "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file" 2>/dev/null || \
        sed -i "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file"
      done
    else
      log_info "Creating minimal structure for ${module}..."
      mkdir -p "$MODULE_DIR"/{backend/lambdas,frontend/components,infrastructure,db/schema}
      
      # Create module.json
      TIER=$( [[ "$module" == "module-access" ]] && echo "1" || ([[ "$module" == "module-ai" ]] && echo "2" || echo "3") )
      cat > "$MODULE_DIR/module.json" << MODEOF
{
  "name": "${module}",
  "version": "1.0.0",
  "type": "core",
  "description": "CORA ${module} - Core module",
  "tier": ${TIER}
}
MODEOF
      
      cat > "$MODULE_DIR/README.md" << READMEEOF
# ${module}

Core CORA module for ${PROJECT_NAME}.

## Tier

$(echo "$TIER") - $( [[ "$module" == "module-access" ]] && echo "Identity & Access Control" || ([[ "$module" == "module-ai" ]] && echo "AI Provider Management" || echo "Platform Management") )

## Setup

This module requires implementation. See the CORA Development Toolkit for guidance.
READMEEOF
    fi
  done
  
  log_info "Core modules created: ${CORE_MODULES[*]}"
fi

# --- Create Functional Modules from config file or --modules parameter ---
# First, read modules from config file if it exists
CONFIG_MODULES=()
CONFIG_FILE_FOR_MODULES="${STACK_DIR}/setup.config.${PROJECT_NAME}.yaml"
if [[ -f "$CONFIG_FILE_FOR_MODULES" ]] && ! $DRY_RUN; then
  if command -v yq &> /dev/null; then
    while IFS= read -r module; do
      [[ -n "$module" && "$module" != "null" ]] && CONFIG_MODULES+=("$module")
    done < <(yq '.modules.enabled[]' "$CONFIG_FILE_FOR_MODULES" 2>/dev/null)
  fi
  if [[ ${#CONFIG_MODULES[@]} -gt 0 ]]; then
    log_info "Found modules in config file: ${CONFIG_MODULES[*]}"
    # Merge config modules into ENABLED_MODULES
    for module in "${CONFIG_MODULES[@]}"; do
      if [[ ! " ${ENABLED_MODULES[*]} " =~ " ${module} " ]]; then
        ENABLED_MODULES+=("$module")
      fi
    done
  fi
fi

if ! $DRY_RUN && [[ ${#ENABLED_MODULES[@]} -gt 0 ]]; then
  log_step "Creating functional modules..."
  log_info "Found ${#ENABLED_MODULES[@]} functional modules to create: ${ENABLED_MODULES[*]}"

  # Ensure packages directory exists
  mkdir -p "${STACK_DIR}/packages"

  FUNCTIONAL_MODULES_DIR="${TOOLKIT_ROOT}/templates/_modules-functional"

  for module in "${ENABLED_MODULES[@]}"; do
    # Skip core modules (they're created separately with --with-core-modules)
    if [[ "$module" == "module-access" ]] || [[ "$module" == "module-ai" ]] || [[ "$module" == "module-mgmt" ]]; then
      log_info "Skipping ${module} (core module, use --with-core-modules)"
      continue
    fi

    MODULE_DIR="${STACK_DIR}/packages/${module}"
    FUNCTIONAL_MODULE_TEMPLATE="${FUNCTIONAL_MODULES_DIR}/${module}"

    if [[ -d "$FUNCTIONAL_MODULE_TEMPLATE" ]]; then
      log_info "Creating ${module} from functional module template..."
      cp -r "$FUNCTIONAL_MODULE_TEMPLATE" "$MODULE_DIR"

      # Replace standardized placeholders ({{...}} format only)
      find "$MODULE_DIR" -type f \( -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.tf" -o -name "*.md" -o -name "*.sql" \) | while read -r file; do
        # Replace machine-readable project name
        sed -i '' "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file" 2>/dev/null || \
        sed -i "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file"

        # Replace display name (fallback to PROJECT_NAME if not set)
        PROJECT_DISPLAY_NAME="${PROJECT_DISPLAY_NAME:-${PROJECT_NAME}}"
        sed -i '' "s/{{PROJECT_DISPLAY_NAME}}/${PROJECT_DISPLAY_NAME}/g" "$file" 2>/dev/null || \
        sed -i "s/{{PROJECT_DISPLAY_NAME}}/${PROJECT_DISPLAY_NAME}/g" "$file"
      done

      # Copy module routes to app directory if they exist
      routes_dir="${FUNCTIONAL_MODULE_TEMPLATE}/routes"
      if [[ -d "$routes_dir" ]]; then
        app_routes_dir="${STACK_DIR}/apps/web/app"
        log_info "  Copying routes from ${module}..."

        # Copy each route directory
        find "$routes_dir" -name "page.tsx" | while read -r route_file; do
          relative_path="${route_file#$routes_dir/}"
          target_dir="${app_routes_dir}/$(dirname "$relative_path")"

          mkdir -p "$target_dir"
          cp "$route_file" "$target_dir/"

          # Replace placeholders in the copied route file
          target_file="${target_dir}/$(basename "$route_file")"
          sed -i '' "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$target_file" 2>/dev/null || \
          sed -i "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$target_file"

          log_info "    ✅ Created route: /$(dirname "$relative_path")"
        done
      fi

      log_info "✅ Created ${module}"

      # Add module to Terraform configuration
      add_module_to_terraform "$module" "$INFRA_DIR" "$PROJECT_NAME"
    else
      log_warn "Functional module template not found: ${FUNCTIONAL_MODULE_TEMPLATE}"
      log_info "Skipping ${module}"
    fi
  done
fi

# --- Initialize Git ---
if $INIT_GIT && ! $DRY_RUN; then
  log_step "Initializing git repositories..."
  
  # Init infra repo
  cd "$INFRA_DIR"
  git init
  git add .
  git commit -m "Initial commit from CORA template"
  cd - > /dev/null
  
  # Init stack repo
  cd "$STACK_DIR"
  git init
  git add .
  git commit -m "Initial commit from CORA template"
  cd - > /dev/null
  
  log_info "Git repositories initialized"
fi

# --- Create GitHub Repos ---
if $CREATE_REPOS && ! $DRY_RUN; then
  log_step "Creating GitHub repositories..."
  
  create_github_repo "$INFRA_NAME" "Infrastructure for ${PROJECT_NAME} CORA application" "$INFRA_DIR"
  create_github_repo "$STACK_NAME" "Application code for ${PROJECT_NAME} CORA application" "$STACK_DIR"
fi

# --- Generate .env from setup.config.yaml ---
generate_env_files() {
  local config_file="$1"
  local stack_dir="$2"
  
  if [[ ! -f "$config_file" ]]; then
    log_warn "Config file not found: $config_file"
    log_info "Skipping .env generation. Create setup.config.${PROJECT_NAME}.yaml to auto-generate .env files."
    return
  fi
  
  log_step "Generating .env files from ${config_file}..."
  
  # Check if yq is available for YAML parsing
  if ! command -v yq &> /dev/null; then
    log_warn "yq not found. Install with: brew install yq"
    log_info "Falling back to grep-based extraction..."
    
    # Fallback: grep-based extraction (less reliable)
    AUTH_PROVIDER=$(grep "^auth_provider:" "$config_file" | sed 's/.*auth_provider: *"\([^"]*\)".*/\1/' || echo "okta")
    SUPABASE_URL=$(grep -A5 "^supabase:" "$config_file" | grep "url:" | sed 's/.*url: *"\([^"]*\)".*/\1/' || echo "")
    SUPABASE_ANON_KEY=$(grep "anon_key:" "$config_file" | sed 's/.*anon_key: *"\([^"]*\)".*/\1/' || echo "")
    SUPABASE_SERVICE_KEY=$(grep "service_role_key:" "$config_file" | sed 's/.*service_role_key: *"\([^"]*\)".*/\1/' || echo "")
    OKTA_DOMAIN=$(grep -A5 "^auth:" "$config_file" | grep "domain:" | sed 's/.*domain: *"\([^"]*\)".*/\1/' || echo "")
    OKTA_CLIENT_ID=$(grep "client_id:" "$config_file" | head -1 | sed 's/.*client_id: *"\([^"]*\)".*/\1/' || echo "")
    OKTA_CLIENT_SECRET=$(grep "client_secret:" "$config_file" | head -1 | sed 's/.*client_secret: *"\([^"]*\)".*/\1/' || echo "")
    OKTA_ISSUER=$(grep "issuer:" "$config_file" | sed 's/.*issuer: *"\([^"]*\)".*/\1/' || echo "")
    # Database credentials for direct PostgreSQL connection
    SUPABASE_DB_HOST=$(grep "host:" "$config_file" | head -1 | sed 's/.*host: *"\([^"]*\)".*/\1/' || echo "")
    SUPABASE_DB_PORT=$(grep "port:" "$config_file" | head -1 | sed 's/.*port: *\([0-9]*\).*/\1/' || echo "6543")
    SUPABASE_DB_NAME=$(grep -A10 "db:" "$config_file" | grep "name:" | head -1 | sed 's/.*name: *"\([^"]*\)".*/\1/' || echo "postgres")
    SUPABASE_DB_USER=$(grep -A10 "db:" "$config_file" | grep "user:" | head -1 | sed 's/.*user: *"\([^"]*\)".*/\1/' || echo "")
    SUPABASE_DB_PASSWORD=$(grep -A10 "db:" "$config_file" | grep "password:" | head -1 | sed 's/.*password: *"\([^"]*\)".*/\1/' || echo "")
    # AWS Configuration for API Gateway validation
    AWS_CONFIG_PROFILE=$(grep -A5 "^aws:" "$config_file" | grep "profile:" | sed 's/.*profile: *"\([^"]*\)".*/\1/' || echo "")
    AWS_API_GATEWAY_ID=$(grep -A10 "api_gateway:" "$config_file" | grep "id:" | sed 's/.*id: *"\([^"]*\)".*/\1/' || echo "")
    AWS_API_GATEWAY_ENDPOINT=$(grep -A10 "api_gateway:" "$config_file" | grep "endpoint:" | sed 's/.*endpoint: *"\([^"]*\)".*/\1/' || echo "")
  else
    # Use yq for proper YAML parsing
    AUTH_PROVIDER=$(yq '.auth_provider // "okta"' "$config_file")
    SUPABASE_URL=$(yq '.supabase.url' "$config_file")
    SUPABASE_ANON_KEY=$(yq '.supabase.anon_key' "$config_file")
    SUPABASE_SERVICE_KEY=$(yq '.supabase.service_role_key' "$config_file")
    OKTA_DOMAIN=$(yq '.auth.okta.domain // ""' "$config_file")
    OKTA_CLIENT_ID=$(yq '.auth.okta.client_id // ""' "$config_file")
    OKTA_CLIENT_SECRET=$(yq '.auth.okta.client_secret // ""' "$config_file")
    OKTA_ISSUER=$(yq '.auth.okta.issuer // ""' "$config_file")
    # Database credentials for direct PostgreSQL connection
    SUPABASE_DB_HOST=$(yq '.supabase.db.host' "$config_file")
    SUPABASE_DB_PORT=$(yq '.supabase.db.port // 6543' "$config_file")
    SUPABASE_DB_NAME=$(yq '.supabase.db.name // "postgres"' "$config_file")
    SUPABASE_DB_USER=$(yq '.supabase.db.user' "$config_file")
    SUPABASE_DB_PASSWORD=$(yq '.supabase.db.password' "$config_file")
    # AWS Configuration for API Gateway validation
    AWS_CONFIG_PROFILE=$(yq '.aws.profile // ""' "$config_file")
    AWS_API_GATEWAY_ID=$(yq '.aws.api_gateway.id // ""' "$config_file")
    AWS_API_GATEWAY_ENDPOINT=$(yq '.aws.api_gateway.endpoint // ""' "$config_file")
  fi
  
  # Generate apps/web/.env.local for local development
  if [[ -d "${stack_dir}/apps/web" ]]; then
    cat > "${stack_dir}/apps/web/.env.local" << ENVEOF
# Generated from setup.config.${PROJECT_NAME}.yaml
# DO NOT COMMIT THIS FILE

# Auth Provider Configuration
NEXT_PUBLIC_AUTH_PROVIDER="${AUTH_PROVIDER}"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_KEY}"

# Okta
OKTA_DOMAIN="${OKTA_DOMAIN}"
OKTA_CLIENT_ID="${OKTA_CLIENT_ID}"
OKTA_CLIENT_SECRET="${OKTA_CLIENT_SECRET}"
OKTA_ISSUER="${OKTA_ISSUER}"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"

# CORA API Gateway URL
# This is set after infrastructure deployment. If not yet deployed, leave empty.
# Run: cd ../PROJECT_NAME-infra && ./scripts/update-env-from-terraform.sh dev
NEXT_PUBLIC_CORA_API_URL="${AWS_API_GATEWAY_ENDPOINT}"

# AWS
AWS_REGION="${AWS_REGION}"
ENVEOF
    log_info "Created ${stack_dir}/apps/web/.env.local"
  fi
  
  # Generate schema-validator .env (for validation tooling)
  # This includes direct PostgreSQL credentials for accurate schema introspection
  mkdir -p "${stack_dir}/scripts/validation"
  cat > "${stack_dir}/scripts/validation/.env" << ENVEOF
# =============================================================================
# Schema Validator Credentials for ${PROJECT_NAME}
# =============================================================================
# Generated by create-cora-project.sh
# DO NOT COMMIT THIS FILE

# Supabase REST API Credentials
SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_KEY}"

# Direct PostgreSQL Connection (for reliable schema introspection)
# This is required for accurate column detection in empty tables
SUPABASE_DB_HOST="${SUPABASE_DB_HOST}"
SUPABASE_DB_PORT="${SUPABASE_DB_PORT}"
SUPABASE_DB_NAME="${SUPABASE_DB_NAME}"
SUPABASE_DB_USER="${SUPABASE_DB_USER}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD}"

# AWS Configuration (for API Gateway validation)
AWS_REGION="${AWS_REGION}"
AWS_PROFILE="${AWS_CONFIG_PROFILE}"
API_GATEWAY_ID="${AWS_API_GATEWAY_ID}"
API_GATEWAY_ENDPOINT="${AWS_API_GATEWAY_ENDPOINT}"
ENVEOF
  log_info "Created ${stack_dir}/scripts/validation/.env"
  
  # Also create a .env.example for reference (without actual credentials)
  cat > "${stack_dir}/scripts/validation/.env.example" << ENVEOF
# =============================================================================
# Schema Validator Credentials Template
# =============================================================================
# Copy this file to .env and fill in your values

# Supabase REST API Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Direct PostgreSQL Connection
SUPABASE_DB_HOST=aws-0-us-east-1.pooler.supabase.com
SUPABASE_DB_PORT=6543
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.your-project-ref
SUPABASE_DB_PASSWORD=your-db-password

# AWS Configuration (for API Gateway validation)
AWS_REGION=us-east-1
AWS_PROFILE=your-aws-profile-name
API_GATEWAY_ID=your-api-gateway-id
API_GATEWAY_ENDPOINT=https://your-api-id.execute-api.us-east-1.amazonaws.com
ENVEOF
  log_info "Created ${stack_dir}/scripts/validation/.env.example"
}

# --- Generate Infra .env ---
generate_infra_env() {
  local config_file="$1"
  local infra_dir="$2"
  
  log_step "Generating .env file for infrastructure..."
  
  # Read AWS profile from config file if available
  local aws_profile_value=""
  if [[ -f "$config_file" ]]; then
    if command -v yq &> /dev/null; then
      aws_profile_value=$(yq '.aws.profile // ""' "$config_file")
    else
      aws_profile_value=$(grep -A5 "^aws:" "$config_file" | grep "profile:" | sed 's/.*profile: *"\([^"]*\)".*/\1/' || echo "")
    fi
  fi
  
  # Default to project-name-nonprod if not specified in config
  # Don't use GITHUB_ORG as that's the org name, not the AWS profile
  if [[ -z "$aws_profile_value" || "$aws_profile_value" == "null" ]]; then
    aws_profile_value="${PROJECT_NAME}-nonprod"
    log_warn "AWS profile not specified in config. Using default: ${aws_profile_value}"
    log_info "Update aws.profile in setup.config.${PROJECT_NAME}.yaml to set the correct AWS profile."
  fi
  
  # Create .env file in infra root
  cat > "${infra_dir}/.env" << ENVEOF
# =============================================================================
# Infrastructure Environment Configuration for ${PROJECT_NAME}
# =============================================================================
# Generated by create-cora-project.sh
# DO NOT COMMIT THIS FILE

# AWS Configuration
AWS_PROFILE=${aws_profile_value}
AWS_REGION=${AWS_REGION}
ENVEOF
  log_info "Created ${infra_dir}/.env"
  
  # Also create .env.example
  cat > "${infra_dir}/.env.example" << ENVEOF
# =============================================================================
# Infrastructure Environment Configuration Template
# =============================================================================
# Copy this file to .env and update with your values

# AWS Configuration
AWS_PROFILE=your-aws-profile-name
AWS_REGION=us-east-1
ENVEOF
  log_info "Created ${infra_dir}/.env.example"
}

# --- Generate Terraform Variables ---
generate_terraform_vars() {
  local config_file="$1"
  local infra_dir="$2"
  
  if [[ ! -f "$config_file" ]]; then
    log_warn "Config file not found: $config_file"
    log_info "Skipping local-secrets.tfvars generation."
    return
  fi
  
  log_step "Generating local-secrets.tfvars from ${config_file}..."
  
  # Check if yq is available
  if ! command -v yq &> /dev/null; then
    log_warn "yq not found. Install with: brew install yq"
    log_info "Falling back to grep-based extraction..."
    
    # Fallback: grep-based extraction
    GITHUB_OWNER=$(grep -A2 "^github:" "$config_file" | grep "owner:" | sed 's/.*owner: *"\([^"]*\)".*/\1/' || echo "")
    GITHUB_REPO=$(grep -A2 "^github:" "$config_file" | grep "repo_infra:" | sed 's/.*repo_infra: *"\([^"]*\)".*/\1/' || echo "")
    SUPABASE_URL=$(grep -A10 "^supabase:" "$config_file" | grep "url:" | sed 's/.*url: *"\([^"]*\)".*/\1/' || echo "")
    SUPABASE_ANON_KEY=$(grep "anon_key:" "$config_file" | sed 's/.*anon_key: *"\([^"]*\)".*/\1/' || echo "")
    SUPABASE_SERVICE_KEY=$(grep "service_role_key:" "$config_file" | sed 's/.*service_role_key: *"\([^"]*\)".*/\1/' || echo "")
    SUPABASE_JWT_SECRET=$(grep -A10 "^supabase:" "$config_file" | grep "jwt_secret:" | sed 's/.*jwt_secret: *"\([^"]*\)".*/\1/' || echo "")
    AUTH_PROVIDER=$(grep "^auth_provider:" "$config_file" | sed 's/.*auth_provider: *"\([^"]*\)".*/\1/' || echo "okta")
    OKTA_DOMAIN=$(grep -A10 "okta:" "$config_file" | grep "domain:" | sed 's/.*domain: *"\([^"]*\)".*/\1/' || echo "")
    OKTA_CLIENT_ID=$(grep -A10 "okta:" "$config_file" | grep "client_id:" | sed 's/.*client_id: *"\([^"]*\)".*/\1/' || echo "")
    OKTA_CLIENT_SECRET=$(grep -A10 "okta:" "$config_file" | grep "client_secret:" | sed 's/.*client_secret: *"\([^"]*\)".*/\1/' || echo "")
    OKTA_ISSUER=$(grep -A10 "okta:" "$config_file" | grep "issuer:" | sed 's/.*issuer: *"\([^"]*\)".*/\1/' || echo "")
    OKTA_AUDIENCE=$(grep -A10 "okta:" "$config_file" | grep "audience:" | sed 's/.*audience: *\([^ ]*\).*/\1/' || echo "api://default")
    CLERK_PUBLISHABLE_KEY=$(grep -A5 "^clerk:" "$config_file" | grep "publishable_key:" | sed 's/.*publishable_key: *"\([^"]*\)".*/\1/' || echo "")
    CLERK_SECRET_KEY=$(grep -A5 "^clerk:" "$config_file" | grep "secret_key:" | sed 's/.*secret_key: *"\([^"]*\)".*/\1/' || echo "")
  else
    # Use yq for proper YAML parsing
    GITHUB_OWNER=$(yq '.github.owner' "$config_file")
    GITHUB_REPO=$(yq '.github.repo_infra' "$config_file")
    SUPABASE_URL=$(yq '.supabase.url' "$config_file")
    SUPABASE_ANON_KEY=$(yq '.supabase.anon_key' "$config_file")
    SUPABASE_SERVICE_KEY=$(yq '.supabase.service_role_key' "$config_file")
    SUPABASE_JWT_SECRET=$(yq '.supabase.jwt_secret' "$config_file")
    AUTH_PROVIDER=$(yq '.auth_provider // "okta"' "$config_file")
    OKTA_DOMAIN=$(yq '.auth.okta.domain // ""' "$config_file")
    OKTA_CLIENT_ID=$(yq '.auth.okta.client_id // ""' "$config_file")
    OKTA_CLIENT_SECRET=$(yq '.auth.okta.client_secret // ""' "$config_file")
    OKTA_ISSUER=$(yq '.auth.okta.issuer // ""' "$config_file")
    OKTA_AUDIENCE=$(yq '.auth.okta.audience // "api://default"' "$config_file")
    CLERK_PUBLISHABLE_KEY=$(yq '.clerk.publishable_key // ""' "$config_file")
    CLERK_SECRET_KEY=$(yq '.clerk.secret_key' "$config_file")
  fi
  
  # Generate local-secrets.tfvars in HCL format
  cat > "${infra_dir}/envs/dev/local-secrets.tfvars" << TFVARSEOF
# =============================================================================
# Terraform Variables for ${PROJECT_NAME}
# =============================================================================
# Generated from setup.config.${PROJECT_NAME}.yaml
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
  
  log_info "Created ${infra_dir}/envs/dev/local-secrets.tfvars"
}

# --- Consolidate Database Schemas ---
consolidate_database_schemas() {
  local stack_dir="$1"
  
  log_step "Consolidating database schemas from all modules..."
  
  # Create scripts directory
  mkdir -p "${stack_dir}/scripts"
  
  # Check if packages directory exists
  if [[ ! -d "${stack_dir}/packages" ]]; then
    log_warn "Packages directory not found: ${stack_dir}/packages"
    return
  fi
  
  # Find all schema files from modules (simpler approach)
  local schema_files=()
  while IFS= read -r schema_file; do
    [[ -n "$schema_file" ]] && schema_files+=("$schema_file")
  done < <(find "${stack_dir}/packages" -path "*/db/schema/*.sql" -type f 2>/dev/null | sort)
  
  if [[ ${#schema_files[@]} -eq 0 ]]; then
    log_warn "No database schema files found in modules"
    log_info "Checked: ${stack_dir}/packages/*/db/schema/*.sql"
    return
  fi
  
  log_info "Found ${#schema_files[@]} schema files"
  
  # Create consolidated setup-database.sql
  cat > "${stack_dir}/scripts/setup-database.sql" << 'SQLHEADER'
-- =============================================================================
-- CORA Database Setup Script
-- =============================================================================
-- This file consolidates all database schemas from CORA modules.
-- It is idempotent and safe to run multiple times.
--
-- Generated by: create-cora-project.sh
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

SQLHEADER
  
  # Append each schema file
  for schema_file in "${schema_files[@]}"; do
    local module_name=$(basename "$(dirname "$(dirname "$(dirname "$schema_file")")")")
    local schema_name=$(basename "$schema_file")
    
    echo "" >> "${stack_dir}/scripts/setup-database.sql"
    echo "-- =============================================================================" >> "${stack_dir}/scripts/setup-database.sql"
    echo "-- Module: ${module_name}" >> "${stack_dir}/scripts/setup-database.sql"
    echo "-- Schema: ${schema_name}" >> "${stack_dir}/scripts/setup-database.sql"
    echo "-- =============================================================================" >> "${stack_dir}/scripts/setup-database.sql"
    echo "" >> "${stack_dir}/scripts/setup-database.sql"
    
    cat "$schema_file" >> "${stack_dir}/scripts/setup-database.sql"
    
    log_info "  Added ${module_name}/${schema_name}"
  done
  
  log_info "Created consolidated ${stack_dir}/scripts/setup-database.sql"
}

# --- Seed IDP Configuration ---
seed_idp_config() {
  local config_file="$1"
  local stack_dir="$2"
  
  if [[ ! -f "$config_file" ]]; then
    log_warn "Config file not found: $config_file"
    log_info "Skipping IDP configuration seeding."
    return
  fi
  
  log_step "Generating IDP configuration seed file from ${config_file}..."
  
  # Extract auth provider and credentials
  local auth_provider=""
  local okta_client_id=""
  local okta_issuer=""
  local clerk_publishable_key=""
  local clerk_issuer=""
  
  if command -v yq &> /dev/null; then
    auth_provider=$(yq '.auth_provider // "okta"' "$config_file")
    okta_client_id=$(yq '.auth.okta.client_id // ""' "$config_file")
    okta_client_id=$(yq '.auth.okta.client_id // ""' "$config_file")
    okta_issuer=$(yq '.auth.okta.issuer // ""' "$config_file")
    clerk_publishable_key=$(yq '.clerk.publishable_key // ""' "$config_file")
    clerk_issuer=$(yq '.clerk.issuer // ""' "$config_file")
  else
    # Fallback to grep (look for okta under auth section)
    auth_provider=$(grep "^auth_provider:" "$config_file" | sed 's/.*auth_provider: *"\([^"]*\)".*/\1/' || echo "okta")
    okta_client_id=$(grep -A10 "okta:" "$config_file" | grep "client_id:" | head -1 | sed 's/.*client_id: *"\([^"]*\)".*/\1/' || echo "")
    okta_issuer=$(grep -A10 "okta:" "$config_file" | grep "issuer:" | head -1 | sed 's/.*issuer: *"\([^"]*\)".*/\1/' || echo "")
    clerk_publishable_key=$(grep -A5 "^clerk:" "$config_file" | grep "publishable_key:" | sed 's/.*publishable_key: *"\([^"]*\)".*/\1/' || echo "")
    clerk_issuer=$(grep -A5 "^clerk:" "$config_file" | grep "issuer:" | sed 's/.*issuer: *"\([^"]*\)".*/\1/' || echo "")
  fi
  
  # Create scripts directory if it doesn't exist
  mkdir -p "${stack_dir}/scripts"
  
  # Generate SQL seed file based on auth provider (using UPDATE since schema seeds empty records)
  if [[ "$auth_provider" == "okta" ]]; then
    cat > "${stack_dir}/scripts/seed-idp-config.sql" << 'SQLEOF'
-- Seed Okta IDP Configuration
-- Generated by create-cora-project.sh
-- This configures Okta as the active identity provider
-- Idempotent: Safe to run multiple times

-- Configure Okta provider (schema already seeds empty record)
UPDATE platform_idp_config
SET 
  config = jsonb_build_object(
    'client_id', '${OKTA_CLIENT_ID}',
    'issuer', '${OKTA_ISSUER}'
  ),
  is_configured = true,
  is_active = true,
  updated_at = NOW()
WHERE provider_type = 'okta';

-- Deactivate other providers (trigger handles this, but explicit is safer)
UPDATE platform_idp_config
SET is_active = false, updated_at = NOW()
WHERE provider_type != 'okta';
SQLEOF
    
    # Replace placeholders in SQL file (using | as delimiter to avoid conflicts with URLs)
    sed -i '' "s|\${OKTA_CLIENT_ID}|${okta_client_id}|g" "${stack_dir}/scripts/seed-idp-config.sql" 2>/dev/null || \
    sed -i "s|\${OKTA_CLIENT_ID}|${okta_client_id}|g" "${stack_dir}/scripts/seed-idp-config.sql"
    
    sed -i '' "s|\${OKTA_ISSUER}|${okta_issuer}|g" "${stack_dir}/scripts/seed-idp-config.sql" 2>/dev/null || \
    sed -i "s|\${OKTA_ISSUER}|${okta_issuer}|g" "${stack_dir}/scripts/seed-idp-config.sql"
    
    log_info "Created seed-idp-config.sql for Okta"
    
  elif [[ "$auth_provider" == "clerk" ]]; then
    cat > "${stack_dir}/scripts/seed-idp-config.sql" << 'SQLEOF'
-- Seed Clerk IDP Configuration
-- Generated by create-cora-project.sh
-- This configures Clerk as the active identity provider
-- Idempotent: Safe to run multiple times

-- Configure Clerk provider (schema already seeds empty record)
UPDATE platform_idp_config
SET 
  config = jsonb_build_object(
    'publishable_key', '${CLERK_PUBLISHABLE_KEY}',
    'issuer', '${CLERK_ISSUER}'
  ),
  is_configured = true,
  is_active = true,
  updated_at = NOW()
WHERE provider_type = 'clerk';

-- Deactivate other providers (trigger handles this, but explicit is safer)
UPDATE platform_idp_config
SET is_active = false, updated_at = NOW()
WHERE provider_type != 'clerk';
SQLEOF
    
    # Replace placeholders in SQL file (using | as delimiter to avoid conflicts with URLs)
    sed -i '' "s|\${CLERK_PUBLISHABLE_KEY}|${clerk_publishable_key}|g" "${stack_dir}/scripts/seed-idp-config.sql" 2>/dev/null || \
    sed -i "s|\${CLERK_PUBLISHABLE_KEY}|${clerk_publishable_key}|g" "${stack_dir}/scripts/seed-idp-config.sql"
    
    sed -i '' "s|\${CLERK_ISSUER}|${clerk_issuer}|g" "${stack_dir}/scripts/seed-idp-config.sql" 2>/dev/null || \
    sed -i "s|\${CLERK_ISSUER}|${clerk_issuer}|g" "${stack_dir}/scripts/seed-idp-config.sql"
    
    log_info "Created seed-idp-config.sql for Clerk"
  else
    log_warn "Unknown auth provider: ${auth_provider}. Skipping IDP seed file generation."
    return
  fi
  
  # Create README with instructions
  cat > "${stack_dir}/scripts/README-database-setup.md" << 'READMEEOF'
# Database Setup Instructions

This directory contains database setup and seed scripts for your CORA project.

## Initial Setup (First Time)

### Step 1: Run Schema Setup

Creates all tables, RLS policies, functions, and triggers.

**Using Supabase CLI (Recommended):**
```bash
cd PROJECT_NAME-stack
supabase db push scripts/setup-database.sql
```

**Using psql:**
```bash
psql "postgresql://postgres.ref:${SUPABASE_DB_PASSWORD}@${SUPABASE_DB_HOST}:6543/postgres" \
  -f scripts/setup-database.sql
```

**Using Supabase Dashboard:**
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
2. Copy contents of `setup-database.sql`
3. Paste and run in SQL Editor

### Step 2: Seed IDP Configuration

Configures your authentication provider (Okta or Clerk).

**Using Supabase CLI:**
```bash
supabase db push scripts/seed-idp-config.sql
```

**Using psql:**
```bash
psql "postgresql://postgres.ref:${SUPABASE_DB_PASSWORD}@${SUPABASE_DB_HOST}:6543/postgres" \
  -f scripts/seed-idp-config.sql
```

## Verification

After setup, verify your database:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check IDP configuration
SELECT provider_type, is_active, is_configured, display_name
FROM platform_idp_config
WHERE is_active = true;
```

## Updating Schemas

The `setup-database.sql` file is idempotent and safe to rerun:
- Uses `CREATE TABLE IF NOT EXISTS`
- Uses `CREATE OR REPLACE FUNCTION`
- Will not drop existing data

To add new modules or update schemas, regenerate with:
```bash
# From cora-dev-toolkit
./scripts/create-cora-project.sh PROJECT_NAME --with-core-modules
```

## Troubleshooting

**Tables already exist:** Scripts are idempotent, safe to rerun.

**Permission errors:** Ensure you're using service_role key or admin credentials.

**Missing extensions:** The script enables required PostgreSQL extensions automatically.
READMEEOF
  
  log_info "Created ${stack_dir}/scripts/README-database-setup.md with setup instructions"
}

# --- Seed AI Provider Credentials ---
seed_ai_provider_credentials() {
  local config_file="$1"
  local stack_dir="$2"
  
  if [[ ! -f "$config_file" ]]; then
    log_warn "Config file not found: $config_file"
    log_info "Skipping AI provider credential seeding."
    return
  fi
  
  log_step "Generating AI provider credentials seed file from ${config_file}..."
  
  # Extract provider configurations using yq (with grep fallback)
  local bedrock_enabled="false"
  local bedrock_auth_method="iam_role"
  local bedrock_creds_path=""
  local azure_enabled="false"
  local azure_auth_method="secrets_manager"
  local azure_creds_path=""
  local google_enabled="false"
  local google_auth_method="secrets_manager"
  local google_creds_path=""
  
  if command -v yq &> /dev/null; then
    bedrock_enabled=$(yq '.ai_providers.aws_bedrock.enabled // false' "$config_file")
    bedrock_auth_method=$(yq '.ai_providers.aws_bedrock.auth_method // "iam_role"' "$config_file")
    bedrock_creds_path=$(yq '.ai_providers.aws_bedrock.credentials_secret_path // ""' "$config_file")
    azure_enabled=$(yq '.ai_providers.azure_ai_foundry.enabled // false' "$config_file")
    azure_auth_method=$(yq '.ai_providers.azure_ai_foundry.auth_method // "secrets_manager"' "$config_file")
    azure_creds_path=$(yq '.ai_providers.azure_ai_foundry.credentials_secret_path // ""' "$config_file")
    google_enabled=$(yq '.ai_providers.google_ai.enabled // false' "$config_file")
    google_auth_method=$(yq '.ai_providers.google_ai.auth_method // "secrets_manager"' "$config_file")
    google_creds_path=$(yq '.ai_providers.google_ai.credentials_secret_path // ""' "$config_file")
  else
    # Fallback: grep-based extraction
    log_info "Using grep-based YAML parsing (yq not available)"
    bedrock_enabled=$(grep -A5 "aws_bedrock:" "$config_file" | grep "enabled:" | sed 's/.*enabled: *\([^ ]*\).*/\1/' || echo "false")
    bedrock_auth_method=$(grep -A5 "aws_bedrock:" "$config_file" | grep "auth_method:" | sed 's/.*auth_method: *"\([^"]*\)".*/\1/' || echo "iam_role")
    bedrock_creds_path=$(grep -A5 "aws_bedrock:" "$config_file" | grep "credentials_secret_path:" | sed 's/.*credentials_secret_path: *"\([^"]*\)".*/\1/' || echo "")
    azure_enabled=$(grep -A5 "azure_ai_foundry:" "$config_file" | grep "enabled:" | sed 's/.*enabled: *\([^ ]*\).*/\1/' || echo "false")
    azure_auth_method=$(grep -A5 "azure_ai_foundry:" "$config_file" | grep "auth_method:" | sed 's/.*auth_method: *"\([^"]*\)".*/\1/' || echo "secrets_manager")
    azure_creds_path=$(grep -A5 "azure_ai_foundry:" "$config_file" | grep "credentials_secret_path:" | sed 's/.*credentials_secret_path: *"\([^"]*\)".*/\1/' || echo "")
    google_enabled=$(grep -A5 "google_ai:" "$config_file" | grep "enabled:" | sed 's/.*enabled: *\([^ ]*\).*/\1/' || echo "false")
    google_auth_method=$(grep -A5 "google_ai:" "$config_file" | grep "auth_method:" | sed 's/.*auth_method: *"\([^"]*\)".*/\1/' || echo "secrets_manager")
    google_creds_path=$(grep -A5 "google_ai:" "$config_file" | grep "credentials_secret_path:" | sed 's/.*credentials_secret_path: *"\([^"]*\)".*/\1/' || echo "")
  fi
  
  # Create scripts directory if it doesn't exist
  mkdir -p "${stack_dir}/scripts"
  
  # Generate SQL seed file using UPDATE (providers are already seeded by schema)
  cat > "${stack_dir}/scripts/seed-ai-provider-credentials.sql" << 'SQLEOF'
-- Seed AI Provider Credentials
-- Generated by create-cora-project.sh
-- This configures authentication for AI providers
-- Idempotent: Safe to run multiple times

-- AWS Bedrock
UPDATE public.ai_providers
SET 
  auth_method = '${BEDROCK_AUTH_METHOD}',
  credentials_secret_path = '${BEDROCK_CREDS_PATH}',
  is_active = ${BEDROCK_ENABLED},
  updated_at = NOW()
WHERE name = 'aws_bedrock';

-- Azure AI Foundry
UPDATE public.ai_providers
SET 
  auth_method = '${AZURE_AUTH_METHOD}',
  credentials_secret_path = '${AZURE_CREDS_PATH}',
  is_active = ${AZURE_ENABLED},
  updated_at = NOW()
WHERE name = 'azure_ai_foundry';

-- Google AI
UPDATE public.ai_providers
SET 
  auth_method = '${GOOGLE_AUTH_METHOD}',
  credentials_secret_path = '${GOOGLE_CREDS_PATH}',
  is_active = ${GOOGLE_ENABLED},
  updated_at = NOW()
WHERE name = 'google_ai';
SQLEOF
  
  # Replace placeholders (using | as delimiter to avoid conflicts with URLs/ARNs)
  sed -i '' "s|\${BEDROCK_AUTH_METHOD}|${bedrock_auth_method}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${BEDROCK_AUTH_METHOD}|${bedrock_auth_method}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  sed -i '' "s|\${BEDROCK_CREDS_PATH}|${bedrock_creds_path}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${BEDROCK_CREDS_PATH}|${bedrock_creds_path}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  sed -i '' "s|\${BEDROCK_ENABLED}|${bedrock_enabled}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${BEDROCK_ENABLED}|${bedrock_enabled}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  sed -i '' "s|\${AZURE_AUTH_METHOD}|${azure_auth_method}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${AZURE_AUTH_METHOD}|${azure_auth_method}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  sed -i '' "s|\${AZURE_CREDS_PATH}|${azure_creds_path}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${AZURE_CREDS_PATH}|${azure_creds_path}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  sed -i '' "s|\${AZURE_ENABLED}|${azure_enabled}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${AZURE_ENABLED}|${azure_enabled}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  sed -i '' "s|\${GOOGLE_AUTH_METHOD}|${google_auth_method}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${GOOGLE_AUTH_METHOD}|${google_auth_method}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  sed -i '' "s|\${GOOGLE_CREDS_PATH}|${google_creds_path}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${GOOGLE_CREDS_PATH}|${google_creds_path}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  sed -i '' "s|\${GOOGLE_ENABLED}|${google_enabled}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${GOOGLE_ENABLED}|${google_enabled}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  log_info "Created ${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  log_info "  AWS Bedrock: enabled=${bedrock_enabled}, auth_method=${bedrock_auth_method}"
  log_info "  Azure AI Foundry: enabled=${azure_enabled}, auth_method=${azure_auth_method}"
  log_info "  Google AI: enabled=${google_enabled}, auth_method=${google_auth_method}"
}

# --- Run Database Migrations ---
run_migrations() {
  local stack_dir="$1"
  
  log_step "Running database migrations..."
  
  # Check if database credentials are available
  if [[ ! -f "${stack_dir}/scripts/validation/.env" ]]; then
    log_warn "Database credentials not found at ${stack_dir}/scripts/validation/.env"
    log_info "Skipping automatic migrations. Run migrations manually after setup."
    return
  fi
  
  # Load database credentials
  source "${stack_dir}/scripts/validation/.env"
  
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
  # Special characters like &, =, @, etc. need to be encoded
  url_encode_password() {
    python3 -c "import urllib.parse; print(urllib.parse.quote('$1', safe=''))"
  }
  
  # Build connection string with URL-encoded password
  local encoded_password=$(url_encode_password "$SUPABASE_DB_PASSWORD")
  local conn_string="postgresql://${SUPABASE_DB_USER}:${encoded_password}@${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT:-6543}/${SUPABASE_DB_NAME:-postgres}"
  
  # Execute setup-database.sql with detailed output
  if [[ -f "${stack_dir}/scripts/setup-database.sql" ]]; then
    log_info "Executing setup-database.sql..."
    echo ""
    echo "  ========================================="
    echo "  Database Schema Creation - Detailed Log"
    echo "  ========================================="
    echo ""
    
    # Create temporary file to capture psql output
    local psql_output=$(mktemp)
    local psql_errors=$(mktemp)
    
    # Execute with verbose output
    if psql "$conn_string" -f "${stack_dir}/scripts/setup-database.sql" \
         -v ON_ERROR_STOP=1 \
         --echo-errors \
         > "$psql_output" 2> "$psql_errors"; then
      
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
      echo "  psql \"${conn_string}\" -f ${stack_dir}/scripts/setup-database.sql"
      echo ""
      log_info "Or run with verbose output to see details:"
      echo "  psql \"${conn_string}\" -f ${stack_dir}/scripts/setup-database.sql -v ON_ERROR_STOP=1 --echo-all"
      
      rm -f "$psql_output" "$psql_errors"
      return 1
    fi
    
    # Cleanup temp files
    rm -f "$psql_output" "$psql_errors"
  else
    log_warn "setup-database.sql not found, skipping schema creation"
  fi
  
  echo ""
  
  # Execute seed-idp-config.sql with detailed output
  if [[ -f "${stack_dir}/scripts/seed-idp-config.sql" ]]; then
    log_info "Executing seed-idp-config.sql..."
    echo ""
    
    # Create temporary file to capture psql output
    local psql_output=$(mktemp)
    local psql_errors=$(mktemp)
    
    if psql "$conn_string" -f "${stack_dir}/scripts/seed-idp-config.sql" \
         -v ON_ERROR_STOP=1 \
         --echo-errors \
         > "$psql_output" 2> "$psql_errors"; then
      
      log_info "IDP configuration seeded:"
      
      # Show what was inserted/updated
      if grep -q "INSERT\|UPDATE" "$psql_output" 2>/dev/null; then
        grep "INSERT\|UPDATE" "$psql_output" | sed 's/^/     /'
      fi
      
      echo ""
      log_info "✅ IDP configuration seeded successfully"
      
    else
      log_error "❌ Failed to execute seed-idp-config.sql"
      echo ""
      log_error "PostgreSQL Errors:"
      cat "$psql_errors" | sed 's/^/     /'
      echo ""
      log_warn "You may need to run seeding manually:"
      echo "  psql \"${conn_string}\" -f ${stack_dir}/scripts/seed-idp-config.sql"
      
      rm -f "$psql_output" "$psql_errors"
      return 1
    fi
    
    # Cleanup temp files
    rm -f "$psql_output" "$psql_errors"
  else
    log_warn "seed-idp-config.sql not found, skipping IDP seeding"
  fi
  
  echo ""
  
  # Execute seed-ai-provider-credentials.sql with detailed output
  if [[ -f "${stack_dir}/scripts/seed-ai-provider-credentials.sql" ]]; then
    log_info "Executing seed-ai-provider-credentials.sql..."
    echo ""
    
    # Create temporary file to capture psql output
    local psql_output=$(mktemp)
    local psql_errors=$(mktemp)
    
    if psql "$conn_string" -f "${stack_dir}/scripts/seed-ai-provider-credentials.sql" \
         -v ON_ERROR_STOP=1 \
         --echo-errors \
         > "$psql_output" 2> "$psql_errors"; then
      
      log_info "AI provider credentials configured:"
      
      # Show what was updated
      if grep -q "UPDATE" "$psql_output" 2>/dev/null; then
        grep "UPDATE" "$psql_output" | sed 's/^/     /'
      fi
      
      echo ""
      log_info "✅ AI provider credentials seeded successfully"
      
    else
      log_error "❌ Failed to execute seed-ai-provider-credentials.sql"
      echo ""
      log_error "PostgreSQL Errors:"
      cat "$psql_errors" | sed 's/^/     /'
      echo ""
      log_warn "You may need to run seeding manually:"
      echo "  psql \"${conn_string}\" -f ${stack_dir}/scripts/seed-ai-provider-credentials.sql"
      
      rm -f "$psql_output" "$psql_errors"
      return 1
    fi
    
    # Cleanup temp files
    rm -f "$psql_output" "$psql_errors"
  else
    log_warn "seed-ai-provider-credentials.sql not found, skipping AI provider credentials seeding"
  fi
  
  echo ""
  
  log_info "🎉 Database migrations completed successfully!"
}

# --- Consolidate Database Schemas ---
if ! $DRY_RUN && $WITH_CORE_MODULES; then
  consolidate_database_schemas "${STACK_DIR}"
fi

# --- Install Validation Dependencies ---
install_validation_deps() {
  local stack_dir="$1"
  local venv_dir="${stack_dir}/scripts/validation/.venv"
  
  log_step "Setting up validation environment..."
  
  # Check if python3 is available
  if ! command -v python3 &> /dev/null; then
    log_warn "python3 not found. Skipping validation dependency installation."
    log_info "Install Python 3 to enable automatic validation: brew install python3"
    return
  fi
  
  # Create virtual environment
  log_info "Creating Python virtual environment at ${venv_dir}..."
  if python3 -m venv "${venv_dir}" 2>/dev/null; then
    log_info "✅ Virtual environment created"
  else
    log_warn "Failed to create virtual environment"
    log_info "You may need to install venv: python3 -m pip install --user virtualenv"
    return
  fi
  
  # Install required packages in virtual environment
  log_info "Installing validation dependencies in virtual environment..."
  if "${venv_dir}/bin/pip" install --quiet boto3 supabase python-dotenv click colorama requests 2>/dev/null; then
    log_info "✅ Validation dependencies installed"
  else
    log_warn "Failed to install some validation dependencies"
    log_info "You may need to install manually:"
    log_info "  source ${venv_dir}/bin/activate"
    log_info "  pip install boto3 supabase python-dotenv click colorama requests"
    return
  fi
  
  # Create activation helper script
  cat > "${stack_dir}/scripts/validation/activate-venv.sh" << 'ACTIVATESCRIPT'
#!/bin/bash
# Activate validation virtual environment
# Usage: source ./activate-venv.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/.venv/bin/activate"

echo "✅ Validation environment activated"
echo "Run validators with: python -m api-tracer.cli --help"
echo "Deactivate with: deactivate"
ACTIVATESCRIPT
  
  chmod +x "${stack_dir}/scripts/validation/activate-venv.sh"
  log_info "Created activation script: scripts/validation/activate-venv.sh"
  
  # Create wrapper script for running validators
  cat > "${stack_dir}/scripts/validation/run-validators.sh" << 'RUNSCRIPT'
#!/bin/bash
# Run CORA validators with automatic venv activation
# Usage: ./run-validators.sh [validator-args]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="${SCRIPT_DIR}/.venv"

# Check if venv exists
if [[ ! -d "$VENV_DIR" ]]; then
  echo "❌ Virtual environment not found at ${VENV_DIR}"
  echo "Run project creation script with --with-core-modules to set up validation environment"
  exit 1
fi

# Activate venv
source "${VENV_DIR}/bin/activate"

# Get project root (2 levels up from scripts/validation)
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Run cora-validate.py with all arguments passed through
python3 "${SCRIPT_DIR}/cora-validate.py" project "${PROJECT_ROOT}" "$@"

# Deactivate venv
deactivate
RUNSCRIPT
  
  chmod +x "${stack_dir}/scripts/validation/run-validators.sh"
  log_info "Created wrapper script: scripts/validation/run-validators.sh"
  
  # Add .venv to .gitignore if it doesn't already exist
  if [[ ! -f "${stack_dir}/scripts/validation/.gitignore" ]]; then
    echo ".venv/" > "${stack_dir}/scripts/validation/.gitignore"
    echo ".env" >> "${stack_dir}/scripts/validation/.gitignore"
    log_info "Created .gitignore for validation directory"
  fi
  
  log_info "📦 Validation environment setup complete!"
  log_info "   To activate: source scripts/validation/activate-venv.sh"
  log_info "   To run validators: ./scripts/validation/run-validators.sh"
}

# --- Run Post-Creation Validation ---
run_post_creation_validation() {
  local stack_dir="$1"
  
  log_step "Running full validation suite..."
  
  # Check if cora-validate.py exists
  if [[ ! -f "${stack_dir}/scripts/validation/cora-validate.py" ]]; then
    log_warn "Validation orchestrator not found: ${stack_dir}/scripts/validation/cora-validate.py"
    log_info "Skipping post-creation validation."
    return
  fi
  
  # Check if python3 is available
  if ! command -v python3 &> /dev/null; then
    log_warn "python3 not found. Skipping validation."
    return
  fi
  
  # Run all validators (full validation suite)
  cd "${stack_dir}/scripts/validation"
  
  # Capture exit code while still showing output
  python3 cora-validate.py project "${stack_dir}" \
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
  
  log_info "Run full validation after deploying: cd scripts/validation && python3 cora-validate.py project ../.."
}

# --- Copy Validation Scripts ---
if ! $DRY_RUN; then
  log_step "Copying validation scripts to stack repo..."
  
  # Create validation directory in stack repo
  mkdir -p "${STACK_DIR}/scripts/validation"
  
  # Copy all validation tools from toolkit
  if [[ -d "${TOOLKIT_ROOT}/validation" ]]; then
    cp -r "${TOOLKIT_ROOT}/validation/"* "${STACK_DIR}/scripts/validation/"
    log_info "Validation scripts copied to ${STACK_DIR}/scripts/validation/"
  else
    log_warn "Validation directory not found in toolkit: ${TOOLKIT_ROOT}/validation"
  fi
fi

# --- Install Validation Dependencies ---
if ! $DRY_RUN && $WITH_CORE_MODULES; then
  install_validation_deps "$STACK_DIR"
fi

# Look for setup.config.{project}.yaml in stack dir and generate .env files
if ! $DRY_RUN; then
  CONFIG_FILE="${STACK_DIR}/setup.config.${PROJECT_NAME}.yaml"
  if [[ -f "$CONFIG_FILE" ]]; then
    generate_env_files "$CONFIG_FILE" "$STACK_DIR"
    merge_module_configs "$CONFIG_FILE" "$STACK_DIR"
    generate_terraform_vars "$CONFIG_FILE" "$INFRA_DIR"
    generate_infra_env "$CONFIG_FILE" "$INFRA_DIR"
    seed_idp_config "$CONFIG_FILE" "$STACK_DIR"
    seed_ai_provider_credentials "$CONFIG_FILE" "$STACK_DIR"
    run_migrations "$STACK_DIR"
  else
    log_info "No setup.config.${PROJECT_NAME}.yaml found. Copy setup.config.example.yaml to setup.config.${PROJECT_NAME}.yaml and re-run to generate .env and tfvars files."
    # Generate minimal .env file for infra even without config
    generate_infra_env "" "$INFRA_DIR"
  fi
fi

# --- Run Post-Creation Validation ---
if ! $DRY_RUN && $WITH_CORE_MODULES; then
  run_post_creation_validation "$STACK_DIR"
fi

# --- Summary ---
echo ""
echo "========================================"
echo "  Project Created Successfully"
echo "========================================"
echo ""
log_info "Created:"
echo "  - ${INFRA_DIR}"
echo "  - ${STACK_DIR}"
echo ""

if [[ -n "$GITHUB_ORG" ]] && $CREATE_REPOS; then
  log_info "GitHub Repositories:"
  echo "  - https://github.com/${GITHUB_ORG}/${INFRA_NAME}"
  echo "  - https://github.com/${GITHUB_ORG}/${STACK_NAME}"
  echo ""
fi

log_info "Next steps:"
echo "  1. cd ${INFRA_DIR}"
echo "  2. Review and configure envs/dev/variables.tf"
echo "  3. Run bootstrap/bootstrap_tf_state.sh to set up Terraform state"
echo "  4. Configure local-secrets.tfvars with your credentials"
echo "  5. Run scripts/deploy-terraform.sh dev"
echo ""
log_info "Generated secrets (save these securely!):"
echo "  NEXTAUTH_SECRET=${NEXTAUTH_SECRET}"
echo ""
if $WITH_CORE_MODULES; then
  log_info "Core modules created in ${STACK_DIR}/packages/"
  echo "  - module-access (Tier 1: Identity & access control)"
  echo "  - module-ai (Tier 2: AI provider management)"
  echo "  - module-mgmt (Tier 3: Platform management)"
  echo ""
  echo "  Implement each module following CORA Module Definition of Done."
fi
echo ""
log_info "For AI/Cline assistance:"
echo "  Review .clinerules in each repository for AI-actionable instructions."
echo ""
