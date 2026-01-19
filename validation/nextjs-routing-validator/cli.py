#!/usr/bin/env python3
"""
Next.js Routing Validator CLI

CLI wrapper for route_validator.py to integrate with cora-validate.py orchestrator.
"""

import sys
import json
import argparse
from pathlib import Path
from .route_validator import NextJsRoutingValidator


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
        if args.format == "json":
            print(json.dumps({
                "errors": [f"Path does not exist: {project_path}"],
                "warnings": [],
                "info": [],
                "passed": False
            }))
        else:
            print(f"Error: Path does not exist: {project_path}", file=sys.stderr)
        return 1
    
    if not (project_path / "apps" / "web").exists():
        if args.format == "json":
            print(json.dumps({
                "errors": ["Not a valid CORA stack project (missing apps/web/)"],
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
    
    # Group errors by severity
    error_list = []
    warning_list = []
    info_list = []
    
    for error in errors:
        if error.severity == "error":
            error_msg = f"[{error.category}] {error.file_path}: {error.message}"
            if error.suggestion:
                error_msg += f" → {error.suggestion}"
            error_list.append(error_msg)
        elif error.severity == "warning":
            warning_msg = f"[{error.category}] {error.file_path}: {error.message}"
            if error.suggestion:
                warning_msg += f" → {error.suggestion}"
            warning_list.append(warning_msg)
        else:  # info
            info_msg = f"[{error.category}] {error.file_path}: {error.message}"
            info_list.append(info_msg)
    
    passed = len(error_list) == 0
    
    if args.format == "json":
        output = {
            "errors": error_list,
            "warnings": warning_list,
            "info": info_list,
            "passed": passed,
            "details": {
                "total_errors": len(error_list),
                "total_warnings": len(warning_list),
                "total_info": len(info_list),
            }
        }
        print(json.dumps(output, indent=2))
    else:
        # Text output
        validator.print_summary()
    
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
