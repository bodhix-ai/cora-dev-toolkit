#!/bin/bash
# Verify Docker image platform before deployment
# Run this before pushing to ECR

set -e

IMAGE_NAME=$1

if [ -z "$IMAGE_NAME" ]; then
    echo "Usage: $0 <image-name>"
    exit 1
fi

echo "Verifying platform for image: $IMAGE_NAME"

# Check if image exists
if ! docker image inspect $IMAGE_NAME > /dev/null 2>&1; then
    echo "ERROR: Image $IMAGE_NAME not found"
    exit 1
fi

# Get architecture
ARCH=$(docker inspect $IMAGE_NAME | jq -r '.[0].Architecture')
OS=$(docker inspect $IMAGE_NAME | jq -r '.[0].Os')

echo "Platform: $OS/$ARCH"

if [ "$ARCH" != "amd64" ]; then
    echo "❌ ERROR: Image is built for $ARCH"
    echo "AWS requires linux/amd64"
    echo ""
    echo "To fix, rebuild with:"
    echo "  docker build --platform linux/amd64 -t $IMAGE_NAME ."
    exit 1
fi

if [ "$OS" != "linux" ]; then
    echo "❌ ERROR: Image is built for $OS"
    echo "AWS requires linux"
    exit 1
fi

echo "✅ Image platform verified: linux/amd64"
echo "Safe to deploy to AWS"