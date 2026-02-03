# {MODULE_NAME} Module Specification

**Module Name:** {module-name}  
**Entity:** {entity-name}  
**Complexity:** [Simple | Medium | Complex]  
**Estimated Time:** [8 | 16-24 | 32-40] hours  
**Status:** [Draft | Approved | In Progress | Complete]  
**Created:** {date}

---

## 1. Overview

### Purpose

[What problem does this module solve? What business need does it address?]

### Scope

**In Scope:**
- [Feature 1]
- [Feature 2]
- [Feature 3]

**Out of Scope:**
- [What this module does NOT do]
- [Deferred features]

### Source Reference

**Legacy Code (if applicable):**
- Repository: {path/to/legacy/repo}
- Key files:
  - `{path/to/lambda1.py}` - [Description]
  - `{path/to/lambda2.py}` - [Description]
  - `{path/to/schema.sql}` - [Description]

**Use Cases (if applicable):**
- Document: `{path/to/requirements.md}`
- Epic: `{JIRA-123}` - [Epic name]

---

## 2. Complexity Assessment

### Score Breakdown

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Entity Count | [0-2] | [1 entity = 0, 2-3 = 1, 4+ = 2] |
| AI Integration | [0-2] | [None = 0, Basic = 1, Advanced = 2] |
| Functional Dependencies | [0-2] | [Count of dependencies beyond core] |
| Legacy Code Complexity | [0-2] | [< 500 lines = 0, 500-1000 = 1, 1000+ = 2] |
| Business Logic | [0-1] | [State machines, workflows = 1] |
| **Total** | **[0-9]** | **≤2 = Simple, 3-5 = Medium, 6+ = Complex** |

### Classification: [Simple | Medium | Complex]

**Time Estimate:** [8 | 16-24 | 32-40] hours

---

## 3. Data Model

### Entity 1: {entity_name}

**Purpose:** [What this entity represents]

#### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| org_id | UUID | Yes | - | FK to org(id) | Organization (multi-tenant) |
| name | VARCHAR(255) | Yes | - | NOT NULL | [Field description] |
| description | TEXT | No | NULL | - | [Field description] |
| status | VARCHAR(50) | Yes | 'active' | CHECK (status IN (...)) | active, archived |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Last updater user ID |

#### Relationships

```
{entity_name}
├── belongs_to: org (org_id → org.id)
├── belongs_to: auth.users (created_by → auth.users.id)
├── has_many: {related_entity} (via foreign key)
└── has_many_through: {join_entity}
```

#### Indexes

```sql
CREATE INDEX idx_{entity}_org_id ON {entity}(org_id);
CREATE INDEX idx_{entity}_status ON {entity}(status);
CREATE INDEX idx_{entity}_created_at ON {entity}(created_at DESC);
-- Add custom indexes as needed
```

#### Validation Rules

- **name**: Required, 1-255 characters, unique per organization
- **status**: Must be one of: active, archived
- **org_id**: User must be member of organization
- [Add other validation rules]

#### Business Rules

1. [Business rule 1]
2. [Business rule 2]
3. [Business rule 3]

### Entity 2: {related_entity} (if applicable)

[Repeat structure for additional entities]

---

## 4. API Endpoints

### Base Path: `/api/{module}/`

### 4.1 List Entities

```
GET /api/{module}/{entities}?orgId={uuid}
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| orgId | UUID | Yes | - | Organization ID (multi-tenant filter) |
| status | string | No | - | Filter by status |
| limit | integer | No | 100 | Max results (1-1000) |
| offset | integer | No | 0 | Pagination offset |
| search | string | No | - | Search by name |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "org_id": "uuid",
      "name": "string",
      "description": "string",
      "status": "active",
      "created_at": "2025-12-31T12:00:00Z",
      "updated_at": "2025-12-31T12:00:00Z",
      "created_by": "uuid",
      "updated_by": "uuid"
    }
  ]
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Missing orgId parameter |
| 403 | User not member of organization |
| 500 | Internal server error |

### 4.2 Get Single Entity

```
GET /api/{module}/{entities}/{id}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "org_id": "uuid",
    "name": "string",
    "description": "string",
    "status": "active",
    "created_at": "2025-12-31T12:00:00Z"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 404 | Entity not found |
