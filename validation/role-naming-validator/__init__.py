"""
Role Naming Standards Validator

Ensures code follows role naming standards:
- sys_role, org_role, ws_role (NOT global_role, role)
- sys_admin, sys_owner, sys_user (NOT platform_admin, platform_owner, platform_user)
"""

from .validator import RoleNamingValidator, validate_project, validate_file

__all__ = ['RoleNamingValidator', 'validate_project', 'validate_file']
