"""
Access module resource permission helpers per ADR-019c.
Wraps database RPC functions with Python-friendly interface.
"""
from typing import Optional
from org_common.db import rpc

# Organization Permissions
def can_view_org(user_id: str, org_id: str) -> bool:
    """Check if user can view organization (is member)."""
    return rpc('can_view_org', {
        'p_user_id': user_id,
        'p_org_id': org_id
    })

def can_edit_org(user_id: str, org_id: str) -> bool:
    """Check if user can edit organization (is org_admin or org_owner)."""
    return rpc('can_edit_org', {
        'p_user_id': user_id,
        'p_org_id': org_id
    })

def can_delete_org(user_id: str, org_id: str) -> bool:
    """Check if user can delete organization (is org_owner)."""
    return rpc('can_delete_org', {
        'p_user_id': user_id,
        'p_org_id': org_id
    })

# Member Management Permissions
def can_view_members(user_id: str, org_id: str) -> bool:
    """Check if user can view org members (is member)."""
    return rpc('can_view_members', {
        'p_user_id': user_id,
        'p_org_id': org_id
    })

def can_manage_members(user_id: str, org_id: str) -> bool:
    """Check if user can manage members (is org_admin or org_owner)."""
    return rpc('can_manage_members', {
        'p_user_id': user_id,
        'p_org_id': org_id
    })

# Invite Permissions
def can_view_invites(user_id: str, org_id: str) -> bool:
    """Check if user can view invites (is member)."""
    return rpc('can_view_invites', {
        'p_user_id': user_id,
        'p_org_id': org_id
    })

def can_manage_invites(user_id: str, org_id: str) -> bool:
    """Check if user can manage invites (is org_admin or org_owner)."""
    return rpc('can_manage_invites', {
        'p_user_id': user_id,
        'p_org_id': org_id
    })

# User Profile Permissions
def can_view_profile(user_id: str, target_user_id: str) -> bool:
    """Check if user can view profile (self or sys_admin)."""
    return rpc('can_view_profile', {
        'p_user_id': user_id,
        'p_target_user_id': target_user_id
    })

def can_edit_profile(user_id: str, target_user_id: str) -> bool:
    """Check if user can edit profile (self or sys_admin)."""
    return rpc('can_edit_profile', {
        'p_user_id': user_id,
        'p_target_user_id': target_user_id
    })

# Email Domain Permissions
def can_manage_email_domains(user_id: str, org_id: str) -> bool:
    """Check if user can manage email domains (is org_admin or org_owner)."""
    return rpc('can_manage_email_domains', {
        'p_user_id': user_id,
        'p_org_id': org_id
    })
