#!/usr/bin/env python3
"""
API Response Format Validator

Validates that Lambda functions return camelCase responses according to CORA API standards.
Also validates that TypeScript frontend code uses camelCase when accessing API response properties.

Usage:
    python validate_api_responses.py <project_path>
"""

import ast
import re
import json
from pathlib import Path
from typing import List, Dict, Any, Set


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


def is_config_or_internal(node: ast.AST, parent: ast.AST = None) -> bool:
    """Check if a dictionary is part of configuration/internal code (should be ignored)"""
    # Check if this is a boto3 Config object or its parameters
    if isinstance(parent, ast.keyword):
        # Boto3 Config parameters (retries, etc.)
        config_keywords = ['retries', 'config', 'boto_config']
        if parent.arg in config_keywords:
            return True
    
    # Check if parent is a call to Config()
    if isinstance(parent, ast.Call):
        if isinstance(parent.func, ast.Name):
            # Direct Config() call
            if parent.func.id == 'Config':
                return True
        elif isinstance(parent.func, ast.Attribute):
            # botocore.config.Config() or similar
            if parent.func.attr == 'Config':
                return True
    
    return False


def is_in_response_context(node: ast.AST, ancestors: List[ast.AST]) -> bool:
    """Check if a dictionary is in a context that will be returned as an API response"""
    # Walk up the ancestor chain to find context
    for i, ancestor in enumerate(ancestors):
        # Check if we're inside a response wrapper function call
        if isinstance(ancestor, ast.Call) and isinstance(ancestor.func, ast.Attribute):
            func_name = ancestor.func.attr
            response_functions = [
                'success_response', 'created_response', 'error_response',
                'bad_request_response', 'not_found_response', 'forbidden_response',
                'unauthorized_response', 'internal_error_response', 'method_not_allowed_response'
            ]
            if func_name in response_functions:
                return True
        
        # Check if we're in a return statement
        if isinstance(ancestor, ast.Return):
            # But make sure we're not in a database operation or config
            parent = ancestors[i-1] if i > 0 else None
            if not is_database_operation(node, parent) and not is_config_or_internal(node, parent):
                return True
    
    return False


def check_dict_keys(node: ast.AST, file_path: Path, line_offset: int = 0, parent: ast.AST = None, ancestors: List[ast.AST] = None) -> List[Dict[str, Any]]:
    """Check dictionary keys for snake_case violations (only in API responses)"""
    violations = []
    
    if ancestors is None:
        ancestors = []
    
    if isinstance(node, ast.Dict):
        # Skip if this is part of a database operation
        if is_database_operation(node, parent):
            return violations
        
        # Skip if this is part of configuration or internal code
        if is_config_or_internal(node, parent):
            return violations
        
        # Only flag if we're in a response context
        if is_in_response_context(node, ancestors):
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
    
    # Recursively check nested structures, passing parent context and ancestors
    new_ancestors = ancestors + [node]
    for child in ast.iter_child_nodes(node):
        violations.extend(check_dict_keys(child, file_path, line_offset, node, new_ancestors))
    
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
    
    # Response variable patterns that typically contain API response data
    RESPONSE_VAR_PATTERNS = [
        'result', 'config', 'stats', 'analytics', 'response', 'data',
        'workspace', 'member', 'settings', 'favorite', 'summary'
    ]
    
    # Build ancestor tracking for better context awareness
    # We need to traverse the tree and track ancestors for each node
    def check_node_with_ancestors(node: ast.AST, ancestors: List[ast.AST] = None):
        if ancestors is None:
            ancestors = []
        
        nonlocal violations
        
        # Check return statements
        if isinstance(node, ast.Return) and node.value:
            violations.extend(check_dict_keys(node.value, lambda_file, 0, node, ancestors))
        
        # Check arguments to response wrapper functions ONLY
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Attribute):
                func_name = node.func.attr
                response_functions = [
                    'success_response', 'created_response', 'error_response',
                    'bad_request_response', 'not_found_response', 'forbidden_response',
                    'unauthorized_response', 'internal_error_response', 'method_not_allowed_response'
                ]
                if func_name in response_functions:
                    # Check all arguments to these functions
                    for arg in node.args:
                        violations.extend(check_dict_keys(arg, lambda_file, 0, node, ancestors + [node]))
                    # Also check keyword arguments
                    for keyword in node.keywords:
                        violations.extend(check_dict_keys(keyword.value, lambda_file, 0, keyword, ancestors + [node]))
        
        # Recursively process children with updated ancestors
        for child in ast.iter_child_nodes(node):
            check_node_with_ancestors(child, ancestors + [node])
    
    # Start traversal from root
    check_node_with_ancestors(tree)
    
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
    
    # 4. Templates - Project infra template (authorizer, etc.)
    project_infra_lambdas = project_path / "templates" / "_project-infra-template" / "lambdas"
    if project_infra_lambdas.exists():
        backend_paths.append(project_infra_lambdas)
    
    # 5. Templates - Module template (generic module template)
    module_template_lambdas = project_path / "templates" / "_module-template" / "backend" / "lambdas"
    if module_template_lambdas.exists():
        backend_paths.append(module_template_lambdas)
    
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


