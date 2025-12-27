# Redirect Loop Root Cause Analysis - December 23, 2025

**Date:** December 23, 2025, 6:45 PM EST  
**Status:** ✅ **FULLY RESOLVED** - Authentication working end-to-end  
**Resolution Date:** December 23, 2025, 10:05 PM EST  
**Sessions:** 10-13 (Dec 22-23, 2025)

---

## Executive Summary

The authentication redirect loop in test2 has been **fully diagnosed**. The issue is NOT a simple frontend configuration problem - it's a **cascade of backend failures** stemming from:

1. **RLS Policy Issues** (406 errors blocking database queries)
2. **Missing Provider Context** (authorizer data not being extracted)
3. **Stale RPC Functions** (referencing renamed tables)

All three issues must be fixed together for authentication to work.

---

## Issue #1: 406 Not Acceptable Errors - RLS Policies

### Symptoms

Multiple Supabase REST API queries are returning **HTTP 406 Not Acceptable**:

```
HTTP/2 406 Not Acceptable:
- GET user_auth_ext_ids?select=%2A&external_id=eq.Aaron.Kilinski%40simpletechnology.io
- GET user_invites?select=%2A&email=eq.Aaron.Kilinski%40simpletechnology.io&status=eq.pending
- GET org_email_domains?select=%2A&domain=eq.simpletechnology.io&auto_provision=eq.True

HTTP/2 200 OK:
- GET user_profiles?select=%2A&global_role=eq.platform_owner
```

### Root Cause

**After Phase 11's table renaming**, RLS (Row-Level Security) policies on the renamed tables were not properly recreated:

- `external_identities` → `user_auth_ext_ids` (406 errors)
- `org_invites` → `user_invites` (406 errors)  
- `org_domains` → `org_email_domains` (406 errors)
- `profiles` → `user_profiles` (200 OK - policies work)

The migration file `20251220103900_rename_tables_standardization.sql` renamed the tables but **did not recreate the RLS policies** with the new table names.

### Impact

- Lambda cannot find existing users in `user_auth_ext_ids` table
- Lambda cannot check for pending invitations
- Lambda cannot check for domain matches
- User provisioning logic fails at every step
- Lambda tries to create duplicate users (causing "user already exists" error)

### Fix Required

Re-run the schema files for the affected tables to recreate RLS policies:

1. `001-external-identities.sql` (now `user_auth_ext_ids`)
2. `006-user-provisioning.sql` (includes `user_invites` and `org_email_domains`)

**OR** create a new migration that explicitly recreates the RLS policies for the renamed tables.

---

## Issue #2: Missing Provider Context

### Symptoms

Lambda logs show:
```
[WARNING] Unable to detect auth provider from JWT claims, defaulting to clerk. 
Claims: ['user_id', 'email', 'name', 'given_name', 'family_name', 'phone_number']
```

But the authorizer context actually includes:
```json
"authorizer": {
  "lambda": {
    "email": "Aaron.Kilinski@simpletechnology.io",
    "name": "Aaron Kilinski",
    "provider": "okta",  ← This field exists but is NOT extracted!
    "user_id": "Aaron.Kilinski@simpletechnology.io"
  }
}
```

### Root Cause

The `get_user_from_event()` function in `org_common/__init__.py` does NOT extract the `provider` field:

```python
# Current code (MISSING provider field)
user_info = {
    'user_id': user_id,
    'email': context.get('email', ''),
    'name': context.get('name', ''),
    'given_name': context.get('given_name', ''),
    'family_name': context.get('family_name', ''),
    'phone_number': context.get('phone_number', ''),
    # MISSING: 'provider': context.get('provider', '')
}
```

The profiles Lambda then tries to **detect** the provider from JWT claims using `detect_auth_provider()`, but since the original JWT claims aren't passed through, it defaults to "clerk" incorrectly.

### Impact

- User records are created with `provider_name='clerk'` instead of `'okta'`
- Auth event logging records wrong provider
- Lookup queries may fail if they filter by provider
- Analytics and troubleshooting data is incorrect

### Fix Required

Add `'provider': context.get('provider', '')` to the `user_info` dict in `get_user_from_event()`.

Update `detect_auth_provider()` to check for the provider field first:

```python
def detect_auth_provider(user_info: Dict[str, Any]) -> str:
    # First, check if provider is already set by authorizer
    if 'provider' in user_info and user_info['provider']:
        return user_info['provider']
    
    # Fallback: try to detect from JWT claims
    # ... existing detection logic ...
```

---

## Issue #3: Stale RPC Functions

### Symptoms

Lambda logs show:
```
Failed to log bootstrap event: 
{'message': 'relation "public.auth_event_log" does not exist', 'code': '42P01'}
```

### Root Cause

The `log_auth_event()` RPC function in the database still references the **old table name** `auth_event_log` instead of the new name `user_auth_log`.

From Phase 11 documentation:
- Table was renamed: `auth_event_log` → `user_auth_log`
- But the RPC function was **not recreated** with the new table name

### Impact

- Auth events are not being logged (bootstrap, provisioning, login, logout)
- No audit trail of authentication activity
- Session tracking functionality broken
- Cannot monitor or troubleshoot auth issues

### Fix Required

Re-run the schema file `007-auth-events-sessions.sql` in Supabase SQL Editor to recreate:
- `log_auth_event()` function (with correct table name)
- `start_user_session()` function
- `end_user_session()` function
- `get_active_sessions()` function

---

## How These Issues Interact

```
User logs in with Okta
    ↓
Authorizer validates JWT ✅
    ↓
Authorizer passes context with provider='okta' ✅
    ↓
Profiles Lambda receives request
    ↓
Lambda calls get_user_from_event()
    ├─ Extracts user_id, email, name ✅
    └─ MISSING: provider field ❌
    ↓
Lambda tries to find user in user_auth_ext_ids
    ↓
RLS policy blocks query → 406 Not Acceptable ❌
    ↓
Lambda thinks user doesn't exist
    ↓
Lambda calls auto_provision_user()
    ↓
Lambda tries to check user_invites → 406 ❌
    ↓
Lambda tries to check org_email_domains → 406 ❌
    ↓
Lambda tries to create user in auth.users
    ↓
Supabase rejects: "User already exists" ❌
    ↓
Lambda returns 500 error
    ↓
Frontend receives 500 on GET /profiles/me
    ↓
useSession() status = "unauthenticated"
    ↓
UI shows sign-in prompt
    ↓
REDIRECT LOOP 🔄
```

---

## Fix Priority

### Critical (Must Fix First)

**1. RLS Policies on Renamed Tables** (Blocks everything)
- Impact: HIGH - All queries failing
- Effort: LOW - Re-run schema files
- File: `001-external-identities.sql`, `006-user-provisioning.sql`

### High Priority

**2. Provider Field Extraction** (Data integrity)
- Impact: MEDIUM - Wrong provider recorded
- Effort: LOW - Add one line of code
- File: `org_common/__init__.py`

### Medium Priority

**3. RPC Function Recreation** (Logging/monitoring)
- Impact: MEDIUM - No audit trail
- Effort: LOW - Re-run schema file
- File: `007-auth-events-sessions.sql`

---

## Recommended Fix Sequence

### Step 1: Fix RLS Policies (CRITICAL)

**Action:** Re-run schema files in Supabase SQL Editor

```sql
-- Re-run BOTH of these files in Supabase SQL Editor:
-- 1. templates/_cora-core-modules/module-access/db/schema/001-external-identities.sql
-- 2. templates/_cora-core-modules/module-access/db/schema/006-user-provisioning.sql
```

**Why:** This will recreate RLS policies for `user_auth_ext_ids`, `user_invites`, and `org_email_domains` tables.

**Verification:**
```bash
# After re-running schemas, test the query manually:
AWS_PROFILE=ai-sec-nonprod aws logs tail /aws/lambda/ai-sec-dev-access-profiles --region us-east-1 --since 2m --format short

# Should see 200 OK instead of 406 errors
```

### Step 2: Fix Provider Extraction

**Action:** Update `get_user_from_event()` in template

**File:** `templates/_cora-core-modules/module-access/backend/layers/org-common/python/org_common/__init__.py`

**Change:**
```python
# Add this line to the user_info dict:
'provider': context.get('provider', '')
```

**Then:** Rebuild Lambda layers and deploy

### Step 3: Fix RPC Functions

**Action:** Re-run auth events schema

```sql
-- Re-run this file in Supabase SQL Editor:
-- templates/_cora-core-modules/module-access/db/schema/007-auth-events-sessions.sql
```

**Verification:**
```bash
# Check Lambda logs for successful event logging:
# Should see "Logged bootstrap event" instead of table not found error
```

---

## Testing Plan

After applying all fixes:

1. **Delete user from database:**
   - Delete from `user_profiles`
   - Delete from `user_auth_ext_ids`
   - Keep user in `auth.users` (simulates existing auth user)

2. **Test authentication flow:**
   - Log in with Okta
   - Verify no 406 errors in Lambda logs
   - Verify user found in `user_auth_ext_ids` (200 OK)
   - Verify profile returned successfully
   - Verify provider='okta' in database
   - Verify auth events logged correctly

3. **Verify UI:**
   - No redirect loop
   - Dashboard loads
   - User data displays correctly

---

## Key Learnings

1. **Table Renaming Requires Full Migration** - RLS policies, RPC functions, triggers must all be recreated
2. **Authorizer Context Must Be Fully Extracted** - Don't assume fields are passed through automatically
3. **406 Errors Are NOT Client Issues** - They indicate RLS policy problems, not header/client configuration
4. **Test Each Layer Independently** - Database queries, Lambda functions, frontend separately
5. **Phase 11 Migration Was Incomplete** - Renamed tables but didn't recreate dependent objects

---

## Files to Review/Fix

### Templates (Fix First)

1. `templates/_cora-core-modules/module-access/backend/layers/org-common/python/org_common/__init__.py`
   - Add provider field extraction

2. `templates/_cora-core-modules/module-access/db/schema/001-external-identities.sql`
   - Re-run to recreate RLS policies

3. `templates/_cora-core-modules/module-access/db/schema/006-user-provisioning.sql`
   - Re-run to recreate RLS policies

4. `templates/_cora-core-modules/module-access/db/schema/007-auth-events-sessions.sql`
   - Re-run to recreate RPC functions

### Test Project (Copy Fixes)

1. Copy updated `org_common/__init__.py` to test3
2. Rebuild Lambda layers
3. Deploy updated Lambdas
4. Re-run schema files in Supabase

---

**Status:** ✅ **FIXES IMPLEMENTED** - Ready for deployment and testing  
**Implementation Date:** December 23, 2025, 7:00 PM EST  
**Total Investigation Time:** ~4 hours (Sessions 10-12)  
**Implementation Time:** ~15 minutes

---

## IMPLEMENTATION SUMMARY (Dec 23, 2025, 7:00 PM)

### Fixes Applied ✅

All three interconnected issues have been addressed in the template files:

#### 1. Fixed Provider Field Extraction ✅
**File:** `templates/_cora-core-modules/module-access/backend/layers/org-common/python/org_common/__init__.py`

**Change:** Added `'provider': context.get('provider', '')` to the `user_info` dict in `get_user_from_event()`

```python
user_info = {
    'user_id': user_id,
    'email': context.get('email', ''),
    'name': context.get('name', ''),
    'given_name': context.get('given_name', ''),
    'family_name': context.get('family_name', ''),
    'phone_number': context.get('phone_number', ''),
    'provider': context.get('provider', '')  # ADDED
}
```

**Impact:** Provider will now be correctly extracted from authorizer context and passed to the profiles Lambda, ensuring users are created with the correct provider name (e.g., 'okta' instead of defaulting to 'clerk').

#### 2. Created Migration for RLS Policies & RPC Functions ✅
**File:** `templates/_cora-core-modules/module-access/db/migrations/20251223_fix_rls_policies_and_rpc_functions.sql`

**Purpose:** Comprehensive migration to fix all broken RLS policies and RPC functions from the Phase 11 table renaming.

**Migration Phases:**
1. **Phase 1:** Recreates 5 RLS policies for `user_auth_ext_ids` table
2. **Phase 2:** Recreates 5 RLS policies for `org_email_domains` table
3. **Phase 3:** Recreates 5 RLS policies for `user_invites` table
4. **Phase 4:** Recreates 4 RPC functions:
   - `log_auth_event()` - Now references `user_auth_log` (was `auth_event_log`)
   - `start_user_session()`
   - `end_user_session()`
   - `get_active_sessions()`

**Features:**
- Idempotent - safe to re-run multiple times
- Drops old policies before creating new ones
- Includes verification checks at the end
- Self-documenting with extensive comments

**Impact:** Fixes 406 errors on database queries, allowing Lambda to properly:
- Look up existing users in `user_auth_ext_ids`
- Check for pending invitations in `user_invites`
- Check for domain matches in `org_email_domains`
- Log authentication events to `user_auth_log`

#### 3. Schema Files Already Correct ✅
**Files Verified:**
- `templates/_cora-core-modules/module-access/db/schema/001-external-identities.sql`
- `templates/_cora-core-modules/module-access/db/schema/006-user-provisioning.sql`
- `templates/_cora-core-modules/module-access/db/schema/007-auth-events-sessions.sql`

**Status:** All schema files already use correct table names and have proper RLS policies. New projects will be fine.

---

## Deployment Instructions

### For Existing Deployments (test2, test3, etc.)

1. **Update Lambda Code:**
   ```bash
   cd /path/to/project
   # Rebuild Lambda layers with updated org_common
   ./scripts/build-lambda-layers.sh
   # Deploy updated Lambdas
   ./scripts/deploy-lambdas.sh
   ```

2. **Run Migration in Supabase:**
   - Open Supabase SQL Editor for the project
   - Copy contents of `20251223_fix_rls_policies_and_rpc_functions.sql`
   - Execute the migration
   - Verify success message: "✅ Migration completed successfully!"

3. **Verify Fix:**
   ```bash
   # Watch Lambda logs for the profiles Lambda
   AWS_PROFILE=ai-sec-nonprod aws logs tail /aws/lambda/ai-sec-dev-access-profiles \
     --region us-east-1 --since 2m --format short --follow
   ```

4. **Test Authentication Flow:**
   - Delete test user from database (optional - to test full provisioning)
   - Log in with Okta
   - Verify:
     - ✅ No 406 errors in Lambda logs
     - ✅ User found/created in `user_auth_ext_ids` (200 OK)
     - ✅ Provider='okta' in database
     - ✅ Auth events logged successfully
     - ✅ No redirect loop in UI
     - ✅ Dashboard loads correctly

### For New Projects

No action needed - schema files are already correct. The migration is only required for projects that ran the incomplete Phase 11 table renaming migration.

---

## Files Modified

| File | Type | Purpose |
|------|------|---------|
| `org_common/__init__.py` | Code | Extract provider field from authorizer context |
| `20251223_fix_rls_policies_and_rpc_functions.sql` | Migration | Fix RLS policies and RPC functions for existing deployments |

**Schema files (already correct):**
- ✅ `001-external-identities.sql` 
- ✅ `006-user-provisioning.sql`
- ✅ `007-auth-events-sessions.sql`

---

## Expected Outcomes

### Before Fix ❌
```
User logs in → 
Lambda queries user_auth_ext_ids → 
406 Not Acceptable (RLS blocked) → 
Lambda thinks user doesn't exist → 
Tries to create duplicate user → 
Error 500 → 
Frontend shows "unauthenticated" → 
Redirect loop 🔄
```

### After Fix ✅
```
User logs in → 
Lambda queries user_auth_ext_ids → 
200 OK (RLS allows) → 
User found → 
Profile returned → 
Frontend shows "authenticated" → 
Dashboard loads 🎉
```

