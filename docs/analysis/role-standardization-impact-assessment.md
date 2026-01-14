# Role Standardization Impact Assessment

**Date:** January 13, 2026, 9:17 AM EST  
**Analyst:** CORA Dev Toolkit AI  
**Project:** CORA Templates (cora-dev-toolkit/templates)  
**Plan Reference:** [plan_sys-role-standardization.md](../plans/plan_sys-role-standardization.md)

---

## Executive Summary

This assessment documents all files affected by the role naming standardization from `global_role`/`platform_*` to `sys_role`/`sys_*`. This is a **critical foundation task** that must be completed before implementing new functional modules (module-kb, module-chat).

**Total Impact:**
- **285 total references** to update
- **40-50 files** affected across templates
- **6-8 hours** estimated effort
- **High risk** - affects authentication and authorization

---

## Summary Statistics

### Pattern Counts

| Pattern | Count | Change Required |
|---------|-------|-----------------|
| `global_role` | 101 | → `sys_role` |
| `platform_owner` | 99 | → `sys_owner` |
| `platform_admin` | 145 | → `sys_admin` |
| `platform_user` | 5 | → `sys_user` |
| `globalRole` (TypeScript) | 14 | → `sysRole` |
| `org_members.role` | 4 | → `org_members.org_role` |
| **TOTAL** | **368** | **All must be updated** |

**Note:** Some references overlap (e.g., a line containing both `global_role` and `platform_admin`), so actual line count is ~285 unique references.

---

## Breakdown by Layer

### Database Layer (SQL)

**Estimated Files:** 10-15 files  
**Estimated Changes:** 80-100 references

**Critical Files:**
1. `module-access/db/schema/002-user-profiles.sql` - Schema definition
2. `module-access/db/schema/004-org-members.sql` - Schema definition
3. `module-access/db/schema/009-apply-rls.sql` - RLS policies
4. `module-mgmt/db/schema/001-platform-lambda-config.sql` - RLS policies (5 references)
5. `module-ai/db/schema/*.sql` - RLS policies (8 files with references)
6. `module-ai/db/migrations/*.sql` - Migration files (4 files)

**Changes Required:**
- Column rename: `global_role` → `sys_role`
- Column rename: `org_members.role` → `org_members.org_role`
- Value updates: `platform_owner` → `sys_owner`, `platform_admin` → `sys_admin`, `platform_user` → `sys_user`
- RLS policy checks: All `WHERE global_role IN (...)` clauses
- Migration scripts: Create new migrations for column renames

**Risk:** **HIGH** - Incorrect RLS policies = authorization bypass or 403 errors

---

### Backend Layer (Python)

**Estimated Files:** 15-20 files  
**Estimated Changes:** 120-150 references

**Lambda Functions to Update:**

| Module | Lambda | File | Est. Changes |
|--------|--------|------|--------------|
| module-access | profiles | `lambda_function.py` | 10-15 |
| module-access | members | `lambda_function.py` | 5-8 |
| module-access | orgs | `lambda_function.py` | 5-8 |
| module-access | identities-management | `lambda_function.py` | 8-10 |
| module-access | idp-config | `lambda_function.py` | 3-5 |
| module-access | org-email-domains | `lambda_function.py` | 2-3 |
| module-ai | ai-config-handler | `lambda_function.py` | 3-5 |
| module-ai | provider | `lambda_function.py` | 3-5 |
| module-mgmt | lambda-mgmt | `lambda_function.py` | 2-3 |

**org_common Layer:**
- `validators.py` - Update `validate_global_role()` → `validate_sys_role()`
- `__init__.py` - Update exports
- Test files: 6+ test files need updates

**Common Patterns to Update:**
```python
# Pattern 1: Reading role from profile
profile.get('global_role')  →  profile.get('sys_role')

# Pattern 2: Authorization checks
if profile.get('global_role') in ['platform_admin', 'platform_owner']:
→
if profile.get('sys_role') in ['sys_admin', 'sys_owner']:

# Pattern 3: Default role assignment
'global_role': 'global_user'  →  'sys_role': 'sys_user'

# Pattern 4: Org member role access
member.get('role')  →  member.get('org_role')
```

