# Plan: UI Testing Issues - Admin Pages

**Initiative:** Admin Standardization  
**Sprint:** S4  
**Branch:** `admin-page-s4-ui-testing`  
**Created:** January 28, 2026  
**Status:** 🟢 In Progress - Session 2 Complete  
**Test Environment:** ai-mod (`/Users/aaron/code/bodhix/testing/admin-ui/ai-mod-stack`)

---

## Executive Summary

**Total Issues:** 11 | **Resolved:** 9 | **In Progress:** 0 | **Open:** 2 | **Blocked:** 0

### Issues at a Glance

| # | Title | Status | Severity | Category | Page/Endpoint |
|---|-------|--------|----------|----------|---------------|
| 1 | Chat Admin Endpoints 500 | ✅ Resolved | High | Auth Pattern | `/admin/sys/chat/*` |
| 2 | KB Creation API Client Error | ✅ Resolved | Medium | Frontend Bug | `/admin/sys/kb` |
| 3 | Voice Admin Access Denied | ✅ Resolved | High | Authorization | `/admin/sys/voice` |
| 4 | Eval AI Prompts 404 | ✅ Resolved | Medium | Route Mismatch | `/admin/sys/eval` (AI Prompts tab) |
| 5 | Access AI Config 404 | ✅ Resolved | Medium | Route Mismatch | `/admin/sys/access/orgs/{id}` (AI Config tab) |
| 6 | AI Models Tab 400 | ✅ Resolved | Medium | Backend Logic | `/admin/sys/ai` (Models tab) |
| 7 | Org Chat hasRole Error | 🔴 Open | High | Auth Pattern | `/admin/org/chat` |
| 8 | Org KB API Client Missing | ✅ Resolved | Medium | Auth Pattern | `/admin/org/kb` |
| 9 | Eval Hooks Render Error | ✅ Resolved | Medium | React Pattern | Multiple eval pages |
| 10 | Chat Analytics toLocaleString Error | ✅ Resolved | Medium | Frontend Bug | `/admin/sys/chat` (Analytics tab) |
| 11 | Chat Sessions Filter Error | ✅ Resolved | Medium | Frontend Bug | `/admin/sys/chat` (Sessions tab) |

### Sprint S4 Session 2 Summary (January 30, 2026)

**Major Achievement:** Fixed sys chat admin authentication and frontend display errors

#### Backend Fix (✅ Deployed)
**Problem:** Lambda was passing Okta JWT to RPC function that expected Supabase JWT
- **Error:** "No suitable key or wrong key type - RPC can't decode JWT"
- **Root Cause:** `common.is_sys_admin(jwt_token)` calls RPC that uses `auth.uid()` which only decodes Supabase JWTs
- **Solution:** Query `user_profiles` table directly instead of using RPC
- **Pattern:** All working modules (mgmt, kb, ai, access, etc.) use direct DB queries
- **Files:** `chat-session/lambda_function.py` (8 handler functions updated)
- **Status:** ✅ Deployed (2026-01-30T05:29:44 UTC)

#### Frontend Fixes (✅ Synced)
1. **Analytics Tab toLocaleString Error**
   - **Problem:** Calling `.toLocaleString()` on undefined values
   - **Solution:** Nullish coalescing - `(value ?? 0).toLocaleString()`
   - **Files:** `SysAnalyticsTab.tsx` (7 locations fixed)

2. **Sessions Tab Filter Error**
   - **Problem:** `sessions.filter is not a function` (API returning non-array)
   - **Solution:** Array safety checks before filtering
   - **Files:** `SysSessionsTab.tsx`

#### Documentation Created
- **File:** `docs/plans/plan_auth-standardization.md`
- Comprehensive analysis of auth pattern inconsistencies across modules
- Proposes `cora_auth.py` library for standardization
- Migration plan for all 8 modules

#### Testing Results
- ✅ `/admin/sys/chat` - **All tabs working**
  - Settings tab: Config loads correctly
  - Analytics tab: Displays with proper zero-value handling
  - Sessions tab: Lists and filters sessions
- 🔴 `/admin/org/chat` - **Needs similar fixes** (likely same patterns)

---

## Detailed Issue Tracking

### Issue 1: Chat Admin Endpoints - 500 Error (Backend Auth)

**Status:** ✅ Resolved  
**Severity:** High  
**Discovered:** 2026-01-28 20:10  
**Resolved:** 2026-01-30 00:29

**Final Resolution:**
The issue required a complete understanding of CORA's auth pattern. After investigating, the problem was that the chat Lambda was passing an Okta JWT to a database RPC function that uses `auth.uid()` to decode JWTs. However, `auth.uid()` only works with Supabase JWTs, not Okta JWTs.

