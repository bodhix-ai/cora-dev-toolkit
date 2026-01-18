#!/bin/bash

# Sync Infrastructure Files to Project
# Copies Terraform infrastructure files from templates to existing projects
#
# Usage: ./sync-infra-to-project.sh <project-stack-path> <file-path> [OPTIONS]

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
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOLKIT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

show_help() {
  cat << EOF
Sync Infrastructure Files to Project

This script copies Terraform infrastructure files from CORA module templates
to an existing project, avoiding the need for full project recreation.

Usage: $0 <project-stack-path> <file-path> [OPTIONS]

Arguments:
  project-stack-path   Path to the project-stack directory
  file-path           Infrastructure file path (can be partial match)

Options:
  --dry-run           Show what would be copied without copying
  --list              List common infrastructure file paths
  --help              Show this help message

Examples:
  # Sync a module infrastructure file
  $0 ~/code/bodhix/testing/test-eval/ai-sec-stack module-eval/infrastructure/main.tf

  # Sync using module name only (finds main.tf)
  $0 ~/code/bodhix/testing/test-eval/ai-sec-stack module-voice/infrastructure

  # Dry run to see what would be copied
  $0 ~/code/bodhix/testing/test-eval/ai-sec-stack module-eval/main.tf --dry-run

File Mappings:
  Core Modules:
    templates/_modules-core/module-access/infrastructure/*.tf
      → packages/module-access/infrastructure/*.tf

  Functional Modules:
    templates/_modules-functional/module-eval/infrastructure/*.tf
      → packages/module-eval/infrastructure/*.tf

Common Files:
  • main.tf       - Main infrastructure definition
  • variables.tf  - Input variables
  • outputs.tf    - Output values

EOF
}

list_common_paths() {
  cat << EOF
Common Infrastructure File Paths:

CORE MODULES:
  templates/_modules-core/module-access/infrastructure/main.tf
  templates/_modules-core/module-access/infrastructure/variables.tf
  templates/_modules-core/module-access/infrastructure/outputs.tf
  
  templates/_modules-core/module-ai/infrastructure/main.tf
  templates/_modules-core/module-mgmt/infrastructure/main.tf

FUNCTIONAL MODULES:
  templates/_modules-functional/module-eval/infrastructure/main.tf
  templates/_modules-functional/module-eval/infrastructure/variables.tf
  templates/_modules-functional/module-eval/infrastructure/outputs.tf
  
  templates/_modules-functional/module-voice/infrastructure/main.tf
  templates/_modules-functional/module-voice/infrastructure/outputs.tf
  
  templates/_modules-functional/module-ws/infrastructure/main.tf
  templates/_modules-functional/module-kb/infrastructure/main.tf
  templates/_modules-functional/module-chat/infrastructure/main.tf

USAGE EXAMPLES:
  # Specific file
  ./sync-infra-to-project.sh ~/path/to/project-stack module-eval/infrastructure/main.tf
  
  # Find by filename
  ./sync-infra-to-project.sh ~/path/to/project-stack module-voice/outputs.tf
  
  # Directory-based (finds all .tf files)
  ./sync-infra-to-project.sh ~/path/to/project-stack module-eval/infrastructure

EOF
}

# --- Parse Arguments ---
PROJECT_PATH=""
FILE_PATH=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --list)
      list_common_paths
      exit 0
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
      if [[ -z "$PROJECT_PATH" ]]; then
        PROJECT_PATH="$1"
      elif [[ -z "$FILE_PATH" ]]; then
        FILE_PATH="$1"
      else
        log_error "Too many arguments"
        show_help
        exit 1
      fi
      shift
      ;;
  esac
done

# --- Validate Arguments ---
if [[ -z "$PROJECT_PATH" ]] || [[ -z "$FILE_PATH" ]]; then
  log_error "Missing required arguments"
  show_help
  exit 1
fi

if [[ ! -d "$PROJECT_PATH" ]]; then
  log_error "Project path does not exist: $PROJECT_PATH"
  exit 1
fi

# Verify this is a stack repo
if [[ ! -d "${PROJECT_PATH}/packages" ]]; then
  log_error "Project path does not appear to be a -stack repository (missing packages/ directory)"
  log_info "Infrastructure files are located in the stack repo under packages/module-{name}/infrastructure/"
  exit 1
fi

# --- Find Template File(s) ---
log_step "Searching for infrastructure file: $FILE_PATH"

# Search for the file in templates directory, focusing on infrastructure subdirectories
if [[ "$FILE_PATH" == *".tf" ]]; then
  # Specific .tf file - search by path pattern
  FOUND_FILES=$(find "${TOOLKIT_ROOT}/templates" -type f -path "*/infrastructure/*" -path "*${FILE_PATH}*" 2>/dev/null | head -10)
elif [[ "$FILE_PATH" == *"/infrastructure"* ]]; then
  # Directory-based search - find all .tf files in that infrastructure directory
  FOUND_FILES=$(find "${TOOLKIT_ROOT}/templates" -type f -path "*${FILE_PATH}*.tf" 2>/dev/null | head -10)
else
  # Try to find in infrastructure directories
  FOUND_FILES=$(find "${TOOLKIT_ROOT}/templates" -type f -path "*/infrastructure/*${FILE_PATH}*" 2>/dev/null | head -10)
fi

if [[ -z "$FOUND_FILES" ]]; then
  log_error "No infrastructure file found matching: $FILE_PATH"
  echo ""
  echo "Try using --list to see common infrastructure paths"
  exit 1
fi

FILE_COUNT=$(echo "$FOUND_FILES" | wc -l | tr -d ' ')

if [[ "$FILE_COUNT" -gt 1 ]]; then
  log_warn "Multiple files found matching '$FILE_PATH':"
  echo "$FOUND_FILES"
  echo ""
  log_info "Please provide a more specific path"
  exit 1
fi

SOURCE_FILE="$FOUND_FILES"
log_info "Found template file: $SOURCE_FILE"

# --- Determine Destination Path ---
# Remove toolkit root and templates/ prefix to get relative path
REL_PATH="${SOURCE_FILE#${TOOLKIT_ROOT}/templates/}"

# Map template path to project path
DEST_FILE=""

# Core module infrastructure: _modules-core/module-{name}/infrastructure/... → packages/module-{name}/infrastructure/...
if [[ "$REL_PATH" =~ ^_modules-core/(module-[^/]+)/infrastructure/(.+)$ ]]; then
  MODULE_NAME="${BASH_REMATCH[1]}"
  FILE_NAME="${BASH_REMATCH[2]}"
  DEST_FILE="${PROJECT_PATH}/packages/${MODULE_NAME}/infrastructure/${FILE_NAME}"

# Functional module infrastructure: _modules-functional/module-{name}/infrastructure/... → packages/module-{name}/infrastructure/...
elif [[ "$REL_PATH" =~ ^_modules-functional/(module-[^/]+)/infrastructure/(.+)$ ]]; then
  MODULE_NAME="${BASH_REMATCH[1]}"
  FILE_NAME="${BASH_REMATCH[2]}"
  DEST_FILE="${PROJECT_PATH}/packages/${MODULE_NAME}/infrastructure/${FILE_NAME}"

else
  log_error "Could not determine destination path for: $REL_PATH"
  log_info "Template path structure not recognized"
  log_info ""
  log_info "Supported patterns:"
  log_info "  • _modules-core/module-{name}/infrastructure/*.tf"
  log_info "  • _modules-functional/module-{name}/infrastructure/*.tf"
  exit 1
fi

log_info "Detected module: ${MODULE_NAME}"

# --- Perform Copy ---
log_step "Copy operation:"
echo "  Source:      $SOURCE_FILE"
echo "  Destination: $DEST_FILE"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  log_warn "DRY RUN - no files copied"
  exit 0
fi

# Check if destination exists
if [[ ! -f "$DEST_FILE" ]]; then
  log_warn "Destination file does not exist (will be created)"
  DEST_DIR=$(dirname "$DEST_FILE")
  if [[ ! -d "$DEST_DIR" ]]; then
    log_info "Creating directory: $DEST_DIR"
    mkdir -p "$DEST_DIR"
  fi
fi

# Copy the file
cp "$SOURCE_FILE" "$DEST_FILE"

log_info "✅ Infrastructure file synced successfully"
echo ""

# --- Next Steps ---
log_info "Next steps:"
echo "  1. Review changes: git diff $DEST_FILE"
echo "  2. Re-run Terraform init (if structure changed): cd envs/dev && terraform init"
echo "  3. Deploy infrastructure: ./scripts/deploy-terraform.sh dev"
echo ""
log_info "Infrastructure files copied to stack repo are used during Terraform deployment"
