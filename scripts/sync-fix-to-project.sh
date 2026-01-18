#!/bin/bash

# Sync Fix to Project - Copy changed template files to existing project
# Reduces cycle time by avoiding full project recreation
#
# Usage: ./sync-fix-to-project.sh <project-path> <file-path> [OPTIONS]

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
Sync Fix to Project - Copy changed template files to existing project

This script copies specific files from CORA templates to an existing project,
avoiding the need for full project recreation when testing fixes.

Usage: $0 <project-stack-path> <template-file> [OPTIONS]

Arguments:
  project-stack-path   Path to the project-stack directory (e.g., ~/code/sts/security/test-ws-23-stack)
  template-file        Template file path relative to toolkit (can be partial match)

Options:
  --infra              Target the -infra repo instead of -stack
  --dry-run            Show what would be copied without copying
  --list               List common template paths for quick reference
  --help               Show this help message

Examples:
  # Sync a frontend component fix
  $0 ~/code/sts/security/test-ws-23-stack InviteMemberDialog.tsx

  # Sync a Lambda fix to infra repo
  $0 ~/code/sts/security/test-ws-23-infra invites/lambda_function.py --infra

  # Dry run to see what would be copied
  $0 ~/code/sts/security/test-ws-23-stack useWorkspaceForm.ts --dry-run

Common File Mappings:
  FRONTEND FIXES (--stack, default):
    templates/_modules-core/module-access/frontend/...  → packages/module-access/...
    templates/_modules-core/module-ai/frontend/...      → packages/module-ai/...
    templates/_modules-functional/module-ws/frontend/.. → packages/module-ws/...
    templates/_project-stack-template/apps/web/...      → apps/web/...

  BACKEND FIXES (--infra):
    templates/_modules-core/module-access/backend/...   → lambdas/module-access/...
    templates/_modules-core/module-ai/backend/...       → lambdas/module-ai/...
    templates/_modules-core/module-mgmt/backend/...     → lambdas/module-mgmt/...

EOF
}

list_common_paths() {
  cat << EOF
Common Template Paths:

FRONTEND (module-access):
  templates/_modules-core/module-access/frontend/components/org/InviteMemberDialog.tsx
  templates/_modules-core/module-access/frontend/components/org/OrgMembersList.tsx
  templates/_modules-core/module-access/frontend/hooks/useOrgMembers.ts
  templates/_modules-core/module-access/frontend/types/index.ts

FRONTEND (module-ai):
  templates/_modules-core/module-ai/frontend/components/ModelCard.tsx
  templates/_modules-core/module-ai/frontend/components/ModelSelectionModal.tsx
  templates/_modules-core/module-ai/frontend/hooks/useAIConfig.ts

FRONTEND (module-ws):
  templates/_modules-functional/module-ws/frontend/hooks/useWorkspaceForm.ts
  templates/_modules-functional/module-ws/frontend/components/WorkspaceForm.tsx

FRONTEND (app shell):
  templates/_project-stack-template/apps/web/components/Sidebar.tsx
  templates/_project-stack-template/apps/web/components/Header.tsx

BACKEND (module-access Lambdas):
  templates/_modules-core/module-access/backend/lambdas/invites/lambda_function.py
  templates/_modules-core/module-access/backend/lambdas/orgs/lambda_function.py
  templates/_modules-core/module-access/backend/lambdas/users/lambda_function.py

BACKEND (module-ai Lambdas):
  templates/_modules-core/module-ai/backend/lambdas/ai-config/lambda_function.py

BACKEND (module-mgmt Lambdas):
  templates/_modules-core/module-mgmt/backend/lambdas/mgmt-api/lambda_function.py

EOF
}

# --- Parse Arguments ---
PROJECT_PATH=""
TEMPLATE_FILE=""
TARGET_INFRA=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --infra)
      TARGET_INFRA=true
      shift
      ;;
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
      elif [[ -z "$TEMPLATE_FILE" ]]; then
        TEMPLATE_FILE="$1"
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
if [[ -z "$PROJECT_PATH" ]] || [[ -z "$TEMPLATE_FILE" ]]; then
  log_error "Missing required arguments"
  show_help
  exit 1