**Risk:** **HIGH** - Lambda functions control all API access

---

### Frontend Layer (TypeScript/TSX)

**Estimated Files:** 15-20 files  
**Estimated Changes:** 60-80 references

**Type Definitions:**
- `module-access/frontend/types/index.ts`
- `module-access/frontend/lib/api.ts`
- `_project-stack-template/apps/web/types/clerk.d.ts`
- `_project-stack-template/apps/web/lib/api.ts`

**Components:**
- `module-access/frontend/components/admin/UsersTab.tsx` - Display user roles
- Various admin pages that check user permissions

**Hooks:**
- Permission hooks that check `globalRole`

**Common Patterns to Update:**
```typescript
// Pattern 1: Type definitions
globalRole?: 'platform_owner' | 'platform_admin'
→
sysRole?: 'sys_owner' | 'sys_admin' | 'sys_user'

// Pattern 2: API transformation
globalRole: apiData.global_role
→
sysRole: apiData.sys_role

// Pattern 3: Permission checks
if (profile.globalRole === 'platform_admin')
→
if (profile.sysRole === 'sys_admin')

// Pattern 4: Org member role
member.role  →  member.orgRole
```

**Risk:** **MEDIUM** - Frontend issues are visible but don't break auth

---

### Documentation Layer

**Estimated Files:** 5-8 files  
**Estimated Changes:** 20-30 references

**Standards to Update:**
- `docs/standards/standard_LAMBDA-AUTHORIZATION.md` - Authorization patterns
- `docs/standards/standard_NAVIGATION-AND-ROLES.md` - Role definitions
- `docs/standards/cora/DATABASE-NAMING-STANDARDS.md` - Naming conventions

**Guides to Update:**
- `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md` - Development examples

**Plans to Archive:**
- `docs/plans/plan_role-column-standardization.md` - SUPERSEDED
- `docs/plans/plan_database-role-column-standardization.md` - SUPERSEDED

**Risk:** **LOW** - Documentation doesn't break functionality

---

## Detailed File List

### Critical Files (Must Update First)

**Database Schema:**
1. `_modules-core/module-access/db/schema/002-user-profiles.sql`
   - Column definition: `global_role` → `sys_role`
   - Constraint: Update valid values

2. `_modules-core/module-access/db/schema/004-org-members.sql`
   - Column definition: `role` → `org_role`
   - Constraint: Update to `org_role`

3. `_modules-core/module-access/db/schema/009-apply-rls.sql`
   - Multiple RLS policies with `global_role` and `org_members.role`

**Backend Core:**
4. `_project-infra-template/lambdas/layers/org-common/python/org_common/validators.py`
   - Function rename: `validate_global_role()` → `validate_sys_role()`
   - Update valid values

5. `_modules-core/module-access/backend/lambdas/profiles/lambda_function.py`
   - ~10-15 references to `global_role`
   - Default role assignment

6. `_modules-core/module-access/backend/lambdas/identities-management/lambda_function.py`
   - User provisioning with default role
   - Authorization checks

**Frontend Core:**
7. `_modules-core/module-access/frontend/types/index.ts`
   - Type definition: `UserProfile.globalRole` → `sysRole`
   - Type definition: `OrgMember.role` → `orgRole`

8. `_modules-core/module-access/frontend/lib/api.ts`
   - API transformation layer
   - Must handle both snake_case and camelCase

### High Priority Files

**Module-MGMT:**
9. `_modules-core/module-mgmt/backend/lambdas/lambda-mgmt/lambda_function.py` - 1 reference
10. `_modules-core/module-mgmt/db/schema/001-platform-lambda-config.sql` - 5 RLS policies

**Module-AI:**
11. `_modules-core/module-ai/backend/lambdas/ai-config-handler/lambda_function.py` - 2 references
12. `_modules-core/module-ai/backend/lambdas/provider/lambda_function.py` - 2 references
13. `_modules-core/module-ai/db/schema/001-ai-providers.sql` - RLS policy
14. `_modules-core/module-ai/db/schema/002-ai-models.sql` - RLS policy
15. `_modules-core/module-ai/db/schema/003-ai-validation-history.sql` - RLS policy
16. `_modules-core/module-ai/db/schema/004-ai-validation-progress.sql` - RLS policy
17. `_modules-core/module-ai/db/schema/006-platform-rag.sql` - 2 RLS policies
18. `_modules-core/module-ai/db/schema/007-org-prompt-engineering.sql` - RLS policy

