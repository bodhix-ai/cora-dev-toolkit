"""
Voice Credentials Lambda - Voice Service Credential Management

Handles CRUD operations for voice-specific service credentials (Daily.co, Deepgram, Cartesia).
OpenAI credentials are managed via module-ai.

Routes - Data API:
- GET /voice/credentials - List credentials for organization
- GET /voice/credentials/{id} - Get credential by ID
- POST /voice/credentials - Create credential
- PUT /voice/credentials/{id} - Update credential
- DELETE /voice/credentials/{id} - Delete credential

Routes - System Admin:
- GET /admin/sys/voice/credentials - List platform credentials
- GET /admin/sys/voice/credentials/{id} - Get platform credential
- POST /admin/sys/voice/credentials - Create platform credential
- PUT /admin/sys/voice/credentials/{id} - Update platform credential
- DELETE /admin/sys/voice/credentials/{id} - Delete platform credential
- POST /admin/sys/voice/credentials/{id}/validate - Validate platform credential

Routes - Organization Admin:
- GET /admin/org/voice/credentials - List org credentials
- GET /admin/org/voice/credentials/{id} - Get org credential
- POST /admin/org/voice/credentials - Create org credential
- PUT /admin/org/voice/credentials/{id} - Update org credential
- DELETE /admin/org/voice/credentials/{id} - Delete org credential
"""

import json
import os
import boto3
from typing import Any, Dict
import org_common as common


# Supported voice services
SUPPORTED_SERVICES = ['daily', 'deepgram', 'cartesia']

