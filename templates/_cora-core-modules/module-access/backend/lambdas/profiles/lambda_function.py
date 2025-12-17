"""
Profiles Lambda Function
Handles user profile operations
"""
import json
import logging
from typing import Dict, Any
import org_common as common
from org_common.supabase_client import get_supabase_client

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle profile operations
    
    Endpoints:
    - GET /profiles/me - Get current user's profile
    - PUT /profiles/me - Update current user's profile
    
    Args:
        event: API Gateway event
        context: Lambda context
        
    Returns:
        API Gateway response
    """
    # Log incoming request
    logger.info(f"Incoming request: {json.dumps(event, default=str)}")
    
    try:
        # Extract user info from authorizer (includes JWT claims)
        user_info = common.get_user_from_event(event)
        user_id = user_info['user_id']
        
        # Extract HTTP method
        http_method = event['requestContext']['http']['method']
        
        if http_method == 'GET':
            return handle_get_profile(user_id, user_info)
        elif http_method == 'PUT':
            return handle_update_profile(event, user_id)
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


def handle_get_profile(user_id: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get current user's profile
    
    Returns user profile with organizations
    Auto-provisions user if profile doesn't exist
    """
    try:
        supabase = get_supabase_client()
        
        # user_id from the handler is the external UID (Clerk/Okta). Find the external identity.
        # Try to find without provider filter first (supports both Clerk and Okta)
        external_identity = common.find_one(
            table='external_identities',
            filters={'external_id': user_id}
        )
        
        profile = None
        if external_identity:
            # If an identity exists, find the corresponding profile.
            profile = common.find_one(
                table='profiles',
                filters={'user_id': external_identity['auth_user_id']},
                select='*'
            )

        # Auto-provision user if profile doesn't exist
        if not profile:
            # Partial redaction: show first/last 4 chars of UID for debugging
            redacted_uid = f"{user_id[:4]}...{user_id[-4:]}" if len(user_id) > 8 else "***"
            logger.info(f"Profile not found for external UID {redacted_uid}, auto-provisioning...")
            profile = auto_provision_user(user_info)
        
        # Get user's organizations (using Supabase user_id)
        # Note: org_members.user_id references auth.users(id), not profiles(id)
        orgs = common.find_many(
            table='org_members',
            filters={'user_id': profile['user_id']},
            select='org_id, role'
        )
        
        # Format response
        result = common.format_record(profile)
        
        # Explicitly map current_org_id to camelCase for frontend
        if 'current_org_id' in profile:
            result['currentOrgId'] = profile['current_org_id']
        
        # Get organization details for each membership
        organizations = []
        for org_membership in orgs:
            org_details = common.find_one(
                table='orgs',
                filters={'id': org_membership['org_id']},
                select='id, name, logo_url'
            )
            
            if org_details:
                organizations.append({
                    'orgId': org_membership['org_id'],
                    'orgName': org_details.get('name', 'Unknown'),
                    'orgSlug': org_details.get('slug', ''),
                    'role': org_membership['role'],
                    'isOwner': org_membership['role'] == 'org_owner',
                    'joinedAt': org_membership.get('joined_at', org_membership.get('created_at')),
                    'logoUrl': org_details.get('logo_url')
                })
        
        result['organizations'] = organizations
        
        return common.success_response(result)
        
    except Exception as e:
        logger.exception(f"Error getting profile: {str(e)}")
        raise


