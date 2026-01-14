# Active Context - CORA Development Toolkit

## Current Focus

**Session 126: Module-KB Planning & DB Migration Integration** - ✅ **COMPLETE** (January 14, 2026)

---

## ✅ Session 126: Module-KB Planning & DB Migration Integration - **COMPLETE** (January 14, 2026)

**Goal:** Review module-kb and module-chat implementation plans, assess risks of implementing before legacy DB migration, and integrate AI config table migration into module-kb Phase 0.

**Status:** Complete - Strategic planning and plan updates finalized

### Context

User expressed urgency to implement module-kb and module-chat despite legacy tables not yet aligned with new naming standards. Analysis needed to assess risks vs benefits of proceeding.

### Completed Work

#### 1. Risk/Benefit Assessment (2 hours)
- **Reviewed Plans:**
  - `plan_module-kb-implementation.md` - 12 phases, ~33-48 hours
  - `plan_module-chat-implementation.md` - 13 phases, ~30-45 hours
  - `plan_db-naming-migration.md` - 6 phases, 13 legacy tables

- **Key Finding:** NEW module tables (kb_*, chat_*) use correct naming from inception. Risk is primarily in references to LEGACY tables via API calls.

- **Risk Analysis:**
  - ✅ LOW: New modules use APIs, not direct SQL to legacy tables (abstraction layer)
  - ✅ LOW: Core entity tables (orgs, workspaces, users) not being renamed
  - 🟡 MEDIUM: Technical debt from two "vintages" of naming (manageable)
  - ❌ HIGH (mitigated): Would need to update ai-config-handler Lambda twice if migrating sys_rag separately

- **Recommendation:** Proceed with module-kb first, BUT migrate BOTH AI config tables (sys_rag + org_prompt_engineering) in Phase 0 to avoid touching same Lambda twice.

#### 2. Module-KB Phase 0 Enhancement (1.5 hours)
- **File:** `docs/plans/plan_module-kb-implementation.md`
- **Changes:**
  - Renamed Phase 0 from "RAG Table Migration" to "AI Config Table Migration"
  - Added `org_prompt_engineering` → `ai_cfg_org_prompts` to migration scope
  - Duration: Increased from 2-3 hours to 3-4 hours (both tables)
  - **Rationale:** Both tables used by same Lambda (`ai-config-handler`) - follows "touch each Lambda only once" principle

- **Migration SQL Updated:**
  - Single migration file: `20260114_ai_config_tables_migration.sql`
  - Migrates both `sys_rag` and `org_prompt_engineering` together
  - Includes RLS policies for both tables
  - Creates backward-compatible views for both tables

- **Testing Expanded:**
  - Added org prompt API testing
  - Added RLS testing for org-level prompts (org admins can edit, org members can read)

#### 3. DB Migration Plan Integration (1 hour)
- **File:** `docs/plans/plan_db-naming-migration.md`
- **Changes:**
  - Phase 4 marked as "✅ HANDLED BY MODULE-KB PHASE 0"
  - Both AI config tables now migrated via module-kb
  - Updated "New Module Development Gate" section
  - Updated Lambda Grouping Summary
  - Added cross-references between plans

- **Strategic Impact:**
  - Phase 4 no longer standalone - integrated into module-kb workflow
  - Reduces total migration phases from 6 to 5 (Phase 4 = module-kb Phase 0)
  - Eliminates future migration debt for module-kb

#### 4. Cross-Plan Coordination
- **Links Added:**
  - module-kb plan → DB migration plan Phase 4
  - DB migration plan → module-kb Phase 0
  - Both plans reference each other for complete context

- **Decision Matrix Documented:**
  - If implementing module-kb first: Phase 4 automatic, then Phases 1-3 as needed
  - If migrating existing modules first: Complete Phases 1-3, skip Phase 4 (handled by module-kb)

### Key Decisions

1. **Proceed with module-kb implementation now** - Business urgency outweighs technical debt risk
2. **Migrate BOTH AI config tables in Phase 0** - Avoids touching ai-config-handler Lambda twice
3. **Keep legacy table migrations (Phases 1-3) as optional** - Can be done before, during, or after module-kb
4. **Phase 4 = module-kb Phase 0** - Fully integrated, not separate migration

### Strategic Benefits

