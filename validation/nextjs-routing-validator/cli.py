#!/usr/bin/env python3
"""
Next.js Routing Validator CLI

CLI wrapper for route_validator.py to integrate with cora-validate.py orchestrator.

Standard: 05_std_quality_VALIDATOR-OUTPUT
"""

import sys
import json
import argparse
from pathlib import Path
from .route_validator import NextJsRoutingValidator

# Import shared output format utilities
try:
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from shared.output_format import (
        create_error, 
        create_warning,
        extract_module_from_path,
        SEVERITY_HIGH,
        SEVERITY_MEDIUM,
        SEVERITY_LOW,
        SEVERITY_CRITICAL
    )
except ImportError:
    # Fallback if shared module not available
    def create_error(file, message, category, severity="high", line=None, suggestion=None, project_root=None):
        return {"file": file, "message": message, "category": category, "severity": severity, "line": line, "suggestion": suggestion}
    def create_warning(file, message, category, line=None, suggestion=None, project_root=None):
        return {"file": file, "message": message, "category": category, "severity": "medium", "line": line, "suggestion": suggestion}
    def extract_module_from_path(file_path):
        return "unknown"
    SEVERITY_HIGH = "high"
    SEVERITY_MEDIUM = "medium"
    SEVERITY_LOW = "low"
    SEVERITY_CRITICAL = "critical"


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="nextjs-routing-validator",
        description="Validates Next.js App Router routes against CORA routing standards"
    )
    
    parser.add_argument(
        "path",
        help="Path to project stack directory"
    )
    
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="json",
        help="Output format"
    )
    
    args = parser.parse_args()
    
    project_path = Path(args.path).expanduser().resolve()
    
    if not project_path.exists():
        path_error = create_error(
            file=str(project_path),
            message=f"Path does not exist: {project_path}",
            category="Routing",
            severity=SEVERITY_HIGH,
            project_root=str(project_path)
        )
        
        if args.format == "json":
            print(json.dumps({
                "errors": [path_error],
                "warnings": [],
                "info": [],
                "passed": False
            }))
        else:
            print(f"Error: Path does not exist: {project_path}", file=sys.stderr)
        return 1
    
    if not (project_path / "apps" / "web").exists():
        structure_error = create_error(
            file=str(project_path),
            message="Not a valid CORA stack project (missing apps/web/)",
            category="Routing",
            severity=SEVERITY_HIGH,
            suggestion="Ensure you're validating a CORA stack project with apps/web/ directory",
            project_root=str(project_path)
        )
        
        if args.format == "json":
            print(json.dumps({
                "errors": [structure_error],
                "warnings": [],
                "info": [],
                "passed": False
            }))
        else:
            print("Error: Not a valid CORA stack project (missing apps/web/)", file=sys.stderr)
        return 1
    
    # Run validation (suppress verbose output in JSON mode)
    verbose = (args.format != "json")
    validator = NextJsRoutingValidator(project_path, verbose=verbose)
    errors = validator.validate()
    
    # Convert validator errors to standardized format
    error_list = []
    warning_list = []
    info_list = []
    
    severity_map = {
        "error": SEVERITY_HIGH,
        "warning": SEVERITY_MEDIUM,
        "info": SEVERITY_LOW
    }
    
    for error in errors:
        new_severity = severity_map.get(error.severity, SEVERITY_HIGH)
        
        # Create standardized error/warning
        if error.severity == "error":
            standardized = create_error(
                file=error.file_path,
                message=error.message,
                category=error.category,
                severity=new_severity,
                suggestion=error.suggestion,
                project_root=str(project_path)
            )
            error_list.append(standardized)
        elif error.severity == "warning":
            standardized = create_warning(
                file=error.file_path,
                message=error.message,
                category=error.category,
                suggestion=error.suggestion,
                project_root=str(project_path)
            )
            warning_list.append(standardized)
        else:  # info
            standardized = {
                "file": error.file_path,
                "message": error.message,
                "category": error.category,
                "severity": new_severity,
                "suggestion": error.suggestion,
                "module": extract_module_from_path(error.file_path)
            }
            info_list.append(standardized)
    
    passed = len(error_list) == 0
    
    if args.format == "json":
        output = {
            "errors": error_list,
            "warnings": warning_list,
            "info": info_list,
            "passed": passed,
            "summary": {
                "errors": len(error_list),
                "warnings": len(warning_list),
                "info": len(info_list),
                "total_issues": len(error_list) + len(warning_list) + len(info_list)
            }
        }
        print(json.dumps(output, indent=2))
    else:
        # Text output
        validator.print_summary()
    
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
