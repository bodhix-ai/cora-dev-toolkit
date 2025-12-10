# Database Architecture

This document describes the database architecture of the STS Career Platform using **CORA (Context-Oriented Resource Architecture)**, where database schema is organized by modules with multi-tenant isolation enforced via Row-Level Security (RLS).

## Overview

The database follows a **module-first, multi-tenant architecture** where:

- **Each module** provides its own database schema files
- **All data** is organization-scoped with `org_id` foreign keys
- **Row-Level Security (RLS)** enforces multi-tenant data isolation at the database level
- **Helper functions** from org-module provide reusable RLS policies
- **Audit triggers** automatically track changes

## Module Database Architecture

Database schema is organized by **CORA modules**, with each module providing its own schema files.

### Module Schema Structure

```
packages/<module-name>/db/
├── schema/
│   ├── 001-enable-extensions.sql
│   ├── 002-<table1>.sql
│   ├── 003-<table2>.sql
│   ├── 004-helper-functions.sql
│   ├── 005-triggers.sql
│   └── 006-apply-rls-policies.sql
├── migrations/
│   ├── YYYYMMDD_<description>.sql
│   └── rollback/
│       └── YYYYMMDD_<description>.sql
└── seed-data/
    └── *.sql
```

### Schema Application Order

Schemas must be applied in dependency order:

1. **Foundation (org-module)**: Apply first (provides auth, users, orgs, RLS helpers)
2. **Feature Modules**: Apply in dependency order (reference org-module tables)
3. **Test Data**: Apply seed data last

### Example: Multi-Module Schema

```bash
# 1. Apply org-module schema first (foundation)
psql $DATABASE_URL -f packages/org-module/db/schema/001-enable-uuid.sql
psql $DATABASE_URL -f packages/org-module/db/schema/002-auth-users-schema.sql
psql $DATABASE_URL -f packages/org-module/db/schema/003-profiles.sql
psql $DATABASE_URL -f packages/org-module/db/schema/004-org.sql
psql $DATABASE_URL -f packages/org-module/db/schema/005-org-member.sql
psql $DATABASE_URL -f packages/org-module/db/schema/006-rls-helper-functions.sql
psql $DATABASE_URL -f packages/org-module/db/schema/007-rls-policies-profiles.sql
psql $DATABASE_URL -f packages/org-module/db/schema/008-rls-policies-org.sql
psql $DATABASE_URL -f packages/org-module/db/schema/009-rls-policies-org-member.sql
psql $DATABASE_URL -f packages/org-module/db/schema/010-audit-triggers.sql

# 2. Apply resume-module schema (depends on org-module)
psql $DATABASE_URL -f packages/resume-module/db/schema/001-resumes.sql
psql $DATABASE_URL -f packages/resume-module/db/schema/002-resume-rls.sql

# 3. Apply cert-module schema (depends on org-module)
psql $DATABASE_URL -f packages/cert-module/db/schema/001-certifications.sql
psql $DATABASE_URL -f packages/cert-module/db/schema/002-certification-rls.sql
```

## Multi-Tenancy Pattern

All feature modules use org-module's RLS helper functions to enforce multi-tenant data isolation.

### Standard Multi-Tenant Table

Every table must include:

- `org_id` foreign key to `org(id)` with `ON DELETE CASCADE`
- Audit fields (`created_at`, `updated_at`, `created_by`, `updated_by`)
- Indexes on `org_id` for performance

**Example:**

```sql
CREATE TABLE <module>_<entity> (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,

    -- Business fields
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_<entity>_org_id ON <module>_<entity>(org_id);
CREATE INDEX idx_<entity>_org_status ON <module>_<entity>(org_id, status);
CREATE INDEX idx_<entity>_created_at ON <module>_<entity>(org_id, created_at DESC);

-- Comments
COMMENT ON TABLE <module>_<entity> IS 'Description of what this table stores';
COMMENT ON COLUMN <module>_<entity>.org_id IS 'Organization owning this entity';
COMMENT ON COLUMN <module>_<entity>.status IS 'Status: active, inactive, archived';
```

### Standard RLS Policies

