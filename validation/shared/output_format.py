"""
Shared utilities for standardized validator output format.

This module provides helper functions for creating consistent error/warning
dictionaries across all CORA validators.

Standard: 05_std_quality_VALIDATOR-OUTPUT
"""

import re
from pathlib import Path
from typing import Optional


# Severity levels
SEVERITY_CRITICAL = "critical"
SEVERITY_HIGH = "high"
SEVERITY_MEDIUM = "medium"
SEVERITY_LOW = "low"

VALID_SEVERITIES = {SEVERITY_CRITICAL, SEVERITY_HIGH, SEVERITY_MEDIUM, SEVERITY_LOW}


def extract_module_from_path(file_path: str) -> str:
    """
    Extract module name from file path.
    
    Args:
        file_path: File path (absolute or relative)
        
    Returns:
        Module name (e.g., "module-kb", "module-chat", "app-shell", "infrastructure")
        
    Examples:
        >>> extract_module_from_path("packages/module-kb/frontend/pages/KbPage.tsx")
        'module-kb'
        
        >>> extract_module_from_path("templates/_modules-core/module-access/backend/lambda.py")
        'module-access'
        
        >>> extract_module_from_path("apps/web/app/page.tsx")
        'app-shell'
        
        >>> extract_module_from_path("envs/dev/main.tf")
        'infrastructure'
    """
    # Normalize path separators
    normalized = file_path.replace("\\", "/")
    
    # Pattern 1: packages/module-{name}/
    match = re.search(r'packages/(module-[^/]+)/', normalized)
    if match:
        return match.group(1)
    
    # Pattern 2: templates/_modules-core/module-{name}/
    match = re.search(r'templates/_modules-core/(module-[^/]+)/', normalized)
    if match:
        return match.group(1)
    
    # Pattern 3: templates/_modules-functional/module-{name}/
    match = re.search(r'templates/_modules-functional/(module-[^/]+)/', normalized)
    if match:
        return match.group(1)
    
    # Pattern 4: App shell (apps/web/)
    if '/apps/web/' in normalized or normalized.startswith('apps/web/'):
        return 'app-shell'
    
    # Pattern 5: Infrastructure (envs/, scripts/, terraform files)
    if (
        '/envs/' in normalized or 
        normalized.startswith('envs/') or
        '/infrastructure/' in normalized or
        normalized.endswith('.tf') or
        normalized.endswith('.tfvars')
    ):
        return 'infrastructure'
    
    # Pattern 6: Validation directory itself
    if '/validation/' in normalized or normalized.startswith('validation/'):
        return 'validation-infrastructure'
    
    # Pattern 7: Scripts directory
    if '/scripts/' in normalized or normalized.startswith('scripts/'):
        return 'scripts'
    
    # Default: unknown
    return 'unknown'


def make_relative_path(file_path: str, project_root: Optional[str] = None) -> str:
    """
    Ensure file path is relative to project root.
    
    Args:
        file_path: File path (may be absolute or relative)
        project_root: Project root directory (optional)
        
    Returns:
        Relative path from project root
        
    Examples:
        >>> make_relative_path("/Users/me/project/packages/module-kb/file.tsx", "/Users/me/project")
        'packages/module-kb/file.tsx'
        
        >>> make_relative_path("packages/module-kb/file.tsx")
        'packages/module-kb/file.tsx'
    """
    if not project_root:
        # Already relative or no root specified
        return file_path
    
    try:
        path_obj = Path(file_path)
        root_obj = Path(project_root)
        
        if path_obj.is_absolute():
            # Make relative to root
            relative = path_obj.relative_to(root_obj)
            return str(relative)
    except (ValueError, Exception):
        # Couldn't make relative, return as-is
        pass
    
    return file_path


