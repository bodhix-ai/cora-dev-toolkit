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

#### Where to Pass orgId

| HTTP Method | Location | Example |
|-------------|----------|---------|
| GET | Query parameter | `GET /ws/{id}?orgId=uuid` |
| POST | Request body | `POST /ws` with `{"orgId": "uuid", ...}` |
| PUT | Query parameter OR body | `PUT /ws/{id}?orgId=uuid` |
| DELETE | Query parameter | `DELETE /ws/{id}?orgId=uuid` |

**Note:** Query parameters use camelCase to be consistent with the JavaScript ecosystem. Backend Lambdas accept both `orgId` and `org_id` for backward compatibility.

#### Lambda Validation Pattern

```python
def lambda_handler(event, context):
    # Get orgId from query parameters (accept both camelCase and snake_case)
    query_params = event.get('queryStringParameters') or {}
    org_id = query_params.get('org_id') or query_params.get('orgId')
    
    # For POST/PUT requests, also check the request body
    if not org_id and http_method in ('POST', 'PUT'):
        try:
            body = json.loads(event.get('body', '{}'))
            org_id = body.get('orgId') or body.get('org_id')
        except json.JSONDecodeError:
            pass

    # REQUIRED: Validate orgId is present
    if not org_id:
        return common.bad_request_response(
            'orgId is required (in query params or request body)'
        )
    
    # Proceed with route handling...
```

#### Frontend API Client Pattern

All API client methods that access organization-scoped data MUST accept `orgId` as a parameter:

```typescript
// ✅ CORRECT - orgId passed for all operations (camelCase)
async getWorkspace(id: string, orgId: string): Promise<Workspace | null> {
  const response = await this.client.get(`/ws/${id}?orgId=${orgId}`);
  return response?.data || null;
}

async toggleFavorite(workspaceId: string, orgId: string): Promise<FavoriteToggleResponse> {
  const response = await this.client.post(
    `/ws/${workspaceId}/favorite?orgId=${orgId}`,
    {}
  );
  return response?.data || { isFavorited: false };
}

// ❌ WRONG - orgId missing, will fail with 400 error
async getWorkspace(id: string): Promise<Workspace | null> {
  const response = await this.client.get(`/ws/${id}`);  // Missing orgId!
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

#### Which Routes Require orgId

| Route Type | orgId Required | Example |
|------------|----------------|---------|
| List resources | ✅ Yes | `GET /ws?orgId=...` |
| Create resource | ✅ Yes (in body) | `POST /ws` with orgId in body |
| Get single resource | ✅ Yes | `GET /ws/{id}?orgId=...` |
| Update resource | ✅ Yes | `PUT /ws/{id}?orgId=...` |
| Delete resource | ✅ Yes | `DELETE /ws/{id}?orgId=...` |
| User actions (favorite, etc.) | ✅ Yes | `POST /ws/{id}/favorite?orgId=...` |
| Module configuration | ✅ Yes | `GET /ws/config?orgId=...` |
| Admin routes | ✅ Yes | `GET /ws/admin/stats?orgId=...` |

**Note:** Even when a resource is identified by a globally unique ID (like a UUID), orgId is STILL required for security validation - the Lambda should verify the resource belongs to the specified org.

---

## Part 2: Response Field Naming Convention

### API Response Fields MUST Use camelCase for JavaScript Clients

All API response field names returned by Lambda functions MUST use **camelCase** when serving JavaScript/TypeScript clients.

**Rationale:**
1. **JavaScript Convention** - camelCase is the standard in JavaScript/TypeScript ecosystems
2. **Framework Compatibility** - Aligns with React, Next.js, and most JS frameworks
3. **Developer Experience** - Natural object property access (`org.orgId` vs `org.org_id`)
4. **Industry Standard** - Most REST APIs serving JS clients use camelCase responses

**Note:** While the database uses snake_case (per `DATABASE-NAMING-STANDARDS.md`), Lambda functions transform field names when constructing API responses.

#### ✅ Correct - camelCase in API Response

**Lambda (Python):**
```python
def _transform_workspace(data: Dict[str, Any]) -> Dict[str, Any]:
    """Transform database record to API response format."""
    return {
        'id': data.get('id'),
        'orgId': data.get('org_id'),              # Transform: org_id → orgId
        'name': data.get('name'),
        'isFavorited': data.get('is_favorited', False),  # Transform: is_favorited → isFavorited
        'userRole': data.get('user_role'),        # Transform: user_role → userRole
        'memberCount': data.get('member_count'),  # Transform: member_count → memberCount
        'createdAt': data.get('created_at'),      # Transform: created_at → createdAt
        'updatedAt': data.get('updated_at'),      # Transform: updated_at → updatedAt
    }
