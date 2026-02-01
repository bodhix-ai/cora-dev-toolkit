"""
Code Quality Validator - Integrated Module

Consolidates multiple code quality checks to run during api-tracer's single parse pass.
This avoids redundant file parsing and provides unified, contextual feedback.

Integrated Validators:
1. Import Validator - org_common function signature validation (Lambda)
2. API Response Validator - camelCase response keys (Lambda + Frontend)
3. Admin Route Validator - Route naming per ADR-018b (Gateway)
4. Python Key Consistency - Dict key naming consistency (Lambda)
5. RPC Function Validator - RPC call existence validation (Lambda)
6. Role Naming Validator - Role naming standards (Lambda + Frontend)

References:
- ADR-018b: API Gateway Route Standards
- ADR-019: Auth Standardization
"""

import ast
import re
import logging
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class CodeQualityIssue:
    """Represents a code quality issue found during validation."""
    file: str
    line: int
    severity: str  # 'error' or 'warning'
    category: str  # 'import', 'response_format', 'route_naming', 'key_consistency', 'rpc', 'role_naming'
    issue: str
    suggestion: str
    standard_ref: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'file': self.file,
            'line': self.line,
            'severity': self.severity,
            'category': self.category,
            'issue': self.issue,
            'suggestion': self.suggestion,
            'standard_ref': self.standard_ref
        }


# =============================================================================
# ROLE NAMING VALIDATOR
# =============================================================================

class RoleNamingValidator:
    """
    Validates role naming standards across codebase.
    
    Anti-patterns detected:
    - global_role → should be sys_role
    - platform_owner → should be sys_owner
    - globalRole (TypeScript) → should be sysRole
    """
    
    ANTI_PATTERNS = {
        # Python snake_case anti-patterns
        'global_role': ('sys_role', 'Use sys_role instead of global_role'),
        'platform_owner': ('sys_owner', 'Use sys_owner instead of platform_owner'),
        'platform_admin': ('sys_admin', 'Use sys_admin instead of platform_admin'),
        'platform_user': ('sys_user', 'Use sys_user instead of platform_user'),
        'is_platform_admin': ('is_sys_admin', 'Use is_sys_admin instead of is_platform_admin'),
        'system_role': ('sys_role', 'Use sys_role instead of system_role'),
        'organization_role': ('org_role', 'Use org_role instead of organization_role'),
        'workspace_role': ('ws_role', 'Use ws_role instead of workspace_role'),
        
        # TypeScript camelCase anti-patterns
        'globalRole': ('sysRole', 'Use sysRole instead of globalRole'),
        'isPlatformAdmin': ('isSysAdmin', 'Use isSysAdmin instead of isPlatformAdmin'),
        'systemRole': ('sysRole', 'Use sysRole instead of systemRole'),
        'organizationRole': ('orgRole', 'Use orgRole instead of organizationRole'),
        'workspaceRole': ('wsRole', 'Use wsRole instead of workspaceRole'),
        
        # Database column anti-patterns (with context)
        "org_members.role'": ("org_members.org_role'", 'Use org_members.org_role instead of org_members.role'),
        'org_members.role"': ('org_members.org_role"', 'Use org_members.org_role instead of org_members.role'),
        "ws_members.role'": ("ws_members.ws_role'", 'Use ws_members.ws_role instead of ws_members.role'),
        'ws_members.role"': ('ws_members.ws_role"', 'Use ws_members.ws_role instead of ws_members.role'),
    }
    
    # Constants anti-patterns
    CONSTANT_PATTERNS = {
        'PLATFORM_ADMIN_ROLES': ('SYS_ADMIN_ROLES', 'Use SYS_ADMIN_ROLES instead of PLATFORM_ADMIN_ROLES'),
    }
    
    def validate_content(self, file_path: str, content: str) -> List[CodeQualityIssue]:
        """Validate content for role naming violations."""
        issues = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # Skip comment lines
            stripped = line.strip()
            if stripped.startswith('#') or stripped.startswith('//') or stripped.startswith('*'):
                continue
            
            # Check anti-patterns
            for pattern, (correct, message) in self.ANTI_PATTERNS.items():
                if pattern in line:
                    issues.append(CodeQualityIssue(
                        file=file_path,
                        line=line_num,
                        severity='error',
                        category='role_naming',
                        issue=f"Role naming violation: '{pattern}' found",
                        suggestion=f"{message}. Replace '{pattern}' with '{correct}'",
                        standard_ref='Role Naming Standards'
                    ))
            
            # Check constant patterns
            for pattern, (correct, message) in self.CONSTANT_PATTERNS.items():
                if pattern in line:
                    issues.append(CodeQualityIssue(
                        file=file_path,
                        line=line_num,
                        severity='error',
                        category='role_naming',
                        issue=f"Role constant violation: '{pattern}' found",
                        suggestion=f"{message}. Replace '{pattern}' with '{correct}'",
                        standard_ref='Role Naming Standards'
                    ))
        
        return issues


