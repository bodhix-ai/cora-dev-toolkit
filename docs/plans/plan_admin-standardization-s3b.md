e m# Plan: Admin Standardization S3b - Route Standards & Version Tracking

**Initiative:** Admin Standardization  
**Sprint:** S3b  
**Branch:** `admin-page-s3b`  
**Created:** January 27, 2026  
**Status:** 🟡 Active - Planning Complete, Ready for Implementation

---

## Current Progress

**Last Updated:** January 27, 2026 (Session 10)

**Completed:**
- ✅ Session 1: Sprint planning and documentation
- ✅ Session 1: Versioning standard defined
- ✅ Session 1: Branch created and pushed to remote
- ✅ Session 1: Context files updated
- ✅ **Session 2: Phase 1 COMPLETE** - Version Tracking Foundation
  - Step 1.2: VERSION file created (0.1.0)
  - Step 1.3: CHANGELOG.md created
  - Step 1.4: module-registry.yaml enhanced with dependencies
  - Step 1.5: .cora-version.yaml template created
  - Step 1.6: create-cora-project.sh version stamping implemented
  - Step 1.7: sync-fix-to-project.sh logging implemented
- ✅ **Session 2: Admin Page Parity Analysis COMPLETE**
  - Analyzed all 8 modules for sys/org admin route parity
  - Created gap matrix showing compliance status
  - **SCOPE EXPANDED:** Not just 51 validator errors - 6 modules need significant work
- ✅ **Session 3: Admin Route Validator Enhanced**
  - Fixed critical validator bug (false positives)
  - Added module parity checking to validator
  - Enhanced output reports with actionable metrics
- ✅ **Session 4: Module-KB Route Standardization COMPLETE**
  - Fixed all 13 malformed routes (`/admin/org/kbs` → `/admin/org/kb`)
  - Updated 4 files: 2 Lambda functions, 1 outputs.tf, 1 api.ts
  - User approved singular design without "bases" suffix
  - Module-KB now compliant with ADR-018
- ✅ **Session 5: Module-Mgmt Route Standardization COMPLETE**
  - Fixed sys admin routes: `/lambda-config` → `/schedule`, `/lambda-functions` → `/functions`
  - Applied singular/plural convention (schedule=singleton, functions=collection)
  - Added 3 org admin routes (read-only view of modules and usage)
  - Updated 4 files: outputs.tf, lambda_function.py, api.ts, new org admin page
  - Module-Mgmt now has full sys + org admin parity
- ✅ **Session 6: Module-Access Route Standardization COMPLETE**
  - Migrated 4 sys admin routes to standard pattern
  - Added 4 org admin routes (list, view, update, delete users)
  - Updated 7 files: 2 Lambda functions, 1 outputs.tf, 2 frontend components, 1 new org admin page
  - Org admin page supports role-based access (org_admin: read-only, org_owner: full management)
  - Module-Access achieved full sys + org admin parity

- ✅ **Session 7: Module-AI Route Standardization COMPLETE**
  - Fixed 18 routes (16 sys + 2 org) to follow `/admin/{scope}/ai/*` pattern
  - Updated 3 Lambda files: provider, ai-config-handler (docstrings + dispatcher)
  - Updated frontend api.ts: 9 API endpoint calls
  - Created org admin page: `apps/web/app/admin/org/ai/page.tsx`
  - Role-based UI: org_admin (read-only), org_owner (full edit)
  - Module-AI achieved full sys + org admin parity

- ✅ **Session 8: Module-WS Route Standardization COMPLETE**
  - Standardized 10 admin routes to `/admin/{scope}/ws/*` pattern
  - Removed 1 deprecated route (`/ws/admin/stats`)
  - Updated infrastructure outputs.tf (10 routes)
  - Updated Lambda function (docstrings + dispatcher + 3 new handlers)
  - Updated frontend api.ts (10 API calls)
  - Created route mapping document: `docs/plans/session-8-ws-route-mapping.md`
  - **Validation:** ✅ All 16 routes compliant (2 sys, 5 org, 9 data)
  - Module-WS achieved full sys + org admin parity

**Module Completion Status:**
- ✅ **7 modules complete:** kb, eval, mgmt, access, ai, ws, voice (sys + org admin pages)
- ⏳ **1 module remaining:** chat (needs full admin infrastructure from scratch)

**Validation Results (Session 8):**
- Ran admin-route-validator on `templates/_modules-core/` (6 modules)
- **Total routes:** 100 scanned, 63 compliant, 7 non-compliant
- **Admin parity:** 5 of 6 modules have both sys + org routes
- **Missing:** chat (needs full admin infrastructure)
- Ran admin-route-validator on `templates/_modules-functional/` (2 modules)
- **Total routes:** 53 scanned, 34 compliant, 8 non-compliant
- **Admin parity:** 1 of 2 modules (eval) has both sys + org routes
- **Missing:** voice (needs admin infrastructure + 6 route pattern fixes)

