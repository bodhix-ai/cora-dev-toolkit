# CORA AI App Test Run Plan

**Date:** December 11, 2025  
**Project:** ai-sec (AI-driven security policy compliance information management system)  
**Purpose:** Test creating a new CORA app from scratch using the CORA approach

---

## Schema Fixes Completed

The following schema gaps have been addressed:

### 1. Added `external_identities` Table ✅

**File:** `cora-dev-toolkit/templates/_cora-core-modules/module-access/db/schema/000-external-identities.sql`

- Maps external auth provider user IDs (Okta/Clerk) to Supabase auth.users
- Required for login to work
- Copied from pm-app-stack production schema

### 2. Updated `profiles` Table ✅

**File:** Updated `002-profiles.sql`

- Added `created_by` column (UUID)
- Added `updated_by` column (UUID)
- Required by profiles Lambda code

---

## Complete Database Schema (13 Tables)

### module-access (6 tables)

1. `external_identities` - Maps external auth provider IDs to Supabase users
2. `orgs` - Multi-tenant organizations
3. `profiles` - User profiles (BIGINT id, linked to auth.users)
4. `org_members` - Organization membership with roles
5. `platform_idp_config` - IDP configuration (Okta/Clerk)
6. `platform_idp_audit_log` - IDP configuration audit trail

### module-ai (3 tables)

7. `ai_providers` - AI provider configurations (platform-level)
8. `ai_models` - AI model catalog with capabilities
9. `ai_model_validation_history` - Model validation tracking

### module-mgmt (4 tables)

10. `platform_lambda_config` - Lambda warming configuration
11. `platform_module_registry` - Module registry
12. `platform_module_usage` - Raw usage events
13. `platform_module_usage_daily` - Aggregated daily statistics

---

## Schema Application Order

Apply schema files in this exact order:

```bash
# 1. module-access (Tier 1) - Foundation
000-external-identities.sql     # Maps external auth to Supabase users
001-orgs.sql                    # Organizations
002-profiles.sql                # User profiles (with created_by/updated_by)
003-org-members.sql             # Organization membership
004-idp-config.sql              # IDP configuration

# 2. module-ai (Tier 2) - AI Management
001-ai-providers.sql            # AI providers (platform-level)
002-ai-models.sql               # AI models catalog
003-ai-validation-history.sql   # Validation tracking

# 3. module-mgmt (Tier 3) - Platform Management
001-platform-lambda-config.sql  # Lambda configuration
002-rls-policies.sql            # RLS policies
003-platform-module-registry.sql # Module registry
004-platform-module-usage.sql   # Usage tracking
005-platform-module-rls.sql     # Module RLS policies
```

---

## Test Run Phases

### Phase 1: Project Creation (AI)

```bash
cd /Users/aaronkilinski/code/policy/cora-dev-toolkit
./scripts/create-cora-project.sh ai-sec \
  --org keepitsts \
  --region us-east-1 \
  --with-core-modules
```

**Verify:**

- [ ] `ai-sec-infra` repo created
- [ ] `ai-sec-stack` repo created
- [ ] Core modules in `packages/` (module-access, module-ai, module-mgmt)
- [ ] `.clinerules` files in both repos
- [ ] Terraform env directories (dev, tst, stg, prd)

### Phase 2: Environment Configuration (Human)

#### 2.1 Configure .env.local

```bash
cd ai-sec-stack/apps/web
cp .env.example .env.local
```

Edit `.env.local` with values from `setup.config.ai-sec.yaml`:

```env
# Okta
OKTA_CLIENT_ID=0oax0eaf3bgW5NP73697
OKTA_CLIENT_SECRET=<from setup.config.ai-sec.yaml>
OKTA_ISSUER=https://simpletech.okta.com/oauth2/default

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://jowgabouzahkbmtvyyjy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from setup.config.ai-sec.yaml>
SUPABASE_SERVICE_ROLE_KEY=<from setup.config.ai-sec.yaml>

# NextAuth
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

### Phase 3: Database Provisioning

#### 3.1 Get Connection String

From Supabase Dashboard → Settings → Database

#### 3.2 Apply Schemas

```bash
# Set connection string
export SUPABASE_CONNECTION_STRING="postgresql://..."

# Apply module-access schemas
psql $SUPABASE_CONNECTION_STRING < packages/module-access/db/schema/000-external-identities.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-access/db/schema/001-orgs.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-access/db/schema/002-profiles.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-access/db/schema/003-org-members.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-access/db/schema/004-idp-config.sql

# Apply module-ai schemas
psql $SUPABASE_CONNECTION_STRING < packages/module-ai/db/schema/001-ai-providers.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-ai/db/schema/002-ai-models.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-ai/db/schema/003-ai-validation-history.sql

