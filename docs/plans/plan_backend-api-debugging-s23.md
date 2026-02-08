# Backend API Debugging Plan - Session 23

**Created:** February 7, 2026  
**Status:** In Progress  
**Test Project:** `/Users/aaron/code/bodhix/testing/ws-optim/ai-mod-stack`

---

## Summary

Frontend components are calling the correct API endpoints, but backend Lambdas are returning 500/403 errors.

**Affected Endpoints:**
1. `GET /admin/sys/ai/models` - 500 Internal Server Error
2. `GET /admin/sys/ai/providers` - 500 Internal Server Error
3. `GET /admin/org/access/users` - 403 Forbidden

---

## Investigation Results

### Frontend API Calls (Verified ✅)

**Module-AI (500 errors):**
- Component: `SysAiAdmin.tsx` → `AIEnablementAdmin.tsx` → `ModelsTab.tsx`
- Hook: `useModels()` → `api.getModels()`
- Endpoint: `GET /admin/sys/ai/models`

- Component: `SysAiAdmin.tsx` → `AIEnablementAdmin.tsx` → `ProvidersTab.tsx`
- Hook: `useProviders()` → `api.getProviders()`
- Endpoint: `GET /admin/sys/ai/providers`

**Lambda Code (Verified ✅):**
- Location: `templates/_modules-core/module-ai/backend/lambdas/provider/lambda_function.py`
- Handlers: `handle_get_models()`, `handle_get_all()`
- Routes: Correctly configured in `lambda_handler()`

**Conclusion:** Frontend is calling the correct endpoints. Lambda code exists and looks correct. The 500 errors indicate a runtime exception in the Lambda.

---

## Likely Root Causes

### 1. Database Connection Issues
- Lambda cannot connect to Supabase
- Missing environment variables (SUPABASE_URL, SUPABASE_KEY)
- Network/VPC configuration issues

### 2. Missing Database Tables
- Tables `ai_providers`, `ai_models` don't exist
- Schema migration not run in test environment

### 3. Lambda Deployment Issues
- Lambda code not deployed (still has old/broken code)
- Layer dependency issues (org_common not available)
- Python import errors

### 4. Authentication/Authorization Errors
- User not properly authenticated
- Token not being passed correctly
- Auth helper functions failing

---

## Debugging Steps

### Step 1: Check CloudWatch Logs (PRIORITY)

```bash
# Get recent Lambda logs for provider Lambda
aws logs tail /aws/lambda/ai-mod-provider --since 5m --follow

# Filter for errors
aws logs tail /aws/lambda/ai-mod-provider --since 5m 2>&1 | grep -i error | head -20

# Get specific log stream
aws logs get-log-events \
  --log-group-name /aws/lambda/ai-mod-provider \
  --log-stream-name <stream-name> \
  --limit 50
```

**What to look for:**
- Python stack traces
- Database connection errors
- Import errors (module not found)
- Environment variable errors

### Step 2: Verify Environment Variables

```bash
# Check Lambda configuration
aws lambda get-function-configuration --function-name ai-mod-provider | jq '.Environment.Variables'
```

**Required variables:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AWS_REGION` (auto-set)

### Step 3: Test Lambda Directly

```bash
# Invoke Lambda with test event
aws lambda invoke \
  --function-name ai-mod-provider \
  --payload '{"httpMethod":"GET","path":"/admin/sys/ai/providers","requestContext":{"authorizer":{"claims":{"sub":"test-user-id"}}}}' \
  /tmp/response.json

# Check response
cat /tmp/response.json | jq
```

### Step 4: Verify Database Tables Exist

```bash
# Connect to Supabase and check tables
psql $SUPABASE_URL -c "\dt ai_*"

# Check specific tables
psql $SUPABASE_URL -c "SELECT COUNT(*) FROM ai_providers;"
psql $SUPABASE_URL -c "SELECT COUNT(*) FROM ai_models;"
```

### Step 5: Check Deployed Lambda Code

```bash
# Download deployed Lambda code
aws lambda get-function --function-name ai-mod-provider | jq -r '.Code.Location' | xargs curl -o /tmp/lambda.zip

# Extract and inspect
unzip /tmp/lambda.zip -d /tmp/lambda-code
cat /tmp/lambda-code/lambda_function.py | head -50
```

---

## Next Steps

1. **Get CloudWatch logs** - This will tell us the exact error
2. **Verify environment variables** - Ensure Lambda can connect to DB
3. **Check database tables** - Ensure schema is deployed
4. **Test Lambda directly** - Isolate frontend vs backend issues

---

## 403 Error on `/admin/org/access/users`

**Issue:** Route doesn't exist or is misconfigured.

**Investigation needed:**
1. Check what endpoint OrgAccessAdmin component is calling
2. Verify route exists in API Gateway
3. Check members Lambda handles this route pattern

**Likely cause:** Frontend calling wrong endpoint or route not configured in API Gateway.

---

## Resolution Tracking

- [ ] Get CloudWatch logs for ai-provider Lambda
- [ ] Identify root cause of 500 errors
- [ ] Fix Lambda code or configuration
- [ ] Redeploy Lambda if needed
- [ ] Test `/admin/sys/ai/models` endpoint
- [ ] Test `/admin/sys/ai/providers` endpoint
- [ ] Investigate `/admin/org/access/users` 403 error
- [ ] Verify all admin pages load without errors