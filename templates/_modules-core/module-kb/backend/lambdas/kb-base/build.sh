#!/usr/bin/env bash
# Build KB Base Lambda
# Installs Linux-compatible binaries for AWS Lambda

set -euo pipefail

echo "Building KB Base Lambda..."

# Clean up old builds
rm -rf package
rm -f ../../build/kb-base.zip
mkdir -p ../../build
mkdir -p package

# Install packages with LINUX binaries (for AWS Lambda)
echo "Installing dependencies with Linux binaries..."
pip3 install -r requirements.txt -t package/ \
  --platform manylinux2014_x86_64 \
  --python-version 3.11 \
  --implementation cp \
  --abi cp311 \
  --only-binary=:all: \
  --quiet

# Copy Lambda function
echo "Copying Lambda function..."
cp lambda_function.py package/

# Create zip
echo "Creating zip file..."
cd package
zip -r ../../../build/kb-base.zip . -q
cd ..

# Clean up
rm -rf package

echo "✅ Built: build/kb-base.zip"
ls -lh ../../build/kb-base.zip
echo ""
echo "Note: Built with Linux binaries for AWS Lambda compatibility"
