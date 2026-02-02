r"""
Org-Module Common Layer
Shared utilities for org-module Lambda functions
"""
import json

from .supabase_client import get_supabase_client, get_secret
from .jwt_utils import resolve_user_jwt, extract_jwt_from_headers
from .db import (
    execute_query, format_record, format_records,
    insert_one, find_one, find_many, update_one, delete_one, delete_many,
    rpc, count, update_many
)
from .auth import (
    is_chat_owner, is_chat_participant,
    is_org_member, is_org_admin, is_org_owner, is_org_colleague,
    is_project_member, is_project_owner, is_project_admin_or_owner,
    is_project_colleague, is_project_favorited,
    is_sys_admin, is_provider_active
)
from .responses import (
    success_response, error_response, created_response, no_content_response,
    bad_request_response, unauthorized_response, forbidden_response,
    not_found_response, conflict_response, internal_error_response,
    method_not_allowed_response
)
from .errors import ValidationError, NotFoundError, UnauthorizedError, ForbiddenError
from .validators import (
    validate_uuid, validate_email, validate_org_role, validate_sys_role,
    validate_string_length, validate_url, validate_required, validate_integer,
    validate_boolean, validate_choices
)
from .transform import (
    snake_to_camel, camel_to_snake,
    transform_record, transform_records, transform_input,
    USER_PROFILE_FIELDS, ORG_MEMBER_FIELDS, WORKSPACE_CONFIG_FIELDS, LAMBDA_CONFIG_FIELDS
)

# ============================================================================
# AUTH ROLE CONSTANTS (ADR-019: Auth Standardization)
# ============================================================================
# These constants define the valid role values for each admin level.
# Use these instead of inline lists to ensure consistency across all modules.
# See: docs/arch decisions/ADR-019-AUTH-STANDARDIZATION.md
# ============================================================================

SYS_ADMIN_ROLES = ['sys_owner', 'sys_admin']
"""System admin roles - platform-wide administrative access"""

ORG_ADMIN_ROLES = ['org_owner', 'org_admin']
"""Organization admin roles - organization-scoped administrative access"""

WS_ADMIN_ROLES = ['ws_owner', 'ws_admin']
"""Workspace admin roles - workspace-scoped administrative access"""

def get_org_context_from_event(event):
    """
    Extract organization ID from API Gateway event (standardized method).
    
    The frontend is responsible for passing the selected org_id to the backend
    since users can belong to multiple organizations. org_id is NOT in the JWT.
    
    Checks in order:
    1. Path parameters (orgId)
    2. Query parameters (orgId)
    3. Request body (orgId)
    
    Args:
        event: API Gateway event dict
    
    Returns:
        org_id (str) or None if not found
        
    Usage:
        org_id = common.get_org_context_from_event(event)
        if not org_id:
            return common.bad_request_response('Organization context required')
    """
    # Check path parameters
    path_params = event.get('pathParameters', {}) or {}
    if 'orgId' in path_params:
        return path_params['orgId']
    
    # Check query parameters  
    query_params = event.get('queryStringParameters', {}) or {}
    if 'orgId' in query_params:
        return query_params['orgId']
    
    # Check request body
    body_str = event.get('body', '{}')
    if body_str:
        try:
            body = json.loads(body_str)
            if 'orgId' in body:
                return body['orgId']
        except:
            pass
    
    # org_id not found in request
    return None

# ============================================================================
# ADMIN AUTHORIZATION HELPERS (ADR-019: Auth Standardization)
# ============================================================================
# NEW STANDARD FUNCTIONS - Use these in all new code and migrations
# These provide consistent authorization checks across all modules.
# They wrap parameterized RPC functions that enforce auth at the database level.
# See: docs/arch decisions/ADR-019-AUTH-STANDARDIZATION.md
# ============================================================================

