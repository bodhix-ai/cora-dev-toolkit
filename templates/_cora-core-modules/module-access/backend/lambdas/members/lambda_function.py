"""
Organization Members Lambda Function
Handles CRUD operations for organization membership
"""
import json
from typing import Dict, Any
import org_common as common


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle organization membership operations
    
    Endpoints:
    - GET    /orgs/{orgId}/members              - List organization members
    - POST   /orgs/{orgId}/members              - Add member (invite)
    - PUT    /orgs/{orgId}/members/{memberId}   - Update member role
    - DELETE /orgs/{orgId}/members/{memberId}   - Remove member
    
    Args:
        event: API Gateway event
        context: Lambda context
        
    Returns:
        API Gateway response
    """
    # Log incoming request
    print(json.dumps(event, default=str))
    
    try:
        # Extract user info from authorizer
        user_info = common.get_user_from_event(event)
        user_id = user_info['user_id']
        
        # Extract HTTP method and path parameters
        http_method = event['httpMethod']
        path_params = event.get('pathParameters', {})
        
        # Organization ID is required
        org_id = path_params.get('id')
        if not org_id:
            return common.bad_request_response('Organization ID is required')
        
        org_id = common.validate_uuid(org_id, 'org_id')
        
        # Route to appropriate handler
        if http_method == 'GET':
            return handle_list_members(user_id, org_id, event)
        elif http_method == 'POST':
            return handle_add_member(event, user_id, org_id)
        elif http_method == 'PUT':
            member_id = path_params.get('memberId')
            if not member_id:
                return common.bad_request_response('Member ID is required')
            return handle_update_member(event, user_id, org_id, member_id)
        elif http_method == 'DELETE':
            member_id = path_params.get('memberId')
            if not member_id:
                return common.bad_request_response('Member ID is required')
            return handle_remove_member(user_id, org_id, member_id)
        elif http_method == 'OPTIONS':
            # Handle CORS preflight
            return common.success_response({})
        else:
            return common.method_not_allowed_response()
            
    except KeyError as e:
        return common.unauthorized_response(f'Missing user information: {str(e)}')
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.NotFoundError as e:
        return common.not_found_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response('Internal server error')


def handle_list_members(user_id: str, org_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """
    List organization members
    
    Query parameters:
    - active: Filter by active status (true/false)
    - role: Filter by role (org_user, org_admin, org_owner)
    - limit: Number of results (default: 100)
    - offset: Pagination offset (default: 0)
    
    User must be a member to view members
    """
    query_params = event.get('queryStringParameters', {}) or {}
    
    try:
        # Check if user is member
        user_membership = common.find_one(
            table='org_members',
            filters={
                'org_id': org_id,
                'user_id': user_id
            }
        )
        
        if not user_membership:
            raise common.ForbiddenError('You do not have access to this organization')
        
        # Build filters
        filters = {'org_id': org_id}
        
        # Optional filters        
        if 'role' in query_params:
            role = common.validate_org_role(query_params['role'])
            filters['role'] = role
        
        # Pagination
        limit = common.validate_integer(
            query_params.get('limit', 100),
            'limit',
            min_value=1,
            max_value=1000
        )
        offset = common.validate_integer(
            query_params.get('offset', 0),
            'offset',
            min_value=0
        )
        
        # Get members
        members = common.find_many(
            table='org_members',
            filters=filters,
            select='*',
            order='created_at.desc',
            limit=limit,
            offset=offset
        )
        
        # Get profile info for each member
        result = []
        for member in members:
            profile = common.find_one(
                table='profiles',
                filters={'user_id': member['user_id']},
                select='user_id, email, full_name, avatar_url'
            )
            
            member_data = common.format_record(member)
            if profile:
                member_data['profile'] = common.format_record(profile)
            
            result.append(member_data)
        
        return common.success_response(result)
        
    except Exception as e:
        print(f"Error listing members: {str(e)}")
        raise


def handle_add_member(event: Dict[str, Any], user_id: str, org_id: str) -> Dict[str, Any]:
    """
    Add member to organization (invite)
    
    Request body:
    {
        "email": "user@example.com",
        "role": "org_user" | "org_admin" | "org_owner"
    }
    
    Requires org_owner role (via can_manage_org_membership RLS)
    """
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    
    # Validate required fields
    email = common.validate_email(body.get('email'))
    role = common.validate_org_role(body.get('role', 'org_user'))
    
    try:
        # Check if user is org_owner (required for membership management)
        user_membership = common.find_one(
            table='org_members',
            filters={
                'org_id': org_id,
                'user_id': user_id
            }
        )
        
        if not user_membership:
            raise common.ForbiddenError('You do not have access to this organization')
        
        if user_membership['role'] != 'org_owner':
            raise common.ForbiddenError('Only org owners can manage membership')
        
        # Find user by email
        target_profile = common.find_one(
            table='profiles',
            filters={'email': email}
        )
        
        if not target_profile:
            raise common.NotFoundError(f'User with email {email} not found')
        
        target_user_id = target_profile['user_id']
        
        # Check if user is already a member
        existing_member = common.find_one(
            table='org_members',
            filters={
                'org_id': org_id,
                'user_id': target_user_id
            }
        )
        
        if existing_member:
            raise common.ValidationError('User is already a member of this organization')
        
        # Add new member
        new_member = common.insert_one(
            table='org_members',
            data={
                'org_id': org_id,
                'user_id': target_user_id,
                'role': role,
                'added_by': user_id
            }
        )
        
        result = common.format_record(new_member)
        result['profile'] = common.format_record(target_profile)
        
        return common.created_response(result)
        
    except Exception as e:
        print(f"Error adding member: {str(e)}")
        raise


def handle_update_member(
    event: Dict[str, Any],
    user_id: str,
    org_id: str,
    member_id: str
) -> Dict[str, Any]:
    """
    Update member role
    
    Request body:
    {
        "role": "org_user" | "org_admin" | "org_owner"
    }
    
    Requires org_owner role
    """
    # Validate member_id
    member_id = common.validate_uuid(member_id, 'member_id')
    
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    
    # Validate role
    new_role = common.validate_org_role(body.get('role'))
    
    try:
        # Check if user is org_owner
        user_membership = common.find_one(
            table='org_members',
            filters={
                'org_id': org_id,
                'user_id': user_id
            }
        )
        
        if not user_membership:
            raise common.ForbiddenError('You do not have access to this organization')
        
        if user_membership['role'] != 'org_owner':
            raise common.ForbiddenError('Only org owners can manage membership')
        
        # Get target member
        target_member = common.find_one(
            table='org_members',
            filters={'id': member_id, 'org_id': org_id}
        )
        
        if not target_member:
            raise common.NotFoundError('Member not found')
        
        # Prevent self-demotion if last owner
        if target_member['user_id'] == user_id and new_role != 'org_owner':
            # Check if there are other owners
            owners = common.find_many(
                table='org_members',
                filters={
                    'org_id': org_id,
                    'role': 'org_owner'
                }
            )
            
            if len(owners) <= 1:
                raise common.ForbiddenError(
                    'Cannot change role: organization must have at least one owner'
                )
        
        # Update member role
        updated_member = common.update_one(
            table='org_members',
            filters={'id': member_id},
            data={'role': new_role}
        )
        
        # Get profile info
        profile = common.find_one(
            table='profiles',
            filters={'user_id': updated_member['user_id']},
            select='user_id, email, full_name, avatar_url'
        )
        
        result = common.format_record(updated_member)
        if profile:
            result['profile'] = common.format_record(profile)
        
        return common.success_response(result)
        
    except Exception as e:
        print(f"Error updating member: {str(e)}")
        raise


def handle_remove_member(user_id: str, org_id: str, member_id: str) -> Dict[str, Any]:
    """
    Remove member from organization
    
    Requires org_owner role
    Cannot remove last owner
    """
    # Validate member_id
    member_id = common.validate_uuid(member_id, 'member_id')
    
    try:
        # Check if user is org_owner
        user_membership = common.find_one(
            table='org_members',
            filters={
                'org_id': org_id,
                'user_id': user_id
            }
        )
        
        if not user_membership:
            raise common.ForbiddenError('You do not have access to this organization')
        
        if user_membership['role'] != 'org_owner':
            raise common.ForbiddenError('Only org owners can manage membership')
        
        # Get target member
        target_member = common.find_one(
            table='org_members',
            filters={'id': member_id, 'org_id': org_id}
        )
        
        if not target_member:
            raise common.NotFoundError('Member not found')
        
        # Prevent removing last owner
        if target_member['role'] == 'org_owner':
            owners = common.find_many(
                table='org_members',
                filters={
                    'org_id': org_id,
                    'role': 'org_owner'
                }
            )
            
            if len(owners) <= 1:
                raise common.ForbiddenError(
                    'Cannot remove member: organization must have at least one owner'
                )
        
        # Remove member (hard delete)
        common.delete_one(
            table='org_members',
            filters={'id': member_id}
        )
        
        return common.success_response({
            'message': 'Member removed successfully',
            'id': member_id
        })
        
    except Exception as e:
        print(f"Error removing member: {str(e)}")
        raise
