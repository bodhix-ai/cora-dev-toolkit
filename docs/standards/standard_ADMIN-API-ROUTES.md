# CORA Admin API Routes Standard

**Status:** ✅ ACTIVE  
**Version:** 1.0  
**Created:** 2026-01-25  
**Last Updated:** 2026-01-25  
**Related:**
- `docs/arch decisions/ADR-018b-API-GATEWAY-ROUTE-STANDARDS.md` - Architecture decision
- `docs/standards/standard_API-PATTERNS.md` - Request/response patterns
- `docs/standards/standard_MODULAR-ADMIN-ARCHITECTURE.md` - Frontend admin architecture

---

## Overview

This standard defines the required patterns for **all API Gateway routes** in CORA applications, with particular focus on admin routes. It complements `standard_API-PATTERNS.md` (which covers request/response formats) by defining route structure and naming conventions.

### Scope

This standard covers:
- ✅ Data API routes (`/api/*`)
- ✅ System admin routes (`/admin/sys/*`)
- ✅ Organization admin routes (`/admin/org/*`)
- ✅ Workspace admin routes (`/admin/ws/*`)

---

## Route Categories

CORA API routes fall into **four categories** based on their scope and context requirements:

| Category | Prefix | Org Context | Use Case |
|----------|--------|-------------|----------|
| Data API | `/{module}/` | Query param (`?orgId=`) | User-facing CRUD operations |
| Sys Admin | `/admin/sys/` | None (global) | System-wide configuration |
| Org Admin | `/admin/org/` | Session-based | Organization settings |
| WS Admin | `/admin/ws/{wsId}/` | Derived from WS | Workspace settings |

---

## 1. Data API Routes

### Pattern

```
/{module}/{resource}
/{module}/{resource}/{resourceId}
/{module}/{resource}/{resourceId}/{sub-resource}
```

### Examples

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ws?orgId=xxx` | List workspaces in org |
| POST | `/ws` | Create workspace (orgId in body) |
| GET | `/ws/{wsId}?orgId=xxx` | Get single workspace |
| PUT | `/ws/{wsId}?orgId=xxx` | Update workspace |
| DELETE | `/ws/{wsId}?orgId=xxx` | Delete workspace |
| GET | `/kb/documents?orgId=xxx` | List KB documents |
| POST | `/kb/documents` | Create document (orgId in body) |
| GET | `/ws/{wsId}/members?orgId=xxx` | List workspace members |

### Org Context

**Required:** All data API routes MUST include `orgId` for organization boundary enforcement.

- **GET/DELETE:** Pass `orgId` as query parameter
- **POST/PUT:** Pass `orgId` in request body (or query param)

See `standard_API-PATTERNS.md` for detailed org_id handling.

### Lambda Authorization

```python
def lambda_handler(event, context):
    # Get orgId from query params or body
    org_id = get_org_id_from_request(event)
    
    if not org_id:
        return common.bad_request_response('orgId is required')
    
    # Validate user has access to org
    user_id = event['requestContext']['authorizer']['userId']
    if not user_has_org_access(user_id, org_id):
        return common.forbidden_response('Not authorized for this organization')
    
    # Proceed with operation...
```

---

## 2. System Admin Routes

### Pattern

```
/admin/sys/{module}/{resource}
/admin/sys/{module}/{resource}/{resourceId}
```

### Examples

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/sys/mgmt/modules` | List all registered modules |
| PUT | `/admin/sys/mgmt/modules/{moduleName}` | Update module system config |
| GET | `/admin/sys/access/orgs` | List all organizations |
| POST | `/admin/sys/access/orgs` | Create organization |
| GET | `/admin/sys/access/orgs/{orgId}` | Get organization details |
| GET | `/admin/sys/ai/providers` | List AI providers (system) |
| PUT | `/admin/sys/ai/providers/{providerId}` | Update provider config |
| GET | `/admin/sys/mgmt/lambda` | List Lambda configurations |

### Org Context

**None.** System admin routes operate at global scope across all organizations.

### Required Roles

- `sys_admin`
- `sys_owner`

### Lambda Authorization

```python
def lambda_handler(event, context):
    # Verify system admin role
    user_id = event['requestContext']['authorizer']['userId']
    profile = common.find_one('user_profiles', {'user_id': user_id})
    
    if profile.get('sys_role') not in ['sys_admin', 'sys_owner']:
        return common.forbidden_response('System admin access required')
    
    # Proceed with system-level operation...
```

---

## 3. Organization Admin Routes

