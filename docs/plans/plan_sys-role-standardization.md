# Plan: Role Naming Standardization - "sys" as Standard

**Status:** 🔄 PHASES 0-5 COMPLETE, Phase 6.5 IN PROGRESS (124 violations remaining)  
**Priority:** **CRITICAL** - Blocks Module Development  
**Estimated Effort:** 8-11 hours (includes table renaming)  
**Created:** January 13, 2026  
**Updated:** January 13, 2026, 11:50 AM EST (Phase 6.5 validator created, 124 violations remain)  
**Supersedes:** `plan_role-column-standardization.md`, `plan_database-role-column-standardization.md`

---

## Executive Summary

This plan consolidates two duplicate role standardization plans into a single authoritative source. It standardizes all role-related naming to use the `sys_` prefix (replacing `platform_`, `global_`) for system-level roles and standardizes organization-level role columns.

**Key Changes:**

**Columns:**
- `user_profiles.global_role` → `user_profiles.sys_role`
- `org_members.role` → `org_members.org_role`

**Role Values:**
- `platform_admin` → `sys_admin`
- `platform_owner` → `sys_owner`
- `platform_user` → `sys_user`

**Tables:**
- `platform_lambda_config` → `sys_lambda_config`
- `platform_module_registry` → `sys_module_registry`
- `platform_module_usage` → `sys_module_usage`
- `platform_module_usage_daily` → `sys_module_usage_daily`
- `platform_rag` → `sys_rag`
- `platform_idp_config` → `sys_idp_config`
- `platform_idp_audit_log` → `sys_idp_audit_log`

**Important:** Every user must have a `sys_role`. Default is `sys_user` for regular users.

---

## Rationale

### Why "sys" Instead of "platform" or "global"?

1. **Consistency with Industry Standards**: `sys_` is commonly used for system-level resources
2. **Clarity**: "sys" unambiguously indicates system-wide scope
3. **Brevity**: Shorter than "platform_" while maintaining readability
4. **Scope Hierarchy**: Creates clear three-tier structure:
   ```
   sys_role (system/platform level)
     ↓
   org_role (organization/tenant level)
     ↓
   ws_role (workspace/resource level)
   ```

### Benefits

- **Self-Documenting**: Column names clearly indicate their scope
- **Consistent Pattern**: All role columns follow `{scope}_role` pattern
- **Alignment with Standards**: Matches CORA database naming conventions
- **Future-Proof**: Pattern scales to additional scopes if needed

---

## Current State vs Target State

### Database Tables

| Current Table Name | Target Table Name | Module | Notes |
|-------------------|-------------------|--------|-------|
| `platform_lambda_config` | `sys_lambda_config` | module-mgmt | System Lambda configurations |
| `platform_module_registry` | `sys_module_registry` | module-mgmt | System module registry |
| `platform_module_usage` | `sys_module_usage` | module-mgmt | System-wide module usage |
| `platform_module_usage_daily` | `sys_module_usage_daily` | module-mgmt | Daily usage aggregates |
| `platform_rag` | `sys_rag` | module-ai | System-level RAG config |
| `platform_idp_config` | `sys_idp_config` | module-access | Identity provider config |
| `platform_idp_audit_log` | `sys_idp_audit_log` | module-access | IDP audit trail |

### Database Columns

| Table | Current Column | Target Column | Notes |
|-------|---------------|---------------|-------|
| user_profiles | `global_role` | `sys_role` | System-level permissions |
| org_members | `role` | `org_role` | Organization-level permissions |
| ws_members | `ws_role` | `ws_role` | ✅ Already correct |

### Role Values

| Current Value | Target Value | Description |
|--------------|--------------|-------------|
| `platform_owner` | `sys_owner` | System owner with full access |
| `platform_admin` | `sys_admin` | System administrator |
| `platform_user` | `sys_user` | Regular user (default role) |
| `org_owner` | `org_owner` | ✅ Already correct |
| `org_admin` | `org_admin` | ✅ Already correct |
| `org_user` | `org_user` | ✅ Already correct |

---

## Impact Assessment

### Files Affected

**Database:**
- Migration scripts (2 new)
- Schema files (2 files)
- RLS policies (4+ files)

**Backend (Python):**
- Lambda functions (8+ files)
- org_common validators (2 files)
- Test files (6+ files)

**Frontend (TypeScript):**
- Type definitions (4+ files)
- API clients (3+ files)
- Components (8+ files)
- Hooks (4+ files)

**Documentation:**
- Standards (3+ files)
- Guides (2+ files)
- Plans (this file)

**Total Estimated Files:** 40-50 files

---

## Implementation Plan

### Phase 0: Analysis & Discovery (1-2 hours)

**Purpose:** Identify all references to role columns and values across the entire codebase to accurately assess impact and create detailed task plans.

#### 0.1 Automated Discovery

**Run these search commands to find all references:**