| 403 | User not member of organization |

### 4.3 Create Entity

```
POST /api/{module}/{entities}
```

**Request Body:**

```json
{
  "org_id": "uuid",
  "name": "string",
  "description": "string (optional)",
  "status": "active (optional)"
}
```

**Validation:**
- `org_id`: Required, valid UUID, user must be member
- `name`: Required, 1-255 characters
- `description`: Optional, max 1000 characters
- `status`: Optional, default 'active', enum: active|archived

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "org_id": "uuid",
    "name": "string",
    "created_at": "2025-12-31T12:00:00Z"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Validation error |
| 403 | User not member of organization |

### 4.4 Update Entity

```
PUT /api/{module}/{entities}/{id}
```

**Request Body (all fields optional):**

```json
{
  "name": "string",
  "description": "string",
  "status": "archived"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "updated string",
    "updated_at": "2025-12-31T12:00:00Z",
    "updated_by": "uuid"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Validation error |
| 404 | Entity not found |
| 403 | User not member of organization |

### 4.5 Delete Entity

```
DELETE /api/{module}/{entities}/{id}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Entity deleted successfully",
    "id": "uuid"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 404 | Entity not found |
| 403 | User not member of organization |
| 409 | Cannot delete (has dependencies) |

### 4.6 Custom Endpoints (if applicable)

[Document any custom endpoints beyond CRUD]

---

## 5. Core Module Integrations

### 5.1 module-access Integration

**Authentication:**
```python
import access_common as access

# Extract user from event
user_info = access.get_user_from_event(event)
user_id = access.get_supabase_user_id_from_okta_uid(user_info['user_id'])
```

**Authorization:**
```python
# Verify org membership
membership = access.find_one(
    table='org_members',
    filters={'org_id': org_id, 'person_id': user_id, 'active': True}
)
if not membership:
    return access.forbidden_response('No access to organization')
```

**Database Operations:**
```python
# Find many
entities = access.find_many(table='{entity}', filters={'org_id': org_id})

# Find one
entity = access.find_one(table='{entity}', filters={'id': entity_id})

# Insert
new_entity = access.insert_one(
    table='{entity}',
    data={'org_id': org_id, 'name': name, 'created_by': user_id}
)

# Update
updated = access.update_one(
    table='{entity}',
    filters={'id': entity_id},
    data={'name': new_name, 'updated_by': user_id}
)

# Delete
access.delete_one(table='{entity}', filters={'id': entity_id})
```

**Response Functions:**
```python
# Success responses
return access.success_response(data)  # 200
return access.created_response(data)  # 201

# Error responses
return access.bad_request_response(message)  # 400
return access.forbidden_response(message)  # 403
return access.not_found_response(message)  # 404
return access.internal_error_response(message)  # 500
```

### 5.2 module-ai Integration

**[Include only if module uses AI features]**

```python
import ai_common as ai

# Get org's AI configuration
ai_config = ai.get_org_ai_config(org_id)

# Get available models
models = ai.get_available_models(org_id)

# Call AI model
response = ai.call_model(
    org_id=org_id,
    model_id=ai_config['default_model'],
    messages=[
        {'role': 'system', 'content': 'You are a helpful assistant'},
        {'role': 'user', 'content': user_message}
    ]
)

# Log usage for billing
ai.log_model_usage(
    org_id=org_id,
    user_id=user_id,
    model_id=ai_config['default_model'],
    tokens_used=response['usage']['total_tokens'],
    cost=response['cost']
)
```

### 5.3 module-mgmt Integration

