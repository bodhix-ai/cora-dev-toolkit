# CORA Module API Patterns Standard

## Overview

This standard defines the required patterns for all CORA module API endpoints, covering both **request requirements** and **response formats**. Following these patterns ensures security, consistency, and proper organization boundary enforcement across all CORA applications.

---

## Part 1: Request Patterns

### Organization Boundary Enforcement

**CRITICAL:** All user-centric API routes MUST include `org_id` to enforce organization boundaries and prevent cross-organization data leakage.

#### Why org_id is Required

1. **Security** - Prevents users from accessing data from organizations they don't belong to
2. **Multi-tenancy** - CORA applications support multiple organizations; org_id scopes all queries
3. **Audit Trail** - All operations are logged with org context
4. **RLS Enforcement** - Supabase Row-Level Security policies use org_id for filtering

#### Where to Pass org_id

| HTTP Method | Location | Example |
|-------------|----------|---------|
| GET | Query parameter | `GET /ws/{id}?org_id=uuid` |
| POST | Request body | `POST /ws` with `{"org_id": "uuid", ...}` |
| PUT | Query parameter OR body | `PUT /ws/{id}?org_id=uuid` |
| DELETE | Query parameter | `DELETE /ws/{id}?org_id=uuid` |

#### Lambda Validation Pattern

```python
def lambda_handler(event, context):
    # Get org_id from query parameters OR request body
    query_params = event.get('queryStringParameters') or {}
    org_id = query_params.get('org_id')
    
    # For POST/PUT requests, also check the request body
    if not org_id and http_method in ('POST', 'PUT'):
        try:
            body = json.loads(event.get('body', '{}'))
            org_id = body.get('org_id')
        except json.JSONDecodeError:
            pass

    # REQUIRED: Validate org_id is present
    if not org_id:
        return common.bad_request_response(
            'org_id is required (in query params or request body)'
        )
    
    # Proceed with route handling...
```

#### Frontend API Client Pattern

All API client methods that access organization-scoped data MUST accept `orgId` as a parameter:

```typescript
// ✅ CORRECT - org_id passed for all operations
async getWorkspace(id: string, orgId: string): Promise<Workspace | null> {
  const response = await this.client.get(`/ws/${id}?org_id=${orgId}`);
  return response?.data || null;
}

async toggleFavorite(workspaceId: string, orgId: string): Promise<FavoriteToggleResponse> {
  const response = await this.client.post(
    `/ws/${workspaceId}/favorite?org_id=${orgId}`,
    {}
  );
  return response?.data || { is_favorited: false };
}

// ❌ WRONG - org_id missing, will fail with 400 error
async getWorkspace(id: string): Promise<Workspace | null> {
  const response = await this.client.get(`/ws/${id}`);  // Missing org_id!
  return response?.data || null;
}
```

#### Frontend Hook Pattern

Hooks should obtain org_id from the organization context:

```typescript
import { useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";

function useWorkspaceActions() {
  const { currentOrganization } = useOrganizationContext();
  const orgId = currentOrganization?.orgId || "";
  
  const toggleFavorite = async (workspaceId: string) => {
    // ✅ Pass orgId from context
    await apiClient.toggleFavorite(workspaceId, orgId);
  };
  
  return { toggleFavorite };
}
```

#### Which Routes Require org_id

| Route Type | org_id Required | Example |
|------------|-----------------|---------|
| List resources | ✅ Yes | `GET /ws?org_id=...` |
| Create resource | ✅ Yes (in body) | `POST /ws` with org_id in body |
| Get single resource | ✅ Yes | `GET /ws/{id}?org_id=...` |
| Update resource | ✅ Yes | `PUT /ws/{id}?org_id=...` |
| Delete resource | ✅ Yes | `DELETE /ws/{id}?org_id=...` |
| User actions (favorite, etc.) | ✅ Yes | `POST /ws/{id}/favorite?org_id=...` |
| Module configuration | ✅ Yes | `GET /ws/config?org_id=...` |
| Admin routes | ✅ Yes | `GET /ws/admin/stats?org_id=...` |

**Note:** Even when a resource is identified by a globally unique ID (like a UUID), org_id is STILL required for security validation - the Lambda should verify the resource belongs to the specified org.

---

## Part 2: Response Field Naming Convention

### API Response Fields MUST Use snake_case

All API response field names returned by Lambda functions MUST use **snake_case** (lowercase with underscores).

**Rationale:**
1. **Database Consistency** - Database columns use snake_case per `DATABASE-NAMING-STANDARDS.md`
2. **Pass-Through Simplicity** - No transformation layer needed between DB and API
3. **Frontend Type Consistency** - Frontend TypeScript types use snake_case for API data
4. **Reduced Errors** - Single naming convention eliminates camelCase/snake_case mismatches

#### ✅ Correct - snake_case in API Response

**Lambda (Python):**
```python
def _transform_workspace(data: Dict[str, Any]) -> Dict[str, Any]:
    """Transform database record to API response format."""
    return {
        'id': data.get('id'),
        'org_id': data.get('org_id'),
        'name': data.get('name'),
        'is_favorited': data.get('is_favorited', False),
        'user_role': data.get('user_role'),
        'member_count': data.get('member_count'),
        'created_at': data.get('created_at'),
        'updated_at': data.get('updated_at'),
    }
```

