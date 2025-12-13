#!/usr/bin/env bash
# Build Lambda ZIP packages for a CORA module
# Part of: CORA Module Build & Deployment Standardization (Phase 1)
# Purpose: Creates zip-based Lambda deployments (layers + functions)
#
# Usage: build-lambda-zip.sh --module-path <path> [OPTIONS]
#
# This script builds:
# 1. Shared layer zip (common-{module}.zip) with dependencies
# 2. Lambda function zips for each handler
#
# Output: build/{module-name}/*.zip

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Configuration ---
DRY_RUN=false
MODULE_PATH=""
OUTPUT_DIR=""
FORCE_REBUILD=false
VERBOSE=false

# --- Parse Arguments ---
show_help() {
  cat << EOF
Usage: $(basename "$0") --module-path <path> [OPTIONS]

Build Lambda ZIP packages for a CORA module (zip-based deployment).

Required:
  --module-path <path>    Path to module directory (e.g., packages/module-ai)

Options:
  --output-dir <path>     Output directory for zips (default: build/{module-name})
  --force-rebuild         Force rebuild even if no changes detected
  --dry-run              Show what would be built without building
  --verbose              Show detailed build output
  --help                 Show this help message

Examples:
  # Build module-ai
  $(basename "$0") --module-path packages/module-ai

  # Build with custom output directory
  $(basename "$0") --module-path packages/module-ai --output-dir dist/

  # Dry run to see what would be built
  $(basename "$0") --module-path packages/module-ai --dry-run

Directory Structure Expected:
  {module-path}/
  ├── backend/
  │   ├── layers/
  │   │   └── common-{name}/
  │   │       ├── requirements.txt         # Layer dependencies
  │   │       └── python/
  │   │           └── {name}_common/       # Python module
  │   └── lambdas/
  │       ├── {function-1}/
  │       │   ├── lambda_function.py       # Handler
  │       │   └── requirements.txt         # Optional function-specific deps
  │       └── {function-2}/
  │           └── lambda_function.py

Output:
  build/{module-name}/
  ├── common-{name}.zip              # Lambda layer
  ├── {function-1}.zip               # Lambda function 1
  └── {function-2}.zip               # Lambda function 2

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --module-path)
      MODULE_PATH="$2"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --force-rebuild)
      FORCE_REBUILD=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      echo -e "${RED}ERROR: Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# --- Validation ---
if [ -z "$MODULE_PATH" ]; then
  echo -e "${RED}ERROR: --module-path is required${NC}"
  echo "Use --help for usage information"
  exit 1
fi

if [ ! -d "$MODULE_PATH" ]; then
  echo -e "${RED}ERROR: Module path does not exist: ${MODULE_PATH}${NC}"
  exit 1
fi

# Resolve absolute path
MODULE_PATH="$(cd "$MODULE_PATH" && pwd)"
MODULE_NAME="$(basename "$MODULE_PATH")"

# Set default output directory
if [ -z "$OUTPUT_DIR" ]; then
  OUTPUT_DIR="build/${MODULE_NAME}"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd)"

# Check for backend directory
BACKEND_DIR="${MODULE_PATH}/backend"
if [ ! -d "$BACKEND_DIR" ]; then
  echo -e "${RED}ERROR: Backend directory not found: ${BACKEND_DIR}${NC}"
  exit 1
fi

# --- Build Summary Variables ---
BUILT_ARTIFACTS=()
SKIPPED_ARTIFACTS=()
FAILED_ARTIFACTS=()

# --- Logging Functions ---
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_section() {
  echo ""
  echo -e "${GREEN}=== $1 ===${NC}"
}

# --- Helper Functions ---

# Calculate hash of directory contents (for change detection)
calculate_hash() {
  local dir=$1
  if [ -d "$dir" ]; then
    find "$dir" -type f -not -path '*/\.*' -print0 | sort -z | xargs -0 shasum -a 256 2>/dev/null | shasum -a 256 | awk '{print $1}'
  else
    echo ""
  fi
}

