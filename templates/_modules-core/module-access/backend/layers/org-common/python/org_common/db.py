"""
Database Helper Module
Handles database queries using Supabase client
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from .supabase_client import get_supabase_client
from .errors import NotFoundError


def execute_query(
    table: str,
    operation: str,
    user_jwt: Optional[str] = None,
    filters: Optional[Dict[str, Any]] = None,
    data: Optional[Dict[str, Any]] = None,
    select: str = "*",
    order: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    single: bool = False
) -> Any:
    """
    Execute database query using Supabase client
    
    Args:
        table: Table name
        operation: Operation type ('select', 'insert', 'update', 'delete')
        user_jwt: User JWT token for RLS (optional)
        filters: Filter conditions (e.g., {'id': 'uuid', 'org_id': 'uuid'})
        data: Data for insert/update operations
        select: Fields to select (default: "*")
        order: Order by clause (e.g., "created_at.desc")
        limit: Limit number of results
        offset: Offset for pagination
        single: Whether to return single record (raises error if not found)
        
    Returns:
        Query results (list of dicts or single dict if single=True)
        
    Raises:
        NotFoundError: If single=True and no record found
        Exception: For other database errors
    """
    try:
        client = get_supabase_client(user_jwt)
        
        # Build query based on operation
        if operation == 'select':
            query = client.table(table).select(select)
            
            # Apply filters
            if filters:
                for key, value in filters.items():
                    if value is not None:
                        # Use .in_() for list/tuple values, .eq() for scalars
                        if isinstance(value, (list, tuple)):
                            query = query.in_(key, list(value))
                        else:
                            query = query.eq(key, value)
            
            # Apply order
            if order:
                # Parse order string (e.g., "created_at.desc" or "name.asc")
                if '.' in order:
                    field, direction = order.split('.')
                    ascending = direction.lower() == 'asc'
                    query = query.order(field, desc=not ascending)
                else:
                    query = query.order(order)
            
            # Apply limit and offset
            if limit:
                query = query.limit(limit)
            if offset:
                query = query.offset(offset)
            
            # Execute query
            if single:
                response = query.single().execute()
                return response.data
            else:
                response = query.execute()
                return response.data
                
        elif operation == 'insert':
            if not data:
                raise ValueError("Data is required for insert operation")
            
            query = client.table(table).insert(data)
            response = query.execute()
            
            if single and response.data:
                return response.data[0]
            return response.data
            
        elif operation == 'update':
            if not data:
                raise ValueError("Data is required for update operation")
            if not filters:
                raise ValueError("Filters are required for update operation")
            
            query = client.table(table).update(data)
            
            # Apply filters
            for key, value in filters.items():
                if value is not None:
                    # Use .in_() for list/tuple values, .eq() for scalars
                    if isinstance(value, (list, tuple)):
                        query = query.in_(key, list(value))
                    else:
                        query = query.eq(key, value)
            
            response = query.execute()
            
            if single and response.data:
                return response.data[0]
            return response.data
            
        elif operation == 'delete':
            if not filters:
                raise ValueError("Filters are required for delete operation")
            
            query = client.table(table).delete()
            
            # Apply filters
            for key, value in filters.items():
                if value is not None:
                    # Use .in_() for list/tuple values, .eq() for scalars
                    if isinstance(value, (list, tuple)):
                        query = query.in_(key, list(value))
                    else:
                        query = query.eq(key, value)
            
            response = query.execute()
            return response.data
            
        else:
            raise ValueError(f"Unknown operation: {operation}")
            
    except Exception as e:
        error_msg = str(e)
        
        # Handle "not found" errors
        if 'PGRST116' in error_msg or 'not found' in error_msg.lower():
            raise NotFoundError(f"Record not found in {table}")
        
        print(f"Database error in {operation} on {table}: {error_msg}")
        raise


def _snake_to_camel(snake_str: str) -> str:
    """Convert snake_case to camelCase for API response keys"""
    if not snake_str or '_' not in snake_str:
        return snake_str
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def format_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format a single database record for JSON response
    
    Transforms:
    - snake_case keys to camelCase (for JavaScript clients)
    - datetime objects to ISO strings
    
    Args:
        record: Database record (snake_case keys from database)
        
    Returns:
        Formatted record with camelCase keys and ISO string dates
    """
    if not record:
        return {}
    
    formatted = {}
    for key, value in record.items():
        # Transform snake_case key to camelCase
        camel_key = _snake_to_camel(key)
        
        # Convert datetime to ISO string
        if isinstance(value, datetime):
            formatted[camel_key] = value.isoformat()
        else:
            formatted[camel_key] = value
    
    return formatted


