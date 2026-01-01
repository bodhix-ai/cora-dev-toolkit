"""
Identities Management Lambda Function
Handles provisioning of external identities (Okta) to Supabase auth.users

CORA-EXCEPTION: platform-level
This is a platform-level Lambda that manages cross-org identity provisioning.
It intentionally does NOT:
- Filter by org_id (operates across all organizations)
- Use standard CORA response functions (uses common utility functions)
- Follow typical org-scoped patterns (provisions identities globally)
"""
import json
import os
from typing import Dict, Any, Optional
import org_common as common


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
    Handle identity provisioning operations
    
    Endpoints:
    - POST /identities/provision - Provision Okta user to Supabase
    
    Args:
        event: API Gateway event
        context: Lambda context
        
    Returns:
        API Gateway response
    """
    # Log incoming request
    print(json.dumps(event, default=str))
    
    try:
        # Extract HTTP method
        http_method = event['requestContext']['http']['method']
        
        if http_method == 'POST':
            return handle_provision(event)
        elif http_method == 'OPTIONS':
            # Handle CORS preflight
            return common.success_response({})
        else:
            return common.method_not_allowed_response()
            
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.UnauthorizedError as e:
        return common.unauthorized_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except common.NotFoundError as e:
        return common.not_found_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response('Internal server error')


def handle_provision(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Provision external identity (Okta) to Supabase
    
    This endpoint is typically called by the authentication flow when a user
    logs in via Okta for the first time. It creates the necessary records
    to map the Okta identity to a Supabase user.
    
    Request body:
    {
        "provider": "okta",
        "provider_user_id": "okta-user-id",
        "email": "user@example.com",
        "name": "User Name",
        "org_id": "uuid" (optional)
    }
    
    Returns:
        User profile information
    """
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    
    # Validate required fields
    provider = body.get('provider', 'okta')
    provider_user_id = common.validate_required(body.get('provider_user_id'), 'provider_user_id')
    email = common.validate_email(body.get('email'))
    name = body.get('name', '')
    org_id = body.get('org_id')  # Optional org_id for multi-tenancy
    
    # Extract user info from authorizer (if already authenticated)
    try:
        user_info = common.get_user_from_event(event)
        user_id = user_info['user_id']
        # Use org_id from token if not provided in body
        if not org_id and 'org_id' in user_info:
            org_id = user_info['org_id']
    except KeyError:
        # User not yet authenticated via Supabase, will be created
        user_id = None
    
    # Use service role client (bypasses RLS)
    client = common.get_supabase_client()
    
    try:
        # Use helper function to check if Okta user is already mapped
        supabase_user_id = get_supabase_user_id_from_okta_uid(provider_user_id)
        
        if supabase_user_id:
            # Identity already provisioned, return existing profile
            profile_filters = {'user_id': supabase_user_id}
            if org_id:
                profile_filters['org_id'] = org_id
            
            profile = common.find_one(
                table='user_profiles',
                filters=profile_filters
            )
            
            return common.success_response({
                'message': 'Identity already provisioned',
                'profile': common.format_record(profile)
            })
        
        # Check if user exists by email in Supabase auth.users
        # Note: We can't directly query auth.users, so we check profiles table
        profile_filters = {'email': email}
        if org_id:
            profile_filters['org_id'] = org_id
            
        existing_profile = common.find_one(
            table='user_profiles',
            filters=profile_filters
        )
        
        if existing_profile:
            # User exists, create external identity mapping
            identity = common.insert_one(
                table='user_auth_ext_ids',
                data={
                    'provider_name': provider,
                    'external_id': provider_user_id,
                    'auth_user_id': existing_profile['user_id']
                }
            )
            
            return common.success_response({
                'message': 'External identity linked to existing user',
                'profile': common.format_record(existing_profile)
            })
        
        # New user - need to create both auth.users and profile
        # Note: For Supabase, user creation should happen via Supabase Auth API
        # This Lambda assumes the user already exists in auth.users from Okta JWT
        # We'll create the profile and external identity mapping
        
        if not user_id:
            return common.bad_request_response(
                'User must be authenticated to provision identity. '
                'User should exist in Supabase auth.users from JWT token.'
            )
        
        # Create profile for the user
        profile_data = {
            'user_id': user_id,
            'email': email,
            'full_name': name,
            'global_role': 'global_user'  # Default role
        }
        if org_id:
            profile_data['org_id'] = org_id
            
        profile = common.insert_one(
            table='user_profiles',
            data=profile_data
        )
        
        # Create external identity mapping
        identity = common.insert_one(
            table='user_auth_ext_ids',
            data={
                'provider_name': provider,
                'external_id': provider_user_id,
                'auth_user_id': user_id
            }
        )
        
        return common.created_response({
            'message': 'Identity provisioned successfully',
            'profile': common.format_record(profile)
        })
        
    except Exception as e:
        print(f"Error provisioning identity: {str(e)}")
        raise
