# CORA Module Development Patterns Checklist

**Purpose:** Ensure consistency across all CORA modules by following established patterns from org-module (the reference implementation).

**When to use:** Before implementing ANY backend Lambda functionality in a new module.

---

## Pre-Implementation Checklist

Before writing any Lambda code, complete this checklist:

- [ ] **Read org-module reference implementation**

  - Review `packages/org-module/backend/layers/org-common/` for established patterns
  - Check `packages/org-module/backend/lambdas/` for example Lambda implementations
  - Understand the helper functions available in org-common

- [ ] **Identify which patterns apply to your module**

  - Database queries? → Use `org-common/db.py` helpers
  - Supabase connection? → Use `org-common/supabase_client.py`
  - API responses? → Use `org-common/responses.py`
  - Input validation? → Use `org-common/validators.py`
  - Error handling? → Use `org-common/errors.py`

- [ ] **Document any new patterns you create**
  - If you create a new pattern not in org-common, document it
  - Consider whether it should be added to org-common for reuse
  - Update this checklist if a new common pattern emerges

---

## Established Patterns Reference

### 1. Supabase Client Initialization

**❌ WRONG (Direct implementation):**

```python
from supabase import create_client, Client

def get_supabase_client():
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    return create_client(supabase_url, supabase_key)
```

**✅ CORRECT (Following org-common pattern):**

```python
from org_common.supabase_client import get_supabase_client

# Use the established helper
supabase = get_supabase_client(user_jwt=None)  # Service role
# OR
supabase = get_supabase_client(user_jwt=user_token)  # With RLS
```

**Reference:** `packages/org-module/backend/layers/org-common/python/org_common/supabase_client.py`

---

### 2. Secrets Manager Access

**❌ WRONG (Direct implementation):**

```python
import boto3

client = boto3.client('secretsmanager')
response = client.get_secret_value(SecretId='my-secret')
secret = json.loads(response['SecretString'])
```

**✅ CORRECT (Following org-common pattern):**

```python
from org_common.supabase_client import get_secret

secret = get_secret('arn:aws:secretsmanager:region:account:secret:name')
# Secrets are automatically cached
```

**Reference:** `packages/org-module/backend/layers/org-common/python/org_common/supabase_client.py`

---

### 3. Database Queries

**❌ WRONG (Direct Supabase queries):**

```python
supabase = get_supabase_client()
result = supabase.table('my_table').select('*').eq('id', id).execute()
data = result.data
```

**✅ CORRECT (Following org-common pattern):**

```python
from org_common.db import find_one, find_many, insert_one, update_one, delete_one

# Find single record
record = find_one('my_table', filters={'id': id}, user_jwt=user_jwt)

# Find multiple records
records = find_many('my_table', filters={'org_id': org_id}, order='created_at.desc')

# Insert
new_record = insert_one('my_table', data={'name': 'Test'}, user_jwt=user_jwt)

# Update
updated = update_one('my_table', filters={'id': id}, data={'name': 'Updated'})

# Delete
deleted = delete_one('my_table', filters={'id': id})
```

**Reference:** `packages/org-module/backend/layers/org-common/python/org_common/db.py`

---

### 4. API Responses

**❌ WRONG (Manual response construction):**

```python
return {
    'statusCode': 200,
    'headers': {'Content-Type': 'application/json'},
    'body': json.dumps({'data': data})
}
```

**✅ CORRECT (Following org-common pattern):**

```python
from org_common.responses import success_response, error_response

# Success
return success_response(data={'items': items}, message='Retrieved successfully')

# Error
return error_response(message='Not found', status_code=404)
```

**Reference:** `packages/org-module/backend/layers/org-common/python/org_common/responses.py`

---

### 5. Error Handling

**❌ WRONG (Generic exceptions):**

```python
if not record:
    raise Exception('Record not found')
```

**✅ CORRECT (Following org-common pattern):**

```python
from org_common.errors import NotFoundError, ValidationError, ForbiddenError

if not record:
    raise NotFoundError('Record not found')

if not valid:
    raise ValidationError('Invalid input')

if not has_permission:
    raise ForbiddenError('Access denied')
```

**Reference:** `packages/org-module/backend/layers/org-common/python/org_common/errors.py`

---

### 6. Input Validation

**❌ WRONG (Manual validation):**

```python
import re

if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
    raise ValueError('Invalid email')
```

**✅ CORRECT (Following org-common pattern):**

```python
from org_common.validators import (
    validate_uuid, validate_email, validate_url,
    validate_required_fields, validate_string_length
)

validate_email(email)
validate_uuid(org_id)
validate_required_fields(data, ['name', 'email'])
validate_string_length(name, min_length=1, max_length=100)
```

**Reference:** `packages/org-module/backend/layers/org-common/python/org_common/validators.py`

---

### 7. Extracting User Context from Event

**❌ WRONG (Direct event parsing):**

```python
user_id = event['requestContext']['authorizer']['lambda']['userId']
```

**✅ CORRECT (Following org-common pattern):**

```python
from org_common.supabase_client import get_user_from_event

user_info = get_user_from_event(event)
user_id = user_info['user_id']
email = user_info['email']
```

**Reference:** `packages/org-module/backend/layers/org-common/python/org_common/supabase_client.py`

---

### 8. Multi-Tenant org_id Filtering

**✅ PATTERN (Always include org_id in queries):**

