"""
Module Middleware for CORA Runtime Behavior.

This module provides middleware functions for:
- Checking if a module is enabled before processing requests
- Tracking module usage automatically
- Filtering API responses based on enabled modules

These middleware functions integrate with API Gateway and Lambda handlers.
"""

import json
import logging
import os
from datetime import datetime
from typing import Any, Callable, Dict, Optional, TypeVar
from functools import wraps

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Type for Lambda handler functions
HandlerFunc = TypeVar('HandlerFunc', bound=Callable[[Dict, Any], Dict])


# =============================================================================
# Module Cache for Performance
# =============================================================================

class ModuleCache:
    """
    Simple in-memory cache for module status.
    Cache is invalidated on Lambda cold start or after TTL.
    """
    
    def __init__(self, ttl_seconds: int = 300):
        self._cache: Dict[str, Dict] = {}
        self._last_fetch: Optional[datetime] = None
        self._ttl_seconds = ttl_seconds
    
    def is_valid(self) -> bool:
        """Check if cache is still valid."""
        if self._last_fetch is None:
            return False
        elapsed = (datetime.now() - self._last_fetch).total_seconds()
        return elapsed < self._ttl_seconds
    
    def get(self, module_name: str) -> Optional[Dict]:
        """Get module from cache."""
        if not self.is_valid():
            return None
        return self._cache.get(module_name)
    
    def set_all(self, modules: list) -> None:
        """Set all modules in cache."""
        self._cache = {m['module_name']: m for m in modules}
        self._last_fetch = datetime.now()
    
    def invalidate(self) -> None:
        """Invalidate the cache."""
        self._cache = {}
        self._last_fetch = None


# Global module cache
_module_cache = ModuleCache()


# =============================================================================
# Database Operations
# =============================================================================

def _get_supabase_client():
    """Get Supabase client for database operations."""
    try:
        from supabase import create_client
        
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            logger.error("Missing Supabase configuration")
            return None
            
        return create_client(supabase_url, supabase_key)
    except ImportError:
        logger.error("Supabase client not available")
        return None


def _fetch_modules() -> list:
    """Fetch all modules from database."""
    supabase = _get_supabase_client()
    if not supabase:
        return []
    
    try:
        response = (
            supabase.table("platform_module_registry")
            .select("module_name, is_enabled, is_installed, module_type, tier, dependencies")
            .is_("deleted_at", "null")
            .execute()
        )
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to fetch modules: {e}")
        return []


def _get_module_status(module_name: str) -> Optional[Dict]:
    """Get module status from cache or database."""
    # Check cache first
    cached = _module_cache.get(module_name)
    if cached is not None:
        return cached
    
    # Fetch all modules and update cache
    modules = _fetch_modules()
    if modules:
        _module_cache.set_all(modules)
        return _module_cache.get(module_name)
    
    return None


def is_module_enabled(module_name: str) -> bool:
    """
    Check if a module is enabled.
    
    Args:
        module_name: Name of the module (e.g., 'module-kb')
    
    Returns:
        True if module is enabled and installed, False otherwise
    """
    module = _get_module_status(module_name)
    if module is None:
        logger.warning(f"Module not found: {module_name}")
        return False
    
    return module.get("is_enabled", False) and module.get("is_installed", False)


def get_enabled_modules() -> list:
    """
    Get list of all enabled module names.
    
    Returns:
        List of enabled module names
    """
    modules = _fetch_modules()
    _module_cache.set_all(modules)
    
    return [
        m['module_name'] for m in modules
        if m.get('is_enabled') and m.get('is_installed')
    ]


# =============================================================================
# Module Gate Decorator
# =============================================================================

