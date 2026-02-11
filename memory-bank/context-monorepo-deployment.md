# Context: Mono-Repo Deployment & App Runner

**Initiative:** Consolidate two-repo pattern to mono-repo + deploy to AWS App Runner  
**Status:** Phase 3 - 🟡 IN PROGRESS (Systematic Testing Required)  
**Priority:** P0 🔴 Critical (Deployment Failing - Root Cause Analysis Needed)  
**Created:** February 9, 2026  
**Last Updated:** February 11, 2026 (10:53 EST)

---

## Quick Links

- **Master Plan:** `docs/plans/plan_monorepo-master-plan.md`
- **Current Sprint:** `monorepo-s3` (Phase 3 - Scientific Testing)
- **Experiment Plan:** `~/code/bodhix/testing/apprunner-experiments/README.md` ✅ Complete
- **Template:** `templates/_project-monorepo-template/` ✅ Complete
- **Script:** `scripts/create-cora-monorepo.sh` ✅ Fully Functional

---

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-----------|
| S1 | `monorepo-s1` | `completed/plan_monorepo-s1-summary.md` | ✅ Complete | 2026-02-10 |
| S2 | `monorepo-s2` | `plan_monorepo-master-plan.md` (Phase 3) | ⚠️ Partial | 2026-02-10 |
| S3 | `monorepo-s3` | `plan_monorepo-s3.md` | 🟡 Active | - |

---

## Current Sprint

**Sprint:** S3 (Phase 3: Scientific Testing & Root Cause Analysis)  
**Branch:** `monorepo-s3`  
**Plan:** `docs/plans/plan_monorepo-s3.md`  
**Focus:** Systematic parallel testing to identify minimum required App Runner configuration  
**Status:** 🟡 Active - Experiment plan complete, ready to implement

**Sprint 2 Status:** Closed as "Partial Complete"
- ✅ Infrastructure code complete (App Runner module, CORS, health check fixes)
- ✅ Docker image builds and pushes to ECR
- ❌ App Runner deployment fails (times out after 20 minutes)
- 🔬 Root cause analysis needed - systematic testing required

---

## Executive Summary

**🔬 SCIENTIFIC TESTING PLAN CREATED!** 12-experiment matrix designed to isolate deployment failure root cause.

**Current Status:**
- App Runner deployments timing out after 20 minutes (never reach RUNNING state)
- Health check configuration appears correct but something is wrong
- Identified 10 key differences between working vs failing deployments
- Created comprehensive parallel testing plan to test each variable in isolation

**Sprint 3 Progress (Feb 11, 2026):**
- ✅ Compared working services (ai-ccat, sts-ai-doc-gui) vs failing (ai-mod-dev-web)
- ✅ Identified 10 critical differences (auth secrets, Node version, Dockerfile structure)
- ✅ Designed 12-experiment matrix for parallel testing
- ✅ Created isolated experiment directory (`~/code/bodhix/testing/apprunner-experiments/`)
- ✅ Documented comprehensive testing plan
- ✅ Built experiment infrastructure (Dockerfiles, Terraform, scripts)
- ✅ Deployed Round 1 (12 experiments) - ALL FAILED
- ✅ Deployed Round 2 (3 experiments with HOSTNAME fix) - ALL FAILED ❌
- ⚠️ **HYPOTHESIS DISPROVEN** - HOSTNAME alone is not sufficient
- 🔴 **PIVOT REQUIRED** - Local Docker testing needed to identify real issue

**Timeline:** Day 3 of 5-6 day estimate (BLOCKED - Need local debugging)

---

## Phase Progress

### Phase 1: Template Structure ✅ COMPLETE
- Created `_project-monorepo-template/` (165 files, 27,900+ lines)
- Merged infra + stack into single template
- Updated all module paths for monorepo structure
- Created Dockerfile and CI/CD workflow placeholders
- Created `create-cora-monorepo.sh` script

### Phase 2A: Automation Porting ✅ COMPLETE
- Ported all automation from `create-cora-project.sh`
- Database schema consolidation (50+ SQL files)
- Environment generation (.env, tfvars)
- Validation setup (Python venv)
- Full feature parity achieved

### Phase 2B: Build Readiness ✅ COMPLETE
**10 Critical Issues Resolved** - See earlier sections

### Phase 3: App Runner Infrastructure 🟡 IN PROGRESS