All tables should have four RLS policies (SELECT, INSERT, UPDATE, DELETE) using org-module helper functions.

**Example:**

```sql
-- Enable RLS
ALTER TABLE <module>_<entity> ENABLE ROW LEVEL SECURITY;

-- SELECT: Any org member can read
CREATE POLICY "<entity>_select_policy"
  ON <module>_<entity>
  FOR SELECT
  TO authenticated
  USING (can_access_org_data(org_id));

-- INSERT: Any org member can create
CREATE POLICY "<entity>_insert_policy"
  ON <module>_<entity>
  FOR INSERT
  TO authenticated
  WITH CHECK (can_access_org_data(org_id));

-- UPDATE: Org admins/owners can modify
CREATE POLICY "<entity>_update_policy"
  ON <module>_<entity>
  FOR UPDATE
  TO authenticated
  USING (can_modify_org_data(org_id))
  WITH CHECK (can_modify_org_data(org_id));

-- DELETE: Org owners can delete
CREATE POLICY "<entity>_delete_policy"
  ON <module>_<entity>
  FOR DELETE
  TO authenticated
  USING (is_org_owner(org_id));

-- Apply audit trigger
SELECT apply_audit_trigger('<module>_<entity>');
```

### RLS Helper Functions (from org-module)

The org-module provides reusable RLS helper functions that should be used by all feature modules.

**Available helpers:**

| Function                            | Description                         | Use Case                    |
| ----------------------------------- | ----------------------------------- | --------------------------- |
| `can_access_org_data(org_id)`       | User is member of org               | SELECT, INSERT              |
| `can_modify_org_data(org_id)`       | User is admin/owner of org          | UPDATE                      |
| `can_manage_org_membership(org_id)` | User can manage members             | Invite/remove members       |
| `is_org_member(org_id)`             | Check if user is member             | Custom logic                |
| `is_org_admin(org_id)`              | Check if user is admin              | Custom logic                |
| `is_org_owner(org_id)`              | Check if user is owner              | DELETE, critical operations |
| `is_global_admin()`                 | Check if user has global admin role | Super-admin operations      |

**Example usage:**

```sql
-- Only org admins/owners or global admins can update settings
CREATE POLICY "settings_update_policy"
  ON org_settings
  FOR UPDATE
  TO authenticated
  USING (can_modify_org_data(org_id) OR is_global_admin())
  WITH CHECK (can_modify_org_data(org_id) OR is_global_admin());

-- Only org owners can delete critical data
CREATE POLICY "critical_data_delete_policy"
  ON critical_data
  FOR DELETE
  TO authenticated
  USING (is_org_owner(org_id) OR is_global_admin());
```

## Org-Module Schema (Foundation)

The org-module provides the foundation for all other modules.

### Core Tables

#### 1. auth.users (Supabase Authentication)

Managed by Supabase, contains authentication data.

```sql
-- Supabase-managed table
-- Access via auth.users
CREATE TABLE auth.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    encrypted_password TEXT,
    email_confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

#### 2. profiles

User profile data.

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_email ON profiles(email);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_policy"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM org_member
    WHERE org_member.user_id = auth.uid()
    AND org_member.org_id IN (
      SELECT org_id FROM org_member WHERE user_id = profiles.id
    )
  ));

CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

#### 3. org

Organizations (multi-tenant isolation).

```sql
CREATE TABLE org (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_org_owner_id ON org(owner_id);
CREATE INDEX idx_org_name ON org(name);

-- RLS policies
ALTER TABLE org ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_policy"
  ON org
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT org_id FROM org_member WHERE user_id = auth.uid())
    OR is_global_admin()
  );

CREATE POLICY "org_insert_policy"
  ON org
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "org_update_policy"
  ON org
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT org_id FROM org_member
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
    OR is_global_admin()
  );
```

#### 4. org_member

Organization membership (many-to-many relationship).

```sql
CREATE TABLE org_member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(org_id, user_id)
);

-- Indexes
CREATE INDEX idx_org_member_org_id ON org_member(org_id);
CREATE INDEX idx_org_member_user_id ON org_member(user_id);
CREATE INDEX idx_org_member_role ON org_member(org_id, role);

