#!/usr/bin/env bash
# Build all CORA modules (orchestrator script)
# Part of: CORA Module Build & Deployment Standardization (Phase 1)
# Purpose: Discovers and builds all CORA modules using zip-based deployment
#
# Usage: build-cora-modules.sh [OPTIONS]
#
# This script:
# 1. Discovers all modules in packages/module-*/
# 2. Calls build-lambda-zip.sh for each module
# 3. Generates build manifest
# 4. Reports success/failure summary
#
# Output: build/*/  (one directory per module)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Configuration ---
FORCE_REBUILD=false
SINGLE_MODULE=""
DRY_RUN=false
VERBOSE=false
STACK_REPO=""
OUTPUT_DIR="build"

# --- Parse Arguments ---
show_help() {
  cat << EOF
Usage: $(basename "$0") [OPTIONS]

Build all CORA modules using zip-based Lambda deployment (no Docker).

Options:
  --stack-repo <path>     Path to stack repository (default: sibling pm-app-stack)
  --module <name>         Build only specified module (e.g., module-ai)
  --output-dir <path>     Output directory for builds (default: build/)
  --force-rebuild         Force rebuild even if no changes detected
  --dry-run              Show what would be built without building
  --verbose              Show detailed build output
  --help                 Show this help message

Examples:
  # Build all modules (from toolkit)
  $(basename "$0") --stack-repo ../pm-app-stack

  # Build all modules (from infra repo)
  $(basename "$0")

  # Build single module with verbose output
  $(basename "$0") --module module-ai --verbose

  # Dry run to see what would be built
  $(basename "$0") --dry-run

Environment Variables:
  STACK_REPO             Override stack repository path

Module Discovery:
  Searches for modules matching: {stack-repo}/packages/module-*/
  Each module must have: backend/lambdas/ directory

Output Structure:
  build/
  ├── module-ai/
  │   ├── common-ai.zip
  │   ├── ai-config-handler.zip
  │   └── provider.zip
  ├── module-mgmt/
  │   ├── common-mgmt.zip
  │   └── lambda-mgmt.zip
  └── module-access/
      └── ... (module artifacts)

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --stack-repo)
      STACK_REPO="$2"
      shift 2
      ;;
    --module)
      SINGLE_MODULE="$2"
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
  echo -e "${CYAN}========================================${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}========================================${NC}"
}

# --- Environment Setup ---

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Determine if we're in toolkit or infra repo
if [[ "$SCRIPT_DIR" == *"cora-dev-toolkit"* ]]; then
  # Running from toolkit
  IS_TOOLKIT=true
  TOOLKIT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
  
  # Default to sibling pm-app-stack if not specified
  if [ -z "$STACK_REPO" ]; then
    STACK_REPO="$(cd "${TOOLKIT_ROOT}/../pm-app-stack" 2>/dev/null && pwd || echo "")"
  fi
else
  # Running from infra repo
  IS_TOOLKIT=false
  INFRA_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
  
  # Default to sibling stack repo
  if [ -z "$STACK_REPO" ]; then
    STACK_REPO="$(cd "${INFRA_ROOT}/../pm-app-stack" 2>/dev/null && pwd || echo "")"
  fi
fi

# Validate stack repo
if [ -z "$STACK_REPO" ] || [ ! -d "$STACK_REPO" ]; then
  log_error "Stack repository not found: ${STACK_REPO}"
  echo ""
  echo "Please specify the stack repository path:"
  echo "  --stack-repo <path>"
  echo ""
  echo "Or set the STACK_REPO environment variable"
  exit 1
fi

STACK_REPO="$(cd "$STACK_REPO" && pwd)"

log_section "CORA Module Build Orchestrator"
echo "Mode: $([ "$IS_TOOLKIT" = true ] && echo "Toolkit" || echo "Infrastructure")"
echo "Stack Repository: ${STACK_REPO}"
echo "Output Directory: ${OUTPUT_DIR}"
echo "Force Rebuild: ${FORCE_REBUILD}"
echo "Dry Run: ${DRY_RUN}"
echo ""

# --- Module Discovery ---

log_info "Discovering CORA modules..."

MODULES=()
MODULE_PATHS=()

# Find all module-* directories
for module_dir in "${STACK_REPO}/packages/module-"*/; do
  if [ -d "$module_dir" ]; then
    module_name=$(basename "$module_dir")
    
    # Check if module has backend/lambdas directory
    if [ ! -d "${module_dir}backend/lambdas" ]; then
      log_warning "Skipping ${module_name} (no backend/lambdas directory)"
      continue
    fi
    
    # If single module specified, filter
    if [ -n "$SINGLE_MODULE" ] && [ "$module_name" != "$SINGLE_MODULE" ]; then
      continue
    fi
    
    MODULES+=("$module_name")
    MODULE_PATHS+=("$module_dir")
    log_success "Found module: ${module_name}"
  fi
done