# Build Lambda Layer
build_layer() {
  local layer_dir=$1
  local layer_name=$(basename "$layer_dir")
  
  log_section "Building Layer: ${layer_name}"
  
  if [ ! -d "$layer_dir" ]; then
    log_warning "Layer directory not found: ${layer_dir}"
    return 0
  fi
  
  local requirements_file="${layer_dir}/requirements.txt"
  local python_dir="${layer_dir}/python"
  local output_zip="${OUTPUT_DIR}/${layer_name}.zip"
  
  # Check if requirements.txt exists
  if [ ! -f "$requirements_file" ]; then
    log_warning "No requirements.txt found in layer: ${layer_name}"
    log_info "Skipping layer build (no dependencies to install)"
    SKIPPED_ARTIFACTS+=("${layer_name}.zip (no requirements.txt)")
    return 0
  fi
  
  # Check if python directory exists
  if [ ! -d "$python_dir" ]; then
    log_error "Python directory not found: ${python_dir}"
    log_info "Expected structure: ${layer_dir}/python/{module}_common/"
    FAILED_ARTIFACTS+=("${layer_name}.zip")
    return 1
  fi
  
  # Hash checking for incremental builds
  local hash_file="${OUTPUT_DIR}/.${layer_name}.hash"
  local current_hash=$(calculate_hash "$layer_dir")
  local last_hash=""
  if [ -f "$hash_file" ]; then
    last_hash=$(cat "$hash_file")
  fi
  
  if [ "$current_hash" = "$last_hash" ] && [ "$FORCE_REBUILD" = false ] && [ -f "$output_zip" ]; then
    log_success "No changes detected for ${layer_name}, using existing zip"
    SKIPPED_ARTIFACTS+=("${layer_name}.zip (unchanged)")
    return 0
  fi
  
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would build layer: ${layer_name}"
    log_info "[DRY RUN] - Install dependencies from: ${requirements_file}"
    log_info "[DRY RUN] - Output: ${output_zip}"
    return 0
  fi
  
  log_info "Installing dependencies to layer..."
  
  # Create temporary build directory
  local temp_build_dir=$(mktemp -d)
  trap "rm -rf $temp_build_dir" EXIT
  
  # Copy python directory structure
  cp -r "$python_dir" "$temp_build_dir/python"
  
  # Install dependencies into python directory
  if [ "$VERBOSE" = true ]; then
    pip install -r "$requirements_file" -t "$temp_build_dir/python" --upgrade
  else
    pip install -r "$requirements_file" -t "$temp_build_dir/python" --upgrade --quiet
  fi
  
  if [ $? -ne 0 ]; then
    log_error "Failed to install dependencies for ${layer_name}"
    FAILED_ARTIFACTS+=("${layer_name}.zip")
    return 1
  fi
  
  # Create zip file
  log_info "Creating layer zip..."
  (
    cd "$temp_build_dir"
    if [ "$VERBOSE" = true ]; then
      zip -r "$output_zip" python/
    else
      zip -r "$output_zip" python/ -q
    fi
  )
  
  if [ $? -ne 0 ]; then
    log_error "Failed to create zip for ${layer_name}"
    FAILED_ARTIFACTS+=("${layer_name}.zip")
    return 1
  fi
  
  # Save hash for incremental builds
  echo "$current_hash" > "$hash_file"
  
  # Get zip size
  local zip_size=$(du -h "$output_zip" | awk '{print $1}')
  log_success "Layer built: ${layer_name}.zip (${zip_size})"
  BUILT_ARTIFACTS+=("${layer_name}.zip (${zip_size})")
  
  return 0
}