✅ **Business Value:** Module-kb and module-chat functionality delivered faster  
✅ **Technical Efficiency:** Touch ai-config-handler Lambda only once  
✅ **Migration Debt:** Eliminated for new modules (kb_*, chat_* tables correct from start)  
✅ **Flexibility:** Legacy migrations (Phases 1-3) can proceed independently  
✅ **Standards:** New modules serve as reference implementations

### Files Modified

1. `docs/plans/plan_module-kb-implementation.md` - Phase 0 expanded to both AI config tables
2. `docs/plans/plan_db-naming-migration.md` - Phase 4 integrated into module-kb Phase 0

### Artifacts Created

- Comprehensive risk/benefit assessment (documented in plan mode conversation)
- Cross-referenced migration strategy across two plans
- Updated session notes (this section)

**Progress:** 100% complete  
**Total Time:** ~4.5 hours  
**Impact:** Module-kb can proceed with clean slate - all referenced tables will have correct naming before main implementation begins.

### Next Steps

1. Execute module-kb Phase 0 (AI config table migration) - 3-4 hours
2. Proceed with module-kb Phases 1-12 - ~30-42 hours remaining
3. Optionally: Complete DB migration Phases 1-3 (auth, system, workspace tables)
4. Proceed with module-chat implementation using module-kb

---

## ✅ Session 125: Database Naming Standards Enforcement - **COMPLETE** (January 14, 2026)

## ✅ Session 125: Database Naming Standards Enforcement - **COMPLETE** (January 14, 2026)

**Goal:** Enforce database naming standards in Module Development Guide to unblock module-kb development.

**Status:** All 7 Phases Complete + Standards Expanded to All Specialized Tables

### ✅ Completed Phases

#### Phase 1: Update Prerequisites Section (30 min) ✅
- Added "Database Standards" subsection to Phase 0 
- Checklist requires review of DATABASE-NAMING-STANDARDS.md
- Understanding of plural forms, prefix abbreviations, config table patterns

#### Phase 2: Update Entity Identification Section (45 min) ✅
- Updated entity specification: "plural for table, singular for API/types"
- Added comprehensive "Entity Naming Standards" subsection
- Added examples table: DB → API → Type transformations
- Included prefix abbreviation guidance (ws_, wf_, cert_, org_)

#### Phase 3: Add Compliance Checkpoint (30 min) ✅
- Critical warning box at Step 3.3 (Database Implementation)
- Pre-implementation checklist covers:
  - Core table prefixes: sys_, ai_, org_, user_ (security foundation)
  - Functional module prefixes: ws_, kb_, chat_, wf_ (new modules add here)
  - Column, FK, index, constraint naming patterns
- **Corrected** based on user feedback about actual prefix usage

#### Phase 4: Update Schema Template (1 hour) ✅
- Template emphasizes PLURAL table names (`{entities}` not `{entity}`)
- Comments throughout template enforce plural naming
- References corrected: `public.orgs` not `public.org`

#### Phase 5: Create Validation Script (2 hours) ✅
- Created: `scripts/validate-db-naming.py`
- Features:
  - Check tables use plural form
  - Verify prefix abbreviations documented
  - Validate snake_case columns
  - Check FK pattern, index pattern
  - Report violations with line numbers

#### Phase 6: Update AI Prompting Templates (45 min) ✅
- Added standards compliance to Phase 1 Discovery prompt
- Added detailed validation to Phase 3 Implementation prompt
- Updated to reference Rule 8 (config pattern)

#### Phase 7: Update Documentation Links (15 min) ✅
- Added DATABASE-NAMING-STANDARDS.md to Related Documentation
- Marked as **REQUIRED**

### 🎯 Additional Accomplishments

#### ADR-011: Specialized Table Naming Conventions ✅
- **File:** `docs/arch decisions/ADR-011-TABLE-NAMING-STANDARD.md`
- **Scope Expanded:** Covers Config, Log, History, Usage, State, and Queue tables
- **Pattern Approved:** `{module}_{type}_{scope_or_purpose}`
- **Examples:** `ws_cfg_sys`, `user_log_auth`, `ai_hist_model_validation`
- **Benefits:** Immediate identification, no redundancy, grep-friendly

