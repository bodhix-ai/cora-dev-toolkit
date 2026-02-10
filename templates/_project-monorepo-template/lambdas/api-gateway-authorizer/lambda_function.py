"""
API Gateway Lambda Authorizer for {{PROJECT_NAME}}

Multi-provider JWT validation supporting Clerk and Okta.
Validates JWT tokens and injects user context for downstream Lambdas.

Environment Variables:
    PROVIDER: Authentication provider ("clerk" or "okta")
    CLERK_ISSUER: Clerk JWT issuer URL
    CLERK_AUDIENCE: Clerk JWT audience
    OKTA_ISSUER: Okta JWT issuer URL  
    OKTA_AUDIENCE: Okta JWT audience
    LOG_LEVEL: Logging level (default: INFO)
    ENVIRONMENT: Deployment environment
"""

import json
import logging
import os
import urllib.request
from typing import Any

import jwt
from jwt import PyJWKClient

# Configure logging
log_level = os.environ.get("LOG_LEVEL", "INFO")
logging.basicConfig(level=getattr(logging, log_level))
logger = logging.getLogger(__name__)

# Provider configuration
PROVIDER = os.environ.get("PROVIDER", "clerk")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "dev")

# Clerk configuration
CLERK_ISSUER = os.environ.get("CLERK_ISSUER", "")
CLERK_AUDIENCE = os.environ.get("CLERK_AUDIENCE", "")

# Okta configuration
OKTA_ISSUER = os.environ.get("OKTA_ISSUER", "")
OKTA_AUDIENCE = os.environ.get("OKTA_AUDIENCE", "")

# JWKS client cache
_jwks_client = None


def get_jwks_client() -> PyJWKClient:
    """Get or create JWKS client for token verification."""
    global _jwks_client
    
    if _jwks_client is None:
        if PROVIDER == "clerk":
            jwks_url = f"{CLERK_ISSUER}/.well-known/jwks.json"
        else:  # okta
            jwks_url = f"{OKTA_ISSUER}/v1/keys"
        
        logger.info(f"Initializing JWKS client for {PROVIDER}: {jwks_url}")
        _jwks_client = PyJWKClient(jwks_url)
    
    return _jwks_client


def extract_token(event: dict) -> str | None:
    """Extract JWT token from Authorization header."""
    headers = event.get("headers", {})
    
    # Handle case-insensitive headers
    auth_header = headers.get("authorization") or headers.get("Authorization", "")
    
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    
    return None


def validate_token(token: str) -> dict:
    """Validate JWT token and return claims."""
    jwks_client = get_jwks_client()
    
    # Get signing key from JWKS
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    
    # Configure validation based on provider
    if PROVIDER == "clerk":
        options = {
            "verify_signature": True,
            "verify_exp": True,
            "verify_iat": True,
            "verify_aud": bool(CLERK_AUDIENCE),
        }
        audience = CLERK_AUDIENCE if CLERK_AUDIENCE else None
        issuer = CLERK_ISSUER
    else:  # okta
        options = {
            "verify_signature": True,
            "verify_exp": True,
            "verify_iat": True,
            "verify_aud": bool(OKTA_AUDIENCE),
        }
        audience = OKTA_AUDIENCE if OKTA_AUDIENCE else None
        issuer = OKTA_ISSUER
    
    # Decode and validate token
    claims = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=audience,
        issuer=issuer,
        options=options,
    )
    
    return claims


def build_policy(effect: str, resource: str, context: dict = None) -> dict:
    """Build IAM policy document for API Gateway."""
    policy = {
        "principalId": context.get("user_id", "user") if context else "user",
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "execute-api:Invoke",
                    "Effect": effect,
                    "Resource": resource,
                }
            ],
        },
    }
    
    if context:
        policy["context"] = context
    
    return policy


def extract_user_context(claims: dict) -> dict:
    """Extract user context from JWT claims for downstream Lambdas."""
    context = {
        "user_id": claims.get("sub", ""),
        "environment": ENVIRONMENT,
        "provider": PROVIDER,
    }
    
    # Clerk-specific claims
    if PROVIDER == "clerk":
        context.update({
            "email": claims.get("email", ""),
            "org_id": claims.get("org_id", ""),
            "org_role": claims.get("org_role", ""),
            "org_slug": claims.get("org_slug", ""),
            "session_id": claims.get("sid", ""),
        })
    
    # Okta-specific claims
    elif PROVIDER == "okta":
        # For Okta, email might be in 'email' claim or 'sub' claim (if sub is an email)
        # Name might be in 'name', or we can construct from given_name + family_name
        email = claims.get("email") or claims.get("sub", "")
        name = claims.get("name") or f"{claims.get('given_name', '')} {claims.get('family_name', '')}".strip()
        
        context.update({
            "email": email,
            "name": name,
            "groups": ",".join(claims.get("groups", [])),
        })
    
    # Filter out empty values (API Gateway context doesn't accept empty strings)
    return {k: v for k, v in context.items() if v}


def lambda_handler(event: dict, context: Any) -> dict:
    """
    Lambda authorizer handler.
    
    Args:
        event: API Gateway authorizer event
        context: Lambda context
    
    Returns:
        IAM policy document allowing or denying access
    """
    logger.debug(f"Authorizer event: {json.dumps(event, default=str)}")
    
    try:
        # Extract token from request
        token = extract_token(event)
        
        if not token:
            logger.warning("No token found in Authorization header")
            raise Exception("Unauthorized")
        
        # Validate token
        claims = validate_token(token)
        logger.info(f"Token validated for user: {claims.get('sub', 'unknown')}")
        
        # Extract user context
        user_context = extract_user_context(claims)
        
        # Build allow policy with user context
        method_arn = event.get("methodArn", event.get("routeArn", "*"))
        # Allow all methods and paths on this API
        # Extract API ARN (format: arn:aws:execute-api:region:account:api-id/stage/method/path)
        api_parts = method_arn.split("/")
        api_arn = "/".join(api_parts[:2])  # Get arn:...:api-id/stage
        resource = f"{api_arn}/*/*"  # Allow all methods and paths
        
        policy = build_policy("Allow", resource, user_context)
        logger.debug(f"Generated policy: {json.dumps(policy, default=str)}")
        
        return policy
        
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        raise Exception("Unauthorized")
    
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        raise Exception("Unauthorized")
    
    except Exception as e:
        logger.error(f"Authorization error: {e}")
        raise Exception("Unauthorized")
