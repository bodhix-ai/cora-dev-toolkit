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
        List of pending invites
    """
    # Verify user has admin access to this organization
    user_info = common.get_user_from_event(event)
    membership = common.find_one('org_members', {'user_id': user_info['user_id'], 'org_id': org_id})
    if not membership or membership.get('role') not in ['org_admin', 'org_owner']:
        raise common.ForbiddenError('Organization admin access required')
    
    # Query invites table
    invites = common.find_many(
        table='user_invites',
        filters={'org_id': org_id, 'status': 'pending'}
    )
    
    return common.success_response(common.format_records(invites))


def handle_create_invite(event: Dict[str, Any], org_id: str) -> Dict[str, Any]:
    """
    Create new member invite
    
    Request body:
    {
        "email": "user@example.com",
        "role": "org_member" | "org_admin"
    }
    
    Args:
        event: API Gateway event
        org_id: Organization ID
        
    Returns:
        Created invite
    """
    # Verify user has admin access to this organization
    user_info = common.get_user_from_event(event)
    membership = common.find_one('org_members', {'user_id': user_info['user_id'], 'org_id': org_id})
    if not membership or membership.get('role') not in ['org_admin', 'org_owner']:
        raise common.ForbiddenError('Organization admin access required')
    
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    email = common.validate_email(body.get('email'))
    role = common.validate_required(body.get('role'), 'role')
    
    # Validate role
    if role not in ['org_member', 'org_admin']:
        return common.bad_request_response(
            'Invalid role. Must be org_member or org_admin'
        )
    
    # Check if user is already a member
    existing_member = common.find_one(
        table='org_members',
        filters={'org_id': org_id, 'email': email}
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
    
    # Create invite
    invite = common.insert_one(
        table='user_invites',
        data={
            'org_id': org_id,
            'email': email,
            'role': role,
            'invited_by': user_info['user_id'],
            'status': 'pending'
        }
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
    # Verify user has admin access to this organization
    user_info = common.get_user_from_event(event)
    membership = common.find_one('org_members', {'user_id': user_info['user_id'], 'org_id': org_id})
    if not membership or membership.get('role') not in ['org_admin', 'org_owner']:
        raise common.ForbiddenError('Organization admin access required')
    
    # Verify invite exists and belongs to this org
    invite = common.find_one(
        table='user_invites',
        filters={'invite_id': invite_id, 'org_id': org_id}
    )
    
    if not invite:
        raise common.NotFoundError('Invite not found')
    
    # Delete the invite
    common.delete_one(
        table='user_invites',
        filters={'invite_id': invite_id}
    )
    
    return common.success_response({
        'message': 'Invite revoked successfully',
        'invite_id': invite_id
    })
