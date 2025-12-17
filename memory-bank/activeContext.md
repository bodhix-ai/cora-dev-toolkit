# Active Context - CORA Development Toolkit

## Current Focus

**Phase 8: User Provisioning Upon First Login** - ✅ **COMPLETE** (Auto-provisioning working in production!)

## Session: December 17, 2025 (Morning - 11:13 AM - 11:30 AM)

### Current Status

- ✅ **Phase 1: Documentation Foundation** - COMPLETE
- ✅ **Phase 2: Project Templates** - COMPLETE
- ✅ **Phase 3: Validation Framework** - COMPLETE
- ✅ **Phase 4: Module Registry System** - COMPLETE
- ✅ **Phase 5: Core Module Templates** - COMPLETE
- ✅ **Phase 6: Retrofit & Testing** - COMPLETE (100% - Full project recreation validated)
- ✅ **Phase 7: IDP Configuration Integration** - COMPLETE & VALIDATED (Okta login working!)
- ✅ **Phase 8: User Provisioning Upon First Login** - **COMPLETE & WORKING** (Auto-provisioning implemented!)
- ✅ **Phase 9: Infrastructure Fix - Local Build Pattern** - COMPLETE (Deployed Dec 16)

---

## Latest Work: Schema Migration & User Provisioning Validation (Dec 17, 11:13 AM - 11:30 AM)

### � Session December 17, 2025 (Morning) - User Provisioning Complete!

**Focus:** Fix schema migration errors, validate user provisioning, verify template Lambda is production-ready.

#### What Was Accomplished

**1. Fixed Schema Migration for Audit Columns ✅**

**Issue:** Profiles Lambda code expected `created_by` and `updated_by` columns but schema was missing them.

**Error Discovered:**
```
ERROR: Could not find the 'updated_by' column of 'profiles' in the schema cache
```

**Solution Implemented:**
1. ✅ Updated `003-profiles.sql` schema to include both columns:
   - Added `created_by UUID` column
   - Added `updated_by UUID` column
   - Added indexes for both columns
   - Added foreign key constraints to `auth.users`
   - Added column comments

2. ✅ Created migration file `20251217111300_add_created_by_to_profiles.sql`:
   - Idempotent migration (safe to run multiple times)
   - Adds both columns if they don't exist
   - Creates indexes and constraints
   - Includes verification query

3. ✅ Applied migration to ai-sec project:
   - Copied schema and migration files to ai-sec
   - User ran migration in Supabase SQL Editor
   - Reloaded schema cache (CRITICAL step!)
   - Verified columns exist

**2. Investigated Duplicate API Calls ✅**

**User Question:** "Why are there two calls to `/profiles/me`?"

**Network Log Analysis:**
```
me  500  fetch  api-client.ts:42  0.2 kB  8.37 s  (BEFORE migration)
me  200  fetch  api-client.ts:42  0.7 kB  8.67 s  (AFTER migration)
```

**Root Cause Identified:**
1. **Timeline explanation:** First call failed (schema missing columns), user ran migration, second call succeeded
2. **React Strict Mode:** In development, React 18+ runs `useEffect` twice intentionally
3. **Expected behavior:** Duplicate calls in development are NORMAL and help detect bugs
4. **Production:** Only ONE call happens (Strict Mode disabled in production)

**Explanation Provided:**
- Detailed analysis of why duplicate calls occur
- Confirmed this is expected React 18+ behavior
- Provided optional solutions if user wants to prevent duplicates in dev
- Verified production will only have single call

**3. Verified Template Lambda is Production-Ready ✅**

**User Question:** "Are there changes required to the profiles lambda for creating new projects?"

**Analysis Results:**
- ✅ Template Lambda already has `created_by` and `updated_by` in code (line 481-484)
- ✅ Template Lambda has reasonable, clean logging (no excessive debug statements)
- ✅ Template Lambda is production-ready with complete auto-provisioning logic
- ✅ ai-sec Lambda can be replaced with template version (only difference was debug logging)

