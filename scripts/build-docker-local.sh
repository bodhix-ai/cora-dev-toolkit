#!/bin/bash
# Build Docker images for LOCAL TESTING
# This script builds for your native platform (faster on ARM Macs)

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Local Development Docker Build ===${NC}"
echo "Building for your native platform (fast local testing)"
echo ""

# Detect platform
NATIVE_ARCH=$(uname -m)
if [[ $NATIVE_ARCH == "arm64" ]]; then
    echo -e "${GREEN}✓ Detected ARM Mac (M1/M2/M3)${NC}"
    echo "  Building for native ARM (fast local execution)"
elif [[ $NATIVE_ARCH == "x86_64" ]]; then
    echo -e "${GREEN}✓ Detected x86_64 (Intel)${NC}"
    echo "  Building for native x86_64"
fi

# Verify Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker is not installed${NC}"
    exit 1
fi

# Get image name from argument or default
IMAGE_NAME=${1:-"cora-web"}
IMAGE_TAG=${2:-"latest-local"}

# Read NEXT_PUBLIC_ variables from .env.local
ENV_FILE="apps/web/.env.local"
BUILD_ARGS=""

if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Reading NEXT_PUBLIC_ variables from $ENV_FILE...${NC}"
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        
        # Only process NEXT_PUBLIC_ variables
        if [[ "$key" =~ ^NEXT_PUBLIC_ ]]; then
            # Remove quotes from value if present
            value="${value%\"}"
            value="${value#\"}"
            
            echo "  - $key"
            BUILD_ARGS="$BUILD_ARGS --build-arg $key=$value"
        fi
    done < "$ENV_FILE"
    echo ""
else
    echo -e "${YELLOW}⚠️  Warning: $ENV_FILE not found${NC}"
    echo "Building without NEXT_PUBLIC_ variables (may cause runtime errors)"
    echo ""
fi

echo ""
echo -e "${GREEN}Building Docker image...${NC}"
echo "Image: $IMAGE_NAME:$IMAGE_TAG"
echo "Platform: native ($NATIVE_ARCH)"
echo ""

# Build WITHOUT platform flag (uses native) but WITH build args
docker build \
    $BUILD_ARGS \
    -t $IMAGE_NAME:$IMAGE_TAG \
    -f Dockerfile.web \
    .

echo ""
echo -e "${GREEN}✅ Local build complete!${NC}"
echo "Image: $IMAGE_NAME:$IMAGE_TAG"
echo ""
echo -e "${YELLOW}⚠️  WARNING: This image is for LOCAL TESTING ONLY${NC}"
echo "   Do NOT push this to ECR or deploy to AWS"
echo ""
echo "   For AWS deployment, use:"
echo "   ./scripts/build-docker-aws.sh $IMAGE_NAME"