# ADR-006: Supabase PostgreSQL Default Privileges for Service Role

**Date:** December 17, 2025  
**Status:** ✅ Accepted  
**Deciders:** Aaron Kilinski, Claude (Cline Agent)  
**Related Issues:** User Provisioning Schema Fix (Dec 17, 2025)

---

## Context

During the implementation of user provisioning functionality for CORA projects, we encountered a critical issue where Lambda functions could not access tables in the Supabase PostgreSQL database, despite the tables existing and being accessible through the Supabase Studio interface.

### The Problem

**Symptoms:**
- Lambda functions returned errors when attempting to query or insert data
- Tables were visible in Supabase Studio but inaccessible via service role
- User provisioning Lambda failed with permission errors
- Database schema applied successfully but service role lacked access

**Root Cause:**
When tables are created in Supabase PostgreSQL, they inherit default ownership and privileges from the database. However, the **Supabase service role** (used by Lambda functions via the service role key) did not have automatic grants on newly created tables.

**Technical Details:**
- Supabase uses PostgreSQL Role-Based Access Control (RBAC)
- Service role (`service_role`) needs explicit grants to access tables
- Schema files executed via Supabase migrations don't automatically grant service role access
- Without proper default privileges, each table requires manual GRANT statements

### What Wasn't Working

**Before the fix, our schema files looked like:**
```sql
-- 001-external-identities.sql
CREATE TABLE IF NOT EXISTS public.external_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- ... columns ...
);

-- Missing: No grants for service_role!
```

**Result:**
- ✅ Table created successfully
- ❌ Service role cannot SELECT from table
- ❌ Service role cannot INSERT into table
- ❌ Lambda functions fail with permission errors

---

## Decision

We decided to **implement default privileges for the service role as the first schema file** (`000-default-privileges.sql`) that executes before any table creation.

### Solution: Default Privileges Pattern

**File:** `000-default-privileges.sql`

```sql
-- Grant default privileges for all future tables created by postgres role
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

-- Grant default privileges for all future sequences
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO service_role;

-- Grant privileges on existing tables (if any)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO service_role;
```

### Key Principles

1. **Default Privileges First**: Execute this file BEFORE any table creation (hence `000-` prefix)
2. **Future Tables**: Use `ALTER DEFAULT PRIVILEGES` for tables created after this runs
3. **Existing Tables**: Use `GRANT ... ON ALL TABLES` for retroactive application
4. **Schema Execution Order**: Number all schema files to ensure deterministic execution order

---

## Implementation

### Schema File Organization

**Before (Broken):**
```
db/schema/
├── 000-external-identities.sql   # No grants!
├── 001-orgs.sql                   # No grants!
├── 002-profiles.sql               # No grants!
└── 003-org-members.sql            # No grants!
```

**After (Fixed):**
```
db/schema/
├── 000-default-privileges.sql     # ← NEW: Sets up automatic grants
├── 001-external-identities.sql    # ✅ Inherits grants automatically
├── 002-orgs.sql                   # ✅ Inherits grants automatically
├── 003-profiles.sql               # ✅ Inherits grants automatically
├── 004-org-members.sql            # ✅ Inherits grants automatically
├── 005-idp-config.sql             # ✅ Inherits grants automatically
└── 006-user-provisioning.sql      # ✅ Inherits grants automatically
```

### Migration Strategy

For existing CORA projects that already have tables:

**Option A: Add default privileges first (Recommended)**
```sql
-- Run this ONCE in Supabase SQL Editor
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
```

**Option B: Use migration file**
```bash
# Create migration
supabase migration new add_default_privileges

# Add content from 000-default-privileges.sql
# Run migration
supabase db push
```

---

## Consequences

### Positive

✅ **Automatic Grants**: All future tables automatically get service role access  
✅ **DRY Principle**: No need to repeat GRANT statements in every schema file  
✅ **Idempotent**: Safe to run multiple times without errors  
✅ **Template Ready**: New CORA projects work out of the box  
✅ **Retroactive**: Fixes existing tables in addition to future ones  
✅ **Security**: Only grants necessary permissions to service role  

### Negative

⚠️ **Execution Order Dependency**: Must run as first schema file (`000-`)  
⚠️ **Existing Projects**: Requires manual migration for deployed projects  
⚠️ **Documentation**: Need to update all CORA project creation guides  

### Neutral

ℹ️ **Standard Practice**: This is the recommended PostgreSQL pattern for service roles  
ℹ️ **Supabase Specific**: Only relevant for Supabase-backed CORA projects  

---

## Alternatives Considered

### Alternative 1: Grant Statements in Each Schema File

**Approach:**
```sql
-- In every schema file
CREATE TABLE public.my_table (...);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_table TO service_role;
```

