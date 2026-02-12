"""
Lambda Management Module - Main Handler

This Lambda function provides API endpoints for managing Lambda warming
configurations, EventBridge rules, and the module registry. It follows 
CORA patterns with standard auth and super admin authorization.

Routes - Lambda Warming Schedule:
- GET /admin/sys/mgmt/schedule - List all schedule configurations
- GET /admin/sys/mgmt/schedule/{configKey} - Get specific configuration
- PUT /admin/sys/mgmt/schedule/{configKey} - Update configuration
- POST /admin/sys/mgmt/schedule/sync - Manual EventBridge sync

Routes - Lambda Functions:
- GET /admin/sys/mgmt/functions - List Lambda functions

Routes - Module Registry (System Admin):
- GET /admin/sys/mgmt/modules - List all registered modules
- GET /admin/sys/mgmt/modules/{name} - Get specific module
- PUT /admin/sys/mgmt/modules/{name} - Update module configuration
- POST /admin/sys/mgmt/modules/{name}/enable - Enable a module
- POST /admin/sys/mgmt/modules/{name}/disable - Disable a module
- POST /admin/sys/mgmt/modules - Register a new module

Routes - Module Registry (Organization Admin):
- GET /admin/org/mgmt/modules - List modules with org-level config resolution
- GET /admin/org/mgmt/modules/{name} - Get module with org-level config resolution
- PUT /admin/org/mgmt/modules/{name} - Update org-level module config override
- GET /admin/org/mgmt/usage - View organization's module usage stats

Routes - Module Registry (Workspace Admin):
- GET /admin/ws/{wsId}/mgmt/modules - List modules with workspace-level config resolution
- GET /admin/ws/{wsId}/mgmt/modules/{name} - Get module with workspace-level config resolution
- PUT /admin/ws/{wsId}/mgmt/modules/{name} - Update workspace-level module config override
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


def _transform_lambda_config(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform database Lambda config record to camelCase API response.
    
    Transforms both the outer record fields AND nested config_value fields.
    """
    config_value = data.get('config_value', {})
    
    # Transform nested config_value for lambda_warming
    if isinstance(config_value, dict):
        transformed_value = {
            'enabled': config_value.get('enabled', False),
            'timezone': config_value.get('timezone', 'America/New_York'),
            'intervalMinutes': config_value.get('interval_minutes', config_value.get('intervalMinutes', 5)),
            'weeklySchedule': config_value.get('weekly_schedule', config_value.get('weeklySchedule', {})),
            'lambdaFunctions': config_value.get('lambda_functions', config_value.get('lambdaFunctions', [])),
            'preset': config_value.get('preset'),
        }
    else:
        transformed_value = config_value
    
    return {
        'id': data.get('id'),
        'configKey': data.get('config_key'),
        'configValue': transformed_value,
        'description': data.get('description'),
        'isActive': data.get('is_active'),
        'createdAt': data.get('created_at'),
        'updatedAt': data.get('updated_at'),
        'createdBy': data.get('created_by'),
        'updatedBy': data.get('updated_by'),
    }