### Pattern

```
/admin/org/{module}/{resource}
/admin/org/{module}/{resource}/{resourceId}
```

### Examples

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/org/mgmt/modules` | List modules for current org |
| PUT | `/admin/org/mgmt/modules/{moduleName}` | Update module org config |
| GET | `/admin/org/access/members` | List org members |
| POST | `/admin/org/access/invitations` | Create invitation |
| DELETE | `/admin/org/access/members/{memberId}` | Remove member |
| GET | `/admin/org/ai/usage` | Get AI usage for org |
| PUT | `/admin/org/ai/config` | Update org AI config |
| GET | `/admin/org/ws/list` | List workspaces (admin view) |

### Org Context

**Session-based.** The organization context is derived from the authenticated user's current organization selection.

**Why session-based?**
- Users can belong to multiple organizations
- Users operate in ONE org context at a time
- Org context is established at login or when user switches orgs
- Org context is stored in the session/token

**Important:** The org ID is NOT in the URL path. It comes from the authenticated session.

### Required Roles

- `org_admin` (for their own org)
- `org_owner` (for their own org)
- `sys_admin` (for any org)
- `sys_owner` (for any org)

### Lambda Authorization

```python
def lambda_handler(event, context):
    # Get user and their current org from session
    user_id = event['requestContext']['authorizer']['userId']
    current_org_id = event['requestContext']['authorizer']['orgId']  # From session
    
    if not current_org_id:
        return common.bad_request_response('No organization context')
    
    # Check if user is sys admin (can access any org)
    profile = common.find_one('user_profiles', {'user_id': user_id})
    is_sys_admin = profile.get('sys_role') in ['sys_admin', 'sys_owner']
    
    if not is_sys_admin:
        # Check org-level role
        membership = common.find_one('org_members', {
            'user_id': user_id,
            'org_id': current_org_id
        })
        
        if not membership or membership.get('role') not in ['org_admin', 'org_owner']:
            return common.forbidden_response('Organization admin access required')
    
    # Proceed with org-level operation using current_org_id...
```

---

## 4. Workspace Admin Routes

### Pattern

```
/admin/ws/{wsId}/{module}/{resource}
/admin/ws/{wsId}/{module}/{resource}/{resourceId}
```

### Examples

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/ws/{wsId}/mgmt/modules` | List modules for workspace |
| PUT | `/admin/ws/{wsId}/mgmt/modules/{moduleName}` | Update module ws config |
| GET | `/admin/ws/{wsId}/access/members` | List workspace members |
| POST | `/admin/ws/{wsId}/access/members` | Add workspace member |
| DELETE | `/admin/ws/{wsId}/access/members/{memberId}` | Remove member |
| GET | `/admin/ws/{wsId}/kb/config` | Get KB config for workspace |
| PUT | `/admin/ws/{wsId}/kb/config` | Update KB config |
| GET | `/admin/ws/{wsId}/eval/settings` | Get eval settings |

### Org Context

**Derived from workspace.** The workspace belongs to an organization, so org context is obtained by looking up the workspace's parent org.

### Workspace Context

**Path parameter `{wsId}`.** The workspace ID MUST be explicit in the URL.

**Why path-based for wsId?**
- Users can access multiple workspaces within their current org
- The URL must specify WHICH workspace is being configured
- Enables bookmarking and sharing of workspace admin links

### Required Roles

- Workspace admin or owner (for their workspace)
- Org admin (for workspaces in their org)
- Sys admin (for any workspace)

### Lambda Authorization

```python
def lambda_handler(event, context):
    # Get workspace ID from path
    ws_id = event['pathParameters'].get('wsId')
    
    if not ws_id:
        return common.bad_request_response('Workspace ID required')
    
    # Get workspace to determine org
    workspace = common.find_one('workspaces', {'id': ws_id, 'deleted_at': None})
    
    if not workspace:
        return common.not_found_response('Workspace not found')
    
    org_id = workspace['org_id']
    user_id = event['requestContext']['authorizer']['userId']
    
    # Check if user is sys admin
    profile = common.find_one('user_profiles', {'user_id': user_id})
    is_sys_admin = profile.get('sys_role') in ['sys_admin', 'sys_owner']
    
    if not is_sys_admin:
        # Check org membership
        org_membership = common.find_one('org_members', {
            'user_id': user_id,
            'org_id': org_id
        })
        
        if not org_membership:
            return common.forbidden_response('Not a member of this organization')
        
        is_org_admin = org_membership.get('role') in ['org_admin', 'org_owner']
        
        if not is_org_admin:
            # Check workspace membership
            ws_membership = common.find_one('workspace_members', {
                'user_id': user_id,
                'workspace_id': ws_id
            })
            
            if not ws_membership or ws_membership.get('role') not in ['ws_admin', 'ws_owner']:
                return common.forbidden_response('Workspace admin access required')
    
    # Proceed with workspace-level operation...
```

