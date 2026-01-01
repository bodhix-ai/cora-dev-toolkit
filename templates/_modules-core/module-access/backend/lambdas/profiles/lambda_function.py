"""
Profiles Lambda Function
Handles user profile operations
"""
import json
import logging
from typing import Optional, Dict, Any
import org_common as common
from org_common.supabase_client import get_supabase_client

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def detect_auth_provider(user_info: Dict[str, Any]) -> str:
    """
    Detect the authentication provider from JWT claims.
    
    Args:
        user_info: User info from JWT claims
        
    Returns:
        'okta' or 'clerk' based on JWT claim patterns
    """
    # First, check if provider was explicitly passed from authorizer
    if user_info.get('provider'):
        return user_info['provider']
    
    # Fallback: Detect from JWT claims
    # Okta JWTs typically have 'iss' (issuer) with okta domain
    issuer = user_info.get('iss', '')
    if 'okta' in issuer.lower():
        return 'okta'
    
    # Okta also uses 'ver' claim with value '1'
    if user_info.get('ver') == '1':
        return 'okta'
    
    # Clerk JWTs have 'azp' (authorized party) claim
    if 'azp' in user_info:
        return 'clerk'
    
    # Default to okta if unable to detect
    logger.warning(f"Unable to detect auth provider from JWT claims, defaulting to okta. Claims: {list(user_info.keys())}")
    return 'okta'



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
    Handle profile operations
    
    Endpoints:
    - GET /profiles/me - Get current user's profile
    - PUT /profiles/me - Update current user's profile
    - POST /profiles/me/login - Handle user login
    - POST /profiles/me/logout - End current user session
    
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
        
        # Extract HTTP method and path
        http_method = event['requestContext']['http']['method']
        http_path = event['requestContext']['http']['path']
        
        if http_method == 'GET' and http_path.endswith('/me'):
            return handle_get_profile(user_id, user_info, event)
        elif http_method == 'PUT' and http_path.endswith('/me'):
            return handle_update_profile(event, user_id)
        elif http_method == 'POST' and http_path.endswith('/login'):
            return handle_login(user_id, event)
        elif http_method == 'POST' and http_path.endswith('/logout'):
            return handle_logout(user_id)
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


def extract_request_context(event: Dict[str, Any]) -> Dict[str, str]:
    """
    Extract IP address and user agent from API Gateway event
    
    Args:
        event: API Gateway event
        
    Returns:
        Dict with ip_address and user_agent
    """
    try:
        ip_address = event.get('requestContext', {}).get('http', {}).get('sourceIp', None)
        user_agent = event.get('requestContext', {}).get('http', {}).get('userAgent', None)
        return {
            'ip_address': ip_address,
            'user_agent': user_agent
        }
    except Exception as e:
        logger.warning(f"Failed to extract request context: {str(e)}")
        return {
            'ip_address': None,
            'user_agent': None
        }