def lambda_handler(event: Dict[str, Any], context: object) -> Dict[str, Any]:
    """
    Main Lambda handler with route dispatcher.
    
    All routes require platform admin role. Uses standard CORA auth patterns.
    
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
        
        # Standard CORA auth extraction (ADR-019)
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # Initialize org_id (will be extracted for org admin routes)
        org_id = None
        
        # System admin routes require sys_admin role (ADR-019)
        if path.startswith('/admin/sys/'):
            if not common.check_sys_admin(supabase_user_id):
                logger.warning(f"Access denied for user {supabase_user_id} - sys admin required")
                return common.forbidden_response('System admin role required')
            logger.info(f"System admin access granted for user {supabase_user_id}")
        
        # Organization admin routes require org_admin role + org verification (ADR-019)
        elif path.startswith('/admin/org/'):
            # Extract org context from request (ADR-019 standard)
            # Try authorizer context first, then fall back to X-Org-Id header
            org_id = common.get_org_context_from_event(event)
            if not org_id:
                # Fallback: Check X-Org-Id header (sent by frontend hooks)
                headers = event.get('headers', {})
                org_id = headers.get('X-Org-Id') or headers.get('x-org-id')
            
            if not org_id:
                logger.warning(f"Org admin missing org_id for {supabase_user_id}")
                return common.bad_request_response('Organization ID (orgId) is required')
            
            # Verify user is org admin for this organization
            if not common.check_org_admin(supabase_user_id, org_id):
                logger.warning(f"Access denied for user {supabase_user_id} - org admin required for org {org_id}")
                return common.forbidden_response('Organization admin role required')
            logger.info(f"Organization admin access granted for user {supabase_user_id}, org: {org_id}")
        
        # Workspace admin routes require ws_admin role + workspace verification (ADR-019)
        elif path.startswith('/admin/ws/'):
            # Extract workspace ID from path parameter
            ws_id = path_parameters.get('wsId')
            if not ws_id:
                logger.warning(f"Workspace admin missing wsId for {supabase_user_id}")
                return common.bad_request_response('Workspace ID (wsId) is required')
            
            # Verify user is workspace admin for this workspace
            if not common.check_ws_admin(supabase_user_id, ws_id):
                logger.warning(f"Access denied for user {supabase_user_id} - ws admin required for workspace {ws_id}")
                return common.forbidden_response('Workspace admin role required')
            logger.info(f"Workspace admin access granted for user {supabase_user_id}, workspace: {ws_id}")
        
        # Route dispatcher
        if path.endswith('/admin/sys/mgmt/schedule') and http_method == 'GET':
            return handle_list_configs()
        
        elif path.endswith('/admin/sys/mgmt/schedule/sync') and http_method == 'POST':
            return handle_sync_eventbridge(supabase_user_id)
        
        elif '/admin/sys/mgmt/schedule/' in path and http_method == 'GET':
            config_key = path_parameters.get('configKey')
            return handle_get_config(config_key)
        
        elif '/admin/sys/mgmt/schedule/' in path and http_method == 'PUT':
            config_key = path_parameters.get('configKey')
            body = json.loads(event.get('body', '{}'))
            return handle_update_config(config_key, body, supabase_user_id)
        
        elif path.endswith('/admin/sys/mgmt/functions') and http_method == 'GET':
            return handle_list_functions()
        
        # Module Registry Routes
        elif path.endswith('/admin/sys/mgmt/modules') and http_method == 'GET':
            return handle_list_modules(event)
        
        elif path.endswith('/admin/sys/mgmt/modules') and http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_register_module(body, supabase_user_id)
        
        elif '/admin/sys/mgmt/modules/' in path and path.endswith('/enable') and http_method == 'POST':
            module_name = path_parameters.get('name')
            return handle_enable_module(module_name, supabase_user_id)
        
        elif '/admin/sys/mgmt/modules/' in path and path.endswith('/disable') and http_method == 'POST':
            module_name = path_parameters.get('name')
            force = event.get('queryStringParameters', {}).get('force', 'false').lower() == 'true'
            return handle_disable_module(module_name, supabase_user_id, force)
        
        elif '/admin/sys/mgmt/modules/' in path and http_method == 'GET':
            module_name = path_parameters.get('name')
            return handle_get_module(module_name)
        
        elif '/admin/sys/mgmt/modules/' in path and http_method == 'PUT':
            module_name = path_parameters.get('name')
            body = json.loads(event.get('body', '{}'))
            return handle_update_module(module_name, body, supabase_user_id)
        
        # Organization Admin Routes - Module Config
        elif path.endswith('/admin/org/mgmt/modules') and http_method == 'GET':
            return handle_list_org_modules(org_id, supabase_user_id)
        
        elif '/admin/org/mgmt/modules/' in path and http_method == 'GET':
            module_name = path_parameters.get('name')
            return handle_get_org_module(org_id, module_name, supabase_user_id)
        
        elif '/admin/org/mgmt/modules/' in path and http_method == 'PUT':
            module_name = path_parameters.get('name')
            body = json.loads(event.get('body', '{}'))
            return handle_update_org_module(org_id, module_name, body, supabase_user_id)
        
        elif path.endswith('/admin/org/mgmt/usage') and http_method == 'GET':
            return handle_org_module_usage(org_id)
        
        # Workspace Admin Routes - Module Config
        elif path.endswith('/mgmt/modules') and '/admin/ws/' in path and http_method == 'GET':
            ws_id = path_parameters.get('wsId')
            return handle_list_ws_modules(ws_id, supabase_user_id)
        
        elif re.match(r'.*/admin/ws/.+/mgmt/modules/.+', path) and http_method == 'GET':
            ws_id = path_parameters.get('wsId')
            module_name = path_parameters.get('name')
            return handle_get_ws_module(ws_id, module_name, supabase_user_id)
        
        elif re.match(r'.*/admin/ws/.+/mgmt/modules/.+', path) and http_method == 'PUT':
            ws_id = path_parameters.get('wsId')
            module_name = path_parameters.get('name')
            body = json.loads(event.get('body', '{}'))
            return handle_update_ws_module(ws_id, module_name, body, supabase_user_id)
        
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
    GET /admin/sys/mgmt/schedule
    
    List all Lambda warming schedule configurations.
    
    Returns:
        List of configuration objects (camelCase)
    """
    try:
        configs = common.find_many(
            table='mgmt_cfg_sys_lambda',
            filters={'is_active': True}
        )
        
        transformed = [_transform_lambda_config(c) for c in configs]
        
        logger.info(f"Retrieved {len(configs)} system configurations")
        return common.success_response(transformed)
    
    except Exception as e:
        logger.exception(f'Error listing configs: {str(e)}')
        raise


