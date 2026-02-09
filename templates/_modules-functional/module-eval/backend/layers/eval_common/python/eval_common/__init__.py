"""
Evaluation module common layer.

This layer provides evaluation-specific shared functionality that can be used
by all evaluation Lambdas.

Components:
- permissions: Resource permission checks per ADR-019c
- queries: Shared query functions (RPC wrappers to avoid REST API issues)
"""

from .permissions import (
    is_eval_owner,
    can_view_eval,
    can_edit_eval,
    can_run_eval,
    can_access_eval,
    get_accessible_evals,
)

from .queries import (
    get_criteria_results,
)

__all__ = [
    # Permission functions
    'is_eval_owner',
    'can_view_eval',
    'can_edit_eval',
    'can_run_eval',
    'can_access_eval',
    'get_accessible_evals',
    # Query functions
    'get_criteria_results',
]
