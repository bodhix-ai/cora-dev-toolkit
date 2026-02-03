"""
Voice Configs Lambda - Configuration CRUD Operations

Handles voice interview configuration management including templates
for Pipecat bot behavior, interview questions, and scoring rubrics.

Routes - Data API (Configs):
- GET /voice/configs - List configs for organization
- GET /voice/configs/{configId} - Get config by ID
- POST /voice/configs - Create new config
- PUT /voice/configs/{configId} - Update config
- DELETE /voice/configs/{configId} - Delete config

Routes - Organization Admin (Configs):
- GET /admin/org/voice/configs - List configs for organization
- GET /admin/org/voice/configs/{configId} - Get config by ID
- POST /admin/org/voice/configs - Create new config
- PUT /admin/org/voice/configs/{configId} - Update config
- DELETE /admin/org/voice/configs/{configId} - Delete config
"""

import json
from typing import Any, Dict, Optional
import org_common as common
import voice_common.permissions as voice_permissions


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for voice config operations.
    
    Routes requests to appropriate handlers based on HTTP method and path.
    Uses centralized router-level authorization per ADR-019b.
    """
    print(json.dumps(event, default=str))
    
    try:
        # Extract user info from authorizer
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        
        # Convert external UID to Supabase UUID for database operations
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # Extract HTTP method and path
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
        if not http_method:
            return common.bad_request_response('HTTP method not found in request')
        
        path = event.get('rawPath', '') or event.get('path', '')
        
        # Extract path parameters
        path_params = event.get('pathParameters', {}) or {}
        
        # Route based on method and path
        if http_method == 'OPTIONS':
            return common.success_response({})
        
        # =============================================================================
        # CENTRALIZED AUTHORIZATION (ADR-019b)
        # =============================================================================
        org_id: Optional[str] = None
        
        if path.startswith('/admin/org/voice/configs'):
            # Organization admin routes - extract org context and verify admin role
            org_context = common.get_org_context_from_event(event)
            org_id = org_context.get('org_id')
            if not org_id:
                return common.bad_request_response('Organization context required')
            
            if not common.check_org_admin(org_id, supabase_user_id):
                return common.forbidden_response('Organization admin access required')
        
        # =============================================================================
        # ORGANIZATION ADMIN ROUTES
        # =============================================================================
        
        if path.startswith('/admin/org/voice/configs'):
            
            # GET /admin/org/voice/configs - List configs
            if http_method == 'GET' and not path_params.get('configId'):
                return handle_admin_list_configs(event, supabase_user_id, org_id)
            
            # GET /admin/org/voice/configs/{configId} - Get config by ID
            if http_method == 'GET' and path_params.get('configId'):
                return handle_admin_get_config(event, supabase_user_id, org_id, path_params['configId'])
            
            # POST /admin/org/voice/configs - Create config
            if http_method == 'POST':
                return handle_admin_create_config(event, supabase_user_id, org_id)
            
            # PUT /admin/org/voice/configs/{configId} - Update config
            if http_method == 'PUT':
                return handle_admin_update_config(event, supabase_user_id, org_id, path_params['configId'])
            
            # DELETE /admin/org/voice/configs/{configId} - Delete config
            if http_method == 'DELETE':
                return handle_admin_delete_config(event, supabase_user_id, org_id, path_params['configId'])
        
        # =============================================================================
        # DATA API ROUTES
        # =============================================================================
        
        # GET /voice/configs - List configs
        if http_method == 'GET' and not path_params.get('id'):
            return handle_list_configs(event, supabase_user_id)
        
        # GET /voice/configs/{id} - Get config by ID
        if http_method == 'GET' and path_params.get('id'):
            return handle_get_config(event, supabase_user_id, path_params['id'])
        
        # POST /voice/configs - Create config
        if http_method == 'POST':
            return handle_create_config(event, supabase_user_id)
        
        # PUT /voice/configs/{id} - Update config
        if http_method == 'PUT':
            return handle_update_config(event, supabase_user_id, path_params['id'])
        
        # DELETE /voice/configs/{id} - Delete config
        if http_method == 'DELETE':
            return handle_delete_config(event, supabase_user_id, path_params['id'])
        
        return common.not_found_response('Route not found')
        
    except KeyError as e:
        print(f'KeyError: {str(e)}')
        return common.unauthorized_response(f'Missing user information: {str(e)}')
    except common.NotFoundError as e:
        return common.not_found_response(str(e))
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response('Internal server error')


# =============================================================================
# ORGANIZATION ADMIN HANDLERS
# =============================================================================

def handle_admin_list_configs(event: Dict[str, Any], user_id: str, org_id: str) -> Dict[str, Any]:
    """
    List voice configs for admin's organization.
    
    org_id is validated by centralized auth in lambda_handler.
    Query parameters:
    - isActive: Filter by active status
    - interviewType: Filter by interview type
    """
    query_params = event.get('queryStringParameters', {}) or {}
    
    # Build filters
    filters = {'org_id': org_id}
    
    if query_params.get('isActive') is not None:
        filters['is_active'] = query_params['isActive'].lower() == 'true'
    
    if query_params.get('interviewType'):
        filters['interview_type'] = query_params['interviewType']
    
    # Query configs
    configs = common.find_many(
        table='voice_configs',
        filters=filters,
        order='name.asc'
    )
    
    # Format response
    result = [_format_config_response(c) for c in configs]
    
    return common.success_response(result)


def handle_admin_get_config(event: Dict[str, Any], user_id: str, org_id: str, config_id: str) -> Dict[str, Any]:
    """
    Get voice config by ID (org admin).
    
    org_id is validated by centralized auth in lambda_handler.
    Verifies config belongs to admin's organization.
    """
    config_id = common.validate_uuid(config_id, 'configId')
    
    # Get config
    config = common.find_one(
        table='voice_configs',
        filters={'id': config_id}
    )
    
    if not config:
        raise common.NotFoundError('Config not found')
    
    # Verify org ownership
    if config['org_id'] != org_id:
        raise common.ForbiddenError('You do not have access to this config')
    
    result = _format_config_response(config)
    
    return common.success_response(result)


def handle_admin_create_config(event: Dict[str, Any], user_id: str, org_id: str) -> Dict[str, Any]:
    """
    Create a new voice config (org admin).
    
    org_id is validated by centralized auth in lambda_handler.
    Request body:
    {
        "name": "Technical Interview v1",
        "interviewType": "technical",
        "description": "Standard technical interview template",
        "configJson": { ... Pipecat config ... }
    }
    """
    body = json.loads(event.get('body', '{}'))
    
    # Validate required fields
    name = body.get('name')
    if not name:
        raise common.ValidationError('name is required')
    name = common.validate_string_length(name, 'name', max_length=255)
    
    interview_type = body.get('interviewType')
    if not interview_type:
        raise common.ValidationError('interviewType is required')
    interview_type = common.validate_string_length(interview_type, 'interviewType', max_length=100)
    
    config_json = body.get('configJson')
    if not config_json:
        raise common.ValidationError('configJson is required')
    if not isinstance(config_json, dict):
        raise common.ValidationError('configJson must be a JSON object')
    
    # Check for duplicate name
    existing = common.find_one(
        table='voice_configs',
        filters={'org_id': org_id, 'name': name}
    )
    if existing:
        raise common.ValidationError(f'A config with name "{name}" already exists')
    
    # Optional fields
    description = body.get('description')
    if description:
        description = common.validate_string_length(description, 'description', max_length=1000)
    
    # Create config
    config_data = {
        'org_id': org_id,
        'name': name,
        'interview_type': interview_type,
        'description': description,
        'config_json': config_json,
        'is_active': True,
        'version': 1,
        'created_by': user_id
    }
    
    config = common.insert_one(table='voice_configs', data=config_data)
    
    result = _format_config_response(config)
    
    return common.created_response(result)


def handle_admin_update_config(event: Dict[str, Any], user_id: str, org_id: str, config_id: str) -> Dict[str, Any]:
    """
    Update voice config (org admin).
    
    org_id is validated by centralized auth in lambda_handler.
    Verifies config belongs to admin's organization.
    Request body:
    {
        "name": "Updated Name",
        "description": "Updated description",
        "configJson": { ... },
        "isActive": true
    }
    """
    config_id = common.validate_uuid(config_id, 'configId')
    
    # Get existing config
    config = common.find_one(
        table='voice_configs',
        filters={'id': config_id}
    )
    
    if not config:
        raise common.NotFoundError('Config not found')
    
    # Verify org ownership
    if config['org_id'] != org_id:
        raise common.ForbiddenError('You do not have access to this config')
    
    body = json.loads(event.get('body', '{}'))
    update_data = {}
    
    # Handle updatable fields
    if 'name' in body:
        name = common.validate_string_length(body['name'], 'name', max_length=255)
        # Check for duplicate name (exclude current config)
        existing = common.find_one(
            table='voice_configs',
            filters={'org_id': org_id, 'name': name}
        )
        if existing and existing['id'] != config_id:
            raise common.ValidationError(f'A config with name "{name}" already exists')
        update_data['name'] = name
    
    if 'description' in body:
        update_data['description'] = common.validate_string_length(
            body['description'], 'description', max_length=1000
        ) if body['description'] else None
    
    if 'interviewType' in body:
        update_data['interview_type'] = common.validate_string_length(
            body['interviewType'], 'interviewType', max_length=100
        )
    
    if 'configJson' in body:
        if not isinstance(body['configJson'], dict):
            raise common.ValidationError('configJson must be a JSON object')
        update_data['config_json'] = body['configJson']
        # Increment version on config_json change
        update_data['version'] = config['version'] + 1
    
    if 'isActive' in body:
        update_data['is_active'] = bool(body['isActive'])
    
    if not update_data:
        raise common.ValidationError('No valid fields to update')
    
    update_data['updated_by'] = user_id
    
    updated_config = common.update_one(
        table='voice_configs',
        filters={'id': config_id},
        data=update_data
    )
    
    result = _format_config_response(updated_config)
    
    return common.success_response(result)


def handle_admin_delete_config(event: Dict[str, Any], user_id: str, org_id: str, config_id: str) -> Dict[str, Any]:
    """
    Delete voice config (org admin).
    
    org_id is validated by centralized auth in lambda_handler.
    Verifies config belongs to admin's organization.
    Only configs not referenced by any sessions can be deleted.
    """
    config_id = common.validate_uuid(config_id, 'configId')
    
    # Get config
    config = common.find_one(
        table='voice_configs',
        filters={'id': config_id}
    )
    
    if not config:
        raise common.NotFoundError('Config not found')
    
    # Verify org ownership
    if config['org_id'] != org_id:
        raise common.ForbiddenError('You do not have access to this config')
    
    # Check if config is in use
    sessions_using = common.find_many(
        table='voice_sessions',
        filters={'config_id': config_id},
        limit=1
    )
    
    if sessions_using:
        raise common.ValidationError(
            'Cannot delete config that is in use by sessions. '
            'Deactivate it instead by setting isActive to false.'
        )
    
    # Delete the config
    common.delete_one(
        table='voice_configs',
        filters={'id': config_id}
    )
    
    return common.success_response({
        'message': 'Config deleted successfully',
        'id': config_id
    })


# =============================================================================
# DATA API CONFIG CRUD HANDLERS
# =============================================================================

def handle_list_configs(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    List voice configs for an organization.
    
    Query parameters:
    - orgId: (required) Organization ID
    - isActive: Filter by active status
    - interviewType: Filter by interview type
    """
    query_params = event.get('queryStringParameters', {}) or {}
    
    # Validate required org_id
    org_id = query_params.get('orgId')
    if not org_id:
        raise common.ValidationError('orgId query parameter is required')
    org_id = common.validate_uuid(org_id, 'orgId')
    
    # Step 1: Verify org membership
    if not common.can_access_org_resource(user_id, org_id):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Build filters
    filters = {'org_id': org_id}
    
    if query_params.get('isActive') is not None:
        filters['is_active'] = query_params['isActive'].lower() == 'true'
    
    if query_params.get('interviewType'):
        filters['interview_type'] = query_params['interviewType']
    
    # Query configs
    configs = common.find_many(
        table='voice_configs',
        filters=filters,
        order='name.asc'
    )
    
    # Format response
    result = [_format_config_response(c) for c in configs]
    
    return common.success_response(result)


