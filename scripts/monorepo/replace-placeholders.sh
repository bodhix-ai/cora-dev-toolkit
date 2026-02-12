#!/bin/bash

# replace-placeholders.sh
# Replaces template placeholders in CORA monorepo project
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
Replace Placeholders

Replaces template placeholders throughout the project files.

Usage: $0 --target TARGET --project-name NAME [OPTIONS]

Arguments:
  --target TARGET           Path to target project directory
  --project-name NAME       Project name (e.g., 'ai-mod', 'pm-app')
  --help                    Show this help message

Optional:
  --display-name NAME       Project display name (defaults to project-name)
  --aws-region REGION       AWS region (defaults to us-east-1)
  --github-org ORG          GitHub organization name
  --config-file FILE        Config file basename

Examples:
  $0 --target /path/to/project --project-name ai-mod
  $0 --target /path/to/project --project-name ai-mod --github-org bodhix-ai

Replaces:
  {{PROJECT_NAME}} → project name
  {{PROJECT_DISPLAY_NAME}} → display name
  {{AWS_REGION}} → AWS region
  {{GITHUB_ORG}} → GitHub org (if provided)
  {{CONFIG_FILE}} → config file name
EOF
}

# --- Parse Arguments ---
TARGET_DIR=""
PROJECT_NAME=""
PROJECT_DISPLAY_NAME=""
AWS_REGION="us-east-1"
GITHUB_ORG=""
CONFIG_FILE_BASENAME=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --target)
      TARGET_DIR="$2"
      shift 2
      ;;
    --project-name)
      PROJECT_NAME="$2"
      shift 2
      ;;
    --display-name)
      PROJECT_DISPLAY_NAME="$2"
      shift 2
      ;;
    --aws-region)
      AWS_REGION="$2"
      shift 2
      ;;
    --github-org)
      GITHUB_ORG="$2"
      shift 2
      ;;
    --config-file)
      CONFIG_FILE_BASENAME="$2"
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
if [[ -z "$TARGET_DIR" ]]; then
  log_error "Target directory is required (--target)"
  show_help
  exit 1
fi

if [[ -z "$PROJECT_NAME" ]]; then
  log_error "Project name is required (--project-name)"
  show_help
  exit 1
fi

if [[ ! -d "$TARGET_DIR" ]]; then
  log_error "Target directory not found: $TARGET_DIR"
  exit 1
fi

# Default display name to project name
if [[ -z "$PROJECT_DISPLAY_NAME" ]]; then
  PROJECT_DISPLAY_NAME="$PROJECT_NAME"
fi

# Default config file name
if [[ -z "$CONFIG_FILE_BASENAME" ]]; then
  CONFIG_FILE_BASENAME="setup.config.${PROJECT_NAME}.yaml"
fi

# --- Replace Placeholders ---
log_info "Replacing placeholders in ${TARGET_DIR}..."

# Find and replace in all files
find "$TARGET_DIR" -type f \( -name "*.tf" -o -name "*.json" -o -name "*.md" -o -name "*.sh" -o -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.yaml" -o -name "*.yml" -o -name ".clinerules" \) | while read -r file; do
  if [[ -f "$file" ]]; then
    # Replace machine-readable project name
    sed -i '' "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file" 2>/dev/null || \
    sed -i "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file"
    
    # Replace display name
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

    # Replace config file name
    sed -i '' "s/{{CONFIG_FILE}}/${CONFIG_FILE_BASENAME}/g" "$file" 2>/dev/null || \
    sed -i "s/{{CONFIG_FILE}}/${CONFIG_FILE_BASENAME}/g" "$file"
  fi
done

log_info "✅ Placeholder replacement complete"
echo ""
log_info "Replaced:"
echo "  {{PROJECT_NAME}} → ${PROJECT_NAME}"
echo "  {{PROJECT_DISPLAY_NAME}} → ${PROJECT_DISPLAY_NAME}"
echo "  {{AWS_REGION}} → ${AWS_REGION}"
[[ -n "$GITHUB_ORG" ]] && echo "  {{GITHUB_ORG}} → ${GITHUB_ORG}"
echo "  {{CONFIG_FILE}} → ${CONFIG_FILE_BASENAME}"

exit 0