```python
# Extract org_id from authorizer context
authorizer = event['requestContext']['authorizer']
org_id = authorizer.get('lambda', {}).get('orgId') or authorizer.get('orgId')

# ALWAYS filter by org_id for multi-tenant data
records = find_many(
    'certifications',
    filters={'user_id': user_id, 'org_id': org_id},  # ← org_id REQUIRED
    user_jwt=user_jwt
)

# For INSERT operations
new_cert = insert_one(
    'certifications',
    data={
        'user_id': user_id,
        'org_id': org_id,  # ← org_id REQUIRED
        'cert_name': 'AWS Solution Architect'
    }
)

# For global resources (campaigns), allow org_id IS NULL
# This is handled by RLS policies automatically
```

---

### 9. Lambda Function Structure

**✅ STANDARD STRUCTURE:**

```python
"""
Lambda Function: <module>-<resource>
Purpose: <brief description>
"""

import json
from org_common.db import find_many, insert_one, update_one, delete_one
from org_common.responses import success_response, error_response
from org_common.errors import NotFoundError, ValidationError
from org_common.validators import validate_uuid, validate_required_fields


def lambda_handler(event, context):
    """
    Main handler for <resource> operations

    Supported operations:
    - GET /<resource> - List records
    - POST /<resource> - Create record
    - PUT /<resource>/{id} - Update record
    - DELETE /<resource>/{id} - Delete record
    """
    print(f"Event: {json.dumps(event, default=str)}")

    try:
        # Extract HTTP method and path
        http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method'))
        path = event.get('path', event.get('rawPath', ''))

        # Extract user and org context from authorizer
        authorizer = event['requestContext']['authorizer']
        user_id = authorizer.get('lambda', {}).get('userId') or authorizer.get('userId')
        org_id = authorizer.get('lambda', {}).get('orgId') or authorizer.get('orgId')

        if not user_id or not org_id:
            return error_response('Missing user or org context', status_code=401)

        # Route to appropriate handler
        if http_method == 'GET':
            return handle_get(user_id, org_id, path)
        elif http_method == 'POST':
            return handle_post(user_id, org_id, event)
        elif http_method == 'PUT':
            return handle_put(user_id, org_id, path, event)
        elif http_method == 'DELETE':
            return handle_delete(user_id, org_id, path)
        else:
            return error_response(f'Unsupported method: {http_method}', status_code=405)

    except NotFoundError as e:
        return error_response(str(e), status_code=404)
    except ValidationError as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        print(f"Error: {str(e)}")
        return error_response('Internal server error', status_code=500)


def handle_get(user_id, org_id, path):
    """Handle GET requests"""
    # Implementation
    pass


def handle_post(user_id, org_id, event):
    """Handle POST requests"""
    # Implementation
    pass


def handle_put(user_id, org_id, path, event):
    """Handle PUT requests"""
    # Implementation
    pass


def handle_delete(user_id, org_id, path):
    """Handle DELETE requests"""
    # Implementation
    pass
```

**Reference:** `packages/org-module/backend/lambdas/*/lambda_function.py`

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Not Using org-common Helpers

**Problem:** Reimplementing Supabase client, secret management, etc.  
**Solution:** ALWAYS check org-common first before writing helper code.

### ❌ Mistake 2: Forgetting org_id Filtering

**Problem:** Cross-org data leakage, RLS policy violations.  
**Solution:** ALWAYS include `org_id` in filters for multi-tenant tables.

### ❌ Mistake 3: Inconsistent Error Handling

**Problem:** Different error response formats across modules.  
**Solution:** Use `org_common.errors` exceptions and `org_common.responses` helpers.

### ❌ Mistake 4: Direct Supabase Queries

**Problem:** Bypassing established database helper functions.  
**Solution:** Use `org_common.db` functions (find_one, find_many, etc.).

### ❌ Mistake 5: Not Following Lambda Structure

**Problem:** Inconsistent code organization across modules.  
**Solution:** Follow the standard Lambda structure pattern above.

---

## Pattern Review Process

Before submitting code for review:

1. **Self-Review Checklist:**

   - [ ] Used org-common helpers where applicable
   - [ ] Included org_id filtering for multi-tenant data
   - [ ] Used standard error handling (org_common.errors)
   - [ ] Used standard response format (org_common.responses)
   - [ ] Followed Lambda function structure pattern
   - [ ] Added proper logging and error messages

2. **Pattern Verification:**

   - [ ] Code review against this document
   - [ ] Compare with org-module reference implementation
   - [ ] No duplicate helper functions (should be in org-common)

3. **Documentation:**
   - [ ] Module README updated with API endpoints
   - [ ] Any new patterns documented
   - [ ] Consider if new helpers should be in org-common

---

## Where to Find Patterns

| Pattern Needed      | Reference Location                                                                   |
| ------------------- | ------------------------------------------------------------------------------------ |
| Supabase connection | `packages/org-module/backend/layers/org-common/python/org_common/supabase_client.py` |
| Database queries    | `packages/org-module/backend/layers/org-common/python/org_common/db.py`              |
| API responses       | `packages/org-module/backend/layers/org-common/python/org_common/responses.py`       |
| Error handling      | `packages/org-module/backend/layers/org-common/python/org_common/errors.py`          |
| Input validation    | `packages/org-module/backend/layers/org-common/python/org_common/validators.py`      |
| Lambda examples     | `packages/org-module/backend/lambdas/`                                               |
| Module structure    | `packages/org-module/`                                                               |

---

## Adding New Patterns to org-common

If you create a helper function that could be reused:

1. Add it to the appropriate org-common module
2. Update org-common's `__init__.py` to export it
3. Update this document with the new pattern
4. Notify the team so other modules can use it

---

## Questions?

If you're unsure which pattern to follow:

1. Check this document first
2. Review org-module implementation
3. Ask the team before implementing custom solutions
4. When in doubt, follow org-module's approach

---

**Last Updated:** November 5, 2025  
**Maintained By:** Development Team  
**Reference Implementation:** packages/org-module/
