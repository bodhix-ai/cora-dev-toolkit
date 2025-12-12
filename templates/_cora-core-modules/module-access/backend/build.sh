#!/usr/bin/env bash
# Build script for org-module Lambda functions and layer
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building org-module backend...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAMBDAS_DIR="${SCRIPT_DIR}/lambdas"
BUILD_DIR="${SCRIPT_DIR}/.build"

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# ========================================
# Build Lambda Layer (org-common) with Docker
# ========================================
echo -e "${GREEN}Building org-common Lambda layer with Docker...${NC}"

DOCKER_BUILD_SCRIPT="${SCRIPT_DIR}/build-docker.sh"
if [ ! -f "${DOCKER_BUILD_SCRIPT}" ]; then
    echo -e "${RED}ERROR: Docker build script not found: ${DOCKER_BUILD_SCRIPT}${NC}"
    exit 1
fi

"${DOCKER_BUILD_SCRIPT}"

if [ ! -f "${BUILD_DIR}/org-common-layer.zip" ]; then
    echo -e "${RED}ERROR: Layer build failed - ZIP not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Layer built with Docker: ${BUILD_DIR}/org-common-layer.zip${NC}"

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
    pip install -r "${lambda_dir}requirements.txt" -t "${LAMBDA_BUILD_DIR}" --upgrade --quiet
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
du -h "${BUILD_DIR}"/*.zip
echo ""
echo -e "${YELLOW}Next step:${NC} Deploy using the Terraform script in the sts-career-infra repository."
echo ""
echo -e "${GREEN}Build completed successfully!${NC}"
