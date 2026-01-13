# Database Cleanup and Testing Guide

This directory contains scripts for database maintenance and testing during CORA project development.

## Overview

| File | Purpose |
|------|---------|
| `cleanup-database.sql` | Complete database cleanup (drops all user objects) |
| `verify-supabase-roles.sql` | Verify Supabase default roles and permissions |

---

## Database Cleanup

### Purpose

Clean up a Supabase database to prepare for fresh CORA project deployment. This is useful when:
- Testing project creation scripts
- Retrying failed deployments
- Switching between different project configurations
- Starting fresh after schema changes

### What Gets Removed

The cleanup script removes **ALL** user-created objects from the `public` schema:

- ✅ **Tables** - All user tables
- ✅ **Indexes** - Dropped automatically with tables (CASCADE)
- ✅ **Triggers** - Dropped automatically with tables (CASCADE)
- ✅ **RLS Policies** - Dropped automatically with tables (CASCADE)
- ✅ **Constraints** - Dropped automatically with tables (CASCADE)
- ✅ **Views** - All views and materialized views
- ✅ **Sequences** - All sequences (including auto-generated ones)
- ✅ **Functions** - All user-defined functions
- ✅ **Types** - All custom enum types

### What Stays

The cleanup script **does NOT** remove:
- ✅ Supabase system tables (auth, storage, realtime schemas)
- ✅ Supabase default roles (postgres, anon, authenticated, service_role)
- ✅ PostgreSQL extensions
- ✅ Database users and permissions

### Usage

#### Method 1: Using psql with config file credentials

```bash
# From cora-dev-toolkit root
cd scripts/database

# Replace with your config file name
CONFIG_FILE="../../templates/_project-stack-template/setup.config.test-ws-21.yaml"

# Extract connection details from config
DB_HOST=$(grep "host:" $CONFIG_FILE | awk '{print $2}' | tr -d '"')
DB_USER=$(grep "user:" $CONFIG_FILE | awk '{print $2}' | tr -d '"')
DB_PASS=$(grep "password:" $CONFIG_FILE | awk '{print $2}' | tr -d '"')

# Run cleanup
PGPASSWORD="$DB_PASS" psql \
  "postgres://${DB_USER}@${DB_HOST}:5432/postgres" \
  -f cleanup-database.sql
```

#### Method 2: Direct execution with credentials

```bash
cd scripts/database

PGPASSWORD='your_password' psql \
  "postgres://postgres.projectref@aws-0-us-east-1.pooler.supabase.com:5432/postgres" \
  -f cleanup-database.sql
```

#### Method 3: From Supabase Dashboard SQL Editor

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql
2. Copy contents of `cleanup-database.sql`
3. Paste into SQL editor
4. Click "Run"

### Output

The script provides detailed output showing what was dropped:

```
============================================================
Starting database cleanup...
============================================================
Dropping views...
Dropping materialized views...
Dropping tables (with indexes, triggers, constraints, RLS)...
  ✓ Dropped table: user_profiles
  ✓ Dropped table: organizations
  ✓ Dropped table: org_members
  ... (more tables)
Dropping sequences...
  ✓ Dropped sequence: user_profiles_id_seq
  ... (more sequences)
Dropping functions...
  ✓ Dropped function: is_sys_admin(uuid)
  ... (more functions)
Dropping custom types...
  ✓ Dropped type: sys_role_enum
  ... (more types)
============================================================
Database cleanup complete! Dropped 47 objects.
============================================================
```

---

## Supabase Role Verification

### Purpose

Verify that Supabase default roles (anon, authenticated, service_role) have correct permissions. This is critical because:

- Missing permissions can cause connection failures
- Incorrect permissions can block CORA operations
- Default privileges must be configured for RLS to work

### When to Verify Roles

Run role verification when:
- ✅ **New database created** - Verify default setup is correct
- ✅ **Connection failures** - Check if roles exist and have permissions
- ✅ **RLS policy issues** - Verify role permissions for RLS
- ✅ **After manual changes** - Confirm no permissions were broken

### Usage

```bash
cd scripts/database

PGPASSWORD='your_password' psql \
  "postgres://postgres.projectref@aws-0-us-east-1.pooler.supabase.com:5432/postgres" \
  -f verify-supabase-roles.sql
```

### Expected Output

