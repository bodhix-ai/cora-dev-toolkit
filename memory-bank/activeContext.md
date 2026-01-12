# Active Context - CORA Development Toolkit

## Current Focus

**Session 91-94: Platform Admin API & Frontend Fixes** - ✅ **CODE COMPLETE** | ⚠️ **DB CONFIG ISSUE**

## Session: January 12, 2026 (5:48 AM - 12:30 PM) - Sessions 91-94

### 🎯 Status: ✅ ALL BACKEND FIXED | ✅ ALL FRONTEND FIXED

**Summary:** Fixed ALL backend platform admin API errors and ALL frontend issues. Fixed AI models rendering, added missing invites button, and resolved members tab redirect caused by duplicate API calls.

---

## ✅ SESSION 91-92 RESOLVED ISSUES

### Backend Fixes (Session 91)

1. **GET /admin/users** - 500 → 200 ✅
2. **GET /admin/ai/config** - 404 → 200 ✅  
3. **GET /orgs/{orgId}/invites** - 500 → 200 ✅
4. **user_sessions table** - Now populating for existing users ✅

### Frontend Fixes (Sessions 92-93)

5. **AI Models Tab Not Displaying** - ✅ FIXED (Session 92)

**Problem:** UI showed "No models found" despite API returning 110 models
**Root Cause:** API client not extracting `response.data.deployments` correctly
**Fix Applied:** Updated `module-ai/frontend/lib/api.ts` getModels() function

```typescript
// Backend returns: {success: true, data: {deployments: [...]}}
// But client expected: {success: true, data: [...]}

// BEFORE (❌ Wrong):
const models = Array.isArray(response.data) ? response.data : [];

// AFTER (✅ Fixed):
let models: ModelApiData[] = [];
if (Array.isArray(response)) {
  models = response;
} else if (response?.data) {
  if (Array.isArray(response.data)) {
    models = response.data;
  } else if (response.data?.deployments && Array.isArray(response.data.deployments)) {
    models = response.data.deployments;  // ← Extract nested deployments
  }
}
```

**Result:** Platform Admin AI Models tab now displays all 110 models correctly

6. **Org Invites Tab - Missing "Create Invitation" Button** - ✅ FIXED (Session 93)

**Problem:** OrgInvitesTab component had no button to create new invitations
**Root Cause:** Component design inconsistency - OrgMembersTab had "Invite Member" button, but OrgInvitesTab did not
**Fix Applied:** Updated `module-access/frontend/components/admin/OrgInvitesTab.tsx`

```typescript
// Added imports
import { PersonAdd } from "@mui/icons-material";
import { InviteMemberDialog } from "../org/InviteMemberDialog";

// Added state
const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

// Added button at top of component (matching OrgMembersTab pattern)
<Button
  variant="contained"
  startIcon={<PersonAdd />}
  onClick={() => setInviteDialogOpen(true)}
>
  Create Invitation
</Button>

// Added dialog at bottom of component
<InviteMemberDialog
  open={inviteDialogOpen}
  onClose={() => {
    setInviteDialogOpen(false);
    fetchInvites(); // Refresh invites list after creating invitation
  }}
  orgId={orgId}
/>
```

**Result:** Platform Admin Org Invites tab now has "Create Invitation" button matching Members tab UX

7. **Org Members Tab - Redirects to Home Page** - ✅ FIXED (Session 93)

**Problem:** Members tab caused redirect when accessed (reproducible across 6 test projects)
**Root Cause:** InviteMemberDialog was rendered unconditionally, causing duplicate API calls

**Detailed Analysis:**
- OrgMembersTab has its own `fetchMembers()` that runs on mount
- InviteMemberDialog component was always rendered (even when `open={false}`)
- InviteMemberDialog uses `useOrgMembers(orgId)` hook
- This hook has a `useEffect` that automatically calls `fetchMembers()` on mount
- **Result:** TWO simultaneous API calls to `/orgs/{orgId}/members` causing race condition/redirect

**Why other tabs worked:**
- OrgDomainsTab uses inline AddDomainDialog that doesn't auto-fetch
- OrgInvitesTab (before fix) didn't have dialog at all

