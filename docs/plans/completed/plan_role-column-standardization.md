# Plan: Role Column Name Standardization

**Status:** SUPERSEDED by plan_sys-role-standardization.md
**Priority:** Medium  
**Estimated Effort:** 4-6 hours  
**Prerequisites:** Phase A+B (Role Value Standardization) must be complete

---

## Overview

Standardize database column names for role fields to improve code clarity and consistency:

- `user_profiles.global_role` → `user_profiles.platform_role`
- `org_members.role` → `org_members.org_role`

This is a breaking change that requires coordinated updates across backend, frontend, and database schema.

---

## Context

### Why This Change?

**Current State Issues:**
1. `global_role` is ambiguous - doesn't clearly indicate it's platform-level
2. `org_members.role` is too generic - doesn't indicate it's an org-specific role
3. Inconsistent naming between platform and org roles

**New Standard:**
- `platform_role` - Clearly indicates platform-level permissions
- `org_role` - Clearly indicates organization-level permissions

### Current Role Values (Already Standardized in Phase A+B)

**Platform Roles:**
- `platform_owner` - Platform owner with full access
- `platform_admin` - Platform administrator
- `platform_user` - Normal user (default role for new users)

**Org Roles:**
- `org_owner` - Organization owner (can manage membership)
- `org_admin` - Organization administrator
- `org_user` - Organization member

---

## Affected Files

### Database Schema

1. **module-access schema:**
   - `db/schema/001-users.sql` - Add `platform_role` column, migrate data, drop `global_role`
   - `db/schema/002-organizations.sql` - Add `org_role` column, migrate data, drop `role`

### Backend (Python) - 6+ Files

| File | Changes |
|------|---------|
| `module-mgmt/lambda-mgmt/lambda_function.py` | `global_role` → `platform_role` |
| `module-ai/ai-config-handler/lambda_function.py` | `global_role` → `platform_role`, `role` → `org_role` |
| `module-ai/provider/lambda_function.py` | `global_role` → `platform_role` |
| `module-access/idp-config/lambda_function.py` | `global_role` → `platform_role` |
| `module-access/profiles/lambda_function.py` | `global_role` → `platform_role`, `role` → `org_role` |
| `module-access/members/lambda_function.py` | `role` → `org_role` |
| `module-access/orgs/lambda_function.py` | `global_role` → `platform_role`, `role` → `org_role` |
| `module-access/org-email-domains/lambda_function.py` | `global_role` → `platform_role`, `role` → `org_role` |
| `module-access/layers/org-common/validators.py` | Update `validate_global_role()` → `validate_platform_role()` |
| `module-access/layers/org-common/__init__.py` | Update exports |

### Frontend (TypeScript) - 8+ Files

| File | Changes |
|------|---------|
| `module-access/frontend/lib/api.ts` | `global_role` → `platform_role` |
| `module-access/frontend/types/index.ts` | `globalRole` → `platformRole` |
| `module-access/frontend/lib/permissions.ts` | `globalRole` → `platformRole` |
| `module-access/frontend/components/profile/ProfileCard.tsx` | `globalRole` → `platformRole` |
| `module-access/frontend/components/admin/UsersTab.tsx` | `global_role` → `platform_role` |
| `apps/web/lib/api.ts` | `global_role` → `platform_role` |
| `apps/web/components/OrganizationSwitcher.tsx` | `globalRole` → `platformRole`, `role` → `orgRole` |
| `apps/web/app/page.tsx` | `globalRole` → `platformRole` |
| `apps/web/app/admin/mgmt/page.tsx` | `globalRole` → `platformRole` |
| `apps/web/app/admin/access/orgs/[id]/page.tsx` | `globalRole` → `platformRole` |
| `apps/web/types/clerk.d.ts` | `global_role` → `platform_role` |
| `apps/web/components/AuthRouter.tsx` | `globalRole` → `platformRole` |

### Validation Scripts

| File | Changes |
|------|---------|
| `validation/import_validator/frontend_validator.py` | Update `SESSION_ANTIPATTERNS` |
| `validation/import_validator/role_validator.py` | Update to check for old column names |

---

## Implementation Steps

### Phase 1: Database Migration

#### 1.1 Create Migration SQL for `user_profiles`

```sql
-- File: module-access/db/migrations/001_rename_global_role_to_platform_role.sql

-- Add new column
ALTER TABLE user_profiles 
ADD COLUMN platform_role TEXT;

-- Migrate data from old column
UPDATE user_profiles 
SET platform_role = global_role;

-- Add NOT NULL constraint (after data migration)
ALTER TABLE user_profiles 
ALTER COLUMN platform_role SET NOT NULL;

-- Drop old column
ALTER TABLE user_profiles 
DROP COLUMN global_role;

-- Recreate any indexes that referenced the old column
-- (Check existing indexes first)
```