# Build Lambda Function
build_lambda() {
  local lambda_dir=$1
  local lambda_name=$(basename "$lambda_dir")
  
  log_section "Building Lambda: ${lambda_name}"
  
  local handler_file="${lambda_dir}/lambda_function.py"
  local requirements_file="${lambda_dir}/requirements.txt"
  local output_zip="${OUTPUT_DIR}/${lambda_name}.zip"
  
  # Check if handler exists
  if [ ! -f "$handler_file" ]; then
    log_error "Lambda handler not found: ${handler_file}"
    FAILED_ARTIFACTS+=("${lambda_name}.zip")
    return 1
  fi
  
  # Hash checking for incremental builds
  local hash_file="${OUTPUT_DIR}/.${lambda_name}.hash"
  local current_hash=$(calculate_hash "$lambda_dir")
  local last_hash=""
  if [ -f "$hash_file" ]; then
    last_hash=$(cat "$hash_file")
  fi
  
  if [ "$current_hash" = "$last_hash" ] && [ "$FORCE_REBUILD" = false ] && [ -f "$output_zip" ]; then
    log_success "No changes detected for ${lambda_name}, using existing zip"
    SKIPPED_ARTIFACTS+=("${lambda_name}.zip (unchanged)")
    return 0
  fi
  
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would build Lambda: ${lambda_name}"
    log_info "[DRY RUN] - Handler: ${handler_file}"
    if [ -f "$requirements_file" ]; then
      log_info "[DRY RUN] - Install dependencies from: ${requirements_file}"
    fi
    log_info "[DRY RUN] - Output: ${output_zip}"
    return 0
  fi
  
  # Create temporary build directory
  local temp_build_dir=$(mktemp -d)
  trap "rm -rf $temp_build_dir" EXIT
  
  # Copy handler
  cp "$handler_file" "$temp_build_dir/"
  
  # Install function-specific dependencies if requirements.txt exists
  if [ -f "$requirements_file" ] && grep -q -v '^#' "$requirements_file" | grep -q '[a-zA-Z]'; then
    log_info "Installing function-specific dependencies..."
    if [ "$VERBOSE" = true ]; then
      pip install -r "$requirements_file" -t "$temp_build_dir" --upgrade
    else
      pip install -r "$requirements_file" -t "$temp_build_dir" --upgrade --quiet
    fi
    
    if [ $? -ne 0 ]; then
      log_error "Failed to install dependencies for ${lambda_name}"
      FAILED_ARTIFACTS+=("${lambda_name}.zip")
      return 1
    fi
  fi
  
  # Create zip file
  log_info "Creating Lambda zip..."
  (
    cd "$temp_build_dir"
    if [ "$VERBOSE" = true ]; then
      zip -r "$output_zip" .
    else
      zip -r "$output_zip" . -q
    fi
  )
  
  if [ $? -ne 0 ]; then
    log_error "Failed to create zip for ${lambda_name}"
    FAILED_ARTIFACTS+=("${lambda_name}.zip")
    return 1
  fi
  
  # Save hash for incremental builds
  echo "$current_hash" > "$hash_file"
  
  # Get zip size
  local zip_size=$(du -h "$output_zip" | awk '{print $1}')
  log_success "Lambda built: ${lambda_name}.zip (${zip_size})"
  BUILT_ARTIFACTS+=("${lambda_name}.zip (${zip_size})")
  
  return 0
}

# --- Main Build Process ---

log_section "CORA Module Zip Builder"
echo "Module: ${MODULE_NAME}"
echo "Path: ${MODULE_PATH}"
echo "Output: ${OUTPUT_DIR}"
echo "Dry Run: ${DRY_RUN}"
echo "Force Rebuild: ${FORCE_REBUILD}"
echo ""

# Build layers
LAYERS_DIR="${BACKEND_DIR}/layers"
if [ -d "$LAYERS_DIR" ]; then
  for layer_dir in "$LAYERS_DIR"/*/; do
    if [ -d "$layer_dir" ]; then
      build_layer "$layer_dir" || true
    fi
  done
else
  log_warning "No layers directory found: ${LAYERS_DIR}"
fi

# Build Lambda functions
LAMBDAS_DIR="${BACKEND_DIR}/lambdas"
if [ -d "$LAMBDAS_DIR" ]; then
  for lambda_dir in "$LAMBDAS_DIR"/*/; do
    if [ -d "$lambda_dir" ]; then
      build_lambda "$lambda_dir" || true
    fi
  done
else
  log_error "No lambdas directory found: ${LAMBDAS_DIR}"
  exit 1
fi

# --- Build Summary ---
log_section "Build Summary"
echo ""

if [ ${#BUILT_ARTIFACTS[@]} -gt 0 ]; then
  echo -e "${GREEN}✓ Built (${#BUILT_ARTIFACTS[@]}):${NC}"
  for artifact in "${BUILT_ARTIFACTS[@]}"; do
    echo "  - ${artifact}"
  done
  echo ""
fi

if [ ${#SKIPPED_ARTIFACTS[@]} -gt 0 ]; then
  echo -e "${YELLOW}⊘ Skipped (${#SKIPPED_ARTIFACTS[@]}):${NC}"
  for artifact in "${SKIPPED_ARTIFACTS[@]}"; do
    echo "  - ${artifact}"
  done
  echo ""
fi

if [ ${#FAILED_ARTIFACTS[@]} -gt 0 ]; then
  echo -e "${RED}✗ Failed (${#FAILED_ARTIFACTS[@]}):${NC}"
  for artifact in "${FAILED_ARTIFACTS[@]}"; do
    echo "  - ${artifact}"
  done
  echo ""
  exit 1
fi

if [ "$DRY_RUN" = true ]; then
  echo -e "${BLUE}ℹ Dry run complete. No files were created.${NC}"
else
  echo -e "${GREEN}Build complete!${NC}"
  echo ""
  echo "Output directory: ${OUTPUT_DIR}"
  echo ""
  echo "Next step: Upload to S3 with deploy-lambda-zips.sh"
fi

echo ""
