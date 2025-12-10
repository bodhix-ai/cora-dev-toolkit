# Database Connection Setup Guide

**Goal:** Enable schema validation by connecting to Supabase database

**Current Status:** Connection blocked (IPv6 routing issue)

---

## The Problem

```
ERROR: connection to server at "db.jjsqxcbndvwzhmymrmnw.supabase.co", port 5432 failed: No route to host
```

The tool needs to:

1. ✅ Parse Lambda queries (WORKING - 43 queries detected)
2. ❌ Fetch actual database schema (BLOCKED - connection issue)
3. ❌ Compare queries vs schema (BLOCKED - needs step 2)
4. ❌ Propose fixes (BLOCKED - needs step 3)

---

## Solution Options

### Option 1: Use Supabase Connection Pooler (RECOMMENDED)

**Why:** More reliable, handles connection limits, works around IPv6 issues

**Steps:**

1. Update `.env` file in `pm-app-stack/scripts/validation/schema-validator/`:

```bash
# Change from direct connection:
SUPABASE_DB_HOST=db.jjsqxcbndvwzhmymrmnw.supabase.co
SUPABASE_DB_PORT=5432

# To connection pooler:
SUPABASE_DB_HOST=aws-0-us-east-1.pooler.supabase.com
SUPABASE_DB_PORT=6543
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres.jjsqxcbndvwzhmymrmnw
SUPABASE_DB_PASSWORD=[from pm-app-infra/envs/dev/local-secrets.tfvars]
```

2. Find connection pooler URL:
   - Go to Supabase Dashboard → Project Settings → Database
   - Look for "Connection Pooling" section
   - Copy the "Connection string" (Transaction mode)
   - Extract host and port

3. Test connection:

```bash
cd pm-app-stack/scripts/validation/schema-validator
python3 cli.py list-tables
```

### Option 2: Enable IPv4 Connection in Supabase

**Why:** Allows direct PostgreSQL connection

**Steps:**

1. Go to Supabase Dashboard
2. Project Settings → Database
3. Enable "IPv4 Address" or "Allow external connections"
4. Note: May require project upgrade/plan change

5. Test connection:

```bash
cd pm-app-stack/scripts/validation/schema-validator
python3 cli.py check-credentials
python3 cli.py list-tables
```

### Option 3: Use Supabase API Instead of Direct PostgreSQL

**Why:** Works around network restrictions, uses REST API

**Steps:** (Requires code changes)

1. Install Supabase Python client:

```bash
pip install supabase
```

2. Modify `schema_inspector.py` to use Supabase client instead of psycopg2
3. Use Supabase API key from environment (already in .env)
4. Fetch schema via Supabase Management API

**Note:** This is more complex and may not provide full schema introspection

---

## Quick Test Commands

After updating connection settings:

```bash
cd pm-app-stack/scripts/validation/schema-validator

# 1. Check credentials loaded
python3 cli.py check-credentials

# 2. Try to list tables (tests connection)
python3 cli.py list-tables

# 3. Run full validation on ai-config-module
python3 cli.py --path ../../../packages/ai-config-module/backend/lambdas/ --output json

# 4. Check for schema mismatches
python3 cli.py --path ../../../packages/ai-config-module/backend/lambdas/ --output text
```

---

## What Happens After Connection Works

Once database connection is established:

1. **Schema Introspection** - Tool fetches:
   - All table names
   - Column names for each table
   - Column data types
   - Nullable constraints

2. **Query Validation** - Tool compares:
   - Lambda queries reference existing tables? ✓/✗
   - Column names match schema? ✓/✗
   - Data types compatible? ✓/✗

3. **Error Detection** - Tool finds:
   - Missing tables
   - Typos in column names (e.g., `org_id` vs `organization_id`)
   - Wrong table references

4. **Fix Proposals** - Tool suggests:
   - **Code fixes**: Update Lambda to use correct column name
   - **Migrations**: Add missing columns to database
   - **Priority**: Prefers code fixes over schema changes

---

## Expected Output (After Connection Works)

```json
{
  "status": "completed",
  "summary": {
    "files_scanned": 1,
    "queries_found": 26,
    "tables_used": 6,
    "errors": 2,
    "warnings": 1
  },
  "errors": [
    {
      "severity": "error",
      "file": "lambda_function.py",
      "line": 165,
      "table": "platform_rag",
      "column": "org_id",
      "issue": "Column 'org_id' does not exist in table 'platform_rag'",
      "suggestion": "Did you mean 'organization_id'?",
      "proposed_fix": {
        "type": "code_change",
        "diff": "- common.find_one('platform_rag', {'org_id': org_id})\n+ common.find_one('platform_rag', {'organization_id': org_id})"
      }
    }
  ]
}
```

---

## Recommended Immediate Action

**TRY OPTION 1 FIRST** (Connection Pooler):

1. Get connection pooler URL from Supabase Dashboard
2. Update `.env` file with pooler host and port 6543
3. Run `python3 cli.py list-tables`
4. If tables are listed → SUCCESS! Run full validation
5. If still fails → Try Option 2 (IPv4) or contact Supabase support

---

## Need Help?

**Current .env location:** `pm-app-stack/scripts/validation/schema-validator/.env`

**Where to find DB credentials:** `pm-app-infra/envs/dev/local-secrets.tfvars`

**Test command:** `python3 cli.py list-tables`

**Expected result:** List of 20-30 tables including:

- profiles
- organizations (or org)
- org_users
- org_members
- ai_models
- ai_providers
- platform_rag
- kb_bases
- etc.
