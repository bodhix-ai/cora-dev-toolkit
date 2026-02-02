# Sprint S3: Resource Permission Validation - Implementation Plan

**Status**: 🟡 IN PROGRESS (78% complete)  
**Priority**: HIGH  
**Estimated Duration**: 20-30 hours (15 hours spent, 13-16 hours remaining)  
**Created**: 2026-02-01  
**Updated**: 2026-02-02  
**Branch**: `auth-standardization-s3`  
**Context**: [context-auth-standardization.md](../../memory-bank/context-auth-standardization.md)  
**Dependencies**: ADR-019c, S2 completion

---

## Executive Summary

Sprint S3 extends the api-tracer validator to assess compliance with ADR-019c (Resource Permission Authorization) - the second authorization layer for data routes (`/{module}/*`). 

**Progress:** 78% complete - 242 of 312 Layer 2 errors fixed across 4 modules.

**Current State:**
- ✅ Layer 1 validation complete (admin auth - ADR-019a/b) - 100% compliant
- ✅ All 8 modules 100% compliant with admin auth patterns
- 🟡 Layer 2 (resource permissions - ADR-019c) - 78% complete (4 of 6 modules done)

**Remaining Work:**
- module-kb: 58 errors (Phase 10)
- module-voice: 100 errors (Phase 12)

---

## Progress Tracking

### Completed Modules (4 of 6)

| Module | Initial Errors | Final Errors | Status | Time | Session |
|--------|---------------|--------------|--------|------|---------|
| module-ws | 2 | 0 | ✅ | 2h | S3 Session 2-3 |
| module-eval | 20 | 0 | ✅ | 3h | S3 Session 4 |
| module-chat | 48 | 0 | ✅ | 1.5h | S3 Session 5 |
| module-access | 84 | 0 | ✅ | 5h | S3 Session 7 |
| **Subtotal** | **154** | **0** | **100%** | **11.5h** | - |

### Remaining Modules (2 of 6)

| Module | Errors | Priority | Estimated Time | Status |
|--------|--------|----------|----------------|--------|
| module-kb | 58 | High | 5-6h | ⏳ Next |
| module-voice | 100 | High | 8-10h | ⏳ Pending |
| **Remaining** | **158** | - | **13-16h** | - |

### Overall Metrics

- **Errors Fixed:** 242 / 312 (78%)
- **Modules Complete:** 4 / 6 (67%)
- **Time Spent:** ~15 hours
- **Time Remaining:** ~13-16 hours
- **Status:** On track for 20-30 hour estimate

---

(Phase 1-9 content remains unchanged - see previous version)

---

## Phase 11: Fix module-access (84 errors) ✅ COMPLETE

**Status:** ✅ Complete (2026-02-02)  
**Time:** ~5 hours  
**Errors:** 84 → 0 Layer 2 errors  
**Session Plan:** `docs/plans/completed/session_plan_s3-phase11-module-access.md`

**Lambda files:**
- `orgs/lambda_function.py` ✅
- `invites/lambda_function.py` ✅
- `members/lambda_function.py` ✅
- `profiles/lambda_function.py` ✅
- `identities-management/lambda_function.py` ✅
- `idp-config/lambda_function.py` ✅
- `org-email-domains/lambda_function.py` ✅

**Key Findings:**

**False Positive Investigation:**
- Initial validation showed 84 Layer 2 errors
- Investigation revealed validator was correct - `orgs` Lambda missing two-step pattern
- GET `/orgs/{orgId}` had Layer 1 check only, no Layer 2 implementation
- Root cause: Two-step pattern never implemented in templates (not validator error)

**Database RPC Functions:**
- Created 10 permission RPC functions in `008-auth-rpcs.sql`:
  - Org: `can_view_org()`, `can_edit_org()`, `can_delete_org()`
  - Members: `can_view_members()`, `can_manage_members()`
  - Invites: `can_view_invites()`, `can_manage_invites()`
  - Profile: `can_view_profile()`, `can_edit_profile()`
  - Email domains: `can_manage_email_domains()`
- Migration: `20260202_adr019c_access_permission_rpcs.sql`

**Permission Layer:**
- Created `access_common/permissions.py` with 10 permission helpers
- All helpers wrap database RPC functions

**Lambda Implementation:**
- Updated 7 Lambdas with two-step pattern:
  1. Fetch resource
  2. Verify org membership (`common.can_access_org_resource()`)
  3. Check resource permission (`can_view_*()`, `can_edit_*()`, etc.)

**Validation Results:**
- **Layer 1 (Admin Auth):** 0 errors, 0 warnings ✅
- **Layer 2 (Resource Permissions):** 0 errors, 0 warnings ✅
- **Code Quality:** 74 errors (68 key_consistency, 6 import) - NOT auth-related

