"""
Lambda Management Module - Main Handler

This Lambda function provides API endpoints for managing Lambda warming
configurations, EventBridge rules, and the module registry. It follows 
CORA patterns with standard auth and super admin authorization.

Routes - Lambda Config:
- GET /platform/lambda-config - List all configurations
- GET /platform/lambda-config/{configKey} - Get specific configuration
- PUT /platform/lambda-config/{configKey} - Update configuration
- GET /platform/lambda-functions - List Lambda functions
- POST /platform/lambda-config/sync - Manual EventBridge sync

Routes - Module Registry:
- GET /platform/modules - List all registered modules
- GET /platform/modules/{name} - Get specific module
- PUT /platform/modules/{name} - Update module configuration
- POST /platform/modules/{name}/enable - Enable a module
- POST /platform/modules/{name}/disable - Disable a module
- POST /platform/modules - Register a new module
"""

import json
import logging
import os
import re
from typing import Any, Dict, Optional

import org_common as common
from lambda_mgmt_common import EventBridgeManager

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))


def lambda_handler(event: Dict[str, Any], context: object) -> Dict[str, Any]:
    """
    Main Lambda handler with route dispatcher.
    
    All routes require super_admin role. Uses standard CORA auth patterns.
    
    Args:
        event: API Gateway proxy event
        context: Lambda context
    
    Returns:
        API Gateway proxy response
    """
    try:
        # Extract route information
        http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', ''))
        path = event.get('path', event.get('rawPath', ''))
        path_parameters = event.get('pathParameters') or {}
        
        logger.info(f"Request: {http_method} {path}")
        
        # Standard CORA auth extraction
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # Verify super admin role
        profile = common.find_one(
            table='user_profiles',
            filters={'user_id': supabase_user_id}
        )
        
        if not profile or profile.get('global_role') != 'super_admin':
            logger.warning(f"Access denied for user {supabase_user_id} - not super_admin")
            return common.forbidden_response('Super admin role required')
        
        logger.info(f"Super admin access granted for user {supabase_user_id}")
        
        # Route dispatcher
        if path.endswith('/platform/lambda-config') and http_method == 'GET':
            return handle_list_configs()
        
        elif path.endswith('/platform/lambda-config/sync') and http_method == 'POST':
            return handle_sync_eventbridge(supabase_user_id)
        
        elif '/platform/lambda-config/' in path and http_method == 'GET':
            config_key = path_parameters.get('configKey')
            return handle_get_config(config_key)
        
        elif '/platform/lambda-config/' in path and http_method == 'PUT':
            config_key = path_parameters.get('configKey')
            body = json.loads(event.get('body', '{}'))
            return handle_update_config(config_key, body, supabase_user_id)
        
        elif path.endswith('/platform/lambda-functions') and http_method == 'GET':
            return handle_list_functions()
        
        # Module Registry Routes
        elif path.endswith('/platform/modules') and http_method == 'GET':
            return handle_list_modules(event)
        
        elif path.endswith('/platform/modules') and http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_register_module(body, supabase_user_id)
        
        elif '/platform/modules/' in path and path.endswith('/enable') and http_method == 'POST':
            module_name = path_parameters.get('name')
            return handle_enable_module(module_name, supabase_user_id)
        
        elif '/platform/modules/' in path and path.endswith('/disable') and http_method == 'POST':
            module_name = path_parameters.get('name')
            force = event.get('queryStringParameters', {}).get('force', 'false').lower() == 'true'
            return handle_disable_module(module_name, supabase_user_id, force)
        
        elif '/platform/modules/' in path and http_method == 'GET':
            module_name = path_parameters.get('name')
            return handle_get_module(module_name)
        
        elif '/platform/modules/' in path and http_method == 'PUT':
            module_name = path_parameters.get('name')
            body = json.loads(event.get('body', '{}'))
            return handle_update_module(module_name, body, supabase_user_id)
        
        else:
            return common.not_found_response(f'Route not found: {http_method} {path}')
    
    except KeyError as e:
        logger.exception(f'Missing user information: {str(e)}')
        return common.unauthorized_response(f'Missing user information: {str(e)}')
    
    except common.NotFoundError as e:
        return common.not_found_response(str(e))
    
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    
    except json.JSONDecodeError as e:
        return common.bad_request_response(f'Invalid JSON: {str(e)}')
    
    except Exception as e:
        logger.exception(f'Internal error: {str(e)}')
        return common.internal_error_response('Internal server error')