def handle_get_profile(user_id: str, user_info: Dict[str, Any], event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get current user's profile
    
    Returns user profile with organizations
    Auto-provisions user if profile doesn't exist
    Starts a new session if user is being provisioned
    """
    try:
        supabase = get_supabase_client()
        
        # user_id from the handler is the external UID (Clerk/Okta). Find the external identity.
        # Try to find without provider filter first (supports both Clerk and Okta)
        external_identity = common.find_one(
            table='user_auth_ext_ids',
            filters={'external_id': user_id}
        )
        
        profile = None
        if external_identity:
            # If an identity exists, find the corresponding profile.
            profile = common.find_one(
                table='user_profiles',
                filters={'user_id': external_identity['auth_user_id']},
                select='*'
            )

        # Auto-provision user if profile doesn't exist
        if not profile:
            # Partial redaction: show first/last 4 chars of UID for debugging
            redacted_uid = f"{user_id[:4]}...{user_id[-4:]}" if len(user_id) > 8 else "***"
            logger.info(f"Profile not found for external UID {redacted_uid}, auto-provisioning...")
            # Extract request context for session tracking
            request_context = extract_request_context(event)
            profile = auto_provision_user(user_info, request_context)
        
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
    else:
        logger.info(f"No pending invite found for {redacted_email}")
    
    # 2. Common path: Check email domain match (indexed query)
    domain_match = common.find_one(
        table='org_email_domains',
        filters={'domain': domain, 'auto_provision': True}
    )
    if domain_match:
        logger.info(f"Found domain match for {domain}")
        return provision_with_domain(user_info, domain_match)
    else:
        logger.info(f"No email domain match found for {domain}")
    
    # 3. Rare fallback: First user ever (only runs once)
    # Check for existing platform_owner instead of counting user_profiles
    platform_owner = common.find_one(
        table='user_profiles',
        filters={'global_role': 'platform_owner'}
    )
    if not platform_owner:
        logger.info(f"No platform_owner exists - bootstrap condition met for {redacted_email}")
        return create_platform_owner_with_org(user_info)
    else:
        logger.info(f"Platform already initialized (platform_owner exists)")
    
    # 4. No valid path - create profile with requires_invitation flag
    logger.warning(f"Provisioning denied for {redacted_email}: no invite, no domain match, platform already initialized")
    return create_user_profile(user_info, global_role='platform_user', requires_invitation=True)


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
    profile = create_user_profile(user_info, global_role='platform_user')
    
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
        table='user_profiles',
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
    
    # Log auth event
    try:
        common.rpc('log_auth_event', {
            'p_event_type': 'provisioning_invited',
            'p_user_email': profile['email'],
            'p_user_id': profile['user_id'],
            'p_org_id': invite['org_id'],
            'p_metadata': {'invite_id': invite['id'], 'role': invite['role']}
        })
    except Exception as e:
        logger.warning(f"Failed to log provisioning_invited event: {str(e)}")
    
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
    profile = create_user_profile(user_info, global_role='platform_user')
    
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
        table='user_profiles',
        filters={'id': profile['id']},
        data={'current_org_id': domain_match['org_id']}
    )
    
    logger.info(f"User provisioned with domain match, added to org {domain_match['org_id']}")
    
    # Log auth event
    try:
        common.rpc('log_auth_event', {
            'p_event_type': 'provisioning_domain',
            'p_user_email': profile['email'],
            'p_user_id': profile['user_id'],
            'p_org_id': domain_match['org_id'],
            'p_metadata': {'domain': domain_match['domain']}
        })
    except Exception as e:
        logger.warning(f"Failed to log provisioning_domain event: {str(e)}")
    
    return profile


def create_platform_owner_with_org(user_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create platform owner (first user ever) with Platform Admin organization
    
    This function only runs ONCE when the platform is first initialized.
    Creates the "Platform Admin" organization for platform administration.
    
    Args:
        user_info: User info from JWT
        
    Returns:
        Created profile record
    """
    logger.info("Creating platform owner (first user - bootstrap)")
    
    # Create user profile with platform_owner role
    profile = create_user_profile(user_info, global_role='platform_owner')
    
    # Create Platform Admin organization (required for UI org context)
    org = common.insert_one(
        table='orgs',
        data={
            'name': 'Platform Admin',
            'slug': 'platform-admin',
            'owner_id': profile['user_id'],
            'created_by': profile['user_id'],
            'updated_by': profile['user_id']
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
        table='user_profiles',
        filters={'id': profile['id']},
        data={'current_org_id': org['id']}
    )
    
    logger.info(f"Bootstrap complete: Platform owner created with Platform Admin org {org['id']}")
    
    # Log auth event
    try:
        common.rpc('log_auth_event', {
            'p_event_type': 'bootstrap_created',
            'p_user_email': profile['email'],
            'p_user_id': profile['user_id'],
            'p_org_id': org['id'],
            'p_metadata': {'org_name': 'Platform Admin', 'org_slug': 'platform-admin'}
        })
    except Exception as e:
        logger.warning(f"Failed to log bootstrap event: {str(e)}")
    
    return profile


def create_user_profile(user_info: Dict[str, Any], global_role: str = 'platform_user', requires_invitation: bool = False) -> Dict[str, Any]:
    """
    Create user in auth.users, user_auth_ext_ids, and user_profiles
    
    This is the core user creation logic extracted from auto_provision_user.
    
    Args:
        user_info: User info from JWT (user_id, email, name, etc.)
        global_role: Global role to assign (default: 'global_user')
        requires_invitation: Set to True if user was denied auto-provisioning
        
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
    
    # Detect auth provider from JWT claims
    provider_name = detect_auth_provider(user_info)
    
    # Try to find existing identity without provider filter (supports Clerk and Okta)
    external_identity = common.find_one(
        table='user_auth_ext_ids',
        filters={'external_id': external_uid}
    )
    
    if external_identity:
        # User already exists in auth.users, get their profile
        auth_user_id = external_identity['auth_user_id']
        profile = common.find_one(
            table='user_profiles',
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
                "provider": provider_name
            },
            "user_metadata": {
                "provider": provider_name,
                "auto_provisioned": True,
                "full_name": full_name,
                "first_name": first_name,
                "last_name": last_name
            }
        })
        
        auth_user_id = auth_response.user.id
        logger.info(f"Created auth.users record: {auth_user_id} with provider: {provider_name}")
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error creating auth.users record: {error_msg}")
        
        # Detect orphaned user scenario (user exists in auth.users but not in public tables)
        if "already been registered" in error_msg.lower():
            logger.error(f"ORPHANED USER DETECTED: Email {email} exists in auth.users but has no user_auth_ext_ids or user_profiles records.")
            logger.error("This usually happens when public tables are reset but auth.users is not cleaned up.")
            logger.error("To fix: DELETE FROM auth.users WHERE email = '{email}' OR run drop-all-schema-objects.sql before setup-database.sql")
        
        raise
    
    # Create user_auth_ext_ids mapping
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
            table='user_auth_ext_ids',
            data={
                'auth_user_id': auth_user_id,
                'external_id': external_uid,  # External ID from JWT (Clerk/Okta)
                'provider_name': provider_name,  # Detected from JWT claims
                'metadata': metadata
            }
        )
        # Partial redaction for debugging
        redacted_uid = f"{external_uid[:4]}...{external_uid[-4:]}" if len(external_uid) > 8 else "***"
        redacted_email = f"{email[:3]}***@{email.split('@')[-1]}" if email else "***"
        logger.info(f"Created user_auth_ext_ids mapping for external UID {redacted_uid}, email {redacted_email}, provider: {provider_name}")
    except Exception as e:
        logger.error(f"Error creating user_auth_ext_ids: {str(e)}")
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
            'requires_invitation': requires_invitation,  # Flag for denied access users
            # Explicitly set audit fields since service role bypasses auth.uid()
            'created_by': auth_user_id,
            'updated_by': auth_user_id
        }
        
        # Only add phone if it exists in user_info
        if phone:
            profile_data['phone'] = phone
        
        profile = common.insert_one(
            table='user_profiles',
            data=profile_data
        )
        # Partial redaction for debugging
        redacted_email = f"{email[:3]}***@{email.split('@')[-1]}" if email else "***"
        redacted_name = f"{full_name[:3]}***" if full_name else "***"
        logger.info(f"Created profile for {redacted_email} with name: {redacted_name}, role: {global_role}, requires_invitation: {requires_invitation}")
        
        # Log auth event for denied access
        if requires_invitation:
            try:
                common.rpc('log_auth_event', {
                    'p_event_type': 'provisioning_denied',
                    'p_user_email': email,
                    'p_user_id': auth_user_id,
                    'p_failure_reason': 'No invitation or domain match found'
                })
            except Exception as e:
                logger.warning(f"Failed to log provisioning_denied event: {str(e)}")
        
        return profile
    except Exception as e:
        logger.error(f"Error creating profile: {str(e)}")
        # Try to clean up
        try:
            common.delete_one(
                table='user_auth_ext_ids',
                filters={'auth_user_id': auth_user_id}
            )
            supabase.auth.admin.delete_user(auth_user_id)
        except:
            pass
        raise


def auto_provision_user(user_info: Dict[str, Any], request_context: Dict[str, str]) -> Dict[str, Any]:
    """
    Auto-provision a new user from external authentication (Clerk/Okta)
    
    This is the main entry point for user provisioning. It evaluates
    how to provision the user based on invites, domain matches, or
    platform initialization status.
    
    Args:
        user_info: User info from JWT (user_id, email, name, etc.)
        request_context: Request context (ip_address, user_agent)
        
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
    profile = evaluate_new_user_provisioning(user_info)
    
    # Start a new session for the newly provisioned user
    try:
        session_id = common.rpc('start_user_session', {
            'p_user_id': profile['user_id'],
            'p_org_id': profile.get('current_org_id'),
            'p_ip_address': request_context.get('ip_address'),
            'p_user_agent': request_context.get('user_agent'),
            'p_metadata': {
                'provisioning_type': 'auto_provision',
                'global_role': profile.get('global_role')
            }
        })
        logger.info(f"Started session {session_id} for user {profile['user_id']}")
    except Exception as e:
        logger.warning(f"Failed to start user session: {str(e)}")
    
    return profile


def handle_login(user_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle user login - create session and log event
    
    This endpoint should be called by the frontend after successful NextAuth login.
    It creates a new user session and logs a login_success event.
    
    Args:
        user_id: External user ID (Clerk/Okta)
        event: API Gateway event (for IP/user agent)
        
    Returns:
        Success response with session ID
    """
    try:
        # Get the Supabase user ID from external UID
        supabase_user_id = common.get_supabase_user_id_from_external_uid(user_id)
        
        # Get user's profile to find their current org
        profile = common.find_one(
            table='user_profiles',
            filters={'user_id': supabase_user_id}
        )
        
        if not profile:
            raise common.NotFoundError('Profile not found')
        
        # Extract request context
        request_context = extract_request_context(event)
        
        # Start a new session
        session_id = None
        try:
            session_id = common.rpc('start_user_session', {
                'p_user_id': supabase_user_id,
                'p_org_id': profile.get('current_org_id'),
                'p_ip_address': request_context.get('ip_address'),
                'p_user_agent': request_context.get('user_agent'),
                'p_metadata': {
                    'login_type': 'manual',
                    'global_role': profile.get('global_role')
                }
            })
            logger.info(f"Started session {session_id} for user {supabase_user_id}")
        except Exception as e:
            logger.warning(f"Failed to start user session: {str(e)}")
        
        # Log login event
        try:
            common.rpc('log_auth_event', {
                'p_event_type': 'login_success',
                'p_user_email': profile.get('email'),
                'p_user_id': supabase_user_id,
                'p_org_id': profile.get('current_org_id'),
                'p_ip_address': request_context.get('ip_address'),
                'p_user_agent': request_context.get('user_agent')
            })
        except Exception as e:
            logger.warning(f"Failed to log login event: {str(e)}")
        
        return common.success_response({
            'message': 'Login successful',
            'session_id': session_id,
            'user_id': supabase_user_id
        })
        
    except Exception as e:
        logger.exception(f"Error handling login: {str(e)}")
        raise


def handle_logout(user_id: str) -> Dict[str, Any]:
    """
    End current user's active sessions
    
    Marks all active sessions as ended for the user.
    This is called when the user explicitly logs out.
    
    Args:
        user_id: External user ID (Clerk/Okta)
        
    Returns:
        Success response with session count
    """
    try:
        # Get the Supabase user ID from external UID
        supabase_user_id = common.get_supabase_user_id_from_external_uid(user_id)
        
        # End all active sessions for this user
        # Note: We update all sessions where ended_at IS NULL
        ended_count = 0
        try:
            # Get all active sessions
            active_sessions = common.find_many(
                table='user_sessions',
                filters={'user_id': supabase_user_id, 'ended_at': None}
            )
            
            # End each session
            for session in active_sessions:
                try:
                    common.rpc('end_user_session', {
                        'p_session_id': session['id']
                    })
                    ended_count += 1
                except Exception as e:
                    logger.warning(f"Failed to end session {session['id']}: {str(e)}")
            
            logger.info(f"Ended {ended_count} active session(s) for user {supabase_user_id}")
        except Exception as e:
            logger.warning(f"Failed to end user sessions: {str(e)}")
        
        # Log logout event
        try:
            common.rpc('log_auth_event', {
                'p_event_type': 'logout',
                'p_user_id': supabase_user_id
            })
        except Exception as e:
            logger.warning(f"Failed to log logout event: {str(e)}")
        
        return common.success_response({
            'message': 'Logout successful',
            'sessions_ended': ended_count
        })
        
    except Exception as e:
        logger.exception(f"Error handling logout: {str(e)}")
        raise


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
        table='user_profiles',
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
        # Only platform_admin or platform_owner can update global_role
        if current_profile['global_role'] not in ['platform_admin', 'platform_owner']:
            raise common.ForbiddenError('Only platform admins can update global role')
        
        # Validate new role
        new_role = common.validate_global_role(global_role_value)
        update_data['global_role'] = new_role
    
    # If there's nothing to update, just return the current profile
    if not update_data:
        return common.success_response(common.format_record(current_profile))
    
    try:
        # Update profile using the Supabase user ID
        updated_profile = common.update_one(
            table='user_profiles',
            filters={'user_id': supabase_user_id},
            data=update_data
        )
        
        return common.success_response(common.format_record(updated_profile))
        
    except Exception as e:
        logger.exception(f"Error updating profile: {str(e)}")
        raise
