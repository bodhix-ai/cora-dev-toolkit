# {MODULE_NAME} Module - Technical Specification

**Module Name:** {module-name}  
**Version:** 1.0  
**Status:** [Draft | Approved | In Progress | Complete]  
**Created:** {date}

**Parent Specification:** [MODULE-{MODULE_NAME}-SPEC.md](./MODULE-{MODULE_NAME}-SPEC.md)

---

## Table of Contents

1. [Data Model](#data-model)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Core Module Integrations](#core-module-integrations)
5. [Functional Module Dependencies](#functional-module-dependencies)
6. [Backend Implementation Patterns](#backend-implementation-patterns)
7. [Infrastructure Requirements](#infrastructure-requirements)
8. [Testing Requirements](#testing-requirements)

---

## 1. Data Model

### 1.1 Entity: {entity_name}

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

#### Validation Rules

**Field Validation:**
- `name`: Required, 1-255 characters, unique per organization
- `status`: Must be one of: active, archived
- `org_id`: User must be member of organization
- [Add other validation rules]

**Business Rules:**
1. [Business rule 1]
2. [Business rule 2]
3. [Business rule 3]

#### State Transitions (if applicable)

```
[State diagram or state transition table]

active → archived (when deleted)
archived → active (when restored)
```

### 1.2 Entity: {related_entity} (if applicable)

[Repeat structure for additional entities]

---

## 2. Database Schema

### 2.1 Migration: `001_create_{entity}_table.sql`

**Purpose:** Create main entity table with indexes

```sql
-- ========================================
-- {MODULE_NAME} Module Schema
-- Created: {date}
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
    CONSTRAINT {entity}_status_check CHECK (status IN ('active', 'archived')),
    CONSTRAINT {entity}_name_org_unique UNIQUE (org_id, name)
);

-- Indexes
CREATE INDEX idx_{entity}_org_id ON public.{entity}(org_id);
CREATE INDEX idx_{entity}_status ON public.{entity}(status);
CREATE INDEX idx_{entity}_created_at ON public.{entity}(created_at DESC);

-- Add custom indexes as needed
-- Example: CREATE INDEX idx_{entity}_custom ON public.{entity}(custom_field);

-- Comments
COMMENT ON TABLE public.{entity} IS '[Description of this table]';
COMMENT ON COLUMN public.{entity}.org_id IS 'Organization ID for multi-tenancy';
COMMENT ON COLUMN public.{entity}.status IS 'Entity status: active or archived';
```

### 2.2 Migration: `002_apply_rls_{entity}.sql`

**Purpose:** Enable Row Level Security and create policies

```sql
-- ========================================
-- Row Level Security for {entity}
-- ========================================

-- Enable RLS
ALTER TABLE public.{entity} ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
CREATE POLICY "{entity}_select_policy" ON public.{entity}
    FOR SELECT
    USING (can_access_org_data(org_id));

-- INSERT Policy
CREATE POLICY "{entity}_insert_policy" ON public.{entity}
    FOR INSERT
    WITH CHECK (can_access_org_data(org_id));

-- UPDATE Policy
CREATE POLICY "{entity}_update_policy" ON public.{entity}
    FOR UPDATE
    USING (can_modify_org_data(org_id))
    WITH CHECK (can_modify_org_data(org_id));

-- DELETE Policy
CREATE POLICY "{entity}_delete_policy" ON public.{entity}
    FOR DELETE
    USING (can_modify_org_data(org_id));

-- Comments on policies
COMMENT ON POLICY "{entity}_select_policy" ON public.{entity} IS 'Users can view entities in orgs they belong to';
```

### 2.3 Migration: `003_create_triggers_{entity}.sql`

**Purpose:** Create triggers for automated behavior

```sql
-- ========================================
-- Triggers for {entity}
-- ========================================

-- Update timestamp trigger
CREATE TRIGGER update_{entity}_updated_at
    BEFORE UPDATE ON public.{entity}
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add custom triggers as needed
```

### 2.4 Additional Tables (if applicable)

[Repeat migration structure for each additional table]

---

## 3. API Endpoints

### Base Path: `/api/{module}/`

### 3.1 List Entities

```
GET /api/{module}/{entities}?orgId={uuid}
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| orgId | UUID | Yes | - | Organization ID (multi-tenant filter) |
| status | string | No | - | Filter by status (active, archived) |
| limit | integer | No | 100 | Max results (1-1000) |
| offset | integer | No | 0 | Pagination offset |
| search | string | No | - | Search by name (case-insensitive) |
| sortBy | string | No | created_at | Sort field (name, created_at) |
| sortOrder | string | No | desc | Sort order (asc, desc) |

**Request Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Validation:**
- `orgId`: Required, valid UUID, user must be member
- `limit`: Integer between 1-1000
- `offset`: Non-negative integer
- `status`: Must be one of: active, archived (if provided)
- `sortBy`: Must be one of allowed fields
- `sortOrder`: Must be 'asc' or 'desc'

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
  ],
  "pagination": {
    "total": 100,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

**Error Responses:**

| Status | Description | Example Response |
|--------|-------------|------------------|
| 400 | Missing orgId parameter | `{"success": false, "error": "orgId is required"}` |
| 400 | Invalid UUID format | `{"success": false, "error": "Invalid orgId format"}` |
| 403 | User not member of organization | `{"success": false, "error": "No access to organization"}` |
| 500 | Internal server error | `{"success": false, "error": "Internal error"}` |

### 3.2 Get Single Entity

```
GET /api/{module}/{entities}/{id}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Entity ID |

**Validation:**
- `id`: Valid UUID
- User must have access to entity's organization

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
    "created_at": "2025-12-31T12:00:00Z",
    "updated_at": "2025-12-31T12:00:00Z",
    "created_by": "uuid",
    "updated_by": "uuid"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 404 | Entity not found |
| 403 | User not member of organization |
| 500 | Internal server error |

### 3.3 Create Entity

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

**Field Validation:**
- `org_id`: Required, valid UUID, user must be member
- `name`: Required, 1-255 characters, unique per org
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
    "description": "string",
    "status": "active",
    "created_at": "2025-12-31T12:00:00Z",
    "created_by": "uuid"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Validation error (missing required fields) |
| 400 | Duplicate name in organization |
| 403 | User not member of organization |
| 500 | Internal server error |

### 3.4 Update Entity

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

**Field Validation:**
- `name`: If provided, 1-255 characters, unique per org
- `description`: If provided, max 1000 characters
- `status`: If provided, enum: active|archived

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "updated string",
    "description": "updated string",
    "status": "active",
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
| 409 | Name conflict (duplicate name) |
| 500 | Internal server error |

### 3.5 Delete Entity

```
DELETE /api/{module}/{entities}/{id}
```

**Deletion Strategy:**
- Soft delete (set status to 'archived')
- OR Hard delete (if no dependencies)

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
| 500 | Internal server error |

### 3.6 Custom Endpoints (if applicable)

[Document any custom endpoints beyond CRUD]

**Example:**
```
POST /api/{module}/{entities}/{id}/restore
```

---

## 4. Core Module Integrations

### 4.1 module-access Integration

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
entities = access.find_many(
    table='{entity}',
    filters={'org_id': org_id, 'status': 'active'},
    select='*',
    order_by='created_at DESC',
    limit=100
)

# Find one
entity = access.find_one(
    table='{entity}',
    filters={'id': entity_id, 'org_id': org_id}
)

# Insert
new_entity = access.insert_one(
    table='{entity}',
    data={
        'org_id': org_id,
        'name': name,
        'description': description,
        'created_by': user_id
    }
)

# Update
updated = access.update_one(
    table='{entity}',
    filters={'id': entity_id, 'org_id': org_id},
    data={'name': new_name, 'updated_by': user_id}
)

# Delete
access.delete_one(
    table='{entity}',
    filters={'id': entity_id, 'org_id': org_id}
)
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
return access.conflict_response(message)  # 409
return access.internal_error_response(message)  # 500
```

**Validation:**

```python
# UUID validation
org_id = access.validate_uuid(org_id_str, 'orgId')

# Custom validation
if not name or len(name) > 255:
    raise access.ValidationError('Name must be 1-255 characters')
```

### 4.2 module-ai Integration

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
    ],
    temperature=0.7,
    max_tokens=1000
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

### 4.3 module-mgmt Integration

**Health Check:**

```python
def handle_health_check():
    """Health check endpoint for module-mgmt monitoring"""
    return {
        'module': '{module-name}',
        'status': 'healthy',
        'checks': {
            'database': check_database_connection(),
            'dependencies': check_dependencies()
        },
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    }

def check_database_connection():
    """Verify database connectivity"""
    try:
        access.find_one(table='{entity}', filters={'id': 'test'})
        return 'ok'
    except Exception:
        return 'error'

def check_dependencies():
    """Verify core module dependencies"""
    checks = {}
    # Check module-access
    try:
        import access_common
        checks['module-access'] = 'ok'
    except ImportError:
        checks['module-access'] = 'error'
    
    return checks
```

**Module Metadata:**

```json
{
  "module_name": "{module-name}",
  "module_version": "1.0.0",
  "description": "{module description}",
  "endpoints": [
    {"path": "/api/{module}/{entities}", "method": "GET"},
    {"path": "/api/{module}/{entities}", "method": "POST"},
    {"path": "/api/{module}/{entities}/{id}", "method": "GET"},
    {"path": "/api/{module}/{entities}/{id}", "method": "PUT"},
    {"path": "/api/{module}/{entities}/{id}", "method": "DELETE"}
  ],
  "dependencies": [
    "module-access@1.0.0",
    "module-mgmt@1.0.0"
  ]
}
```

---

## 5. Functional Module Dependencies

### 5.1 [Dependency Name] (if applicable)

**Why needed:** [Explanation]

**Integration points:**

```python
import {dependency}_common as {dependency}

# Usage example
result = {dependency}.shared_method(org_id, params)
```

**Example:**

```python
import kb_common as kb

# Search knowledge base for context
if entity.get('kb_base_id'):
    relevant_docs = kb.search_documents(
        org_id=org_id,
        kb_base_id=entity['kb_base_id'],
        query=search_query,
        limit=5
    )
```

---

## 6. Backend Implementation Patterns

### 6.1 Lambda Function Structure

**File:** `backend/lambdas/{entity}/lambda_function.py`

```python
import json
from typing import Dict, Any
import access_common as access

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main Lambda handler - routes to specific handlers"""
    print(json.dumps(event, default=str))
    
    try:
        # Extract user
        user_info = access.get_user_from_event(event)
        user_id = access.get_supabase_user_id_from_okta_uid(user_info['user_id'])
        
        # Route to handlers
        http_method = event.get('httpMethod')
        path_params = event.get('pathParameters') or {}
        
        if http_method == 'GET' and not path_params.get('id'):
            return handle_list(event, user_id)
        elif http_method == 'GET' and path_params.get('id'):
            return handle_get(event, user_id, path_params['id'])
        elif http_method == 'POST':
            return handle_create(event, user_id)
        elif http_method == 'PUT':
            return handle_update(event, user_id, path_params['id'])
        elif http_method == 'DELETE':
            return handle_delete(event, user_id, path_params['id'])
        else:
            return access.bad_request_response('Invalid method')
    
    except access.ValidationError as e:
        return access.bad_request_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        return access.internal_error_response('Internal error')
```

### 6.2 Handler Implementations

**List Handler:**

```python
def handle_list(event, user_id):
    """GET /{entities} - List all entities for org"""
    query_params = event.get('queryStringParameters', {}) or {}
    
    # Extract and validate parameters
    org_id = query_params.get('orgId')
    if not org_id:
        raise access.ValidationError('orgId required')
    org_id = access.validate_uuid(org_id, 'orgId')
    
    # Verify org membership
    membership = access.find_one(
        table='org_members',
        filters={'org_id': org_id, 'person_id': user_id, 'active': True}
    )
    if not membership:
        return access.forbidden_response('No access to organization')
    
    # Build filters
    filters = {'org_id': org_id}
    if query_params.get('status'):
        filters['status'] = query_params['status']
    
    # Pagination
    limit = min(int(query_params.get('limit', 100)), 1000)
    offset = int(query_params.get('offset', 0))
    
    # Query entities
    entities = access.find_many(
        table='{entity}',
        filters=filters,
        select='*',
        order_by='created_at DESC',
        limit=limit,
        offset=offset
    )
    
    # Format response
    return access.success_response({
        'data': access.format_records(entities),
        'pagination': {
            'limit': limit,
            'offset': offset,
            'hasMore': len(entities) == limit
        }
    })
```

**Create Handler:**

```python
def handle_create(event, user_id):
    """POST /{entities} - Create new entity"""
    body = json.loads(event.get('body', '{}'))
    
    # Extract and validate
    org_id = body.get('org_id')
    if not org_id:
        raise access.ValidationError('org_id required')
    org_id = access.validate_uuid(org_id, 'org_id')
    
    name = body.get('name')
    if not name or len(name) > 255:
        raise access.ValidationError('name must be 1-255 characters')
    
    # Verify org membership
    membership = access.find_one(
        table='org_members',
        filters={'org_id': org_id, 'person_id': user_id, 'active': True}
    )
    if not membership:
        return access.forbidden_response('No access to organization')
    
    # Check for duplicates
    existing = access.find_one(
        table='{entity}',
        filters={'org_id': org_id, 'name': name}
    )
    if existing:
        return access.conflict_response('Entity with this name already exists')
    
    # Create entity
    new_entity = access.insert_one(
        table='{entity}',
        data={
            'org_id': org_id,
            'name': name,
            'description': body.get('description'),
            'status': body.get('status', 'active'),
            'created_by': user_id
        }
    )
    
    return access.created_response(access.format_record(new_entity))
```

### 6.3 Common Layer (if exporting shared methods)

**File:** `backend/layers/{module}-common/python/{module}_common/__init__.py`

```python
from typing import Dict, Any, List
import access_common as access

def shared_method_1(org_id: str, param: str) -> List[Dict]:
    """
    Shared method description
    Used by other modules (e.g., module-xyz)
    
    Args:
        org_id: Organization ID
        param: Parameter description
        
    Returns:
        List of results
    """
    # Implementation
    results = access.find_many(
        table='{entity}',
        filters={'org_id': org_id, 'param': param}
    )
    return access.format_records(results)

# Export public API
__all__ = ['shared_method_1']
```

---

## 7. Infrastructure Requirements

### 7.1 Terraform Variables

**File:** `infrastructure/variables.tf`

```hcl
variable "module_{module}_enabled" {
  description = "Enable {module} module"
  type        = bool
  default     = true
}

variable "module_{module}_lambda_timeout" {
  description = "Lambda function timeout for {module}"
  type        = number
  default     = 30
}

variable "module_{module}_lambda_memory" {
  description = "Lambda function memory for {module}"
  type        = number
  default     = 512
}
```

### 7.2 Lambda Resources

**File:** `infrastructure/main.tf`

```hcl
# Lambda function for {entity} operations
resource "aws_lambda_function" "{module}_{entity}" {
  count = var.module_{module}_enabled ? 1 : 0
  
  function_name = "${var.project_name}-${var.environment}-{module}-{entity}"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = var.module_{module}_lambda_timeout
  memory_size   = var.module_{module}_lambda_memory
  
  filename         = "${path.module}/../dist/{module}-{entity}.zip"
  source_code_hash = filebase64sha256("${path.module}/../dist/{module}-{entity}.zip")
  
  role = aws_iam_role.{module}_lambda_role[0].arn
  
  layers = [
    var.access_common_layer_arn,
    # Add other layer ARNs as needed
  ]
  
  environment {
    variables = {
      SUPABASE_URL        = var.supabase_url
      SUPABASE_KEY        = var.supabase_service_key
      ENVIRONMENT         = var.environment
    }
  }
  
  tags = {
    Module      = "{module}"
    Environment = var.environment
  }
}
```

### 7.3 IAM Roles

```hcl
resource "aws_iam_role" "{module}_lambda_role" {
  count = var.module_{module}_enabled ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-{module}-lambda-role"
  
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

resource "aws_iam_role_policy_attachment" "{module}_lambda_basic" {
  count = var.module_{module}_enabled ? 1 : 0
  
  role       = aws_iam_role.{module}_lambda_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

### 7.4 API Gateway Routes

```hcl
# GET /{entities}
resource "aws_apigatewayv2_route" "{module}_{entities}_list" {
  count = var.module_{module}_enabled ? 1 : 0
  
  api_id    = var.api_gateway_id
  route_key = "GET /{module}/{entities}"
  target    = "integrations/${aws_apigatewayv2_integration.{module}_{entity}[0].id}"
  
  authorization_type = "JWT"
  authorizer_id      = var.authorizer_id
}

# POST /{entities}
resource "aws_apigatewayv2_route" "{module}_{entities}_create" {
  count = var.module_{module}_enabled ? 1 : 0
  
  api_id    = var.api_gateway_id
  route_key = "POST /{module}/{entities}"
  target    = "integrations/${aws_apigatewayv2_integration.{module}_{entity}[0].id}"
  
  authorization_type = "JWT"
  authorizer_id      = var.authorizer_id
}

# Additional routes...
```

---

## 8. Testing Requirements

### 8.1 Unit Tests

**Backend Tests:**

```python
# test_{entity}_lambda.py

def test_list_entities_success():
    """Test successful GET /{entities}"""
    event = {
        'httpMethod': 'GET',
        'queryStringParameters': {'orgId': 'test-org-id'},
        'headers': {'Authorization': 'Bearer token'}
    }
    response = lambda_handler(event, {})
    assert response['statusCode'] == 200
    data = json.loads(response['body'])
    assert data['success'] is True

def test_list_entities_missing_org_id():
    """Test missing orgId parameter (400 error)"""
    event = {
        'httpMethod': 'GET',
        'queryStringParameters': {},
        'headers': {'Authorization': 'Bearer token'}
    }
    response = lambda_handler(event, {})
    assert response['statusCode'] == 400

def test_list_entities_no_access():
    """Test user not in organization (403 error)"""
    # Implementation

def test_create_entity_success():
    """Test successful POST /{entities}"""
    # Implementation

def test_create_entity_validation():
    """Test validation errors (400 error)"""
    # Implementation

def test_create_entity_duplicate():
    """Test duplicate name (409 error)"""
    # Implementation
```

### 8.2 Integration Tests

```python
# test_{module}_integration.py

def test_full_crud_workflow():
    """Test complete CRUD workflow"""
    # 1. Create entity
    # 2. Get entity
    # 3. Update entity
    # 4. Delete entity
    # 5. Verify deletion
```

### 8.3 Test Coverage Requirements

- **Unit Test Coverage:** ≥80%
- **Integration Test Coverage:** ≥60%
- **Critical Paths:** 100% (create, update, delete operations)

---

**Document Version:** 1.0  
**Last Updated:** {date}  
**Author:** [Name/AI]  
**Specification Type:** Technical
