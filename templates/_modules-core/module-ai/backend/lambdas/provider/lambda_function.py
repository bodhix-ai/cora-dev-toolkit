"""
AI Providers Lambda Function - CORA Compliant
Handles CRUD operations for ai_providers (platform-level).
Also handles model discovery and testing operations.

Platform-level access: Only platform admins can access.
"""
import json
import boto3
import os
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import org_common as common

# Get Lambda function name from environment
LAMBDA_FUNCTION_NAME = os.environ.get('AWS_LAMBDA_FUNCTION_NAME', 'ai-provider-function')

# System admin roles
SYS_ADMIN_ROLES = ['sys_owner', 'sys_admin']

# Error categorization patterns
ERROR_CATEGORIES = {
    'requires_inference_profile': [
        'on-demand throughput',
        'inference profile'
    ],
    'requires_marketplace': [
        'aws-marketplace:ViewSubscriptions',
        'aws-marketplace:Subscribe',
        'marketplace subscription required'
    ],
    'invalid_request_format': [
        'Malformed input request',
        'required key [messages] not found',
        'extraneous key',
        'unknown variant'
    ],
    'access_denied': [
        'AccessDeniedException',
        'UnauthorizedException',
        'access denied'
    ],
    'deprecated': [
        'ResourceNotFoundException',
        'model not found',
        'does not exist'
    ],
    'timeout': [
        'ThrottlingException',
        'TimeoutException',
        'timed out',
        'read timeout'
    ]
}

def _categorize_error(error_message: str) -> str:
    """
    Categorize an error message into a specific validation category.
    Returns the category name or 'unknown_error' if no pattern matches.
    """
    if not error_message:
        return 'unknown_error'
    
    error_lower = error_message.lower()
    
    for category, patterns in ERROR_CATEGORIES.items():
        # Check if all patterns for this category are present
        # (for requires_inference_profile, need both 'throughput' AND 'inference profile')
        if category == 'requires_inference_profile':
            if all(pattern.lower() in error_lower for pattern in patterns):
                return category
        else:
            # For other categories, any pattern match is sufficient
            if any(pattern.lower() in error_lower for pattern in patterns):
                return category
    
    return 'unknown_error'

def detect_model_vendor(model_id: str, display_name: str = '') -> str:
    """
    Detect the model vendor from model_id pattern.
    
    Args:
        model_id: The Bedrock model ID (e.g., 'anthropic.claude-3-5-sonnet-20241022-v2:0')
        display_name: Optional display name for additional context
    
    Returns:
        Vendor name (anthropic, amazon, meta, mistral, etc.) or 'unknown'
    """
    import re
    
    # Strip region prefix if present (us., eu., ap., ca., global.)
    clean_model_id = model_id
    if re.match(r'^(us|eu|ap|ca|global)\.', model_id):
        clean_model_id = model_id.split('.', 1)[1]
    
    # Detect vendor from model_id prefix
    vendor_patterns = {
        'anthropic': r'^anthropic\.',
        'amazon': r'^amazon\.',
        'meta': r'^meta\.',
        'mistral': r'^mistral\.',
        'cohere': r'^cohere\.',
        'ai21': r'^ai21\.',
        'stability': r'^stability\.',
        'google': r'^google\.',
        'nvidia': r'^nvidia\.',
        'openai': r'^openai\.',
        'qwen': r'^qwen\.',
        'minimax': r'^minimax\.',
        'twelvelabs': r'^twelvelabs\.',
        'deepseek': r'^deepseek\.'
    }
    
    for vendor, pattern in vendor_patterns.items():
        if re.match(pattern, clean_model_id):
            return vendor
    
    # Fallback: Try to detect from display_name
    if display_name:
        display_lower = display_name.lower()
        if 'anthropic' in display_lower or 'claude' in display_lower:
            return 'anthropic'
        if 'amazon' in display_lower or 'nova' in display_lower or 'titan' in display_lower:
            return 'amazon'
        if 'meta' in display_lower or 'llama' in display_lower:
            return 'meta'
        if 'mistral' in display_lower:
            return 'mistral'
        if 'cohere' in display_lower:
            return 'cohere'
    
    return 'unknown'

def _check_admin_access(user_id: str) -> bool:
    """
    Check if user has system admin access.
    Returns True if user has access, False otherwise.
    """
    try:
        profile = common.find_one('user_profiles', {'user_id': user_id})
        if not profile:
            return False
        
        sys_role = profile.get('sys_role')
        return sys_role in SYS_ADMIN_ROLES
    except Exception as e:
        print(f'Error checking admin access: {str(e)}')
        return False

def _require_admin_access(user_id: str):
    """
    Require system admin access, raise ForbiddenError if user doesn't have it.
    """
    if not _check_admin_access(user_id):
        raise common.ForbiddenError('Access denied. System admin role required.')


