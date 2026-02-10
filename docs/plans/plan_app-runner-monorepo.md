# Plan: App Runner Deployment + Mono-Repo Consolidation

**Status:** Phase 1 In Progress (57% Complete - 4/7 tasks done)  
**Created:** February 9, 2026  
**Last Updated:** February 9, 2026 (20:28 EST)  
**Estimated Timeline:** 5-6 working days  
**Risk Level:** Medium (Phase 2 build readiness is critical path)

---

## Executive Summary

This plan consolidates the two-repo CORA pattern (`{project}-infra` + `{project}-stack`) into a single mono-repo and deploys the Next.js web application to AWS App Runner as a containerized service.

**Key Goals:**
1. Create a new mono-repo template (`_project-monorepo-template`) alongside existing templates
2. Deploy `apps/web` to AWS App Runner (web-first, studio deferred)
3. Maintain 100% backward compatibility with existing two-repo projects (pm-app)
4. Establish reusable patterns for future CORA projects

**What Changes:**
- New template structure combining infra + stack into single repo
- Infrastructure (Terraform) moves to repo root (`envs/`, `lambdas/`, `modules/`)
- Apps and packages stay in current locations (`apps/`, `packages/`)
- New App Runner Terraform module for containerized deployments
- Split CI/CD workflows (`deploy-infra.yml` + `deploy-app.yml`)
- Remove github-oidc-role module (use STS central hub-and-spoke OIDC)

**What Stays the Same:**
- Existing templates (`_project-infra-template`, `_project-stack-template`) untouched
- Existing `create-cora-project.sh` script untouched
- pm-app and all current projects unaffected
- Core/functional module templates unchanged

---

## Strategic Decisions (Resolved)

### Decision 1: Mono-Repo Template Strategy
**Choice:** Create new `_project-monorepo-template/` alongside existing templates  
**Rationale:** Zero risk to existing projects; can deprecate old templates once mono-repo is proven

### Decision 2: App Runner — One Service or Two?
**Choice:** Web-first (deploy web now, studio deferred)  
**Rationale:** Validate pattern with main app; studio follows same pattern later

### Decision 3: Container Build Strategy
**Choice:** Root Dockerfile using `pnpm deploy --filter=web --prod`  
**Rationale:** Industry standard for pnpm monorepos with Next.js standalone

### Decision 4: CI/CD Pipeline Architecture
**Choice:** Separate workflows (`deploy-infra.yml` + `deploy-app.yml`)  
**Rationale:** Different triggers, tooling, and failure modes; keeps concerns separated

### Decision 5: CORS Strategy
**Choice:** Wildcard (`[\"*\"]`) in dev, explicit origins via tfvars in stg/prd  
**Rationale:** Simple for dev, secure for production; add explicit headers for reliability

### Decision 6: Clerk Cleanup Scope
**Choice:** Remove Clerk adapter but keep adapter interface pattern  
**Rationale:** Clean codebase while preserving extensibility for future providers

---

## Risk Mitigation: Legacy Process Coexistence

### Zero-Impact Guarantee

| Legacy Asset | Impact | Protection Mechanism |
|--------------|--------|---------------------|
| `_project-infra-template/` | ❌ Not touched | New template is in separate directory |
| `_project-stack-template/` | ❌ Not touched | New template is in separate directory |
| `create-cora-project.sh` | ❌ Not touched | New script (`create-cora-monorepo.sh`) is separate file |
| pm-app-infra / pm-app-stack | ❌ Not affected | Different repos, different pattern |
| Module templates | ✅ Read-only | Both patterns reference but don't modify |
| Validation scripts | ✅ Enhanced | Add mono-repo detection, no breaking changes |
| `.clinerules` | ✅ Additive | Add mono-repo sections, existing rules preserved |

### Rollback Strategy

If the mono-repo pattern fails validation:
1. Delete `_project-monorepo-template/` directory
2. Delete `create-cora-monorepo.sh` script
3. Revert `.clinerules` and memory-bank updates
4. **Result:** Toolkit returns to exact pre-project state

---

## Architecture Overview

### Mono-Repo Structure