**Sessions 8-11 Summary:** Infrastructure complete, but deployments failing
- ✅ App Runner Terraform module created
- ✅ Health check route created (`/api/healthcheck`)
- ✅ Middleware updated to exclude health check from auth
- ✅ HOSTNAME environment variable added (`0.0.0.0`)
- ❌ Deployments still timing out (20+ minutes, never reach RUNNING)

**Session 12 - Scientific Testing Plan (Feb 11, 08:00-08:14)**

**🔬 BREAKTHROUGH: Comprehensive root cause analysis completed!**

#### Analysis Methodology
Compared **working** App Runner services (ai-ccat, sts-ai-doc-gui) against **failing** service (ai-mod-dev-web) by querying actual AWS configurations:

```bash
# Retrieved configurations for all 3 services
aws apprunner describe-service --service-arn [arn] 

# Working services: RUNNING status
# Failing service: CREATE_FAILED status
```

#### Critical Findings: 10 Key Differences

**Configuration Differences (8):**

| # | Variable | Working Services | Failing Service | Impact |
|---|----------|------------------|-----------------|--------|
| 1 | NEXTAUTH_SECRET | ✅ Set | ❌ Missing | 🚨 Critical |
| 2 | NEXTAUTH_URL | Real App Runner URL | `https://localhost:3000` | 🚨 Critical |
| 3 | OKTA_CLIENT_ID | Real client ID | `api://default` | 🚨 Critical |
| 4 | OKTA_CLIENT_SECRET | ✅ Set | ❌ Missing | 🚨 Critical |
| 5 | InstanceRoleArn | ✅ Task role | ❌ Missing | ⚠️ May affect SSM |
| 6 | AutoScaling | Custom config | DefaultConfiguration | ⚠️ Minor |
| 7 | Health Interval | 5 seconds | 10 seconds | ⚠️ Minor |
| 8 | Health Timeout | 2 seconds | 5 seconds | ⚠️ Minor |

**Dockerfile Differences (2):**

| # | Feature | ai-ccat (Working) | Monorepo Template | Impact |
|---|---------|-------------------|-------------------|--------|
| 9 | Node.js Version | 22-alpine | 18-alpine | 🔍 Unknown |
| 10 | libc6-compat | ✅ Installed | ❌ Missing | 🔍 Unknown |

**Key Insight:** The failing deployment had correct AUTH_TRUST_HOST and HOSTNAME (we verified), but was missing **all auth secrets** (NEXTAUTH_SECRET, OKTA secrets).

#### 12-Experiment Testing Matrix

**Experiments 0-7: Configuration Variables** (Same Docker image)
- EXP-0: Baseline (control - current failing config)
- EXP-1: + NEXTAUTH_SECRET only
- EXP-2: + Fix NEXTAUTH_URL only  
- EXP-3: + Real OKTA_CLIENT_ID only
- EXP-4: + OKTA_CLIENT_SECRET only
- EXP-5: + InstanceRoleArn only
- EXP-6: + ALL auth secrets together
- EXP-7: + ALL ai-ccat Terraform settings

**Experiments 8-11: Dockerfile Variations** (Different Docker images)
- EXP-8: Node.js 22 + all auth
- EXP-9: + libc6-compat + all auth
- EXP-10: + Build ARGs + all auth
- EXP-11: Full ai-ccat Dockerfile + all auth

**Why 12 Experiments?**
- Tests each variable in **isolation** (EXP 1-5, 8-10)
- Tests combined effects (EXP 6-7, 11)
- Baseline control (EXP 0)
- Runs in **parallel** (all 12 simultaneously)
- Minimizes 20-minute wait cycles

**Expected Outcomes:**
- If EXP-1 succeeds → NEXTAUTH_SECRET is the only missing piece
- If EXP-6 succeeds → All auth secrets are required together
- If EXP-11 succeeds → Full Dockerfile changes needed
- If multiple succeed → Document minimum required set
- If none succeed → Issue in application code, debug locally

#### Implementation Artifacts Created

**Directory Structure:**
```
~/code/bodhix/testing/apprunner-experiments/
├── README.md         ✅ Comprehensive experiment documentation
├── terraform/        📁 Will contain 12 App Runner experiments
├── images/           📁 Will contain 5 Dockerfile variants
└── scripts/          📁 Will contain build/deploy/monitor scripts
```

