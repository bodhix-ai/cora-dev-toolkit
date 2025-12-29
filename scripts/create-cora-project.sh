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
GITHUB_ORG=""
AWS_REGION="us-east-1"
OUTPUT_DIR="."
CREATE_REPOS=false
INIT_GIT=true
DRY_RUN=false
WITH_CORE_MODULES=false

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
Create CORA Project

Usage: $0 <project-name> [OPTIONS]

Creates both {project}-infra and {project}-stack repositories from CORA templates.

Arguments:
  project-name          Name of the project (e.g., "my-app")
                        Will create my-app-infra and my-app-stack

Options:
  --org, --github-org   GitHub organization/owner for the repositories
                        Required if using --create-repos
  --region              AWS region for infrastructure (default: us-east-1)
  --output-dir          Directory to create projects in (default: current directory)
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
  # Create project locally
  $0 my-app --org mycompany

  # Create with GitHub repos
  $0 my-app --org mycompany --create-repos

  # Specify region and output directory
  $0 my-app --org mycompany --region eu-west-1 --output-dir ~/projects

  # Preview what would be created
  $0 my-app --org mycompany --dry-run

EOF
}

# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
  case $1 in
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
INFRA_DIR="${OUTPUT_DIR}/${INFRA_NAME}"
STACK_DIR="${OUTPUT_DIR}/${STACK_NAME}"

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

# --- Helper Functions ---
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
  CORE_MODULES_DIR="${TOOLKIT_ROOT}/templates/_cora-core-modules"
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
  
  # Generate SQL seed file based on auth provider (using INSERT...ON CONFLICT for idempotency)
  if [[ "$auth_provider" == "okta" ]]; then
    cat > "${stack_dir}/scripts/seed-idp-config.sql" << 'SQLEOF'
-- Seed Okta IDP Configuration
-- Generated by create-cora-project.sh
-- This configures Okta as the active identity provider
-- Idempotent: Safe to run multiple times

-- Configure Okta provider
INSERT INTO platform_idp_config (provider_type, display_name, config, is_configured, is_active)
VALUES (
  'okta',
  'Okta',
  jsonb_build_object(
    'client_id', '${OKTA_CLIENT_ID}',
    'issuer', '${OKTA_ISSUER}'
  ),
  true,
  true
)
ON CONFLICT (provider_type) 
DO UPDATE SET
  config = EXCLUDED.config,
  is_configured = true,
  is_active = true,
  updated_at = NOW();

-- Deactivate other providers
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

-- Configure Clerk provider
INSERT INTO platform_idp_config (provider_type, display_name, config, is_configured, is_active)
VALUES (
  'clerk',
  'Clerk',
  jsonb_build_object(
    'publishable_key', '${CLERK_PUBLISHABLE_KEY}',
    'issuer', '${CLERK_ISSUER}'
  ),
  true,
  true
)
ON CONFLICT (provider_type) 
DO UPDATE SET
  config = EXCLUDED.config,
  is_configured = true,
  is_active = true,
  updated_at = NOW();

-- Deactivate other providers
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
  
  log_step "Running initial validation (structure & portability only)..."
  
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
  
  # Run structure and portability validators only (no DB required)
  cd "${stack_dir}/scripts/validation"
  
  # Capture exit code while still showing output
  python3 cora-validate.py project "${stack_dir}" \
    --validators structure portability \
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
    generate_terraform_vars "$CONFIG_FILE" "$INFRA_DIR"
    generate_infra_env "$CONFIG_FILE" "$INFRA_DIR"
    seed_idp_config "$CONFIG_FILE" "$STACK_DIR"
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
