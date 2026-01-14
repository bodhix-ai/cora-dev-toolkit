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


def check_untransformed_db_data(lambda_file: Path, tree: ast.AST, content: str) -> List[Dict[str, Any]]:
    """
    Check for handlers that return database data without transformation.
    
    This catches patterns like:
        users = common.find_many(...)
        return common.success_response(users)
    
    Where 'users' contains snake_case keys from the database but is returned
    without being transformed to camelCase.
    
    Detection strategy:
    1. Find handler functions (def handle_*)
    2. Track variables assigned from DB operations
    3. Check if those variables are passed to success_response without transformation
    """
    violations = []
    lines = content.split('\n')
    
    # Database functions that return snake_case data
    DB_FUNCTIONS = {
        'find_one', 'find_many', 'update_one', 'update_many',
        'insert_one', 'insert_many', 'select', 'execute', 'rpc'
    }
    
    # Transform function patterns - if called, data is considered transformed
    TRANSFORM_PATTERNS = ['_transform_', 'transform_', 'format_record', 'to_camel']
    
    # Response wrapper functions
    RESPONSE_FUNCTIONS = {
        'success_response', 'created_response', 'error_response'
    }
    
    class HandlerAnalyzer(ast.NodeVisitor):
        def __init__(self):
            self.current_function = None
            self.db_data_vars = set()  # Variables holding raw DB data
            self.transformed_vars = set()  # Variables that have been transformed
            self.function_violations = []
        
        def visit_FunctionDef(self, node):
            # Only analyze handler functions
            if node.name.startswith('handle_'):
                self.current_function = node.name
                self.db_data_vars = set()
                self.transformed_vars = set()
                
                # Visit all nodes in this function
                for child in ast.walk(node):
                    self._check_node(child)
                
                self.current_function = None
            
            self.generic_visit(node)
        
        def _check_node(self, node):
            # Track assignments from DB operations
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        var_name = target.id
                        # Check if RHS is a DB call
                        if self._is_db_call(node.value):
                            self.db_data_vars.add(var_name)
                        # Check if RHS is a transformation call
                        elif self._is_transform_call(node.value):
                            self.transformed_vars.add(var_name)
                            # If transforming a DB var, remove it from db_data_vars
                            if isinstance(node.value, ast.Call):
                                for arg in node.value.args:
                                    if isinstance(arg, ast.Name) and arg.id in self.db_data_vars:
                                        self.db_data_vars.discard(arg.id)
                        # Check for list comprehensions with transformation
                        elif isinstance(node.value, ast.ListComp):
                            # Check if the comprehension applies a transform
                            if self._listcomp_has_transform(node.value):
                                self.transformed_vars.add(var_name)
            
            # Check response calls for untransformed DB data
            if isinstance(node, ast.Call):
                if self._is_response_call(node):
                    for arg in node.args:
                        if isinstance(arg, ast.Name):
                            var_name = arg.id
                            # Flag if variable holds raw DB data and wasn't transformed
                            if var_name in self.db_data_vars and var_name not in self.transformed_vars:
                                self.function_violations.append({
                                    'file': str(lambda_file),
                                    'line': node.lineno,
                                    'violation': f'Untransformed DB data in response: variable "{var_name}" returned without snake_case→camelCase transformation',
                                    'expected': f'Add transformation: transformed_{var_name} = [_transform_*(item) for item in {var_name}]',
                                    'severity': 'warning'
                                })
        
        def _is_db_call(self, node) -> bool:
            """Check if node is a database operation call"""
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Attribute):
                    return node.func.attr in DB_FUNCTIONS
                elif isinstance(node.func, ast.Name):
                    return node.func.id in DB_FUNCTIONS
            return False
        
        def _is_transform_call(self, node) -> bool:
            """Check if node is a transformation function call"""
            if isinstance(node, ast.Call):
                func_name = ''
                if isinstance(node.func, ast.Attribute):
                    func_name = node.func.attr
                elif isinstance(node.func, ast.Name):
                    func_name = node.func.id
                
                for pattern in TRANSFORM_PATTERNS:
                    if pattern in func_name:
                        return True
            return False
        
        def _listcomp_has_transform(self, node: ast.ListComp) -> bool:
            """Check if list comprehension applies a transformation"""
            if isinstance(node.elt, ast.Call):
                return self._is_transform_call(node.elt)
            return False
        
        def _is_response_call(self, node) -> bool:
            """Check if node is a response wrapper call"""
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Attribute):
                    return node.func.attr in RESPONSE_FUNCTIONS
            return False
    
    analyzer = HandlerAnalyzer()
    analyzer.visit(tree)
    violations.extend(analyzer.function_violations)
    
    return violations