def evaluate_new_user_provisioning(user_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluate how to provision a new user based on:
    1. Pending invite (fast path)
    2. Email domain match (common path)
    3. Platform initialization (fallback - first user ever)
    4. Graceful error (no valid provisioning path)
    
    Args:
        user_info: User info from JWT (user_id, email, name, etc.)
        
    Returns:
        Provisioned profile record
        
    Raises:
        common.ForbiddenError: If user cannot be provisioned
    """
    email = user_info.get('email')
    if not email:
        raise ValueError("Email is required for user provisioning")
    
    domain = email.split('@')[1] if '@' in email else None
    if not domain:
        raise ValueError("Invalid email format")
    
    # Partial redaction for logging
    redacted_email = f"{email[:3]}***@{domain}"
    logger.info(f"EVALUATE_PROVISIONING: {redacted_email}")
    
    # 1. Fast path: Check for pending invite (indexed query)
    invite = common.find_one(
        table='user_invites',
        filters={'email': email, 'status': 'pending'}
    )
    if invite:
        logger.info(f"Found pending invite for {redacted_email}")
        return provision_with_invite(user_info, invite)
    
    # 2. Common path: Check email domain match (indexed query)
    domain_match = common.find_one(
        table='org_email_domains',
        filters={'domain': domain, 'auto_provision': True}
    )
    if domain_match:
        logger.info(f"Found domain match for {domain}")
        return provision_with_domain(user_info, domain_match)
    
    # 3. Rare fallback: First user ever (only runs once)
    profile_count = common.count('profiles')
    if profile_count == 0:
        logger.info(f"First user on platform: {redacted_email}")
        return create_platform_owner_with_org(user_info)
    
    # 4. No valid path - graceful error
    logger.warning(f"Provisioning denied for {redacted_email}: no invite, no domain match, platform already initialized")
    raise common.ForbiddenError(
        "Access denied. Please contact your administrator for an invitation."
    )


def provision_with_invite(user_info: Dict[str, Any], invite: Dict[str, Any]) -> Dict[str, Any]:
    """
    Provision user based on pending invite
    
    Args:
        user_info: User info from JWT
        invite: Invite record from user_invites table
        
    Returns:
        Created profile record
    """
    logger.info(f"Provisioning user with invite: {invite['id']}")
    
    # Create user profile
    profile = create_user_profile(user_info, global_role='global_user')
    
    # Add user to invited org with specified role
    common.insert_one(
        table='org_members',
        data={
            'org_id': invite['org_id'],
            'user_id': profile['user_id'],
            'role': invite['role'],
            'added_by': invite['invited_by']
        }
    )
    
    # Update profile's current_org_id to invited org
    common.update_one(
        table='profiles',
        filters={'id': profile['id']},
        data={'current_org_id': invite['org_id']}
    )
    
    # Mark invite as accepted
    common.update_one(
        table='user_invites',
        filters={'id': invite['id']},
        data={'status': 'accepted'}
    )
    
    logger.info(f"User provisioned with invite, added to org {invite['org_id']}")
    return profile


def provision_with_domain(user_info: Dict[str, Any], domain_match: Dict[str, Any]) -> Dict[str, Any]:
    """
    Provision user based on email domain match
    
    Args:
        user_info: User info from JWT
        domain_match: Domain record from org_email_domains table
        
    Returns:
        Created profile record
    """
    logger.info(f"Provisioning user with domain match: {domain_match['domain']}")
    
    # Create user profile
    profile = create_user_profile(user_info, global_role='global_user')
    
    # Add user to matched org with default role
    common.insert_one(
        table='org_members',
        data={
            'org_id': domain_match['org_id'],
            'user_id': profile['user_id'],
            'role': 'org_user',
            'added_by': None  # Auto-provisioned, no human added them
        }
    )
    
    # Update profile's current_org_id to matched org
    common.update_one(
        table='profiles',
        filters={'id': profile['id']},
        data={'current_org_id': domain_match['org_id']}
    )
    
    logger.info(f"User provisioned with domain match, added to org {domain_match['org_id']}")
    return profile


def create_platform_owner_with_org(user_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create platform owner (first user ever) with default organization
    
    This function only runs ONCE when the platform is first initialized.
    
    Args:
        user_info: User info from JWT
        
    Returns:
        Created profile record
    """
    logger.info("Creating platform owner (first user)")
    
    # Create user profile with platform_owner role
    profile = create_user_profile(user_info, global_role='platform_owner')
    
    # Create default organization
    org_name = user_info.get('name', user_info.get('email', 'Default')).split('@')[0]
    org = common.insert_one(
        table='orgs',
        data={
            'name': f"{org_name}'s Organization",
            'slug': f"{org_name.lower().replace(' ', '-')}-org",
            'owner_id': profile['user_id'],
            'created_by': profile['user_id']
        }
    )
    
    # Add user as org_owner
    common.insert_one(
        table='org_members',
        data={
            'org_id': org['id'],
            'user_id': profile['user_id'],
            'role': 'org_owner',
            'added_by': profile['user_id']
        }
    )
    
    # Update profile's current_org_id to new org
    common.update_one(
        table='profiles',
        filters={'id': profile['id']},
        data={'current_org_id': org['id']}
    )
    
    logger.info(f"Platform owner created with org {org['id']}")
    return profile


def create_user_profile(user_info: Dict[str, Any], global_role: str = 'global_user') -> Dict[str, Any]:
    """
    Create user in auth.users, external_identities, and profiles
    
    This is the core user creation logic extracted from auto_provision_user.
    
    Args:
        user_info: User info from JWT (user_id, email, name, etc.)
        global_role: Global role to assign (default: 'global_user')
        
    Returns:
        Created profile record
    """
    import uuid
    
    # Get Supabase client with service role (admin access)
    supabase = common.get_supabase_client()

    # Extract email and external UID from user_info. These are essential.
    email = user_info.get('email')
    external_uid = user_info.get('user_id')  # External ID from JWT claims (Clerk/Okta)

    if not email or not external_uid:
        raise ValueError("Email and external UID are required for user provisioning.")
    
    # Try to find existing identity without provider filter (supports Clerk and Okta)
    external_identity = common.find_one(
        table='external_identities',
        filters={'external_id': external_uid}
    )
    
    if external_identity:
        # User already exists in auth.users, get their profile
        auth_user_id = external_identity['auth_user_id']
        profile = common.find_one(
            table='profiles',
            filters={'user_id': auth_user_id}
        )
        if profile:
            logger.info(f"Found existing profile for external UID {external_uid}")
            return profile
    
    # Create user in auth.users using Admin API
    try:
        # Generate a random password (user won't use it, they auth via external provider)
        random_password = str(uuid.uuid4())
        
        # Extract name fields from JWT claims
        full_name = user_info.get('name', '')
        first_name = user_info.get('given_name', '')
        last_name = user_info.get('family_name', '')
        
        # Create user via Supabase Admin API
        # Note: Using service_role client which has admin privileges
        auth_response = supabase.auth.admin.create_user({
            "email": email,
            "password": random_password,
            "email_confirm": True,  # Auto-confirm email
            "app_metadata": {
                "provider": "clerk"  # Default to clerk
            },
            "user_metadata": {
                "provider": "clerk",
                "auto_provisioned": True,
                "full_name": full_name,
                "first_name": first_name,
                "last_name": last_name
            }
        })
        
        auth_user_id = auth_response.user.id
        logger.info(f"Created auth.users record: {auth_user_id}")
        
    except Exception as e:
        logger.error(f"Error creating auth.users record: {str(e)}")
        raise
    
    # Create external_identities mapping
    try:
        # Build metadata with all available JWT claims
        metadata = {
            'email': email,
            'name': user_info.get('name', ''),
            'given_name': user_info.get('given_name', ''),
            'family_name': user_info.get('family_name', ''),
            'sub': user_info.get('sub', '')
        }
        
        # Add phone if available
        if user_info.get('phone_number'):
            metadata['phone_number'] = user_info['phone_number']
        
        common.insert_one(
            table='external_identities',
            data={
                'auth_user_id': auth_user_id,
                'external_id': external_uid,  # External ID from JWT (Clerk/Okta)
                'provider_name': 'clerk',  # Default to clerk
                'metadata': metadata
            }
        )
        # Partial redaction for debugging
        redacted_uid = f"{external_uid[:4]}...{external_uid[-4:]}" if len(external_uid) > 8 else "***"
        redacted_email = f"{email[:3]}***@{email.split('@')[-1]}" if email else "***"
        logger.info(f"Created external_identities mapping for external UID {redacted_uid}, email {redacted_email}")
    except Exception as e:
        logger.error(f"Error creating external_identities: {str(e)}")
        # Try to clean up auth.users record
        try:
            supabase.auth.admin.delete_user(auth_user_id)
        except:
            pass
        raise
    
    # Create profile with name fields from JWT
    try:
        # Extract name fields, use email prefix as fallback
        full_name = user_info.get('name', '')
        first_name = user_info.get('given_name', '')
        last_name = user_info.get('family_name', '')
        phone = user_info.get('phone_number', '')
        
        # Build profile data
        profile_data = {
            'user_id': auth_user_id,
            'email': email,
            'full_name': full_name or email.split('@')[0],  # Use full name from JWT or email prefix
            'global_role': global_role,  # Use provided global_role parameter
            # Explicitly set audit fields since service role bypasses auth.uid()
            'created_by': auth_user_id,
            'updated_by': auth_user_id
        }
        
        # Only add phone if it exists in user_info
        if phone:
            profile_data['phone'] = phone
        
        profile = common.insert_one(
            table='profiles',
            data=profile_data
        )
        # Partial redaction for debugging
        redacted_email = f"{email[:3]}***@{email.split('@')[-1]}" if email else "***"
        redacted_name = f"{full_name[:3]}***" if full_name else "***"
        logger.info(f"Created profile for {redacted_email} with name: {redacted_name}, role: {global_role}")
        return profile
    except Exception as e:
        logger.error(f"Error creating profile: {str(e)}")
        # Try to clean up
        try:
            common.delete_one(
                table='external_identities',
                filters={'auth_user_id': auth_user_id}
            )
            supabase.auth.admin.delete_user(auth_user_id)
        except:
            pass
        raise


def auto_provision_user(user_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Auto-provision a new user from external authentication (Clerk/Okta)
    
    This is the main entry point for user provisioning. It evaluates
    how to provision the user based on invites, domain matches, or
    platform initialization status.
    
    Args:
        user_info: User info from JWT (user_id, email, name, etc.)
        
    Returns:
        Created profile record
        
    Raises:
        common.ForbiddenError: If user cannot be provisioned
    """
    import uuid
    
    # Partial redaction: log structure but redact sensitive values
    safe_user_info = {
        'email': f"{user_info.get('email', '')[:3]}***@{user_info.get('email', '').split('@')[-1]}" if user_info.get('email') else None,
        'user_id': f"{user_info.get('user_id', '')[:4]}...{user_info.get('user_id', '')[-4:]}" if user_info.get('user_id') and len(user_info.get('user_id', '')) > 8 else "***",
        'name': f"{user_info.get('name', '')[:3]}***" if user_info.get('name') else None,
        'has_phone': bool(user_info.get('phone_number'))
    }
    logger.info(f"AUTO_PROVISION_USER: Received user_info: {json.dumps(safe_user_info)}")
    
    # Evaluate how to provision this user
    return evaluate_new_user_provisioning(user_info)


def handle_update_profile(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Update current user's profile
    
    Request body:
    {
        "name": "New Name",
        "avatar_url": "https://...",
        "current_org_id": "uuid"
    }
    
    Note: global_role can only be updated by global_admin or global_owner
    """
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    
    # The user_id is the external UID (Clerk/Okta). Get the Supabase user ID.
    supabase_user_id = common.get_supabase_user_id_from_external_uid(user_id)

    # Get the current profile using the Supabase user ID
    current_profile = common.find_one(
        table='profiles',
        filters={'user_id': supabase_user_id}
    )
    
    if not current_profile:
        raise common.NotFoundError('Profile not found')
    
    # Build update data
    update_data = {}
    
    # Allowed fields for regular users
    # Note: Schema has 'full_name' column, not 'name'
    if 'name' in body or 'full_name' in body:
        name = body.get('name') or body.get('full_name')
        if name:
            update_data['full_name'] = common.validate_string_length(
                name, 'name', max_length=255
            )
    
    # Accept both camelCase (from frontend) and snake_case
    if 'avatarUrl' in body or 'avatar_url' in body:
        avatar_url = body.get('avatarUrl') or body.get('avatar_url')
        if avatar_url:
            update_data['avatar_url'] = common.validate_url(avatar_url, 'avatar_url')
    
    # Handle current_org_id update (accept camelCase and snake_case)
    if 'currentOrgId' in body or 'current_org_id' in body:
        current_org_id = body.get('currentOrgId') or body.get('current_org_id')
        # Allow clearing current org by passing null
        if current_org_id is not None:
            # Validate UUID format
            current_org_id = common.validate_uuid(current_org_id, 'current_org_id')
        update_data['current_org_id'] = current_org_id  # None clears selection
    
    # Check if user is trying to update global_role (accept both camelCase and snake_case)
    if 'globalRole' in body or 'global_role' in body:
        global_role_value = body.get('globalRole') or body.get('global_role')
        # Only global_admin or global_owner can update global_role
        if current_profile['global_role'] not in ['global_admin', 'global_owner']:
            raise common.ForbiddenError('Only global admins can update global role')
        
        # Validate new role
        new_role = common.validate_global_role(global_role_value)
        update_data['global_role'] = new_role
    
    # If there's nothing to update, just return the current profile
    if not update_data:
        return common.success_response(common.format_record(current_profile))
    
    try:
        # Update profile using the Supabase user ID
        updated_profile = common.update_one(
            table='profiles',
            filters={'user_id': supabase_user_id},
            data=update_data
        )
        
        return common.success_response(common.format_record(updated_profile))
        
    except Exception as e:
        logger.exception(f"Error updating profile: {str(e)}")
        raise