def check_sys_admin(user_id: str) -> bool:
    """
    Check if user has system admin privileges.
    
    Checks if user has sys_owner OR sys_admin role.
    Uses database RPC function check_sys_admin(p_user_id) for enforcement.
    
    Args:
        user_id: Supabase user UUID
        
    Returns:
        True if user has system admin access
        
    Usage:
        if common.check_sys_admin(supabase_user_id):
            # Allow platform-wide operation
    """
    from .db import rpc
    
    # ADR-019: Call new check_sys_admin RPC (backward compatible - doesn't touch old is_sys_admin)
    result = rpc('check_sys_admin', {'p_user_id': user_id})
    return result if isinstance(result, bool) else False


def check_org_admin(user_id: str, org_id: str) -> bool:
    """
    Check if user has organization admin privileges.
    
    Checks if user has org_owner OR org_admin role in the specified org.
    Uses database RPC function check_org_admin(p_user_id, p_org_id) for enforcement.
    
    Args:
        user_id: Supabase user UUID
        org_id: Organization UUID
        
    Returns:
        True if user has org admin access
        
    Usage:
        if common.check_org_admin(supabase_user_id, org_id):
            # Allow org-scoped operation
    """
    from .db import rpc
    
    # ADR-019: Call new check_org_admin RPC (backward compatible - doesn't touch old is_org_admin)
    result = rpc('check_org_admin', {'p_user_id': user_id, 'p_org_id': org_id})
    return result if isinstance(result, bool) else False


def check_ws_admin(user_id: str, ws_id: str) -> bool:
    """
    Check if user has workspace admin privileges.
    
    Checks if user has ws_owner OR ws_admin role in the specified workspace.
    Uses database RPC function check_ws_admin(p_user_id, p_ws_id) for enforcement.
    
    Args:
        user_id: Supabase user UUID
        ws_id: Workspace UUID
        
    Returns:
        True if user has workspace admin access
        
    Usage:
        if common.check_ws_admin(supabase_user_id, ws_id):
            # Allow workspace-scoped operation
    """
    from .db import rpc
    
    # ADR-019: Call new check_ws_admin RPC (backward compatible - doesn't touch old is_ws_admin_or_owner)
    result = rpc('check_ws_admin', {'p_user_id': user_id, 'p_ws_id': ws_id})
    return result if isinstance(result, bool) else False


# ============================================================================
# RESOURCE PERMISSION HELPERS (ADR-019c: Layer 2)
# ============================================================================
# These functions check if a user can access resources at the org/ws level.
# They MUST be called BEFORE resource-specific permission checks per ADR-019c.
# See: docs/arch decisions/ADR-019c-AUTH-RESOURCE-PERMISSIONS.md
# ============================================================================

def can_access_org_resource(user_id: str, org_id: str) -> bool:
    """
    Check if user can access organization resources (ADR-019c Layer 2).
    
    This is the standard membership check for org-scoped resources.
    MUST be called BEFORE resource permission checks per ADR-019c.
    
    Args:
        user_id: Supabase user UUID
        org_id: Organization UUID
        
    Returns:
        True if user is a member of the organization
        
    Usage:
        # ADR-019c Two-Step Check:
        # 1. Verify org membership (this function)
        if not common.can_access_org_resource(user_id, resource['org_id']):
            return common.forbidden_response('Not a member of organization')
        
        # 2. Check resource permission
        if not can_view_resource(user_id, resource_id):
            return common.forbidden_response('Access denied')
    """
    # Wrapper around is_org_member with standardized parameter order
    return is_org_member(org_id, user_id)

# Utility function to extract user from event
def get_user_from_event(event):
    """
    Extract user information from API Gateway event
    
    With IAM policy format, API Gateway nests the context under authorizer.lambda
    and principalId is at the root of the authorizer object.

    Args:
        event: API Gateway event with authorizer context

    Returns:
        dict: User information with user_id, email, and optional name fields

    Raises:
        KeyError: If user information is missing
    """
    try:
        # Extract from authorizer context (IAM policy format)
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        context = authorizer.get('lambda', {})

        # Prioritize Okta UID from the lambda context, as this is the most reliable source
        user_id = context.get('user_id')

        # Fallback to principalId, then email/sub if the context user_id is not present
        if not user_id:
            user_id = authorizer.get('principalId')
        if not user_id:
            user_id = context.get('email') or context.get('sub')

        if not user_id:
            print(f"Debug - Full event: {json.dumps(event, default=str)}")
            raise KeyError('Unable to find user identifier in authorizer context')

        # Extract user information from context fields
        user_info = {
            'user_id': user_id,  # This should now correctly be the Okta UID
            'email': context.get('email', ''),
            'name': context.get('name', ''),
            'given_name': context.get('given_name', ''),
            'family_name': context.get('family_name', ''),
            'phone_number': context.get('phone_number', ''),
            'provider': context.get('provider', '')
        }
        
        return user_info
    except Exception as e:
        print(f"Error extracting user from event: {str(e)}")
        raise KeyError(f'Unable to extract user information: {str(e)}')