def check_lambda_response_format(lambda_file: Path) -> List[Dict[str, Any]]:
    """
    Parse Lambda function to check response format
    
    Checks:
    1. Response dictionaries use camelCase keys
    2. No snake_case keys in API responses
    3. Compliance with CORA API standard
    4. Untransformed database data being returned (NEW)
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
    
    # NEW: Check for untransformed DB data being returned
    violations.extend(check_untransformed_db_data(lambda_file, tree, content))
    
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


def check_format_record_transformation(db_file: Path) -> List[Dict[str, Any]]:
    """
    Check that format_record() transforms snake_case to camelCase.
    
    This is CRITICAL because all API responses flow through format_record().
    If it doesn't transform keys, ALL responses will have snake_case keys.
    """
    violations = []
    
    try:
        with open(db_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return [{
            'file': str(db_file),
            'line': 0,
            'violation': f'Failed to read file: {str(e)}',
            'expected': 'Readable Python file',
            'severity': 'error'
        }]
    
    # Check if format_record function exists
    if 'def format_record(' not in content:
        return []  # Function doesn't exist, nothing to check
    
    # Check if it has snake_to_camel transformation
    has_snake_to_camel = '_snake_to_camel' in content or 'snake_to_camel' in content
    
    # Check if format_record transforms keys
    # Look for pattern: camel_key = _snake_to_camel(key) or similar transformation
    has_key_transformation = (
        'snake_to_camel(key)' in content or
        '_snake_to_camel(key)' in content or
        'camel_key' in content
    )
    
    # If format_record exists but doesn't transform keys, it's a violation
    if not has_key_transformation:
        # Find the line number of format_record
        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            if 'def format_record(' in line:
                violations.append({
                    'file': str(db_file),
                    'line': line_num,
                    'violation': 'format_record() does not transform snake_case to camelCase',
                    'expected': 'Add key transformation: camel_key = _snake_to_camel(key)',
                    'severity': 'error'
                })
                break
    
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
    
    # CRITICAL: Check org_common/db.py for format_record transformation
    # This function is used by ALL responses - if it doesn't transform, nothing will
    org_common_paths = [
        project_path / "templates" / "_modules-core" / "module-access" / "backend" / "layers" / "org-common" / "python" / "org_common" / "db.py",
        project_path / "packages" / "module-access" / "backend" / "layers" / "org-common" / "python" / "org_common" / "db.py",
    ]
    
    for db_path in org_common_paths:
        if db_path.exists():
            lambda_files.append(db_path)
            violations.extend(check_format_record_transformation(db_path))
    
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

# Files to skip (external API integrations that use snake_case from libraries we don't control)
SKIP_FILES = {
    'okta.ts',      # OAuth provider - NextAuth uses snake_case (access_token, id_token, etc.)
    'cognito.ts',   # OAuth provider
    'auth0.ts',     # OAuth provider
    'google.ts',    # OAuth provider
}

# Pattern to detect snake_case properties in TypeScript interface/type definitions
# Matches: property_name: type  OR  property_name?: type
INTERFACE_PROPERTY_PATTERN = re.compile(r'^\s+([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\s*\??\s*:', re.MULTILINE)

# ============================================================================
# API Interface Validation - Detect camelCase in interfaces that receive snake_case data
# ============================================================================

# Known API response fields that backends return in snake_case
# If a frontend interface expects these in camelCase without transformation, it's a bug
KNOWN_API_RESPONSE_FIELDS_SNAKE = {
    # User/Profile fields - backend returns snake_case
    'sys_role': 'sysRole',
    'org_role': 'orgRole', 
    'ws_role': 'wsRole',
    'user_id': 'userId',
    'org_id': 'orgId',
    'ws_id': 'wsId',
    'full_name': 'fullName',
    'first_name': 'firstName',
    'last_name': 'lastName',
    'display_name': 'displayName',
    'avatar_url': 'avatarUrl',
    'current_org_id': 'currentOrgId',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt',
    'deleted_at': 'deletedAt',
    'created_by': 'createdBy',
    'updated_by': 'updatedBy',
    'requires_invitation': 'requiresInvitation',
    # Workspace fields
    'is_favorited': 'isFavorited',
    'favorited_at': 'favoritedAt',
    'member_count': 'memberCount',
    'retention_days': 'retentionDays',
    # Config fields
    'nav_label_singular': 'navLabelSingular',
    'nav_label_plural': 'navLabelPlural',
    'enable_favorites': 'enableFavorites',
}

# Reverse mapping: camelCase -> snake_case
KNOWN_API_RESPONSE_FIELDS_CAMEL = {v: k for k, v in KNOWN_API_RESPONSE_FIELDS_SNAKE.items()}

# ============================================================================
# Query Parameter Validation - Detect frontend/backend param name mismatches
# ============================================================================

# Standard query parameter names - backend expects snake_case, frontend should send snake_case
QUERY_PARAM_NAMES = {
    'org_id': 'org_id',   # Backend expects snake_case
    'ws_id': 'ws_id',
    'user_id': 'user_id',
}


def check_api_interface_mismatch(file_path: Path, content: str) -> List[Dict[str, Any]]:
    """
    Check for API response interfaces that expect camelCase but backend returns snake_case.
    
    DISABLED: This check was causing false positives. The CORA standard (Option B) is:
    - Backend transforms snake_case → camelCase at the API boundary
    - Frontend interfaces use pure camelCase
    - API client layer handles transformation if backend hasn't
    
    Since we expect transformation at the API client level, having camelCase 
    interfaces is CORRECT, not a violation.
    
    This function is kept for documentation but returns no violations.
    """
    # Return empty - this check is disabled under Option B (strict camelCase standard)
    # The correct fix is transformation at API client level, not dual-format interfaces
    return []

#  Commented out for future reference ...    
#  This catches the case where:
#     - Interface comment says "snake_case from backend" 
#     - But interface fields are defined in camelCase
#     - And there's no proper transformation handling both formats
    
#     Example bug detected:
#     ```typescript
#     // API response interface (snake_case from backend)  <-- Comment says snake_case
#     interface ProfileApiData {
#       sysRole?: string;  // <-- But field is camelCase! Backend returns sys_role
#     }
#     ```
#     """
#     violations = []
#     lines = content.split('\n')
    