```
{project}/  (single repo)
├── .github/workflows/
│   ├── deploy-infra.yml      # Terraform plan/apply
│   └── deploy-app.yml         # Docker build → ECR → App Runner
├── apps/
│   ├── web/                   # Main Next.js app (port 3000)
│   └── studio/                # Eval Studio (port 3001, deferred)
├── packages/
│   ├── module-access/         # Core modules
│   ├── module-ai/
│   ├── module-ws/
│   ├── module-mgmt/
│   ├── module-kb/
│   ├── module-chat/
│   ├── api-client/            # Shared packages
│   ├── shared-types/
│   ├── contracts/
│   └── shared/
├── org-common/                # Python layer for Lambdas
├── envs/                      # Terraform environments (from infra)
│   └── dev/
│       ├── main.tf            # Updated module paths
│       ├── variables.tf
│       ├── backend.tf
│       └── providers.tf
├── lambdas/                   # Lambda source (from infra)
│   └── api-gateway-authorizer/
├── modules/                   # Terraform modules (from infra)
│   ├── modular-api-gateway/
│   ├── app-runner/            # NEW
│   └── secrets/
├── scripts/                   # Merged scripts from both repos
│   ├── build-cora-modules.sh
│   ├── deploy-terraform.sh
│   ├── deploy-lambda.sh
│   ├── start-dev.sh
│   └── start-studio.sh
├── bootstrap/                 # From infra
│   └── bootstrap_tf_state.sh
├── Dockerfile                 # NEW - Multi-stage Next.js build
├── .dockerignore              # NEW
├── pnpm-workspace.yaml
└── package.json
```

### Terraform Module Path Changes

**Before (two-repo):**
```hcl
module "module_access" {
  source = "../../../{project}-stack/packages/module-access/infrastructure"
}
```

**After (mono-repo):**
```hcl
module "module_access" {
  source = "../../packages/module-access/infrastructure"
}
```

### App Runner Architecture

```
GitHub Actions
    │
    ├─> Build Docker Image (pnpm monorepo + Next.js standalone)
    │
    ├─> Push to ECR
    │
    └─> Deploy to App Runner
            │
            ├─> Health Check: GET /api/health
            ├─> Environment Variables: NEXT_PUBLIC_API_URL, OKTA_*, SUPABASE_*
            └─> Connects to API Gateway (CORS configured)
```

---

## Implementation Phases

### Phase 1: Mono-Repo Template Structure (1 day)

**Objective:** Create `_project-monorepo-template/` by merging infra + stack templates

**Tasks:**
1. ✅ Create `templates/_project-monorepo-template/` directory
2. ✅ Copy `_project-stack-template/` as base (apps/, packages/, org-common/, pnpm-workspace.yaml)
3. ✅ Copy from `_project-infra-template/`:
   - `envs/` → `envs/`
   - `lambdas/` → `lambdas/`
   - `modules/` → `modules/`
   - `bootstrap/` → `bootstrap/`
   - `scripts/` → merge with existing `scripts/`
4. ✅ Update `envs/dev/main.tf`:
   - Change module source paths: `../../../{project}-stack/packages/` → `../../packages/`
   - Remove `github-oidc-role` module block
5. ⏸️ Create `.github/workflows/` with placeholders for two workflows
6. ⏸️ Add `.dockerignore` and placeholder `Dockerfile`
7. ⏸️ Create `scripts/create-cora-monorepo.sh` (copy from `create-cora-project.sh`, modify for single-repo output)

**Progress:** 4/7 tasks complete (57%)

**Acceptance Criteria:**
- [x] Template directory exists with merged structure (152 files, 26,604 lines)
- [x] Terraform module paths updated to local references
- [ ] create-cora-monorepo.sh generates a valid mono-repo project
- [ ] Generated project passes basic directory structure validation

**Commit:** `81dbfc4` - "feat(templates): create mono-repo template foundation (Phase 1)"

---

### Phase 2: Build Readiness (2-3 days)

**Objective:** Ensure `pnpm run build` succeeds from `apps/web`

**Tasks:**

**2.1 Validate Current Build State (Critical First Step)**
1. Generate test project using `create-cora-monorepo.sh`
2. Run `pnpm install` in generated project
3. Run `pnpm run build` from `apps/web` and capture errors
4. Assess error count and severity → **This determines Phase 2 timeline**

**2.2 Fix TypeScript Errors**
1. Address any compilation errors in `apps/web/`
2. Address any errors in workspace dependencies (`@project/module-*` packages)
3. Ensure all transpilePackages in `next.config.mjs` build cleanly
4. Run `pnpm run lint` and resolve blocking issues

**2.3 Remove Clerk References**
Files to clean:
- `packages/api-client/src/auth/adapters/clerk-adapter.ts` — DELETE
- `packages/api-client/src/auth/types.ts` — Remove Clerk types
- `packages/api-client/src/index.ts` — Remove Clerk exports
- `apps/web/types/clerk.d.ts` — DELETE
- `apps/web/lib/__tests__/api-organizations.test.ts` — Remove Clerk mocks
- Search for `clerk` npm packages and remove from all `package.json` files