**Module Registration:**
```python
# Health check endpoint
def handle_health_check():
    return {
        'module': '{module-name}',
        'status': 'healthy',
        'checks': {
            'database': check_database_connection(),
            'dependencies': check_dependencies()
        },
        'timestamp': datetime.utcnow().isoformat()
    }
```

**Admin Card Export (Frontend):**
```typescript
// frontend/adminCard.tsx
export const {module}AdminCard: AdminCardConfig = {
  id: '{module}-admin',
  title: '{Module} Management',
  description: 'Manage {module} features',
  icon: <Icon />,
  href: '/admin/{module}',
  context: 'platform',  // or 'organization'
  requiredRoles: ['platform_owner', 'platform_admin']
};
```

---

### 5.4 Authorization Integration (Two Layers)

CORA implements two distinct authorization layers with different purposes.

#### Layer 1: Admin Authorization (Module Configuration)

**Routes:** `/admin/sys/{module}/*`, `/admin/org/{module}/*`, `/admin/ws/{module}/*`  
**Purpose:** Module configuration and management by admins  
**Standards:** [ADR-019a](../docs/arch%20decisions/ADR-019a-AUTH-FRONTEND.md) (Frontend), [ADR-019b](../docs/arch%20decisions/ADR-019b-AUTH-BACKEND.md) (Backend)

**Backend Pattern:**
```python
# backend/lambdas/{module}-admin/lambda_function.py

from org_common.auth_helpers import (
    check_sys_admin,
    check_org_admin,
    check_ws_admin,
    get_org_context_from_event
)

def lambda_handler(event: dict, context: Any) -> dict:
    """Admin Lambda with centralized authorization"""
    user_id = common.get_supabase_user_id_from_external_uid(
        common.get_user_from_event(event)['user_id']
    )
    
    path = event.get('rawPath', '')
    
    # Centralized admin auth checks
    if path.startswith('/admin/sys/'):
        if not check_sys_admin(user_id):
            return common.forbidden_response('System admin role required')
    
    elif path.startswith('/admin/org/'):
        org_id = get_org_context_from_event(event)
        if not check_org_admin(org_id, user_id):
            return common.forbidden_response('Organization admin role required')
    
    elif path.startswith('/admin/ws/'):
        ws_id = extract_path_param(event, 'ws_id')
        if not check_ws_admin(ws_id, user_id):
            return common.forbidden_response('Workspace admin role required')
    
    # Route to handlers (auth already verified)
    return route_to_handler(user_id, event)


def handle_get_sys_config(user_id: str) -> dict:
    """Get system config (sys admin already verified)"""
    config = common.find_one('{module}_sys_config', {})
    return common.success_response(common.format_record(config))


def handle_get_org_config(user_id: str, event: dict) -> dict:
    """Get org config (org admin already verified)"""
    org_id = get_org_context_from_event(event)
    config = common.find_one('{module}_org_config', {'org_id': org_id})
    return common.success_response(common.format_record(config))
```

**Frontend Pattern:**
```typescript
// frontend/routes/admin/org/{module}/page.tsx
'use client';
import { useRole, useOrganizationContext } from '@cora/auth';

export default function OrgAdminPage() {
  const { isOrgAdmin, loading: roleLoading } = useRole();
  const { currentOrganization } = useOrganizationContext();
  
  // Wait for role check
  if (roleLoading) {
    return <CircularProgress />;
  }
  
  // Verify org admin role
  if (!isOrgAdmin) {
    return <Alert severity="error">Organization admin role required</Alert>;
  }
  
  // Render admin UI
  return <ModuleConfigUI orgId={currentOrganization.id} />;
}
```

#### Layer 2: Resource Permissions (User Data Access)

**Routes:** `/{module}/*` (data routes)  
**Purpose:** User data access and operations  
**Standards:** [ADR-019c](../docs/arch%20decisions/ADR-019c-AUTH-RESOURCE-PERMISSIONS.md), [03_std_back_RESOURCE-PERMISSIONS](../docs/standards/03_std_back_RESOURCE-PERMISSIONS.md)

