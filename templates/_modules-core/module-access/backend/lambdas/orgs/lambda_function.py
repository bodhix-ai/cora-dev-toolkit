"""
Organizations Lambda Function
Handles CRUD operations for organizations
"""
import json
from typing import Dict, Any
import org_common as common
from access_common.permissions import (
    can_view_org,
    can_edit_org,
    can_delete_org,
)

# Allowed MUI icons for org branding (AI-related)
ALLOWED_ORG_ICONS = [
    'AutoAwesomeOutlined',  # Default - sparkles/magic
    'PsychologyOutlined',   # Brain - intelligence
    'SmartToyOutlined',     # Robot - AI assistant
    'AutoFixHighOutlined',  # Magic wand - auto-fix
    'BoltOutlined',         # Lightning - speed/power
    'HubOutlined',          # Network hub - connections
    'MemoryOutlined',       # Memory chip - computing
    'ModelTrainingOutlined' # Model training
]


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle organization operations
    
    Endpoints:
    - GET    /orgs           - List user's organizations
    - POST   /orgs           - Create new organization
    - GET    /orgs/{orgId}    - Get organization details
    - PUT    /orgs/{orgId}    - Update organization
    - DELETE /orgs/{orgId}    - Delete organization
    
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
            if path_params and path_params.get('orgId'):
                return handle_get_org(supabase_user_id, path_params['orgId'])
            else:
                return handle_list_orgs(event, supabase_user_id)
        elif http_method == 'POST':
            return handle_create_org(event, supabase_user_id)
        elif http_method == 'PUT':
            if not path_params or not path_params.get('orgId'):
                return common.bad_request_response('Organization ID is required')
            return handle_update_org(event, supabase_user_id, path_params['orgId'])
        elif http_method == 'DELETE':
            if not path_params or not path_params.get('orgId'):
                return common.bad_request_response('Organization ID is required')
            return handle_delete_org(supabase_user_id, path_params['orgId'])
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
    List organizations
    
    Query parameters:
    - limit: Number of results (default: 100)
    - offset: Pagination offset (default: 0)
    
    For platform admins: Returns ALL organizations with member counts
    For regular users: Returns organizations where user is a member
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
        # Get user's profile to check platform role
        profile = common.find_one(
            table='user_profiles',
            filters={'user_id': user_id}
        )
        
        is_sys_admin = profile and profile.get('sys_role') in ['sys_owner', 'sys_admin']
        
        if is_sys_admin:
            # Sys admin: Return ALL organizations
            orgs = common.find_many(
                table='orgs',
                filters={},
                select='*',
                order='created_at.desc',
                limit=limit,
                offset=offset
            )
            
            # Get member counts for each org
            result = []
            for org in orgs:
                member_count_result = common.find_many(
                    table='org_members',
                    filters={'org_id': org['id']},
                    select='id'
                )
                
                org_data = common.format_record(org)
                org_data['member_count'] = len(member_count_result)
                result.append(org_data)
            
            return common.success_response(result)
        else:
            # Regular user: Return only their organizations
            memberships = common.find_many(
                table='org_members',
                filters={'user_id': user_id},
                select='org_id, org_role',
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
                    org_data['user_role'] = membership['org_role']
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
        # Get organization details
        org = common.find_one(
            table='orgs',
            filters={'id': org_id}
        )
        
        if not org:
            raise common.NotFoundError('Organization not found')
        
        # ADR-019c Layer 2: Two-step authorization pattern
        # Step 1: Verify org membership (prevents cross-org access)
        if not common.can_access_org_resource(user_id, org_id):
            raise common.ForbiddenError('Not a member of organization')
        
        # Step 2: Check resource permission (membership-based view)
        if not can_view_org(user_id, org_id):
            raise common.ForbiddenError('You do not have access to this organization')
        
        # Get membership for role info (needed for response)
        membership = common.find_one(
            table='org_members',
            filters={
                'org_id': org_id,
                'user_id': user_id
            }
        )
        
        # Get member count
        member_count_result = common.find_many(
            table='org_members',
            filters={'org_id': org_id},
            select='id'
        )
        member_count = len(member_count_result)
        
        # Format response in camelCase for frontend
        result = {
            'id': org['id'],
            'name': org['name'],
            'slug': org['slug'],
            'ownerId': org.get('owner_id'),
            'description': org.get('description'),
            'websiteUrl': org.get('website_url'),
            'logoUrl': org.get('logo_url'),
            'appName': org.get('app_name'),
            'appIcon': org.get('app_icon'),
            'createdAt': org.get('created_at'),
            'updatedAt': org.get('updated_at'),
            'createdBy': org.get('created_by'),
            'updatedBy': org.get('updated_by'),
            'userRole': membership['org_role'],
            'memberCount': member_count
        }
        
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
        "slug": "organization-slug",
        "description": "Optional description",
        "logo_url": "https://...",
        "website_url": "https://...",
        "allowed_domain": "example.com",  // Optional - for domain-based auto-provisioning
        "domain_default_role": "org_user"  // Optional - role for domain users
    }
    
    Creator automatically becomes org_owner
    Platform admins can create orgs with domain configuration
    
    Note: user_id is already the Supabase UUID (converted from Okta UID in lambda_handler)
    """
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    
    # Validate required fields
    name = common.validate_required(body.get('name'), 'name')
    name = common.validate_string_length(name, 'name', min_length=1, max_length=255)
    
    # Slug (required)
    slug = common.validate_required(body.get('slug'), 'slug')
    slug = common.validate_string_length(slug, 'slug', min_length=1, max_length=255)
    
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
    
    # App branding (optional)
    app_name = body.get('app_name', '')
    if app_name:
        app_name = common.validate_string_length(app_name, 'app_name', max_length=100)
    
    app_icon = body.get('app_icon', '')
    if app_icon:
        if app_icon not in ALLOWED_ORG_ICONS:
            raise common.ValidationError(
                f'app_icon must be one of: {", ".join(ALLOWED_ORG_ICONS)}'
            )
    
    # Domain configuration (platform admin only)
    allowed_domain = body.get('allowed_domain', '')
    domain_default_role = body.get('domain_default_role', 'org_user')
    
    # Validate domain_default_role if provided
    if domain_default_role and domain_default_role not in ['org_user', 'org_admin', 'org_owner']:
        raise common.ValidationError('domain_default_role must be one of: org_user, org_admin, org_owner')
    
    try:
        # user_id is already the Supabase UUID
        supabase_user_id = user_id
        
        # Get user's profile for updating current_org_id later
        profile = common.find_one(
            table='user_profiles',
            filters={'user_id': supabase_user_id}
        )
        
        # Create organization (without domain fields - those go in org_email_domains)
        org_data = {
            'name': name,
            'slug': slug,
            'owner_id': supabase_user_id,  # Use Supabase UUID, not email
            'description': description,
            'logo_url': logo_url or None,
            'website_url': website_url or None,
            'app_name': app_name or None,
            'app_icon': app_icon or None,
            'created_by': supabase_user_id
        }
        
        org = common.insert_one(
            table='orgs',
            data=org_data
        )
        
        # Create domain configuration in org_email_domains if provided
        if allowed_domain:
            domain_data = {
                'org_id': org['id'],
                'domain': allowed_domain,
                'is_verified': True,  # Auto-verify for org creation
                'default_role': domain_default_role,
                'created_by': supabase_user_id
            }
            common.insert_one(
                table='org_email_domains',
                data=domain_data
            )
        
        # Add creator as org_owner using Supabase user_id
        # Note: org_members.user_id references auth.users(id), not profiles(id)
        membership = common.insert_one(
            table='org_members',
            data={
                'org_id': org['id'],
                'user_id': supabase_user_id,  # Use Supabase UUID from auth.users
                'org_role': 'org_owner',
                'added_by': supabase_user_id
            }
        )
        
        # Update user's current_org_id if not set
        if not profile.get('current_org_id'):
            common.update_one(
                table='user_profiles',
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
        "slug": "new-slug",
        "description": "New description",
        "logo_url": "https://...",
        "website_url": "https://...",
        "allowed_domain": "example.com",  // Optional - null to remove
        "domain_default_role": "org_user"  // Optional
    }
    
    Requires org_admin or org_owner role
    """
    # Validate org_id
    org_id = common.validate_uuid(org_id, 'org_id')
    
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    
    try:
        # Get organization to verify it exists
        org = common.find_one(
            table='orgs',
            filters={'id': org_id}
        )
        
        if not org:
            raise common.NotFoundError('Organization not found')
        
        # ADR-019c Layer 2: Two-step authorization pattern
        # Step 1: Verify org membership (prevents cross-org access)
        if not common.can_access_org_resource(user_id, org_id):
            raise common.ForbiddenError('Not a member of organization')
        
        # Step 2: Check resource permission (org_admin or org_owner)
        if not can_edit_org(user_id, org_id):
            raise common.ForbiddenError('Only org admins and owners can update organizations')
        
        # Get membership for role info (needed for response)
        membership = common.find_one(
            table='org_members',
            filters={
                'org_id': org_id,
                'user_id': user_id
            }
        )
        
        # Build update data
        update_data = {}
        
        if 'name' in body:
            name = body['name']
            if name:
                update_data['name'] = common.validate_string_length(
                    name, 'name', min_length=1, max_length=255
                )
        
        if 'slug' in body:
            slug = body['slug']
            if slug:
                update_data['slug'] = common.validate_string_length(
                    slug, 'slug', min_length=1, max_length=255
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
        
        if 'app_name' in body:
            app_name = body['app_name']
            if app_name:
                update_data['app_name'] = common.validate_string_length(
                    app_name, 'app_name', max_length=100
                )
            else:
                update_data['app_name'] = None
        
        if 'app_icon' in body:
            app_icon = body['app_icon']
            if app_icon:
                if app_icon not in ALLOWED_ORG_ICONS:
                    raise common.ValidationError(
                        f'app_icon must be one of: {", ".join(ALLOWED_ORG_ICONS)}'
                    )
                update_data['app_icon'] = app_icon
            else:
                update_data['app_icon'] = None
        
        # Handle domain configuration updates through org_email_domains table
        domain_updates = {}
        if 'allowed_domain' in body:
            domain_updates['domain'] = body.get('allowed_domain')
        
        if 'domain_default_role' in body:
            domain_default_role = body.get('domain_default_role')
            if domain_default_role:
                if domain_default_role not in ['org_user', 'org_admin', 'org_owner']:
                    raise common.ValidationError('domain_default_role must be one of: org_user, org_admin, org_owner')
                domain_updates['default_role'] = domain_default_role
        
        # Update or create domain configuration if domain updates provided
        if domain_updates:
            if domain_updates.get('domain'):
                # Check if domain already exists for this org
                existing_domain = common.find_one(
                    table='org_email_domains',
                    filters={'org_id': org_id}
                )
                
                if existing_domain:
                    # Update existing domain
                    domain_updates['updated_by'] = user_id
                    common.update_one(
                        table='org_email_domains',
                        filters={'id': existing_domain['id']},
                        data=domain_updates
                    )
                else:
                    # Create new domain
                    domain_updates['org_id'] = org_id
                    domain_updates['is_verified'] = True
                    domain_updates['created_by'] = user_id
                    common.insert_one(
                        table='org_email_domains',
                        data=domain_updates
                    )
            elif 'domain' in domain_updates and not domain_updates['domain']:
                # Remove domain if set to null/empty
                existing_domain = common.find_one(
                    table='org_email_domains',
                    filters={'org_id': org_id}
                )
                if existing_domain:
                    common.delete_one(
                        table='org_email_domains',
                        filters={'id': existing_domain['id']}
                    )
        
        # Update organization (only if there are org-level fields to update)
        if update_data:
            # Add updated_by
            update_data['updated_by'] = user_id
            
            updated_org = common.update_one(
                table='orgs',
                filters={'id': org_id},
                data=update_data
            )
        else:
            # No org fields to update, just get current org
            updated_org = common.find_one(
                table='orgs',
                filters={'id': org_id}
            )
        
        result = common.format_record(updated_org)
        if membership:
            result['user_role'] = membership['org_role']
        
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
        # Get organization to verify it exists
        org = common.find_one(
            table='orgs',
            filters={'id': org_id}
        )
        
        if not org:
            raise common.NotFoundError('Organization not found')
        
        # ADR-019c Layer 2: Two-step authorization pattern
        # Step 1: Verify org membership (prevents cross-org access)
        if not common.can_access_org_resource(user_id, org_id):
            raise common.ForbiddenError('Not a member of organization')
        
        # Step 2: Check resource permission (org_owner only)
        if not can_delete_org(user_id, org_id):
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