# =============================================================================
# API RESPONSE VALIDATOR (camelCase)
# =============================================================================

class APIResponseValidator:
    """
    Validates camelCase usage in API responses.
    
    Checks:
    - Lambda response dictionaries use camelCase keys
    - Frontend code accesses properties using camelCase
    """
    
    # Response wrapper functions that indicate API response context
    RESPONSE_FUNCTIONS = {
        'success_response', 'created_response', 'error_response',
        'bad_request_response', 'not_found_response', 'forbidden_response',
        'unauthorized_response', 'internal_error_response', 'method_not_allowed_response'
    }
    
    @staticmethod
    def is_snake_case(key: str) -> bool:
        """Check if a key is snake_case."""
        if not isinstance(key, str):
            return False
        if key.isupper():  # CONSTANT_CASE is ok
            return False
        if key and key[0].isupper():  # PascalCase
            return False
        return '_' in key
    
    @staticmethod
    def snake_to_camel(snake_str: str) -> str:
        """Convert snake_case to camelCase."""
        if not snake_str or '_' not in snake_str:
            return snake_str
        components = snake_str.split('_')
        return components[0] + ''.join(x.title() for x in components[1:])
    
    def validate_lambda_content(self, file_path: str, content: str) -> List[CodeQualityIssue]:
        """Validate Lambda file for camelCase response keys."""
        issues = []
        
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return issues
        
        # Find response function calls and check their arguments
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Attribute):
                    func_name = node.func.attr
                    if func_name in self.RESPONSE_FUNCTIONS:
                        # Check dictionary arguments
                        for arg in node.args:
                            issues.extend(self._check_dict_node(file_path, arg, content))
                        for keyword in node.keywords:
                            issues.extend(self._check_dict_node(file_path, keyword.value, content))
        
        return issues
    
    def _check_dict_node(self, file_path: str, node: ast.AST, content: str) -> List[CodeQualityIssue]:
        """Check a dictionary node for snake_case keys."""
        issues = []
        
        if isinstance(node, ast.Dict):
            for key in node.keys:
                if isinstance(key, ast.Constant) and isinstance(key.value, str):
                    if self.is_snake_case(key.value):
                        issues.append(CodeQualityIssue(
                            file=file_path,
                            line=key.lineno,
                            severity='error',
                            category='response_format',
                            issue=f"Snake_case key in API response: '{key.value}'",
                            suggestion=f"Use camelCase: '{self.snake_to_camel(key.value)}'",
                            standard_ref='API Response Standards'
                        ))
        
        # Recursively check nested structures
        for child in ast.iter_child_nodes(node):
            issues.extend(self._check_dict_node(file_path, child, content))
        
        return issues
    
    def validate_frontend_content(self, file_path: str, content: str) -> List[CodeQualityIssue]:
        """Validate frontend file for snake_case property access."""
        issues = []
        lines = content.split('\n')
        
        # Pattern for interface property definitions with snake_case
        interface_pattern = re.compile(r'^\s+([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\s*\??\s*:')
        
        in_interface = False
        interface_depth = 0
        
        for line_num, line in enumerate(lines, 1):
            stripped = line.strip()
            
            # Skip comments
            if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
                continue
            
            # Skip imports
            if stripped.startswith('import ') or stripped.startswith('export '):
                continue
            
            # Track interface definitions
            if re.match(r'^\s*(export\s+)?(interface|type)\s+\w+', line):
                in_interface = True
                interface_depth = 0
            
            if in_interface:
                interface_depth += line.count('{') - line.count('}')
                if interface_depth <= 0:
                    in_interface = False
                    continue
                
                # Check for snake_case in interface properties
                match = interface_pattern.match(line)
                if match:
                    snake_key = match.group(1)
                    issues.append(CodeQualityIssue(
                        file=file_path,
                        line=line_num,
                        severity='error',
                        category='response_format',
                        issue=f"Snake_case interface property: '{snake_key}'",
                        suggestion=f"Use camelCase: '{self.snake_to_camel(snake_key)}'",
                        standard_ref='API Response Standards'
                    ))
        
        return issues