**Fix Applied:** Conditionally render dialog only when open

```typescript
// BEFORE (❌ Wrong):
<InviteMemberDialog
  open={inviteDialogOpen}
  onClose={...}
  orgId={orgId}
/>

// AFTER (✅ Fixed):
{inviteDialogOpen && (
  <InviteMemberDialog
    open={inviteDialogOpen}
    onClose={...}
    orgId={orgId}
  />
)}
```

**Files Updated:**
- `module-access/frontend/components/admin/OrgMembersTab.tsx` - Added conditional rendering
- `module-access/frontend/components/admin/OrgInvitesTab.tsx` - Added conditional rendering (preventive)

**Result:** Members tab now loads without redirect, no duplicate API calls

---

## ⚠️ INVITE MANAGEMENT FUNCTIONALITY

**Question:** Is there UI functionality to edit/delete invites?

**Answer:**
- ✅ **DELETE/REVOKE** - YES, exists in OrgInvitesTab
  - Delete button visible for pending invites
  - Calls `handleRevokeInvite(inviteId)` 
  - Sends `DELETE /orgs/{orgId}/invites/{inviteId}`
  
- ❌ **EDIT** - NO, does not exist
  - No edit button or functionality
  - To change an invite, must revoke and create new one

---

### 2. GET /models - 400 Bad Request (CLARIFIED - Not a Bug)

**Status:** ⚠️ FRONTEND IMPLEMENTATION ISSUE (not backend bug)
**What's happening:** Frontend calling `GET /models` without providerId parameter
**Clarification:** This is the WRONG endpoint for platform admin

**Two Different Endpoints:**
- `GET /models?providerId=xxx` (provider Lambda) - Models for specific provider
- `GET /admin/ai/models` (ai-config-handler Lambda) - ALL models for platform admins ✅

**Solution:** Frontend should call `/admin/ai/models` when fetching all models (already fixed in Session 91)

---

## 📊 Summary of All Template Changes