**Root Cause Analysis:**
```python
# BROKEN Pattern (Chat Lambda - Before):
is_authorized = common.is_sys_admin(jwt_token)  # jwt_token is from Okta

# Inside common.is_sys_admin():
# Calls database RPC: is_sys_admin(jwt text)
# RPC uses: auth.uid() to decode JWT
# Problem: auth.uid() can't decode Okta JWTs!

# WORKING Pattern (All other modules):
user_info = common.get_user_from_event(event)
okta_uid = user_info['user_id']
supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)

profile = common.find_one(
    table='user_profiles',
    filters={'user_id': supabase_user_id}
)

is_sys_admin = profile.get('sys_role') in ['sys_owner', 'sys_admin']
```

**Solution Applied:**
Updated all 8 sys admin handler functions in `chat-session/lambda_function.py`:
- Changed parameter from `jwt_token: str` to `user_id: str`
- Added direct `user_profiles` table query at start of each handler
- Check if `sys_role` is in `['sys_owner', 'sys_admin']`

**Files Modified:**
- `templates/_modules-core/module-chat/backend/lambdas/chat-session/lambda_function.py`

**Deployment:**
- Lambda rebuilt and deployed
- Confirmed deployment: 2026-01-30T05:29:44 UTC

---

### Issue 10: Chat Analytics toLocaleString Error

**Status:** ✅ Resolved  
**Severity:** Medium  
**Discovered:** 2026-01-30 00:31  
**Resolved:** 2026-01-30 00:32

**Error:**
```
TypeError: Cannot read properties of undefined (reading 'toLocaleString')
Source: SysAnalyticsTab.tsx (135:43)
{analytics?.totalSessions.toLocaleString() || 0}
```

**Root Cause:**
Optional chaining stops at `analytics?.totalSessions` but doesn't prevent calling `.toLocaleString()` on undefined.

**Solution:**
Use nullish coalescing to provide default before calling method:
```typescript
// Before (BROKEN):
{analytics?.totalSessions.toLocaleString() || 0}

// After (FIXED):
{(analytics?.totalSessions ?? 0).toLocaleString()}
```

**Files Modified:**
- `templates/_modules-core/module-chat/frontend/components/admin/SysAnalyticsTab.tsx` (7 locations)

---

### Issue 11: Chat Sessions Filter Error

**Status:** ✅ Resolved  
**Severity:** Medium  
**Discovered:** 2026-01-30 00:33  
**Resolved:** 2026-01-30 00:33

**Error:**
```
TypeError: sessions.filter is not a function
Source: SysSessionsTab.tsx (131:37)
const filteredSessions = sessions.filter(...)
```

**Root Cause:**
API response might not return array directly, or sessions state hasn't been populated yet.

**Solution:**
Add array safety checks in two places:
```typescript
// 1. When setting state from API
const data = await listSysAdminSessions(token, { limit: 100 });
setSessions(Array.isArray(data) ? data : []);

// 2. Before filtering
const filteredSessions = (Array.isArray(sessions) ? sessions : []).filter(...)
```

**Files Modified:**
- `templates/_modules-core/module-chat/frontend/components/admin/SysSessionsTab.tsx`

---

## Testing Checklist

### Module-Chat Admin Pages

**Sys Admin (`/admin/sys/chat`):**
- [x] Settings Tab - ✅ Working
  - [x] GET /admin/sys/chat/config - Load config
  - [x] PUT /admin/sys/chat/config - Update config
- [x] Analytics Tab - ✅ Working
  - [x] GET /admin/sys/chat/analytics - Load analytics
  - [x] GET /admin/sys/chat/analytics/usage - Usage stats
  - [x] GET /admin/sys/chat/analytics/tokens - Token stats
- [x] Sessions Tab - ✅ Working
  - [x] GET /admin/sys/chat/sessions - List sessions
  - [x] GET /admin/sys/chat/sessions/{id} - View session
  - [x] DELETE /admin/sys/chat/sessions/{id} - Delete session

**Org Admin (`/admin/org/chat`):**
- [ ] Settings Tab - ⏳ Needs testing (likely needs similar fixes)
  - [ ] GET /admin/org/chat/config - Load config
  - [ ] PUT /admin/org/chat/config - Update config
- [ ] Analytics Tab - ⏳ Needs testing
  - [ ] GET /admin/org/chat/analytics - Load analytics
  - [ ] GET /admin/org/chat/analytics/users - User stats
  - [ ] GET /admin/org/chat/analytics/workspaces - Workspace stats
