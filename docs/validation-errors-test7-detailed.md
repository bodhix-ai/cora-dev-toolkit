# Test7 Detailed Validation Errors
**Generated:** December 27, 2025, 7:55 AM EST
**Purpose:** Detailed error catalog for efficient issue resolution in future AI sessions
**Companion to:** [validation-summary-test7.md](./validation-summary-test7.md)

---

## 📊 Schema Validator Errors

**Total Errors:** 0

✅ No schema errors found.

---

## 🔗 API Tracer Errors

**Total Errors:** 3

### Error 1: route_not_found
- **Severity:** error
- **Type:** route_not_found
- **Endpoint:** `/orgs/{orgId}`
- **Method:** DELETE
- **Frontend File:** `/Users/aaron/code/sts/test7/ai-sec-stack/packages/module-access/frontend/components/admin/OrgMgmt.tsx:135`
- **Details:** N/A
- **Issue:** Frontend calls DELETE /orgs/{orgId} but route doesn't exist in API Gateway
- **Suggestion:** Add route to API Gateway or fix frontend endpoint

### Error 2: route_not_found
- **Severity:** error
- **Type:** route_not_found
- **Endpoint:** `/orgs/${organization.id}`
- **Method:** PUT
- **Frontend File:** `/Users/aaron/code/sts/test7/ai-sec-stack/packages/module-access/frontend/components/admin/OrgMgmt.tsx:521`
- **Details:** N/A
- **Issue:** Frontend calls PUT /orgs/${organization.id} but route doesn't exist in API Gateway
- **Suggestion:** Add route to API Gateway or fix frontend endpoint

### Error 3: missing_lambda_handler
- **Severity:** error
- **Type:** missing_lambda_handler
- **Endpoint:** `/profiles/me/login`
- **Method:** POST
- **Frontend File:** `None:None`
- **Details:** N/A
- **Issue:** API Gateway defines POST /profiles/me/login but no Lambda handler found
- **Suggestion:** Implement Lambda handler for this route (Lambda function: ai-sec-dev-access-profiles)

---

## 🌐 Portability Validator Errors

**Total Errors:** 7

### models.py (5 errors)

**File:** `/Users/aaron/code/sts/test7/ai-sec-stack/packages/module-ai/backend/layers/common-ai/python/ai_common/models.py`

#### Error 1
- **Line:** 38
- **Severity:** error
- **Type:** N/A
- **Issue:** N/A
- **Hardcoded Value:** `426614174000`
- **Suggestion:** Use environment variable or Terraform variable for account ID

#### Error 2
- **Line:** 39
- **Severity:** error
- **Type:** N/A
- **Issue:** N/A
- **Hardcoded Value:** `426614174001`
- **Suggestion:** Use environment variable or Terraform variable for account ID

#### Error 3
- **Line:** 67
- **Severity:** error
- **Type:** N/A
- **Issue:** N/A
- **Hardcoded Value:** `426614174002`
- **Suggestion:** Use environment variable or Terraform variable for account ID

#### Error 4
- **Line:** 91
- **Severity:** error
- **Type:** N/A
- **Issue:** N/A
- **Hardcoded Value:** `426614174000`
- **Suggestion:** Use environment variable or Terraform variable for account ID

#### Error 5
- **Line:** 94
- **Severity:** error
- **Type:** N/A
- **Issue:** N/A
- **Hardcoded Value:** `426614174003`
- **Suggestion:** Use environment variable or Terraform variable for account ID

### 007-org-prompt-engineering.sql (1 errors)

**File:** `/Users/aaron/code/sts/test7/ai-sec-stack/packages/module-ai/db/schema/007-org-prompt-engineering.sql`

#### Error 1
- **Line:** 115
- **Severity:** error
- **Type:** N/A
- **Issue:** N/A
- **Hardcoded Value:** `426614174000`
- **Suggestion:** Use environment variable or Terraform variable for account ID

### setup-database.sql (1 errors)

**File:** `/Users/aaron/code/sts/test7/ai-sec-stack/scripts/setup-database.sql`

#### Error 1
- **Line:** 2385
- **Severity:** error
- **Type:** N/A
- **Issue:** N/A
- **Hardcoded Value:** `426614174000`
- **Suggestion:** Use environment variable or Terraform variable for account ID