**Voice Route Pattern Fixes (Session 8):** ✅ COMPLETE
- Fixed deprecated `/api/voice/*` prefix (removed `/api/` prefix)
- Updated 3 Lambda functions (10 routes total)
- **Validation:** 8 errors → 2 errors (6 route pattern errors resolved!)

**Session 9: Module-Voice Admin Infrastructure (50% Complete)**
- ✅ **Analysis COMPLETE** - Created `docs/plans/session-9-voice-admin-analysis.md`
- ✅ **Infrastructure Updates COMPLETE** - Added 16 admin routes to outputs.tf
  - 6 sys admin credential routes (list, get, create, update, delete, validate)
  - 5 org admin credential routes (list, get, create, update, delete)
  - 5 org admin config routes (list, get, create, update, delete)
- ✅ **Voice-Credentials Lambda COMPLETE** - 11 admin handler functions implemented
  - Sys admin (6): Platform credentials (org_id = NULL)
  - Org admin (5): Organization credentials (session org_id)
  - All routes follow ADR-018 pattern: `/admin/{scope}/{module}/{resource}`

**Session 10: Module-Voice Admin Infrastructure - COMPLETE** ✅
- ✅ **Voice-Configs Lambda COMPLETE** - 5 org admin handler functions implemented
  - `handle_admin_list_configs()` - List configs for admin's organization
  - `handle_admin_get_config()` - Get config with org verification
  - `handle_admin_create_config()` - Create config using session org_id
  - `handle_admin_update_config()` - Update config with org verification
  - `handle_admin_delete_config()` - Delete config with org verification + in-use check
- ✅ **Frontend API Updates COMPLETE** - 5 admin endpoint functions added
  - `adminListConfigs()` - No orgId param needed (uses session)
  - `adminGetConfig()`, `adminCreateConfig()`, `adminUpdateConfig()`, `adminDeleteConfig()`
  - All routes follow `/admin/org/voice/{resource}` pattern
- ✅ **Validation COMPLETE** - ✅ PASSED - 24/24 routes compliant
  - 14 data API routes, 5 org admin config routes, 5 sys admin credential routes
- ✅ **Committed & Pushed** - Commit `943731a` to `admin-page-s3b`

**Overall Status:**
- **87.5% Complete:** 7 of 8 modules with full admin parity
- **Remaining work:** module-chat (12-16 hours) - needs full admin infrastructure from scratch

**Next Session:**
- **Target:** module-chat (final module)
- **Scope:** Create full sys + org admin infrastructure from scratch
- **Estimated:** 12-16 hours

---

## Overview

Complete the Admin Standardization initiative by:
1. **Version Tracking Foundation** - Enable sustainable deployment to 4+ projects
2. **Admin Route Standardization** - Fix 84 admin route validator errors
3. **Documentation** - Admin page standards and module contribution guidelines

---

## Context

### Why Version Tracking First?

With 4 projects now having their own git repositories (ai-ccat, pm-app, etc.), we need version tracking infrastructure **before** deploying admin route fixes. This enables:
- Projects know what toolkit version they're based on
- Selective module upgrades without full toolkit upgrades
- Dependency tracking prevents breaking changes
- Sustainable upgrade path for production projects

### Admin Route Issues - REVISED SCOPE

**Initial Assessment (Session 1):**
- Admin Route Validator shows 51 errors (down from estimated 84)
- All in `module-mgmt/infrastructure/outputs.tf`
- Missing scope prefixes: `/admin/sys/mgmt/lambda-config` → `/admin/sys/mgmt/config/lambda`
- Standard defined in ADR-018b and `standard_ADMIN-API-ROUTES.md`

**Expanded Scope (Session 2):**
After analyzing admin page parity across all 8 modules, the true scope is **much larger**:

### Admin Page Parity Gap Matrix