Keep: The auth adapter interface pattern (for future provider extensibility)

**2.4 Create Dockerfile**
```dockerfile
# Multi-stage build for Next.js standalone + pnpm monorepo
# Based on: https://github.com/vercel/next.js/tree/canary/examples/with-docker

FROM node:18-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile --filter=web...

# Stage 2: Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm --filter=web build

# Stage 3: Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "apps/web/server.js"]
```

**2.5 Update Next.js Config**
```javascript
// apps/web/next.config.mjs
const nextConfig = {
  output: 'standalone',  // ADD THIS
  transpilePackages: [
    "@{{PROJECT_NAME}}/api-client",
    "@{{PROJECT_NAME}}/module-access",
    "@{{PROJECT_NAME}}/module-ai",
    "@{{PROJECT_NAME}}/module-mgmt",
    "@{{PROJECT_NAME}}/module-ws",
  ],
  reactStrictMode: true,
  experimental: { typedRoutes: false },
};
export default nextConfig;
```

**2.6 Create .dockerignore**
```
node_modules
.next
.git
.env*.local
*.log
.DS_Store
coverage
.vscode
.idea
```

**Acceptance Criteria:**
- [ ] `pnpm run build` succeeds from `apps/web`
- [ ] All Clerk references removed
- [ ] Dockerfile builds successfully: `docker build -t test-web .`
- [ ] Container runs locally: `docker run -p 3000:3000 test-web`

---

### Phase 3: App Runner Infrastructure (1 day)

**Objective:** Create Terraform module for App Runner + ECR

**3.1 Create App Runner Terraform Module**

Create `modules/app-runner/main.tf`:
```hcl
# App Runner Service for Next.js App
# Provisions ECR repository, App Runner service, IAM roles, and auto-scaling

resource "aws_ecr_repository" "app" {
  name                 = "${var.name_prefix}-${var.environment}-${var.app_name}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.common_tags
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus     = "any"
        countType     = "imageCountMoreThan"
        countNumber   = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# IAM role for App Runner to pull from ECR
resource "aws_iam_role" "apprunner_ecr_access" {
  name = "${var.name_prefix}-${var.environment}-apprunner-ecr"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "build.apprunner.amazonaws.com"
      }
    }]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_access" {
  role       = aws_iam_role.apprunner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# App Runner service
resource "aws_apprunner_service" "app" {
  service_name = "${var.name_prefix}-${var.environment}-${var.app_name}"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.app.repository_url}:latest"
      image_repository_type = "ECR"
      
      image_configuration {
        port = var.port
        
        runtime_environment_variables = var.environment_variables
      }
    }

    auto_deployments_enabled = var.auto_deploy
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = var.health_check_path
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  instance_configuration {
    cpu    = var.cpu
    memory = var.memory
  }

  tags = var.common_tags
}
```

Create `modules/app-runner/variables.tf`, `outputs.tf`, `versions.tf`

**3.2 Add App Runner to envs/dev/main.tf**

```hcl
module "app_runner_web" {
  source = "../../modules/app-runner"

  name_prefix = "{{PROJECT_NAME}}"
  environment = "dev"
  app_name    = "web"
  
  port               = 3000
  health_check_path  = "/api/health"
  cpu                = "1024"  # 1 vCPU
  memory             = "2048"  # 2 GB
  auto_deploy        = true

  environment_variables = {
    NODE_ENV               = "production"
    NEXT_PUBLIC_API_URL    = module.modular_api_gateway.api_gateway_url
    NEXTAUTH_URL           = "https://${var.app_domain}"
    NEXTAUTH_SECRET        = var.nextauth_secret
    OKTA_ISSUER            = var.okta_issuer
    OKTA_CLIENT_ID         = var.okta_client_id
    OKTA_CLIENT_SECRET     = var.okta_client_secret
    SUPABASE_URL           = var.supabase_url
    SUPABASE_ANON_KEY      = var.supabase_anon_key_value
  }

  common_tags = {
    Environment = "dev"
    Project     = "{{PROJECT_NAME}}"
    ManagedBy   = "terraform"
    App         = "web"
  }
}
```

**3.3 Update CORS Headers**

Update `modules/modular-api-gateway/main.tf`:
```hcl
cors_configuration {
  allow_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
  allow_origins = var.allowed_origins  # Set via tfvars
  allow_headers = [
    "Authorization",
    "Content-Type",
    "X-Requested-With",
    "Accept",
    "Origin"
  ]
  max_age = 300
}
```