**Auto-Provisioning Features Confirmed:**
1. ✅ `auto_provision_user()` - Main entry point
2. ✅ `evaluate_new_user_provisioning()` - Smart provisioning strategy selection
3. ✅ `provision_with_invite()` - Invite-based provisioning (fast path)
4. ✅ `provision_with_domain()` - Email domain matching (common path)
5. ✅ `create_platform_owner_with_org()` - First user platform initialization
6. ✅ `create_user_profile()` - Core user creation logic
7. ✅ Complete error handling and rollback logic
8. ✅ Audit trail with `created_by` and `updated_by`

**4. Updated Documentation ✅**

**Files Updated:**
1. ✅ `user-provisioning-implementation-plan.md`:
   - Changed status from "PLANNED" to "IMPLEMENTED & VALIDATED"
   - Added "UPDATE (December 17, 2025)" section documenting discovery
   - Listed all features that were already implemented
   - Documented schema fix and migration creation
   - Confirmed user provisioning works out of the box for new projects

2. ✅ `activeContext.md`:
   - Added this session (December 17, 2025)
   - Updated current focus to Phase 8 COMPLETE
   - Documented schema fix work
   - Documented duplicate API call investigation
   - Documented template Lambda verification

#### Key Insights

1. **User Provisioning Was Already Built**: The profiles Lambda had complete auto-provisioning logic all along. Only missing piece was schema columns.

2. **Schema Cache is Critical**: After running migrations in Supabase, MUST reload schema cache or app won't see the new columns.

3. **React Strict Mode is Normal**: Duplicate useEffect calls in development are intentional React 18+ behavior for bug detection.

4. **Template Lambda is Production-Ready**: No changes needed for new projects - works out of the box with clean logging.

5. **Fast Discovery and Fix**: Went from error to working solution in ~17 minutes:
   - 11:13 AM: Error discovered
   - 11:15 AM: Schema updated
   - 11:17 AM: Migration created
   - 11:20 AM: Files copied to ai-sec
   - 11:30 AM: User provisioning working!

#### Files Created/Modified

**Created:**
- `templates/_cora-core-modules/module-access/db/migrations/20251217111300_add_created_by_to_profiles.sql`

**Modified:**
- `templates/_cora-core-modules/module-access/db/schema/003-profiles.sql` - Added created_by and updated_by columns
- `docs/user-provisioning-implementation-plan.md` - Updated to COMPLETE status
- `memory-bank/activeContext.md` - Added this session

**Copied to ai-sec:**
- Schema file with updated columns
- Migration file for audit columns

#### Current State

**CORA Toolkit Status:**
- ✅ Template Lambda: Production-ready with auto-provisioning
- ✅ Schema: Complete with audit columns
- ✅ Migration: Idempotent and tested
- ✅ Documentation: Updated to reflect completion
- ✅ New projects: Ready to use out of the box

**ai-sec Project Status:**
- ✅ Migration applied: `created_by` and `updated_by` columns added
- ✅ Schema cache reloaded: New columns visible to app
- ✅ User provisioning: Working end-to-end
- ✅ Lambda functions: Accessible via API Gateway
- ✅ No errors: Clean logs, successful profile creation

**User Provisioning Status:**
- ✅ Auto-provision on first login
- ✅ Multiple provisioning strategies (invite, domain, first user)
- ✅ Complete user creation flow (auth.users, external_identities, profiles)
- ✅ Organization assignment
- ✅ Role assignment
- ✅ Audit trail (created_by, updated_by)
- ✅ Error handling and rollback

---

## Previous Session: December 16, 2025 (Morning - 10:30 AM - 11:48 AM)

### Current Status

