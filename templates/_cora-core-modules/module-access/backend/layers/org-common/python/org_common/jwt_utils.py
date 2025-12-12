"""
JWT Utilities for Supabase Token Generation
Generates Supabase-compatible JWTs for RLS enforcement
"""
import os
import jwt
import time
from typing import Optional
from .supabase_client import get_secret


def resolve_user_jwt(supabase_user_id: str) -> str:
    """
    Generate a Supabase JWT for the user to enforce Row Level Security (RLS).
    
    This function should be used for all standard organization-level operations
    (KB, Chat, Projects) where RLS policies must be enforced.
    
    Even global admins should use this JWT when performing standard user actions
    within an organization, ensuring they are subject to the same RLS policies
    and filters as regular users.
    
    Platform-level admin operations (which bypass RLS) should be handled by
    separate Lambdas that explicitly use the service role client, not this function.
       
    Args:
        supabase_user_id: The Supabase Auth user ID (UUID)
        
    Returns:
        Signed JWT token string
    """
    return generate_supabase_jwt(supabase_user_id)


def generate_supabase_jwt(supabase_user_id: str, ttl_seconds: int = 3600) -> str:
    """
    Generate a Supabase JWT token for the given user.
    
    This creates a JWT that Supabase/PostgREST can verify using the
    SUPABASE_JWT_SECRET. The JWT enables Row Level Security (RLS) policies
    to be enforced at the database level.
    
    Args:
        supabase_user_id: The Supabase Auth user ID (UUID)
        ttl_seconds: Time-to-live in seconds (default: 3600 = 1 hour)
        
    Returns:
        Signed JWT token string
        
    Raises:
        ValueError: If SUPABASE_SECRET_ARN or SUPABASE_JWT_SECRET is not configured
        Exception: If JWT generation fails
    """
    try:
        # Get Supabase credentials from Secrets Manager
        supabase_secret_arn = os.getenv('SUPABASE_SECRET_ARN')
        if not supabase_secret_arn:
            raise ValueError("SUPABASE_SECRET_ARN environment variable not set")
        
        # Retrieve secret
        secret = get_secret(supabase_secret_arn)
        
        # DEBUG LOGGING
        print(f"DEBUG: Retrieved secret from {supabase_secret_arn}")
        print(f"DEBUG: Secret keys present: {list(secret.keys())}")
        
        supabase_jwt_secret = secret.get('SUPABASE_JWT_SECRET')
        
        if not supabase_jwt_secret:
            print(f"ERROR: SUPABASE_JWT_SECRET missing. Available keys: {list(secret.keys())}")
            raise ValueError("SUPABASE_JWT_SECRET not found in secret")
        
        # Build JWT payload (matches Supabase Auth token format)
        current_time = int(time.time())
        payload = {
            "sub": supabase_user_id,     # Subject: Supabase user ID
            "role": "authenticated",      # Role for RLS policies
            "aud": "authenticated",       # Audience (required by Supabase)
            "iat": current_time,          # Issued at
            "exp": current_time + ttl_seconds,  # Expiry time
        }
        
        # Sign JWT with Supabase JWT secret using HS256
        # (Supabase uses HS256 for JWT signing, not RS256)
        user_jwt = jwt.encode(payload, supabase_jwt_secret, algorithm="HS256")
        
        return user_jwt
        
    except Exception as e:
        print(f"Failed to generate Supabase JWT: {str(e)}")
        raise


def extract_jwt_from_headers(event: dict) -> Optional[str]:
    """
    Extract JWT token from Authorization header in API Gateway event.
    
    Args:
        event: API Gateway event
        
    Returns:
        JWT token string (without 'Bearer ' prefix) if present, None otherwise
    """
    try:
        headers = event.get('headers', {})
        
        # Get authorization header (case-insensitive)
        auth_header = None
        for key, value in headers.items():
            if key.lower() == 'authorization':
                auth_header = value
                break
        
        if not auth_header:
            return None
        
        # Extract token from "Bearer <token>" format
        if auth_header.startswith('Bearer '):
            return auth_header[7:]  # Remove "Bearer " prefix
        
        return auth_header
        
    except Exception as e:
        print(f"Failed to extract JWT from headers: {str(e)}")
