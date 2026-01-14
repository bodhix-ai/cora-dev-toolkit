#!/usr/bin/env python3
"""
Role Naming Standards Validator - CLI Interface

Usage:
    python -m role-naming-validator.cli /path/to/project --format json
    python -m role-naming-validator.cli /path/to/project --format text
"""

import sys
import json
import argparse
from pathlib import Path

from .validator import RoleNamingValidator, ValidationResult


def create_parser() -> argparse.ArgumentParser:
    """Create argument parser."""
    parser = argparse.ArgumentParser(
        prog="role-naming-validator",
        description="Validate role naming standards in CORA projects",
        epilog="""
Examples:
  # Validate a project with text output
  python -m role-naming-validator.cli /path/to/project

  # Validate with JSON output (for CI/CD integration)
  python -m role-naming-validator.cli /path/to/project --format json

  # Verbose mode for debugging
  python -m role-naming-validator.cli /path/to/project -v
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        "path",
        help="Path to project or module to validate"
    )
    
    parser.add_argument(
        "--format", "-f",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)"
    )
    
    parser.add_argument(
        "--fail-on-violations",
        action="store_true",
        default=True,
        help="Exit with error code if violations found (default: true)"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output for debugging"
    )
    
    return parser


def format_json_output(result: ValidationResult) -> str:
    """Format result as JSON for cora-validate.py integration."""
    result_dict = result.to_dict()
    
    # Convert to format expected by cora-validate.py
    output = {
        "passed": result.passed,
        "errors": [
            f"{v['file']}:{v['line']}: {v['message']} (found '{v['pattern']}', use '{v['correct']}')"
            for v in result_dict["violations"]
        ],
        "warnings": [],
        "info": [
            f"Checked {result.files_checked} files",
            f"Files with violations: {result.files_with_violations}",
        ],
        "details": {
            "violations": result_dict["violations"],
            "summary": result_dict["summary"],
        }
    }
    
    return json.dumps(output, indent=2)


def main() -> int:
    """Main entry point."""
    parser = create_parser()
    args = parser.parse_args()
    
    # Validate path exists
    path = Path(args.path)
    if not path.exists():
        print(f"Error: Path not found: {args.path}", file=sys.stderr)
        return 1
    
    # Create validator and run
    validator = RoleNamingValidator(verbose=args.verbose)
    
    if args.verbose:
        print(f"Validating role naming standards in: {path.resolve()}")
    
    result = validator.validate_project(path)
    
    # Format output
    if args.format == "json":
        print(format_json_output(result))
    else:
        print(validator.format_report(result))
    
    # Return exit code
    if args.fail_on_violations and not result.passed:
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