**Database RPC Functions:**
```sql
-- backend/db/rpcs/001-{module}-permissions.sql

-- Ownership check
CREATE OR REPLACE FUNCTION is_{entity}_owner(p_user_id UUID, p_{entity}_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM {entity}
    WHERE id = p_{entity}_id AND created_by = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Membership check (from org-common)
-- is_org_member(p_org_id UUID, p_user_id UUID) - already exists
```

**Backend Permission Layer:**
```python
# backend/layers/{module}_common/python/{module}_common/permissions.py

"""
Module-specific resource permissions.

CRITICAL: These functions live in the MODULE's backend layer,
NOT in org-common (to avoid dependencies on optional modules).
"""

from org_common.db import call_rpc

def can_access_{entity}(user_id: str, {entity}_id: str) -> bool:
    """
    Check if user can access {entity}.
    
    Access granted if:
    - User owns the {entity}
    - {Entity} is shared with user (future)
    
    NOTE: Admin roles do NOT grant automatic access.
    """
    # Check ownership
    if call_rpc('is_{entity}_owner', {
        'p_user_id': user_id,
        'p_{entity}_id': {entity}_id
    }):
        return True
    
    # TODO: Check sharing when implemented
    return False

def can_edit_{entity}(user_id: str, {entity}_id: str) -> bool:
    """Check if user can edit {entity} (requires ownership)"""
    return call_rpc('is_{entity}_owner', {
        'p_user_id': user_id,
        'p_{entity}_id': {entity}_id
    })
```

**Backend Lambda Handler:**
```python
# backend/lambdas/{module}-data/lambda_function.py

from org_common.resource_permissions import can_access_org_resource
from {module}_common.permissions import can_access_{entity}, can_edit_{entity}

def handle_get_{entity}(user_id: str, event: dict) -> dict:
    """Get {entity} with permission check"""
    {entity}_id = extract_path_param(event, '{entity}_id')
    
    # Step 1: Fetch resource
    {entity} = common.find_one('{entity}', {'id': {entity}_id})
    if not {entity}:
        return common.not_found_response('{Entity} not found')
    
    # Step 2: Verify org membership (prevent cross-org access)
    if not can_access_org_resource(user_id, {entity}['org_id']):
        return common.forbidden_response('Not a member of this organization')
    
    # Step 3: Check resource permission (ownership/sharing)
    if not can_access_{entity}(user_id, {entity}_id):
        return common.forbidden_response('Access denied')
    
    return common.success_response(common.format_record({entity}))


def handle_update_{entity}(user_id: str, event: dict) -> dict:
    """Update {entity} (requires edit permission)"""
    {entity}_id = extract_path_param(event, '{entity}_id')
    body = json.loads(event.get('body', '{}'))
    
    # Fetch and verify access
    {entity} = common.find_one('{entity}', {'id': {entity}_id})
    if not {entity}:
        return common.not_found_response('{Entity} not found')
    
    if not can_access_org_resource(user_id, {entity}['org_id']):
        return common.forbidden_response('Not a member of this organization')
    
    # Check edit permission
    if not can_edit_{entity}(user_id, {entity}_id):
        return common.forbidden_response('Edit permission required')
    
    # Update
    updated = common.update_one(
        '{entity}',
        filters={'id': {entity}_id},
        data={**body, 'updated_by': user_id}
    )
    
    return common.success_response(common.format_record(updated))


def handle_list_{entities}(user_id: str, event: dict) -> dict:
    """List user's {entities} (org-scoped)"""
    query_params = event.get('queryStringParameters', {}) or {}
    
    org_id = query_params.get('orgId')
    if not org_id:
        return common.bad_request_response('orgId query parameter required')
    
    org_id = common.validate_uuid(org_id, 'orgId')
    
    # Verify org membership
    if not can_access_org_resource(user_id, org_id):
        return common.forbidden_response('Not a member of this organization')
    
    # List user's resources
    {entities} = common.find_many(
        '{entity}',
        filters={'org_id': org_id, 'created_by': user_id},
        order='created_at.desc'
    )
    
    return common.success_response(common.format_records({entities}))
```

