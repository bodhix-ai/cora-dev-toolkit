"""Baseline rules and WCAG mappings"""

from .baseline_rules import (
    BASELINE_RULES,
    MANUAL_TESTING_REQUIRED,
    get_rules_by_baseline,
    get_rules_by_severity,
    get_rule_by_name,
    get_all_baseline_tests
)

__all__ = [
    "BASELINE_RULES",
    "MANUAL_TESTING_REQUIRED",
    "get_rules_by_baseline",
    "get_rules_by_severity",
    "get_rule_by_name",
    "get_all_baseline_tests"
]