def handle_list_configs() -> Dict[str, Any]:
    """
    GET /platform/lambda-config
    
    List all platform Lambda configurations.
    
    Returns:
        List of configuration objects
    """
    try:
        configs = common.find_many(
            table='platform_lambda_config',
            filters={'is_active': True}
        )
        
        logger.info(f"Retrieved {len(configs)} platform configurations")
        return common.success_response(configs)
    
    except Exception as e:
        logger.exception(f'Error listing configs: {str(e)}')
        raise


def handle_get_config(config_key: str) -> Dict[str, Any]:
    """
    GET /platform/lambda-config/{configKey}
    
    Get a specific configuration by key.
    
    Args:
        config_key: Configuration key (e.g., "lambda_warming")
    
    Returns:
        Configuration object
    """
    if not config_key:
        raise common.ValidationError('Configuration key is required')
    
    try:
        config = common.find_one(
            table='platform_lambda_config',
            filters={'config_key': config_key}
        )
        
        if not config:
            raise common.NotFoundError(f'Configuration not found: {config_key}')
        
        logger.info(f"Retrieved configuration: {config_key}")
        return common.success_response(config)
    
    except Exception as e:
        logger.exception(f'Error getting config {config_key}: {str(e)}')
        raise


def handle_update_config(
    config_key: str, 
    body: Dict[str, Any], 
    user_id: str
) -> Dict[str, Any]:
    """
    PUT /platform/lambda-config/{configKey}
    
    Update a configuration. If lambda_warming, also syncs EventBridge rules.
    
    Args:
        config_key: Configuration key
        body: Request body with config_value
        user_id: Supabase user ID for audit
    
    Returns:
        Updated configuration with sync results
    """
    if not config_key:
        raise common.ValidationError('Configuration key is required')
    
    if 'config_value' not in body:
        raise common.ValidationError('config_value is required in request body')
    
    config_value = body['config_value']
    
    try:
        # Update configuration in database
        updated_config = common.update_one(
            table='platform_lambda_config',
            filters={'config_key': config_key},
            data={
                'config_value': config_value,
                'updated_by': user_id
            }
        )
        
        if not updated_config:
            raise common.NotFoundError(f'Configuration not found: {config_key}')
        
        logger.info(f"Updated configuration: {config_key}")
        
        # If lambda_warming, sync EventBridge rules
        if config_key == 'lambda_warming':
            try:
                environment = os.environ.get('ENVIRONMENT', 'dev')
                manager = EventBridgeManager(environment=environment)
                
                enabled = config_value.get('enabled', False)
                
                if enabled:
                    # Sync rules based on schedule
                    sync_results = manager.sync_rules(config_value)
                    updated_config['eventbridge_sync'] = sync_results
                    
                    if sync_results.get('success'):
                        logger.info(f"Successfully synced EventBridge rules: {sync_results}")
                    else:
                        logger.error(f"Failed to sync EventBridge rules: {sync_results}")
                else:
                    # Disable all warmer rules
                    disable_results = manager.disable_rules()
                    updated_config['eventbridge_sync'] = disable_results
                    
                    if disable_results.get('success'):
                        logger.info(f"Successfully disabled warmer rules: {disable_results}")
                    else:
                        logger.error(f"Failed to disable warmer rules: {disable_results}")
            
            except Exception as eb_error:
                logger.exception(f"Error managing EventBridge rules: {eb_error}")
                updated_config['eventbridge_error'] = str(eb_error)
        
        return common.success_response(updated_config)
    
    except Exception as e:
        logger.exception(f'Error updating config {config_key}: {str(e)}')
        raise


