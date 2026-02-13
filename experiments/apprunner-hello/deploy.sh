#!/bin/bash
set -e

echo "🚀 App Runner Hello World Deployment"
echo "===================================="
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "❌ Terraform is required but not installed."; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI is required but not installed."; exit 1; }

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
cd app
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✓ Dependencies already installed"
fi

# Step 2: Initialize Terraform
echo ""
echo "🏗️  Initializing Terraform..."
cd ../terraform
if [ ! -d ".terraform" ]; then
    terraform init
else
    echo "✓ Terraform already initialized"
fi

# Step 3: Create ECR (if not exists)
echo ""
echo "📦 Creating ECR repository..."
terraform apply -target=aws_ecr_repository.app -target=aws_ecr_lifecycle_policy.app -auto-approve

# Get ECR URL
export ECR_URL=$(terraform output -raw ecr_repository_url)
echo "✓ ECR URL: $ECR_URL"

# Step 4: Build and push Docker image
echo ""
echo "🐳 Building Docker image..."
cd ../app

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region us-east-1 --profile ai-sec-nonprod | \
  docker login --username AWS --password-stdin $ECR_URL

# Build
echo "🔨 Building image..."
docker build -t apprunner-hello:latest .

# Tag
echo "🏷️  Tagging image..."
docker tag apprunner-hello:latest $ECR_URL:latest

# Push
echo "⬆️  Pushing to ECR..."
docker push $ECR_URL:latest

# Step 5: Deploy App Runner
echo ""
echo "🚀 Deploying to App Runner..."
cd ../terraform
terraform apply -auto-approve

# Get service URL
export SERVICE_URL=$(terraform output -raw apprunner_service_url)
echo ""
echo "✅ Deployment complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Service URL: https://$SERVICE_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test commands:"
echo "  curl https://$SERVICE_URL/api/health"
echo "  curl https://$SERVICE_URL"
echo ""
echo "Monitor logs:"
echo "  aws logs tail /aws/apprunner/apprunner-hello --region us-east-1 --profile ai-sec-nonprod --follow"
echo ""