def handle_get_config(event: Dict[str, Any], user_id: str, config_id: str) -> Dict[str, Any]:
    """
    Get voice config by ID.
    """
    config_id = common.validate_uuid(config_id, 'id')
    
    # Step 1: Fetch resource
    config = common.find_one(
        table='voice_configs',
        filters={'id': config_id}
    )
    
    if not config:
        raise common.NotFoundError('Config not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, config['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission
    if not voice_permissions.can_view_voice_config(user_id, config_id):
        raise common.ForbiddenError('You do not have permission to view this config')
    
    result = _format_config_response(config)
    
    return common.success_response(result)


def handle_create_config(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Create a new voice config.
    
    Request body:
    {
        "orgId": "uuid",
        "name": "Technical Interview v1",
        "interviewType": "technical",
        "description": "Standard technical interview template",
        "configJson": { ... Pipecat config ... }
    }
    """
    body = json.loads(event.get('body', '{}'))
    
    # Validate required fields
    org_id = body.get('orgId')
    if not org_id:
        raise common.ValidationError('orgId is required')
    org_id = common.validate_uuid(org_id, 'orgId')
    
    name = body.get('name')
    if not name:
        raise common.ValidationError('name is required')
    name = common.validate_string_length(name, 'name', max_length=255)
    
    interview_type = body.get('interviewType')
    if not interview_type:
        raise common.ValidationError('interviewType is required')
    interview_type = common.validate_string_length(interview_type, 'interviewType', max_length=100)
    
    config_json = body.get('configJson')
    if not config_json:
        raise common.ValidationError('configJson is required')
    if not isinstance(config_json, dict):
        raise common.ValidationError('configJson must be a JSON object')
    
    # Step 1: Verify org membership (for creation, only org membership needed)
    if not common.can_access_org_resource(user_id, org_id):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Check for duplicate name
    existing = common.find_one(
        table='voice_configs',
        filters={'org_id': org_id, 'name': name}
    )
    if existing:
        raise common.ValidationError(f'A config with name "{name}" already exists')
    
    # Optional fields
    description = body.get('description')
    if description:
        description = common.validate_string_length(description, 'description', max_length=1000)
    
    # Create config
    config_data = {
        'org_id': org_id,
        'name': name,
        'interview_type': interview_type,
        'description': description,
        'config_json': config_json,
        'is_active': True,
        'version': 1,
        'created_by': user_id
    }
    
    config = common.insert_one(table='voice_configs', data=config_data)
    
    result = _format_config_response(config)
    
    return common.created_response(result)


def handle_update_config(event: Dict[str, Any], user_id: str, config_id: str) -> Dict[str, Any]:
    """
    Update voice config.
    
    Request body:
    {
        "name": "Updated Name",
        "description": "Updated description",
        "configJson": { ... },
        "isActive": true
    }
    """
    config_id = common.validate_uuid(config_id, 'id')
    
    # Step 1: Fetch resource
    config = common.find_one(
        table='voice_configs',
        filters={'id': config_id}
    )
    
    if not config:
        raise common.NotFoundError('Config not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, config['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission
    if not voice_permissions.can_edit_voice_config(user_id, config_id):
        raise common.ForbiddenError('You do not have permission to edit this config')
    
    body = json.loads(event.get('body', '{}'))
    update_data = {}
    
    # Handle updatable fields
    if 'name' in body:
        name = common.validate_string_length(body['name'], 'name', max_length=255)
        # Check for duplicate name (exclude current config)
        existing = common.find_one(
            table='voice_configs',
            filters={'org_id': config['org_id'], 'name': name}
        )
        if existing and existing['id'] != config_id:
            raise common.ValidationError(f'A config with name "{name}" already exists')
        update_data['name'] = name
    
    if 'description' in body:
        update_data['description'] = common.validate_string_length(
            body['description'], 'description', max_length=1000
        ) if body['description'] else None
    
    if 'interviewType' in body:
        update_data['interview_type'] = common.validate_string_length(
            body['interviewType'], 'interviewType', max_length=100
        )
    
    if 'configJson' in body:
        if not isinstance(body['configJson'], dict):
            raise common.ValidationError('configJson must be a JSON object')
        update_data['config_json'] = body['configJson']
        # Increment version on config_json change
        update_data['version'] = config['version'] + 1
    
    if 'isActive' in body:
        update_data['is_active'] = bool(body['isActive'])
    
    if not update_data:
        raise common.ValidationError('No valid fields to update')
    
    update_data['updated_by'] = user_id
    
    updated_config = common.update_one(
        table='voice_configs',
        filters={'id': config_id},
        data=update_data
    )
    
    result = _format_config_response(updated_config)
    
    return common.success_response(result)


def handle_delete_config(event: Dict[str, Any], user_id: str, config_id: str) -> Dict[str, Any]:
    """
    Delete voice config.
    
    Only configs not referenced by any sessions can be deleted.
    """
    config_id = common.validate_uuid(config_id, 'id')
    
    # Step 1: Fetch resource
    config = common.find_one(
        table='voice_configs',
        filters={'id': config_id}
    )
    
    if not config:
        raise common.NotFoundError('Config not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, config['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission (deleting is an edit operation)
    if not voice_permissions.can_edit_voice_config(user_id, config_id):
        raise common.ForbiddenError('You do not have permission to delete this config')
    
    # Check if config is in use
    sessions_using = common.find_many(
        table='voice_sessions',
        filters={'config_id': config_id},
        limit=1
    )
    
    if sessions_using:
        raise common.ValidationError(
            'Cannot delete config that is in use by sessions. '
            'Deactivate it instead by setting isActive to false.'
        )
    
    # Delete the config
    common.delete_one(
        table='voice_configs',
        filters={'id': config_id}
    )
    
    return common.success_response({
        'message': 'Config deleted successfully',
        'id': config_id
    })


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _format_config_response(config: Dict[str, Any]) -> Dict[str, Any]:
    """Format config for API response (snake_case to camelCase)."""
    return {
        'id': config['id'],
        'orgId': config['org_id'],
        'name': config['name'],
        'interviewType': config['interview_type'],
        'description': config.get('description'),
        'configJson': config.get('config_json', {}),
        'isActive': config.get('is_active', True),
        'version': config.get('version', 1),
        'createdAt': config.get('created_at'),
        'updatedAt': config.get('updated_at'),
        'createdBy': config.get('created_by'),
        'updatedBy': config.get('updated_by')
    }