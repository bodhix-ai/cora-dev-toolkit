#!/usr/bin/env python3
"""
RPC Function Validator CLI

Command-line interface for the RPC function validator.
Validates Lambda RPC calls against database function definitions.

Usage:
    python -m rpc-function-validator.cli <path> --format json
"""

import argparse
import json
import sys
from pathlib import Path

from .validate_rpc_functions import RPCFunctionValidator


def main():
    parser = argparse.ArgumentParser(
        description="Validate Lambda RPC calls against database function definitions"
    )
    parser.add_argument(
        "path",
        help="Path to validate (project root or templates directory)"
    )
    parser.add_argument(
        "--format", "-f",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show verbose output"
    )
    
    args = parser.parse_args()
    
    # Determine templates path
    path = Path(args.path)
    
    # If path contains 'templates', use it directly
    # Otherwise, look for templates subdirectory
    if "templates" in str(path):
        templates_path = path
    elif (path / "templates").exists():
        templates_path = path / "templates"
    else:
        # Assume the path itself is the templates directory
        templates_path = path
    
    validator = RPCFunctionValidator()
    
    # Suppress print output for JSON format
    if args.format == "json":
        import io
        import contextlib
        
        # Capture stdout
        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            success = validator.validate(str(templates_path))
        
        # Build JSON output
        errors = []
        for error in validator.get_errors():
            errors.append({
                "severity": error.severity,
                "file": error.rpc_call.file_path,
                "line": error.rpc_call.line_number,
                "function_name": error.rpc_call.function_name,
                "message": error.message,
                "suggestion": error.suggestion,
            })
        
        output = {
            "status": "passed" if success else "failed",
            "errors": errors,
            "warnings": [],
            "info": [],
            "details": {
                "rpc_calls_found": len(validator.get_rpc_calls()),
                "db_functions_found": len(validator.get_db_functions()),
                "lambda_files_scanned": len(set(c.file_path for c in validator.get_rpc_calls())),
            },
            "summary": {
                "total_rpc_calls": len(validator.get_rpc_calls()),
                "total_db_functions": len(validator.get_db_functions()),
                "errors": len(errors),
            }
        }
        
        print(json.dumps(output, indent=2))
    else:
        # Text format - just run the validator which prints output
        success = validator.validate(str(templates_path))
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