```bash
# Navigate to project root
cd {project}-stack  # or cora-dev-toolkit/templates

# ========================================
# Database Column References
# ========================================

# Find global_role references
echo "=== global_role references ===" > role-analysis.txt
grep -r "global_role" --include="*.sql" --include="*.py" --include="*.ts" --include="*.tsx" . >> role-analysis.txt

# Find org_members.role references (exclude ws_members.ws_role)
echo -e "\n=== org_members.role references ===" >> role-analysis.txt
grep -r "org_members\.role\|org_members\[.*role.*\]" --include="*.sql" --include="*.py" --include="*.ts" --include="*.tsx" . >> role-analysis.txt

# ========================================
# Role Value References
# ========================================

# Find platform_owner references
echo -e "\n=== platform_owner references ===" >> role-analysis.txt
grep -r "platform_owner" --include="*.sql" --include="*.py" --include="*.ts" --include="*.tsx" . >> role-analysis.txt

# Find platform_admin references
echo -e "\n=== platform_admin references ===" >> role-analysis.txt
grep -r "platform_admin" --include="*.sql" --include="*.py" --include="*.ts" --include="*.tsx" . >> role-analysis.txt

# Find platform_user references
echo -e "\n=== platform_user references ===" >> role-analysis.txt
grep -r "platform_user" --include="*.sql" --include="*.py" --include="*.ts" --include="*.tsx" . >> role-analysis.txt

# ========================================
# TypeScript Interface References
# ========================================

# Find globalRole (camelCase in TypeScript)
echo -e "\n=== globalRole (TypeScript) references ===" >> role-analysis.txt
grep -r "globalRole" --include="*.ts" --include="*.tsx" . >> role-analysis.txt

# Find role property in types (careful - this is broad)
echo -e "\n=== .role property references ===" >> role-analysis.txt
grep -r "\.role\s*[:=]" --include="*.ts" --include="*.tsx" . >> role-analysis.txt

# ========================================
# Authorization/Permission Checks
# ========================================

# Find authorization patterns
echo -e "\n=== Authorization checks ===" >> role-analysis.txt
grep -r "IN.*platform_\|IN.*global_role" --include="*.sql" --include="*.py" . >> role-analysis.txt

# Find permission helper functions
echo -e "\n=== Permission functions ===" >> role-analysis.txt
grep -r "isSysAdmin\|isPlatformAdmin\|isOrgAdmin" --include="*.ts" --include="*.tsx" --include="*.py" . >> role-analysis.txt

# ========================================
# Summary Statistics
# ========================================

echo -e "\n=== SUMMARY ===" >> role-analysis.txt
echo "global_role count: $(grep -r "global_role" --include="*.sql" --include="*.py" --include="*.ts" --include="*.tsx" . | wc -l)" >> role-analysis.txt
echo "platform_owner count: $(grep -r "platform_owner" --include="*.sql" --include="*.py" --include="*.ts" --include="*.tsx" . | wc -l)" >> role-analysis.txt
echo "platform_admin count: $(grep -r "platform_admin" --include="*.sql" --include="*.py" --include="*.ts" --include="*.tsx" . | wc -l)" >> role-analysis.txt
echo "platform_user count: $(grep -r "platform_user" --include="*.sql" --include="*.py" --include="*.ts" --include="*.tsx" . | wc -l)" >> role-analysis.txt
echo "globalRole count: $(grep -r "globalRole" --include="*.ts" --include="*.tsx" . | wc -l)" >> role-analysis.txt

echo "Analysis complete. See role-analysis.txt for full report."
```

#### 0.2 Manual Review Checklist

After running automated discovery, manually review:

**Database Layer:**
- [ ] All SQL schema files (`.sql`)
- [ ] All migration scripts
- [ ] All RLS policies
- [ ] All database functions/triggers
- [ ] All database constraints

**Backend Layer (Python):**
- [ ] All Lambda functions (`lambda_function.py`)
- [ ] All org_common layer files
- [ ] All test files (`test_*.py`)
- [ ] All validators
- [ ] All authorization helpers

**Frontend Layer (TypeScript):**
- [ ] All type definitions (`types.ts`, `types/index.ts`)
- [ ] All API client files (`api.ts`, `lib/api.ts`)
- [ ] All components (`.tsx`)
- [ ] All hooks (`use*.ts`)
- [ ] All permission helpers (`permissions.ts`)
- [ ] All admin pages

**Documentation:**
- [ ] All standards documents
- [ ] All guides
- [ ] All plans
- [ ] All ADRs (Architecture Decision Records)

#### 0.3 Impact Assessment Template

Create a detailed impact assessment document:

**File:** `docs/analysis/role-standardization-impact-assessment.md`

```markdown
# Role Standardization Impact Assessment

**Date:** [Today's Date]
**Analyst:** [Name]
**Project:** [project-name]

## Summary

Total files affected: [X]
Total lines of code affected: [Y]
Estimated effort: [Z hours]

## Breakdown by Layer

### Database (SQL)
- [ ] Schema files: X files, Y lines
- [ ] Migration scripts: X files, Y lines
- [ ] RLS policies: X files, Y lines
- [ ] Functions/Triggers: X files, Y lines

### Backend (Python)
- [ ] Lambda functions: X files, Y lines
- [ ] org_common layer: X files, Y lines
- [ ] Tests: X files, Y lines
- [ ] Validators: X files, Y lines

### Frontend (TypeScript)
- [ ] Type definitions: X files, Y lines
- [ ] API clients: X files, Y lines
- [ ] Components: X files, Y lines
- [ ] Hooks: X files, Y lines
- [ ] Admin pages: X files, Y lines

### Documentation
- [ ] Standards: X files
- [ ] Guides: X files
- [ ] Plans: X files

## Detailed File List

### Critical Files (Must Update First)
1. `path/to/file1.sql` - X references to global_role
2. `path/to/file2.py` - Y references to platform_admin
3. ...

### High Priority Files
[List files with significant impact]

### Medium Priority Files
[List files with moderate impact]

### Low Priority Files
[List files with minor impact]

## Risk Assessment

### High Risk Areas
- RLS policies (authorization failures if incorrect)
- Lambda authorizer (403 errors if broken)
- User provisioning (users may not be able to log in)

### Medium Risk Areas
- Frontend components (display issues)
- API clients (transformation errors)

### Low Risk Areas
- Documentation (no functional impact)
- Comments (informational only)

## Task Breakdown

### Task 1: Database Updates
**Files:** [X files]
**Lines:** [Y lines]
**Effort:** [Z hours]
**Risk:** High
**Dependencies:** None

### Task 2: Backend Lambda Updates
**Files:** [X files]
**Lines:** [Y lines]
**Effort:** [Z hours]
**Risk:** High
**Dependencies:** Task 1 complete

### Task 3: Frontend Updates
**Files:** [X files]
**Lines:** [Y lines]
**Effort:** [Z hours]
**Risk:** Medium
**Dependencies:** Task 2 complete

### Task 4: Documentation Updates
**Files:** [X files]
**Lines:** [Y lines]
**Effort:** [Z hours]
**Risk:** Low
**Dependencies:** None (can be parallel)

## Testing Strategy

### Unit Tests
- [ ] Database migration tests
- [ ] Lambda function tests
- [ ] Frontend component tests

### Integration Tests
- [ ] End-to-end authorization flow
- [ ] User provisioning flow
- [ ] Org membership flow

### Manual Tests
- [ ] Sys admin login and access
- [ ] Org admin login and access
- [ ] Regular user login and access
```