def get_supabase_user_id_from_okta_uid(okta_uid: str) -> Optional[str]:
    """
    Get Supabase user_id from Okta user ID
    
    Args:
        okta_uid: Okta user ID
        
    Returns:
        Supabase user_id if found, None otherwise
    """
    try:
        identity = common.find_one(
            table='user_auth_ext_ids',
            filters={
                'provider_name': 'okta',
                'external_id': okta_uid
            }
        )
        return identity['auth_user_id'] if identity else None
    except Exception as e:
        print(f"Error getting Supabase user_id from Okta UID: {str(e)}")
        return None

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle ai_provider operations (platform-level, admin only)
    
    Routes - System Admin - Provider Management:
    - GET    /admin/sys/ai/providers                         - List all providers
    - POST   /admin/sys/ai/providers                         - Create a new provider
    - GET    /admin/sys/ai/providers/{providerId}            - Get a single provider by ID
    - PUT    /admin/sys/ai/providers/{providerId}            - Update a provider
    - DELETE /admin/sys/ai/providers/{providerId}            - Delete a provider
    - POST   /admin/sys/ai/providers/{providerId}/discover   - Discover models for a provider
    - POST   /admin/sys/ai/providers/{providerId}/validate-models - Start async model validation
    - GET    /admin/sys/ai/providers/{providerId}/validation-status - Get validation progress
    
    Routes - System Admin - Model Management:
    - GET    /admin/sys/ai/models                            - List all models
    - GET    /admin/sys/ai/models/{modelId}                  - Get a single model by ID
    - POST   /admin/sys/ai/models/{modelId}/test             - Test a specific model
    
    Routes - Organization Admin:
    - GET    /admin/org/ai/config                            - Get organization AI configuration
    """
    print(json.dumps(event, default=str))
    
    # Check if this is an async validation worker invocation
    if event.get('source') == 'async-validation-worker':
        return handle_async_validation_worker(event)
    
    try:
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        supabase_user_id = common.get_supabase_user_id_from_external_uid(okta_uid)
        
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
        if not http_method:
            return common.bad_request_response('HTTP method not found in request')
        
        path_params = event.get('pathParameters', {})
        path = event.get('requestContext', {}).get('http', {}).get('path') or event.get('path', '')
        
        # Route to appropriate handler based on path and method
        # Org admin routes
        if '/admin/org/ai/config' in path and http_method == 'GET':
            return handle_get_org_ai_config(event, supabase_user_id)
        # Sys admin provider routes
        elif '/admin/sys/ai/providers' in path and '/discover' in path and http_method == 'POST':
            if not path_params or not path_params.get('providerId'):
                return common.bad_request_response('Provider ID is required')
            return handle_discover_models(event, supabase_user_id, path_params['providerId'])
        elif '/admin/sys/ai/providers' in path and '/validate-models' in path and http_method == 'POST':
            if not path_params or not path_params.get('providerId'):
                return common.bad_request_response('Provider ID is required')
            return handle_validate_models(event, supabase_user_id, path_params['providerId'])
        elif '/admin/sys/ai/providers' in path and '/validation-status' in path and http_method == 'GET':
            if not path_params or not path_params.get('providerId'):
                return common.bad_request_response('Provider ID is required')
            return handle_get_validation_status(supabase_user_id, path_params['providerId'])
        # Sys admin model routes
        elif '/admin/sys/ai/models' in path and '/test' in path and http_method == 'POST':
            if not path_params or not path_params.get('modelId'):
                return common.bad_request_response('Model ID is required')
            return handle_test_model(event, supabase_user_id, path_params['modelId'])
        elif '/admin/sys/ai/models' in path and path_params and path_params.get('modelId') and http_method == 'GET':
            if not path_params or not path_params.get('modelId'):
                return common.bad_request_response('Model ID is required')
            model_id = common.validate_uuid(path_params['modelId'], 'modelId')
            _require_admin_access(supabase_user_id)
            model = common.find_one('ai_models', {'id': model_id})
            if not model:
                raise common.NotFoundError(f"AI Model with ID {model_id} not found.")
            return common.success_response(common.format_record(model))
        elif '/admin/sys/ai/models' in path and http_method == 'GET':
            return handle_get_models(event, supabase_user_id)
        # Sys admin provider CRUD
        elif '/admin/sys/ai/providers' in path and http_method == 'GET':
            if path_params and path_params.get('providerId'):
                return handle_get_one(supabase_user_id, path_params['providerId'])
            else:
                return handle_get_all(event, supabase_user_id)
        elif '/admin/sys/ai/providers' in path and http_method == 'POST':
            return handle_create(event, supabase_user_id)
        elif '/admin/sys/ai/providers' in path and http_method == 'PUT':
            if not path_params or not path_params.get('providerId'):
                return common.bad_request_response('Provider ID is required')
            return handle_update(event, supabase_user_id, path_params['providerId'])
        elif '/admin/sys/ai/providers' in path and http_method == 'DELETE':
            if not path_params or not path_params.get('providerId'):
                return common.bad_request_response('Provider ID is required')
            return handle_delete(supabase_user_id, path_params['providerId'])
        elif http_method == 'OPTIONS':
            return common.success_response({})
        else:
            return common.method_not_allowed_response()
            
    except KeyError as e:
        print(f'KeyError: {str(e)}')
        return common.unauthorized_response(f'Missing user information: {str(e)}')
    except common.NotFoundError as e:
        print(f'NotFoundError during user resolution: {str(e)}')
        return common.unauthorized_response(f'User not found: {str(e)}')
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response('Internal server error')

def handle_get_org_ai_config(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Get organization AI configuration.
    Returns list of available providers and models for this organization.
    Org ID comes from user's session (user's current organization).
    """
    # Get user's org_id from their profile
    profile = common.find_one('user_profiles', {'user_id': user_id})
    if not profile or not profile.get('org_id'):
        raise common.ForbiddenError('User does not belong to an organization')
    
    org_id = profile['org_id']
    
    try:
        # Get all active providers
        providers = common.find_many('ai_providers', {'is_active': True})
        
        # For each provider, get available models
        config = {
            'providers': [],
            'totalModels': 0
        }
        
        for provider in providers:
            # Get available models for this provider
            models = common.find_many('ai_models', {
                'provider_id': provider['id'],
                'status': 'available'
            })
            
            if models:
                provider_config = {
                    'id': provider['id'],
                    'name': provider['name'],
                    'displayName': provider.get('display_name'),
                    'providerType': provider['provider_type'],
                    'modelCount': len(models),
                    'models': common.format_records(models)
                }
                config['providers'].append(provider_config)
                config['totalModels'] += len(models)
        
        return common.success_response(config)
        
    except Exception as e:
        print(f'Error getting org AI config: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response(f'Failed to get org AI config: {str(e)}')


def handle_get_all(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """List all platform-level AI providers with model counts (admin only)"""
    _require_admin_access(user_id)
    
    # Check if model counts are requested via query param
    query_params = event.get('queryStringParameters', {}) or {}
    include_model_counts = query_params.get('include_model_counts', 'true').lower() == 'true'
    
    if include_model_counts:
        # Get all providers first
        providers = common.find_many(table='ai_providers', filters={})
        
        # For each provider, get model counts
        providers_with_counts = []
        for provider in providers:
            provider_id = provider['id']
            
            # Get all models for this provider
            models = common.find_many(table='ai_models', filters={'provider_id': provider_id})
            
            # Count models by status
            total = len(models)
            discovered = sum(1 for m in models if m.get('status') == 'discovered')
            testing = sum(1 for m in models if m.get('status') == 'testing')
            available = sum(1 for m in models if m.get('status') == 'available')
            unavailable = sum(1 for m in models if m.get('status') == 'unavailable')
            deprecated = sum(1 for m in models if m.get('status') == 'deprecated')
            
            # Count models by validation_category for detailed breakdown
            category_counts = {}
            for model in models:
                category = model.get('validation_category')
                if category:
                    category_counts[category] = category_counts.get(category, 0) + 1
            
            # Get last validation timestamp
            validation_history = common.find_many(
                table='ai_model_validation_history',
                filters={'provider_id': provider_id}
            )
            last_validated_at = None
            if validation_history:
                # Get the most recent validation
                sorted_history = sorted(
                    validation_history,
                    key=lambda x: x.get('validated_at', ''),
                    reverse=True
                )
                if sorted_history:
                    last_validated_at = sorted_history[0].get('validated_at')
            
            provider_with_counts = {
                'id': provider['id'],
                'name': provider['name'],
                'displayName': provider.get('display_name'),
                'providerType': provider['provider_type'],
                'authMethod': provider.get('auth_method', 'secrets_manager'),
                'credentialsSecretPath': provider.get('credentials_secret_path'),
                'isActive': provider.get('is_active', True),
                'createdAt': provider.get('created_at'),
                'updatedAt': provider.get('updated_at'),
                'createdBy': provider.get('created_by'),
                'updatedBy': provider.get('updated_by'),
                'modelCounts': {
                    'total': total,
                    'discovered': discovered,
                    'testing': testing,
                    'available': available,
                    'unavailable': unavailable,
                    'deprecated': deprecated,
                    'byCategory': category_counts
                },
                'lastValidatedAt': last_validated_at
            }
            providers_with_counts.append(provider_with_counts)
        
        return common.success_response(common.format_records(providers_with_counts))
    else:
        # Return basic provider list without counts
        providers = common.find_many(table='ai_providers', filters={})
        return common.success_response(common.format_records(providers))

def handle_get_one(user_id: str, provider_id: str) -> Dict[str, Any]:
    """Get a single AI provider by ID (admin only)"""
    _require_admin_access(user_id)
    
    provider_id = common.validate_uuid(provider_id, 'provider_id')
    provider = common.find_one('ai_providers', {'id': provider_id})
    if not provider:
        raise common.NotFoundError(f"AI Provider with ID {provider_id} not found.")
    
    return common.success_response(common.format_record(provider))

def handle_create(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Create a new platform-level AI provider (admin only)"""
    _require_admin_access(user_id)
    
    body = json.loads(event.get('body', '{}'))
    
    name = common.validate_required(body.get('name'), 'name')
    provider_type = common.validate_required(body.get('provider_type'), 'provider_type')
    
    data = {
        'name': name,
        'provider_type': provider_type,
        'display_name': body.get('display_name') or body.get('displayName'),
        'credentials_secret_path': body.get('credentials_secret_path') or body.get('credentialsSecretPath'),
        'is_active': body.get('is_active', True) if 'is_active' in body else body.get('isActive', True),
        'created_by': user_id
    }
    
    provider = common.insert_one(table='ai_providers', data=data)
    return common.created_response(common.format_record(provider))

def handle_update(event: Dict[str, Any], user_id: str, provider_id: str) -> Dict[str, Any]:
    """Update a platform-level AI provider (admin only)"""
    _require_admin_access(user_id)
    
    provider_id = common.validate_uuid(provider_id, 'provider_id')
    body = json.loads(event.get('body', '{}'))
    
    # Verify provider exists
    provider = common.find_one('ai_providers', {'id': provider_id})
    if not provider:
        raise common.NotFoundError(f"AI Provider with ID {provider_id} not found.")
    
    update_data = {}
    if 'name' in body:
        update_data['name'] = body['name']
    if 'display_name' in body or 'displayName' in body:
        update_data['display_name'] = body.get('display_name') or body.get('displayName')
    if 'auth_method' in body or 'authMethod' in body:
        update_data['auth_method'] = body.get('auth_method') or body.get('authMethod')
    if 'credentials_secret_path' in body or 'credentialsSecretPath' in body:
        update_data['credentials_secret_path'] = body.get('credentials_secret_path') or body.get('credentialsSecretPath')
    if 'is_active' in body or 'isActive' in body:
        update_data['is_active'] = body.get('is_active') if 'is_active' in body else body.get('isActive')
    
    if not update_data:
        raise common.ValidationError('No valid fields to update')
        
    update_data['updated_by'] = user_id
    
    updated_provider = common.update_one(table='ai_providers', filters={'id': provider_id}, data=update_data)
    return common.success_response(common.format_record(updated_provider))

def handle_delete(user_id: str, provider_id: str) -> Dict[str, Any]:
    """Delete a platform-level AI provider (admin only)"""
    _require_admin_access(user_id)
    
    provider_id = common.validate_uuid(provider_id, 'provider_id')
    
    # Verify provider exists
    provider = common.find_one('ai_providers', {'id': provider_id})
    if not provider:
        raise common.NotFoundError(f"AI Provider with ID {provider_id} not found.")
    
    common.delete_one(table='ai_providers', filters={'id': provider_id})
    
    return common.success_response({'message': 'Provider deleted successfully', 'id': provider_id})

def handle_get_models(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Get all models for a specific provider (admin only)"""
    _require_admin_access(user_id)
    
    query_params = event.get('queryStringParameters', {}) or {}
    provider_id = common.validate_required(query_params.get('providerId'), 'providerId')
    provider_id = common.validate_uuid(provider_id, 'providerId')
    
    # Verify provider exists
    provider = common.find_one('ai_providers', {'id': provider_id})
    if not provider:
        raise common.NotFoundError(f"AI Provider with ID {provider_id} not found.")
    
    models = common.find_many(table='ai_models', filters={'provider_id': provider_id})
    return common.success_response(common.format_records(models))

def handle_discover_models(event: Dict[str, Any], user_id: str, provider_id: str) -> Dict[str, Any]:
    """
    Discover available models from the provider and save them to the database (admin only).
    Currently supports AWS Bedrock provider.
    """
    _require_admin_access(user_id)
    
    provider_id = common.validate_uuid(provider_id, 'provider_id')
    
    # Verify provider exists
    provider = common.find_one('ai_providers', {'id': provider_id})
    if not provider:
        raise common.NotFoundError(f"AI Provider with ID {provider_id} not found.")
    
    provider_type = provider['provider_type']
    
    # Currently only support AWS Bedrock
    if provider_type != 'aws_bedrock':
        return common.bad_request_response(f'Model discovery not yet supported for provider type: {provider_type}')
    
    try:
        # Get credentials from secrets manager
        credentials = _get_provider_credentials(provider)
        
        # Discover models from AWS Bedrock
        discovered_models = _discover_bedrock_models(credentials)
        
        # Save/update models in database
        saved_models = []
        for model_info in discovered_models:
            model_data = {
                'provider_id': provider_id,
                'model_id': model_info['model_id'],
                'display_name': model_info['display_name'],
                'description': model_info.get('description'),
                'model_vendor': model_info.get('model_vendor'),
                'capabilities': model_info['capabilities'],
                'status': 'discovered',
                'cost_per_1k_tokens_input': model_info.get('cost_per_1k_tokens'),
                'cost_per_1k_tokens_output': model_info.get('cost_per_1k_tokens'),
                'last_discovered_at': datetime.utcnow().isoformat(),
                'updated_by': user_id
            }
            
            # Check if model already exists
            existing = common.find_one('ai_models', {'provider_id': provider_id, 'model_id': model_info['model_id']})
            
            if existing:
                # Update existing model
                updated_model = common.update_one(
                    table='ai_models',
                    filters={'id': existing['id']},
                    data=model_data
                )
                saved_models.append(updated_model)
            else:
                # Create new model
                model_data['created_by'] = user_id
                new_model = common.insert_one(table='ai_models', data=model_data)
                saved_models.append(new_model)
        
        return common.success_response({
            'message': f'Successfully discovered {len(saved_models)} models',
            'models': common.format_records(saved_models)
        })
        
    except Exception as e:
        print(f'Error discovering models: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response(f'Failed to discover models: {str(e)}')

def handle_validate_models(event: Dict[str, Any], user_id: str, provider_id: str) -> Dict[str, Any]:
    """
    Start async validation of all discovered models for a provider (admin only).
    Returns 202 immediately to avoid API Gateway timeout.
    Progress can be tracked via GET /providers/:id/validation-status
    """
    _require_admin_access(user_id)
    
    provider_id = common.validate_uuid(provider_id, 'provider_id')
    
    # Verify provider exists
    provider = common.find_one('ai_providers', {'id': provider_id})
    if not provider:
        raise common.NotFoundError(f"AI Provider with ID {provider_id} not found.")
    
    provider_type = provider['provider_type']
    
    # Currently only support AWS Bedrock
    if provider_type != 'aws_bedrock':
        return common.bad_request_response(f'Model validation not yet supported for provider type: {provider_type}')
    
    try:
        # Get ALL models for this provider
        models = common.find_many('ai_models', {'provider_id': provider_id})
        
        if not models:
            return common.success_response({
                'message': 'No models to validate. Please run "Discover Models" first.',
                'status': 'completed',
                'validated': 0,
                'available': 0,
                'unavailable': 0
            })
        
        # Initialize progress tracking
        # First, clear any existing in-progress validations for this provider
        existing_progress = common.find_many(
            'ai_model_validation_progress',
            {'provider_id': provider_id, 'status': 'in_progress'}
        )
        for prog in existing_progress:
            common.update_one(
                table='ai_model_validation_progress',
                filters={'id': prog['id']},
                data={'status': 'failed', 'error_message': 'Superseded by new validation', 'completed_at': datetime.utcnow().isoformat()}
            )
        
        # Create new progress record
        progress_data = {
            'provider_id': provider_id,
            'total_models': len(models),
            'validated_count': 0,
            'available_count': 0,
            'unavailable_count': 0,
            'current_model_id': None,
            'status': 'in_progress'
        }
        progress_record = common.insert_one(table='ai_model_validation_progress', data=progress_data)
        progress_id = progress_record['id']
        
        # Invoke Lambda asynchronously to process validation in background
        lambda_client = boto3.client('lambda')
        
        async_payload = {
            'source': 'async-validation-worker',
            'provider_id': provider_id,
            'progress_id': progress_id,
            'user_id': user_id
        }
        
        try:
            lambda_client.invoke(
                FunctionName=LAMBDA_FUNCTION_NAME,
                InvocationType='Event',  # Async invocation
                Payload=json.dumps(async_payload)
            )
            print(f"Async validation invoked for provider {provider_id}")
        except Exception as e:
            print(f"Error invoking async validation: {str(e)}")
            # Mark progress as failed
            common.update_one(
                table='ai_model_validation_progress',
                filters={'id': progress_id},
                data={
                    'status': 'failed',
                    'error_message': f'Failed to start async validation: {str(e)}',
                    'completed_at': datetime.utcnow().isoformat()
                }
            )
            return common.internal_error_response(f'Failed to start async validation: {str(e)}')
        
        # Return 202 Accepted immediately using common.success_response with 202 status
        return common.created_response({
            'message': 'Validation started',
            'status': 'in_progress',
            'total': len(models),
            'validated': 0,
            'available': 0,
            'unavailable': 0
        })
        
    except Exception as e:
        print(f'Error starting validation: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response(f'Failed to start validation: {str(e)}')

def handle_async_validation_worker(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle async validation worker invocation.
    This runs in a separate Lambda execution to process model validation in the background.
    """
    print("Starting async validation worker")
    
    try:
        provider_id = event.get('provider_id')
        progress_id = event.get('progress_id')
        user_id = event.get('user_id')
        
        if not all([provider_id, progress_id, user_id]):
            print(f"Missing required parameters: provider_id={provider_id}, progress_id={progress_id}, user_id={user_id}")
            return common.bad_request_response('Missing required parameters')
        
        # Get provider and credentials
        provider = common.find_one('ai_providers', {'id': provider_id})
        if not provider:
            print(f"Provider not found: {provider_id}")
            return common.not_found_response('Provider not found')
        
        # Get all models for this provider
        models = common.find_many('ai_models', {'provider_id': provider_id})
        
        # Get credentials
        credentials = _get_provider_credentials(provider)
        
        # Process validation
        _process_validation_async(
            provider_id=provider_id,
            progress_id=progress_id,
            models=models,
            credentials=credentials,
            user_id=user_id
        )
        
        return common.success_response({'message': 'Validation completed'})
        
    except Exception as e:
        print(f'Error in async validation worker: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response(f'Error: {str(e)}')

def _process_validation_async(
    provider_id: str,
    progress_id: str,
    models: List[Dict[str, Any]],
    credentials: Dict[str, Any],
    user_id: str
) -> None:
    """
    Process model validation asynchronously with parallel execution, updating progress in database.
    This continues running after the HTTP response is sent.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import threading
    
    # Thread-safe counters
    lock = threading.Lock()
    validated_count = 0
    available_count = 0
    unavailable_count = 0
    
    def safe_db_operation(operation, max_retries=3):
        """Execute a database operation with retry logic for transient failures."""
        import time
        for attempt in range(max_retries):
            try:
                return operation()
            except Exception as e:
                error_str = str(e)
                if ('Server disconnected' in error_str or 'connection' in error_str.lower()) and attempt < max_retries - 1:
                    wait_time = 0.5 * (2 ** attempt)  # Exponential backoff
                    print(f"  ⚠️  DB operation failed (attempt {attempt + 1}/{max_retries}), retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                # Either not a connection error or we've exhausted retries
                raise
    
    def validate_single_model(model: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a single model and return results."""
        model_db_id = model['id']
        bedrock_model_id = model['model_id']
        
        try:
            print(f"Validating model: {bedrock_model_id}")
            
            # Test the model with automatic fallback handling (no DB operations before test)
            try:
                test_result = _test_bedrock_model_with_fallback(
                    model_id=bedrock_model_id,
                    credentials=credentials,
                    prompt='Test'
                )
            except Exception as test_error:
                print(f"  💥 Exception during model test: {str(test_error)}")
                import traceback
                traceback.print_exc()
                test_result = {
                    'success': False,
                    'error': f'Test function raised exception: {str(test_error)}',
                    'latencyMs': 0
                }
            
            # Determine new status and category
            if test_result.get('success'):
                new_status = 'available'
                fallback_used = test_result.get('fallbackUsed', '')
                if 'inference profile' in fallback_used.lower():
                    validation_category = 'requires_inference_profile'
                else:
                    validation_category = 'direct_invocation'
            else:
                new_status = 'unavailable'
                validation_category = _categorize_error(test_result.get('error', ''))
            
            # Log results with category
            if not test_result['success']:
                print(f"  ❌ FAILED: {bedrock_model_id} - Category: {validation_category} - Error: {test_result.get('error')}")
            else:
                fallback_note = test_result.get('fallbackUsed', '')
                if fallback_note:
                    print(f"  ✅ SUCCESS: {bedrock_model_id} ({fallback_note})")
                else:
                    print(f"  ✅ SUCCESS: {bedrock_model_id}")
            
            # Update model status and category WITH RETRY
            try:
                safe_db_operation(lambda: common.update_one(
                    table='ai_models',
                    filters={'id': model_db_id},
                    data={
                        'status': new_status, 
                        'validation_category': validation_category,
                        'updated_by': user_id
                    }
                ))
            except Exception as db_error:
                print(f"  ⚠️  Warning: Failed to update model status after retries: {str(db_error)}")
            
            # Log validation history with category WITH RETRY
            try:
                safe_db_operation(lambda: common.insert_one(
                    table='ai_model_validation_history',
                    data={
                        'provider_id': provider_id,
                        'model_id': model_db_id,
                        'status': new_status,
                        'validation_category': validation_category,
                        'error_message': test_result.get('error'),
                        'latency_ms': test_result.get('latencyMs'),
                        'validated_by': user_id
                    }
                ))
            except Exception as db_error:
                print(f"  ⚠️  Warning: Failed to log validation history after retries: {str(db_error)}")
            
            # Return result for thread-safe counter updates
            return {
                'modelId': model_db_id,
                'bedrockModelId': bedrock_model_id,
                'success': test_result['success'],
                'status': new_status,
                'category': validation_category
            }
            
        except Exception as model_error:
            # Critical error validating this specific model - log and continue
            print(f"  💥 CRITICAL ERROR validating {bedrock_model_id}: {str(model_error)}")
            import traceback
            traceback.print_exc()
            
            # Categorize the critical error
            error_category = _categorize_error(str(model_error))
            
            try:
                common.update_one(
                    table='ai_models',
                    filters={'id': model_db_id},
                    data={
                        'status': 'unavailable',
                        'validation_category': error_category,
                        'updated_by': user_id
                    }
                )
                common.insert_one(
                    table='ai_model_validation_history',
                    data={
                        'provider_id': provider_id,
                        'model_id': model_db_id,
                        'status': 'unavailable',
                        'validation_category': error_category,
                        'error_message': f'Critical error: {str(model_error)}',
                        'validated_by': user_id
                    }
                )
            except Exception as recovery_error:
                print(f"  💥 Failed to record error state: {str(recovery_error)}")
            
            # Return failure result
            return {
                'modelId': model_db_id,
                'bedrockModelId': bedrock_model_id,
                'success': False,
                'status': 'unavailable',
                'category': error_category
            }
    
    try:
        # Use ThreadPoolExecutor for parallel validation
        # 5 concurrent workers - reduces stress on database connection pool
        max_workers = 5
        print(f"Starting parallel validation with {max_workers} workers for {len(models)} models...")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all model validation tasks
            future_to_model = {
                executor.submit(validate_single_model, model): model 
                for model in models
            }
            
            # Process results as they complete
            batch_update_interval = 10  # Update progress every 10 models
            for future in as_completed(future_to_model):
                try:
                    result = future.result()
                    
                    # Thread-safe counter updates
                    with lock:
                        validated_count += 1
                        if result['success']:
                            available_count += 1
                        else:
                            unavailable_count += 1
                        
                        # Batch progress updates - only update DB every 10 models or on last model
                        should_update = (validated_count % batch_update_interval == 0) or (validated_count == len(models))
                        
                        if should_update:
                            try:
                                safe_db_operation(lambda: common.update_one(
                                    table='ai_model_validation_progress',
                                    filters={'id': progress_id},
                                    data={
                                        'validated_count': validated_count,
                                        'available_count': available_count,
                                        'unavailable_count': unavailable_count,
                                        'current_model_id': result.get('bedrockModelId'),
                                        'last_updated_at': datetime.utcnow().isoformat()
                                    }
                                ))
                                print(f"Progress: {validated_count}/{len(models)} models validated ({available_count} available, {unavailable_count} unavailable)")
                            except Exception as db_error:
                                print(f"  ⚠️  Warning: Failed to update progress counts after retries: {str(db_error)}")
                
                except Exception as future_error:
                    print(f"  💥 Error processing future result: {str(future_error)}")
                    import traceback
                    traceback.print_exc()
        
        # Mark as completed
        common.update_one(
            table='ai_model_validation_progress',
            filters={'id': progress_id},
            data={
                'status': 'completed',
                'completed_at': datetime.utcnow().isoformat(),
                'last_updated_at': datetime.utcnow().isoformat()
            }
        )
        
        print(f"Validation completed: {validated_count} models validated ({available_count} available, {unavailable_count} unavailable)")
        
    except Exception as e:
        print(f'Error during async validation: {str(e)}')
        import traceback
        traceback.print_exc()
        
        # Mark as failed
        common.update_one(
            table='ai_model_validation_progress',
            filters={'id': progress_id},
            data={
                'status': 'failed',
                'error_message': str(e),
                'completed_at': datetime.utcnow().isoformat(),
                'last_updated_at': datetime.utcnow().isoformat()
            }
        )

def handle_get_validation_status(user_id: str, provider_id: str) -> Dict[str, Any]:
    """
    Get the current validation status for a provider (admin only).
    Returns the most recent validation progress record.
    """
    _require_admin_access(user_id)
    
    provider_id = common.validate_uuid(provider_id, 'provider_id')
    
    # Verify provider exists
    provider = common.find_one('ai_providers', {'id': provider_id})
    if not provider:
        raise common.NotFoundError(f"AI Provider with ID {provider_id} not found.")
    
    try:
        # Get the most recent validation progress for this provider
        all_progress = common.find_many(
            'ai_model_validation_progress',
            {'provider_id': provider_id}
        )
        
        if not all_progress:
            return common.success_response({
                'status': 'not_started',
                'total': 0,
                'validated': 0,
                'available': 0,
                'unavailable': 0,
                'currentModelId': None
            })
        
        # Sort by started_at descending to get most recent
        sorted_progress = sorted(
            all_progress,
            key=lambda x: x.get('started_at', ''),
            reverse=True
        )
        latest_progress = sorted_progress[0]
        
        return common.success_response({
            'status': latest_progress.get('status'),
            'isValidating': latest_progress.get('status') == 'in_progress',
            'total': latest_progress.get('total_models', 0),
            'validated': latest_progress.get('validated_count', 0),
            'available': latest_progress.get('available_count', 0),
            'unavailable': latest_progress.get('unavailable_count', 0),
            'currentModelId': latest_progress.get('current_model_id'),
            'errorMessage': latest_progress.get('error_message'),
            'startedAt': latest_progress.get('started_at'),
            'completedAt': latest_progress.get('completed_at'),
            'lastUpdatedAt': latest_progress.get('last_updated_at')
        })
        
    except Exception as e:
        print(f'Error getting validation status: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response(f'Failed to get validation status: {str(e)}')

def handle_test_model(event: Dict[str, Any], user_id: str, model_id: str) -> Dict[str, Any]:
    """
    Test a specific model by invoking it with a test prompt (admin only).
    """
    _require_admin_access(user_id)
    
    model_id = common.validate_uuid(model_id, 'model_id')
    
    # Get the model and provider
    model = common.find_one('ai_models', {'id': model_id})
    if not model:
        raise common.NotFoundError(f"AI Model with ID {model_id} not found.")
        
    provider = common.find_one('ai_providers', {'id': model['provider_id']})
    if not provider:
        raise common.NotFoundError(f"AI Provider for model {model_id} not found.")
    
    # Parse request body for test prompt
    body = json.loads(event.get('body', '{}'))
    test_prompt = body.get('prompt', 'Hello, this is a test message. Please respond briefly.')
    
    provider_type = provider['provider_type']
    
    # Currently only support AWS Bedrock
    if provider_type != 'aws_bedrock':
        return common.bad_request_response(f'Model testing not yet supported for provider type: {provider_type}')
    
    try:
        # Get credentials from secrets manager
        credentials = _get_provider_credentials(provider)
        
        # Test the model
        test_result = _test_bedrock_model(
            model_id=model['model_id'],
            credentials=credentials,
            prompt=test_prompt
        )
        
        # Update model status based on test result
        if test_result['success']:
            common.update_one(
                table='ai_models',
                filters={'id': model_id},
                data={'status': 'available', 'updated_by': user_id}
            )
        
        return common.success_response({
            'success': test_result['success'],
            'modelId': model['model_id'],
            'testPrompt': test_prompt,
            'response': test_result.get('response'),
            'latencyMs': test_result.get('latencyMs'),
            'error': test_result.get('error')
        })
        
    except Exception as e:
        print(f'Error testing model: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response(f'Failed to test model: {str(e)}')

# Helper functions for AWS Bedrock integration

def _get_provider_credentials(provider: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get provider credentials from AWS Secrets Manager or SSM Parameter Store.
    Supports both SSM Parameter Store (paths starting with '/') and Secrets Manager ARNs.
    """
    # Check auth_method FIRST - if using IAM role, return immediately without any secret lookups
    auth_method = provider.get('auth_method', 'secrets_manager')
    if auth_method == 'iam_role':
        region = os.environ.get('AWS_REGION')
        if not region:
            raise ValueError('AWS_REGION environment variable is not set. This should be automatically provided by AWS Lambda.')
        return {
            'useIamRole': True,
            'region': region
        }
    
    # Only look up credentials if NOT using IAM role
    credentials_path = provider.get('credentials_secret_path')
    
    if not credentials_path:
        # No credentials path configured - default to IAM role
        region = os.environ.get('AWS_REGION')
        if not region:
            raise ValueError('AWS_REGION environment variable is not set. This should be automatically provided by AWS Lambda.')
        return {
            'useIamRole': True,
            'region': region
        }
    
    try:
        # Handle Secrets Manager ARNs
        if credentials_path.startswith('arn:aws:secretsmanager:'):
            secrets_client = boto3.client('secretsmanager')
            try:
                response = secrets_client.get_secret_value(SecretId=credentials_path)
                secret_string = response.get('SecretString')
                if secret_string:
                    # Try to parse as JSON
                    try:
                        return json.loads(secret_string)
                    except json.JSONDecodeError:
                        # If not JSON, return as simple value
                        return {'value': secret_string}
                else:
                    raise ValueError(f'No SecretString in Secrets Manager response: {credentials_path}')
            except Exception as sm_error:
                raise ValueError(f'Failed to retrieve secret from Secrets Manager: {str(sm_error)}')
        
        # Handle SSM Parameter Store paths (starting with '/')
        elif credentials_path.startswith('/'):
            ssm_client = boto3.client('ssm')
            try:
                response = ssm_client.get_parameter(Name=credentials_path, WithDecryption=True)
                parameter_value = response.get('Parameter', {}).get('Value')
                if parameter_value:
                    # Try to parse as JSON
                    try:
                        return json.loads(parameter_value)
                    except json.JSONDecodeError:
                        # If not JSON, return as simple value
                        return {'value': parameter_value}
                else:
                    raise ValueError(f'No value in SSM Parameter Store response: {credentials_path}')
            except Exception as ssm_error:
                raise ValueError(f'Failed to retrieve secret from SSM Parameter Store: {str(ssm_error)}')
        
        else:
            raise ValueError(f'Invalid credentials path format: {credentials_path}. Must start with "/" (SSM) or "arn:aws:secretsmanager:" (Secrets Manager)')
    
    except Exception as e:
        print(f'Error retrieving credentials for provider {provider.get("id")}: {str(e)}')
        raise common.ValidationError(f'Failed to retrieve credentials: {str(e)}')

def _discover_bedrock_models(credentials: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Discover available models from AWS Bedrock.
    Includes both foundation models and inference profiles.
    """
    region = credentials.get('region', os.environ.get('AWS_REGION', 'us-east-1'))
    use_iam_role = credentials.get('useIamRole', True)
    
    # Initialize Bedrock client
    if use_iam_role:
        bedrock_client = boto3.client(
            service_name='bedrock',
            region_name=region
        )
    else:
        bedrock_client = boto3.client(
            service_name='bedrock',
            region_name=region,
            aws_access_key_id=credentials.get('access_key_id'),
            aws_secret_access_key=credentials.get('secret_access_key')
        )
    
    discovered_models = []
    
    # 1. List foundation models
    try:
        response = bedrock_client.list_foundation_models()
        for model_summary in response.get('modelSummaries', []):
            try:
                model_info = _parse_bedrock_model(model_summary, region)
                if model_info:
                    discovered_models.append(model_info)
            except Exception as e:
                print(f"Failed to parse foundation model {model_summary.get('modelId', 'unknown')}: {str(e)}")
    except Exception as e:
        print(f"Error listing foundation models: {str(e)}")
    
    # 2. List inference profiles (for newer models like Claude Opus 4.1, Sonnet 4.5)
    try:
        response = bedrock_client.list_inference_profiles()
        for profile_summary in response.get('inferenceProfileSummaries', []):
            try:
                model_info = _parse_bedrock_inference_profile(profile_summary, region)
                if model_info:
                    discovered_models.append(model_info)
            except Exception as e:
                print(f"Failed to parse inference profile {profile_summary.get('inferenceProfileId', 'unknown')}: {str(e)}")
    except Exception as e:
        print(f"Error listing inference profiles: {str(e)}")
    
    return discovered_models

def _parse_bedrock_inference_profile(profile_summary: Dict[str, Any], region: str) -> Optional[Dict[str, Any]]:
    """
    Parse inference profile from AWS API response.
    Inference profiles are used for cross-region routing and newer models like Claude Opus 4.1, Sonnet 4.5.
    """
    profile_id = profile_summary.get('inferenceProfileId', '')
    profile_name = profile_summary.get('inferenceProfileName', profile_id)
    description = profile_summary.get('description', '')
    
    if not profile_id:
        return None
    
    # Extract model info from profile
    models = profile_summary.get('models', [])
    if not models:
        return None
    
    # Use the first model as the base (inference profiles typically route to one model type)
    base_model = models[0]
    model_id_parts = base_model.get('modelArn', '').split('/')
    if len(model_id_parts) > 1:
        base_model_id = model_id_parts[-1]
    else:
        base_model_id = profile_id
    
    # Determine provider from profile ID
    provider_name = 'Unknown'
    if 'anthropic' in profile_id.lower() or 'claude' in profile_id.lower():
        provider_name = 'Anthropic'
    
    # Detect vendor
    vendor = detect_model_vendor(profile_id, profile_name)
    
    # Inference profiles support chat (they route to foundation models)
    supports_chat = True
    supports_embeddings = False
    supports_vision = 'vision' in profile_id.lower() or 'vision' in description.lower()
    
    # Estimate specs based on model type
    max_tokens, cost_per_1k_tokens = _estimate_model_specs(profile_id, provider_name)
    
    # Generate description
    model_description = _generate_model_description(profile_id, profile_name, provider_name, {
        'chat': supports_chat,
        'embedding': supports_embeddings,
        'vision': supports_vision,
        'max_tokens': max_tokens,
        'embedding_dimensions': 0
    })
    
    # Add inference profile context to description
    model_description = f"{model_description} [Inference Profile - Cross-region routing]"
    
    return {
        'model_id': profile_id,
        'display_name': f"{profile_name} (Inference Profile)",
        'description': model_description,
        'model_vendor': vendor,
        'capabilities': {
            'chat': supports_chat,
            'embedding': supports_embeddings,
            'vision': supports_vision,
            'streaming': True,  # Inference profiles support streaming
            'maxTokens': max_tokens,
            'embeddingDimensions': 0
        },
        'cost_per_1k_tokens': cost_per_1k_tokens,
        'metadata': {
            'provider_name': provider_name,
            'profile_type': profile_summary.get('type', 'SYSTEM_DEFINED'),
            'region': region,
            'discovered_at': datetime.utcnow().isoformat(),
            'is_inference_profile': True
        }
    }

def _parse_bedrock_model(model_summary: Dict[str, Any], region: str) -> Optional[Dict[str, Any]]:
    """
    Parse foundation model from AWS API response.
    Migrated and simplified from legacy aws_bedrock_provider.py
    """
    raw_model_id = model_summary.get('modelId', '')
    model_name = model_summary.get('modelName', raw_model_id)
    provider_name = model_summary.get('providerName', '')
    
    if not raw_model_id:
        return None
    
    # Use raw model ID exactly as AWS returns it (no normalization)
    model_id = raw_model_id
    
    # Detect vendor
    vendor = detect_model_vendor(model_id, model_name)
    
    # Determine capabilities
    output_modalities = model_summary.get('outputModalities', [])
    input_modalities = model_summary.get('inputModalities', [])
    
    supports_chat = 'TEXT' in output_modalities
    supports_embeddings = 'embed' in model_id.lower()
    supports_vision = 'IMAGE' in input_modalities and 'TEXT' in output_modalities
    
    # Estimate embedding dimensions
    embedding_dimensions = 0
    if supports_embeddings:
        if 'titan-embed-text-v1' in model_id:
            embedding_dimensions = 1536
        elif 'titan-embed-text-v2' in model_id or 'cohere.embed' in model_id:
            embedding_dimensions = 1024
        elif 'titan-embed-image' in model_id:
            embedding_dimensions = 1024
        else:
            embedding_dimensions = 1024
    
    # Estimate token limits and costs
    max_tokens, cost_per_1k_tokens = _estimate_model_specs(model_id, provider_name)
    
    # Generate helpful description
    description = _generate_model_description(model_id, model_name, provider_name, {
        'chat': supports_chat,
        'embedding': supports_embeddings,
        'vision': supports_vision,
        'max_tokens': max_tokens,
        'embedding_dimensions': embedding_dimensions
    })
    
    return {
        'model_id': model_id,
        'display_name': f"{model_name} (Bedrock)",
        'description': description,
        'model_vendor': vendor,
        'capabilities': {
            'chat': supports_chat,
            'embedding': supports_embeddings,
            'vision': supports_vision,
            'streaming': 'STREAMING' in model_summary.get('inferenceTypesSupported', []),
            'maxTokens': max_tokens,
            'embeddingDimensions': embedding_dimensions
        },
        'cost_per_1k_tokens': cost_per_1k_tokens,
        'metadata': {
            'provider_name': provider_name,
            'model_arn': model_summary.get('modelArn', ''),
            'region': region,
            'discovered_at': datetime.utcnow().isoformat()
        }
    }

def _generate_model_description(model_id: str, model_name: str, provider_name: str, capabilities: Dict[str, Any]) -> str:
    """
    Generate a helpful description for the model based on its capabilities and type.
    """
    parts = []
    
    # Add provider context
    if 'anthropic' in provider_name.lower() or 'claude' in model_id.lower():
        if 'opus' in model_id.lower():
            parts.append("Claude's most powerful model for complex tasks, research, and analysis.")
        elif 'sonnet' in model_id.lower():
            parts.append("Balanced Claude model offering great performance for most tasks.")
        elif 'haiku' in model_id.lower():
            parts.append("Fast and efficient Claude model for quick responses and high throughput.")
        else:
            parts.append("Anthropic's Claude model for conversational AI.")
    elif 'nova' in model_id.lower():
        if 'premier' in model_id.lower():
            parts.append("Amazon's flagship multimodal model with advanced reasoning capabilities.")
        elif 'pro' in model_id.lower():
            parts.append("Amazon's high-performance model for complex tasks.")
        elif 'lite' in model_id.lower():
            parts.append("Efficient Amazon model for fast, cost-effective responses.")
        elif 'micro' in model_id.lower():
            parts.append("Ultra-fast Amazon model for simple tasks and high-volume processing.")
        elif 'canvas' in model_id.lower():
            parts.append("Amazon's image generation model.")
        elif 'reel' in model_id.lower():
            parts.append("Amazon's video generation model.")
        else:
            parts.append("Amazon Nova model for AI tasks.")
    elif 'llama' in model_id.lower():
        if '70b' in model_id.lower() or '90b' in model_id.lower():
            parts.append("Meta's large Llama model for complex reasoning and analysis.")
        elif '8b' in model_id.lower() or '11b' in model_id.lower():
            parts.append("Meta's efficient Llama model for general-purpose tasks.")
        else:
            parts.append("Meta's open-source Llama model.")
    elif 'titan' in model_id.lower():
        if 'embed' in model_id.lower():
            parts.append(f"Amazon Titan embedding model ({capabilities.get('embedding_dimensions', 0)} dimensions).")
        elif 'image' in model_id.lower():
            parts.append("Amazon Titan image generation model.")
        else:
            parts.append("Amazon Titan text generation model.")
    elif 'cohere' in model_id.lower():
        if 'embed' in model_id.lower():
            parts.append(f"Cohere embedding model ({capabilities.get('embedding_dimensions', 0)} dimensions).")
        elif 'rerank' in model_id.lower():
            parts.append("Cohere reranking model for search and retrieval.")
        else:
            parts.append("Cohere command model for chat and completion.")
    elif 'mistral' in model_id.lower() or 'mixtral' in model_id.lower():
        parts.append("Mistral AI model for efficient text generation.")
    elif 'stable' in model_id.lower() or 'stability' in provider_name.lower():
        if 'image' in model_id.lower():
            parts.append("Stability AI image manipulation model.")
        else:
            parts.append("Stability AI model.")
    elif 'deepseek' in model_id.lower():
        parts.append("DeepSeek reasoning model with chain-of-thought capabilities.")
    else:
        parts.append(f"{provider_name} {model_name}.")
    
    # Add capability descriptions
    caps = []
    if capabilities.get('chat'):
        caps.append("text generation")
    if capabilities.get('embedding'):
        caps.append("embeddings")
    if capabilities.get('vision'):
        caps.append("vision")
    
    if caps:
        parts.append(f"Supports {', '.join(caps)}.")
    
    # Add context window info
    max_tokens = capabilities.get('max_tokens', 0)
    if max_tokens >= 100000:
        parts.append(f"Large context window ({max_tokens:,} tokens).")
    elif max_tokens > 0:
        parts.append(f"Context: {max_tokens:,} tokens.")
    
    return ' '.join(parts)

def _estimate_model_specs(model_id: str, provider_name: str) -> Tuple[int, float]:
    """
    Estimate model specifications based on model ID and provider.
    Migrated from legacy aws_bedrock_provider.py
    """
    # Claude models
    if 'claude' in model_id.lower():
        if 'opus' in model_id.lower():
            return (200000, 15.0)
        elif 'sonnet' in model_id.lower():
            return (200000, 3.0)
        elif 'haiku' in model_id.lower():
            return (200000, 0.25)
        else:
            return (200000, 8.0)
    
    # Titan models
    elif 'titan' in model_id.lower():
        if 'embed' in model_id.lower():
            return (8192, 0.0001)
        else:
            return (8192, 0.0008)
    
    # Cohere models
    elif 'cohere' in model_id.lower():
        if 'embed' in model_id.lower():
            return (512, 0.0001)
        else:
            return (4096, 0.0015)
    
    # Jurassic models
    elif 'ai21' in model_id.lower():
        return (8192, 0.0125)
    
    # Llama models
    elif 'llama' in model_id.lower():
        return (4096, 0.0006)
    
    # Stable Diffusion models
    elif 'stability' in provider_name.lower():
        return (512, 0.002)
    
    # Default
    else:
        return (4096, 0.001)

def _test_bedrock_model_with_fallback(model_id: str, credentials: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    """
    Test a Bedrock model with automatic fallback handling.
    Uses model-type-specific validation strategies based on model family.
    """
    import time
    
    model_id_lower = model_id.lower()
    
    # STEP 1: Detect and route embedding models (completely different API)
    if 'embed' in model_id_lower:
        print(f"    → Detected embedding model: {model_id}")
        result = _test_bedrock_embedding_model(model_id, credentials, prompt)
        if result['success']:
            result['fallbackUsed'] = 'embedding format'
        return result
    
    # STEP 2: Detect and route image/video generation models
    if any(x in model_id_lower for x in ['image-generator', 'canvas', 'reel', 'stability']):
        print(f"    → Detected image/video generation model: {model_id}")
        # Image generation models need different validation - mark as available if discovered
        return {
            'success': True,
            'response': 'Image/video generation model - validated via discovery',
            'latencyMs': 0,
            'fallbackUsed': 'image generation model'
        }
    
    # STEP 2b: Detect and route audio models (Nova Sonic, etc.)
    if any(x in model_id_lower for x in ['sonic', 'audio']):
        print(f"    → Detected audio model: {model_id}")
        # Audio models need different validation - mark as available if discovered
        return {
            'success': True,
            'response': 'Audio model - validated via discovery',
            'latencyMs': 0,
            'fallbackUsed': 'audio model'
        }
    
    # STEP 3: Detect model family and use appropriate format
    
    # Amazon Nova models → Use Converse API
    if 'nova' in model_id_lower and not 'embed' in model_id_lower:
        print(f"    → Detected Nova model: {model_id}, using Converse API")
        result = _test_bedrock_model_converse_api(model_id, credentials, prompt)
        if result['success']:
            result['fallbackUsed'] = 'Converse API (Nova)'
            return result
        # If Converse fails, fall through to other strategies
    
    # Amazon Titan text models → Use Titan-specific format
    if 'titan' in model_id_lower and any(x in model_id_lower for x in ['text', 'express', 'lite', 'large']):
        print(f"    → Detected Titan text model: {model_id}, using Titan format")
        result = _test_bedrock_titan_text_model(model_id, credentials, prompt)
        if result['success']:
            result['fallbackUsed'] = 'Titan text format'
            return result
        # If Titan format fails, fall through to other strategies
    
    # Meta Llama models → Use Llama-specific format
    if 'llama' in model_id_lower or 'meta' in model_id_lower:
        print(f"    → Detected Llama model: {model_id}, using Llama format")
        result = _test_bedrock_llama_model(model_id, credentials, prompt)
        if result['success']:
            result['fallbackUsed'] = 'Llama format'
            return result
        # If Llama format fails, fall through to other strategies
    
    # Mistral models → Use Mistral-specific format
    if 'mistral' in model_id_lower or 'mixtral' in model_id_lower:
        print(f"    → Detected Mistral model: {model_id}, using Mistral format")
        result = _test_bedrock_mistral_model(model_id, credentials, prompt)
        if result['success']:
            result['fallbackUsed'] = 'Mistral format'
            return result
        # If Mistral format fails, fall through to other strategies
    
    # STEP 4: Try messages format (works for Claude, Mistral, and some others)
    result = _test_bedrock_model_messages_format(model_id, credentials, prompt)
    
    if result['success']:
        result['fallbackUsed'] = 'messages format'
        return result
    
    # STEP 5: Check error patterns for special cases
    error_msg = result.get('error', '')
    error_msg_lower = error_msg.lower() if error_msg else ''
    
    # Model requires inference profile (can't be invoked directly)
    if 'on-demand throughput' in error_msg_lower and 'inference profile' in error_msg_lower:
        print(f"    → {model_id} requires inference profile routing (marking as available)")
        return {
            'success': True,
            'response': 'Available via inference profile routing',
            'latencyMs': 0,
            'fallbackUsed': 'inference profile required'
        }
    
    # Marketplace subscription required
    if 'aws-marketplace' in error_msg_lower:
        print(f"    → {model_id} requires AWS Marketplace subscription")
        result['error'] = 'AWS Marketplace subscription required'
        return result
    
    # STEP 6: Final fallback - try foundation model format (but not for Nova models)
    # Nova models ONLY support Converse API, so don't retry with incompatible formats
    if 'nova' not in model_id_lower and ('required key [messages] not found' in error_msg_lower or 'unknown variant' in error_msg_lower or 'malformed' in error_msg_lower):
        print(f"    → Retrying {model_id} with foundation model format...")
        result = _test_bedrock_model(model_id, credentials, prompt)
        if result['success']:
            result['fallbackUsed'] = 'foundation format'
        return result
    
    # No strategy worked - return original error
    return result

def _test_bedrock_model_converse_api(model_id: str, credentials: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    """
    Test a Bedrock model using the Converse API.
    This is the recommended API for Nova models and supported by many other model families.
    """
    import time
    from botocore.config import Config
    
    region = credentials.get('region', os.environ.get('AWS_REGION', 'us-east-1'))
    use_iam_role = credentials.get('useIamRole', True)
    
    boto_config = Config(
        read_timeout=30,
        connect_timeout=10,
        retries={'max_attempts': 0}
    )
    
    start_time = time.time()
    
    try:
        if use_iam_role:
            bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                config=boto_config
            )
        else:
            bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                aws_access_key_id=credentials.get('access_key_id'),
                aws_secret_access_key=credentials.get('secret_access_key'),
                config=boto_config
            )
        
        # Use Converse API
        response = bedrock_runtime.converse(
            modelId=model_id,
            messages=[
                {
                    'role': 'user',
                    'content': [{'text': prompt}]
                }
            ],
            inferenceConfig={
                'maxTokens': 100,
                'temperature': 0.1
            }
        )
        
        # Extract response
        response_text = ''
        if 'output' in response:
            output = response['output']
            if 'message' in output:
                message = output['message']
                if 'content' in message and len(message['content']) > 0:
                    response_text = message['content'][0].get('text', '')
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        return {
            'success': True,
            'response': response_text,
            'latencyMs': latency_ms
        }
        
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return {
            'success': False,
            'error': str(e),
            'latencyMs': latency_ms
        }

def _test_bedrock_titan_text_model(model_id: str, credentials: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    """
    Test an Amazon Titan text model using Titan-specific request format.
    """
    import time
    from botocore.config import Config
    
    region = credentials.get('region', os.environ.get('AWS_REGION', 'us-east-1'))
    use_iam_role = credentials.get('useIamRole', True)
    
    boto_config = Config(
        read_timeout=30,
        connect_timeout=10,
        retries={'max_attempts': 0}
    )
    
    start_time = time.time()
    
    try:
        if use_iam_role:
            bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                config=boto_config
            )
        else:
            bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                aws_access_key_id=credentials.get('access_key_id'),
                aws_secret_access_key=credentials.get('secret_access_key'),
                config=boto_config
            )
        
        # Titan text format
        body = json.dumps({
            'inputText': prompt,
            'textGenerationConfig': {
                'maxTokenCount': 100,
                'temperature': 0.1,
                'topP': 0.9
            }
        })
        
        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=body,
            contentType='application/json',
            accept='application/json'
        )
        
        response_body = json.loads(response['body'].read())
        
        # Extract response from Titan format
        response_text = ''
        if 'results' in response_body:
            results = response_body['results']
            if isinstance(results, list) and len(results) > 0:
                response_text = results[0].get('outputText', '')
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        return {
            'success': True,
            'response': response_text,
            'latencyMs': latency_ms
        }
        
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return {
            'success': False,
            'error': str(e),
            'latencyMs': latency_ms
        }

def _test_bedrock_llama_model(model_id: str, credentials: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    """
    Test a Meta Llama model using Llama-specific request format.
    """
    import time
    from botocore.config import Config
    
    region = credentials.get('region', os.environ.get('AWS_REGION', 'us-east-1'))
    use_iam_role = credentials.get('useIamRole', True)
    
    boto_config = Config(
        read_timeout=30,
        connect_timeout=10,
        retries={'max_attempts': 0}
    )
    
    start_time = time.time()
    
    try:
        if use_iam_role:
            bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                config=boto_config
            )
        else:
            bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                aws_access_key_id=credentials.get('access_key_id'),
                aws_secret_access_key=credentials.get('secret_access_key'),
                config=boto_config
            )
        
        # Llama format
        body = json.dumps({
            'prompt': prompt,
            'max_gen_len': 100,
            'temperature': 0.1,
            'top_p': 0.9
        })
        
        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=body,
            contentType='application/json',
            accept='application/json'
        )
        
        response_body = json.loads(response['body'].read())
        
        # Extract response from Llama format
        response_text = response_body.get('generation', '')
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        return {
            'success': True,
            'response': response_text,
            'latencyMs': latency_ms
        }
        
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return {
            'success': False,
            'error': str(e),
            'latencyMs': latency_ms
        }

def _test_bedrock_mistral_model(model_id: str, credentials: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    """
    Test a Mistral AI model using Mistral-specific request format.
    """
    import time
    from botocore.config import Config
    
    region = credentials.get('region', os.environ.get('AWS_REGION', 'us-east-1'))
    use_iam_role = credentials.get('useIamRole', True)
    
    boto_config = Config(
        read_timeout=30,
        connect_timeout=10,
        retries={'max_attempts': 0}
    )
    
    start_time = time.time()
    
    try:
        if use_iam_role:
            bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                config=boto_config
            )
        else:
            bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                aws_access_key_id=credentials.get('access_key_id'),
                aws_secret_access_key=credentials.get('secret_access_key'),
                config=boto_config
            )
        
        # Mistral format
        body = json.dumps({
            'prompt': f'<s>[INST] {prompt} [/INST]',
            'max_tokens': 100,
            'temperature': 0.1,
            'top_p': 0.9
        })
        
        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=body,
            contentType='application/json',
            accept='application/json'
        )
        
        response_body = json.loads(response['body'].read())
        
        # Extract response from Mistral format
        response_text = response_body.get('outputs', [{}])[0].get('text', '')
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        return {
            'success': True,
            'response': response_text,
            'latencyMs': latency_ms
        }
        
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return {
            'success': False,
            'error': str(e),
            'latencyMs': latency_ms
        }

def _test_bedrock_embedding_model(model_id: str, credentials: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    """
    Test a Bedrock embedding model using the correct embedding-specific request format.
    Embedding models require inputText instead of messages format.
    """
    import time
    from botocore.config import Config
    
    region = credentials.get('region', os.environ.get('AWS_REGION', 'us-east-1'))
    use_iam_role = credentials.get('useIamRole', True)
    
    # Configure timeout - 30 seconds per model test to prevent hanging
    boto_config = Config(
        read_timeout=30,
        connect_timeout=10,
        retries={'max_attempts': 0}  # No retries during validation
    )
    
    start_time = time.time()
    
    try:
        # Initialize Bedrock Runtime client with timeout config
        if use_iam_role:
            bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                config=boto_config
            )
        else:
            bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                aws_access_key_id=credentials.get('access_key_id'),
                aws_secret_access_key=credentials.get('secret_access_key'),
                config=boto_config
            )
        
        # Use embedding-specific format
        body = json.dumps({
            'inputText': prompt
        })
        
        # Invoke the model
        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=body,
            contentType='application/json',
            accept='application/json'
        )
        
        response_body = json.loads(response['body'].read())
        
        # Extract embedding - format varies by provider
        response_text = ''
        embedding_size = 0
        
        if 'embedding' in response_body:
            # Standard embedding response (Titan, Cohere)
            embedding = response_body['embedding']
            embedding_size = len(embedding)
            response_text = f'Embedding generated successfully ({embedding_size} dimensions)'
        elif 'embeddings' in response_body:
            # Alternate format
            embeddings = response_body['embeddings']
            if isinstance(embeddings, list) and len(embeddings) > 0:
                embedding_size = len(embeddings[0])
                response_text = f'Embedding generated successfully ({embedding_size} dimensions)'
        else:
            # Unknown format - just confirm we got a response
            response_text = 'Embedding response received (unknown format)'
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        return {
            'success': True,
            'response': response_text,
            'latencyMs': latency_ms
        }
        
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return {
            'success': False,
            'error': str(e),
            'latencyMs': latency_ms
        }

def _test_bedrock_model_messages_format(model_id: str, credentials: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    """
    Test a Bedrock model using messages format (for inference profiles and newer models).
    This is the most common format (93 out of 105 models).
    """
    import time
    from botocore.config import Config
    
    region = credentials.get('region', os.environ.get('AWS_REGION', 'us-east-1'))
    use_iam_role = credentials.get('useIamRole', True)
    
    # Configure timeout - 30 seconds per model test to prevent hanging
    boto_config = Config(
        read_timeout=30,
        connect_timeout=10,
        retries={'max_attempts': 0}  # No retries during validation
    )
    
    start_time = time.time()
    
    try:
        # Initialize Bedrock Runtime client with timeout config
        if use_iam_role:
            bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                config=boto_config
            )
        else:
            bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                aws_access_key_id=credentials.get('access_key_id'),
                aws_secret_access_key=credentials.get('secret_access_key'),
                config=boto_config
            )
        
        # Use messages format (standard for most models)
        body = json.dumps({
            'messages': [
                {'role': 'user', 'content': prompt}
            ],
            'max_tokens': 100,
            'temperature': 0.1
        })
        
        # Invoke the model
        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=body,
            contentType='application/json',
            accept='application/json'
        )
        
        response_body = json.loads(response['body'].read())
        
        # Extract response - format varies by model
        response_text = ''
        if 'content' in response_body:
            # Claude format
            content = response_body['content']
            if isinstance(content, list) and len(content) > 0:
                response_text = content[0].get('text', '')
        elif 'choices' in response_body:
            # OpenAI format
            choices = response_body['choices']
            if isinstance(choices, list) and len(choices) > 0:
                response_text = choices[0].get('message', {}).get('content', '')
        else:
            # Generic - just confirm we got a response
            response_text = str(response_body)[:100]
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        return {
            'success': True,
            'response': response_text,
            'latencyMs': latency_ms
        }
        
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return {
            'success': False,
            'error': str(e),
            'latencyMs': latency_ms
        }

def _test_bedrock_model(model_id: str, credentials: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    """
    Test a Bedrock model by invoking it with a test prompt using foundation model format.
    This is the fallback for older models that don't support messages format.
    """
    import time
    from botocore.config import Config
    
    region = credentials.get('region', os.environ.get('AWS_REGION', 'us-east-1'))
    use_iam_role = credentials.get('useIamRole', True)
    
    # Configure timeout - 30 seconds per model test to prevent hanging
    boto_config = Config(
        read_timeout=30,
        connect_timeout=10,
        retries={'max_attempts': 0}  # No retries during validation
    )
    
    start_time = time.time()
    
    try:
        # Initialize Bedrock Runtime client with timeout config
        if use_iam_role:
            bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                config=boto_config
            )
        else:
            bedrock_runtime = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                aws_access_key_id=credentials.get('access_key_id'),
                aws_secret_access_key=credentials.get('secret_access_key'),
                config=boto_config
            )
        
        # Format request based on model type
        if 'embed' in model_id.lower():
            # Embedding model
            body = json.dumps({
                'inputText': prompt
            })
        elif 'claude' in model_id.lower():
            # Claude model
            body = json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 100,
                'messages': [
                    {'role': 'user', 'content': prompt}
                ]
            })
        elif 'titan' in model_id.lower():
            # Titan model
            body = json.dumps({
                'inputText': prompt,
                'textGenerationConfig': {
                    'maxTokenCount': 100,
                    'temperature': 0.1
                }
            })
        else:
            # Generic format
            body = json.dumps({
                'prompt': prompt,
                'max_tokens': 100
            })
        
        # Invoke the model
        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=body,
            contentType='application/json',
            accept='application/json'
        )
        
        response_body = json.loads(response['body'].read())
        
        # Extract response text based on model format
        response_text = ''
        if 'embedding' in response_body:
            # Embedding model
            embedding = response_body['embedding']
            response_text = f'Embedding generated successfully ({len(embedding)} dimensions)'
        elif 'content' in response_body:
            # Claude format
            content = response_body['content']
            if isinstance(content, list) and len(content) > 0:
                response_text = content[0].get('text', '')
        elif 'results' in response_body:
            # Titan format
            results = response_body['results']
            if isinstance(results, list) and len(results) > 0:
                response_text = results[0].get('outputText', '')
        elif 'completion' in response_body:
            # Generic completion format
            response_text = response_body['completion']
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        return {
            'success': True,
            'response': response_text,
            'latencyMs': latency_ms
        }
        
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return {
            'success': False,
            'error': str(e),
            'latencyMs': latency_ms
        }
