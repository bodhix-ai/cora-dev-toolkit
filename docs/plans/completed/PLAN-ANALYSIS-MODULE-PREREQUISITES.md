# Plan Analysis: Prerequisites for Module-KB and Module-Chat Implementation

**Date:** January 13, 2026  
**Status:** Analysis Complete  
**Purpose:** Identify which plans must be completed before implementing module-kb and module-chat

---

## Executive Summary

Before implementing module-kb and module-chat, **3 prerequisite plans** must be completed to ensure database structure consistency and development standards compliance. Additionally, **1 completed plan** should be archived.

**Critical Path:**
1. Complete prerequisite plans (6-8 hours total)
2. Archive completed plans
3. Begin module-kb implementation (30-45 hours)
4. Begin module-chat implementation (30-45 hours, depends on module-kb)

---

## Plans Status Overview

| Plan | Status | Priority | Category |
|------|--------|----------|----------|
| plan_navigation-and-roles-implementation.md | ✅ COMPLETE | N/A | Ready to Archive |
| plan_role-column-standardization.md | 📋 Planned | **HIGH** | Prerequisite |
| plan_database-role-column-standardization.md | 📋 Planned | **HIGH** | Prerequisite (duplicate?) |
| plan_enforce-db-naming-standards-in-dev-guide.md | 📋 Planning | **HIGH** | Prerequisite |
| plan_missing-admin-pages-implementation.md | 🟡 Phase 2 Complete | MEDIUM | Parallel Work |
| plan_ai-platform-seeding-strategy.md | 📋 Planning | MEDIUM | Parallel Work |
| plan_module-ui-integration.md | 📋 Planned | MEDIUM | Post-Module Work |
| plan_cognito-external-idp-migration.md | 📋 Planned | LOW | Future Work |
| plan_oidc-provider-multi-env-implementation.md | 📋 Ready | LOW | Future Work |

---

## Completed Plans (Ready to Archive)

### 1. plan_navigation-and-roles-implementation.md

**Status:** ✅ COMPLETE - Ready to Archive  
**Completed:** December 24, 2025

**Summary:** Standardized role values and navigation patterns. All phases complete except Phase 5 testing in test projects.

**Action Required:**
```bash
mkdir -p docs/plans/completed
mv docs/plans/plan_navigation-and-roles-implementation.md docs/plans/completed/
```

---

## High Priority Prerequisites

These plans **MUST** be completed before implementing module-kb and module-chat because they affect database structure and development standards that new modules will depend on.

### 1. plan_role-column-standardization.md ⚠️ CRITICAL

**Status:** 📋 Planned  
**Priority:** HIGH  
**Estimated Effort:** 4-6 hours  
**Blocks:** Module-KB, Module-Chat

**Why This Blocks Module Implementation:**

Module-kb and module-chat will create RLS (Row-Level Security) policies that reference role columns:
- `user_profiles.global_role` → needs to become `sys_role`
- `org_members.role` → needs to become `org_role`

If we implement modules before this change:
- RLS policies will reference old column names
- When we standardize columns, we'll have to update ALL module RLS policies
- Risk of breaking existing modules

**Changes Required:**
- Database: Rename `global_role` → `sys_role`, `role` → `org_role`
- Backend: Update 6+ Lambda functions
- Frontend: Update 8+ TypeScript files
- RLS Policies: Update all policies referencing these columns

**Dependencies:**
- Role value standardization (already complete from Phase A+B)

**Action Required:**
- Complete this plan BEFORE starting module-kb or module-chat

---

### 2. plan_database-role-column-standardization.md ⚠️ DUPLICATE?

**Status:** 📋 Planned - Tech Debt  
**Priority:** HIGH  
**Estimated Effort:** 6-8 hours

**Analysis:**

This plan appears to be a **duplicate or closely related** to `plan_role-column-standardization.md`. Both plans address the same issue:
- Standardizing role column names
- `global_role` → `sys_role` (or `platform_role` in some versions)
- `role` → `org_role`

**Recommendation:**
1. Compare both plans in detail
2. Merge into single authoritative plan
3. Choose consistent naming: `sys_role` vs `platform_role`
4. Delete duplicate plan

**Action Required:**
- Review both plans to identify differences
- Consolidate into single plan
- Choose final naming convention (`sys_role` recommended per .clinerules)

---

### 3. plan_enforce-db-naming-standards-in-dev-guide.md ⚠️ CRITICAL

**Status:** 📋 Planning  
**Priority:** HIGH  
**Estimated Effort:** 5.75 hours  
**Blocks:** All future module development

**Why This Blocks Module Implementation:**

The module development guide is used to create new modules. If AI agents follow outdated guidance:
- Tables will be created with wrong naming (singular instead of plural)
- Prefix abbreviations won't be used correctly (e.g., `workspace_members` instead of `ws_members`)
- Namespace prefixes won't follow standards (e.g., `platform_*`, `system_*`)