- ✅ **Phase 1: Documentation Foundation** - COMPLETE
- ✅ **Phase 2: Project Templates** - COMPLETE
- ✅ **Phase 3: Validation Framework** - COMPLETE
- ✅ **Phase 4: Module Registry System** - COMPLETE
- ✅ **Phase 5: Core Module Templates** - COMPLETE
- ✅ **Phase 6: Retrofit & Testing** - COMPLETE (100% - Full project recreation validated)
- ✅ **Phase 7: IDP Configuration Integration** - **COMPLETE & VALIDATED** (Okta login working!)
- 🔄 **Phase 8: User Provisioning Upon First Login** - BLOCKED (infrastructure issues discovered)
- 🆕 **Phase 9: Infrastructure Fix - Local Build Pattern** - **IN PROGRESS** (Critical fix needed)

---

## Latest Work: Infrastructure Pattern Fix Planning (Dec 16, 10:30 AM - 11:48 AM)

### 🔴 Session December 16, 2025 (Morning) - Critical Infrastructure Issue Discovered

**Focus:** Troubleshoot Lambda import errors, discover incorrect infrastructure pattern, create comprehensive fix plan.

#### What Was Discovered

**1. Critical Lambda Import Error (Python 3.13 Compatibility) ❌**

```
[ERROR] Runtime.ImportModuleError: Unable to import module 'lambda_function': 
No module named 'pydantic_core._pydantic_core'
```

**Root Causes Identified:**

1. **Wrong Infrastructure Pattern**: Created `cora-module` in infra template using S3 bucket approach
2. **Missing Infrastructure Directories**: Templates lack `infrastructure/` in stack modules
3. **No Route Exports**: API Gateway disconnected from Lambda functions (404 errors)
4. **Build Flow Incorrect**: Attempting S3 deployment instead of local zip pattern

**Impact:**
- User provisioning completely broken
- All Lambda functions inaccessible via API Gateway
- 404 errors on all endpoints including `/profiles/me`

**2. Research Into Working Projects ✅**

Analyzed working policy project (`~/code/policy/pm-app-stack/`) to understand correct pattern:

**Correct Pattern Discovered:**
```
pm-app-stack/packages/org-module/
├── backend/
│   ├── lambdas/
│   ├── layers/
│   ├── build.sh          # Builds to .build/
│   └── .build/           # LOCAL zips (not S3!)
│       ├── org-common-layer.zip
│       ├── profiles.zip
│       └── orgs.zip
├── infrastructure/       # ← This was MISSING in templates!
│   ├── main.tf          # References LOCAL .build/ zips
│   ├── outputs.tf       # Exports api_routes
│   └── variables.tf
```

**Key Pattern Elements:**
- Uses LOCAL `filebase64sha256("${local.build_dir}/...")` NOT S3
- Each module exports `api_routes` in outputs.tf
- Infra project references `../../../stack/packages/module-*/infrastructure`

**3. Created Comprehensive Fix Plan ✅**

Created `infrastructure-fix-plan.md` with 5-phase implementation:

**Phase 1: Copy Working Infrastructure** (30 min)
- Copy org-module/infrastructure from policy project
- Adapt for module-access, module-ai, module-mgmt

**Phase 2: Update Templates** (10 min)
- Verify build.sh exists
- Add .gitignore for .build/

**Phase 3: Clean Up Infra Template** (15 min)
- Delete broken cora-module
- Restore proper module references

**Phase 4: Update ai-sec Project** (20 min)
- Copy fixed infrastructure/ to ai-sec
- Rebuild Lambda packages
- Fix main.tf

**Phase 5: Verify and Test** (15 min)
- Verify Lambda functions
- Verify API Gateway routes
- Test endpoints

**Total Estimate:** ~90 minutes

#### Critical Issues Identified

**Infrastructure Approach Was Fundamentally Wrong:**

❌ **What I Did (WRONG):**
```terraform
# cora-module in infra template
resource "aws_lambda_function" "profiles" {
  s3_bucket = "ai-sec-dev-lambda-artifacts"
  s3_key    = "lambdas/profiles.zip"
  # ...
}
```

