"""
Entity Lambda Function - CORA Compliant Template
Handles CRUD operations for entities with full multi-tenancy support

This template demonstrates all CORA compliance patterns:
- Standard response functions (success_response, error_response)
- Multi-tenant data filtering (org_id required and enforced)
- User context extraction (get_user_from_event)
- Supabase client usage (via org_common)
- Standard error handling (ValidationError, NotFoundError, etc.)
- Input validation (validate_uuid, validate_required, etc.)
- RLS policy enforcement (via Supabase client)
- Batch operations (chunking large datasets)
"""
import json
from typing import Dict, Any, List
import org_common as common

# CORA Pattern: Batch size for bulk operations to manage memory and payload limits
BATCH_SIZE = 100


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle entity operations
    
    Endpoints:
    - GET    /entities?orgId=xxx     - List entities for organization
    - GET    /entities/:id            - Get entity by ID
    - POST   /entities                - Create new entity
    - PUT    /entities/:id            - Update entity
    - DELETE /entities/:id            - Delete entity
    
    CORA Pattern: All endpoints require authentication via API Gateway authorizer.
    User context is extracted from the authorizer and used throughout the Lambda.
    
    Args:
        event: API Gateway event with authorizer context
        context: Lambda context
        
    Returns:
        API Gateway response using standard format
    """
    # CORA Pattern: Always log incoming requests for debugging
    print(json.dumps(event, default=str))
    
    try:
        # CORA Pattern: Extract user info from authorizer using org_common utility
        # This gets Okta UID from the authorizer context
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        
        # CORA Pattern: Convert Okta UID to Supabase UUID for database operations
        # All database foreign keys reference Supabase auth.users(id), not Okta UIDs
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # CORA Pattern: Support both API Gateway v1 and v2 formats for HTTP method
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
        if not http_method:
            return common.bad_request_response('HTTP method not found in request')
        
        # CORA Pattern: Extract path and query parameters safely with defaults
        path_params = event.get('pathParameters', {})
        
        # CORA Pattern: Route to appropriate handler based on HTTP method and path
        if http_method == 'GET':
            if path_params and path_params.get('id'):
                return handle_get_one(supabase_user_id, path_params['id'])
            else:
                return handle_get_all(event, supabase_user_id)
        elif http_method == 'POST':
            # Check for bulk create endpoint
            path = event.get('rawPath', '') or event.get('path', '')
            if 'bulk' in path:
                return handle_bulk_create(event, supabase_user_id)
            else:
                return handle_create(event, supabase_user_id)
        elif http_method == 'PUT':
            if not path_params or not path_params.get('id'):
                return common.bad_request_response('Entity ID is required')
            return handle_update(event, supabase_user_id, path_params['id'])
        elif http_method == 'DELETE':
            if not path_params or not path_params.get('id'):
                return common.bad_request_response('Entity ID is required')
            return handle_delete(supabase_user_id, path_params['id'])
        elif http_method == 'OPTIONS':
            # CORA Pattern: Handle CORS preflight requests
            return common.success_response({})
        else:
            # CORA Pattern: Use standard error response for unsupported methods
            return common.method_not_allowed_response()
            
    except KeyError as e:
        # CORA Pattern: Handle missing user context (authentication issue)
        print(f'KeyError: {str(e)}')
        return common.unauthorized_response(f'Missing user information: {str(e)}')
    except common.NotFoundError as e:
        # CORA Pattern: Handle user not found during Okta UID -> Supabase UUID resolution
        print(f'NotFoundError during user resolution: {str(e)}')
        return common.unauthorized_response(f'User not found: {str(e)}')
    except common.ValidationError as e:
        # CORA Pattern: Handle validation errors (bad input)
        return common.bad_request_response(str(e))
    except common.NotFoundError as e:
        # CORA Pattern: Handle resource not found errors
        return common.not_found_response(str(e))
    except common.ForbiddenError as e:
        # CORA Pattern: Handle authorization errors (user lacks permission)
        return common.forbidden_response(str(e))
    except Exception as e:
        # CORA Pattern: Catch-all for unexpected errors, log details, return generic message
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response('Internal server error')


def handle_get_all(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Get all entities for an organization
    
    CORA Pattern: Multi-tenant data filtering - MUST filter by org_id
    Users can only access entities within organizations they belong to.
    
    Query parameters:
    - orgId: Organization ID (REQUIRED for multi-tenancy)
    - status: Filter by status (optional)
    - limit: Number of results (default: 100)
    - offset: Pagination offset (default: 0)
    
    Returns:
        List of entities for the organization
    """
    # CORA Pattern: Extract query parameters with safe default
    query_params = event.get('queryStringParameters', {}) or {}
    
    # CORA Pattern: org_id is REQUIRED for multi-tenant data access
    org_id = query_params.get('orgId') or query_params.get('org_id')
    if not org_id:
        raise common.ValidationError('orgId query parameter is required')
    
    # CORA Pattern: Validate UUID format using org_common validator
    org_id = common.validate_uuid(org_id, 'orgId')
    
    # CORA Pattern: Verify user has access to this organization
    # This checks the org_members table to ensure user is a member
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
    
    # CORA Pattern: Optional filters with validation
    status = query_params.get('status')
    
    # CORA Pattern: Pagination with validation and sensible defaults
    limit = common.validate_integer(
        query_params.get('limit', 100),
        'limit',
        min_value=1,
        max_value=1000
    )
    offset = common.validate_integer(
        query_params.get('offset', 0),
        'offset',
        min_value=0
    )
    
    try:
        # CORA Pattern: Build filters dict for multi-tenant query
        filters = {'org_id': org_id}
        
        # Add optional filters
        if status:
            filters['status'] = status
        
        # CORA Pattern: Use org_common database helper with RLS enforcement
        # Supabase RLS policies ensure users can only access authorized data
        entities = common.find_many(
            table='entity',
            filters=filters,
            select='id, org_id, name, description, status, created_at, updated_at, created_by, updated_by',
            order='created_at.desc',
            limit=limit,
            offset=offset
        )
        
        # CORA Pattern: Format records for consistent API response
        result = common.format_records(entities)
        
        # CORA Pattern: Use standard success response
        return common.success_response(result)
        
    except Exception as e:
        print(f"Error listing entities: {str(e)}")
        raise


