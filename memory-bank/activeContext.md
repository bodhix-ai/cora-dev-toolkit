# Active Context - CORA Development Toolkit

## Current Focus

**Phase 38: Functional Module Registry - Phase 4** - ✅ **COMPLETE - READY FOR PR**

## Session: January 1, 2026 (1:25 PM - 4:30 PM) - Session 60

### 🎯 Focus: Module-WS Integration Testing & Deployment Fixes

**Context:** Following Phase 3 (Config Merging), this session completed Phase 4 of the Functional Module Integration plan: end-to-end testing of module-ws deployment, troubleshooting all issues, and documenting the complete deployment process.

**Status:** ✅ **PHASE 4 COMPLETE - MODULE-WS SUCCESSFULLY DEPLOYED**

---

## Work Completed (Session 60)

### Phase 4: Module-WS Integration Testing - COMPLETE ✅

**Test Environment:** Fresh project creation at `~/code/sts/test-ws-01`
- Project: `ai-sec`
- Output: `test-ws-01/ai-sec-infra` + `test-ws-01/ai-sec-stack`
- Modules: Core (access, ai, mgmt) + Functional (ws)

**Issues Discovered & Fixed:**

### 1. ✅ Database Schema Issues
**File:** `templates/_modules-functional/module-ws/db/schema/006-apply-rls.sql`

