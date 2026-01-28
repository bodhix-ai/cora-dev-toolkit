"""
IDP Configuration Lambda

Manages Identity Provider (IDP) configurations for the platform.
Only accessible to platform admins.

CORA-EXCEPTION: platform-level
This is a platform-level Lambda that manages IDP configurations across the platform.
It intentionally does NOT:
- Filter by org_id (operates on platform-wide IDP configuration)
- Use typical org-scoped patterns (manages platform identity providers)
- Follow org-specific CORA patterns (platform admin functionality)

Routes - System Admin:
- GET    /admin/sys/access/idp                         - List all IDP configurations
- PUT    /admin/sys/access/idp/{providerType}          - Update IDP configuration
- POST   /admin/sys/access/idp/{providerType}/activate - Activate an IDP provider

Note: Client secrets are stored in AWS Secrets Manager, not in the database.
"""

import json
import logging
import os
from typing import Any, Dict, Optional

# Add the layer to path
import sys
sys.path.insert(0, '/opt/python')

import org_common as common
from org_common.db import get_supabase_client

# Configure logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()
logger.setLevel(LOG_LEVEL)

# Platform admin roles
SYS_ADMIN_ROLES = ['sys_owner', 'sys_admin']


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
        logger.error(f"Error getting Supabase user_id from Okta UID: {e}")
        return None


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main Lambda handler for IDP configuration management."""
    
    logger.info(f"IDP Config event: {json.dumps(event, default=str)}")
    
    # Extract request details
    http_method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    path = event.get('rawPath', '')
    path_parameters = event.get('pathParameters', {}) or {}
    
    # Get user context from JWT using standard auth helper
    try:
        user_info = common.get_user_from_event(event)
        user_id = user_info['user_id']
        org_id = user_info.get('org_id')  # Extract org_id for multi-tenancy
    except (KeyError, common.UnauthorizedError):
        return common.unauthorized_response("No user context")
    
    # Verify platform admin access
    if not is_sys_admin(user_id):
        return common.forbidden_response("Sys admin access required")
    
    try:
        # Route to appropriate handler
        if path.endswith('/active'):
            return get_active_idp()
        elif path.endswith('/activate'):
            provider_type = path_parameters.get('providerType')
            return activate_idp(provider_type, user_id)
        elif http_method == 'GET' and 'providerType' in path_parameters:
            return get_idp_config(path_parameters['providerType'])
        elif http_method == 'PUT' and 'providerType' in path_parameters:
            body = json.loads(event.get('body', '{}'))
            return update_idp_config(path_parameters['providerType'], body, user_id)
        elif http_method == 'GET':
            return list_idp_configs()
        else:
            return common.method_not_allowed_response()
            
    except json.JSONDecodeError:
        return common.bad_request_response("Invalid JSON in request body")
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.UnauthorizedError as e:
        return common.unauthorized_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except common.NotFoundError as e:
        return common.not_found_response(str(e))
    except Exception as e:
        logger.exception(f"Error handling IDP config request: {e}")
        return common.internal_error_response(f"Internal server error: {str(e)}")


def is_sys_admin(okta_uid: str) -> bool:
    """Check if user has sys admin role."""
    try:
        # Map Okta UID to Supabase user_id using standard org_common function
        supabase_user_id = common.get_supabase_user_id_from_external_uid(okta_uid)
        
        # Query user_profiles with correct column name
        profile = common.find_one('user_profiles', {'user_id': supabase_user_id})
        
        if profile:
            return profile.get('sys_role') in SYS_ADMIN_ROLES
        return False
        
    except Exception as e:
        logger.error(f"Error checking platform admin status: {e}")
        return False


def list_idp_configs() -> Dict[str, Any]:
    """List all IDP configurations."""
    try:
        # Use Supabase client directly for fetching all records
        client = get_supabase_client()
        result = client.table('sys_idp_config') \
            .select('id, provider_type, display_name, config, is_active, is_configured, created_at, updated_at') \
            .execute()
        
        configs = result.data if result.data else []
        # Transform snake_case to camelCase for API response
        formatted_configs = [common.format_record(config) for config in configs]
        return common.success_response(formatted_configs)
        
    except Exception as e:
        logger.error(f"Error listing IDP configs: {e}")
        return common.internal_error_response(f"Failed to list IDP configs: {str(e)}")


def get_idp_config(provider_type: str) -> Dict[str, Any]:
    """Get specific IDP configuration."""
    try:
        # Use standard database helper with correct parameter name
        config = common.find_one(
            table='sys_idp_config',
            filters={'provider_type': provider_type},
            select='id, provider_type, display_name, config, is_active, is_configured, created_at, updated_at'
        )
        
        if not config:
            return common.not_found_response(f"IDP config not found: {provider_type}")
        
        # Transform snake_case to camelCase for API response
        return common.success_response(common.format_record(config))
        
    except Exception as e:
        logger.error(f"Error getting IDP config: {e}")
        return common.internal_error_response(f"Failed to get IDP config: {str(e)}")


def get_active_idp() -> Dict[str, Any]:
    """Get the currently active IDP configuration."""
    try:
        # Use standard database helper with correct parameter name
        config = common.find_one(
            table='sys_idp_config',
            filters={'is_active': True},
            select='id, provider_type, display_name, config, is_active, is_configured'
        )
        
        if not config:
            return common.success_response({"message": "No active IDP configured", "idp": None})
        
        # Transform snake_case to camelCase for API response
        return common.success_response(common.format_record(config))
        
    except Exception as e:
        logger.error(f"Error getting active IDP: {e}")
        return common.internal_error_response(f"Failed to get active IDP: {str(e)}")


def update_idp_config(provider_type: str, body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Update IDP configuration."""
    try:
        # Validate provider type
        if provider_type not in ['clerk', 'okta']:
            return common.bad_request_response(f"Invalid provider type: {provider_type}")
        
        # Get current config for audit using standard helper
        current = common.find_one(
            table='sys_idp_config',
            filters={'provider_type': provider_type}
        )
        
        if not current:
            return common.not_found_response(f"IDP config not found: {provider_type}")
        
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
        
        # Perform update using standard helper
        result = common.update_one(
            table='sys_idp_config',
            filters={'provider_type': provider_type},
            data=update_data
        )
        
        # Log audit entry
        log_audit(
            idp_config_id=current['id'],
            action='updated',
            old_config=redact_sensitive(current.get('config', {})),
            new_config=redact_sensitive(update_data.get('config', current.get('config', {}))),
            performed_by=user_id
        )
        
        logger.info(f"Updated IDP config: {provider_type}")
        
        # Return updated config
        return get_idp_config(provider_type)
        
    except Exception as e:
        logger.error(f"Error updating IDP config: {e}")
        return common.internal_error_response(f"Failed to update IDP config: {str(e)}")