# =============================================================================
# ADMIN ROUTE VALIDATOR
# =============================================================================

class AdminRouteValidator:
    """
    Validates API Gateway routes against ADR-018b.
    
    Checks:
    - Admin routes have correct scope (sys/org/ws)
    - Module shortnames are valid
    - No trailing slashes
    - Lowercase paths (except path parameters)
    """
    
    VALID_MODULES = {
        'access', 'ai', 'mgmt', 'ws', 'kb', 'chat', 'voice', 'eval'
    }
    
    # Route patterns
    ADMIN_SYS_PATTERN = re.compile(r'^/admin/sys/([a-z]+)/([a-z][a-z0-9-]*|\{[a-zA-Z]+\})(/.*)?$')
    ADMIN_ORG_PATTERN = re.compile(r'^/admin/org/([a-z]+)/([a-z][a-z0-9-]*|\{[a-zA-Z]+\})(/.*)?$')
    ADMIN_WS_PATTERN = re.compile(r'^/admin/ws/\{wsId\}/([a-z]+)/([a-z][a-z0-9-]*|\{[a-zA-Z]+\})(/.*)?$')
    
    # Anti-patterns
    ANTI_PATTERNS = [
        (re.compile(r'^/admin/(?!sys/|org/|ws/)'), 'Missing scope (sys/org/ws) in admin route'),
        (re.compile(r'^/api/'), 'Do not use /api prefix for data routes'),
        (re.compile(r'^/admin/org/\{orgId\}'), 'Org ID should not be in path for org scope'),
        (re.compile(r'^/admin/ws/[a-z]+/'), 'Missing {wsId} in workspace admin route'),
        (re.compile(r'^/admin/organization/'), "Use 'org' not 'organization'"),
        (re.compile(r'/module-[a-z]+/'), 'Use module shortname not full module name'),
        (re.compile(r'/$'), 'Trailing slash not allowed'),
    ]
    
    def validate_route(self, route: str, file_path: str, line: int) -> List[CodeQualityIssue]:
        """Validate a single route against ADR-018b standards."""
        issues = []
        
        # Check anti-patterns
        for pattern, message in self.ANTI_PATTERNS:
            if pattern.search(route):
                issues.append(CodeQualityIssue(
                    file=file_path,
                    line=line,
                    severity='error',
                    category='route_naming',
                    issue=f"Route violation: {message}",
                    suggestion=f"Fix route: {route}",
                    standard_ref='ADR-018b'
                ))
        
        # Validate admin route patterns
        if route.startswith('/admin/sys/'):
            match = self.ADMIN_SYS_PATTERN.match(route)
            if match:
                module = match.group(1)
                if module not in self.VALID_MODULES:
                    issues.append(CodeQualityIssue(
                        file=file_path,
                        line=line,
                        severity='error',
                        category='route_naming',
                        issue=f"Invalid module '{module}' in sys admin route",
                        suggestion=f"Valid modules: {', '.join(sorted(self.VALID_MODULES))}",
                        standard_ref='ADR-018b'
                    ))
            elif '/admin/sys/' in route:
                issues.append(CodeQualityIssue(
                    file=file_path,
                    line=line,
                    severity='error',
                    category='route_naming',
                    issue=f"Sys admin route doesn't match pattern: {route}",
                    suggestion="Expected: /admin/sys/{module}/{resource}",
                    standard_ref='ADR-018b'
                ))
        
        elif route.startswith('/admin/org/'):
            match = self.ADMIN_ORG_PATTERN.match(route)
            if match:
                module = match.group(1)
                if module not in self.VALID_MODULES:
                    issues.append(CodeQualityIssue(
                        file=file_path,
                        line=line,
                        severity='error',
                        category='route_naming',
                        issue=f"Invalid module '{module}' in org admin route",
                        suggestion=f"Valid modules: {', '.join(sorted(self.VALID_MODULES))}",
                        standard_ref='ADR-018b'
                    ))
            elif '/admin/org/' in route:
                issues.append(CodeQualityIssue(
                    file=file_path,
                    line=line,
                    severity='error',
                    category='route_naming',
                    issue=f"Org admin route doesn't match pattern: {route}",
                    suggestion="Expected: /admin/org/{module}/{resource}",
                    standard_ref='ADR-018b'
                ))
        
        elif route.startswith('/admin/ws/'):
            match = self.ADMIN_WS_PATTERN.match(route)
            if match:
                module = match.group(1)
                if module not in self.VALID_MODULES:
                    issues.append(CodeQualityIssue(
                        file=file_path,
                        line=line,
                        severity='error',
                        category='route_naming',
                        issue=f"Invalid module '{module}' in ws admin route",
                        suggestion=f"Valid modules: {', '.join(sorted(self.VALID_MODULES))}",
                        standard_ref='ADR-018b'
                    ))
            elif '/admin/ws/' in route:
                issues.append(CodeQualityIssue(
                    file=file_path,
                    line=line,
                    severity='error',
                    category='route_naming',
                    issue=f"WS admin route doesn't match pattern: {route}",
                    suggestion="Expected: /admin/ws/{wsId}/{module}/{resource}",
                    standard_ref='ADR-018b'
                ))
        
        # Check for uppercase (excluding path parameters)
        route_without_params = re.sub(r'\{[^}]+\}', '', route)
        if re.search(r'[A-Z]', route_without_params):
            issues.append(CodeQualityIssue(
                file=file_path,
                line=line,
                severity='error',
                category='route_naming',
                issue=f"Uppercase characters in route path: {route}",
                suggestion="Use lowercase for all route segments",
                standard_ref='ADR-018b'
            ))
        
        return issues