#### 0.4 Create Detailed Task Plans

Based on the impact assessment, create individual task plans:

**Task 1: Database Layer Updates**
- File list with line numbers
- SQL change patterns
- Migration script details
- Testing approach

**Task 2: Backend Lambda Updates**
- Lambda function list
- Python change patterns
- org_common layer updates
- Test updates

**Task 3: Frontend Updates**
- TypeScript file list
- Type definition changes
- Component updates
- Hook updates

**Task 4: Documentation Updates**
- Standards to update
- Guides to update
- Plans to update/archive

#### 0.5 Analysis Deliverables

**Required Outputs:**
1. `role-analysis.txt` - Automated search results
2. `docs/analysis/role-standardization-impact-assessment.md` - Detailed impact assessment
3. Individual task plan documents (optional, can be part of this plan)
4. Updated effort estimates based on actual file counts

**Phase 0 Complete When:**
- [ ] Automated discovery complete
- [ ] Manual review checklist complete
- [ ] Impact assessment document created
- [ ] Risk areas identified
- [ ] Task breakdown finalized
- [ ] Effort estimates updated
- [ ] Team briefed on findings

---

### Phase 1: Database Migration (3-5 hours)

**Updated Scope:** This phase now includes table renaming in addition to column renaming.

#### 1.1 Create Migration Scripts for Table Renames

**Overview:** Rename 7 tables from `platform_*` to `sys_*` prefix.

**File:** `templates/_modules-core/module-mgmt/db/migrations/YYYY-MM-DD_rename-platform-tables-to-sys.sql`

```sql
-- =============================================
-- Migration: Rename platform_* tables to sys_*
-- =============================================
-- Purpose: Standardize table naming to use sys_ prefix
-- Author: CORA Dev Team
-- Date: 2026-01-13
-- Version: 1.0

BEGIN;

-- =============================================
-- PART 1: Module-MGMT Tables
-- =============================================

-- Table 1: platform_lambda_config → sys_lambda_config
ALTER TABLE IF EXISTS platform_lambda_config 
RENAME TO sys_lambda_config;

-- Table 2: platform_module_registry → sys_module_registry
ALTER TABLE IF EXISTS platform_module_registry 
RENAME TO sys_module_registry;

-- Table 3: platform_module_usage → sys_module_usage
ALTER TABLE IF EXISTS platform_module_usage 
RENAME TO sys_module_usage;

-- Table 4: platform_module_usage_daily → sys_module_usage_daily
ALTER TABLE IF EXISTS platform_module_usage_daily 
RENAME TO sys_module_usage_daily;

-- =============================================
-- PART 2: Module-AI Tables
-- =============================================

-- Table 5: platform_rag → sys_rag
ALTER TABLE IF EXISTS platform_rag 
RENAME TO sys_rag;

-- =============================================
-- PART 3: Module-Access Tables
-- =============================================

-- Table 6: platform_idp_config → sys_idp_config
ALTER TABLE IF EXISTS platform_idp_config 
RENAME TO sys_idp_config;

-- Table 7: platform_idp_audit_log → sys_idp_audit_log
ALTER TABLE IF EXISTS platform_idp_audit_log 
RENAME TO sys_idp_audit_log;

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
DECLARE
    v_old_tables INTEGER;
    v_new_tables INTEGER;
BEGIN
    -- Check for old table names (should be 0)
    SELECT COUNT(*) INTO v_old_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE 'platform_%';
    
    IF v_old_tables > 0 THEN
        RAISE WARNING 'Still have % tables with platform_ prefix', v_old_tables;
    END IF;
    
    -- Check for new table names
    SELECT COUNT(*) INTO v_new_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'sys_lambda_config',
        'sys_module_registry',
        'sys_module_usage',
        'sys_module_usage_daily',
        'sys_rag',
        'sys_idp_config',
        'sys_idp_audit_log'
    );
    
    RAISE NOTICE 'Table rename complete: % sys_* tables found', v_new_tables;
    
    IF v_new_tables != 7 THEN
        RAISE WARNING 'Expected 7 sys_* tables, found %', v_new_tables;
    END IF;
END $$;

COMMIT;
```

#### 1.2 Update Schema Files for Table Names

**Module-MGMT Schema Files:**

**File:** `templates/_modules-core/module-mgmt/db/schema/001-platform-lambda-config.sql`
- Rename file to: `001-sys-lambda-config.sql`
- Replace all `platform_lambda_config` → `sys_lambda_config`

**File:** `templates/_modules-core/module-mgmt/db/schema/002-platform-module-registry.sql`
- Rename file to: `002-sys-module-registry.sql`
- Replace all `platform_module_registry` → `sys_module_registry`

**File:** `templates/_modules-core/module-mgmt/db/schema/003-platform-module-usage.sql`
- Rename file to: `003-sys-module-usage.sql`
- Replace all `platform_module_usage` → `sys_module_usage`
- Replace all `platform_module_usage_daily` → `sys_module_usage_daily`

**Module-AI Schema Files:**

**File:** `templates/_modules-core/module-ai/db/schema/006-platform-rag.sql`
- Rename file to: `006-sys-rag.sql`
- Replace all `platform_rag` → `sys_rag`

**File:** `templates/_modules-core/module-ai/db/migrations/20251109_add_ai_config_fields.sql`
- Replace all `platform_rag` → `sys_rag`

**Module-Access Schema Files:**

**File:** `templates/_modules-core/module-access/db/schema/005-idp-config.sql`
- Replace all `platform_idp_config` → `sys_idp_config`
- Replace all `platform_idp_audit_log` → `sys_idp_audit_log`

#### 1.3 Create Migration Script for user_profiles

**File:** `templates/_modules-core/module-access/db/migrations/YYYY-MM-DD_rename-global-role-to-sys-role.sql`

