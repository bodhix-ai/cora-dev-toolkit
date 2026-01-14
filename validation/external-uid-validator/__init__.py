"""
External UID Conversion Validator

Validates that Lambda functions properly convert external UIDs (from authorizer)
to Supabase UUIDs before using them in database queries.
"""

from .validator import ExternalUIDValidator, validate

__all__ = ['ExternalUIDValidator', 'validate']
