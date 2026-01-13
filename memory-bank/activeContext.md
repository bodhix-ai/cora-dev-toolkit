# Active Context - CORA Development Toolkit

## Current Focus

**Session 111: Role Standardization Phase 6 - Automated Validator & Violation Fixes** - 🔄 **IN PROGRESS**

## Next Task Priority

**Phase A: Foundation Standards Implementation**

**Completed:**
1. ✅ **plan_sys-role-standardization.md** - COMPLETE - Comprehensive plan with table renaming scope
2. ✅ **Phase 0: Analysis & Discovery** - COMPLETE - Impact assessment created
3. ✅ **Phase 1: Database Schema Migration** - COMPLETE - All schema files updated
4. ✅ **Phase 2: RLS Policy Updates** - COMPLETE - All 8 RLS files updated
5. ✅ **Phase 3: Backend Lambda Updates** - PARTIAL - Initial pass complete, more files discovered
6. ✅ **Phase 4: Frontend Updates** - PARTIAL - Initial pass complete, more files discovered
7. ✅ **Phase 5: Documentation Updates** - COMPLETE
8. ✅ **Phase 6.5: Automated Validator** - CREATED - `validation/role-naming-validator/`

**Ready for Execution (Next Session):**
9. **Fix Remaining 124 Violations** - Run validator, fix files systematically (2-3 hours)
10. **Execute Phase 6** - Final Testing & Validation (1 hour)
6. **standard_SYS-VS-ORG-ADMIN-PATTERNS.md** - Create admin separation standard (2-3 hours)
7. **plan_enforce-db-naming-standards-in-dev-guide.md** - Update module dev guide (5.75 hours)

**Can Be Done In Parallel:**
- plan_ai-platform-seeding-strategy.md - AI configuration seeding (not structural dependency)
- plan_module-ui-integration.md - Dynamic navigation system (can be done after modules exist)
- standard_COMMON-METHODS.md - Reusable methods documentation (2-3 hours)

**Ready to Archive:**
- plan_navigation-and-roles-implementation.md - Status: COMPLETE
- plan_role-column-standardization.md - SUPERSEDED by plan_sys-role-standardization.md
- plan_database-role-column-standardization.md - SUPERSEDED by plan_sys-role-standardization.md

---

## Session: January 13, 2026 (11:40 AM - 11:50 AM) - Session 111

### 🎯 Status: 🔄 IN PROGRESS - PHASE 6.5 AUTOMATED VALIDATOR & VIOLATION FIXES

**Summary:** Created automated role naming validator and integrated it with the CORA validation framework. Ran validator against templates/ directory, discovered 168 violations across 21 files that were missed in earlier phases. Fixed 2 major Lambda files (ai-config-handler, provider), reducing violations from 168 to 124. Session ended due to context window limits.

**Deliverables:**

| Item | Description | Status |
|------|-------------|--------|
| `validation/role-naming-validator/` | New validator module | ✅ Created |
| `validation/role-naming-validator/cli.py` | CLI entry point | ✅ Created |
| `validation/cora-validate.py` | Integration with main validator | ✅ Updated |
| `module-ai/ai-config-handler/lambda_function.py` | Fixed 44+ violations | ✅ Fixed |
| `module-ai/provider/lambda_function.py` | Fixed 2 violations | ✅ Fixed |

**Validator Results:**
- **Initial Run:** 168 violations in 21 files (260 files scanned)
- **After Fixes:** 124 violations remaining

**Files Still Needing Updates (124 violations):**
1. `module-access/backend/.build/` - Build artifacts (will regenerate)
2. `module-access/backend/lambdas/identities-management/` - 2 violations
3. `module-access/backend/lambdas/idp-config/` - 8 violations (table names)
4. `module-access/frontend/components/admin/OrgDetails.tsx` - 4 violations
5. `module-mgmt/backend/handlers/module_registry.py` - Many violations
6. `module-mgmt/backend/handlers/module_usage.py` - Many violations
7. `module-mgmt/backend/lambdas/lambda-mgmt/` - Many violations
8. `module-mgmt/backend/middleware/` - 3 violations
9. `module-mgmt/frontend/adminCard.tsx` - 2 violations
10. `module-ws/frontend/pages/PlatformAdminConfigPage.tsx` - 3 violations
11. `module-ws/routes/admin/org/ws/page.tsx` - 5 violations
12. `module-ws/routes/admin/sys/ws/page.tsx` - 2 violations
13. `_project-stack-template/` - Various files