# ============================================================================
# TypeScript/JavaScript Frontend Validation
# ============================================================================

# Common snake_case property names that appear in API responses
# These are the patterns we look for in frontend code
SNAKE_CASE_PATTERNS = [
    # User/Profile related
    r'\bdisplay_name\b', r'\bavatar_url\b', r'\buser_id\b', r'\bexternal_uid\b',
    r'\bcreated_at\b', r'\bupdated_at\b', r'\bdeleted_at\b',
    # Workspace related  
    r'\bws_role\b', r'\bws_id\b', r'\borg_id\b', r'\bmember_count\b',
    r'\bis_favorited\b', r'\bfavorited_at\b', r'\buser_role\b',
    r'\bretention_days\b', r'\bcreated_by\b',
    # Config related
    r'\bnav_label_singular\b', r'\bnav_label_plural\b', r'\bnav_icon\b',
    r'\benable_favorites\b', r'\benable_tags\b', r'\benable_color_coding\b',
    r'\bdefault_color\b', r'\bdefault_retention_days\b',
    r'\bmax_tags_per_workspace\b', r'\bmax_tag_length\b',
    # Analytics/Stats related
    r'\btotal_workspaces\b', r'\bactive_workspaces\b', r'\barchived_workspaces\b',
    r'\bdeleted_workspaces\b', r'\btotal_members\b', r'\bavg_members_per_workspace\b',
    r'\bcreated_this_month\b', r'\binactive_workspaces\b', r'\bmost_active\b',
    # Organization related
    r'\ballow_user_creation\b', r'\bdefault_org_role\b', r'\bplatform_wide\b',
    r'\bby_organization\b', r'\borg_name\b', r'\borg_role\b',
    # General patterns with underscores (catch-all for common API field patterns)
    r'\b[a-z]+_[a-z]+_[a-z]+\b',  # three_word_patterns
]

# Patterns to EXCLUDE (valid snake_case usage)
EXCLUDE_PATTERNS = [
    r'org_id',  # Query param names are ok
    r'ws_owner', r'ws_admin', r'ws_user',  # Role constants are ok
    r'sys_admin', r'sys_owner', r'org_admin', r'org_owner',  # Role constants
    r'import.*from',  # Import statements
    r'class\s+\w+',  # Class definitions
    r'function\s+\w+',  # Function definitions
    r'const\s+\w+_\w+\s*=',  # Constant definitions (UPPER_SNAKE is ok)
    r'type\s+\w+',  # Type definitions
    r'interface\s+\w+',  # Interface definitions
]

# UPPER_SNAKE_CASE patterns to exclude (these are constants, not API properties)
UPPER_SNAKE_PATTERNS = [
    r'^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$',  # CONSTANT_CASE like OKTA_CLIENT_ID
]

# File patterns to check in frontend
FRONTEND_FILE_PATTERNS = ['*.ts', '*.tsx', '*.js', '*.jsx']

# Directories to skip
SKIP_DIRS = {'node_modules', '.next', 'dist', 'build', '.git', '__pycache__'}

# Pattern to detect snake_case properties in TypeScript interface/type definitions
# Matches: property_name: type  OR  property_name?: type
INTERFACE_PROPERTY_PATTERN = re.compile(r'^\s+([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\s*\??\s*:', re.MULTILINE)


