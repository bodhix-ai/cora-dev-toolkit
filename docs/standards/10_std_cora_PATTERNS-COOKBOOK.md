# CORA Patterns Cookbook

**Complete Guide to CORA Compliance Patterns**

A comprehensive cookbook of proven patterns for building CORA-compliant modules with examples from production code.

---

## Table of Contents

1. [Multi-Tenant Data Access](#1-multi-tenant-data-access)
2. [User Context Extraction](#2-user-context-extraction)
3. [Standard Response Handling](#3-standard-response-handling)
4. [Error Handling](#4-error-handling)
5. [Input Validation](#5-input-validation)
6. [Database Operations](#6-database-operations)
7. [File Upload Patterns](#7-file-upload-patterns)
8. [API Client Usage](#8-api-client-usage)
9. [Frontend Hooks](#9-frontend-hooks)
10. [Testing Patterns](#10-testing-patterns)

---

## 1. Multi-Tenant Data Access

### Pattern: Always Filter by org_id

**Problem**: In a multi-tenant system, users should only access data for organizations they belong to.

**Solution**: Every query must filter by `org_id` and verify user membership.

### ✅ Correct Implementation

```python
def handle_get_all(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Get all entities for an organization"""
    query_params = event.get('queryStringParameters', {}) or {}
    
    # REQUIRED: org_id must be provided
    org_id = query_params.get('orgId')
    if not org_id:
        raise common.ValidationError('orgId query parameter is required')
    
    # Validate UUID format
    org_id = common.validate_uuid(org_id, 'orgId')
    
    # CRITICAL: Verify user has access to this organization
    membership = common.find_one(
        table='org_members',
        filters={
            'org_id': org_id,
            'person_id': user_id,
            'active': True
        }
    )
    
    if not membership:
        raise common.ForbiddenError('You do not have access to this organization')
    
    # Query with org_id filter
    entities = common.find_many(
        table='entity',
        filters={'org_id': org_id},  # REQUIRED
        select='*',
        order='created_at.desc'
    )
    
    return common.success_response(common.format_records(entities))
```

### ❌ Incorrect Implementation

```python
def handle_get_all(user_id: str) -> Dict[str, Any]:
    """WRONG: No org_id filtering!"""
    # This would return ALL entities across ALL organizations
    entities = common.find_many(
        table='entity',
        select='*'
    )
    return common.success_response(entities)
```

### Database Schema Requirements

```sql
-- Every multi-tenant table MUST have org_id
CREATE TABLE public.entity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    -- other fields...
);

-- RLS Policy enforces org_id filtering at database level
CREATE POLICY "entity_org_members_select" ON public.entity
    FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE person_id = auth.uid() AND active = true
    ));
```

---

## 2. User Context Extraction

### Pattern: Extract User from Authorizer

**Problem**: Need to identify the authenticated user from API Gateway event.

**Solution**: Use `get_user_from_event()` and convert Okta UID to Supabase UUID.

### ✅ Complete Flow

```python
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda handler with proper user context extraction"""
    try:
        # Step 1: Extract Okta UID from authorizer
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        
        # Step 2: Convert to Supabase UUID for database operations
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # Step 3: Use supabase_user_id for all database operations
        result = handle_operation(supabase_user_id, event)
        return common.success_response(result)
        
    except KeyError as e:
        # Missing user context (authentication issue)
        return common.unauthorized_response(f'Missing user information: {str(e)}')
    except common.NotFoundError as e:
        # User not found in external_identities table
        return common.unauthorized_response(f'User not found: {str(e)}')
```

### User Info Structure

```python
# user_info dictionary contains:
{
    'user_id': 'okta_uid',          # Okta UID (NOT email)
    'email': 'user@example.com',
    'name': 'John Doe',
    'given_name': 'John',
    'family_name': 'Doe',
    'phone_number': '+1234567890'
}
```

---

## 3. Standard Response Handling

### Pattern: Use org_common Response Functions

**Problem**: Inconsistent API responses across Lambda functions.

**Solution**: Always use `org_common` response builders.

### ✅ Response Function Reference

```python
import org_common as common

# Success responses
return common.success_response(data)                    # 200 OK
return common.created_response(data)                    # 201 Created
return common.no_content_response()                     # 204 No Content

# Error responses
return common.bad_request_response(message)             # 400 Bad Request
return common.unauthorized_response(message)            # 401 Unauthorized
return common.forbidden_response(message)               # 403 Forbidden
return common.not_found_response(message)               # 404 Not Found
return common.conflict_response(message)                # 409 Conflict
return common.internal_error_response(message)          # 500 Internal Server Error
return common.method_not_allowed_response()             # 405 Method Not Allowed
```

### ✅ Response Format

All responses follow this structure:

```json
{
  "statusCode": 200,
  "body": "{\"success\":true,\"data\":{...}}",
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  }
}
```

### ❌ Never Do This

```python
# WRONG: Direct statusCode return
return {
    'statusCode': 200,
    'body': json.dumps({'data': result})
}

# WRONG: Inconsistent format
return {'result': data, 'success': True}
```

---

## 4. Error Handling

### Pattern: Use org_common Error Classes

**Problem**: Inconsistent error handling and HTTP status codes.

**Solution**: Use standard error classes with proper exception handling.

### ✅ Complete Error Handling

```python
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda with comprehensive error handling"""
    try:
        user_info = common.get_user_from_event(event)
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(user_info['user_id'])
        
        # Your business logic here
        result = perform_operation(supabase_user_id, event)
        return common.success_response(result)
        
    except KeyError as e:
        # Missing required field in event
        print(f'KeyError: {str(e)}')
        return common.unauthorized_response(f'Missing user information: {str(e)}')
    
    except common.NotFoundError as e:
        # Resource not found (user or entity)
        print(f'NotFoundError: {str(e)}')
        return common.unauthorized_response(f'User not found: {str(e)}') if 'user' in str(e).lower() \
            else common.not_found_response(str(e))
    
    except common.ValidationError as e:
        # Invalid input (bad UUID, missing field, etc.)
        return common.bad_request_response(str(e))
    
    except common.ForbiddenError as e:
        # User lacks permission
        return common.forbidden_response(str(e))
    
    except common.UnauthorizedError as e:
        # Authentication issue
        return common.unauthorized_response(str(e))
    
    except Exception as e:
        # Unexpected error - log details, return generic message
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response('Internal server error')
```

### Error Class Usage

```python
# Validation errors
if not org_id:
    raise common.ValidationError('org_id is required')

if not validate_email(email):
    raise common.ValidationError('Invalid email format')

# Not found errors
entity = common.find_one(table='entity', filters={'id': entity_id})
if not entity:
    raise common.NotFoundError('Entity not found')

# Authorization errors
if membership['role_name'] not in ['org_admin', 'org_owner']:
    raise common.ForbiddenError('Only admins can perform this action')

# Authentication errors
if not user_id:
    raise common.UnauthorizedError('Authentication required')
```

---

## 5. Input Validation

### Pattern: Validate All Inputs

**Problem**: Invalid input causes cryptic errors or security issues.

**Solution**: Use `org_common` validators for all user input.

### ✅ Validation Examples

```python
import org_common as common

# Required fields
org_id = common.validate_required(body.get('org_id'), 'org_id')
name = common.validate_required(body.get('name'), 'name')

# UUID validation
entity_id = common.validate_uuid(entity_id, 'entity_id')
org_id = common.validate_uuid(org_id, 'org_id')

# String length validation
name = common.validate_string_length(name, 'name', min_length=1, max_length=255)
description = common.validate_string_length(description, 'description', max_length=1000)

# Email validation
email = common.validate_email(email, 'email')

# URL validation
logo_url = common.validate_url(logo_url, 'logo_url')

# Integer validation
limit = common.validate_integer(
    query_params.get('limit', 100),
    'limit',
    min_value=1,
    max_value=1000
)

# Boolean validation
active = common.validate_boolean(body.get('active'), 'active')

# Choice validation (enum)
status = common.validate_choices(
    body.get('status'),
    'status',
    choices=['draft', 'active', 'archived']
)

# Role validation
role = common.validate_org_role(body.get('role'), 'role')
```

### Complete Validation Example

```python
def handle_create(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Create entity with full validation"""
    body = json.loads(event.get('body', '{}'))
    
    # Validate required fields
    org_id = common.validate_required(body.get('org_id'), 'org_id')
    org_id = common.validate_uuid(org_id, 'org_id')
    
    name = common.validate_required(body.get('name'), 'name')
    name = common.validate_string_length(name, 'name', min_length=1, max_length=255)
    
    # Validate optional fields
    description = body.get('description', '')
    if description:
        description = common.validate_string_length(description, 'description', max_length=1000)
    
    email = body.get('email')
    if email:
        email = common.validate_email(email, 'email')
    
    # Verify org access before creating
    membership = common.find_one(
        table='org_members',
        filters={'org_id': org_id, 'person_id': user_id, 'active': True}
    )
    if not membership:
        raise common.ForbiddenError('You do not have access to this organization')
    
    # Create with validated data
    entity = common.insert_one(
        table='entity',
        data={
            'org_id': org_id,
            'name': name,
            'description': description or None,
            'email': email or None,
            'created_by': user_id
        }
    )
    
    return common.created_response(common.format_record(entity))
```

---

## 6. Database Operations

### Pattern: Use org_common Database Helpers

**Problem**: Direct SQL queries are error-prone and bypass RLS policies.

**Solution**: Use Supabase client via `org_common` helpers.

### ✅ Database Helper Reference

```python
import org_common as common

# Insert single record
entity = common.insert_one(
    table='entity',
    data={
        'org_id': org_id,
        'name': name,
        'created_by': user_id
    }
)

# Find single record
entity = common.find_one(
    table='entity',
    filters={'id': entity_id},
    select='id, name, org_id, created_at'
)

# Find multiple records
entities = common.find_many(
    table='entity',
    filters={'org_id': org_id, 'status': 'active'},
    select='*',
    order='created_at.desc',
    limit=100,
    offset=0
)

# Update record
updated_entity = common.update_one(
    table='entity',
    filters={'id': entity_id},
    data={'name': new_name, 'updated_by': user_id}
)

# Delete record
deleted_entity = common.delete_one(
    table='entity',
    filters={'id': entity_id}
)

# Format records for API response
formatted = common.format_record(entity)           # Single record
formatted_list = common.format_records(entities)   # Multiple records
```

### Complete CRUD Example

```python
# CREATE
def handle_create(user_id: str, body: Dict) -> Dict:
    """Create with audit trail"""
    entity = common.insert_one(
        table='entity',
        data={
            'org_id': body['org_id'],
            'name': body['name'],
            'created_by': user_id  # Audit field
        }
    )
    return common.format_record(entity)

# READ
def handle_get_one(user_id: str, entity_id: str) -> Dict:
    """Get single record with access check"""
    entity = common.find_one(
        table='entity',
        filters={'id': entity_id}
    )
    if not entity:
        raise common.NotFoundError('Entity not found')
    
    # Verify org access
    membership = common.find_one(
        table='org_members',
        filters={'org_id': entity['org_id'], 'person_id': user_id, 'active': True}
    )
    if not membership:
        raise common.ForbiddenError('Access denied')
    
    return common.format_record(entity)

# UPDATE
def handle_update(user_id: str, entity_id: str, body: Dict) -> Dict:
    """Update with validation"""
    # Verify exists and get org_id
    entity = common.find_one(table='entity', filters={'id': entity_id})
    if not entity:
        raise common.NotFoundError('Entity not found')
    
    # Verify org access
    membership = common.find_one(
        table='org_members',
        filters={'org_id': entity['org_id'], 'person_id': user_id, 'active': True}
    )
    if not membership:
        raise common.ForbiddenError('Access denied')
    
    # Update with audit trail
    updated = common.update_one(
        table='entity',
        filters={'id': entity_id},
        data={
            **body,
            'updated_by': user_id  # Audit field
        }
    )
    return common.format_record(updated)

# DELETE
def handle_delete(user_id: str, entity_id: str) -> Dict:
    """Delete with access check"""
    entity = common.find_one(table='entity', filters={'id': entity_id})
    if not entity:
        raise common.NotFoundError('Entity not found')
    
    membership = common.find_one(
        table='org_members',
        filters={'org_id': entity['org_id'], 'person_id': user_id, 'active': True}
    )
    if not membership:
        raise common.ForbiddenError('Access denied')
    
    common.delete_one(table='entity', filters={'id': entity_id})
    return {'message': 'Entity deleted successfully', 'id': entity_id}
```

---

## 7. File Upload Patterns

### Pattern: S3 Upload with Multi-Tenancy

**Problem**: Files need secure, multi-tenant storage with proper access control.

**Solution**: Use org-scoped S3 paths and presigned URLs.

### ✅ Generate Presigned Upload URL

```python
import boto3
from botocore.exceptions import ClientError

def handle_get_upload_url(user_id: str, body: Dict) -> Dict:
    """Generate presigned URL for file upload"""
    # Validate inputs
    org_id = common.validate_uuid(body.get('org_id'), 'org_id')
    filename = common.validate_required(body.get('filename'), 'filename')
    content_type = body.get('content_type', 'application/pdf')
    
    # Verify org access
    membership = common.find_one(
        table='org_members',
        filters={'org_id': org_id, 'person_id': user_id, 'active': True}
    )
    if not membership:
        raise common.ForbiddenError('Access denied')
    
    # Generate org-scoped S3 key
    file_id = str(uuid.uuid4())
    s3_key = f"orgs/{org_id}/documents/{file_id}/{filename}"
    
    # Generate presigned URL
    s3_client = boto3.client('s3')
    try:
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': os.environ['BUCKET_NAME'],
                'Key': s3_key,
                'ContentType': content_type
            },
            ExpiresIn=3600  # 1 hour
        )
        
        return {
            'upload_url': presigned_url,
            's3_key': s3_key,
            'file_id': file_id
        }
    except ClientError as e:
        print(f"Error generating presigned URL: {str(e)}")
        raise
```

### ✅ S3 Trigger Lambda

```python
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Process uploaded file from S3 trigger"""
    try:
        # Extract S3 event data
        record = event['Records'][0]
        bucket = record['s3']['bucket']['name']
        s3_key = record['s3']['object']['key']
        
        # Extract org_id from S3 key path
        # Format: orgs/{org_id}/documents/{file_id}/{filename}
        path_parts = s3_key.split('/')
        if len(path_parts) < 4 or path_parts[0] != 'orgs':
            raise ValueError('Invalid S3 key format')
        
        org_id = path_parts[1]
        file_id = path_parts[3]
        
        # Download file
        s3_client = boto3.client('s3')
        response = s3_client.get_object(Bucket=bucket, Key=s3_key)
        file_content = response['Body'].read()
        
        # Process file (e.g., extract text, generate thumbnail)
        processed_data = process_file(file_content)
        
        # Save metadata to database
        document = common.insert_one(
            table='documents',
            data={
                'org_id': org_id,
                'file_id': file_id,
                's3_key': s3_key,
                'processed_data': processed_data,
                'status': 'processed'
            }
        )
        
        return common.success_response(common.format_record(document))
        
    except Exception as e:
        print(f"Error processing S3 event: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
```

---

## 8. API Client Usage

### Pattern: Authenticated Frontend API Calls

**Problem**: Frontend needs authenticated API calls with proper error handling.

**Solution**: Use `@sts-career/api-client` with NextAuth session.

### ✅ API Client Setup

```typescript
import { createAuthenticatedClient } from '@sts-career/api-client';
import { useSession } from 'next-auth/react';

function useApiClient() {
  const { data: session } = useSession();
  
  if (!session?.accessToken) {
    throw new Error('No active session');
  }
  
  return createAuthenticatedClient(session.accessToken);
}
```

### ✅ Complete API Call Example

```typescript
import { useState, useEffect } from 'react';
import { createAuthenticatedClient } from '@sts-career/api-client';
import { useSession } from 'next-auth/react';
import { useOrganizationContext } from '@sts-career/org-module-frontend';

interface Entity {
  id: string;
  org_id: string;
  name: string;
  description: string;
  created_at: string;
}

export function useEntities() {
  const { data: session } = useSession();
  const { currentOrganization } = useOrganizationContext();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!session?.accessToken || !currentOrganization?.id) {
      setLoading(false);
      return;
    }
    
    const fetchEntities = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const client = createAuthenticatedClient(session.accessToken);
        const response = await client.get(`/entities?orgId=${currentOrganization.id}`);
        
        if (response.success) {
          setEntities(response.data);
        } else {
          setError(response.error || 'Failed to fetch entities');
        }
      } catch (err) {
        console.error('Error fetching entities:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEntities();
  }, [session, currentOrganization]);
  
  return { entities, loading, error };
}
```

---

## 9. Frontend Hooks

### Pattern: Custom Hooks for Data Fetching

**Problem**: Repeated data fetching logic across components.

**Solution**: Create reusable hooks with loading/error states.

### ✅ Complete Custom Hook

```typescript
// useEntities.ts
import { useState, useEffect, useCallback } from 'react';
import { createAuthenticatedClient } from '@sts-career/api-client';
import { useSession } from 'next-auth/react';
import { useOrganizationContext } from '@sts-career/org-module-frontend';

interface Entity {
  id: string;
  name: string;
  description: string;
}

interface UseEntitiesResult {
  entities: Entity[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createEntity: (data: Partial<Entity>) => Promise<Entity>;
  updateEntity: (id: string, data: Partial<Entity>) => Promise<Entity>;
  deleteEntity: (id: string) => Promise<void>;
}

export function useEntities(): UseEntitiesResult {
  const { data: session } = useSession();
  const { currentOrganization } = useOrganizationContext();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchEntities = useCallback(async () => {
    if (!session?.accessToken || !currentOrganization?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const client = createAuthenticatedClient(session.accessToken);
      const response = await client.get(`/entities?orgId=${currentOrganization.id}`);
      
      if (response.success) {
        setEntities(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch entities');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching entities:', err);
    } finally {
      setLoading(false);
    }
  }, [session, currentOrganization]);
  
  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);
  
  const createEntity = useCallback(async (data: Partial<Entity>): Promise<Entity> => {
    if (!session?.accessToken || !currentOrganization?.id) {
      throw new Error('No active session or organization');
    }
    
    const client = createAuthenticatedClient(session.accessToken);
    const response = await client.post('/entities', {
      ...data,
      org_id: currentOrganization.id
    });
    
    if (response.success) {
      await fetchEntities(); // Refresh list
      return response.data;
    } else {
      throw new Error(response.error || 'Failed to create entity');
    }
  }, [session, currentOrganization, fetchEntities]);
  
  const updateEntity = useCallback(async (id: string, data: Partial<Entity>): Promise<Entity> => {
    if (!session?.accessToken) {
      throw new Error('No active session');
    }
    
    const client = createAuthenticatedClient(session.accessToken);
    const response = await client.put(`/entities/${id}`, data);
    
    if (response.success) {
      await fetchEntities(); // Refresh list
      return response.data;
    } else {
      throw new Error(response.error || 'Failed to update entity');
    }
  }, [session, fetchEntities]);
  
  const deleteEntity = useCallback(async (id: string): Promise<void> => {
    if (!session?.accessToken) {
      throw new Error('No active session');
    }
    
    const client = createAuthenticatedClient(session.accessToken);
    const response = await client.delete(`/entities/${id}`);
    
    if (response.success) {
      await fetchEntities(); // Refresh list
    } else {
      throw new Error(response.error || 'Failed to delete entity');
    }
  }, [session, fetchEntities]);
  
  return {
    entities,
    loading,
    error,
    refetch: fetchEntities,
    createEntity,
    updateEntity,
    deleteEntity
  };
}
```

### ✅ Using the Hook in Components

```typescript
// EntityList.tsx
import { Alert, CircularProgress, List, ListItem, ListItemText } from '@mui/material';
import { useEntities } from '../hooks/useEntities';

export function EntityList() {
  const { entities, loading, error } = useEntities();
  
  if (loading) {
    return <CircularProgress />;
  }
  
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  
  return (
    <List>
      {entities.map(entity => (
        <ListItem key={entity.id}>
          <ListItemText 
            primary={entity.name} 
            secondary={entity.description} 
          />
        </ListItem>
      ))}
    </List>
  );
}
```

---

## 10. Testing Patterns

### Pattern: Comprehensive Test Coverage

**Problem**: Untested code leads to bugs in production.

**Solution**: Test all CRUD operations, error cases, and edge cases.

### ✅ Backend Lambda Tests

```python
# test_entity_lambda.py
import json
import pytest
from unittest.mock import Mock, patch
from lambda_function import lambda_handler

@pytest.fixture
def mock_event():
    """Base API Gateway event"""
    return {
        'httpMethod': 'GET',
        'requestContext': {
            'authorizer': {
                'lambda': {
                    'user_id': 'okta_uid_123',
                    'email': 'test@example.com'
                }
            }
        },
        'queryStringParameters': {'orgId': 'org-123'},
        'pathParameters': None,
        'body': None
    }

@patch('org_common.get_supabase_user_id_from_okta_uid')
@patch('org_common.find_one')
@patch('org_common.find_many')
def test_get_all_entities_success(mock_find_many, mock_find_one, mock_get_user, mock_event):
    """Test successful GET /entities"""
    # Setup mocks
    mock_get_user.return_value = 'user-uuid-123'
    mock_find_one.return_value = {'org_id': 'org-123', 'role_name': 'org_member'}
    mock_find_many.return_value = [
        {'id': 'e1', 'name': 'Entity 1'},
        {'id': 'e2', 'name': 'Entity 2'}
    ]
    
    # Execute
    response = lambda_handler(mock_event, None)
    
    # Assert
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert body['success'] is True
    assert len(body['data']) == 2

@patch('org_common.get_supabase_user_id_from_okta_uid')
@patch('org_common.find_one')
def test_get_all_entities_forbidden(mock_find_one, mock_get_user, mock_event):
    """Test GET /entities without org access"""
    mock_get_user.return_value = 'user-uuid-123'
    mock_find_one.return_value = None  # No membership
    
    response = lambda_handler(mock_event, None)
    
    assert response['statusCode'] == 403
    body = json.loads(response['body'])
    assert body['success'] is False
    assert 'access' in body['error'].lower()

@patch('org_common.get_supabase_user_id_from_okta_uid')
def test_get_all_entities_missing_org_id(mock_get_user, mock_event):
    """Test GET /entities without orgId parameter"""
    mock_event['queryStringParameters'] = {}
    mock_get_user.return_value = 'user-uuid-123'
    
    response = lambda_handler(mock_event, None)
    
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert 'orgId' in body['error']
```

### ✅ Frontend Component Tests

```typescript
// EntityList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useOrganizationContext } from '@sts-career/org-module-frontend';
import { createAuthenticatedClient } from '@sts-career/api-client';
import { EntityList } from './EntityList';

jest.mock('next-auth/react');
jest.mock('@sts-career/org-module-frontend');
jest.mock('@sts-career/api-client');

describe('EntityList', () => {
  beforeEach(() => {
    (useSession as jest.Mock).mockReturnValue({
      data: { accessToken: 'test-token' }
    });
    
    (useOrganizationContext as jest.Mock).mockReturnValue({
      currentOrganization: { id: 'org-123' }
    });
  });
  
  it('displays loading state', () => {
    render(<EntityList />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
  
  it('displays entities after loading', async () => {
    const mockClient = {
      get: jest.fn().mockResolvedValue({
        success: true,
        data: [
          { id: 'e1', name: 'Entity 1', description: 'Description 1' },
          { id: 'e2', name: 'Entity 2', description: 'Description 2' }
        ]
      })
    };
    
    (createAuthenticatedClient as jest.Mock).mockReturnValue(mockClient);
    
    render(<EntityList />);
    
    await waitFor(() => {
      expect(screen.getByText('Entity 1')).toBeInTheDocument();
      expect(screen.getByText('Entity 2')).toBeInTheDocument();
    });
  });
  
  it('displays error state', async () => {
    const mockClient = {
      get: jest.fn().mockRejectedValue(new Error('Network error'))
    };
    
    (createAuthenticatedClient as jest.Mock).mockReturnValue(mockClient);
    
    render(<EntityList />);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

---

---

## 11. Admin Authorization Patterns

### Pattern: Centralized Router-Level Authorization

**Problem**: Admin routes need role-based access control without duplicating checks.

**Solution**: Implement centralized authorization at the Lambda router level.

### ✅ Backend: Centralized Admin Auth

```python
"""
Lambda with centralized admin authorization.

This pattern checks admin roles ONCE per request at the router level,
preventing duplicated auth checks in individual handlers.
"""

import json
from typing import Dict, Any
import org_common as common
from org_common.auth_helpers import (
    check_sys_admin,
    check_org_admin,
    check_ws_admin,
    get_org_context_from_event
)

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda handler with centralized admin authorization"""
    print(json.dumps(event, default=str))
    
    try:
        # Extract user
        user_info = common.get_user_from_event(event)
        user_id = common.get_supabase_user_id_from_external_uid(user_info['user_id'])
        
        # Get path for routing
        path = event.get('rawPath', '')
        http_method = event.get('httpMethod')
        
        # Centralized admin authorization
        if path.startswith('/admin/sys/'):
            # System admin routes
            if not check_sys_admin(user_id):
                return common.forbidden_response('System admin role required')
        
        elif path.startswith('/admin/org/'):
            # Organization admin routes
            org_id = get_org_context_from_event(event)
            if not check_org_admin(org_id, user_id):
                return common.forbidden_response('Organization admin role required')
        
        elif path.startswith('/admin/ws/'):
            # Workspace admin routes
            ws_id = event.get('pathParameters', {}).get('ws_id')
            if not ws_id:
                return common.bad_request_response('ws_id path parameter required')
            
            ws_id = common.validate_uuid(ws_id, 'ws_id')
            if not check_ws_admin(ws_id, user_id):
                return common.forbidden_response('Workspace admin role required')
        
        # Route to handlers (auth already verified)
        return route_to_handler(user_id, event)
    
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response('Internal server error')


def route_to_handler(user_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Route to specific handler (auth already checked)"""
    path = event.get('rawPath', '')
    http_method = event.get('httpMethod')
    
    # System admin routes
    if path == '/admin/sys/settings' and http_method == 'GET':
        return handle_get_sys_settings(user_id)
    elif path == '/admin/sys/settings' and http_method == 'PUT':
        return handle_update_sys_settings(user_id, event)
    
    # Org admin routes
    elif path == '/admin/org/settings' and http_method == 'GET':
        return handle_get_org_settings(user_id, event)
    elif path == '/admin/org/settings' and http_method == 'PUT':
        return handle_update_org_settings(user_id, event)
    
    else:
        return common.method_not_allowed_response()


def handle_get_sys_settings(user_id: str) -> Dict[str, Any]:
    """Get system settings (sys admin already verified)"""
    settings = common.find_many('sys_settings', filters={}, order='key.asc')
    return common.success_response(common.format_records(settings))


def handle_update_sys_settings(user_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update system settings (sys admin already verified)"""
    body = json.loads(event.get('body', '{}'))
    
    # Validate input
    key = common.validate_required(body.get('key'), 'key')
    value = common.validate_required(body.get('value'), 'value')
    
    # Update or insert
    existing = common.find_one('sys_settings', {'key': key})
    if existing:
        updated = common.update_one(
            'sys_settings',
            filters={'key': key},
            data={'value': value, 'updated_by': user_id}
        )
    else:
        updated = common.insert_one(
            'sys_settings',
            data={'key': key, 'value': value, 'created_by': user_id}
        )
    
    return common.success_response(common.format_record(updated))


def handle_get_org_settings(user_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Get org settings (org admin already verified, org_id extracted)"""
    org_id = get_org_context_from_event(event)
    
    settings = common.find_one('org_settings', {'org_id': org_id})
    if not settings:
        return common.not_found_response('Organization settings not found')
    
    return common.success_response(common.format_record(settings))
```

### ✅ Frontend: Admin Page Authorization

```typescript
// Admin page with role check
'use client';
import { useRole, useOrganizationContext } from '@cora/auth';
import { Alert, CircularProgress } from '@mui/material';

export default function OrgAdminSettingsPage() {
  const { isOrgAdmin, loading: roleLoading } = useRole();
  const { currentOrganization } = useOrganizationContext();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Wait for role check
  if (roleLoading) {
    return <CircularProgress />;
  }
  
  // Verify org admin role
  if (!isOrgAdmin) {
    return (
      <Alert severity="error">
        Organization admin role required to access this page.
      </Alert>
    );
  }
  
  // Load settings
  useEffect(() => {
    if (!currentOrganization) return;
    
    const fetchSettings = async () => {
      try {
        const token = await authAdapter.getToken();
        const response = await fetch(
          `/admin/org/settings?orgId=${currentOrganization.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.ok) {
          const data = await response.json();
          setSettings(data.data);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [currentOrganization]);
  
  if (loading) {
    return <CircularProgress />;
  }
  
  return (
    <div>
      <h1>Organization Settings</h1>
      {/* Render settings UI */}
    </div>
  );
}
```

### ✅ Org Context Extraction Pattern

```python
"""
Organization context extraction from query params or path params.

CRITICAL: All /admin/org/* routes MUST include orgId for multi-tenant isolation.
"""

from org_common.auth_helpers import get_org_context_from_event

def handle_org_admin_route(user_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Handler for org admin route"""
    # Extract org_id (checks query params and path params)
    try:
        org_id = get_org_context_from_event(event)
    except ValueError as e:
        return common.bad_request_response(str(e))
    
    # Auth already verified by router (check_org_admin)
    # Now fetch org-specific data
    data = common.find_many('some_table', {'org_id': org_id})
    return common.success_response(common.format_records(data))
```

### Admin Role Constants

```python
"""
Use standard role constants from org_common.

NEVER use inline role lists like ['sys_owner', 'sys_admin'].
"""

from org_common import SYS_ADMIN_ROLES, ORG_ADMIN_ROLES, WS_ADMIN_ROLES

# ✅ CORRECT
def is_system_admin(profile: dict) -> bool:
    return profile.get('sys_role') in SYS_ADMIN_ROLES

# ❌ WRONG - inline list
def is_system_admin_wrong(profile: dict) -> bool:
    return profile.get('sys_role') in ['sys_owner', 'sys_admin']  # Don't do this
```

---

## 12. Resource Permission Patterns

### Pattern: Resource Access with Permission Check

**Problem**: Users need to access their own resources with proper authorization.

**Solution**: Verify org membership, then check resource permission (ownership/sharing).

### ✅ Backend: Resource Access Handler

```python
"""
Resource access handler with layered permission checks.

Three-step pattern:
1. Fetch resource (to get org_id)
2. Verify org membership (prevent cross-org access)
3. Check resource permission (ownership/sharing)
"""

import org_common as common
from org_common.resource_permissions import can_access_org_resource

# Import module-specific permissions from module's own layer
from chat_common.permissions import can_access_chat, can_edit_chat

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle chat resource requests"""
    try:
        # Extract user
        user_info = common.get_user_from_event(event)
        user_id = common.get_supabase_user_id_from_external_uid(user_info['user_id'])
        
        # Route to handlers
        path = event.get('rawPath', '')
        http_method = event.get('httpMethod')
        
        if http_method == 'GET' and '/sessions/' in path:
            return handle_get_session(user_id, event)
        elif http_method == 'PUT' and '/sessions/' in path:
            return handle_update_session(user_id, event)
        elif http_method == 'GET' and path.endswith('/sessions'):
            return handle_list_sessions(user_id, event)
        else:
            return common.method_not_allowed_response()
    
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response('Internal server error')


def handle_get_session(user_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Get single chat session with permission check"""
    session_id = event['pathParameters']['session_id']
    session_id = common.validate_uuid(session_id, 'session_id')
    
    # Step 1: Fetch resource
    session = common.find_one('chat_sessions', {'id': session_id})
    if not session:
        return common.not_found_response('Session not found')
    
    # Step 2: Verify org membership (prevent cross-org access)
    if not can_access_org_resource(user_id, session['org_id']):
        return common.forbidden_response('Not a member of this organization')
    
    # Step 3: Check resource permission (ownership/sharing)
    if not can_access_chat(user_id, session_id):
        return common.forbidden_response('Access denied')
    
    # User has permission - return resource
    return common.success_response(common.format_record(session))


def handle_update_session(user_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Update chat session (requires edit permission)"""
    session_id = event['pathParameters']['session_id']
    session_id = common.validate_uuid(session_id, 'session_id')
    
    body = json.loads(event.get('body', '{}'))
    
    # Step 1: Fetch resource
    session = common.find_one('chat_sessions', {'id': session_id})
    if not session:
        return common.not_found_response('Session not found')
    
    # Step 2: Verify org membership
    if not can_access_org_resource(user_id, session['org_id']):
        return common.forbidden_response('Not a member of this organization')
    
    # Step 3: Check edit permission (may be stricter than view)
    if not can_edit_chat(user_id, session_id):
        return common.forbidden_response('Edit permission required')
    
    # User can edit - update resource
    allowed_fields = ['title', 'status', 'metadata']
    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    update_data['updated_by'] = user_id
    
    updated = common.update_one(
        'chat_sessions',
        filters={'id': session_id},
        data=update_data
    )
    
    return common.success_response(common.format_record(updated))


def handle_list_sessions(user_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """List user's chat sessions (org-scoped)"""
    query_params = event.get('queryStringParameters', {}) or {}
    
    # Extract org_id
    org_id = query_params.get('orgId')
    if not org_id:
        return common.bad_request_response('orgId query parameter is required')
    
    org_id = common.validate_uuid(org_id, 'orgId')
    
    # Verify org membership
    if not can_access_org_resource(user_id, org_id):
        return common.forbidden_response('Not a member of this organization')
    
    # List user's sessions in this org (owned by user)
    sessions = common.find_many(
        'chat_sessions',
        filters={'org_id': org_id, 'created_by': user_id},
        order='created_at.desc'
    )
    
    return common.success_response(common.format_records(sessions))
```

### ✅ Module-Specific Permission Layer

```python
"""
Module-specific resource permissions.

CRITICAL: These functions live in the module's own backend layer,
NOT in org-common (to avoid dependencies on optional modules).

File: module-chat/backend/layers/chat_common/python/chat_common/permissions.py
"""

from org_common.db import call_rpc

def can_access_chat(user_id: str, session_id: str) -> bool:
    """
    Check if user can view chat session.
    
    Access granted if:
    - User owns the chat
    - Chat is shared with user (future)
    """
    # Check ownership
    if call_rpc('is_chat_owner', {'p_user_id': user_id, 'p_session_id': session_id}):
        return True
    
    # TODO: Check sharing when implemented
    # if call_rpc('is_chat_shared_with', {'p_user_id': user_id, 'p_session_id': session_id}):
    #     return True
    
    return False


def can_edit_chat(user_id: str, session_id: str) -> bool:
    """
    Check if user can send messages in chat session.
    
    Access granted if:
    - User is the owner
    - User has an edit share (future)
    
    Note: View-only shares do NOT grant edit permission.
    """
    # For now, only owner can edit
    return call_rpc('is_chat_owner', {'p_user_id': user_id, 'p_session_id': session_id})
```

### ✅ Database RPC Functions

```sql
-- Ownership check RPC
CREATE OR REPLACE FUNCTION is_chat_owner(p_user_id UUID, p_session_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE id = p_session_id AND created_by = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Membership check RPC (from org-common)
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id 
      AND person_id = p_user_id 
      AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

### ❌ NEVER: Admin Role Override

```python
# ❌ WRONG - do NOT add admin override to resource permissions
def can_access_chat_wrong(user_id: str, session_id: str, org_id: str) -> bool:
    """WRONG: This grants admins automatic access to all user chats"""
    
    # Check ownership
    if is_chat_owner(user_id, session_id):
        return True
    
    # ❌ WRONG - violates least privilege principle
    if is_org_admin(org_id, user_id):
        return True  # DO NOT DO THIS
    
    return False

# ✅ CORRECT - only ownership and sharing
def can_access_chat_correct(user_id: str, session_id: str) -> bool:
    """CORRECT: Admin roles do NOT grant automatic access"""
    
    # Check ownership
    if is_chat_owner(user_id, session_id):
        return True
    
    # Check sharing (future)
    if is_chat_shared_with(user_id, session_id):
        return True
    
    # NO admin override
    return False
```

### Frontend: Resource Access

```typescript
// Frontend resource access (backend enforces permissions)
export function useChatSession(sessionId: string) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const token = await authAdapter.getToken();
        const response = await fetch(`/chat/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSession(data.data);
        } else if (response.status === 403) {
          setError('Access denied');
        } else if (response.status === 404) {
          setError('Session not found');
        }
      } catch (err) {
        setError('Failed to load session');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSession();
  }, [sessionId]);
  
  return { session, loading, error };
}
```

---

## Summary

This cookbook provides production-ready patterns for all common CORA development scenarios. Follow these patterns to ensure:

- ✅ **100% CORA Compliance**: All patterns follow org_common standards
- ✅ **Multi-Tenant Security**: Every pattern enforces org_id filtering
- ✅ **Type Safety**: Full TypeScript support
- ✅ **Error Handling**: Comprehensive error coverage
- ✅ **Testability**: All patterns are easily testable
- ✅ **Authorization**: Both admin and resource permissions implemented correctly

## See Also

- [CORA Principles](./10_std_cora_PRINCIPLES.md) - Core CORA principles including auth hierarchy
- [ADR-019: CORA Authorization Standardization](../arch%20decisions/ADR-019-AUTH-STANDARDIZATION.md) - Complete authorization strategy
- [03_std_back_AUTH.md](./03_std_back_AUTH.md) - Backend admin auth standard
- [03_std_back_RESOURCE-PERMISSIONS.md](./03_std_back_RESOURCE-PERMISSIONS.md) - Resource permission standard
- [CORA Patterns Checklist](./10_std_cora_PATTERNS-CHECKLIST.md) - Validation checklist
