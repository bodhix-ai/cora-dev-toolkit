"""
Voice Common Layer - Shared utilities for voice module

This layer provides permission checking functions that wrap
database RPC calls following ADR-019c standards.
"""

from .permissions import (
    can_view_voice_session,
    can_edit_voice_session,
    can_delete_voice_session,
    can_view_voice_config,
    can_edit_voice_config,
    can_view_voice_transcript,
    can_view_voice_analytics,
)

__all__ = [
    'can_view_voice_session',
    'can_edit_voice_session',
    'can_delete_voice_session',
    'can_view_voice_config',
    'can_edit_voice_config',
    'can_view_voice_transcript',
    'can_view_voice_analytics',
]