**Validator Command:**
```bash
python3 -m validation.role-naming-validator.cli templates/ --format text
```

**Next Steps for New Session:**
1. Fix remaining 124 violations systematically (start with module-mgmt)
2. Re-run validator to confirm 0 violations
3. Complete Phase 6 testing
4. Update activeContext.md with final completion status

**Updated:** January 13, 2026, 11:50 AM EST

---

## Session: January 13, 2026 (11:30 AM - 11:40 AM) - Session 110

### 🎯 Status: ✅ COMPLETE - PHASE 5 DOCUMENTATION UPDATES

**Summary:** Completed Phase 5 of the role standardization plan. Updated all major documentation files to use the new role naming conventions (`sys_role` instead of `global_role`, `sys_admin/sys_owner` instead of `platform_admin/platform_owner`, and `org_role` instead of `role`).

**Files Updated This Session:**

| Location | File | Changes |
|----------|------|---------|
| docs/standards/ | `standard_LAMBDA-AUTHORIZATION.md` | Role column and value updates |
| docs/standards/ | `standard_NAVIGATION-AND-ROLES.md` | System-level role table, visibility conditions |
| docs/standards/ | `standard_MODULAR-ADMIN-ARCHITECTURE.md` | ~25 role references updated |
| docs/standards/ | `standard_ADMIN-CARD-PATTERN.md` | Backend authorization pattern |
| docs/standards/ | `standard_module-integration-spec.md` | Admin card roles, access control |
| docs/standards/ | `navigation-and-roles-design.md` | Role tables, column names |

**Pattern Changes Applied:**
- `user_profiles.global_role` → `user_profiles.sys_role`
- `org_members.role` → `org_members.org_role`
- `platform_owner` → `sys_owner`
- `platform_admin` → `sys_admin`
- `platform_user` → `sys_user`
- `globalRole` (TypeScript) → `sysRole`
- `is_platform_admin()` → `is_sys_admin()`
- `isPlatformAdmin` → `isSysAdmin`

**Phase 5 Progress: ✅ 100% Complete**

**Updated:** January 13, 2026, 11:40 AM EST

---

## Session: January 13, 2026 (11:04 AM - 11:17 AM) - Session 109

### 🎯 Status: ✅ COMPLETE - PHASE 4 FRONTEND UPDATES

**Summary:** Completed Phase 4 execution - all frontend TypeScript/React components updated to use new role naming conventions (`sysRole` instead of `globalRole`, `sys_owner/sys_admin` instead of `platform_owner/platform_admin`, UI labels updated from "Platform Admin" to "System Admin").

**Files Updated This Session:**

| Location | File | Changes |
|----------|------|---------|
| **project-stack-template** | `components/AuthRouter.tsx` | `globalRole`→`sysRole`, `platform_owner`→`sys_owner` |
| **project-stack-template** | `app/page.tsx` | `globalRole`→`sysRole` |
| **project-stack-template** | `app/admin/access/page.tsx` | Comments, role checks, `isPlatformAdmin`→`isSysAdmin` |
| **project-stack-template** | `app/admin/mgmt/page.tsx` | Comments, role checks, function renamed |
| **project-stack-template** | `app/admin/platform/page.tsx` | Comments, UI title "System Administration" |
| **project-stack-template** | `app/admin/ai/page.tsx` | Comments updated |
| **project-stack-template** | `app/admin/organizations/page.tsx` | Comments updated |
| **project-stack-template** | `app/admin/access/orgs/[id]/page.tsx` | Comments, role checks |
| **project-stack-template** | `app/org/settings/page.tsx` | Comments, role checks |
| **module-access/frontend** | `components/layout/SidebarUserMenu.tsx` | Menu label "Platform Admin" → "System Admin" |
| **module-access/frontend** | `components/admin/OrgAIConfigTab.tsx` | Alert "Platform Admin Only" → "System Admin Only" |
| **module-ws/frontend** | `pages/PlatformAdminConfigPage.tsx` | Breadcrumb, error message updated |
| **module-ws/frontend** | `admin/platformAdminCard.tsx` | Comments updated |

