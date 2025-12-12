# SQL Schema Analysis: cora-dev-toolkit vs pm-app-stack Production

**Date:** December 10, 2025  
**Purpose:** Compare SQL migration scripts in cora-dev-toolkit templates with as-built tables in pm-app-stack Supabase production database

---

## Executive Summary

The SQL migration scripts in `cora-dev-toolkit/templates/_cora-core-modules/` have **significant discrepancies** with the production database. These differences will cause deployment failures if the scripts are run on a new Supabase project.

### Critical Issues Found

| Issue                                                                 | Severity    | Impact                                     |
| --------------------------------------------------------------------- | ----------- | ------------------------------------------ |
| Table name `org` vs `orgs`                                            | 🔴 CRITICAL | FK constraints will fail                   |
| `profiles.id` type BIGINT vs UUID                                     | 🔴 CRITICAL | Data type mismatch                         |
| Column names `person_id` vs `user_id`, `role_name` vs `role`          | 🔴 CRITICAL | App queries will fail                      |
| `ai_providers/ai_models` still have `org_id` in schema (not migrated) | 🟡 HIGH     | Need to apply migration or fix base schema |
| Missing columns in templates                                          | 🟡 MEDIUM   | Features may not work                      |

---

## Module-by-Module Analysis

### 1. module-access: `orgs` Table

**Production Table:** `public.orgs`  
**Script Creates:** `public.org` (WRONG!)

#### Column Comparison

| Column     | Production              | Script (005-orgs.sql)    | Status                        |
| ---------- | ----------------------- | ------------------------ | ----------------------------- |
| id         | UUID, gen_random_uuid() | UUID, uuid_generate_v4() | ⚠️ Different default function |
| name       | TEXT, required          | VARCHAR(255), required   | ⚠️ Different type             |
| slug       | TEXT, required          | VARCHAR(100), optional   | ❌ Required vs optional       |
| owner_id   | UUID, required          | UUID, required           | ✅ Match                      |
| logo_url   | TEXT                    | TEXT                     | ✅ Match                      |
| logo       | -                       | BYTEA                    | ❌ Not in production          |
| settings   | -                       | JSONB                    | ❌ Not in production          |
| metadata   | -                       | JSONB                    | ❌ Not in production          |
| active     | -                       | BOOLEAN                  | ❌ Not in production          |
| created_at | TIMESTAMPTZ             | TIMESTAMPTZ              | ✅ Match                      |
| updated_at | TIMESTAMPTZ             | TIMESTAMPTZ              | ✅ Match                      |
| created_by | -                       | UUID                     | ❌ Not in production          |
| updated_by | -                       | UUID                     | ❌ Not in production          |

#### Required Fixes

1. **Rename table from `org` to `orgs`** (Critical!)
2. Change default UUID function to `gen_random_uuid()`
3. Make `slug` required
4. Remove unused columns: `logo`, `settings`, `metadata`, `active`, `created_by`, `updated_by`

---

### 2. module-access: `profiles` Table

**Production Table:** `public.profiles`  
**Script Creates:** `public.profiles`

#### Column Comparison

| Column         | Production             | Script (004-profiles.sql) | Status                                |
| -------------- | ---------------------- | ------------------------- | ------------------------------------- |
| id             | BIGINT, auto-increment | UUID, uuid_generate_v4()  | ❌ **CRITICAL TYPE MISMATCH**         |
| user_id        | UUID, required, unique | UUID, required, unique    | ✅ Match                              |
| email          | TEXT                   | VARCHAR(255), required    | ⚠️ Different type, required in script |
| full_name      | TEXT                   | VARCHAR(100)              | ⚠️ Different type                     |
| first_name     | -                      | VARCHAR(50)               | ❌ Not in production                  |
| last_name      | -                      | VARCHAR(50)               | ❌ Not in production                  |
| phone          | TEXT                   | VARCHAR(20)               | ⚠️ Different type                     |
| avatar_url     | TEXT                   | TEXT                      | ✅ Match                              |
| avatar         | BYTEA                  | BYTEA                     | ✅ Match                              |
| current_org_id | UUID, FK to orgs.id    | UUID                      | ✅ Match                              |
| global_role    | TEXT                   | VARCHAR(50)               | ⚠️ Different type                     |
| metadata       | JSONB                  | JSONB                     | ✅ Match                              |
| created_at     | TIMESTAMPTZ            | TIMESTAMPTZ               | ✅ Match                              |
| updated_at     | TIMESTAMPTZ            | TIMESTAMPTZ               | ✅ Match                              |
| created_by     | -                      | UUID                      | ❌ Not in production                  |
| updated_by     | -                      | UUID                      | ❌ Not in production                  |

#### Required Fixes

1. **Change `id` from UUID to BIGINT with auto-increment** (Critical!)
2. Remove `first_name`, `last_name` columns
3. Remove `created_by`, `updated_by` columns
4. Change data types to TEXT where applicable
5. Make `email` optional (not required)
6. Fix FK reference: `orgs` not `org`

