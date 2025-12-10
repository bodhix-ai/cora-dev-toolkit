# Module Integration Specification

**Architecture:** CORA (Context-Oriented Resource Architecture)  
**Version:** 1.0  
**Status:** Draft  
**Last Updated:** January 3, 2025

## Table of Contents

1. [Overview](#overview)
2. [Module Structure](#module-structure)
3. [Database Integration](#database-integration)
4. [Backend Integration](#backend-integration)
5. [Frontend Integration](#frontend-integration)
6. [Module Manifest](#module-manifest)
7. [Testing Requirements](#testing-requirements)
8. [Documentation Requirements](#documentation-requirements)
9. [Migration & Deployment](#migration--deployment)
10. [Infrastructure as Code](#infrastructure-as-code)

---

## Overview

This document defines the integration patterns and requirements for all modules in the **CORA (Context-Oriented Resource Architecture)** framework. CORA is a modular architecture designed to enable rapid development of AI-powered applications with multi-tenant data isolation, comprehensive security, and scalable infrastructure.

Modules are self-contained packages that provide specific functionality and integrate seamlessly with the application.

### Purpose

- Serve as a specification for building modular AI applications
- Ensure consistency across all modules in CORA-based applications
- Create a clear "contract" for module development
- Enable parallel development of multiple modules
- Provide a foundation for rapid AI application development
- Support code reuse across different AI applications

### Design Principles

1. **Self-Contained**: Each module contains all its database schema, backend logic, and frontend components
2. **Multi-Tenant**: All modules must support organization-based data isolation
3. **Consistent APIs**: Standard patterns for endpoints, responses, and error handling
4. **Testable**: Comprehensive test coverage for all components
5. **Documented**: Clear documentation for integration and usage

---

## Module Structure

### Directory Layout

```
packages/<module-name>/
├── README.md                    # Module documentation
├── package.json                 # Module dependencies (if applicable)
├── module.json                  # Module manifest
├── db/
│   ├── schema/                  # SQL schema files (numbered)
│   │   ├── 001-*.sql
│   │   ├── 002-*.sql
│   │   └── ...
│   ├── migrations/              # Migration scripts
│   │   ├── YYYYMMDD_*.sql
│   │   └── rollback/
│   └── seed-data/               # Test/demo data
│       └── *.sql
├── backend/
│   ├── layers/                  # Lambda layers (shared code)
│   │   └── <module>-common/
│   │       └── python/
│   │           └── <module>_common/
│   │               ├── __init__.py
│   │               ├── models.py
│   │               ├── validators.py
│   │               └── utils.py
│   └── lambdas/                 # Lambda functions
│       ├── <entity>/
│       │   ├── lambda_function.py
│       │   ├── requirements.txt
│       │   └── README.md
│       └── ...
└── frontend/
    ├── components/              # React components
    │   ├── <Component>.tsx
    │   └── index.ts
    ├── hooks/                   # React hooks
    │   ├── use<Entity>.ts
    │   └── index.ts
    ├── contexts/                # React contexts
    │   ├── <Entity>Context.tsx
    │   └── index.ts
    ├── lib/                     # Utility functions
    │   ├── api.ts
    │   └── utils.ts
    └── types/                   # TypeScript types
        └── index.ts
```

### Naming Conventions

- **Module Name**: `kebab-case` (e.g., `org-module`, `staffing-module`)
- **Directory Names**: `kebab-case` or `snake_case` for Python
- **File Names**:
  - SQL: `###-descriptive-name.sql` (numbered)
  - Python: `snake_case.py`
  - TypeScript: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- **Functions/Classes**: Language conventions (PascalCase for classes, camelCase for JS/TS, snake_case for Python)

---

## Database Integration

### Schema Requirements

#### 1. Multi-Tenancy Pattern

All org-scoped tables MUST include:

```sql
-- Required columns for multi-tenant tables
org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,

-- Recommended audit columns
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES auth.users(id),
updated_by UUID REFERENCES auth.users(id)
```

#### 2. Indexes

Required indexes for multi-tenant tables:

```sql
-- Performance index for org-scoped queries
CREATE INDEX idx_<table>_org_id ON <table>(org_id);

-- Composite indexes for common queries
CREATE INDEX idx_<table>_org_<field> ON <table>(org_id, <field>);
```

#### 3. Row Level Security (RLS)

All tables MUST have RLS enabled with standard policies:

```sql
-- Enable RLS
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

-- Standard policies using helper functions
CREATE POLICY "<table>_select_policy"
  ON <table>
  FOR SELECT
  TO authenticated
  USING (can_access_org_data(org_id));

CREATE POLICY "<table>_insert_policy"
  ON <table>
  FOR INSERT
  TO authenticated
  WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "<table>_update_policy"
  ON <table>
  FOR UPDATE
  TO authenticated
  USING (can_modify_org_data(org_id))
  WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "<table>_delete_policy"
  ON <table>
  FOR DELETE
  TO authenticated
  USING (can_modify_org_data(org_id));
```

#### 4. RLS Helper Functions

Modules MUST use these standard helper functions from org-module:

**Data Access:**

- `can_access_org_data(org_id)` - Read access (any member or global_owner)
- `can_modify_org_data(org_id)` - Write access (org_admin/org_owner or global_admin/global_owner)
- `can_modify_org_settings(org_id)` - Settings access (same as can_modify_org_data)
- `can_manage_org_membership(org_id)` - Membership access (org_owner or global_owner)

**Membership Checks:**

- `is_org_member(org_id)` - Any role in organization
- `is_org_user(org_id)` - Has org_user role
- `is_org_admin(org_id)` - Has org_admin role
- `is_org_owner(org_id)` - Has org_owner role
- `has_org_admin_access(org_id)` - Has org_admin OR org_owner

**Global Role Checks:**

- `is_global_user()` - Has global_user role
- `is_global_admin()` - Has global_admin role
- `is_global_owner()` - Has global_owner role
- `has_global_admin_access()` - Has global_admin OR global_owner

**Current User Info:**

- `auth.current_user_id()` - Current user UUID
- `auth.current_email()` - Current user email
- `auth.current_global_role()` - Current user's global role
- `auth.current_org_id()` - Current user's active organization

#### 5. Audit Triggers

Apply audit triggers to all data tables:

```sql
-- Apply audit trigger from org-module
SELECT apply_audit_trigger('<table_name>');
```

#### 6. Schema File Numbering

Schema files MUST be numbered sequentially:

```
001-enable-extensions.sql       # Extensions/setup
002-<table1>.sql                # Core tables
003-<table2>.sql
004-helper-functions.sql        # Module-specific helpers
005-triggers.sql                # Triggers
006-apply-rls-policies.sql      # RLS policy application
```

#### 7. Migration Files

Migration files use date-based naming:

```
migrations/
├── 20250103_add_status_column.sql
├── 20250104_update_indexes.sql
└── rollback/
    ├── 20250103_add_status_column.sql
    └── 20250104_update_indexes.sql
```

### Data Types

Standard data types to use:

- **IDs**: `UUID` (generated via `gen_random_uuid()`)
- **Timestamps**: `TIMESTAMPTZ` (always timezone-aware)
- **Text**: `VARCHAR(n)` for limited strings, `TEXT` for unlimited
- **Numbers**: `INTEGER`, `BIGINT`, `NUMERIC(precision, scale)`
- **Booleans**: `BOOLEAN`
- **JSON**: `JSONB` (not JSON)
- **Arrays**: Use PostgreSQL array types when appropriate

---

## Backend Integration

### Lambda Function Structure

#### Directory Structure

```
backend/lambdas/<entity>/
├── lambda_function.py          # Main handler
├── requirements.txt            # Dependencies
└── README.md                   # Function documentation
```

#### Handler Pattern

```python
import json
import os
from typing import Dict, Any
import <module>_common as common

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle <entity> operations

    Args:
        event: API Gateway event
        context: Lambda context

    Returns:
        API Gateway response
    """
    # Log incoming request
    print(json.dumps(event, default=str))

    try:
        # Extract user info from authorizer
        user_id = event['requestContext']['authorizer']['sub']
        email = event['requestContext']['authorizer']['username']

        # Extract request parameters
        http_method = event['httpMethod']
        path_params = event.get('pathParameters', {})
        query_params = event.get('queryStringParameters', {})
        body = json.loads(event.get('body', '{}'))

        # Route to appropriate handler
        if http_method == 'GET':
            result = handle_get(user_id, path_params, query_params)
        elif http_method == 'POST':
            result = handle_post(user_id, body)
        elif http_method == 'PUT':
            result = handle_put(user_id, path_params, body)
        elif http_method == 'DELETE':
            result = handle_delete(user_id, path_params)
        else:
            return error_response(405, 'Method not allowed')

        return success_response(result)

    except KeyError as e:
        return error_response(400, f'Missing required parameter: {str(e)}')
    except ValueError as e:
        return error_response(400, f'Invalid input: {str(e)}')
    except Exception as e:
        print(f'Error: {str(e)}')
        return error_response(500, 'Internal server error')

def success_response(data: Any, status_code: int = 200) -> Dict[str, Any]:
    """Return successful API response"""
    return {
        'statusCode': status_code,
        'body': json.dumps({
            'success': True,
            'data': data
        }, default=str),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        }
    }

def error_response(status_code: int, message: str) -> Dict[str, Any]:
    """Return error API response"""
    return {
        'statusCode': status_code,
        'body': json.dumps({
            'success': False,
            'error': message
        }),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        }
    }
```

### Database Access Pattern

Use RDS Data API through helper functions:

```python
# In <module>_common/db.py
import boto3
import os
from typing import List, Dict, Any, Optional

def run_query(sql: str, parameters: List[Dict] = None, transaction_id: str = None) -> List[List[Dict]]:
    """Execute SQL query using RDS Data API"""
    region = os.getenv("AWS_REGION", "us-east-1")
    cluster_arn = os.getenv("CLUSTER_ARN")
    secret_arn = os.getenv("SECRET_ARN")
    database = os.getenv("DATABASE_NAME")

    client = boto3.client('rds-data', region_name=region)

    kwargs = {
        'resourceArn': cluster_arn,
        'secretArn': secret_arn,
        'database': database,
        'sql': sql,
        'includeResultMetadata': True
    }

    if parameters:
        kwargs['parameters'] = parameters

    if transaction_id:
        kwargs['transactionId'] = transaction_id

    response = client.execute_statement(**kwargs)

    return parse_results(response)

def param_for_uuid(name: str, value: str) -> Dict:
    """Build UUID parameter"""
    return {
        'name': name,
        'value': {'stringValue': value},
        'typeHint': 'UUID'
    }

def param_for_string(name: str, value: Optional[str]) -> Dict:
    """Build string parameter"""
    if value is None:
        return {'name': name, 'value': {'isNull': True}}
    return {'name': name, 'value': {'stringValue': str(value)}}
```

### API Endpoint Conventions

#### RESTful Patterns

```
# Collection endpoints
GET    /api/<module>/<entities>              # List all (org-scoped)
POST   /api/<module>/<entities>              # Create new

# Resource endpoints
GET    /api/<module>/<entities>/:id          # Get specific
PUT    /api/<module>/<entities>/:id          # Update specific
DELETE /api/<module>/<entities>/:id          # Delete specific

# Sub-resource endpoints
GET    /api/<module>/<entities>/:id/<sub>    # Get sub-resources
POST   /api/<module>/<entities>/:id/<sub>    # Add sub-resource
```

#### Response Format

**Success Response:**

```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Error message here"
}
```

#### Status Codes

- `200` - Success (GET, PUT, DELETE)
- `201` - Created (POST)
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (authenticated but not authorized)
- `404` - Not Found
- `500` - Internal Server Error

### Lambda Layer Pattern

Create shared code in Lambda layers:

```python
# backend/layers/<module>-common/python/<module>_common/__init__.py
from .db import run_query, param_for_uuid, param_for_string
from .validators import validate_uuid, validate_email
from .models import Entity, EntityCreate, EntityUpdate

__all__ = [
    'run_query',
    'param_for_uuid',
    'param_for_string',
    'validate_uuid',
    'validate_email',
    'Entity',
    'EntityCreate',
    'EntityUpdate'
]
```

### Environment Variables

Required environment variables for Lambda functions:

```bash
AWS_REGION=us-east-1
CLUSTER_ARN=arn:aws:rds:region:account:cluster:cluster-name
SECRET_ARN=arn:aws:secretsmanager:region:account:secret:secret-name
DATABASE_NAME=postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
```

---

## Frontend Integration

### ⚠️ CRITICAL: Authentication Pattern

**ALL CORA modules MUST use the NextAuth factory pattern for authentication.**

**Required Reading:** [MODULE-NEXTAUTH-PATTERN.md](../development/MODULE-NEXTAUTH-PATTERN.md)

#### Quick Reference

```typescript
// ✅ CORRECT: API Client - Factory ONLY
import type { AuthenticatedClient } from "@sts-career/api-client";

export function createModuleClient(client: AuthenticatedClient) {
  return {
    getData: () => client.get("/module/data"),
    createItem: (data) => client.post("/module/data", data),
  };
}

// ✅ CORRECT: Hook - Accepts client parameter
export function useModuleData(client: AuthenticatedClient | null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }

    const api = createModuleClient(client);
    api
      .getData()
      .then(setData)
      .finally(() => setLoading(false));
  }, [client]);

  return { data, loading };
}

// ✅ CORRECT: Page - Uses NextAuth session
("use client");
import { useSession } from "next-auth/react";
import { createAuthenticatedClient } from "@sts-career/api-client";

export default function ModulePage() {
  const { data: session } = useSession();

  const client = session?.accessToken
    ? createAuthenticatedClient(session.accessToken)
    : null;

  const { data, loading } = useModuleData(client);

  // ... rest of component
}
```

**Anti-Patterns to AVOID:**

❌ Direct API exports: `export const api = { getData: async () => {...} }`  
❌ localStorage tokens: `localStorage.getItem("access_token")`  
❌ Hooks without client parameter  
❌ Direct Okta integration: `useOktaAuth()`

**See Also:**

- [ADR-004: NextAuth API Client Pattern](./ADR-004-NEXTAUTH-API-CLIENT-PATTERN.md)
- [MODULE-DEVELOPMENT-CHECKLIST.md](../development/MODULE-DEVELOPMENT-CHECKLIST.md)

---

### Component Structure

#### React Component Pattern

```typescript
// frontend/components/EntityList.tsx
import React, { useState, useEffect } from "react";
import { Box, Paper, Typography, Button } from "@mui/material";
import { useEntity } from "../hooks/useEntity";
import { Entity } from "../types";

interface EntityListProps {
  orgId: string;
  onSelect?: (entity: Entity) => void;
}

export function EntityList({ orgId, onSelect }: EntityListProps) {
  const { entities, loading, error, fetchEntities } = useEntity(orgId);

  useEffect(() => {
    fetchEntities();
  }, [orgId]);

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box>
      {entities.map((entity) => (
        <Paper key={entity.id} sx={{ p: 2, mb: 1 }}>
          <Typography>{entity.name}</Typography>
          {onSelect && <Button onClick={() => onSelect(entity)}>Select</Button>}
        </Paper>
      ))}
    </Box>
  );
}
```

### Custom Hooks Pattern

**IMPORTANT:** All hooks must follow the NextAuth factory pattern. See [MODULE-NEXTAUTH-PATTERN.md](../development/MODULE-NEXTAUTH-PATTERN.md) for complete details.

```typescript
// frontend/lib/api.ts - API Client Factory (REQUIRED)
import type { AuthenticatedClient } from "@sts-career/api-client";
import { Entity, EntityCreate } from "../types";

export interface EntityApiClient {
  getEntities: (orgId: string) => Promise<Entity[]>;
  getEntity: (id: string) => Promise<Entity>;
  createEntity: (entity: EntityCreate) => Promise<Entity>;
  updateEntity: (id: string, entity: Partial<Entity>) => Promise<Entity>;
  deleteEntity: (id: string) => Promise<void>;
}

export function createEntityClient(
  client: AuthenticatedClient
): EntityApiClient {
  return {
    getEntities: (orgId: string) =>
      client.get(`/module/entities?orgId=${orgId}`),
    getEntity: (id: string) => client.get(`/module/entities/${id}`),
    createEntity: (entity: EntityCreate) =>
      client.post("/module/entities", entity),
    updateEntity: (id: string, entity: Partial<Entity>) =>
      client.put(`/module/entities/${id}`, entity),
    deleteEntity: (id: string) => client.delete(`/module/entities/${id}`),
  };
}
```

```typescript
// frontend/hooks/useEntity.ts - Hook with client parameter (REQUIRED)
import { useState, useCallback, useEffect } from "react";
import type { AuthenticatedClient } from "@sts-career/api-client";
import { createEntityClient } from "../lib/api";
import { Entity, EntityCreate } from "../types";

export function useEntity(client: AuthenticatedClient | null, orgId: string) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntities = useCallback(async () => {
    if (!client) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const api = createEntityClient(client);
      const data = await api.getEntities(orgId);
      setEntities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching entities:", err);
    } finally {
      setLoading(false);
    }
  }, [client, orgId]);

  const createEntity = useCallback(
    async (entity: EntityCreate) => {
      if (!client) {
        throw new Error("Not authenticated");
      }

      try {
        const api = createEntityClient(client);
        await api.createEntity({ ...entity, org_id: orgId });
        await fetchEntities();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        throw err;
      }
    },
    [client, orgId, fetchEntities]
  );

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  return {
    entities,
    loading,
    error,
    fetchEntities,
    createEntity,
  };
}
```

```typescript
// Page usage example (REQUIRED)
"use client";

import { useSession } from "next-auth/react";
import { createAuthenticatedClient } from "@sts-career/api-client";
import { useEntity } from "@/hooks/useEntity";

export default function EntityPage() {
  const { data: session } = useSession();

  const client = session?.accessToken
    ? createAuthenticatedClient(session.accessToken)
    : null;

  const { entities, loading, error, createEntity } = useEntity(
    client,
    session?.user?.orgId || ""
  );

  if (!session) return <div>Please log in</div>;
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {entities.map((entity) => (
        <div key={entity.id}>{entity.name}</div>
      ))}
    </div>
  );
}
```

**Key Requirements:**

1. **API Client**: Export ONLY factory function, never direct API objects
2. **Hooks**: MUST accept `client: AuthenticatedClient | null` parameter
3. **Pages**: MUST use `useSession()` and `createAuthenticatedClient()`
4. **Null Safety**: All code must handle `client === null` case
5. **No localStorage**: Never store tokens in localStorage
6. **No Direct Fetch**: Use authenticated client, not direct fetch()

**Reference Implementation:** See `packages/org-module/frontend/` for working example.

### Context Pattern

```typescript
// frontend/contexts/EntityContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";
import { Entity } from "../types";

interface EntityContextValue {
  selectedEntity: Entity | null;
  setSelectedEntity: (entity: Entity | null) => void;
}

const EntityContext = createContext<EntityContextValue | undefined>(undefined);

export function EntityProvider({ children }: { children: ReactNode }) {
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  return (
    <EntityContext.Provider value={{ selectedEntity, setSelectedEntity }}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntityContext() {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error("useEntityContext must be used within EntityProvider");
  }
  return context;
}
```

### TypeScript Types

```typescript
// frontend/types/index.ts
export interface Entity {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export interface EntityCreate {
  org_id: string;
  name: string;
  description?: string;
}

export interface EntityUpdate {
  name?: string;
  description?: string;
}
```

---

## Module Manifest

Each module MUST include a `module.json` file:

```json
{
  "name": "org-module",
  "version": "1.0.0",
  "description": "Organization and user management module",
  "author": "Your Team",
  "license": "MIT",

  "dependencies": {
    "modules": [],
    "packages": ["@supabase/supabase-js", "@okta/okta-react"]
  },

  "provides": {
    "database": {
      "schema": [
        "db/schema/001-enable-uuid.sql",
        "db/schema/002-auth-users-schema.sql",
        "db/schema/003-external-identities.sql",
        "db/schema/004-profiles.sql",
        "db/schema/005-orgs.sql",
        "db/schema/006-org-members.sql",
        "db/schema/007-rls-helper-functions.sql",
        "db/schema/008-audit-triggers.sql",
        "db/schema/009-apply-rls-policies.sql"
      ],
      "tables": [
        "external_identities",
        "profiles",
        "org",
        "org_members",
        "audit_log"
      ],
      "functions": [
        "is_org_member",
        "can_access_org_data",
        "can_modify_org_data"
      ]
    },

    "api": {
      "endpoints": [
        "POST /identities/provision",
        "GET /profiles/me",
        "PUT /profiles/me",
        "GET /orgs",
        "POST /orgs",
        "GET /orgs/:id",
        "PUT /orgs/:id",
        "DELETE /orgs/:id",
        "GET /orgs/:id/members",
        "POST /orgs/:id/members",
        "PUT /orgs/:id/members/:memberId",
        "DELETE /orgs/:id/members/:memberId"
      ]
    },

    "frontend": {
      "components": ["ProfileCard", "OrgSelector", "OrgMemberList"],
      "hooks": ["useProfile", "useOrgs", "useCurrentOrg"],
      "contexts": ["OrgContext", "ProfileContext"]
    }
  },

  "permissions": {
    "database": ["rds:ExecuteStatement"],
    "storage": [],
    "external": ["okta:users:read"]
  }
}
```

---

## Testing Requirements

### Database Tests

```sql
-- Test RLS policies
-- File: db/tests/test_rls_policies.sql

-- Test 1: Org members can read their org data
BEGIN;
  -- Setup test data
  INSERT INTO test_table (org_id, name) VALUES ('org-1', 'Test');

  -- Test as org member
  SELECT test_as_user('user-1');
  SELECT COUNT(*) = 1 FROM test_table WHERE org_id = 'org-1';

  -- Cleanup
  SELECT reset_test_user();
ROLLBACK;
```

### Lambda Tests

```python
# tests/test_lambda_handler.py
import json
import pytest
from lambda_function import lambda_handler

def test_get_entity():
    event = {
        'httpMethod': 'GET',
        'pathParameters': {'id': 'test-id'},
        'requestContext': {
            'authorizer': {
                'sub': 'user-id',
                'username': 'user@example.com'
            }
        }
    }

    response = lambda_handler(event, None)

    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert body['success'] == True
```

### Frontend Tests

```typescript
// __tests__/components/EntityList.test.tsx
import { render, screen } from "@testing-library/react";
import { EntityList } from "../EntityList";

describe("EntityList", () => {
  it("renders entities", async () => {
    render(<EntityList orgId="test-org" />);

    expect(await screen.findByText("Test Entity")).toBeInTheDocument();
  });
});
```

---

## Documentation Requirements

### Module README

Each module MUST include a comprehensive README.md:

```markdown
# Module Name

Brief description

## Overview

Detailed description of module functionality

## Architecture

Explain architecture, dependencies, and integration points

## Database Schema

Document tables, relationships, and key fields

## API Endpoints

List and document all endpoints

## Frontend Components

Document exported components, hooks, and contexts

## Installation

How to set up the module

## Usage

Code examples for common use cases

## Testing

How to run tests

## License

License information
```

### API Documentation

Document all endpoints:

````markdown
### GET /api/module/entities

Get all entities for the current organization

**Authorization:** Required

**Query Parameters:**

- `orgId` (required): Organization ID
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Entity Name",
      ...
    }
  ]
}
```
````

**Error Codes:**

- `401`: Unauthorized
- `403`: Forbidden
- `500`: Internal Server Error

```

---

## Infrastructure as Code

### Terraform Module Structure

Each CORA module MUST include Terraform configuration for its infrastructure:

```

packages/<module-name>/
└── infrastructure/
├── README.md # Infrastructure documentation
├── variables.tf # Module input variables
├── main.tf # Core infrastructure resources
├── outputs.tf # Module outputs
├── versions.tf # Terraform version constraints
└── examples/
└── dev/
├── main.tf # Example usage
└── terraform.tfvars # Example variables

````

### Required Infrastructure Components

#### 1. Lambda Functions

```hcl
# infrastructure/main.tf
resource "aws_lambda_function" "entity" {
  function_name = "${var.environment}-${var.module_name}-entity"
  filename      = "${path.module}/../backend/lambdas/entity/function.zip"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.13"
  role          = aws_iam_role.lambda.arn

  layers = [var.common_layer_arn]

  environment {
    variables = {
      REGION              = var.aws_region
      SUPABASE_URL        = var.supabase_url
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      LOG_LEVEL           = var.log_level
    }
  }

  timeout     = 30
  memory_size = 256

  tags = merge(var.common_tags, {
    Module = var.module_name
  })
}
````

#### 2. Lambda Layer (if needed)

```hcl
resource "aws_lambda_layer_version" "module_common" {
  filename            = "${path.module}/../backend/layers/module-common/layer.zip"
  layer_name          = "${var.environment}-${var.module_name}-common"
  compatible_runtimes = ["python3.13"]

  description = "Common utilities for ${var.module_name}"
}
```

#### 3. IAM Roles and Policies

```hcl
resource "aws_iam_role" "lambda" {
  name = "${var.environment}-${var.module_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "secrets" {
  name = "${var.environment}-${var.module_name}-secrets"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = [
        var.supabase_secret_arn
      ]
    }]
  })
}
```

#### 4. API Gateway Integration

```hcl
# Outputs for API Gateway integration
output "lambda_invoke_arn" {
  description = "ARN for invoking Lambda from API Gateway"
  value       = aws_lambda_function.entity.invoke_arn
}

output "api_routes" {
  description = "API Gateway routes for this module"
  value = [
    {
      method      = "GET"
      path        = "/module/entities"
      integration = aws_lambda_function.entity.invoke_arn
    },
    {
      method      = "POST"
      path        = "/module/entities"
      integration = aws_lambda_function.entity.invoke_arn
    },
    {
      method      = "GET"
      path        = "/module/entities/{id}"
      integration = aws_lambda_function.entity.invoke_arn
    },
    {
      method      = "PUT"
      path        = "/module/entities/{id}"
      integration = aws_lambda_function.entity.invoke_arn
    },
    {
      method      = "DELETE"
      path        = "/module/entities/{id}"
      integration = aws_lambda_function.entity.invoke_arn
    }
  ]
}
```

#### 5. CloudWatch Alarms

```hcl
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.environment}-${var.module_name}-entity-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Alert when Lambda function has errors"

  dimensions = {
    FunctionName = aws_lambda_function.entity.function_name
  }

  alarm_actions = [var.sns_topic_arn]
}
```

### Module Variables

Standard variables every module should accept:

```hcl
# infrastructure/variables.tf
variable "environment" {
  description = "Environment name (dev, tst, stg, prd)"
  type        = string
}

variable "module_name" {
  description = "Name of the module"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
}

variable "supabase_secret_arn" {
  description = "ARN of Supabase credentials in Secrets Manager"
  type        = string
}

variable "common_layer_arn" {
  description = "ARN of common Lambda layer"
  type        = string
}

variable "sns_topic_arn" {
  description = "SNS topic for CloudWatch alarms"
  type        = string
}

variable "log_level" {
  description = "Log level for Lambda functions"
  type        = string
  default     = "INFO"
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
```

### Module Outputs

Standard outputs every module should provide:

```hcl
# infrastructure/outputs.tf
output "lambda_function_arns" {
  description = "ARNs of all Lambda functions"
  value = {
    entity = aws_lambda_function.entity.arn
  }
}

output "lambda_function_names" {
  description = "Names of all Lambda functions"
  value = {
    entity = aws_lambda_function.entity.function_name
  }
}

output "iam_role_arn" {
  description = "IAM role ARN for Lambda functions"
  value       = aws_iam_role.lambda.arn
}

output "api_routes" {
  description = "API routes to be added to API Gateway"
  value       = local.api_routes
}

output "layer_arn" {
  description = "Lambda layer ARN (if module provides one)"
  value       = try(aws_lambda_layer_version.module_common.arn, null)
}
```

### Integration Pattern

Modules integrate into the main infrastructure repository:

```hcl
# In sts-career-infra/terraform/environments/dev/main.tf

module "org_module" {
  source = "../../../sts-career-stack/packages/org-module/infrastructure"

  environment          = var.environment
  module_name          = "org"
  aws_region           = var.aws_region
  supabase_url         = var.supabase_url
  supabase_secret_arn  = module.secrets.supabase_secret_arn
  common_layer_arn     = module.common_layer.layer_arn
  sns_topic_arn        = module.monitoring.sns_topic_arn
  log_level            = var.log_level

  common_tags = {
    Environment = var.environment
    Project     = "sts-career"
    ManagedBy   = "terraform"
  }
}

# Add module routes to API Gateway
resource "aws_apigatewayv2_integration" "org_module" {
  for_each = { for route in module.org_module.api_routes : "${route.method}-${route.path}" => route }

  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = each.value.integration
}

resource "aws_apigatewayv2_route" "org_module" {
  for_each = { for route in module.org_module.api_routes : "${route.method}-${route.path}" => route }

  api_id    = aws_apigatewayv2_api.main.id
  route_key = "${each.value.method} ${each.value.path}"
  target    = "integrations/${aws_apigatewayv2_integration.org_module[each.key].id}"

  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.okta.id
}
```

### Secrets Management Pattern

#### Overview

CORA modules follow a three-tier secrets management approach:

1. **Local Development**: `local-secrets.tfvars` (gitignored)
2. **CI/CD**: GitHub Secrets → Environment Variables
3. **Runtime**: AWS Secrets Manager (accessed by Lambda functions)

#### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Local Development                                       │
│  ├── local-secrets.tfvars (gitignored)                  │
│  └── Terraform reads secrets → Creates AWS resources    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Infrastructure (Main Repo)                              │
│  ├── Secrets Module (creates AWS Secrets Manager)       │
│  └── Passes secret ARNs to CORA modules                 │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  CORA Module                                             │
│  ├── Receives secret ARNs as variables                  │
│  ├── Grants Lambda IAM permissions                      │
│  └── Passes ARNs to Lambda via environment variables    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Runtime (Lambda Functions)                              │
│  ├── Reads secret ARN from environment variable         │
│  ├── Calls AWS Secrets Manager API                      │
│  └── Retrieves actual secret values                     │
└─────────────────────────────────────────────────────────┘
```

#### Implementation

**Step 1: Main Infrastructure Creates Secrets**

```hcl
# In sts-career-infra/terraform/environments/dev/main.tf

# Secrets module creates AWS Secrets Manager entries
module "secrets" {
  source = "../../modules/secrets"

  environment = var.environment

  # Secrets from local-secrets.tfvars
  supabase_url             = var.supabase_url
  supabase_service_key     = var.supabase_service_role_key
  jira_api_key             = var.jira_api_key

  tags = var.common_tags
}

# Outputs secret ARNs for use by modules
output "supabase_secret_arn" {
  value = module.secrets.supabase_secret_arn
}
```

**Step 2: CORA Module Receives Secret ARNs**

```hcl
# In packages/my-module/infrastructure/variables.tf

variable "supabase_secret_arn" {
  description = "ARN of Supabase credentials in AWS Secrets Manager"
  type        = string
  sensitive   = true
}

variable "custom_api_secret_arn" {
  description = "ARN of custom API credentials (if module needs it)"
  type        = string
  sensitive   = true
  default     = ""
}
```

**Step 3: Module Grants Lambda Access**

```hcl
# In packages/my-module/infrastructure/main.tf

resource "aws_iam_role_policy" "secrets" {
  name = "${var.environment}-${var.module_name}-secrets"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Effect = "Allow"
          Action = [
            "secretsmanager:GetSecretValue"
          ]
          Resource = [
            var.supabase_secret_arn
          ]
        }
      ],
      var.custom_api_secret_arn != "" ? [{
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [var.custom_api_secret_arn]
      }] : []
    )
  })
}
```

**Step 4: Module Passes ARNs to Lambda**

```hcl
resource "aws_lambda_function" "entity" {
  # ... other config ...

  environment {
    variables = {
      REGION              = var.aws_region
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      CUSTOM_API_SECRET_ARN = var.custom_api_secret_arn
      LOG_LEVEL           = var.log_level
    }
  }
}
```

**Step 5: Lambda Retrieves Secrets at Runtime**

```python
# In Lambda function
import boto3
import json
import os

def get_secret(secret_arn: str) -> dict:
    """Retrieve secret from AWS Secrets Manager"""
    if not secret_arn:
        raise ValueError("Secret ARN not provided")

    client = boto3.client('secretsmanager', region_name=os.getenv('REGION'))
    response = client.get_secret_value(SecretId=secret_arn)

    return json.loads(response['SecretString'])

# Usage in Lambda
supabase_secret = get_secret(os.getenv('SUPABASE_SECRET_ARN'))
supabase_url = supabase_secret['url']
supabase_key = supabase_secret['service_role_key']
```

#### Local Development Pattern

**Directory Structure:**

```
sts-career-infra/terraform/environments/dev/
├── main.tf
├── variables.tf
├── terraform.tfvars              # Non-sensitive config (committed)
├── local-secrets.tfvars          # Sensitive secrets (gitignored)
└── local-secrets.tfvars.example  # Template (committed)
```

**local-secrets.tfvars.example** (committed to Git):

```hcl
# Supabase Configuration
supabase_url             = "https://YOUR_PROJECT.supabase.co"
supabase_service_role_key = "YOUR_SERVICE_ROLE_KEY"

# External API Keys
jira_api_key = "YOUR_JIRA_API_KEY"

# Add module-specific secrets here
custom_api_key = "YOUR_CUSTOM_API_KEY"
```

**local-secrets.tfvars** (gitignored - developer creates locally):

```hcl
# Actual secrets - NEVER COMMIT THIS FILE
supabase_url             = "https://xxxxx.supabase.co"
supabase_service_role_key = "eyJhbGc..."
jira_api_key             = "abcd1234..."
custom_api_key           = "secret-key-here"
```

**.gitignore** (critical):

```
# Terraform secrets
**/local-secrets.tfvars
*.auto.tfvars
```

**Deployment Command:**

```bash
terraform apply \
  -var-file="terraform.tfvars" \
  -var-file="local-secrets.tfvars"
```

#### CI/CD Pattern (GitHub Actions)

**GitHub Secrets Configuration:**

```
DEV_SUPABASE_URL
DEV_SUPABASE_SERVICE_KEY
DEV_JIRA_API_KEY

TST_SUPABASE_URL
TST_SUPABASE_SERVICE_KEY
TST_JIRA_API_KEY

# ... for STG and PRD
```

**GitHub Actions Workflow:**

```yaml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2

      - name: Deploy to Dev
        env:
          TF_VAR_supabase_url: ${{ secrets.DEV_SUPABASE_URL }}
          TF_VAR_supabase_service_role_key: ${{ secrets.DEV_SUPABASE_SERVICE_KEY }}
          TF_VAR_jira_api_key: ${{ secrets.DEV_JIRA_API_KEY }}
        run: |
          cd terraform/environments/dev
          terraform init
          terraform apply -auto-approve
```

#### Module-Specific Secrets

If a module requires its own secrets:

**Step 1: Add to Secrets Module**

```hcl
# In sts-career-infra/terraform/modules/secrets/main.tf

resource "aws_secretsmanager_secret" "custom_api" {
  count = var.custom_api_key != "" ? 1 : 0

  name = "${var.environment}-custom-api-credentials"
}

resource "aws_secretsmanager_secret_version" "custom_api" {
  count = var.custom_api_key != "" ? 1 : 0

  secret_id = aws_secretsmanager_secret.custom_api[0].id
  secret_string = jsonencode({
    api_key = var.custom_api_key
  })
}

output "custom_api_secret_arn" {
  value = try(aws_secretsmanager_secret.custom_api[0].arn, "")
}
```

**Step 2: Pass to Module**

```hcl
# In main infrastructure
module "my_module" {
  source = "../../../sts-career-stack/packages/my-module/infrastructure"

  supabase_secret_arn   = module.secrets.supabase_secret_arn
  custom_api_secret_arn = module.secrets.custom_api_secret_arn  # Optional

  # ... other variables
}
```

#### Security Best Practices

1. **Never Commit Secrets**

   - Use `.gitignore` for `local-secrets.tfvars`
   - Never hardcode secrets in Terraform files
   - Use environment variables or secret files only

2. **Separate Secret Values from ARNs**

   - Pass ARNs as Terraform variables (not sensitive)
   - Retrieve actual values at runtime via AWS SDK
   - Lambda functions never log secret values

3. **Use AWS Secrets Manager Rotation**

   ```hcl
   resource "aws_secretsmanager_secret_rotation" "supabase" {
     secret_id           = aws_secretsmanager_secret.supabase.id
     rotation_lambda_arn = aws_lambda_function.rotate_secret.arn

     rotation_rules {
       automatically_after_days = 30
     }
   }
   ```

4. **Principle of Least Privilege**

   - Grant Lambda only specific secret ARNs
   - Don't use wildcard `*` in IAM policies
   - Separate secrets per module if needed

5. **Audit Access**

   ```hcl
   resource "aws_cloudwatch_log_metric_filter" "secret_access" {
     name           = "${var.environment}-secret-access"
     log_group_name = "/aws/lambda/${var.module_name}"
     pattern        = "[...] GetSecretValue"

     metric_transformation {
       name      = "SecretAccessCount"
       namespace = "CustomMetrics"
       value     = "1"
     }
   }
   ```

#### Troubleshooting

**Secret Not Found:**

```python
# Add error handling
try:
    secret = get_secret(os.getenv('SUPABASE_SECRET_ARN'))
except Exception as e:
    print(f"Failed to retrieve secret: {e}")
    # Check IAM permissions, secret ARN, region
    raise
```

**Permission Denied:**

```bash
# Verify IAM policy includes secret ARN
aws iam get-role-policy \
  --role-name dev-my-module-lambda-role \
  --policy-name dev-my-module-secrets
```

**Wrong Secret Retrieved:**

```python
# Log ARN being accessed (but not the value!)
print(f"Accessing secret ARN: {os.getenv('SUPABASE_SECRET_ARN')}")
```

### Build Automation

Modules should include build scripts for packaging:

```bash
# infrastructure/build.sh
#!/bin/bash
set -e

MODULE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${MODULE_DIR}/backend"

echo "Building Lambda functions..."

# Build each Lambda function
for lambda_dir in "${BACKEND_DIR}"/lambdas/*; do
  if [ -d "${lambda_dir}" ]; then
    lambda_name=$(basename "${lambda_dir}")
    echo "  - Building ${lambda_name}..."

    cd "${lambda_dir}"

    # Install dependencies
    if [ -f requirements.txt ]; then
      pip install -r requirements.txt -t .
    fi

    # Create ZIP
    zip -r function.zip . -x "*.pyc" -x "__pycache__/*"

    cd - > /dev/null
  fi
done

# Build Lambda layer if exists
if [ -d "${BACKEND_DIR}/layers" ]; then
  echo "Building Lambda layers..."
  for layer_dir in "${BACKEND_DIR}"/layers/*; do
    if [ -d "${layer_dir}" ]; then
      layer_name=$(basename "${layer_dir}")
      echo "  - Building ${layer_name}..."

      cd "${layer_dir}"

      # Install dependencies to python/ directory
      if [ -f python/requirements.txt ]; then
        pip install -r python/requirements.txt -t python/
      fi

      # Create ZIP
      zip -r layer.zip python/ -x "*.pyc" -x "__pycache__/*"

      cd - > /dev/null
    fi
  done
fi

echo "Build complete!"
```

### Deployment Documentation

Each module must include infrastructure README:

````markdown
# Module Infrastructure

## Overview

This directory contains Terraform configuration for deploying the module infrastructure.

## Prerequisites

- Terraform >= 1.5.0
- AWS CLI configured
- Access to Supabase credentials in AWS Secrets Manager

## Resources Created

- Lambda Functions: 1 (entity CRUD)
- Lambda Layers: 1 (module-common)
- IAM Roles: 1 (Lambda execution role)
- CloudWatch Alarms: 3 (errors, duration, throttles)

## Usage

This module is designed to be used from the main infrastructure repository:

```hcl
module "my_module" {
  source = "../../../sts-career-stack/packages/my-module/infrastructure"

  environment          = "dev"
  module_name          = "my-module"
  # ... other variables
}
```
````

## Variables

See `variables.tf` for all available variables.

## Outputs

See `outputs.tf` for all module outputs.

## Building

Before deploying, build the Lambda packages:

```bash
./build.sh
```

## Manual Deployment (for testing)

```bash
cd examples/dev
terraform init
terraform plan
terraform apply
```

## Integration

Module routes are automatically integrated into API Gateway via outputs.

```

---

## Migration & Deployment

### Migration Process

1. **Schema Changes**: Apply migrations in order
2. **Data Migration**: Separate data migration scripts
3. **Rollback Plan**: Always include rollback scripts
4. **Testing**: Test migrations on staging first
5. **Documentation**: Document migration steps

### Deployment Checklist

- [ ] Schema files tested
- [ ] Lambda functions deployed
- [ ] Environment variables configured
- [ ] Frontend components integrated
- [ ] API endpoints registered
- [ ] RLS policies verified
- [ ] Documentation updated
- [ ] Tests passing

---

## Appendix

### CORA Architecture Benefits

**Context-Oriented Resource Architecture** provides:

1. **Rapid AI Application Development**: Pre-built patterns for authentication, multi-tenancy, and data isolation
2. **Scalability**: Modular design supports horizontal scaling and independent module deployment
3. **Security**: Row-level security (RLS) and role-based access control (RBAC) built-in
4. **Flexibility**: Easily swap or extend modules to meet specific application needs
5. **Reusability**: Share modules across multiple AI applications

### Example Module: org-module

Reference implementation: `packages/org-module/`

This module demonstrates CORA patterns for:
- Multi-tenant organization management
- User authentication and authorization
- Role-based permissions
- Audit logging

### Common Patterns

- Multi-tenant data isolation
- RLS helper functions
- Lambda handler structure
- React hooks for data fetching
- Error handling and logging

### Support

For questions or issues with module integration, refer to the CORA documentation or community forums.

---

**Document Version History:**

- v1.0 (2025-01-03): Initial specification
```
