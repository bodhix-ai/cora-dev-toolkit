"""
API Response Transformation Utilities

Provides utilities for transforming database records (snake_case) to 
API responses (camelCase) per CORA API standards.

Usage:
    from org_common import snake_to_camel, transform_record, transform_records
    
    # Transform a single record
    api_response = transform_record(db_record)
    
    # Transform with nested field handling
    api_response = transform_record(db_record, nested_transforms={
        'config_value': transform_warming_config
    })
"""

import re
from typing import Any, Dict, List, Callable, Optional, Union


def snake_to_camel(snake_str: str) -> str:
    """
    Convert snake_case string to camelCase.
    
    Args:
        snake_str: String in snake_case format
        
    Returns:
        String in camelCase format
        
    Examples:
        >>> snake_to_camel('user_id')
        'userId'
        >>> snake_to_camel('created_at')
        'createdAt'
        >>> snake_to_camel('weekly_schedule')
        'weeklySchedule'
    """
    if not snake_str or '_' not in snake_str:
        return snake_str
    
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def camel_to_snake(camel_str: str) -> str:
    """
    Convert camelCase string to snake_case.
    
    Args:
        camel_str: String in camelCase format
        
    Returns:
        String in snake_case format
        
    Examples:
        >>> camel_to_snake('userId')
        'user_id'
        >>> camel_to_snake('createdAt')
        'created_at'
    """
    if not camel_str:
        return camel_str
    
    # Insert underscore before uppercase letters and convert to lowercase
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', camel_str)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


def transform_record(
    data: Dict[str, Any],
    nested_transforms: Optional[Dict[str, Callable]] = None,
    exclude_keys: Optional[List[str]] = None,
    include_only: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Transform a database record from snake_case to camelCase.
    
    Recursively transforms all keys in the record and any nested dicts/lists.
    
    Args:
        data: Database record with snake_case keys
        nested_transforms: Optional dict of {key: transform_function} for custom
                          handling of specific nested fields
        exclude_keys: Keys to exclude from the output
        include_only: If provided, only include these keys (after transformation)
        
    Returns:
        Record with camelCase keys
        
    Example:
        >>> transform_record({'user_id': '123', 'created_at': '2024-01-01'})
        {'userId': '123', 'createdAt': '2024-01-01'}
        
        >>> transform_record(
        ...     {'config_value': {'weekly_schedule': {...}}},
        ...     nested_transforms={'config_value': transform_warming_config}
        ... )
    """
    if not isinstance(data, dict):
        return data
    
    exclude_keys = exclude_keys or []
    nested_transforms = nested_transforms or {}
    
    result = {}
    
    for key, value in data.items():
        # Skip excluded keys
        if key in exclude_keys:
            continue
        
        # Transform the key to camelCase
        camel_key = snake_to_camel(key)
        
        # Apply custom transform for specific fields
        if key in nested_transforms:
            result[camel_key] = nested_transforms[key](value)
        # Recursively transform nested dicts
        elif isinstance(value, dict):
            result[camel_key] = transform_record(value)
        # Recursively transform lists of dicts
        elif isinstance(value, list):
            result[camel_key] = [
                transform_record(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            result[camel_key] = value
    
    # Filter to only include specific keys if specified
    if include_only:
        result = {k: v for k, v in result.items() if k in include_only}
    
    return result


def transform_records(
    records: List[Dict[str, Any]],
    nested_transforms: Optional[Dict[str, Callable]] = None,
    exclude_keys: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Transform a list of database records from snake_case to camelCase.
    
    Args:
        records: List of database records with snake_case keys
        nested_transforms: Optional dict of {key: transform_function}
        exclude_keys: Keys to exclude from the output
        
    Returns:
        List of records with camelCase keys
    """
    return [
        transform_record(record, nested_transforms, exclude_keys)
        for record in records
    ]


def transform_input(
    data: Dict[str, Any],
    field_mapping: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Transform API input from camelCase to snake_case for database storage.
    
    Accepts both camelCase and snake_case input for flexibility,
    but always outputs snake_case for database operations.
    
    Args:
        data: Input data (may have camelCase or snake_case keys)
        field_mapping: Optional explicit mapping of {inputKey: outputKey}
                      Useful when API names differ from DB column names
        
    Returns:
        Data with snake_case keys ready for database
        
    Example:
        >>> transform_input({'userId': '123', 'createdAt': '2024-01-01'})
        {'user_id': '123', 'created_at': '2024-01-01'}
        
        >>> transform_input(
        ...     {'navLabelSingular': 'Project'},
        ...     field_mapping={'navLabelSingular': 'nav_label_singular'}
        ... )
        {'nav_label_singular': 'Project'}
    """
    if not isinstance(data, dict):
        return data
    
    field_mapping = field_mapping or {}
    result = {}
    
    for key, value in data.items():
        # Use explicit mapping if provided
        if key in field_mapping:
            output_key = field_mapping[key]
        # Convert camelCase to snake_case
        else:
            output_key = camel_to_snake(key)
        
        # Recursively transform nested dicts
        if isinstance(value, dict):
            result[output_key] = transform_input(value)
        # Recursively transform lists of dicts
        elif isinstance(value, list):
            result[output_key] = [
                transform_input(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            result[output_key] = value
    
    return result


# Common field mappings for specific record types
# These can be imported and used by Lambdas for consistent transformations

USER_PROFILE_FIELDS = {
    'user_id': 'id',
    'full_name': 'name',
    'sys_role': 'sysRole',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt',
}

ORG_MEMBER_FIELDS = {
    'org_role': 'orgRole',
    'org_id': 'orgId',
    'user_id': 'userId',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt',
}

WORKSPACE_CONFIG_FIELDS = {
    'nav_label_singular': 'navLabelSingular',
    'nav_label_plural': 'navLabelPlural',
    'nav_icon': 'navIcon',
    'enable_favorites': 'enableFavorites',
    'enable_tags': 'enableTags',
    'enable_color_coding': 'enableColorCoding',
    'default_color': 'defaultColor',
    'max_tags_per_workspace': 'maxTagsPerWorkspace',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt',
}

LAMBDA_CONFIG_FIELDS = {
    'config_key': 'configKey',
    'config_value': 'configValue',
    'is_active': 'isActive',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt',
    'created_by': 'createdBy',
    'updated_by': 'updatedBy',
}