---

### 3. module-access: `org_members` Table

**Production Table:** `public.org_members`  
**Script Creates:** `public.org_members`

#### Column Comparison

| Column     | Production                   | Script (006-org-members.sql) | Status                       |
| ---------- | ---------------------------- | ---------------------------- | ---------------------------- |
| id         | UUID, gen_random_uuid()      | UUID, uuid_generate_v4()     | ⚠️ Different default         |
| org_id     | UUID, FK to orgs.id          | UUID, FK to org.id           | ❌ Wrong FK table name       |
| user_id    | UUID, FK to profiles.user_id | -                            | ❌ **Script uses person_id** |
| person_id  | -                            | UUID, FK to auth.users.id    | ❌ Wrong column name         |
| role       | TEXT, required               | -                            | ❌ **Script uses role_name** |
| role_name  | -                            | VARCHAR(50), required        | ❌ Wrong column name         |
| added_by   | UUID                         | -                            | ❌ Script uses invited_by    |
| invited_by | -                            | UUID                         | ❌ Wrong column name         |
| invited_at | -                            | TIMESTAMPTZ                  | ❌ Not in production         |
| joined_at  | -                            | TIMESTAMPTZ                  | ❌ Not in production         |
| active     | -                            | BOOLEAN                      | ❌ Not in production         |
| metadata   | -                            | JSONB                        | ❌ Not in production         |
| created_at | TIMESTAMPTZ                  | TIMESTAMPTZ                  | ✅ Match                     |
| updated_at | TIMESTAMPTZ                  | TIMESTAMPTZ                  | ✅ Match                     |
| created_by | -                            | UUID                         | ❌ Not in production         |
| updated_by | -                            | UUID                         | ❌ Not in production         |

#### Required Fixes

1. **Rename `person_id` to `user_id`** (Critical!)
2. **Rename `role_name` to `role`** (Critical!)
3. **Rename `invited_by` to `added_by`**
4. **Fix FK references: `orgs.id` not `org.id`, `profiles.user_id` not `auth.users.id`**
5. Remove unused columns: `invited_at`, `joined_at`, `active`, `metadata`, `created_by`, `updated_by`

---

### 4. module-ai: `ai_providers` Table

**Production Table:** `public.ai_providers` (platform-level, no org_id)  
**Script Creates:** `public.ai_providers` (with org_id)

#### Column Comparison

| Column                  | Production              | Script (001-provider-and-model-tables.sql) | Status                      |
| ----------------------- | ----------------------- | ------------------------------------------ | --------------------------- |
| id                      | UUID, gen_random_uuid() | UUID, gen_random_uuid()                    | ✅ Match                    |
| org_id                  | -                       | UUID, FK to orgs.id                        | ❌ Removed by migration 002 |
| name                    | TEXT, required          | TEXT, required                             | ✅ Match                    |
| display_name            | TEXT                    | TEXT                                       | ✅ Match                    |
| provider_type           | TEXT, required          | TEXT, required                             | ✅ Match                    |
| credentials_secret_path | TEXT                    | TEXT                                       | ✅ Match                    |
| is_active               | BOOLEAN, default true   | BOOLEAN, default true                      | ✅ Match                    |
| created_at              | TIMESTAMPTZ             | TIMESTAMPTZ                                | ✅ Match                    |
| updated_at              | TIMESTAMPTZ             | TIMESTAMPTZ                                | ✅ Match                    |
| created_by              | UUID                    | UUID                                       | ✅ Match                    |
| updated_by              | UUID                    | UUID                                       | ✅ Match                    |

#### Required Fixes

**Option A:** Update base schema to remove org_id (platform-level from start)  
**Option B:** Keep base schema with org_id, ensure migration 002 is applied

**Recommendation:** Option A - Update base schema to match production (simpler for new deployments)

---

### 5. module-ai: `ai_models` Table

**Production Table:** `public.ai_models` (platform-level, no org_id)  
**Script Creates:** `public.ai_models` (with org_id)

#### Column Comparison

| Column                    | Production  | Script              | Status                          |
| ------------------------- | ----------- | ------------------- | ------------------------------- |
| id                        | UUID        | UUID                | ✅ Match                        |
| org_id                    | -           | UUID, FK to orgs.id | ❌ Removed by migration 002     |
| provider_id               | UUID        | UUID                | ✅ Match                        |
| model_id                  | TEXT        | TEXT                | ✅ Match                        |
| display_name              | TEXT        | TEXT                | ✅ Match                        |
| capabilities              | JSONB       | JSONB               | ✅ Match                        |
| status                    | TEXT        | TEXT                | ✅ Match                        |
| cost_per_1k_tokens_input  | NUMERIC     | NUMERIC             | ✅ Match                        |
| cost_per_1k_tokens_output | NUMERIC     | NUMERIC             | ✅ Match                        |
| last_discovered_at        | TIMESTAMPTZ | TIMESTAMPTZ         | ✅ Match                        |
| created_at                | TIMESTAMPTZ | TIMESTAMPTZ         | ✅ Match                        |
| updated_at                | TIMESTAMPTZ | TIMESTAMPTZ         | ✅ Match                        |
| created_by                | UUID        | UUID                | ✅ Match                        |
| updated_by                | UUID        | UUID                | ✅ Match                        |
| description               | TEXT        | -                   | ❌ Missing (from migration 003) |
| validation_category       | VARCHAR(50) | -                   | ❌ Missing (from migration 005) |

