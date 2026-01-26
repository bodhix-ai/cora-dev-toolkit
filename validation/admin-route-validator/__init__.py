"""
CORA Admin Route Validator

Validates API Gateway routes against the CORA Admin API Routes Standard.
See: docs/standards/standard_ADMIN-API-ROUTES.md
"""

from .validate_routes import (
    validate_project,
    validate_route,
    ValidationResult,
    Violation,
    Severity,
    VALID_MODULES,
)

__all__ = [
    'validate_project',
    'validate_route',
    'ValidationResult',
    'Violation',
    'Severity',
    'VALID_MODULES',
]