**Frontend Pattern:**
```typescript
// frontend/hooks/use{Entities}.ts

export function use{Entities}(orgId: string) {
  const [{entities}, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetch{Entities} = async () => {
      try {
        const token = await authAdapter.getToken();
        const response = await fetch(
          `/{module}/{entities}?orgId=${orgId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.ok) {
          const data = await response.json();
          set{Entities}(data.data);
        } else if (response.status === 403) {
          setError('Access denied');
        }
      } catch (err) {
        setError('Failed to load {entities}');
      } finally {
        setLoading(false);
      }
    };
    
    fetch{Entities}();
  }, [orgId]);
  
  return { {entities}, loading, error };
}
```

**CRITICAL: No Admin Override**

Admin roles (sys_admin, org_admin, ws_admin) do NOT automatically grant access to user resources:

```python
# ❌ WRONG - do NOT add admin override to resource permissions
def can_access_{entity}_wrong(user_id: str, {entity}_id: str, org_id: str) -> bool:
    if is_{entity}_owner(user_id, {entity}_id):
        return True
    
    # ❌ WRONG - violates least privilege
    if is_org_admin(org_id, user_id):
        return True  # DO NOT DO THIS
    
    return False

# ✅ CORRECT - only ownership and sharing
def can_access_{entity}_correct(user_id: str, {entity}_id: str) -> bool:
    if is_{entity}_owner(user_id, {entity}_id):
        return True
    
    if is_{entity}_shared_with(user_id, {entity}_id):  # Future
        return True
    
    return False  # NO admin override
```

**Documentation:**
- [CORA Authorization Principles](../docs/standards/10_std_cora_PRINCIPLES.md#12-authorization-hierarchy-two-layers)
- [Admin Auth Patterns](../docs/standards/10_std_cora_PATTERNS-COOKBOOK.md#11-admin-authorization-patterns)
- [Resource Permission Patterns](../docs/standards/10_std_cora_PATTERNS-COOKBOOK.md#12-resource-permission-patterns)

---

## 6. Functional Module Dependencies

### Dependencies

```json
{
  "dependencies": {
    "modules": [
      "module-access@^1.0.0",
      "module-ai@^1.0.0",
      "module-mgmt@^1.0.0"
      // Add functional dependencies here
    ]
  }
}
```

### 6.1 [Dependency Name] (if applicable)

**Why needed:** [Explanation]

**Integration points:**

```python
import {dependency}_common as {dependency}

# Usage example
result = {dependency}.shared_method(org_id, params)
```

**Frontend integration:**

```typescript
import { useDepHook } from '@{project}/{dependency}-frontend';

const { data } = useDepHook(client, orgId);
```

---

## 7. Database Schema

### Migration: `{YYYYMMDD}_create_{entity}_table.sql`

```sql
-- ========================================
-- {MODULE_NAME} Module Schema
-- ========================================

-- Table: {entity}
CREATE TABLE IF NOT EXISTS public.{entity} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Add custom fields here
    
    -- Constraints
    CONSTRAINT {entity}_status_check CHECK (status IN ('active', 'archived'))
);

-- Indexes
CREATE INDEX idx_{entity}_org_id ON public.{entity}(org_id);
CREATE INDEX idx_{entity}_status ON public.{entity}(status);
CREATE INDEX idx_{entity}_created_at ON public.{entity}(created_at DESC);

-- Add custom indexes as needed

-- Enable Row Level Security
ALTER TABLE public.{entity} ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "{entity}_select_policy" ON public.{entity}
    FOR SELECT
    USING (can_access_org_data(org_id));