def get_supabase_user_id_from_external_uid(external_uid: str) -> str:
    """
    Retrieves the Supabase Auth User ID (UUID) from an external User ID (Clerk/Okta).

    This function queries the `user_auth_ext_ids` table to find the mapping
    between a user's external UID and their internal Supabase Auth UUID.

    Args:
        external_uid: The user's unique identifier from external provider (Clerk/Okta).

    Returns:
        The corresponding Supabase Auth User ID (UUID).

    Raises:
        NotFoundError: If no matching user is found in the `user_auth_ext_ids` table.
        ValueError: If the external_uid is empty or None.
    """
    if not external_uid:
        raise ValueError("external_uid cannot be empty or None")

    try:
        # Query without provider filter to support both Clerk and Okta
        identity = find_one(
            'user_auth_ext_ids',
            {'external_id': external_uid}
        )

        if not identity:
            raise NotFoundError(f"User with external UID '{external_uid}' not found in user_auth_ext_ids")

        return identity['auth_user_id']
    except NotFoundError:
        # Re-raise NotFoundError to be handled by the caller
        raise
    except Exception as e:
        # Log the original exception for debugging with partial redaction
        redacted_uid = f"{external_uid[:4]}...{external_uid[-4:]}" if len(external_uid) > 8 else "***"
        print(f"Error retrieving Supabase user ID for external UID '{redacted_uid}': {str(e)}")
        # Re-raise a more generic error to avoid leaking implementation details
        raise RuntimeError("An unexpected error occurred while resolving user identity")


# Backward compatibility alias (deprecated)
def get_supabase_user_id_from_okta_uid(okta_uid: str) -> str:
    """Deprecated: Use get_supabase_user_id_from_external_uid instead"""
    return get_supabase_user_id_from_external_uid(okta_uid)


def log_ai_error(
    provider_id: str,
    model_id: str,
    request_source: str,
    operation_type: str,
    error: Exception,
    model_id_attempted: str,
    validation_category: str = None,
    request_params: dict = None,
    user_id: str = None,
    org_id: str = None,
    ws_id: str = None
) -> None:
    """
    Log AI API error for operations tracking.
    
    Args:
        provider_id: AI provider UUID
        model_id: AI model UUID
        request_source: Source Lambda/service (e.g., 'eval-processor')
        operation_type: Type of operation (e.g., 'text_generation')
        error: The exception that occurred
        model_id_attempted: The model_id that was attempted
        validation_category: Validation category from ai_models table
        request_params: Sanitized request parameters (no sensitive data)
        user_id: User who triggered the request (if applicable)
        org_id: Organization context (if applicable)
        ws_id: Workspace context (if applicable)
    """
    import traceback
    
    # Categorize error type
    error_message = str(error)
    error_type = _categorize_ai_error_type(error_message)
    
    # Sanitize request params (remove sensitive data)
    sanitized_params = None
    if request_params:
        sanitized_params = {
            'temperature': request_params.get('temperature'),
            'max_tokens': request_params.get('max_tokens'),
            'prompt_length': len(request_params.get('prompt', '')) if 'prompt' in request_params else None
        }
    
    try:
        insert_one(
            table='ai_log_error',
            data={
                'provider_id': provider_id,
                'model_id': model_id,
                'request_source': request_source,
                'operation_type': operation_type,
                'error_type': error_type,
                'error_message': error_message[:1000],  # Truncate long messages
                'error_raw': {
                    'type': type(error).__name__,
                    'message': error_message,
                    'traceback': traceback.format_exc()[:2000]
                },
                'model_id_attempted': model_id_attempted,
                'validation_category': validation_category,
                'request_params': sanitized_params,
                'user_id': user_id,
                'org_id': org_id,
                'ws_id': ws_id,  # Fixed: was 'workspace_id'
                'retry_count': 0
            }
        )
        print(f"✅ Logged AI error: {error_type} for model {model_id_attempted}")
    except Exception as log_error:
        # Don't fail the main operation if logging fails
        print(f"⚠️ Failed to log AI error: {log_error}")