```sql
-- =============================================
-- Migration: Rename global_role to sys_role
-- =============================================
-- Purpose: Standardize role column naming to use sys_ prefix
-- Author: CORA Dev Team
-- Date: 2026-01-13
-- Version: 1.0

BEGIN;

-- =============================================
-- PART 1: Rename Column
-- =============================================

-- Step 1: Add new column with default
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS sys_role VARCHAR(50) NOT NULL DEFAULT 'sys_user';

-- Step 2: Copy data from old column
UPDATE user_profiles 
SET sys_role = global_role 
WHERE global_role IS NOT NULL;

-- Step 3: Add constraint (includes sys_user)
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_sys_role_check 
CHECK (sys_role IN ('sys_owner', 'sys_admin', 'sys_user'));

-- Step 4: Drop old constraint
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_global_role_check;

-- Step 5: Drop old column
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS global_role;

-- Step 6: Add comment
COMMENT ON COLUMN user_profiles.sys_role IS 
'System-level role for platform-wide permissions. Valid values: sys_owner, sys_admin';

-- =============================================
-- PART 2: Update Role Values (platform_ → sys_)
-- =============================================

-- Update sys_owner
UPDATE user_profiles 
SET sys_role = 'sys_owner' 
WHERE sys_role = 'platform_owner';

-- Update sys_admin
UPDATE user_profiles 
SET sys_role = 'sys_admin' 
WHERE sys_role = 'platform_admin';

-- Update sys_user (regular users)
UPDATE user_profiles 
SET sys_role = 'sys_user' 
WHERE sys_role = 'platform_user';

-- Ensure all users have a sys_role (set to sys_user if NULL)
UPDATE user_profiles 
SET sys_role = 'sys_user' 
WHERE sys_role IS NULL;

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
DECLARE
    v_count INTEGER;
    v_null_count INTEGER;
    v_invalid INTEGER;
BEGIN
    -- Count total users
    SELECT COUNT(*) INTO v_count 
    FROM user_profiles;
    
    RAISE NOTICE 'user_profiles: % total users', v_count;
    
    -- Check for NULL values (should be 0)
    SELECT COUNT(*) INTO v_null_count
    FROM user_profiles
    WHERE sys_role IS NULL;
    
    IF v_null_count > 0 THEN
        RAISE EXCEPTION 'user_profiles.sys_role has % NULL values', v_null_count;
    END IF;
    
    -- Check for invalid values
    SELECT COUNT(*) INTO v_invalid
    FROM user_profiles
    WHERE sys_role NOT IN ('sys_owner', 'sys_admin', 'sys_user');
    
    IF v_invalid > 0 THEN
        RAISE EXCEPTION 'user_profiles.sys_role has % invalid values', v_invalid;
    END IF;
    
    -- Show distribution
    RAISE NOTICE 'sys_owner: %', (SELECT COUNT(*) FROM user_profiles WHERE sys_role = 'sys_owner');
    RAISE NOTICE 'sys_admin: %', (SELECT COUNT(*) FROM user_profiles WHERE sys_role = 'sys_admin');
    RAISE NOTICE 'sys_user: %', (SELECT COUNT(*) FROM user_profiles WHERE sys_role = 'sys_user');
    
    RAISE NOTICE 'user_profiles.sys_role migration successful';
END $$;

COMMIT;
```

#### 1.4 Create Migration Script for org_members

**File:** `templates/_modules-core/module-access/db/migrations/YYYY-MM-DD_rename-role-to-org-role.sql`

```sql
-- =============================================
-- Migration: Rename role to org_role
-- =============================================
-- Purpose: Standardize role column naming to match scope pattern
-- Author: CORA Dev Team
-- Date: 2026-01-13
-- Version: 1.0

BEGIN;

-- =============================================
-- PART 1: Rename Column
-- =============================================

-- Step 1: Add new column
ALTER TABLE org_members
ADD COLUMN IF NOT EXISTS org_role VARCHAR(50) NOT NULL DEFAULT 'org_user';

-- Step 2: Copy data from old column
UPDATE org_members
SET org_role = role
WHERE role IS NOT NULL;

-- Step 3: Add constraint
ALTER TABLE org_members
ADD CONSTRAINT org_members_org_role_check
CHECK (org_role IN ('org_owner', 'org_admin', 'org_user'));

-- Step 4: Drop old constraint
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

DO $$
DECLARE
    v_count INTEGER;
    v_null_count INTEGER;
BEGIN
    -- Count total org_members
    SELECT COUNT(*) INTO v_count
    FROM org_members;
    
    -- Check for NULL values
    SELECT COUNT(*) INTO v_null_count
    FROM org_members
    WHERE org_role IS NULL;
    
    IF v_null_count > 0 THEN
        RAISE EXCEPTION 'org_members.org_role has % NULL values', v_null_count;
    END IF;
    
    RAISE NOTICE 'org_members.org_role migration successful - % rows', v_count;
END $$;

COMMIT;
```

#### 1.5 Update Schema Files for Columns

**File:** `templates/_modules-core/module-access/db/schema/002-user-profiles.sql`

```sql
-- Change column definition
sys_role VARCHAR(50) NOT NULL DEFAULT 'sys_user',
CONSTRAINT user_profiles_sys_role_check CHECK (sys_role IN ('sys_owner', 'sys_admin', 'sys_user'))

-- Update comment
COMMENT ON COLUMN user_profiles.sys_role IS 'System-level role. Values: sys_owner (full access), sys_admin (admin), sys_user (regular user)';
```

**File:** `templates/_modules-core/module-access/db/schema/004-org-members.sql`

```sql
-- Change column definition
org_role VARCHAR(50) NOT NULL DEFAULT 'org_user',
CONSTRAINT org_members_org_role_check CHECK (org_role IN ('org_owner', 'org_admin', 'org_user'))

-- Update comment
COMMENT ON COLUMN org_members.org_role IS 'Organization-level role (org_owner, org_admin, org_user)';
```

---

### Phase 2: RLS Policy Updates (1-2 hours)

Update all RLS policies that reference role columns.

#### 2.1 Update Module-Access RLS Policies

**File:** `templates/_modules-core/module-access/db/schema/009-apply-rls.sql`

**Search for:** `user_profiles.global_role`  
**Replace with:** `user_profiles.sys_role`

**Search for:** `org_members.role`  
**Replace with:** `org_members.org_role`

**Example changes:**

```sql
-- Before
WHERE user_profiles.global_role IN ('platform_admin', 'platform_owner')

-- After
WHERE user_profiles.sys_role IN ('sys_admin', 'sys_owner')
```

