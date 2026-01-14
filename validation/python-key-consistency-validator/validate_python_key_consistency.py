#!/usr/bin/env python3
"""
Python Key Consistency Validator

Validates that Python code uses consistent key naming when dictionaries are created
in one function and consumed in another. This catches bugs like:
- Function A returns {'modelId': ...} (camelCase)
- Function B accesses dict['model_id'] (snake_case) - MISMATCH!

This type of bug causes KeyError at runtime because the keys don't match.

Usage:
    python validate_python_key_consistency.py <project_path>
"""

import ast
import re
from pathlib import Path
from typing import List, Dict, Any, Set, Tuple
from collections import defaultdict


def snake_to_camel(snake_str: str) -> str:
    """Convert snake_case to camelCase"""
    if not snake_str or '_' not in snake_str:
        return snake_str
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def camel_to_snake(camel_str: str) -> str:
    """Convert camelCase to snake_case"""
    if not camel_str:
        return camel_str
    # Insert underscore before uppercase letters and lowercase them
    result = re.sub('([A-Z])', r'_\1', camel_str).lower()
    # Remove leading underscore if present
    return result.lstrip('_')


def is_snake_case(key: str) -> bool:
    """Check if a key is snake_case"""
    if not isinstance(key, str):
        return False
    # Contains underscore and not all uppercase (CONSTANT_CASE)
    return '_' in key and not key.isupper() and key[0].islower()


def is_camel_case(key: str) -> bool:
    """Check if a key is camelCase (starts lowercase, has uppercase letters, no underscores)"""
    if not isinstance(key, str) or not key:
        return False
    return key[0].islower() and '_' not in key and any(c.isupper() for c in key)


def are_equivalent_keys(key1: str, key2: str) -> bool:
    """Check if two keys are equivalent (same meaning, different case)"""
    if key1 == key2:
        return True
    # Check if one is snake_case and other is camelCase of same word
    return (snake_to_camel(key1) == key2 or 
            snake_to_camel(key2) == key1 or
            camel_to_snake(key1) == key2 or
            camel_to_snake(key2) == key1)


class KeyUsageVisitor(ast.NodeVisitor):
    """
    AST visitor that tracks:
    1. Dictionary keys used when creating dictionaries (producers)
    2. Dictionary keys used when accessing dictionaries (consumers)
    """
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        # Track keys used in dictionary literals: {key: line_number, context}
        self.dict_literal_keys: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        # Track keys used in subscript access: dict['key'] or dict.get('key')
        self.dict_access_keys: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        # Current function context
        self.current_function = None
        
    def visit_FunctionDef(self, node: ast.FunctionDef):
        old_function = self.current_function
        self.current_function = node.name
        self.generic_visit(node)
        self.current_function = old_function
    
    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        old_function = self.current_function
        self.current_function = node.name
        self.generic_visit(node)
        self.current_function = old_function
    
    def visit_Dict(self, node: ast.Dict):
        """Track keys used in dictionary literals"""
        for key in node.keys:
            if isinstance(key, ast.Constant) and isinstance(key.value, str):
                key_str = key.value
                self.dict_literal_keys[key_str].append({
                    'line': key.lineno,
                    'function': self.current_function,
                    'type': 'literal'
                })
        self.generic_visit(node)
    
    def visit_Subscript(self, node: ast.Subscript):
        """Track keys used in dict['key'] access"""
        if isinstance(node.slice, ast.Constant) and isinstance(node.slice.value, str):
            key_str = node.slice.value
            self.dict_access_keys[key_str].append({
                'line': node.lineno,
                'function': self.current_function,
                'type': 'subscript'
            })
        self.generic_visit(node)
    
    def visit_Call(self, node: ast.Call):
        """Track keys used in dict.get('key') access"""
        if isinstance(node.func, ast.Attribute):
            if node.func.attr in ('get', 'pop', 'setdefault'):
                # First argument is the key
                if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                    key_str = node.args[0].value
                    self.dict_access_keys[key_str].append({
                        'line': node.lineno,
                        'function': self.current_function,
                        'type': f'{node.func.attr}()'
                    })
        self.generic_visit(node)