def handle_list_functions() -> Dict[str, Any]:
    """
    GET /platform/lambda-functions
    
    List all Lambda functions in the environment.
    
    Returns:
        List of Lambda function configurations
    """
    try:
        environment = os.environ.get('ENVIRONMENT', 'dev')
        manager = EventBridgeManager(environment=environment)
        
        functions = manager.list_lambda_functions()
        
        logger.info(f"Retrieved {len(functions)} Lambda functions")
        return common.success_response(functions)
    
    except Exception as e:
        logger.exception(f'Error listing Lambda functions: {str(e)}')
        raise


def handle_sync_eventbridge(user_id: str) -> Dict[str, Any]:
    """
    POST /platform/lambda-config/sync
    
    Manually trigger EventBridge rule synchronization.
    Useful for testing or fixing sync issues.
    
    Args:
        user_id: Supabase user ID for audit
    
    Returns:
        Sync results
    """
    try:
        # Get current lambda_warming configuration
        config = common.find_one(
            table='platform_lambda_config',
            filters={'config_key': 'lambda_warming'}
        )
        
        if not config:
            raise common.NotFoundError('lambda_warming configuration not found')
        
        # Sync EventBridge rules
        environment = os.environ.get('ENVIRONMENT', 'dev')
        manager = EventBridgeManager(environment=environment)
        
        sync_results = manager.sync_rules(config['config_value'])
        
        logger.info(f"Manual EventBridge sync triggered by user {user_id}: {sync_results}")
        
        return common.success_response({
            'message': 'EventBridge sync completed',
            'results': sync_results
        })
    
    except Exception as e:
        logger.exception(f'Error syncing EventBridge: {str(e)}')
        raise


# =============================================================================
# Module Registry Handlers
# =============================================================================

def _transform_module(data: Dict[str, Any]) -> Dict[str, Any]:
    """Transform database module record to API response format."""
    return {
        'id': data.get('id'),
        'name': data.get('module_name'),
        'displayName': data.get('display_name'),
        'description': data.get('description'),
        'type': data.get('module_type'),
        'tier': data.get('tier'),
        'isEnabled': data.get('is_enabled'),
        'isInstalled': data.get('is_installed'),
        'version': data.get('version'),
        'minCompatibleVersion': data.get('min_compatible_version'),
        'config': data.get('config', {}),
        'featureFlags': data.get('feature_flags', {}),
        'dependencies': data.get('dependencies', []),
        'navConfig': data.get('nav_config', {}),
        'requiredPermissions': data.get('required_permissions', []),
        'createdAt': data.get('created_at'),
        'updatedAt': data.get('updated_at'),
    }