**Module-AI Migrations:**
19. `_modules-core/module-ai/db/migrations/002-remove-org-id-make-platform-level.sql` - 2 references
20. `_modules-core/module-ai/db/migrations/003-add-model-summary-view-and-validation-history.sql` - 1 reference
21. `_modules-core/module-ai/db/migrations/004-add-validation-progress-tracking.sql` - 1 reference

### Medium Priority Files

**Module-Access Backend:**
22-27. Various Lambda functions in `module-access/backend/lambdas/`:
   - `orgs/lambda_function.py` - 2 references
   - `members/lambda_function.py` - 1 reference
   - `idp-config/lambda_function.py` - 1 reference
   - `org-email-domains/lambda_function.py` - 1 reference

**Module-Access Frontend:**
28. `_modules-core/module-access/frontend/components/admin/UsersTab.tsx` - 5 references
29. Other frontend components with role checks

**Project Stack Template:**
30. `_project-stack-template/apps/web/types/clerk.d.ts` - Type definition
31. `_project-stack-template/apps/web/lib/api.ts` - API type

---

## Risk Assessment

### High Risk Areas

| Area | Risk | Impact | Mitigation |
|------|------|--------|------------|
| RLS Policies | Authorization bypass | Critical | Comprehensive testing with different user roles |
| Lambda Authorizer | 403 errors site-wide | Critical | Test with sys_admin, sys_owner, sys_user roles |
| User Provisioning | Users cannot log in | Critical | Test new user creation flow |
| Database Migration | Data loss | Critical | Full database backup before migration |
| Frontend/Backend Mismatch | API errors | High | Deploy backend and frontend together |

### Medium Risk Areas

| Area | Risk | Impact | Mitigation |
|------|------|--------|------------|
| Frontend Components | Display issues | Medium | TypeScript compilation checks |
| API Clients | Transformation errors | Medium | Test API response handling |
| Permission Helpers | Incorrect permissions | Medium | Unit test all permission functions |

### Low Risk Areas

| Area | Risk | Impact | Mitigation |
|------|------|--------|------------|
| Documentation | Information outdated | Low | Update docs in parallel |
| Comments | Confusing names | Low | Update as discovered |

---

## Task Breakdown

### Task 1: Database Updates (2-3 hours)

**Goal:** Rename columns and update role values in database

**Files:** 15-20 SQL files

**Steps:**
1. Create migration script for `user_profiles.global_role` → `sys_role`
2. Create migration script for `org_members.role` → `org_role`
3. Update all schema files with new column names
4. Update all RLS policies (module-access, module-mgmt, module-ai)
5. Update migration files (module-ai has 4 migrations with references)
6. Run verification queries

**Dependencies:** None - start here

**Risk:** High

**Validation:**
- All users have valid `sys_role` values
- All org_members have valid `org_role` values
- No NULL values in role columns
- RLS policies enforce correct authorization

---

### Task 2: Backend Lambda Updates (2-3 hours)

**Goal:** Update all Lambda functions to use new column names and values

**Files:** 15-20 Python files

**Steps:**
1. Update `org_common/validators.py` - `validate_sys_role()` function
2. Update all Lambda functions in module-access (6 Lambdas)
3. Update Lambda functions in module-ai (2 Lambdas)
4. Update Lambda function in module-mgmt (1 Lambda)
5. Update all test files
6. Run unit tests

**Dependencies:** Task 1 complete (database must be updated first)

**Risk:** High

**Validation:**
- All Lambda unit tests pass
- Authorization checks work correctly
- New user provisioning assigns `sys_user` role
- Sys admin can access admin endpoints

---

### Task 3: Frontend Updates (2-3 hours)

**Goal:** Update TypeScript types, API clients, and components

**Files:** 15-20 TypeScript/TSX files