#### Rule 8: Specialized Table Patterns ✅
- **File:** `docs/standards/cora/standard_DATABASE-NAMING.md`
- Added comprehensive Rule 8 with all infix patterns (`_cfg_`, `_log_`, `_hist_`, etc.)
- Deprecated Rule 7 (namespace prefixes) with migration path
- Migration required: `sys_lambda_config` → `sys_cfg_lambda`, `ws_configs` → `ws_cfg_sys`

#### Validator & Migration Plan ✅
- **Validator:** `scripts/validate-db-naming.py` updated for Python 3.9 + all specialized patterns
- **Plan:** `docs/plans/plan_db-naming-migration.md` created (Phased approach, 13 tables)

#### Standards Updates ✅
- Changed `platform_` → `sys_` throughout documentation
- Updated all config table examples to use `_cfg_` infix
- Documented scope levels: sys, org, ws, user

**Progress:** 100% complete  
**Total Time:** ~6 hours (includes ADR-011 creation)  
**Impact:** Module Development Guide now enforces naming standards at all checkpoints. Config table naming standardized with grep-friendly pattern.

### 📋 Future Work (Migration Phase)
**Plan:** `docs/plans/plan_db-naming-migration.md`

1. **Phase 1 (Critical):** `sys_idp_config` + `sys_log_idp_audit` (Auth system)
2. **Phase 2 (High):** `sys_lambda_config` (System config)
3. **Phase 3 (High):** `ws_configs` + `ws_org_settings` + `ws_activity_log` (Workspace module)
4. **Phase 4 (Medium):** `org_prompt_engineering` + `sys_rag` (AI module)
5. **Phase 5-6 (Low):** Defer log/usage tables

---

## ✅ Session 123: Build Error Fixes + Standards Cleanup - **COMPLETE**

---

## ✅ Completed: Plan Status Documentation (Session 124 - January 14, 2026)

**Investigation Results:**

1. **plan_missing-admin-pages-implementation.md** - ✅ **Phase 3 COMPLETE** (undocumented)
   - All components implemented: PlatformMgmtAdmin, ScheduleTab, PerformanceTab, StorageTab
   - Plan updated to reflect completion

2. **plan_ai-platform-seeding-strategy.md** - ✅ **Status ACCURATE** 
   - Correctly marked as "PLANNING" / "AWAITING APPROVAL"
   - No implementation work found (as expected)

3. **plan_module-ui-integration.md** - ✅ **FULLY IMPLEMENTED** (undocumented)
   - All 6 phases complete: Types, moduleRegistry.ts, Sidebar, Layout, Admin Pages, Module Exports
   - Standards ARE available for next module development
   - Plan updated to reflect completion

**Conclusion:** Module UI integration standards are ready. Next modules (module-kb, module-chat) can use the established patterns.

---

## Current Test Environment

**Project:** ai-sec (test-ws-23)

| Repo | Path |
|------|------|
| Stack | `~/code/bodhix/testing/test-ws-23/ai-sec-stack` |
| Infra | `~/code/bodhix/testing/test-ws-23/ai-sec-infra` |

**Note:** Update these paths when creating new test environments.

---

## ⏳ Outstanding User Testing Validations

**Status:** User must recreate project from templates, deploy, and test each item.

| # | Issue | API/Component | Expected Result | Code Verified | User Tested |
|---|-------|---------------|-----------------|---------------|-------------|
| 1 | GET /orgs/{id}/invites returns 403 | Invites API | Invites load for org admins | ✅ | ✅ Working - found #9, #10 |
| 2 | PUT /ws/config returns 400 | Workspace Config API | Config saves successfully (200) | ✅ **FIXED** | ✅ **WORKING** |
| 3 | GET /ws/config data not displayed | Workspace Config UI | Saved config displays in UI after refresh | ✅ **FIXED** | ✅ **WORKING** (requires refresh) |
| 4 | GET /admin/users shows "No name" | Users API | User names display correctly | ✅ **FIXED** | ✅ **WORKING** |
| 5 | Edit Workspace popup empty | Workspace Edit Modal | Existing values populate form | ✅ **FIXED** | ✅ **WORKING** |
| 6 | Org Members shows "Unknown User" | Org Members Tab | Member names/emails display | ✅ **FIXED** | ✅ **WORKING** |
| 7 | AI Config shows no models | AI Config Panel | Chat/embedding models appear in dropdowns | ✅ **FIXED** | ✅ **WORKING** |
| 8 | Lambda Warming toggle not working | Platform Mgmt | Toggle state displays correctly, saves | ✅ **FIXED** (Session 123) | ✅ **WORKING** |
| 9 | Invites "Invited By" shows "Unknown" | Invites Tab | Shows inviter name/email | ✅ **FIXED** | ✅ **WORKING** |
| 10 | Create Invitation missing expiration | Invite Dialog | Date picker with 7-day default | ✅ **FIXED** | ✅ **WORKING** |
| 11 | Embedding dimension warning inverted | AI Config Panel | Warning only for non-1024 dimensions | ✅ **FIXED** (Session 123) | ✅ **WORKING** |
| 12 | Org members missing action buttons | Org Members Tab | Edit/delete buttons for org_owner | 🔍 **INVESTIGATING** | ⏳ Pending |
| 13 | AI config save returns 400 | AI Config API | Saves with camelCase field names | ✅ **FIXED** (Session 123) | ✅ **WORKING** (requires refresh) |
| 14 | Lambda warming config errors | Platform Mgmt | Custom schedule + camelCase field names | ✅ **FIXED** (Session 123) | ✅ **WORKING** (custom schedule pending) |