See `verify-supabase-roles.sql` for detailed expected output and troubleshooting steps.

---

## Common Scenarios

### Scenario 1: Testing create-cora-project.sh

```bash
# 1. Run project creation (it may fail or you want to retry)
cd cora-dev-toolkit
./scripts/create-cora-project.sh --input templates/_project-stack-template/setup.config.test.yaml

# 2. Clean up the database
cd scripts/database
PGPASSWORD='password' psql "postgres://user@host:5432/postgres" -f cleanup-database.sql

# 3. Retry project creation with clean database
cd ../..
./scripts/create-cora-project.sh --input templates/_project-stack-template/setup.config.test.yaml
```

### Scenario 2: Connection Issues with New Database

```bash
# 1. Verify roles exist and have correct permissions
cd scripts/database
PGPASSWORD='password' psql "postgres://user@host:5432/postgres" -f verify-supabase-roles.sql

# 2. If roles are missing or broken, contact Supabase support
# 3. If roles are correct, check connection string format (pooler vs direct)
```

### Scenario 3: Switching Between Test Projects

```bash
# You have test-ws-21 and test-ws-22 using the same database
# Clean between tests to ensure isolated testing

# Before testing test-ws-22:
cd scripts/database
PGPASSWORD='password' psql "postgres://user@host:5432/postgres" -f cleanup-database.sql

# Now test-ws-22 has a clean slate
```

---

## Supabase Connection Methods

### Direct Connection (Primary)

**Format:** `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres`

- ✅ Best performance (direct to database)
- ❌ Requires DNS to be provisioned (takes 15-30 minutes for new databases)
- ❌ May not work on IPv6-only networks

**Use when:**
- Database has been running for >30 minutes
- You need best performance
- Your network supports IPv4

### Connection Pooler (Recommended for CORA)

**Format:** `postgres://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres`

- ✅ Works immediately (even for new databases)
- ✅ IPv4/IPv6 compatible
- ✅ Better for serverless/Lambda connections
- ⚠️ Slightly higher latency than direct connection

**Use when:**
- Database is newly created (first 30 minutes)
- Direct connection DNS doesn't resolve
- Using serverless functions (Lambda)
- Need guaranteed connectivity

### Which to Use in CORA Config Files?

**✅ RECOMMENDED:** Use **pooler** as the primary connection method in `setup.config.yaml`:

```yaml
supabase:
  db:
    host: "aws-0-us-east-1.pooler.supabase.com"  # Pooler
    user: "postgres.PROJECT_REF"                 # Note: postgres.PROJECT_REF format
    password: "your_password"
```

**Why?** The pooler works immediately for new databases and is more reliable for automated deployments.

---

## Troubleshooting

### "Tenant or user not found"

**Cause:** Database external access not fully provisioned yet (common for new databases)

**Solution:**
1. Wait 15-30 minutes after database creation
2. Verify in Supabase Dashboard: Project Settings → Database → Status = "Healthy"
3. Use pooler connection method instead of direct connection

### "Could not translate host name to address"

**Cause:** DNS for direct connection not propagated yet

**Solution:**
1. Switch to pooler connection method
2. Check DNS: `nslookup db.PROJECT_REF.supabase.co`
3. Wait for DNS propagation (can take 30 minutes)

### "Connection refused"

**Cause:** Wrong port or connection method

**Solution:**
1. Verify port: 5432 for session mode, 6543 for transaction mode
2. Verify host format matches connection method
3. Use `psql` to test: `psql "postgres://user@host:5432/postgres"`

### "Password authentication failed"

**Cause:** Incorrect password

**Solution:**
1. Reset password in Supabase Dashboard: Project Settings → Database → Database Password
2. Update password in config file
3. Retry connection

---

## Best Practices

1. **Always use pooler in config files** - More reliable for automated deployments
2. **Clean database between tests** - Ensures isolated, reproducible testing
3. **Verify roles after cleanup** - Confirm Supabase defaults still intact
4. **Use config files for credentials** - Don't hardcode passwords in scripts
5. **Wait for new databases to provision** - Allow 15-30 minutes for external access

---

## Related Documentation

- [Supabase Connection Guide](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [CORA Database Setup](../../docs/guides/guide_cora-project-setup.md)
- [Migration Scripts](../migrations/README-role-standardization-migrations.md)
