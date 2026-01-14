"""
Module Registry Handlers for CORA Platform Management.

This module provides Lambda handlers for managing the module registry:
- List all registered modules
- Get module details
- Update module configuration
- Enable/disable modules
- Register new modules

All handlers follow the CORA API response standard.
"""

import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


# =============================================================================
# Response Helpers
# =============================================================================

def _success_response(data: Any, status_code: int = 200) -> Dict:
    """Create a standardized success response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(data),
    }


def _error_response(
    message: str,
    status_code: int = 500,
    error_code: str = "INTERNAL_ERROR",
    details: Optional[Dict] = None,
) -> Dict:
    """Create a standardized error response."""
    body = {
        "error": error_code,
        "message": message,
    }
    if details:
        body["details"] = details
    
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(body),
    }


def _get_path_parameter(event: Dict, param_name: str) -> Optional[str]:
    """Extract a path parameter from the event."""
    path_params = event.get("pathParameters") or {}
    return path_params.get(param_name)


def _get_query_parameter(event: Dict, param_name: str, default: Any = None) -> Any:
    """Extract a query parameter from the event."""
    query_params = event.get("queryStringParameters") or {}
    return query_params.get(param_name, default)


def _parse_body(event: Dict) -> Tuple[Optional[Dict], Optional[str]]:
    """Parse the request body from the event."""
    body = event.get("body")
    if not body:
        return None, "Request body is required"
    
    try:
        return json.loads(body), None
    except json.JSONDecodeError as e:
        return None, f"Invalid JSON in request body: {str(e)}"


def _get_user_context(event: Dict) -> Dict:
    """Extract user context from the authorizer."""
    request_context = event.get("requestContext", {})
    authorizer = request_context.get("authorizer", {})
    
    return {
        "user_id": authorizer.get("principalId"),
        "org_id": authorizer.get("org_id"),
        "is_sys_admin": authorizer.get("is_sys_admin", False),
        "is_org_admin": authorizer.get("is_org_admin", False),
    }


# =============================================================================
# Database Operations (Supabase)
# =============================================================================

def _get_supabase_client():
    """
    Get Supabase client for database operations.
    
    Note: This is a placeholder. In actual implementation, this would use
    the project's authentication and database patterns.
    """
    # Import here to avoid issues if supabase isn't installed
    try:
        from supabase import create_client, Client
        import os
        
        # Get credentials from environment/secrets
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            logger.error("Missing Supabase configuration")
            return None
            
        return create_client(supabase_url, supabase_key)
    except ImportError:
        logger.error("Supabase client not available")
        return None


# =============================================================================
# Handler: List Modules
# =============================================================================

def list_modules_handler(event: Dict, context: Any) -> Dict:
    """
    List all registered modules.
    
    GET /platform/modules
    
    Query Parameters:
        - type: Filter by module type ('core' or 'functional')
        - enabled: Filter by enabled status ('true' or 'false')
        - include_disabled: Include disabled modules (admin only)
    
    Returns:
        200: List of modules with their configuration
        401: Unauthorized
        500: Server error
    """
    try:
        logger.info("Listing modules")
        
        # Get filters from query parameters
        module_type = _get_query_parameter(event, "type")
        enabled_filter = _get_query_parameter(event, "enabled")
        include_disabled = _get_query_parameter(event, "include_disabled", "false")
        
        user_context = _get_user_context(event)
        
        # Get database client
        supabase = _get_supabase_client()
        if not supabase:
            return _error_response(
                "Database connection unavailable",
                status_code=503,
                error_code="SERVICE_UNAVAILABLE"
            )
        
        # Build query
        query = supabase.table("sys_module_registry").select("*")
        
        # Apply soft delete filter
        query = query.is_("deleted_at", "null")
        
        # Filter by module type if specified
        if module_type:
            query = query.eq("module_type", module_type)
        
        # Filter by enabled status
        # Non-admins can only see enabled modules
        if not user_context.get("is_sys_admin"):
            query = query.eq("is_enabled", True)
        elif enabled_filter:
            query = query.eq("is_enabled", enabled_filter.lower() == "true")
        elif include_disabled.lower() != "true":
            query = query.eq("is_enabled", True)
        
        # Execute query
        response = query.order("tier", desc=False).order("module_name").execute()
        
        modules = response.data or []
        
        # Transform modules for response
        result = {
            "modules": [_transform_module(m) for m in modules],
            "total_count": len(modules),
            "filters": {
                "type": module_type,
                "enabled": enabled_filter,
            }
        }
        
        logger.info(f"Successfully listed {len(modules)} modules")
        return _success_response(result)
        
    except Exception as e:
        logger.error(f"Error listing modules: {str(e)}")
        return _error_response(
            f"Failed to list modules: {str(e)}",
            error_code="LIST_MODULES_FAILED"
        )


# =============================================================================
# Handler: Get Module Details
# =============================================================================

def get_module_handler(event: Dict, context: Any) -> Dict:
    """
    Get details for a specific module.
    
    GET /platform/modules/{name}
    
    Path Parameters:
        - name: Module name (e.g., 'module-kb')
    
    Returns:
        200: Module details
        404: Module not found
        500: Server error
    """
    try:
        module_name = _get_path_parameter(event, "name")
        
        if not module_name:
            return _error_response(
                "Module name is required",
                status_code=400,
                error_code="MISSING_PARAMETER"
            )
        
        logger.info(f"Getting module details for: {module_name}")
        
        # Validate module name format
        if not module_name.startswith("module-"):
            return _error_response(
                "Invalid module name format. Must be 'module-{purpose}'",
                status_code=400,
                error_code="INVALID_MODULE_NAME"
            )
        
        # Get database client
        supabase = _get_supabase_client()
        if not supabase:
            return _error_response(
                "Database connection unavailable",
                status_code=503,
                error_code="SERVICE_UNAVAILABLE"
            )
        
        # Query module
        response = (
            supabase.table("sys_module_registry")
            .select("*")
            .eq("module_name", module_name)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
        
        if not response.data:
            return _error_response(
                f"Module '{module_name}' not found",
                status_code=404,
                error_code="MODULE_NOT_FOUND"
            )
        
        module = _transform_module(response.data)
        
        logger.info(f"Successfully retrieved module: {module_name}")
        return _success_response({"module": module})
        
    except Exception as e:
        logger.error(f"Error getting module: {str(e)}")
        return _error_response(
            f"Failed to get module: {str(e)}",
            error_code="GET_MODULE_FAILED"
        )


# =============================================================================
# Handler: Update Module Configuration
# =============================================================================

def update_module_handler(event: Dict, context: Any) -> Dict:
    """
    Update module configuration.
    
    PUT /platform/modules/{name}
    
    Path Parameters:
        - name: Module name
    
    Body:
        {
            "display_name": "string (optional)",
            "description": "string (optional)",
            "config": "object (optional)",
            "feature_flags": "object (optional)",
            "nav_config": "object (optional)",
            "required_permissions": "array (optional)"
        }
    
    Returns:
        200: Updated module
        400: Invalid request
        403: Forbidden (not admin)
        404: Module not found
        500: Server error
    """
    try:
        module_name = _get_path_parameter(event, "name")
        
        if not module_name:
            return _error_response(
                "Module name is required",
                status_code=400,
                error_code="MISSING_PARAMETER"
            )
        
        user_context = _get_user_context(event)
        
        # Only sys admins can update modules
        if not user_context.get("is_sys_admin"):
            return _error_response(
                "Only system administrators can update modules",
                status_code=403,
                error_code="FORBIDDEN"
            )
        
        # Parse request body
        body, error = _parse_body(event)
        if error:
            return _error_response(error, status_code=400, error_code="INVALID_BODY")
        
        logger.info(f"Updating module: {module_name}")
        
        # Get database client
        supabase = _get_supabase_client()
        if not supabase:
            return _error_response(
                "Database connection unavailable",
                status_code=503,
                error_code="SERVICE_UNAVAILABLE"
            )
        
        # Build update data
        allowed_fields = [
            "display_name",
            "description",
            "config",
            "feature_flags",
            "nav_config",
            "required_permissions",
            "version",
            "min_compatible_version",
        ]
        
        update_data = {
            k: v for k, v in body.items() 
            if k in allowed_fields and v is not None
        }
        
        if not update_data:
            return _error_response(
                "No valid fields to update",
                status_code=400,
                error_code="NO_UPDATE_DATA"
            )
        
        # Add metadata
        update_data["updated_by"] = user_context.get("user_id")
        
        # Execute update
        response = (
            supabase.table("sys_module_registry")
            .update(update_data)
            .eq("module_name", module_name)
            .is_("deleted_at", "null")
            .execute()
        )
        
        if not response.data:
            return _error_response(
                f"Module '{module_name}' not found",
                status_code=404,
                error_code="MODULE_NOT_FOUND"
            )
        
        module = _transform_module(response.data[0])
        
        logger.info(f"Successfully updated module: {module_name}")
        return _success_response({"module": module})
        
    except Exception as e:
        logger.error(f"Error updating module: {str(e)}")
        return _error_response(
            f"Failed to update module: {str(e)}",
            error_code="UPDATE_MODULE_FAILED"
        )


# =============================================================================
# Handler: Enable Module
# =============================================================================

def enable_module_handler(event: Dict, context: Any) -> Dict:
    """
    Enable a module.
    
    POST /platform/modules/{name}/enable
    
    Path Parameters:
        - name: Module name
    
    Returns:
        200: Module enabled successfully
        403: Forbidden (not admin)
        404: Module not found
        409: Dependency conflict (required modules not enabled)
        500: Server error
    """
    try:
        module_name = _get_path_parameter(event, "name")
        
        if not module_name:
            return _error_response(
                "Module name is required",
                status_code=400,
                error_code="MISSING_PARAMETER"
            )
        
        user_context = _get_user_context(event)
        
        # Only sys admins can enable modules
        if not user_context.get("is_sys_admin"):
            return _error_response(
                "Only system administrators can enable modules",
                status_code=403,
                error_code="FORBIDDEN"
            )
        
        logger.info(f"Enabling module: {module_name}")
        
        # Get database client
        supabase = _get_supabase_client()
        if not supabase:
            return _error_response(
                "Database connection unavailable",
                status_code=503,
                error_code="SERVICE_UNAVAILABLE"
            )
        
        # Get the module to check dependencies
        module_response = (
            supabase.table("sys_module_registry")
            .select("*")
            .eq("module_name", module_name)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
        
        if not module_response.data:
            return _error_response(
                f"Module '{module_name}' not found",
                status_code=404,
                error_code="MODULE_NOT_FOUND"
            )
        
        module_data = module_response.data
        dependencies = module_data.get("dependencies", [])
        
        # Check if all dependencies are enabled
        if dependencies:
            deps_response = (
                supabase.table("sys_module_registry")
                .select("module_name, is_enabled")
                .in_("module_name", dependencies)
                .is_("deleted_at", "null")
                .execute()
            )
            
            disabled_deps = [
                m["module_name"] for m in (deps_response.data or [])
                if not m.get("is_enabled")
            ]
            
            if disabled_deps:
                return _error_response(
                    f"Cannot enable module. Required dependencies are disabled: {', '.join(disabled_deps)}",
                    status_code=409,
                    error_code="DEPENDENCY_CONFLICT",
                    details={"disabled_dependencies": disabled_deps}
                )
        
        # Enable the module
        update_response = (
            supabase.table("sys_module_registry")
            .update({
                "is_enabled": True,
                "updated_by": user_context.get("user_id"),
            })
            .eq("module_name", module_name)
            .execute()
        )
        
        module = _transform_module(update_response.data[0])
        
        logger.info(f"Successfully enabled module: {module_name}")
        return _success_response({
            "module": module,
            "message": f"Module '{module_name}' enabled successfully"
        })
        
    except Exception as e:
        logger.error(f"Error enabling module: {str(e)}")
        return _error_response(
            f"Failed to enable module: {str(e)}",
            error_code="ENABLE_MODULE_FAILED"
        )


# =============================================================================
# Handler: Disable Module
# =============================================================================

def disable_module_handler(event: Dict, context: Any) -> Dict:
    """
    Disable a module.
    
    POST /platform/modules/{name}/disable
    
    Path Parameters:
        - name: Module name
    
    Query Parameters:
        - force: Force disable even if other modules depend on it (default: false)
    
    Returns:
        200: Module disabled successfully
        403: Forbidden (not admin)
        404: Module not found
        409: Dependency conflict (other modules depend on this)
        500: Server error
    """
    try:
        module_name = _get_path_parameter(event, "name")
        force = _get_query_parameter(event, "force", "false").lower() == "true"
        
        if not module_name:
            return _error_response(
                "Module name is required",
                status_code=400,
                error_code="MISSING_PARAMETER"
            )
        
        user_context = _get_user_context(event)
        
        # Only sys admins can disable modules
        if not user_context.get("is_sys_admin"):
            return _error_response(
                "Only system administrators can disable modules",
                status_code=403,
                error_code="FORBIDDEN"
            )
        
        logger.info(f"Disabling module: {module_name} (force={force})")
        
        # Get database client
        supabase = _get_supabase_client()
        if not supabase:
            return _error_response(
                "Database connection unavailable",
                status_code=503,
                error_code="SERVICE_UNAVAILABLE"
            )
        
        # Get the module
        module_response = (
            supabase.table("sys_module_registry")
            .select("*")
            .eq("module_name", module_name)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
        
        if not module_response.data:
            return _error_response(
                f"Module '{module_name}' not found",
                status_code=404,
                error_code="MODULE_NOT_FOUND"
            )
        
        module_data = module_response.data
        
        # Prevent disabling core modules (unless forced)
        if module_data.get("module_type") == "core" and not force:
            return _error_response(
                f"Cannot disable core module '{module_name}'. Use force=true to override.",
                status_code=409,
                error_code="CORE_MODULE_PROTECTED"
            )
        
        # Check if other enabled modules depend on this one
        if not force:
            deps_response = (
                supabase.table("sys_module_registry")
                .select("module_name, dependencies")
                .is_("deleted_at", "null")
                .eq("is_enabled", True)
                .execute()
            )
            
            dependent_modules = [
                m["module_name"] for m in (deps_response.data or [])
                if module_name in (m.get("dependencies") or [])
            ]
            
            if dependent_modules:
                return _error_response(
                    f"Cannot disable module. Other modules depend on it: {', '.join(dependent_modules)}",
                    status_code=409,
                    error_code="DEPENDENT_MODULES_EXIST",
                    details={"dependent_modules": dependent_modules}
                )
        
        # Disable the module
        update_response = (
            supabase.table("sys_module_registry")
            .update({
                "is_enabled": False,
                "updated_by": user_context.get("user_id"),
            })
            .eq("module_name", module_name)
            .execute()
        )
        
        module = _transform_module(update_response.data[0])
        
        logger.info(f"Successfully disabled module: {module_name}")
        return _success_response({
            "module": module,
            "message": f"Module '{module_name}' disabled successfully"
        })
        
    except Exception as e:
        logger.error(f"Error disabling module: {str(e)}")
        return _error_response(
            f"Failed to disable module: {str(e)}",
            error_code="DISABLE_MODULE_FAILED"
        )


# =============================================================================
# Handler: Register New Module
# =============================================================================

def register_module_handler(event: Dict, context: Any) -> Dict:
    """
    Register a new module in the registry.
    
    POST /platform/modules
    
    Body:
        {
            "module_name": "string (required) - e.g., 'module-kb'",
            "display_name": "string (required)",
            "description": "string (optional)",
            "module_type": "string (optional) - 'core' or 'functional', default: 'functional'",
            "tier": "integer (optional) - 1, 2, or 3, default: 1",
            "dependencies": "array (optional) - module names this depends on",
            "nav_config": "object (optional)",
            "required_permissions": "array (optional)"
        }
    
    Returns:
        201: Module registered successfully
        400: Invalid request
        403: Forbidden (not admin)
        409: Module already exists
        500: Server error
    """
    try:
        user_context = _get_user_context(event)
        
        # Only sys admins can register modules
        if not user_context.get("is_sys_admin"):
            return _error_response(
                "Only system administrators can register modules",
                status_code=403,
                error_code="FORBIDDEN"
            )
        
        # Parse request body
        body, error = _parse_body(event)
        if error:
            return _error_response(error, status_code=400, error_code="INVALID_BODY")
        
        # Validate required fields
        module_name = body.get("module_name")
        display_name = body.get("display_name")
        
        if not module_name:
            return _error_response(
                "module_name is required",
                status_code=400,
                error_code="MISSING_FIELD"
            )
        
        if not display_name:
            return _error_response(
                "display_name is required",
                status_code=400,
                error_code="MISSING_FIELD"
            )
        
        # Validate module name format
        import re
        if not re.match(r"^module-[a-z]+$", module_name):
            return _error_response(
                "Invalid module_name format. Must be 'module-{purpose}' where purpose is lowercase letters only.",
                status_code=400,
                error_code="INVALID_MODULE_NAME"
            )
        
        logger.info(f"Registering new module: {module_name}")
        
        # Get database client
        supabase = _get_supabase_client()
        if not supabase:
            return _error_response(
                "Database connection unavailable",
                status_code=503,
                error_code="SERVICE_UNAVAILABLE"
            )
        
        # Check if module already exists
        existing = (
            supabase.table("sys_module_registry")
            .select("id")
            .eq("module_name", module_name)
            .is_("deleted_at", "null")
            .execute()
        )
        
        if existing.data:
            return _error_response(
                f"Module '{module_name}' already exists",
                status_code=409,
                error_code="MODULE_EXISTS"
            )
        
        # Prepare module data
        module_type = body.get("module_type", "functional")
        if module_type not in ["core", "functional"]:
            module_type = "functional"
        
        tier = body.get("tier", 1)
        if not isinstance(tier, int) or tier not in [1, 2, 3]:
            tier = 1
        
        insert_data = {
            "module_name": module_name,
            "display_name": display_name,
            "description": body.get("description"),
            "module_type": module_type,
            "tier": tier,
            "is_enabled": body.get("is_enabled", True),
            "is_installed": True,
            "version": body.get("version"),
            "config": body.get("config", {}),
            "feature_flags": body.get("feature_flags", {}),
            "dependencies": body.get("dependencies", []),
            "nav_config": body.get("nav_config", {}),
            "required_permissions": body.get("required_permissions", []),
            "created_by": user_context.get("user_id"),
        }
        
        # Insert module
        response = (
            supabase.table("sys_module_registry")
            .insert(insert_data)
            .execute()
        )
        
        module = _transform_module(response.data[0])
        
        logger.info(f"Successfully registered module: {module_name}")
        return _success_response(
            {
                "module": module,
                "message": f"Module '{module_name}' registered successfully"
            },
            status_code=201
        )
        
    except Exception as e:
        logger.error(f"Error registering module: {str(e)}")
        return _error_response(
            f"Failed to register module: {str(e)}",
            error_code="REGISTER_MODULE_FAILED"
        )


# =============================================================================
# Helper Functions
# =============================================================================

def _transform_module(data: Dict) -> Dict:
    """
    Transform database module record to API response format.
    
    Args:
        data: Raw database record
    
    Returns:
        Transformed module object
    """
    return {
        "id": data.get("id"),
        "name": data.get("module_name"),
        "displayName": data.get("display_name"),
        "description": data.get("description"),
        "type": data.get("module_type"),
        "tier": data.get("tier"),
        "isEnabled": data.get("is_enabled"),
        "isInstalled": data.get("is_installed"),
        "version": data.get("version"),
        "minCompatibleVersion": data.get("min_compatible_version"),
        "config": data.get("config", {}),
        "featureFlags": data.get("feature_flags", {}),
        "dependencies": data.get("dependencies", []),
        "navConfig": data.get("nav_config", {}),
        "requiredPermissions": data.get("required_permissions", []),
        "createdAt": data.get("created_at"),
        "updatedAt": data.get("updated_at"),
    }