| Module | Sys Admin Routes | Org Admin Routes | Status | Required Work |
|--------|-----------------|------------------|--------|---------------|
| **module-kb** | ✅ `/admin/sys/kbs/*` | ✅ `/admin/org/kbs/*` | ✅ PARITY | None |
| **module-eval** | ✅ `/admin/sys/eval/*` | ✅ `/admin/org/eval/*` | ✅ PARITY | None |
| **module-mgmt** | ✅ `/admin/sys/mgmt/*` | ❌ MISSING | ⚠️ PARTIAL | Add org admin routes + fix 51 route naming issues |
| **module-access** | ⚠️ `/admin/idp-config`, `/admin/users` | ❌ MISSING | ❌ NON-STANDARD | Migrate to `/admin/sys/access/*` + add org routes |
| **module-ai** | ⚠️ `/admin/ai/*` | ❌ MISSING | ❌ NON-STANDARD | Migrate to `/admin/sys/ai/*` + add org routes |
| **module-ws** | ⚠️ `/ws/admin/*` | ❌ MISSING | ❌ NON-STANDARD | Migrate to `/admin/sys/ws/*` + add org routes |
| **module-chat** | ❌ NONE | ❌ NONE | ❌❌ MISSING | Create full admin infrastructure (sys + org) |
| **module-voice** | ❌ NONE | ❌ NONE | ❌❌ MISSING | Create full admin infrastructure (sys + org) |

### Work Tiers

**Tier 1: Route Pattern Standardization (3 modules)**
- module-access: 4 routes to migrate
- module-ai: 8 routes to migrate
- module-ws: 5 routes to migrate

**Tier 2: Add Org Admin Routes (4 modules after Tier 1)**
- module-mgmt: Add org-scoped config routes
- module-access: Add org-scoped user/role management
- module-ai: Add org-scoped AI provider config
- module-ws: Add org-scoped workspace config

**Tier 3: Create Admin Infrastructure (2 modules)**
- module-chat: Full admin pages (sys + org) for chat config
- module-voice: Full admin pages (sys + org) for voice config