def check_interface_definitions(file_path: Path, content: str) -> List[Dict[str, Any]]:
    """
    Check TypeScript interface/type definitions for snake_case properties.
    
    These define the expected shape of API responses and should use camelCase.
    """
    violations = []
    lines = content.split('\n')
    
    in_interface = False
    interface_depth = 0
    
    for line_num, line in enumerate(lines, 1):
        stripped = line.strip()
        
        # Skip comment lines
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            continue
        
        # Track when we enter an interface or type definition
        if re.match(r'^\s*(export\s+)?(interface|type)\s+\w+', line):
            in_interface = True
            interface_depth = 0
        
        # Track brace depth
        if in_interface:
            interface_depth += line.count('{') - line.count('}')
            if interface_depth <= 0:
                in_interface = False
                continue
            
            # Check for snake_case property definitions inside interface
            # Pattern: property_name: type  OR  property_name?: type
            match = re.match(r'^\s+([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\s*\??\s*:', line)
            if match:
                snake_key = match.group(1)
                
                # Skip UPPER_SNAKE_CASE constants
                if snake_key.isupper():
                    continue
                
                expected = snake_to_camel(snake_key)
                violations.append({
                    'file': str(file_path),
                    'line': line_num,
                    'violation': f'Snake_case interface property: {snake_key}',
                    'expected': expected,
                    'severity': 'error'
                })
    
    return violations


def check_typescript_file(file_path: Path) -> List[Dict[str, Any]]:
    """
    Check a TypeScript/JavaScript file for snake_case property access.
    
    Looks for patterns like:
    - obj.snake_case_prop
    - obj?.snake_case_prop
    - data['snake_case_key']
    - { snake_case: value }
    """
    violations = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
    except Exception as e:
        return [{
            'file': str(file_path),
            'line': 0,
            'violation': f'Failed to read file: {str(e)}',
            'expected': 'Readable TypeScript file',
            'severity': 'error'
        }]
    
    # First, check interface definitions for snake_case properties
    violations.extend(check_interface_definitions(file_path, content))
    
    for line_num, line in enumerate(lines, 1):
        # Skip comment lines
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            continue
        
        # Skip import/export statements
        if stripped.startswith('import ') or stripped.startswith('export '):
            continue
        
        # Skip type/interface definitions for property ACCESS check (handled separately)
        if re.match(r'^\s*(export\s+)?(type|interface)\s+', line):
            continue
        
        # Check for snake_case patterns
        for pattern in SNAKE_CASE_PATTERNS:
            matches = re.finditer(pattern, line, re.IGNORECASE)
            for match in matches:
                snake_key = match.group(0)
                
                # Skip if it's actually camelCase (no underscores after first char)
                if '_' not in snake_key:
                    continue
                
                # Skip UPPER_SNAKE_CASE constants (e.g., OKTA_CLIENT_ID, DEFAULT_WORKSPACE_FORM)
                if re.match(r'^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$', snake_key):
                    continue
                
                # Skip excluded patterns
                skip = False
                for exclude in EXCLUDE_PATTERNS:
                    if re.search(exclude, line):
                        skip = True
                        break
                
                # Skip if this looks like a type definition line
                if 'interface ' in line or 'type ' in line:
                    skip = True
                
                # Skip if it's in a comment
                comment_pos = line.find('//')
                if comment_pos >= 0 and match.start() > comment_pos:
                    skip = True
                
                if skip:
                    continue
                
                # Check if this is actual property access (preceded by . or ?. or in brackets)
                before_match = line[:match.start()]
                after_match = line[match.end():]
                
                is_property_access = (
                    before_match.rstrip().endswith('.') or
                    before_match.rstrip().endswith('?.') or
                    before_match.rstrip().endswith("['") or
                    before_match.rstrip().endswith('["') or
                    # Object literal key
                    (before_match.rstrip().endswith('{') or before_match.rstrip().endswith(',')) and
                    (after_match.lstrip().startswith(':') or after_match.lstrip().startswith('?:'))
                )
                
                if is_property_access:
                    expected = snake_to_camel(snake_key)
                    violations.append({
                        'file': str(file_path),
                        'line': line_num,
                        'violation': f'Snake_case property access: {snake_key}',
                        'expected': expected,
                        'severity': 'error'
                    })
    
    return violations


