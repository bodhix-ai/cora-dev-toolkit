#!/usr/bin/env bash
# Build script for module-ws Lambda functions (Zip-Based)
# This module does not have layers - it uses org-common from module-access
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building module-ws backend (zip-based)...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAMBDAS_DIR="${SCRIPT_DIR}/lambdas"
BUILD_DIR="${SCRIPT_DIR}/.build"

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# ========================================
# Build Lambda Functions
# ========================================

# Function to build a Lambda function
build_lambda() {
    local lambda_name="$1"
    local lambda_dir="${LAMBDAS_DIR}/${lambda_name}"
    
    if [ ! -d "${lambda_dir}" ]; then
        echo -e "${RED}ERROR: Lambda directory not found: ${lambda_dir}${NC}"
        return 1
    fi
    
    echo "--- Building ${lambda_name} Lambda ---"
    
    local lambda_build_dir="${BUILD_DIR}/${lambda_name}-build"
    mkdir -p "${lambda_build_dir}"
    
    # Copy Lambda function code
    cp "${lambda_dir}/lambda_function.py" "${lambda_build_dir}/"
    
    # Install dependencies if requirements.txt exists
    if [ -f "${lambda_dir}/requirements.txt" ]; then
        pip3 install -r "${lambda_dir}/requirements.txt" -t "${lambda_build_dir}" \
            --platform manylinux2014_x86_64 \
            --python-version 3.11 \
            --implementation cp \
            --only-binary=:all: \
            --upgrade --quiet || true
    fi
    
    # Create zip file
    cd "${lambda_build_dir}"
    zip -q -r "${BUILD_DIR}/${lambda_name}.zip" .
    cd - > /dev/null
    
    # Cleanup build directory
    rm -rf "${lambda_build_dir}"
    
    echo -e "${GREEN}✓ Lambda built: ${BUILD_DIR}/${lambda_name}.zip${NC}"
}

# Build workspace Lambda
build_lambda "workspace"

# Build cleanup Lambda
build_lambda "cleanup"

# ========================================
# Build Complete
# ========================================

echo ""
echo "========================================"
echo "Build Complete!"
echo "========================================"
echo ""
echo "Build artifacts created in: ${BUILD_DIR}"
du -sh "${BUILD_DIR}"/*.zip
echo ""
echo "Build completed successfully!"
