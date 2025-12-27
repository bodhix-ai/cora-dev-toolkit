# Phase 14: Session Tracking Deployment & Testing Guide

**Date:** December 20, 2025  
**Status:** ✅ Frontend Implementation Complete - Ready for Deployment  
**Priority:** HIGH - Enables audit trail and session monitoring

---

## Overview

Phase 14 implements comprehensive session tracking for login/logout events. This provides an audit trail for security compliance and enables session duration monitoring for analytics.

### What Was Implemented

**Frontend Components:**
1. ✅ `SessionTracking.tsx` - Automatically tracks login/logout events
2. ✅ Updated `layout.tsx` - Integrated SessionTracking component
3. ✅ Updated `index.ts` - Exported SessionTracking component

**Backend Endpoints:**
1. ✅ `POST /profiles/me/login` - Creates session and logs login event
2. ✅ `POST /profiles/me/logout` - Ends sessions and logs logout event

**Database Schema:**
1. ✅ `user_auth_log` table - Auth event logging
2. ✅ `user_sessions` table - Session duration tracking
3. ⚠️ **CRITICAL:** Schema function needs re-run (see Step 1 below)

---

## Deployment Steps

### Step 1: Re-run Database Schema (CRITICAL - DO THIS FIRST)

**Why:** The `log_auth_event()` function still references the old table name `auth_event_log` instead of `user_auth_log`. This must be fixed before deploying Lambda updates.

**Current Error in Logs:**
```
Failed to log bootstrap event: 
{'message': 'relation "public.auth_event_log" does not exist', 'code': '42P01'}
```

**Solution:**

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/jowgabouzahkbmtvyyjy/sql

2. Copy the entire contents of the schema file:
   ```bash
   # Location in toolkit
   cora-dev-toolkit/templates/_cora-core-modules/module-access/db/schema/007-auth-events-sessions.sql
   ```

3. Paste into SQL Editor and click **Run**

4. Verify function was recreated:
   ```sql
   -- Verify log_auth_event function references correct table
   SELECT routine_name, routine_definition 
   FROM information_schema.routines 
   WHERE routine_name = 'log_auth_event';
   ```

5. Expected output should contain `public.user_auth_log` (NOT `auth_event_log`)

**Estimated Time:** 2 minutes

---

### Step 2: Deploy Lambda Updates

The Lambda packages have already been built with the latest code changes. Now deploy them to AWS.

**Command:**
```bash
cd /Users/aaron/code/sts/security/ai-sec-infra
./scripts/deploy-cora-modules.sh dev
```

**What This Does:**
- Uploads updated Lambda packages to S3
- Updates Lambda function code in AWS
- Deploys login/logout endpoints
- Enables session tracking and auth event logging

**Expected Output:**
```
[INFO] Deploying to environment: dev
[INFO] Uploading module-access artifacts...
✓ Uploaded profiles.zip
✓ Uploaded org-common-layer.zip
[INFO] Deployment complete
```

**Estimated Time:** 3-5 minutes

---

### Step 3: Restart Frontend Dev Server

The frontend code changes have been copied to ai-sec-stack. Restart the dev server to load them.

**Command:**
```bash
cd /Users/aaron/code/sts/security/ai-sec-stack
pnpm install  # Install any new dependencies
./scripts/start-dev.sh
```

**What This Does:**
- Installs any updated dependencies
- Loads SessionTracking component
- Starts dev server on port 3010

**Expected Output:**
```
> ai-sec@0.1.0 dev
> next dev -p 3010

  ▲ Next.js 14.x.x
  - Local:        http://localhost:3010
  - ready in 2.5s
```

**Estimated Time:** 1-2 minutes

---

## Testing Procedure

### Test 1: Fresh User Login (Bootstrap Scenario)

**Purpose:** Verify session tracking works on new user auto-provisioning

**Steps:**

1. **Delete existing user profile:**
   ```sql
   -- In Supabase SQL Editor
   DELETE FROM public.user_profiles WHERE email = 'your-email@example.com';
   DELETE FROM public.user_auth_ext_ids WHERE email = 'your-email@example.com';
   DELETE FROM auth.users WHERE email = 'your-email@example.com';
   ```

2. **Log in fresh:**
   - Navigate to http://localhost:3010
   - Click "Sign In"
   - Complete Okta authentication

3. **Verify auto-provisioning:**
   - Check browser console for: `[SessionTracking] Login tracked, session ID: <uuid>`
   - Should see profile loaded successfully

