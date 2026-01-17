"""
Voice Configs Lambda - Configuration CRUD Operations

Handles voice interview configuration management including templates
for Pipecat bot behavior, interview questions, and scoring rubrics.

Routes - Configs:
- GET /api/voice/configs - List configs for organization
- GET /api/voice/configs/{id} - Get config by ID
- POST /api/voice/configs - Create new config
- PUT /api/voice/configs/{id} - Update config
- DELETE /api/voice/configs/{id} - Delete config
"""

import json
from typing import Any, Dict
import access_common as access


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for voice config operations.
    
    Routes requests to appropriate handlers based on HTTP method and path.
    """
    print(json.dumps(event, default=str))
    
    try:
        # Extract user info from authorizer
        user_info = access.get_user_from_event(event)
        okta_uid = user_info['user_id']
        
        # Convert external UID to Supabase UUID for database operations
        supabase_user_id = access.get_supabase_user_id_from_external_uid(okta_uid)
        
        # Extract HTTP method
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
        if not http_method:
            return access.bad_request_response('HTTP method not found in request')
        
        # Extract path parameters
        path_params = event.get('pathParameters', {}) or {}
        
        # Route based on method
        if http_method == 'OPTIONS':
            return access.success_response({})
        
        # GET /api/voice/configs - List configs
        if http_method == 'GET' and not path_params.get('id'):
            return handle_list_configs(event, supabase_user_id)
        
        # GET /api/voice/configs/{id} - Get config by ID
        if http_method == 'GET' and path_params.get('id'):
            return handle_get_config(event, supabase_user_id, path_params['id'])
        
        # POST /api/voice/configs - Create config
        if http_method == 'POST':
            return handle_create_config(event, supabase_user_id)
        
        # PUT /api/voice/configs/{id} - Update config
        if http_method == 'PUT':
            return handle_update_config(event, supabase_user_id, path_params['id'])
        
        # DELETE /api/voice/configs/{id} - Delete config
        if http_method == 'DELETE':
            return handle_delete_config(event, supabase_user_id, path_params['id'])
        
        return access.not_found_response('Route not found')
        
    except KeyError as e:
        print(f'KeyError: {str(e)}')
        return access.unauthorized_response(f'Missing user information: {str(e)}')
    except access.NotFoundError as e:
        return access.not_found_response(str(e))
    except access.ValidationError as e:
        return access.bad_request_response(str(e))
    except access.ForbiddenError as e:
        return access.forbidden_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return access.internal_error_response('Internal server error')


# =============================================================================
# CONFIG CRUD HANDLERS
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
        raise access.ValidationError('orgId query parameter is required')
    org_id = access.validate_uuid(org_id, 'orgId')
    
    # Verify org membership
    membership = access.find_one(
        table='org_members',
        filters={'org_id': org_id, 'user_id': user_id}
    )
    if not membership:
        raise access.ForbiddenError('You do not have access to this organization')
    
    # Build filters
    filters = {'org_id': org_id}
    
    if query_params.get('isActive') is not None:
        filters['is_active'] = query_params['isActive'].lower() == 'true'
    
    if query_params.get('interviewType'):
        filters['interview_type'] = query_params['interviewType']
    
    # Query configs
    configs = access.find_many(
        table='voice_configs',
        filters=filters,
        order='name.asc'
    )
    
    # Format response
    result = [_format_config_response(c) for c in configs]
    
    return access.success_response(result)


def handle_get_config(event: Dict[str, Any], user_id: str, config_id: str) -> Dict[str, Any]:
    """
    Get voice config by ID.
    """
    config_id = access.validate_uuid(config_id, 'id')
    
    # Get config
    config = access.find_one(
        table='voice_configs',
        filters={'id': config_id}
    )
    
    if not config:
        raise access.NotFoundError('Config not found')
    
    # Verify org membership
    membership = access.find_one(
        table='org_members',
        filters={'org_id': config['org_id'], 'user_id': user_id}
    )
    if not membership:
        raise access.ForbiddenError('You do not have access to this config')
    
    result = _format_config_response(config)
    
    return access.success_response(result)


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
        raise access.ValidationError('orgId is required')
    org_id = access.validate_uuid(org_id, 'orgId')
    
    name = body.get('name')
    if not name:
        raise access.ValidationError('name is required')
    name = access.validate_string_length(name, 'name', max_length=255)
    
    interview_type = body.get('interviewType')
    if not interview_type:
        raise access.ValidationError('interviewType is required')
    interview_type = access.validate_string_length(interview_type, 'interviewType', max_length=100)
    
    config_json = body.get('configJson')
    if not config_json:
        raise access.ValidationError('configJson is required')
    if not isinstance(config_json, dict):
        raise access.ValidationError('configJson must be a JSON object')
    
    # Verify org membership
    membership = access.find_one(
        table='org_members',
        filters={'org_id': org_id, 'user_id': user_id}
    )
    if not membership:
        raise access.ForbiddenError('You do not have access to this organization')
    
    # Check for duplicate name
    existing = access.find_one(
        table='voice_configs',
        filters={'org_id': org_id, 'name': name}
    )
    if existing:
        raise access.ValidationError(f'A config with name "{name}" already exists')
    
    # Optional fields
    description = body.get('description')
    if description:
        description = access.validate_string_length(description, 'description', max_length=1000)
    
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
    
    config = access.insert_one(table='voice_configs', data=config_data)
    
    result = _format_config_response(config)
    
    return access.created_response(result)


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
    config_id = access.validate_uuid(config_id, 'id')
    
    # Get existing config
    config = access.find_one(
        table='voice_configs',
        filters={'id': config_id}
    )
    
    if not config:
        raise access.NotFoundError('Config not found')
    
    # Verify org membership
    membership = access.find_one(
        table='org_members',
        filters={'org_id': config['org_id'], 'user_id': user_id}
    )
    if not membership:
        raise access.ForbiddenError('You do not have access to this config')
    
    body = json.loads(event.get('body', '{}'))
    update_data = {}
    
    # Handle updatable fields
    if 'name' in body:
        name = access.validate_string_length(body['name'], 'name', max_length=255)
        # Check for duplicate name (exclude current config)
        existing = access.find_one(
            table='voice_configs',
            filters={'org_id': config['org_id'], 'name': name}
        )
        if existing and existing['id'] != config_id:
            raise access.ValidationError(f'A config with name "{name}" already exists')
        update_data['name'] = name
    
    if 'description' in body:
        update_data['description'] = access.validate_string_length(
            body['description'], 'description', max_length=1000
        ) if body['description'] else None
    
    if 'interviewType' in body:
        update_data['interview_type'] = access.validate_string_length(
            body['interviewType'], 'interviewType', max_length=100
        )
    
    if 'configJson' in body:
        if not isinstance(body['configJson'], dict):
            raise access.ValidationError('configJson must be a JSON object')
        update_data['config_json'] = body['configJson']
        # Increment version on config_json change
        update_data['version'] = config['version'] + 1
    
    if 'isActive' in body:
        update_data['is_active'] = bool(body['isActive'])
    
    if not update_data:
        raise access.ValidationError('No valid fields to update')
    
    update_data['updated_by'] = user_id
    
    updated_config = access.update_one(
        table='voice_configs',
        filters={'id': config_id},
        data=update_data
    )
    
    result = _format_config_response(updated_config)
    
    return access.success_response(result)


def handle_delete_config(event: Dict[str, Any], user_id: str, config_id: str) -> Dict[str, Any]:
    """
    Delete voice config.
    
    Only configs not referenced by any sessions can be deleted.
    """
    config_id = access.validate_uuid(config_id, 'id')
    
    # Get config
    config = access.find_one(
        table='voice_configs',
        filters={'id': config_id}
    )
    
    if not config:
        raise access.NotFoundError('Config not found')
    
    # Verify org membership
    membership = access.find_one(
        table='org_members',
        filters={'org_id': config['org_id'], 'user_id': user_id}
    )
    if not membership:
        raise access.ForbiddenError('You do not have access to this config')
    
    # Check if config is in use
    sessions_using = access.find_many(
        table='voice_sessions',
        filters={'config_id': config_id},
        limit=1
    )
    
    if sessions_using:
        raise access.ValidationError(
            'Cannot delete config that is in use by sessions. '
            'Deactivate it instead by setting isActive to false.'
        )
    
    # Delete the config
    access.delete_one(
        table='voice_configs',
        filters={'id': config_id}
    )
    
    return access.success_response({
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