fi

if [[ ! -d "$PROJECT_PATH" ]]; then
  log_error "Project path does not exist: $PROJECT_PATH"
  exit 1
fi

# --- Find Template File ---
log_step "Searching for template file: $TEMPLATE_FILE"

# Search for the file in templates directory
# Use -path if input contains slash, otherwise use -name
if [[ "$TEMPLATE_FILE" == *"/"* ]]; then
  # Path-based search (e.g., "orgs/lambda_function.py" or "module-access/invites")
  FOUND_FILES=$(find "${TOOLKIT_ROOT}/templates" -type f -path "*${TEMPLATE_FILE}*" 2>/dev/null | head -10)
else
  # Filename-based search
  FOUND_FILES=$(find "${TOOLKIT_ROOT}/templates" -name "*${TEMPLATE_FILE}*" -type f 2>/dev/null | head -10)
fi

if [[ -z "$FOUND_FILES" ]]; then
  log_error "No template file found matching: $TEMPLATE_FILE"
  echo ""
  echo "Try using --list to see common template paths"
  exit 1
fi

FILE_COUNT=$(echo "$FOUND_FILES" | wc -l | tr -d ' ')

if [[ "$FILE_COUNT" -gt 1 ]]; then
  log_warn "Multiple files found matching '$TEMPLATE_FILE':"
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

# Detect repo type based on project path
IS_STACK_REPO=false
IS_INFRA_REPO=false

if [[ "$PROJECT_PATH" == *"-stack"* ]] || [[ -d "${PROJECT_PATH}/packages" ]]; then
  IS_STACK_REPO=true
elif [[ "$PROJECT_PATH" == *"-infra"* ]] || [[ -d "${PROJECT_PATH}/lambdas" ]]; then
  IS_INFRA_REPO=true
fi

# Map template path to project path using DYNAMIC pattern matching
# This automatically handles any module name without hardcoding
DEST_FILE=""

# Core module frontend: _modules-core/module-{name}/frontend/... → packages/module-{name}/frontend/...
if [[ "$REL_PATH" =~ ^_modules-core/(module-[^/]+)/frontend/(.+)$ ]]; then
  MODULE_NAME="${BASH_REMATCH[1]}"
  FILE_PATH="${BASH_REMATCH[2]}"
  DEST_FILE="${PROJECT_PATH}/packages/${MODULE_NAME}/frontend/${FILE_PATH}"

# Functional module frontend: _modules-functional/module-{name}/frontend/... → packages/module-{name}/frontend/...
elif [[ "$REL_PATH" =~ ^_modules-functional/(module-[^/]+)/frontend/(.+)$ ]]; then
  MODULE_NAME="${BASH_REMATCH[1]}"
  FILE_PATH="${BASH_REMATCH[2]}"
  DEST_FILE="${PROJECT_PATH}/packages/${MODULE_NAME}/frontend/${FILE_PATH}"

# Core module backend Lambda - map based on repo type
elif [[ "$REL_PATH" =~ ^_modules-core/(module-[^/]+)/backend/lambdas/(.+)$ ]]; then
  MODULE_NAME="${BASH_REMATCH[1]}"
  LAMBDA_PATH="${BASH_REMATCH[2]}"
  
  if [[ "$IS_STACK_REPO" == "true" ]]; then
    # Stack repo: packages/module-{name}/backend/lambdas/...
    DEST_FILE="${PROJECT_PATH}/packages/${MODULE_NAME}/backend/lambdas/${LAMBDA_PATH}"
  else
    # Infra repo: lambdas/module-{name}/...
    DEST_FILE="${PROJECT_PATH}/lambdas/${MODULE_NAME}/${LAMBDA_PATH}"
  fi

