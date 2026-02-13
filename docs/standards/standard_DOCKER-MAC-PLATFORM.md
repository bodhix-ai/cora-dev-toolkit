# Standard: Docker Builds - Local vs AWS

**Status:** MANDATORY  
**Created:** February 13, 2026  
**Applies To:** All Docker development and deployment

---

## Two Build Strategies

### Strategy 1: Local Development (Fast)

**Purpose:** Testing on your Mac during development  
**Platform:** Native (arm64 on M1/M2/M3 Macs, x86_64 on Intel)  
**Speed:** ⚡ FAST (no emulation needed)  
**AWS Compatible:** ❌ NO - Do not deploy to AWS

**Script:** `./scripts/build-docker-local.sh`

```bash
# Build for local testing
./scripts/build-docker-local.sh myapp latest-local

# Run locally
docker run -p 3000:3000 myapp:latest-local
```

**When to use:**
- Development and debugging
- Local integration testing
- Quick iteration cycles
- Running on your Mac

---

### Strategy 2: AWS Deployment (Compatible)

**Purpose:** Deployment to AWS (ECS, App Runner, Lambda)  
**Platform:** linux/amd64 (REQUIRED for AWS)  
**Speed:** 🐌 Slower on ARM Macs (requires emulation)  
**AWS Compatible:** ✅ YES - Safe to deploy

**Script:** `./scripts/build-docker-aws.sh`

```bash
# Build for AWS
./scripts/build-docker-aws.sh myapp latest

# Push to ECR
docker tag myapp:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

**When to use:**
- Before pushing to ECR
- CI/CD pipelines
- Production deployments
- Any AWS deployment

---

## Comparison

| Aspect | Local Build | AWS Build |
|--------|-------------|-----------|
| **Script** | `build-docker-local.sh` | `build-docker-aws.sh` |
| **Platform** | Native (arm64 or x86_64) | linux/amd64 (forced) |
| **Speed on M1 Mac** | ⚡ Fast | 🐌 Slower |
| **Deploy to AWS** | ❌ NO | ✅ YES |
| **Local testing** | ✅ YES | ✅ YES (but slower) |
| **Tag suffix** | `-local` | none |

---

## Workflow Example

### Daily Development on M1 Mac

```bash
# 1. Make code changes
vim apps/web/app/page.tsx

# 2. Build for local testing (FAST)
./scripts/build-docker-local.sh myapp dev

# 3. Test locally
docker run -p 3000:3000 myapp:dev
# Visit http://localhost:3000

# 4. Iterate quickly (native ARM = fast builds)
```

### Preparing for AWS Deployment

```bash
# 1. Build for AWS (slower, but required)
./scripts/build-docker-aws.sh myapp latest

# 2. Verify platform
./scripts/verify-docker-platform.sh myapp:latest
# Must show: linux/amd64

# 3. Push to ECR
aws ecr get-login-password | docker login ...
docker tag myapp:latest $ECR_REPO:latest
docker push $ECR_REPO:latest

# 4. Deploy to AWS
terraform apply  # or other deployment method
```

---

## Docker Compose for Local Dev

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.web
      # No platform flag - uses native for speed
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
```

For local dev with docker-compose, omit `platform` to use native architecture.

---

## CI/CD Pipeline

### GitHub Actions (Always AWS Platform)

```yaml
- name: Build for AWS
  run: |
    docker build --platform linux/amd64 -t $IMAGE_NAME .
    
- name: Verify Platform
  run: |
    ARCH=$(docker inspect $IMAGE_NAME | jq -r '.[0].Architecture')
    if [ "$ARCH" != "amd64" ]; then
      echo "ERROR: Must be amd64"
      exit 1
    fi
```

CI/CD **always** builds for AWS (linux/amd64).

---

## Common Mistakes

### ❌ WRONG: Using local build for AWS

```bash
# Build natively on M1 Mac
./scripts/build-docker-local.sh myapp latest

# Push to ECR - WILL FAIL ON AWS!
docker push $ECR_REPO:latest  # ❌ ARM image won't work
```

### ❌ WRONG: Using AWS build for everyday dev

```bash
# Always building for amd64 during development
./scripts/build-docker-aws.sh myapp dev  # 🐌 Unnecessarily slow
```

### ✅ CORRECT: Use right build for right purpose

```bash
# Local development - use local build
./scripts/build-docker-local.sh myapp dev

# AWS deployment - use AWS build
./scripts/build-docker-aws.sh myapp latest
```

---

## Quick Reference

**On your Mac (M1/M2/M3):**
- Local testing? → `build-docker-local.sh` (fast ⚡)
- AWS deployment? → `build-docker-aws.sh` (required ✅)

**In CI/CD:**
- Always use `build-docker-aws.sh` or `--platform linux/amd64`

**Before pushing to ECR:**
- Always verify: `./scripts/verify-docker-platform.sh <image>`
- Must be linux/amd64

---

## Bottom Line

- **Two scripts for two purposes**
- **Local = fast development** (native platform)
- **AWS = compatible deployment** (linux/amd64)
- **Never mix them up!**