def handle_get_one(user_id: str, entity_id: str) -> Dict[str, Any]:
    """
    Get single entity by ID
    
    CORA Pattern: Access control via Supabase RLS policies
    User must be member of the entity's organization (enforced by RLS)
    
    Args:
        user_id: Supabase user UUID
        entity_id: Entity ID to retrieve
        
    Returns:
        Entity record
    """
    # CORA Pattern: Validate UUID format
    entity_id = common.validate_uuid(entity_id, 'entity_id')
    
    try:
        # CORA Pattern: Use find_one with RLS enforcement
        # RLS policies automatically filter by org_id based on user's memberships
        entity = common.find_one(
            table='entity',
            filters={'id': entity_id},
            select='id, org_id, name, description, status, created_at, updated_at, created_by, updated_by'
        )
        
        if not entity:
            raise common.NotFoundError('Entity not found')
        
        # CORA Pattern: Verify user has access to the organization
        # Double-check access even though RLS enforces it
        membership = common.find_one(
            table='org_members',
            filters={
                'org_id': entity['org_id'],
                'person_id': user_id,
                'active': True
            }
        )
        
        if not membership:
            raise common.ForbiddenError('You do not have access to this entity')
        
        # CORA Pattern: Format single record for consistent response
        result = common.format_record(entity)
        
        return common.success_response(result)
        
    except Exception as e:
        print(f"Error getting entity: {str(e)}")
        raise


