"""
CORA Portability Validator

Detects hardcoded values that would prevent project portability.
"""

from .validator import PortabilityValidator, validate_path

__all__ = ["PortabilityValidator", "validate_path"]
