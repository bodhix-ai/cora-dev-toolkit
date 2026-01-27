# Plan: Admin Standardization S3b - Route Standards & Version Tracking

**Initiative:** Admin Standardization  
**Sprint:** S3b  
**Branch:** `admin-page-s3b`  
**Created:** January 27, 2026  
**Status:** 🟡 Active - Planning Complete, Ready for Implementation

---

## Current Progress

**Last Updated:** January 27, 2026 (Session 1)

**Completed:**
- ✅ Sprint planning and documentation
- ✅ Versioning standard defined
- ✅ Branch created and pushed to remote
- ✅ Context files updated

**Next Session:**
- Start Phase 1: Version Tracking Foundation
- Begin with Step 1.2: Create VERSION file (0.1.0)
- Estimated: 4-6 hours for Phase 1

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

### Admin Route Issues

Admin Route Validator shows 84 errors (31% of remaining validation errors):
- All in `module-mgmt/infrastructure/outputs.tf`
- Missing scope prefixes: `/admin/sys/mgmt/lambda-config` → `/admin/sys/mgmt/config/lambda`
- Established during WS Plugin Architecture S3 planning session
- Standard defined in ADR-018b and `standard_ADMIN-API-ROUTES.md`

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