```sql
-- Before
WHERE org_members.role IN ('org_admin', 'org_owner')

-- After
WHERE org_members.org_role IN ('org_admin', 'org_owner')
```

#### 2.2 Update Module-WS RLS Policies

**File:** `templates/_modules-functional/module-ws/db/schema/009-apply-rls.sql`

**Search for:** `org_members.role`  
**Replace with:** `org_members.org_role`

#### 2.3 Global Search for Other RLS Files

```bash
# Find all RLS policy files
grep -r "user_profiles.global_role" templates/
grep -r "org_members.role" templates/ | grep -v "ws_members.ws_role"

# Update each file found
```

---

### Phase 3: Backend Lambda Updates (2-3 hours)

#### 3.1 Lambda Functions to Update

| Lambda | File | Changes |
|--------|------|---------|
| profiles | `lambda_function.py` | `global_role` → `sys_role`, values → `sys_*` |
| members | `lambda_function.py` | `['role']` → `['org_role']` |
| orgs | `lambda_function.py` | Both column changes + value updates |
| identities | `lambda_function.py` | Both column changes + value updates |
| ai-config | `lambda_function.py` | Both column changes + value updates |
| provider | `lambda_function.py` | `global_role` → `sys_role`, values → `sys_*` |
| idp-config | `lambda_function.py` | `global_role` → `sys_role`, values → `sys_*` |
| authorizer | `lambda_function.py` | Both column changes + value updates |

#### 3.2 Example Lambda Update Pattern

**File:** `module-access/backend/lambdas/profiles/lambda_function.py`

```python
# Before
profile = common.find_one('user_profiles', {'user_id': user_id})
if profile.get('global_role') in ['platform_admin', 'platform_owner']:
    # Admin logic

# After
profile = common.find_one('user_profiles', {'user_id': user_id})
if profile.get('sys_role') in ['sys_admin', 'sys_owner']:
    # Admin logic
```

**File:** `module-access/backend/lambdas/members/lambda_function.py`

```python
# Before
member = common.find_one('org_members', {'org_id': org_id, 'user_id': user_id})
if member.get('role') in ['org_admin', 'org_owner']:
    # Admin logic

# After
member = common.find_one('org_members', {'org_id': org_id, 'user_id': user_id})
if member.get('org_role') in ['org_admin', 'org_owner']:
    # Admin logic
```

#### 3.3 Update org_common Validators

**File:** `templates/_project-infra-template/lambdas/layers/org-common/python/org_common/validators.py`

```python
# Before
def validate_global_role(role: str) -> str:
    valid_roles = ['platform_owner', 'platform_admin']
    # ...

# After
def validate_sys_role(role: str) -> str:
    """Validate system-level role value."""
    valid_roles = ['sys_owner', 'sys_admin']
    # ...

# Before
def validate_org_role(role: str) -> str:
    # Assumes 'role' field name
    
# After (add explicit docstring)
def validate_org_role(role: str) -> str:
    """
    Validate organization-level role value.
    
    Note: Database column is 'org_role' (not 'role').
    Valid values: org_owner, org_admin, org_user
    """
    valid_roles = ['org_owner', 'org_admin', 'org_user']
    # ...
```

**File:** `templates/_project-infra-template/lambdas/layers/org-common/python/org_common/__init__.py`

```python
# Update exports
from .validators import (
    validate_sys_role,  # Changed from validate_global_role
    validate_org_role,
    # ... other validators
)
```

---

### Phase 4: Frontend Updates (2-3 hours)

#### 4.1 Update TypeScript Types

**File:** `module-access/frontend/types/index.ts`

```typescript
// After
export interface UserProfile {
  user_id: string;
  email: string;
  sysRole: 'sys_owner' | 'sys_admin' | 'sys_user';  // NOT optional - every user has a role
  // ...
}

export interface OrgMember {
  user_id: string;
  org_id: string;
  role: 'org_owner' | 'org_admin' | 'org_user';
  // ...
}

// After
export interface UserProfile {
  user_id: string;
  email: string;
  sysRole?: 'sys_owner' | 'sys_admin';  // Removed platform_user
  // ...
}

export interface OrgMember {
  user_id: string;
  org_id: string;
  orgRole: 'org_owner' | 'org_admin' | 'org_user';
  // ...
}
```

#### 4.2 Update API Transformation Layer

**File:** `module-access/frontend/lib/api.ts`

```typescript
// Before
export function transformUserProfile(apiData: any): UserProfile {
  return {
    userId: apiData.user_id,
    email: apiData.email,
    globalRole: apiData.global_role as UserProfile['globalRole'],
    // ...
  };
}

// After
export function transformUserProfile(apiData: any): UserProfile {
  return {
    userId: apiData.user_id,
    email: apiData.email,
    sysRole: apiData.sys_role as UserProfile['sysRole'],
    // ...
  };
}
```

#### 4.3 Update Permission Helpers

**File:** `module-access/frontend/lib/permissions.ts`

```typescript
// Before
export function isSysAdmin(profile: UserProfile): boolean {
  return profile.globalRole === 'platform_admin' || profile.globalRole === 'platform_owner';
}

// After
export function isSysAdmin(profile: UserProfile): boolean {
  return profile.sysRole === 'sys_admin' || profile.sysRole === 'sys_owner';
}
```

#### 4.4 Update Components

**File:** `apps/web/components/OrganizationSwitcher.tsx`

```typescript
// Before
const isSysAdmin = profile?.globalRole === 'platform_admin' || profile?.globalRole === 'platform_owner';

// After
const isSysAdmin = profile?.sysRole === 'sys_admin' || profile?.sysRole === 'sys_owner';
```

**Search Pattern:**
```bash
# Find all references
grep -r "globalRole" apps/web/
grep -r "global_role" apps/web/
grep -r "platform_admin" apps/web/
grep -r "platform_owner" apps/web/
grep -r "\.role" apps/web/ | grep -v "sysRole" | grep -v "orgRole"
```

---

### Phase 5: Documentation Updates (1 hour)

#### 5.1 Update Standards

**File:** `docs/standards/standard_LAMBDA-AUTHORIZATION.md`