def validate_frontend_files(project_path: Path) -> Dict[str, Any]:
    """
    Validate all frontend TypeScript/JavaScript files for snake_case violations.
    
    Args:
        project_path: Path to the project root
        
    Returns:
        dict with total_files, violations, passed
    """
    violations = []
    frontend_files = []
    frontend_paths = []
    
    # 1. Deployed project - packages/module-*/frontend
    packages_dir = project_path / "packages"
    if packages_dir.exists():
        for module_dir in packages_dir.iterdir():
            if module_dir.is_dir() and module_dir.name.startswith('module-'):
                frontend_path = module_dir / "frontend"
                if frontend_path.exists():
                    frontend_paths.append(frontend_path)
    
    # 2. Templates - Core modules frontend
    templates_core = project_path / "templates" / "_modules-core"
    if templates_core.exists():
        for module_dir in templates_core.iterdir():
            if module_dir.is_dir() and module_dir.name.startswith('module-'):
                frontend_path = module_dir / "frontend"
                if frontend_path.exists():
                    frontend_paths.append(frontend_path)
    
    # 3. Templates - Functional modules frontend
    templates_functional = project_path / "templates" / "_modules-functional"
    if templates_functional.exists():
        for module_dir in templates_functional.iterdir():
            if module_dir.is_dir() and module_dir.name.startswith('module-'):
                frontend_path = module_dir / "frontend"
                if frontend_path.exists():
                    frontend_paths.append(frontend_path)
    
    # Scan all discovered frontend paths
    for frontend_path in frontend_paths:
        for pattern in FRONTEND_FILE_PATTERNS:
            for ts_file in frontend_path.rglob(pattern):
                # Skip node_modules and other excluded dirs
                if any(skip_dir in ts_file.parts for skip_dir in SKIP_DIRS):
                    continue
                
                # Skip type definition files (*.d.ts) as they define expected shape
                if ts_file.name.endswith('.d.ts'):
                    continue
                
                frontend_files.append(ts_file)
                file_violations = check_typescript_file(ts_file)
                violations.extend(file_violations)
    
    return {
        'total_files': len(frontend_files),
        'violations': violations,
        'passed': len(violations) == 0
    }


def print_results(results: Dict[str, Any], frontend_results: Dict[str, Any] = None) -> None:
    """Print validation results in a readable format"""
    print("\n" + "="*80)
    print("API Response Format Validation Results")
    print("="*80 + "\n")
    
    # Backend results
    print("BACKEND (Lambda Functions):")
    print(f"  Files checked: {results['total_files']}")
    print(f"  Violations found: {len(results['violations'])}")
    
    # Frontend results
    if frontend_results:
        print("\nFRONTEND (TypeScript/JavaScript):")
        print(f"  Files checked: {frontend_results['total_files']}")
        print(f"  Violations found: {len(frontend_results['violations'])}")
    
    total_violations = len(results['violations'])
    if frontend_results:
        total_violations += len(frontend_results['violations'])
    
    all_passed = results['passed'] and (frontend_results is None or frontend_results['passed'])
    
    if all_passed:
        print("\n✅ All files comply with camelCase API standard!")
    else:
        print(f"\n❌ FAILED: Found {total_violations} snake_case violations\n")
        
        # Combine all violations
        all_violations = results['violations']
        if frontend_results:
            all_violations = all_violations + frontend_results['violations']
        
        # Group violations by file
        violations_by_file = {}
        for violation in all_violations:
            file_path = violation['file']
            if file_path not in violations_by_file:
                violations_by_file[file_path] = []
            violations_by_file[file_path].append(violation)
        
        # Print grouped violations
        for file_path, file_violations in sorted(violations_by_file.items()):
            print(f"\n{file_path}:")
            for v in sorted(file_violations, key=lambda x: x['line']):
                print(f"  Line {v['line']}: {v['violation']}")
                print(f"           → Expected: '{v['expected']}'")
        
        print("\n" + "-"*80)
        print("Fix: Replace snake_case with camelCase")
        print("  - Backend: Use camelCase keys in API responses")
        print("  - Frontend: Access properties using camelCase")
        print("See: docs/standards/standard_API-PATTERNS.md")
        print("-"*80)


def main():
    """Main entry point"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python validate_api_responses.py <project_path> [--backend-only] [--frontend-only]")
        sys.exit(1)
    
    project_path = Path(sys.argv[1])
    if not project_path.exists():
        print(f"Error: Project path does not exist: {project_path}")
        sys.exit(1)
    
    backend_only = '--backend-only' in sys.argv
    frontend_only = '--frontend-only' in sys.argv
    
    backend_results = {'total_files': 0, 'violations': [], 'passed': True}
    frontend_results = None
    
    if not frontend_only:
        backend_results = validate_project_api_responses(project_path)
    
    if not backend_only:
        frontend_results = validate_frontend_files(project_path)
    
    print_results(backend_results, frontend_results)
    
    # Exit with error code if validation failed
    all_passed = backend_results['passed'] and (frontend_results is None or frontend_results['passed'])
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
