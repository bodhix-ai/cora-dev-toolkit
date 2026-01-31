# CORA Lambda Route Docstring Standard

## Overview

CORA Lambda functions that use **dynamic routing** (dispatching multiple routes through a single handler based on `event['rawPath']`) MUST document their routes in the module docstring. This enables validation tools to verify that all API Gateway routes have corresponding Lambda handlers.

## Why This Standard Exists

The API Tracer validation tool performs static analysis to match:
1. **API Gateway routes** (from Terraform `outputs.tf`)
2. **Lambda handlers** (from Python `lambda_function.py`)

When a Lambda uses dynamic routing, the handler code dispatches requests based on the path at runtime. Static analysis cannot determine which routes are handled without explicit documentation.

**Without docstring routes:** Validator reports false `missing_lambda_handler` errors.

**With docstring routes:** Validator correctly matches Gateway routes to Lambda handlers.

## Format Specification

### Location

Routes MUST be documented in the **module docstring** at the top of `lambda_function.py`.

### Syntax

```python
"""
Module Name - Brief Description

Extended description of the Lambda's purpose and behavior.

Routes - Category Name:
- METHOD /path - Brief description
- METHOD /path/{param} - Brief description with path parameter
- METHOD /path/{param}/action - Brief description

Routes - Another Category:
- METHOD /another/path - Description
"""
```

### Rules

1. **Section Header:** Use `Routes - CategoryName:` or `Endpoints - CategoryName:` on its own line
2. **Route Format:** `- METHOD /path - description`
   - METHOD: GET, POST, PUT, PATCH, DELETE (case-insensitive)
   - Path: Must start with `/`
   - Description: Optional but recommended
3. **Path Parameters:** Use `{paramName}` format (e.g., `/ws/{id}`, `/orgs/{orgId}`)
4. **Multiple Categories:** Group related routes under meaningful category headers

### Example

```python
"""
Workspace Module - Main Handler

This Lambda function provides API endpoints for workspace management including
CRUD operations, member management, and favorites. It follows CORA patterns
with standard auth and role-based authorization.

Routes - Workspaces:
- GET /ws - List user's workspaces
- POST /ws - Create new workspace
- GET /ws/{workspaceId} - Get workspace details
- PUT /ws/{workspaceId} - Update workspace
- DELETE /ws/{workspaceId} - Soft delete workspace
- POST /ws/{workspaceId}/restore - Restore deleted workspace

Routes - Members:
- GET /ws/{workspaceId}/members - List workspace members
- POST /ws/{workspaceId}/members - Add member
- PUT /ws/{workspaceId}/members/{memberId} - Update member role
- DELETE /ws/{workspaceId}/members/{memberId} - Remove member

Routes - Favorites:
- POST /ws/{workspaceId}/favorite - Toggle favorite
- GET /ws/favorites - List user's favorites

Routes - Config:
- GET /ws/config - Get workspace config
- PUT /ws/config - Update workspace config

Routes - Admin:
- GET /ws/admin/stats - Get workspace statistics
- GET /ws/admin/analytics - Get workspace analytics
- GET /ws/admin/workspaces - List all workspaces (admin)
- POST /ws/admin/workspaces/{workspaceId}/restore - Restore deleted workspace (admin)
- DELETE /ws/admin/workspaces/{workspaceId} - Delete workspace (admin)
"""

import json
# ... rest of Lambda code
```

## Validation

The API Tracer validator parses Lambda docstrings using this regex pattern:

```regex
^\\s*-\\s+(GET|POST|PUT|PATCH|DELETE)\\s+(/\\S+)\\s*(?:-.*)?$
```

Routes are extracted and matched against API Gateway route definitions.

### Path Parameter Matching

**IMPORTANT:** As of January 2026, path parameter names MUST match exactly between infrastructure and Lambda docstrings per the [API Patterns Standard](./standard_API-PATTERNS.md#part-3-path-parameter-naming-convention).

Use descriptive, resource-specific parameter names consistently:
- ✅ `/ws/{workspaceId}/members/{memberId}` - Descriptive and consistent
- ❌ `/ws/{id}/members/{id}` - Generic and ambiguous

See the [Path Parameter Naming Convention](./standard_API-PATTERNS.md#part-3-path-parameter-naming-convention) for the complete standard.

## Enforcement

When validation detects a Gateway route without a matching Lambda handler, it reports:

```
ERROR: API Gateway defines GET /ws/admin/stats but no Lambda handler found
Suggestion: Add route to Lambda docstring for function 'workspace' 
            (see CORA Lambda Route Docstring Standard)
```

## When to Use This Standard

| Scenario | Use Docstring Routes? |
|----------|----------------------|
| Dynamic routing (dispatcher pattern) | ✅ Yes - Required |
| Single route per Lambda | ❌ No - AST parsing detects it |
| Express-style framework | ❌ No - AST parsing detects decorators |

## Migration Checklist

When adding routes to an existing Lambda:

- [ ] Add route to Lambda docstring under appropriate category
- [ ] Add route to infrastructure `outputs.tf` (api_routes)
- [ ] Implement handler logic in Lambda
- [ ] Run `cora-validate.py` to verify no errors

## Related Documents

- [Module Development Guide](../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md)
- [API Tracing Validation Guide](../guides/guide_API-TRACING-VALIDATION.md)
- [Module Integration Spec](./standard_module-integration-spec.md)

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-10 | Session 82 | Updated examples to use descriptive path parameters ({workspaceId} instead of {id}) |
| 2026-01-08 | Session 72 | Initial standard created |