#     in_api_interface = False
#     interface_name = ''
#     interface_start_line = 0
#     interface_depth = 0
#     has_snake_case_comment = False
#     camel_fields_expecting_snake = []
    
#     for line_num, line in enumerate(lines, 1):
#         stripped = line.strip()
        
#         # Look for interface definitions with comments about API/backend/snake_case
#         if re.match(r'^/\*\*|^//.*(?:API|backend|snake_case|response)', line, re.IGNORECASE):
#             has_snake_case_comment = True
#             continue
        
#         if re.match(r'^\*.*(?:API|backend|snake_case|response)', line, re.IGNORECASE):
#             has_snake_case_comment = True
#             continue
        
#         # Track when we enter an interface definition
#         interface_match = re.match(r'^(?:export\s+)?interface\s+(\w+ApiData|\w+Response|\w+ApiResponse)', line)
#         if interface_match or (has_snake_case_comment and re.match(r'^(?:export\s+)?interface\s+(\w+)', line)):
#             match = interface_match or re.match(r'^(?:export\s+)?interface\s+(\w+)', line)
#             in_api_interface = True
#             interface_name = match.group(1)
#             interface_start_line = line_num
#             interface_depth = 0
#             camel_fields_expecting_snake = []
        
#         # Track brace depth
#         if in_api_interface:
#             interface_depth += line.count('{') - line.count('}')
#             if interface_depth <= 0:
#                 # Interface ended - check if we found any issues
#                 in_api_interface = False
#                 has_snake_case_comment = False
#                 continue
            
#             # Check for camelCase fields that correspond to known snake_case API fields
#             for camel_field, snake_field in KNOWN_API_RESPONSE_FIELDS_CAMEL.items():
#                 # Pattern: fieldName?: type  OR  fieldName: type
#                 field_pattern = rf'^\s+{camel_field}\s*\??:'
#                 if re.match(field_pattern, line):
#                     # Check if there's also the snake_case version defined
#                     snake_pattern = rf'^\s+{snake_field}\s*\??:'
#                     has_snake_version = any(re.match(snake_pattern, l) for l in lines)
                    
#                     if not has_snake_version:
#                         # Interface expects camelCase but backend likely returns snake_case
#                         # and there's no snake_case field to receive it
#                         violations.append({
#                             'file': str(file_path),
#                             'line': line_num,
#                             'violation': f'API interface expects "{camel_field}" but backend returns "{snake_field}"',
#                             'expected': f'Add "{snake_field}?: ..." OR transform API response',
#                             'severity': 'warning'
#                         })
    
#     return violations

def check_query_param_naming(file_path: Path, content: str) -> List[Dict[str, Any]]:
    """
    Check for query parameter naming.
    
    DISABLED: Under CORA Option B (strict camelCase standard), query parameters
    use camelCase to be consistent with the rest of the JavaScript ecosystem.
    
    The backend Lambdas have been updated to accept BOTH formats:
        org_id = query_params.get('org_id') or query_params.get('orgId')
    
    So camelCase query params like ?orgId=123 are now CORRECT and should not be flagged.
    """
    # Return empty - camelCase query params are correct under Option B
    return []


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
    
    # Check for API interface mismatches (camelCase in interface but backend returns snake_case)
    violations.extend(check_api_interface_mismatch(file_path, content))
    
    # Check for query parameter naming issues (frontend sends camelCase, backend expects snake_case)
    violations.extend(check_query_param_naming(file_path, content))
    
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
                
                # Skip external OAuth provider files (they use snake_case from NextAuth/OAuth)
                if ts_file.name in SKIP_FILES:
                    continue
                
                # Skip providers directory entirely (OAuth integrations)
                if 'providers' in ts_file.parts:
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
