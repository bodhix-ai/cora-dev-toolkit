"""
Validators Module
Input validation functions
"""
import re
from typing import Any
from uuid import UUID
from .errors import ValidationError


def validate_uuid(value: Any, field_name: str = "id") -> str:
    """
    Validate UUID format
    
    Args:
        value: Value to validate
        field_name: Field name for error message
        
    Returns:
        Valid UUID string
        
    Raises:
        ValidationError: If value is not a valid UUID
    """
    if not value:
        raise ValidationError(f"{field_name} is required")
    
    try:
        # Try to parse as UUID to validate format
        uuid_obj = UUID(str(value))
        return str(uuid_obj)
    except (ValueError, AttributeError):
        raise ValidationError(f"{field_name} must be a valid UUID")


def validate_email(email: str) -> str:
    """
    Validate email format
    
    Args:
        email: Email address to validate
        
    Returns:
        Valid email string
        
    Raises:
        ValidationError: If email is invalid
    """
    if not email:
        raise ValidationError("Email is required")
    
    # Basic email regex pattern
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(email_pattern, email):
        raise ValidationError("Invalid email format")
    
    return email.lower().strip()


def validate_org_role(role: str) -> str:
    """
    Validate organization role
    
    Args:
        role: Role name to validate
        
    Returns:
        Valid role string
        
    Raises:
        ValidationError: If role is invalid
    """
    valid_roles = ['org_user', 'org_admin', 'org_owner']
    
    if not role:
        raise ValidationError("Role is required")
    
    if role not in valid_roles:
        raise ValidationError(
            f"Invalid org role. Must be one of: {', '.join(valid_roles)}"
        )
    
    return role


def validate_global_role(role: str) -> str:
    """
    Validate global role
    
    Args:
        role: Role name to validate
        
    Returns:
        Valid role string
        
    Raises:
        ValidationError: If role is invalid
    """
    valid_roles = ['global_user', 'global_admin', 'global_owner']
    
    if not role:
        raise ValidationError("Global role is required")
    
    if role not in valid_roles:
        raise ValidationError(
            f"Invalid global role. Must be one of: {', '.join(valid_roles)}"
        )
    
    return role


def validate_required(value: Any, field_name: str) -> Any:
    """
    Validate that a field is present and not empty
    
    Args:
        value: Value to validate
        field_name: Field name for error message
        
    Returns:
        The value if valid
        
    Raises:
        ValidationError: If value is missing or empty
    """
    if value is None or (isinstance(value, str) and not value.strip()):
        raise ValidationError(f"{field_name} is required")
    
    return value


def validate_string_length(
    value: str,
    field_name: str,
    min_length: int = None,
    max_length: int = None
) -> str:
    """
    Validate string length
    
    Args:
        value: String to validate
        field_name: Field name for error message
        min_length: Minimum length (optional)
        max_length: Maximum length (optional)
        
    Returns:
        Valid string
        
    Raises:
        ValidationError: If string length is invalid
    """
    if not isinstance(value, str):
        raise ValidationError(f"{field_name} must be a string")
    
    length = len(value)
    
    if min_length is not None and length < min_length:
        raise ValidationError(
            f"{field_name} must be at least {min_length} characters"
        )
    
    if max_length is not None and length > max_length:
        raise ValidationError(
            f"{field_name} must be no more than {max_length} characters"
        )
    
    return value


def validate_url(url: str, field_name: str = "url") -> str:
    """
    Validate URL format
    
    Args:
        url: URL to validate
        field_name: Field name for error message
        
    Returns:
        Valid URL string
        
    Raises:
        ValidationError: If URL is invalid
    """
    if not url:
        raise ValidationError(f"{field_name} is required")
    
    # Basic URL regex pattern
    url_pattern = r'^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$'
    
    if not re.match(url_pattern, url):
        raise ValidationError(f"Invalid {field_name} format")
    
    return url.strip()


def validate_boolean(value: Any, field_name: str) -> bool:
    """
    Validate and convert to boolean
    
    Args:
        value: Value to validate
        field_name: Field name for error message
        
    Returns:
        Boolean value
        
    Raises:
        ValidationError: If value cannot be converted to boolean
    """
    if isinstance(value, bool):
        return value
    
    if isinstance(value, str):
        lower_value = value.lower()
        if lower_value in ('true', '1', 'yes'):
            return True
        if lower_value in ('false', '0', 'no'):
            return False
    
    if isinstance(value, int):
        return bool(value)
    
    raise ValidationError(f"{field_name} must be a boolean value")


def validate_integer(
    value: Any,
    field_name: str,
    min_value: int = None,
    max_value: int = None
) -> int:
    """
    Validate integer value
    
    Args:
        value: Value to validate
        field_name: Field name for error message
        min_value: Minimum value (optional)
        max_value: Maximum value (optional)
        
    Returns:
        Valid integer
        
    Raises:
        ValidationError: If value is not a valid integer
    """
    try:
        int_value = int(value)
    except (ValueError, TypeError):
        raise ValidationError(f"{field_name} must be an integer")
    
    if min_value is not None and int_value < min_value:
        raise ValidationError(f"{field_name} must be at least {min_value}")
    
    if max_value is not None and int_value > max_value:
        raise ValidationError(f"{field_name} must be no more than {max_value}")
    
    return int_value


def validate_choices(value: Any, field_name: str, choices: list) -> Any:
    """
    Validate value is in allowed choices
    
    Args:
        value: Value to validate
        field_name: Field name for error message
        choices: List of allowed values
        
    Returns:
        Valid value
        
    Raises:
        ValidationError: If value is not in choices
    """
    if value not in choices:
        raise ValidationError(
            f"{field_name} must be one of: {', '.join(str(c) for c in choices)}"
        )
    
    return value
