"""
Authorization Helper Functions

Python wrappers for ALL Supabase authorization functions.
Auto-validated by scripts/validation/rpc-validator/

Standard: Every Supabase function callable from Python gets a wrapper here.
See: docs/implementation/org-common-enhancement-plan.md
"""
from .db import rpc

# ============================================
# CHAT AUTHORIZATION
# ============================================

def is_chat_owner(chat_session_id: str, user_jwt: str = None) -> bool:
    """Check if current user owns the chat session."""
    return rpc('is_chat_owner', {'chat_session_id_param': chat_session_id}, user_jwt) is True


def is_chat_participant(chat_session_id: str, user_jwt: str = None) -> bool:
    """Check if current user is a participant in the chat."""
    return rpc('is_chat_participant', {'chat_session_id_param': chat_session_id}, user_jwt) is True


# ============================================
# ORGANIZATION AUTHORIZATION
# ============================================

def is_org_member(org_id: str, user_id: str = None, user_jwt: str = None) -> bool:
    """Check if user is a member of the organization."""
    if user_id:
        return rpc('is_org_member', {'org_id': org_id, 'user_id': user_id}, user_jwt) is True
    return rpc('is_org_member', {'org_id_param': org_id}, user_jwt) is True


def is_org_admin(org_id: str, user_id: str = None, user_jwt: str = None) -> bool:
    """Check if user is an org admin."""
    if user_id:
        return rpc('is_org_admin', {'org_id': org_id, 'user_id': user_id}, user_jwt) is True
    return rpc('is_org_admin', {'org_id': org_id}, user_jwt) is True


def is_org_owner(org_id: str, user_id: str, user_jwt: str = None) -> bool:
    """Check if user is the org owner."""
    return rpc('is_org_owner', {'org_id': org_id, 'user_id': user_id}, user_jwt) is True


def is_org_colleague(target_user_id: str, user_jwt: str = None) -> bool:
    """Check if target user is in the same org as current user."""
    return rpc('is_org_colleague', {'target_user_id': target_user_id}, user_jwt) is True


# ============================================
# PROJECT AUTHORIZATION
# ============================================

def is_project_member(project_id: str, user_jwt: str = None) -> bool:
    """Check if current user is a project member."""
    return rpc('is_project_member', {'project_id_param': project_id}, user_jwt) is True


def is_project_owner(project_id: str, user_jwt: str = None) -> bool:
    """Check if current user is the project owner."""
    return rpc('is_project_owner', {'project_id_param': project_id}, user_jwt) is True


def is_project_admin_or_owner(project_id: str, user_jwt: str = None) -> bool:
    """Check if current user is a project admin or owner."""
    return rpc('is_project_admin_or_owner', {'project_id_param': project_id}, user_jwt) is True


def is_project_colleague(target_user_id: str, user_jwt: str = None) -> bool:
    """Check if target user shares any project with current user."""
    return rpc('is_project_colleague', {'target_user_id': target_user_id}, user_jwt) is True


def is_project_favorited(project_id: str, user_jwt: str = None) -> bool:
    """Check if current user has favorited the project."""
    return rpc('is_project_favorited', {'project_id_param': project_id}, user_jwt) is True


# ============================================
# PLATFORM AUTHORIZATION
# ============================================

def is_platform_admin(user_jwt: str = None) -> bool:
    """Check if current user is a platform admin."""
    return rpc('is_platform_admin', {}, user_jwt) is True


def is_provider_active(provider_name: str, user_jwt: str = None) -> bool:
    """Check if an AI provider is active."""
    return rpc('is_provider_active', {'provider_name': provider_name}, user_jwt) is True
