# Plan: S2 - Auth Standardization & Error Fixes

**Initiative:** Auth Standardization  
**Sprint:** S2  
**Branch:** `auth-standardization-s2`  
**Created:** January 31, 2026  
**Status:** 🟡 IN PROGRESS  
**Context:** `memory-bank/context-auth-standardization.md`  
**Parent Plan:** `docs/plans/completed/plan_s1-auth-standardization.md`

---

## Sprint Goal

Fix remaining auth validation errors across all CORA modules using ADR-019 standard patterns.

**Duration:** 8-12 hours estimated  
**Priority:** P0 - Foundation for all future auth work

---

## Prerequisites (from S1)

- [x] Comprehensive validation suite (api-tracer with auth + code quality checks)
- [x] Full documentation (ADR-019, ADR-019a, ADR-019b)
- [x] org-common helper functions in templates
- [x] Validation baseline documented (1020 issues across 8 modules)
- [x] module-chat: 0 errors (fixed in S1)

---

## Scope

### In Scope
- Fix 41 remaining auth errors across 7 modules
- Investigate 679 key_consistency errors (determine if action needed)
- Run final validation to confirm fixes
- Deploy org-common layer updates to dev environment

### Out of Scope
- Deprecating standalone validators (low priority)
- Fixing 31 import signature errors (investigate first)

---

## Validation Baseline (from S1)

**Test Project:** ai-mod-stack  
**Total Remaining Auth Errors:** 41

| Module | Auth Errors | Details |
|--------|-------------|---------|
| module-voice | 11 | 4 check_org_admin, 4 org_context, 1 useRole, 2 check_sys_admin |
| module-ai | 8 | 2 check_sys_admin, 2 check_org_admin, 4 org_context_extraction |
| module-ws | 6 | 3 useRole (frontend), 2 org_context (frontend), 1 org_context_extraction |
| module-access | 6 | 2 check_sys_admin, 2 check_org_admin, 2 org_context_extraction |
| module-kb | 5 | 1 useRole (frontend), 4 org_context_extraction |
| module-eval | 3 | 1 useRole (frontend), 2 org_context_extraction |
| module-mgmt | 2 | 2 org_context_extraction |
| **Total** | **41** | |

---

## Implementation Plan

### Phase 1: Deploy org-common Layer
**Status:** ⚪ Pending  
**Time:** 1-2 hours

- [ ] Step 1.1: Follow `docs/guides/guide_ADR-019-SAFE-DEPLOYMENT.md`
- [ ] Step 1.2: Run database migration `20260130_adr019_auth_rpcs.sql`
- [ ] Step 1.3: Rebuild org-common layer
- [ ] Step 1.4: Deploy to dev environment
- [ ] Step 1.5: Verify layer available in Lambda console

### Phase 2: Fix Auth Errors by Module
**Status:** ⚪ Pending  
**Time:** 4-6 hours

#### 2A: module-voice (11 errors)
- [ ] Fix frontend page.tsx - add useRole()
- [ ] Fix voice-configs Lambda - add check_org_admin() (4 handlers)
- [ ] Fix voice-configs Lambda - add get_org_context_from_event() (4 handlers)
- [ ] Fix voice-credentials Lambda - add check_sys_admin() (2 handlers)

#### 2B: module-ai (8 errors)
- [ ] Fix ai-config Lambda - add check_sys_admin() (2 handlers)
- [ ] Fix ai-config Lambda - add check_org_admin() (2 handlers)
- [ ] Fix ai-config Lambda - add get_org_context_from_event() (4 handlers)

#### 2C: module-ws (6 errors)
- [ ] Fix 3 admin pages - add useRole()
- [ ] Fix 2 admin pages - add useOrganizationContext()
- [ ] Fix workspaces Lambda - add get_org_context_from_event() (1 handler)

#### 2D: module-access (6 errors)
- [ ] Fix orgs Lambda - add check_sys_admin() (2 handlers)
- [ ] Fix users Lambda - add check_org_admin() (2 handlers)
- [ ] Fix Lambda - add get_org_context_from_event() (2 handlers)

#### 2E: module-kb (5 errors)
- [ ] Fix frontend page.tsx - add useRole()
- [ ] Fix kb-base Lambda - add get_org_context_from_event() (4 handlers)

#### 2F: module-eval (3 errors)
- [ ] Fix frontend page.tsx - add useRole()
- [ ] Fix eval Lambda - add get_org_context_from_event() (2 handlers)

#### 2G: module-mgmt (2 errors)
- [ ] Fix mgmt Lambda - add get_org_context_from_event() (2 handlers)

### Phase 3: Investigate key_consistency Errors
**Status:** ⚪ Pending  
**Time:** 1-2 hours

- [ ] Step 3.1: Analyze sample of 679 key_consistency errors
- [ ] Step 3.2: Determine if snake_case → camelCase migration needed
- [ ] Step 3.3: Or determine if these are false positives (config for internal keys)
- [ ] Step 3.4: Create plan for addressing (if needed)

### Phase 4: Final Validation
**Status:** ⚪ Pending  
**Time:** 1 hour

- [ ] Step 4.1: Run full api-tracer validation on templates
- [ ] Step 4.2: Verify all auth errors fixed
- [ ] Step 4.3: Document any remaining issues
- [ ] Step 4.4: Create PR for S2

---

## Session History

### Session 1 (Upcoming)
**Focus:** TBD

---

## Success Criteria

- [ ] 0 auth errors across all modules
- [ ] org-common layer deployed to dev
- [ ] key_consistency errors investigated and plan created
- [ ] All templates pass validation

---

## Time Tracking

| Phase | Estimated | Actual | Status |
|-------|-----------|--------|--------|
| Phase 1: Deploy Layer | 1-2h | - | ⚪ Pending |
| Phase 2: Fix Errors | 4-6h | - | ⚪ Pending |
| Phase 3: Investigate | 1-2h | - | ⚪ Pending |
| Phase 4: Validation | 1h | - | ⚪ Pending |
| **Total** | **8-12h** | **-** | **-** |

---

**Next Steps:** 
1. Create branch `auth-standardization-s2`
2. Follow org-common deployment guide
3. Begin fixing errors by module