- Replace all `global_role` → `sys_role`
- Replace all `platform_admin` → `sys_admin`
- Replace all `platform_owner` → `sys_owner`
- Update nomenclature section

**File:** `docs/standards/standard_NAVIGATION-AND-ROLES.md`

- Update role value tables
- Update authorization patterns

**File:** `docs/standards/cora/DATABASE-NAMING-STANDARDS.md`

- Update Rule 7 example (if exists)
- Add/update role column naming section

#### 5.2 Update Guides

**File:** `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`

- Update authorization examples
- Update role value references
- Update Phase 3.2.1a authorization patterns

---

### Phase 6: Testing & Validation (1-2 hours)

#### 6.1 Database Validation

```sql
-- Verify user_profiles migration
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN sys_role IS NULL THEN 1 END) as null_sys_role,
  COUNT(CASE WHEN sys_role = 'sys_owner' THEN 1 END) as sys_owners,
  COUNT(CASE WHEN sys_role = 'sys_admin' THEN 1 END) as sys_admins,
  COUNT(CASE WHEN sys_role = 'sys_user' THEN 1 END) as sys_users
FROM user_profiles;

-- Should return 0 NULL values
-- All users should have a sys_role

-- Verify org_members migration
SELECT 
  COUNT(*) as total_members,
  COUNT(CASE WHEN org_role = 'org_owner' THEN 1 END) as org_owners,
  COUNT(CASE WHEN org_role = 'org_admin' THEN 1 END) as org_admins,
  COUNT(CASE WHEN org_role = 'org_user' THEN 1 END) as org_users
FROM org_members;

-- Check for any remaining old column references (should return 0)
SELECT COUNT(*) FROM user_profiles WHERE global_role IS NOT NULL;
SELECT COUNT(*) FROM org_members WHERE role IS NOT NULL;
```

#### 6.2 Backend Testing

```bash
# Run unit tests
cd {project}-infra/lambdas
python -m pytest test_*.py -v

# Check for old references
grep -r "global_role" lambdas/
grep -r "platform_admin" lambdas/
grep -r "platform_owner" lambdas/
```

#### 6.3 Frontend Testing

```bash
# TypeScript compilation check
cd {project}-stack
pnpm run type-check

# Check for old references
grep -r "globalRole" apps/
grep -r "global_role" apps/
grep -r "platform_admin" apps/
```

#### 6.4 Integration Testing Checklist

- [ ] System admin can access `/admin/sys/*` pages
- [ ] System owner has full platform access
- [ ] Regular users cannot access system admin pages
- [ ] Org admin can access org-level resources
- [ ] Org user has appropriate member access
- [ ] RLS policies enforce role-based access
- [ ] API responses use new field names
- [ ] Frontend displays correct roles

---

## Rollback Plan

If issues are discovered after deployment:

### Database Rollback Script

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
- Or deploy hotfix with old column names

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | High | Low | Full database backup before migration |
| Authorization failures | High | Medium | Comprehensive testing in dev/staging first |
| Missed code references | Medium | Medium | Global search + automated validation |
| Frontend/backend mismatch | High | Low | Deploy backend and frontend together |
| Breaking RLS policies | High | Medium | Test policies with different user roles |

---

## Success Criteria

- [ ] All database columns renamed successfully
- [ ] All role values updated (platform_* → sys_*)
- [ ] All backend code updated (no old column names)
- [ ] All frontend code updated (no old field names)
- [ ] All RLS policies updated and functional
- [ ] All validation scripts pass
- [ ] All authorization patterns work correctly
- [ ] User provisioning works correctly
- [ ] Org membership management works correctly
- [ ] No references to old naming in codebase

---

## Deployment Strategy

### Recommended: Big Bang Deployment (Test Environment)

1. Take full database backup
2. Run both migration scripts
3. Deploy all backend code simultaneously
4. Deploy all frontend code
5. Verify with smoke tests

### Alternative: Phased Deployment (If Needed for Production)

1. Phase 1: Add new columns alongside old ones
2. Phase 2: Update code to write to both columns
3. Phase 3: Migrate existing data
4. Phase 4: Update code to read from new columns only
5. Phase 5: Drop old columns after verification period

---

## Checklist for Implementation

### Pre-Implementation
- [ ] Review this plan with team
- [ ] Schedule implementation window
- [ ] Take full database backup
- [ ] Prepare rollback script

### Implementation
- [ ] Run database migrations
- [ ] Update RLS policies
- [ ] Update Lambda functions
- [ ] Update org_common layer
- [ ] Update frontend types
- [ ] Update frontend components
- [ ] Update documentation
- [ ] Run validation scripts

### Post-Implementation
- [ ] Verify database migrations
- [ ] Test authorization flows
- [ ] Test system admin access
- [ ] Test org admin access
- [ ] Test regular user access
- [ ] Monitor error logs
- [ ] Update team on completion

---

## Related Documents

- [Database Naming Standards](../standards/cora/DATABASE-NAMING-STANDARDS.md)
- [Lambda Authorization Standard](../standards/standard_LAMBDA-AUTHORIZATION.md)
- [Module Development Guide](../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md)
- [Navigation and Roles Design](../standards/standard_NAVIGATION-AND-ROLES.md)

---

## Appendix: Automated Role Usage Validation

### Evaluation: Automated Validation Test for Role Standards

**Question:** Should we create an automated validation test to ensure future code changes comply with the new role naming standard?

**Recommendation:** ✅ **YES - Highly Recommended**

---

### Pros of Automated Validation

| Benefit | Description | Impact |
|---------|-------------|--------|
| **Prevents Regressions** | Catches old naming (`platform_admin`, `global_role`) reintroduced in new code | High |
| **Enforces Standards** | Automatically enforces naming conventions without manual review | High |
| **Fast Feedback** | CI/CD catches issues immediately, before merge | High |
| **Executable Documentation** | Tests serve as living documentation of standards | Medium |
| **Reduces Review Burden** | Automated checks free up reviewers for logic/design review | Medium |
| **Consistency Across Projects** | Same validator can be used in all CORA projects | High |
| **Catches Edge Cases** | Finds issues in comments, docs, error messages | Low |
| **Low Maintenance** | Once written, runs automatically with no manual effort | High |

