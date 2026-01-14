# Active Context - CORA Development Toolkit

## Current Focus

**Session 122: Multiple Fixes Applied** - 🟡 **AWAITING VALIDATION**

---

## ⏳ Outstanding User Testing Validations

**Status:** User must recreate project from templates to validate these fixes.

| # | Issue | API/Component | Expected Result | Status |
|---|-------|---------------|-----------------|--------|
| 1 | GET /orgs/{id}/invites returns 403 | Invites API | Invites load for org admins | ⏳ Pending |
| 2 | PUT /ws/config returns 400 | Workspace Config API | Config saves successfully (200) | ⏳ Pending |
| 3 | GET /ws/config data not displayed | Workspace Config UI | Saved config displays in UI after refresh | ⏳ Pending |
| 4 | GET /admin/users shows "No name" | Users API | User names display correctly | ⏳ Pending |
| 5 | Edit Workspace popup empty | Workspace Edit Modal | Existing values populate form | ⏳ Pending |
| 6 | Org Members shows "Unknown User" | Org Members Tab | Member names/emails display | ⏳ Pending |
| 7 | AI Config shows no models | AI Config Panel | Chat/embedding models appear in dropdowns | ⏳ Pending |
| 8 | Lambda Warming toggle not working | Platform Mgmt | Toggle state displays correctly, saves | ⏳ Pending |

**To validate:** Recreate project from templates, deploy, and test each item.

---

## 🟡 Fixes Applied - Require Redeployment

All fixes have been applied to **TEMPLATES** (following template-first workflow). To deploy:

```bash
# 1. Rebuild affected Lambdas
cd {project}-infra/lambdas/workspace && ./build.sh
cd {project}-infra/lambdas/identities-management && ./build.sh

# 2. Deploy
./scripts/deploy-terraform.sh dev

# 3. Rebuild frontend
cd {project}-stack && npm run build
```

---

## ✅ Fixes Applied to Templates (Session 122)

### Backend Fixes

#### 1. Fixed GET /orgs/{id}/invites - 403 Forbidden
- **File:** `templates/_modules-core/module-access/backend/lambdas/invites/lambda_function.py`
- **Fix:** Changed `membership.get('role')` → `membership.get('org_role')` in all 3 authorization checks

#### 2. Fixed PUT /ws/config - 400 Bad Request  
- **File:** `templates/_modules-functional/module-ws/backend/lambdas/workspace/lambda_function.py`
- **Fix:** Added field_mapping to accept both camelCase and snake_case input fields

#### 3. Fixed GET /ws/config - UI not displaying saved data
- **File:** `templates/_modules-functional/module-ws/backend/lambdas/workspace/lambda_function.py`
- **Fix:** Added `_transform_config()` to transform snake_case DB response to camelCase API response

#### 4. Fixed GET /admin/users - User listing showing "No name", "None", etc.
- **File:** `templates/_modules-core/module-access/backend/lambdas/identities-management/lambda_function.py`
- **Fix:** Added `_transform_user()` function to convert snake_case DB fields to camelCase API response

### Frontend Fixes

#### 5. Fixed Edit Workspace popup not populating data
- **File:** `templates/_modules-functional/module-ws/frontend/hooks/useWorkspaceForm.ts`
- **Fix:** Added `useEffect` to sync form values when `defaultValues` changes

#### 6. Fixed Organization Members display - "Unknown User", "No email"
- **File:** `templates/_modules-core/module-access/frontend/components/admin/OrgMembersTab.tsx`
- **Fix:** Updated interface to match API response (`profile` vs `user`, `fullName` vs `name`, `orgRole` vs `role`)

#### 7. Fixed OrgMember type definition
- **File:** `templates/_modules-core/module-access/frontend/types/index.ts`
- **Fix:** Updated `OrgMember` interface to match API response structure

#### 8. Fixed AI Config - Model selection showing no models
- **File:** `templates/_modules-core/module-ai/frontend/components/PlatformAIConfigPanel.tsx`
- **Root Cause:** Filter used `d.supports_chat` (snake_case) but DeploymentInfo has `supportsChat` (camelCase)
- **Fix:** Changed filter to use `d.supportsChat` and `d.supportsEmbeddings`
- **Also Fixed:** `model_name` → `modelName` in display text

### Tooling Improvements

#### 9. Enhanced API Response Validator
- **File:** `validation/api-response-validator/validate_api_responses.py`
- **Enhancement:** Added `check_untransformed_db_data()` function
- **Detection:** Tracks variables assigned from DB operations and flags if passed to `success_response()` without transformation

---

---

## Issues NOT Bugs

### GET /admin/sys - 404 Not Found
- **Finding:** Route `/admin/sys` does NOT exist in stack template
- **Resolution:** Not a bug - use `/admin/platform` or `/admin/mgmt` instead

---

## 🛠️ New Shared Utilities Added

### org_common Transform Utilities
Added generic snake_case ↔ camelCase transformation utilities to the `org_common` Lambda layer:

**File:** `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/transform.py`

**Available Functions:**
- `snake_to_camel(key)` - Convert single key
- `camel_to_snake(key)` - Convert single key (reverse)
- `transform_record(data)` - Recursively transform dict keys
- `transform_records(list)` - Transform list of dicts
- `transform_input(data)` - camelCase→snake_case for DB input

**Usage in Lambdas:**
```python
import org_common as common

# Transform DB record to API response
api_response = common.transform_record(db_record)

# Transform list of records
api_list = common.transform_records(db_records)
```

---

**Updated:** January 13, 2026, 10:41 PM EST
