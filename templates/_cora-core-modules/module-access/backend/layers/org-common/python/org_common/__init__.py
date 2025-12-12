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
    is_platform_admin, is_provider_active
)
from .responses import (
    success_response, error_response, created_response, no_content_response,
    bad_request_response, unauthorized_response, forbidden_response,
    not_found_response, conflict_response, internal_error_response,
    method_not_allowed_response
)
from .errors import ValidationError, NotFoundError, UnauthorizedError, ForbiddenError
from .validators import (
    validate_uuid, validate_email, validate_org_role, validate_global_role,
    validate_string_length, validate_url, validate_required, validate_integer,
    validate_boolean, validate_choices
)

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
            'phone_number': context.get('phone_number', '')
        }
        
        return user_info
    except Exception as e:
        print(f"Error extracting user from event: {str(e)}")
        raise KeyError(f'Unable to extract user information: {str(e)}')


def get_supabase_user_id_from_external_uid(external_uid: str) -> str:
    """
    Retrieves the Supabase Auth User ID (UUID) from an external User ID (Clerk/Okta).

    This function queries the `external_identities` table to find the mapping
    between a user's external UID and their internal Supabase Auth UUID.

    Args:
        external_uid: The user's unique identifier from external provider (Clerk/Okta).

    Returns:
        The corresponding Supabase Auth User ID (UUID).

    Raises:
        NotFoundError: If no matching user is found in the `external_identities` table.
        ValueError: If the external_uid is empty or None.
    """
    if not external_uid:
        raise ValueError("external_uid cannot be empty or None")

    try:
        # Query without provider filter to support both Clerk and Okta
        identity = find_one(
            'external_identities',
            {'external_id': external_uid}
        )

        if not identity:
            raise NotFoundError(f"User with external UID '{external_uid}' not found in external_identities")

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


__all__ = [
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
    'is_platform_admin',
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
    'validate_global_role',
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
]
