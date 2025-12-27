# Phase 14: Session Tracking Troubleshooting Guide

**Date:** December 20, 2025
**Issue:** SessionTracking component not calling login endpoint
**Status:** DEBUGGING

---

## Quick Diagnosis Checklist

Run through these checks in order to identify the issue:

### 1. Verify Dev Server Restarted with Latest Code

**Check build output:**
```bash
# In terminal where dev server is running, look for:
- "compiled successfully" message
- No TypeScript errors about SessionTracking
- Build timestamp should be recent (within last 5 minutes)
```

**If build is old or shows errors:**
```bash
cd /Users/aaron/code/sts/security/ai-sec-stack
pkill -f "next dev"
rm -rf .next  # Clear Next.js cache
pnpm install  # Ensure deps are up to date
./scripts/start-dev.sh
```

---

### 2. Check Browser Console Logs

**Action:** Open browser console (F12 → Console tab)

**What to look for:**

✅ **SUCCESS - You should see:**
```
[SessionTracking] Login tracked, session ID: <some-uuid>
```

❌ **PROBLEM - If you see:**
```
Error: Cannot find module '@ai-sec/api-client'
Error: Module not found: Can't resolve 'module-access'
```
→ **Solution:** Run `pnpm install` and restart dev server

❌ **PROBLEM - If you see:**
```
[SessionTracking] No auth token available for login tracking
```
→ **Solution:** Check that authAdapter.getToken() is working (see Step 4)

❌ **PROBLEM - If you see NOTHING about SessionTracking:**
→ **Solution:** Component isn't rendering (see Step 3)

---

### 3. Verify SessionTracking Component is Rendering

**Add debug logging to SessionTracking:**

Edit: `/Users/aaron/code/sts/security/ai-sec-stack/packages/module-access/frontend/components/SessionTracking.tsx`

Add this at the top of the component function:
```typescript
export function SessionTracking() {
  const { profile, isAuthenticated, authAdapter } = useUser();
  
  // ADD THESE DEBUG LOGS
  console.log("[SessionTracking] Component rendered");
  console.log("[SessionTracking] isAuthenticated:", isAuthenticated);
  console.log("[SessionTracking] profile:", profile);
  console.log("[SessionTracking] authAdapter:", authAdapter);
  
  const loginTrackedRef = useRef(false);
  // ... rest of component
```

**Restart dev server and check console:**
- If you DON'T see `[SessionTracking] Component rendered`, the component isn't being loaded
- If you see it but `isAuthenticated` is false or `profile` is null, the UserContext isn't working

---

### 4. Check UserContext Integration

**Verify UserProvider is passing authAdapter:**

Edit: `/Users/aaron/code/sts/security/ai-sec-stack/packages/module-access/frontend/contexts/UserContext.tsx`

Look for where UserProvider returns its value:
```typescript
return (
  <UserContext.Provider value={{ 
    profile, 
    isAuthenticated, 
    authAdapter,  // ← This MUST be here
    loading 
  }}>
    {children}
  </UserContext.Provider>
);
```

If `authAdapter` is missing, add it:
```typescript
const authAdapter = useAuthAdapter();  // Get from auth hook
```

---

### 5. Check Lambda Logs (After Browser Test)

**Only do this after confirming SessionTracking is rendering in browser console.**

```bash
# Check recent Lambda logs
aws logs tail /aws/lambda/ai-sec-dev-access-profiles \
  --profile ai-sec-nonprod \
  --region us-east-1 \
  --since 5m | grep -E "(login endpoint|POST /profiles/me)"
```

**What you should see:**
```
Handling login endpoint for user...
Started session for user...
```

**If you see nothing:**
- The frontend isn't calling the endpoint (go back to Step 2-3)

---

### 6. Verify Export from module-access

**Check that SessionTracking is exported:**

```bash
# Check the index.ts file
cat /Users/aaron/code/sts/security/ai-sec-stack/packages/module-access/frontend/index.ts | grep SessionTracking
```

**Should output:**
```typescript
export { SessionTracking } from "./components/SessionTracking";
```

**If missing, add it:**
```typescript
// In /Users/aaron/code/sts/security/ai-sec-stack/packages/module-access/frontend/index.ts
export { SessionTracking } from "./components/SessionTracking";
```

---

### 7. Check for Import Errors

**Look for module resolution errors:**

```bash
# In the dev server terminal output, look for:
"Module not found: Can't resolve 'module-access'"
"Cannot find module 'SessionTracking'"
```

**If you see these:**
```bash
cd /Users/aaron/code/sts/security/ai-sec-stack
pnpm install
rm -rf .next
./scripts/start-dev.sh
```

---

## Common Issues & Solutions

### Issue 1: Component Renders but No Login Call

**Symptoms:**
- Console shows `[SessionTracking] Component rendered`
- But NO `Login tracked` message
- No network call to `/profiles/me/login`