---

**Status:** ✅ **READY FOR DEPLOYMENT**  
**Next Step:** Deploy to test2/test3 and verify  
**Updated:** December 23, 2025, 7:00 PM EST

---

## ✅ FINAL RESOLUTION (December 23, 2025, 10:05 PM)

### Status: FULLY RESOLVED - Authentication Working End-to-End

After implementing all diagnosed fixes, the authentication redirect loop has been **completely resolved**.

### The Critical Discovery

The root cause analysis identified 3 interconnected issues, but the **PRIMARY** issue was discovered during implementation:

**Old Supabase Database Missing Default Privileges**

The test2 database (created before Supabase updated their defaults) was missing:
```sql
service_role=arwdDxtm/postgres  ← MISSING!
```

This single missing privilege caused **ALL** 406 errors, even with correct RLS policies and grants.

### Resolution Steps Taken

**Session 12 Evening (PRIMARY FIX):**
1. ✅ Created fresh Supabase database: `https://kxshyoaxjkwvcdmjrfxz.supabase.co`
2. ✅ Verified new database has `service_role` in default privileges
3. ✅ Ran all schema files successfully
4. ✅ Seeded IDP configuration for Okta
5. ✅ Created test3 project with new database
6. ✅ All 406 errors resolved → Backend working!

**Session 13 (SECONDARY FIX):**
1. ✅ Fixed create-cora-project.sh Okta path bug (`.auth.okta.*` not `.okta.*`)
2. ✅ Added OrgProvider to template layout.tsx
3. ✅ App now renders with sidebar and menu → **FULLY WORKING!**

### Results

**Before:**
- ❌ HTTP/2 406 Not Acceptable on all database queries
- ❌ Lambda returns 500 error
- ❌ Frontend redirect loop
- ❌ App completely unusable

**After:**
- ✅ HTTP/2 200 OK on all database queries
- ✅ Profile API returns user data successfully
- ✅ No redirect loop
- ✅ App renders with left sidebar and bottom menu
- ✅ Dashboard loads and displays correctly
- ✅ **AUTHENTICATION WORKING END-TO-END!**

### Key Learnings

1. **Old Supabase Databases May Have Missing Privileges** - Databases created before Supabase updated their defaults may be missing critical `service_role` privileges
2. **406 Errors Don't Always Mean RLS Issues** - Can also indicate missing database-level default privileges
3. **Sometimes Fresh Start is Best** - Creating new database was faster and more reliable than trying to fix old one
4. **Template-First Workflow Critical** - All fixes made to templates ensure future projects work correctly
5. **Provider Hierarchy Matters** - Missing OrgProvider in layout broke entire app even though backend was working

### Time Investment

- **Diagnosis**: ~4 hours (Sessions 10-12 Part 2)
- **Implementation**: ~3 hours (Session 12 Part 3 - new database)
- **Final Fix**: ~20 minutes (Session 13 - OrgProvider)
- **Total**: ~7.3 hours from diagnosis to working solution

### Files Modified (All Sessions)

**Template Fixes:**
1. `scripts/create-cora-project.sh` - Fixed Okta paths, added audience
2. `templates/_project-stack-template/apps/web/app/layout.tsx` - Added OrgProvider
3. `templates/_cora-core-modules/module-access/backend/layers/org-common/python/org_common/__init__.py` - Provider field
4. `templates/_cora-core-modules/module-access/db/schema/*.sql` - Idempotent schemas

**Documentation:**
1. `memory-bank/REDIRECT-LOOP-ROOT-CAUSE-ANALYSIS.md` - This document
2. `memory-bank/activeContext.md` - Session tracking

**New Infrastructure:**
1. New Supabase database with correct default privileges
2. Fresh test3 project with all fixes applied

---

**Final Status:** ✅ **FULLY RESOLVED - AUTHENTICATION WORKING**  
**Resolution Date:** December 23, 2025, 10:05 PM EST  
**Next:** Commit changes and create PR
