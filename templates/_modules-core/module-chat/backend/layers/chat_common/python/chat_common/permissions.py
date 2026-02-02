"""
Chat module resource permission helpers.

This module provides chat-specific permission checks that use the RPC functions
and database tables specific to module-chat.

Following ADR-019c pattern: Module-specific permissions live in module layers,
not in org-common (to avoid dependencies on optional modules).

Chat module supports multiple access patterns:
- Ownership (user created the chat)
- Direct sharing (chat_shares table)
- Workspace sharing (is_shared_with_workspace flag)

Usage:
    from chat_common.permissions import can_view_chat, can_edit_chat
    
    if can_view_chat(user_id, session_id):
        # User can view chat session
        session = common.find_one('chat_sessions', {'id': session_id})
    
    if can_edit_chat(user_id, session_id):
        # User can send messages
        pass

See: docs/standards/03_std_back_RESOURCE-PERMISSIONS.md
"""

from typing import Optional, List, Dict, Any
from org_common import rpc


def is_chat_owner(user_id: str, session_id: str) -> bool:
    """
    Check if user is the owner (creator) of a chat session.
    
    This is the most restrictive check - only the creator returns True.
    Use this for operations that should only be available to the owner,
    such as deleting the chat or changing sharing settings.
    
    Args:
        user_id: Supabase user UUID
        session_id: Chat session UUID
        
    Returns:
        True if user created the chat
        
    Example:
        >>> if is_chat_owner(user_id, session_id):
        >>>     # Allow delete operation
        >>>     common.delete_one('chat_sessions', {'id': session_id})
    """
    return rpc(function_name='is_chat_owner', params={
        'p_user_id': user_id,
        'p_session_id': session_id
    })


def can_view_chat(user_id: str, session_id: str) -> bool:
    """
    Check if user has permission to view a chat session.
    
    Access granted if:
    - User is the owner (created_by = user_id)
    - User has a direct share (chat_shares table, any permission level)
    - Chat is shared with workspace AND user is workspace member
    
    Admin roles do NOT provide automatic access.
    
    Args:
        user_id: Supabase user UUID
        session_id: Chat session UUID
        
    Returns:
        True if user can view the chat session
        
    Example:
        >>> if can_view_chat(user_id, session_id):
        >>>     session = common.find_one('chat_sessions', {'id': session_id})
        >>>     messages = common.find_many('chat_messages', {'session_id': session_id})
    """
    return rpc(function_name='can_view_chat', params={
        'p_user_id': user_id,
        'p_session_id': session_id
    })


def can_edit_chat(user_id: str, session_id: str) -> bool:
    """
    Check if user has permission to send messages in a chat session.
    
    Access granted if:
    - User is the owner (created_by = user_id)
    - User has an edit share (chat_shares table, permission_level = 'edit')
    - Chat is shared with workspace AND user is workspace member
    
    Note: View-only shares do NOT grant edit permission.
    Admin roles do NOT provide automatic access.
    
    Args:
        user_id: Supabase user UUID
        session_id: Chat session UUID
        
    Returns:
        True if user can send messages in the chat
        
    Example:
        >>> if can_edit_chat(user_id, session_id):
        >>>     # Allow sending message
        >>>     common.insert_one('chat_messages', {
        >>>         'session_id': session_id,
        >>>         'sender_id': user_id,
        >>>         'content': message_content
        >>>     })
    """
    return rpc(function_name='can_edit_chat', params={
        'p_user_id': user_id,
        'p_session_id': session_id
    })


def get_accessible_chats(
    user_id: str,
    org_id: str,
    ws_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get all chat sessions accessible to a user.
    
    Returns chats where user:
    - Is the owner
    - Has a direct share
    - Is a workspace member (for workspace-shared chats)
    
    Optionally filtered by workspace.
    
    Args:
        user_id: Supabase user UUID
        org_id: Organization UUID
        ws_id: Optional workspace UUID to filter by
        
    Returns:
        List of chat session records with access_type indicator:
        - 'owner': User created the chat
        - 'shared': User has direct share
        - 'workspace': User accesses via workspace membership
        
    Example:
        >>> # Get all chats user can access in org
        >>> chats = get_accessible_chats(user_id, org_id)
        >>> 
        >>> # Get chats in specific workspace
        >>> workspace_chats = get_accessible_chats(user_id, org_id, ws_id)
        >>> 
        >>> for chat in chats:
        >>>     print(f"{chat['title']} ({chat['access_type']})")
    """
    result = rpc(function_name='get_accessible_chats', params={
        'p_user_id': user_id,
        'p_org_id': org_id,
        'p_ws_id': ws_id
    })
    return result if result else []


# Alias for backwards compatibility and consistency with other modules
def can_access_chat(user_id: str, session_id: str) -> bool:
    """
    Alias for can_view_chat().
    
    Provided for consistency with other modules (voice, eval).
    
    Args:
        user_id: Supabase user UUID
        session_id: Chat session UUID
        
    Returns:
        True if user can view the chat session
    """
    return can_view_chat(user_id, session_id)


# Export permission functions
__all__ = [
    'is_chat_owner',
    'can_view_chat',
    'can_edit_chat',
    'can_access_chat',  # Alias
    'get_accessible_chats',
]