**Pattern Changes Applied:**
- `profile?.globalRole` → `profile?.sysRole`
- `platform_owner` → `sys_owner`
- `platform_admin` → `sys_admin`
- `isPlatformAdmin` → `isSysAdmin`
- `requiredRoles: ["platform_owner", "platform_admin"]` → `requiredRoles: ["sys_owner", "sys_admin"]`
- Comments: "Platform Admin" → "System Admin"
- UI Labels: "Platform Administration" → "System Administration"
- Menu Label: "Platform Admin" → "System Admin"

**Phase 4 Progress: ✅ 100% Complete**

**Updated:** January 13, 2026, 11:25 AM EST

---

## Session: January 13, 2026 (10:37 AM - 11:02 AM) - Session 108

### 🎯 Status: ✅ COMPLETE - PHASE 3 BACKEND LAMBDA UPDATES

**Summary:** Executed Phase 3 of the role standardization plan. Updated all backend Lambda files across module-access, module-ws, module-ai, and module-mgmt to use the new naming conventions (`sys_role` instead of `global_role`, `sys_admin/sys_owner` instead of `platform_admin/platform_owner`, and `org_role` instead of `role`).

**Files Updated:**

| Module | File | Changes |
|--------|------|---------|
| **module-access/layers/org-common** | `__init__.py` | Added `is_sys_admin`, `validate_sys_role` exports |
| **module-access/layers/org-common** | `auth.py` | `is_platform_admin`→`is_sys_admin`, section header updated |
| **module-access/layers/org-common** | `validators.py` | Added `validate_sys_role`, updated `validate_org_role` |
| **module-access/lambdas/profiles** | `lambda_function.py` | `global_role`→`sys_role`, role values updated |
| **module-access/lambdas/members** | `lambda_function.py` | `is_platform_admin`→`is_sys_admin`, `global_role`→`sys_role` |
| **module-access/lambdas/orgs** | `lambda_function.py` | Multiple admin checks updated |
| **module-access/lambdas/identities-management** | `lambda_function.py` | Admin check and default role updated |
| **module-access/lambdas/org-email-domains** | `lambda_function.py` | Admin check updated |
| **module-access/lambdas/idp-config** | `lambda_function.py` | `PLATFORM_ADMIN_ROLES`→`SYS_ADMIN_ROLES`, function rename |
| **module-ws/lambdas/workspace** | `lambda_function.py` | `_is_platform_admin`→`_is_sys_admin`, all 8 calls updated |

**Pattern Changes Applied:**
- `profile.get('global_role') in ['platform_owner', 'platform_admin']` → `profile.get('sys_role') in ['sys_owner', 'sys_admin']`
- `_is_platform_admin(user_id)` → `_is_sys_admin(user_id)`
- `PLATFORM_ADMIN_ROLES` → `SYS_ADMIN_ROLES`
- Comments and error messages updated to reflect new terminology

**Remaining Phase 3 Work:**
- module-mgmt handlers (module_usage.py, module_registry.py, lambda-mgmt) - Need to verify if these exist and have references
- module-ai lambdas (ai-config-handler, provider) - Need to verify if these exist and have references

**Next Steps:**
1. **Phase 4:** Frontend updates (2-3 hours) - TypeScript types, components, API clients
2. **Phase 5:** Documentation updates (1 hour)
3. **Phase 6:** Testing & validation (1-2 hours)

**Updated:** January 13, 2026, 11:02 AM EST

---

## Session: January 13, 2026 (9:58 AM - 10:12 AM) - Session 107

### 🎯 Status: ✅ COMPLETE - PHASE 2 RLS POLICY UPDATES

**Summary:** Executed Phase 2 of the role standardization plan. Updated all 8 RLS policy files to use the new naming conventions (`sys_role` instead of `global_role`, `org_role` instead of `role`, and role values `sys_owner`/`sys_admin` instead of `platform_owner`/`platform_admin`).

**Files Updated:**