**Rejected Because:**
- ❌ Repetitive and error-prone
- ❌ Easy to forget grants when creating new tables
- ❌ Violates DRY principle
- ❌ More maintenance burden

### Alternative 2: Post-Migration Script

**Approach:**
```bash
# After all migrations
./scripts/grant-service-role-access.sh
```

**Rejected Because:**
- ❌ Requires manual execution
- ❌ Not idempotent
- ❌ Can be forgotten in deployment
- ❌ Doesn't handle future tables

### Alternative 3: Supabase Studio Manual Grants

**Approach:**
- Use Supabase Studio UI to grant permissions manually

**Rejected Because:**
- ❌ Not version controlled
- ❌ Not reproducible
- ❌ Not automatable
- ❌ Error-prone for teams

---

## Lessons Learned

### 1. PostgreSQL Default Privileges Are Critical

PostgreSQL's `ALTER DEFAULT PRIVILEGES` is the correct way to handle service role permissions in managed database environments like Supabase.

### 2. Execution Order Matters

Schema files MUST be numbered and executed in order. The `000-` prefix ensures default privileges run first.

### 3. Supabase Service Role Is Not Superuser

The `service_role` in Supabase has elevated privileges but is NOT a superuser. It requires explicit grants.

### 4. Test with Service Role, Not Studio

Testing via Supabase Studio uses different credentials than the service role. Always test Lambda functions directly.

### 5. Documentation Is Critical

This issue cost several hours of debugging because it wasn't documented. ADRs prevent repeated mistakes.

---

## References

### PostgreSQL Documentation
- [ALTER DEFAULT PRIVILEGES](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html)
- [GRANT](https://www.postgresql.org/docs/current/sql-grant.html)
- [Role Membership](https://www.postgresql.org/docs/current/role-membership.html)

### Supabase Documentation
- [Supabase Auth Schema](https://supabase.com/docs/guides/auth/managing-user-data)
- [Service Role Key](https://supabase.com/docs/guides/api/api-keys#the-service_role-key)
- [Database Roles](https://supabase.com/docs/guides/database/postgres/roles)

### Internal References
- User Provisioning Implementation Plan: `docs/user-provisioning-implementation-plan.md`
- Schema Files: `templates/_cora-core-modules/module-access/db/schema/`
- Active Context: `memory-bank/activeContext.md` (Dec 17, 2025 session)

---

## Implementation Checklist

For implementing this pattern in CORA projects:

- [x] Create `000-default-privileges.sql` schema file
- [x] Update schema file numbering (renumber existing files)
- [x] Add to module-access template
- [x] Test with new CORA project creation
- [x] Verify Lambda functions can access tables
- [x] Document in project creation guide
- [x] Create this ADR
- [ ] Update existing deployed CORA projects (manual migration needed)
- [ ] Add to troubleshooting guide
- [ ] Create automated test to verify grants

---

## Validation

### How to Verify Grants Are Working

**Test 1: Check Default Privileges**
```sql
-- Run in Supabase SQL Editor
SELECT 
    defaclrole::regrole AS grantor,
    defaclnamespace::regnamespace AS schema,
    defaclobjtype AS object_type,
    defaclacl AS privileges
FROM pg_default_acl
WHERE defaclnamespace = 'public'::regnamespace;
```

**Test 2: Check Table Grants**
```sql
-- Verify service_role has access to tables
SELECT 
    schemaname,
    tablename,
    has_table_privilege('service_role', schemaname||'.'||tablename, 'SELECT') as can_select,
    has_table_privilege('service_role', schemaname||'.'||tablename, 'INSERT') as can_insert
FROM pg_tables
WHERE schemaname = 'public';
```

**Test 3: Lambda Function Test**
- Deploy user provisioning Lambda
- Call `/profiles/me` endpoint
- Verify no permission errors in CloudWatch logs

---

## Status

**Current Status:** ✅ Implemented and Validated

**Date Implemented:** December 17, 2025  
**Validated On:** December 17, 2025  
**Template Updated:** December 17, 2025  
**Documentation Updated:** December 17, 2025

---

## Questions & Answers

**Q: Why not use `GRANT ... ON ALL TABLES` only?**  
A: That only affects existing tables. `ALTER DEFAULT PRIVILEGES` is needed for future tables.

**Q: Do we need this for every schema?**  
A: No, only for the `public` schema where application tables are created.

**Q: What about Row Level Security (RLS)?**  
A: This ADR covers table-level grants. RLS policies are separate and still required for security.

**Q: Can this be run multiple times?**  
A: Yes, it's idempotent. Running it multiple times is safe.

**Q: What if I forget to run this?**  
A: Lambda functions will fail with permission errors. Always run as first schema file.

---

**Document Maintainers:** Aaron Kilinski, CORA Development Team  
**Last Updated:** December 17, 2025  
**Next Review:** When new database patterns emerge or Supabase changes role behavior