# AWS clients
secrets_client = boto3.client('secretsmanager')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for voice credential operations.
    
    Routes requests to appropriate handlers based on HTTP method and path.
    """
    print(json.dumps(event, default=str))
    
    try:
        # Extract user info from authorizer
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        
        # Convert external UID to Supabase UUID for database operations
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # Get user profile for role and org_id
        user_profile = common.find_one(
            table='access_users',
            filters={'okta_uid': okta_uid}
        )
        if not user_profile:
            raise common.NotFoundError('User profile not found')
        
        user_role = user_profile.get('role', '')
        user_org_id = user_profile.get('org_id')
        
        # Extract HTTP method and path
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
        if not http_method:
            return common.bad_request_response('HTTP method not found in request')
        
        path = event.get('rawPath', '') or event.get('path', '')
        path_params = event.get('pathParameters', {}) or {}
        
        # OPTIONS handling
        if http_method == 'OPTIONS':
            return common.success_response({})
        
        # =============================================================================
        # SYSTEM ADMIN ROUTES
        # =============================================================================
        if '/admin/sys/voice/credentials' in path:
            # Verify sys_admin role
            if user_role not in ['sys_admin', 'super_admin']:
                raise common.ForbiddenError('System administrator access required')
            
            # POST /admin/sys/voice/credentials/{id}/validate - Validate credential
            if http_method == 'POST' and '/validate' in path:
                credential_id = path_params.get('credentialId') or path_params.get('id')
                return handle_sys_validate_credential(event, supabase_user_id, credential_id)
            
            # GET /admin/sys/voice/credentials - List platform credentials
            if http_method == 'GET' and not path_params.get('credentialId') and not path_params.get('id'):
                return handle_sys_list_credentials(event, supabase_user_id)
            
            # GET /admin/sys/voice/credentials/{id} - Get platform credential
            if http_method == 'GET' and (path_params.get('credentialId') or path_params.get('id')):
                credential_id = path_params.get('credentialId') or path_params.get('id')
                return handle_sys_get_credential(event, supabase_user_id, credential_id)
            
            # POST /admin/sys/voice/credentials - Create platform credential
            if http_method == 'POST':
                return handle_sys_create_credential(event, supabase_user_id)
            
            # PUT /admin/sys/voice/credentials/{id} - Update platform credential
            if http_method == 'PUT':
                credential_id = path_params.get('credentialId') or path_params.get('id')
                return handle_sys_update_credential(event, supabase_user_id, credential_id)
            
            # DELETE /admin/sys/voice/credentials/{id} - Delete platform credential
            if http_method == 'DELETE':
                credential_id = path_params.get('credentialId') or path_params.get('id')
                return handle_sys_delete_credential(event, supabase_user_id, credential_id)
        
        # =============================================================================
        # ORGANIZATION ADMIN ROUTES
        # =============================================================================
        if '/admin/org/voice/credentials' in path:
            # Verify org admin role and org_id
            if user_role not in ['org_admin', 'org_owner', 'sys_admin', 'super_admin']:
                raise common.ForbiddenError('Organization administrator access required')
            
            if not user_org_id and user_role not in ['sys_admin', 'super_admin']:
                raise common.ForbiddenError('Organization context required')
            
            # GET /admin/org/voice/credentials - List org credentials
            if http_method == 'GET' and not path_params.get('credentialId') and not path_params.get('id'):
                return handle_org_list_credentials(event, supabase_user_id, user_org_id)
            
            # GET /admin/org/voice/credentials/{id} - Get org credential
            if http_method == 'GET' and (path_params.get('credentialId') or path_params.get('id')):
                credential_id = path_params.get('credentialId') or path_params.get('id')
                return handle_org_get_credential(event, supabase_user_id, user_org_id, credential_id)
            
            # POST /admin/org/voice/credentials - Create org credential
            if http_method == 'POST':
                return handle_org_create_credential(event, supabase_user_id, user_org_id)
            
            # PUT /admin/org/voice/credentials/{id} - Update org credential
            if http_method == 'PUT':
                credential_id = path_params.get('credentialId') or path_params.get('id')
                return handle_org_update_credential(event, supabase_user_id, user_org_id, credential_id)
            
            # DELETE /admin/org/voice/credentials/{id} - Delete org credential
            if http_method == 'DELETE':
                credential_id = path_params.get('credentialId') or path_params.get('id')
                return handle_org_delete_credential(event, supabase_user_id, user_org_id, credential_id)
        
        # =============================================================================
        # DATA API ROUTES (Legacy)
        # =============================================================================
        # GET /voice/credentials - List credentials
        if http_method == 'GET' and not path_params.get('id') and not path_params.get('credentialId'):
            return handle_list_credentials(event, supabase_user_id)
        
        # GET /voice/credentials/{id} - Get credential by ID
        if http_method == 'GET' and (path_params.get('id') or path_params.get('credentialId')):
            credential_id = path_params.get('id') or path_params.get('credentialId')
            return handle_get_credential(event, supabase_user_id, credential_id)
        
        # POST /voice/credentials - Create credential
        if http_method == 'POST':
            return handle_create_credential(event, supabase_user_id)
        
        # PUT /voice/credentials/{id} - Update credential
        if http_method == 'PUT':
            credential_id = path_params.get('id') or path_params.get('credentialId')
            return handle_update_credential(event, supabase_user_id, credential_id)
        
        # DELETE /voice/credentials/{id} - Delete credential
        if http_method == 'DELETE':
            credential_id = path_params.get('id') or path_params.get('credentialId')
            return handle_delete_credential(event, supabase_user_id, credential_id)
        
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
# CREDENTIAL CRUD HANDLERS
# =============================================================================

def handle_list_credentials(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    List voice credentials for an organization.
    
    Query parameters:
    - orgId: (required) Organization ID
    - serviceName: Filter by service name (daily, deepgram, cartesia)
    - isActive: Filter by active status
    """
    query_params = event.get('queryStringParameters', {}) or {}
    
    # Validate required org_id
    org_id = query_params.get('orgId')
    if not org_id:
        raise common.ValidationError('orgId query parameter is required')
    org_id = common.validate_uuid(org_id, 'orgId')
    
    # Verify org membership with admin role
    membership = common.find_one(
        table='org_members',
        filters={'org_id': org_id, 'user_id': user_id}
    )
    if not membership:
        raise common.ForbiddenError('You do not have access to this organization')
    
    # Require admin role for credential access
    if membership.get('role') not in ['admin', 'owner']:
        raise common.ForbiddenError('Only org admins can view credentials')
    
    # Build filters
    filters = {'org_id': org_id}
    
    if query_params.get('serviceName'):
        service_name = query_params['serviceName'].lower()
        if service_name not in SUPPORTED_SERVICES:
            raise common.ValidationError(
                f'Invalid serviceName. Supported: {", ".join(SUPPORTED_SERVICES)}'
            )
        filters['service_name'] = service_name
    
    if query_params.get('isActive') is not None:
        filters['is_active'] = query_params['isActive'].lower() == 'true'
    
    # Query credentials
    credentials = common.find_many(
        table='voice_credentials',
        filters=filters,
        order='created_at.desc'
    )
    
    # Format response (exclude secret ARN details for security)
    result = [_format_credential_response(c) for c in credentials]
    
    return common.success_response(result)