def format_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Format multiple database records for JSON response
    
    Args:
        records: List of database records
        
    Returns:
        List of formatted records
    """
    if not records:
        return []
    
    return [format_record(record) for record in records]


def _execute_raw_sql(
    sql: str,
    params: Optional[Dict[str, Any]] = None,
    user_jwt: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Execute raw SQL query using Supabase RPC
    
    INTERNAL USE ONLY - Not exported in __all__
    
    Note: This requires a database function to be created for executing SQL.
    For now, this is a placeholder. Use execute_query() for standard operations.
    
    Args:
        sql: SQL query string
        params: Query parameters
        user_jwt: User JWT token for RLS
        
    Returns:
        Query results
        
    Raises:
        NotImplementedError: This feature requires custom RPC function
    """
    raise NotImplementedError(
        "Raw SQL execution requires a custom RPC function in Supabase. "
        "Use execute_query() for standard CRUD operations."
    )


def rpc(function_name: str, params: dict = None, user_jwt: str = None):
    """
    Call a Supabase PostgreSQL function via RPC.
    
    This allows Python code to call Supabase database functions for
    authorization checks, maintaining consistency with RLS policies.
    
    Args:
        function_name: Name of the PostgreSQL function to call
        params: Dictionary of parameters to pass to the function
        user_jwt: Optional JWT token for authenticated RPC calls.
                  When provided, auth.uid() will return the user's ID
                  in the Supabase function. Required for functions that
                  use auth.uid() (like is_chat_participant, is_chat_owner).
    
    Returns:
        The result from the function call (typically a single value)
    
    Example:
        # Call is_chat_participant function with user context
        result = rpc('is_chat_participant', {'chat_session_id_param': session_id}, user_jwt=jwt)
        if result is True:
            # User has access
    
    Note:
        RPC calls require the function to exist in Supabase.
        See migrations/ for function definitions.
        
        For functions using auth.uid(), you MUST pass user_jwt or the
        function will return incorrect results (auth.uid() = NULL).
    """
    try:
        supabase = get_supabase_client(user_jwt=user_jwt)
        response = supabase.rpc(function_name, params or {}).execute()
        return response.data
    except Exception as e:
        print(f'Error calling RPC {function_name}: {str(e)}')
        raise


def count(
    table: str,
    filters: Optional[Dict[str, Any]] = None,
    user_jwt: Optional[str] = None
) -> int:
    """
    Count records matching filters using Supabase count feature.

    Args:
        table: Table name
        filters: Filter conditions (e.g., {'kb_id': kb_id, 'is_deleted': False})
        user_jwt: User JWT token for RLS

    Returns:
        Integer count of matching records

    Example:
        doc_count = count('kb_docs', {'kb_id': kb_id, 'is_deleted': False})
    """
    try:
        client = get_supabase_client(user_jwt)
        query = client.table(table).select('*', count='exact', head=True)

        if filters:
            for key, value in filters.items():
                if value is not None:
                    query = query.eq(key, value)

        response = query.execute()
        return response.count or 0
    except Exception as e:
        print(f"Error counting records in {table}: {str(e)}")
        raise