Update `envs/dev/local-secrets.tfvars.example`:
```hcl
allowed_origins = ["https://{{PROJECT_NAME}}-dev-web.us-east-1.awsapprunner.com"]
```

**Acceptance Criteria:**
- [ ] App Runner module created with all resources
- [ ] Module integrated into `envs/dev/main.tf`
- [ ] CORS headers explicitly configured
- [ ] `terraform plan` succeeds with no errors

---

### Phase 4: CI/CD Workflows (1 day)

**Objective:** Create GitHub Actions workflows for infra and app deployments

**4.1 Create deploy-infra.yml**

Adapt existing `templates/_project-infra-template/.github/workflows/deploy.yml`:
- Keep Terraform plan/apply logic
- Update working directory paths (envs/ now at repo root)
- Use central STS hub-and-spoke OIDC role (from secrets)

**4.2 Create deploy-app.yml**

```yaml
name: Deploy App to App Runner

on:
  push:
    branches: [main]
    paths:
      - 'apps/**'
      - 'packages/**'
      - 'Dockerfile'
      - '.dockerignore'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'dev'
        type: choice
        options: [dev, stg, prd]

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: {{AWS_REGION}}
  ECR_REPOSITORY: {{PROJECT_NAME}}-dev-web

jobs:
  build-and-deploy:
    name: Build and Deploy Web App
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment || 'dev' }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and Push Docker Image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Deploy to App Runner
        run: |
          aws apprunner start-deployment \
            --service-arn $(aws apprunner list-services \
              --query "ServiceSummaryList[?ServiceName=='{{PROJECT_NAME}}-dev-web'].ServiceArn" \
              --output text)
```

**Acceptance Criteria:**
- [ ] Both workflows created in `_project-monorepo-template/.github/workflows/`
- [ ] Workflows use placeholders ({{PROJECT_NAME}}, {{AWS_REGION}})
- [ ] create-cora-monorepo.sh replaces placeholders correctly

---

### Phase 5: Validation & Documentation (0.5 day)

**Objective:** Test end-to-end and document the new pattern

**5.1 End-to-End Test**
1. Generate fresh project: `./scripts/create-cora-monorepo.sh test-monorepo setup.config.test.yaml`
2. Build locally: `cd test-monorepo && pnpm install && pnpm --filter=web build`
3. Build Docker: `docker build -t test-web .`
4. Run container: `docker run -p 3000:3000 --env-file .env.local test-web`
5. Test health: `curl http://localhost:3000/api/health`
6. Bootstrap Terraform: `cd envs/dev && ../../bootstrap/bootstrap_tf_state.sh`
7. Deploy infra: `terraform plan && terraform apply`
8. Verify App Runner: Check AWS console for running service

**5.2 Update Documentation**
- Add section to `.clinerules` for mono-repo pattern
- Create `docs/arch decisions/ADR-022-MONOREPO-PATTERN.md`
- Update `memory-bank/activeContext.md` with new initiative
- Create `templates/_project-monorepo-template/README.md` with setup instructions

**5.3 Update Toolkit Scripts**
- Add mono-repo detection to `scripts/check-cora-compliance.py`
- Update `scripts/sync-fix-to-project.sh` to handle mono-repo paths

**Acceptance Criteria:**
- [ ] Complete end-to-end deployment succeeds
- [ ] Web app accessible at App Runner URL
- [ ] API Gateway calls work (CORS validated)
- [ ] ADR written and reviewed
- [ ] All documentation updated

---

## Timeline & Difficulty Assessment

### Effort Breakdown

| Phase | Tasks | Optimistic | Realistic | Pessimistic |
|-------|-------|-----------|-----------|-------------|
| **Phase 1: Template Structure** | File reorganization, path updates, create script | 0.5 day | 1 day | 1.5 days |
| **Phase 2: Build Readiness** | Fix TypeScript errors, Dockerfile, Clerk cleanup | 1 day | 2-3 days | 5 days |
| **Phase 3: App Runner TF** | Create module, integrate, CORS config | 0.5 day | 1 day | 2 days |
| **Phase 4: CI/CD** | Two workflows, OIDC integration | 0.5 day | 1 day | 2 days |
| **Phase 5: Validation** | Testing, ADR, docs | 0.5 day | 0.5 day | 1 day |
| **Total** | | **3 days** | **5-6 days** | **11 days** |

### Critical Path

**The critical path is Phase 2: Build Readiness**, specifically getting `pnpm run build` to succeed.

**Risk Factors:**
- **Low Risk (1 day):** If templates already build cleanly (TypeScript errors resolved in S8)
- **Medium Risk (2-3 days):** Minor type errors in module frontends
- **High Risk (5 days):** Cascading errors across workspace dependencies

