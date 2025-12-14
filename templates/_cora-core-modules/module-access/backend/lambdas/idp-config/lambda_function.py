"""
IDP Configuration Lambda

Manages Identity Provider (IDP) configurations for the platform.
Only accessible to platform admins (super_admin, platform_owner, platform_admin, global_owner, global_admin).

Routes:
- GET    /admin/idp-config                         - List all IDP configurations
- PUT    /admin/idp-config/{providerType}          - Update IDP configuration
- POST   /admin/idp-config/{providerType}/activate - Activate an IDP provider

Note: Client secrets are stored in AWS Secrets Manager, not in the database.
"""

import json
import logging
import os
from typing import Any, Dict, Optional

# Add the layer to path
import sys
sys.path.insert(0, '/opt/python')

from org_common.db import get_supabase_client
from org_common.responses import success_response, error_response
from org_common.validators import validate_required_fields

# Configure logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()
logger.setLevel(LOG_LEVEL)

# Platform admin roles
PLATFORM_ADMIN_ROLES = [
    'super_admin',
    'platform_owner', 
    'platform_admin',
    'global_owner',
    'global_admin'
]


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main Lambda handler for IDP configuration management."""
    
    logger.info(f"IDP Config event: {json.dumps(event, default=str)}")
    
    # Extract request details
    http_method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    path = event.get('rawPath', '')
    path_parameters = event.get('pathParameters', {}) or {}
    
    # Get user context from authorizer
    authorizer_context = event.get('requestContext', {}).get('authorizer', {}).get('lambda', {})
    user_id = authorizer_context.get('user_id')
    
    if not user_id:
        return error_response("Unauthorized: No user context", 401)
    
    # Verify platform admin access
    if not is_platform_admin(user_id):
        return error_response("Forbidden: Platform admin access required", 403)
    
    try:
        # Route to appropriate handler
        if path.endswith('/active'):
            return get_active_idp()
        elif path.endswith('/activate'):
            provider_type = path_parameters.get('provider_type')
            return activate_idp(provider_type, user_id)
        elif http_method == 'GET' and 'provider_type' in path_parameters:
            return get_idp_config(path_parameters['provider_type'])
        elif http_method == 'PUT' and 'provider_type' in path_parameters:
            body = json.loads(event.get('body', '{}'))
            return update_idp_config(path_parameters['provider_type'], body, user_id)
        elif http_method == 'GET':
            return list_idp_configs()
        else:
            return error_response(f"Method not allowed: {http_method}", 405)
            
    except json.JSONDecodeError:
        return error_response("Invalid JSON in request body", 400)
    except Exception as e:
        logger.exception(f"Error handling IDP config request: {e}")
        return error_response(f"Internal server error: {str(e)}", 500)


def is_platform_admin(user_id: str) -> bool:
    """Check if user has platform admin role."""
    try:
        client = get_supabase_client()
        
        result = client.table('profiles') \
            .select('global_role') \
            .eq('id', user_id) \
            .single() \
            .execute()
        
        if result.data:
            return result.data.get('global_role') in PLATFORM_ADMIN_ROLES
        return False
        
    except Exception as e:
        logger.error(f"Error checking platform admin status: {e}")
        return False


def list_idp_configs() -> Dict[str, Any]:
    """List all IDP configurations."""
    try:
        client = get_supabase_client()
        
        result = client.table('platform_idp_config') \
            .select('id, provider_type, display_name, config, is_active, is_configured, created_at, updated_at') \
            .order('provider_type') \
            .execute()
        
        return success_response(result.data)
        
    except Exception as e:
        logger.error(f"Error listing IDP configs: {e}")
        return error_response(f"Failed to list IDP configs: {str(e)}", 500)


def get_idp_config(provider_type: str) -> Dict[str, Any]:
    """Get specific IDP configuration."""
    try:
        client = get_supabase_client()
        
        result = client.table('platform_idp_config') \
            .select('id, provider_type, display_name, config, is_active, is_configured, created_at, updated_at') \
            .eq('provider_type', provider_type) \
            .single() \
            .execute()
        
        if not result.data:
            return error_response(f"IDP config not found: {provider_type}", 404)
        
        return success_response(result.data)
        
    except Exception as e:
        logger.error(f"Error getting IDP config: {e}")
        return error_response(f"Failed to get IDP config: {str(e)}", 500)


def get_active_idp() -> Dict[str, Any]:
    """Get the currently active IDP configuration."""
    try:
        client = get_supabase_client()
        
        result = client.table('platform_idp_config') \
            .select('id, provider_type, display_name, config, is_active, is_configured') \
            .eq('is_active', True) \
            .single() \
            .execute()
        
        if not result.data:
            return success_response({"message": "No active IDP configured", "idp": None})
        
        return success_response(result.data)
        
    except Exception as e:
        logger.error(f"Error getting active IDP: {e}")
        return error_response(f"Failed to get active IDP: {str(e)}", 500)


def update_idp_config(provider_type: str, body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Update IDP configuration."""
    try:
        client = get_supabase_client()
        
        # Validate provider type
        if provider_type not in ['clerk', 'okta']:
            return error_response(f"Invalid provider type: {provider_type}", 400)
        
        # Get current config for audit
        current = client.table('platform_idp_config') \
            .select('*') \
            .eq('provider_type', provider_type) \
            .single() \
            .execute()
        
        if not current.data:
            return error_response(f"IDP config not found: {provider_type}", 404)
        
        # Build update data
        update_data = {
            'updated_by': user_id
        }
        
        # Update display name if provided
        if 'display_name' in body:
            update_data['display_name'] = body['display_name']
        
        # Update config if provided
        if 'config' in body:
            # Validate required fields based on provider
            config = body['config']
            is_configured = validate_idp_config(provider_type, config)
            update_data['config'] = config
            update_data['is_configured'] = is_configured
        
        # Perform update
        result = client.table('platform_idp_config') \
            .update(update_data) \
            .eq('provider_type', provider_type) \
            .execute()
        
        # Log audit entry
        log_audit(
            client,
            idp_config_id=current.data['id'],
            action='updated',
            old_config=redact_sensitive(current.data.get('config', {})),
            new_config=redact_sensitive(update_data.get('config', current.data.get('config', {}))),
            performed_by=user_id
        )
        
        logger.info(f"Updated IDP config: {provider_type}")
        
        # Return updated config
        return get_idp_config(provider_type)
        
    except Exception as e:
        logger.error(f"Error updating IDP config: {e}")
        return error_response(f"Failed to update IDP config: {str(e)}", 500)