def create_error(
    file: str,
    message: str,
    category: str,
    severity: str = SEVERITY_HIGH,
    line: Optional[int] = None,
    suggestion: Optional[str] = None,
    project_root: Optional[str] = None
) -> dict:
    """
    Create a standardized error dictionary.
    
    Args:
        file: File path where error occurs
        message: Human-readable error message
        category: Error category (e.g., "Accessibility", "Route Matching")
        severity: Severity level (critical, high, medium, low) - defaults to high
        line: Line number (optional)
        suggestion: How to fix (optional)
        project_root: Project root for relative path conversion (optional)
        
    Returns:
        Standardized error dictionary
        
    Raises:
        ValueError: If severity is not valid
        
    Example:
        >>> create_error(
        ...     file="packages/module-kb/frontend/KbPage.tsx",
        ...     line=42,
        ...     message="Missing aria-label on IconButton",
        ...     category="Accessibility",
        ...     severity="high",
        ...     suggestion="Add aria-label prop"
        ... )
        {
            'module': 'module-kb',
            'category': 'Accessibility',
            'file': 'packages/module-kb/frontend/KbPage.tsx',
            'line': 42,
            'message': 'Missing aria-label on IconButton',
            'severity': 'high',
            'suggestion': 'Add aria-label prop'
        }
    """
    if severity not in VALID_SEVERITIES:
        raise ValueError(
            f"Invalid severity '{severity}'. Must be one of: {', '.join(VALID_SEVERITIES)}"
        )
    
    # Make path relative
    relative_file = make_relative_path(file, project_root)
    
    # Extract module from path
    module = extract_module_from_path(relative_file)
    
    error = {
        "module": module,
        "category": category,
        "file": relative_file,
        "message": message,
        "severity": severity,
    }
    
    # Add optional fields
    if line is not None:
        error["line"] = line
    
    if suggestion is not None:
        error["suggestion"] = suggestion
    
    return error


def create_warning(
    file: str,
    message: str,
    category: str,
    line: Optional[int] = None,
    suggestion: Optional[str] = None,
    project_root: Optional[str] = None
) -> dict:
    """
    Create a standardized warning dictionary.
    
    Warnings are errors with severity="medium" or "low".
    By default, warnings are medium severity.
    
    Args:
        file: File path where warning occurs
        message: Human-readable warning message
        category: Warning category
        line: Line number (optional)
        suggestion: How to fix (optional)
        project_root: Project root for relative path conversion (optional)
        
    Returns:
        Standardized warning dictionary (with severity="medium")
        
    Example:
        >>> create_warning(
        ...     file="packages/module-eval/hooks/useEvaluations.ts",
        ...     line=78,
        ...     message="Function parameter uses 'any' type",
        ...     category="Code Quality",
        ...     suggestion="Replace 'any' with 'Evaluation' type"
        ... )
    """
    return create_error(
        file=file,
        message=message,
        category=category,
        severity=SEVERITY_MEDIUM,
        line=line,
        suggestion=suggestion,
        project_root=project_root
    )


def validate_error_format(error: dict) -> bool:
    """
    Validate that an error dictionary follows the standard format.
    
    Args:
        error: Error dictionary to validate
        
    Returns:
        True if valid, False otherwise
        
    Example:
        >>> error = create_error(
        ...     file="packages/module-kb/file.tsx",
        ...     message="Error message",
        ...     category="Test"
        ... )
        >>> validate_error_format(error)
        True
    """
    required_fields = {"module", "category", "file", "message", "severity"}
    optional_fields = {"line", "suggestion"}
    
    # Check required fields
    if not all(field in error for field in required_fields):
        return False
    
    # Check severity is valid
    if error.get("severity") not in VALID_SEVERITIES:
        return False
    
    # Check no extra fields (except optional)
    allowed_fields = required_fields | optional_fields
    if not all(field in allowed_fields for field in error.keys()):
        return False
    
    # Check types
    if not isinstance(error.get("module"), str):
        return False
    if not isinstance(error.get("category"), str):
        return False
    if not isinstance(error.get("file"), str):
        return False
    if not isinstance(error.get("message"), str):
        return False
    if not isinstance(error.get("severity"), str):
        return False
    
    # Check optional field types
    if "line" in error and not isinstance(error["line"], int):
        return False
    if "suggestion" in error and not isinstance(error["suggestion"], str):
        return False
    
    return True