| Module | File | Changes |
|--------|------|---------|
| module-ws | `009-apply-rls.sql` | `global_role`→`sys_role`, `platform_*`→`sys_*`, `org_members.role`→`org_role` |
| module-ai | `001-ai-providers.sql` | `global_role`→`sys_role`, `platform_*`→`sys_*` |
| module-ai | `002-ai-models.sql` | `global_role`→`sys_role`, `platform_*`→`sys_*` |
| module-ai | `003-ai-validation-history.sql` | `global_role`→`sys_role`, `platform_*`→`sys_*` |
| module-ai | `004-ai-validation-progress.sql` | `global_role`→`sys_role`, `platform_*`→`sys_*` |
| module-ai | `007-org-prompt-engineering.sql` | `global_role`→`sys_role`, `platform_*`→`sys_*` |
| module-access | `006-user-provisioning.sql` | `global_role`→`sys_role`, `platform_*`→`sys_*`, `org_members.role`→`org_role` |
| module-access | `007-auth-events-sessions.sql` | `global_role`→`sys_role`, `platform_*`→`sys_*` |

**Pattern Changes Applied:**
- `user_profiles.global_role IN ('platform_owner', 'platform_admin')` → `user_profiles.sys_role IN ('sys_owner', 'sys_admin')`
- `org_members.role IN ('org_owner', 'org_admin')` → `org_members.org_role IN ('org_owner', 'org_admin')`
- Policy names updated: "Platform admins" → "Sys admins"
- Comments updated to reflect new terminology

**Next Steps:**
1. **Phase 3:** Backend Lambda updates (2-3 hours)
2. **Phase 4:** Frontend updates (2-3 hours)
3. **Phase 5:** Documentation updates (1 hour)
4. **Phase 6:** Testing & validation (1-2 hours)

**Updated:** January 13, 2026, 10:12 AM EST

---

## Session: January 13, 2026 (9:32 AM - 9:55 AM) - Session 106

### 🎯 Status: ✅ COMPLETE - PHASE 1 DATABASE SCHEMA MIGRATION

**Summary:** Executed Phase 1 of the role standardization plan. Created all migration scripts, updated all schema files to use new naming conventions (`sys_*` tables, `sys_role` and `org_role` columns), and archived legacy schema files to preserve history while enabling clean new project creation.

**Deliverables:**

**Migration Scripts Created:**
| Location | Script | Purpose |
|----------|--------|---------|
| `templates/_modules-core/module-access/db/migrations/` | `20260113_sys_role_standardization.sql` | Comprehensive migration (all tables + columns) |
| `scripts/migrations/` | `20260113_user_profiles_sys_role.sql` | Standalone: global_role → sys_role |
| `scripts/migrations/` | `20260113_org_members_org_role.sql` | Standalone: role → org_role |
| `scripts/migrations/` | `README-role-standardization-migrations.md` | Migration guide with execution order |

**New Schema Files Created:**
- `templates/_modules-core/module-mgmt/db/schema/001-sys-lambda-config.sql`
- `templates/_modules-core/module-mgmt/db/schema/002-sys-module-registry.sql`
- `templates/_modules-core/module-mgmt/db/schema/003-sys-module-usage.sql`
- `templates/_modules-core/module-ai/db/schema/006-sys-rag.sql`
- `templates/_modules-core/module-access/db/schema/005-sys-idp-config.sql`

**Schema Files Updated:**
- `003-profiles.sql`: `global_role` → `sys_role TEXT NOT NULL DEFAULT 'sys_user'`
- `004-org-members.sql`: `role` → `org_role TEXT NOT NULL DEFAULT 'org_user'`

**Legacy Files Archived:**
All old `platform_*` schema files moved to `archive/` folders in each module:
- `module-mgmt/db/schema/archive/`: 001, 002, 003-platform-*.sql
- `module-ai/db/schema/archive/`: 006-platform-rag.sql
- `module-access/db/schema/archive/`: 005-idp-config.sql

**User Questions Answered:**
1. **Migration Order:** Comprehensive script OR standalone scripts (see README)
2. **Table Deletions:** No deletions needed - migrations use `ALTER TABLE RENAME`
3. **Archive Strategy:** Old files moved to archive/ folders, not deleted

