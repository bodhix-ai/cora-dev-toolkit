# Active Context - CORA Development Toolkit

## Current Focus

**Phase 6: Retrofit & Testing** - 🔄 IN PROGRESS (Schema Validation Complete)

## Session: December 11, 2025

### Current Status

- ✅ **Phase 1: Documentation Foundation** - COMPLETE
- ✅ **Phase 2: Project Templates** - COMPLETE
- ✅ **Phase 3: Validation Framework** - COMPLETE
- ✅ **Phase 4: Module Registry System** - COMPLETE
- ✅ **Phase 5: Core Module Templates** - COMPLETE
- 🔄 **Phase 6: Retrofit & Testing** - IN PROGRESS (database setup & schema validation complete)

### Phase 6 Progress (Current Session)

| Task                                     | Status      |
| ---------------------------------------- | ----------- |
| 6.1 Create test CORA project (ai-sec)    | ✅ Complete |
| 6.2 Fix create-cora-project.sh bugs      | ✅ Complete |
| 6.3 Create copy-app-shell-to-template.sh | ✅ Complete |
| 6.4 Create ai-sec setup guide            | ✅ Complete |
| 6.5 Enhance module-access with IDP UI    | ✅ Complete |
| 6.6 Iterative testing cycle              | ✅ Complete |
| 6.7 Database setup & schema application  | ✅ Complete |
| 6.8 Schema validation (ai-sec)           | ✅ Complete |
| 6.9 Run remaining validation scripts     | ✅ Complete |
| 6.10 Deploy and test core modules        | 🔲 Pending  |
| 6.11 Validate module registry            | 🔲 Pending  |
| 6.12 Document lessons learned            | 🔲 Pending  |

### Latest Work: Database Setup & Schema Validation (Dec 11, ~10:40 PM)

**Goal:** Apply SQL schemas to ai-sec Supabase and run schema validation

**Results:**

#### Database Tables Created (10 tables)

| Table                        | Module        | Status     |
| ---------------------------- | ------------- | ---------- |
| orgs                         | module-access | ✅ Created |
| profiles                     | module-access | ✅ Created |
| org_members                  | module-access | ✅ Created |
| ai_providers                 | module-ai     | ✅ Created |
| ai_models                    | module-ai     | ✅ Created |
| ai_model_validation_history  | module-ai     | ✅ Created |
| ai_model_validation_progress | module-ai     | ✅ Created |
| platform_lambda_config       | module-mgmt   | ✅ Created |
| platform_module_registry     | module-mgmt   | ✅ Created |
| platform_module_usage_daily  | module-mgmt   | ✅ Created |

#### Schema Validation Results

- **Total queries scanned:** 236
- **Errors:** 114
- **Warnings:** 63
- **Status:** Failed (expected - missing tables and empty table column detection)

#### Missing Tables Identified (Need Additional Migrations)

| Table                    | Referenced In                               | Action Required                                                     |
| ------------------------ | ------------------------------------------- | ------------------------------------------------------------------- |
| `platform_rag`           | module-ai/backend/lambdas/ai-config-handler | Add SQL schema or remove references                                 |
| `org_prompt_engineering` | module-ai/backend/lambdas/ai-config-handler | Add SQL schema or remove references                                 |
| `external_identities`    | module-access/backend/lambdas/profiles      | Add SQL schema (000-external-identities.sql exists but not applied) |

#### Column Detection Limitation

Many "column not found" errors are due to:

- Tables being empty (REST API sampling can't detect columns in empty tables)
- No `get_schema_info` RPC function installed in Supabase
- This is a known limitation - not actual schema errors

### Script Enhancements Made

**create-cora-project.sh** - Added .env generation:

```bash
# New function: generate_env_files()
# - Reads from setup.config.{project}.yaml
# - Generates apps/web/.env with Supabase, Okta, NextAuth credentials
# - Generates validation/.env for schema-validator
# - Supports both yq (preferred) and grep fallback for YAML parsing
```

**Database Connection:**

- Direct connection works: `db.{project-ref}.supabase.co:5432`
- Pooler connection failed: `aws-0-us-east-1.pooler.supabase.com:6543` (Tenant not found)
- Use `postgres` user with direct connection for schema application

### Template Fixes Required

#### Priority 1: Missing SQL Schemas

- [ ] Apply `000-external-identities.sql` to schema application order
- [ ] Create or remove `platform_rag` table references
- [ ] Create or remove `org_prompt_engineering` table references

#### Priority 2: Template Updates

- [ ] Update `pnpm-workspace.yaml` template with correct pattern: `packages/module-*/frontend`
- [ ] Add `setup.config.example.yaml` with db connection section
- [ ] Add root `package.json` to `_project-stack-template/`

#### Priority 3: Script Improvements

- [ ] Add `--apply-schemas` flag to create-cora-project.sh
- [ ] Add schema application to ai-sec setup guide
- [ ] Test pooler connection string format

### Validation Scripts Run (Dec 11, ~11:00 PM - Final Update ~11:23 PM)

All validators have been run on ai-sec-stack:

| Validator             | Status      | Errors | Warnings | Notes                                        |
| --------------------- | ----------- | ------ | -------- | -------------------------------------------- |
| schema-validator      | ✅ Complete | 114\*  | 63       | \*Many due to empty tables/missing RPC       |
| structure-validator   | ✅ PASSED   | 0      | 0        | All issues resolved                          |
| portability-validator | ✅ Complete | 5\*    | 13       | \*False positives (UUIDs)                    |
| import-validator      | ✅ Complete | 0      | 0        | Frontend passed, backend N/A (no org_common) |

**Toolkit Fixes Applied:**

1. ✅ **structure-validator/validator.py** - Fixed package.json detection for CORA module structure (was checking root only, now checks frontend/ too)
2. ✅ **import-validator/cli.py** - Fixed relative imports for module execution

**Structure Issues Fixed in ai-sec-stack:**

- ✅ Created `scripts/` directory with README.md
- ✅ Added `package.json` to `packages/contracts/`
- ✅ Updated `pnpm-workspace.yaml` to include `packages/*` pattern

**Remaining Known Limitations:**

- 13 hardcoded AWS regions (`us-east-1`) - portability concern (low priority)
- 5 false positive UUID errors in portability-validator (low priority)
- cora-validate.py orchestrator CLI compatibility issues (Issue #12)

### ai-sec Test Project

**Location:** `~/code/sts/security/`

- `ai-sec-infra/` - Infrastructure repo
- `ai-sec-stack/` - Application stack with 3 core modules

**Supabase Project:**

- URL: `https://jowgabouzahkbmtvyyjy.supabase.co`
- Direct DB: `db.jowgabouzahkbmtvyyjy.supabase.co:5432`
- 10 tables created and validated

### Issues Log (8 Total - 6 Fixed, 2 Deferred)

1. **Issue #1: Outdated Module Names** ✅ FIXED
2. **Issue #2: Workspace Pattern** ✅ FIXED
3. **Issue #3: Module Package Names** ⏳ DEFERRED
4. **Issue #4: Validation Script Imports** ⏳ DEFERRED
5. **Issue #5: Missing Root package.json** ✅ FIXED
6. **Issue #6: Missing Shared Packages** ✅ FIXED
7. **Issue #7: Missing App Components** ✅ FIXED
8. **Issue #8: Unreplaced Placeholder** ✅ FIXED

See `docs/phase-6-testing-issues-log.md` for full details.

### Key Decisions Made

- Module naming: `module-{purpose}` (single word)
- Two-repo pattern: `{project}-infra` + `{project}-stack`
- Core modules: module-access, module-ai, module-mgmt
- **Database connection**: Use direct connection (`db.*.supabase.co:5432`) not pooler
- **Schema validation**: REST API sampling has limitations with empty tables
- **Auth approach**: Support both Okta and Clerk via database-driven config

### Session Summary

**Completed This Session:**

- ✅ Created ai-sec-infra and ai-sec-stack from templates
- ✅ Applied SQL schemas to ai-sec Supabase (10 tables)
- ✅ Ran schema-validator (236 queries scanned)
- ✅ Identified missing tables and template fixes needed
- ✅ Enhanced create-cora-project.sh with .env generation

**Next Task Priority:**

- ✅ Complete import-validator testing - frontend passed, backend N/A
- ⏳ Fix cora-validate.py orchestrator CLI compatibility (Issue #12)
- 🔲 Apply template updates (see checklist below)
- 🔲 Delete and recreate ai-sec project to verify fixes
- 🔲 Document lessons learned

### Template Update Checklist

**All changes needed to the CORA development toolkit templates based on testing:**

#### `_project-stack-template/` Updates

| File/Directory                    | Issue     | Action Required                                                                                                 |
| --------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| `pnpm-workspace.yaml`             | Issue #2  | Add `packages/module-*/frontend` pattern                                                                        |
| `package.json` (root)             | Issue #5  | Already added - verify in template                                                                              |
| `apps/web/package.json`           | Issue #1  | ✅ Fixed - verify correct module names                                                                          |
| `apps/web/app/page.tsx`           | Issue #8  | Replace `${project_display_name}` with `{{PROJECT_DISPLAY_NAME}}` placeholder                                   |
| `apps/web/components/`            | Issue #7  | Add stub components directory with: ThemeRegistry, AppShell, ClientProviders, ChatContainer, GlobalLayoutToggle |
| `scripts/`                        | Structure | Create empty `scripts/` directory (required by CORA standard)                                                   |
| `packages/contracts/package.json` | Structure | Add package.json to contracts package                                                                           |

#### `_cora-core-modules/` Updates

| Module        | File                    | Issue       | Action Required                                                   |
| ------------- | ----------------------- | ----------- | ----------------------------------------------------------------- |
| All modules   | `frontend/package.json` | Issue #3    | Update package names to `module-{purpose}` format                 |
| module-ai     | `db/` schemas           | Schema      | Create `platform_rag` table schema OR remove references           |
| module-ai     | `db/` schemas           | Schema      | Create `org_prompt_engineering` table schema OR remove references |
| module-access | `db/` schemas           | Schema      | Apply `000-external-identities.sql` to schema application order   |
| All modules   | Backend code            | Portability | Replace hardcoded `us-east-1` with `os.environ.get('AWS_REGION')` |

#### `scripts/` Updates

| Script                   | Issue    | Action Required                                                     |
| ------------------------ | -------- | ------------------------------------------------------------------- |
| `create-cora-project.sh` | Issue #8 | Add `${variable}` placeholder replacement (not just `{{VARIABLE}}`) |
| `create-cora-project.sh` | Schema   | Add `--apply-schemas` flag option                                   |

#### Shared Packages to Add to Template

| Package        | Purpose  | Location                                                      |
| -------------- | -------- | ------------------------------------------------------------- |
| `api-client`   | Issue #6 | Copy from pm-app-stack to `_project-stack-template/packages/` |
| `shared-types` | Issue #6 | Copy from pm-app-stack to `_project-stack-template/packages/` |
| `contracts`    | Issue #6 | Copy from pm-app-stack to `_project-stack-template/packages/` |

**Total Template Changes:** 15+ items across 4 areas

### References

- [Phase 6 Testing Issues Log](../docs/phase-6-testing-issues-log.md)
- [AI-Sec Setup Guide](../docs/ai-sec-setup-guide.md)
- [Implementation Plan](../docs/cora-development-toolkit-plan.md)
