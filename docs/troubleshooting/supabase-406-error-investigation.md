# Supabase 406 Error Investigation - Context Document

**Created:** December 29, 2025, 7:53 PM EST  
**Resolved:** December 30, 2025, 11:43 AM EST  
**Status:** ✅ RESOLVED  
**Severity:** CRITICAL - Users cannot log in (FIXED)

## ⚠️ IMPORTANT: Root Cause Was NOT HTTP/2

The initial investigation focused on HTTP/2 protocol issues due to 406 errors in logs. **This was a misdiagnosis.** The actual root cause was **orphaned users in auth.users table**.

---

## ✅ RESOLUTION SUMMARY

### Actual Root Cause

**Orphaned users in auth.users table** - NOT an HTTP/2 issue.

**What Happened:**
1. Database public tables were reset/dropped (`user_profiles`, `user_auth_ext_ids`)
2. `auth.users` table (Supabase auth schema) was **NOT** reset
3. User existed in `auth.users` but had no corresponding public table records
4. Lambda tried to provision user → found no records → tried to create auth.users entry
5. **Failed with 422 error**: "A user with this email address has already been registered"
6. Login blocked with 500 Internal Server Error

### The 406 Errors Were Red Herrings

- 406 errors on SELECT queries simply indicated **empty results** (no rows found)
- NOT actual failures - supabase-py handles these gracefully
- The critical failure was the **422 error** when trying to create duplicate auth.users record

### Fixes Implemented

**1. Enhanced Lambda Logging**
- Added orphaned user detection with clear error messages
- Added interpretive logging for all empty query results (406 errors)

**2. Database Reset Script Enhancement**
- Updated `drop-all-schema-objects.sql` to delete auth.users FIRST
- Prevents orphaned users on future database resets

**Files Updated:**
- `sts/test14/ai-sec-stack/packages/module-access/backend/lambdas/profiles/lambda_function.py`
- `sts/test14/ai-sec-stack/scripts/drop-all-schema-objects.sql`
- `bodhix/cora-dev-toolkit/templates/_cora-core-modules/module-access/backend/lambdas/profiles/lambda_function.py`
- `bodhix/cora-dev-toolkit/templates/_project-stack-template/scripts/drop-all-schema-objects.sql`

---

## Original Investigation (Misdiagnosis)

The following sections document the original investigation that focused on HTTP/2 issues. This was based on 406 errors in logs, which turned out to be informational rather than the actual failure point.

## Problem Statement

Users getting **500 Internal Server Error** when trying to log in to the application. Lambda logs showed **406 Not Acceptable** errors from Supabase REST API calls.

**Latest Error (Dec 30, 2025 00:52:34 GMT):**
```
GET https://hk5bzq4kv3.execute-api.us-east-1.amazonaws.com/profiles/me
Status Code: 500 Internal Server Error
```

**Lambda Logs Show:**
```
HTTP Request: GET https://kxshyoaxjkwvcdmjrfxz.supabase.co/rest/v1/user_auth_ext_ids?select=%2A&external_id=eq.Aaron.Kilinski%40simpletechnology.io "HTTP/2 406 Not Acceptable"
```

## What We've Ruled Out ✅

### 1. **NOT a Supabase Library Version Issue**
- ✅ Updated requirements.txt from `supabase>=2.3.4` to `supabase==2.27.0`
- ✅ Rebuilt Lambda layer with supabase 2.27.0
- ✅ Deployed as layer version 45
- ✅ Lambda confirmed using layer v45
- ✅ Local testing with Python 3.11 + supabase 2.27.0 works perfectly
- ❌ **Still getting 406 errors in Lambda**

**Evidence:**
```bash
# Local layer build contains:
supabase-2.27.0.dist-info
supabase_auth-2.27.0.dist-info
supabase_functions-2.27.0.dist-info
httpx-0.28.1.dist-info

# Lambda using new layer:
aws lambda get-function-configuration --function-name ai-sec-dev-access-profiles
# Output: arn:aws:lambda:us-east-1:887559014095:layer:ai-sec-dev-access-common:45
```

### 2. **NOT a Python Version Issue**
- ✅ Lambda runtime: Python 3.11 (python:3.11.v109)
- ✅ Local testing: Python 3.11
- ✅ Same Python version in both environments

