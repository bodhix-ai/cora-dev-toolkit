#!/usr/bin/env bash
# Build script for module-chat Lambda functions (Zip-Based)
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building module-chat backend (zip-based)...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAMBDAS_DIR="${SCRIPT_DIR}/lambdas"
BUILD_DIR="${SCRIPT_DIR}/.build"

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# ========================================
# Build Lambda Layer (chat_common)
# ========================================
echo -e "${GREEN}Building chat_common Lambda layer...${NC}"

LAYERS_DIR="${SCRIPT_DIR}/layers"
CHAT_LAYER_DIR="${LAYERS_DIR}/chat_common"
CHAT_LAYER_BUILD_DIR="${BUILD_DIR}/chat-layer-build"

if [ ! -d "${CHAT_LAYER_DIR}" ]; then
    echo -e "${RED}ERROR: Layer directory not found: ${CHAT_LAYER_DIR}${NC}"
    exit 1
fi

mkdir -p "${CHAT_LAYER_BUILD_DIR}/python"

# Install layer dependencies if needed
if [ -f "${CHAT_LAYER_DIR}/requirements.txt" ]; then
    echo "Installing chat_common layer dependencies for Python 3.11..."
    pip3 install -r "${CHAT_LAYER_DIR}/requirements.txt" -t "${CHAT_LAYER_BUILD_DIR}/python" \
        --platform manylinux2014_x86_64 \
        --python-version 3.11 \
        --implementation cp \
        --only-binary=:all: \
        --upgrade --quiet
fi

# Copy layer code
if [ -d "${CHAT_LAYER_DIR}/python" ]; then
    cp -r "${CHAT_LAYER_DIR}"/python/* "${CHAT_LAYER_BUILD_DIR}/python/"
fi

# Create layer ZIP
(
    cd "${CHAT_LAYER_BUILD_DIR}"
    zip -r "${BUILD_DIR}/chat_common-layer.zip" python -q
)

echo -e "${GREEN}✓ Layer built: ${BUILD_DIR}/chat_common-layer.zip${NC}"

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

  # Install dependencies if requirements.txt exists and has content
  if [ -f "${lambda_dir}requirements.txt" ]; then
    # Check if file has non-comment, non-empty lines
    if grep -v '^#' "${lambda_dir}requirements.txt" | grep -q '[a-zA-Z]'; then
      echo "Installing dependencies with Linux binaries..."
      pip3 install -r "${lambda_dir}requirements.txt" -t "${LAMBDA_BUILD_DIR}" \
        --platform manylinux2014_x86_64 \
        --python-version 3.11 \
        --implementation cp \
        --abi cp311 \
        --only-binary=:all: \
        --upgrade --quiet
    fi
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
echo ""
echo "Note: Built with Linux binaries for AWS Lambda compatibility"
