"""
Voice Credentials Lambda - Voice Service Credential Management

Handles CRUD operations for voice-specific service credentials (Daily.co, Deepgram, Cartesia).
OpenAI credentials are managed via module-ai.

Routes - Credentials:
- GET /voice/credentials - List credentials for organization
- GET /voice/credentials/{id} - Get credential by ID
- POST /voice/credentials - Create credential
- PUT /voice/credentials/{id} - Update credential
- DELETE /voice/credentials/{id} - Delete credential
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
        
        # Extract HTTP method
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
        if not http_method:
            return common.bad_request_response('HTTP method not found in request')
        
        # Extract path parameters
        path_params = event.get('pathParameters', {}) or {}
        
        # Route based on HTTP method
        if http_method == 'OPTIONS':
            return common.success_response({})
        
        # GET /api/voice/credentials - List credentials
        if http_method == 'GET' and not path_params.get('id'):
            return handle_list_credentials(event, supabase_user_id)
        
        # GET /api/voice/credentials/{id} - Get credential by ID
        if http_method == 'GET' and path_params.get('id'):
            return handle_get_credential(event, supabase_user_id, path_params['id'])
        
        # POST /api/voice/credentials - Create credential
        if http_method == 'POST':
            return handle_create_credential(event, supabase_user_id)
        
        # PUT /api/voice/credentials/{id} - Update credential
        if http_method == 'PUT':
            return handle_update_credential(event, supabase_user_id, path_params['id'])
        
        # DELETE /api/voice/credentials/{id} - Delete credential
        if http_method == 'DELETE':
            return handle_delete_credential(event, supabase_user_id, path_params['id'])
        
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