```

**Frontend TypeScript Type:**
```typescript
interface Workspace {
  id: string;
  orgId: string;
  name: string;
  isFavorited?: boolean;
  userRole?: string;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}
```

#### ❌ Incorrect - snake_case in API Response

```python
# DON'T DO THIS - snake_case is for database only
return {
    'org_id': data.get('org_id'),           # ❌ snake_case
    'is_favorited': data.get('is_favorited'), # ❌ snake_case
    'user_role': data.get('user_role'),       # ❌ snake_case
    'member_count': data.get('member_count'), # ❌ snake_case
}
```

#### Common Field Transformations

| Database (snake_case) | API Response (camelCase) |
|-----------------------|--------------------------|
| `org_id` | `orgId` |
| `org_name` | `orgName` |
| `org_slug` | `orgSlug` |
| `is_owner` | `isOwner` |
| `user_role` | `userRole` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `logo_url` | `logoUrl` |
| `app_name` | `appName` |
| `app_icon` | `appIcon` |

---

## Part 3: Path Parameter Naming Convention

### Standard: Use Descriptive Resource-Specific Names

Path parameters MUST use descriptive names that identify the resource type. This ensures consistency across infrastructure definitions, Lambda documentation, and frontend API clients.

#### Standard Parameter Names by Resource

| Resource | Parameter Name | Example Route |
|----------|---------------|---------------|
| Workspace | `{workspaceId}` | `/ws/{workspaceId}` |
| Organization | `{orgId}` | `/orgs/{orgId}` |
| User | `{userId}` | `/users/{userId}` |
| Member | `{memberId}` | `/ws/{workspaceId}/members/{memberId}` |
| Provider | `{providerId}` | `/providers/{providerId}` |
| Configuration | `{configId}` | `/configs/{configId}` |

#### Consistency Requirement

The **same parameter names** MUST be used across all three layers:

1. **Infrastructure** (`infrastructure/outputs.tf`)
   ```hcl
   {
     method = "DELETE"
     path = "/ws/{workspaceId}/members/{memberId}"
     ...
   }
   ```

2. **Lambda Documentation** (`backend/lambdas/.../lambda_function.py`)
   ```python
   """
   Routes - Members:
   - DELETE /ws/{workspaceId}/members/{memberId} - Remove member
   """
   ```

3. **Frontend API Client** (`frontend/lib/api.ts`)
   ```typescript
   async removeMember(workspaceId: string, memberId: string, orgId: string) {
     await this.client.delete(`/ws/${workspaceId}/members/${memberId}?org_id=${orgId}`);
   }
   ```

#### Rationale

- **Clarity** - Descriptive names make code self-documenting
- **Consistency** - Same names across all layers reduce confusion
- **Validation** - Static analysis tools can match patterns accurately
- **Maintainability** - Easier to trace routes through the stack

#### Anti-Pattern

❌ **Don't use generic `{id}` for resource-specific identifiers:**
```hcl
# BAD - unclear which resource ID this is
path = "/ws/{id}/members/{id}"

# GOOD - clear and specific
path = "/ws/{workspaceId}/members/{memberId}"
```

---

## Part 4: Response Patterns

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

## API Response Format Validation

### Automated camelCase Validation

CORA includes a validator to ensure all Lambda functions return camelCase responses (not snake_case).

**Usage:**

```bash
# From cora-dev-toolkit
python validation/api-response-validator/validate_api_responses.py /path/to/project

# Example output:
# ❌ FAILED: Found snake_case keys in API responses
# Line 258: Snake_case key in response: app_name
#          → Expected: 'appName'
```

**The validator checks:**
- ✅ All response keys use camelCase
- ❌ Flags snake_case keys (except CONSTANT_CASE)
- 📝 Provides line numbers and fix suggestions

**Integration with CI/CD:**

```bash
# Add to pre-commit hook or GitHub Actions
python validation/api-response-validator/validate_api_responses.py .
```

Exits with code 1 if violations found, blocking deployment.

**See:** `validation/api-response-validator/README.md` for complete documentation.

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

**Last Updated:** January 13, 2026  
**Status:** Active Standard  
**Applies To:** All CORA module Lambda functions and API clients  
**Supersedes:** standard_api-response.md

---

## Appendix: CORA Option B - Strict camelCase Standard

| Layer | Convention | Example |
|-------|------------|---------|
| Database columns | `snake_case` | `org_id`, `created_at` |
| API JSON responses | `camelCase` | `{ "orgId": "123", "createdAt": "..." }` |
| API JSON requests | `camelCase` | `{ "orgId": "123", "name": "..." }` |
| Query parameters | `camelCase` | `?orgId=123&favoritesOnly=true` |
| TypeScript code | `camelCase` | `const orgId = params.orgId` |

**Key principle:** Backend Lambdas transform snake_case database fields to camelCase at the API boundary. Frontend uses pure camelCase throughout.
