#!/bin/bash
# KB Processor Lambda - Build Script
#
# Creates deployment package with Linux-compatible binaries for AWS Lambda
# Output: backend/build/kb-processor.zip

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$BACKEND_DIR/build"
LAMBDA_NAME="kb-processor"

echo "============================================"
echo "Building Lambda: $LAMBDA_NAME"
echo "============================================"

# Create build directory
mkdir -p "$BUILD_DIR"

# Create temp directory for package
TEMP_DIR=$(mktemp -d)
echo "📦 Temp directory: $TEMP_DIR"

# Copy Lambda code
echo "📋 Copying Lambda code..."
cp "$SCRIPT_DIR/lambda_function.py" "$TEMP_DIR/"

# Install dependencies with Linux binary compatibility
echo "📥 Installing dependencies (Linux binaries)..."
pip install \
    --platform manylinux2014_x86_64 \
    --target "$TEMP_DIR" \
    --implementation cp \
    --python-version 3.11 \
    --only-binary=:all: \
    --upgrade \
    -r "$SCRIPT_DIR/requirements.txt"

# Create zip file
echo "🗜️  Creating zip file..."
cd "$TEMP_DIR"
zip -r "$BUILD_DIR/$LAMBDA_NAME.zip" . -q

# Cleanup
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

# Show result
ZIP_SIZE=$(du -h "$BUILD_DIR/$LAMBDA_NAME.zip" | cut -f1)
echo ""
echo "✅ Built: $BUILD_DIR/$LAMBDA_NAME.zip ($ZIP_SIZE)"
echo ""
