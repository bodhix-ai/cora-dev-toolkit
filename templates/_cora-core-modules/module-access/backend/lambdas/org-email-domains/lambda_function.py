"""
Org Email Domains Lambda Function
Handles CRUD operations for organization email domains (auto-provisioning)
"""
import json
import logging
from typing import Optional, Dict, Any
import org_common as common

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)



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
    Handle org email domain operations
    
    Endpoints:
    - GET    /orgs/:id/email-domains           - List org's email domains
    - POST   /orgs/:id/email-domains           - Add email domain
    - PUT    /orgs/:id/email-domains/:domainId - Update email domain
    - DELETE /orgs/:id/email-domains/:domainId - Remove email domain
    
    Args:
        event: API Gateway event
        context: Lambda context
        
    Returns:
        API Gateway response
    """
    # Log incoming request
    logger.info(f"Incoming request: {json.dumps(event, default=str)}")
    
    try:
        # Extract user info from authorizer
        user_info = common.get_user_from_event(event)
        external_uid = user_info['user_id']  # External UID (Clerk/Okta)
        
        # Convert to Supabase UUID
        user_id = common.get_supabase_user_id_from_external_uid(external_uid)
        
        # Extract HTTP method
        http_method = event['requestContext']['http']['method']
        
        # Extract path parameters
        path_params = event.get('pathParameters', {})
        org_id = path_params.get('id')
        domain_id = path_params.get('domainId')
        
        if not org_id:
            return common.bad_request_response('Organization ID is required')
        
        # Validate org_id format
        org_id = common.validate_uuid(org_id, 'org_id')
        
        # Route to appropriate handler
        if http_method == 'GET':
            return handle_list_domains(user_id, org_id)
        elif http_method == 'POST':
            return handle_add_domain(event, user_id, org_id)
        elif http_method == 'PUT':
            if not domain_id:
                return common.bad_request_response('Domain ID is required')
            domain_id = common.validate_uuid(domain_id, 'domain_id')
            return handle_update_domain(event, user_id, org_id, domain_id)
        elif http_method == 'DELETE':
            if not domain_id:
                return common.bad_request_response('Domain ID is required')
            domain_id = common.validate_uuid(domain_id, 'domain_id')
            return handle_delete_domain(user_id, org_id, domain_id)
        elif http_method == 'OPTIONS':
            # Handle CORS preflight
            return common.success_response({})
        else:
            return common.method_not_allowed_response()
            
    except KeyError as e:
        logger.error(f"Missing user information: {str(e)}")
        return common.unauthorized_response(f'Missing user information: {str(e)}')
    except common.ValidationError as e:
        logger.error(f"Validation error: {str(e)}")
        return common.bad_request_response(str(e))
    except common.NotFoundError as e:
        logger.error(f"Not found: {str(e)}")
        return common.not_found_response(str(e))
    except common.ForbiddenError as e:
        logger.error(f"Forbidden: {str(e)}")
        return common.forbidden_response(str(e))
    except Exception as e:
        logger.exception(f"Unexpected error: {str(e)}")
        return common.internal_error_response('Internal server error')


def authorize_domain_management(user_id: str, org_id: str) -> bool:
    """
    Check if user can manage email domains for organization
    
    User must be:
    - Platform owner/admin (can manage all orgs), OR
    - Org owner/admin (can manage their own org)
    
    Args:
        user_id: Supabase user ID
        org_id: Organization ID
        
    Returns:
        True if authorized
        
    Raises:
        common.ForbiddenError: If user lacks permission
    """
    # Check platform admin access
    profile = common.find_one(
        table='user_profiles',
        filters={'user_id': user_id}
    )
    
    if profile and profile.get('global_role') in ['platform_owner', 'platform_admin']:
        logger.info(f"Platform admin {user_id} authorized for org {org_id}")
        return True
    
    # Check org-level access
    membership = common.find_one(
        table='org_members',
        filters={'user_id': user_id, 'org_id': org_id}
    )
    
    if membership and membership.get('role') in ['org_owner', 'org_admin']:
        logger.info(f"Org admin {user_id} authorized for org {org_id}")
        return True
    
    raise common.ForbiddenError("Insufficient permissions to manage email domains")


def handle_list_domains(user_id: str, org_id: str) -> Dict[str, Any]:
    """
    List all email domains for organization
    
    Returns list of domains with auto_provision status
    """
    try:
        # Authorize user
        authorize_domain_management(user_id, org_id)
        
        # Get domains for org
        domains = common.find_many(
            table='org_email_domains',
            filters={'org_id': org_id},
            select='*',
            order='domain.asc'
        )
        
        # Format response
        result = [common.format_record(domain) for domain in domains]
        
        return common.success_response(result)
        
    except Exception as e:
        logger.exception(f"Error listing domains: {str(e)}")
        raise


def handle_add_domain(event: Dict[str, Any], user_id: str, org_id: str) -> Dict[str, Any]:
    """
    Add email domain to organization
    
    Request body:
    {
        "domain": "acme.com",
        "autoProvision": true
    }
    """
    try:
        # Authorize user
        authorize_domain_management(user_id, org_id)
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Validate required fields
        domain = common.validate_required(body.get('domain'), 'domain')
        domain = domain.lower().strip()
        
        # Validate domain format (basic check)
        if not domain or '.' not in domain or '@' in domain:
            raise common.ValidationError('Invalid domain format. Provide domain only (e.g., acme.com)')
        
        # Get auto_provision flag (default: true)
        auto_provision = body.get('autoProvision', body.get('auto_provision', True))
        if not isinstance(auto_provision, bool):
            auto_provision = True
        
        # Check if domain already exists for this org
        existing = common.find_one(
            table='org_email_domains',
            filters={'org_id': org_id, 'domain': domain}
        )
        
        if existing:
            raise common.ValidationError(f"Domain {domain} already configured for this organization")
        
        # Create domain record
        domain_record = common.insert_one(
            table='org_email_domains',
            data={
                'org_id': org_id,
                'domain': domain,
                'auto_provision': auto_provision,
                'created_by': user_id
            }
        )
        
        result = common.format_record(domain_record)
        
        logger.info(f"Added domain {domain} to org {org_id}")
        return common.created_response(result)
        
    except Exception as e:
        logger.exception(f"Error adding domain: {str(e)}")
        raise


def handle_update_domain(event: Dict[str, Any], user_id: str, org_id: str, domain_id: str) -> Dict[str, Any]:
    """
    Update email domain settings
    
    Request body:
    {
        "autoProvision": false
    }
    """
    try:
        # Authorize user
        authorize_domain_management(user_id, org_id)
        
        # Verify domain belongs to org
        domain_record = common.find_one(
            table='org_email_domains',
            filters={'id': domain_id, 'org_id': org_id}
        )
        
        if not domain_record:
            raise common.NotFoundError('Domain not found or does not belong to this organization')
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Build update data
        update_data = {}
        
        # Only auto_provision can be updated
        if 'autoProvision' in body or 'auto_provision' in body:
            auto_provision = body.get('autoProvision', body.get('auto_provision'))
            if not isinstance(auto_provision, bool):
                raise common.ValidationError('autoProvision must be a boolean')
            update_data['auto_provision'] = auto_provision
        
        if not update_data:
            raise common.ValidationError('No valid fields to update')
        
        # Update domain
        updated_domain = common.update_one(
            table='org_email_domains',
            filters={'id': domain_id},
            data=update_data
        )
        
        result = common.format_record(updated_domain)
        
        logger.info(f"Updated domain {domain_id} for org {org_id}")
        return common.success_response(result)
        
    except Exception as e:
        logger.exception(f"Error updating domain: {str(e)}")
        raise


def handle_delete_domain(user_id: str, org_id: str, domain_id: str) -> Dict[str, Any]:
    """
    Remove email domain from organization
    """
    try:
        # Authorize user
        authorize_domain_management(user_id, org_id)
        
        # Verify domain belongs to org
        domain_record = common.find_one(
            table='org_email_domains',
            filters={'id': domain_id, 'org_id': org_id}
        )
        
        if not domain_record:
            raise common.NotFoundError('Domain not found or does not belong to this organization')
        
        # Delete domain
        common.delete_one(
            table='org_email_domains',
            filters={'id': domain_id}
        )
        
        logger.info(f"Deleted domain {domain_id} from org {org_id}")
        return common.success_response({
            'message': 'Domain deleted successfully',
            'id': domain_id
        })
        
    except Exception as e:
        logger.exception(f"Error deleting domain: {str(e)}")
        raise