---

### Cons of Automated Validation

| Drawback | Description | Mitigation |
|----------|-------------|------------|
| **Implementation Effort** | Need to write validators (2-4 hours) | One-time cost, high ROI |
| **False Positives** | May flag legitimate uses (historical docs, migration scripts) | Add exclusion patterns, document exceptions |
| **CI/CD Time** | Adds seconds to build pipeline | Minimal - grep-based validation is fast |
| **Maintenance Overhead** | Validators need updates if standards change | Infrequent - standards are stable |
| **Limited Semantic Checks** | Can't catch incorrect role logic, only naming | Combine with code review |

---

### Recommended Implementation

#### Integration with CORA Validation Framework

CORA already has a validation framework at `cora-dev-toolkit/validation/`. Add a new validator:

**File:** `validation/role-naming-validator/role_naming_validator.py`

```python
"""
Role Naming Standards Validator

Ensures code follows role naming standards:
- sys_role, org_role, ws_role (NOT global_role, role)
- sys_admin, sys_owner, sys_user (NOT platform_admin, platform_owner, platform_user)
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple, Dict

# Anti-patterns to detect
ANTI_PATTERNS = {
    'global_role': {
        'correct': 'sys_role',
        'severity': 'error',
        'message': 'Use sys_role instead of global_role',
    },
    'platform_owner': {
        'correct': 'sys_owner',
        'severity': 'error',
        'message': 'Use sys_owner instead of platform_owner',
    },
    'platform_admin': {
        'correct': 'sys_admin',
        'severity': 'error',
        'message': 'Use sys_admin instead of platform_admin',
    },
    'platform_user': {
        'correct': 'sys_user',
        'severity': 'error',
        'message': 'Use sys_user instead of platform_user',
    },
    r'org_members\.role(?!\s*=)': {  # Detects org_members.role but not org_members.org_role
        'correct': 'org_members.org_role',
        'severity': 'error',
        'message': 'Use org_members.org_role instead of org_members.role',
    },
}

# File patterns to exclude from validation
EXCLUSIONS = [
    '**/migrations/**',           # Migration scripts may reference old names
    '**/docs/archive/**',         # Archived documentation
    '**/CHANGELOG.md',            # Change logs document old names
    '**/node_modules/**',         # Dependencies
    '**/venv/**',                 # Python virtual environments
    '**/.git/**',                 # Git metadata
    '**/role-analysis.txt',       # Analysis output file
    '**/plan_role-column-standardization.md',  # Old plan documents
    '**/plan_database-role-column-standardization.md',
]

# File extensions to check
INCLUDE_EXTENSIONS = ['.sql', '.py', '.ts', '.tsx', '.js', '.jsx', '.md']


def should_exclude(file_path: Path) -> bool:
    """Check if file should be excluded from validation."""
    for pattern in EXCLUSIONS:
        if file_path.match(pattern):
            return True
    return False


def validate_file(file_path: Path) -> List[Dict]:
    """Validate a single file for role naming violations."""
    violations = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        for line_num, line in enumerate(lines, 1):
            for pattern, info in ANTI_PATTERNS.items():
                if re.search(pattern, line):
                    violations.append({
                        'file': str(file_path),
                        'line': line_num,
                        'content': line.strip(),
                        'pattern': pattern,
                        'correct': info['correct'],
                        'severity': info['severity'],
                        'message': info['message'],
                    })
    
    except Exception as e:
        print(f"Warning: Could not read {file_path}: {e}", file=sys.stderr)
    
    return violations


def validate_project(project_root: Path) -> Tuple[List[Dict], int]:
    """Validate all files in project."""
    violations = []
    files_checked = 0
    
    for ext in INCLUDE_EXTENSIONS:
        for file_path in project_root.rglob(f'*{ext}'):
            if should_exclude(file_path):
                continue
            
            files_checked += 1
            file_violations = validate_file(file_path)
            violations.extend(file_violations)
    
    return violations, files_checked


def print_report(violations: List[Dict], files_checked: int):
    """Print validation report."""
    print("\n" + "="*80)
    print("ROLE NAMING STANDARDS VALIDATION REPORT")
    print("="*80)
    
    if not violations:
        print(f"\n✅ PASSED: No violations found in {files_checked} files")
        print("\nAll code follows role naming standards:")
        print("  - sys_role, org_role, ws_role ✓")
        print("  - sys_admin, sys_owner, sys_user ✓")
        return
    
    print(f"\n❌ FAILED: {len(violations)} violations found in {files_checked} files\n")
    
    # Group by file
    by_file = {}
    for v in violations:
        file = v['file']
        if file not in by_file:
            by_file[file] = []
        by_file[file].append(v)
    
    for file, file_violations in sorted(by_file.items()):
        print(f"\n📄 {file}")
        for v in file_violations:
            print(f"  Line {v['line']}: {v['message']}")
            print(f"    Found: {v['content'][:80]}")
            print(f"    Use: {v['correct']}")
    
    print("\n" + "="*80)
    print(f"Total: {len(violations)} violations")
    print("="*80)


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Validate role naming standards')
    parser.add_argument('--project-root', type=str, default='.',
                       help='Project root directory to validate')
    parser.add_argument('--fail-on-violations', action='store_true',
                       help='Exit with error code if violations found')
    
    args = parser.parse_args()
    
    project_root = Path(args.project_root).resolve()
    print(f"Validating role naming standards in: {project_root}")
    
    violations, files_checked = validate_project(project_root)
    print_report(violations, files_checked)
    
    if violations and args.fail_on_violations:
        sys.exit(1)
    
    sys.exit(0)


if __name__ == '__main__':
    main()
```

#### Usage Examples

**Local Development:**
```bash
# Check current project
cd {project}-stack
python ../cora-dev-toolkit/validation/role-naming-validator/role_naming_validator.py

# Check templates
cd cora-dev-toolkit/templates
python ../validation/role-naming-validator/role_naming_validator.py
```

**CI/CD Integration (GitHub Actions):**
```yaml
# .github/workflows/validate-role-naming.yml
name: Role Naming Standards

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Validate Role Naming
        run: |
          python validation/role-naming-validator/role_naming_validator.py \
            --project-root . \
            --fail-on-violations
```

