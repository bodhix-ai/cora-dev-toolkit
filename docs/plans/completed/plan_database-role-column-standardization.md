# Database Role Column Standardization Plan

**Version:** 1.0  
**Date:** January 11, 2026  
**Status:** SUPERSEDED by plan_sys-role-standardization.md 
**Priority:** Medium  
**Estimated Effort:** 6-8 hours

## Overview

Standardize role column naming across the database to follow a consistent `{scope}_role` pattern. This will eliminate ambiguity and create a clear hierarchy of permission scopes.

## Current State vs Target State

| Table | Current Column | Target Column | Current Values |
|-------|---------------|---------------|----------------|
| user_profiles | `global_role` | `sys_role` | platform_owner, platform_admin |
| org_members | `role` | `org_role` | org_owner, org_admin, org_user |
| ws_members | `ws_role` | `ws_role` | ✅ Already correct |

## Scope Hierarchy

The standardization creates a clear three-tier permission hierarchy:

```
sys_role (system/platform level)
  ↓
org_role (organization/tenant level)
  ↓
ws_role (workspace/resource level)
```

## Rationale

### Why This Change?

1. **Consistency:** All role columns follow the same `{scope}_role` pattern
2. **Clarity:** No ambiguity about which level a role applies to
3. **Self-Documenting:** Column names clearly indicate their scope
4. **Alignment with Standards:** Matches industry best practices for multi-tenant SaaS
5. **Future-Proof:** Pattern scales to additional scopes if needed

### Database Naming Standards Alignment

The proposed changes align with:
- **Readability Over Brevity:** `sys_role` and `org_role` are clearer than `global_role` and `role`
- **Consistency is Key:** All three levels now use the same pattern
- **Clear Names:** No ambiguity about what each column represents

## Prerequisites

Before starting implementation:

1. ✅ **Backup Production Database** - Full backup before any changes
2. ✅ **Review All Dependencies** - Ensure all code references are identified
3. ✅ **Test in Development** - Complete testing in dev environment first
4. ✅ **Plan Downtime Window** - Coordinate with stakeholders (if production impact)
5. ✅ **Prepare Rollback Plan** - Have tested rollback procedure ready

## Implementation Plan

### Phase 1: Documentation

#### 1.1 Update DATABASE-NAMING-STANDARDS.md

**File:** `docs/standards/cora/DATABASE-NAMING-STANDARDS.md`

**Add new section after "General Principles":**

```markdown
## Role Column Naming Convention

### Rule: Scope-Prefixed Role Columns

Role columns that define permissions at a specific scope level MUST use `{scope}_role` naming:

| Scope | Column Name | Table | Valid Values |
|-------|-------------|-------|--------------|
| System | sys_role | user_profiles | platform_owner, platform_admin |
| Organization | org_role | org_members | org_owner, org_admin, org_user |
| Workspace | ws_role | ws_members | ws_owner, ws_admin, ws_user |
| Module | {module}_role | {module}_members | {module}_owner, {module}_admin, {module}_user |

**Rationale:**
- Creates clear permission hierarchy
- Self-documenting column names
- Consistent pattern across all scope levels
- Scales to new scopes without confusion

✅ **Correct:**
- `user_profiles.sys_role` - Clear this is system-level
- `org_members.org_role` - Clear this is organization-level
- `ws_members.ws_role` - Clear this is workspace-level

❌ **Incorrect:**
- `user_profiles.global_role` - Vague, inconsistent with pattern
- `org_members.role` - Ambiguous, could be any type of role
- `user_profiles.role` - Unclear what scope this applies to

### Enforcement

All new tables with role-based access control MUST follow this pattern.
Existing tables should be migrated as part of technical debt reduction.
```

#### 1.2 Document Migration in CHANGELOG