| File | Changes | Impact |
|------|---------|--------|
| `module-access/.../identities-management/lambda_function.py` | Fixed column names, fetch from user_sessions | GET /admin/users works ✅ |
| `module-access/.../profiles/lambda_function.py` | Added session creation for existing users | Sessions populate ✅ |
| `module-access/.../invites/lambda_function.py` | Fixed: invite_id → id | GET /invites works ✅ |
| `module-ai/infrastructure/outputs.tf` | Added 10 missing API Gateway routes | All /admin/ai/* routes accessible ✅ |
| `module-ai/frontend/lib/api.ts` | Fixed endpoint + deployments extraction | Models tab works ✅ |
| `module-access/.../admin/OrgInvitesTab.tsx` | Added "Create Invitation" button + dialog | Invites button works ✅ |
| `module-access/.../admin/OrgMembersTab.tsx` | Conditionally render dialog | Members redirect fixed ✅ |

**Templates Fixed:** 7 files  
**Backend Issues Fixed:** 4  
**Frontend Issues Fixed:** 3 (AI models, invites button, members redirect)  
**Frontend Issues Remaining:** 0 ✅

---

## 🔍 New Validator Created

**ExternalUIDConversionValidator** - Detects Cognito external_uid → Okta sub conversions
- Location: `validation/external-uid-validator/`
- Purpose: Catch hardcoded Cognito UUID patterns that need to be converted to Okta sub claims
- Added to: `validation/cora-validate.py` orchestrator

---

## 📝 Deployment Instructions

To apply these fixes to an existing project:

1. **Copy updated templates:**
   ```bash
   # Copy module-ai frontend fix
   cp templates/_modules-core/module-ai/frontend/lib/api.ts \\
      {project}-stack/modules/module-ai/frontend/lib/api.ts
   ```

2. **Rebuild module-access Lambda:**
   ```bash
   cd {project}-stack/modules/module-access/backend
   ./build.sh
   ```

3. **Rebuild module-ai Lambdas:**
   ```bash
   cd {project}-stack/modules/module-ai/backend
   ./build.sh
   ```

4. **Deploy infrastructure:**
   ```bash
   cd {project}-infra
   ./scripts/deploy-terraform.sh dev
   ```

5. **Rebuild frontend:**
   ```bash
   cd {project}-stack
   npm run build
   ```

---

## 🎯 Next Steps

1. ✅ **Backend templates:** All fixed and complete
2. ✅ **AI models frontend:** Fixed and complete
3. ✅ **Org invites button:** Fixed and complete
4. ✅ **Org members redirect:** Fixed - duplicate API call issue resolved
5. 📋 **Deploy fixes to test projects:** Copy updated templates and redeploy
6. 📋 **Validator improvement:** Add filters parameter column extraction (future)

---

## Previous Session Reference

**Session 90:** Fixed Org Admin API routes, implemented visual pickers for Platform Admin, and fixed analytics data rendering.

---

---

## 🔧 SESSION 94 (12:10 PM - 12:30 PM) - INVITATION SYSTEM FIXES

### Issue: Invitation System Not Working

**Symptoms:**
- Clicking "Invite Member" returned 400 Bad Request
- Error: "Invalid role. Must be org_member or org_admin"
- Then 500 Internal Server Error after fixing role validation

### Root Causes Found

#### 1. Frontend Endpoint Mismatch ✅ FIXED

**Problem:** Frontend calling wrong endpoint
- **Called:** `POST /orgs/${orgId}/members` (adds existing user immediately)
- **Should call:** `POST /orgs/${orgId}/invites` (creates invitation for new user)

**Fix Applied:** Updated `module-access/frontend/lib/api.ts`
```typescript
// BEFORE (❌ Wrong):
inviteMember: (orgId, data) =>
  authenticatedClient.post<OrgMember>(`/orgs/${orgId}/members`, data),

// AFTER (✅ Fixed):
inviteMember: (orgId, data) =>
  authenticatedClient.post<OrgMember>(`/orgs/${orgId}/invites`, data),
```

**Result:** Frontend now calls correct invitation endpoint

---

#### 2. Lambda Role Validation Bug ✅ FIXED

**Problem:** Lambda using non-standard role names
- **Accepted:** `org_member`, `org_admin` (incorrect)
- **Should accept:** `org_user`, `org_admin`, `org_owner` (CORA standard)

**Root Cause:** Inconsistency in invites Lambda - other Lambdas used correct role names

**Fix Applied:** Updated `module-access/backend/lambdas/invites/lambda_function.py`
```python
# BEFORE (❌ Wrong):
if role not in ['org_member', 'org_admin']:
    return common.bad_request_response(
        'Invalid role. Must be org_member or org_admin'
    )

# AFTER (✅ Fixed):
if role not in ['org_user', 'org_admin', 'org_owner']:
    return common.bad_request_response(
        'Invalid role. Must be org_user, org_admin, or org_owner'
    )
```

**Verification:**
- `validators.py` defines: `valid_roles = ['org_user', 'org_admin', 'org_owner']`
- Members Lambda uses: `org_user`, `org_admin`, `org_owner`
- Invites Lambda was the only one using incorrect role names

**Result:** Lambda now validates against correct CORA standard roles

**Deployment:**
- Lambda rebuilt and deployed successfully
- Deployment timestamp: 2026-01-12 at 12:16 PM EST
- Status: Successful

---

#### 3. Database Configuration Issue ⚠️ INFRASTRUCTURE PROBLEM

**Problem:** After fixing code, database insert fails
```
Database error in insert on user_invites: 
{
  'message': 'stack depth limit exceeded', 
  'code': '54001',
  'hint': 'Increase the configuration parameter "max_stack_depth" (currently 2048kB)'
}
```

**Root Cause:** PostgreSQL recursive trigger or RLS policy
- Error code `54001` = stack depth limit exceeded
- Occurs when RLS policies reference themselves recursively
- Or when triggers create circular dependencies
- Lambda code is **correct** - error happens during database INSERT

**Not a Code Issue:**
- ✅ Frontend sends correct request to correct endpoint
- ✅ Lambda validates request correctly
- ✅ Lambda attempts to insert into `user_invites` table
- ❌ Database RLS policy causes infinite recursion

**Next Steps (Database Team):**
1. Review RLS policies on `user_invites` table
2. Look for recursive references between tables
3. Simplify policies to remove circular dependencies
4. Do NOT increase `max_stack_depth` as permanent fix

**Workaround (Temporary):**
- Temporarily disable RLS on `user_invites` table for testing
- Or create invitation records directly via SQL

---

## 📊 Updated Summary of Template Changes

| File | Changes | Impact |
|------|---------|--------|
| `module-access/.../identities-management/lambda_function.py` | Fixed column names, fetch from user_sessions | GET /admin/users works ✅ |
| `module-access/.../profiles/lambda_function.py` | Added session creation for existing users | Sessions populate ✅ |
| `module-access/.../invites/lambda_function.py` | Fixed: invite_id → id, role validation | GET /invites works, role validation fixed ✅ |
| `module-access/frontend/lib/api.ts` | Fixed: inviteMember calls /invites endpoint | Frontend calls correct endpoint ✅ |
| `module-ai/infrastructure/outputs.tf` | Added 10 missing API Gateway routes | All /admin/ai/* routes accessible ✅ |
| `module-ai/frontend/lib/api.ts` | Fixed endpoint + deployments extraction | Models tab works ✅ |
| `module-access/.../admin/OrgInvitesTab.tsx` | Added "Create Invitation" button + dialog | Invites button works ✅ |
| `module-access/.../admin/OrgMembersTab.tsx` | Conditionally render dialog | Members redirect fixed ✅ |

**Templates Fixed:** 8 files  
**Backend Issues Fixed:** 5 (admin users, ai config, invites endpoint, sessions, role validation)  
**Frontend Issues Fixed:** 4 (AI models, invites button, members redirect, invites endpoint)  
**Infrastructure Issues Found:** 1 (database RLS policy recursion - needs DB team)

---

**Status:** ✅ **CODE COMPLETE** | ⚠️ **DB CONFIG ISSUE FOUND**  
**Templates Updated:** module-access (backend + frontend), module-ai  
**Backend Fixes:** 5 resolved ✅  
**Frontend Fixes:** 4 resolved ✅  
**Total Code Issues:** 9 resolved out of 9 ✅  
**Infrastructure Issues:** 1 found (database RLS policy needs review)  
**Updated:** January 12, 2026, 12:30 PM EST

---

---

## 🔧 SESSION 95 (12:40 PM - 1:00 PM) - TRIGGER RECURSION FIX

### Issue: Database Stack Depth Exceeded

**Problem:** After fixing all Lambda code, invitation creation still failed with:
```
Database error in insert on user_invites: 
{
  'message': 'stack depth limit exceeded', 
  'code': '54001',
  'hint': 'Increase the configuration parameter "max_stack_depth" (currently 2048kB)'
}
```

### Root Cause Analysis ✅ IDENTIFIED

**The issue was NOT in RLS policies**, but in the `auto_expire_invites` trigger.

**Trigger Recursion Problem:**
```sql
-- Trigger fires on BOTH INSERT and UPDATE
CREATE TRIGGER check_expired_invites
    AFTER INSERT OR UPDATE ON public.user_invites
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_expire_invites();

-- Function performs UPDATE on same table
CREATE OR REPLACE FUNCTION auto_expire_invites()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_invites  -- ← Triggers itself!
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

**Recursion Flow:**
1. INSERT into `user_invites` → triggers `auto_expire_invites()`
2. `auto_expire_invites()` runs UPDATE on `user_invites`
3. UPDATE triggers `auto_expire_invites()` again (because trigger is `AFTER INSERT OR UPDATE`)
4. Infinite loop until stack depth exceeded (error 54001)

### Fix Applied ✅ COMPLETE

**Solution:** Remove UPDATE from trigger definition

```sql
-- BEFORE (❌ Causes recursion):
CREATE TRIGGER check_expired_invites
    AFTER INSERT OR UPDATE ON public.user_invites

-- AFTER (✅ Fixed):
CREATE TRIGGER check_expired_invites
    AFTER INSERT ON public.user_invites
```

**Rationale:** 
- Auto-expire logic should only run when new invites are created (INSERT)
- No need to check expired invites when updating existing records
- Prevents infinite recursion while maintaining functionality

### Files Updated

1. **Template (Source of Truth):**
   - `templates/_modules-core/module-access/db/schema/006-user-provisioning.sql`
   - Changed trigger from `AFTER INSERT OR UPDATE` to `AFTER INSERT`

2. **Migration Script (For Existing Projects):**
   - `scripts/migrations/fix-invite-trigger-recursion.sql`
   - Idempotent script to fix trigger without full schema rebuild
   - Can be run on existing databases safely

### Deployment Instructions

**For New Projects:**
- Template is already fixed
- Next project creation will have correct trigger

**For Existing Projects:**
Run the migration script:
```bash
# Connect to database
psql -h <host> -U <user> -d <database>

# Run migration
\i scripts/migrations/fix-invite-trigger-recursion.sql

# Verify fix
SELECT 
    trigger_name, 
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'check_expired_invites';

# Expected: event_manipulation should show only 'INSERT', not 'UPDATE'
```

### RLS Policies Analysis

**Reviewed all RLS policies** - no circular dependencies found:

- **user_invites** checks `org_members` and `user_profiles`
- **org_members** self-references (simple, not circular)
- **user_profiles** only checks `auth.uid()` (no circular reference)

**Conclusion:** RLS policies were correctly designed. The issue was purely the trigger recursion.

### Validation ✅ TESTED AND CONFIRMED

**Test Date:** January 12, 2026, 1:15 PM EST

**Test Results:**
- ✅ Invitations can be **created** successfully (no stack depth error)
- ✅ Invitations can be **deleted/revoked** successfully
- ✅ No infinite recursion or database errors
- ✅ Fix confirmed working in production environment

**Conclusion:** Trigger recursion fix is production-ready and fully validated.

---

## 📊 Final Summary of Template Changes

| File | Changes | Impact |
|------|---------|--------|
| `module-access/.../identities-management/lambda_function.py` | Fixed column names, fetch from user_sessions | GET /admin/users works ✅ |
| `module-access/.../profiles/lambda_function.py` | Added session creation for existing users | Sessions populate ✅ |
| `module-access/.../invites/lambda_function.py` | Fixed: invite_id → id, role validation | GET /invites works, role validation fixed ✅ |
| `module-access/frontend/lib/api.ts` | Fixed: inviteMember calls /invites endpoint | Frontend calls correct endpoint ✅ |
| `module-ai/infrastructure/outputs.tf` | Added 10 missing API Gateway routes | All /admin/ai/* routes accessible ✅ |
| `module-ai/frontend/lib/api.ts` | Fixed endpoint + deployments extraction | Models tab works ✅ |
| `module-access/.../admin/OrgInvitesTab.tsx` | Added "Create Invitation" button + dialog | Invites button works ✅ |
| `module-access/.../admin/OrgMembersTab.tsx` | Conditionally render dialog | Members redirect fixed ✅ |
| `module-access/db/schema/006-user-provisioning.sql` | Fixed trigger recursion | Invitation creation works ✅ |

**Templates Fixed:** 9 files  
**Backend Issues Fixed:** 5 (admin users, ai config, invites endpoint, sessions, role validation)  
**Frontend Issues Fixed:** 4 (AI models, invites button, members redirect, invites endpoint)  
**Database Issues Fixed:** 1 (trigger recursion)
**Total Issues Resolved:** 10 out of 10 ✅

---

**Status:** ✅ **ALL ISSUES RESOLVED**  
**Templates Updated:** module-access (backend + frontend + database), module-ai  
**Backend Fixes:** 5 resolved ✅  
**Frontend Fixes:** 4 resolved ✅  
**Database Fixes:** 1 resolved ✅  
**Total Code Issues:** 10 resolved out of 10 ✅  
**Migration Scripts Created:** 1 (fix-invite-trigger-recursion.sql)  
**Updated:** January 12, 2026, 1:00 PM EST