**Possible Causes:**

**A. useEffect dependencies not triggering:**
```typescript
// Check if this useEffect is running
useEffect(() => {
  console.log("[SessionTracking] useEffect triggered");
  // ... rest of code
}, [isAuthenticated, profile, authAdapter]);
```

**B. loginTrackedRef preventing re-runs:**
```typescript
// Add logging
if (loginTrackedRef.current) {
  console.log("[SessionTracking] Login already tracked, skipping");
  return;
}
```

**C. isAuthenticated or profile not set:**
```typescript
if (!isAuthenticated || !profile) {
  console.log("[SessionTracking] Waiting for auth:", { isAuthenticated, profile });
  return;
}
```

---

### Issue 2: "Cannot find module '@ai-sec/api-client'"

**Solution:**
```bash
cd /Users/aaron/code/sts/security/ai-sec-stack
pnpm install
```

The api-client package exists but TypeScript can't find it. Running `pnpm install` will regenerate the dependency links.

---

### Issue 3: SessionTracking Not Exported

**Check:**
```bash
cat /Users/aaron/code/sts/security/ai-sec-stack/packages/module-access/frontend/index.ts
```

**Add if missing:**
```typescript
export { SessionTracking } from "./components/SessionTracking";
```

**Then:**
```bash
cd /Users/aaron/code/sts/security/ai-sec-stack
pkill -f "next dev"
./scripts/start-dev.sh
```

---

### Issue 4: UserProvider Not Passing authAdapter

**Check UserContext.tsx:**

```typescript
// This MUST be in the UserProvider return value
<UserContext.Provider value={{ 
  profile, 
  isAuthenticated, 
  authAdapter,  // ← Required!
  loading 
}}>
```

**If missing, add it:**
```typescript
const authAdapter = useAuthAdapter(); // Or however it's obtained
```

---

## Step-by-Step Debug Process

### Step 1: Browser Console Check

1. Open http://localhost:3000
2. Open DevTools (F12)
3. Go to Console tab
4. Refresh page
5. Look for `[SessionTracking]` logs

**If NO SessionTracking logs → Go to Step 2**
**If SessionTracking logs but no "Login tracked" → Go to Step 3**

---

### Step 2: Add Debug Logging

Add console.logs to SessionTracking.tsx as shown in section 3 above, then:

```bash
cd /Users/aaron/code/sts/security/ai-sec-stack
pkill -f "next dev"
./scripts/start-dev.sh
```

Refresh browser and check console again.

---

### Step 3: Check Network Tab

1. Open DevTools Network tab
2. Filter by "login"
3. Refresh page
4. Look for `POST /profiles/me/login`

**If request exists:**
- Check response status (should be 200)
- Check response body for sessionId
- If 404: Lambda endpoint not deployed
- If 500: Check Lambda logs

**If request DOESN'T exist:**
- Frontend not calling the endpoint
- Check browser console for errors
- Add more debug logging to trackLogin function

---

### Step 4: Lambda Logs Check

```bash
# Recent logs
aws logs tail /aws/lambda/ai-sec-dev-access-profiles \
  --profile ai-sec-nonprod \
  --region us-east-1 \
  --since 10m

# Filter for login endpoint
aws logs tail /aws/lambda/ai-sec-dev-access-profiles \
  --profile ai-sec-nonprod \
  --region us-east-1 \
  --since 10m | grep "login"
```

**What to look for:**
- `Handling login endpoint`
- `Started session for user`
- `POST /profiles/me/login`

---

## Nuclear Option: Complete Rebuild

If nothing else works:

```bash
cd /Users/aaron/code/sts/security/ai-sec-stack

# Kill all dev processes
pkill -f "next dev"

# Clear all caches
rm -rf .next
rm -rf node_modules/.cache

# Reinstall dependencies
pnpm install

# Rebuild
pnpm build

# Start fresh
./scripts/start-dev.sh
```

Then test again from scratch.

---

## Verification Checklist

After troubleshooting, verify ALL of these:

- [ ] Dev server running with recent build timestamp
- [ ] No TypeScript errors in build output
- [ ] Browser console shows `[SessionTracking] Component rendered`
- [ ] Browser console shows `[SessionTracking] Login tracked, session ID: <uuid>`
- [ ] Network tab shows `POST /profiles/me/login` request (status 200)
- [ ] Lambda logs show `Handling login endpoint` message
- [ ] Database has record in `user_sessions` table
- [ ] Database has record in `user_auth_log` table

---

## Get More Help

If still not working after all troubleshooting:

1. Capture full browser console output (copy/paste all)
2. Capture Lambda logs for last 10 minutes
3. Capture build output from dev server terminal
4. Share all three outputs for further diagnosis

---

**Document Version:** 1.0  
**Created:** December 20, 2025  
**Status:** Active Troubleshooting Guide
