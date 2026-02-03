#!/usr/bin/env bash
# Build script for module-ws Lambda functions (Zip-Based)
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
# Build Lambda Layer (ws_common)
# ========================================
echo -e "${GREEN}Building ws_common Lambda layer...${NC}"

LAYERS_DIR="${SCRIPT_DIR}/layers"
WS_LAYER_DIR="${LAYERS_DIR}/ws_common"
WS_LAYER_BUILD_DIR="${BUILD_DIR}/ws-layer-build"

if [ ! -d "${WS_LAYER_DIR}" ]; then
    echo -e "${RED}ERROR: Layer directory not found: ${WS_LAYER_DIR}${NC}"
    exit 1
fi

mkdir -p "${WS_LAYER_BUILD_DIR}/python"

# Install layer dependencies if needed
if [ -f "${WS_LAYER_DIR}/requirements.txt" ]; then
    echo "Installing ws_common layer dependencies for Python 3.11..."
    pip3 install -r "${WS_LAYER_DIR}/requirements.txt" -t "${WS_LAYER_BUILD_DIR}/python" \
        --platform manylinux2014_x86_64 \
        --python-version 3.11 \
        --implementation cp \
        --only-binary=:all: \
        --upgrade --quiet
fi

# Copy layer code
if [ -d "${WS_LAYER_DIR}/python" ]; then
    cp -r "${WS_LAYER_DIR}"/python/* "${WS_LAYER_BUILD_DIR}/python/"
fi

# Create layer ZIP
(
    cd "${WS_LAYER_BUILD_DIR}"
    zip -r "${BUILD_DIR}/ws_common-layer.zip" python -q
)

echo -e "${GREEN}✓ Layer built: ${BUILD_DIR}/ws_common-layer.zip${NC}"

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