**README.md Contents:**
- Problem statement and analysis summary
- 10 identified differences (detailed table)
- 12-experiment matrix (detailed specifications)
- Implementation plan (6 phases)
- Expected outcomes interpretation guide
- Values to use (from .env.local)
- AWS resource details
- Cost estimate (~$0.03 for all 12 experiments)

**Status:** Ready for implementation

---

## Strategic Decisions (Resolved)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Template Strategy | New `_project-monorepo-template/` alongside existing | Zero risk to existing projects ✅ |
| App Runner Deployment | Web-first (studio deferred) | Validate pattern with main app first ✅ |
| Container Build | Root Dockerfile using `pnpm deploy --filter=web --prod` | Industry standard for pnpm monorepos ✅ |
| CI/CD Architecture | Separate workflows (infra + app) | Different triggers, tooling, failure modes ✅ |
| CORS Strategy | Wildcard in dev, explicit origins in prod | Simple for dev, secure for production ✅ |
| Clerk Cleanup | Remove Clerk adapter, keep interface pattern | Clean codebase, preserve extensibility ✅ |
| **Deployment Testing** | **12 parallel experiments** | **Isolate root cause scientifically** ✅ |

---

## Session History

[Previous sessions 1-11 remain as documented...]

### Session 12 - Scientific Testing Plan (Feb 11, 08:00-08:14)

**Major Accomplishments:**
1. ✅ **Comprehensive Configuration Analysis**
   - Retrieved and compared AWS configurations for 3 services
   - Identified 10 critical differences
   - Categorized by impact (P0, P1, P2)

2. ✅ **Scientific Experiment Design**
   - Designed 12-experiment matrix
   - Isolated variables for testing
   - Planned parallel execution strategy

3. ✅ **Experiment Infrastructure**
   - Created isolated directory structure
   - Documented comprehensive testing plan
   - Ready for implementation

**Key Insights:**
- Missing auth secrets (NEXTAUTH_SECRET, OKTA secrets) are most likely cause
- Node.js version difference (18 vs 22) may also contribute
- Systematic testing is required - too many variables to guess

**Deliverables:**
- `~/code/bodhix/testing/apprunner-experiments/README.md` - Complete testing plan
- Directory structure for experiments, Dockerfiles, Terraform, scripts
- Cost estimate and timeline

### Session 13 - Experiment Infrastructure Implementation (Feb 11, 08:20-08:33)

**Major Accomplishments:**
1. ✅ **Documentation Fixes**
   - Corrected source project path (admin-s8 → mono-s1) in README.md
   - Verified no incorrect references in context or plan files

2. ✅ **5 Dockerfile Variants Created**
   - `Dockerfile.baseline` - Current Node 18 template
   - `Dockerfile.node22` - Node 22 upgrade
   - `Dockerfile.libc` - Node 18 + libc6-compat
   - `Dockerfile.buildargs` - Node 18 + build arguments
   - `Dockerfile.fullmatch` - Full ai-ccat match (Node 22 + libc + args)

3. ✅ **Complete Terraform Configuration**
   - `providers.tf` - AWS provider setup
   - `variables.tf` - Input variables with sensitive flags
   - `main.tf` - 12 App Runner services + 5 ECR repos + IAM roles
   - `outputs.tf` - Experiment URLs and ARNs
   - `terraform.tfvars` - Variable values with actual secrets

4. ✅ **Complete Script Suite**
   - `build-all-images.sh` - Build 5 Docker images from source project
   - `push-images.sh` - ECR login and push all images
   - `check-results.sh` - Monitor experiment status with summary
   - `analyze-results.sh` - Generate results report with interpretation
   - `cleanup.sh` - Terraform destroy with confirmation
   - All scripts made executable

**Key Technical Details:**
- EXP 0-7: Same baseline Docker image, different environment variables
- EXP 8-11: Different Docker images with all auth secrets
- Each experiment tests a specific hypothesis in isolation
- Parallel execution minimizes 20-minute wait cycles

**Deliverables:**
- 5 Dockerfile variants (ready for building)
- Complete Terraform for 12 experiments (ready for deployment)
- 5 executable scripts for full lifecycle
- Total: 15 new files created

**Status:** Phase 2 COMPLETE - Infrastructure ready for execution