---

## Module Names (Canonical List)

Only these module shortnames are valid in routes:

| Module | Shortname | Type | Description |
|--------|-----------|------|-------------|
| module-access | `access` | Core | Identity & access control |
| module-ai | `ai` | Core | AI provider management |
| module-mgmt | `mgmt` | Core | Platform management |
| module-ws | `ws` | Core | Workspace management |
| module-kb | `kb` | Core | Knowledge base |
| module-chat | `chat` | Core | Chat & messaging |
| module-voice | `voice` | Functional | Voice interviews |
| module-eval | `eval` | Functional | Evaluation & testing |

**Important:** Use the shortname in routes, NOT the full module name.

```
✅ /admin/org/mgmt/modules
❌ /admin/org/module-mgmt/modules
```

---

## Path Parameter Naming

Use `{camelCase}` for all path parameters:

| Parameter | Correct | Incorrect |
|-----------|---------|-----------|
| Workspace ID | `{wsId}` | `{workspace_id}`, `{id}`, `{workspace-id}` |
| Organization ID | `{orgId}` | `{org_id}`, `{id}`, `{organization_id}` |
| Member ID | `{memberId}` | `{member_id}`, `{id}` |
| Module name | `{moduleName}` | `{module_name}`, `{name}` |

---

## Route Validation Rules

### Must Follow

1. **Prefix Required:** Admin routes must start with `/admin/`; data routes start with `/{module}/`
2. **Scope Required:** Admin routes must include scope: `sys`, `org`, or `ws/{wsId}`
3. **Module Required:** Routes must include a valid module shortname
4. **Resource Required:** Routes must include a resource name
5. **Consistent Casing:** Route segments use `lowercase` or `kebab-case`
6. **Path Parameters:** Use `{camelCase}` for parameters
7. **No Trailing Slashes:** Routes must not end with `/`

### Anti-Patterns (DO NOT USE)

```
❌ /admin/{module}/{resource}          # Missing scope (sys/org/ws)
❌ /api/{module}/{resource}            # Don't use /api prefix for data routes
❌ /admin/org/{orgId}/{module}/...     # Org ID should not be in path for org scope
❌ /admin/ws/{module}/{resource}       # Missing wsId for workspace scope
❌ /admin/organization/...             # Use 'org' not 'organization'
❌ /admin/sys/module-mgmt/...          # Use shortname 'mgmt' not 'module-mgmt'
❌ /admin/sys/mgmt/modules/            # Trailing slash
❌ /ADMIN/SYS/MGMT/MODULES             # Uppercase not allowed
```

---

## Context Passing Summary

| Scope | Org Context | Workspace Context | How to Get |
|-------|-------------|-------------------|------------|
| Data API | Query param `?orgId=` | N/A or path param | Request param |
| Sys Admin | None | N/A | Not applicable |
| Org Admin | Session | N/A | `event['requestContext']['authorizer']['orgId']` |
| WS Admin | Derived from WS | Path param `{wsId}` | Lookup workspace's org_id |

---

## Terraform API Gateway Configuration

### Standard Route Definition

```hcl
# modules/api-gateway/routes.tf

locals {
  admin_routes = [
    # System Admin - Module Management
    {
      method = "GET"
      path   = "/admin/sys/mgmt/modules"
      lambda = module.mgmt_modules_lambda.arn
    },
    {
      method = "PUT"
      path   = "/admin/sys/mgmt/modules/{moduleName}"
      lambda = module.mgmt_modules_lambda.arn
    },
    
    # Org Admin - Module Management
    {
      method = "GET"
      path   = "/admin/org/mgmt/modules"
      lambda = module.mgmt_modules_lambda.arn
    },
    {
      method = "PUT"
      path   = "/admin/org/mgmt/modules/{moduleName}"
      lambda = module.mgmt_modules_lambda.arn
    },
    
    # Workspace Admin - Module Management
    {
      method = "GET"
      path   = "/admin/ws/{wsId}/mgmt/modules"
      lambda = module.mgmt_modules_lambda.arn
    },
    {
      method = "PUT"
      path   = "/admin/ws/{wsId}/mgmt/modules/{moduleName}"
      lambda = module.mgmt_modules_lambda.arn
    },
  ]
}
```

