# Plan: Monorepo Sprint 3 - Container Build Verification & Deployment Support

**Status:** ⚠️ BLOCKED - Local Testing Required  
**Branch:** `monorepo-s3`  
**Context:** `memory-bank/context-monorepo-deployment.md`  
**Created:** February 10, 2026  
**Last Updated:** February 11, 2026 (10:53 EST)  
**Sprint Focus:** Scientific parallel testing to identify minimum required App Runner configuration  
**Current Blocker:** HOSTNAME hypothesis disproven - local Docker testing needed

---

## Sprint 2 Summary

**Status:** ⚠️ Closed as "Partial Complete"

**Achievements:**
- ✅ App Runner Terraform module created (ECR + service + IAM)
- ✅ Health check fixes applied (HOSTNAME, /api/healthcheck route, middleware)
- ✅ CORS configuration updated
- ✅ All infrastructure code complete
- ✅ Docker image builds and pushes to ECR

**Blockers:**
- ❌ App Runner deployment stalled (health check timeout after 20 minutes)
- ⏸️ Deployment interrupted, status unknown

**Lessons Learned:**
- Health check configuration is critical (path, auth exclusion, HOSTNAME binding)
- Template placeholders must be replaced before building
- Local container testing is essential before cloud deployment
- **Multiple variables can cause failure - systematic testing required**

---

## Sprint 3 Strategy Shift

**Original Plan:** Verify container build with latest code, get deployment support

**Revised Plan:** Scientific parallel testing to isolate root cause

**Rationale:** After multiple failed deployments despite applying "obvious" fixes, we need a systematic approach to test each variable in isolation rather than trial-and-error debugging.

---

## Sprint 3 Goals

### Primary Goals
1. ✅ **Root Cause Analysis** - Compare working vs failing App Runner services (COMPLETE)
2. ✅ **Experiment Design** - Create 15-experiment testing matrix (COMPLETE)
3. ✅ **Implementation** - Build infrastructure for parallel testing (COMPLETE)
4. ✅ **Execution** - Deploy and monitor 15 experiments (Round 1: 12, Round 2: 3) (COMPLETE)
5. ⚠️ **Results Analysis** - **HYPOTHESIS DISPROVEN** - HOSTNAME not the root cause
6. 🔴 **BLOCKED** - Local Docker testing required to identify actual issue

### Secondary Goals
6. **Template Updates** - Apply working configuration to templates
7. **Plan Phase 4** - Prepare for CI/CD workflows

---

## Scope

### ✅ IN SCOPE
- ✅ Systematic comparison of working vs failing services
- ✅ Identification of all configuration differences
- ✅ Design of isolated experiment matrix
- 🔄 Implementation of experiment infrastructure
- Parallel deployment of 12 experiments
- Analysis of results to identify minimum requirements
- Update templates with working solution
- Archive Sprint 2 (tags created, plan moved to completed/)

### ❌ OUT OF SCOPE
- CI/CD workflow implementation (Phase 4)
- Custom domain configuration
- Load testing
- Migrating existing projects to monorepo pattern
- Ad-hoc trial-and-error debugging

---

## Implementation Steps

### Phase 1: Root Cause Analysis ✅ COMPLETE
- [x] Pull latest main (eval-studio changes)
- [x] Create Sprint 3 branch (`monorepo-s3`)
- [x] Update context file
- [x] Create Sprint 3 plan
- [x] Compare working services (ai-ccat, sts-ai-doc-gui) vs failing (ai-mod-dev-web)
- [x] Identify 10 key differences
- [x] Design 12-experiment testing matrix
- [x] Create experiment directory structure
- [x] Document comprehensive testing plan

### Phase 2: Experiment Infrastructure ✅ COMPLETE
- [x] Create experiment directory (`~/code/bodhix/testing/apprunner-experiments/`)
- [x] Create README.md with complete documentation
- [x] Create 5 Dockerfile variants (baseline, node22, libc, buildargs, fullmatch)
- [x] Create Terraform configuration (12 App Runner services + ECR + IAM)
- [x] Create build scripts (build-all-images.sh)
- [x] Create deployment scripts (push-images.sh)
- [x] Create monitoring scripts (check-results.sh, analyze-results.sh)
- [x] Create cleanup scripts (cleanup.sh)
- [x] Make all scripts executable

