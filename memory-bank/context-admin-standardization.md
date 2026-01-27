# Context: Admin Page Standardization

**Created:** January 24, 2026  
**Primary Focus:** Admin page patterns, authentication, and URL structure

## Initiative Overview

Standardize all CORA admin pages (sys and org) with consistent:
- Authentication patterns (Pattern A with useUser)
- URL structure (`/admin/{scope}/{module}`)
- Breadcrumb navigation
- Role-based access control

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|-----------|--------------|
| S1 | `admin-page-s1` | `plan_admin-page-standardization-s1.md` | ✅ Complete | 2026-01-22 |
| S2 | `admin-page-s2-completion` | `plan_admin-page-standardization-s2.md` | ✅ Complete | 2026-01-24 |
| S3a | `admin-page-s3a` | `plan_admin-page-s3a.md` | ✅ Complete | 2026-01-25 (Session 5) |
| S3b | `admin-page-s3b` | `plan_admin-standardization-s3b.md` | � Active | 2026-01-27 |

## Sprint 3a Summary (Completed)

**Branch:** `admin-page-s3a`
**Plan:** `docs/plans/plan_admin-page-s3a.md`
**Status:** ✅ Complete (100% - Phase 0 + Steps 1-7 done, migration tested)

**Achievements:**
- ✅ Step 1: module-chat reclassified as 'functional' in sys_module_registry
- ✅ Step 2: ModuleConfigTab component fully implemented
- ✅ Step 3: PlatformMgmtAdmin includes Modules tab
- ✅ Step 4: Admin cards respect runtime module state
- ✅ Step 5: Sidebar uses ModuleGate for functional module nav items + WS label fix
- ✅ Step 6: module-toggle-validator created with full validation
- ✅ Step 7: standard_MODULE-TOGGLE.md documented

**Deliverables:**
- `templates/_project-stack-template/apps/web/components/Sidebar.tsx` - ModuleGate integration + WS label loading fix
- `validation/module-toggle-validator/` - Module toggle compliance validator
- `docs/standards/standard_MODULE-TOGGLE.md` - Module toggle pattern standard

**Impact:** Sys admins can now toggle functional modules on/off. Infrastructure ready for WS Plugin Architecture. Database tables comply with naming standards.

## Sprint 3b Scope (Active)

**Branch:** `admin-page-s3b`
**Plan:** `docs/plans/plan_admin-standardization-s3b.md`
**Started:** January 27, 2026

**Expanded Scope:**
1. **Version Tracking Foundation** (4-6 hours)
   - Toolkit and module versioning system
   - Dependency tracking in module-registry.yaml
   - Project version snapshots (.cora-version.yaml)
   - Sync logging for upgrade traceability

2. **Admin Route Standardization** (4-6 hours)
   - Fix 84 admin route validator errors
   - Update module-mgmt Lambda docstrings
   - Update API Gateway routes in outputs.tf
   - Update frontend API calls

3. **Documentation** (2-3 hours)
   - Admin page parity rule
   - Module ADMINISTRATION.md template
   - Delegated admin concept documentation
   - Guide for module developers

**Total Estimated Effort:** 12-18 hours

**Why Expanded:**
- Version tracking is critical for deploying updates to 4+ projects
- Admin route fixes cannot be deployed sustainably without version tracking
- Both are tightly coupled to deployment workflow

## Sprint 2 Summary (Completed)

**Branch:** `admin-page-s2-completion` (formerly `feature/citations-review`)

**Achievements:**
- URL structure migration to 3-part standard
- Missing pages created (sys/voice, org/access)
- Org admin scope fixes
- ADR-016: Org Admin Authorization Pattern
- Admin-auth-validator extended

## Sprint 3b Scope (Planned)

**Focus:** Admin Standards & Documentation
- Admin page parity rule (both sys & org per module)
- Module ADMINISTRATION.md template
- Delegated admin concept documentation
- Guide for module developers

## Sprint 3c Scope (Future)

**Focus:** In-App Documentation (kbdocs)
- Documentation route structure
- Markdown rendering in-app
- Project documentation copying pattern

## Key Decisions

- ADR-015: Admin Page Auth Pattern + Breadcrumb Navigation
- ADR-016: Org Admin Page Authorization

## Session Log

### January 25, 2026 - Sprint 3a Completion (Sessions 3-6)

**Session 5 - Phase 0 DB Migration Complete:**
- **Database Migration Executed Successfully**
  - Created migration script: `scripts/migrations/002-module-mgmt-table-rename.sql`
  - Renamed 4 module-mgmt tables to comply with DATABASE-NAMING standard:
    - `sys_lambda_config` → `mgmt_cfg_sys_lambda`
    - `sys_module_registry` → `mgmt_cfg_sys_modules`
    - `sys_module_usage` → `mgmt_usage_modules`
    - `sys_module_usage_daily` → `mgmt_usage_modules_daily`
  - Fixed multiple migration issues iteratively:
    - Constraint name conflict (unique_daily_usage → mgmt_usage_modules_daily_unique)
    - Table/view conflict (renamed old tables to *_old before creating views)
    - Syntax error (removed RAISE NOTICE outside DO block)
  - Migration tested and validated on test database
  - Old tables preserved as *_old for rollback safety (to be dropped after testing period)
- **Template Schema Files Updated**
  - Renamed schema files to match new table names
  - Updated all table definitions with correct naming patterns
  - Applied Rule 8 specialized patterns: `{module}_cfg_{scope}_{purpose}` and `{module}_usage_{entity}`
