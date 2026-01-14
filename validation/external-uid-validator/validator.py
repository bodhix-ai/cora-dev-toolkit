"""
External UID Conversion Validator

Validates that Lambda functions properly convert external UIDs (from authorizer)
to Supabase UUIDs before using them in database queries.

This prevents the recurring error:
  "invalid input syntax for type uuid: \"email@example.com\""
"""

import ast
import logging
from pathlib import Path
from typing import List, Dict, Any, Set

logger = logging.getLogger(__name__)


class ExternalUIDValidator:
    """Validates proper external UID to Supabase UUID conversion."""
    
    def __init__(self):
        self.errors: List[Dict[str, Any]] = []
        self.current_file: str = ""
    
    def validate_file(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Validate a single Python file for proper external UID conversion.
        
        Args:
            file_path: Path to the Python file
            
        Returns:
            List of validation errors
        """
        self.current_file = file_path
        self.errors = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                source = f.read()
            
            tree = ast.parse(source, filename=file_path)
            self._analyze_file(tree, source)
            
            return self.errors
            
        except SyntaxError as e:
            logger.error(f"Syntax error in {file_path}: {e}")
            return []
        except Exception as e:
            logger.error(f"Failed to validate {file_path}: {e}")
            return []
    
    def validate_directory(self, directory: str) -> List[Dict[str, Any]]:
        """
        Validate all Python Lambda files in a directory.
        
        Args:
            directory: Directory path
            
        Returns:
            List of all validation errors found
        """
        all_errors = []
        path = Path(directory)
        ignored_dirs = {'.build', 'dist', 'node_modules', '.venv', '__pycache__', 'backend-archive'}
        
        # Only validate Lambda function files (typically lambda_function.py)
        for file_path in path.glob("**/lambda_function.py"):
            # Check if file is in an ignored directory
            if any(part in ignored_dirs for part in file_path.parts):
                continue
                
            if file_path.is_file():
                errors = self.validate_file(str(file_path))
                all_errors.extend(errors)
        
        logger.info(f"Validated directory {directory}: found {len(all_errors)} external UID conversion issues")
        return all_errors
    
    def _analyze_file(self, tree: ast.AST, source: str):
        """Analyze file for external UID usage patterns."""
        
        # Strategy: Find functions that:
        # 1. Call common.get_user_from_event(event)
        # 2. Use user_info['user_id'] in database queries
        # 3. Don't call common.get_supabase_user_id_from_external_uid() first
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                self._analyze_function(node, source)
    
    def _analyze_function(self, func_node: ast.FunctionDef, source: str):
        """Analyze a function for external UID conversion issues."""
        
        # Track if function gets user_info from event
        has_get_user_from_event = False
        has_uid_conversion = False
        direct_uid_usage_lines: Set[int] = set()
        
        # Walk through function body
        for node in ast.walk(func_node):
            # Check for common.get_user_from_event(event)
            if isinstance(node, ast.Call):
                if self._is_get_user_from_event(node):
                    has_get_user_from_event = True
                
                # Check for UID conversion call
                if self._is_get_supabase_user_id(node):
                    has_uid_conversion = True
                
                # Check for database queries using user_info['user_id']
                if self._is_db_query_with_user_info(node):
                    direct_uid_usage_lines.add(node.lineno)
        
        # If function gets user_info but uses it directly in queries without conversion
        if has_get_user_from_event and not has_uid_conversion and direct_uid_usage_lines:
            for line_no in direct_uid_usage_lines:
                self.errors.append({
                    'severity': 'error',
                    'file': self.current_file,
                    'line': line_no,
                    'issue': "user_info['user_id'] used directly in database query without UUID conversion",
                    'suggestion': "Call common.get_supabase_user_id_from_external_uid(user_info['user_id']) to convert external UID to Supabase UUID first",
                    'pattern': 'external_uid_conversion'
                })
    
    def _is_get_user_from_event(self, node: ast.Call) -> bool:
        """Check if node is common.get_user_from_event(event) call."""
        if isinstance(node.func, ast.Attribute):
            if node.func.attr == 'get_user_from_event':
                if isinstance(node.func.value, ast.Name):
                    return node.func.value.id == 'common'
        return False
    
    def _is_get_supabase_user_id(self, node: ast.Call) -> bool:
        """Check if node calls UID conversion function."""
        if isinstance(node.func, ast.Attribute):
            if node.func.attr == 'get_supabase_user_id_from_external_uid':
                if isinstance(node.func.value, ast.Name):
                    return node.func.value.id == 'common'
        return False
    
    def _is_db_query_with_user_info(self, node: ast.Call) -> bool:
        """Check if node is a database query using user_info['user_id']."""
        
        # Check if this is an org_common database method
        if not isinstance(node.func, ast.Attribute):
            return False
        
        method_name = node.func.attr
        if method_name not in ['find_one', 'find_many', 'update_one', 'insert_one', 'delete_one']:
            return False
        
        if not isinstance(node.func.value, ast.Name) or node.func.value.id != 'common':
            return False
        
        # Check if any argument contains user_info['user_id']
        for arg in node.args:
            if self._contains_user_info_user_id(arg):
                return True
        
        for keyword in node.keywords:
            if self._contains_user_info_user_id(keyword.value):
                return True
        
        return False
    
    def _contains_user_info_user_id(self, node: ast.AST) -> bool:
        """Check if node contains user_info['user_id'] reference."""
        
        # Direct subscript: user_info['user_id']
        if isinstance(node, ast.Subscript):
            if isinstance(node.value, ast.Name) and node.value.id == 'user_info':
                if isinstance(node.slice, ast.Constant) and node.slice.value == 'user_id':
                    return True
                # Python 3.8 compatibility
                elif isinstance(node.slice, ast.Index):
                    if isinstance(node.slice.value, ast.Constant) and node.slice.value.value == 'user_id':
                        return True
        
        # Check inside dictionaries
        if isinstance(node, ast.Dict):
            for value in node.values:
                if self._contains_user_info_user_id(value):
                    return True
        
        # Recursively check nested structures
        for child in ast.iter_child_nodes(node):
            if self._contains_user_info_user_id(child):
                return True
        
        return False


def validate(directory: str) -> Dict[str, Any]:
    """
    Main entry point for external UID conversion validation.
    
    Args:
        directory: Directory to validate
        
    Returns:
        Dictionary with validation results
    """
    validator = ExternalUIDValidator()
    errors = validator.validate_directory(directory)
    
    return {
        'validator': 'external-uid-validator',
        'passed': len(errors) == 0,
        'error_count': len(errors),
        'errors': errors
    }


if __name__ == '__main__':
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python validator.py <directory>")
        sys.exit(1)
    
    result = validate(sys.argv[1])
    print(json.dumps(result, indent=2))
    sys.exit(0 if result['passed'] else 1)