# =============================================================================
# PYTHON KEY CONSISTENCY VALIDATOR
# =============================================================================

class KeyConsistencyValidator:
    """
    Validates dictionary key consistency within a file.
    
    Catches bugs where:
    - Function A returns {'modelId': ...} (camelCase)
    - Function B accesses dict['model_id'] (snake_case) - MISMATCH!
    """
    
    @staticmethod
    def snake_to_camel(snake_str: str) -> str:
        if not snake_str or '_' not in snake_str:
            return snake_str
        components = snake_str.split('_')
        return components[0] + ''.join(x.title() for x in components[1:])
    
    @staticmethod
    def camel_to_snake(camel_str: str) -> str:
        if not camel_str:
            return camel_str
        result = re.sub('([A-Z])', r'_\1', camel_str).lower()
        return result.lstrip('_')
    
    @staticmethod
    def is_snake_case(key: str) -> bool:
        if not isinstance(key, str):
            return False
        return '_' in key and not key.isupper() and key[0].islower()
    
    @staticmethod
    def is_camel_case(key: str) -> bool:
        if not isinstance(key, str) or not key:
            return False
        return key[0].islower() and '_' not in key and any(c.isupper() for c in key)
    
    def validate_lambda_content(self, file_path: str, content: str) -> List[CodeQualityIssue]:
        """Validate Lambda file for key consistency."""
        issues = []
        
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return issues
        
        # Track dictionary literal keys and access keys
        literal_keys: Dict[str, List[int]] = {}
        access_keys: Dict[str, List[int]] = {}
        
        class KeyVisitor(ast.NodeVisitor):
            def visit_Dict(self, node):
                for key in node.keys:
                    if isinstance(key, ast.Constant) and isinstance(key.value, str):
                        key_str = key.value
                        if key_str not in literal_keys:
                            literal_keys[key_str] = []
                        literal_keys[key_str].append(key.lineno)
                self.generic_visit(node)
            
            def visit_Subscript(self, node):
                if isinstance(node.slice, ast.Constant) and isinstance(node.slice.value, str):
                    key_str = node.slice.value
                    if key_str not in access_keys:
                        access_keys[key_str] = []
                    access_keys[key_str].append(node.lineno)
                self.generic_visit(node)
            
            def visit_Call(self, node):
                if isinstance(node.func, ast.Attribute):
                    if node.func.attr in ('get', 'pop', 'setdefault'):
                        if node.args and isinstance(node.args[0], ast.Constant):
                            if isinstance(node.args[0].value, str):
                                key_str = node.args[0].value
                                if key_str not in access_keys:
                                    access_keys[key_str] = []
                                access_keys[key_str].append(node.lineno)
                self.generic_visit(node)
        
        visitor = KeyVisitor()
        visitor.visit(tree)
        
        # Find inconsistencies - keys that exist in both camelCase and snake_case
        all_keys = set(literal_keys.keys()) | set(access_keys.keys())
        
        # Group equivalent keys
        key_groups: Dict[str, Set[str]] = {}
        for key in all_keys:
            normalized = self.camel_to_snake(key) if self.is_camel_case(key) else key
            if normalized not in key_groups:
                key_groups[normalized] = set()
            key_groups[normalized].add(key)
        
        # Find mismatches
        for normalized, variants in key_groups.items():
            if len(variants) <= 1:
                continue
            
            snake_variants = [v for v in variants if self.is_snake_case(v)]
            camel_variants = [v for v in variants if self.is_camel_case(v)]
            
            if snake_variants and camel_variants:
                # Found inconsistency
                producer_keys = set(literal_keys.keys())
                consumer_keys = set(access_keys.keys())
                
                for variant in variants:
                    if variant in access_keys and variant not in literal_keys:
                        # Accessing a key that wasn't created
                        expected = [v for v in variants if v in literal_keys]
                        if expected:
                            for line in access_keys[variant]:
                                issues.append(CodeQualityIssue(
                                    file=file_path,
                                    line=line,
                                    severity='error',
                                    category='key_consistency',
                                    issue=f"Key mismatch: accessing '{variant}' but dict may have '{expected[0]}'",
                                    suggestion=f"Use consistent key naming: '{expected[0]}'",
                                    standard_ref='Key Consistency'
                                ))
        
        return issues


