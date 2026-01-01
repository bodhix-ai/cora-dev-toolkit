"""
Supabase Client Module
Handles Supabase connection with secrets management
"""
import os
import json
import boto3
from typing import Dict, Any, Optional
from supabase import create_client, Client

# Cache for secrets and client
_secrets_cache: Dict[str, Any] = {}
_client_cache: Optional[Client] = None


def get_secret(secret_arn: str) -> Dict[str, Any]:
    """
    Retrieve secret from AWS Secrets Manager
    
    Args:
        secret_arn: ARN of the secret in Secrets Manager
        
    Returns:
        Dictionary containing secret values
        
    Raises:
        ValueError: If secret_arn is not provided
        Exception: If secret retrieval fails
    """
    if not secret_arn:
        raise ValueError("Secret ARN not provided")
    
    # Check cache
    if secret_arn in _secrets_cache:
        return _secrets_cache[secret_arn]
    
    try:
        region = os.getenv('REGION', 'us-east-1')
        client = boto3.client('secretsmanager', region_name=region)
        
        response = client.get_secret_value(SecretId=secret_arn)
        secret_dict = json.loads(response['SecretString'])
        
        # Cache the secret
        _secrets_cache[secret_arn] = secret_dict
        
        return secret_dict
        
    except Exception as e:
        # Partial redaction of ARN for security (hide account ID and full secret name)
        # ARN format: arn:aws:secretsmanager:region:account-id:secret:name-random
        arn_parts = secret_arn.split(':')
        if len(arn_parts) >= 6:
            # Show service and redact account ID and partial secret name
            redacted_arn = f"{arn_parts[0]}:{arn_parts[1]}:{arn_parts[2]}:{arn_parts[3]}:***:secret:***{arn_parts[-1][-6:]}"
        else:
            redacted_arn = "***"
        print(f"Failed to retrieve secret from {redacted_arn}: {str(e)}")
        raise


def get_supabase_client(user_jwt: Optional[str] = None) -> Client:
    """
    Get Supabase client instance
    
    Args:
        user_jwt: Optional JWT token for RLS (from authorizer)
                 If provided, will be used for row-level security
                 If not provided, uses service role key (bypasses RLS)
    
    Returns:
        Supabase client instance
        
    Raises:
        ValueError: If required environment variables are missing
        Exception: If client creation fails
    """
    # Get Supabase credentials from Secrets Manager
    supabase_secret_arn = os.getenv('SUPABASE_SECRET_ARN')
    if not supabase_secret_arn:
        raise ValueError("SUPABASE_SECRET_ARN environment variable not set")
    
    try:
        # Retrieve secret
        secret = get_secret(supabase_secret_arn)
        supabase_url = secret.get('SUPABASE_URL')
        supabase_key = secret.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase URL or service role key not found in secret")
        
        # If user JWT is provided, use it for RLS
        # Otherwise, use service role key (bypasses RLS)
        if user_jwt:
            # Create client with user JWT for RLS enforcement
            client = create_client(supabase_url, supabase_key)
            # Set the user's JWT token for RLS
            client.postgrest.auth(user_jwt)
            return client
        else:
            # Use cached service role client if available
            global _client_cache
            if _client_cache is None:
                _client_cache = create_client(supabase_url, supabase_key)
            return _client_cache
            
    except Exception as e:
        print(f"Failed to create Supabase client: {str(e)}")
        raise


def get_user_jwt_from_event(event: Dict[str, Any]) -> Optional[str]:
    """
    Extract user JWT token from API Gateway event
    
    Args:
        event: API Gateway event
        
    Returns:
        JWT token string if present, None otherwise
    """
    try:
        # JWT token is in the authorizer context
        # The Lambda authorizer should pass it through
        auth_context = event.get('requestContext', {}).get('authorizer', {})
        
        # Try to get the token from the authorizer
        # The authorizer may store it under different keys
        jwt_token = auth_context.get('jwt') or auth_context.get('token')
        
        return jwt_token
        
    except Exception as e:
        print(f"Failed to extract JWT from event: {str(e)}")
        return None


def get_user_from_event(event: Dict[str, Any]) -> Dict[str, str]:
    """
    Extract user information from API Gateway event
    
    Args:
        event: API Gateway event
        
    Returns:
        Dictionary with user_id, email, name, etc.
        
    Raises:
        KeyError: If user information is not found in event
    """
    try:
        # Extract from authorizer context (HTTP API v2 format)
        authorizer = event['requestContext']['authorizer']
        
        # Handle different authorizer formats
        if 'lambda' in authorizer:
            # Custom Lambda authorizer format (from our JWT authorizer)
            lambda_context = authorizer['lambda']
            user_id = lambda_context.get('user_id', '')
            email = lambda_context.get('email', '')
            name = lambda_context.get('name', '')
            given_name = lambda_context.get('given_name', '')
            family_name = lambda_context.get('family_name', '')
            phone_number = lambda_context.get('phone_number', '')
        else:
            # Direct format (fallback)
            user_id = authorizer.get('user_id', authorizer.get('sub', ''))
            email = authorizer.get('email', authorizer.get('username', ''))
            name = authorizer.get('name', '')
            given_name = authorizer.get('given_name', '')
            family_name = authorizer.get('family_name', '')
            phone_number = authorizer.get('phone_number', '')
        
        if not user_id:
            raise KeyError("user_id not found in authorizer context")
        
        return {
            'user_id': user_id,
            'email': email,
            'name': name,
            'given_name': given_name,
            'family_name': family_name,
            'phone_number': phone_number,
            'provider': lambda_context.get('provider', '') if 'lambda' in authorizer else authorizer.get('provider', '')
        }
        
    except KeyError as e:
        print(f"Failed to extract user from event: {str(e)}")
        print(f"Event structure: {json.dumps(event, default=str)}")
        raise KeyError(f"User information not found in authorizer context: {str(e)}")