**File:** `CHANGELOG.md` (create if doesn't exist in cora-dev-toolkit)

```markdown
## [Unreleased]

### Changed
- **[BREAKING]** Renamed `user_profiles.global_role` to `user_profiles.sys_role` for consistency
- **[BREAKING]** Renamed `org_members.role` to `org_members.org_role` to match scope pattern
- Updated all code references to use new column names
- Added Role Column Naming Convention to DATABASE-NAMING-STANDARDS.md
```

---

### Phase 2: Database Schema Changes

#### 2.1 Create Migration Script

**File:** `templates/_modules-core/module-access/db/migrations/YYYY-MM-DD_standardize-role-columns.sql`

```sql
-- =============================================
-- Migration: Standardize Role Column Naming
-- =============================================
-- Purpose: Rename role columns to follow {scope}_role pattern
-- Author: [Your Name]
-- Date: YYYY-MM-DD
-- Version: 1.0

BEGIN;

-- =============================================
-- PART 1: Rename user_profiles.global_role → sys_role
-- =============================================

-- Step 1: Add new column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS sys_role VARCHAR(50);

-- Step 2: Copy data
UPDATE user_profiles 
SET sys_role = global_role 
WHERE global_role IS NOT NULL;

-- Step 3: Add constraint (matches old constraint)
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_sys_role_check 
CHECK (sys_role IN ('platform_owner', 'platform_admin'));

-- Step 4: Drop old constraint (if exists)
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_global_role_check;

-- Step 5: Drop old column
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS global_role;

-- Step 6: Add comment
COMMENT ON COLUMN user_profiles.sys_role IS 
'System-level role for platform-wide permissions. Valid values: platform_owner, platform_admin';

-- =============================================
-- PART 2: Rename org_members.role → org_role
-- =============================================

-- Step 1: Add new column
ALTER TABLE org_members
ADD COLUMN IF NOT EXISTS org_role VARCHAR(50) NOT NULL DEFAULT 'org_user';

-- Step 2: Copy data
UPDATE org_members
SET org_role = role
WHERE role IS NOT NULL;

-- Step 3: Add constraint (matches old constraint)
ALTER TABLE org_members
ADD CONSTRAINT org_members_org_role_check
CHECK (org_role IN ('org_owner', 'org_admin', 'org_user'));

-- Step 4: Drop old constraint (if exists)
ALTER TABLE org_members
DROP CONSTRAINT IF EXISTS org_members_role_check;

-- Step 5: Drop old column
ALTER TABLE org_members
DROP COLUMN IF EXISTS role;

-- Step 6: Add comment
COMMENT ON COLUMN org_members.org_role IS
'Organization-level role. Valid values: org_owner, org_admin, org_user';

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify user_profiles column exists and is populated
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count 
    FROM user_profiles 
    WHERE sys_role IS NULL;
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'user_profiles.sys_role has % NULL values', v_count;
    END IF;
    
    RAISE NOTICE 'user_profiles.sys_role migration successful - no NULL values';
END $$;

-- Verify org_members column exists and is populated
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM org_members
    WHERE org_role IS NULL;
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'org_members.org_role has % NULL values', v_count;
    END IF;
    
    RAISE NOTICE 'org_members.org_role migration successful - no NULL values';
END $$;

COMMIT;

-- =============================================
-- ROLLBACK SCRIPT (Save separately as rollback.sql)
-- =============================================
-- BEGIN;
-- 
-- ALTER TABLE user_profiles ADD COLUMN global_role VARCHAR(50);
-- UPDATE user_profiles SET global_role = sys_role;
-- ALTER TABLE user_profiles DROP COLUMN sys_role;
-- ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_global_role_check 
--   CHECK (global_role IN ('platform_owner', 'platform_admin'));
-- 
-- ALTER TABLE org_members ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'org_user';
-- UPDATE org_members SET role = org_role;
-- ALTER TABLE org_members DROP COLUMN org_role;
-- ALTER TABLE org_members ADD CONSTRAINT org_members_role_check
--   CHECK (role IN ('org_owner', 'org_admin', 'org_user'));
-- 
-- COMMIT;
```

#### 2.2 Update Template Schema Files

**Files to Update:**

1. `templates/_modules-core/module-access/db/schema/002-user-profiles.sql`
   - Change `global_role VARCHAR(50)` → `sys_role VARCHAR(50)`
   - Change constraint name from `user_profiles_global_role_check` → `user_profiles_sys_role_check`
   - Update comments

2. `templates/_modules-core/module-access/db/schema/004-org-members.sql`
   - Change `role VARCHAR(50)` → `org_role VARCHAR(50)`
   - Change constraint name from `org_members_role_check` → `org_members_org_role_check`
   - Update comments

---

### Phase 3: Code Changes

#### 3.1 Lambda Functions

**Files to Update (Search for column references):**

1. **module-access/backend/lambdas/profiles/lambda_function.py**
   - Search: `global_role`, `['role']`, `.get('role')`
   - Replace with: `sys_role`, `['sys_role']`, `.get('sys_role')`
   - Update docstrings mentioning role fields

2. **module-access/backend/lambdas/members/lambda_function.py**
   - Search: `['role']`, `.get('role')`, `WHERE role =`
   - Replace with: `['org_role']`, `.get('org_role')`, `WHERE org_role =`
   - Update SQL queries
   - Update docstrings

3. **module-access/backend/lambdas/identities-management/lambda_function.py**
   - Search: `global_role`, `['role']`
   - Replace with: `sys_role`, `['org_role']`
   - Context-dependent (check if it's user_profiles or org_members)

4. **api-gateway-authorizer/lambda_function.py**
   - Search: `global_role`, `role` in context of authorization
   - Update authorization checks for both columns
   - Update policy generation if role-based

#### 3.2 RLS Policies

**Files to Update:**

1. **templates/_modules-core/module-access/db/schema/009-apply-rls.sql**
   - Search all: `user_profiles.global_role`
   - Replace with: `user_profiles.sys_role`
   - Search all: `org_members.role`
   - Replace with: `org_members.org_role`

2. **templates/_modules-functional/module-ws/db/schema/009-apply-rls.sql**
   - Already fixed to use `org_members.role` (will change to `org_members.org_role`)

3. **Any other module RLS files**
   - Use grep/search to find all references:
     ```bash
     grep -r "user_profiles.global_role" templates/
     grep -r "org_members.role" templates/ | grep -v "ws_members.ws_role"
     ```

#### 3.3 org-common Validators

**File:** `templates/_project-infra-template/lambdas/layers/org-common/python/org_common/validators.py`

**Search for:**
- `global_role`
- `role` (in context of org_members)

**Update functions:**
- `validate_user_role()` - Update to check `sys_role`
- `validate_org_member()` - Update to check `org_role`
- Any other role validation functions

#### 3.4 Frontend Code

**Search Pattern:** Search all frontend code for:
- `global_role` or `globalRole`
- `.role` (when referring to org_members)

**Files likely to need updates:**
- Any profile display components
- Any org member management components
- Type definitions (`types.ts`, `types/index.ts`)
- API client functions

**Example TypeScript Changes:**

```typescript
// Before
export interface UserProfile {
  user_id: string;
  global_role?: 'platform_owner' | 'platform_admin';
}

export interface OrgMember {
  user_id: string;
  org_id: string;
  role: 'org_owner' | 'org_admin' | 'org_user';
}

// After
export interface UserProfile {
  user_id: string;
  sys_role?: 'platform_owner' | 'platform_admin';
}

export interface OrgMember {
  user_id: string;
  org_id: string;
  org_role: 'org_owner' | 'org_admin' | 'org_user';
}
```

---

### Phase 4: Testing

#### 4.1 Unit Tests

**Create Test Migration Script:**

```bash
# Test in development environment
cd ~/code/sts/[project]-stack
./scripts/run-database-migrations.sh

# Verify data integrity
psql $DB_CONNECTION_STRING -c "
  SELECT COUNT(*) as total,
         COUNT(sys_role) as with_sys_role
  FROM user_profiles;
"

psql $DB_CONNECTION_STRING -c "
  SELECT COUNT(*) as total,
         COUNT(org_role) as with_org_role  
  FROM org_members;
"
```

#### 4.2 Integration Tests

Test each authorization level:

1. **System Admin Tests:**
   ```bash
   # Test platform admin can access sys-level endpoints
   # Test platform owner can access all endpoints
   # Test sys_role authorization in authorizer
   ```

2. **Org Admin Tests:**
   ```bash
   # Test org admin can manage org resources
   # Test org owner has full org permissions
   # Test org_role authorization works
   ```

3. **Workspace Tests:**
   ```bash
   # Test ws_owner has workspace permissions
   # Test hierarchical authorization (org admin can override ws permissions)
   ```

#### 4.3 Regression Testing

Run full validation suite:

```bash
cd cora-dev-toolkit/validation
python cora-validate.py --project-root ~/code/sts/[project]-stack

# Should pass:
# - Schema validation
# - API tracing
# - Frontend compliance
# - Import validation
# - Portability checks
```

---

### Phase 5: Deployment

#### 5.1 Development Environment

1. Create new test project with updated templates
2. Run migration script
3. Test all functionality
4. Verify no regressions

#### 5.2 Staging Environment (if applicable)

1. Backup database
2. Run migration script
3. Deploy updated code
4. Run integration tests
5. Verify with sample workflows

#### 5.3 Production Environment

1. **Pre-Deployment:**
   - Schedule maintenance window
   - Notify users
   - Take full database backup
   - Verify rollback script works

2. **Deployment:**
   - Run migration script
   - Deploy updated Lambda functions
   - Deploy updated frontend
   - Verify health checks

3. **Post-Deployment:**
   - Run smoke tests
   - Monitor error logs
   - Verify user access
   - Document any issues

---

## Files Checklist

### Documentation
- [ ] `docs/standards/cora/DATABASE-NAMING-STANDARDS.md` - Add role naming section
- [ ] `CHANGELOG.md` - Document breaking changes
- [ ] `docs/plans/plan_database-role-column-standardization.md` - This file

### Database Schema
- [ ] `templates/_modules-core/module-access/db/schema/002-user-profiles.sql`
- [ ] `templates/_modules-core/module-access/db/schema/004-org-members.sql`
- [ ] `templates/_modules-core/module-access/db/schema/009-apply-rls.sql`
- [ ] `templates/_modules-functional/module-ws/db/schema/009-apply-rls.sql`
- [ ] Create migration script: `migrations/YYYY-MM-DD_standardize-role-columns.sql`
- [ ] Create rollback script: `migrations/YYYY-MM-DD_standardize-role-columns_rollback.sql`

### Backend - Lambda Functions
- [ ] `templates/_modules-core/module-access/backend/lambdas/profiles/lambda_function.py`
- [ ] `templates/_modules-core/module-access/backend/lambdas/members/lambda_function.py`
- [ ] `templates/_modules-core/module-access/backend/lambdas/identities-management/lambda_function.py`
- [ ] `templates/_project-infra-template/lambdas/api-gateway-authorizer/lambda_function.py`

### Backend - org-common Layer
- [ ] `templates/_project-infra-template/lambdas/layers/org-common/python/org_common/validators.py`
- [ ] `templates/_project-infra-template/lambdas/layers/org-common/python/org_common/auth.py` (if exists)

### Frontend - Type Definitions
- [ ] Search all: `*.ts`, `*.tsx` for `global_role` or `globalRole`
- [ ] Search all: `types.ts`, `types/index.ts` for role interfaces
- [ ] Update TypeScript interfaces for UserProfile, OrgMember

### Frontend - Components
- [ ] Any components displaying user profiles
- [ ] Any components managing org members
- [ ] API client functions

---

## Testing Matrix

| Test Case | Expected Behavior | Pass/Fail |
|-----------|-------------------|-----------|
| Platform admin can access sys routes | ✓ Authorized | [ ] |
| Platform owner can access all routes | ✓ Authorized | [ ] |
| Org admin can manage org resources | ✓ Authorized | [ ] |
| Org user cannot access admin endpoints | ✗ Denied | [ ] |
| WS owner can manage workspace | ✓ Authorized | [ ] |
| Hierarchical auth works (org admin → ws) | ✓ Authorized | [ ] |
| Migration preserves all data | No NULL values | [ ] |
| RLS policies enforce new columns | Policies work | [ ] |
| Frontend displays correct roles | UI shows sys_role/org_role | [ ] |
| API responses use new column names | JSON uses new names | [ ] |

---

## Rollback Plan

If issues are encountered, rollback steps:

1. **Stop new deployments**
2. **Run rollback migration script** (provided in Phase 2.1)
3. **Redeploy previous code version**
4. **Verify data integrity**
5. **Resume normal operations**
6. **Post-mortem to identify issue**

**Rollback Decision Criteria:**
- Data loss detected
- Authorization failures
- Cannot fix forward within 30 minutes
- Critical functionality broken

---

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | High | Low | Full backups + tested migration script |
| Authorization failures | High | Medium | Comprehensive testing in dev/staging first |
| Missed code references | Medium | Medium | Grep search + manual review + integration tests |
| Downtime during deployment | Low | Low | Migration script is fast (~seconds) |
| Rollback complexity | Medium | Low | Pre-tested rollback script |

---

## Success Criteria

- [ ] All tests pass (100% pass rate)
- [ ] No NULL values in new columns
- [ ] All code references updated
- [ ] RLS policies work correctly
- [ ] No authorization regressions
- [ ] Documentation complete
- [ ] Zero production incidents

---

## Estimated Timeline

- **Phase 1 (Documentation):** 1 hour
- **Phase 2 (Database Schema):** 2 hours
- **Phase 3 (Code Changes):** 3 hours
- **Phase 4 (Testing):** 1.5 hours
- **Phase 5 (Deployment):** 0.5 hours

**Total:** 8 hours

---

## Notes

- This is a **breaking change** that requires coordination
- Test thoroughly in development before staging/production
- Consider batching with other breaking changes to minimize disruption
- Update all project documentation referencing role columns
- Train team on new naming convention

---

## References

- `docs/standards/cora/DATABASE-NAMING-STANDARDS.md` - Database naming standards
- `docs/standards/standard_LAMBDA-AUTHORIZATION.md` - Authorization patterns
- Analysis from January 11, 2026 session - Database standardization discussion
