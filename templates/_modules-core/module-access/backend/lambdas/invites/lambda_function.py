"""
Invites Lambda Function
Handles organization member invitation operations

Routes - Invites:
- GET /orgs/{orgId}/invites - List pending invites for an organization
- POST /orgs/{orgId}/invites - Create new member invite
- DELETE /orgs/{orgId}/invites/{inviteId} - Revoke/delete invite
"""
import json
from typing import Dict, Any, Optional
import org_common as common
from access_common.permissions import can_manage_invites


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
    Handle invite operations
    
    Args:
        event: API Gateway event
        context: Lambda context
        
    Returns:
        API Gateway response
    """
    # Log incoming request
    print(json.dumps(event, default=str))
    
    try:
        # Extract HTTP method and path parameters
        http_method = event['requestContext']['http']['method']
        path_params = event.get('pathParameters', {}) or {}
        org_id = path_params.get('orgId')
        invite_id = path_params.get('inviteId')
        
        # Validate org_id for all operations
        if not org_id:
            return common.bad_request_response('Organization ID is required')
        
        # Route to appropriate handler
        if http_method == 'GET':
            return handle_list_invites(event, org_id)
        elif http_method == 'POST':
            return handle_create_invite(event, org_id)
        elif http_method == 'DELETE':
            if not invite_id:
                return common.bad_request_response('Invite ID is required')
            return handle_delete_invite(event, org_id, invite_id)
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


def handle_list_invites(event: Dict[str, Any], org_id: str) -> Dict[str, Any]:
    """
    List pending invites for an organization
    
    Args:
        event: API Gateway event
        org_id: Organization ID
        
    Returns:
        List of pending invites with enriched inviter profile data
    """
    # Get user info and convert external UID to Supabase UUID
    user_info = common.get_user_from_event(event)
    external_uid = user_info['user_id']  # External UID (email from Okta)
    user_id = common.get_supabase_user_id_from_external_uid(external_uid)
    
    # ADR-019c: Check resource permission (org_admin or org_owner)
    if not can_manage_invites(user_id, org_id):
        raise common.ForbiddenError('Organization admin access required')
    
    # Query invites table
    invites = common.find_many(
        table='user_invites',
        filters={'org_id': org_id, 'status': 'pending'}
    )
    
    # Enrich invites with inviter profile data
    enriched_invites = []
    for invite in invites:
        invite_data = common.format_record(invite)
        
        # Look up inviter's profile to get name/email
        if invite.get('invited_by'):
            inviter_profile = common.find_one(
                table='user_profiles',
                filters={'user_id': invite['invited_by']}
            )
            if inviter_profile:
                invite_data['invitedBy'] = {
                    'name': inviter_profile.get('full_name'),
                    'email': inviter_profile.get('email')
                }
            else:
                invite_data['invitedBy'] = None
        else:
            invite_data['invitedBy'] = None
        
        enriched_invites.append(invite_data)
    
    return common.success_response(enriched_invites)


def handle_create_invite(event: Dict[str, Any], org_id: str) -> Dict[str, Any]:
    """
    Create new member invite

    Request body:
    {
        "email": "user@example.com",
        "role": "org_user" | "org_admin" | "org_owner",
        "expiresAt": "2026-01-21T00:00:00Z" (optional, ISO 8601 format)
    }

    Args:
        event: API Gateway event
        org_id: Organization ID

    Returns:
        Created invite
    """
    # Get user info and convert external UID to Supabase UUID
    user_info = common.get_user_from_event(event)
    external_uid = user_info['user_id']  # External UID (email from Okta)
    user_id = common.get_supabase_user_id_from_external_uid(external_uid)
    
    # ADR-019c: Check resource permission (org_admin or org_owner)
    if not can_manage_invites(user_id, org_id):
        raise common.ForbiddenError('Organization admin access required')
    
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    email = common.validate_email(body.get('email'))
    role = common.validate_required(body.get('role'), 'role')
    
    # Optional: expiresAt (camelCase per API-PATTERNS standard)
    expires_at = body.get('expiresAt')
    
    # Validate role
    if role not in ['org_user', 'org_admin', 'org_owner']:
        return common.bad_request_response(
            'Invalid role. Must be org_user, org_admin, or org_owner'
        )
    
    # Check if user is already a member
    # First, look up user by email in user_profiles
    user_profile = common.find_one(
        table='user_profiles',
        filters={'email': email}
    )
    
    # If user exists, check if they're already a member
    if user_profile:
        existing_member = common.find_one(
            table='org_members',
            filters={'org_id': org_id, 'user_id': user_profile['user_id']}
        )
        if existing_member:
            return common.bad_request_response('User is already a member of this organization')
    
    # Check if there's already a pending invite
    existing_invite = common.find_one(
        table='user_invites',
        filters={'org_id': org_id, 'email': email, 'status': 'pending'}
    )
    if existing_invite:
        return common.bad_request_response('Pending invite already exists for this email')
    
    # Build invite data
    invite_data = {
        'org_id': org_id,
        'email': email,
        'role': role,
        'invited_by': user_id,  # Use converted Supabase UUID
        'status': 'pending'
    }
    
    # Add expires_at if provided
    if expires_at:
        invite_data['expires_at'] = expires_at
    
    # Create invite
    invite = common.insert_one(
        table='user_invites',
        data=invite_data
    )
    
    # TODO: Send invitation email (integrate with email service)
    
    return common.created_response(common.format_record(invite))


def handle_delete_invite(event: Dict[str, Any], org_id: str, invite_id: str) -> Dict[str, Any]:
    """
    Revoke/delete an invite
    
    Args:
        event: API Gateway event
        org_id: Organization ID
        invite_id: Invite ID
        
    Returns:
        Success response
    """
    # Get user info and convert external UID to Supabase UUID
    user_info = common.get_user_from_event(event)
    external_uid = user_info['user_id']  # External UID (email from Okta)
    user_id = common.get_supabase_user_id_from_external_uid(external_uid)
    
    # ADR-019c: Check resource permission (org_admin or org_owner)
    if not can_manage_invites(user_id, org_id):
        raise common.ForbiddenError('Organization admin access required')
    
    # Verify invite exists and belongs to this org
    invite = common.find_one(
        table='user_invites',
        filters={'id': invite_id, 'org_id': org_id}
    )
    
    if not invite:
        raise common.NotFoundError('Invite not found')
    
    # Delete the invite
    common.delete_one(
        table='user_invites',
        filters={'id': invite_id}
    )
    
    return common.success_response({
        'message': 'Invite revoked successfully',
        'inviteId': invite_id
    })
