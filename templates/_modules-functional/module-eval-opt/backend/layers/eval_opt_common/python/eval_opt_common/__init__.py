"""
Eval Optimizer Common Layer

Provides shared utilities for module-eval-optimizer Lambdas.
Includes resource permission functions per ADR-019c.

Function naming follows ADR-011 abbreviation conventions:
- ws = workspace
- opt = optimization
- doc = document
"""

from .permissions import (
    can_access_opt_ws,
    can_access_opt_run,
    can_manage_opt_run,
    is_opt_run_owner,
    can_access_opt_doc_group,
    can_access_opt_truth_key,
    can_edit_opt_truth_key,
)

__all__ = [
    'can_access_opt_ws',
    'can_access_opt_run',
    'can_manage_opt_run',
    'is_opt_run_owner',
    'can_access_opt_doc_group',
    'can_access_opt_truth_key',
    'can_edit_opt_truth_key',
]