### Phase 3: Execution & Analysis ⚠️ BLOCKED
- [x] Copy source code from test project for Docker builds
- [x] Build 5 Docker images with different configurations
- [x] Push all images to ECR
- [x] Deploy Round 1 (12 experiments) via Terraform - **ALL FAILED**
- [x] Analyze Round 1 results - Hypothesis: Missing HOSTNAME
- [x] Deploy Round 2 (3 experiments with HOSTNAME) - **ALL FAILED**
- [x] Analyze Round 2 results - **HOSTNAME hypothesis DISPROVEN**
- [ ] ⚠️ **BLOCKED:** Test Docker image locally to identify actual issue
- [ ] Fix root cause in application or configuration
- [ ] Deploy final test with correct fix

### Phase 4: Template Updates
- [ ] Apply winning configuration to monorepo template
- [ ] Update App Runner module with required settings
- [ ] Update Dockerfile if needed
- [ ] Test updated template with fresh project
- [ ] Document final solution in ADR

### Phase 5: Cleanup & Documentation
- [ ] Run cleanup script to destroy all experiments
- [ ] Update Sprint 3 plan with completion status
- [ ] Update context file with findings
- [ ] Create deployment troubleshooting guide
- [ ] Archive experiment directory (gitignored)
- [ ] Prepare for Phase 4 (CI/CD)

---

## Success Criteria

### Must-Have
- [x] Latest code pulled from main (eval-studio changes integrated)
- [x] Root cause analysis methodology designed
- [x] 10 key differences identified between working and failing services
- [x] 12-experiment testing matrix created
- [x] Experiment infrastructure directory created
- [x] Comprehensive documentation complete
- [x] 5 Dockerfile variants created
- [x] Terraform for 15 experiments created (12 Round 1 + 3 Round 2)
- [x] Round 1 experiments deployed (ALL FAILED)
- [x] Round 2 experiments deployed with HOSTNAME (ALL FAILED)
- [x] Results analyzed - **HOSTNAME hypothesis incorrect**
- [ ] ⚠️ **BLOCKED:** Local Docker testing to find real issue
- [ ] Templates updated with working solution (pending root cause)

### Nice-to-Have
- [ ] Experiments complete in < 30 minutes (parallel execution)
- [ ] Clear determination of which variables are critical vs optional
- [ ] Multiple working configurations identified
- [ ] Cost under $0.05 (as estimated)

---

## Known Issues from Sprint 2

### Critical Fixes Applied (Session 11)
1. **Missing HOSTNAME in Dockerfile** ✅ Fixed in templates
   - Added `ENV HOSTNAME 0.0.0.0`
   - Ensures Next.js binds to all network interfaces

2. **Mismatched Health Check Paths** ✅ Fixed in templates
   - Created `/api/healthcheck` route (matches Terraform)
   - Updated middleware to exclude from auth
   - All paths now aligned

3. **Template Placeholders** ✅ Fixed in test project
   - Dockerfile now uses correct project name
   - No more `{{PROJECT_NAME}}` in build commands

### Root Cause Hypothesis (from Session 12 Analysis)

**Most Likely Causes (P0 - Critical):**
1. **Missing NEXTAUTH_SECRET** - NextAuth.js crashes without this
2. **Wrong NEXTAUTH_URL** - Set to `localhost:3000` instead of App Runner URL
3. **Missing OKTA_CLIENT_SECRET** - Okta OAuth flow requires this
4. **Wrong OKTA_CLIENT_ID** - Using `api://default` placeholder instead of real ID

**Secondary Causes (P1 - May Contribute):**
5. **Missing InstanceRoleArn** - May prevent SSM parameter access

**Dockerfile Variations (P2 - Unknown Impact):**
6. **Node.js Version** - Template uses 18, working service uses 22
7. **libc6-compat** - Missing in template, present in working service

---

## 12-Experiment Testing Matrix

### Configuration Experiments (EXP 0-7) - Same Docker Image
Tests configuration variables in isolation using current Dockerfile:

| ID | Name | Added Config | Tests |
|----|------|-------------|-------|
| 0 | exp-0-baseline | None | Control (expected to fail) |
| 1 | exp-1-nextauth-secret | NEXTAUTH_SECRET only | Is secret alone sufficient? |
| 2 | exp-2-nextauth-url | Fix NEXTAUTH_URL only | Is URL fix alone sufficient? |
| 3 | exp-3-okta-clientid | Real OKTA_CLIENT_ID only | Is real ID alone sufficient? |
| 4 | exp-4-okta-secret | OKTA_CLIENT_SECRET only | Is Okta secret alone sufficient? |
| 5 | exp-5-task-role | InstanceRoleArn only | Is task role alone sufficient? |
| 6 | exp-6-all-auth | ALL auth secrets | Are all auth configs sufficient? |
| 7 | exp-7-tf-fullmatch | ALL ai-ccat TF settings | Full Terraform replication |

### Dockerfile Experiments (EXP 8-11) - Different Docker Images
Tests Dockerfile variations with all auth secrets included:

| ID | Name | Docker Change | Tests |
|----|------|--------------|-------|
| 8 | exp-8-node22 | Node 22 + all auth | Is Node.js version the issue? |
| 9 | exp-9-libc | + libc6-compat + all auth | Is Alpine lib needed? |
| 10 | exp-10-buildargs | + Build ARGs + all auth | Are build-time vars needed? |
| 11 | exp-11-docker-full | Full ai-ccat Dockerfile | Full Docker replication |

### Expected Outcomes & Interpretation

| Result | Interpretation | Action |
|--------|---------------|--------|
| Only EXP-0 fails | Config issue, not Docker | Use configs from successful experiments |
| EXP-1 succeeds | NEXTAUTH_SECRET is the key | Add to App Runner module, document as required |
| EXP-6 succeeds | All auth secrets required | Add all 4 secrets to module, document requirements |
| EXP-11 only succeeds | Dockerfile must match ai-ccat | Update template Dockerfile completely |
| Multiple succeed | Multiple valid configs | Document minimum required set from earliest success |
| All fail | Application code issue | Debug locally, fix code before infrastructure |

---

## Test Environment

**Current Test Project:**
- **Location:** `/Users/aaron/code/bodhix/testing/mono-s1/ai-mod-stack`
- **Config:** `setup.config.mono-s1.yaml`
- **Project Name:** `ai-mod`
- **Status:** Source for Docker builds

**Experiment Location:**
- **Directory:** `~/code/bodhix/testing/apprunner-experiments/`
- **Status:** Infrastructure ready, implementation in progress
- **Gitignored:** Yes (only final solution will be committed)

**AWS Configuration:**
- **AWS Account:** 887559014095
- **AWS Profile:** `ai-sec-nonprod`
- **AWS Region:** `us-east-1`

**Values from .env.local (for experiments):**
```
NEXTAUTH_SECRET="Iu/OSUlrsqLNeUF14dSWtwMRpmjAXv//jaIH+jgQb2I="
OKTA_CLIENT_ID="0oax0eaf3bgW5NP73697"
OKTA_CLIENT_SECRET="OYZopGSsAchUlcW9XxYSVBVsfpcpbV7kJ6bytqZ4UeBILKA0kWU7irbyF5wTF-CX"
OKTA_ISSUER="https://simpletech.okta.com/oauth2/default"
```

---

## Dependencies

- ✅ Eval-studio team changes (merged to main)
- ✅ Sprint 2 infrastructure code (merged to main)
- ✅ Root cause analysis complete
- ✅ Experiment design complete
- 🔄 Experiment infrastructure implementation (in progress)

---

## Timeline

**Estimated Duration:** 1-2 days (revised from original plan)

**Session 12 (Feb 11 AM) - COMPLETE:**
- ✅ Root cause analysis (1 hour)
- ✅ Experiment design (30 minutes)
- ✅ Directory structure creation (15 minutes)

**Next Session (Feb 11 or later):**
- Create experiment infrastructure (2-3 hours)
- Build and push Docker images (45 minutes)
- Deploy all experiments (5 minutes)
- Monitor results (20 minutes)
- Analyze and document (30 minutes)
- **Total:** 4-5 hours

**Final Session:**
- Update templates (1 hour)
- Test updated templates (1 hour)
- Documentation and cleanup (1 hour)
- **Total:** 3 hours

