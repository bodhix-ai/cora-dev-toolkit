"""
Organizations Lambda Function
Handles CRUD operations for organizations
"""
import json
from typing import Dict, Any
import org_common as common


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle organization operations
    
    Endpoints:
    - GET    /orgs           - List user's organizations
    - POST   /orgs           - Create new organization
    - GET    /orgs/:id       - Get organization details
    - PUT    /orgs/:id       - Update organization
    - DELETE /orgs/:id       - Delete organization
    
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
        okta_uid = user_info['user_id']  # This is the Okta UID
        
        # Convert Okta UID to Supabase UUID for database operations
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # Extract HTTP method (support both API Gateway v1 and v2 formats)
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
        if not http_method:
            return common.bad_request_response('HTTP method not found in request')
        
        path_params = event.get('pathParameters', {})
        
        # Route to appropriate handler
        if http_method == 'GET':
            if path_params and path_params.get('id'):
                return handle_get_org(supabase_user_id, path_params['id'])
            else:
                return handle_list_orgs(event, supabase_user_id)
        elif http_method == 'POST':
            return handle_create_org(event, supabase_user_id)
        elif http_method == 'PUT':
            if not path_params or not path_params.get('id'):
                return common.bad_request_response('Organization ID is required')
            return handle_update_org(event, supabase_user_id, path_params['id'])
        elif http_method == 'DELETE':
            if not path_params or not path_params.get('id'):
                return common.bad_request_response('Organization ID is required')
            return handle_delete_org(supabase_user_id, path_params['id'])
        elif http_method == 'OPTIONS':
            # Handle CORS preflight
            return common.success_response({})
        else:
            return common.method_not_allowed_response()
            
    except KeyError as e:
        print(f'KeyError: {str(e)}')
        return common.unauthorized_response(f'Missing user information: {str(e)}')
    except common.NotFoundError as e:
        print(f'NotFoundError during user resolution: {str(e)}')
        return common.unauthorized_response(f'User not found: {str(e)}')
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