def handle_get_config(config_key: str) -> Dict[str, Any]:
    """
    GET /admin/sys/mgmt/schedule/{configKey}
    
    Get a specific schedule configuration by key.
    
    Args:
        config_key: Configuration key (e.g., "lambda_warming")
    
    Returns:
        Configuration object (camelCase)
    """
    if not config_key:
        raise common.ValidationError('Configuration key is required')
    
    try:
        config = common.find_one(
            table='mgmt_cfg_sys_lambda',
            filters={'config_key': config_key}
        )
        
        if not config:
            raise common.NotFoundError(f'Configuration not found: {config_key}')
        
        logger.info(f"Retrieved configuration: {config_key}")
        return common.success_response(_transform_lambda_config(config))
    
    except Exception as e:
        logger.exception(f'Error getting config {config_key}: {str(e)}')
        raise


def handle_update_config(
    config_key: str, 
    body: Dict[str, Any], 
    user_id: str
) -> Dict[str, Any]:
    """
    PUT /admin/sys/mgmt/schedule/{configKey}
    
    Update a schedule configuration. If lambda_warming, also syncs EventBridge rules.
    
    Args:
        config_key: Configuration key
        body: Request body with config_value
        user_id: Supabase user ID for audit
    
    Returns:
        Updated configuration with sync results
    """
    if not config_key:
        raise common.ValidationError('Configuration key is required')
    
    # Map camelCase to snake_case (API-PATTERNS standard)
    if 'configValue' in body:
        body['config_value'] = body.pop('configValue')
    
    if 'config_value' not in body:
        raise common.ValidationError('config_value is required in request body')
    
    config_value = body['config_value']
    
    try:
        # Update configuration in database
        updated_config = common.update_one(
            table='mgmt_cfg_sys_lambda',
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
        
        return common.success_response(_transform_lambda_config(updated_config))
    
    except Exception as e:
        logger.exception(f'Error updating config {config_key}: {str(e)}')
        raise


def handle_list_functions() -> Dict[str, Any]:
    """
    GET /admin/sys/mgmt/functions
    
    List all Lambda functions in the environment.
    
    Returns:
        List of Lambda function configurations (camelCase per CORA standard)
    """
    try:
        environment = os.environ.get('ENVIRONMENT', 'dev')
        manager = EventBridgeManager(environment=environment)
        
        functions = manager.list_lambda_functions()
        
        # Use shared org_common utility for snake_case → camelCase transformation
        # This ensures consistency across all CORA modules (DRY principle)
        transformed = common.format_records(functions)
        
        logger.info(f"Retrieved {len(functions)} Lambda functions")
        return common.success_response(transformed)
    
    except Exception as e:
        logger.exception(f'Error listing Lambda functions: {str(e)}')
        raise


def handle_sync_eventbridge(user_id: str) -> Dict[str, Any]:
    """
    POST /admin/sys/mgmt/schedule/sync
    
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
            table='mgmt_cfg_sys_lambda',
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

def _transform_sys_module(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform database module record to API response format (System Admin scope).
    
    Transforms routes to system admin context (/admin/access → /admin/sys/access).
    
    Args:
        data: Raw database record
    
    Returns:
        Transformed module with sys admin routes
    """
    admin_scope = 'sys'  # System admin scope
    nav_config = data.get('nav_config', {})
    
    # Transform route to include admin scope (/admin/access → /admin/sys/access)
    if 'route' in nav_config and nav_config['route']:
        base_route = nav_config['route']
        # Replace /admin/ prefix with /admin/{scope}/
        if base_route.startswith('/admin/'):
            module_path = base_route.replace('/admin/', '')
            nav_config = {**nav_config, 'route': f'/admin/{admin_scope}/{module_path}'}
    
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
        'navConfig': nav_config,
        'requiredPermissions': data.get('required_permissions', []),
        'createdAt': data.get('created_at'),
        'updatedAt': data.get('updated_at'),
    }