def activate_idp(provider_type: str, user_id: str) -> Dict[str, Any]:
    """Activate an IDP (deactivates any other active IDP)."""
    try:
        # Validate provider type
        if provider_type not in ['clerk', 'okta']:
            return common.bad_request_response(f"Invalid provider type: {provider_type}")
        
        # Check if IDP is configured using standard helper
        current = common.find_one(
            table='sys_idp_config',
            filters={'provider_type': provider_type}
        )
        
        if not current:
            return common.not_found_response(f"IDP config not found: {provider_type}")
        
        if not current.get('is_configured'):
            return common.bad_request_response(f"IDP {provider_type} is not fully configured")
        
        # Activate this IDP (trigger will deactivate others) using standard helper
        result = common.update_one(
            table='sys_idp_config',
            filters={'provider_type': provider_type},
            data={
                'is_active': True,
                'updated_by': user_id
            }
        )
        
        # Log audit entry
        log_audit(
            idp_config_id=current['id'],
            action='activated',
            old_config={'is_active': current.get('is_active')},
            new_config={'is_active': True},
            performed_by=user_id
        )
        
        logger.info(f"Activated IDP: {provider_type}")
        
        return common.success_response({
            'providerType': provider_type,
            'isActive': True,
            'message': f'{provider_type} is now the active identity provider'
        })
        
    except Exception as e:
        logger.error(f"Error activating IDP: {e}")
        return common.internal_error_response(f"Failed to activate IDP: {str(e)}")


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
    idp_config_id: str,
    action: str,
    old_config: Optional[Dict] = None,
    new_config: Optional[Dict] = None,
    performed_by: Optional[str] = None
) -> None:
    """Log an audit entry for IDP config changes."""
    try:
        common.insert_one(
            table='sys_idp_audit_log',
            data={
                'idp_config_id': idp_config_id,
                'action': action,
                'old_config': old_config,
                'new_config': new_config,
                'performed_by': performed_by
            }
        )
    except Exception as e:
        logger.error(f"Failed to log audit entry: {e}")
