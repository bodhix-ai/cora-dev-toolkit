#!/usr/bin/env bash
# Build script for module-mgmt Lambda functions and layer (Zip-Based)
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building module-mgmt backend (zip-based)...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAYERS_DIR="${SCRIPT_DIR}/layers"
LAMBDAS_DIR="${SCRIPT_DIR}/lambdas"
BUILD_DIR="${SCRIPT_DIR}/.build"

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# ========================================
# Build Lambda Layer (lambda-mgmt-common)
# ========================================
echo -e "${GREEN}Building lambda-mgmt-common Lambda layer...${NC}"

LAYER_DIR="${LAYERS_DIR}/lambda-mgmt-common"
LAYER_BUILD_DIR="${BUILD_DIR}/layer-build"

if [ ! -d "${LAYER_DIR}" ]; then
    echo -e "${RED}ERROR: Layer directory not found: ${LAYER_DIR}${NC}"
    exit 1
fi

mkdir -p "${LAYER_BUILD_DIR}/python"

# Install layer dependencies
if [ -f "${LAYER_DIR}/requirements.txt" ]; then
    echo "Installing layer dependencies..."
    pip3 install -r "${LAYER_DIR}/requirements.txt" -t "${LAYER_BUILD_DIR}/python" --upgrade --quiet
fi

# Copy layer code
if [ -d "${LAYER_DIR}/python" ]; then
    cp -r "${LAYER_DIR}"/python/* "${LAYER_BUILD_DIR}/python/"
fi

# Create layer ZIP
(
    cd "${LAYER_BUILD_DIR}"
    zip -r "${BUILD_DIR}/lambda-mgmt-common-layer.zip" python -q
)

echo -e "${GREEN}✓ Layer built: ${BUILD_DIR}/lambda-mgmt-common-layer.zip${NC}"

# ========================================
# Build Lambda Functions
# ========================================
for lambda_dir in "${LAMBDAS_DIR}"/*/; do
  lambda_name=$(basename "${lambda_dir}")
  echo -e "${GREEN}--- Building ${lambda_name} Lambda ---${NC}"

  LAMBDA_BUILD_DIR="${BUILD_DIR}/${lambda_name}"
  mkdir -p "${LAMBDA_BUILD_DIR}"

  # Copy source code
  cp "${lambda_dir}lambda_function.py" "${LAMBDA_BUILD_DIR}/"

  # Install dependencies if requirements.txt exists and is not empty
  if [ -f "${lambda_dir}requirements.txt" ] && grep -q -v '^#' "${lambda_dir}requirements.txt" | grep -q '[a-zA-Z]'; then
    echo "Installing dependencies..."
    pip3 install -r "${lambda_dir}requirements.txt" -t "${LAMBDA_BUILD_DIR}" --upgrade --quiet
  fi

  # Create Lambda ZIP
  (
    cd "${LAMBDA_BUILD_DIR}"
    zip -r "${BUILD_DIR}/${lambda_name}.zip" . -q
  )

  echo -e "${GREEN}✓ Lambda built: ${BUILD_DIR}/${lambda_name}.zip${NC}"
done

# ========================================
# Summary
# ========================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Build artifacts created in: ${BUILD_DIR}"
du -h "${BUILD_DIR}"/*.zip 2>/dev/null || true
echo ""
echo -e "${GREEN}Build completed successfully!${NC}"