#### 1.2 Create Migration SQL for `org_members`

```sql
-- File: module-access/db/migrations/002_rename_role_to_org_role.sql

-- Add new column
ALTER TABLE org_members 
ADD COLUMN org_role TEXT;

-- Migrate data from old column
UPDATE org_members 
SET org_role = role;

-- Add NOT NULL constraint (after data migration)
ALTER TABLE org_members 
ALTER COLUMN org_role SET NOT NULL;

-- Drop old column
ALTER TABLE org_members 
DROP COLUMN role;

-- Recreate any indexes, constraints, or triggers
-- (Check existing schema first)
```

### Phase 2: Backend Code Updates

#### 2.1 Update Lambda Functions (Template-First!)

For each Lambda file:
1. Find all references to `global_role` → replace with `platform_role`
2. Find all references to `['role']` or `.get('role')` in org_members context → replace with `org_role`
3. Update function signatures (e.g., `validate_global_role()` → `validate_platform_role()`)

#### 2.2 Update Validators

1. `org_common/validators.py`:
   - Rename `validate_global_role()` → `validate_platform_role()`
   
2. `org_common/__init__.py`:
   - Update exports

### Phase 3: Frontend Code Updates

#### 3.1 Update TypeScript Types

1. `module-access/frontend/types/index.ts`:
   ```typescript
   // Before
   globalRole: "platform_owner" | "platform_admin" | ...
   
   // After
   platformRole: "platform_owner" | "platform_admin" | ...
   ```

#### 3.2 Update API Transformation Layer

1. `module-access/frontend/lib/api.ts`:
   ```typescript
   // Before
   globalRole: apiData.global_role || "platform_user"
   
   // After
   platformRole: apiData.platform_role || "platform_user"
   ```

#### 3.3 Update All Component References

For each component file:
1. Replace `profile.globalRole` → `profile.platformRole`
2. Replace `membership.role` → `membership.orgRole` (in org context)

### Phase 4: Validation Updates

#### 4.1 Update Frontend Validator

`validation/import_validator/frontend_validator.py`:
```python
SESSION_ANTIPATTERNS = {
    r'session.*\.platform_role': {  # Updated from global_role
        'message': 'Accessing platform_role from NextAuth session',
        'suggestion': 'Use profile.platformRole from useUser() hook instead.',
        'severity': 'error'
    },
    # ... other patterns
}
```

#### 4.2 Update Role Validator

`validation/import_validator/role_validator.py`:
- Add anti-pattern detection for old column names:
  - `global_role` should be flagged → suggest `platform_role`
  - `org_members.role` should be flagged → suggest `org_role`

### Phase 5: Testing & Deployment

#### 5.1 Testing Checklist

- [ ] Run all validation scripts
- [ ] Test platform admin login
- [ ] Test org admin/owner login
- [ ] Test org user login
- [ ] Test role-based access control in UI
- [ ] Test API endpoints that check roles
- [ ] Test user provisioning flow
- [ ] Test org membership management

#### 5.2 Deployment Strategy

**Option A: Big Bang Deployment (Recommended for Test Environment)**
1. Run database migrations
2. Deploy all backend code simultaneously
3. Deploy all frontend code
4. Verify with smoke tests

**Option B: Phased Deployment (For Production)**
1. Add new columns alongside old ones
2. Update code to write to both columns
3. Migrate existing data
4. Update code to read from new columns only
5. Drop old columns after verification period

---

## Rollback Plan

If issues are discovered after deployment:

1. **Database Rollback:**
   ```sql
   -- Restore old columns
   ALTER TABLE user_profiles ADD COLUMN global_role TEXT;
   UPDATE user_profiles SET global_role = platform_role;
   
   ALTER TABLE org_members ADD COLUMN role TEXT;
   UPDATE org_members SET role = org_role;
   ```

2. **Code Rollback:**
   - Revert to previous deployment
   - Or deploy hotfix with old column names

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking change affects all users | High | Test thoroughly in dev/test environments first |
| Data loss during migration | High | Backup database before migration |
| Incomplete code updates | Medium | Use validation scripts to find all references |
| Frontend/backend mismatch | High | Deploy backend and frontend together |

---

## Success Criteria

- [ ] All database columns renamed successfully
- [ ] All backend code updated (no references to old column names)
- [ ] All frontend code updated (no references to old field names)
- [ ] All validation scripts pass
- [ ] All role-based access control works correctly
- [ ] User provisioning works correctly
- [ ] Org membership management works correctly

---

## Notes

- This plan assumes Phase A+B (role value standardization) is already complete
- The database migration should be tested on a copy of production data first
- Consider adding a feature flag to toggle between old and new column names during transition (if phased deployment is chosen)

---

## Related Documents

- Session 35 Context: `memory-bank/activeContext.md`
- Role Value Standardization: Completed in Phase A+B (Dec 28, 2024)
