#!/usr/bin/env python3
"""
Database Naming Standards Validator CLI

CLI interface for the validation orchestrator.
"""

import sys
import json
import argparse
from pathlib import Path
from typing import List

# Import validation logic from the scripts directory
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from scripts.validate_db_naming import (
    find_sql_files,
    validate_sql_file,
    ValidationResult,
)


def format_error(file: str, line: int, message: str) -> str:
    """Format error for JSON output."""
    return f"{file}:{line} - {message}"


def main():
    parser = argparse.ArgumentParser(description="Database Naming Standards Validator")
    parser.add_argument("path", help="Path to project or module directory")
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="text",
        help="Output format"
    )
    
    args = parser.parse_args()
    
    path = Path(args.path)
    
    if not path.exists():
        if args.format == "json":
            print(json.dumps({
                "errors": [f"Path not found: {args.path}"],
                "warnings": [],
                "info": [],
                "passed": False
            }))
        else:
            print(f"Error: Path not found: {args.path}", file=sys.stderr)
        return 1
    
    # Find SQL files
    sql_files = []
    
    # Search for schema files in typical CORA locations
    if path.is_dir():
        # Look for db/schema directories
        schema_dirs = list(path.rglob("db/schema"))
        if schema_dirs:
            for schema_dir in schema_dirs:
                sql_files.extend(find_sql_files(schema_dir))
        else:
            # Fallback: search for all SQL files
            sql_files = find_sql_files(path)
    else:
        sql_files = find_sql_files(path)
    
    # Run validation
    result = ValidationResult()
    
    for sql_file in sql_files:
        validate_sql_file(sql_file, result)
    
    # Format output
    if args.format == "json":
        output = {
            "errors": [format_error(f, line, msg) for f, line, msg in result.errors],
            "warnings": [format_error(f, line, msg) for f, line, msg in result.warnings],
            "info": result.info,
            "passed": not result.has_errors(),
            "details": {
                "sql_files_checked": len(sql_files),
                "total_errors": len(result.errors),
                "total_warnings": len(result.warnings),
            }
        }
        print(json.dumps(output, indent=2))
    else:
        # Text format
        exit_code = result.print_report()
        return exit_code
    
    return 0 if not result.has_errors() else 1


if __name__ == "__main__":
    sys.exit(main())