**Next Steps (COMPLETED):**
1. ✅ Built Docker images
2. ✅ Pushed images to ECR
3. ✅ Deployed Round 1 (12 experiments) - ALL FAILED
4. ✅ Deployed Round 2 (3 experiments with HOSTNAME fix) - ALL FAILED
5. ✅ Analyzed results - HOSTNAME hypothesis was incorrect

**NEW Priority - Local Testing Required:**
1. 🔴 Test Docker image locally to see actual startup behavior
2. 🔴 Identify why application won't start or health checks fail
3. 🔴 Fix root cause in application or configuration
4. Then deploy final test to App Runner with correct fix

---

## Risk Mitigation

### Zero-Impact Guarantee

| Legacy Asset | Impact | Protection |
|--------------|--------|------------|
| `_project-infra-template/` | ❌ Not touched | Separate directory ✅ |
| `_project-stack-template/` | ❌ Not touched | Separate directory ✅ |
| `create-cora-project.sh` | ❌ Not touched | Separate script ✅ |
| pm-app repos | ❌ Not affected | Different pattern ✅ |

### Rollback Strategy

If mono-repo pattern fails:
1. Delete `_project-monorepo-template/` directory
2. Delete `create-cora-monorepo.sh` script
3. Revert `.clinerules` and memory-bank updates
4. **Result:** Toolkit returns to exact pre-project state

---

## Success Metrics

### Sprint 1 Success ✅ COMPLETE
- [x] Phase 1: Template structure (165 files created)
- [x] Phase 2A: Automation porting (feature parity achieved)
- [x] Phase 2B: Build readiness (10 issues resolved)
- [x] ALL 9 CORA modules build successfully
- [x] Web app builds successfully (29 pages)
- [x] Docker image builds successfully (260MB)
- [x] Comprehensive documentation (ADR + 2 standards)
- [x] Zero impact on legacy templates

### Sprint 2 Goals (Phase 3) - ⚠️ PARTIAL COMPLETE
- [x] App Runner Terraform module created
- [x] ECR repository configured
- [x] CORS headers configured
- [x] All deployment blockers resolved
- [x] Infrastructure deployment initiated
- [x] Docker image built and pushed
- [ ] App Runner service running (timing out)
- [ ] End-to-end deployment validated

### Sprint 3 Goals (Phase 3 Completion) - ⚠️ BLOCKED
- [x] Root cause analysis methodology designed
- [x] Working vs failing configurations compared
- [x] 10 key differences identified
- [x] 12-experiment testing matrix created (Round 1: 12 experiments)
- [x] Experiment infrastructure prepared
- [x] Comprehensive documentation complete
- [x] 5 Dockerfile variants created
- [x] Terraform for 15 experiments created (12 Round 1 + 3 Round 2)
- [x] Build and deployment scripts created
- [x] Round 1 deployed (12 experiments) - ALL FAILED
- [x] Round 2 deployed (3 experiments with HOSTNAME) - ALL FAILED
- [x] Results analyzed - **HYPOTHESIS DISPROVEN**
- [ ] ⚠️ **BLOCKED:** Local Docker testing required
- [ ] Identify actual root cause (not HOSTNAME)
- [ ] Templates updated with working solution

### Overall Initiative Success (Pending)
- [ ] Web app accessible at App Runner URL
- [ ] API Gateway integration works (CORS validated)
- [ ] GitHub Actions workflows deploy successfully
- [ ] ADR-024 written and approved
- [x] Zero impact on legacy templates ✅

---

## Key Learnings

### Sprint 1 Learnings
1. **Monorepo Type Resolution:** TypeScript module augmentation doesn't automatically propagate across workspace packages; Next.js apps must explicitly include workspace package type definitions in `tsconfig.json`.

2. **pnpm Workspace Dependencies:** Even within the same monorepo, pnpm requires explicit dependency declarations in `package.json`.

3. **Docker Memory Management:** Large Next.js monorepo builds require at least 4GB heap space (default 1.4GB is insufficient).

4. **pnpm Filter Syntax:** Docker build commands must use project-specific package names in filters (e.g., `ai-mod-web`), not generic names (e.g., `web`).

5. **Next.js Public Directory:** Docker COPY commands fail if source paths don't exist; empty directories require `.gitkeep` for git tracking.

### Sprint 2 Learnings (Sessions 8-11)
6. **AWS Credential Export Critical:** Terraform requires `AWS_PROFILE` and `AWS_REGION` environment variables set; AWS CLI working with `--profile` flag is not sufficient.

