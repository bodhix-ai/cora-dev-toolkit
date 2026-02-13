#!/bin/bash
# CRITICAL: Build Docker images for AWS deployment
# This script ensures all Docker images are built for linux/amd64 platform

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== AWS Docker Build Script ===${NC}"
echo "This script builds Docker images for AWS (linux/amd64 platform)"
echo ""

# Check if running on M1/M2 Mac
if [[ $(uname -m) == "arm64" ]]; then
    echo -e "${YELLOW}⚠️  Detected ARM Mac (M1/M2/M3)${NC}"
    echo "Building for linux/amd64 platform (required for AWS)"
fi

# Verify Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker is not installed${NC}"
    exit 1
fi

# Get image name from argument or default
IMAGE_NAME=${1:-"cora-web"}
IMAGE_TAG=${2:-"latest"}

# CRITICAL: Always use --platform linux/amd64
PLATFORM="linux/amd64"

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

echo -e "${GREEN}Building Docker image...${NC}"
echo "Image: $IMAGE_NAME:$IMAGE_TAG"
echo "Platform: $PLATFORM"
echo ""

# Build with explicit platform flag and build args
docker build \
    --platform $PLATFORM \
    $BUILD_ARGS \
    -t $IMAGE_NAME:$IMAGE_TAG \
    -f Dockerfile.web \
    .

# Verify the built image platform
echo ""
echo -e "${GREEN}Verifying image platform...${NC}"
ACTUAL_PLATFORM=$(docker inspect $IMAGE_NAME:$IMAGE_TAG | jq -r '.[0].Architecture')

if [ "$ACTUAL_PLATFORM" != "amd64" ]; then
    echo -e "${RED}ERROR: Image was built for $ACTUAL_PLATFORM instead of amd64!${NC}"
    echo "This image will NOT work on AWS!"
    exit 1
fi

echo -e "${GREEN}✅ Image verified: $ACTUAL_PLATFORM${NC}"
echo ""
echo -e "${GREEN}Build complete!${NC}"
echo "Image: $IMAGE_NAME:$IMAGE_TAG (linux/amd64)"