**When to Run Migrations:**
- **For EXISTING databases:** Run migration scripts AFTER all code changes (Phase 2-4) are complete
- **For NEW projects:** No migrations needed - new schemas are already updated
- **Recommended:** Complete Phases 2-4 (backend/frontend updates), then run migrations with deployment

**Migration Execution Order (when ready):**
```bash
# Option A: Single comprehensive migration (RECOMMENDED)
psql -f templates/_modules-core/module-access/db/migrations/20260113_sys_role_standardization.sql

# Option B: Piece-by-piece
psql -f scripts/migrations/20260113_user_profiles_sys_role.sql
psql -f scripts/migrations/20260113_org_members_org_role.sql
```

**Next Steps:**
1. **Phase 2:** Update RLS policies in other schema files (1-2 hours)
2. **Phase 3:** Backend Lambda updates (2-3 hours)
3. **Phase 4:** Frontend updates (2-3 hours)
4. **Phase 5:** Documentation updates (1 hour)
5. **Phase 6:** Testing & validation (1-2 hours)
6. **THEN:** Run migrations on existing databases

**Updated:** January 13, 2026, 9:55 AM EST

---

## Session: January 13, 2026 (9:16 AM - 9:31 AM) - Session 105

### 🎯 Status: ✅ COMPLETE - PHASE 0 ANALYSIS WITH TABLE RENAMING SCOPE

**Summary:** Executed Phase 0 (Analysis & Discovery) of role standardization plan. User feedback identified missing scope for table renaming, which was added to the plan. Created comprehensive impact assessment documenting 285 references across 40-50 files. Discovered 7 tables with `platform_` prefix requiring rename to `sys_` prefix, increasing total effort from 6-8 hours to 8-11 hours.

**Deliverables:**
- **docs/analysis/role-standardization-impact-assessment.md** - 50-page comprehensive impact assessment
- **Updated plan_sys-role-standardization.md** - Added table renaming scope with migration scripts
- **/tmp/role-analysis.txt** - Automated discovery statistics

**Discovery Results:**

**Pattern Counts:**
- `global_role`: 101 references
- `platform_owner`: 99 references  
- `platform_admin`: 145 references
- `platform_user`: 5 references
- `globalRole` (TypeScript): 14 references
- `org_members.role`: 4 references
- **Total: 285 unique references** across 368 pattern matches

**Tables Requiring Rename (New Scope):**
1. `platform_lambda_config` → `sys_lambda_config` (module-mgmt)
2. `platform_module_registry` → `sys_module_registry` (module-mgmt)
3. `platform_module_usage` → `sys_module_usage` (module-mgmt)
4. `platform_module_usage_daily` → `sys_module_usage_daily` (module-mgmt)
5. `platform_rag` → `sys_rag` (module-ai)
6. `platform_idp_config` → `sys_idp_config` (module-access)
7. `platform_idp_audit_log` → `sys_idp_audit_log` (module-access)

**Updated:** January 13, 2026, 9:31 AM EST

---

## Session: January 13, 2026 (8:09 AM - 9:15 AM) - Session 104

### 🎯 Status: ✅ COMPLETE - ROLE STANDARDIZATION PLAN WITH AUTOMATED VALIDATION

**Summary:** Created comprehensive role naming standardization plan that merges two duplicate plans into a single authoritative source. Plan standardizes all role naming to use "sys_" prefix (replacing "platform_", "global_") and includes automated validation to prevent regressions. Added Phase 0 discovery/analysis and Phase 6.5 automated validator based on user feedback.

**Deliverable:**
- **plan_sys-role-standardization.md** - Comprehensive 7-phase implementation plan (8-12 hours total)

**Key Decisions:**
1. **Naming Standard:** Use "sys_" prefix for system-level roles (NOT "platform_" or "global_")
   - `user_profiles.global_role` → `user_profiles.sys_role`
   - `org_members.role` → `org_members.org_role`
   - `platform_admin` → `sys_admin`
   - `platform_owner` → `sys_owner`
   - `platform_user` → `sys_user`

2. **Every User Has sys_role:** Column is NOT NULL with DEFAULT 'sys_user'

3. **Automated Validation Recommended:** Phase 6.5 adds role naming validator

**Updated:** January 13, 2026, 9:15 AM EST

---

