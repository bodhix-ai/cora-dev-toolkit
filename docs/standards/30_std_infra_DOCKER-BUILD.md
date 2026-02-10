# 30_std_infra_DOCKER-BUILD: Docker Build Standards for CORA Monorepo

**Category:** Infrastructure  
**Version:** 1.0  
**ADR:** [ADR-023](../arch%20decisions/ADR-023-MONOREPO-BUILD-STANDARDS.md)  
**Last Updated:** February 10, 2026

---

## Purpose

This standard defines Docker build requirements for CORA monorepo projects. These standards ensure successful multi-stage builds with pnpm workspaces and Next.js standalone mode.

**Applies to:** `_project-monorepo-template/Dockerfile` and all monorepo projects.

---

## 1. pnpm Filter Syntax Standards

### 1.1 Project-Specific Package Names

**Rule:** Docker build commands MUST use project-specific package names in pnpm filters.

**Why:** pnpm filters match package names from `package.json`, not directory names.

```dockerfile
# ✅ CORRECT - Uses project-specific package name
RUN pnpm install --frozen-lockfile --filter={{PROJECT_NAME}}-web...
RUN pnpm --filter={{PROJECT_NAME}}-web build

# ❌ WRONG - Generic name doesn't match package.json
RUN pnpm install --frozen-lockfile --filter=web...
RUN pnpm --filter=web build
```

**Error Pattern:** `No projects matched the filters in '/app'`

**Template Pattern:**
- Use `{{PROJECT_NAME}}-web` placeholder in Dockerfile
- `create-cora-monorepo.sh` replaces with actual project name (e.g., `ai-mod-web`)
- Must match `"name"` field in `apps/web/package.json`

---

## 2. Node.js Memory Management

### 2.1 Heap Size Requirements

**Rule:** Docker builds MUST allocate at least 4GB heap space for Next.js compilation.

**Why:** Large monorepo builds exhaust default Node.js heap (1.4GB), causing OOM errors.

```dockerfile
# Stage 2: Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"  # ✅ REQUIRED - 4GB heap
RUN pnpm --filter={{PROJECT_NAME}}-web build
```

**Memory Guidelines:**

| Build Size | Heap Size | Flag |
|------------|-----------|------|
| Small (< 20 pages) | 2GB | `--max-old-space-size=2048` |
| Medium (20-50 pages) | 4GB | `--max-old-space-size=4096` ✅ |
| Large (50+ pages) | 6GB | `--max-old-space-size=6144` |

**Default for CORA:** 4GB (handles 29 pages + 9 modules)

**Error Pattern:** `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`

---

## 3. Directory Structure Requirements

### 3.1 Public Directory Requirement

**Rule:** Next.js apps MUST have a `public/` directory, even if empty.

**Why:** Docker COPY command fails if source path doesn't exist.

```dockerfile
# This COPY will fail if public/ doesn't exist
COPY --from=builder /app/apps/web/public ./apps/web/public
```

**Template Setup:**
```bash
# Project structure
apps/
  web/
    public/          # ✅ MUST EXIST
      .gitkeep       # Keep directory in git even if empty
    app/
    package.json
```

**Error Pattern:** `'/app/apps/web/public': not found` during Docker build

**Quick Fix:**
```bash
mkdir -p templates/_project-monorepo-template/apps/web/public
touch templates/_project-monorepo-template/apps/web/public/.gitkeep
```

---

## 4. Dockerfile Syntax Standards

### 4.1 Modern ENV Syntax

**Rule:** Use `ENV KEY=value` syntax (not legacy `ENV KEY value`).

**Why:** Legacy syntax generates deprecation warnings and will be removed.

```dockerfile
# ✅ CORRECT - Modern syntax
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production

# ❌ WRONG - Legacy syntax (deprecated)
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_OPTIONS "--max-old-space-size=4096"
ENV NODE_ENV production
```

**Warning Message:** `LegacyKeyValueFormat: "ENV key=value" should be used instead of legacy "ENV key value" format`

---

## 5. Multi-Stage Build Pattern

### 5.1 Standard Three-Stage Build

