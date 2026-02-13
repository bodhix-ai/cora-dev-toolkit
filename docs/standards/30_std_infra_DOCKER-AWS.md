# Standard: Docker Platform for AWS Deployment

**Status:** MANDATORY  
**Created:** February 13, 2026  
**Author:** System  
**Applies To:** All Docker images deployed to AWS

---

## Context

AWS services (ECS, App Runner, Lambda) run on **linux/amd64** architecture. Docker images built on ARM-based Macs (M1/M2/M3) default to **linux/arm64** which is incompatible with AWS.

**Critical Issue:** An image built without explicit platform specification will work locally on ARM Macs but fail on AWS with:
- ECS: "image Manifest does not contain descriptor matching platform 'linux/amd64'"
- App Runner: Silent failures, health check timeouts
- Wasted time: 3+ days debugging deployment issues

---

## Rules

### Rule 1: ALWAYS Specify Platform in Dockerfile

```dockerfile
FROM --platform=linux/amd64 node:22-alpine AS deps
```

**Every stage** must have `--platform=linux/amd64`.

### Rule 2: ALWAYS Use Platform Flag in Build Command

```bash
docker build --platform linux/amd64 -t myimage:latest .
```

**Never build without** `--platform linux/amd64`.

### Rule 3: Verify Platform Before Pushing to ECR

```bash
# Verify architecture
docker inspect myimage:latest | jq -r '.[0].Architecture'
# Must output: amd64

# Or use the verification script
./scripts/verify-docker-platform.sh myimage:latest
```

### Rule 4: Add Platform Verification to Dockerfile

```dockerfile
# Fail-safe: Verify build platform
RUN [ "$(uname -m)" = "x86_64" ] || (echo "ERROR: Must build for x86_64/amd64" && exit 1)
```

---

## Standard Scripts

### Build Script (REQUIRED)

Use `scripts/build-docker-aws.sh` for all AWS builds:

```bash
./scripts/build-docker-aws.sh myimage latest
```

This script:
- ✅ Forces `--platform linux/amd64`
- ✅ Warns if on ARM Mac
- ✅ Verifies platform after build
- ✅ Exits with error if wrong platform

### Verification Script (REQUIRED Before Deploy)

Use `scripts/verify-docker-platform.sh` before pushing to ECR:

```bash
./scripts/verify-docker-platform.sh myimage:latest
```

This script:
- ✅ Checks if image is linux/amd64
- ✅ Prevents deployment of wrong platform
- ✅ Provides fix instructions if wrong

---

## CI/CD Integration

### GitHub Actions (Example)

```yaml
- name: Build Docker Image
  run: |
    docker build --platform linux/amd64 -t ${{ env.IMAGE_NAME }} .

- name: Verify Platform
  run: |
    ARCH=$(docker inspect ${{ env.IMAGE_NAME }} | jq -r '.[0].Architecture')
    if [ "$ARCH" != "amd64" ]; then
      echo "ERROR: Image must be amd64, not $ARCH"
      exit 1
    fi
```

---

## Deployment Checklist

Before deploying ANY Docker image to AWS:

- [ ] Dockerfile uses `FROM --platform=linux/amd64` in all stages
- [ ] Build command includes `--platform linux/amd64`
- [ ] Platform verified with `docker inspect` or verification script
- [ ] Architecture is `amd64`, OS is `linux`

**If ANY checkbox is unchecked, DO NOT DEPLOY.**

---

## Examples

### ✅ CORRECT

```bash
# Build
docker build --platform linux/amd64 -t myapp:latest .

# Verify
./scripts/verify-docker-platform.sh myapp:latest

# Push to ECR
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

### ❌ WRONG

```bash
# Missing platform flag - WILL FAIL ON AWS
docker build -t myapp:latest .

# Building on M1 Mac without platform - WRONG ARCHITECTURE
docker build -t myapp:latest .
```

---

## Consequences of Non-Compliance

1. **Wasted Time:** 3+ days debugging deployment failures
2. **Failed Deployments:** Images won't run on AWS
3. **Silent Failures:** Health checks fail, no clear error message
4. **Team Frustration:** Repeatedly fixing the same issue

---

## Enforcement

This standard is **MANDATORY**. All pull requests MUST:

1. Use `--platform linux/amd64` in Dockerfiles
2. Use platform flag in build commands
3. Include platform verification in CI/CD

**Reviewers:** Reject PRs that don't follow this standard.

---

**Bottom Line:** If you're building Docker images for AWS, you MUST specify `--platform linux/amd64` everywhere. No exceptions.