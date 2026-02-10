#!/usr/bin/env bash
# Build CORA Modules (Zip-Based Deployment)
# Builds all Lambda functions and layers as zip packages
#
# Usage: ./build-cora-modules.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Configuration
PROJECT_NAME="{{PROJECT_NAME}}"
SKIP_VALIDATION="${SKIP_VALIDATION:-false}"

# Detect script and repo root directories
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# In monorepo, packages are local (not in sibling repo)
PACKAGES_DIR="${REPO_ROOT}/packages"

BUILD_DIR="${REPO_ROOT}/build"

echo "========================================"
echo "  CORA Module Build (Zip-Based)"
echo "========================================"
echo ""
log_info "Project:     ${PROJECT_NAME}"
log_info "Repo Root:   ${REPO_ROOT}"
log_info "Packages:    ${PACKAGES_DIR}"
log_info "Build Dir:   ${BUILD_DIR}"
echo ""

# Check if packages directory exists
if [ ! -d "${PACKAGES_DIR}" ]; then
  log_warn "Packages directory not found: ${PACKAGES_DIR}"
  log_warn "Expected monorepo structure with packages/ at repo root"
  exit 1
fi

# Create build directory
mkdir -p "${BUILD_DIR}"

# --- Pre-Build Validation ---
if [ "$SKIP_VALIDATION" = "true" ]; then
  log_warn "⚠️  Skipping validation (SKIP_VALIDATION=true)"
  log_info "To enable validation, run without SKIP_VALIDATION or set SKIP_VALIDATION=false"
  echo ""
else
  echo "=== Running Pre-Build Validation ==="
  echo ""

  # Run import validator if available
  log_info "🔍 Validating Lambda function imports..."
  VALIDATOR_PATH="${REPO_ROOT}/scripts/validation/import_validator"
  VENV_PATH="${REPO_ROOT}/scripts/validation/.venv"

  if [ -f "${VALIDATOR_PATH}/cli.py" ]; then
    # Check if virtual environment exists
    if [ ! -d "${VENV_PATH}" ]; then
      log_warn "⚠️  Virtual environment not found at ${VENV_PATH}"
      log_warn "Skipping validation. Run 'cd ${REPO_ROOT} && python3 -m venv scripts/validation/.venv && source scripts/validation/.venv/bin/activate && pip install -r scripts/validation/requirements.txt'"
      echo ""
    else
      # Run validator as a module to support relative imports
      cd "${REPO_ROOT}/scripts/validation"

      # Activate virtual environment and run validator
      source "${VENV_PATH}/bin/activate"
      python3 -m import_validator.cli validate --path "${PACKAGES_DIR}/" --backend --output text
      VALIDATOR_EXIT_CODE=$?
      deactivate

      cd "${REPO_ROOT}"
    
      if [ $VALIDATOR_EXIT_CODE -ne 0 ]; then
      echo ""
      echo "========================================================================"
      echo "❌ VALIDATION FAILED - Build blocked"
      echo "========================================================================"
      echo ""
      echo "The import validator detected issues in your Lambda functions."
      echo ""
      echo "Common fixes:"
      echo "  - Fix Python syntax errors"
      echo "  - Remove unknown function parameters"
      echo "  - Replace deprecated parameters (e.g., order_by → order)"
      echo "  - Add missing required parameters"
      echo ""
      echo "To bypass validation (not recommended), run with:"
      echo "  SKIP_VALIDATION=true ./scripts/build-cora-modules.sh"
      echo ""
      echo "For more information:"
      echo "  ${REPO_ROOT}/scripts/validation/import_validator/README.md"
      echo ""
        exit 1
      fi
      
      log_info "✅ Import validation passed"
      echo ""
    fi
  else
    log_warn "⚠️  Import validator not found at ${VALIDATOR_PATH}/cli.py"
    log_warn "Skipping validation. Run validation manually before deploying."
    echo ""
  fi
fi

# Find all CORA modules (packages/module-*)
MODULES=$(find "${PACKAGES_DIR}" -maxdepth 1 -type d -name "module-*" 2>/dev/null || echo "")

if [ -z "${MODULES}" ]; then
  log_warn "No CORA modules found in ${PACKAGES_DIR}"
  exit 0
fi

# Build each module using build-lambda-zip.sh
for module in ${MODULES}; do
  module_name=$(basename "${module}")
  
  log_info "Building ${module_name}..."
  
  # Create module build directory
  mkdir -p "${BUILD_DIR}/${module_name}"
  
  # Run build-lambda-zip.sh for this module
  # Output goes to module's backend/.build/ directory
  if [ -f "${module}/backend/build.sh" ]; then
    (cd "${module}/backend" && bash build.sh)
  else
    log_warn "No build.sh found for ${module_name}, skipping"
    continue
  fi
  
  # Copy zips to centralized build directory
  if [ -d "${module}/backend/.build" ]; then
    cp "${module}/backend/.build"/*.zip "${BUILD_DIR}/${module_name}/" 2>/dev/null || true
    log_info "Built ${module_name}: $(ls -1 ${BUILD_DIR}/${module_name}/*.zip 2>/dev/null | wc -l | tr -d ' ') artifacts"
  fi
done

# --- Build Authorizer Lambda ---
echo ""
log_info "Building API Gateway Authorizer..."
if [ -f "${REPO_ROOT}/lambdas/api-gateway-authorizer/build.sh" ]; then
  cd "${REPO_ROOT}/lambdas/api-gateway-authorizer"
  bash build.sh
  cd "${REPO_ROOT}"
  
  # Copy authorizer zip to build directory
  mkdir -p "${BUILD_DIR}/authorizer"
  if [ -f "${REPO_ROOT}/lambdas/api-gateway-authorizer/build/authorizer.zip" ]; then
    cp "${REPO_ROOT}/lambdas/api-gateway-authorizer/build/authorizer.zip" "${BUILD_DIR}/authorizer/"
    log_info "Built authorizer: 1 artifact"
  elif [ -f "${REPO_ROOT}/lambdas/api-gateway-authorizer/.build/authorizer.zip" ]; then
    cp "${REPO_ROOT}/lambdas/api-gateway-authorizer/.build/authorizer.zip" "${BUILD_DIR}/authorizer/"
    log_info "Built authorizer: 1 artifact"
  else
    log_warn "Authorizer zip not found after build"
  fi
else
  log_warn "Authorizer build script not found at ${REPO_ROOT}/lambdas/api-gateway-authorizer/build.sh"
  log_info "Skipping authorizer build"
fi

echo ""
echo "========================================"
echo "  Build Complete"
echo "========================================"
echo ""
log_info "Artifacts saved to: ${BUILD_DIR}"
log_info "Run ./deploy-cora-modules.sh to upload to S3"
