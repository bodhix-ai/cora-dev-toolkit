"""
Voice Permission Helpers (ADR-019c)

Module-specific permission functions for voice resources.
All functions wrap database RPC calls with Python-friendly interface.
"""

from org_common.db import rpc


def can_view_voice_session(user_id: str, session_id: str) -> bool:
    """
    Check if user can view voice session.
    
    Args:
        user_id: User's Supabase UUID
        session_id: Voice session UUID
        
    Returns:
        True if user has permission, False otherwise
    """
    return rpc('can_view_voice_session', {
        'p_user_id': user_id,
        'p_session_id': session_id
    })


def can_edit_voice_session(user_id: str, session_id: str) -> bool:
    """
    Check if user can edit voice session.
    
    Args:
        user_id: User's Supabase UUID
        session_id: Voice session UUID
        
    Returns:
        True if user has permission, False otherwise
    """
    return rpc('can_edit_voice_session', {
        'p_user_id': user_id,
        'p_session_id': session_id
    })


def can_delete_voice_session(user_id: str, session_id: str) -> bool:
    """
    Check if user can delete voice session.
    
    Args:
        user_id: User's Supabase UUID
        session_id: Voice session UUID
        
    Returns:
        True if user has permission, False otherwise
    """
    return rpc('can_delete_voice_session', {
        'p_user_id': user_id,
        'p_session_id': session_id
    })


def can_view_voice_config(user_id: str, config_id: str) -> bool:
    """
    Check if user can view voice config.
    
    Args:
        user_id: User's Supabase UUID
        config_id: Voice config UUID
        
    Returns:
        True if user has permission, False otherwise
    """
    return rpc('can_view_voice_config', {
        'p_user_id': user_id,
        'p_config_id': config_id
    })


def can_edit_voice_config(user_id: str, config_id: str) -> bool:
    """
    Check if user can edit voice config.
    
    Args:
        user_id: User's Supabase UUID
        config_id: Voice config UUID
        
    Returns:
        True if user has permission, False otherwise
    """
    return rpc('can_edit_voice_config', {
        'p_user_id': user_id,
        'p_config_id': config_id
    })


def can_view_voice_transcript(user_id: str, transcript_id: str) -> bool:
    """
    Check if user can view voice transcript.
    
    Args:
        user_id: User's Supabase UUID
        transcript_id: Voice transcript UUID
        
    Returns:
        True if user has permission, False otherwise
    """
    return rpc('can_view_voice_transcript', {
        'p_user_id': user_id,
        'p_transcript_id': transcript_id
    })


def can_view_voice_analytics(user_id: str, session_id: str) -> bool:
    """
    Check if user can view voice analytics.
    
    Args:
        user_id: User's Supabase UUID
        session_id: Voice session UUID
        
    Returns:
        True if user has permission, False otherwise
    """
    return rpc('can_view_voice_analytics', {
        'p_user_id': user_id,
        'p_session_id': session_id
    })