if [ ${#MODULES[@]} -eq 0 ]; then
  log_error "No modules found in ${STACK_REPO}/packages/"
  
  if [ -n "$SINGLE_MODULE" ]; then
    echo ""
    echo "Module '${SINGLE_MODULE}' not found."
    echo "Available modules:"
    for module_dir in "${STACK_REPO}/packages/module-"*/; do
      if [ -d "$module_dir" ]; then
        echo "  - $(basename "$module_dir")"
      fi
    done
  fi
  
  exit 1
fi

echo ""
log_info "Building ${#MODULES[@]} module(s)"
echo ""

# --- Locate build-lambda-zip.sh ---

if [ "$IS_TOOLKIT" = true ]; then
  BUILD_SCRIPT="${TOOLKIT_ROOT}/scripts/build-lambda-zip.sh"
else
  BUILD_SCRIPT="${SCRIPT_DIR}/build-lambda-zip.sh"
fi

if [ ! -f "$BUILD_SCRIPT" ]; then
  log_error "build-lambda-zip.sh not found: ${BUILD_SCRIPT}"
  exit 1
fi

if [ ! -x "$BUILD_SCRIPT" ]; then
  log_warning "Making build-lambda-zip.sh executable..."
  chmod +x "$BUILD_SCRIPT"
fi

# --- Build Modules ---

SUCCESSFUL_BUILDS=()
FAILED_BUILDS=()
BUILD_MANIFEST=()

for i in "${!MODULES[@]}"; do
  module_name="${MODULES[$i]}"
  module_path="${MODULE_PATHS[$i]}"
  
  log_section "Building: ${module_name}"
  
  # Prepare build arguments
  BUILD_ARGS=(
    "--module-path" "$module_path"
    "--output-dir" "${OUTPUT_DIR}/${module_name}"
  )
  
  if [ "$FORCE_REBUILD" = true ]; then
    BUILD_ARGS+=("--force-rebuild")
  fi
  
  if [ "$DRY_RUN" = true ]; then
    BUILD_ARGS+=("--dry-run")
  fi
  
  if [ "$VERBOSE" = true ]; then
    BUILD_ARGS+=("--verbose")
  fi
  
  # Run build script
  if "$BUILD_SCRIPT" "${BUILD_ARGS[@]}"; then
    SUCCESSFUL_BUILDS+=("$module_name")
    
    # Collect artifacts for manifest
    if [ "$DRY_RUN" = false ]; then
      output_dir="${OUTPUT_DIR}/${module_name}"
      if [ -d "$output_dir" ]; then
        for zip_file in "$output_dir"/*.zip; do
          if [ -f "$zip_file" ]; then
            zip_name=$(basename "$zip_file")
            zip_size=$(du -h "$zip_file" | awk '{print $1}')
            BUILD_MANIFEST+=("${module_name}/${zip_name} (${zip_size})")
          fi
        done
      fi
    fi
    
    log_success "${module_name} build completed"
  else
    FAILED_BUILDS+=("$module_name")
    log_error "${module_name} build failed"
  fi
  
  echo ""
done

# --- Build Summary ---

log_section "Build Summary"
echo ""

if [ ${#SUCCESSFUL_BUILDS[@]} -gt 0 ]; then
  echo -e "${GREEN}✓ Successful (${#SUCCESSFUL_BUILDS[@]}/${#MODULES[@]}):${NC}"
  for module in "${SUCCESSFUL_BUILDS[@]}"; do
    echo "  - ${module}"
  done
  echo ""
fi

if [ ${#FAILED_BUILDS[@]} -gt 0 ]; then
  echo -e "${RED}✗ Failed (${#FAILED_BUILDS[@]}/${#MODULES[@]}):${NC}"
  for module in "${FAILED_BUILDS[@]}"; do
    echo "  - ${module}"
  done
  echo ""
fi

# --- Build Manifest ---

if [ "$DRY_RUN" = false ] && [ ${#BUILD_MANIFEST[@]} -gt 0 ]; then
  echo -e "${BLUE}📦 Build Artifacts:${NC}"
  for artifact in "${BUILD_MANIFEST[@]}"; do
    echo "  - ${artifact}"
  done
  echo ""
  
  # Write manifest file
  MANIFEST_FILE="${OUTPUT_DIR}/.build-manifest.txt"
  echo "# CORA Module Build Manifest" > "$MANIFEST_FILE"
  echo "# Generated: $(date)" >> "$MANIFEST_FILE"
  echo "" >> "$MANIFEST_FILE"
  
  for artifact in "${BUILD_MANIFEST[@]}"; do
    echo "$artifact" >> "$MANIFEST_FILE"
  done
  
  log_success "Build manifest written to: ${MANIFEST_FILE}"
  echo ""
fi

# --- Output ---

if [ ${#FAILED_BUILDS[@]} -gt 0 ]; then
  echo -e "${RED}⚠️  BUILD INCOMPLETE: ${#SUCCESSFUL_BUILDS[@]} of ${#MODULES[@]} modules built successfully.${NC}"
  echo ""
  exit 1
elif [ "$DRY_RUN" = true ]; then
  echo -e "${BLUE}ℹ Dry run complete. No files were created.${NC}"
  echo ""
else
  echo -e "${GREEN}✅ BUILD COMPLETE: All ${#MODULES[@]} module(s) built successfully.${NC}"
  echo ""
  echo "Output directory: ${OUTPUT_DIR}"
  echo ""
  echo "Next step: Upload to S3 with deploy-lambda-zips.sh"
  echo ""
fi