# =============================================================================
# RPC FUNCTION VALIDATOR
# =============================================================================

class RPCFunctionValidator:
    """
    Validates RPC function calls against known database functions.
    
    Note: This validator needs access to SQL schema files to build the
    function registry. For integrated validation, it checks for common
    patterns and obvious issues.
    """
    
    # Pattern for extracting RPC calls
    RPC_PATTERNS = [
        r"common\.rpc\s*\(\s*function_name\s*=\s*['\"]([^'\"]+)['\"]",
        r"common\.rpc\s*\(\s*['\"]([^'\"]+)['\"]",
        r"supabase\.rpc\s*\(\s*['\"]([^'\"]+)['\"]",
    ]
    
    def __init__(self, known_functions: Optional[Set[str]] = None):
        """Initialize with optional set of known database functions."""
        self.known_functions = known_functions or set()
    
    def validate_lambda_content(self, file_path: str, content: str) -> List[CodeQualityIssue]:
        """Validate Lambda file for RPC function calls."""
        issues = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            for pattern in self.RPC_PATTERNS:
                matches = re.findall(pattern, line)
                for func_name in matches:
                    # If we have known functions, validate against them
                    if self.known_functions and func_name.lower() not in self.known_functions:
                        issues.append(CodeQualityIssue(
                            file=file_path,
                            line=line_num,
                            severity='error',
                            category='rpc',
                            issue=f"RPC function '{func_name}' not found in database schema",
                            suggestion="Verify function exists in SQL schema or fix function name",
                            standard_ref='RPC Function Validation'
                        ))
        
        return issues