def categorize_by_module(errors: list[dict]) -> dict[str, list[dict]]:
    """
    Group errors by module.
    
    Args:
        errors: List of error dictionaries
        
    Returns:
        Dictionary mapping module names to lists of errors
        
    Example:
        >>> errors = [
        ...     create_error(file="packages/module-kb/a.tsx", message="Error 1", category="Test"),
        ...     create_error(file="packages/module-kb/b.tsx", message="Error 2", category="Test"),
        ...     create_error(file="packages/module-chat/c.tsx", message="Error 3", category="Test"),
        ... ]
        >>> by_module = categorize_by_module(errors)
        >>> len(by_module["module-kb"])
        2
        >>> len(by_module["module-chat"])
        1
    """
    by_module = {}
    
    for error in errors:
        module = error.get("module", "unknown")
        if module not in by_module:
            by_module[module] = []
        by_module[module].append(error)
    
    return by_module


def categorize_by_category(errors: list[dict]) -> dict[str, list[dict]]:
    """
    Group errors by category.
    
    Args:
        errors: List of error dictionaries
        
    Returns:
        Dictionary mapping category names to lists of errors
        
    Example:
        >>> errors = [
        ...     create_error(file="packages/module-kb/a.tsx", message="Error 1", category="Accessibility"),
        ...     create_error(file="packages/module-kb/b.tsx", message="Error 2", category="Accessibility"),
        ...     create_error(file="packages/module-chat/c.tsx", message="Error 3", category="Route Matching"),
        ... ]
        >>> by_category = categorize_by_category(errors)
        >>> len(by_category["Accessibility"])
        2
        >>> len(by_category["Route Matching"])
        1
    """
    by_category = {}
    
    for error in errors:
        category = error.get("category", "Unknown")
        if category not in by_category:
            by_category[category] = []
        by_category[category].append(error)
    
    return by_category


def categorize_by_severity(errors: list[dict]) -> dict[str, list[dict]]:
    """
    Group errors by severity level.
    
    Args:
        errors: List of error dictionaries
        
    Returns:
        Dictionary mapping severity levels to lists of errors
        
    Example:
        >>> errors = [
        ...     create_error(file="a.tsx", message="Error 1", category="Test", severity="critical"),
        ...     create_error(file="b.tsx", message="Error 2", category="Test", severity="high"),
        ...     create_error(file="c.tsx", message="Error 3", category="Test", severity="high"),
        ... ]
        >>> by_severity = categorize_by_severity(errors)
        >>> len(by_severity["critical"])
        1
        >>> len(by_severity["high"])
        2
    """
    by_severity = {
        SEVERITY_CRITICAL: [],
        SEVERITY_HIGH: [],
        SEVERITY_MEDIUM: [],
        SEVERITY_LOW: []
    }
    
    for error in errors:
        severity = error.get("severity", SEVERITY_MEDIUM)
        if severity in by_severity:
            by_severity[severity].append(error)
    
    return by_severity


def get_module_summary(errors: list[dict], warnings: list[dict]) -> dict[str, dict]:
    """
    Get summary of errors and warnings by module.
    
    Args:
        errors: List of error dictionaries
        warnings: List of warning dictionaries
        
    Returns:
        Dictionary mapping module names to error/warning counts
        
    Example:
        >>> errors = [
        ...     create_error(file="packages/module-kb/a.tsx", message="Error 1", category="Test"),
        ...     create_error(file="packages/module-kb/b.tsx", message="Error 2", category="Test"),
        ... ]
        >>> warnings = [
        ...     create_warning(file="packages/module-kb/c.tsx", message="Warning 1", category="Test"),
        ... ]
        >>> summary = get_module_summary(errors, warnings)
        >>> summary["module-kb"]
        {'errors': 2, 'warnings': 1}
    """
    summary = {}
    
    # Count errors by module
    for error in errors:
        module = error.get("module", "unknown")
        if module not in summary:
            summary[module] = {"errors": 0, "warnings": 0}
        summary[module]["errors"] += 1
    
    # Count warnings by module
    for warning in warnings:
        module = warning.get("module", "unknown")
        if module not in summary:
            summary[module] = {"errors": 0, "warnings": 0}
        summary[module]["warnings"] += 1
    
    return summary
