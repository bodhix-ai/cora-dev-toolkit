# Role Standardization Migration Guide

## Overview

This guide explains how to apply the role standardization changes to existing databases and how to handle the legacy schema files.

## Migration Scripts Created

| Script | Purpose | Scope |
|--------|---------|-------|
| `20260113_sys_role_standardization.sql` | Comprehensive migration | All table renames + column renames |
| `20260113_user_profiles_sys_role.sql` | Standalone user_profiles | Only `global_role` → `sys_role` column |
| `20260113_org_members_org_role.sql` | Standalone org_members | Only `role` → `org_role` column |

## Execution Order for Existing Databases

### Option A: Comprehensive Migration (Recommended)

Run the single comprehensive migration that handles everything:

```bash
# From your project root
psql -h YOUR_SUPABASE_HOST -d postgres -U postgres -f scripts/migrations/20260113_sys_role_standardization.sql
```

**This single script handles:**
1. Table renames (`platform_*` → `sys_*`)
2. Column renames (`global_role` → `sys_role`, `role` → `org_role`)
3. Index renames
4. RLS policy updates
5. Constraint updates
6. Data migration (value conversion: `platform_owner` → `sys_owner`, etc.)

### Option B: Piece-by-Piece Migration

If you prefer granular control, run in this order:

```bash
# 1. First: User profiles column rename
psql -f scripts/migrations/20260113_user_profiles_sys_role.sql

# 2. Second: Org members column rename
psql -f scripts/migrations/20260113_org_members_org_role.sql

# 3. Third: Table renames (need to extract from comprehensive or create separate)
# Note: Table renames are currently only in the comprehensive script
```

## What the Migrations Do (NO Deletions Needed)

**The migration scripts use `ALTER TABLE ... RENAME TO` which:**
- ✅ Renames tables in-place
- ✅ Preserves all existing data
- ✅ Automatically updates foreign key references
- ✅ No data loss, no recreation needed

**You do NOT need to:**
- ❌ Delete tables manually
- ❌ Recreate tables
- ❌ Re-insert data

## Legacy Schema File Strategy

### The Problem

The old `platform_*` schema files are used by `create-cora-project.sh` when creating new test projects. We need a clean transition strategy.

### The Solution: Delete Old, Keep New

**For the TEMPLATES (affects new project creation):**

The old schema files should be **DELETED** from templates because:
1. New projects should start with the correct naming from day 1
2. The new `sys_*` schema files already exist
3. Both files cannot coexist (they'd create duplicate tables)

**Files to DELETE from templates:**

```bash
# Module-mgmt (3 files)
rm templates/_modules-core/module-mgmt/db/schema/001-platform-lambda-config.sql
rm templates/_modules-core/module-mgmt/db/schema/002-platform-module-registry.sql
rm templates/_modules-core/module-mgmt/db/schema/003-platform-module-usage.sql

# Module-ai (1 file)
rm templates/_modules-core/module-ai/db/schema/006-platform-rag.sql

# Module-access (1 file)
rm templates/_modules-core/module-access/db/schema/005-idp-config.sql
```

**Files that REPLACE them (already created):**

```
# Module-mgmt
001-sys-lambda-config.sql      (replaces 001-platform-lambda-config.sql)
002-sys-module-registry.sql    (replaces 002-platform-module-registry.sql)
003-sys-module-usage.sql       (replaces 003-platform-module-usage.sql)

# Module-ai
006-sys-rag.sql                (replaces 006-platform-rag.sql)

# Module-access
005-sys-idp-config.sql         (replaces 005-idp-config.sql)
```

### When to Delete Legacy Files

**Delete AFTER:**
1. ✅ All new sys_* schema files are created and tested
2. ✅ create-cora-project.sh is updated (if needed) to use new file names
3. ✅ You've tested creating a new project with the new schemas

**The deletion is SAFE because:**
- New projects will use the new sys_* schemas
- Existing projects have their own copies (not linked to templates)
- Existing databases need migrations, not schema re-runs

## Summary: Two Paths

### Path 1: Existing Database (e.g., pm-app, ai-sec)

```
1. Run migration script against live database
2. Deploy updated Lambda code (references new column names)
3. Deploy updated frontend (references new column names)
```

### Path 2: New Test Project

```
1. Delete old platform_* schema files from templates
2. Create new project using create-cora-project.sh
3. New project gets sys_* schemas automatically
4. No migration needed (starts correct from day 1)
```

## Verification Queries

After running migrations, verify with:

```sql
-- Check user_profiles column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('global_role', 'sys_role');
-- Expected: sys_role only

-- Check org_members column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'org_members' 
AND column_name IN ('role', 'org_role');
-- Expected: org_role only

-- Check table names
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%platform%' OR table_name LIKE '%sys_%';
-- Expected: Only sys_* tables, no platform_* tables
```

## Rollback

Each migration script includes rollback instructions at the bottom. Use only if needed and BEFORE deploying code changes.