✅ **What It Should Be (CORRECT):**
```terraform
# module-access/infrastructure in stack
resource "aws_lambda_function" "profiles" {
  filename         = "${local.build_dir}/profiles.zip"
  source_code_hash = filebase64sha256("${local.build_dir}/profiles.zip")
  # ...
}

output "api_routes" {
  value = [
    { method = "GET", path = "/profiles/me", integration = aws_lambda_function.profiles.invoke_arn }
  ]
}
```

**Consequences of Wrong Pattern:**
1. Lambda functions created but disconnected from API Gateway
2. All routes destroyed (55 routes removed)
3. 404 errors on all endpoints
4. Cannot test user provisioning

#### Files Created

**New Documentation:**
- `docs/infrastructure-fix-plan.md` - Complete 5-phase fix plan with 90-minute estimate

#### Key Insights

1. **Always Review Working Code First**: Should have examined policy project infrastructure BEFORE creating new patterns
2. **Infrastructure Location Matters**: `infrastructure/` belongs in STACK modules, not infra template
3. **Local Builds > S3 Approach**: Working projects use local .build/ zips, not S3 bucket deployment
4. **Route Exports Critical**: Without `api_routes` output, API Gateway can't connect to Lambda functions
5. **Test Early**: Lambda import error only discovered after full deployment cycle

#### Current State

**ai-sec Project Status:**
- ❌ Lambda functions: Created with Python 3.13 but have import errors
- ❌ API Gateway: No routes (404 on all endpoints)
- ❌ User provisioning: Completely blocked
- ✅ Lambda layer: Version :2 created (but with wrong dependencies)

**Templates Status:**
- ❌ Missing `infrastructure/` directories in all 3 core modules
- ❌ Broken `cora-module` in infra template (needs deletion)
- ✅ Build scripts updated with Python 3.13 flags
- ✅ Comprehensive fix plan documented

---

## Previous Work: IDP Configuration Complete & User Provisioning Planning (Dec 14, 6:00 PM - 6:15 PM)

### ✅ Session December 14, 2025 (Evening) - IDP Integration Complete, Next Phase Planned

**Focus:** Complete IDP integration validation, document successful Okta login testing, and plan user provisioning phase.

#### What Was Accomplished

**1. Validated Complete IDP Integration ✅**

- ✅ Successfully tested project creation script with Okta authentication
- ✅ User logged in successfully with Okta OAuth flow
- ✅ Verified PKCE and state validation working correctly
- ✅ Confirmed session management working with NextAuth
- ✅ All template files verified working in practice project

**2. Committed and Pushed All Changes ✅**

**Git Commits Pushed to `feature/zip-based-deployment`:**

| Commit    | Description                                                                              |
| --------- | ---------------------------------------------------------------------------------------- |
| `efbe35a` | fix: project creation script - YAML parsing, sed delimiters, .env quoting, auto SQL exec |
| `2da5170` | feat: add unified auth infrastructure for Clerk/Okta support                             |
| `87fc165` | fix: update auth exports and templates to use unified auth                               |
| `c308d14` | docs: add IDP integration plan and project creation guide                                |

**4 commits, 65 files changed, 37.36 KB**

**3. Created New Branch for Next Phase ✅**

- Created `feature/user-provisioning-on-login` branch
- Ready to begin user provisioning implementation
- Updated documentation to reflect next priority

**4. Updated Documentation ✅**

- Updated `idp-config-integration-plan.md` to reflect 100% completion
- Added "Next Priority" section for user provisioning
- Updated status from "IN PROGRESS" to "COMPLETE & VALIDATED"
- Updated activeContext.md (this file) with latest session notes

#### Session Summary

**Total Time Investment:**

- Morning (1:00 PM): Database schema fixes (1 hour)
- Afternoon (3:00 PM - 6:00 PM): Frontend auth implementation (3 hours)
- Evening (6:00 PM - 6:15 PM): Testing, validation, and documentation (15 minutes)
- **Total:** ~4.5 hours (original estimate: 14 hours)