**Steps:**
1. Update type definitions (`types/index.ts`, `lib/api.ts`)
2. Update API transformation layer (handle both snake_case and camelCase)
3. Update permission helper functions
4. Update admin components (UsersTab, etc.)
5. Update all components with role checks
6. Run TypeScript compilation check

**Dependencies:** Task 2 complete (backend must return correct field names)

**Risk:** Medium

**Validation:**
- TypeScript compilation succeeds
- No snake_case references in frontend code
- Permission checks work correctly
- Admin pages display roles correctly

---

### Task 4: Documentation Updates (1 hour)

**Goal:** Update all standards, guides, and plans

**Files:** 5-8 documentation files

**Steps:**
1. Update `standard_LAMBDA-AUTHORIZATION.md`
2. Update `standard_NAVIGATION-AND-ROLES.md`
3. Update `standard_DATABASE-NAMING-STANDARDS.md` (if exists)
4. Update `guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`
5. Archive superseded plans

**Dependencies:** None (can be done in parallel)

**Risk:** Low

**Validation:**
- All examples use new naming
- No references to old naming
- Standards are consistent

---

## Testing Strategy

### Unit Tests

**Database Migration Tests:**
- Migration scripts run without errors
- Column renames preserve all data
- Constraints are correctly applied
- No NULL values after migration

**Lambda Function Tests:**
- All existing unit tests pass
- Authorization tests with `sys_admin`, `sys_owner`, `sys_user`
- Org member tests with `org_role`

**Frontend Component Tests:**
- TypeScript compilation succeeds
- Permission helpers return correct values
- API transformation handles both formats

### Integration Tests

**End-to-End Authorization Flow:**
1. Sys owner can access all platform resources ✓
2. Sys admin can access admin pages ✓
3. Sys user (regular user) cannot access admin pages ✓
4. Org owner can access org resources ✓
5. Org admin can manage org members ✓
6. Org user has read-only org access ✓

**User Provisioning Flow:**
1. New user created with default `sys_user` role ✓
2. User can log in successfully ✓
3. User profile displays correct role ✓
4. User added to org with `org_user` role ✓

**Org Membership Flow:**
1. Add member to org ✓
2. Update member role (`org_user` → `org_admin`) ✓
3. Remove member from org ✓
4. RLS policies enforce role-based access ✓

### Manual Tests

**Sys Admin Access:**
- [ ] Log in as sys admin
- [ ] Access `/admin/sys/*` pages
- [ ] Verify platform-wide visibility
- [ ] Check RLS policies allow sys admin queries

**Org Admin Access:**
- [ ] Log in as org admin
- [ ] Access org management pages
- [ ] Verify org-level visibility only
- [ ] Cannot access other orgs' data

**Regular User Access:**
- [ ] Log in as regular user (sys_user)
- [ ] Cannot access admin pages
- [ ] Can access own profile
- [ ] Can access orgs where member

---

## Deployment Strategy

### Recommended: Big Bang Deployment (Test Environment)

**Rationale:** Role naming is tightly coupled across all layers. Incremental deployment would require maintaining both old and new naming simultaneously, which is complex and error-prone.

**Steps:**
1. **Pre-Deployment:**
   - Take full database backup
   - Deploy to test environment first
   - Run comprehensive testing

2. **Deployment:**
   - Run both database migration scripts
   - Deploy all backend Lambda functions simultaneously
   - Deploy frontend application
   - Verify with smoke tests

3. **Post-Deployment:**
   - Monitor error logs for 24-48 hours
   - Test with different user roles
   - Verify RLS policies work correctly

**Rollback:** Revert Git commits + database rollback script (provided in plan)

### Alternative: Phased Deployment (If Needed)

**Only if big bang is too risky for production:**

1. **Phase 1:** Add new columns alongside old ones
2. **Phase 2:** Update code to write to both columns
3. **Phase 3:** Migrate existing data
4. **Phase 4:** Update code to read from new columns only
5. **Phase 5:** Drop old columns after 1-2 week verification period

**Trade-off:** More complex, takes longer, but lower risk in production

---

## Success Criteria