CREATE POLICY "{entity}_insert_policy" ON public.{entity}
    FOR INSERT
    WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "{entity}_update_policy" ON public.{entity}
    FOR UPDATE
    USING (can_modify_org_data(org_id))
    WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "{entity}_delete_policy" ON public.{entity}
    FOR DELETE
    USING (can_modify_org_data(org_id));

-- Triggers
CREATE TRIGGER update_{entity}_updated_at
    BEFORE UPDATE ON public.{entity}
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.{entity} IS '[Description of this table]';
COMMENT ON COLUMN public.{entity}.org_id IS 'Organization ID for multi-tenancy';
```

### Additional Tables (if applicable)

[Repeat for each additional table]

---

## 8. Frontend Components

### 8.1 API Client

**File:** `frontend/lib/api.ts`

```typescript
import type { AuthenticatedClient } from '@{project}/api-client';

export interface {Entity}ApiClient {
  get{Entities}: (orgId: string) => Promise<{Entity}[]>;
  get{Entity}: (id: string) => Promise<{Entity}>;
  create{Entity}: (entity: {Entity}Create) => Promise<{Entity}>;
  update{Entity}: (id: string, entity: Partial<{Entity}>) => Promise<{Entity}>;
  delete{Entity}: (id: string) => Promise<void>;
}

export function create{Entity}Client(client: AuthenticatedClient): {Entity}ApiClient {
  return {
    get{Entities}: (orgId) => client.get(`/{module}/{entities}?orgId=${orgId}`),
    get{Entity}: (id) => client.get(`/{module}/{entities}/${id}`),
    create{Entity}: (entity) => client.post('/{module}/{entities}', entity),
    update{Entity}: (id, entity) => client.put(`/{module}/{entities}/${id}`, entity),
    delete{Entity}: (id) => client.delete(`/{module}/{entities}/${id}`)
  };
}
```

### 8.2 Custom Hooks

**File:** `frontend/hooks/use{Entities}.ts`

```typescript
import { useState, useCallback, useEffect } from 'react';
import type { AuthenticatedClient } from '@{project}/api-client';
import { create{Entity}Client } from '../lib/api';