7. **Template Sync Discipline:** Always sync updated template files to test project, not just specific changes; missing files (like updated variables.tf) cause deployment failures.

8. **Iterative Deployment Debugging:** Deploy blockers often come in sequence; resolve each one systematically before discovering the next.

9. **Health Check Endpoint Critical:** Always create health endpoints BEFORE deploying containerized applications to orchestration platforms.

10. **Middleware Auth Exclusion:** Health check endpoints must be explicitly excluded from authentication middleware, or health checks will fail with 307 redirects.

11. **HOSTNAME Binding Essential:** Docker containers must bind to `0.0.0.0` (not localhost) to be reachable from external health check probes.

### Sprint 3 Learnings (Session 12)
12. **Scientific Testing Approach:** When multiple variables could cause failure, systematic parallel testing is more efficient than trial-and-error debugging.

13. **AWS Configuration Comparison:** Use `aws apprunner describe-service` to compare working vs failing services for root cause analysis.

14. **Missing Auth Secrets Impact:** NextAuth.js applications will crash on startup if NEXTAUTH_SECRET is missing, causing health check failures that look like infrastructure issues.

15. **Placeholder Values Are Not Enough:** Using placeholder values like `api://default` for OKTA_CLIENT_ID is worse than omitting the variable - the app tries to use invalid credentials and fails.

---

## Next Session Priorities

**🔬 PRIORITY 1: Implement Experiment Infrastructure (2-3 hours)**

1. **Create 5 Dockerfile Variants** (`images/`)
   - `Dockerfile.baseline` - Current monorepo template (Node 18)
   - `Dockerfile.node22` - Node 22 + current structure
   - `Dockerfile.libc` - Node 18 + libc6-compat
   - `Dockerfile.buildargs` - Node 18 + build arguments
   - `Dockerfile.fullmatch` - Full copy of ai-ccat Dockerfile

2. **Create Terraform Configuration** (`terraform/`)
   - `main.tf` - 12 App Runner service definitions
   - `variables.tf` - Experiment parameters
   - `outputs.tf` - Service URLs and ARNs
   - ECR repository configurations

3. **Create Build/Deploy Scripts** (`scripts/`)
   - `build-all-images.sh` - Build 5 Docker images from test project
   - `push-images.sh` - Push all images to ECR
   - `check-results.sh` - Monitor experiment status
   - `analyze-results.sh` - Identify successful experiments
   - `cleanup.sh` - Destroy all experiments

**🚀 PRIORITY 2: Execute Experiments (1 hour)**

1. Copy source code from test project for Docker builds
2. Build all 5 Docker images
3. Push all images to ECR
4. Deploy all 12 experiments via Terraform
5. Run monitoring script

**📊 PRIORITY 3: Analyze Results (~20 min wait + 30 min analysis)**

1. Monitor experiment status every 2 minutes
2. Identify which experiments reach RUNNING status
3. Document successful configurations
4. Determine minimum required settings
5. Create results summary

**📝 PRIORITY 4: Update Templates (1 hour)**

1. Apply winning configuration to monorepo template
2. Update App Runner module with required settings
3. Update Dockerfile if needed
4. Test updated template
5. Document final solution

**🧹 PRIORITY 5: Cleanup & Documentation (1 hour)**

1. Run cleanup script to destroy experiments
2. Update Sprint 3 plan with completion status
3. Update context file with findings
4. Archive experiment directory
5. Prepare for Phase 4 (CI/CD)

---

## Test Project Info

**Current Test Project:**
**Location:** `/Users/aaron/code/bodhix/testing/mono-s1/ai-mod-stack`  
**Config:** `setup.config.mono-s1.yaml`  
**Project Name:** `ai-mod`  
**Status:** Used for source code in Docker builds

**Experiment Location:**
**Directory:** `~/code/bodhix/testing/apprunner-experiments/`  
**Status:** Infrastructure ready, implementation pending
**Gitignored:** Yes (only final solution will be committed)

**AWS Configuration:**
**AWS Account:** 887559014095  
**AWS Profile:** `ai-sec-nonprod`  
**AWS Region:** `us-east-1`

---

## Notes

**Experiment Cost:**
- 12 App Runner services × 20 minutes × $0.007/hour = ~$0.03
- ECR storage: negligible
- **Total:** < $0.05

