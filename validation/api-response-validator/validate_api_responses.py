#!/usr/bin/env python3
"""
API Response Format Validator

Validates that Lambda functions return camelCase responses according to CORA API standards.

Usage:
    python validate_api_responses.py <project_path>
"""

import ast
import re
import json
from pathlib import Path
from typing import List, Dict, Any


def snake_to_camel(snake_str: str) -> str:
    """Convert snake_case to camelCase"""
    if not snake_str or '_' not in snake_str:
        return snake_str
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def is_snake_case(key: str) -> bool:
    """Check if a key is snake_case (not camelCase or CONSTANT_CASE)"""
    if not isinstance(key, str):
        return False
    
    # Ignore CONSTANT_CASE (all uppercase with underscores)
    if key.isupper():
        return False
    
    # Ignore if it starts with uppercase (PascalCase)
    if key and key[0].isupper():
        return False
    
    # Check for underscores (snake_case indicator)
    return '_' in key


def is_database_operation(node: ast.AST, parent: ast.AST = None) -> bool:
    """Check if a dictionary is part of a database operation (should be ignored)"""
    # Check if this is a keyword argument named 'filters', 'data', 'select', 'params', etc.
    if isinstance(parent, ast.keyword):
        db_keywords = ['filters', 'data', 'select', 'where', 'values', 'set', 'params']
        if parent.arg in db_keywords:
            return True
    
    # Check if parent is a call to database functions
    if isinstance(parent, ast.Call):
        if isinstance(parent.func, ast.Attribute):
            # Check for common.find_one, common.update_one, common.rpc, etc.
            func_name = getattr(parent.func, 'attr', '')
            db_functions = ['find_one', 'find_many', 'update_one', 'update_many', 
                          'insert_one', 'insert_many', 'delete_one', 'delete_many',
                          'select', 'execute', 'rpc']
            if func_name in db_functions:
                return True
    
    return False


def check_dict_keys(node: ast.AST, file_path: Path, line_offset: int = 0, parent: ast.AST = None) -> List[Dict[str, Any]]:
    """Check dictionary keys for snake_case violations (only in API responses)"""
    violations = []
    
    if isinstance(node, ast.Dict):
        # Skip if this is part of a database operation
        if not is_database_operation(node, parent):
            for key in node.keys:
                if isinstance(key, ast.Constant) and isinstance(key.value, str):
                    if is_snake_case(key.value):
                        violations.append({
                            'file': str(file_path),
                            'line': key.lineno + line_offset,
                            'violation': f'Snake_case key in response: {key.value}',
                            'expected': snake_to_camel(key.value),
                            'severity': 'error'
                        })
    
    # Recursively check nested structures, passing parent context
    for child in ast.iter_child_nodes(node):
        violations.extend(check_dict_keys(child, file_path, line_offset, node))
    
    return violations


def check_lambda_response_format(lambda_file: Path) -> List[Dict[str, Any]]:
    """
    Parse Lambda function to check response format
    
    Checks:
    1. Response dictionaries use camelCase keys
    2. No snake_case keys in API responses
    3. Compliance with CORA API standard
    """
    violations = []
    
    try:
        with open(lambda_file, 'r', encoding='utf-8') as f:
            content = f.read()
            tree = ast.parse(content)
    except Exception as e:
        return [{
            'file': str(lambda_file),
            'line': 0,
            'violation': f'Failed to parse file: {str(e)}',
            'expected': 'Valid Python file',
            'severity': 'error'
        }]
    
    # Find all function definitions
    for node in ast.walk(tree):
        # Check return statements
        if isinstance(node, ast.Return) and node.value:
            violations.extend(check_dict_keys(node.value, lambda_file))
        
        # Check variable assignments that might be responses
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                # Check variables with 'result' in name
                if isinstance(target, ast.Name) and 'result' in target.id.lower():
                    violations.extend(check_dict_keys(node.value, lambda_file))
                
                # NEW: Check subscript assignments (dict["key"] = {...})
                elif isinstance(target, ast.Subscript):
                    violations.extend(check_dict_keys(node.value, lambda_file))
    
    return violations


def validate_project_api_responses(project_path: Path) -> Dict[str, Any]:
    """
    Validate all Lambda functions in a project for API response compliance
    
    Args:
        project_path: Path to the project root
        
    Returns:
        dict: {
            'total_files': int,
            'violations': list,
            'passed': bool
        }
    """
    violations = []
    lambda_files = []
    backend_paths = []
    
    # 1. Deployed project - Dynamic discovery of all modules in packages/
    packages_dir = project_path / "packages"
    if packages_dir.exists():
        for module_dir in packages_dir.iterdir():
            if module_dir.is_dir() and module_dir.name.startswith('module-'):
                lambdas_path = module_dir / "backend" / "lambdas"
                if lambdas_path.exists():
                    backend_paths.append(lambdas_path)
    
    # 2. Templates - Core modules
    templates_core = project_path / "templates" / "_modules-core"
    if templates_core.exists():
        for module_dir in templates_core.iterdir():
            if module_dir.is_dir() and module_dir.name.startswith('module-'):
                lambdas_path = module_dir / "backend" / "lambdas"
                if lambdas_path.exists():
                    backend_paths.append(lambdas_path)
    
    # 3. Templates - Functional modules
    templates_functional = project_path / "templates" / "_modules-functional"
    if templates_functional.exists():
        for module_dir in templates_functional.iterdir():
            if module_dir.is_dir() and module_dir.name.startswith('module-'):
                lambdas_path = module_dir / "backend" / "lambdas"
                if lambdas_path.exists():
                    backend_paths.append(lambdas_path)
    
    # Scan all discovered paths
    for backend_path in backend_paths:
        for lambda_file in backend_path.rglob("lambda_function.py"):
            lambda_files.append(lambda_file)
            file_violations = check_lambda_response_format(lambda_file)
            violations.extend(file_violations)
    
    return {
        'total_files': len(lambda_files),
        'violations': violations,
        'passed': len(violations) == 0
    }


def print_results(results: Dict[str, Any]) -> None:
    """Print validation results in a readable format"""
    print("\n" + "="*80)
    print("API Response Format Validation Results")
    print("="*80 + "\n")
    
    print(f"Files checked: {results['total_files']}")
    print(f"Violations found: {len(results['violations'])}")
    
    if results['passed']:
        print("\n✅ All Lambda functions comply with camelCase API standard!")
    else:
        print("\n❌ FAILED: Found snake_case keys in API responses\n")
        
        # Group violations by file
        violations_by_file = {}
        for violation in results['violations']:
            file_path = violation['file']
            if file_path not in violations_by_file:
                violations_by_file[file_path] = []
            violations_by_file[file_path].append(violation)
        
        # Print grouped violations
        for file_path, file_violations in violations_by_file.items():
            print(f"\n{file_path}:")
            for v in file_violations:
                print(f"  Line {v['line']}: {v['violation']}")
                print(f"           → Expected: '{v['expected']}'")
        
        print("\n" + "-"*80)
        print("Fix: Replace snake_case keys with camelCase in API responses")
        print("See: docs/standards/standard_API-PATTERNS.md")
        print("-"*80)


def main():
    """Main entry point"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python validate_api_responses.py <project_path>")
        sys.exit(1)
    
    project_path = Path(sys.argv[1])
    if not project_path.exists():
        print(f"Error: Project path does not exist: {project_path}")
        sys.exit(1)
    
    results = validate_project_api_responses(project_path)
    print_results(results)
    
    # Exit with error code if validation failed
    sys.exit(0 if results['passed'] else 1)


if __name__ == "__main__":
    main()