4. **Verify database records:**
   ```sql
   -- Check user_sessions table
   SELECT * FROM public.user_sessions 
   WHERE user_id = (
     SELECT user_id FROM public.user_profiles 
     WHERE email = 'your-email@example.com'
   )
   ORDER BY started_at DESC;
   
   -- Check user_auth_log table
   SELECT * FROM public.user_auth_log 
   WHERE user_email = 'your-email@example.com'
   ORDER BY occurred_at DESC;
   ```

5. **Expected Results:**
   - ✅ One session record in `user_sessions` table
   - ✅ Session has `started_at` timestamp
   - ✅ Session has `ended_at = NULL` (active)
   - ✅ Two events in `user_auth_log`:
     - `bootstrap_created` event (from auto-provisioning)
     - `login_success` event (from SessionTracking)

---

### Test 2: Logout Flow

**Purpose:** Verify logout endpoint ends sessions and logs event

**Steps:**

1. **Click logout in UI:**
   - Click user menu in top right
   - Click "Sign Out"

2. **Verify browser console:**
   - Should see: `[SessionTracking] Logout tracked`

3. **Verify database records:**
   ```sql
   -- Check session was ended
   SELECT * FROM public.user_sessions 
   WHERE user_id = (
     SELECT user_id FROM public.user_profiles 
     WHERE email = 'your-email@example.com'
   )
   ORDER BY started_at DESC
   LIMIT 1;
   
   -- Check logout event was logged
   SELECT * FROM public.user_auth_log 
   WHERE user_email = 'your-email@example.com'
   AND event_type = 'logout'
   ORDER BY occurred_at DESC
   LIMIT 1;
   ```

4. **Expected Results:**
   - ✅ Session has `ended_at` timestamp (no longer NULL)
   - ✅ Session duration calculated (seconds between started_at and ended_at)
   - ✅ `logout` event in `user_auth_log` table

---

### Test 3: Returning User Login

**Purpose:** Verify session tracking works for existing users

**Steps:**

1. **Log in again:**
   - Navigate to http://localhost:3010
   - Sign in with same user

2. **Verify browser console:**
   - Should see: `[SessionTracking] Login tracked, session ID: <uuid>`

3. **Verify database records:**
   ```sql
   -- Check for new session
   SELECT * FROM public.user_sessions 
   WHERE user_id = (
     SELECT user_id FROM public.user_profiles 
     WHERE email = 'your-email@example.com'
   )
   ORDER BY started_at DESC;
   ```

4. **Expected Results:**
   - ✅ NEW session record created
   - ✅ Previous session still has `ended_at` timestamp
   - ✅ New session has `ended_at = NULL` (active)
   - ✅ New `login_success` event in `user_auth_log`

---

### Test 4: Check Lambda Logs

**Purpose:** Verify auth event logging is working (no errors)

**Command:**
```bash
aws logs tail /aws/lambda/ai-sec-dev-access-profiles \
  --profile ai-sec-nonprod \
  --region us-east-1 \
  --since 10m | grep -E "(Failed to log|Started session|login_success)"
```

**Expected Output:**
```
[INFO] Started session for user xxx, session ID: <uuid>
[INFO] Logged login_success event
```

**Should NOT See:**
```
❌ Failed to log bootstrap event: relation "public.auth_event_log" does not exist
```

**If you still see errors:**
- Go back to Step 1 and re-run the schema file
- Verify the function definition includes `public.user_auth_log`

---

## Troubleshooting

### Issue: "Failed to log" errors in Lambda logs

**Cause:** Schema function not updated with correct table name

**Solution:**
1. Re-run `007-auth-events-sessions.sql` in Supabase SQL Editor
2. Verify function references `user_auth_log` (not `auth_event_log`)
3. Redeploy Lambda packages

---

### Issue: SessionTracking not calling login endpoint

**Cause:** UserProvider may not be passing authAdapter correctly

**Solution:**
1. Check browser console for errors
2. Verify `useUser()` hook returns `authAdapter`
3. Check network tab for `/profiles/me/login` POST request

---

### Issue: Sessions not being created in database

**Cause:** RLS policies may be blocking service role inserts

**Solution:**
```sql
-- Verify service role policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'user_sessions' 
AND policyname = 'user_sessions_service_role';
```

Expected: Policy should exist with `roles = '{service_role}'`

---

### Issue: Duplicate login calls

**Cause:** React Strict Mode in development (intentional behavior)

**Solution:** This is NORMAL in development. Production only makes one call.

**Verification:**
- Check `loginTrackedRef.current` prevents duplicate session creation
- Only ONE session should be created despite multiple component renders

---

## Validation Checklist

Before considering Phase 14 complete, verify all of these:

### Database
- [ ] `user_auth_log` table exists
- [ ] `user_sessions` table exists
- [ ] `log_auth_event()` function references `user_auth_log` (not `auth_event_log`)
- [ ] RLS policies allow service role to insert records

### Lambda Functions
- [ ] Login endpoint deployed: `POST /profiles/me/login`
- [ ] Logout endpoint deployed: `POST /profiles/me/logout`
- [ ] Lambda logs show NO "Failed to log" errors
- [ ] Lambda logs show "Started session" messages

### Frontend
- [ ] SessionTracking component exported from module-access
- [ ] SessionTracking integrated in layout.tsx
- [ ] Browser console shows login tracking messages
- [ ] Browser console shows logout tracking messages
- [ ] No JavaScript errors in console

### End-to-End Flow
- [ ] Fresh user login creates session record
- [ ] Fresh user login logs `bootstrap_created` and `login_success` events
- [ ] Logout ends session (sets `ended_at`)
- [ ] Logout logs `logout` event
- [ ] Returning user login creates NEW session
- [ ] Session duration calculated correctly

---

## Performance Considerations

### Expected Performance

**Login Endpoint:**
- Target: < 200ms response time
- Creates 1 session record
- Logs 1 auth event

**Logout Endpoint:**
- Target: < 150ms response time
- Updates N session records (ends all active sessions)
- Logs 1 auth event

**Frontend Impact:**
- Zero visual delay (non-blocking API calls)
- Runs in background after profile loads

### Database Indexes

All necessary indexes are already created in the schema:

```sql
-- Session tracking indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, last_activity_at)
    WHERE ended_at IS NULL;

-- Auth event indexes  
CREATE INDEX idx_user_auth_log_user_id ON user_auth_log(user_id);
CREATE INDEX idx_user_auth_log_occurred_at ON user_auth_log(occurred_at DESC);
```

These ensure fast queries even with millions of session/event records.

---

## Next Steps After Deployment

Once Phase 14 is deployed and tested:

1. **Monitor session data:**
   ```sql
   -- Active users
   SELECT COUNT(*) FROM user_sessions WHERE ended_at IS NULL;
   
   -- Average session duration
   SELECT AVG(session_duration_seconds / 60) as avg_minutes
   FROM user_sessions WHERE ended_at IS NOT NULL;
   ```

2. **Set up CloudWatch alerts:**
   - Alert on "Failed to log" errors
   - Alert on high auth failure rates
   - Monitor session creation rate

3. **Consider session timeout:**
   - Currently sessions stay active until explicit logout
   - Could add cron job to end sessions inactive > 24 hours

4. **Analytics dashboards:**
   - User activity heatmaps
   - Peak usage times
   - Session duration trends

---

## Files Modified

### Templates (CORA Toolkit)
1. `templates/_cora-core-modules/module-access/frontend/components/SessionTracking.tsx` (NEW)
2. `templates/_cora-core-modules/module-access/frontend/index.ts` - Added SessionTracking export
3. `templates/_project-stack-template/apps/web/app/layout.tsx` - Integrated SessionTracking

### ai-sec Project
1. `~/code/sts/security/ai-sec-stack/packages/module-access/frontend/components/SessionTracking.tsx` (NEW)
2. `~/code/sts/security/ai-sec-stack/packages/module-access/frontend/index.ts` - Updated
3. `~/code/sts/security/ai-sec-stack/apps/web/app/layout.tsx` - Updated

### Backend (Already Deployed in Phase 13)
- Login/logout endpoints already implemented
- Schema already created
- Lambda packages already built

---

## Summary

Phase 14 completes the session tracking implementation:

- ✅ **Frontend:** SessionTracking component automatically tracks login/logout
- ✅ **Backend:** Login/logout endpoints create sessions and log events
- ✅ **Database:** Schema ready for audit trail and analytics
- ⚠️ **Critical Step:** Must re-run schema to fix `log_auth_event()` function

**Total Implementation Time:** ~1 hour  
**Deployment Time:** ~10 minutes  
**Testing Time:** ~20 minutes

---

**Document Version:** 1.0  
**Created:** December 20, 2025  
**Author:** AI Assistant  
**Status:** Ready for Deployment