**Validator vs Business Requirement:**
- **Validator (51 errors):** Only catches route naming issues within existing routes
- **Business Requirement:** ALL modules must have BOTH sys AND org admin pages with proper patterns
- **Real Scope:** 6 modules need work (not just mgmt's 51 route fixes)

### Phase 2 Implementation Strategy: Module-by-Module

**Prioritization Approach:** Address each module completely (both sys and org admin pages + proper routes) before moving to the next module.

**Key Principle:** Update existing pages to use correct routes rather than rebuilding from scratch.

#### Implementation Order

**Module 1: module-mgmt (Start Here)**
- **Current State:** Has sys admin page with non-standard routes, missing org admin page
- **Work Required:**
  1. Fix sys admin routes (51 route naming issues)
     - Update `infrastructure/outputs.tf` - 4 route patterns
     - Update `backend/lambda-mgmt/lambda_function.py` - docstrings + dispatcher
     - Update `frontend/lib/api.ts` - 5 API calls
  2. Create org admin page + routes
     - Add `/admin/org/mgmt/*` routes for org-scoped config
     - Lambda handler for org-scoped operations
     - Frontend page at `routes/admin/org/mgmt/page.tsx`
- **Estimated Effort:** 6-8 hours

**Module 2: module-access**
- **Current State:** Has legacy `/admin/users`, `/admin/idp-config` routes (no scope prefix)
- **Work Required:**
  1. Migrate sys admin routes to standard pattern
     - `/admin/users` → `/admin/sys/access/users`
     - `/admin/idp-config` → `/admin/sys/access/config/idp`
     - Update Lambda function route dispatcher
     - Update frontend API calls
  2. Create org admin page + routes
     - Add `/admin/org/access/*` routes for org-scoped user/role management
     - Org-scoped Lambda handlers
     - Frontend page at `routes/admin/org/access/page.tsx`
- **Estimated Effort:** 8-10 hours

**Module 3: module-ai**
- **Current State:** Has `/admin/ai/*` routes (missing scope prefix)
- **Work Required:**
  1. Migrate sys admin routes to standard pattern
     - `/admin/ai/config` → `/admin/sys/ai/config`
     - `/admin/ai/providers` → `/admin/sys/ai/providers`
     - 8 total routes to migrate
     - Update Lambda handlers and frontend
  2. Create org admin page + routes
     - Add `/admin/org/ai/*` routes for org-scoped AI provider config
     - Org-scoped Lambda handlers
     - Frontend page at `routes/admin/org/ai/page.tsx`
- **Estimated Effort:** 8-10 hours

**Module 4: module-ws**
- **Current State:** Has `/ws/admin/*` routes (non-standard pattern)
- **Work Required:**
  1. Migrate sys admin routes to standard pattern
     - `/ws/admin/stats` → `/admin/sys/ws/stats`
     - `/ws/admin/workspaces` → `/admin/sys/ws/workspaces`
     - 5 total routes to migrate
     - Update Lambda handlers and frontend
  2. Create org admin page + routes
     - Add `/admin/org/ws/*` routes for org-scoped workspace config
     - Org-scoped Lambda handlers
     - Frontend page at `routes/admin/org/ws/page.tsx`
- **Estimated Effort:** 8-10 hours

**Module 5: module-chat**
- **Current State:** NO admin routes or pages
- **Work Required:**
  1. Create sys admin page + routes
     - Add `/admin/sys/chat/*` routes for system-level chat config
     - Lambda function for chat admin operations
     - Frontend page at `routes/admin/sys/chat/page.tsx`
  2. Create org admin page + routes
     - Add `/admin/org/chat/*` routes for org-scoped chat config
     - Org-scoped Lambda handlers
     - Frontend page at `routes/admin/org/chat/page.tsx`
- **Estimated Effort:** 12-16 hours (creating from scratch)

**Module 6: module-voice**
- **Current State:** NO admin routes or pages
- **Work Required:**
  1. Create sys admin page + routes
     - Add `/admin/sys/voice/*` routes for system-level voice config
     - Lambda function for voice admin operations
     - Frontend page at `routes/admin/sys/voice/page.tsx`
  2. Create org admin page + routes
     - Add `/admin/org/voice/*` routes for org-scoped voice config
     - Org-scoped Lambda handlers
     - Frontend page at `routes/admin/org/voice/page.tsx`
- **Estimated Effort:** 12-16 hours (creating from scratch)

**Total Estimated Effort for Phase 2:** 54-70 hours (significantly larger than initially estimated 4-6 hours)

#### Migration vs. Rebuild Decision Matrix

| Module | Has Legacy Page? | Strategy |
|--------|-----------------|----------|
| module-mgmt | ✅ Yes (sys) | **Update** existing sys page routes + **Create** org page |
| module-access | ✅ Yes (sys) | **Update** existing sys page routes + **Create** org page |
| module-ai | ✅ Yes (sys) | **Update** existing sys page routes + **Create** org page |
| module-ws | ✅ Yes (sys) | **Update** existing sys page routes + **Create** org page |
| module-chat | ❌ No | **Create** both sys and org pages from scratch |
| module-voice | ❌ No | **Create** both sys and org pages from scratch |

---

## Success Criteria

- [ ] VERSION file created in toolkit root
- [ ] Module registry enhanced with dependencies and versions
- [ ] Project version tracking template created
- [ ] create-cora-project.sh stamps versions
- [ ] 84 admin route errors resolved (Admin Route Validator: PASS)
- [ ] Admin page parity rules documented
- [ ] Module ADMINISTRATION.md template created
- [ ] All 4 projects can be upgraded using version metadata

---

## Phase Breakdown

### Phase 1: Version Tracking Foundation (4-6 hours)

#### Step 1.1: Versioning Standard Documentation
**File:** `docs/standards/standard_VERSIONING.md`

```markdown
# CORA Versioning Standard

## Two-Level Versioning

CORA uses semantic versioning at both toolkit and module levels:

### Toolkit Version (MAJOR.MINOR.PATCH)
- MAJOR: Breaking changes to core APIs, database schema migrations
- MINOR: New modules, new features, non-breaking enhancements  
- PATCH: Bug fixes, documentation, validation improvements

Current: 0.1.0 (pre-stable)

### Module Version (MAJOR.MINOR.PATCH)
- MAJOR: Breaking API/schema changes for this module
- MINOR: New features, endpoints, UI pages
- PATCH: Bug fixes, styling, accessibility fixes

## Dependency Types
- REQ: Required dependency (won't function without)
- OPT: Optional dependency (enhanced features if available)
- TK: Depends on toolkit shell/shared packages

## Module Dependency Matrix
[Full matrix from planning session]
```

**Deliverable:** Complete versioning standard with examples

---

#### Step 1.2: Create VERSION File
**File:** `VERSION`

```
0.1.0
```

**Action:** Simple text file at toolkit root

---

#### Step 1.3: Create CHANGELOG.md
**File:** `CHANGELOG.md`

```markdown
# CORA Toolkit Changelog

## [Unreleased]

### Added
- Version tracking system
- Module dependency tracking
- Admin route standardization

## [0.1.0] - 2026-01-27

### Initial Release
- Core modules: access, ai, ws, mgmt, kb, chat
- Functional modules: eval, voice
- Validation framework
- Project creation scripts
```

---

#### Step 1.4: Enhance Module Registry
**File:** `templates/_modules-core/module-registry.yaml`

Add dependency tracking to existing registry:

```yaml
toolkit_version: "0.1.0"

modules:
  - name: module-access
    version: "0.2.0"
    type: core
    tier: 1
    min_toolkit_version: "0.1.0"
    dependencies: []
    dependents:
      - module-ai
      - module-ws
      - module-mgmt
      - module-kb
      - module-chat
      - module-eval
      - module-voice
    breaking_changes:
      "0.2.0":
        - "Sidebar component interface changed"
        - "Affects: module-mgmt (admin cards)"
    changelog: |
      0.2.0 - Admin standardization, ModuleGate integration
      0.1.0 - Initial release
  
  # ... repeat for all 8 modules
```

**Dependencies to document:**

| Module | Dependencies (REQ) | Dependencies (OPT) |
|--------|-------------------|-------------------|
| module-access | - | - |
| module-ai | module-access | - |
| module-ws | module-access | - |
| module-mgmt | module-access | module-ai, module-ws |
| module-kb | module-access, module-ws | - |
| module-chat | module-access, module-ai, module-ws | module-kb |
| module-eval | module-access, module-ws | module-kb |
| module-voice | module-access, module-ai, module-ws | - |

---

#### Step 1.5: Create Project Version Template
**File:** `templates/_project-stack-template/.cora-version.yaml`

```yaml
# CORA Toolkit Version Tracking
# This file is auto-generated by create-cora-project.sh

# Platform version this project was created from
toolkit_version: "{{TOOLKIT_VERSION}}"
created_date: "{{CREATED_DATE}}"
last_synced: "{{CREATED_DATE}}"

# Module versions currently in this project
modules:
  module-access: "{{MODULE_ACCESS_VERSION}}"
  module-ai: "{{MODULE_AI_VERSION}}"
  module-ws: "{{MODULE_WS_VERSION}}"
  module-mgmt: "{{MODULE_MGMT_VERSION}}"
  module-kb: "{{MODULE_KB_VERSION}}"
  module-chat: "{{MODULE_CHAT_VERSION}}"
  # Functional modules (if enabled)
  # module-eval: "{{MODULE_EVAL_VERSION}}"
  # module-voice: "{{MODULE_VOICE_VERSION}}"

# Project-specific modules (not from toolkit)
custom_modules: []

# Upgrade notes
# To upgrade: ./scripts/upgrade-cora-project.sh <project-path>
```

---

#### Step 1.6: Modify create-cora-project.sh
**File:** `scripts/create-cora-project.sh`

Add version stamping logic:

```bash
# After project creation, stamp version
TOOLKIT_VERSION=$(cat VERSION)
CREATED_DATE=$(date +%Y-%m-%d)

# Read module versions from module-registry.yaml
# (parse YAML to get each module's version)

# Create .cora-version.yaml in project
cat > "${STACK_DIR}/.cora-version.yaml" << EOF
toolkit_version: "${TOOLKIT_VERSION}"
created_date: "${CREATED_DATE}"
last_synced: "${CREATED_DATE}"
modules:
  module-access: "${MODULE_ACCESS_VERSION}"
  # ... all enabled modules
custom_modules: []
EOF

echo "✅ Project stamped with toolkit version ${TOOLKIT_VERSION}"
```

---

#### Step 1.7: Add Sync Logging
**File:** `scripts/sync-fix-to-project.sh`

Add logging at the end of sync:

```bash
# After successful sync
PROJECT_VERSION_FILE="${PROJECT_PATH}/.cora-version.yaml"
if [ -f "$PROJECT_VERSION_FILE" ]; then
    # Update last_synced timestamp
    sed -i "s/last_synced:.*/last_synced: \"$(date +%Y-%m-%d)\"/" "$PROJECT_VERSION_FILE"
    
    # Log the sync
    echo "$(date +%Y-%m-%d\ %H:%M): Synced ${FILE} from toolkit $(cat VERSION)" >> "${PROJECT_PATH}/.cora-sync.log"
fi
```

---

### Phase 2: Admin Route Standardization (4-6 hours)

#### Background: Current Route Issues

All 84 errors are in `module-mgmt` routes that don't follow the standard:

**Current (Non-Compliant):**
```
/admin/sys/mgmt/lambda-config
/admin/sys/mgmt/lambda-config/{configKey}
/admin/sys/mgmt/lambda-functions
```

**Standard (Compliant):**
```
/admin/sys/mgmt/config/lambda
/admin/sys/mgmt/config/lambda/{configKey}
/admin/sys/mgmt/functions
```

**Why this matters:**
- Consistent URL structure across all modules
- Predictable routing patterns
- API documentation clarity

---

#### Step 2.1: Update Lambda Route Docstrings
**File:** `templates/_modules-core/module-mgmt/backend/lambda-mgmt/lambda_function.py`

Update module docstring to document corrected routes:

```python
"""
Module Management - Platform administration and monitoring

Routes - System Admin:
- GET /admin/sys/mgmt/config/lambda - List Lambda configurations
- GET /admin/sys/mgmt/config/lambda/{configKey} - Get specific config
- POST /admin/sys/mgmt/config/lambda/sync - Sync Lambda config
- GET /admin/sys/mgmt/functions - List Lambda functions
- GET /admin/sys/mgmt/modules - List module registry
- PUT /admin/sys/mgmt/modules/{moduleName} - Update module config
- GET /admin/sys/mgmt/usage/modules - Get module usage stats
"""
```

**Impact:** API Tracer validator will now match routes correctly

---

#### Step 2.2: Update API Gateway Routes
**File:** `templates/_modules-core/module-mgmt/infrastructure/outputs.tf`

Update all 84 route definitions:

```hcl
# BEFORE (example)
output "api_routes" {
  value = [
    {
      path           = "/admin/sys/mgmt/lambda-config"
      method         = "GET"
      integration_id = aws_apigatewayv2_integration.lambda_mgmt.id
    },
    # ... 83 more routes
  ]
}

# AFTER
output "api_routes" {
  value = [
    {
      path           = "/admin/sys/mgmt/config/lambda"
      method         = "GET"
      integration_id = aws_apigatewayv2_integration.lambda_mgmt.id
    },
    # ... corrected routes
  ]
}
```

**Route Mapping (All 84 changes):**

| Old Route | New Route | Method |
|-----------|-----------|--------|
| `/admin/sys/mgmt/lambda-config` | `/admin/sys/mgmt/config/lambda` | GET |
| `/admin/sys/mgmt/lambda-config/{configKey}` | `/admin/sys/mgmt/config/lambda/{configKey}` | GET |
| `/admin/sys/mgmt/lambda-config/sync` | `/admin/sys/mgmt/config/lambda/sync` | POST |
| `/admin/sys/mgmt/lambda-functions` | `/admin/sys/mgmt/functions` | GET |
| `/admin/sys/mgmt/modules` | `/admin/sys/mgmt/modules` | ✅ Already correct |
| ... | ... | ... |

*(Full list available in validation/admin-route-validator output)*

---

#### Step 2.3: Update Frontend API Calls
**File:** `templates/_modules-core/module-mgmt/frontend/lib/api.ts`

Update API client endpoints:

```typescript
// BEFORE
export const getLambdaConfig = () => 
  api.get('/admin/sys/mgmt/lambda-config');

export const getLambdaFunctions = () =>
  api.get('/admin/sys/mgmt/lambda-functions');

// AFTER
export const getLambdaConfig = () => 
  api.get('/admin/sys/mgmt/config/lambda');

export const getLambdaFunctions = () =>
  api.get('/admin/sys/mgmt/functions');
```

**Impact:** 6-8 API calls need updates in `api.ts`

---

#### Step 2.4: Validate Route Compliance
**Command:** `validation/admin-route-validator/cli.py`

```bash
# Before fixes: 84 errors
$ python validation/admin-route-validator/cli.py \
    ~/code/bodhix/cora-dev-toolkit/templates/_modules-core

Admin Route Validator: ✗ FAILED
  Errors (84): ...

# After fixes: 0 errors
$ python validation/admin-route-validator/cli.py \
    ~/code/bodhix/cora-dev-toolkit/templates/_modules-core

Admin Route Validator: ✓ PASSED
  Duration: 1200ms
  Errors: 0
```

---

### Phase 3: Documentation (2-3 hours)

#### Step 3.1: Admin Page Parity Rule
**File:** `docs/standards/standard_ADMIN-PAGE-PARITY.md`

```markdown
# Admin Page Parity Rule

## Principle

Every module with admin functionality MUST provide both system admin and org admin pages.

## Requirements

If a module has `/admin/sys/{module}/*` routes, it MUST also have:
- `/admin/org/{module}/*` routes with org-scoped functionality

## Examples

### ✅ Compliant: module-mgmt
- `/admin/sys/mgmt` - System-level module management
- `/admin/org/mgmt` - Organization-level module management (future)

### ❌ Non-Compliant: module-voice (before S2)
- `/admin/sys/voice` - System-level voice config
- ❌ Missing `/admin/org/voice` - No org admin page

## Exceptions

Core infrastructure modules (module-access) may have sys-only pages if org-level doesn't make sense.
```

---

#### Step 3.2: Module ADMINISTRATION.md Template
**File:** `templates/_module-template/ADMINISTRATION.md`

```markdown
# {{MODULE_NAME}} - Administration Guide

## Admin Pages

### System Admin
**URL:** `/admin/sys/{{module}}`  
**Permissions:** `role:sysadmin`

Features:
- Feature 1
- Feature 2

### Organization Admin  
**URL:** `/admin/org/{{module}}`  
**Permissions:** `role:orgadmin` + `org_id` verification

Features:
- Feature 1 (org-scoped)
- Feature 2 (org-scoped)

## Configuration

System-level config:
- Setting 1: Default value, override at org level

Organization-level config:
- Setting 1: Inherits from system

## Permissions

| Action | System Admin | Org Admin |
|--------|--------------|-----------|
| View config | ✅ | ✅ (own org) |
| Edit config | ✅ | ✅ (own org) |
| Delete data | ✅ | ❌ |

## Troubleshooting

Common issues and solutions.
```

---

#### Step 3.3: Delegated Admin Documentation
**File:** `docs/guides/guide_DELEGATED-ADMIN.md`

```markdown
# Delegated Admin Concept

## Overview

CORA implements a tiered admin model:
- **System Admins** - Platform-wide control
- **Organization Admins** - Organization-scoped control (delegated)
- **Workspace Admins** - Workspace-scoped control (delegated)

## How Org Admin Works

1. **Delegation:**
   - System admin assigns `role:orgadmin` to user
   - User can only manage resources in their organization

2. **Authorization Pattern:**
   - User session contains `org_id`
   - Backend verifies `resource.org_id === session.org_id`
   - See ADR-016 for full pattern

3. **Inheritance:**
   - Org admins can override system-level config for their org
   - Cannot disable features system admin enabled
   - Can add org-specific customizations

## Module Developer Guidelines

When creating admin pages:
1. Create both `/admin/sys/{module}` and `/admin/org/{module}` routes
2. Use `useUser()` hook for session data
3. Backend verifies org_id for org admin routes
4. Document admin features in module's ADMINISTRATION.md
```

---

#### Step 3.4: Module Developer Guide
**File:** `docs/guides/guide_MODULE-ADMIN-PAGES.md`

```markdown
# Module Admin Pages - Developer Guide

## Creating Admin Pages

### 1. System Admin Page
**Location:** `routes/admin/sys/{module}/page.tsx`

```tsx
export default function SysModuleAdminPage() {
  const { user } = useUser();
  
  // Verify sysadmin role
  if (!user?.role?.includes('sysadmin')) {
    return <AccessDenied />;
  }
  
  // System-wide admin UI
}
```

### 2. Organization Admin Page
**Location:** `routes/admin/org/{module}/page.tsx`

```tsx
export default function OrgModuleAdminPage() {
  const { user } = useUser();
  
  // Verify orgadmin role
  if (!user?.role?.includes('orgadmin')) {
    return <AccessDenied />;
  }
  
  // Org-scoped admin UI (uses user.org_id)
}
```

### 3. API Routes

Follow `/admin/{scope}/{module}/{resource}` pattern (see standard_ADMIN-API-ROUTES.md)

### 4. Documentation

Create `ADMINISTRATION.md` in module root (see template)
```

---

## Testing Strategy

### Phase 1 Testing (Version Tracking)

```bash
# 1. Create new project from templates
cd ~/code/bodhix/cora-dev-toolkit
./scripts/create-cora-project.sh test-version ~/code/bodhix/testing

# 2. Verify .cora-version.yaml exists
cat ~/code/bodhix/testing/test-version-stack/.cora-version.yaml

# Expected output:
# toolkit_version: "0.1.0"
# created_date: "2026-01-27"
# modules:
#   module-access: "0.2.0"
#   ...

# 3. Test sync logging
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-version-stack "module-mgmt/infrastructure/outputs.tf"

# 4. Verify sync log
cat ~/code/bodhix/testing/test-version-stack/.cora-sync.log
```

---

### Phase 2 Testing (Admin Routes)

```bash
# 1. Run validator on templates BEFORE fixes
python validation/admin-route-validator/cli.py templates/_modules-core
# Expected: 84 errors

# 2. Apply route fixes

# 3. Run validator on templates AFTER fixes
python validation/admin-route-validator/cli.py templates/_modules-core
# Expected: 0 errors

# 4. Create fresh project and validate
./scripts/create-cora-project.sh test-admin-routes ~/code/bodhix/testing
cd ~/code/bodhix/testing/test-admin-routes-stack
python ~/code/bodhix/cora-dev-toolkit/validation/admin-route-validator/cli.py .
# Expected: 0 errors

# 5. Deploy to test environment
cd ~/code/bodhix/testing/test-admin-routes-infra
./scripts/deploy-terraform.sh dev

# 6. Verify routes in API Gateway
aws apigatewayv2 get-routes --api-id <api-id> | grep "/admin/sys/mgmt"
# Expected: All routes follow /admin/sys/mgmt/config/* pattern
```

---

### Phase 3 Testing (Documentation)

```bash
# 1. Verify all documentation files created
ls -la docs/standards/standard_ADMIN-PAGE-PARITY.md
ls -la docs/guides/guide_DELEGATED-ADMIN.md
ls -la docs/guides/guide_MODULE-ADMIN-PAGES.md
ls -la templates/_module-template/ADMINISTRATION.md

# 2. Review with stakeholders
# 3. Update existing modules to follow new ADMINISTRATION.md template (future work)
```

---

## Migration Path for Existing Projects

### For Projects Already Created (ai-ccat, pm-app, etc.)

```bash
# 1. Add .cora-version.yaml manually
cd ~/code/sts/ai-ccat/ai-ccat-stack
cat > .cora-version.yaml << EOF
toolkit_version: "0.1.0"
created_date: "2026-01-27"
last_synced: "2026-01-27"
modules:
  module-access: "0.2.0"
  module-ai: "0.1.0"
  module-ws: "0.1.0"
  module-mgmt: "0.1.0"
  module-kb: "0.3.0"
  module-chat: "0.2.0"
custom_modules: []
EOF

# 2. Sync admin route fixes
cd ~/code/bodhix/cora-dev-toolkit
./scripts/sync-infra-to-project.sh ~/code/sts/ai-ccat/ai-ccat-stack \
    "module-mgmt/infrastructure/outputs.tf"

# 3. Sync frontend API updates
./scripts/sync-fix-to-project.sh ~/code/sts/ai-ccat/ai-ccat-stack \
    "module-mgmt/frontend/lib/api.ts"

# 4. Deploy updated infrastructure
cd ~/code/sts/ai-ccat/ai-ccat-infra
./scripts/deploy-terraform.sh dev

# 5. Verify routes work
# Test admin pages in browser
```

**Repeat for all 4 projects:**
- ai-ccat
- pm-app
- (project 3)
- (project 4)

---

## Estimated Effort

| Phase | Tasks | Hours |
|-------|-------|-------|
| **Phase 1: Version Tracking** | 7 steps | 4-6 |
| **Phase 2: Admin Routes** | 4 steps | 4-6 |
| **Phase 3: Documentation** | 4 steps | 2-3 |
| **Testing & Migration** | All projects | 2-3 |
| **Total** | | **12-18 hours** |

---

## Dependencies

- ✅ ADR-018b: API Gateway Route Standards (completed in WS Plugin Arch S3 planning)
- ✅ `standard_ADMIN-API-ROUTES.md` (completed)
- ✅ Admin Route Validator (completed)

---

## Deliverables

### Templates Updated
- `VERSION` (new)
- `CHANGELOG.md` (new)
- `module-registry.yaml` (enhanced)
- `.cora-version.yaml` template (new)
- `create-cora-project.sh` (version stamping)
- `sync-fix-to-project.sh` (sync logging)
- `module-mgmt/backend/lambda-mgmt/lambda_function.py` (route docstrings)
- `module-mgmt/infrastructure/outputs.tf` (84 route fixes)
- `module-mgmt/frontend/lib/api.ts` (API calls)

### Documentation Created
- `docs/standards/standard_VERSIONING.md`
- `docs/standards/standard_ADMIN-PAGE-PARITY.md`
- `docs/guides/guide_DELEGATED-ADMIN.md`
- `docs/guides/guide_MODULE-ADMIN-PAGES.md`
- `templates/_module-template/ADMINISTRATION.md`

### Validation
- ✅ Admin Route Validator: 84 → 0 errors
- ✅ All 4 projects can track toolkit version
- ✅ Sync logging enables upgrade traceability

---

## Success Metrics

- [ ] `VERSION` file created with `0.1.0`
- [ ] `module-registry.yaml` includes all 8 modules with dependencies
- [ ] Fresh project has `.cora-version.yaml` with correct versions
- [ ] Admin Route Validator passes (0 errors)
- [ ] All 4 existing projects migrated with version tracking
- [ ] All documentation standards created
- [ ] Clean baseline initiative unblocked

---

## Next Steps After S3b

1. **Clean Project Baseline** - Now unblocked with admin routes fixed
2. **WS Plugin Architecture S3** - Can proceed with standardized admin routes
3. **Module Contribution Process** - Use new ADMINISTRATION.md template
4. **Future Upgrade Automation** - Build on version tracking foundation

---

**Created:** January 27, 2026  
**Sprint:** S3b  
**Status:** 🟡 Active