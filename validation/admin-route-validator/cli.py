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
from .validate_routes import validate_project, format_text_output, format_json_output


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
        # Format for cora-validate.py compatibility
        output = {
            "errors": [
                {
                    "route": v.route,
                    "message": v.message,
                    "file": v.file,
                    "line": v.line,
                    "suggestion": v.suggestion
                }
                for v in result.violations
                if v.severity.value == 'error'
            ],
            "warnings": [
                {
                    "route": v.route,
                    "message": v.message,
                    "file": v.file,
                    "line": v.line,
                }
                for v in result.violations
                if v.severity.value == 'warning'
            ],
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