**Rule:** Use three-stage build: deps → builder → runner

```dockerfile
# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile --filter={{PROJECT_NAME}}-web...

# Stage 2: Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm --filter={{PROJECT_NAME}}-web build

# Stage 3: Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "apps/web/server.js"]
```

**Why Three Stages:**
1. **deps** - Minimal layer for dependency installation (cacheable)
2. **builder** - Full build with all source code (large, discarded)
3. **runner** - Slim production image with only built artifacts (final)

---

## 6. Next.js Standalone Configuration

### 6.1 Output Mode Requirement

**Rule:** `next.config.mjs` MUST have `output: 'standalone'` for Docker builds.

```javascript
// apps/web/next.config.mjs
// ✅ CORRECT
const nextConfig = {
  output: 'standalone',  // Required for Docker
  transpilePackages: [ /* ... */ ],
  reactStrictMode: true,
};
export default nextConfig;

// ❌ WRONG - Missing standalone output
const nextConfig = {
  transpilePackages: [ /* ... */ ],
  reactStrictMode: true,
};
export default nextConfig;
```

**Why:** Standalone mode generates self-contained build optimized for containers.

**Build Output:** `.next/standalone/` directory with minimal dependencies

---

## 7. Docker Build Command

### 7.1 Standard Build Command

```bash
# Build image
docker build -t {project-name}-web .

# Run container
docker run -p 3000:3000 --env-file .env.local {project-name}-web

# Test health
curl http://localhost:3000/api/health
```

### 7.2 Build Performance Tips

**Enable BuildKit:**
```bash
export DOCKER_BUILDKIT=1
docker build -t {project-name}-web .
```

**Multi-platform builds:**
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t {project-name}-web .
```

**Cache optimization:**
```bash
docker build --cache-from {project-name}-web:latest -t {project-name}-web .
```

---

## Common Error Patterns

### Error: "No projects matched the filters in '/app'"
- **Cause:** pnpm filter doesn't match package name
- **Fix:** Use `--filter={{PROJECT_NAME}}-web` not `--filter=web`
- **Standard:** Section 1.1

### Error: "JavaScript heap out of memory"
- **Cause:** Insufficient Node.js heap size
- **Fix:** Add `ENV NODE_OPTIONS="--max-old-space-size=4096"`
- **Standard:** Section 2.1

### Error: "'/app/apps/web/public': not found"
- **Cause:** Missing public directory
- **Fix:** Create `apps/web/public/.gitkeep` in template
- **Standard:** Section 3.1

### Warning: "LegacyKeyValueFormat"
- **Cause:** Using legacy ENV syntax
- **Fix:** Change `ENV KEY value` to `ENV KEY=value`
- **Standard:** Section 4.1

---

## Validation

**Build Test:**
```bash
cd templates/_project-monorepo-template
docker build -t test-web .
docker run -d -p 3000:3000 --name test-web-container test-web
curl http://localhost:3000/api/health
docker stop test-web-container && docker rm test-web-container
```

**Expected Results:**
- Build completes without errors
- Image size < 300MB
- Health check returns 200 OK
- Container starts in < 5 seconds

**Template Files:**
- `templates/_project-monorepo-template/Dockerfile`
- `templates/_project-monorepo-template/.dockerignore`
- `templates/_project-monorepo-template/apps/web/next.config.mjs`
- `templates/_project-monorepo-template/apps/web/public/.gitkeep`

---

## CI/CD Integration

### GitHub Actions Pattern

```yaml
# .github/workflows/deploy-app.yml
jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build and Push Docker Image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
```

---

**Related Standards:**
- [10_std_cora_MONOREPO](10_std_cora_MONOREPO.md) - Monorepo workspace configuration
- [00_index_STANDARDS](00_index_STANDARDS.md) - Standards index

**Related ADRs:**
- [ADR-023](../arch%20decisions/ADR-023-MONOREPO-BUILD-STANDARDS.md) - Complete build standards with rationale
- ADR-022 - CORA Monorepo Pattern (Coming)

**External References:**
- [Next.js Docker Example](https://github.com/vercel/next.js/tree/canary/examples/with-docker)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)