def require_module(module_name: str):
    """
    Decorator to gate a Lambda handler by module status.
    
    If the module is disabled, returns a 503 Service Unavailable response.
    
    Args:
        module_name: Name of the module required for this handler
    
    Example:
        @require_module('module-kb')
        def kb_handler(event, context):
            # This only runs if module-kb is enabled
            ...
    """
    def decorator(handler: HandlerFunc) -> HandlerFunc:
        @wraps(handler)
        def wrapper(event: Dict, context: Any) -> Dict:
            if not is_module_enabled(module_name):
                logger.info(f"Request blocked: module {module_name} is disabled")
                return {
                    "statusCode": 503,
                    "headers": {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                    "body": json.dumps({
                        "error": "MODULE_DISABLED",
                        "message": f"The {module_name} module is currently disabled",
                        "module": module_name,
                    }),
                }
            return handler(event, context)
        return wrapper
    return decorator


# =============================================================================
# Usage Tracking Decorator
# =============================================================================

def track_module_usage(module_name: str, event_type: str = "api_call"):
    """
    Decorator to automatically track module usage for a Lambda handler.
    
    Args:
        module_name: Name of the module being used
        event_type: Type of usage event (default: 'api_call')
    
    Example:
        @track_module_usage('module-kb', 'api_call')
        def kb_handler(event, context):
            ...
    """
    def decorator(handler: HandlerFunc) -> HandlerFunc:
        @wraps(handler)
        def wrapper(event: Dict, context: Any) -> Dict:
            start_time = datetime.now()
            response = None
            error_info = None
            
            try:
                response = handler(event, context)
                return response
            except Exception as e:
                error_info = {
                    "error_code": type(e).__name__,
                    "error_message": str(e),
                }
                raise
            finally:
                # Calculate duration
                end_time = datetime.now()
                duration_ms = int((end_time - start_time).total_seconds() * 1000)
                
                # Determine status
                if error_info:
                    status = "failure"
                elif response and response.get("statusCode", 500) < 400:
                    status = "success"
                else:
                    status = "failure"
                
                # Track usage asynchronously (fire and forget)
                try:
                    _record_usage(
                        module_name=module_name,
                        event=event,
                        context=context,
                        event_type=event_type,
                        duration_ms=duration_ms,
                        status=status,
                        error_info=error_info,
                    )
                except Exception as track_error:
                    logger.error(f"Failed to track usage: {track_error}")
        
        return wrapper
    return decorator


def _record_usage(
    module_name: str,
    event: Dict,
    context: Any,
    event_type: str,
    duration_ms: int,
    status: str,
    error_info: Optional[Dict] = None,
) -> None:
    """Record usage event to database."""
    supabase = _get_supabase_client()
    if not supabase:
        return
    
    try:
        # Get module ID
        module_response = (
            supabase.table("platform_module_registry")
            .select("id")
            .eq("module_name", module_name)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
        
        if not module_response.data:
            logger.warning(f"Module not found for usage tracking: {module_name}")
            return
        
        module_id = module_response.data["id"]
        
        # Extract context information
        request_context = event.get("requestContext", {})
        authorizer = request_context.get("authorizer", {})
        
        usage_data = {
            "module_id": module_id,
            "module_name": module_name,
            "org_id": authorizer.get("org_id"),
            "user_id": authorizer.get("principalId"),
            "event_type": event_type,
            "event_action": f"{module_name}.{event.get('httpMethod', 'UNKNOWN').lower()}.{event.get('resource', 'unknown')}",
            "request_id": request_context.get("requestId"),
            "endpoint": event.get("resource"),
            "http_method": event.get("httpMethod"),
            "duration_ms": duration_ms,
            "status": status,
            "error_code": error_info.get("error_code") if error_info else None,
            "error_message": error_info.get("error_message") if error_info else None,
        }
        
        supabase.table("platform_module_usage").insert(usage_data).execute()
        
    except Exception as e:
        logger.error(f"Failed to record usage: {e}")


# =============================================================================
# Combined Decorator
# =============================================================================

def module_handler(module_name: str, track_usage: bool = True, event_type: str = "api_call"):
    """
    Combined decorator that gates by module status and optionally tracks usage.
    
    Args:
        module_name: Name of the module
        track_usage: Whether to track usage (default: True)
        event_type: Type of usage event (default: 'api_call')
    
    Example:
        @module_handler('module-kb')
        def kb_handler(event, context):
            ...
    """
    def decorator(handler: HandlerFunc) -> HandlerFunc:
        # Apply module gate
        gated_handler = require_module(module_name)(handler)
        
        # Apply usage tracking if enabled
        if track_usage:
            gated_handler = track_module_usage(module_name, event_type)(gated_handler)
        
        return gated_handler
    return decorator


# =============================================================================
# API Gateway Authorizer Integration
# =============================================================================

def add_module_context_to_authorizer(authorizer_response: Dict, module_name: str) -> Dict:
    """
    Add module context to authorizer response for downstream handlers.
    
    This should be called in your API Gateway authorizer to include
    module information in the authorization context.
    
    Args:
        authorizer_response: The existing authorizer response
        module_name: The module being accessed
    
    Returns:
        Modified authorizer response with module context
    """
    module = _get_module_status(module_name)
    
    context = authorizer_response.get("context", {})
    context["module_name"] = module_name
    context["module_enabled"] = str(module.get("is_enabled", False)).lower() if module else "false"
    context["module_type"] = module.get("module_type", "unknown") if module else "unknown"
    
    authorizer_response["context"] = context
    return authorizer_response


# =============================================================================
# Navigation Filter
# =============================================================================

def filter_navigation_by_modules(nav_items: list, user_permissions: list = None) -> list:
    """
    Filter navigation items based on enabled modules.
    
    This function filters a list of navigation items to only include
    items for modules that are currently enabled.
    
    Args:
        nav_items: List of navigation items with 'moduleName' property
        user_permissions: Optional list of user permissions to also filter by
    
    Returns:
        Filtered list of navigation items
    """
    enabled_modules = set(get_enabled_modules())
    
    filtered = []
    for item in nav_items:
        module_name = item.get("moduleName")
        
        # Skip items for disabled modules
        if module_name and module_name not in enabled_modules:
            continue
        
        # Check permissions if provided
        if user_permissions:
            required = item.get("requiredPermissions", [])
            if required and not any(p in user_permissions for p in required):
                continue
        
        filtered.append(item)
    
    return filtered


# =============================================================================
# Cache Management
# =============================================================================

def invalidate_module_cache() -> None:
    """
    Invalidate the module cache.
    
    Call this after making changes to module status to ensure
    handlers see the updated status immediately.
    """
    _module_cache.invalidate()
    logger.info("Module cache invalidated")


def refresh_module_cache() -> None:
    """
    Refresh the module cache from database.
    
    Call this to proactively refresh the cache without waiting for TTL.
    """
    modules = _fetch_modules()
    if modules:
        _module_cache.set_all(modules)
        logger.info(f"Module cache refreshed with {len(modules)} modules")