**Pre-Commit Hook:**
```bash
# .git/hooks/pre-commit
#!/bin/bash
python validation/role-naming-validator/role_naming_validator.py --fail-on-violations
if [ $? -ne 0 ]; then
    echo "❌ Role naming violations detected. Fix issues before committing."
    exit 1
fi
```

---

### Integration with Existing Validation Framework

Add to `validation/cora-validate.py`:

```python
# Add to validator list
from role_naming_validator import role_naming_validator

validators = [
    # ... existing validators
    {
        'name': 'Role Naming Standards',
        'module': role_naming_validator,
        'enabled': True,
        'fail_on_error': True,
    }
]
```

---

### Cost-Benefit Analysis

**Implementation Cost:**
- Initial development: 2-4 hours
- CI/CD integration: 1 hour
- Documentation: 30 minutes
- **Total: 3.5-5.5 hours**

**Ongoing Cost:**
- Maintenance: ~15 minutes per standards change (rare)
- CI/CD runtime: +5-10 seconds per build
- **Total: Negligible**

**Benefits:**
- Prevents 1 regression per quarter (conservative estimate)
- Each regression fix: 2-4 hours (discovery, fix, test, deploy)
- Annual savings: 8-16 hours
- **ROI: 145-290% in first year**

**Additional Benefits (Not Quantified):**
- Reduced code review time
- Improved code quality
- Enforced standards across team
- Reduced onboarding confusion

---

### Recommendation Summary

✅ **Implement automated role naming validation**

**Rationale:**
1. **High ROI**: 3.5-5.5 hours investment saves 8-16 hours annually
2. **Low Risk**: Grep-based validation is simple and reliable
3. **Fast Feedback**: Catches issues before merge
4. **Scales Well**: Works across all CORA projects
5. **Aligns with CORA**: Fits existing validation framework

**Implementation Priority:** **Phase 6.5** (After Phase 6 Testing, before deployment)

**Next Steps:**
1. Create validator script during Phase 6
2. Test validator on migrated codebase
3. Add to CI/CD pipeline
4. Document usage in standards
5. Roll out to all CORA projects

---

## Notes

- This plan supersedes and merges two previous plans:
  - `plan_role-column-standardization.md` (used `platform_role`)
  - `plan_database-role-column-standardization.md` (used `sys_role`)
- The merged plan uses `sys_` as the standard per project conventions
- All references to `platform_*` and `global_*` are replaced with `sys_*`
- This is a **breaking change** requiring coordinated deployment
- Must be completed **before** implementing module-kb and module-chat
- **Recommended:** Implement automated validation to prevent regressions

---

**Status:** 🔄 IN PROGRESS - 124 violations remaining  
**Remaining:** Fix remaining violations, then Phase 6 (Final Testing & Validation)  
**Last Updated:** January 13, 2026, 11:50 AM EST

### Implementation Progress Summary

| Phase | Description | Status | Completion Date |
|-------|-------------|--------|-----------------|
| Phase 0 | Analysis & Discovery | ✅ COMPLETE | Jan 13, 2026, 9:31 AM |
| Phase 1 | Database Schema Migration | ✅ COMPLETE | Jan 13, 2026, 9:55 AM |
| Phase 2 | RLS Policy Updates | ✅ COMPLETE | Jan 13, 2026, 10:12 AM |
| Phase 3 | Backend Lambda Updates | 🔄 PARTIAL | Jan 13, 2026, 11:02 AM |
| Phase 4 | Frontend Updates | 🔄 PARTIAL | Jan 13, 2026, 11:25 AM |
| Phase 5 | Documentation Updates | ✅ COMPLETE | Jan 13, 2026, 11:40 AM |
| Phase 6 | Testing & Validation | 📋 PENDING | - |
| Phase 6.5 | Automated Validator | ✅ CREATED | Jan 13, 2026, 11:50 AM |

**Files Modified:** 50+ files across database, backend, frontend, and documentation layers.

### Session 111: Automated Validator Created (Jan 13, 2026, 11:40-11:50 AM)

**What Was Done:**
1. Created `validation/role-naming-validator/` with full validator implementation
2. Integrated with `validation/cora-validate.py`
3. Ran validator - found 168 violations in 21 files
4. Fixed `module-ai/ai-config-handler/lambda_function.py` (~44 violations)
5. Fixed `module-ai/provider/lambda_function.py` (2 violations)
6. **Result:** Reduced from 168 → 124 violations

**Remaining Violations (124 total):**
| File | Violations | Priority |
|------|------------|----------|
| `module-mgmt/backend/handlers/module_registry.py` | Many | HIGH |
| `module-mgmt/backend/handlers/module_usage.py` | Many | HIGH |
| `module-mgmt/backend/lambdas/lambda-mgmt/lambda_function.py` | Many | HIGH |
| `module-access/backend/lambdas/idp-config/lambda_function.py` | 8 | HIGH |
| `module-access/backend/lambdas/identities-management/lambda_function.py` | 2 | MEDIUM |
| `module-access/frontend/components/admin/OrgDetails.tsx` | 4 | MEDIUM |
| `module-mgmt/backend/middleware/module_middleware.py` | 3 | MEDIUM |
| `module-mgmt/frontend/adminCard.tsx` | 2 | MEDIUM |
| `module-ws/frontend/pages/PlatformAdminConfigPage.tsx` | 3 | MEDIUM |
| `module-ws/routes/admin/org/ws/page.tsx` | 5 | MEDIUM |
| `module-ws/routes/admin/sys/ws/page.tsx` | 2 | LOW |
| `_project-stack-template/` various files | ~10 | MEDIUM |
| `.build/` artifacts | ~20 | SKIP (regenerated) |

**Command to Run Validator:**
```bash
python3 -m validation.role-naming-validator.cli templates/ --format text
```

**Next Steps:**
1. Fix remaining files (prioritize module-mgmt backend)
2. Re-run validator to confirm 0 violations
3. Complete Phase 6 testing
4. Mark plan as COMPLETE

**See:** `memory-bank/activeContext.md` for detailed session-by-session progress.