def update_many(
    table: str,
    filters: Dict[str, Any],
    data: Dict[str, Any],
    user_jwt: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Update multiple records matching filters.

    Args:
        table: Table name
        filters: Filter conditions (required for safety)
        data: Update data
        user_jwt: User JWT token for RLS

    Returns:
        List of updated records

    Example:
        # Soft delete all documents in a KB
        updated = update_many('kb_docs',
            {'kb_id': kb_id},
            {'is_deleted': True, 'deleted_at': now}
        )
    """
    return execute_query(
        table=table,
        operation='update',
        filters=filters,
        data=data,
        user_jwt=user_jwt,
        single=False
    )


def insert_one(
    table: str,
    data: Dict[str, Any],
    user_jwt: Optional[str] = None
) -> Dict[str, Any]:
    """
    Insert a single record
    
    Args:
        table: Table name
        data: Record data
        user_jwt: User JWT token for RLS
        
    Returns:
        Inserted record
    """
    return execute_query(
        table=table,
        operation='insert',
        data=data,
        user_jwt=user_jwt,
        single=True
    )


def find_one(
    table: str,
    filters: Dict[str, Any],
    user_jwt: Optional[str] = None,
    select: str = "*"
) -> Optional[Dict[str, Any]]:
    """
    Find a single record
    
    Args:
        table: Table name
        filters: Filter conditions
        user_jwt: User JWT token for RLS
        select: Fields to select
        
    Returns:
        Record if found, None otherwise
    """
    try:
        return execute_query(
            table=table,
            operation='select',
            filters=filters,
            user_jwt=user_jwt,
            select=select,
            single=True
        )
    except NotFoundError:
        return None


def find_many(
    table: str,
    filters: Optional[Dict[str, Any]] = None,
    user_jwt: Optional[str] = None,
    select: str = "*",
    order: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Find multiple records
    
    Args:
        table: Table name
        filters: Filter conditions
        user_jwt: User JWT token for RLS
        select: Fields to select
        order: Order by clause
        limit: Limit results
        offset: Offset for pagination
        
    Returns:
        List of records
    """
    return execute_query(
        table=table,
        operation='select',
        filters=filters,
        user_jwt=user_jwt,
        select=select,
        order=order,
        limit=limit,
        offset=offset,
        single=False
    )


def update_one(
    table: str,
    filters: Dict[str, Any],
    data: Dict[str, Any],
    user_jwt: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update a single record
    
    Args:
        table: Table name
        filters: Filter conditions
        data: Update data
        user_jwt: User JWT token for RLS
        
    Returns:
        Updated record
        
    Raises:
        NotFoundError: If record not found
    """
    return execute_query(
        table=table,
        operation='update',
        filters=filters,
        data=data,
        user_jwt=user_jwt,
        single=True
    )


def delete_one(
    table: str,
    filters: Dict[str, Any],
    user_jwt: Optional[str] = None
) -> Dict[str, Any]:
    """
    Delete a single record
    
    Args:
        table: Table name
        filters: Filter conditions
        user_jwt: User JWT token for RLS
        
    Returns:
        Deleted record
        
    Raises:
        NotFoundError: If record not found
    """
    result = execute_query(
        table=table,
        operation='delete',
        filters=filters,
        user_jwt=user_jwt
    )
    
    if not result:
        raise NotFoundError(f"Record not found in {table}")
    
    return result[0] if isinstance(result, list) else result


def delete_many(
    table: str,
    filters: Dict[str, Any],
    user_jwt: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Delete multiple records
    
    Args:
        table: Table name
        filters: Filter conditions
        user_jwt: User JWT token for RLS
        
    Returns:
        List of deleted records (may be empty if no records matched)
    """
    result = execute_query(
        table=table,
        operation='delete',
        filters=filters,
        user_jwt=user_jwt
    )
    
    return result if isinstance(result, list) else [result] if result else []
