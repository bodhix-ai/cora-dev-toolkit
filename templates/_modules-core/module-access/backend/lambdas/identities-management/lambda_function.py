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
from access_common.permissions import can_view_members


def _transform_user(user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform database user record to API response format (camelCase).
    
    Converts snake_case fields from database to camelCase for frontend.
    """
    # Transform org_memberships to camelCase
    org_memberships = []
    for membership in user.get('org_memberships', []):
        org_memberships.append({
            'orgId': membership.get('org_id'),
            'orgName': membership.get('org_name'),
            'orgRole': membership.get('org_role'),
        })
    
    return {
        'id': user.get('user_id'),
        'email': user.get('email'),
        'name': user.get('full_name'),
        'sysRole': user.get('sys_role'),
        'createdAt': user.get('created_at'),
        'lastSignInAt': user.get('last_signin_at'),
        'orgMemberships': org_memberships,
    }


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
    Handle identity provisioning and user management operations
    
    Routes - Identity Management:
    - POST /identities/provision - Provision Okta user to Supabase
    
    Routes - System Admin:
    - GET /admin/sys/access/users - List all platform users (platform admin only)
    
    Routes - Organization Admin:
    - GET /admin/org/access/users - List users in organization (org_admin, org_owner)
    - GET /admin/org/access/users/{userId} - View user details in organization (org_admin, org_owner)
    - PUT /admin/org/access/users/{userId} - Update user role in organization (org_owner only)
    - DELETE /admin/org/access/users/{userId} - Remove user from organization (org_owner only)
    
    Args:
        event: API Gateway event
        context: Lambda context
        
    Returns:
        API Gateway response
    """
    # Log incoming request
    print(json.dumps(event, default=str))
    
    try:
        # Extract HTTP method and path
        http_method = event['requestContext']['http']['method']
        path = event['requestContext']['http']['path']
        
        # Centralized authentication for admin routes (ADR-019)
        user_id = None
        org_id = None
        
        if '/admin/' in path:
            # Get user_id from JWT token
            user_info = common.get_user_from_event(event)
            okta_uid = user_info['user_id']
            user_id = common.get_supabase_user_id_from_external_uid(okta_uid)
            
            # System admin routes
            if path.startswith('/admin/sys/'):
                common.check_sys_admin(user_id)
            
            # Organization admin routes
            elif path.startswith('/admin/org/'):
                org_id = common.get_org_context_from_event(event)
                common.check_org_admin(user_id, org_id)
        
        # Route to handlers (pass user_id and org_id for admin routes)
        if http_method == 'GET' and '/admin/sys/access/users' in path:
            return handle_list_users(user_id)
        elif http_method == 'GET' and '/admin/org/access/users' in path:
            return handle_org_list_users(user_id, org_id)
        elif http_method == 'PUT' and '/admin/org/access/users/' in path:
            return handle_org_update_user(event, user_id, org_id)
        elif http_method == 'DELETE' and '/admin/org/access/users/' in path:
            return handle_org_delete_user(event, user_id, org_id)
        elif http_method == 'POST':
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


def handle_list_users(user_id: str) -> Dict[str, Any]:
    """
    List all platform users with their roles and organization memberships
    
    This endpoint is restricted to platform admins only.
    Authorization is handled at the router level (ADR-019).
    
    Args:
        user_id: Authenticated user's Supabase user_id (already verified as sys_admin)
    
    Returns:
        List of users with profile and org membership information
    """
    # Use service role client to query all users
    client = common.get_supabase_client()
    
    try:
        # Query all user profiles
        response = client.table('user_profiles').select(
            'user_id, email, full_name, sys_role, created_at'
        ).execute()
        
        users = response.data if response.data else []
        
        # For each user, fetch their org memberships and last sign-in
        for user in users:
            # Get most recent session for last sign-in time
            session_response = client.table('user_sessions').select(
                'started_at'
            ).eq('user_id', user['user_id']).order('started_at', desc=True).limit(1).execute()
            
            # Add last_signin_at from most recent session
            user['last_signin_at'] = session_response.data[0]['started_at'] if session_response.data else None
            
            # Query org_members table for this user
            membership_response = client.table('org_members').select(
                'org_id, org_role, orgs(id, name)'
            ).eq('user_id', user['user_id']).execute()
            
            # Format org memberships
            org_memberships = []
            if membership_response.data:
                for membership in membership_response.data:
                    org_data = membership.get('orgs')
                    if org_data:
                        org_memberships.append({
                            'org_id': org_data['id'],
                            'org_name': org_data['name'],
                            'org_role': membership['org_role']
                        })
            
            user['org_memberships'] = org_memberships
        
        # Transform all users to camelCase for frontend
        transformed_users = [_transform_user(user) for user in users]
        
        return common.success_response(transformed_users)
        
    except Exception as e:
        print(f"Error listing users: {str(e)}")
        raise


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
            'sys_role': 'sys_user'  # Default role
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


def handle_org_list_users(user_id: str, org_id: str) -> Dict[str, Any]:
    """
    List users in the requesting user's organization
    
    This endpoint is accessible to org_admin (read-only) and org_owner.
    Authorization is handled at the router level (ADR-019 Layer 1).
    Additional ADR-019c (Layer 2) permission check below.
    
    Args:
        user_id: Authenticated user's Supabase user_id (already verified as org_admin)
        org_id: Organization ID from request context (already validated)
    
    Returns:
        List of users in the organization with their roles
    """
    # ADR-019c: Check resource permission (org_admin or org_owner)
    if not can_view_members(user_id, org_id):
        raise common.ForbiddenError('You do not have access to view members in this organization')
    
    # Use service role client to query org users
    client = common.get_supabase_client()
    
    try:
        # Query org members and join with user profiles
        response = client.table('org_members').select(
            'user_id, org_role, user_profiles(user_id, email, full_name, created_at)'
        ).eq('org_id', org_id).execute()
        
        users = []
        if response.data:
            for member in response.data:
                profile = member.get('user_profiles')
                if profile:
                    # Get most recent session for last sign-in time
                    session_response = client.table('user_sessions').select(
                        'started_at'
                    ).eq('user_id', profile['user_id']).order('started_at', desc=True).limit(1).execute()
                    
                    users.append({
                        'user_id': profile['user_id'],
                        'email': profile['email'],
                        'full_name': profile['full_name'],
                        'org_role': member['org_role'],
                        'created_at': profile['created_at'],
                        'last_signin_at': session_response.data[0]['started_at'] if session_response.data else None
                    })
        
        # Transform to camelCase
        transformed_users = [common.format_record(user) for user in users]
        
        return common.success_response(transformed_users)
        
    except Exception as e:
        print(f"Error listing org users: {str(e)}")
        raise


def handle_org_update_user(event: Dict[str, Any], user_id: str, org_id: str) -> Dict[str, Any]:
    """
    Update user role in organization
    
    This endpoint is restricted to org_owner only.
    Authorization (org_admin minimum) is handled at router level (ADR-019).
    Additional org_owner check is performed here for this sensitive operation.
    
    Args:
        event: API Gateway event (for path parameters and body)
        user_id: Authenticated user's Supabase user_id (already verified as org_admin)
        org_id: Organization ID from request context (already validated)
    
    Request body:
    {
        "org_role": "org_member" | "org_admin" | "org_owner"
    }
    
    Returns:
        Updated user information
    """
    # Additional check: verify user is org_owner for this sensitive operation
    membership = common.find_one('org_members', {
        'user_id': user_id,
        'org_id': org_id
    })
    
    if not membership or membership.get('org_role') != 'org_owner':
        raise common.ForbiddenError('Org owner access required')
    
    # Get target user ID from path
    path_parameters = event.get('pathParameters', {}) or {}
    target_user_id = path_parameters.get('userId')
    
    if not target_user_id:
        return common.bad_request_response('User ID required')
    
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    new_role = body.get('org_role')
    
    if not new_role or new_role not in ['org_member', 'org_admin', 'org_owner']:
        return common.bad_request_response('Valid org_role required (org_member, org_admin, or org_owner)')
    
    try:
        # Verify target user is in the same org
        target_membership = common.find_one('org_members', {
            'user_id': target_user_id,
            'org_id': org_id
        })
        
        if not target_membership:
            return common.not_found_response('User not found in this organization')
        
        # Update user's role
        updated = common.update_one(
            table='org_members',
            filters={'user_id': target_user_id, 'org_id': org_id},
            data={'org_role': new_role}
        )
        
        return common.success_response(common.format_record(updated))
        
    except Exception as e:
        print(f"Error updating org user: {str(e)}")
        raise


def handle_org_delete_user(event: Dict[str, Any], user_id: str, org_id: str) -> Dict[str, Any]:
    """
    Remove user from organization
    
    This endpoint is restricted to org_owner only.
    Authorization (org_admin minimum) is handled at router level (ADR-019).
    Additional org_owner check is performed here for this sensitive operation.
    
    Args:
        event: API Gateway event (for path parameters)
        user_id: Authenticated user's Supabase user_id (already verified as org_admin)
        org_id: Organization ID from request context (already validated)
    
    Returns:
        Success message
    """
    # Additional check: verify user is org_owner for this sensitive operation
    membership = common.find_one('org_members', {
        'user_id': user_id,
        'org_id': org_id
    })
    
    if not membership or membership.get('org_role') != 'org_owner':
        raise common.ForbiddenError('Org owner access required')
    
    # Get target user ID from path
    path_parameters = event.get('pathParameters', {}) or {}
    target_user_id = path_parameters.get('userId')
    
    if not target_user_id:
        return common.bad_request_response('User ID required')
    
    # Prevent self-deletion
    if target_user_id == user_id:
        return common.bad_request_response('Cannot remove yourself from the organization')
    
    try:
        # Verify target user is in the same org
        target_membership = common.find_one('org_members', {
            'user_id': target_user_id,
            'org_id': org_id
        })
        
        if not target_membership:
            return common.not_found_response('User not found in this organization')
        
        # Delete the membership
        client = common.get_supabase_client()
        client.table('org_members').delete().eq('user_id', target_user_id).eq('org_id', org_id).execute()
        
        return common.success_response({'message': 'User removed from organization'})
        
    except Exception as e:
        print(f"Error deleting org user: {str(e)}")
        raise