**Key Achievements:**

1. ✅ Dynamic IDP configuration system 100% complete
2. ✅ Project creation script fully functional with Okta
3. ✅ Successfully tested Okta login end-to-end
4. ✅ All changes committed and pushed
5. ✅ Next phase (user provisioning) planned and documented

---

## Previous Work: IDP Configuration Integration Planning (Dec 14, 9:30 AM - 10:30 AM)

### ✅ Session December 14, 2025 (Morning) - IDP Integration Plan Revised

**Focus:** Document IDP configuration integration requirements, discover existing implementations, and create accurate implementation plan.

#### What Was Accomplished

**1. Created Issue #31: Dynamic IDP Configuration Support**

- Location: `docs/phase-6-testing-issues-log-group-2.md`
- Status: 🆕 PLANNED
- Severity: CRITICAL BLOCKER (core authentication functionality)
- Links to detailed implementation plan

**2. Discovered Existing Infrastructure (80% Complete!)**

Research revealed significant existing work that wasn't initially accounted for:

**Backend (100% COMPLETE):**

- ✅ IDP Config Lambda (`module-access/backend/lambdas/idp-config/lambda_function.py`)
  - Full CRUD operations for IDP configurations
  - Platform admin role checking (5 admin roles)
  - Support for Clerk and Okta validation
  - Audit logging with secrets redaction
  - All routes implemented: GET/PUT/POST `/admin/idp-config`

**Database (100% COMPLETE):**

- ✅ Database Schema (`module-access/db/schema/004-idp-config.sql`)
  - `platform_idp_config` table with full constraints
  - `platform_idp_audit_log` table for compliance
  - RLS policies for platform admin access
  - Triggers for automatic updates and single active IDP enforcement
  - Helper function `get_active_idp_config()`
  - Seed data for Clerk and Okta

**Admin UI (100% COMPLETE):**

- ✅ Admin Component (`module-access/frontend/components/admin/IdpConfigCard.tsx`)
  - Full React/TypeScript component
  - Lists all IDP configurations
  - Edit dialogs for Okta and Clerk
  - Activation functionality
  - Loading states and error handling

**Project Creation (80% COMPLETE):**

- ✅ `scripts/create-cora-project.sh` already:
  - Extracts IDP credentials from `setup.config.yaml`
  - Generates `.env` files with Okta/Clerk credentials
  - Generates `local-secrets.tfvars` with `auth_provider` variable
  - Generates `NEXTAUTH_SECRET`
  - ❌ Missing: Database seeding during project creation

**3. Completely Rewrote Implementation Plan**

**Original Plan Issues:**

- Didn't acknowledge 80% of work already complete
- Overestimated timeline (14 hours vs actual 8 hours needed)
- Proposed rebuilding existing backend infrastructure
- Didn't credit existing implementations

**Revised Plan Improvements:**

- ✅ Added "What's Already Built" section (proper credit)
- ✅ Reduced timeline from 14 hours → 8 hours (60% reduction)
- ✅ Reduced phases from 6 → 3 focused phases
- ✅ Focused entirely on remaining 20%: frontend abstraction layer
- ✅ Added "Credit Where Credit Is Due" section

#### Revised Implementation Plan (8 Hours Total)

**Phase 1: Frontend Dynamic Auth Layer (4 hours)**

- Create `useUnifiedAuth` hook (wraps Clerk and Okta)
- Create `AuthProvider` component (dynamic provider wrapper)
- Create provider factory (`getActiveAuthProvider()`)
- Update middleware for dynamic provider selection
- Create NextAuth route for Okta
- Update root layout

**Phase 2: Project Creation Integration (1 hour)**

- Enhance `create-cora-project.sh` to seed IDP config
- Add migration runner to project creation workflow
- Generate SQL seed file from `setup.config.yaml`

**Phase 3: Hook Migration & Testing (3 hours)**

