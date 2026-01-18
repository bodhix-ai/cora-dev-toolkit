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
**Test Workspace:** TBD (create new workspace: test-ws-XX)

**Paths:**
```
Stack:  ~/code/bodhix/testing/test-ws-XX/ai-sec-stack
Infra:  ~/code/bodhix/testing/test-ws-XX/ai-sec-infra
```

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

### Session 1: Deployment & Initial Testing
**Date**: TBD  
**Duration**: TBD  
**Focus**: Milestone 1 + start Milestone 2

**Completed:**
- [ ] Module deployed to test project
- [ ] Infrastructure verified
- [ ] Database schema applied
- [ ] Initial admin page testing

**Issues Found:**
- (Document issues here)

**Next Session:**
- Continue Milestone 2 testing

---

### Session 2: Configuration Testing
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
|------|---------|---------|
| Jan 18, 2026 | - | Sprint plan created |

---

**Status**: 🔄 IN PROGRESS  
**Last Updated**: January 18, 2026  
**Branch**: feature/module-eval-config
