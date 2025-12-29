# Database Migration Testing Script

## Overview

`run-database-migrations.sh` is a standalone script that consolidates and executes all CORA database schema files. It's designed for:

- **Testing idempotency**: Verify that schema files can be run multiple times safely
- **Debugging schema issues**: See detailed output for each SQL operation
- **Development workflow**: Apply schema changes without running full project creation
- **CI/CD validation**: Automated testing of database migrations

## Prerequisites

### 1. PostgreSQL Client (`psql`)

**Check if installed:**
```bash
psql --version
```

**Install if needed:**
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows (via WSL)
sudo apt-get install postgresql-client
```

### 2. Python 3

**Check if installed:**
```bash
python3 --version
```

**Install if needed:**
```bash
# macOS
brew install python3

# Ubuntu/Debian
sudo apt-get install python3
```

### 3. Database Credentials

You need a `.env` file at `<stack-dir>/scripts/validation/.env` with the following:

```bash
# Direct PostgreSQL Connection
SUPABASE_DB_HOST=aws-0-us-east-1.pooler.supabase.com
SUPABASE_DB_PORT=6543
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.your-project-ref
SUPABASE_DB_PASSWORD=your-db-password
```

**Where to find these values:**

1. **Supabase Dashboard** → Your Project → Settings → Database
2. **Connection string** section shows all values
3. Use the **"Transaction" pooler** (port 6543) for compatibility

### 4. CORA Project with Core Modules

The stack directory must contain:
```
<stack-dir>/
├── packages/
│   ├── module-access/
│   │   └── db/schema/*.sql
│   ├── module-ai/
│   │   └── db/schema/*.sql
│   └── module-mgmt/
│       └── db/schema/*.sql
└── scripts/
    └── validation/
        └── .env  (credentials file)
```

## Setup Steps

### 1. Create Database Credentials File

```bash
# Navigate to your stack directory
cd ~/code/sts/test13/ai-sec-stack

# Create validation directory if it doesn't exist
mkdir -p scripts/validation

# Create .env file
cat > scripts/validation/.env << 'EOF'
SUPABASE_DB_HOST=your-host-here.supabase.com
SUPABASE_DB_PORT=6543
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.your-ref
SUPABASE_DB_PASSWORD=your-password-here
EOF
```

### 2. Make Script Executable

```bash
cd ~/code/bodhix/cora-dev-toolkit/scripts
chmod +x run-database-migrations.sh
```

### 3. Test Database Connection

```bash
# Test connection manually
psql "postgresql://postgres.your-ref:your-password@your-host:6543/postgres" -c "SELECT 1;"
```

If this works, you're ready to run the migration script.

## Running the Script

### Basic Usage

```bash
cd ~/code/bodhix/cora-dev-toolkit/scripts
./run-database-migrations.sh <stack-directory>
```

### Example

```bash
./run-database-migrations.sh ~/code/sts/test13/ai-sec-stack
```

## Evaluating Success/Failure

### ✅ Success Indicators

**1. Exit Code 0**
```bash
echo $?
# Should output: 0
```

**2. Success Message**
```
[INFO] ✅ Database schema applied successfully!
[INFO] 💡 Script is idempotent - safe to run multiple times
```

**3. Object Summary Shows Counts**
```
📊 Objects Created/Updated:
   - Tables: 15
   - Indexes: 42
   - Functions: 8
   - Policies: 24
   - Data Inserts: 5
```

**4. Second Run Shows Idempotency**

Run the script twice. The second run should:
- Complete without errors
- Show "already exists, skipping" messages
- Have lower counts (0 for new objects, non-zero for updates)

Example:
```bash
# First run
./run-database-migrations.sh ~/code/sts/test13/ai-sec-stack

# Second run (should be idempotent)
./run-database-migrations.sh ~/code/sts/test13/ai-sec-stack
```

### ❌ Failure Indicators

**1. Connection Failure**
```
[ERROR] Failed to connect to database

Connection details:
  Host: aws-0-us-east-1.pooler.supabase.com
  Port: 6543
  Database: postgres
  User: postgres.xxxxx
```

**Fix:** Verify credentials in `.env` file and test connection manually.

**2. Missing Table Error**
```
[ERROR] PostgreSQL Errors:
     ERROR:  relation "profiles" does not exist
     LINE 8:         FROM profiles
                      ^
```

**Fix:** This usually means:
- Table name typo (e.g., `profiles` vs `user_profiles`)
- Schema files in wrong order
- Missing schema file

**3. Permission Error**
```
[ERROR] PostgreSQL Errors:
     ERROR:  permission denied for table ai_providers
```

**Fix:** Use service role key instead of anon key in `.env`

**4. Duplicate Key Error**
```
[ERROR] PostgreSQL Errors:
     ERROR:  duplicate key value violates unique constraint
     DETAIL:  Key (name)=(aws_bedrock) already exists.
```

**Fix:** This means seed data isn't using `ON CONFLICT` properly. Schema files need to be updated with `ON CONFLICT DO UPDATE` clauses.

## Testing Idempotency

Idempotency means the script can be run multiple times with the same result. To verify:

### 1. Initial Run

```bash
./run-database-migrations.sh ~/code/sts/test13/ai-sec-stack
```

**Expected output:**
- All objects created
- Seed data inserted
- Exit code: 0

### 2. Second Run (Idempotency Test)

```bash
./run-database-migrations.sh ~/code/sts/test13/ai-sec-stack
```

**Expected output:**
- No new tables created (should use `CREATE TABLE IF NOT EXISTS`)
- Functions recreated (should use `CREATE OR REPLACE FUNCTION`)
- Policies may show "already exists" warnings (acceptable)
- Seed data updated (should use `ON CONFLICT DO UPDATE`)
- Exit code: 0

### 3. Verify No Duplicate Data

```bash
# Connect to database
psql "postgresql://postgres.your-ref:password@host:6543/postgres"

# Check for duplicate AI providers
SELECT name, COUNT(*) as count 
FROM ai_providers 
GROUP BY name 
HAVING COUNT(*) > 1;

# Should return 0 rows
```

## Common Issues and Solutions

### Issue: "psql: command not found"

**Solution:**
```bash
# macOS
brew install postgresql

# Ubuntu
sudo apt-get install postgresql-client
```

### Issue: "python3: command not found"

**Solution:**
```bash
# macOS
brew install python3

# Ubuntu
sudo apt-get install python3
```

### Issue: "Database credentials not found"

**Solution:**
```bash
# Create the .env file
mkdir -p ~/code/sts/test13/ai-sec-stack/scripts/validation
nano ~/code/sts/test13/ai-sec-stack/scripts/validation/.env

# Add credentials and save
```

### Issue: "relation 'auth.users' does not exist"

**Cause:** Some tables reference `auth.users` which is a Supabase-managed table.

**Solution:**
- Ensure you're using a Supabase database
- The `auth` schema should exist automatically
- If testing locally with plain PostgreSQL, you may need to create mock auth tables

### Issue: "No database schema files found"

**Solution:**
```bash
# Verify schema files exist
ls -R ~/code/sts/test13/ai-sec-stack/packages/*/db/schema/