**Problems Found:**
- Referenced `org_members.person_id` (wrong column name)
- Checked `org_members.active = true` (column doesn't exist)

**Fixes Applied:**
- Changed `person_id` → `user_id` (standard CORA naming)
- Removed `active` column checks
- Updated all RLS policies to use correct column names

**Root Cause:** Module-ws was created before CORA database naming standards were fully established.

---

### 2. ✅ Lambda Function API Issues
**Files:** 
- `templates/_modules-functional/module-ws/backend/lambdas/workspace/lambda_function.py`
- `templates/_modules-functional/module-ws/backend/lambdas/cleanup/lambda_function.py`

**Problems Found:**
- All Lambda functions called `common.call_rpc()` (13 occurrences)
- Correct function name is `common.rpc()` per org_common layer

**Fixes Applied:**
- Changed all `common.call_rpc()` → `common.rpc()`
- Verified against actual org_common layer source code
- Tested with deployed org_common layer

**Root Cause:** Module-ws was developed using outdated org_common API reference.

---

### 3. ✅ Build Script Missing
**File:** `templates/_modules-functional/module-ws/backend/build.sh`

**Problems Found:**
- No build script existed for module-ws
- Lambda artifacts couldn't be created
- Deployment blocked without .zip files

**Fixes Applied:**
- Created complete build script following module-access pattern
- Builds Lambda packages: `workspace.zip`, `cleanup.zip`
- Places artifacts in `backend/.build/`
- Made script executable (`chmod +x`)
- Includes proper error handling and logging

**Root Cause:** Module-ws template was incomplete - missing critical build infrastructure.

---

### 4. ✅ Terraform Module Declaration Missing
**File:** `templates/_project-infra-template/envs/dev/main.tf`

**Problems Found:**
- Module-ws not declared in Terraform configuration
- Lambda functions not created despite artifacts being built
- API routes not provisioned

**Fixes Applied:**
- Added `module "module_ws"` declaration to main.tf
- Removed invalid `module_name` parameter (doesn't exist in module-ws)
- Added correct Lambda zip paths pointing to `.build/` directory
- Added module_ws.api_routes to API Gateway concat

**Root Cause:** Project creation script doesn't automatically add functional modules to Terraform config.

---

### 5. ✅ API Routes Schema Invalid
**File:** `templates/_modules-functional/module-ws/infrastructure/outputs.tf`

**Problems Found:**
- All 12 routes missing required `public` attribute
- Terraform validation failed: "element 53: attribute 'public' is required"
- API Gateway couldn't provision routes

**Fixes Applied:**
- Added `public = false` to all 12 workspace routes
- Matches structure used by module-access, module-ai, module-mgmt
- Routes now compatible with modular-api-gateway module

**Root Cause:** Module-ws infrastructure was created before `public` attribute requirement was established.

---

### 6. ✅ Deployment Requirements Guide Created
**File:** `docs/guides/guide_MODULE-BUILD-AND-DEPLOYMENT-REQUIREMENTS.md`

**Content:**
- Pre-deployment checklist for all modules
- Backend build script requirements
- Database naming standards (use user_id, not person_id)
- org_common API usage (use rpc(), not call_rpc())
- Terraform integration requirements
- Common pitfalls and solutions
- Testing procedures before deployment

**Purpose:** Prevent future modules from encountering same issues.

---

## Deployment Success Metrics

### ✅ Final Verification

**Lambda Functions Deployed:**
- ✅ `dev-ai-sec-ws-workspace` - Main workspace handler (CRUD operations)
- ✅ `dev-ai-sec-ws-cleanup` - Automated cleanup job (EventBridge scheduled)

**API Gateway Routes Provisioned:** 12 total
1. ✅ `GET /api/ws/workspaces` - List workspaces
2. ✅ `POST /api/ws/workspaces` - Create workspace
3. ✅ `GET /api/ws/workspaces/{id}` - Get workspace
4. ✅ `PUT /api/ws/workspaces/{id}` - Update workspace
5. ✅ `DELETE /api/ws/workspaces/{id}` - Soft delete workspace
6. ✅ `POST /api/ws/workspaces/{id}/restore` - Restore workspace
7. ✅ `GET /api/ws/workspaces/{id}/members` - List members
8. ✅ `POST /api/ws/workspaces/{id}/members` - Add member
9. ✅ `PUT /api/ws/workspaces/{workspaceId}/members/{memberId}` - Update member
10. ✅ `DELETE /api/ws/workspaces/{workspaceId}/members/{memberId}` - Remove member
11. ✅ `POST /api/ws/workspaces/{id}/favorite` - Toggle favorite
12. ✅ `GET /api/ws/favorites` - List favorites

**Terraform Deployment Stats:**
- Resources Created: 66 total
  - 9 module-ws resources (2 Lambdas, IAM, EventBridge)
  - 57 API Gateway resources (routes, integrations, permissions)
- Deployment Time: ~2 minutes
- Errors: 0
- Warnings: 0 (after fixes)

---

## Module Registry Implementation Progress

| Phase | Status | Deliverables | Session |
|-------|--------|--------------|---------|
| Phase 1: Folder Restructuring | ✅ Complete & Merged | New directory structure, 254 files moved | Session 57 |
| Phase 2: Registry Implementation | ✅ Complete & Merged | `module-registry.yaml`, dependency resolution logic | Session 58 |
| Phase 3: Config Merging | ✅ Complete & Merged | `module.config.yaml` files, merging logic | Session 59 |
| Phase 4: Module-WS Integration Testing | ✅ **COMPLETE** | All issues fixed, successful deployment, documentation | Session 60 |

---

## Key Lessons Learned (Session 60)

### 1. Database Naming Standards
- **Always use `user_id`** to reference `auth.users` (not person_id, profile_id, etc.)
- **Document required columns** before referencing in RLS policies
- **Validate column existence** in actual database schema
- **Standardize across all modules** - inconsistencies cause integration failures

### 2. org_common Layer API
- **Correct function:** `common.rpc()` not `common.call_rpc()`
- **Always check source code** - don't rely on outdated documentation
- **Test with deployed layer** before deployment
- **Document API changes** in layer version updates

### 3. Build Script Requirements
- **Every module with Lambdas needs `backend/build.sh`**
- **Build artifacts go in `backend/.build/`**
- **Script must be executable** (`chmod +x`)
- **Follow module-access pattern** for consistency
- **Include error handling** and clear logging

### 4. Terraform Module Integration
- **Functional modules must be declared** in `envs/dev/main.tf`
- **Check module variables.tf** before adding parameters
- **Lambda zip paths must match build output**
- **Module outputs must match API Gateway schema**
- **All routes require `public` attribute** (true/false)

### 5. Terraform Module Refreshing
- **Module changes require refresh:** Run `terraform init` or deployment script
- **Terraform caches module outputs** - file changes alone aren't enough
- **Use deployment script** for proper AWS credential setup
- **Never run terraform directly** from envs/dev - use scripts

---

## Files Modified (Session 60)

### Templates Fixed (5 files)
1. `templates/_modules-functional/module-ws/db/schema/006-apply-rls.sql`
   - Fixed column references (person_id → user_id)
   - Removed invalid active column checks
   
2. `templates/_modules-functional/module-ws/backend/lambdas/workspace/lambda_function.py`
   - Changed all call_rpc() → rpc() (8 occurrences)
   
3. `templates/_modules-functional/module-ws/backend/lambdas/cleanup/lambda_function.py`
   - Changed all call_rpc() → rpc() (5 occurrences)
   
4. `templates/_modules-functional/module-ws/backend/build.sh` (NEW)
   - Created complete build script for Lambda packaging
   
5. `templates/_modules-functional/module-ws/infrastructure/outputs.tf`
   - Added `public = false` to all 12 API routes

### Documentation Created (1 file)
6. `docs/guides/guide_MODULE-BUILD-AND-DEPLOYMENT-REQUIREMENTS.md` (NEW)
   - Comprehensive deployment requirements guide
   - Pre-deployment checklist
   - Common pitfalls and solutions

### Memory Bank Updated (1 file)
7. `memory-bank/activeContext.md` (this file)
   - Documented Phase 4 completion
   - Updated progress tracker

**Total Changes:** ~500 lines modified/added across 7 files

---

## Technical Deep Dive

### Issue Investigation Process

**1. Initial Problem:** Database migration failed
```sql
ERROR: relation "public.org" does not exist
ERROR: column org_members.person_id does not exist
```

**2. Lambda Build Failed:** No build script
```bash
./build-cora-modules.sh: module-ws has no backend/build.sh
```

**3. Lambda Functions Missing:** Not in Terraform
```bash
aws lambda list-functions | grep ws
# (no results)
```

**4. Terraform Validation Failed:** Invalid parameters
```
Error: Unsupported argument: module_name is not expected here
```

**5. API Routes Invalid:** Missing required attribute
```
Error: element 53: attribute "public" is required
```

### Resolution Approach

**Template-First Workflow (CRITICAL):**
1. ✅ Fix templates FIRST (in `cora-dev-toolkit`)
2. ✅ THEN copy fixes to test project
3. ✅ Test deployment
4. ✅ Verify in AWS Console
5. ✅ Document lessons learned

**Why This Matters:**
- Test projects are temporary (deleted after testing)
- Changes to test projects only = LOST WORK
- Template fixes benefit ALL future projects
- Ensures repeatability of deployment process

---

## Validation Checklist - All Complete ✅

- [x] Project creates without errors
- [x] Module-ws files copied correctly
- [x] Database schemas consolidated
- [x] Build script works correctly
- [x] Lambda artifacts created (.zip files)
- [x] Terraform module declared
- [x] Terraform validation passes
- [x] Lambda functions deployed to AWS
- [x] API Gateway routes provisioned
- [x] All 12 routes accessible
- [x] Config merging produces valid YAML
- [x] Dependencies resolved (module-access included)
- [x] Env files generated correctly
- [x] Template-first workflow followed

---

## Next Steps

### Immediate (This PR)
1. ✅ Update activeContext.md with Session 60 results
2. 🎯 **NOW:** Group commits and create PR
3. ⏳ User will run fresh test to validate repeatability

### Future Enhancements (Follow-up PRs)
1. **Auto-Add Functional Modules to Terraform**
   - Update `scripts/create-cora-project.sh`
   - Dynamically add module declarations to `envs/dev/main.tf`
   - Eliminate manual Terraform editing
   
2. **Module Template Validation**
   - Create validation script for module templates
   - Check for common issues (build.sh, correct API usage, etc.)
   - Run before submitting module PRs

3. **Integration Testing Suite**
   - Automated project creation tests
   - Deploy to sandbox AWS account
   - Verify all modules deploy successfully
   - Tear down after validation

---

## Git & PR Plan

### Commits to Group (Session 60)
1. Database schema fixes (RLS policies)
2. Lambda function API fixes (call_rpc → rpc)
3. Build script creation
4. API routes schema fixes (public attribute)
5. Deployment requirements guide
6. ActiveContext update

### PR Details
- **Branch:** `fix/module-ws-deployment-issues`
- **Title:** "fix: Module-WS deployment issues and build requirements"
- **Description:** Comprehensive fixes for module-ws deployment + new deployment guide
- **Labels:** `bug`, `module-ws`, `documentation`, `phase-4`

---

## Success Metrics (Session 60)

**Time to Resolution:** ~3 hours (1:25 PM - 4:30 PM)

**Issues Fixed:** 5 major issues
1. ✅ Database schema (2 errors)
2. ✅ Lambda API calls (13 occurrences)
3. ✅ Build infrastructure (created from scratch)
4. ✅ Terraform configuration (missing module)
5. ✅ API routes schema (12 routes fixed)

**Deployment Results:**
- ✅ 100% success rate
- ✅ Zero errors after fixes
- ✅ All Lambda functions operational
- ✅ All API routes accessible
- ✅ Clean Terraform state

**Documentation:**
- ✅ 1 comprehensive guide created
- ✅ All lessons learned captured
- ✅ Reusable patterns documented
- ✅ Common pitfalls documented

---

## Previous Sessions Summary

### Session 59 (Phase 3: Config Merging)
- Created module.config.yaml files
- Implemented config merging logic
- PR #11 merged to main

### Session 58 (Phase 2: Registry Implementation)
- Created module-registry.yaml
- Implemented dependency resolution
- PR #11 merged to main

### Session 57 (Phase 1: Folder Restructuring)
- Reorganized module templates
- Created _modules-core and _modules-functional
- PR #10 merged to main

### Session 56 (Module-WS Creation)
- Initial module-ws implementation
- PR #10 created
- Identified need for functional module integration plan

---

**Status:** ✅ **PHASE 4 COMPLETE - PR #12 CREATED**  
**Updated:** January 1, 2026, 5:58 PM EST  
**Session Duration:** Session 60: ~3 hours (1:25 PM - 4:30 PM), Session 61: ~35 minutes (5:18 PM - 5:58 PM)  
**Overall Progress:** All 4 phases of Functional Module Integration complete. Module-WS successfully deployed. Lambda descriptions standardized. Module UI Integration planned for future work.

---

## Session 61 Extension: Lambda Descriptions & UI Integration Planning

### 🎯 Focus: Lambda Description Standardization & UI Integration Documentation

**Time:** January 1, 2026 (5:18 PM - 5:58 PM) - ~40 minutes

**Context:** Following successful module-ws deployment in Session 60, user tested dev server and discovered that workspace module doesn't appear in UI navigation or admin pages. Investigation revealed missing frontend integration system.

### Work Completed (Session 61)

#### 1. ✅ UI Integration Issue Analysis
**Problem Identified:**
- Workspaces don't appear in left navigation sidebar
- Workspaces Configuration cards missing from Platform Admin page
- Workspaces Configuration cards missing from Org Admin page

**Root Cause:**
- Backend module registry exists (database tables: `platform_module_registry`, `platform_module_usage`, `platform_module_usage_daily`)
- Frontend template never implemented module registration UI
- Sidebar has hardcoded navigation items
- Admin pages have hardcoded cards
- No dynamic module loading system

**Investigation Process:**
- Examined template Sidebar component - found hardcoded `navigationItems` array
- Reviewed career project (`~/code/sts/career/sts-career-stack`) for reference implementation
- Found career project has dynamic navigation using `NavigationConfig` prop pattern
- Confirmed this is NOT a quick fix - requires significant frontend architecture work

#### 2. ✅ Module UI Integration Plan Created
**File:** `docs/plans/plan_module-ui-integration.md`

**Plan Contents:**
- **Phase 1:** Type Definitions (NavItemConfig, NavSectionConfig, AdminCardConfig)
- **Phase 2:** Module Registry Loader (queries DB, reads config, dynamically imports)
- **Phase 3:** Update Sidebar Component (accept navigation prop, render dynamically)
- **Phase 4:** Update Layout Component (fetch navigation, pass to Sidebar)
- **Phase 5:** Update Admin Pages (dynamic card loading)
- **Phase 6:** Update Module Exports (add navigation exports)
- **Phase 7:** Testing

**Complexity Estimate:** 3-4 hours for complete implementation  
**Priority:** High (blocks functional module adoption)  
**Status:** Planned - Not Started (separate from current PR)

#### 3. ✅ Lambda Description Standardization
**Problem:** Lambda function descriptions lacked module prefixes, making it hard to identify which module owns each function in AWS Console.

**Solution:** Added module prefixes to ALL Lambda function descriptions:
- **CORE-ACCESS:** for module-access functions
- **CORE-AI:** for module-ai functions  
- **CORE-MGMT:** for module-mgmt functions
- **FUNC-WS:** for module-ws functions

**Functions Updated (11 total):**

**Module-Access (6 functions):**
1. `identities-management` - "CORE-ACCESS: Identity provisioning - Okta to Supabase (POST /identities/provision)"
2. `idp-config` - "CORE-ACCESS: IDP configuration management (GET/PUT /idp-config)"
3. `profiles` - "CORE-ACCESS: User profile management (GET/PUT /profiles/me)"
4. `orgs` - "CORE-ACCESS: Organization CRUD (GET/POST /orgs, GET/PUT/DELETE /orgs/:id)"
5. `members` - "CORE-ACCESS: Membership management (GET/POST/PUT/DELETE /orgs/:id/members)"
6. `org-email-domains` - "CORE-ACCESS: Email domain management for auto-provisioning (GET/POST/PUT/DELETE /orgs/:id/email-domains)"

**Module-AI (2 functions):**
1. `ai-config-handler` - "CORE-AI: AI Configuration management (platform and org-level settings)"
2. `provider` - "CORE-AI: AI Provider and Model management (CRUD, discovery, testing)"

**Module-MGMT (1 function):**
1. `lambda-mgmt` - "CORE-MGMT: Module management - registry and usage tracking"

**Module-WS (2 functions):**
1. `workspace` - "FUNC-WS: Workspace management handler for CRUD operations"
2. `cleanup` - "FUNC-WS: Automated cleanup job for workspace maintenance"

**Files Modified:**
- `templates/_modules-core/module-access/infrastructure/main.tf` - 6 descriptions updated
- `templates/_modules-core/module-ai/infrastructure/main.tf` - 2 descriptions updated
- `templates/_modules-core/module-mgmt/infrastructure/main.tf` - 1 description updated
- `templates/_modules-functional/module-ws/infrastructure/main.tf` - 2 descriptions updated (from earlier session)

**Benefit:** AWS Lambda Console now clearly shows module ownership for all functions

### Decision Points & Rationale

**UI Integration: Chose Option B (Separate Task)**
- Complexity: 3-4 hours of frontend architecture work
- Not a quick fix: Requires types, loaders, dynamic imports, YAML parsing
- Better as focused, dedicated implementation
- Current PR stays focused on deployment fixes + Lambda descriptions

**Why Separate:**
- Different scope (frontend vs backend/infrastructure)
- Different skillset required (React/TypeScript vs Terraform/Python)
- Can be implemented and tested independently
- User can review and plan implementation timing

### Files Created/Modified (Session 61)

**Created (1 file):**
1. `docs/plans/plan_module-ui-integration.md` (~350 lines) - Complete implementation plan

**Modified (5 files):**
1. `templates/_modules-core/module-access/infrastructure/main.tf` - Lambda descriptions
2. `templates/_modules-core/module-ai/infrastructure/main.tf` - Lambda descriptions
3. `templates/_modules-core/module-mgmt/infrastructure/main.tf` - Lambda descriptions
4. `templates/_modules-functional/module-ws/infrastructure/main.tf` - Lambda descriptions (from earlier)
5. `memory-bank/activeContext.md` (this file) - Session 61 documentation

**Total Changes:** ~400 lines (350 new plan + 50 description updates)

### Key Outcomes

1. ✅ **UI integration issue properly diagnosed** - Not a bug, but missing feature
2. ✅ **Comprehensive implementation plan created** - Ready for future session
3. ✅ **Lambda descriptions standardized** - Better AWS Console organization
4. ✅ **Scope properly separated** - Infrastructure fixes (PR #12) vs UI work (future PR)

### Next Steps

**Immediate (This Session):**
- [x] Update activeContext.md ✅
- [ ] Commit Lambda description changes
- [ ] Push to PR #12

**Future Session (Module UI Integration):**
- [ ] Implement NavigationConfig types
- [ ] Create module registry loader
- [ ] Update Sidebar for dynamic navigation
- [ ] Update admin pages for dynamic cards
- [ ] Test with multiple modules

---

## Session 61 Post-Deployment Validation

### 🎯 Validation Results (January 1, 2026, 6:25 PM)

**User ran fresh project creation test to validate Session 60 + 61 fixes.**

#### ✅ Successes Confirmed

1. **Lambda Description Standardization - WORKING** ✅
   - All Lambda functions now display with proper module prefixes (CORE-*, FUNC-*)
   - AWS Lambda Console clearly shows module ownership
   - Template changes successfully propagated to new projects
   - 11 functions across 4 modules all correctly labeled

2. **Module Registry System - WORKING** ✅
   - Module-ws successfully registered
   - Dependencies resolved correctly (module-ws → module-access)
   - Config merging operational
   - Deployment successful

3. **Infrastructure Deployment - WORKING** ✅
   - Lambda functions deployed successfully
   - API Gateway routes provisioned
   - Terraform configuration working
   - No deployment errors

#### ❌ Known Gap Identified

**Module-WS UI Integration - NOT FUNCTIONAL** ❌

**What's Missing:**
- Workspaces do not appear in left navigation sidebar
- Workspace Configuration cards missing from Platform Admin page
- Workspace Configuration cards missing from Org Admin page

**Root Cause:**
- Frontend template has hardcoded navigation and admin cards
- No dynamic module loading system implemented
- Backend module registry exists but frontend doesn't consume it

**Impact:**
- Module-ws is deployed and operational at the API level
- But users cannot access workspace features through the UI
- Module cannot be used until UI integration is complete

---

## Priority for Next Session

### 🚨 **TOP PRIORITY: Module UI Integration**

**Goal:** Make module-ws (and all future functional modules) visible and usable in the UI

**Plan Document:** `docs/plans/plan_module-ui-integration.md` (already created)

**Estimated Effort:** 3-4 hours

**Implementation Phases:**
1. **Phase 1:** Type Definitions (30 min)
   - Add NavigationConfig and AdminCardConfig types to shared-types

2. **Phase 2:** Module Registry Loader (60 min)
   - Create loader to query platform_module_registry
   - Read merged module configs
   - Dynamically import module components

3. **Phase 3:** Update Sidebar Component (30 min)
   - Accept navigation as prop
   - Render navigation dynamically from module registry

4. **Phase 4:** Update Layout Component (30 min)
   - Load navigation on mount
   - Pass to Sidebar

5. **Phase 5:** Update Admin Pages (45 min)
   - Platform Admin: dynamic card loading
   - Org Admin: dynamic card loading

6. **Phase 6:** Update Module Exports (15 min)
   - Add navigation export to module-ws

7. **Phase 7:** Testing (30 min)
   - Verify workspaces appear in nav
   - Verify admin cards appear
   - Test priority/ordering

**Why This Is Critical:**
- Module-ws is our first functional module
- It validates the entire functional module pattern
- All future modules (kb, chat, project, dashboard, etc.) depend on this working
- Without UI integration, functional modules cannot be used

**Success Criteria:**
- ✅ Workspaces link appears in left navigation
- ✅ Workspaces Configuration card appears on Platform Admin
- ✅ Workspaces Configuration card appears on Org Admin
- ✅ Navigation is dynamically loaded from module registry
- ✅ Admin cards are dynamically loaded from module registry

---

## Session 61 Summary

**Total Time:** ~50 minutes (5:18 PM - 6:09 PM)

**Work Completed:**
1. ✅ Lambda description standardization (11 functions)
2. ✅ Module UI Integration plan created
3. ✅ Terraform auto-registration function committed
4. ✅ PR description updated
5. ✅ Integration plan status updated
6. ✅ All changes pushed to PR #12

**Validation Completed:**
1. ✅ Fresh project creation test successful
2. ✅ Lambda descriptions verified working
3. ✅ Module registry deployment confirmed
4. ❌ UI integration gap identified

**Deliverables:**
- 3 commits pushed to PR #12
- 7 files modified (~618 lines)
- 1 comprehensive plan document created
- All documentation updated

**PR Status:**
- **PR #12:** https://github.com/bodhix-ai/cora-dev-toolkit/pull/12
- Ready for review and merge
- Contains Sessions 60 + 61 work
- 14 total files changed (~1118 lines)

---

## Appendix: Command Reference

### Successful Deployment Commands
```bash
# 1. Build module-ws Lambda functions
cd ~/code/sts/test-ws-01/ai-sec-stack/packages/module-ws/backend
./build.sh

# 2. Deploy infrastructure
cd ~/code/sts/test-ws-01/ai-sec-infra/scripts
./deploy-terraform.sh dev

# 3. Verify Lambda functions
AWS_PROFILE=ai-sec-nonprod aws lambda list-functions \
  --region us-east-1 \
  --query "Functions[?contains(FunctionName, 'ws')].FunctionName" \
  --output table
```

### Expected Results
```
-----------------------------
|       ListFunctions       |
+---------------------------+
|  dev-ai-sec-ws-cleanup    |
|  dev-ai-sec-ws-workspace  |
+---------------------------+