- **Lambda Code Updated**
  - Updated 15 table references in `lambda-mgmt/lambda_function.py`
  - All queries now use new table names
- **Validator Updated**
  - Removed `sys_module_registry`, `sys_lambda_config`, `sys_module_usage` from whitelist
  - Marked Phase 2 as "Completed in S3a Phase 0"
- **Documentation Updated**
  - Updated plan status to 100% complete
  - Added cleanup instructions for old tables

**Session 6 - Module Configuration UI Debugging & Completion:**
- **Fixed 11 Critical Issues** (marathon debugging session):
  1. ✅ ModuleGate export missing from index.ts
  2. ✅ Lambda routes wrong (12 routes: `/api/sys/` → `/admin/sys/mgmt/`)
  3. ✅ API Gateway routes wrong (11 routes: `/platform/` → `/admin/sys/mgmt/`)
  4. ✅ Frontend using relative URLs (added API Gateway URL)
  5. ✅ api.ts using legacy /platform/ routes (6 route changes)
  6. ✅ Missing authentication (added Bearer token to all API calls)
  7. ✅ ModuleGate undefined modules error (safety checks)
  8. ✅ useModuleEnabled undefined modules error (safety checks)
  9. ✅ ModuleAdminDashboard undefined modules errors (4 locations)
  10. ✅ Data parsing error (nested API response: `data.data.modules`)
  11. ✅ CSS styles not applied (injected styles on component mount)
- **Module Configuration UI Fully Functional:**
  - All 8 modules display correctly with proper styling
  - Module toggle functionality working (affects admin cards + navigation)
  - Color-coded module types (blue for core, green for functional)
  - Tier grouping, search, and filtering working
  - UI updates in real-time when modules are toggled
- **Documentation Created:**
  - Created ADR-018: API Route Structure Standard
  - Documents the `/admin/{scope}/{module}` pattern
- **All Templates Updated:**
  - 10 files updated with route standardization and fixes
  - 29 total route changes across Lambda, API Gateway, and frontend
  - 9 safety checks added to handle undefined state during session loading

**Session 3 - Steps 5-7 Complete (100% done)**
- **Steps 5-7 Complete (100% done)**
  - ✅ Step 5: Sidebar integrated with ModuleGate for functional module nav items
    - Fixed workspace nav item showing default label before custom label loads
    - Functional modules wrapped in `<ModuleGate>` for visibility control
    - Core modules always visible without conditionals
  - ✅ Step 6: module-toggle-validator created (validator.py, cli.py, __init__.py)
  - ✅ Step 7: standard_MODULE-TOGGLE.md documented with comprehensive guide
- **Key Implementation Details:**
  - Sidebar uses `getModuleFromRoute()` helper to map routes to module names
  - Added check: `if (item.href === "/ws" && !wsConfig?.navLabelPlural) return null;`
  - This prevents workspace nav from showing default "Workspaces" before custom label loads
  - Validator checks: schema module_type, admin card patterns, sidebar integration
  - Standard documents: classification, hybrid pattern, integration points, testing

### January 25, 2026 - Sprint 3a Progress (Session 2)
- **Steps 1-4 Complete (57% done)**
  - ✅ Step 1: module-chat reclassified as 'functional' in sys_module_registry
  - ✅ Step 2: ModuleConfigTab component fully implemented
  - ✅ Step 3: PlatformMgmtAdmin includes Modules tab
  - ✅ Step 4: Admin cards respect runtime module state (SystemAdminClientPage, OrgAdminClientPage)
- **Infrastructure Fixes:**
  - Fixed create-cora-project.sh password URL encoding
  - Fixed audit-column-validator project detection

### January 25, 2026 - Sprint 3a Start (Session 1)
- Created admin-page-s3a branch
- Scope expanded to include module management core features
- Module-chat will be reclassified as functional (toggleable) while remaining in core creation tier
- This work unblocks WS Plugin Architecture initiative

### January 27, 2026 - Sprint 3b Start (Session 1)

**Status:** Planning & Documentation Complete
**Branch:** `admin-page-s3b` (pushed to remote)

**Work Completed:**
1. **Created comprehensive sprint plan**
   - File: `docs/plans/plan_admin-standardization-s3b.md`
   - 3 phases defined: Version Tracking, Admin Routes, Documentation
   - Estimated effort: 12-18 hours
   
2. **Defined versioning standard**
   - File: `docs/standards/standard_VERSIONING.md`
   - Two-level versioning (toolkit + modules)
   - Module dependency matrix
   - Compatibility rules and upgrade scenarios
   
3. **Updated project files**
   - `memory-bank/BACKLOG.md` - Marked S3b as Active
   - `memory-bank/context-admin-standardization.md` - Added S3b scope
   
4. **Committed and pushed**
   - Branch: `admin-page-s3b`
   - Commit: `ed1f0ac` - "feat(admin-s3b): add version tracking and admin route standardization plan"
   - Ready for PR or implementation

**Next Session:**
- Begin Phase 1: Version Tracking Foundation
- Start with Step 1.2: Create VERSION file (0.1.0)
- Follow plan in `docs/plans/plan_admin-standardization-s3b.md`

---

### January 24, 2026 - Sprint 2 Completion
- Completed ADR-016 fixes for org admin authorization
- Renamed branch from citations-review to admin-page-s2-completion
- Updated documentation standards to 3-tier hierarchy
