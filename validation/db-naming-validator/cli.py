#!/usr/bin/env python3
"""
Database Naming Standards Validator CLI

CLI interface for the validation orchestrator.
"""

import sys
import json
import argparse
import importlib.util
from pathlib import Path
from typing import List

# Import shared output format utilities (with fallback for backward compatibility)
try:
    from validation.shared.output_format import (
        create_error,
        create_warning,
        extract_module_from_path,
        SEVERITY_HIGH,
        SEVERITY_MEDIUM,
    )
    SHARED_FORMAT_AVAILABLE = True
except ImportError:
    SHARED_FORMAT_AVAILABLE = False
    
    # Fallback functions for backward compatibility
    def create_error(file, line, message, category="Database Naming", suggestion=None, module=None):
        return {
            "file": file,
            "line": line,
            "message": message,
            "severity": "high",
            "category": category,
            "suggestion": suggestion,
            "module": module,
        }
    
    def create_warning(file, line, message, category="Database Naming", suggestion=None, module=None):
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
        if not file_path:
            return None
        
        # Try to extract module name from path
        import re
        match = re.search(r'module-([a-z]+)', str(file_path))
        if match:
            return f"module-{match.group(1)}"
        return None
    
    SEVERITY_HIGH = "high"
    SEVERITY_MEDIUM = "medium"

# Import validation logic from the scripts directory
# The file is named validate-db-naming.py (with hyphens), so we need to use importlib
scripts_dir = Path(__file__).parent.parent.parent / "scripts"
validate_module_path = scripts_dir / "validate-db-naming.py"

if validate_module_path.exists():
    spec = importlib.util.spec_from_file_location("validate_db_naming", validate_module_path)
    validate_db_naming = importlib.util.module_from_spec(spec)
    sys.modules["validate_db_naming"] = validate_db_naming
    spec.loader.exec_module(validate_db_naming)
    
    find_sql_files = validate_db_naming.find_sql_files
    validate_sql_file = validate_db_naming.validate_sql_file
    ValidationResult = validate_db_naming.ValidationResult
else:
    # Fallback error if module not found
    def find_sql_files(path):
        return []
    def validate_sql_file(path, result):
        pass
    class ValidationResult:
        def __init__(self):
            self.errors = []
            self.warnings = []
            self.info = []
        def has_errors(self):
            return len(self.errors) > 0
        def print_report(self):
            return 0


def _standardize_error(file: str, line: int, message: str, project_root: Path):
    """Convert error tuple to standard format."""
    module = extract_module_from_path(file)
    return create_error(
        file=file,
        line=line,
        message=message,
        category="Database Naming",
        module=module,
    )


def _standardize_warning(file: str, line: int, message: str, project_root: Path):
    """Convert warning tuple to standard format."""
    module = extract_module_from_path(file)
    return create_warning(
        file=file,
        line=line,
        message=message,
        category="Database Naming",
        module=module,
    )


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
            error = create_error("", 0, f"Path not found: {args.path}", "Database Naming")
            print(json.dumps({
                "errors": [error],
                "warnings": [],
                "passed": False
            }))
        else:
            print(f"Error: Path not found: {args.path}", file=sys.stderr)
        return 1
    
    # Find SQL files
    sql_files = []
    
    # Search for schema files in typical CORA locations
    if path.is_dir():
        # Look for db/schema directories (only in packages/ or templates/)
        schema_dirs = list(path.rglob("db/schema"))
        if schema_dirs:
            for schema_dir in schema_dirs:
                sql_files.extend(find_sql_files(schema_dir))
        
        # If no db/schema found, try templates/_modules-* pattern
        if not sql_files:
            # Look in toolkit template modules
            for module_schema in path.rglob("_modules-*/*/db/schema"):
                sql_files.extend(find_sql_files(module_schema))
        
        # Filter out non-schema SQL files (scripts, migrations, etc.)
        sql_files = [
            f for f in sql_files 
            if '/scripts/' not in str(f) 
            and '/migrations/' not in str(f)
            and 'drop-' not in f.name.lower()
            and 'cleanup' not in f.name.lower()
        ]
    else:
        sql_files = find_sql_files(path)
    
    # Run validation
    result = ValidationResult()
    
    for sql_file in sql_files:
        validate_sql_file(sql_file, result)
    
    # Format output
    if args.format == "json":
        # Standardize to new format
        standardized_errors = [
            _standardize_error(f, line, msg, path)
            for f, line, msg in result.errors
        ]
        
        standardized_warnings = [
            _standardize_warning(f, line, msg, path)
            for f, line, msg in result.warnings
        ]
        
        output = {
            "errors": standardized_errors,
            "warnings": standardized_warnings,
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
