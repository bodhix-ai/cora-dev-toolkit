#!/bin/bash
set -e

# Build script for kb-document Lambda
# Creates deployment package with Linux-compatible binaries for AWS Lambda

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/../../build"
LAMBDA_NAME="kb-document"
ZIP_FILE="${BUILD_DIR}/${LAMBDA_NAME}.zip"

echo "Building ${LAMBDA_NAME} Lambda..."

# Clean previous build
rm -rf "${BUILD_DIR}/${LAMBDA_NAME}"
mkdir -p "${BUILD_DIR}/${LAMBDA_NAME}"

# Install dependencies with Linux binaries
echo "Installing dependencies..."
pip install -r "${SCRIPT_DIR}/requirements.txt" \
    --platform manylinux2014_x86_64 \
    --target "${BUILD_DIR}/${LAMBDA_NAME}" \
    --only-binary=:all: \
    --python-version 3.11 \
    --implementation cp

# Copy Lambda function
echo "Copying Lambda function..."
cp "${SCRIPT_DIR}/lambda_function.py" "${BUILD_DIR}/${LAMBDA_NAME}/"

# Create ZIP file
echo "Creating deployment package..."
cd "${BUILD_DIR}/${LAMBDA_NAME}"
zip -r "${ZIP_FILE}" . > /dev/null

echo "✅ Built: ${ZIP_FILE}"
echo "   Size: $(du -h "${ZIP_FILE}" | cut -f1)"