### Functional Success

- [ ] All database columns renamed successfully
- [ ] All role values updated (`platform_*` → `sys_*`)
- [ ] All backend code updated (no old column names)
- [ ] All frontend code updated (no old field names)
- [ ] All RLS policies updated and functional
- [ ] User provisioning works correctly
- [ ] Org membership management works correctly
- [ ] All authorization patterns work correctly

### Quality Success

- [ ] All validation scripts pass (Phase 6)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] TypeScript compilation succeeds
- [ ] No references to old naming in codebase
- [ ] Documentation is up-to-date

### Operational Success

- [ ] No authorization failures reported
- [ ] No user login issues
- [ ] Error logs show no role-related errors
- [ ] System monitoring shows normal performance

---

## Rollback Plan

### Database Rollback Script

**File:** `rollback-role-standardization.sql`

```sql
BEGIN;

-- Rollback user_profiles
ALTER TABLE user_profiles ADD COLUMN global_role VARCHAR(50);
UPDATE user_profiles SET global_role = 
  CASE 
    WHEN sys_role = 'sys_owner' THEN 'platform_owner'
    WHEN sys_role = 'sys_admin' THEN 'platform_admin'
    WHEN sys_role = 'sys_user' THEN 'platform_user'
    ELSE 'platform_user'
  END;
ALTER TABLE user_profiles DROP COLUMN sys_role;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_global_role_check 
  CHECK (global_role IN ('platform_owner', 'platform_admin', 'platform_user'));

-- Rollback org_members
ALTER TABLE org_members ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'org_user';
UPDATE org_members SET role = org_role;
ALTER TABLE org_members DROP COLUMN org_role;
ALTER TABLE org_members ADD CONSTRAINT org_members_role_check
  CHECK (role IN ('org_owner', 'org_admin', 'org_user'));

COMMIT;
```

### Code Rollback

- Revert to previous Git commit
- Or deploy hotfix branch with old column names

### Rollback Timeline

- Detection: 0-2 hours (monitoring alerts)
- Decision: 2-4 hours (assess impact)
- Execution: 4-5 hours (rollback + verify)

---

## Timeline

### Estimated Total Effort: 6-8 hours

| Phase | Effort | Start | Dependencies |
|-------|--------|-------|--------------|
| Phase 0: Analysis | ✅ Complete | Day 1 | None |
| Phase 1: Database | 2-3 hours | Day 1 | Phase 0 |
| Phase 2: RLS Policies | 1-2 hours | Day 1 | Phase 1 |
| Phase 3: Backend | 2-3 hours | Day 2 | Phase 2 |
| Phase 4: Frontend | 2-3 hours | Day 2 | Phase 3 |
| Phase 5: Docs | 1 hour | Day 2 | None (parallel) |
| Phase 6: Testing | 1-2 hours | Day 3 | Phase 4 |
| Phase 6.5: Validator | 2-4 hours | Day 3 | Phase 6 |

**Total Calendar Time:** 3 days (assuming 4-6 hours/day)

---

## Next Steps

1. ✅ **Phase 0 Analysis Complete** - This document
2. **Review with team** - Discuss approach and risks
3. **Execute Phase 1** - Database migrations
4. **Execute Phase 2** - RLS policy updates
5. **Execute Phase 3** - Backend Lambda updates
6. **Execute Phase 4** - Frontend updates
7. **Execute Phase 5** - Documentation updates
8. **Execute Phase 6** - Testing & validation
9. **Execute Phase 6.5** - Create automated validator (recommended)

---

## Related Documents

- [Role Standardization Plan](../plans/plan_sys-role-standardization.md) - Master implementation plan
- [Database Naming Standards](../standards/cora/DATABASE-NAMING-STANDARDS.md) - Naming conventions (if exists)
- [Lambda Authorization Standard](../standards/standard_LAMBDA-AUTHORIZATION.md) - Authorization patterns
- [Module Development Guide](../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md) - Development examples

---

**Analysis Complete:** January 13, 2026, 9:17 AM EST  
**Status:** ✅ Ready for Implementation  
**Recommended Next Step:** Begin Phase 1 (Database Migration)