def handle_list_orgs(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    List user's organizations
    
    Query parameters:
    - limit: Number of results (default: 100)
    - offset: Pagination offset (default: 0)
    
    Returns organizations where user is a member
    """
    query_params = event.get('queryStringParameters', {}) or {}
    
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
    
    try:
        # Get user's organization memberships
        memberships = common.find_many(
            table='org_members',
            filters={'user_id': user_id},
            select='org_id, role',
            order='created_at.desc',
            limit=limit,
            offset=offset
        )
        
        # Get organization details for each membership
        org_ids = [m['org_id'] for m in memberships]
        
        if not org_ids:
            return common.success_response([])
        
        # Build organizations list with role info
        result = []
        for membership in memberships:
            org = common.find_one(
                table='orgs',
                filters={'id': membership['org_id']},
                select='*'
            )
            
            if org:
                org_data = common.format_record(org)
                org_data['user_role'] = membership['role']
                result.append(org_data)
        
        return common.success_response(result)
        
    except Exception as e:
        print(f"Error listing organizations: {str(e)}")
        raise


def handle_get_org(user_id: str, org_id: str) -> Dict[str, Any]:
    """
    Get organization details
    
    User must be a member of the organization
    """
    # Validate org_id
    org_id = common.validate_uuid(org_id, 'org_id')
    
    try:
        # Check if user is member (RLS will enforce this, but we check explicitly)
        membership = common.find_one(
            table='org_members',
            filters={
                'org_id': org_id,
                'user_id': user_id
            }
        )
        
        if not membership:
            raise common.ForbiddenError('You do not have access to this organization')
        
        # Get organization details
        org = common.find_one(
            table='orgs',
            filters={'id': org_id}
        )
        
        if not org:
            raise common.NotFoundError('Organization not found')
        
        # Get member count
        member_count_result = common.find_many(
            table='org_members',
            filters={'org_id': org_id},
            select='id'
        )
        member_count = len(member_count_result)
        
        # Format response
        result = common.format_record(org)
        result['user_role'] = membership['role']
        result['member_count'] = member_count
        
        return common.success_response(result)
        
    except Exception as e:
        print(f"Error getting organization: {str(e)}")
        raise


def handle_create_org(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Create new organization
    
    Request body:
    {
        "name": "Organization Name",
        "description": "Optional description",
        "logo_url": "https://...",
        "website_url": "https://..."
    }
    
    Creator automatically becomes org_owner
    
    Note: user_id is already the Supabase UUID (converted from Okta UID in lambda_handler)
    """
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    
    # Validate required fields
    name = common.validate_required(body.get('name'), 'name')
    name = common.validate_string_length(name, 'name', min_length=1, max_length=255)
    
    # Optional fields
    description = body.get('description', '')
    if description:
        description = common.validate_string_length(
            description, 'description', max_length=1000
        )
    
    logo_url = body.get('logo_url', '')
    if logo_url:
        logo_url = common.validate_url(logo_url, 'logo_url')
    
    website_url = body.get('website_url', '')
    if website_url:
        website_url = common.validate_url(website_url, 'website_url')
    
    try:
        # user_id is already the Supabase UUID
        supabase_user_id = user_id
        
        # Get user's profile for updating current_org_id later
        profile = common.find_one(
            table='profiles',
            filters={'user_id': supabase_user_id}
        )
        
        # Create organization
        org_data = {
            'name': name,
            'owner_id': supabase_user_id,  # Use Supabase UUID, not email
            'description': description,
            'logo_url': logo_url or None,
            'website_url': website_url or None,
            'created_by': supabase_user_id
        }
        
        org = common.insert_one(
            table='orgs',
            data=org_data
        )
        
        # Add creator as org_owner using Supabase user_id
        # Note: org_members.user_id references auth.users(id), not profiles(id)
        membership = common.insert_one(
            table='org_members',
            data={
                'org_id': org['id'],
                'user_id': supabase_user_id,  # Use Supabase UUID from auth.users
                'role': 'org_owner',
                'added_by': supabase_user_id
            }
        )
        
        # Update user's current_org_id if not set
        if not profile.get('current_org_id'):
            common.update_one(
                table='profiles',
                filters={'id': profile['id']},
                data={'current_org_id': org['id']}
            )
        
        result = common.format_record(org)
        result['user_role'] = 'org_owner'
        
        return common.created_response(result)
        
    except Exception as e:
        print(f"Error creating organization: {str(e)}")
        raise


def handle_update_org(event: Dict[str, Any], user_id: str, org_id: str) -> Dict[str, Any]:
    """
    Update organization
    
    Request body:
    {
        "name": "New Name",
        "description": "New description",
        "logo_url": "https://...",
        "website_url": "https://..."
    }
    
    Requires org_admin or org_owner role
    """
    # Validate org_id
    org_id = common.validate_uuid(org_id, 'org_id')
    
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    
    try:
        # Check if user has admin access (RLS enforces this via can_modify_org_data)
        membership = common.find_one(
            table='org_members',
            filters={
                'org_id': org_id,
                'user_id': user_id
            }
        )
        
        if not membership:
            raise common.ForbiddenError('You do not have access to this organization')
        
        if membership['role'] not in ['org_admin', 'org_owner']:
            raise common.ForbiddenError('Only org admins and owners can update organizations')
        
        # Build update data
        update_data = {}
        
        if 'name' in body:
            name = body['name']
            if name:
                update_data['name'] = common.validate_string_length(
                    name, 'name', min_length=1, max_length=255
                )
        
        if 'description' in body:
            description = body['description']
            if description:
                update_data['description'] = common.validate_string_length(
                    description, 'description', max_length=1000
                )
            else:
                update_data['description'] = None
        
        if 'logo_url' in body:
            logo_url = body['logo_url']
            if logo_url:
                update_data['logo_url'] = common.validate_url(logo_url, 'logo_url')
            else:
                update_data['logo_url'] = None
        
        if 'website_url' in body:
            website_url = body['website_url']
            if website_url:
                update_data['website_url'] = common.validate_url(website_url, 'website_url')
            else:
                update_data['website_url'] = None
        
        if not update_data:
            raise common.ValidationError('No valid fields to update')
        
        # Add updated_by
        update_data['updated_by'] = user_id
        
        # Update organization
        updated_org = common.update_one(
            table='orgs',
            filters={'id': org_id},
            data=update_data
        )
        
        result = common.format_record(updated_org)
        result['user_role'] = membership['role']
        
        return common.success_response(result)
        
    except Exception as e:
        print(f"Error updating organization: {str(e)}")
        raise


def handle_delete_org(user_id: str, org_id: str) -> Dict[str, Any]:
    """
    Delete organization
    
    Requires org_owner role
    This will cascade delete all org_members and related data
    """
    # Validate org_id
    org_id = common.validate_uuid(org_id, 'org_id')
    
    try:
        # Check if user is org_owner
        membership = common.find_one(
            table='org_members',
            filters={
                'org_id': org_id,
                'user_id': user_id
            }
        )
        
        if not membership:
            raise common.ForbiddenError('You do not have access to this organization')
        
        if membership['role'] != 'org_owner':
            raise common.ForbiddenError('Only org owners can delete organizations')
        
        # Delete organization (cascade will handle org_members)
        deleted_org = common.delete_one(
            table='orgs',
            filters={'id': org_id}
        )
        
        return common.success_response({
            'message': 'Organization deleted successfully',
            'id': org_id
        })
        
    except Exception as e:
        print(f"Error deleting organization: {str(e)}")
        raise