-- RLS policies
ALTER TABLE org_member ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_select_policy"
  ON org_member
  FOR SELECT
  TO authenticated
  USING (can_access_org_data(org_id) OR user_id = auth.uid());

CREATE POLICY "org_member_insert_policy"
  ON org_member
  FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_org_membership(org_id));

CREATE POLICY "org_member_delete_policy"
  ON org_member
  FOR DELETE
  TO authenticated
  USING (can_manage_org_membership(org_id) OR user_id = auth.uid());
```

### RLS Helper Functions

```sql
-- Check if user can access org data (member)
CREATE OR REPLACE FUNCTION can_access_org_data(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM org_member
        WHERE org_id = check_org_id
        AND user_id = auth.uid()
    ) OR is_global_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can modify org data (admin/owner)
CREATE OR REPLACE FUNCTION can_modify_org_data(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM org_member
        WHERE org_id = check_org_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    ) OR is_global_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can manage org membership
CREATE OR REPLACE FUNCTION can_manage_org_membership(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM org_member
        WHERE org_id = check_org_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    ) OR is_global_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is org member
CREATE OR REPLACE FUNCTION is_org_member(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM org_member
        WHERE org_id = check_org_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is org admin
CREATE OR REPLACE FUNCTION is_org_admin(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM org_member
        WHERE org_id = check_org_id
        AND user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is org owner
CREATE OR REPLACE FUNCTION is_org_owner(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM org_member
        WHERE org_id = check_org_id
        AND user_id = auth.uid()
        AND role = 'owner'
    ) OR EXISTS (
        SELECT 1 FROM org
        WHERE id = check_org_id
        AND owner_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is global admin
CREATE OR REPLACE FUNCTION is_global_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND email IN (
            SELECT email FROM admin_users  -- Separate table or configuration
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Audit Triggers

```sql
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to apply audit trigger to a table
CREATE OR REPLACE FUNCTION apply_audit_trigger(table_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('
        CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    ', table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply to org-module tables
SELECT apply_audit_trigger('profiles');
SELECT apply_audit_trigger('org');
SELECT apply_audit_trigger('org_member');
```

## Feature Module Schema Examples

### Example: Resume-Module

```sql
-- packages/resume-module/db/schema/001-resumes.sql

CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES auth.users(id),

    -- Resume data
    title TEXT,
    content JSONB,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_resumes_org_id ON resumes(org_id);
CREATE INDEX idx_resumes_person_id ON resumes(person_id);
CREATE INDEX idx_resumes_status ON resumes(org_id, status);

-- RLS Policies
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resumes_select_policy"
  ON resumes
  FOR SELECT
  TO authenticated
  USING (can_access_org_data(org_id));

CREATE POLICY "resumes_insert_policy"
  ON resumes
  FOR INSERT
  TO authenticated
  WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "resumes_update_policy"
  ON resumes
  FOR UPDATE
  TO authenticated
  USING (can_modify_org_data(org_id) OR person_id = auth.uid())
  WITH CHECK (can_modify_org_data(org_id) OR person_id = auth.uid());

CREATE POLICY "resumes_delete_policy"
  ON resumes
  FOR DELETE
  TO authenticated
  USING (can_modify_org_data(org_id) OR person_id = auth.uid());

-- Audit trigger
SELECT apply_audit_trigger('resumes');
```

### Example: Cert-Module

```sql
-- packages/cert-module/db/schema/001-certifications.sql

CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES auth.users(id),

    -- Certification data
    name TEXT NOT NULL,
    issuing_organization TEXT,
    issue_date DATE,
    expiration_date DATE,
    credential_id TEXT,
    credential_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_certifications_org_id ON certifications(org_id);
CREATE INDEX idx_certifications_person_id ON certifications(person_id);
CREATE INDEX idx_certifications_status ON certifications(org_id, status);
CREATE INDEX idx_certifications_expiration ON certifications(org_id, expiration_date);

-- RLS Policies (using org-module helpers)
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certifications_select_policy"
  ON certifications
  FOR SELECT
  TO authenticated
  USING (can_access_org_data(org_id));

CREATE POLICY "certifications_insert_policy"
  ON certifications
  FOR INSERT
  TO authenticated
  WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "certifications_update_policy"
  ON certifications
  FOR UPDATE
  TO authenticated
  USING (can_modify_org_data(org_id))
  WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "certifications_delete_policy"
  ON certifications
  FOR DELETE
  TO authenticated
  USING (is_org_owner(org_id));

-- Audit trigger
SELECT apply_audit_trigger('certifications');
```

## Database Migrations

### Migration File Structure

```
packages/<module>/db/migrations/
├── 20251104_add_status_field.sql
├── 20251105_add_indexes.sql
└── rollback/
    ├── 20251104_add_status_field.sql
    └── 20251105_add_indexes.sql
```

### Migration File Format

**Forward migration:**

```sql
-- Migration: Add status field to resumes
-- Date: 2025-11-04
-- Author: Developer Name

BEGIN;

-- Add status column
ALTER TABLE resumes
ADD COLUMN status TEXT DEFAULT 'draft'
CHECK (status IN ('draft', 'published', 'archived'));

-- Create index
CREATE INDEX idx_resumes_status ON resumes(org_id, status);

COMMIT;
```

**Rollback migration:**

```sql
-- Rollback: Add status field to resumes
-- Date: 2025-11-04

BEGIN;

DROP INDEX IF EXISTS idx_resumes_status;
ALTER TABLE resumes DROP COLUMN IF EXISTS status;

COMMIT;
```

### Applying Migrations

```bash
# Apply migration
psql $DATABASE_URL -f packages/resume-module/db/migrations/20251104_add_status_field.sql

# Rollback if needed
psql $DATABASE_URL -f packages/resume-module/db/migrations/rollback/20251104_add_status_field.sql
```

## Testing RLS Policies

### Manual Testing

```sql
BEGIN;

-- Set session user
SELECT set_config('request.jwt.claims', '{"sub": "user-id-1"}', true);

-- Test SELECT policy (should only return user's org data)
SELECT COUNT(*) FROM resumes WHERE org_id = 'org-1';  -- Should work
SELECT COUNT(*) FROM resumes WHERE org_id = 'org-2';  -- Should return 0

-- Test INSERT policy
INSERT INTO resumes (org_id, person_id, title)
VALUES ('org-1', 'user-id-1', 'Test Resume');  -- Should work

INSERT INTO resumes (org_id, person_id, title)
VALUES ('org-2', 'user-id-1', 'Test Resume');  -- Should fail

-- Cleanup
ROLLBACK;
```

### Automated Testing

```sql
-- Test helper function
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE (test_name TEXT, result BOOLEAN) AS $$
BEGIN
    -- Test 1: User can access own org data
    RETURN QUERY
    SELECT 'User can access own org'::TEXT,
           can_access_org_data('org-1'::UUID);

    -- Test 2: User cannot access other org data
    RETURN QUERY
    SELECT 'User cannot access other org'::TEXT,
           NOT can_access_org_data('org-2'::UUID);

    -- Add more tests...
END;
$$ LANGUAGE plpgsql;

-- Run tests
SELECT * FROM test_rls_policies();
```

## Performance Considerations

### Indexing Strategy

1. **Always index `org_id`**: Required for RLS performance
2. **Index foreign keys**: References to other tables
3. **Index query filters**: Common WHERE clause fields
4. **Composite indexes**: For multi-column queries

**Example:**

```sql
-- Single column indexes
CREATE INDEX idx_resumes_org_id ON resumes(org_id);
CREATE INDEX idx_resumes_person_id ON resumes(person_id);
CREATE INDEX idx_resumes_created_at ON resumes(created_at DESC);

-- Composite indexes (most selective column first)
CREATE INDEX idx_resumes_org_status ON resumes(org_id, status);
CREATE INDEX idx_resumes_org_created ON resumes(org_id, created_at DESC);
```

### Query Optimization

```sql
-- ✅ Good: Filter by org_id first
SELECT * FROM resumes
WHERE org_id = 'org-1'
AND status = 'published'
ORDER BY created_at DESC;

-- ❌ Bad: Missing org_id filter (table scan)
SELECT * FROM resumes
WHERE status = 'published'
ORDER BY created_at DESC;
```

### Connection Pooling

Supabase provides built-in connection pooling via PgBouncer:

- **Transaction mode**: Each transaction gets a connection
- **Session mode**: Each session gets a dedicated connection
- **Recommended**: Transaction mode for serverless (Lambda)

## Backup and Recovery

### Automated Backups

Supabase provides automated backups:

- **Daily backups**: Retained for 7 days (configurable)
- **Point-in-Time Recovery (PITR)**: Restore to any point in last 7 days

### Manual Backups

```bash
# Backup entire database
pg_dump $DATABASE_URL > backup.sql

# Backup specific schema
pg_dump $DATABASE_URL -n public > public_schema.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

## Best Practices

### 1. Always Include org_id

✅ **DO:**

```sql
CREATE TABLE my_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,  -- Always required
    name TEXT NOT NULL
);
```

❌ **DON'T:**

```sql
CREATE TABLE my_entities (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL  -- Missing org_id!
);
```

### 2. Use RLS Helper Functions

✅ **DO:**

```sql
CREATE POLICY "my_entities_select_policy"
  ON my_entities
  FOR SELECT
  TO authenticated
  USING (can_access_org_data(org_id));  -- Use helper
```

❌ **DON'T:**

```sql
CREATE POLICY "my_entities_select_policy"
  ON my_entities
  FOR SELECT
  TO authenticated
  USING (org_id IN (  -- Don't reinvent the wheel
    SELECT org_id FROM org_member WHERE user_id = auth.uid()
  ));
```

### 3. Apply Audit Triggers

✅ **DO:**

```sql
-- Apply audit trigger
SELECT apply_audit_trigger('my_entities');
```

❌ **DON'T:**

```sql
-- Manually create trigger (inconsistent)
CREATE TRIGGER update_my_entities_updated_at
BEFORE UPDATE ON my_entities
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
```

### 4. Add Appropriate Indexes

✅ **DO:**

```sql
CREATE INDEX idx_my_entities_org_id ON my_entities(org_id);
CREATE INDEX idx_my_entities_status ON my_entities(org_id, status);
```

❌ **DON'T:**

```sql
-- No indexes (slow queries!)
```

### 5. Use Transactions for Multiple Operations

✅ **DO:**

```sql
BEGIN;
INSERT INTO org (name, owner_id) VALUES ('New Org', 'user-1');
INSERT INTO org_member (org_id, user_id, role) VALUES (currval('org_id_seq'), 'user-1', 'owner');
COMMIT;
```

❌ **DON'T:**

```sql
-- Separate statements (risk of partial failure)
INSERT INTO org (name, owner_id) VALUES ('New Org', 'user-1');
INSERT INTO org_member (org_id, user_id, role) VALUES (...);  -- May fail
```

## Common Pitfalls

### 1. Forgetting to Enable RLS

❌ **Wrong:**

```sql
CREATE TABLE my_entities (...);
-- Forgot to enable RLS!
```

✅ **Correct:**

```sql
CREATE TABLE my_entities (...);
ALTER TABLE my_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY ...
```

### 2. Missing org_id Index

❌ **Wrong:**

```sql
CREATE TABLE my_entities (
    org_id UUID NOT NULL REFERENCES org(id)
);
-- No index on org_id = slow RLS checks
```

✅ **Correct:**

```sql
CREATE TABLE my_entities (
    org_id UUID NOT NULL REFERENCES org(id)
);
CREATE INDEX idx_my_entities_org_id ON my_entities(org_id);
```

### 3. Incorrect Foreign Key Constraints

❌ **Wrong:**

```sql
org_id UUID NOT NULL REFERENCES org(id)  -- Missing ON DELETE CASCADE
```

✅ **Correct:**

```sql
org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE
```

## Related Documentation

- **[CORA Principles](./cora-principles.md)** - Architecture philosophy
- **[Backend Architecture](./backend.md)** - Lambda database access patterns
- **[Creating Modules Guide](../development/creating-modules.md)** - Module creation workflow
- **[Module Integration Spec](./module-integration-spec.md)** - Technical specification

---

**Last Updated**: November 4, 2025