**Deployment:**
- All 7 Lambdas + access_common layer built and deployed
- Terraform: 20 added, 26 changed, 20 destroyed
- Zero-downtime blue-green deployment
- Test project: `/Users/aaron/code/bodhix/testing/perm/`

**Commits Pushed (5 commits):**

1. `329e1b0` - feat(module-access): add ADR-019c database schema and permission layer
2. `6605e0f` - fix(module-access): implement ADR-019c two-step pattern in all Lambdas
3. `90e6621` - docs: update Phase 11 documentation and session plans
4. `a80bff5` - docs(workflows): update fix-and-sync workflow with Layer 2 references
5. `f200e9f` - chore: remove old session plans from docs/plans (moved to completed/)

**Files Modified:**
- Database: `008-auth-rpcs.sql`, migration file (new)
- Permission layer: `access_common/` (new directory)
- Lambdas: All 7 Lambda function files
- Documentation: Plans, context, ADR-019, workflows

---

## Phase 10: Fix module-kb (58 errors) ⏳ IN PROGRESS

**Status:** ⏳ In Progress (2026-02-02) - 60% complete  
**Time:** ~3 hours spent, 2-3 hours remaining  
**Errors:** 58 Layer 2 errors, 40 warnings → TBD (validation pending)  
**Session Plan:** `docs/plans/session_plan_s3-phase10-module-kb.md`

**Lambda files:**
- `kb-base/lambda_function.py` (21 routes) ✅ COMPLETE
- `kb-document/lambda_function.py` (19 routes) ⏳ PENDING
- `kb-processor/lambda_function.py` (background processing, no auth routes)

**Progress (2026-02-02):**

**Database Layer ✅ COMPLETE:**
- ✅ Added 6 permission RPC functions to `008-kb-rpc-functions.sql`
  - `is_kb_owner()`, `can_view_kb()`, `can_edit_kb()`, `can_delete_kb()`
  - `can_view_kb_document()`, `can_edit_kb_document()`
- ✅ Created migration: `20260202_adr019c_kb_permission_rpcs.sql`
- ✅ User confirmed: SQL files ran successfully

**Permission Layer ✅ COMPLETE:**
- ✅ Completed `kb_common/permissions.py` with 3 missing helpers
  - `can_delete_kb()`, `can_view_kb_document()`, `can_edit_kb_document()`

**kb-base Lambda ✅ COMPLETE:**
- ✅ Added import: `from kb_common.permissions import can_view_kb, can_edit_kb, can_delete_kb`
- ✅ Updated `route_workspace_handlers()` to use `common.can_access_ws_resource()`
- ✅ Replaced all `check_ws_admin_access()` calls with `common.is_ws_admin()`
- ✅ Removed unused local helpers: `check_workspace_access()`, `check_ws_admin_access()`
- ✅ Kept `check_chat_access()` (complex logic, no standard equivalent)

**kb-document Lambda ⏳ PENDING:**
- [ ] Add import for `kb_common.permissions`
- [ ] Replace `check_workspace_access()` with `common.can_access_ws_resource()`
- [ ] Replace `check_chat_access()` with local helper (keep as-is, complex logic)
- [ ] Add two-step pattern where needed
- [ ] Remove unused local functions

**Remaining Work:**
1. Update kb-document Lambda (1.5 hours estimated)
2. Build and deploy all Lambdas + kb_common layer (1 hour)
3. Run validation to confirm 0 Layer 2 errors (30 min)
4. Update documentation and commit changes (30 min)

**Files Modified (Templates):**
- `templates/_modules-core/module-kb/db/schema/008-kb-rpc-functions.sql`
- `templates/_modules-core/module-kb/db/migrations/20260202_adr019c_kb_permission_rpcs.sql` (new)
- `templates/_modules-core/module-kb/backend/layers/kb_common/python/kb_common/permissions.py`
- `templates/_modules-core/module-kb/backend/lambdas/kb-base/lambda_function.py`

**Next Session:**
Continue with kb-document Lambda update, then build/deploy/validate.

---

## Phase 12: Fix module-voice (100 errors) (8-10 hours)

**Status:** ⏳ Pending  
**Priority:** High  
**Errors:** 100 Layer 2 errors, 20 warnings

**Lambda files:**
- `voice-sessions/lambda_function.py`
- `voice-analytics/lambda_function.py`

**Pattern:**
```python
# In voice-sessions Lambda
from voice_common.permissions import can_access_voice, can_edit_voice

# Get voice session
session = common.find_one('voice_sessions', {'id': session_id})

# Verify org membership
if not common.can_access_org_resource(user_id, session['org_id']):
    return common.forbidden_response('Not a member')

# Check voice permission
if not can_access_voice(user_id, session_id):
    return common.forbidden_response('Access denied')
```