- [ ] Sessions Tab - ⏳ Needs testing
  - [ ] GET /admin/org/chat/sessions - List sessions
  - [ ] GET /admin/org/chat/sessions/{id} - View session
  - [ ] PUT /admin/org/chat/sessions/{id}/restore - Restore session
  - [ ] DELETE /admin/org/chat/sessions/{id} - Soft delete

---

## Documentation Created

### Auth Standardization Plan

**File:** `docs/plans/plan_auth-standardization.md`

**Purpose:** Document the authentication pattern inconsistency discovered during Sprint S4 and propose a comprehensive solution.

**Key Findings:**
- 7/8 modules use JWT-based auth correctly (mgmt, kb, ai, access, ws, eval, voice)
- 1/8 modules was broken (chat - passing Okta JWT to Supabase RPC)
- Root cause: No centralized auth library or enforced standards

**Proposed Solution:**
Create `cora_auth.py` library with standardized functions:
- `CORAuth` class with methods like `is_sys_admin()`, `is_org_admin()`, `can_access_workspace()`
- All auth logic in database RPC functions (security definer)
- Consistent error messages and patterns
- Validator to enforce usage

**Migration Plan:**
1. Phase 1: Create auth library (2-3 hours)
2. Phase 2: Migrate module-chat (1-2 hours)
3. Phase 3: Update all other modules (4-6 hours)
4. Phase 4: Documentation and validation (1-2 hours)

**Time Estimate:** 8-13 hours total

---

## Session Log

### January 30, 2026 - Sprint S4 Session 2

**Status:** Sys Chat Admin Fixed - Backend & Frontend Complete  
**Branch:** `admin-page-s4-ui-testing`

**Work Completed:**

1. **Backend Lambda Auth Fix - DEPLOYED** ✅
   - **Root Cause:** Okta JWT passed to Supabase RPC function
   - **Discovery Process:**
     - Initial 500 error from chat admin endpoints
     - Checked CloudWatch logs: "No suitable key or wrong key type"
     - RPC function `is_sys_admin(jwt)` uses `auth.uid()` to decode JWT
     - `auth.uid()` only decodes Supabase JWTs, not Okta JWTs
     - Compared with working modules (mgmt, kb, etc.) which query DB directly
   - **Solution:** Changed all 8 sys admin handlers to query `user_profiles` directly
   - **Files:** `chat-session/lambda_function.py`
   - **Deployment:** Built, copied to infra, deployed via Terraform
   - **Status:** ✅ Deployed at 2026-01-30T05:29:44 UTC

2. **Frontend Analytics Tab Fix - SYNCED** ✅
   - **Problem:** `analytics?.totalSessions.toLocaleString()` threw error when undefined
   - **Solution:** Use nullish coalescing: `(analytics?.totalSessions ?? 0).toLocaleString()`
   - **Locations:** 7 fixes across analytics, token stats, and active sessions display
   - **Files:** `SysAnalyticsTab.tsx`
   - **Status:** ✅ Synced to test project

3. **Frontend Sessions Tab Fix - SYNCED** ✅
   - **Problem:** `sessions.filter is not a function` when API returns non-array
   - **Solution:** Array safety checks on setState and before filter
   - **Files:** `SysSessionsTab.tsx`
   - **Status:** ✅ Synced to test project

4. **Documentation Created** ✅
   - **File:** `docs/plans/plan_auth-standardization.md`
   - **Content:** Comprehensive auth standardization plan
   - **Purpose:** Prevent similar auth issues in future development

**Testing Results:**
- ✅ Sys chat admin fully functional (all 3 tabs working)
- 🔴 Org chat admin needs similar fixes (deferred to next session)

**Key Insight:**
This session exposed a critical gap in CORA's authentication patterns. While 7/8 modules follow the correct pattern (direct DB queries), module-chat was using an incompatible RPC-based pattern. The auth standardization plan addresses this systematically.

**Time Spent:** ~2 hours (investigation, fixes, deployment, testing, documentation)

---

## Remaining Work

### Priority 1: Org Chat Admin
Apply similar fixes to org chat admin pages:
- May need similar auth pattern fixes in org handlers
- Frontend components likely need same array/undefined safety checks
- Estimate: 1-2 hours

### Priority 2: Open Issues
- Issue #7: Org Chat hasRole Error - Still needs investigation/fix

### Priority 3: Auth Standardization (Future Sprint)
Implement the `cora_auth.py` library as documented in `plan_auth-standardization.md`
- Estimate: 8-13 hours
- Impact: Prevents similar auth issues across all modules

---

**Updated:** January 30, 2026 - 00:36