def activate_idp(provider_type: str, user_id: str) -> Dict[str, Any]:
    """Activate an IDP (deactivates any other active IDP)."""
    try:
        client = get_supabase_client()
        
        # Validate provider type
        if provider_type not in ['clerk', 'okta']:
            return error_response(f"Invalid provider type: {provider_type}", 400)
        
        # Check if IDP is configured
        current = client.table('platform_idp_config') \
            .select('*') \
            .eq('provider_type', provider_type) \
            .single() \
            .execute()
        
        if not current.data:
            return error_response(f"IDP config not found: {provider_type}", 404)
        
        if not current.data.get('is_configured'):
            return error_response(f"IDP {provider_type} is not fully configured", 400)
        
        # Activate this IDP (trigger will deactivate others)
        result = client.table('platform_idp_config') \
            .update({
                'is_active': True,
                'updated_by': user_id
            }) \
            .eq('provider_type', provider_type) \
            .execute()
        
        # Log audit entry
        log_audit(
            client,
            idp_config_id=current.data['id'],
            action='activated',
            old_config={'is_active': current.data.get('is_active')},
            new_config={'is_active': True},
            performed_by=user_id
        )
        
        logger.info(f"Activated IDP: {provider_type}")
        
        return success_response({
            'provider_type': provider_type,
            'is_active': True,
            'message': f'{provider_type} is now the active identity provider'
        })
        
    except Exception as e:
        logger.error(f"Error activating IDP: {e}")
        return error_response(f"Failed to activate IDP: {str(e)}", 500)


def validate_idp_config(provider_type: str, config: Dict[str, Any]) -> bool:
    """Validate IDP configuration has required fields."""
    
    if provider_type == 'okta':
        required = ['client_id', 'issuer']
        return all(config.get(field) for field in required)
    
    elif provider_type == 'clerk':
        required = ['publishable_key', 'issuer']
        return all(config.get(field) for field in required)
    
    return False


def redact_sensitive(config: Dict[str, Any]) -> Dict[str, Any]:
    """Redact sensitive fields from config for audit logging."""
    if not config:
        return {}
    
    redacted = config.copy()
    sensitive_fields = ['client_secret', 'secret_key', 'api_key']
    
    for field in sensitive_fields:
        if field in redacted:
            redacted[field] = '***REDACTED***'
    
    return redacted


def log_audit(
    client,
    idp_config_id: str,
    action: str,
    old_config: Optional[Dict] = None,
    new_config: Optional[Dict] = None,
    performed_by: Optional[str] = None
) -> None:
    """Log an audit entry for IDP config changes."""
    try:
        client.table('platform_idp_audit_log').insert({
            'idp_config_id': idp_config_id,
            'action': action,
            'old_config': old_config,
            'new_config': new_config,
            'performed_by': performed_by
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log audit entry: {e}")