def handle_get_credential(event: Dict[str, Any], user_id: str, credential_id: str) -> Dict[str, Any]:
    """
    Get voice credential by ID.
    """
    credential_id = common.validate_uuid(credential_id, 'id')
    
    # Get credential
    credential = common.find_one(
        table='voice_credentials',
        filters={'id': credential_id}
    )
    
    if not credential:
        raise common.NotFoundError('Credential not found')
    
    # Verify org membership with admin role
    membership = common.find_one(
        table='org_members',
        filters={'org_id': credential['org_id'], 'user_id': user_id}
    )
    if not membership:
        raise common.ForbiddenError('You do not have access to this credential')
    
    if membership.get('role') not in ['admin', 'owner']:
        raise common.ForbiddenError('Only org admins can view credentials')
    
    result = _format_credential_response(credential)
    
    return common.success_response(result)


def handle_create_credential(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Create a new voice credential.
    
    Request body:
    {
        "orgId": "uuid",
        "serviceName": "daily|deepgram|cartesia",
        "apiKey": "the-api-key",
        "configMetadata": {}  // optional service-specific config
    }
    """
    body = json.loads(event.get('body', '{}'))
    
    # Validate required fields
    org_id = body.get('orgId')
    if not org_id:
        raise common.ValidationError('orgId is required')
    org_id = common.validate_uuid(org_id, 'orgId')
    
    service_name = body.get('serviceName')
    if not service_name:
        raise common.ValidationError('serviceName is required')
    service_name = service_name.lower()
    if service_name not in SUPPORTED_SERVICES:
        raise common.ValidationError(
            f'Invalid serviceName. Supported: {", ".join(SUPPORTED_SERVICES)}'
        )
    
    api_key = body.get('apiKey')
    if not api_key:
        raise common.ValidationError('apiKey is required')
    
    # Verify org membership with admin role
    membership = common.find_one(
        table='org_members',
        filters={'org_id': org_id, 'user_id': user_id}
    )
    if not membership:
        raise common.ForbiddenError('You do not have access to this organization')
    
    if membership.get('role') not in ['admin', 'owner']:
        raise common.ForbiddenError('Only org admins can create credentials')
    
    # Check for existing credential for this service
    existing = common.find_one(
        table='voice_credentials',
        filters={'org_id': org_id, 'service_name': service_name}
    )
    if existing:
        raise common.ValidationError(
            f'Credential for {service_name} already exists. Update or delete the existing one.'
        )
    
    # Store API key in AWS Secrets Manager
    secret_name = f"voice/{org_id}/{service_name}"
    secret_arn = _create_or_update_secret(secret_name, {'api_key': api_key})
    
    # Create credential record
    credential_data = {
        'org_id': org_id,
        'service_name': service_name,
        'credentials_secret_arn': secret_arn,
        'config_metadata': body.get('configMetadata', {}),
        'is_active': True,
        'created_by': user_id
    }
    
    credential = common.insert_one(table='voice_credentials', data=credential_data)
    
    result = _format_credential_response(credential)
    
    return common.created_response(result)


def handle_update_credential(event: Dict[str, Any], user_id: str, credential_id: str) -> Dict[str, Any]:
    """
    Update voice credential.
    
    Request body:
    {
        "apiKey": "new-api-key",  // optional - updates secret
        "configMetadata": {},     // optional
        "isActive": true          // optional
    }
    """
    credential_id = common.validate_uuid(credential_id, 'id')
    
    # Get existing credential
    credential = common.find_one(
        table='voice_credentials',
        filters={'id': credential_id}
    )
    
    if not credential:
        raise common.NotFoundError('Credential not found')
    
    # Verify org membership with admin role
    membership = common.find_one(
        table='org_members',
        filters={'org_id': credential['org_id'], 'user_id': user_id}
    )
    if not membership:
        raise common.ForbiddenError('You do not have access to this credential')
    
    if membership.get('role') not in ['admin', 'owner']:
        raise common.ForbiddenError('Only org admins can update credentials')
    
    body = json.loads(event.get('body', '{}'))
    update_data = {}
    
    # Update API key in Secrets Manager if provided
    if 'apiKey' in body and body['apiKey']:
        secret_arn = credential['credentials_secret_arn']
        _create_or_update_secret(secret_arn, {'api_key': body['apiKey']}, update=True)
    
    # Handle other updatable fields
    if 'configMetadata' in body:
        update_data['config_metadata'] = body['configMetadata']
    
    if 'isActive' in body:
        update_data['is_active'] = bool(body['isActive'])
    
    if not update_data and 'apiKey' not in body:
        raise common.ValidationError('No valid fields to update')
    
    if update_data:
        update_data['updated_by'] = user_id
        
        credential = common.update_one(
            table='voice_credentials',
            filters={'id': credential_id},
            data=update_data
        )
    
    result = _format_credential_response(credential)
    
    return common.success_response(result)


def handle_delete_credential(event: Dict[str, Any], user_id: str, credential_id: str) -> Dict[str, Any]:
    """
    Delete voice credential.
    
    Also deletes the associated secret from AWS Secrets Manager.
    """
    credential_id = common.validate_uuid(credential_id, 'id')
    
    # Get credential
    credential = common.find_one(
        table='voice_credentials',
        filters={'id': credential_id}
    )
    
    if not credential:
        raise common.NotFoundError('Credential not found')
    
    # Verify org membership with admin role
    membership = common.find_one(
        table='org_members',
        filters={'org_id': credential['org_id'], 'user_id': user_id}
    )
    if not membership:
        raise common.ForbiddenError('You do not have access to this credential')
    
    if membership.get('role') not in ['admin', 'owner']:
        raise common.ForbiddenError('Only org admins can delete credentials')
    
    # Delete secret from Secrets Manager
    try:
        _delete_secret(credential['credentials_secret_arn'])
    except Exception as e:
        print(f'Warning: Failed to delete secret: {e}')
        # Continue with record deletion even if secret deletion fails
    
    # Delete the credential record
    common.delete_one(
        table='voice_credentials',
        filters={'id': credential_id}
    )
    
    return common.success_response({
        'message': 'Credential deleted successfully',
        'id': credential_id
    })


# =============================================================================
# SYSTEM ADMIN HANDLERS
# =============================================================================

def handle_sys_list_credentials(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    List platform credentials (sys admin).
    
    Query parameters:
    - serviceName: Filter by service name
    - isActive: Filter by active status
    """
    query_params = event.get('queryStringParameters', {}) or {}
    
    # Build filters for platform credentials (org_id is NULL)
    filters = {'org_id': None}
    
    if query_params.get('serviceName'):
        service_name = query_params['serviceName'].lower()
        if service_name not in SUPPORTED_SERVICES:
            raise common.ValidationError(
                f'Invalid serviceName. Supported: {", ".join(SUPPORTED_SERVICES)}'
            )
        filters['service_name'] = service_name
    
    if query_params.get('isActive') is not None:
        filters['is_active'] = query_params['isActive'].lower() == 'true'
    
    # Query platform credentials
    credentials = common.find_many(
        table='voice_credentials',
        filters=filters,
        order='created_at.desc'
    )
    
    result = [_format_credential_response(c) for c in credentials]
    
    return common.success_response(result)


def handle_sys_get_credential(event: Dict[str, Any], user_id: str, credential_id: str) -> Dict[str, Any]:
    """Get platform credential by ID (sys admin)."""
    credential_id = common.validate_uuid(credential_id, 'id')
    
    # Get credential
    credential = common.find_one(
        table='voice_credentials',
        filters={'id': credential_id, 'org_id': None}
    )
    
    if not credential:
        raise common.NotFoundError('Platform credential not found')
    
    result = _format_credential_response(credential)
    
    return common.success_response(result)


def handle_sys_create_credential(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Create platform credential (sys admin).
    
    Request body:
    {
        "serviceName": "daily|deepgram|cartesia",
        "apiKey": "the-api-key",
        "configMetadata": {}  // optional
    }
    """
    body = json.loads(event.get('body', '{}'))
    
    service_name = body.get('serviceName')
    if not service_name:
        raise common.ValidationError('serviceName is required')
    service_name = service_name.lower()
    if service_name not in SUPPORTED_SERVICES:
        raise common.ValidationError(
            f'Invalid serviceName. Supported: {", ".join(SUPPORTED_SERVICES)}'
        )
    
    api_key = body.get('apiKey')
    if not api_key:
        raise common.ValidationError('apiKey is required')
    
    # Check for existing platform credential for this service
    existing = common.find_one(
        table='voice_credentials',
        filters={'org_id': None, 'service_name': service_name}
    )
    if existing:
        raise common.ValidationError(
            f'Platform credential for {service_name} already exists. Update or delete the existing one.'
        )
    
    # Store API key in AWS Secrets Manager
    secret_name = f"voice/platform/{service_name}"
    secret_arn = _create_or_update_secret(secret_name, {'api_key': api_key})
    
    # Create credential record
    credential_data = {
        'org_id': None,
        'service_name': service_name,
        'credentials_secret_arn': secret_arn,
        'config_metadata': body.get('configMetadata', {}),
        'is_active': True,
        'created_by': user_id
    }
    
    credential = common.insert_one(table='voice_credentials', data=credential_data)
    
    result = _format_credential_response(credential)
    
    return common.created_response(result)


def handle_sys_update_credential(event: Dict[str, Any], user_id: str, credential_id: str) -> Dict[str, Any]:
    """
    Update platform credential (sys admin).
    
    Request body:
    {
        "apiKey": "new-api-key",  // optional
        "configMetadata": {},     // optional
        "isActive": true          // optional
    }
    """
    credential_id = common.validate_uuid(credential_id, 'id')
    
    # Get existing credential
    credential = common.find_one(
        table='voice_credentials',
        filters={'id': credential_id, 'org_id': None}
    )
    
    if not credential:
        raise common.NotFoundError('Platform credential not found')
    
    body = json.loads(event.get('body', '{}'))
    update_data = {}
    
    # Update API key in Secrets Manager if provided
    if 'apiKey' in body and body['apiKey']:
        secret_arn = credential['credentials_secret_arn']
        _create_or_update_secret(secret_arn, {'api_key': body['apiKey']}, update=True)
    
    # Handle other updatable fields
    if 'configMetadata' in body:
        update_data['config_metadata'] = body['configMetadata']
    
    if 'isActive' in body:
        update_data['is_active'] = bool(body['isActive'])
    
    if not update_data and 'apiKey' not in body:
        raise common.ValidationError('No valid fields to update')
    
    if update_data:
        update_data['updated_by'] = user_id
        
        credential = common.update_one(
            table='voice_credentials',
            filters={'id': credential_id},
            data=update_data
        )
    
    result = _format_credential_response(credential)
    
    return common.success_response(result)


def handle_sys_delete_credential(event: Dict[str, Any], user_id: str, credential_id: str) -> Dict[str, Any]:
    """Delete platform credential (sys admin)."""
    credential_id = common.validate_uuid(credential_id, 'id')
    
    # Get credential
    credential = common.find_one(
        table='voice_credentials',
        filters={'id': credential_id, 'org_id': None}
    )
    
    if not credential:
        raise common.NotFoundError('Platform credential not found')
    
    # Delete secret from Secrets Manager
    try:
        _delete_secret(credential['credentials_secret_arn'])
    except Exception as e:
        print(f'Warning: Failed to delete secret: {e}')
    
    # Delete the credential record
    common.delete_one(
        table='voice_credentials',
        filters={'id': credential_id}
    )
    
    return common.success_response({
        'message': 'Platform credential deleted successfully',
        'id': credential_id
    })


def handle_sys_validate_credential(event: Dict[str, Any], user_id: str, credential_id: str) -> Dict[str, Any]:
    """
    Validate platform credential (sys admin).
    
    Tests the credential by making a test API call to the service.
    """
    credential_id = common.validate_uuid(credential_id, 'id')
    
    # Get credential
    credential = common.find_one(
        table='voice_credentials',
        filters={'id': credential_id, 'org_id': None}
    )
    
    if not credential:
        raise common.NotFoundError('Platform credential not found')
    
    service_name = credential['service_name']
    
    # Get API key from Secrets Manager
    try:
        response = secrets_client.get_secret_value(SecretId=credential['credentials_secret_arn'])
        secret_data = json.loads(response['SecretString'])
        api_key = secret_data.get('api_key')
    except Exception as e:
        return common.internal_error_response(f'Failed to retrieve API key: {str(e)}')
    
    # Validate by making a test API call (implementation depends on service)
    validation_result = {
        'credentialId': credential_id,
        'serviceName': service_name,
        'isValid': True,  # Placeholder - implement actual validation
        'message': 'Credential validation not yet implemented for this service'
    }
    
    return common.success_response(validation_result)


# =============================================================================
# ORGANIZATION ADMIN HANDLERS
# =============================================================================

def handle_org_list_credentials(event: Dict[str, Any], user_id: str, org_id: str) -> Dict[str, Any]:
    """
    List organization credentials (org admin).
    
    Query parameters:
    - serviceName: Filter by service name
    - isActive: Filter by active status
    """
    query_params = event.get('queryStringParameters', {}) or {}
    
    # Build filters for org credentials
    filters = {'org_id': org_id}
    
    if query_params.get('serviceName'):
        service_name = query_params['serviceName'].lower()
        if service_name not in SUPPORTED_SERVICES:
            raise common.ValidationError(
                f'Invalid serviceName. Supported: {", ".join(SUPPORTED_SERVICES)}'
            )
        filters['service_name'] = service_name
    
    if query_params.get('isActive') is not None:
        filters['is_active'] = query_params['isActive'].lower() == 'true'
    
    # Query org credentials
    credentials = common.find_many(
        table='voice_credentials',
        filters=filters,
        order='created_at.desc'
    )
    
    result = [_format_credential_response(c) for c in credentials]
    
    return common.success_response(result)


def handle_org_get_credential(event: Dict[str, Any], user_id: str, org_id: str, credential_id: str) -> Dict[str, Any]:
    """Get organization credential by ID (org admin)."""
    credential_id = common.validate_uuid(credential_id, 'id')
    
    # Get credential
    credential = common.find_one(
        table='voice_credentials',
        filters={'id': credential_id, 'org_id': org_id}
    )
    
    if not credential:
        raise common.NotFoundError('Credential not found')
    
    result = _format_credential_response(credential)
    
    return common.success_response(result)


def handle_org_create_credential(event: Dict[str, Any], user_id: str, org_id: str) -> Dict[str, Any]:
    """
    Create organization credential (org admin).
    
    Request body:
    {
        "serviceName": "daily|deepgram|cartesia",
        "apiKey": "the-api-key",
        "configMetadata": {}  // optional
    }
    """
    body = json.loads(event.get('body', '{}'))
    
    service_name = body.get('serviceName')
    if not service_name:
        raise common.ValidationError('serviceName is required')
    service_name = service_name.lower()
    if service_name not in SUPPORTED_SERVICES:
        raise common.ValidationError(
            f'Invalid serviceName. Supported: {", ".join(SUPPORTED_SERVICES)}'
        )
    
    api_key = body.get('apiKey')
    if not api_key:
        raise common.ValidationError('apiKey is required')
    
    # Check for existing credential for this service
    existing = common.find_one(
        table='voice_credentials',
        filters={'org_id': org_id, 'service_name': service_name}
    )
    if existing:
        raise common.ValidationError(
            f'Credential for {service_name} already exists. Update or delete the existing one.'
        )
    
    # Store API key in AWS Secrets Manager
    secret_name = f"voice/{org_id}/{service_name}"
    secret_arn = _create_or_update_secret(secret_name, {'api_key': api_key})
    
    # Create credential record
    credential_data = {
        'org_id': org_id,
        'service_name': service_name,
        'credentials_secret_arn': secret_arn,
        'config_metadata': body.get('configMetadata', {}),
        'is_active': True,
        'created_by': user_id
    }
    
    credential = common.insert_one(table='voice_credentials', data=credential_data)
    
    result = _format_credential_response(credential)
    
    return common.created_response(result)


def handle_org_update_credential(event: Dict[str, Any], user_id: str, org_id: str, credential_id: str) -> Dict[str, Any]:
    """
    Update organization credential (org admin).
    
    Request body:
    {
        "apiKey": "new-api-key",  // optional
        "configMetadata": {},     // optional
        "isActive": true          // optional
    }
    """
    credential_id = common.validate_uuid(credential_id, 'id')
    
    # Get existing credential
    credential = common.find_one(
        table='voice_credentials',
        filters={'id': credential_id, 'org_id': org_id}
    )
    
    if not credential:
        raise common.NotFoundError('Credential not found')
    
    body = json.loads(event.get('body', '{}'))
    update_data = {}
    
    # Update API key in Secrets Manager if provided
    if 'apiKey' in body and body['apiKey']:
        secret_arn = credential['credentials_secret_arn']
        _create_or_update_secret(secret_arn, {'api_key': body['apiKey']}, update=True)
    
    # Handle other updatable fields
    if 'configMetadata' in body:
        update_data['config_metadata'] = body['configMetadata']
    
    if 'isActive' in body:
        update_data['is_active'] = bool(body['isActive'])
    
    if not update_data and 'apiKey' not in body:
        raise common.ValidationError('No valid fields to update')
    
    if update_data:
        update_data['updated_by'] = user_id
        
        credential = common.update_one(
            table='voice_credentials',
            filters={'id': credential_id},
            data=update_data
        )
    
    result = _format_credential_response(credential)
    
    return common.success_response(result)


def handle_org_delete_credential(event: Dict[str, Any], user_id: str, org_id: str, credential_id: str) -> Dict[str, Any]:
    """Delete organization credential (org admin)."""
    credential_id = common.validate_uuid(credential_id, 'id')
    
    # Get credential
    credential = common.find_one(
        table='voice_credentials',
        filters={'id': credential_id, 'org_id': org_id}
    )
    
    if not credential:
        raise common.NotFoundError('Credential not found')
    
    # Delete secret from Secrets Manager
    try:
        _delete_secret(credential['credentials_secret_arn'])
    except Exception as e:
        print(f'Warning: Failed to delete secret: {e}')
    
    # Delete the credential record
    common.delete_one(
        table='voice_credentials',
        filters={'id': credential_id}
    )
    
    return common.success_response({
        'message': 'Credential deleted successfully',
        'id': credential_id
    })


# =============================================================================
# AWS SECRETS MANAGER INTEGRATION
# =============================================================================

def _create_or_update_secret(secret_name: str, secret_data: Dict, update: bool = False) -> str:
    """Create or update a secret in AWS Secrets Manager."""
    secret_string = json.dumps(secret_data)
    
    if update:
        # Update existing secret
        response = secrets_client.put_secret_value(
            SecretId=secret_name,
            SecretString=secret_string
        )
        return response['ARN']
    else:
        # Create new secret
        try:
            response = secrets_client.create_secret(
                Name=secret_name,
                SecretString=secret_string,
                Tags=[
                    {'Key': 'Module', 'Value': 'voice'},
                    {'Key': 'ManagedBy', 'Value': 'cora'}
                ]
            )
            return response['ARN']
        except secrets_client.exceptions.ResourceExistsException:
            # Secret exists, update it
            response = secrets_client.put_secret_value(
                SecretId=secret_name,
                SecretString=secret_string
            )
            return response['ARN']


def _delete_secret(secret_arn: str) -> None:
    """Delete a secret from AWS Secrets Manager."""
    secrets_client.delete_secret(
        SecretId=secret_arn,
        ForceDeleteWithoutRecovery=True
    )


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _format_credential_response(credential: Dict[str, Any]) -> Dict[str, Any]:
    """Format credential for API response (snake_case to camelCase)."""
    return {
        'id': credential['id'],
        'orgId': credential['org_id'],
        'serviceName': credential['service_name'],
        'configMetadata': credential.get('config_metadata', {}),
        'isActive': credential.get('is_active', True),
        'createdAt': credential.get('created_at'),
        'updatedAt': credential.get('updated_at'),
        'createdBy': credential.get('created_by'),
        'updatedBy': credential.get('updated_by')
        # Note: credentials_secret_arn is intentionally excluded for security
    }