**Frontend TypeScript Type:**
```typescript
interface Workspace {
  id: string;
  org_id: string;
  name: string;
  is_favorited?: boolean;
  user_role?: string;
  member_count?: number;
  created_at: string;
  updated_at: string;
}
```

#### ❌ Incorrect - camelCase in API Response

```python
# DON'T DO THIS
return {
    'orgId': data.get('org_id'),           # ❌ camelCase
    'isFavorited': data.get('is_favorited'), # ❌ camelCase
    'userRole': data.get('user_role'),       # ❌ camelCase
    'memberCount': data.get('member_count'), # ❌ camelCase
}
```

---

## Part 3: Response Patterns

### Standard Response Format

All CORA module Lambda functions MUST use the standardized response format provided by the `org_common` layer.

### Success Responses

**Backend (Lambda):**

```python
import org_common as common

# Success response
return common.success_response(data)
```

**Resulting HTTP Response:**

```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  },
  "body": "{\"success\": true, \"data\": {...}}"
}
```

**Frontend receives (after JSON parsing):**

```typescript
{
  success: true,
  data: {...}  // ← Access your data here
}
```

### Error Responses

**Backend (Lambda):**

```python
# Built-in error response helpers
return common.bad_request_response("Missing required field")
return common.unauthorized_response()
return common.forbidden_response("Insufficient permissions")
return common.not_found_response("Resource not found")
return common.internal_error_response()
```

**Resulting HTTP Response:**

```json
{
  "statusCode": 400,
  "headers": {...},
  "body": "{\"success\": false, \"error\": \"Missing required field\"}"
}
```

### Response Helper Functions

The `org_common` module provides these helper functions:

| Function                           | Status Code | Use Case                  |
| ---------------------------------- | ----------- | ------------------------- |
| `success_response(data)`           | 200         | Standard success response |
| `created_response(data)`           | 201         | Resource created          |
| `no_content_response()`            | 204         | Success with no content   |
| `bad_request_response(msg)`        | 400         | Invalid request           |
| `unauthorized_response(msg)`       | 401         | Authentication required   |
| `forbidden_response(msg)`          | 403         | Insufficient permissions  |
| `not_found_response(msg)`          | 404         | Resource not found        |
| `conflict_response(msg)`           | 409         | Resource conflict         |
| `internal_error_response(msg)`     | 500         | Server error              |
| `method_not_allowed_response(msg)` | 405         | HTTP method not allowed   |

---

## Part 3: Frontend Integration

### Accessing Response Data

**Correct:**

```typescript
const result = await apiClient.someEndpoint(orgId);
const items = result.data; // ✅ Access .data property
```

**Incorrect:**

```typescript
const result = await apiClient.someEndpoint();
const items = result; // ❌ Wrong - missing .data and org_id
```

### API Client Type Definition

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

---

## Compliance Checking

### Automated Compliance Checker

A compliance checker script is available to scan all Lambda functions and verify they follow the API patterns standard.

**Run manually:**

```bash
# From project root
npm run api:compliance

# Or directly with Python
python3 scripts/check-api-compliance.py
```

### Pre-commit Hook

The compliance checker runs automatically on Lambda function changes via `lint-staged`.

---

## Security Considerations

### Why Not Skip org_id for Resource-Specific Routes?

Even though a workspace ID is globally unique, we STILL require org_id because:

1. **Defense in Depth** - Multiple validation layers prevent accidents
2. **Consistent Pattern** - Same validation logic for all routes
3. **Audit Logging** - org_id in request enables better logging
4. **Future-Proofing** - If IDs ever overlap or are reused

### Validation at Lambda Level

The Lambda SHOULD verify that the requested resource belongs to the specified org:

```python
# Get the resource
workspace = common.find_one(
    table='workspaces',
    filters={'id': workspace_id, 'deleted_at': None}
)

# Verify it belongs to the specified org
if workspace and workspace['org_id'] != org_id:
    raise common.ForbiddenError('Resource does not belong to this organization')
```

---

## Migration Guide

### For New API Endpoints

1. Import org_common:
   ```python
   import org_common as common
   ```

2. Validate org_id at the start of lambda_handler

3. Pass org_id to all database queries

4. Use standard response helpers

### For Existing Endpoints Missing org_id

1. Update Lambda to require org_id
2. Update API client methods to accept org_id parameter
3. Update hooks/components to pass org_id from context
4. Test all affected flows

---

## Related Documents

- [org_common Module Documentation](../org-module/backend/layers/org-common/)
- [API Gateway Integration](./API_GATEWAY.md)
- [Frontend API Client](../packages/api-client/)
- [Navigation and Roles Standard](./standard_NAVIGATION-AND-ROLES.md)

---

**Last Updated:** January 8, 2026  
**Status:** Active Standard  
**Applies To:** All CORA module Lambda functions and API clients  
**Supersedes:** standard_api-response.md