def find_key_inconsistencies(visitor: KeyUsageVisitor) -> List[Dict[str, Any]]:
    """
    Find keys that appear in both camelCase and snake_case forms.
    
    This catches the bug where:
    - A function creates {'modelId': ...}
    - Another function accesses dict['model_id']
    
    LIMITATION: This validator detects INCONSISTENCY but cannot determine
    which case is CORRECT. The rule is:
    - Internal Python dicts (for DB, between functions): snake_case
    - API response wrappers (success_response, etc.): camelCase
    
    This validator flags mismatches so developers can review and fix.
    """
    violations = []
    
    # Combine all keys
    all_literal_keys = set(visitor.dict_literal_keys.keys())
    all_access_keys = set(visitor.dict_access_keys.keys())
    all_keys = all_literal_keys | all_access_keys
    
    # Group equivalent keys
    key_groups: Dict[str, Set[str]] = {}  # normalized -> {variants}
    
    for key in all_keys:
        # Normalize to snake_case for grouping
        normalized = camel_to_snake(key) if is_camel_case(key) else key
        if normalized not in key_groups:
            key_groups[normalized] = set()
        key_groups[normalized].add(key)
    
    # Find groups with both camelCase and snake_case variants
    for normalized, variants in key_groups.items():
        if len(variants) <= 1:
            continue
        
        snake_variants = [v for v in variants if is_snake_case(v)]
        camel_variants = [v for v in variants if is_camel_case(v)]
        
        if snake_variants and camel_variants:
            # Found inconsistency!
            # Determine which is the producer (literal) and which is consumer (access)
            producers = []
            consumers = []
            
            for variant in variants:
                if variant in visitor.dict_literal_keys:
                    for usage in visitor.dict_literal_keys[variant]:
                        producers.append({**usage, 'key': variant})
                if variant in visitor.dict_access_keys:
                    for usage in visitor.dict_access_keys[variant]:
                        consumers.append({**usage, 'key': variant})
            
            # Check for producer/consumer mismatch
            producer_keys = set(p['key'] for p in producers)
            consumer_keys = set(c['key'] for c in consumers)
            
            # If producers use one style and consumers use another, it's a bug
            if producer_keys != consumer_keys:
                # Find the mismatched access
                for consumer in consumers:
                    if consumer['key'] not in producer_keys:
                        # This access uses a key that doesn't exist in producers
                        matching_producer = producers[0] if producers else None
                        expected_key = matching_producer['key'] if matching_producer else snake_to_camel(consumer['key'])
                        
                        violations.append({
                            'file': visitor.file_path,
                            'line': consumer['line'],
                            'violation': f"Key mismatch: accessing '{consumer['key']}' but dict was created with '{expected_key}'",
                            'expected': f"Use '{expected_key}' (matches dictionary creation)",
                            'severity': 'error',
                            'function': consumer['function'],
                            'producer_function': matching_producer['function'] if matching_producer else 'unknown',
                            'producer_line': matching_producer['line'] if matching_producer else 0
                        })
    
    return violations


def validate_python_file(file_path: Path) -> List[Dict[str, Any]]:
    """
    Validate a Python file for key consistency violations.
    """
    violations = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            tree = ast.parse(content)
    except Exception as e:
        return [{
            'file': str(file_path),
            'line': 0,
            'violation': f'Failed to parse file: {str(e)}',
            'expected': 'Valid Python file',
            'severity': 'error'
        }]
    
    visitor = KeyUsageVisitor(str(file_path))
    visitor.visit(tree)
    
    violations.extend(find_key_inconsistencies(visitor))
    
    return violations


def validate_project(project_path: Path) -> Dict[str, Any]:
    """
    Validate all Python files in a project for key consistency.
    """
    violations = []
    python_files = []
    
    # Paths to check
    check_paths = [
        project_path / "templates" / "_modules-core",
        project_path / "templates" / "_modules-functional",
        project_path / "templates" / "_project-infra-template",
        project_path / "packages",
    ]
    
    for check_path in check_paths:
        if check_path.exists():
            for py_file in check_path.rglob("*.py"):
                # Skip __pycache__, .venv, node_modules
                if any(skip in py_file.parts for skip in ['__pycache__', '.venv', 'node_modules', '.git']):
                    continue
                
                python_files.append(py_file)
                file_violations = validate_python_file(py_file)
                violations.extend(file_violations)
    
    return {
        'total_files': len(python_files),
        'violations': violations,
        'passed': len(violations) == 0
    }


def print_results(results: Dict[str, Any]) -> None:
    """Print validation results"""
    print("\n" + "="*80)
    print("Python Key Consistency Validation Results")
    print("="*80 + "\n")
    
    print(f"Files checked: {results['total_files']}")
    print(f"Violations found: {len(results['violations'])}")
    
    if results['passed']:
        print("\n✅ All files have consistent key naming!")
    else:
        print(f"\n❌ FAILED: Found {len(results['violations'])} key inconsistencies\n")
        
        # Group by file
        violations_by_file = defaultdict(list)
        for v in results['violations']:
            violations_by_file[v['file']].append(v)
        
        for file_path, file_violations in sorted(violations_by_file.items()):
            print(f"\n{file_path}:")
            for v in sorted(file_violations, key=lambda x: x['line']):
                print(f"  Line {v['line']}: {v['violation']}")
                print(f"           → {v['expected']}")
                if v.get('producer_function') and v.get('producer_line'):
                    print(f"           → Dict created in {v['producer_function']}() at line {v['producer_line']}")
        
        print("\n" + "-"*80)
        print("Fix: Ensure dictionary keys match between creation and access")
        print("  - If creating {'modelId': ...}, access with dict['modelId']")
        print("  - If creating {'model_id': ...}, access with dict['model_id']")
        print("-"*80)


def main():
    """Main entry point"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python validate_python_key_consistency.py <project_path>")
        sys.exit(1)
    
    project_path = Path(sys.argv[1])
    if not project_path.exists():
        print(f"Error: Project path does not exist: {project_path}")
        sys.exit(1)
    
    results = validate_project(project_path)
    print_results(results)
    
    sys.exit(0 if results['passed'] else 1)


if __name__ == "__main__":
    main()