**Changes Required:**
- Phase 1: Update prerequisites section (30 min)
- Phase 2: Update entity identification section (45 min)
- Phase 3: Add compliance checkpoint (30 min)
- Phase 4: Update schema templates (1 hour)
- Phase 5: Create validation script (2 hours)
- Phase 6: Update AI prompting templates (45 min)
- Phase 7: Update documentation links (15 min)

**Impact if Skipped:**
- Module-kb and module-chat will have non-compliant table names
- Will require refactoring after implementation
- Wastes 10-20 hours fixing issues retroactively

**Action Required:**
- Complete this plan BEFORE starting module-kb or module-chat
- Validation script will catch violations automatically

---

## Medium Priority (Parallel Work)

These plans can be worked on in parallel with module implementation or completed after modules are done.

### 4. plan_missing-admin-pages-implementation.md

**Status:** 🟡 Phase 2 Complete  
**Priority:** MEDIUM  
**Estimated Effort:** 2-3 hours remaining (Phase 3)

**Summary:** 
- Phase 0 complete (infrastructure)
- Phase 1 complete (AI Enablement)
- Phase 2 complete (Access Control)
- Phase 3 pending (Platform Management)

**Why Not Blocking:**
- Module-kb and module-chat don't depend on admin page structure
- Admin cards can be added after modules exist
- Phase 3 is independent of module work

**Recommendation:**
- Can be done in parallel with module work
- Or completed after module-kb/chat Phase 1-2

---

### 5. plan_ai-platform-seeding-strategy.md

**Status:** 📋 Planning  
**Priority:** MEDIUM  
**Estimated Effort:** 20+ hours (4 weeks)

**Summary:** Seed platform AI configuration and provider credentials

**Why Not Blocking:**
- Module-kb uses module-ai for embedding configuration
- Module-ai already has the API endpoints module-kb needs
- Seeding is about initial data, not API structure

**Recommendation:**
- Can be done in parallel
- Not blocking module implementation

---

### 6. plan_module-ui-integration.md

**Status:** 📋 Planned - Not Started  
**Priority:** MEDIUM  
**Estimated Effort:** 3-4 hours

**Summary:** Dynamic navigation system to load modules from registry

**Why Not Blocking:**
- This is about dynamically loading module navigation
- Modules can work without it (using hardcoded nav temporarily)
- Can be implemented after modules exist

**Recommendation:**
- Do AFTER module-kb and module-chat are complete
- Having real modules makes this easier to test

---

## Low Priority (Future Work)

These plans are not prerequisites and can be completed much later.

### 7. plan_cognito-external-idp-migration.md

**Status:** 📋 Planned  
**Priority:** LOW  
**Timeline:** 20 days (4 weeks)

**Summary:** Migrate from Clerk to Cognito as default authentication provider

**Why Not Blocking:**
- Authentication is independent of module functionality
- Modules work with any auth provider

**Recommendation:**
- Future enhancement
- Not blocking module work

---

### 8. plan_oidc-provider-multi-env-implementation.md

**Status:** 📋 Ready for Implementation  
**Priority:** LOW  
**Estimated Effort:** 4-6 hours

**Summary:** Multi-environment OIDC provider architecture

**Why Not Blocking:**
- Infrastructure deployment pattern
- Doesn't affect module code

**Recommendation:**
- Implement when deploying to multiple environments
- Not needed for development/testing

---

## Recommended Implementation Order

### Phase 1: Prerequisites (Must Complete First)

**Duration:** 1-2 days (6-8 hours total)

1. **Resolve Role Column Naming Conflict** (1 hour)
   - Compare `plan_role-column-standardization.md` and `plan_database-role-column-standardization.md`
   - Merge into single authoritative plan
   - Decide: `sys_role` vs `platform_role` (recommend `sys_role` per .clinerules)

2. **Complete Database Role Column Standardization** (4-6 hours)
   - Execute merged plan
   - Update database schema
   - Update all backend code
   - Update all frontend code
   - Test thoroughly

3. **Complete Database Naming Standards Enforcement** (5.75 hours)
   - Update module development guide
   - Create validation script
   - Update AI prompting templates
   - Test with sample module creation

4. **Archive Completed Plans** (5 minutes)
   ```bash
   mkdir -p docs/plans/completed
   mv docs/plans/plan_navigation-and-roles-implementation.md docs/plans/completed/
   ```

**Validation Checkpoint:**
- [ ] All role columns renamed and tested
- [ ] Module development guide updated
- [ ] Validation script passes on existing modules
- [ ] AI prompting templates reference standards

---

### Phase 2: Module Implementation (After Prerequisites)

**Duration:** 8-12 weeks (144-190 hours total)

1. **Module-KB Implementation** (10-15 sessions, ~30-45 hours)
   - Follow `plan_module-kb-implementation.md`
   - 12 phases from specification to documentation
   - Database schema will use new naming standards
   - RLS policies will reference new role columns

