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
      # Replace placeholders
      sed -i '' "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file" 2>/dev/null || \
      sed -i "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file"
      
      sed -i '' "s/{{AWS_REGION}}/${AWS_REGION}/g" "$file" 2>/dev/null || \
      sed -i "s/{{AWS_REGION}}/${AWS_REGION}/g" "$file"
      
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
      
      # Replace parameterized placeholders
      find "$MODULE_DIR" -type f \( -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.tf" -o -name "*.md" -o -name "*.sql" \) | while read -r file; do
        sed -i '' "s/\\\${project}/${PROJECT_NAME}/g" "$file" 2>/dev/null || \
        sed -i "s/\\\${project}/${PROJECT_NAME}/g" "$file"
        sed -i '' "s/\\\${project_display_name}/${PROJECT_NAME}/g" "$file" 2>/dev/null || \
        sed -i "s/\\\${project_display_name}/${PROJECT_NAME}/g" "$file"
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
    SUPABASE_URL=$(grep -A1 "^supabase:" "$config_file" | grep "url:" | sed 's/.*url: *"\([^"]*\)".*/\1/' || echo "")
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
  else
    # Use yq for proper YAML parsing
    SUPABASE_URL=$(yq '.supabase.url' "$config_file")
    SUPABASE_ANON_KEY=$(yq '.supabase.anon_key' "$config_file")
    SUPABASE_SERVICE_KEY=$(yq '.supabase.service_role_key' "$config_file")
    OKTA_DOMAIN=$(yq '.auth.okta.domain' "$config_file")
    OKTA_CLIENT_ID=$(yq '.auth.okta.client_id' "$config_file")
    OKTA_CLIENT_SECRET=$(yq '.auth.okta.client_secret' "$config_file")
    OKTA_ISSUER=$(yq '.auth.okta.issuer' "$config_file")
    # Database credentials for direct PostgreSQL connection
    SUPABASE_DB_HOST=$(yq '.supabase.db.host' "$config_file")
    SUPABASE_DB_PORT=$(yq '.supabase.db.port // 6543' "$config_file")
    SUPABASE_DB_NAME=$(yq '.supabase.db.name // "postgres"' "$config_file")
    SUPABASE_DB_USER=$(yq '.supabase.db.user' "$config_file")
    SUPABASE_DB_PASSWORD=$(yq '.supabase.db.password' "$config_file")
  fi
  
  # Generate apps/web/.env
  if [[ -d "${stack_dir}/apps/web" ]]; then
    cat > "${stack_dir}/apps/web/.env" << ENVEOF
# Generated from setup.config.${PROJECT_NAME}.yaml
# DO NOT COMMIT THIS FILE

# Supabase
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}

# Okta
OKTA_DOMAIN=${OKTA_DOMAIN}
OKTA_CLIENT_ID=${OKTA_CLIENT_ID}
OKTA_CLIENT_SECRET=${OKTA_CLIENT_SECRET}
OKTA_ISSUER=${OKTA_ISSUER}

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# AWS
AWS_REGION=${AWS_REGION}
ENVEOF
    log_info "Created ${stack_dir}/apps/web/.env"
  fi
  
  # Generate schema-validator .env (for validation tooling)
  # This includes direct PostgreSQL credentials for accurate schema introspection
  mkdir -p "${stack_dir}/validation"
  cat > "${stack_dir}/validation/.env" << ENVEOF
# =============================================================================
# Schema Validator Credentials for ${PROJECT_NAME}
# =============================================================================
# Generated by create-cora-project.sh
# DO NOT COMMIT THIS FILE

# Supabase REST API Credentials
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}

# Direct PostgreSQL Connection (for reliable schema introspection)
# This is required for accurate column detection in empty tables
SUPABASE_DB_HOST=${SUPABASE_DB_HOST}
SUPABASE_DB_PORT=${SUPABASE_DB_PORT}
SUPABASE_DB_NAME=${SUPABASE_DB_NAME}
SUPABASE_DB_USER=${SUPABASE_DB_USER}
SUPABASE_DB_PASSWORD=${SUPABASE_DB_PASSWORD}
ENVEOF
  log_info "Created ${stack_dir}/validation/.env"
  
  # Also create a .env.example for reference (without actual credentials)
  cat > "${stack_dir}/validation/.env.example" << ENVEOF
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
ENVEOF
  log_info "Created ${stack_dir}/validation/.env.example"
}

# Look for setup.config.{project}.yaml in stack dir and generate .env files
if ! $DRY_RUN; then
  CONFIG_FILE="${STACK_DIR}/setup.config.${PROJECT_NAME}.yaml"
  if [[ -f "$CONFIG_FILE" ]]; then
    generate_env_files "$CONFIG_FILE" "$STACK_DIR"
  else
    log_info "No setup.config.${PROJECT_NAME}.yaml found. Copy setup.config.example.yaml to setup.config.${PROJECT_NAME}.yaml and re-run to generate .env files."
  fi
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