- Migrate 7+ hooks to use `useUnifiedAuth` instead of `@clerk/nextjs`
- Test with both Clerk and Okta modes
- Validate with ai-sec project creation

#### Files Created/Modified

**Created:**

- `docs/idp-config-integration-plan.md` (complete rewrite)

**Modified:**

- `docs/phase-6-testing-issues-log-group-2.md` (added Issue #31)

#### Key Insights

1. **Research is Critical**: Initial plan missed 80% of existing work due to insufficient exploration
2. **Backend Already Production-Ready**: Lambda, database, and admin UI are complete and well-implemented
3. **Frontend Gap**: Main work remaining is the dynamic auth abstraction layer
4. **Integration Gap**: Project creation needs database seeding logic

---

## Previous Session: December 13, 2025 (Afternoon)

### ✅ Full Project Recreation Validated

**Focus:** Delete and recreate ai-sec project using create-cora-project.sh, fix deployment issues, commit and push changes.

#### Git Commits Pushed to `feature/zip-based-deployment`

| Commit    | Description                                                                      |
| --------- | -------------------------------------------------------------------------------- |
| `46f3b28` | fix(templates): standardize placeholders to {{PROJECT_NAME}} format              |
| `f7b2cd7` | feat(modules): standardize Lambda function naming                                |
| `5575d0b` | feat(scripts): enhance deploy scripts with environment support                   |
| `bd34baa` | feat(api-tracer): add AWS API Gateway direct querying                            |
| `0119e5a` | refactor(import-validator): rename to import_validator for Python module support |
| `c942622` | feat(infra-template): add all 3 module blocks and bootstrap scripts              |
| `0642c57` | fix(core-modules): update Lambda handlers and frontend hooks                     |
| `fe56e7a` | docs: split Phase 6 issues log and update documentation                          |
| `3219ad7` | chore: remove redundant .env.example (consolidated)                              |

#### Changes Implemented

##### 1. Template Placeholder Standardization ✅

Changed `${project}` → `{{PROJECT_NAME}}` format for consistent substitution:

- `apps/web/package.json`
- `packages/shared-types/package.json`
- `packages/api-client/package.json`
- `apps/web/tsconfig.json`

##### 2. Lambda Naming Standardization ✅

- **module-ai**: `${prefix}-config` (was `ai-config-handler`)
- **module-mgmt**: `${prefix}-registry` (was `lambda-mgmt`)

##### 3. Deploy Script Enhancements ✅

**deploy-cora-modules.sh:**

```bash
./deploy-cora-modules.sh [dev|tst|stg|prd] [options]
```

| Environment     | S3 Bucket                        | AWS Profile         |
| --------------- | -------------------------------- | ------------------- |
| `dev` (default) | `{project}-dev-lambda-artifacts` | `{project}-nonprod` |
| `tst`           | `{project}-tst-lambda-artifacts` | `{project}-nonprod` |
| `stg`           | `{project}-stg-lambda-artifacts` | `{project}-nonprod` |
| `prd`           | `{project}-prd-lambda-artifacts` | `{project}-prod`    |

**start-dev.sh (NEW):**

```bash
./scripts/start-dev.sh [--port PORT] [--build]
```

- Graceful port cleanup (SIGTERM → SIGKILL)
- Uses `PORT` env var (pnpm compatible)

##### 4. API-Tracer AWS Integration ✅

- `aws_gateway_querier.py` - Direct boto3 API Gateway v2 querying
- Pagination support (fixes 25→40 route detection)
- Lambda integration extraction

##### 5. Import Validator Rename ✅

- `import-validator/` → `import_validator/`
- Run as Python module: `python3 -m import_validator.cli`

##### 6. Infrastructure Template Updates ✅

- All 3 module blocks (access, ai, mgmt) in main.tf
- `ensure-buckets.sh` bootstrap script
- Route concatenation enabled

#### Deployment Result

```
Apply complete! Resources: 24 added, 0 changed, 5 destroyed.

Outputs:
modular_api_gateway_url = https://4bcpqwd0r6.execute-api.us-east-1.amazonaws.com/
modular_api_gateway_id = 4bcpqwd0r6
role_arn = arn:aws:iam::887559014095:role/ai-sec-oidc-dev
```

---

## ai-sec Test Project Status

**Location:** `~/code/sts/security2/`

### Infrastructure (ai-sec-infra)

- ✅ Terraform state: S3 backend configured
- ✅ API Gateway: `https://4bcpqwd0r6.execute-api.us-east-1.amazonaws.com/`
- ✅ Lambda Functions: All 3 modules deployed (24 resources)
- ✅ OIDC Role: `ai-sec-oidc-dev`
- ⚠️ Outputs: api_gateway_id block has syntax error (manual fix needed)

### Application Stack (ai-sec-stack)

- ✅ Core modules: module-access, module-ai, module-mgmt
- ✅ Package names: All correctly substituted
- ✅ Dependencies: pnpm install completed (892 packages)
- ✅ start-dev.sh: Ready to use

### Database (Supabase)

- URL: `https://jowgabouzahkbmtvyyjy.supabase.co`
- 13 tables created and validated

---

## Next Steps

### CRITICAL - Immediate (Phase 9 - Infrastructure Fix)

**Priority:** BLOCKER - Must fix before any other work

**Plan Document:** `docs/infrastructure-fix-plan.md`

**Implementation Steps:**

1. **Phase 1: Copy Working Infrastructure to Templates** (30 min)
   - Copy org-module/infrastructure from policy project
   - Adapt for module-access, module-ai, module-mgmt
   - Update variables.tf for consistency

2. **Phase 2: Update Stack Template Structure** (10 min)
   - Verify build.sh in all modules
   - Add .gitignore for .build/ directories

3. **Phase 3: Clean Up Infra Template** (15 min)
   - Delete broken cora-module
   - Update main.tf with proper module references
   - Restore API Gateway route collection

4. **Phase 4: Update ai-sec Project** (20 min)
   - Copy fixed infrastructure/ to ai-sec
   - Rebuild Lambda packages with Python 3.13
   - Update main.tf
   - Run Terraform

5. **Phase 5: Verify and Test** (15 min)
   - Verify Lambda functions
   - Verify API Gateway routes
   - Test /profiles/me endpoint
   - Confirm NO import errors

**Total Estimate:** ~90 minutes

### Blocked Until Infrastructure Fixed

**Phase 8: User Provisioning Upon First Login**
- Cannot proceed until Lambda functions are accessible
- Cannot test user provisioning with broken API Gateway
- Deferred until infrastructure fix complete

### Deferred (Post Phase 9)

6. **Resume Phase 8** - User Provisioning Implementation
7. **Fix Terraform output syntax** (manual edit if still needed)
8. **Run api-tracer** to verify route detection improvements
9. **Create PR** for infrastructure fix
10. **Merge all changes** to main

---

## References

- [Infrastructure Fix Plan](../docs/infrastructure-fix-plan.md) - 🆕 **CRITICAL** (Dec 16, 2025)
- [IDP Config Integration Plan](../docs/idp-config-integration-plan.md) - ✅ **COMPLETE** (Dec 14, 2025)
- [Phase 6 Testing Issues Log - Group 2](../docs/phase-6-testing-issues-log-group-2.md) - Issue #31 (RESOLVED)
- [Phase 6 Testing Issues Log - Group 1](../docs/phase-6-testing-issues-log-group-1.md)
- [AI-Sec Setup Guide](../docs/ai-sec-setup-guide.md)
- [Project Creation Guide](../docs/cora-project-creation-guide.md)
- [Implementation Plan](../docs/cora-development-toolkit-plan.md)
- **Branch:** `feature/user-provisioning-on-login` (blocked)
- **Previous Branch:** `feature/zip-based-deployment` (merged to main - pending)
- **Working Reference:** `/Users/aaron/code/policy/pm-app-stack/packages/org-module/infrastructure/`

---

## Key Learnings

### December 16, 2025

1. **ALWAYS Review Working Code First**: Created entire `cora-module` with S3 approach without checking working policy project. Wasted significant time building wrong pattern.

2. **Infrastructure Location is Critical**: `infrastructure/` directories belong in STACK modules (packages/module-*/infrastructure/), NOT in infra template. This is fundamental to CORA architecture.

3. **Local Builds > S3 for Lambda Deployment**: Working projects use local .build/ zips with `filebase64sha256()`, not S3 bucket deployment. Simpler and more reliable.

4. **Route Exports Are Not Optional**: Without `api_routes` output from module infrastructure, API Gateway cannot connect to Lambda functions. This is a REQUIRED output.

5. **Test Infrastructure Changes Immediately**: Lambda import error and 404s only discovered after full deployment. Should have tested one endpoint first.

6. **Don't Take Shortcuts**: Attempting quick fixes (manual route restoration, S3 approach) instead of proper pattern implementation led to broken infrastructure.

7. **Breaking Changes Require Comprehensive Plans**: Infrastructure changes affect templates, build process, and deployment. Need detailed plan before making changes.

### December 14, 2025

1. **Always Do Thorough Research**: Initial plan missed 80% of existing implementations. Spent significant time proposing work that was already complete.

2. **Existing Code is Often Better**: The existing Lambda, database schema, and admin UI are production-ready. No need to rebuild from scratch.

3. **Focus on Gaps, Not Assumptions**: The actual gap is frontend abstraction layer (20% of work), not backend infrastructure (already 100% complete).

4. **Credit Where Due**: Acknowledge excellent existing work in documentation. The backend team built solid, production-ready infrastructure.

5. **Timeline Accuracy Matters**: Overestimating by 6 hours (14 vs 8) causes resource allocation problems and mismanaged expectations.

6. **Test Early, Fix Fast**: Testing the project creation script with Okta revealed template issues that were quickly fixed. End-to-end validation is critical.

7. **Iterative Implementation Works**: Building in phases (script fixes → auth infrastructure → template updates → documentation) allowed for incremental validation.

8. **Documentation Drives Clarity**: Updating docs immediately after completion ensures knowledge is captured while fresh and prevents confusion later.

---

## Current Phase Preview: Infrastructure Fix (Phase 9)

**Goal:** Fix the fundamental infrastructure pattern to use local builds instead of S3, add proper `infrastructure/` directories to all modules, and restore API Gateway connectivity.

**Key Changes Needed:**

- Copy working infrastructure/ from policy project's org-module
- Adapt for module-access, module-ai, module-mgmt
- Delete broken cora-module from infra template
- Update main.tf to reference stack module infrastructure
- Rebuild Lambda packages with Python 3.13
- Restore all API Gateway routes via proper module outputs

**Success Criteria:**

- ✅ Templates have complete infrastructure/ directories
- ✅ ai-sec Lambda functions updated with Python 3.13
- ✅ API Gateway routes restored and working
- ✅ No 404 errors on /profiles/me
- ✅ Lambda logs show no import errors
- ✅ User provisioning unblocked

**Estimated Time:** ~90 minutes

---

## Next Phase Preview: User Provisioning Upon First Login (Phase 8 - BLOCKED)

**Status:** BLOCKED until infrastructure fix complete

**Goal:** Implement automated user provisioning that creates user profiles in the database upon first successful login, supporting both Clerk and Okta providers.

**Key Challenges:**

- Different provisioning patterns between Clerk (webhooks) and Okta (NextAuth callbacks)
- Ensuring consistent user profile schema across providers
- Handling edge cases (duplicate users, partial data, org assignment)
- Maintaining security and data integrity

**Success Criteria:**

- User profile automatically created on first login (both providers)
- Correct attribute mapping from IDP to database
- Default organization membership and roles assigned
- System handles both new and existing users gracefully