### 3. **NOT an Architecture Mismatch**
- ✅ Build script has correct platform flags:
  ```bash
  pip3 install -r requirements.txt -t python \
      --platform manylinux2014_x86_64 \
      --python-version 3.11 \
      --implementation cp \
      --only-binary=:all:
  ```
- ✅ Layer built for Linux x86_64 (Lambda's architecture)

### 4. **NOT a Database/Supabase Configuration Issue**
- ✅ Direct curl to Supabase API works:
  ```bash
  curl -X GET "https://kxshyoaxjkwvcdmjrfxz.supabase.co/rest/v1/user_profiles?select=*" \
    -H "apikey: ..." \
    -H "Authorization: Bearer ..." \
    -H "Accept: application/json"
  # Status: 200 OK
  ```
- ✅ Same Supabase credentials work locally

### 5. **NOT a Layer Deployment Issue**
- ✅ Layer uploaded to S3
- ✅ Lambda layer version 45 created
- ✅ Lambda functions updated to use v45
- ✅ Deployment completed successfully
- ✅ Tested after deployment - issue persists

## Current Hypothesis: HTTP Client Configuration Issue

### Key Observation: HTTP/2 vs HTTP/1.1

**Lambda logs show:**
```
HTTP Request: GET ... "HTTP/2 406 Not Acceptable"
```

The supabase-py library (via httpx) is using **HTTP/2** in Lambda, and Supabase is returning **406 Not Acceptable**.

**406 Not Acceptable** means: *"The server cannot produce a response matching the acceptable values defined in the request's Accept header."*

### Differences Between Environments

| Aspect | Local (Works ✅) | Lambda (Fails ❌) |
|--------|-----------------|------------------|
| Python Version | 3.11 | 3.11 |
| Supabase Version | 2.27.0 | 2.27.0 |
| httpx Version | 0.28.1 | 0.28.1 |
| Architecture | ARM64 (Mac) | x86_64 (Linux) |
| HTTP Protocol | ? | HTTP/2 |
| Environment | Development | AWS Lambda |

## Investigation Areas for Next Task

### 1. **HTTP/2 Configuration Issue** (LIKELY)
- Lambda environment might have HTTP/2 compatibility issues
- httpx might be configured differently in Lambda vs local
- Supabase API might reject certain HTTP/2 requests from Lambda

**Next Steps:**
- Check if disabling HTTP/2 in httpx resolves the issue
- Configure supabase client to use HTTP/1.1 explicitly
- Compare request headers between local and Lambda

### 2. **Request Headers** (LIKELY)
- The curl command explicitly included `Accept: application/json` and worked
- supabase-py might not be setting correct Accept header in Lambda
- httpx might be setting different default headers in Lambda environment

**Next Steps:**
- Log the actual HTTP request headers being sent in Lambda
- Compare with successful curl request headers
- Explicitly set Accept header in client configuration

### 3. **httpx Client Configuration** (POSSIBLE)
- httpx uses HTTP/2 by default when `http2` extra is installed
- Lambda environment might have different SSL/TLS settings
- httpx might be picking up different system certificates

**Next Steps:**
- Create custom httpx client with explicit configuration
- Disable HTTP/2 in httpx
- Configure custom headers and SSL settings

## File Locations

### Key Files Modified
```
sts/test14/ai-sec-stack/packages/module-access/backend/
├── layers/org-common/
│   ├── requirements.txt          # Updated: supabase==2.27.0
│   └── python/org_common/
│       └── supabase_client.py    # Client initialization code
├── build.sh                       # Build script (has platform flags)
└── .build/
    ├── org-common-layer.zip      # Built layer (30MB)
    └── layer-build/python/       # Layer contents
        ├── supabase-2.27.0.dist-info/
        ├── supabase_auth-2.27.0.dist-info/
        ├── supabase_functions-2.27.0.dist-info/
        └── httpx-0.28.1.dist-info/
```

### Template Files Also Updated
```
bodhix/cora-dev-toolkit/templates/_cora-core-modules/module-access/
├── backend/layers/org-common/requirements.txt    # Updated: supabase==2.27.0
└── backend/layers/org-common/python/org_common/supabase_client.py
```

## Testing Evidence

### Local Test Results (Python 3.11)
```python
# With supabase 2.27.0
TEST 2: Official supabase-py client (create_client)
✅ Query succeeded!
✅ Response: data=[] count=None

# With supabase 2.3.4
TEST 2: Official supabase-py client (create_client)
❌ Error: Client.__init__() got an unexpected keyword argument 'proxy'
```

### Lambda Test Results (After Deployment)
```
Latest test: Dec 30, 2025 00:52:34 GMT
Status: 500 Internal Server Error
Lambda logs: "HTTP/2 406 Not Acceptable"
```

## ✅ Actual Solution Implemented

### Fix 1: Enhanced Lambda Logging

Added orphaned user detection in `lambda_function.py`:

```python
except Exception as e:
    error_msg = str(e)
    logger.error(f"Error creating auth.users record: {error_msg}")
    
    # Detect orphaned user scenario
    if "already been registered" in error_msg.lower():
        logger.error(f"ORPHANED USER DETECTED: Email {email} exists in auth.users but has no user_auth_ext_ids or user_profiles records.")
        logger.error("This usually happens when public tables are reset but auth.users is not cleaned up.")
        logger.error(f"To fix: DELETE FROM auth.users WHERE email = '{email}' OR run drop-all-schema-objects.sql before setup-database.sql")
    
    raise
```

Added interpretive logging for 406 errors:

```python
# For user_invites query
if invite:
    logger.info(f"Found pending invite for {redacted_email}")
else:
    logger.info(f"No pending invite found for {redacted_email}")

# For org_email_domains query  
if domain_match:
    logger.info(f"Found domain match for {domain}")
else:
    logger.info(f"No email domain match found for {domain}")

# For platform_owner check
if not platform_owner:
    logger.info(f"No platform_owner exists - bootstrap condition met for {redacted_email}")
else:
    logger.info(f"Platform already initialized (platform_owner exists)")
```

### Fix 2: Database Reset Script

Updated `drop-all-schema-objects.sql`:

```sql
-- =============================================
-- DELETE ALL AUTH USERS (Supabase auth schema)
-- =============================================
-- CRITICAL: Delete auth.users FIRST to prevent orphaned users
-- This must happen before dropping public tables to avoid foreign key issues

DELETE FROM auth.users;

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Deleted all users from auth.users';
    RAISE NOTICE 'This prevents orphaned users when public tables are reset';
    RAISE NOTICE '============================================';
END $$;
```

### Immediate Fix (Manual)

To resolve the immediate issue:

```sql
-- Run in Supabase SQL Editor
DELETE FROM auth.users WHERE email = 'aaron.kilinski@simpletechnology.io';

-- OR delete all users
DELETE FROM auth.users;
```

## ❌ What Didn't Work (Original Investigation)

The following approaches were investigated but were not the solution:

### ❌ Approach 1: Disable HTTP/2 (Not Needed)
### ❌ Approach 2: Set Explicit Headers (Not Needed)
### ❌ Approach 3: Use Custom httpx Configuration (Not Needed)

These approaches targeted the 406 errors, which were not the actual problem.

## AWS Resources

- **Lambda Function:** `ai-sec-dev-access-profiles`
- **Lambda Layer:** `ai-sec-dev-access-common:45`
- **Region:** us-east-1
- **AWS Profile:** ai-sec-nonprod
- **API Gateway:** hk5bzq4kv3.execute-api.us-east-1.amazonaws.com

## ✅ Success Criteria (All Met)

- ✅ Users can successfully log in to the application
- ✅ Bootstrap user provisioning works correctly
- ✅ No 500 errors returned to frontend
- ✅ Profile creation/retrieval works correctly
- ✅ Clear logging for future debugging

## Lessons Learned

1. **Focus on the actual error, not the noise** - The 422 error was the critical failure, not the 406 errors
2. **406 errors on SELECT queries = empty results** - Not actual failures in this context
3. **Database resets must include auth.users** - Orphaned users block provisioning
4. **Clear error messages save debugging time** - Enhanced logging now detects orphaned users immediately

---

**Investigation Status:** ✅ RESOLVED  
**Resolution Date:** December 30, 2025, 11:43 AM EST  
**Files Updated:** 4 files (test14 + templates)  
**Impact:** Future projects inherit orphaned user prevention