# =============================================================================
# IMPORT VALIDATOR (org_common signatures)
# =============================================================================

class ImportSignatureValidator:
    """
    Validates org_common function call signatures.
    
    Checks:
    - Unknown parameters in function calls
    - Deprecated parameters
    - Missing required parameters
    """
    
    # Known org_common function signatures
    # Format: function_name -> {required: [], optional: {}, deprecated: []}
    SIGNATURES = {
        'find_one': {
            'required': ['table'],
            'optional': {'filters': None, 'select': '*', 'org_id': None},
            'deprecated': ['order_by']
        },
        'find_many': {
            'required': ['table'],
            'optional': {'filters': None, 'select': '*', 'order': None, 'limit': None, 'org_id': None},
            'deprecated': ['order_by']
        },
        'update_one': {
            'required': ['table', 'filters', 'data'],
            'optional': {'org_id': None},
            'deprecated': []
        },
        'insert_one': {
            'required': ['table', 'data'],
            'optional': {'org_id': None},
            'deprecated': []
        },
        'delete_one': {
            'required': ['table', 'filters'],
            'optional': {'org_id': None},
            'deprecated': []
        },
        'rpc': {
            'required': ['function_name'],
            'optional': {'params': None},
            'deprecated': []
        },
        'success_response': {
            'required': ['data'],
            'optional': {'status_code': 200},
            'deprecated': []
        },
        'error_response': {
            'required': ['status_code', 'message'],
            'optional': {'details': None},
            'deprecated': []
        },
    }
    
    def validate_lambda_content(self, file_path: str, content: str) -> List[CodeQualityIssue]:
        """Validate Lambda file for org_common import signatures."""
        issues = []
        
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return issues
        
        # Check if file imports org_common
        has_org_common = 'org_common' in content or 'import org_common' in content
        if not has_org_common:
            return issues
        
        # Find org_common function calls
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                func_name = None
                
                # Handle common.function() pattern
                if isinstance(node.func, ast.Attribute):
                    if isinstance(node.func.value, ast.Name):
                        if node.func.value.id in ('common', 'org_common'):
                            func_name = node.func.attr
                
                # Handle direct import: function() pattern
                elif isinstance(node.func, ast.Name):
                    if node.func.id in self.SIGNATURES:
                        func_name = node.func.id
                
                if func_name and func_name in self.SIGNATURES:
                    sig = self.SIGNATURES[func_name]
                    
                    # Get used kwargs
                    used_kwargs = {kw.arg for kw in node.keywords if kw.arg}
                    
                    # Check for deprecated parameters
                    for param in sig['deprecated']:
                        if param in used_kwargs:
                            issues.append(CodeQualityIssue(
                                file=file_path,
                                line=node.lineno,
                                severity='error',
                                category='import',
                                issue=f"Deprecated parameter '{param}' in {func_name}()",
                                suggestion=f"Remove deprecated parameter. Check org_common docs for replacement.",
                                standard_ref='org_common API'
                            ))
                    
                    # Check for unknown parameters
                    all_params = set(sig['required']) | set(sig['optional'].keys())
                    unknown = used_kwargs - all_params - set(sig['deprecated'])
                    
                    for param in unknown:
                        issues.append(CodeQualityIssue(
                            file=file_path,
                            line=node.lineno,
                            severity='error',
                            category='import',
                            issue=f"Unknown parameter '{param}' in {func_name}()",
                            suggestion=f"Valid parameters: {', '.join(sorted(all_params))}",
                            standard_ref='org_common API'
                        ))
        
        return issues


# =============================================================================
# INTEGRATED CODE QUALITY VALIDATOR
# =============================================================================

