"""
Evaluation module common layer.

This layer provides evaluation-specific shared functionality that can be used
by all evaluation Lambdas.

Components:
- permissions: Resource permission checks per ADR-019c
"""

from .permissions import (
    is_eval_owner,
    can_view_eval,
    can_edit_eval,
    can_run_eval,
    can_access_eval,
    get_accessible_evals,
)

__all__ = [
    # Permission functions
    'is_eval_owner',
    'can_view_eval',
    'can_edit_eval',
    'can_run_eval',
    'can_access_eval',
    'get_accessible_evals',
]