def handle_list_modules(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    GET /platform/modules
    
    List all registered modules with optional filtering.
    
    Query Parameters:
        - type: Filter by module type ('core' or 'functional')
        - enabled: Filter by enabled status ('true' or 'false')
    
    Returns:
        List of modules with their configuration
    """
    try:
        query_params = event.get('queryStringParameters') or {}
        module_type = query_params.get('type')
        enabled_filter = query_params.get('enabled')
        
        # Build filters
        filters = {'deleted_at': None}
        
        if module_type:
            filters['module_type'] = module_type
        
        if enabled_filter:
            filters['is_enabled'] = enabled_filter.lower() == 'true'
        
        modules = common.find_many(
            table='platform_module_registry',
            filters=filters,
            order='tier,module_name'
        )
        
        result = {
            'modules': [_transform_module(m) for m in modules],
            'totalCount': len(modules),
            'filters': {
                'type': module_type,
                'enabled': enabled_filter,
            }
        }
        
        logger.info(f"Retrieved {len(modules)} modules")
        return common.success_response(result)
    
    except Exception as e:
        logger.exception(f'Error listing modules: {str(e)}')
        raise


def handle_get_module(module_name: str) -> Dict[str, Any]:
    """
    GET /platform/modules/{name}
    
    Get details for a specific module.
    
    Args:
        module_name: Module name (e.g., 'module-kb')
    
    Returns:
        Module details
    """
    if not module_name:
        raise common.ValidationError('Module name is required')
    
    # Validate module name format
    if not re.match(r'^module-[a-z]+$', module_name):
        raise common.ValidationError("Invalid module name format. Must be 'module-{purpose}'")
    
    try:
        module = common.find_one(
            table='platform_module_registry',
            filters={'module_name': module_name, 'deleted_at': None}
        )
        
        if not module:
            raise common.NotFoundError(f"Module '{module_name}' not found")
        
        logger.info(f"Retrieved module: {module_name}")
        return common.success_response({'module': _transform_module(module)})
    
    except Exception as e:
        logger.exception(f'Error getting module {module_name}: {str(e)}')
        raise


def handle_update_module(
    module_name: str,
    body: Dict[str, Any],
    user_id: str
) -> Dict[str, Any]:
    """
    PUT /platform/modules/{name}
    
    Update module configuration.
    
    Args:
        module_name: Module name
        body: Request body with fields to update
        user_id: Supabase user ID for audit
    
    Returns:
        Updated module
    """
    if not module_name:
        raise common.ValidationError('Module name is required')
    
    # Allowed fields for update
    allowed_fields = [
        'display_name', 'description', 'config', 'feature_flags',
        'nav_config', 'required_permissions', 'version', 'min_compatible_version'
    ]
    
    update_data = {k: v for k, v in body.items() if k in allowed_fields and v is not None}
    
    if not update_data:
        raise common.ValidationError('No valid fields to update')
    
    update_data['updated_by'] = user_id
    
    try:
        updated_module = common.update_one(
            table='platform_module_registry',
            filters={'module_name': module_name, 'deleted_at': None},
            data=update_data
        )
        
        if not updated_module:
            raise common.NotFoundError(f"Module '{module_name}' not found")
        
        logger.info(f"Updated module: {module_name}")
        return common.success_response({'module': _transform_module(updated_module)})
    
    except Exception as e:
        logger.exception(f'Error updating module {module_name}: {str(e)}')
        raise


def handle_enable_module(module_name: str, user_id: str) -> Dict[str, Any]:
    """
    POST /platform/modules/{name}/enable
    
    Enable a module. Checks that all dependencies are enabled first.
    
    Args:
        module_name: Module name
        user_id: Supabase user ID for audit
    
    Returns:
        Enabled module
    """
    if not module_name:
        raise common.ValidationError('Module name is required')
    
    try:
        # Get the module to check dependencies
        module = common.find_one(
            table='platform_module_registry',
            filters={'module_name': module_name, 'deleted_at': None}
        )
        
        if not module:
            raise common.NotFoundError(f"Module '{module_name}' not found")
        
        dependencies = module.get('dependencies', [])
        
        # Check if all dependencies are enabled
        if dependencies:
            deps = common.find_many(
                table='platform_module_registry',
                filters={'deleted_at': None}
            )
            
            # Filter to just the dependencies
            dep_modules = [d for d in deps if d.get('module_name') in dependencies]
            disabled_deps = [d['module_name'] for d in dep_modules if not d.get('is_enabled')]
            
            if disabled_deps:
                raise common.ValidationError(
                    f"Cannot enable module. Required dependencies are disabled: {', '.join(disabled_deps)}"
                )
        
        # Enable the module
        updated_module = common.update_one(
            table='platform_module_registry',
            filters={'module_name': module_name},
            data={'is_enabled': True, 'updated_by': user_id}
        )
        
        logger.info(f"Enabled module: {module_name}")
        return common.success_response({
            'module': _transform_module(updated_module),
            'message': f"Module '{module_name}' enabled successfully"
        })
    
    except Exception as e:
        logger.exception(f'Error enabling module {module_name}: {str(e)}')
        raise


def handle_disable_module(
    module_name: str,
    user_id: str,
    force: bool = False
) -> Dict[str, Any]:
    """
    POST /platform/modules/{name}/disable
    
    Disable a module. Checks for dependent modules unless force=true.
    
    Args:
        module_name: Module name
        user_id: Supabase user ID for audit
        force: Force disable even if other modules depend on it
    
    Returns:
        Disabled module
    """
    if not module_name:
        raise common.ValidationError('Module name is required')
    
    try:
        # Get the module
        module = common.find_one(
            table='platform_module_registry',
            filters={'module_name': module_name, 'deleted_at': None}
        )
        
        if not module:
            raise common.NotFoundError(f"Module '{module_name}' not found")
        
        # Prevent disabling core modules unless forced
        if module.get('module_type') == 'core' and not force:
            raise common.ValidationError(
                f"Cannot disable core module '{module_name}'. Use force=true to override."
            )
        
        # Check if other enabled modules depend on this one
        if not force:
            all_modules = common.find_many(
                table='platform_module_registry',
                filters={'deleted_at': None, 'is_enabled': True}
            )
            
            dependent_modules = [
                m['module_name'] for m in all_modules
                if module_name in (m.get('dependencies') or [])
            ]
            
            if dependent_modules:
                raise common.ValidationError(
                    f"Cannot disable module. Other modules depend on it: {', '.join(dependent_modules)}"
                )
        
        # Disable the module
        updated_module = common.update_one(
            table='platform_module_registry',
            filters={'module_name': module_name},
            data={'is_enabled': False, 'updated_by': user_id}
        )
        
        logger.info(f"Disabled module: {module_name}")
        return common.success_response({
            'module': _transform_module(updated_module),
            'message': f"Module '{module_name}' disabled successfully"
        })
    
    except Exception as e:
        logger.exception(f'Error disabling module {module_name}: {str(e)}')
        raise


def handle_register_module(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    POST /platform/modules
    
    Register a new module in the registry.
    
    Args:
        body: Request body with module details
        user_id: Supabase user ID for audit
    
    Returns:
        Registered module
    """
    # Validate required fields
    module_name = body.get('module_name')
    display_name = body.get('display_name')
    
    if not module_name:
        raise common.ValidationError('module_name is required')
    
    if not display_name:
        raise common.ValidationError('display_name is required')
    
    # Validate module name format
    if not re.match(r'^module-[a-z]+$', module_name):
        raise common.ValidationError(
            "Invalid module_name format. Must be 'module-{purpose}' where purpose is lowercase letters only."
        )
    
    try:
        # Check if module already exists
        existing = common.find_one(
            table='platform_module_registry',
            filters={'module_name': module_name, 'deleted_at': None}
        )
        
        if existing:
            raise common.ValidationError(f"Module '{module_name}' already exists")
        
        # Prepare module data
        module_type = body.get('module_type', 'functional')
        if module_type not in ['core', 'functional']:
            module_type = 'functional'
        
        tier = body.get('tier', 1)
        if not isinstance(tier, int) or tier not in [1, 2, 3]:
            tier = 1
        
        insert_data = {
            'module_name': module_name,
            'display_name': display_name,
            'description': body.get('description'),
            'module_type': module_type,
            'tier': tier,
            'is_enabled': body.get('is_enabled', True),
            'is_installed': True,
            'version': body.get('version'),
            'config': body.get('config', {}),
            'feature_flags': body.get('feature_flags', {}),
            'dependencies': body.get('dependencies', []),
            'nav_config': body.get('nav_config', {}),
            'required_permissions': body.get('required_permissions', []),
            'created_by': user_id,
        }
        
        # Insert module
        new_module = common.insert_one(
            table='platform_module_registry',
            data=insert_data
        )
        
        logger.info(f"Registered new module: {module_name}")
        return common.success_response(
            {'module': _transform_module(new_module), 'message': f"Module '{module_name}' registered successfully"},
            status_code=201
        )
    
    except Exception as e:
        logger.exception(f'Error registering module: {str(e)}')
        raise