**Note:** Each user-tested issue may discover additional sub-issues requiring fixes (as seen with #1 → #9, #10, and #8 → #11, #12, #13, #14).

---

## ✅ Session 123 Fixes Applied to Templates

### New Fixes (Session 123 - January 14, 2026)

#### 9. Invites "Invited By" shows "Unknown"
- **File:** `templates/_modules-core/module-access/backend/lambdas/invites/lambda_function.py`
- **Issue:** API returned `invitedBy` as UUID, frontend expected `{ name, email }` object
- **Fix:** Modified `handle_list_invites()` to enrich each invite with inviter profile data

#### 10. Create Invitation missing expiration date picker
- **Files:**
  - `templates/_modules-core/module-access/backend/lambdas/invites/lambda_function.py`
  - `templates/_modules-core/module-access/frontend/types/index.ts`
  - `templates/_modules-core/module-access/frontend/components/org/InviteMemberDialog.tsx`
- **Fix:** 
  - Backend: Accept `expiresAt` field (camelCase per API-PATTERNS standard)
  - Frontend type: Added `expiresAt?: string` to `InviteMemberInput`
  - Frontend dialog: Added date picker with 7 calendar day default

#### 11. Workspace Config - Missing fields
- **Files:**
  - `scripts/migrations/20260114_ws_configs_add_tag_retention_fields.sql` (new)
  - `templates/_modules-functional/module-ws/backend/lambdas/workspace/lambda_function.py`
  - `templates/_modules-functional/module-ws/frontend/lib/api.ts`
- **Issue:** 
  - API response incorrectly wrapped: `{ config: { config: {...} } }`
  - Missing 3 fields in ws_configs: default_retention_days, max_tags_per_workspace, max_tag_length
- **Fix:**
  - Lambda: Added field_mapping for new fields, updated validation
  - API client: Fixed updateConfig to unwrap `response.data.config` correctly
  - Database: Created migration to add 3 new columns with defaults

#### 12. Workspace Icon - Display not updating
- **Files:**
  - `templates/_project-stack-template/apps/web/components/Sidebar.tsx`
  - `templates/_modules-functional/module-ws/frontend/lib/api.ts`
- **Issue:** Workspace icon saved to DB but Sidebar doesn't update until page refresh
- **Root Cause:** Independent React hook state - Sidebar and Settings page use separate `useWorkspaceConfig` instances
- **Fix:** Updated Sidebar to use `wsConfig.navIcon` (data saves correctly)
- **Known Limitation:** Icon updates require browser refresh (each hook has independent state)
- **Future Enhancement:** Implement shared state management (Context/React Query) for real-time updates

### Newly Discovered Issues (Session 123 - January 14, 2026)

#### 14. Embedding Dimension Warning Logic Inverted ✅ FIXED
- **Issue:** Warning shows when selecting 1024 dimensions (the default), should only show for non-1024
- **Root Cause:** `RECOMMENDED_DIMENSIONS` constant set to 1536 instead of 1024
- **Fix:** Changed `RECOMMENDED_DIMENSIONS` from 1536 → 1024 in `ModelSelectionModal.tsx`
- **Status:** ✅ Working - tested by user

#### 15. Org Members Missing Action Buttons
- **Issue:** No edit/delete buttons in org members list, even for org_owner
- **Expected Behavior:** org_owner should see action buttons to edit member roles and remove members from org
- **Note:** Delete should remove from org, not delete from system
- **Status:** Pending fix

#### 16. AI Config Save Returns 400 Error ✅ FIXED
- **Issue:** PUT /admin/ai/config returns 400 "Both default_embedding_model_id and default_chat_model_id are required"
- **Root Cause:** API expects snake_case but receives camelCase from frontend
- **Fix:** Added field_mapping to `ai-config-handler/lambda_function.py`
- **Status:** ✅ Working - saves successfully
- **Known Limitation:** Frontend doesn't refresh state after save (requires browser refresh to see saved values)
- **Future Enhancement:** Update frontend to refresh local state after successful PUT request

#### 17. Lambda Warming Config Issues ✅ PARTIALLY FIXED
- **Issues:**
  1. ✅ Toggle save works - Fixed with field_mapping in `lambda-mgmt/lambda_function.py`
  2. ⏳ Custom schedule option not selectable (under investigation)
- **Root Cause (Toggle):** API expects snake_case but receives camelCase from frontend
- **Fix:** Added field_mapping to `lambda-mgmt/lambda_function.py`
- **Status:** Toggle working, custom schedule needs frontend investigation
- **Next Steps:** Check browser console for errors when selecting custom schedule

#### 13. Template Placeholder Issue - sync-fix-to-project.sh
- **Files:**
  - `templates/_modules-functional/module-ws/frontend/lib/api.ts`
  - `templates/_project-stack-template/apps/web/components/Sidebar.tsx`
- **Issue:** Template files contain `{{PROJECT_NAME}}` placeholders that aren't replaced when syncing
- **Impact:** TypeScript build errors: `Cannot find module '@{{PROJECT_NAME}}/...'`
- **Workaround:** Manually replace placeholders with `sed` after syncing
- **Future Enhancement:** Add template variable substitution to sync-fix-to-project.sh script

### Build Error Fixes (TypeScript/Frontend)

#### 1. OrgMembersList.tsx - Field name alignment
- **File:** `templates/_modules-core/module-access/frontend/components/org/OrgMembersList.tsx`
- **Fixes:**
  - `member.roleName` → `member.orgRole` (required field)
  - `member.user` → `member.profile` (current API structure)
  - `member.joinedAt` → `member.joinedAt || member.createdAt` (handles undefined)

#### 2. Workspace admin route - Session type
- **File:** `templates/_modules-functional/module-ws/routes/admin/org/ws/[id]/page.tsx`
- **Fix:** Changed from `useSession` with `session?.user?.orgId` to `useUser()` hook with `profile?.currentOrgId`

#### 3. Workspace detail route - userId access
- **File:** `templates/_modules-functional/module-ws/routes/ws/[id]/page.tsx`
- **Fix:** Added `useUser()` hook to get userId instead of `useOrganizationContext()` (which doesn't provide userId)

#### 4. Sidebar.tsx - Multiple fixes
- **File:** `templates/_project-stack-template/apps/web/components/Sidebar.tsx`
- **Fixes:**
  - `wsConfig?.nav_label_plural` → `wsConfig?.navLabelPlural` (camelCase)
  - Wrapped OrgIcon in Box to apply sx props (OrgIcon doesn't accept sx directly)

#### 5. ModelCard.tsx - snake_case to camelCase
- **File:** `templates/_modules-core/module-ai/frontend/components/ModelCard.tsx`
- **Fixes:**
  - `model.model_name` → `model.modelName`
  - `model.deployment_status` → `model.deploymentStatus`
  - `model.supports_chat` → `model.supportsChat`
  - `model.supports_embeddings` → `model.supportsEmbeddings`
  - `model.capabilities?.embedding_dimensions` → `model.capabilities?.embeddingDimensions`

#### 6. ViewModelsModal.tsx - Type key access
- **File:** `templates/_modules-core/module-ai/frontend/components/models/ViewModelsModal.tsx`
- **Fixes:**
  - `categoryCounts.requiresInferenceProfile` → `categoryCounts.requires_inference_profile`
  - `categoryCounts.invalidRequestFormat` → `categoryCounts.invalid_request_format`
  - (Note: These use snake_case because ValidationCategory type uses snake_case enum values)

#### 7. ModelSelectionModal.tsx - snake_case to camelCase
- **File:** `templates/_modules-core/module-ai/frontend/components/ModelSelectionModal.tsx`
- **Fix:** `model.model_name` → `model.modelName`

#### 8. ProviderCard.tsx - snake_case to camelCase
- **File:** `templates/_modules-core/module-ai/frontend/components/providers/ProviderCard.tsx`
- **Fix:** `modelCounts.by_category` → `modelCounts.byCategory`

### Standards Cleanup

#### 9. Deleted superseded standard
- **Deleted:** `docs/standards/standard_api-response.md`
- **Reason:** Superseded by `docs/standards/standard_API-PATTERNS.md` which is more comprehensive (covers requests + responses)

### Script Improvements

#### 10. create-cora-project.sh - Module dependency registration
- **File:** `scripts/create-cora-project.sh`
- **Enhancement:** Now automatically adds functional modules as dependencies to `apps/web/package.json`
- **Works with:** module-ws, module-chat, module-kb (any functional module)

---

## 🔄 Known Remaining Issue

### useWorkspace.ts - Session type augmentation
- **File:** `templates/_modules-functional/module-ws/frontend/hooks/useWorkspace.ts`
- **Issue:** `session?.accessToken` not resolving despite type augmentation existing
- **Cause:** Module's TypeScript compilation doesn't pick up apps/web type augmentation
- **Status:** Needs investigation - may require tsconfig adjustment or type re-export

---

## Build Error Warnings (Non-Issues)

### Lambda Authorizer pip warnings
The following pip dependency warnings during `./build.sh` are **NOT issues**:
- PyJWT 2.8.0 vs 2.9.0/2.10.1 - OK, Lambda runs in isolated environment
- cryptography 46.0.3 vs <46.0.0 - OK, Lambda has its own dependencies
- urllib3 version mismatch - OK, for Python <3.10 only

Build succeeds with `✅ Built: build/authorizer.zip` - warnings are about local vs Lambda package conflicts.

---

## 🟡 Session 122 Fixes (Previously Applied)

### Backend Fixes
1. **GET /orgs/{id}/invites - 403** - Fixed `role` → `org_role` in authorization checks
2. **PUT /ws/config - 400** - Added field_mapping for camelCase/snake_case
3. **GET /ws/config - UI display** - Added `_transform_config()` for DB→API response
4. **GET /admin/users - "No name"** - Added `_transform_user()` function

### Frontend Fixes
5. **Edit Workspace popup** - Added useEffect to sync form values
6. **Org Members display** - Updated interface to match API (`profile` vs `user`)
7. **OrgMember type** - Updated interface structure
8. **AI Config models** - Fixed `supports_chat` → `supportsChat` filters

### Tooling
9. **API Response Validator** - Added `check_untransformed_db_data()` detection

---

## 🛠️ Shared Utilities Available

### org_common Transform Utilities
**File:** `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/transform.py`

```python
import org_common as common

# Transform DB record to API response
api_response = common.transform_record(db_record)

# Transform list of records
api_list = common.transform_records(db_records)
```

---

---

## 🚀 Fast Iteration Testing Tooling (Session 123)

**Created:** Scripts and documentation for AI-assisted testing workflow

### Scripts
1. **`scripts/sync-fix-to-project.sh`** - Syncs template fixes to existing projects
   - Intelligently detects stack vs infra repos
   - Maps core module backend Lambdas to correct location (stack repo)
   - Supports dry-run mode for preview
   
2. **`templates/_project-infra-template/scripts/deploy-lambda.sh`** - Deploys single Lambda
   - Skips full deploy-all.sh pipeline
   - Reduces deployment time from 5-7 min to 2-3 min

### Documentation
- **`docs/guides/guide_FAST-ITERATION-TESTING.md`** - Complete usage guide
- **`.clinerules`** - Updated with AI workflow instructions

### Workflow Benefits
| Change Type | Old Time | New Time | Savings |
|-------------|----------|----------|---------|
| Frontend fix | ~5-7 min | ~30 sec | 90%+ |
| Backend Lambda | ~5-7 min | ~2-3 min | 60%+ |

**Goal:** User focuses on testing, AI handles fix → sync → deploy.

---

**Updated:** January 14, 2026, 6:30 PM EST
