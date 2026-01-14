#!/usr/bin/env python3
"""
RPC Function Validator

Validates that Lambda code only calls database RPC functions that actually exist.
Detects mismatches between Lambda RPC calls and database function definitions.

Usage:
    python validate_rpc_functions.py <templates_path>
    
Example:
    python validate_rpc_functions.py /path/to/cora-dev-toolkit/templates
"""

import argparse
import os
import re
import sys
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple


@dataclass
class RPCCall:
    """Represents an RPC function call found in Lambda code."""
    function_name: str
    file_path: str
    line_number: int
    line_content: str


@dataclass
class DBFunction:
    """Represents a database function definition."""
    function_name: str
    file_path: str
    line_number: int
    parameters: Optional[str] = None


@dataclass
class ValidationError:
    """Represents a validation error."""
    severity: str  # 'error' or 'warning'
    rpc_call: RPCCall
    message: str
    suggestion: Optional[str] = None


class RPCFunctionValidator:
    """Validates Lambda RPC calls against database function definitions."""
    
    # Patterns for extracting RPC calls from Python
    RPC_PATTERNS = [
        # common.rpc(function_name='name', ...)
        r"common\.rpc\s*\(\s*function_name\s*=\s*['\"]([^'\"]+)['\"]",
        # common.rpc('name', ...)
        r"common\.rpc\s*\(\s*['\"]([^'\"]+)['\"]",
        # supabase.rpc('name', ...)
        r"supabase\.rpc\s*\(\s*['\"]([^'\"]+)['\"]",
    ]
    
    # Pattern for extracting function definitions from SQL
    SQL_FUNCTION_PATTERN = r"CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)\s*\("
    
    def __init__(self):
        self.rpc_calls: List[RPCCall] = []
        self.db_functions: Dict[str, DBFunction] = {}
        self.errors: List[ValidationError] = []
        
    def find_lambda_files(self, base_path: Path) -> List[Path]:
        """Find all Lambda Python files."""
        lambda_files = []
        
        # Search in modules-core and modules-functional
        search_paths = [
            base_path / "_modules-core",
            base_path / "_modules-functional",
        ]
        
        for search_path in search_paths:
            if not search_path.exists():
                continue
            for py_file in search_path.rglob("lambda_function.py"):
                lambda_files.append(py_file)
            # Also check for other .py files in lambda directories
            for py_file in search_path.rglob("lambdas/**/*.py"):
                if py_file.name != "__init__.py":
                    lambda_files.append(py_file)
                    
        return list(set(lambda_files))  # Remove duplicates
    
    def find_sql_files(self, base_path: Path) -> List[Path]:
        """Find all SQL schema files."""
        sql_files = []
        
        # Search in modules-core and modules-functional
        search_paths = [
            base_path / "_modules-core",
            base_path / "_modules-functional",
        ]
        
        for search_path in search_paths:
            if not search_path.exists():
                continue
            for sql_file in search_path.rglob("*.sql"):
                sql_files.append(sql_file)
                
        return sql_files
    
    def extract_rpc_calls(self, file_path: Path) -> List[RPCCall]:
        """Extract RPC function calls from a Python file."""
        calls = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
        except Exception as e:
            print(f"Warning: Could not read {file_path}: {e}", file=sys.stderr)
            return calls
        
        # First, try line-by-line matching for simple cases
        for i, line in enumerate(lines, 1):
            for pattern in self.RPC_PATTERNS:
                matches = re.findall(pattern, line)
                for match in matches:
                    calls.append(RPCCall(
                        function_name=match,
                        file_path=str(file_path),
                        line_number=i,
                        line_content=line.strip()
                    ))
        
        # Also do multi-line matching for calls that span lines
        # Pattern for multi-line: common.rpc(\n    function_name='...'
        multiline_patterns = [
            # common.rpc(\n...function_name='name'
            r"common\.rpc\s*\(\s*\n?\s*function_name\s*=\s*['\"]([^'\"]+)['\"]",
            # supabase.rpc(\n...'name'
            r"supabase\.rpc\s*\(\s*\n?\s*['\"]([^'\"]+)['\"]",
        ]
        
        for pattern in multiline_patterns:
            for match in re.finditer(pattern, content, re.MULTILINE | re.DOTALL):
                func_name = match.group(1)
                # Calculate line number from position
                line_num = content[:match.start()].count('\n') + 1
                # Get the line content
                line_content = lines[line_num - 1].strip() if line_num <= len(lines) else ""
                
                # Check if this call was already captured
                already_captured = any(
                    c.function_name == func_name and abs(c.line_number - line_num) <= 2
                    for c in calls
                )
                
                if not already_captured:
                    calls.append(RPCCall(
                        function_name=func_name,
                        file_path=str(file_path),
                        line_number=line_num,
                        line_content=line_content
                    ))
        
        return calls
    
    def extract_db_functions(self, file_path: Path) -> List[DBFunction]:
        """Extract function definitions from a SQL file."""
        functions = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
        except Exception as e:
            print(f"Warning: Could not read {file_path}: {e}", file=sys.stderr)
            return functions
        
        # Find all function definitions
        for i, line in enumerate(lines, 1):
            match = re.search(self.SQL_FUNCTION_PATTERN, line, re.IGNORECASE)
            if match:
                functions.append(DBFunction(
                    function_name=match.group(1).lower(),
                    file_path=str(file_path),
                    line_number=i
                ))
        
        return functions
    
    def find_similar_functions(self, target: str, threshold: float = 0.6) -> List[Tuple[str, float]]:
        """Find database functions similar to the target name."""
        similarities = []
        
        for func_name in self.db_functions.keys():
            ratio = SequenceMatcher(None, target.lower(), func_name.lower()).ratio()
            if ratio >= threshold:
                similarities.append((func_name, ratio))
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities
    
    def validate(self, templates_path: str) -> bool:
        """
        Run validation on the templates directory.
        
        Returns:
            True if validation passed (no errors), False otherwise
        """
        base_path = Path(templates_path)
        
        if not base_path.exists():
            print(f"Error: Path does not exist: {templates_path}", file=sys.stderr)
            return False
        
        # Find all files
        lambda_files = self.find_lambda_files(base_path)
        sql_files = self.find_sql_files(base_path)
        
        print(f"Found {len(lambda_files)} Lambda files")
        print(f"Found {len(sql_files)} SQL schema files")
        print()
        
        # Extract database functions
        for sql_file in sql_files:
            functions = self.extract_db_functions(sql_file)
            for func in functions:
                self.db_functions[func.function_name] = func
        
        print(f"Found {len(self.db_functions)} database functions:")
        for func_name in sorted(self.db_functions.keys()):
            print(f"  - {func_name}")
        print()
        
        # Extract RPC calls
        for lambda_file in lambda_files:
            calls = self.extract_rpc_calls(lambda_file)
            self.rpc_calls.extend(calls)
        
        print(f"Found {len(self.rpc_calls)} RPC calls in Lambda code")
        print()
        
        # Validate each RPC call
        for call in self.rpc_calls:
            func_name_lower = call.function_name.lower()
            
            if func_name_lower not in self.db_functions:
                # Function not found - try to find similar
                similar = self.find_similar_functions(call.function_name)
                
                suggestion = None
                if similar:
                    best_match = similar[0]
                    suggestion = f"Did you mean '{best_match[0]}'? (similarity: {best_match[1]:.0%})"
                
                self.errors.append(ValidationError(
                    severity='error',
                    rpc_call=call,
                    message=f"RPC function '{call.function_name}' does not exist in database schema",
                    suggestion=suggestion
                ))
        
        # Print results
        self._print_results()
        
        return len(self.errors) == 0
    
    def _print_results(self):
        """Print validation results."""
        if not self.errors:
            print("=" * 60)
            print("✅ VALIDATION PASSED - All RPC calls match database functions")
            print("=" * 60)
            return
        
        print("=" * 60)
        print(f"❌ VALIDATION FAILED - {len(self.errors)} errors found")
        print("=" * 60)
        print()
        
        # Group errors by file
        errors_by_file: Dict[str, List[ValidationError]] = {}
        for error in self.errors:
            file_path = error.rpc_call.file_path
            if file_path not in errors_by_file:
                errors_by_file[file_path] = []
            errors_by_file[file_path].append(error)
        
        for file_path, errors in errors_by_file.items():
            print(f"📄 {file_path}")
            print("-" * 60)
            for error in errors:
                print(f"  Line {error.rpc_call.line_number}: {error.message}")
                if error.suggestion:
                    print(f"    💡 {error.suggestion}")
                print(f"    Code: {error.rpc_call.line_content[:80]}...")
            print()
        
        print("=" * 60)
        print(f"Total: {len(self.errors)} errors")
        print("=" * 60)
    
    def get_errors(self) -> List[ValidationError]:
        """Get list of validation errors."""
        return self.errors
    
    def get_db_functions(self) -> Dict[str, DBFunction]:
        """Get dictionary of database functions."""
        return self.db_functions
    
    def get_rpc_calls(self) -> List[RPCCall]:
        """Get list of RPC calls found."""
        return self.rpc_calls


def main():
    parser = argparse.ArgumentParser(
        description="Validate Lambda RPC calls against database function definitions"
    )
    parser.add_argument(
        "templates_path",
        help="Path to the templates directory (e.g., /path/to/cora-dev-toolkit/templates)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show verbose output"
    )
    
    args = parser.parse_args()
    
    validator = RPCFunctionValidator()
    success = validator.validate(args.templates_path)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
