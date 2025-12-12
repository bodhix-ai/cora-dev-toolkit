#!/bin/bash
set -e

# AI Config Lambda Layer Build Script
# Builds the ai-config-common layer for AWS Lambda

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAYER_DIR="$SCRIPT_DIR/ai-config-common"
BUILD_DIR="$LAYER_DIR/build"
OUTPUT_DIR="$(cd "$SCRIPT_DIR/../../../../../${project}-infra" && pwd)/build"

echo "======================================"
echo "Building AI Config Common Lambda Layer"
echo "======================================"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Clean previous build
echo "Cleaning previous build..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/python"

# Copy ai_config module to build directory
echo "Copying ai_config module..."
cp -r "$LAYER_DIR/python/ai_config" "$BUILD_DIR/python/"

# Install dependencies to the python directory
echo "Installing Python dependencies..."
if [ -f "$LAYER_DIR/requirements.txt" ]; then
    pip install -r "$LAYER_DIR/requirements.txt" -t "$BUILD_DIR/python/" --upgrade
else
    echo "No requirements.txt found, skipping dependency installation"
fi

# Create zip file
echo "Creating layer package..."
cd "$BUILD_DIR"
zip -r9 ai-config-common.zip python/

# Move to output directory
echo "Moving package to infrastructure build directory..."
mv ai-config-common.zip "$OUTPUT_DIR/"

# Clean up build directory
echo "Cleaning up..."
cd "$SCRIPT_DIR"
rm -rf "$BUILD_DIR"

echo ""
echo "✅ Successfully built ai-config-common layer"
echo "📦 Output: $OUTPUT_DIR/ai-config-common.zip"
echo ""
echo "Next steps:"
echo "  1. Update Terraform configuration"
echo "  2. Run: cd ${project}-infra/envs/dev && terraform plan"
echo "  3. Run: cd ${project}-infra/envs/dev && terraform apply"
echo ""