**Sprint Total:** 8-9 hours (spread across 2-3 sessions)

---

## Next Steps After This Sprint

### If Experiments Identify Root Cause ✅
- Apply winning configuration to templates
- Document minimum requirements in ADR
- Mark Phase 3 complete
- Start Phase 4: CI/CD Workflows
- Write ADR-024: Monorepo Pattern

### If Experiments All Fail ❌
- Debug application code locally
- Fix application startup issues
- Re-run experiments with fixed code
- Document application requirements

---

## Cost & Resource Estimates

**Experiment Cost:**
- 12 App Runner services × 20 minutes × $0.007/hour = $0.028
- ECR storage (5 images × 260MB) = negligible
- **Total:** < $0.05

**Time Investment:**
- Infrastructure creation: 2-3 hours
- Execution & monitoring: 1 hour
- Analysis & documentation: 1 hour
- Template updates: 2 hours
- **Total:** 6-7 hours

**Value:**
- Definitive answer on minimum requirements
- No more trial-and-error (saves 10+ hours)
- Documented for future developers
- Scientific approach = reproducible results

---

## Risk Mitigation

**Experiment Isolation:**
- ✅ Separate directory (gitignored)
- ✅ No impact on main codebase
- ✅ Easy cleanup via Terraform destroy
- ✅ Low cost (< $0.05)

**Failure Modes:**
- If all experiments fail → Application code issue (debug locally)
- If none fail → Hypothesis incorrect (investigate logs)
- If results unclear → Re-run with refined tests

**Rollback Plan:**
- Experiments are temporary and isolated
- Destroying them returns to pre-experiment state
- No risk to production or existing projects

---

## Key Learnings (Updated)

1. **Systematic Testing Required:** When multiple variables could cause failure, parallel testing is more efficient than sequential debugging
2. **AWS Configuration Comparison:** `aws apprunner describe-service` provides definitive ground truth for working vs failing configs
3. **Scientific Method:** Design experiments to isolate variables, run in parallel, analyze results systematically
4. **Documentation First:** Create comprehensive plan before implementation to ensure clarity and alignment
5. **Hypothesis Testing:** Even well-reasoned hypotheses can be wrong - HOSTNAME hypothesis was disproven by Round 2
6. **Local Testing Essential:** Should have tested Docker image locally BEFORE deploying 15 App Runner experiments
7. **No Logs = Early Failure:** Services failing before logs exist suggests image pull, container startup, or immediate app crash
8. **Cost of Wrong Hypothesis:** 15 experiments (~$0.035) spent on incorrect hypothesis - local testing would have been free

---

---

## Round 2 Results Summary

**Deployed:** February 11, 2026 (10:00-10:48 AM)  
**Status:** ❌ ALL FAILED  
**Conclusion:** HOSTNAME hypothesis DISPROVEN

### Round 2 Experiments

| Service | HOSTNAME | Config | Status | Timeout |
|---------|----------|--------|--------|---------|
| r2-1-baseline-hostname | ✅ 0.0.0.0 | Baseline + HOSTNAME | CREATE_FAILED | 20 min |
| r2-2-minimal | ✅ 0.0.0.0 | Minimal env vars | CREATE_FAILED | 20 min |
| r2-3-full | ✅ 0.0.0.0 | All auth secrets | CREATE_FAILED | 20 min |

**Key Finding:** Even with HOSTNAME=0.0.0.0, all services failed identically to Round 1, proving HOSTNAME alone is not sufficient or not the actual root cause.

### Total Experiments

- **Round 1:** 12 experiments (no HOSTNAME) - ALL FAILED
- **Round 2:** 3 experiments (with HOSTNAME) - ALL FAILED
- **Total:** 15 experiments, 0 successful
- **Cost:** ~$0.035 (under budget ✅)

### Next Steps

**STOP deploying experiments.** Local Docker testing required:

1. Pull and run `exp-baseline` image locally
2. Identify actual startup failure (app crash, middleware issue, etc.)
3. Fix root cause
4. Verify fix works locally
5. THEN deploy final test to App Runner

---

**Plan Status:** ⚠️ BLOCKED - Local Docker testing required  
**Last Updated:** February 11, 2026 (10:53 EST)  
**Next Update:** After local testing identifies actual root cause