class CodeQualityValidator:
    """
    Integrated code quality validator that runs all checks in a single pass.
    
    Usage:
        validator = CodeQualityValidator()
        issues = validator.validate_lambda_file(file_path, content)
        issues = validator.validate_frontend_file(file_path, content)
        issues = validator.validate_gateway_routes(routes)
    """
    
    def __init__(self, 
                 known_rpc_functions: Optional[Set[str]] = None,
                 enable_role_naming: bool = True,
                 enable_response_format: bool = True,
                 enable_key_consistency: bool = True,
                 enable_rpc: bool = True,
                 enable_import_signatures: bool = True):
        """
        Initialize the integrated validator.
        
        Args:
            known_rpc_functions: Set of known database RPC functions for validation
            enable_*: Flags to enable/disable specific validators
        """
        self.role_naming_validator = RoleNamingValidator() if enable_role_naming else None
        self.response_validator = APIResponseValidator() if enable_response_format else None
        self.key_consistency_validator = KeyConsistencyValidator() if enable_key_consistency else None
        self.rpc_validator = RPCFunctionValidator(known_rpc_functions) if enable_rpc else None
        self.import_validator = ImportSignatureValidator() if enable_import_signatures else None
        self.route_validator = AdminRouteValidator()
    
    def validate_lambda_file(self, file_path: str, content: str) -> List[CodeQualityIssue]:
        """
        Validate a Lambda Python file with all applicable checks.
        
        Runs:
        - Role naming validation
        - API response format validation
        - Key consistency validation
        - RPC function validation
        - Import signature validation
        """
        issues = []
        
        if self.role_naming_validator:
            issues.extend(self.role_naming_validator.validate_content(file_path, content))
        
        if self.response_validator:
            issues.extend(self.response_validator.validate_lambda_content(file_path, content))
        
        if self.key_consistency_validator:
            issues.extend(self.key_consistency_validator.validate_lambda_content(file_path, content))
        
        if self.rpc_validator:
            issues.extend(self.rpc_validator.validate_lambda_content(file_path, content))
        
        if self.import_validator:
            issues.extend(self.import_validator.validate_lambda_content(file_path, content))
        
        return issues
    
    def validate_frontend_file(self, file_path: str, content: str) -> List[CodeQualityIssue]:
        """
        Validate a frontend TypeScript/JavaScript file with all applicable checks.
        
        Runs:
        - Role naming validation
        - API response format validation (interface definitions)
        """
        issues = []
        
        if self.role_naming_validator:
            issues.extend(self.role_naming_validator.validate_content(file_path, content))
        
        if self.response_validator:
            issues.extend(self.response_validator.validate_frontend_content(file_path, content))
        
        return issues
    
    def validate_gateway_routes(self, routes: List[Dict[str, Any]]) -> List[CodeQualityIssue]:
        """
        Validate API Gateway routes.
        
        Args:
            routes: List of route dictionaries with 'path', 'file', 'line' keys
        
        Returns:
            List of route naming issues
        """
        issues = []
        
        for route in routes:
            route_issues = self.route_validator.validate_route(
                route.get('path', ''),
                route.get('file', 'unknown'),
                route.get('line', 0)
            )
            issues.extend(route_issues)
        
        return issues
    
    def get_issue_summary(self, issues: List[CodeQualityIssue]) -> Dict[str, Any]:
        """
        Generate a summary of issues by category.
        
        Returns:
            Dictionary with counts by category and severity
        """
        summary = {
            'total': len(issues),
            'by_category': {},
            'by_severity': {'error': 0, 'warning': 0},
            'by_file': {}
        }
        
        for issue in issues:
            # By category
            if issue.category not in summary['by_category']:
                summary['by_category'][issue.category] = 0
            summary['by_category'][issue.category] += 1
            
            # By severity
            summary['by_severity'][issue.severity] += 1
            
            # By file
            if issue.file not in summary['by_file']:
                summary['by_file'][issue.file] = 0
            summary['by_file'][issue.file] += 1
        
        return summary