# Functional module backend Lambda - map based on repo type
elif [[ "$REL_PATH" =~ ^_modules-functional/(module-[^/]+)/backend/lambdas/(.+)$ ]]; then
  MODULE_NAME="${BASH_REMATCH[1]}"
  LAMBDA_PATH="${BASH_REMATCH[2]}"
  
  if [[ "$IS_STACK_REPO" == "true" ]]; then
    # Stack repo: packages/module-{name}/backend/lambdas/...
    DEST_FILE="${PROJECT_PATH}/packages/${MODULE_NAME}/backend/lambdas/${LAMBDA_PATH}"
  else
    # Infra repo: lambdas/module-{name}/...
    DEST_FILE="${PROJECT_PATH}/lambdas/${MODULE_NAME}/${LAMBDA_PATH}"
  fi

# Stack template: _project-stack-template/... → ...
elif [[ "$REL_PATH" == _project-stack-template/* ]]; then
  DEST_FILE="${PROJECT_PATH}/${REL_PATH#_project-stack-template/}"

# Infra template: _project-infra-template/... → ...
elif [[ "$REL_PATH" == _project-infra-template/* ]]; then
  DEST_FILE="${PROJECT_PATH}/${REL_PATH#_project-infra-template/}"

else
  log_error "Could not determine destination path for: $REL_PATH"
  log_info "Template path structure not recognized"
  log_info ""
  log_info "Supported patterns:"
  log_info "  • _modules-core/module-{name}/frontend/..."
  log_info "  • _modules-core/module-{name}/backend/lambdas/..."
  log_info "  • _modules-functional/module-{name}/frontend/..."
  log_info "  • _modules-functional/module-{name}/backend/lambdas/..."
  log_info "  • _project-stack-template/..."
  log_info "  • _project-infra-template/..."
  exit 1
fi

log_info "Detected module: ${MODULE_NAME:-'app shell'}"

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

# --- Replace Template Placeholders ---
# Extract project name from PROJECT_PATH (e.g., "ai-sec-stack" → "ai-sec")
PROJECT_NAME=""
if [[ "$PROJECT_PATH" =~ ([^/]+)-(stack|infra)/?$ ]]; then
  PROJECT_NAME="${BASH_REMATCH[1]}"
elif [[ "$PROJECT_PATH" =~ /([^/]+)/?$ ]]; then
  # Fallback: use last directory name
  LAST_DIR="${BASH_REMATCH[1]}"
  if [[ "$LAST_DIR" == *"-stack" ]]; then
    PROJECT_NAME="${LAST_DIR%-stack}"
  elif [[ "$LAST_DIR" == *"-infra" ]]; then
    PROJECT_NAME="${LAST_DIR%-infra}"
  else
    PROJECT_NAME="$LAST_DIR"
  fi
fi

# Only replace placeholders in text files (not binary)
if [[ -n "$PROJECT_NAME" ]] && file "$DEST_FILE" | grep -q "text"; then
  log_info "Replacing template placeholders with project name: $PROJECT_NAME"
  
  # Replace {{PROJECT_NAME}} placeholder
  if grep -q "{{PROJECT_NAME}}" "$DEST_FILE" 2>/dev/null; then
    sed -i '' "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$DEST_FILE" 2>/dev/null || \
    sed -i "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$DEST_FILE"
    log_info "  Replaced {{PROJECT_NAME}} with $PROJECT_NAME"
  fi
  
  # Note: Other placeholders like {{AWS_REGION}}, {{GITHUB_ORG}} are typically
  # in infrastructure files and should be set via project configuration, not sync
fi

log_info "✅ File synced successfully"
echo ""

# --- Next Steps ---
if [[ "$TARGET_INFRA" == "true" ]] || [[ "$DEST_FILE" == *"/lambdas/"* ]]; then
  log_info "Next steps for backend fix:"
  echo "  1. Build the Lambda:  cd $(dirname "$DEST_FILE") && ./build.sh"
  echo "  2. Deploy:            ./scripts/deploy-lambda.sh <lambda-name>"
  echo "  3. Test the API endpoint"
else
  log_info "Next steps for frontend fix:"
  echo "  1. Restart dev server: ./scripts/start-dev.sh"
  echo "  2. Test in browser"
fi