# If missing, ensure project was created with --with-core-modules flag
```

### Issue: Script succeeds but RLS policies not applied

**Cause:** Policies may have failed silently due to table name mismatches.

**Solution:**
```bash
# Verify policies in Supabase Dashboard
# Go to: Authentication → Policies

# Or query directly
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

# Should see policies for: user_profiles, ai_providers, etc.
```

## Verifying Database State

After running the script, verify the database state:

### 1. Check Tables

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected tables:**
- `user_profiles`
- `organizations`
- `org_members`
- `ai_providers`
- `ai_models`
- `platform_lambda_config`
- `platform_idp_config`
- etc.

### 2. Check AI Providers Seed Data

```sql
SELECT name, display_name, provider_type, is_active 
FROM ai_providers;
```

**Expected results:**
- google_ai
- azure_ai_foundry
- aws_bedrock

### 3. Check Lambda Warming Config

```sql
SELECT config_key, config_value->'enabled' as enabled 
FROM platform_lambda_config;
```

### 4. Check RLS Policies

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected policies:**
- Policies on `user_profiles`
- Policies on `ai_providers`
- Policies on `platform_lambda_config`
- etc.

## Cleaning Up (Fresh Start)

If you want to test from a completely clean state:

```bash
# Connect to database
psql "postgresql://user:pass@host:6543/postgres"

# Drop all tables (DANGER: destroys all data!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

# Exit psql
\q

# Now run migration script again
./run-database-migrations.sh ~/code/sts/test13/ai-sec-stack
```

## CI/CD Integration

Use this script in CI/CD pipelines to validate database migrations:

```yaml
# GitHub Actions example
- name: Test Database Migrations
  env:
    SUPABASE_DB_HOST: ${{ secrets.SUPABASE_DB_HOST }}
    SUPABASE_DB_USER: ${{ secrets.SUPABASE_DB_USER }}
    SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
  run: |
    cd cora-dev-toolkit/scripts
    ./run-database-migrations.sh ../test-project-stack
    
- name: Test Idempotency
  run: |
    cd cora-dev-toolkit/scripts
    ./run-database-migrations.sh ../test-project-stack
```

## Support

If you encounter issues:

1. **Check detailed error output** - The script shows full PostgreSQL errors
2. **Review consolidated SQL** - Check `scripts/setup-database.sql` in your stack directory
3. **Run with verbose mode** - Use the manual psql command shown in error output
4. **Check Supabase logs** - Go to Supabase Dashboard → Logs → Database

## Related Documentation

- [CORA Project Creation Guide](../docs/guides/guide_cora-project-creation.md)
- [Database Schema Standards](../docs/standards/)
- [Module Development Guide](../docs/guides/)
