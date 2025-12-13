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
STACK_DIR="${STACK_DIR:-$(dirname $(dirname $(pwd)))/{{PROJECT_NAME}}-stack}"
BUILD_DIR="$(pwd)/build"

echo "========================================"
echo "  CORA Module Build (Zip-Based)"
echo "========================================"
echo ""
log_info "Project:    ${PROJECT_NAME}"
log_info "Stack Dir:  ${STACK_DIR}"
log_info "Build Dir:  ${BUILD_DIR}"
echo ""

# Check if stack directory exists
if [ ! -d "${STACK_DIR}" ]; then
  log_warn "Stack directory not found: ${STACK_DIR}"
  log_warn "Set STACK_DIR environment variable or ensure ${PROJECT_NAME}-stack exists"
  exit 1
fi

# Create build directory
mkdir -p "${BUILD_DIR}"

# Find all CORA modules (packages/module-*)
MODULES=$(find "${STACK_DIR}/packages" -maxdepth 1 -type d -name "module-*" 2>/dev/null || echo "")

if [ -z "${MODULES}" ]; then
  log_warn "No CORA modules found in ${STACK_DIR}/packages"
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
    (cd "${module}/backend" && ./build.sh)
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

echo ""
echo "========================================"
echo "  Build Complete"
echo "========================================"
echo ""
log_info "Artifacts saved to: ${BUILD_DIR}"
log_info "Run ./deploy-cora-modules.sh to upload to S3"