**Mitigation:** Test build immediately after Phase 1 to assess real timeline.

### Difficulty Ratings

| Area | Difficulty | Justification |
|------|-----------|---------------|
| Template merging | 🟢 Low | Mechanical file operations |
| Build fixing | 🔴 High | Unknown error count; transitive workspace compilation |
| Dockerfile | 🟡 Medium | Well-established pattern but pnpm-specific gotchas |
| App Runner TF | 🟡 Medium | Standard AWS pattern; first-time setup has edge cases |
| CI/CD workflows | 🟡 Medium | Adapting existing + understanding STS OIDC setup |
| Documentation | 🟢 Low | Standard writing work |

---

## Success Criteria

### Must-Have (MVP)

- [ ] `_project-monorepo-template/` exists and is complete
- [ ] `create-cora-monorepo.sh` generates a valid mono-repo project
- [ ] `pnpm run build` succeeds in generated project
- [ ] Docker build succeeds and container runs locally
- [ ] App Runner service deploys successfully via Terraform
- [ ] Web app accessible at App Runner URL
- [ ] API Gateway integration works (CORS validated)
- [ ] GitHub Actions workflows deploy successfully
- [ ] Legacy templates and scripts untouched (zero impact)
- [ ] ADR-022 written and approved

### Nice-to-Have (Future)

- [ ] Studio app deployed to second App Runner service
- [ ] Custom domain configured (Route53 + ACM)
- [ ] CloudWatch dashboards for App Runner metrics
- [ ] Load testing and auto-scaling validation
- [ ] Migrate pm-app to mono-repo pattern

---

## Hybrid Development Workflow

To ensure the toolkit remains the source of truth while enabling rapid iteration:

### Process

1. **Template First:** Build `_project-monorepo-template/` skeleton in toolkit
2. **Generate Real Project:** Create `ai-mod-stack` using create-cora-monorepo.sh
3. **Iterate in Real Project:** DevOps engineer works in `ai-mod-stack` to get build/Docker/App Runner working
4. **Sync Back to Template:** When something works in `ai-mod-stack`, copy fix to template
5. **Validate Template:** Regenerate from template periodically to ensure template produces working project

### Sync Strategy

Similar to `fix-and-sync.sh` workflow but in reverse (project→template):

```bash
# When you fix something in ai-mod-stack:
./toolkit/scripts/sync-project-to-template.sh \
  ~/path/to/ai-mod-stack \
  "Dockerfile" \
  --template-type=monorepo
```

This ensures:
- Toolkit template stays authoritative
- Real project validates the pattern
- No drift between template and reality
- Fast iteration without template lock-in

---

## Rollback Plan

If mono-repo pattern fails validation or introduces unforeseen issues:

### Quick Rollback (< 30 minutes)

1. `git checkout main` (discard working branch)
2. Delete `_project-monorepo-template/` directory
3. Delete `scripts/create-cora-monorepo.sh`
4. Revert `.clinerules` and memory-bank updates
5. **Result:** Toolkit returns to exact pre-project state

### Partial Rollback (Keep learning)

1. Keep template and scripts but mark as experimental
2. Document lessons learned in ADR-022
3. Continue using legacy two-repo pattern for production
4. Revisit mono-repo after identifying and fixing root cause

---

## Next Steps

1. **Review this plan** — Confirm all decisions and approach
2. **Toggle to Act Mode** — Begin Phase 1 implementation
3. **Generate test project** — Immediately test `pnpm run build` to validate timeline
4. **Communicate with DevOps engineer** — Share plan and hybrid workflow approach
5. **Create tracking issue** — Use this plan as source of truth for progress updates

---

---

## Progress Log

### February 9, 2026 (20:28 EST) - Phase 1 Foundation Complete

**Completed:**
- ✅ Created `_project-monorepo-template/` with merged structure (152 files)
- ✅ Updated `envs/dev/main.tf` module paths for mono-repo
- ✅ Removed github-oidc-role module (using STS central OIDC)
- ✅ Root config files in place (.gitignore, README.md, package.json, etc.)

**Remaining Phase 1 Tasks:**
- ⏸️ Dockerfile + .dockerignore
- ⏸️ CI/CD workflow placeholders
- ⏸️ create-cora-monorepo.sh script

**Next:** Complete remaining Phase 1 tasks, then proceed to Phase 2 (Build Readiness)

---

**Plan Author:** AI Agent (Cline)  
**Reviewed By:** [Pending]  
**Approved By:** [Pending]  
**Implementation Start:** February 9, 2026