# Apply module-mgmt schemas
psql $SUPABASE_CONNECTION_STRING < packages/module-mgmt/db/schema/001-platform-lambda-config.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-mgmt/db/schema/002-rls-policies.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-mgmt/db/schema/003-platform-module-registry.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-mgmt/db/schema/004-platform-module-usage.sql
psql $SUPABASE_CONNECTION_STRING < packages/module-mgmt/db/schema/005-platform-module-rls.sql
```

#### 3.3 Verify Tables Created

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected:** 13 tables listed above

### Phase 3.5: Validation (CRITICAL - Required Before Build)

Run all CORA validation scripts to verify project compliance:

```bash
cd /Users/aaronkilinski/code/policy/cora-dev-toolkit

# Run complete validation suite
python validation/cora-validate.py project ../ai-sec-stack --format markdown --output validation-report.md

# Or run specific validators
python validation/cora-validate.py project ../ai-sec-stack --validators structure portability
```

**Validators Run:**

1. **structure-validator** - Validates project/module structure
2. **portability-validator** - Detects hardcoded values
3. **import-validator** - Validates import paths
4. **schema-validator** - Validates database schema

**Success Criteria:**

- [ ] All validators pass (exit code 0)
- [ ] No critical errors reported
- [ ] Warnings are acceptable but should be reviewed

**If Validation Fails:**

⚠️ **DO NOT PROCEED TO PHASE 4 UNTIL ALL ERRORS ARE FIXED**

1. Review the validation report
2. Fix errors in the ai-sec-stack project
3. Re-run validation
4. Only proceed to Phase 4 when validation passes

**Common Issues:**

- **Structure errors**: Missing required files/directories
- **Portability errors**: Hardcoded project names, AWS regions, account IDs
- **Import errors**: Incorrect module import paths
- **Schema errors**: Database schema mismatches

### Phase 4: Build & Run

```bash
cd ai-sec-stack

# Install dependencies
pnpm install

# Build packages
pnpm -r build

# Type check
pnpm -r typecheck

# Start dev server
cd apps/web
pnpm dev
```

### Phase 5: Test Okta Login

1. Open http://localhost:3000
2. Click "Login with Okta"
3. Complete Okta authentication
4. Verify:
   - [ ] User redirected back to app
   - [ ] Profile created in `profiles` table
   - [ ] External identity created in `external_identities` table
   - [ ] Organization creation flow appears
   - [ ] Can create organization
   - [ ] User added to `org_members` as org_owner

---

## Success Criteria

✅ **Minimum for Login Test:**

- `external_identities` table exists
- `profiles` table exists with created_by/updated_by columns
- `orgs` table exists
- `org_members` table exists
- Okta user can log in and create an organization

✅ **Full Success:**

- All 13 tables created successfully
- User can log in via Okta
- Profile is auto-provisioned on first login
- User can create organization
- User is added as org_owner
- App loads without errors

---

## Known Issues

### Orgs Lambda Uses Non-Existent Columns

The orgs Lambda code references `description` and `website_url` columns that don't exist in the production schema. This is a **code bug**, not a schema issue.

**Workaround:** The Lambda will error if you try to create an org with description or website_url. Remove these fields from the request or update the Lambda code.

---

## Troubleshooting

### Login Fails with "User not found in external_identities"

- Verify `000-external-identities.sql` was applied
- Check table exists: `SELECT * FROM external_identities;`

### "Profile not found" error

- Verify `002-profiles.sql` was applied with created_by/updated_by columns
- Check table structure: `\d profiles`

### "Cannot insert into profiles: created_by violates not null"

- The profiles table now has created_by/updated_by columns
- Lambda code sets these automatically
- If seeing this error, the Lambda may not be using the updated code

---

## Configuration Reference

From `setup.config.ai-sec.yaml`:

| Setting      | Value                                      |
| ------------ | ------------------------------------------ |
| Project      | ai-sec                                     |
| Organization | keepitsts                                  |
| Environment  | dev                                        |
| AWS Region   | us-east-1                                  |
| Supabase URL | https://jowgabouzahkbmtvyyjy.supabase.co   |
| Okta Domain  | simpletech.okta.com                        |
| Okta Issuer  | https://simpletech.okta.com/oauth2/default |

---

## Target Timeline

**Total Time:** < 1 day from start to working login

| Phase                 | Estimated Time |
| --------------------- | -------------- |
| 1. Project Creation   | 5 minutes      |
| 2. Environment Config | 15 minutes     |
| 3. Database Setup     | 30 minutes     |
| 4. Build & Run        | 15 minutes     |
| 5. Test Login         | 5 minutes      |
| **Total**             | **~1 hour**    |

---

**Document Version:** 1.0  
**Last Updated:** December 11, 2025
