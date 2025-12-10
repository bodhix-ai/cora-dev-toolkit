"""
Section 508 Accessibility Validator
Automated validation tool for React/TypeScript components

Validates against:
- ICT Testing Baseline for Web v3.1
- WCAG 2.1 Level AA Success Criteria
"""

from .validator import A11yValidator, validate_path
from .reporter import Reporter
from .parsers.component_parser import ComponentParser

__version__ = "1.0.0"
__all__ = ["A11yValidator", "validate_path", "Reporter", "ComponentParser"]
