#!/usr/bin/env python3
"""
API Response Validator CLI

Command-line interface for the API Response Validator.
Validates that Lambda functions return camelCase keys in API responses.

Usage:
    python -m api-response-validator.cli /path/to/project --format json
"""

import sys
import json
import argparse
from pathlib import Path
from .validate_api_responses import main as validate_main


def create_parser() -> argparse.ArgumentParser:
    """Create argument parser."""
    parser = argparse.ArgumentParser(
        description="API Response Validator - Validates camelCase API responses"
    )
    parser.add_argument(
        "path",
        help="Path to project or module directory"
    )
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="text",
        help="Output format"
    )
    return parser


def main():
    """Main entry point."""
    parser = create_parser()
    args = parser.parse_args()
    
    # Validate path exists
    path = Path(args.path)
    if not path.exists():
        if args.format == "json":
            print(json.dumps({
                "errors": [f"Path not found: {args.path}"],
                "warnings": [],
                "info": []
            }))
        else:
            print(f"Error: Path not found: {args.path}", file=sys.stderr)
        return 1
    
    # Run the validator directly
    try:
        from .validate_api_responses import validate_project_api_responses, print_results
        
        results = validate_project_api_responses(path.resolve())
        
        if args.format == "json":
            # Convert results to orchestrator's expected JSON format
            output = {
                "errors": [f"{v['file']}:{v['line']}: {v['violation']}" for v in results.get('violations', [])],
                "warnings": [],
                "info": [f"Files checked: {results.get('total_files', 0)}"],
                "details": {
                    "total_files": results.get('total_files', 0),
                    "violations": results.get('violations', [])
                }
            }
            print(json.dumps(output))
        else:
            # Print text format
            print_results(results)
        
        return 0 if results.get('passed', False) else 1
        
    except Exception as e:
        if args.format == "json":
            print(json.dumps({
                "errors": [f"Validator error: {str(e)}"],
                "warnings": [],
                "info": []
            }))
        else:
            print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
