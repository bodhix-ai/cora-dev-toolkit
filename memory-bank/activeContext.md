# Active Context - CORA Development Toolkit

## Current Focus

**Phase 25: API Gateway Authorizer Resource Policy Fix** - ✅ **COMPLETE**

## Session: December 28, 2025 (8:00 PM - 8:36 PM) - Session 36

### 🎯 Focus: Fix API Gateway 403 Forbidden on Platform Management Routes

**Context:** Platform owner was getting `403 Forbidden` when accessing `/platform/lambda-config/lambda_warming` and other platform management API routes, despite having valid authentication.

**Status:** ✅ **FIXED & VALIDATED**

---

## Solution Summary (Session 36)

### Root Cause

The API Gateway Lambda authorizer was generating **route-specific IAM policies** instead of **API-wide policies**:

```python
# BROKEN CODE:
resource = method_arn.rsplit("/", 1)[0] + "/*"
# Result: arn:aws:execute-api:us-east-1:account:api-id/$default/GET/profiles/*
```

**The Problem:**
1. User accesses `/profiles/me` → Authorizer creates policy allowing **only** `/profiles/*` routes
2. API Gateway **caches this policy** for ~5 minutes
3. User tries `/platform/lambda-config/lambda_warming` → Cached policy **denies it** → `403 Forbidden`
4. Authorizer **not re-invoked** because cached response is used
5. No Lambda logs because request never reaches Lambda

### Investigation Process

Used API Gateway request ID `WU3mnjwJIAMEJeQ=` to trace the exact request:

1. ✅ Found API Gateway log showing route matched: `GET /platform/lambda-config/{configKey}`
2. ✅ Confirmed `resourcePath: "-"` (indicates authorization failure before integration)
3. ✅ Checked authorizer logs at exact timestamp - **NO logs** (authorizer not invoked!)
4. ✅ Found earlier authorizer invocation 80 seconds before the 403
5. ✅ Confirmed **cached authorizer response** was being used
6. ✅ Read authorizer code and found the route-specific policy bug

### Files Fixed

**Templates (Template-First Workflow):**
1. `templates/_project-infra-template/lambdas/api-gateway-authorizer/lambda_function.py`

**Test13 Project:**
1. `sts/test13/ai-sec-infra/lambdas/api-gateway-authorizer/lambda_function.py`

### Changes Made

**Before (Broken):**
```python
# Allow all methods on this API
resource = method_arn.rsplit("/", 1)[0] + "/*"
# Creates: arn:.../GET/profiles/* (TOO SPECIFIC!)
```

**After (Fixed):**
```python
# Allow all methods and paths on this API
# Extract API ARN (format: arn:aws:execute-api:region:account:api-id/stage/method/path)
api_parts = method_arn.split("/")
api_arn = "/".join(api_parts[:2])  # Get arn:...:api-id/stage
resource = f"{api_arn}/*/*"  # Allow all methods and paths
# Creates: arn:.../$default/*/* (ALLOWS ALL ROUTES!)
```

### Why This Works

- Authorizer now grants access to **ALL routes** on the API, not just specific patterns
- Cached policies allow access to any route, not just the first one accessed
- Eliminates route-specific authorization failures
- One successful authorization works for entire API

### Additional Fix: Module-MGMT Outputs.tf

Also fixed a related issue where `module-mgmt/infrastructure/outputs.tf` was using Lambda **alias ARN** instead of **function ARN**:

**Changed:**
```terraform
integration = aws_lambda_alias.lambda_mgmt.invoke_arn
# Result: arn:...function:name:live (breaks permission regex)
```

**To:**
```terraform
integration = aws_lambda_function.lambda_mgmt.invoke_arn
# Result: arn:...function:name (works correctly)
```

This fixed Lambda permission creation in the modular API Gateway.

### Testing Results
✅ User confirmed fix works - Platform owner can now access `/platform/lambda-config/lambda_warming` successfully after redeployment!

---

## Session: December 28, 2025 (3:30 PM - 4:20 PM) - Session 35

### 🎯 Focus: Fix Access Control for Platform Admin Pages

**Context:** Platform owner with `global_role: "platform_owner"` was unable to access `/admin/mgmt` and `/admin/access/orgs/[id]` pages due to incorrect role checking.

**Status:** ✅ **FIXED & VALIDATED**

---

## Solution Summary (Session 35)

### Root Cause
Pages were checking `session.user.global_role` from NextAuth session, but NextAuth session **does not contain user profile data**. NextAuth only stores authentication tokens (access_token, id_token).

The user profile with `global_role` is fetched from the backend `/me` API endpoint and made available via `useUser()` hook from `module-access`.

### Files Fixed

**Templates (Template-First Workflow):**
1. `templates/_project-stack-template/apps/web/app/admin/mgmt/page.tsx`
2. `templates/_project-stack-template/apps/web/app/admin/access/orgs/[id]/page.tsx`

**Test13 Project:**
1. `sts/test13/ai-sec-stack/apps/web/app/admin/mgmt/page.tsx`
2. `sts/test13/ai-sec-stack/apps/web/app/admin/access/orgs/[id]/page.tsx`

### Changes Made

**Before (Broken):**
```typescript
import { useSession } from "next-auth/react";
const { data: session, status } = useSession();
const isPlatformAdmin = ["platform_owner", "platform_admin"].includes(
  session.user.global_role || ""  // ❌ global_role doesn't exist in NextAuth session
);
```

**After (Fixed):**
```typescript
import { useUser } from "@ai-sec/module-access";
const { profile, loading, isAuthenticated } = useUser();
const isPlatformAdmin = ["platform_owner", "platform_admin"].includes(
  profile.globalRole || ""  // ✅ Gets globalRole from backend profile
);
```

**Note:** Field name is `globalRole` (camelCase) in TypeScript Profile type, not `global_role` (snake_case from API).

### Validation Enhancement

Added anti-pattern detection to `validation/import_validator/frontend_validator.py`:

**New SESSION_ANTIPATTERNS constant:**
- Detects `session.*.global_role` or `session.*.globalRole`
- Detects `session.*.currentOrgId` or `session.*.organizations`
- Provides actionable error messages with correct usage pattern

This ensures future code will be validated and these anti-patterns will be caught before deployment.

### Testing Results
✅ User confirmed fix works - Platform owner can now access both admin pages.

---

## What Was Accomplished (Session 33) - ✅ COMPLETE

### Phase 23: Build Script Virtual Environment Fix

**Problem:** `ModuleNotFoundError: No module named 'click'` when running `deploy-all.sh`

**Solution:**
- Updated `build-cora-modules.sh` to activate Python venv before running validators
- Added venv existence check with helpful error message
- Applied fix to both template and test13 project

**Key Files Modified:**
- `templates/_project-infra-template/scripts/build-cora-modules.sh`
- `docs/guides/guide_cora-project-creation.md`
- `sts/test13/ai-sec-infra/scripts/build-cora-modules.sh`

---

## 🎉 Milestone: Repeatability Demonstrated

### test13 Project Success

**Verification Complete:**
- ✅ Local server build worked successfully for test13 project
- ✅ Deployed using a **different developer workstation**
- ✅ Demonstrates **repeatability** of CORA project creation workflow

**Scripts/Docs Validated:**
- `bodhix/cora-dev-toolkit/scripts/create-cora-project.sh` - ✅ Works across workstations
- `bodhix/cora-dev-toolkit/docs/guides/guide_cora-project-creation.md` - ✅ Instructions are accurate

**Significance:** This proves the CORA toolkit can reliably create new projects that build and run successfully on any properly configured developer machine.

---

## Current Issue: Platform Management Access Denied

### Problem Description

A user with `global_role: "platform_owner"` cannot access the platform management page:

**Error Message:**
```
Access denied. This page is only accessible to platform administrators.
```

**User Profile Data:**
```json
{
    "id": 1,
    "user_id": "2efd43fc-0f8f-41e0-82a1-f88d9e0645bb",
    "full_name": "Aaron Kilinski",
    "email": "Aaron.Kilinski@simpletechnology.io",
    "global_role": "platform_owner",
    "current_org_id": "e18368a1-2e89-47c3-b864-fd4fac61cd0d",
    "organizations": [
        {
            "orgId": "e18368a1-2e89-47c3-b864-fd4fac61cd0d",
            "orgName": "Platform Admin",
            "role": "org_owner",
            "isOwner": true
        }
    ]
}
```

**Request Details:**
- URL: `http://localhost:3000/_next/static/chunks/app/admin/mgmt/page.js`
- Status: 200 OK (page loads but shows access denied message)

### Root Cause Hypothesis

The access control check on `/admin/mgmt` page is likely:
1. Not correctly checking `global_role === "platform_owner"` OR
2. Checking the wrong field (perhaps `role` at org level instead of `global_role`) OR
3. Checking for a different role string (e.g., `platform_admin` vs `platform_owner`)

### Investigation Needed

1. **Find the access control logic** for `/admin/mgmt` page
2. **Check role constants** - What role values are expected?
3. **Review middleware** - Is there route protection that uses incorrect logic?
4. **Check component guards** - Are there client-side checks that are too restrictive?

---

## Files to Investigate

**Stack Template (module-mgmt):**
- `templates/_cora-core-modules/module-mgmt/frontend/components/` - Platform management UI
- `templates/_project-stack-template/apps/web/app/admin/mgmt/` - Admin page route
- `templates/_project-stack-template/apps/web/middleware.ts` - Route protection

**Access Control:**
- Role constants/enums
- Permission checks in components
- API route guards

---

## Previous Sessions Summary

### Session 33 (Phase 23) - ✅ COMPLETE
- Fixed venv activation in build scripts
- test13 project now builds successfully

### Session 32 (Phase 22) - ✅ COMPLETE
- Zero-error validation achieved
- Templates certified Production Ready

---

## Next Steps

1. **Investigate access control logic** - Find where the check happens
2. **Identify role mismatch** - Compare expected vs actual role values
3. **Fix the access control** - Update logic to properly recognize platform_owner
4. **Test the fix** - Verify platform_owner can access management page
5. **Update templates** - Apply fix using Template-First Workflow

---

**Status:** 🔄 **PHASE 24 IN PROGRESS**  
**Updated:** December 28, 2025, 2:54 PM EST  
**Session Duration:** Starting  
**Overall Progress:** Repeatability confirmed! Now fixing access control. 🔐
