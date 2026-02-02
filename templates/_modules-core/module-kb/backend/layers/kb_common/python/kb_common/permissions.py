"""
Knowledge Base resource permission helpers per ADR-019c.

This module provides Python wrappers for database RPC functions that check
KB resource permissions (ownership and future sharing).

Module-specific permission helpers live in the module's layer to avoid
dependencies on optional functional modules in org-common.
"""
from org_common.db import rpc


def is_kb_owner(user_id: str, kb_id: str) -> bool:
    """
    Check if user is owner of KB base.
    
    Args:
        user_id: The user ID to check
        kb_id: The KB base ID
        
    Returns:
        True if user is the owner, False otherwise
    """
    return rpc('is_kb_owner', {
        'p_user_id': user_id,
        'p_kb_id': kb_id
    })


def can_view_kb(user_id: str, kb_id: str) -> bool:
    """
    Check if user can view KB base (ownership + future sharing).
    
    Currently checks ownership only. Future: will include shared KB bases.
    
    Args:
        user_id: The user ID to check
        kb_id: The KB base ID
        
    Returns:
        True if user can view the KB, False otherwise
    """
    return rpc('can_view_kb', {
        'p_user_id': user_id,
        'p_kb_id': kb_id
    })


def can_edit_kb(user_id: str, kb_id: str) -> bool:
    """
    Check if user can edit KB base (ownership + future edit shares).
    
    Currently checks ownership only. Future: will include edit permission shares.
    
    Args:
        user_id: The user ID to check
        kb_id: The KB base ID
        
    Returns:
        True if user can edit the KB, False otherwise
    """
    return rpc('can_edit_kb', {
        'p_user_id': user_id,
        'p_kb_id': kb_id
    })


def can_delete_kb(user_id: str, kb_id: str) -> bool:
    """
    Check if user can delete KB base (ownership only).
    
    Args:
        user_id: The user ID to check
        kb_id: The KB base ID
        
    Returns:
        True if user can delete the KB, False otherwise
    """
    return rpc('can_delete_kb', {
        'p_user_id': user_id,
        'p_kb_id': kb_id
    })


def can_view_kb_document(user_id: str, doc_id: str) -> bool:
    """
    Check if user can view KB document.
    
    Args:
        user_id: The user ID to check
        doc_id: The document ID
        
    Returns:
        True if user can view the document, False otherwise
    """
    return rpc('can_view_kb_document', {
        'p_user_id': user_id,
        'p_doc_id': doc_id
    })


def can_edit_kb_document(user_id: str, doc_id: str) -> bool:
    """
    Check if user can edit/delete KB document.
    
    Args:
        user_id: The user ID to check
        doc_id: The document ID
        
    Returns:
        True if user can edit the document, False otherwise
    """
    return rpc('can_edit_kb_document', {
        'p_user_id': user_id,
        'p_doc_id': doc_id
    })