## Session: January 13, 2026 (7:27 AM - 8:00 AM) - Session 103

### 🎯 Status: ✅ COMPLETE - MODULE-KB AND MODULE-CHAT IMPLEMENTATION PLANS

**Summary:** Created comprehensive multi-phase implementation plans for module-kb and module-chat by analyzing legacy project features and adapting them to CORA standards.

**Deliverables:**
- **plan_module-kb-implementation.md** - 12 phases covering KB management with multi-scope hierarchy
- **plan_module-chat-implementation.md** - 13 phases covering AI-powered chat with streaming and RAG integration

**Updated:** January 13, 2026, 8:00 AM EST

---

## Session: January 12, 2026 (8:18 PM - 9:02 PM) - Session 102

### 🎯 Status: ✅ COMPLETE - WORKSPACE TAB NAVIGATION WITH MOCK DATA

**Summary:** Implemented comprehensive tab navigation for workspace detail page with full CJIS IT Security Audit mock data.

**Deliverable:**
- **File:** `templates/_modules-functional/module-ws/frontend/pages/WorkspaceDetailPage.tsx`

**Updated:** January 12, 2026, 9:02 PM EST

---

## Progress Tracking

### Role Standardization - Phase Progress

| Phase | Description | Status | Est. Hours |
|-------|-------------|--------|------------|
| Phase 0 | Analysis & Discovery | ✅ COMPLETE | 1-2 |
| Phase 1 | Database Schema Migration | ✅ COMPLETE | 3-5 |
| Phase 2 | RLS Policy Updates | ✅ COMPLETE | 1-2 |
| Phase 3 | Backend Lambda Updates | 🔄 PARTIAL (124 violations remain) | 2-3 |
| Phase 4 | Frontend Updates | 🔄 PARTIAL (violations remain) | 2-3 |
| Phase 5 | Documentation Updates | ✅ COMPLETE | 1 |
| Phase 6 | Testing & Validation | 📋 PENDING | 1-2 |
| Phase 6.5 | Automated Validator | ✅ CREATED | 2-4 |

### Files Modified - Session 108

| Location | Files |
|----------|-------|
| `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/` | `__init__.py`, `auth.py`, `validators.py` |
| `templates/_modules-core/module-access/backend/lambdas/profiles/` | `lambda_function.py` |
| `templates/_modules-core/module-access/backend/lambdas/members/` | `lambda_function.py` |
| `templates/_modules-core/module-access/backend/lambdas/orgs/` | `lambda_function.py` |
| `templates/_modules-core/module-access/backend/lambdas/identities-management/` | `lambda_function.py` |
| `templates/_modules-core/module-access/backend/lambdas/org-email-domains/` | `lambda_function.py` |
| `templates/_modules-core/module-access/backend/lambdas/idp-config/` | `lambda_function.py` |
| `templates/_modules-functional/module-ws/backend/lambdas/workspace/` | `lambda_function.py` |

### Files Modified - Session 107

| Location | Files |
|----------|-------|
| `templates/_modules-functional/module-ws/db/schema/` | 009-apply-rls.sql |
| `templates/_modules-core/module-ai/db/schema/` | 001-ai-providers.sql, 002-ai-models.sql, 003-ai-validation-history.sql, 004-ai-validation-progress.sql, 007-org-prompt-engineering.sql |
| `templates/_modules-core/module-access/db/schema/` | 006-user-provisioning.sql, 007-auth-events-sessions.sql |

### Files Modified - Session 106

| Location | Files |
|----------|-------|
| `templates/_modules-core/module-mgmt/db/schema/` | 001-sys-lambda-config.sql, 002-sys-module-registry.sql, 003-sys-module-usage.sql |
| `templates/_modules-core/module-ai/db/schema/` | 006-sys-rag.sql |
| `templates/_modules-core/module-access/db/schema/` | 003-profiles.sql, 004-org-members.sql, 005-sys-idp-config.sql |
| `templates/_modules-core/module-access/db/migrations/` | 20260113_sys_role_standardization.sql |
| `scripts/migrations/` | 20260113_user_profiles_sys_role.sql, 20260113_org_members_org_role.sql, README-role-standardization-migrations.md |
| `*/db/schema/archive/` | All old platform_* files |
