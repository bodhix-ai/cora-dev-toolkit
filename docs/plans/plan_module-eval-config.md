# Module-Eval-Config Sprint Plan

**Status**: 🔄 IN PROGRESS  
**Priority**: HIGH (Module validation & integration testing)  
**Sprint Goal**: Org admin can configure a new document evaluation (doc type, eval criteria, scoring criteria, etc.)  
**Branch**: `feature/module-eval-config`  
**Parent PR**: #46 (feature/module-eval-implementation - MERGED ✅)  
**Estimated Duration**: 2-4 sessions (~6-12 hours)

---

## Executive Summary

This sprint focuses on end-to-end testing and validation of the module-eval configuration flow in a deployed environment. While the module-eval implementation is complete (PR #46), this sprint validates that org admins can successfully configure document evaluations and that those configurations flow correctly to user evaluation workflows.

---

## Success Criteria

### Primary Goal
✅ Org admin can configure a new document evaluation including:
- Document type definition
- Criteria import from spreadsheet (CSV/XLSX)
- Scoring configuration (boolean/detailed modes)
- Status options with colors
- (Optional) AI prompts if delegated

### Secondary Goals
- User can create evaluation using org admin's configuration
- Evaluation processing uses org-configured criteria and scoring
- Export generation includes org-configured status labels and colors
- All configurations persist correctly across sessions

---

## Scope

### In Scope

**Deployment:**
- Deploy module-eval to test project (ai-sec)
- Verify all infrastructure provisioned correctly
- Verify database schema applied successfully

**Configuration Testing:**
- Org admin pages accessible and functional
- Doc type creation/editing
- Criteria set import from spreadsheet
- Scoring mode configuration
- Status option management
- Prompt configuration (if delegated)

**Integration Testing:**
- User can select org-configured doc type
- Evaluation uses org-configured criteria
- Results display org-configured status options
- Export includes org configurations

**Bug Fixes:**
- Fix any issues discovered during testing
- Update templates with fixes
- Re-validate in test project

### Out of Scope

- Platform admin configuration (deferred to separate sprint)
- Export format customization (deferred to v2)
- Bulk operations (deferred to v2)
- Email notifications (deferred to v2)

---

## Milestones

### Milestone 1: Deployment & Provisioning ✅/❌
**Goal**: Module-eval deployed and accessible in test project

**Tasks:**
- [ ] Run `create-cora-project.sh` with module-eval enabled
- [ ] Verify infrastructure provisioned (3 Lambdas, SQS queue, S3 bucket)
- [ ] Verify database schema applied (15 migrations)
- [ ] Verify RLS policies active
- [ ] Verify API Gateway routes registered (44 routes)
- [ ] Verify frontend routes accessible

**Acceptance:**
- All infrastructure green in AWS Console
- Database tables exist with correct schema
- API routes return 200/401 (not 404)
- Frontend pages load without 404

**Estimated Time**: 1-2 hours

---

### Milestone 2: Org Admin Configuration Flow ✅/❌
**Goal**: Org admin can configure all evaluation settings

**Test Scenarios:**

#### 2.1 Document Type Management
- [ ] Navigate to `/admin/org/eval/doc-types`
- [ ] Create new doc type "IT Security Policy"
- [ ] Edit doc type name
- [ ] Deactivate doc type
- [ ] Reactivate doc type

**Expected**: CRUD operations succeed, changes persist

#### 2.2 Criteria Set Import
- [ ] Create test spreadsheet with columns: `criteria_id`, `requirement`, `description`, `category`, `weight`
- [ ] Add 5-10 test criteria rows
- [ ] Navigate to `/admin/org/eval/criteria`
- [ ] Click "Import from Spreadsheet"
- [ ] Upload CSV file
- [ ] Verify import preview shows correct data
- [ ] Confirm import
- [ ] Verify criteria set created with items

**Expected**: Import succeeds, all criteria items saved correctly

**Test Files:**
```csv
criteria_id,requirement,description,category,weight
POL-001,Password complexity requirements,Requires minimum 12 characters with mix of character types,Authentication,10
POL-002,Multi-factor authentication,Requires MFA for all privileged accounts,Authentication,15
POL-003,Encryption at rest,Requires AES-256 encryption for all sensitive data,Data Protection,20
POL-004,Access logging,Requires comprehensive access logs with 1-year retention,Monitoring,8
POL-005,Incident response plan,Requires documented incident response procedures,Compliance,12
```

#### 2.3 Scoring Configuration
- [ ] Navigate to `/admin/org/eval/config`
- [ ] Toggle between boolean and detailed scoring modes
- [ ] Enable/disable numerical score display
- [ ] Save configuration
- [ ] Refresh page, verify settings persisted

**Expected**: Settings save and persist correctly

#### 2.4 Status Options Management
- [ ] Navigate to `/admin/org/eval/config` (status options section)
- [ ] Create custom status option "Needs Review" with yellow color
- [ ] Create custom status option "Critical Issue" with red color
- [ ] Edit status option name and color
- [ ] Reorder status options
- [ ] Deactivate status option

**Expected**: Status options CRUD succeeds, order preserved

#### 2.5 Prompt Configuration (If Delegated)
- [ ] Verify delegation status for test org
- [ ] If delegated: Navigate to `/admin/org/eval/prompts`
- [ ] If delegated: Edit evaluation prompt
- [ ] If delegated: Test prompt with sample input
- [ ] If not delegated: Verify prompts page shows "AI config managed by platform admin"

**Expected**: Delegation controls access correctly

**Acceptance:**
- All org admin pages load successfully
- All CRUD operations succeed
- Data persists across page refreshes
- Validation errors display appropriately
- Success/error toasts display

**Estimated Time**: 2-3 hours

---

### Milestone 3: User Evaluation Integration ✅/❌
**Goal**: User can create evaluation using org admin's configuration

**Test Scenarios:**

#### 3.1 Evaluation Creation with Configured Doc Type
- [ ] Login as workspace member (not org admin)
- [ ] Navigate to `/eval`
- [ ] Click "Create Evaluation"
- [ ] Select doc type "IT Security Policy" (from Milestone 2)
- [ ] Upload test document (PDF)
- [ ] Select criteria set (from Milestone 2)
- [ ] Submit evaluation

**Expected**: Evaluation created, status "pending"

#### 3.2 Progress Tracking
- [ ] Verify evaluation status changes to "processing"
- [ ] Monitor progress percentage updates
- [ ] Verify processing completes within reasonable time
- [ ] Verify status changes to "completed"

**Expected**: Progress updates in real-time, completes successfully

#### 3.3 Results Display with Org Config
- [ ] View completed evaluation
- [ ] Verify criteria items match imported criteria set
- [ ] Verify status labels match org-configured status options
- [ ] Verify status colors match org configuration
- [ ] Verify scoring mode matches org configuration

**Expected**: All org configurations reflected in results

#### 3.4 Result Editing
- [ ] Click "Edit" on a criteria result
- [ ] Change status from AI-selected to different status
- [ ] Edit narrative explanation
- [ ] Save edit
- [ ] Verify edit appears in results
- [ ] View edit history
- [ ] Verify edit recorded with timestamp and editor

**Expected**: Editing succeeds, history tracked

#### 3.5 Export with Org Config
- [ ] Click "Export to PDF"
- [ ] Download PDF
- [ ] Verify PDF includes org-configured status labels and colors
- [ ] Click "Export to XLSX"
- [ ] Download XLSX
- [ ] Verify XLSX includes all criteria with org config

**Expected**: Exports succeed, include org configurations

**Acceptance:**
- User can create evaluation with org config
- Processing completes successfully
- Results reflect org configuration
- Editing and export work correctly

**Estimated Time**: 2-3 hours

---

### Milestone 4: Bug Fixes & Template Updates ✅/❌
**Goal**: Fix issues discovered during testing

**Process:**

For each bug discovered:

1. **Document Issue**
   - Error message or unexpected behavior
   - Steps to reproduce
   - Expected vs actual behavior

2. **Fix in Template**
   - Update `templates/_modules-functional/module-eval/`
   - Follow template-first workflow
   - Commit to feature/module-eval-config branch

3. **Sync to Test Project**
   ```bash
   ./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-ws-XX/ai-sec-stack <filename>
   ./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-ws-XX/ai-sec-infra <filename>
   ```

4. **Deploy if Backend**
   ```bash
   cd ~/code/bodhix/testing/test-ws-XX/ai-sec-infra
   ./scripts/deploy-lambda.sh module-eval/<lambda-name>
   ```

5. **Retest**
   - Verify fix resolves issue
   - Check for regressions

6. **Document Fix**
   - Update this plan with issue and resolution
   - Add to CHANGELOG if significant

**Common Issues to Watch For:**
- [ ] Route 404s (API Gateway mapping issues)
- [ ] RLS policy denials (permission issues)
- [ ] Type mismatches (camelCase vs snake_case)
- [ ] Missing foreign key constraints
- [ ] File upload errors (presigned URL issues)
- [ ] SQS processing failures
- [ ] Export generation errors

**Acceptance:**
- All discovered issues fixed in template
- Fixes validated in test project
- No regressions introduced

**Estimated Time**: 2-4 hours (depends on issue count)

---

## Test Environment

### Test Project: ai-sec
**Test Workspace:** test-eval

**Paths:**
```
Stack:  ~/code/bodhix/testing/test-eval/ai-sec-stack
Infra:  ~/code/bodhix/testing/test-eval/ai-sec-infra
```

**Project Status (Session 138):**
- ✅ Created from updated templates with all fixes
- ✅ Database schema applied (58 tables, 189 indexes)
- ✅ IDP configured (Okta)
- ✅ AI provider seeded (AWS Bedrock)
- ✅ Validation: BRONZE certification

**Test Users:**
- **Org Admin**: Create test org admin user in test workspace
- **Workspace Member**: Create regular member for user flow testing

**Test Data:**
- **Doc Type**: "IT Security Policy"
- **Criteria Set**: "NIST Cybersecurity Framework Subset" (5-10 criteria)
- **Test Document**: Sample IT security policy PDF (~5-10 pages)

---

## Validation Checklist

### Pre-Deployment
- [ ] Review PR #46 merge status
- [ ] Confirm all module-eval template files present
- [ ] Review database migrations (15 files)
- [ ] Review Lambda functions (3 functions)
- [ ] Review infrastructure (main.tf complete)

### Post-Deployment
- [ ] All infrastructure resources created
- [ ] Database migrations applied successfully
- [ ] API routes registered in API Gateway
- [ ] Frontend routes accessible
- [ ] No CloudWatch errors in Lambda logs

### Configuration Testing
- [ ] Org admin pages load without errors
- [ ] Doc types CRUD operations succeed
- [ ] Criteria import from CSV/XLSX succeeds
- [ ] Status options CRUD operations succeed
- [ ] Scoring config saves and persists
- [ ] Delegation controls work correctly

### Integration Testing
- [ ] User can create evaluation with org config
- [ ] SQS processing triggers correctly
- [ ] Progress tracking updates in real-time
- [ ] Evaluation completes successfully
- [ ] Results display org-configured settings
- [ ] Editing works with version tracking
- [ ] Export to PDF succeeds
- [ ] Export to XLSX succeeds

### CORA Compliance
- [ ] Run frontend compliance validator (0 errors expected)
- [ ] Run API response validator (0 errors expected)
- [ ] Run accessibility validator (<10 errors expected)
- [ ] Run database naming validator (check for false positives)

---

## Dependencies

### Required Modules (Already Deployed)
- ✅ module-access - Authentication & authorization
- ✅ module-ai - AI provider configuration
- ✅ module-kb - Document storage & RAG
- ✅ module-ws - Workspace scoping
- ✅ module-mgmt - Platform management

### External Services
- ✅ SQS - Async processing queue
- ✅ S3 - Document storage (via module-kb)
- ✅ Bedrock or OpenAI - AI provider (via module-ai)

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| SQS processing fails | High | Medium | Check Lambda logs, verify IAM permissions, check SQS DLQ |
| Criteria import parsing errors | Medium | Medium | Test with multiple spreadsheet formats, validate column headers |
| RLS policy too restrictive | Medium | Low | Review policies, test with different user roles |
| Export generation timeout | Medium | Low | Increase Lambda timeout, implement async export |
| Large criteria sets slow | Low | Low | Implement pagination, batch processing |

---

## Session Tracking

### Session 138: Template Fixes & Test Project Creation
**Date**: January 18, 2026  
**Duration**: ~1.5 hours  
**Focus**: Build scripts, module-voice standardization, fresh project creation

**Completed:**
- [x] Created `build.sh` for module-eval template (3 Lambdas)
- [x] Created `build.sh` for module-voice template (6 Lambdas)
- [x] Standardized module-voice infrastructure (variables, main.tf, outputs)
- [x] Verified all 8 modules build successfully (30+ Lambda packages)
- [x] Deleted old test project
- [x] Created fresh test project: `~/code/bodhix/testing/test-eval/`
- [x] Database schema applied (58 tables, 189 indexes, 88 functions, 176 policies)
- [x] Validation: BRONZE certification

**Validator Notes:**
- API Tracer: 1 false positive (`{baseURL}{url}` - validator parsing issue, code correct)
- Accessibility: 49 warnings (placeholders without labels - expected)
- Portability: 15 warnings (hardcoded region fallbacks - acceptable)
- 207 orphaned route warnings (internal APIs, webhooks - expected)

**Issues Found:**
- None - all template fixes successful

**Next Session:**
- Build all modules in test project
- Deploy infrastructure (Terraform)
- Begin Milestone 1 verification

---

### Session 139: Deployment & Initial Testing
**Date**: January 18, 2026  
**Duration**: ~1 hour  
**Focus**: Milestone 1 deployment + verification

**Completed:**
- [x] Built all modules in test project (31 Lambda packages)
- [x] Fixed critical infrastructure bugs:
  - Module-voice: Fixed `api_routes` structure (integration + public attributes)
  - Module-eval: Fixed S3 lifecycle configuration (added filter block)
- [x] Deployed infrastructure (Terraform) - 420 resources created
- [x] Verified API Gateway routes (44+ routes registered)
- [x] Created infrastructure sync script (`scripts/sync-infra-to-project.sh`)
- [x] Updated `.clinerules` with infrastructure sync documentation

**Deployment Results:**
- API Gateway ID: `hk5bzq4kv3`
- API Gateway URL: `https://hk5bzq4kv3.execute-api.us-east-1.amazonaws.com/`
- Module-eval Lambdas: 3 functions deployed
- SQS Queue: Created for async processing
- S3 Bucket: Created for exports (optional)

**Infrastructure Fixes:**
1. **Module-voice** `outputs.tf` - Changed from `lambda_name`/`description` to `integration`/`public`
2. **Module-eval** `main.tf` - Added `filter { prefix = \"`` }` to S3 lifecycle rule

**Tooling Created:**
- `scripts/sync-infra-to-project.sh` - For syncing Terraform infrastructure files
- Documented in `.clinerules` for future AI agents

**Issues Found:**
- ⚠️ S3 lifecycle warnings in other modules (module-kb, etc.) - same pattern, can be fixed later

**Next Session:**
- Verify Milestone 1 checklist items
- Begin Milestone 2 testing (org admin configuration)

---

### Session 140: Route Creation & Test Environment Preparation
**Date**: January 18, 2026  
**Duration**: ~1 hour  
**Focus**: Complete module-eval routes, prepare for deployment testing

**Completed:**
- [x] Created 8 module-eval route files in template
  - `/admin/org/eval/config/page.tsx`
  - `/admin/org/eval/doc-types/page.tsx`
  - `/admin/org/eval/criteria/page.tsx`
  - `/admin/org/eval/prompts/page.tsx`
  - `/admin/sys/eval/config/page.tsx`
  - `/admin/sys/eval/prompts/page.tsx`
  - `/eval/page.tsx`
  - `/eval/[id]/page.tsx`
- [x] Recreated test project from updated templates
- [x] Manually copied routes to test project (workaround)
- [x] Documented proper test workflow requirements

**Issues Found:**
1. **CRITICAL:** `create-cora-project.sh` does NOT copy `routes/` directory
   - Script only copies `frontend/`, `backend/`, `db/`, `infrastructure/`
   - Routes must be manually copied until script is updated
   - Workaround: Use `cp -r` commands after project creation

2. **Process Error:** Initially suggested "start dev server" without deployment
   - Frontend `.env.local` is NOT populated until `deploy-all.sh` runs
   - Dev server cannot start without API Gateway endpoint configured
   - Must follow `.cline/workflows/test-module.md` workflow phases

**Lessons Learned:**
- Infrastructure deployment MUST happen before dev server startup
- Always check `.cline/workflows/` before suggesting test procedures
- Follow test-module.md phases: Config → Create → Validate → Deploy → Dev Server

**Next Session:**
- Follow `.cline/workflows/test-module.md` for proper test environment setup
- Run phases 0-4 in correct order
- Begin Milestone 2 testing after deployment completes

---

### Session 141: Infrastructure Redeployment & Frontend Fixes ✅
**Date**: January 18, 2026  
**Duration**: ~2 hours  
**Focus**: Deploy missing routes, fix frontend bugs, achieve first successful page load

**Completed:**
- [x] **Infrastructure Redeployment:**
  - Identified that routes were created AFTER Session 139 deployment
  - All 3 Lambdas exist: eval-config, eval-processor, eval-results
  - Redeployed infrastructure to register routes
  - Verified all 44 API routes registered in API Gateway
  - API calls now return 200 OK with data (not 404)

- [x] **Frontend Bug Fixes (4 files):**
  1. `useEvalStatusOptions.ts` - Added defensive array check for `sysStatusOptions`
  2. `module-access/frontend/index.ts` - Added `OrgContext` to exports
  3. `OrgDelegationManager.tsx` - Added defensive array check for `organizations`
  4. `ScoringConfigPanel.tsx` - Added `useEffect` to sync state with API response

- [x] **All fixes synced to test project**
- [x] **🎉 PAGE LOADS FOR FIRST TIME!**
  - `/admin/sys/eval/config` displays full UI
  - Scoring Configuration panel visible
  - Status Options manager visible
  - Organization Delegation panel visible

**Issues Discovered & Resolved:**

**Bug 1:** `sysStatusOptions.filter is not a function`
- **Cause:** No defensive check for array type
- **Fix:** Added `Array.isArray()` guard
- **Status:** ✅ Fixed in template, synced to test project

**Bug 2:** `OrgContext is undefined`
- **Cause:** `OrgContext` not exported from module-access package
- **Fix:** Added `OrgContext` to exports: `export { OrgProvider, OrgContext } from "./contexts/OrgContext"`
- **Status:** ✅ Fixed in template, synced to test project

**Bug 3:** `organizations.filter is not a function`
- **Cause:** Same as Bug 1, no defensive array check
- **Fix:** Added `Array.isArray()` guard
- **Status:** ✅ Fixed in template, synced to test project

**Bug 4:** Checkbox showing unchecked despite API returning `showNumericalScore: true`
- **Cause:** Component state initialized on mount, doesn't update when API data loads
- **Fix:** Added `useEffect` to sync state when config prop changes
- **Status:** ✅ Fixed in template, synced to test project

**Issues Pending:**

**Issue:** Formatting - checkmark rendering 1/3 page size
- **Likely Cause:** Tailwind CSS not loading or conflicting styles
- **Status:** ⚠️ Needs investigation
- **Recommendation:** Check browser DevTools for CSS errors, verify tailwind.config.js includes module paths

**Clarification:** Org delegation schema
- **Question:** "Don't see those columns on eval_cfg_sys table"
- **Answer:** ✅ Correct! Delegation is stored on `organizations` table (`ai_config_delegated` column), not on eval config tables
- **Design:** Delegation is an organization-level permission, not an eval config setting

**Deployment Results:**
- API Gateway ID: `hk5bzq4kv3`
- API Gateway URL: `https://hk5bzq4kv3.execute-api.us-east-1.amazonaws.com/`
- All 44 module-eval routes registered and returning 200/401 (not 404)

**Milestone Progress:**
- **Milestone 1:** ✅ COMPLETE - Infrastructure deployed, routes registered, page loads
- **Milestone 2:** 🔄 READY TO BEGIN - Org admin configuration testing can start

**Next Session:**
- Investigate Tailwind CSS loading issue (if not resolved by user)
- Begin Milestone 2 testing: Create status options, doc types, criteria sets
- Test scoring configuration save/load
- Test other tabs (Doc Types, Criteria, Prompts)

---

### Session 142: Configuration Testing
**Date**: TBD  
**Duration**: TBD  
**Focus**: Complete Milestone 2

**Completed:**
- [ ] All org admin config flows tested
- [ ] Criteria import validated
- [ ] Status options configured

**Issues Found:**
- (Document issues here)

**Next Session:**
- Start Milestone 3 (User integration)

---

### Session 3: Integration Testing
**Date**: TBD  
**Duration**: TBD  
**Focus**: Milestone 3

**Completed:**
- [ ] User evaluation flow tested
- [ ] Results display validated
- [ ] Export tested

**Issues Found:**
- (Document issues here)

**Next Session:**
- Fix issues (Milestone 4)

---

### Session 4: Bug Fixes & Completion (If Needed)
**Date**: TBD  
**Duration**: TBD  
**Focus**: Milestone 4

**Completed:**
- [ ] All bugs fixed
- [ ] Fixes validated
- [ ] Ready for PR

**Next Steps:**
- Create PR to merge feature/module-eval-config → main

---

## Completion Criteria

### Sprint Complete When:
1. ✅ All 4 milestones completed
2. ✅ All test scenarios passed
3. ✅ All bugs fixed in templates
4. ✅ Validation passing (CORA compliance)
5. ✅ Documentation updated
6. ✅ Ready for PR review

### PR Checklist:
- [ ] All template fixes committed
- [ ] Test results documented
- [ ] Validation results included
- [ ] CHANGELOG updated
- [ ] Context files updated
- [ ] PR description complete with test evidence

---

## Related Documentation

**Implementation:**
- [Module-Eval Implementation Plan](./plan_module-eval-implementation.md)
- [Module-Eval Specification](../specifications/module-eval/MODULE-EVAL-SPEC.md)

**Standards:**
- [Branching Strategy](../standards/standard_BRANCHING-STRATEGY.md)
- [Branching Workflow](../guides/guide_BRANCHING-WORKFLOW.md)

**Testing:**
- [Integration Test Checklist](../../templates/_modules-functional/module-eval/INTEGRATION-TEST-CHECKLIST.md)

---

## Change Log

| Date | Session | Changes |
|------|---------|------------|
| Jan 18, 2026 | 138 | Template fixes (build scripts, module-voice standardization), fresh test project created |
| Jan 18, 2026 | - | Sprint plan created |

---

**Status**: 🔄 IN PROGRESS  
**Last Updated**: January 18, 2026 (Session 138)  
**Branch**: feature/module-eval-config  
**Test Project**: ~/code/bodhix/testing/test-eval/ ✅ CREATED
