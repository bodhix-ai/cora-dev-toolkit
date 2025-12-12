#!/bin/bash
# Docker-based build script for org-module Lambda Layer
# This ensures Linux-compatible binaries are built for AWS Lambda

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building org-common Lambda layer with Docker (Linux binaries)...${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}"
BUILD_DIR="${BACKEND_DIR}/.build"

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}Building layer with AWS Lambda Python 3.13 base image...${NC}"

# Run Docker container to build the layer
# IMPORTANT: Use --platform linux/amd64 to match Lambda x86_64 architecture
docker run --rm \
    --platform linux/amd64 \
    --entrypoint /bin/bash \
    -v "${BACKEND_DIR}/layers/org-common/python:/build-src:ro" \
    -v "${BUILD_DIR}:/build-output" \
    public.ecr.aws/lambda/python:3.13 \
    -c "
        set -e
        echo 'Creating python directory for Lambda Layer...'
        mkdir -p /tmp/layer/python
        
        echo 'Installing dependencies with pip...'
        pip install -r /build-src/requirements.txt -t /tmp/layer/python/ --upgrade --quiet
        
        echo 'Copying org_common package...'
        cp -r /build-src/org_common /tmp/layer/python/
        
        echo 'Cleaning up unnecessary files...'
        cd /tmp/layer/python
        rm -rf ./*/__pycache__ 2>/dev/null || true
        rm -f ./*.pyc ./*/*.pyc ./*/*/*.pyc 2>/dev/null || true
        
        echo 'Creating ZIP archive with Python...'
        python3 << 'PYEOF'
import os
import zipfile
from pathlib import Path

os.chdir('/tmp/layer')
with zipfile.ZipFile('/build-output/org-common-layer.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk('python'):
        for file in files:
            file_path = os.path.join(root, file)
            zipf.write(file_path)
print('ZIP archive created successfully')
PYEOF
        
        echo 'Verifying pydantic_core binary format...'
        cd /tmp/layer/python
        if ls pydantic_core/_pydantic_core.*.so 1> /dev/null 2>&1; then
            echo '✓ Found Linux .so file (correct)'
            ls -lh pydantic_core/_pydantic_core.*.so || true
        else
            echo 'Note: pydantic_core .so file not found (may not be required)'
        fi
        
        echo 'Build complete!'
    "

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Docker build failed${NC}"
    exit 1
fi

# ========================================
# Summary
# ========================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Layer Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Build artifact:"
echo "  Layer: ${BUILD_DIR}/org-common-layer.zip"
echo ""

# Display size
if [ -f "${BUILD_DIR}/org-common-layer.zip" ]; then
    echo "Layer size:"
    du -h "${BUILD_DIR}/org-common-layer.zip"
    echo ""
    
    echo -e "${GREEN}Verifying layer contents...${NC}"
    echo "Files in layer:"
    unzip -l "${BUILD_DIR}/org-common-layer.zip" | grep -E "(org_common|pydantic|supabase)" | head -20
    echo ""
    
    echo -e "${YELLOW}Checking for Linux binaries (.so files):${NC}"
    unzip -l "${BUILD_DIR}/org-common-layer.zip" | grep "\.so" || echo "No .so files found (this might be OK if pydantic doesn't need compiled extensions)"
    echo ""
    
    echo -e "${GREEN}✓ Layer built successfully with Linux-compatible binaries!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Deploy using Terraform:"
    echo "   cd ../../../../sts-career-infra/terraform/environments/dev"
    echo "   terraform apply"
    echo ""
    echo "2. Or verify the layer first:"
    echo "   unzip -l ${BUILD_DIR}/org-common-layer.zip"
    echo ""
else
    echo -e "${RED}ERROR: Layer ZIP file was not created${NC}"
    exit 1
fi
