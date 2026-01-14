# Active Context - CORA Development Toolkit

## Current Focus

**Session 123: Build Error Fixes + Standards Cleanup** - 🟡 **IN PROGRESS**

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
| 2 | PUT /ws/config returns 400 | Workspace Config API | Config saves successfully (200) | ✅ | ⏳ Pending |
| 3 | GET /ws/config data not displayed | Workspace Config UI | Saved config displays in UI after refresh | ✅ | ⏳ Pending |
| 4 | GET /admin/users shows "No name" | Users API | User names display correctly | ✅ | ⏳ Pending |
| 5 | Edit Workspace popup empty | Workspace Edit Modal | Existing values populate form | ✅ | ⏳ Pending |
| 6 | Org Members shows "Unknown User" | Org Members Tab | Member names/emails display | ✅ | ⏳ Pending |
| 7 | AI Config shows no models | AI Config Panel | Chat/embedding models appear in dropdowns | ✅ | ⏳ Pending |
| 8 | Lambda Warming toggle not working | Platform Mgmt | Toggle state displays correctly, saves | ⏳ | ⏳ Pending |
| 9 | Invites "Invited By" shows "Unknown" | Invites Tab | Shows inviter name/email | ✅ **FIXED** | ✅ **WORKING** |
| 10 | Create Invitation missing expiration | Invite Dialog | Date picker with 7-day default | ✅ **FIXED** | ✅ **WORKING** |

**Note:** Each user-tested issue may discover additional sub-issues requiring fixes (as seen with #1 → #9, #10).

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

**Updated:** January 14, 2026, 10:55 AM EST
