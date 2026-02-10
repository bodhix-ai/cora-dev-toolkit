#!/usr/bin/env bash
# Build API Gateway Authorizer Lambda
# Installs Linux-compatible binaries for AWS Lambda

set -euo pipefail

echo "Building API Gateway Authorizer Lambda..."

# Clean up old builds
rm -rf package
rm -f ../../build/authorizer.zip
mkdir -p ../../build
mkdir -p package

# Install pure Python packages (no platform-specific binaries)
echo "Installing PyJWT (pure Python)..."
pip3 install PyJWT==2.8.0 -t package/ --quiet

# Install packages with LINUX binaries (for AWS Lambda)
echo "Installing cryptography and requests with Linux binaries..."
pip3 install cryptography requests -t package/ \
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
zip -r ../../../build/authorizer.zip . -q
cd ..

# Clean up
rm -rf package

echo "✅ Built: build/authorizer.zip"
ls -lh ../../build/authorizer.zip
echo ""
echo "Note: Built with Linux binaries for AWS Lambda compatibility"