2. **Module-Chat Implementation** (10-15 sessions, ~30-45 hours)
   - Follow `plan_module-chat-implementation.md`
   - 13 phases from specification to documentation
   - Depends on module-kb for RAG integration
   - Database schema will use new naming standards

**Dependencies:**
- Module-Chat Phase 7+ requires Module-KB Phase 12 (integration)

---

### Phase 3: Parallel/Future Work (Can Be Done Anytime)

**No specific order required:**

- Complete `plan_missing-admin-pages-implementation.md` Phase 3
- Complete `plan_ai-platform-seeding-strategy.md`
- Complete `plan_module-ui-integration.md` (after modules exist)
- Consider `plan_cognito-external-idp-migration.md` (future)
- Consider `plan_oidc-provider-multi-env-implementation.md` (when needed)

---

## Risk Assessment

### High Risk: Skipping Prerequisites

**If we implement modules before completing prerequisites:**

1. **Wrong Column Names in RLS Policies**
   - Module-kb and module-chat will reference `global_role` instead of `sys_role`
   - When we standardize, all RLS policies break
   - Estimated fix time: 4-8 hours per module

2. **Non-Compliant Table Names**
   - AI agents create tables like `workspace_member` (singular)
   - Must refactor after implementation
   - Database migrations required
   - Estimated fix time: 10-20 hours

3. **Inconsistent Naming Across Modules**
   - Some modules use `sys_role`, others use `global_role`
   - Mixed naming conventions in codebase
   - Maintenance nightmare

**Total Risk:** 14-28 hours of rework if prerequisites skipped

**Mitigation:** Complete prerequisites first (6-8 hours investment)

**ROI:** Saves 8-20 hours of rework

---

## Action Items

### Immediate (This Week)

- [x] **Action 1:** Review and merge duplicate role column standardization plans ✅ *Completed Session 122*
- [x] **Action 2:** Complete database role column standardization (4-6 hours) ✅ *Completed Session 122*
  - Role columns already standardized: `sys_role` (user_profiles), `org_role` (org_members)
  - Backend code updated: invites Lambda now uses `org_role`
  - Frontend code updated: OrgMembersTab uses `orgRole` field
  - Transform utilities added to org_common layer with standard field mappings
- [ ] **Action 3:** Complete database naming standards enforcement (5.75 hours)
- [x] **Action 4:** Archive completed navigation plan ✅ *Moved to completed/*
- [ ] **Action 5:** Validate prerequisites with test module creation

### Next Week

- [ ] **Action 6:** Begin Module-KB Phase 1 (Foundation & Specification)
- [ ] **Action 7:** Create test project to validate standards compliance

### Following Weeks

- [ ] Continue Module-KB implementation (Phases 2-12)
- [ ] Begin Module-Chat implementation (after Module-KB Phase 12)

---

## Success Criteria

**Prerequisites Complete When:**
- [x] All role columns renamed (`sys_role`, `org_role`) ✅ *Already in DB schema*
- [x] All code updated to use new column names ✅ *Session 122 - Invites, OrgMembers, Transform utilities*
- [ ] Module development guide enforces naming standards
- [ ] Validation script passes on all existing modules
- [ ] Test module creation follows all standards
- [x] Navigation plan archived in completed/ ✅

**Ready for Module Implementation When:**
- [ ] All success criteria above met
- [ ] No blocking validation errors
- [ ] Team trained on new standards
- [ ] Documentation updated

---

## Conclusion

**Do NOT start module-kb or module-chat implementation until:**
1. Role column standardization is complete
2. Database naming standards are enforced in dev guide
3. Validation scripts pass

**Estimated timeline:**
- Prerequisites: 1-2 days (6-8 hours)
- Module-KB: 10-15 sessions (~30-45 hours)
- Module-Chat: 10-15 sessions (~30-45 hours)
- **Total:** ~12 weeks for complete implementation

**Critical path:** Prerequisites → Module-KB → Module-Chat

**Risk of skipping prerequisites:** 14-28 hours of rework

**ROI of completing prerequisites:** Saves 8-20 hours of future work

---

**Status:** 🟡 In Progress (60% Complete)  
**Next Step:** Complete Action Item 3 (database naming standards enforcement)  
**Updated:** January 13, 2026, 10:45 PM EST

---

## Session 122 Progress (January 13, 2026)

**Completed:**
- ✅ Role column standardization verified - `sys_role` and `org_role` already in use
- ✅ Backend code using correct column names (fixed invites Lambda: `role` → `org_role`)
- ✅ Frontend code using correct field names (OrgMembersTab: `orgRole`)
- ✅ Added shared transform utilities to org_common layer with standard field mappings
- ✅ Navigation plan archived to `docs/plans/completed/`

**Remaining:**
- Database naming standards enforcement in module development guide
- Validation script for naming compliance
- Test module creation to verify standards
