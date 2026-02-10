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
  
  # Parse YAML (simple key-value parsing)
  while IFS=': ' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    
    # Remove quotes from value
    value="${value//\"/}"
    value="${value//\'/}"
    
    case "$key" in
      project_name) PROJECT_NAME="$value" ;;
      github_org) GITHUB_ORG="$value" ;;
      aws_region) AWS_REGION="$value" ;;
      core_modules)
        if [[ "$value" == "true" ]]; then
          WITH_CORE_MODULES=true
        fi
        ;;
      functional_modules)
        # Parse comma-separated list
        IFS=',' read -ra ENABLED_MODULES <<< "$value"
        ;;
    esac
  done < "$config_file"
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
  
  # Module declaration (monorepo uses local path)
  local module_declaration="
# ${module_name^^} - CORA Module
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

# Read config file if provided
if [[ -n "$INPUT_CONFIG" ]]; then
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

# Set project folder
PROJECT_FOLDER="${OUTPUT_DIR}/${PROJECT_NAME}"

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
        add_module_to_terraform "$module_name" "$PROJECT_FOLDER" "$PROJECT_NAME"
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