#### Required Fixes

1. Remove `org_id` from base schema (or ensure migration 002 runs)
2. Add `description` column
3. Add `validation_category` column

---

### 6. module-mgmt: `platform_lambda_config` Table

**Production Table:** `public.platform_lambda_config`  
**Script Creates:** `public.platform_lambda_config`

#### Column Comparison

| Column       | Production   | Script       | Status   |
| ------------ | ------------ | ------------ | -------- |
| id           | UUID         | UUID         | ✅ Match |
| config_key   | VARCHAR(100) | VARCHAR(100) | ✅ Match |
| config_value | JSONB        | JSONB        | ✅ Match |
| description  | TEXT         | TEXT         | ✅ Match |
| is_active    | BOOLEAN      | BOOLEAN      | ✅ Match |
| created_at   | TIMESTAMPTZ  | TIMESTAMPTZ  | ✅ Match |
| updated_at   | TIMESTAMPTZ  | TIMESTAMPTZ  | ✅ Match |
| created_by   | UUID         | UUID         | ✅ Match |
| updated_by   | UUID         | UUID         | ✅ Match |

**Status:** ✅ Schema matches production

---

## Additional Tables in Production (Not in Core Module Templates)

The following tables exist in production but are not part of core module templates:

### Organization Features

- `org_config` - Organization-level configuration
- `org_invitations` - Pending member invitations
- `org_profile` - Extended org profile data
- `org_prompt_engineering` - AI prompt configurations per org
- `org_usage_tracking` - Usage metrics

### Other Modules (Not Core)

- `kb_bases`, `kb_chunks`, `kb_docs` - Knowledge base module
- `chat_sessions`, `chat_messages`, `chat_favorites` - Chat module
- `projects`, `project_members`, `project_favorites` - Project module
- `platform_rag` - RAG configuration
- `provider`, `provider_model_deployments` - Legacy AI provider tables

---

## Recommended Migration Strategy

### For New Supabase Projects (ai-sec)

Create **unified schema files** that match production:

1. **001-enable-uuid.sql** - Enable UUID extension
2. **002-orgs.sql** - Create `orgs` table (renamed from org)
3. **003-profiles.sql** - Create `profiles` table with BIGINT id
4. **004-org-members.sql** - Create `org_members` with correct column names
5. **005-helper-functions.sql** - RLS helper functions
6. **006-audit-triggers.sql** - Update triggers
7. **007-rls-policies.sql** - Row-level security policies
8. **010-ai-providers.sql** - AI providers (platform-level, no org_id)
9. **011-ai-models.sql** - AI models (platform-level, with description and validation_category)
10. **020-platform-lambda-config.sql** - Lambda management config
11. **021-platform-module-registry.sql** - Module registry

### For Existing pm-app-stack

The current production schema should be treated as the **source of truth**. The cora-dev-toolkit templates need to be updated to match.

---

## Action Items

### Immediate (Required for ai-sec deployment)

1. [ ] Create new unified schema files matching production
2. [ ] Fix table name: `org` → `orgs`
3. [ ] Fix `profiles.id` type: UUID → BIGINT
4. [ ] Fix `org_members` column names: `person_id` → `user_id`, `role_name` → `role`
5. [ ] Update module-ai schema to be platform-level (no org_id)
6. [ ] Add missing columns to ai_models: description, validation_category

### Medium Term

1. [ ] Update cora-dev-toolkit templates with corrected schemas
2. [ ] Update ai-sec-setup-guide.md with correct file names
3. [ ] Create schema validation script to compare templates vs production

### Long Term

1. [ ] Document schema evolution strategy
2. [ ] Create automated schema sync tooling
3. [ ] Establish schema versioning approach

---

## Appendix: Production Schema Queries

Used Supabase REST API to query OpenAPI definitions:

```bash
curl -s "https://jjsqxcbndvwzhmymrmnw.supabase.co/rest/v1/" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  | jq '.definitions.<table_name>'
```

Tables queried:

- orgs
- profiles
- org_members
- ai_providers
- ai_models
- platform_lambda_config

---

**Document Author:** Claude (Cline Agent)  
**Review Status:** Pending  
**Next Step:** Create corrected migration scripts