def handle_list_modules(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    GET /admin/sys/mgmt/modules
    
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
            table='mgmt_cfg_sys_modules',
            filters=filters,
            order='tier,module_name'
        )
        
        result = {
            'modules': [_transform_sys_module(m) for m in modules],
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
    GET /admin/sys/mgmt/modules/{name}
    
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
            table='mgmt_cfg_sys_modules',
            filters={'module_name': module_name, 'deleted_at': None}
        )
        
        if not module:
            raise common.NotFoundError(f"Module '{module_name}' not found")
        
        logger.info(f"Retrieved module: {module_name}")
        return common.success_response({'module': _transform_sys_module(module)})
    
    except Exception as e:
        logger.exception(f'Error getting module {module_name}: {str(e)}')
        raise


def handle_update_module(
    module_name: str,
    body: Dict[str, Any],
    user_id: str
) -> Dict[str, Any]:
    """
    PUT /admin/sys/mgmt/modules/{name}
    
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
            table='mgmt_cfg_sys_modules',
            filters={'module_name': module_name, 'deleted_at': None},
            data=update_data
        )
        
        if not updated_module:
            raise common.NotFoundError(f"Module '{module_name}' not found")
        
        logger.info(f"Updated module: {module_name}")
        return common.success_response({'module': _transform_sys_module(updated_module)})
    
    except Exception as e:
        logger.exception(f'Error updating module {module_name}: {str(e)}')
        raise


def handle_enable_module(module_name: str, user_id: str) -> Dict[str, Any]:
    """
    POST /admin/sys/mgmt/modules/{name}/enable
    
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
            table='mgmt_cfg_sys_modules',
            filters={'module_name': module_name, 'deleted_at': None}
        )
        
        if not module:
            raise common.NotFoundError(f"Module '{module_name}' not found")
        
        dependencies = module.get('dependencies', [])
        
        # Check if all dependencies are enabled
        if dependencies:
            deps = common.find_many(
                table='mgmt_cfg_sys_modules',
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
            table='mgmt_cfg_sys_modules',
            filters={'module_name': module_name},
            data={'is_enabled': True, 'updated_by': user_id}
        )
        
        logger.info(f"Enabled module: {module_name}")
        return common.success_response({
            'module': _transform_sys_module(updated_module),
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
    POST /admin/sys/mgmt/modules/{name}/disable
    
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
            table='mgmt_cfg_sys_modules',
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
                table='mgmt_cfg_sys_modules',
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
            table='mgmt_cfg_sys_modules',
            filters={'module_name': module_name},
            data={'is_enabled': False, 'updated_by': user_id}
        )
        
        logger.info(f"Disabled module: {module_name}")
        return common.success_response({
            'module': _transform_sys_module(updated_module),
            'message': f"Module '{module_name}' disabled successfully"
        })
    
    except Exception as e:
        logger.exception(f'Error disabling module {module_name}: {str(e)}')
        raise


def handle_org_module_usage(org_id: str) -> Dict[str, Any]:
    """
    GET /admin/org/mgmt/usage
    
    View module usage statistics for an organization.
    
    Args:
        org_id: Organization ID
    
    Returns:
        Module usage statistics for the organization
    """
    if not org_id:
        raise common.ValidationError('Organization ID is required')
    
    try:
        # Query usage stats for this organization
        # Note: This table may not exist yet - handle gracefully
        usage_stats = common.find_many(
            table='mgmt_usage_modules',
            filters={'org_id': org_id}
        )
        
        # Transform to API format
        result = {
            'orgId': org_id,
            'usage': [
                {
                    'moduleName': stat.get('module_name'),
                    'usageCount': stat.get('usage_count', 0),
                    'lastUsedAt': stat.get('last_used_at'),
                }
                for stat in usage_stats
            ],
            'totalModules': len(usage_stats),
        }
        
        logger.info(f"Retrieved module usage stats for org {org_id}: {len(usage_stats)} modules")
        return common.success_response(result)
    
    except Exception as e:
        # If table doesn't exist yet, return empty result gracefully
        logger.warning(f"Error retrieving usage stats for org {org_id}: {str(e)}")
        return common.success_response({
            'orgId': org_id,
            'usage': [],
            'totalModules': 0,
            'message': 'Usage tracking not yet available'
        })


def handle_register_module(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    POST /admin/sys/mgmt/modules
    
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
            table='mgmt_cfg_sys_modules',
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
            table='mgmt_cfg_sys_modules',
            data=insert_data
        )
        
        logger.info(f"Registered new module: {module_name}")
        return common.success_response(
            {'module': _transform_sys_module(new_module), 'message': f"Module '{module_name}' registered successfully"},
            status_code=201
        )
    
    except Exception as e:
        logger.exception(f'Error registering module: {str(e)}')
        raise


# =============================================================================
# Org Admin Module Configuration Handlers (Sprint 3)
# =============================================================================

def handle_list_org_modules(org_id: str, user_id: str) -> Dict[str, Any]:
    """
    GET /admin/org/mgmt/modules
    
    List all modules with org-level configuration resolution.
    Uses resolve_all_modules_for_org() SQL function.
    
    Auth: Verified at router level (ADR-019)
    
    Args:
        org_id: Organization ID (from session)
        user_id: Supabase user ID
    
    Returns:
        List of modules with org-level config resolution
    """
    if not org_id:
        raise common.ValidationError('Organization ID is required')
    
    try:
        # Call SQL function to get all modules with org-level resolution
        result = common.rpc('resolve_all_modules_for_org', {'p_org_id': org_id})
        
        modules = result if isinstance(result, list) else []
        
        # Transform to camelCase
        transformed_modules = [_transform_org_module(m) for m in modules]
        
        logger.info(f"Retrieved {len(modules)} modules for org {org_id}")
        return common.success_response({'modules': transformed_modules, 'totalCount': len(modules)})
    
    except Exception as e:
        logger.exception(f'Error listing org modules: {str(e)}')
        raise


def handle_get_org_module(org_id: str, module_name: str, user_id: str) -> Dict[str, Any]:
    """
    GET /admin/org/mgmt/modules/{name}
    
    Get a specific module with org-level configuration resolution.
    Uses resolve_org_module_config() SQL function.
    
    Auth: Verified at router level (ADR-019)
    
    Args:
        org_id: Organization ID (from session)
        module_name: Module name
        user_id: Supabase user ID
    
    Returns:
        Module with org-level config resolution
    """
    if not org_id:
        raise common.ValidationError('Organization ID is required')
    
    if not module_name:
        raise common.ValidationError('Module name is required')
    
    # Validate module name format
    if not re.match(r'^module-[a-z]+$', module_name):
        raise common.ValidationError("Invalid module name format. Must be 'module-{purpose}'")
    
    try:
        # Call SQL function to get module with org-level resolution
        module = common.rpc('resolve_org_module_config', {
            'p_org_id': org_id,
            'p_module_name': module_name
        })
        
        if not module:
            raise common.NotFoundError(f"Module '{module_name}' not found")
        
        # Transform to camelCase
        transformed_module = _transform_org_module(module)
        
        logger.info(f"Retrieved module {module_name} for org {org_id}")
        return common.success_response({'module': transformed_module})
    
    except Exception as e:
        logger.exception(f'Error getting org module {module_name}: {str(e)}')
        raise


def handle_update_org_module(
    org_id: str,
    module_name: str,
    body: Dict[str, Any],
    user_id: str
) -> Dict[str, Any]:
    """
    PUT /admin/org/mgmt/modules/{name}
    
    Update org-level module configuration override.
    Creates or updates record in mgmt_cfg_org_modules table.
    
    Auth: Verified at router level (ADR-019)
    
    Args:
        org_id: Organization ID (from session)
        module_name: Module name
        body: Request body with config overrides
        user_id: Supabase user ID
    
    Returns:
        Updated module with org-level config resolution
    """
    if not org_id:
        raise common.ValidationError('Organization ID is required')
    
    if not module_name:
        raise common.ValidationError('Module name is required')
    
    # Validate module name format
    if not re.match(r'^module-[a-z]+$', module_name):
        raise common.ValidationError("Invalid module name format. Must be 'module-{purpose}'")
    
    # Validate that module exists in system registry
    sys_module = common.find_one(
        table='mgmt_cfg_sys_modules',
        filters={'module_name': module_name, 'deleted_at': None}
    )
    
    if not sys_module:
        raise common.NotFoundError(f"Module '{module_name}' not found in system registry")
    
    try:
        # Check if org override already exists
        existing_override = common.find_one(
            table='mgmt_cfg_org_modules',
            filters={'org_id': org_id, 'module_name': module_name}
        )
        
        # Prepare update data
        update_data = {
            'updated_by': user_id
        }
        
        # Handle is_enabled (nullable - NULL means inherit from system)
        if 'isEnabled' in body:
            update_data['is_enabled'] = body['isEnabled']
        elif 'is_enabled' in body:
            update_data['is_enabled'] = body['is_enabled']
        
        # Handle config_overrides
        if 'configOverrides' in body:
            update_data['config_overrides'] = body['configOverrides']
        elif 'config_overrides' in body:
            update_data['config_overrides'] = body['config_overrides']
        
        # Handle feature_flag_overrides
        if 'featureFlagOverrides' in body:
            update_data['feature_flag_overrides'] = body['featureFlagOverrides']
        elif 'feature_flag_overrides' in body:
            update_data['feature_flag_overrides'] = body['feature_flag_overrides']
        
        if existing_override:
            # Update existing override
            updated_override = common.update_one(
                table='mgmt_cfg_org_modules',
                filters={'org_id': org_id, 'module_name': module_name},
                data=update_data
            )
        else:
            # Create new override
            insert_data = {
                'org_id': org_id,
                'module_name': module_name,
                'created_by': user_id,
                **update_data
            }
            updated_override = common.insert_one(
                table='mgmt_cfg_org_modules',
                data=insert_data
            )
        
        # Return resolved module config
        module = common.rpc('resolve_org_module_config', {
            'p_org_id': org_id,
            'p_module_name': module_name
        })
        
        # Transform to camelCase
        transformed_module = _transform_org_module(module)
        
        logger.info(f"Updated org module config: org={org_id}, module={module_name}")
        return common.success_response({
            'module': transformed_module,
            'message': f"Org-level config for '{module_name}' updated successfully"
        })
    
    except Exception as e:
        logger.exception(f'Error updating org module {module_name}: {str(e)}')
        raise


# =============================================================================
# Workspace Admin Module Configuration Handlers (Sprint 3)
# =============================================================================

def _transform_ws_module(data: Dict[str, Any]) -> Dict[str, Any]:
    """Transform workspace module config from SQL function to API response format."""
    return {
        'id': data.get('id'),
        'name': data.get('module_name'),
        'displayName': data.get('display_name'),
        'description': data.get('description'),
        'type': data.get('module_type'),
        'tier': data.get('tier'),
        'isEnabled': data.get('is_enabled'),
        'isInstalled': data.get('is_installed'),
        'systemEnabled': data.get('system_enabled'),
        'orgEnabled': data.get('org_enabled'),
        'wsEnabled': data.get('ws_enabled'),
        'version': data.get('version'),
        'minCompatibleVersion': data.get('min_compatible_version'),
        'config': data.get('config', {}),
        'featureFlags': data.get('feature_flags', {}),
        'dependencies': data.get('dependencies', []),
        'navConfig': data.get('nav_config', {}),
        'requiredPermissions': data.get('required_permissions', []),
        'resolutionMetadata': data.get('resolution_metadata', {}),
    }


def _transform_org_module(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform org module config from SQL function to API response format.
    Transforms routes to org admin context (/admin/access → /admin/org/access).
    """
    admin_scope = 'org'  # Organization admin scope
    nav_config = data.get('nav_config', {})
    
    # Transform route to include admin scope (/admin/access → /admin/org/access)
    if 'route' in nav_config and nav_config['route']:
        base_route = nav_config['route']
        # Replace /admin/ prefix with /admin/{scope}/
        if base_route.startswith('/admin/'):
            module_path = base_route.replace('/admin/', '')
            nav_config = {**nav_config, 'route': f'/admin/{admin_scope}/{module_path}'}
    
    return {
        'id': data.get('id'),
        'name': data.get('module_name'),
        'displayName': data.get('display_name'),
        'description': data.get('description'),
        'type': data.get('module_type'),
        'tier': data.get('tier'),
        'isEnabled': data.get('is_enabled'),
        'isInstalled': data.get('is_installed'),
        'systemEnabled': data.get('system_enabled'),
        'orgEnabled': data.get('org_enabled'),
        'version': data.get('version'),
        'minCompatibleVersion': data.get('min_compatible_version'),
        'config': data.get('config', {}),
        'featureFlags': data.get('feature_flags', {}),
        'dependencies': data.get('dependencies', []),
        'navConfig': nav_config,
        'requiredPermissions': data.get('required_permissions', []),
        'resolutionMetadata': data.get('resolution_metadata', {}),
    }


def handle_list_ws_modules(ws_id: str, user_id: str) -> Dict[str, Any]:
    """
    GET /admin/ws/{wsId}/mgmt/modules
    
    List all modules with workspace-level configuration resolution.
    Uses resolve_all_modules_for_workspace() SQL function.
    
    Auth: Verified at router level (ADR-019)
    
    Args:
        ws_id: Workspace ID (from path parameter)
        user_id: Supabase user ID
    
    Returns:
        List of modules with workspace-level config resolution
    """
    if not ws_id:
        raise common.ValidationError('Workspace ID is required')
    
    try:
        # Call SQL function to get all modules with workspace-level resolution
        result = common.rpc('resolve_all_modules_for_workspace', {'p_ws_id': ws_id})
        
        modules = result if isinstance(result, list) else []
        
        # Transform to camelCase
        transformed_modules = [_transform_ws_module(m) for m in modules]
        
        logger.info(f"Retrieved {len(modules)} modules for workspace {ws_id}")
        return common.success_response({'modules': transformed_modules, 'totalCount': len(modules)})
    
    except Exception as e:
        logger.exception(f'Error listing workspace modules: {str(e)}')
        raise


def handle_get_ws_module(ws_id: str, module_name: str, user_id: str) -> Dict[str, Any]:
    """
    GET /admin/ws/{wsId}/mgmt/modules/{name}
    
    Get a specific module with workspace-level configuration resolution.
    Uses resolve_module_config() SQL function.
    
    Auth: Verified at router level (ADR-019)
    
    Args:
        ws_id: Workspace ID (from path parameter)
        module_name: Module name
        user_id: Supabase user ID
    
    Returns:
        Module with workspace-level config resolution
    """
    if not ws_id:
        raise common.ValidationError('Workspace ID is required')
    
    if not module_name:
        raise common.ValidationError('Module name is required')
    
    # Validate module name format
    if not re.match(r'^module-[a-z]+$', module_name):
        raise common.ValidationError("Invalid module name format. Must be 'module-{purpose}'")
    
    try:
        # Call SQL function to get module with workspace-level resolution
        module = common.rpc('resolve_module_config', {
            'p_ws_id': ws_id,
            'p_module_name': module_name
        })
        
        if not module:
            raise common.NotFoundError(f"Module '{module_name}' not found")
        
        # Transform to camelCase
        transformed_module = _transform_ws_module(module)
        
        logger.info(f"Retrieved module {module_name} for workspace {ws_id}")
        return common.success_response({'module': transformed_module})
    
    except Exception as e:
        logger.exception(f'Error getting workspace module {module_name}: {str(e)}')
        raise


def handle_update_ws_module(
    ws_id: str,
    module_name: str,
    body: Dict[str, Any],
    user_id: str
) -> Dict[str, Any]:
    """
    PUT /admin/ws/{wsId}/mgmt/modules/{name}
    
    Update workspace-level module configuration override.
    Creates or updates record in mgmt_cfg_ws_modules table.
    
    Auth: Verified at router level (ADR-019)
    
    Args:
        ws_id: Workspace ID (from path parameter)
        module_name: Module name
        body: Request body with config overrides
        user_id: Supabase user ID
    
    Returns:
        Updated module with workspace-level config resolution
    """
    if not ws_id:
        raise common.ValidationError('Workspace ID is required')
    
    if not module_name:
        raise common.ValidationError('Module name is required')
    
    # Validate module name format
    if not re.match(r'^module-[a-z]+$', module_name):
        raise common.ValidationError("Invalid module name format. Must be 'module-{purpose}'")
    
    # Validate that module exists in system registry
    sys_module = common.find_one(
        table='mgmt_cfg_sys_modules',
        filters={'module_name': module_name, 'deleted_at': None}
    )
    
    if not sys_module:
        raise common.NotFoundError(f"Module '{module_name}' not found in system registry")
    
    try:
        # Check if workspace override already exists
        existing_override = common.find_one(
            table='mgmt_cfg_ws_modules',
            filters={'ws_id': ws_id, 'module_name': module_name}
        )
        
        # Prepare update data
        update_data = {
            'updated_by': user_id
        }
        
        # Handle is_enabled (nullable - NULL means inherit from org/system)
        if 'isEnabled' in body:
            update_data['is_enabled'] = body['isEnabled']
        elif 'is_enabled' in body:
            update_data['is_enabled'] = body['is_enabled']
        
        # Handle config_overrides
        if 'configOverrides' in body:
            update_data['config_overrides'] = body['configOverrides']
        elif 'config_overrides' in body:
            update_data['config_overrides'] = body['config_overrides']
        
        # Handle feature_flag_overrides
        if 'featureFlagOverrides' in body:
            update_data['feature_flag_overrides'] = body['featureFlagOverrides']
        elif 'feature_flag_overrides' in body:
            update_data['feature_flag_overrides'] = body['feature_flag_overrides']
        
        if existing_override:
            # Update existing override
            updated_override = common.update_one(
                table='mgmt_cfg_ws_modules',
                filters={'ws_id': ws_id, 'module_name': module_name},
                data=update_data
            )
        else:
            # Create new override
            insert_data = {
                'ws_id': ws_id,
                'module_name': module_name,
                'created_by': user_id,
                **update_data
            }
            updated_override = common.insert_one(
                table='mgmt_cfg_ws_modules',
                data=insert_data
            )
        
        # Return resolved module config
        module = common.rpc('resolve_module_config', {
            'p_ws_id': ws_id,
            'p_module_name': module_name
        })
        
        # Transform to camelCase
        transformed_module = _transform_ws_module(module)
        
        logger.info(f"Updated workspace module config: ws={ws_id}, module={module_name}")
        return common.success_response({
            'module': transformed_module,
            'message': f"Workspace-level config for '{module_name}' updated successfully"
        })
    
    except Exception as e:
        logger.exception(f'Error updating workspace module {module_name}: {str(e)}')
        raise