export function use{Entities}(client: AuthenticatedClient | null, orgId: string) {
  const [entities, setEntities] = useState<{Entity}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntities = useCallback(async () => {
    if (!client || !orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const api = create{Entity}Client(client);
      const data = await api.get{Entities}(orgId);
      setEntities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [client, orgId]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  return { entities, loading, error, refetch: fetchEntities };
}
```

### 8.3 Components

**Required Components:**

- `{Entity}List.tsx` - List view with filtering/search
- `{Entity}Detail.tsx` - Detail view
- `{Entity}Form.tsx` - Create/Edit form
- `{Entity}Card.tsx` - Card component for display

**Optional Components:**

- `{Entity}Table.tsx` - Table view with sorting
- `{Entity}Dashboard.tsx` - Dashboard/analytics
- Admin components (if applicable)

### 8.4 Types

**File:** `frontend/types/index.ts`

```typescript
export interface {Entity} {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export interface {Entity}Create {
  org_id: string;
  name: string;
  description?: string;
  status?: 'active' | 'archived';
}

export interface {Entity}Update {
  name?: string;
  description?: string;
  status?: 'active' | 'archived';
}
```

---

## 9. Configuration Requirements

### Required Configuration

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| [param1] | string | Yes | - | [Description] |
| [param2] | number | No | 100 | [Description] |

### Environment Variables

```bash
# Lambda environment variables
{MODULE}_FEATURE_ENABLED=true
{MODULE}_CONFIG_PARAM={value}
```

### Secrets

| Secret | Storage | Usage |
|--------|---------|-------|
| [secret_name] | AWS Secrets Manager | [What it's used for] |

---

## 10. Implementation Checklist

### Phase 1: Discovery & Analysis
- [x] Source code analyzed
- [x] Entities identified
- [x] API endpoints mapped
- [x] Dependencies identified
- [x] Complexity assessed
- [x] Specification document created

### Phase 2: Design Approval
- [ ] Human reviewed specification
- [ ] Dependencies validated
- [ ] Integration approach approved
- [ ] Specification approved

### Phase 3: Implementation

**Backend:**
- [ ] Module scaffolding generated
- [ ] Lambda handlers implemented
- [ ] Common layer created (if needed)
- [ ] Core module integration complete
- [ ] Functional module integration complete (if applicable)

**Database:**
- [ ] Schema SQL written
- [ ] RLS policies created
- [ ] Indexes added
- [ ] Migration tested

**Frontend:**
- [ ] API client created
- [ ] Custom hooks implemented
- [ ] Components created
- [ ] Types defined
- [ ] Admin card created (if applicable)

**Infrastructure:**
- [ ] Terraform variables defined
- [ ] Lambda resources defined
- [ ] IAM roles/policies created
- [ ] CloudWatch alarms added
- [ ] Outputs defined

**Documentation:**
- [ ] Module README created
- [ ] Configuration guide created
- [ ] API reference documented

### Phase 4: Validation & Deployment
- [ ] API compliance check passed
- [ ] Frontend compliance check passed
- [ ] Dependency validation passed
- [ ] Schema validation passed
- [ ] Configuration validated
- [ ] Module registered
- [ ] Database deployed
- [ ] Infrastructure deployed
- [ ] Smoke tests passed

---

## 11. Testing Requirements

### Backend Tests

```python
# test_{entity}_lambda.py

def test_get_all_entities_success():
    # Test successful GET /{entities}
    pass

def test_get_all_entities_missing_org_id():
    # Test missing orgId parameter (400 error)
    pass

def test_get_all_entities_no_access():
    # Test user not in organization (403 error)
    pass

def test_create_entity_success():
    # Test successful POST /{entities}
    pass

def test_create_entity_validation():
    # Test validation errors (400 error)
    pass
```

### Frontend Tests

```typescript
// {Entity}List.test.tsx

describe('{Entity}List', () => {
  it('displays loading state', () => { });
  it('displays entities after loading', async () => { });
  it('displays error state', async () => { });
  it('handles empty list', async () => { });
});
```

---

## 12. Migration Notes (if applicable)

### Legacy Code Mapping

| Legacy Component | New Component | Changes |
|------------------|---------------|---------|
| `legacy/handler.py` | `backend/lambdas/{entity}/lambda_function.py` | Converted to CORA patterns |
| `legacy/table.sql` | `db/schema/001-{entity}-table.sql` | Added RLS, standardized schema |

### Data Migration

```sql
-- If migrating from legacy table
INSERT INTO public.{entity} (
    id, org_id, name, description, created_at, created_by
)
SELECT 
    id, 
    organization_id AS org_id,
    legacy_name AS name,
    legacy_desc AS description,
    created_date AS created_at,
    creator_id AS created_by
FROM legacy.{legacy_table}
WHERE deleted_at IS NULL;
```

### Breaking Changes

- [ ] API path changed: `/old` → `/api/{module}/{entities}`
- [ ] Field renamed: `old_field` → `new_field`
- [ ] Authentication changed: API key → NextAuth JWT
- [ ] Response format changed: flat → `{success, data}` wrapper

---

## 13. Related Documentation

- [CORA Module Development Process](../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md)
- [Module Dependencies Standard](../standards/standard_MODULE-DEPENDENCIES.md)
- [Module Registration Standard](../standards/standard_MODULE-REGISTRATION.md)

---

**Document Version:** 1.0  
**Status:** [Draft | Approved | In Progress | Complete]  
**Last Updated:** {date}  
**Author:** [Name/AI]  
**Approved By:** [Name] (if approved)