### Lambda Route Docstring

Per `standard_LAMBDA-ROUTE-DOCSTRING.md`, Lambda functions must document their routes:

```python
"""
Module Management - Handles module configuration at sys/org/ws levels.

Routes - System Admin:
- GET /admin/sys/mgmt/modules - List all modules (system config)
- PUT /admin/sys/mgmt/modules/{moduleName} - Update module system config

Routes - Org Admin:
- GET /admin/org/mgmt/modules - List modules for current org
- PUT /admin/org/mgmt/modules/{moduleName} - Update module org config

Routes - Workspace Admin:
- GET /admin/ws/{wsId}/mgmt/modules - List modules for workspace
- PUT /admin/ws/{wsId}/mgmt/modules/{moduleName} - Update module ws config
"""

def lambda_handler(event, context):
    # Route handling...
```

---

## Frontend API Client Pattern

### TypeScript API Client

```typescript
// packages/module-mgmt/frontend/lib/api.ts

import type { AuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";

export function createMgmtClient(client: AuthenticatedClient) {
  return {
    // System Admin
    async getSysModules(): Promise<Module[]> {
      const response = await client.get('/admin/sys/mgmt/modules');
      return response.data;
    },
    
    async updateSysModule(moduleName: string, config: ModuleConfig): Promise<Module> {
      const response = await client.put(`/admin/sys/mgmt/modules/${moduleName}`, config);
      return response.data;
    },
    
    // Org Admin (orgId from session, not passed explicitly)
    async getOrgModules(): Promise<Module[]> {
      const response = await client.get('/admin/org/mgmt/modules');
      return response.data;
    },
    
    async updateOrgModule(moduleName: string, config: ModuleConfig): Promise<Module> {
      const response = await client.put(`/admin/org/mgmt/modules/${moduleName}`, config);
      return response.data;
    },
    
    // Workspace Admin (wsId explicit)
    async getWsModules(wsId: string): Promise<Module[]> {
      const response = await client.get(`/admin/ws/${wsId}/mgmt/modules`);
      return response.data;
    },
    
    async updateWsModule(wsId: string, moduleName: string, config: ModuleConfig): Promise<Module> {
      const response = await client.put(`/admin/ws/${wsId}/mgmt/modules/${moduleName}`, config);
      return response.data;
    },
  };
}
```

---

## Compliance Validation

### Automated Validator

Use the admin route validator to check compliance:

```bash
# From cora-dev-toolkit
python validation/admin-route-validator/validate_routes.py /path/to/project

# Example output:
# ✅ PASSED: 45 routes compliant
# ❌ FAILED: 3 routes non-compliant
#
# Violations:
# Line 23: /admin/ai/providers - Missing scope (sys/org/ws)
#          → Expected: /admin/sys/ai/providers or /admin/org/ai/providers
#
# Line 45: /admin/ws/mgmt/modules - Missing wsId parameter
#          → Expected: /admin/ws/{wsId}/mgmt/modules
```

### CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/validate.yml
- name: Validate API Routes
  run: python validation/admin-route-validator/validate_routes.py .
```

---

## Migration Guide

### For Non-Compliant Routes

1. **Identify violations** using the validator
2. **Update Terraform** route definitions
3. **Update Lambda** route docstrings
4. **Update Frontend** API client methods
5. **Run validation** to confirm compliance
6. **Deploy and test** all affected flows

### Common Migrations

| Before | After |
|--------|-------|
| `/admin/ai/providers` | `/admin/sys/ai/providers` |
| `/admin/modules` | `/admin/sys/mgmt/modules` |
| `/admin/org/{orgId}/modules` | `/admin/org/mgmt/modules` |
| `/admin/workspace/{wsId}/config` | `/admin/ws/{wsId}/mgmt/config` |

---

## Related Documents

- `ADR-018b-API-GATEWAY-ROUTE-STANDARDS.md` - Architecture decision
- `standard_API-PATTERNS.md` - Request/response patterns
- `standard_LAMBDA-ROUTE-DOCSTRING.md` - Lambda documentation
- `standard_MODULAR-ADMIN-ARCHITECTURE.md` - Frontend admin UI
- `guide_API-TRACING-VALIDATION.md` - API tracing tool

---

**Last Updated:** 2026-01-25  
**Standard Version:** 1.0  
**Maintainer:** CORA Dev Toolkit Team