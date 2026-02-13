# App Runner Hello World Experiment

This is a minimal Next.js application deployed to AWS App Runner to test and validate working configurations.

## Purpose

Find a working App Runner configuration by isolating from CORA monorepo complexity.

## Project Structure

```
apprunner-hello/
├── app/                           # Next.js application
│   ├── app/
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Home page
│   │   └── api/
│   │       └── health/
│   │           └── route.ts      # Health check endpoint (200 OK)
│   ├── package.json
│   ├── next.config.js            # Standalone output config
│   ├── tsconfig.json
│   └── Dockerfile                # Multi-stage Docker build
└── terraform/                     # Infrastructure as Code
    ├── main.tf                   # ECR + IAM + App Runner
    ├── variables.tf
    ├── outputs.tf
    └── terraform.tfvars
```

## Key Configuration Points

### 1. Health Check Endpoint
- **Path**: `/api/health`
- **Response**: `200 OK` with JSON payload
- **No Authentication**: Unprotected endpoint for App Runner health checks

### 2. Docker Configuration
- **Base Image**: `node:20-alpine`
- **Build**: Multi-stage (deps → builder → runner)
- **Output**: Next.js standalone mode
- **Port**: 3000
- **Environment**:
  - `HOSTNAME=0.0.0.0` (bind to all interfaces)
  - `NODE_ENV=production`

### 3. App Runner Configuration
- **Health Check**: HTTP GET `/api/health`
- **Port**: 3000
- **CPU**: 1 vCPU
- **Memory**: 2 GB
- **IAM Roles**:
  - ECR Access Role (to pull images)
  - Instance Role (for CloudWatch Logs)

## Prerequisites

- Node.js 20+
- Docker
- AWS CLI configured with `ai-sec-nonprod` profile
- Terraform 1.0+

## Step-by-Step Deployment

### Step 1: Install Dependencies

```bash
cd app
npm install
```

### Step 2: Test Locally (Optional)

```bash
# Development mode
npm run dev

# Test health endpoint
curl http://localhost:3000/api/health
```

### Step 3: Initialize Terraform

```bash
cd ../terraform
terraform init
```

### Step 4: Create ECR Repository

```bash
# Plan (review changes)
terraform plan

# Apply (create ECR only, App Runner will fail without image)
terraform apply -target=aws_ecr_repository.app -target=aws_ecr_lifecycle_policy.app
```

**Save the ECR URL from outputs:**
```bash
export ECR_URL=$(terraform output -raw ecr_repository_url)
echo $ECR_URL
```

### Step 5: Build and Push Docker Image

```bash
cd ../app

# Login to ECR
aws ecr get-login-password --region us-east-1 --profile ai-sec-nonprod | \
  docker login --username AWS --password-stdin $ECR_URL

# Build image
docker build -t apprunner-hello:latest .

# Tag image
docker tag apprunner-hello:latest $ECR_URL:latest

# Push image
docker push $ECR_URL:latest
```

### Step 6: Deploy App Runner Service

```bash
cd ../terraform

# Apply full infrastructure
terraform apply
```

**Get the App Runner URL:**
```bash
terraform output apprunner_service_url
```

### Step 7: Verify Deployment

```bash
# Get service URL
SERVICE_URL=$(terraform output -raw apprunner_service_url)

# Test health endpoint
curl https://$SERVICE_URL/api/health

# Test home page
curl https://$SERVICE_URL
```

## Quick Deploy Script

Create `deploy.sh` in the root:

```bash
#!/bin/bash
set -e

echo "🚀 App Runner Hello World Deployment"
echo "===================================="

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
cd app
npm install

# Step 2: Initialize Terraform
echo "��️  Initializing Terraform..."
cd ../terraform
terraform init

# Step 3: Create ECR (if not exists)
echo "📦 Creating ECR repository..."
terraform apply -target=aws_ecr_repository.app -target=aws_ecr_lifecycle_policy.app -auto-approve

# Get ECR URL
export ECR_URL=$(terraform output -raw ecr_repository_url)
echo "ECR URL: $ECR_URL"

# Step 4: Build and push Docker image
echo "🐳 Building Docker image..."
cd ../app

# Login to ECR
aws ecr get-login-password --region us-east-1 --profile ai-sec-nonprod | \
  docker login --username AWS --password-stdin $ECR_URL

# Build
docker build -t apprunner-hello:latest .

# Tag
docker tag apprunner-hello:latest $ECR_URL:latest

# Push
docker push $ECR_URL:latest

# Step 5: Deploy App Runner
echo "🚀 Deploying to App Runner..."
cd ../terraform
terraform apply -auto-approve

# Get service URL
export SERVICE_URL=$(terraform output -raw apprunner_service_url)
echo ""
echo "✅ Deployment complete!"
echo "Service URL: https://$SERVICE_URL"
echo ""
echo "Test health endpoint:"
echo "curl https://$SERVICE_URL/api/health"
```

Make it executable:
```bash
chmod +x deploy.sh
```

## Monitoring

### Check Service Status

```bash
cd terraform

# Get service ARN
SERVICE_ARN=$(terraform output -raw apprunner_service_arn)

# Check status
aws apprunner describe-service \
  --service-arn $SERVICE_ARN \
  --region us-east-1 \
  --profile ai-sec-nonprod \
  --query 'Service.Status' \
  --output text
```

### View CloudWatch Logs

```bash
# Tail logs
aws logs tail /aws/apprunner/apprunner-hello \
  --region us-east-1 \
  --profile ai-sec-nonprod \
  --follow
```

## Troubleshooting

### Health Checks Failing

1. **Check CloudWatch Logs** - Look for application errors
2. **Test Health Endpoint** - Ensure `/api/health` returns 200
3. **Check Port Configuration** - Verify container listens on 3000
4. **Environment Variables** - Ensure `HOSTNAME=0.0.0.0`

### Image Build Fails

1. **Check Docker** - Ensure Docker daemon is running
2. **Review Logs** - Check build output for errors
3. **Test Locally** - Build and run container locally first

### Terraform Apply Fails

1. **ECR Image Required** - Must push image before deploying App Runner
2. **IAM Permissions** - Ensure AWS profile has necessary permissions
3. **Region** - Verify deploying to correct region (us-east-1)

## Cleanup

```bash
cd terraform

# Destroy all resources
terraform destroy

# Confirm deletion
```

**Note**: This will delete:
- App Runner service
- ECR repository and all images
- IAM roles

## Configuration Findings

Document any successful configurations here:

### Working Configuration

- [ ] Health check path: `/api/health`
- [ ] Health check interval: `___` seconds
- [ ] Timeout: `___` seconds
- [ ] Port: `___`
- [ ] Environment variables needed: `___`
- [ ] IAM roles required: `___`

### Issues Encountered

(Document any issues and their solutions)

## Next Steps

Once working configuration is found:
1. Document exact configuration in this README
2. Apply learnings to CORA monorepo deployment
3. Update `memory-bank/context-monorepo-deployment.md`
4. Update Terraform in monorepo template

## Resources

- [AWS App Runner Documentation](https://docs.aws.amazon.com/apprunner/)
- [Next.js Standalone Output](https://nextjs.org/docs/advanced-features/output-file-tracing)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)