def _categorize_ai_error_type(error_message: str) -> str:
    """Categorize error for easier filtering."""
    if not error_message:
        return 'unknown_error'
    
    error_lower = error_message.lower()
    
    if 'inference profile' in error_lower:
        return 'inference_profile_required'
    elif 'rate limit' in error_lower or 'throttl' in error_lower:
        return 'rate_limit_exceeded'
    elif 'not found' in error_lower or 'does not exist' in error_lower:
        return 'model_not_found'
    elif 'access denied' in error_lower or 'unauthorized' in error_lower:
        return 'access_denied'
    elif 'malformed' in error_lower or 'validation' in error_lower:
        return 'api_format_error'
    elif 'timeout' in error_lower:
        return 'timeout'
    elif 'quota' in error_lower:
        return 'quota_exceeded'
    elif 'marketplace' in error_lower:
        return 'marketplace_subscription_required'
    else:
        return 'unknown_error'


__all__ = [
    # Auth role constants (ADR-019)
    'SYS_ADMIN_ROLES',
    'ORG_ADMIN_ROLES',
    'WS_ADMIN_ROLES',
    
    # Admin authorization helpers (ADR-019)
    'check_sys_admin',
    'check_org_admin',
    'check_ws_admin',
    
    # Resource permission helpers (ADR-019c)
    'can_access_org_resource',
    
    # Supabase client
    'get_supabase_client',
    'get_secret',
    
    # Database helpers
    'execute_query',
    'format_record',
    'format_records',
    'insert_one',
    'find_one',
    'find_many',
    'update_one',
    'delete_one',
    'delete_many',
    'rpc',
    'count',
    'update_many',
    
    # Auth wrappers
    'is_chat_owner',
    'is_chat_participant',
    'is_org_member',
    'is_org_admin',
    'is_org_owner',
    'is_org_colleague',
    'is_project_member',
    'is_project_owner',
    'is_project_admin_or_owner',
    'is_project_colleague',
    'is_project_favorited',
    'is_sys_admin',
    'is_provider_active',
    
    # Response builders
    'success_response',
    'error_response',
    'created_response',
    'no_content_response',
    'bad_request_response',
    'unauthorized_response',
    'forbidden_response',
    'not_found_response',
    'conflict_response',
    'internal_error_response',
    'method_not_allowed_response',
    
    # Errors
    'ValidationError',
    'NotFoundError',
    'UnauthorizedError',
    'ForbiddenError',
    
    # Validators
    'validate_uuid',
    'validate_email',
    'validate_org_role',
    'validate_sys_role',
    'validate_string_length',
    'validate_url',
    'validate_required',
    'validate_integer',
    'validate_boolean',
    'validate_choices',
    
    # JWT & Auth Utilities
    'resolve_user_jwt',
    'extract_jwt_from_headers',
    'get_user_from_event',
    'get_supabase_user_id_from_external_uid',
    'get_supabase_user_id_from_okta_uid',  # Deprecated alias
    
    # Transform utilities (snake_case <-> camelCase)
    'snake_to_camel',
    'camel_to_snake',
    'transform_record',
    'transform_records',
    'transform_input',
    'USER_PROFILE_FIELDS',
    'ORG_MEMBER_FIELDS',
    'WORKSPACE_CONFIG_FIELDS',
    'LAMBDA_CONFIG_FIELDS',
    
    # AI Operations Monitoring
    'log_ai_error',
]
