#!/usr/bin/env python3
"""
External UID Validator CLI

Command-line interface for validating proper external UID to Supabase UUID conversion.
"""

import sys
import json
import argparse
from pathlib import Path

# Import validator from current package
from .validator import validate


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Validate proper external UID to Supabase UUID conversion in Lambda functions"
    )
    parser.add_argument(
        "path",
        help="Path to project or module directory to validate"
    )
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="json",
        help="Output format (default: json)"
    )
    
    args = parser.parse_args()
    
    # Validate the directory
    result = validate(args.path)
    
    # Output results
    if args.format == "json":
        print(json.dumps(result, indent=2))
    else:
        # Text format
        print(f"External UID Validator: {'PASSED' if result['passed'] else 'FAILED'}")
        print(f"Errors: {result['error_count']}")
        
        if result['errors']:
            print("\nErrors found:")
            for error in result['errors']:
                print(f"  - {error['file']}:{error['line']}")
                print(f"    {error['issue']}")
                print(f"    Suggestion: {error['suggestion']}")
                print()
    
    # Return exit code
    sys.exit(0 if result['passed'] else 1)


if __name__ == "__main__":
    main()