def handle_create(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Create new entity
    
    CORA Pattern: All created records include org_id and created_by
    This ensures multi-tenant data segregation and audit trails.
    
    Request body:
    {
        "org_id": "uuid",       # REQUIRED - organization ID
        "name": "string",       # REQUIRED - entity name
        "description": "string", # OPTIONAL - entity description
        "status": "string",     # OPTIONAL - defaults to 'active'
        "owner_email": "string" # OPTIONAL - email validation example
    }
    
    Returns:
        Created entity record with 201 status
    """
    # CORA Pattern: Parse request body safely
    body = json.loads(event.get('body', '{}'))
    
    # CORA Pattern: Validate required fields
    org_id = common.validate_required(body.get('org_id'), 'org_id')
    org_id = common.validate_uuid(org_id, 'org_id')
    
    name = common.validate_required(body.get('name'), 'name')
    name = common.validate_string_length(name, 'name', min_length=1, max_length=255)
    
    # CORA Pattern: Get user profile to verify email and org membership
    profile = common.find_one(
        table='profiles',
        filters={'user_id': user_id}
    )
    
    if not profile:
        raise common.NotFoundError('User profile not found')
    
    # CORA Pattern: Email validation (optional but demonstrates authentication pattern)
    # If owner_email is provided, validate it matches the authenticated user's email
    owner_email = body.get('owner_email')
    if owner_email:
        user_email = profile.get('email')
        if user_email and owner_email.lower() != user_email.lower():
            raise common.ForbiddenError('Owner email does not match authenticated user')
    
    # CORA Pattern: Verify user has access to create in this organization
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
    
    # CORA Pattern: Optional fields with validation
    description = body.get('description', '')
    if description:
        description = common.validate_string_length(
            description, 'description', max_length=1000
        )
    
    status = body.get('status', 'active')
    
    try:
        # CORA Pattern: Build data dict with org_id and audit fields
        data = {
            'org_id': org_id,  # REQUIRED for multi-tenancy
            'name': name,
            'description': description or None,
            'status': status,
            'created_by': user_id  # REQUIRED for audit trail
        }
        
        # CORA Pattern: Use insert_one with automatic created_at timestamp
        entity = common.insert_one(
            table='entity',
            data=data
        )
        
        # CORA Pattern: Format record for consistent response
        result = common.format_record(entity)
        
        # CORA Pattern: Use 201 Created response for successful creation
        return common.created_response(result)
        
    except Exception as e:
        print(f"Error creating entity: {str(e)}")
        raise


def handle_update(event: Dict[str, Any], user_id: str, entity_id: str) -> Dict[str, Any]:
    """
    Update existing entity
    
    CORA Pattern: Updates include updated_by for audit trail
    Only updateable fields are allowed, org_id is immutable
    
    Request body:
    {
        "name": "string",        # OPTIONAL
        "description": "string", # OPTIONAL
        "status": "string"       # OPTIONAL
    }
    
    Returns:
        Updated entity record
    """
    # CORA Pattern: Validate UUID
    entity_id = common.validate_uuid(entity_id, 'entity_id')
    
    # CORA Pattern: Parse request body
    body = json.loads(event.get('body', '{}'))
    
    try:
        # CORA Pattern: Fetch existing entity to verify access and get org_id
        entity = common.find_one(
            table='entity',
            filters={'id': entity_id}
        )
        
        if not entity:
            raise common.NotFoundError('Entity not found')
        
        # CORA Pattern: Verify user has access to the organization
        membership = common.find_one(
            table='org_members',
            filters={
                'org_id': entity['org_id'],
                'person_id': user_id,
                'active': True
            }
        )
        
        if not membership:
            raise common.ForbiddenError('You do not have access to this entity')
        
        # CORA Pattern: Build update data dict with only provided fields
        update_data = {}
        
        if 'name' in body:
            name = body['name']
            if name:
                update_data['name'] = common.validate_string_length(
                    name, 'name', min_length=1, max_length=255
                )
        
        if 'description' in body:
            description = body['description']
            if description:
                update_data['description'] = common.validate_string_length(
                    description, 'description', max_length=1000
                )
            else:
                update_data['description'] = None
        
        if 'status' in body:
            update_data['status'] = body['status']
        
        if not update_data:
            raise common.ValidationError('No valid fields to update')
        
        # CORA Pattern: Always include updated_by for audit trail
        update_data['updated_by'] = user_id
        
        # CORA Pattern: Use update_one with automatic updated_at timestamp
        updated_entity = common.update_one(
            table='entity',
            filters={'id': entity_id},
            data=update_data
        )
        
        # CORA Pattern: Format record for consistent response
        result = common.format_record(updated_entity)
        
        return common.success_response(result)
        
    except Exception as e:
        print(f"Error updating entity: {str(e)}")
        raise


def handle_delete(user_id: str, entity_id: str) -> Dict[str, Any]:
    """
    Delete entity
    
    CORA Pattern: Hard delete with access verification
    Consider soft delete (status='deleted') for audit requirements
    
    Args:
        user_id: Supabase user UUID
        entity_id: Entity ID to delete
        
    Returns:
        Success message with deleted entity ID
    """
    # CORA Pattern: Validate UUID
    entity_id = common.validate_uuid(entity_id, 'entity_id')
    
    try:
        # CORA Pattern: Fetch entity to verify access
        entity = common.find_one(
            table='entity',
            filters={'id': entity_id}
        )
        
        if not entity:
            raise common.NotFoundError('Entity not found')
        
        # CORA Pattern: Verify user has access to the organization
        membership = common.find_one(
            table='org_members',
            filters={
                'org_id': entity['org_id'],
                'person_id': user_id,
                'active': True
            }
        )
        
        if not membership:
            raise common.ForbiddenError('You do not have access to this entity')
        
        # CORA Pattern: Use delete_one for hard delete
        # Alternative: Use update_one to set status='deleted' for soft delete
        deleted_entity = common.delete_one(
            table='entity',
            filters={'id': entity_id}
        )
        
        return common.success_response({
            'message': 'Entity deleted successfully',
            'id': entity_id
        })
        
    except Exception as e:
        print(f"Error deleting entity: {str(e)}")
        raise


def handle_bulk_create(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Bulk create entities
    
    CORA Pattern: Batch operations for processing large datasets
    Chunks requests to manage memory and API payload limits
    
    Request body:
    {
        "org_id": "uuid",       # REQUIRED - organization ID
        "entities": [           # REQUIRED - array of entities to create
            {
                "name": "string",
                "description": "string",
                "status": "string"
            },
            ...
        ]
    }
    
    Returns:
        Summary with count of created entities
    """
    # CORA Pattern: Parse request body safely
    body = json.loads(event.get('body', '{}'))
    
    # CORA Pattern: Validate required fields
    org_id = common.validate_required(body.get('org_id'), 'org_id')
    org_id = common.validate_uuid(org_id, 'org_id')
    
    entities_data = body.get('entities', [])
    if not entities_data:
        raise common.ValidationError('entities array is required and must not be empty')
    
    # CORA Pattern: Verify user has access to create in this organization
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
    
    try:
        created_entities = []
        total_count = len(entities_data)
        
        print(f"Bulk creating {total_count} entities in batches of {BATCH_SIZE}")
        
        # CORA Pattern: Process in batches to manage memory and payload size
        for i in range(0, total_count, BATCH_SIZE):
            chunk = entities_data[i:i + BATCH_SIZE]
            
            # Process each entity in the chunk
            for entity_data in chunk:
                # Validate individual entity
                name = common.validate_required(entity_data.get('name'), 'name')
                name = common.validate_string_length(name, 'name', min_length=1, max_length=255)
                
                description = entity_data.get('description', '')
                if description:
                    description = common.validate_string_length(
                        description, 'description', max_length=1000
                    )
                
                status = entity_data.get('status', 'active')
                
                # Create entity
                data = {
                    'org_id': org_id,
                    'name': name,
                    'description': description or None,
                    'status': status,
                    'created_by': user_id
                }
                
                entity = common.insert_one(
                    table='entity',
                    data=data
                )
                
                created_entities.append(entity)
            
            print(f"Batch {i//BATCH_SIZE + 1}: Created {len(chunk)} entities")
        
        print(f"Successfully bulk created {len(created_entities)} entities")
        
        # CORA Pattern: Return summary response for bulk operations
        return common.created_response({
            'message': 'Entities created successfully',
            'count': len(created_entities),
            'totalRequested': total_count,
            'entities': [common.format_record(e) for e in created_entities]
        })
        
    except Exception as e:
        print(f"Error bulk creating entities: {str(e)}")
        raise