**Actions:**
- [ ] Create `voice_common/permissions.py`
- [ ] Implement `can_access_voice()`, `can_edit_voice()`, `can_view_analytics()`
- [ ] Add membership + permission checks to voice-sessions routes
- [ ] Add membership + permission checks to voice-analytics routes
- [ ] Run validation: `--module module-voice --layer2-only`
- [ ] Sync to test project and deploy both Lambdas
- [ ] Test voice UI (sessions, transcripts, analytics)
- [ ] Commit: \"fix(module-voice): implement ADR-019c resource permissions\"

**Expected Output:** module-voice: 0 Layer 2 errors

---

## Phase 13: Final Validation and Deployment (2-3 hours)

### Step 13.1: Run Full Validation on All Modules

**Actions:**
- [ ] Run validator with both layers on all modules:
  ```bash
  python3 validation/api-tracer/cli.py validate \
    --path ~/code/bodhix/testing/perm/ai-mod-stack \
    --all-auth \
    --prefer-terraform
  ```
- [ ] Verify: 0 Layer 1 errors, 0 Layer 2 errors across all 8 modules
- [ ] Document final results

**Expected Output:** Clean validation across all modules

---

### Step 13.2: Update Templates with All Fixes

**Actions:**
- [ ] Verify all permission helpers are in templates
- [ ] Verify all Lambda fixes are in templates
- [ ] Run validation on templates directory
- [ ] Commit: \"feat: complete ADR-019c implementation across all modules\"

**Expected Output:** Templates ready for new projects

---

### Step 13.3: Deploy to Test Project

**Actions:**
- [ ] Deploy all updated Lambdas to test project
- [ ] Run smoke tests on each module
- [ ] Verify no regressions in admin functionality
- [ ] Document any deployment issues

**Expected Output:** Test project fully compliant with ADR-019

---

### Step 13.4: Create Deployment Guide

**Actions:**
- [ ] Document deployment order for existing projects
- [ ] Create migration guide for pm-app
- [ ] Document testing checklist
- [ ] Create rollback plan

**Expected Output:** Safe deployment guide for production

---

## Success Criteria

### Phase Completion (11/13 complete)

- [x] Phase 1: Start Sprint S3
- [x] Phase 2: Enhance Validator Architecture
- [x] Phase 3: Implement Layer 2 Validation
- [x] Phase 4: Run Assessment
- [x] Phase 5: Sprint Scoping Decision
- [x] Phase 6: Implement Core ADR-019c Patterns
- [x] Phase 7: Fix module-ws (2 → 0 errors)
- [x] Phase 8: Fix module-eval (20 → 0 errors)
- [x] Phase 9: Fix module-chat (48 → 0 errors)
- [ ] Phase 10: Fix module-kb (58 errors) - **NEXT**
- [x] Phase 11: Fix module-access (84 → 0 errors)
- [ ] Phase 12: Fix module-voice (100 errors)
- [ ] Phase 13: Final Validation and Deployment

### Overall Sprint Criteria

- [x] Layer 2 validator implemented and integrated
- [x] Baseline assessment documented (312 errors identified)
- [x] Sprint scoping decision made (fix all in S3)
- [x] 4 of 6 modules completed (78% done)
- [ ] All 6 modules with data routes completed
- [ ] Final validation: 0 Layer 1 errors, 0 Layer 2 errors
- [ ] All changes pushed to remote branch ✅
- [ ] Deployment guide created

---

## Next Session

**Focus:** Phase 10 - module-kb (58 errors)

**Steps:**
1. Create `kb_common/permissions.py` with permission helpers
2. Add database RPC functions for kb permissions
3. Update kb-base and kb-document Lambdas with two-step pattern
4. Build, deploy, and validate

**Estimated Time:** 5-6 hours

---

## Rollback Plan

If something goes wrong:
1. Revert validator changes: `git checkout main validation/api-tracer/`
2. Delete branch: `git branch -D auth-standardization-s3`
3. Existing Layer 1 validation continues to work

---

## Related Documents

- [ADR-019c: Resource Permission Authorization](../arch%20decisions/ADR-019c-AUTH-RESOURCE-PERMISSIONS.md)
- [Sprint Management Guide](../guides/guide_SPRINT-MANAGEMENT.md)
- [Context: Auth Standardization](../../memory-bank/context-auth-standardization.md)
- [Session Plan: Phase 11](completed/session_plan_s3-phase11-module-access.md)

---

**Document Status:** 🟡 IN PROGRESS (78% complete)  
**Branch:** `auth-standardization-s3`  
**Sprint:** S3 of Auth Standardization Initiative  
**Last Updated:** 2026-02-02