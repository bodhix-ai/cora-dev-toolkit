# Active Context - CORA Development Toolkit

## Current Focus

**Phase 26: Lambda Warming Toggle Fix** - ✅ **COMPLETE**

## Session: December 29, 2025 (10:28 AM - 10:57 AM) - Session 37

### 🎯 Focus: Fix Lambda Warming Toggle Not Working

**Context:** Platform owner could access the Lambda Warming tab but could not toggle the warming on/off. The toggle appeared disabled or didn't respond to clicks.

**Status:** ✅ **FIXED & VALIDATED**

---

## Solution Summary (Session 37)

### Root Cause #1: RLS Policies Bug

The `platform_lambda_config` table RLS policies had two critical bugs:

**Bug 1: Wrong Table Name**
```sql
-- BROKEN CODE:
CREATE POLICY "platform_admins_all_lambda_config" ON platform_lambda_config
  USING (
    EXISTS (
      SELECT 1 FROM profiles  -- ❌ WRONG TABLE! Should be user_profiles
      WHERE user_id = auth.uid()
      AND global_role = 'super_admin'
    )
  );
```

**Bug 2: Wrong Role Check**
```sql
-- BROKEN CODE:
AND global_role = 'super_admin'  -- ❌ Role doesn't exist! Should check for platform_owner/platform_admin
```

**The Problem:**
1. RLS policies always failed because `profiles` table doesn't exist
2. Even if table existed, `super_admin` role doesn't exist
3. Result: All API calls to read/update Lambda config were blocked with RLS violations
4. Frontend showed empty config or couldn't save changes

### Root Cause #2: API Client Not Unwrapping CORA Response

The Lambda Management API client was not unwrapping the CORA API response structure:

```typescript
// BROKEN CODE:
async getConfig(configKey: string): Promise<LambdaConfig | null> {
  const response = await this.client.get<LambdaConfig>(`/platform/lambda-config/${configKey}`);
  return response || null;
  // response = { success: true, data: {...} }
  // Trying to access response.config_value returns undefined!
}
```

**The Problem:**
1. CORA API returns: `{ success: true, data: { config_value: {...} } }`
2. Code expected: `{ config_value: {...} }` directly
3. Result: `response.config_value` was `undefined`
4. Hook couldn't load config → toggle showed as disabled
5. Console error: "Cannot toggle enabled - no config loaded"

### Investigation Process

1. ✅ Checked database - Lambda warming config exists with correct data
2. ✅ Verified API returns 200 OK with full response body
3. ✅ Added DEBUG logging to hook - discovered `config_value` was `undefined`
4. ✅ Traced through API client - found missing response unwrapping
5. ✅ Fixed unwrapping - config loaded successfully
6. ✅ Toggle started working immediately!

### Files Fixed

**Database Schema:**
1. `templates/_cora-core-modules/module-mgmt/db/schema/001-platform-lambda-config.sql`
   - Fixed RLS policy table name: `profiles` → `user_profiles`
   - Fixed role check: `super_admin` → `IN ('platform_owner', 'platform_admin')`
   - Consolidated RLS policies from separate file
   - Made seed data idempotent with `ON CONFLICT DO UPDATE`

**Schema Organization:**
- Deleted obsolete `002-rls-policies.sql`
- Renumbered: `003-platform-module-registry.sql` → `002-platform-module-registry.sql`
- Renumbered: `004-platform-module-usage.sql` → `003-platform-module-usage.sql`
- Renumbered: `005-platform-module-rls.sql` → `004-platform-module-rls.sql`

**Frontend API Client:**
2. `templates/_cora-core-modules/module-mgmt/frontend/lib/api.ts`
   - Fixed `getConfig()` to unwrap `response.data`
   - Fixed `updateConfig()` to unwrap `response.data`
   - Added comments explaining CORA API response structure

**Frontend Hook:**
3. `templates/_cora-core-modules/module-mgmt/frontend/hooks/useLambdaWarming.ts`
   - Added optimistic UI updates for toggle
   - Added JSON parsing (backend already parses, but defensive code)
   - Toggle responds immediately, API call in background
   - Rollback on failure

**Frontend Component:**
4. `templates/_cora-core-modules/module-mgmt/frontend/components/admin/ScheduleTab.tsx`
   - Added `hasChanges` check for Save button
   - Save button only enabled when schedule/concurrency change
   - Prevents confusion with auto-saving toggle

### Changes Made

**RLS Policies (Before - Broken):**
```sql
CREATE POLICY "platform_admins_all_lambda_config" ON platform_lambda_config
  USING (
    EXISTS (
      SELECT 1 FROM profiles  -- ❌ WRONG TABLE
      WHERE user_id = auth.uid()
      AND global_role = 'super_admin'  -- ❌ WRONG ROLE
    )
  );
```

