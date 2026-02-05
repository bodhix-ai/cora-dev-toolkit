#!/usr/bin/env python3
"""
CLI wrapper for CORA Admin Route Validator.

Provides argparse-based CLI compatible with cora-validate.py orchestrator.
"""

import argparse
import json
import sys
from pathlib import Path

# Import from the main validator module
# Support both relative imports (when run as module) and absolute imports (when run as script)
try:
    from .validate_routes import validate_project, format_text_output, format_json_output, Severity
except ImportError:
    from validate_routes import validate_project, format_text_output, format_json_output, Severity

# Import shared output format utilities (with fallback for backward compatibility)
try:
    from validation.shared.output_format import (
        create_error,
        create_warning,
        extract_module_from_path,
        SEVERITY_HIGH,
        SEVERITY_MEDIUM,
        SEVERITY_LOW,
    )
    SHARED_FORMAT_AVAILABLE = True
except ImportError:
    SHARED_FORMAT_AVAILABLE = False
    
    # Fallback functions for backward compatibility
    def create_error(file, line, message, category="Admin Routes", suggestion=None, module=None):
        return {
            "file": file,
            "line": line,
            "message": message,
            "severity": "high",
            "category": category,
            "suggestion": suggestion,
            "module": module,
        }
    
    def create_warning(file, line, message, category="Admin Routes", suggestion=None, module=None):
        return {
            "file": file,
            "line": line,
            "message": message,
            "severity": "medium",
            "category": category,
            "suggestion": suggestion,
            "module": module,
        }
    
    def extract_module_from_path(file_path):
        """Extract module name from file path."""
        if not file_path or file_path == '<module discovery>':
            return None
        
        # Try to extract module name from path
        import re
        match = re.search(r'module-([a-z]+)', str(file_path))
        if match:
            return f"module-{match.group(1)}"
        return None


def _standardize_violation(violation, project_path):
    """
    Convert a Violation object to standard format.
    
    Args:
        violation: Violation object from validate_routes
        project_path: Base path for making relative paths
        
    Returns:
        Dict in standard format with module, category, file, line, message, severity
    """
    # Map severity to standard levels
    if violation.severity == Severity.ERROR:
        severity = SEVERITY_HIGH if SHARED_FORMAT_AVAILABLE else "high"
    elif violation.severity == Severity.WARNING:
        severity = SEVERITY_MEDIUM if SHARED_FORMAT_AVAILABLE else "medium"
    else:  # INFO
        severity = SEVERITY_LOW if SHARED_FORMAT_AVAILABLE else "low"
    
    # Extract module from file path
    module = extract_module_from_path(violation.file)
    
    # Create standardized error/warning
    if violation.severity == Severity.ERROR:
        return create_error(
            file=violation.file,
            line=violation.line,
            message=f"{violation.route}: {violation.message}",
            category="Admin Routes",
            suggestion=violation.suggestion,
            module=module,
        )
    else:
        return create_warning(
            file=violation.file,
            line=violation.line,
            message=f"{violation.route}: {violation.message}",
            category="Admin Routes",
            suggestion=violation.suggestion,
            module=module,
        )


def main():
    parser = argparse.ArgumentParser(
        description='Validate CORA API Gateway routes against the standard'
    )
    parser.add_argument('path', help='Path to project to validate')
    parser.add_argument('--format', '-f', choices=['text', 'json'], default='text', help='Output format')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    project_path = Path(args.path)
    if not project_path.exists():
        print(json.dumps({
            "errors": [f"Path does not exist: {args.path}"],
            "warnings": [],
            "passed": False
        }))
        sys.exit(1)
    
    result = validate_project(project_path, verbose=args.verbose)
    
    if args.format == 'json':
        # Standardize violations to new format
        standardized_errors = []
        standardized_warnings = []
        
        for v in result.violations:
            standardized = _standardize_violation(v, project_path)
            if v.severity == Severity.ERROR:
                standardized_errors.append(standardized)
            else:
                standardized_warnings.append(standardized)
        
        # Format for cora-validate.py compatibility (standard format)
        output = {
            "errors": standardized_errors,
            "warnings": standardized_warnings,
            "passed": result.non_compliant_routes == 0,
            "summary": {
                "total_routes": result.total_routes,
                "compliant_routes": result.compliant_routes,
                "non_compliant_routes": result.non_compliant_routes,
                "routes_by_category": result.routes_by_category,
            }
        }
        print(json.dumps(output, indent=2))
    else:
        print(format_text_output(result))
    
    # Exit with error code if violations found
    sys.exit(1 if result.non_compliant_routes > 0 else 0)


if __name__ == '__main__':
    main()