**Expected Timeline:**
- Build Dockerfiles & Terraform: 2-3 hours
- Build & push images: 30-45 minutes
- Deploy experiments: 5 minutes
- Monitor results: 20 minutes
- Analyze & document: 30 minutes
- **Total:** 4-5 hours for complete experiment cycle

**Why This Approach:**
- Systematic: Tests each variable in isolation
- Efficient: All experiments run in parallel (no waiting 20 min per test)
- Scientific: Clear interpretation of results
- Documented: Future developers understand requirements
- Low risk: Isolated from main codebase

---

### Session 14 - Round 2 Deployment & Failure Analysis (Feb 11, 09:47-10:53)

**Major Accomplishments:**
1. ✅ **Round 2 Experiments Deployed**
   - Added 3 new experiments (r2-1, r2-2, r2-3) with HOSTNAME=0.0.0.0
   - Preserved Round 1 experiments for audit trail
   - Updated Terraform outputs for all 15 experiments

2. ✅ **Round 2 Results Documented**
   - ALL 3 Round 2 experiments FAILED (20-minute timeout)
   - HOSTNAME hypothesis DISPROVEN
   - Created comprehensive failure analysis document

3. ✅ **Root Cause Analysis Updated**
   - Compared working service (ai-ccat-tmp) configuration
   - Confirmed HOSTNAME was present in Round 2 experiments
   - Identified need for local Docker testing

**Critical Finding:** Even with HOSTNAME=0.0.0.0, services still fail health checks identically to Round 1.

**Deliverables:**
- `ROUND-2-DEPLOYMENT-GUIDE.md` - Deployment instructions for Round 2
- `ROUND-2-RESULTS.md` - Comprehensive failure analysis
- Updated `main.tf` with 3 Round 2 experiments (15 total)
- Updated `outputs.tf` with Round 2 service URLs/ARNs

**Status:** Sprint BLOCKED - Local Docker testing required before proceeding

---

## Sprint 3 Learnings (Session 14)

16. **Hypothesis Testing is Critical:** Don't assume - test hypotheses systematically and be prepared for them to be wrong.

17. **HOSTNAME Hypothesis Disproven:** Even with HOSTNAME=0.0.0.0, all services failed health checks, proving HOSTNAME alone is not sufficient (or possibly not the issue at all).

18. **No Logs = Early Failure:** Services failed before application logging could start, suggesting image pull failure, container startup failure, or immediate application crash.

19. **Local Testing Required:** Cannot debug App Runner failures without being able to see actual application startup behavior locally.

20. **Cost of Wrong Hypothesis:** 15 experiments (12 Round 1 + 3 Round 2) = ~$0.035 spent testing incorrect hypothesis.

---

## Next Session Priorities (REVISED)

**🔴 CRITICAL: Local Docker Testing (MUST DO FIRST)**

1. **Test Docker Image Locally**
   ```bash
   # Pull image from ECR
   aws ecr get-login-password --region us-east-1 --profile ai-sec-nonprod | \
     docker login --username AWS --password-stdin 887559014095.dkr.ecr.us-east-1.amazonaws.com
   
   docker pull 887559014095.dkr.ecr.us-east-1.amazonaws.com/exp-baseline:latest
   
   # Run with same env vars as Round 2
   docker run -p 3000:3000 \
     -e HOSTNAME=0.0.0.0 \
     -e NODE_ENV=production \
     -e AUTH_TRUST_HOST=true \
     -e NEXTAUTH_SECRET="..." \
     -e NEXTAUTH_URL="http://localhost:3000" \
     -e OKTA_CLIENT_ID="..." \
     -e OKTA_CLIENT_SECRET="..." \
     -e OKTA_ISSUER="https://simpletech.okta.com/oauth2/default" \
     887559014095.dkr.ecr.us-east-1.amazonaws.com/exp-baseline:latest
   
   # Test health check
   curl http://localhost:3000/api/healthcheck
   ```

2. **Debug Application Startup**
   - If app crashes: Fix application code
   - If health check fails: Fix middleware or routing
   - If app works locally: Investigate App Runner-specific issue

3. **Only After Local Testing Works**
   - Deploy one final test to App Runner with correct fix
   - Update templates with working solution
   - Document requirements

---

**Last Updated:** February 11, 2026 (10:53 EST)  
**Next Update:** After local Docker testing identifies actual root cause