**RLS Policies (After - Fixed):**
```sql
CREATE POLICY "platform_admins_all_lambda_config" ON platform_lambda_config
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles  -- ✅ Correct table
      WHERE user_id = auth.uid()
      AND global_role IN ('platform_owner', 'platform_admin')  -- ✅ Correct roles
    )
  );
```

**API Client (Before - Broken):**
```typescript
async getConfig(configKey: string): Promise<LambdaConfig | null> {
  const response = await this.client.get<LambdaConfig>(
    `/platform/lambda-config/${configKey}`
  );
  return response || null;
  // response.config_value is undefined!
}
```

**API Client (After - Fixed):**
```typescript
async getConfig(configKey: string): Promise<LambdaConfig | null> {
  const response = await this.client.get<{ data: LambdaConfig }>(
    `/platform/lambda-config/${configKey}`
  );
  // CORA API returns { success: true, data: {...} } - unwrap it
  return response?.data || null;
}
```

**Toggle Hook (Before - No Optimistic Updates):**
```typescript
const toggleEnabled = async (enabled: boolean) => {
  if (!config) return false;
  
  const updatedConfig = { ...config, enabled };
  return updateConfig(updatedConfig);
  // Toggle doesn't respond until API completes!
};
```

**Toggle Hook (After - Optimistic Updates):**
```typescript
const toggleEnabled = async (enabled: boolean) => {
  const previousConfig = config;
  if (!previousConfig) return false;

  const updatedConfig = { ...previousConfig, enabled };
  
  // Optimistic update - UI responds immediately
  setConfig(updatedConfig);
  
  // API call in background
  const success = await updateConfig(updatedConfig);
  
  // Rollback if failed
  if (!success && previousConfig) {
    setConfig(previousConfig);
  }
  
  return success;
};
```

**Save Button (Before - Always Enabled):**
```typescript
<Button
  disabled={!config?.enabled || saving}
>
  Save Configuration
</Button>
// Confusing: Toggle auto-saves but Save button suggests unsaved changes
```

**Save Button (After - Only Enabled When Changes):**
```typescript
const hasChanges = React.useMemo(() => {
  if (!config) return false;
  return (
    schedule !== (config.schedule || "rate(5 minutes)") ||
    concurrency !== (config.concurrency || 1)
  );
}, [config, schedule, concurrency]);

<Button
  disabled={!config?.enabled || saving || !hasChanges}
>
  Save Configuration
</Button>
// Clear UX: Only enabled when there are actual changes to save
```

### Why This Works

**RLS Policies:**
- Correct table name allows policy to execute successfully
- Correct role check grants access to platform_owner and platform_admin users
- 40 policies created (was 35 before fix)

**API Client:**
- Unwraps CORA API response structure `{ success: true, data: {...} }`
- Hook receives actual config data instead of undefined
- Toggle can load config and respond to clicks

**Optimistic Updates:**
- Toggle responds immediately when clicked
- User sees instant feedback
- API call happens in background
- Rollback on failure maintains data integrity

**UX Improvement:**
- Save button only enabled when schedule/concurrency change
- Prevents confusion: toggle auto-saves, but schedule/concurrency need Save button
- Clear indication of when changes are pending

### Testing Results

✅ **User confirmed fix works:**
```
"it is working now!"

DEBUG logs show:
[DEBUG] Raw response.config_value: {enabled: true, timezone: 'America/New_York', ...}
[DEBUG] Type: object
[DEBUG] Using direct value
[DEBUG] Setting config: {enabled: true, ...}

PUT Request:
Request Method: PUT
Status Code: 200 OK
```

✅ **Database confirms changes saved:**
```json
{
  "config_value": "{\"enabled\": true, \"concurrency\": 2, \"schedule\": \"rate(5 minutes)\", ...}"
}
```

✅ **All functionality working:**
- Toggle on/off works ✅
- Schedule changes save ✅
- Concurrency changes save ✅
- Optimistic updates work ✅
- Save button UX clear ✅

---

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

## Previous Sessions Summary

### Session 37 (Phase 26) - ✅ COMPLETE
- Fixed Lambda Warming toggle functionality
- Fixed RLS policies (table name + role check)
- Fixed API client response unwrapping
- Added optimistic UI updates
- Improved Save button UX

### Session 36 (Phase 25) - ✅ COMPLETE
- Fixed API Gateway authorizer route-specific policies
- Platform management routes now accessible

### Session 35 (Phase 24) - ✅ COMPLETE
- Fixed platform admin page access control
- Added anti-pattern validation

### Session 33 (Phase 23) - ✅ COMPLETE
- Fixed venv activation in build scripts
- test13 project now builds successfully

### Session 32 (Phase 22) - ✅ COMPLETE
- Zero-error validation achieved
- Templates certified Production Ready

---

**Status:** ✅ **PHASE 26 COMPLETE**  
**Updated:** December 29, 2025, 10:57 AM EST  
**Session Duration:** 29 minutes  
**Overall Progress:** Lambda Warming fully functional! �
