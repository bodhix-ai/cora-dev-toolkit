"""
Lambda Handler Parser

Parses Python Lambda handler files to extract route handlers.
Identifies HTTP methods, paths, parameters, and response structures.

Supports two parsing modes:
1. Docstring-based: For dispatcher pattern Lambdas that document routes in module docstring
2. AST-based: For traditional Lambdas with explicit route handling in code

Dispatcher Pattern Detection:
If the module docstring contains route definitions in the format:
  - METHOD  /path  - description
These are extracted directly, bypassing AST-based parsing.
"""

import ast
import re
import logging
from typing import Dict, List, Set, Optional, Any, Tuple
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class LambdaRoute:
    """Represents a Lambda route handler."""
    file: str
    line: int
    handler_function: str  # handle_list_bases
    method: str  # GET, POST, PUT, PATCH, DELETE
    path: str  # /organizations/{orgId}/kb
    path_params: List[str] = field(default_factory=list)  # ['orgId']
    query_params: List[str] = field(default_factory=list)  # ['limit', 'offset']
    request_body_keys: List[str] = field(default_factory=list)  # Keys in request body
    response_status: int = 200
    response_type: Optional[str] = None
    source_code: str = ""  # Original source code snippet


class LambdaParser:
    """Parses Python Lambda handler files."""
    
    # Regex to parse route definitions from docstrings
    # Matches: - GET    /organizations/{orgId}/kb  - description
    # Also matches: - GET    /orgs/:id  - description (Express-style params)
    DOCSTRING_ROUTE_PATTERN = re.compile(
        r'^\s*-\s+(GET|POST|PUT|PATCH|DELETE)\s+(/\S+)\s*(?:-.*)?$',
        re.IGNORECASE | re.MULTILINE
    )
    
    def _has_route_definitions(self, docstring: str) -> bool:
        """
        Check if a docstring contains route definitions.
        
        Looks for common indicators:
        - 'Routes' or 'Endpoints' header
        - Route format like '- GET /path'
        """
        if not docstring:
            return False
        return (
            'Routes' in docstring or 
            'Endpoints' in docstring or
            '- GET' in docstring or 
            '- POST' in docstring or
            '- PUT' in docstring or
            '- DELETE' in docstring or
            '- PATCH' in docstring
        )
    
    def __init__(self):
        """Initialize Lambda parser."""
        self.routes: List[LambdaRoute] = []
        self.current_file: str = ""
    
    def parse_file(self, file_path: str) -> List[LambdaRoute]:
        """
        Parse a Python Lambda file to extract route handlers.
        
        Parsing strategy:
        1. First, try to extract routes from module docstring (dispatcher pattern)
        2. If no docstring routes found, fall back to AST-based parsing
        
        Args:
            file_path: Path to the Python Lambda file
            
        Returns:
            List of LambdaRoute objects
        """
        self.current_file = file_path
        self.routes = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                source = f.read()
            
            # Parse with AST
            tree = ast.parse(source, filename=file_path)
            
            # Strategy 1: Try to extract routes from module docstring (dispatcher pattern)
            docstring_routes = self._parse_docstring_routes(tree, source)
            
            if docstring_routes:
                # Docstring routes found - this is a dispatcher pattern Lambda
                self.routes = docstring_routes
                logger.info(f"Parsed {file_path} (docstring): found {len(self.routes)} route handlers")
            else:
                # Strategy 2: Fall back to AST-based parsing
                self._parse_route_handlers(tree, source)
                logger.info(f"Parsed {file_path} (AST): found {len(self.routes)} route handlers")
            
            return self.routes
            
        except SyntaxError as e:
            logger.error(f"Syntax error in {file_path}: {e}")
            return []
        except Exception as e:
            logger.error(f"Failed to parse {file_path}: {e}")
            return []
    
    def parse_directory(self, directory: str, pattern: str = "**/lambda_function.py") -> List[LambdaRoute]:
        """
        Parse all Lambda handler files in a directory.
        
        Args:
            directory: Directory path
            pattern: Glob pattern for files
            
        Returns:
            List of all LambdaRoute objects found
        """
        all_routes = []
        path = Path(directory)
        
        # Directories to skip (build artifacts, node_modules, etc.)
        skip_patterns = ['.build', 'node_modules', '__pycache__', '.venv', 'dist', 'build']
        
        for file_path in path.glob(pattern):
            # Skip files in build/artifact directories
            if any(skip_dir in str(file_path) for skip_dir in skip_patterns):
                logger.debug(f"Skipping build artifact: {file_path}")
                continue
            
            if file_path.is_file():
                routes = self.parse_file(str(file_path))
                all_routes.extend(routes)
        
        # Store accumulated routes in self.routes for validator access
        self.routes = all_routes
        
        logger.info(f"Parsed directory {directory}: found {len(all_routes)} total route handlers")
        return all_routes
    
    def _parse_docstring_routes(self, tree: ast.AST, source: str) -> List[LambdaRoute]:
        """
        Parse route definitions from module or lambda_handler function docstring.
        
        This handles the "dispatcher pattern" where Lambdas document their routes
        in docstrings rather than having explicit route matching code.
        
        Looks for routes in (priority order):
        1. Module docstring (top of file)
        2. lambda_handler function docstring
        
        Expected format in docstring:
            Routes:
            - GET    /organizations/{orgId}/kb           - List all KBs
            - POST   /organizations/{orgId}/kb           - Create new KB
            
            Or (with Endpoints header):
            Endpoints:
            - GET    /orgs           - List user's organizations
            - GET    /orgs/:id       - Get organization details
        
        Args:
            tree: AST tree of the module
            source: Full source code
            
        Returns:
            List of LambdaRoute objects extracted from docstring, or empty list
        """
        # Try module docstring first
        docstring = ast.get_docstring(tree)
        
        # If no module docstring or no routes in it, try lambda_handler function docstring
        if not docstring or not self._has_route_definitions(docstring):
            # Find lambda_handler function
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) and node.name in ['lambda_handler', 'handler']:
                    func_docstring = ast.get_docstring(node)
                    if func_docstring and self._has_route_definitions(func_docstring):
                        docstring = func_docstring
                        break
        
        if not docstring:
            return []
        
        # Check if docstring contains route definitions
        if not self._has_route_definitions(docstring):
            return []
        
        routes = []
        
        # Parse route definitions
        for match in self.DOCSTRING_ROUTE_PATTERN.finditer(docstring):
            method = match.group(1).upper()
            path = match.group(2)
            
            # Extract path parameters from the path
            path_params = self._extract_path_params(path)
            
            # Create route object
            route = LambdaRoute(
                file=self.current_file,
                line=1,  # Docstring is at top of file
                handler_function='lambda_handler',  # Dispatcher pattern uses single handler
                method=method,
                path=path,
                path_params=path_params,
                source_code=f"# Route from docstring: {method} {path}"
            )
            routes.append(route)
            logger.debug(f"Found docstring route: {method} {path}")
        
        if routes:
            logger.info(f"Extracted {len(routes)} routes from docstring in {self.current_file}")
        
        return routes
    
    def _extract_path_params(self, path: str) -> List[str]:
        """
        Extract path parameters from a route path.
        
        Example:
            /organizations/{orgId}/kb/{kbId} -> ['orgId', 'kbId']
            
        Args:
            path: Route path with {param} placeholders
            
        Returns:
            List of parameter names
        """
        param_pattern = re.compile(r'\{([^}]+)\}')
        return param_pattern.findall(path)
    
    def _parse_route_handlers(self, tree: ast.AST, source: str):
        """
        Parse route handlers from Lambda AST.
        
        Detects common routing patterns:
        1. if method == 'GET': pattern
        2. if path.startswith('/organizations'): pattern
        3. Route dispatcher functions
        4. Regex pattern matching (re.compile + pattern.match())
        """
        # First, extract regex patterns defined in the module
        regex_patterns = self._extract_regex_patterns(tree)
        
        for node in ast.walk(tree):
            # Look for function definitions that might be handlers
            if isinstance(node, ast.FunctionDef):
                self._analyze_handler_function(node, source, regex_patterns)
    
    def _extract_regex_patterns(self, tree: ast.AST) -> Dict[str, str]:
        """
        Extract regex patterns from re.compile() calls.
        
        Example:
            org_ai_config_pattern = re.compile(r'^/orgs/[^/]+/ai/config$')
            
        Returns:
            Dict mapping pattern variable names to regex strings
        """
        patterns = {}
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                # Check if this is a re.compile() call
                if isinstance(node.value, ast.Call):
                    call = node.value
                    
                    # Check for re.compile()
                    is_regex_compile = False
                    if isinstance(call.func, ast.Attribute):
                        if (isinstance(call.func.value, ast.Name) and 
                            call.func.value.id == 're' and 
                            call.func.attr == 'compile'):
                            is_regex_compile = True
                    
                    if is_regex_compile and call.args:
                        # Get the pattern string
                        if isinstance(call.args[0], ast.Constant):
                            pattern_str = call.args[0].value
                            
                            # Get the variable name(s)
                            for target in node.targets:
                                if isinstance(target, ast.Name):
                                    patterns[target.id] = pattern_str
        
        return patterns
    
    def _analyze_handler_function(self, func_node: ast.FunctionDef, source: str, regex_patterns: Optional[Dict[str, str]] = None):
        """
        Analyze a function to detect route handling logic.
        
        Args:
            func_node: AST function definition node
            source: Full source code
            regex_patterns: Dict of regex pattern variables from _extract_regex_patterns
        """
        if regex_patterns is None:
            regex_patterns = {}
        # Skip if not a likely handler function
        func_name = func_node.name
        if not (func_name.startswith('handle_') or func_name == 'lambda_handler' or func_name == 'handler'):
            return
        
        # First pass: extract path equality checks, regex patterns, and their nested method handlers
        path_contexts = self._extract_path_contexts(func_node, regex_patterns)
        
        # Walk through function body looking for routing logic
        for stmt in ast.walk(func_node):
            # Method-based routing: if method == 'GET':
            if isinstance(stmt, ast.If):
                # Check for regex pattern matching first
                regex_path = self._check_regex_routing(stmt, regex_patterns)
                
                # Check if this method check is within a path context
                path_from_context = self._find_path_context(stmt, path_contexts) or regex_path
                
                if path_from_context:
                    # Use the path from the context instead of inferring
                    self._check_method_routing(stmt, func_name, source, explicit_path=path_from_context)
                else:
                    # Original behavior: infer path from function name
                    self._check_method_routing(stmt, func_name, source)
                
                self._check_path_routing(stmt, func_name, source)
    
    def _extract_path_contexts(self, func_node: ast.FunctionDef, regex_patterns: Optional[Dict[str, str]] = None) -> Dict[int, str]:
        """
        Extract path contexts from equality checks and regex pattern matches.
        
        Returns a mapping of line numbers to paths for nested method checks.
        
        Example:
            if path == "/admin/ai/config":  # Line 100 -> "/admin/ai/config"
                if method == 'GET':         # Line 101 (nested)
                    ...
            
            elif org_ai_config_pattern.match(path):  # Line 105 -> "/orgs/{orgId}/ai/config"
                if method == 'GET':                   # Line 106 (nested)
                    ...
        """
        if regex_patterns is None:
            regex_patterns = {}
        
        path_contexts = {}
        
        # Use ast.walk to find all if statements, including nested ones
        for node in ast.walk(func_node):
            if isinstance(node, ast.If):
                # Check for path equality first
                path = self._extract_path_equality(node)
                
                # If no path equality, check for regex pattern
                if not path:
                    path = self._check_regex_routing(node, regex_patterns)
                
                if path:
                    # Map all nested statements to this path
                    start_line = node.lineno
                    end_line = self._get_last_line(node)
                    for line in range(start_line, end_line + 1):
                        path_contexts[line] = path
                    
                    # Also check elif blocks
                    current = node
                    while hasattr(current, 'orelse') and current.orelse:
                        if len(current.orelse) == 1 and isinstance(current.orelse[0], ast.If):
                            elif_stmt = current.orelse[0]
                            elif_path = self._extract_path_equality(elif_stmt)
                            
                            # If no path equality, check for regex pattern
                            if not elif_path:
                                elif_path = self._check_regex_routing(elif_stmt, regex_patterns)
                            
                            if elif_path:
                                start_line = elif_stmt.lineno
                                end_line = self._get_last_line(elif_stmt)
                                for line in range(start_line, end_line + 1):
                                    path_contexts[line] = elif_path
                            current = elif_stmt
                        else:
                            break
        
        return path_contexts
    
    def _extract_path_equality(self, if_node: ast.If) -> Optional[str]:
        """
        Extract path from equality check: if path == "/some/path"
        
        Returns the path string if found, None otherwise.
        """
        if isinstance(if_node.test, ast.Compare):
            compare = if_node.test
            
            # Check for: path == "/some/path" or event['path'] == "/some/path"
            if isinstance(compare.left, ast.Name) and compare.left.id in ['path', 'route', 'request_path']:
                if compare.ops and isinstance(compare.ops[0], ast.Eq):
                    if compare.comparators and isinstance(compare.comparators[0], ast.Constant):
                        return compare.comparators[0].value
            
            # Alternative pattern: event['path'] == "/some/path"
            elif isinstance(compare.left, ast.Subscript):
                if isinstance(compare.left.slice, ast.Constant):
                    if compare.left.slice.value in ['path', 'rawPath']:
                        if compare.comparators and isinstance(compare.comparators[0], ast.Constant):
                            return compare.comparators[0].value
        
        return None
    
    def _get_last_line(self, node: ast.AST) -> int:
        """Get the last line number of an AST node (including nested statements)."""
        max_line = getattr(node, 'lineno', 0)
        
        for child in ast.walk(node):
            child_line = getattr(child, 'lineno', 0)
            if child_line > max_line:
                max_line = child_line
        
        return max_line
    
    def _check_regex_routing(self, if_node: ast.If, regex_patterns: Dict[str, str]) -> Optional[str]:
        """
        Check if this is a regex pattern-based routing condition.
        
        Example:
            org_ai_config_pattern = re.compile(r'^/orgs/[^/]+/ai/config$')
            ...
            elif org_ai_config_pattern.match(path):
        
        Returns the normalized path if found, None otherwise.
        """
        if isinstance(if_node.test, ast.Call):
            call = if_node.test
            
            # Check for: pattern.match(path)
            if isinstance(call.func, ast.Attribute) and call.func.attr == 'match':
                if isinstance(call.func.value, ast.Name):
                    pattern_var = call.func.value.id
                    
                    # Check if this is one of our regex patterns
                    if pattern_var in regex_patterns:
                        regex_str = regex_patterns[pattern_var]
                        
                        # Convert regex to API Gateway path format
                        # e.g., ^/orgs/[^/]+/ai/config$ -> /orgs/{orgId}/ai/config
                        normalized_path = self._regex_to_path(regex_str)
                        return normalized_path
        
        return None
    
    def _regex_to_path(self, regex_str: str) -> str:
        """
        Convert regex pattern to API Gateway path format.
        
        Examples:
            ^/orgs/[^/]+/ai/config$ -> /orgs/{orgId}/ai/config
            ^/organizations/[^/]+/kb$ -> /organizations/{orgId}/kb
        """
        # Remove anchors
        path = regex_str.lstrip('^').rstrip('$')
        
        # Use regex replacement to handle [^/]+ and [^/]* patterns
        # We need to replace them with appropriate parameter names based on context
        import re as regex_module
        
        def replace_param(match):
            """Replace regex pattern with inferred parameter name based on what comes before it."""
            # Get the full matched pattern
            full_match = match.group(0)
            
            # Find what comes before this pattern
            start = match.start()
            before = path[:start]
            
            # Get the last path segment before this pattern
            # Split and get the last non-empty segment
            segments = [s for s in before.split('/') if s]
            last_segment = segments[-1] if segments else ''
            
            # Infer parameter name from the immediate preceding segment
            if last_segment in ['orgs', 'organizations']:
                return '{orgId}'
            elif last_segment == 'kb':
                return '{kbId}'
            elif last_segment == 'members':
                return '{memberId}'
            elif last_segment == 'documents':
                return '{docId}'
            elif last_segment == 'providers':
                return '{providerId}'
            elif last_segment == 'models':
                return '{modelId}'
            else:
                return '{id}'
        
        # Replace all [^/]+ or [^/]* patterns
        normalized = regex_module.sub(r'\[\^/\]\+|\[\^/\]\*', replace_param, path)
        return normalized
    
    def _find_path_context(self, if_node: ast.If, path_contexts: Dict[int, str]) -> Optional[str]:
        """Find the path context for a given if node based on line number."""
        line = if_node.lineno
        return path_contexts.get(line)
    
    def _check_method_routing(self, if_node: ast.If, func_name: str, source: str, explicit_path: Optional[str] = None):
        """
        Check if this is a method-based routing condition.
        
        Example:
            if method == 'GET':
                return handle_list()
            if '/discover' in path and method == 'POST':
                return handle_discover()
        
        Args:
            if_node: AST if statement node
            func_name: Name of the handler function
            source: Full source code
            explicit_path: Path from parent path equality check (if any)
        """
        # Check for compound conditions: '/substring' in path and method == 'POST'
        if isinstance(if_node.test, ast.BoolOp) and isinstance(if_node.test.op, ast.And):
            compound_route = self._check_compound_routing(if_node.test, func_name, source)
            if compound_route:
                line = if_node.lineno
                self.routes.append(LambdaRoute(
                    file=self.current_file,
                    line=line,
                    handler_function=func_name,
                    method=compound_route['method'],
                    path=compound_route['path'],
                    path_params=compound_route.get('path_params', []),
                    source_code=ast.get_source_segment(source, if_node) if hasattr(ast, 'get_source_segment') else ""
                ))
                return
        
        # Check if condition compares method variable
        if isinstance(if_node.test, ast.Compare):
            compare = if_node.test
            
            # Check for: method == 'GET' or event['httpMethod'] == 'GET'
            method_value = None
            
            if isinstance(compare.left, ast.Name) and compare.left.id in ['method', 'http_method']:
                if compare.ops and isinstance(compare.ops[0], ast.Eq):
                    if compare.comparators and isinstance(compare.comparators[0], ast.Constant):
                        method_value = compare.comparators[0].value
            
            # Alternative pattern: event['httpMethod'] == 'GET'
            elif isinstance(compare.left, ast.Subscript):
                if isinstance(compare.left.slice, ast.Constant):
                    if compare.left.slice.value in ['httpMethod', 'requestContext']:
                        if compare.comparators and isinstance(compare.comparators[0], ast.Constant):
                            method_value = compare.comparators[0].value
            
            if method_value:
                # Extract line number
                line = if_node.lineno
                
                # Use explicit path from context if available, otherwise infer
                if explicit_path:
                    path = explicit_path
                else:
                    path = self._infer_path_from_function_name(func_name)
                
                self.routes.append(LambdaRoute(
                    file=self.current_file,
                    line=line,
                    handler_function=func_name,
                    method=method_value.upper(),
                    path=path,
                    source_code=ast.get_source_segment(source, if_node) if hasattr(ast, 'get_source_segment') else ""
                ))
    
    def _check_compound_routing(self, bool_op: ast.BoolOp, func_name: str, source: str) -> Optional[Dict[str, Any]]:
        """
        Check for compound routing conditions like:
            if '/discover' in path and http_method == 'POST':
            if '/validate-models' in path and method == 'POST':
        
        Args:
            bool_op: AST BoolOp node with And operator
            func_name: Name of the handler function
            source: Full source code
            
        Returns:
            Dict with method and path if found, None otherwise
        """
        # Extract the two parts of the AND condition
        if len(bool_op.values) != 2:
            return None
        
        path_substring = None
        method = None
        
        # Check each value in the AND condition
        for value in bool_op.values:
            # Check for substring match: '/discover' in path
            if isinstance(value, ast.Compare):
                if len(value.ops) == 1 and isinstance(value.ops[0], ast.In):
                    # Check if comparing a string constant to a path variable
                    if isinstance(value.left, ast.Constant):
                        if isinstance(value.comparators[0], ast.Name):
                            if value.comparators[0].id in ['path', 'route', 'request_path']:
                                path_substring = value.left.value
                
                # Check for method equality: http_method == 'POST'
                elif len(value.ops) == 1 and isinstance(value.ops[0], ast.Eq):
                    if isinstance(value.left, ast.Name):
                        if value.left.id in ['method', 'http_method']:
                            if isinstance(value.comparators[0], ast.Constant):
                                method = value.comparators[0].value
        
        # If we found both parts, construct the route
        if path_substring and method:
            # Infer the full path from the substring
            # For example: '/discover' -> '/providers/{id}/discover'
            full_path = self._infer_full_path_from_substring(path_substring, func_name)
            
            # Extract path parameters
            path_params = self._extract_path_params(full_path)
            
            return {
                'method': method.upper(),
                'path': full_path,
                'path_params': path_params
            }
        
        return None
    
    def _infer_full_path_from_substring(self, substring: str, func_name: str) -> str:
        """
        Infer the full path from a substring match.
        
        Examples:
            '/discover' -> '/providers/{id}/discover'
            '/validate-models' -> '/providers/{id}/validate-models'
            '/validation-status' -> '/providers/{id}/validation-status'
            '/test' -> '/models/{id}/test'
        
        Args:
            substring: Path substring being checked (e.g., '/discover')
            func_name: Name of the handler function (for context)
            
        Returns:
            Full inferred path with parameters
        """
        # Map common substrings to their full paths
        # These are based on the provider Lambda pattern
        substring_to_path = {
            '/discover': '/providers/{id}/discover',
            '/validate-models': '/providers/{id}/validate-models',
            '/validation-status': '/providers/{id}/validation-status',
            '/test': '/models/{id}/test',
            '/activate': '/admin/idp-config/{providerType}/activate',
        }
        
        # Check if we have a known mapping
        if substring in substring_to_path:
            return substring_to_path[substring]
        
        # If substring already looks like a full path, use it
        if substring.count('/') >= 2:
            return substring
        
        # Default: treat substring as the full path
        return substring
    
    def _check_path_routing(self, if_node: ast.If, func_name: str, source: str):
        """
        Check if this is a path-based routing condition.
        
        Handles both:
        1. path.startswith('/organizations')
        2. path == '/admin/ai/config'
        """
        # Pattern 1: path.startswith('/organizations')
        if isinstance(if_node.test, ast.Call):
            call = if_node.test
            
            # Check for: path.startswith('/organizations')
            if isinstance(call.func, ast.Attribute):
                # Skip regex pattern matches - these are handled by _extract_path_contexts
                # and _check_method_routing with explicit_path
                if call.func.attr == 'match':
                    return
                
                if call.func.attr == 'startswith':
                    if call.args and isinstance(call.args[0], ast.Constant):
                        path_value = call.args[0].value
                        
                        # Extract line number
                        line = if_node.lineno
                        
                        # Try to infer method (default to GET for path routing)
                        method = 'GET'
                        
                        self.routes.append(LambdaRoute(
                            file=self.current_file,
                            line=line,
                            handler_function=func_name,
                            method=method,
                            path=path_value,
                            source_code=ast.get_source_segment(source, if_node) if hasattr(ast, 'get_source_segment') else ""
                        ))
        
        # Pattern 2: path == '/admin/ai/config'
        # Note: This is now handled by _extract_path_contexts and _check_method_routing
        # but we still parse standalone path checks (without nested method checks)
        elif isinstance(if_node.test, ast.Compare):
            path_value = self._extract_path_equality(if_node)
            if path_value:
                # Check if there are nested method checks
                has_nested_methods = False
                for child in ast.walk(if_node):
                    if isinstance(child, ast.If) and child != if_node:
                        # Check if this nested if is a method check
                        if isinstance(child.test, ast.Compare):
                            compare = child.test
                            if isinstance(compare.left, ast.Name) and compare.left.id in ['method', 'http_method']:
                                has_nested_methods = True
                                break
                
                # Only create a route if there are NO nested method checks
                # (nested methods are handled by _check_method_routing with explicit_path)
                if not has_nested_methods:
                    line = if_node.lineno
                    method = 'GET'  # Default method for standalone path checks
                    
                    self.routes.append(LambdaRoute(
                        file=self.current_file,
                        line=line,
                        handler_function=func_name,
                        method=method,
                        path=path_value,
                        source_code=ast.get_source_segment(source, if_node) if hasattr(ast, 'get_source_segment') else ""
                    ))
    
    def _infer_path_from_function_name(self, func_name: str) -> str:
        """
        Infer API path from function name.
        
        Examples:
            handle_list_bases -> /bases (inferred)
            handle_get_kb -> /kb (inferred)
            lambda_handler -> / (generic)
        """
        if func_name == 'lambda_handler' or func_name == 'handler':
            return '/'
        
        # Remove 'handle_' prefix
        name_part = func_name.replace('handle_', '')
        
        # Remove method prefix if present
        for method_prefix in ['get_', 'list_', 'create_', 'update_', 'delete_']:
            if name_part.startswith(method_prefix):
                name_part = name_part.replace(method_prefix, '', 1)
                break
        
        # Convert to path
        # e.g., 'list_bases' -> '/bases', 'get_profile' -> '/profile'
        return f"/{name_part.replace('_', '-')}"
    
    def normalize_path(self, path: str) -> str:
        """
        Normalize path for comparison.

        Ensures consistent path parameter format.
        Converts:
        - Express-style :param to {param}
        - Regex patterns to normalized paths
        - All path parameter names to generic {param} for comparison
          (e.g., {id}, {workspaceId}, {userId} all become {param})
        """
        # Ensure path starts with /
        if not path.startswith('/'):
            path = f"/{path}"

        # Convert Express-style :param to {param}
        # e.g., /orgs/:id -> /orgs/{id}
        path = re.sub(r':(\w+)', r'{\1}', path)

        # Convert regex patterns to normalized paths
        # e.g., /orgs/[^/]+/ai/config -> /orgs/{orgId}/ai/config
        if '[^/]+' in path or '[^/]*' in path:
            path = self._regex_to_path(path)

        # Normalize all path parameter names to generic {param}
        # This allows matching paths with different param names:
        # /ws/{id}/members matches /ws/{workspaceId}/members
        # /ws/{wsId}/members/{memberId} matches /ws/{workspaceId}/members/{userId}
        path = re.sub(r'\{[^}]+\}', '{param}', path)

        return path
    
    def get_unique_routes(self) -> Set[str]:
        """Get set of all unique routes (method + path)."""
        return {f"{route.method} {self.normalize_path(route.path)}" for route in self.routes}
    
    def get_routes_by_method(self, method: str) -> List[LambdaRoute]:
        """Get all routes for a specific HTTP method."""
        return [route for route in self.routes if route.method == method.upper()]
    
    def get_routes_by_path(self, path: str) -> List[LambdaRoute]:
        """Get all routes for a specific path (normalized)."""
        normalized_path = self.normalize_path(path)
        return [
            route for route in self.routes 
            if self.normalize_path(route.path) == normalized_path
        ]
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Export routes as dictionary (for JSON serialization).
        AI-friendly format for programmatic access.
        """
        return {
            'total_routes': len(self.routes),
            'unique_routes': list(self.get_unique_routes()),
            'methods': {
                'GET': len(self.get_routes_by_method('GET')),
                'POST': len(self.get_routes_by_method('POST')),
                'PUT': len(self.get_routes_by_method('PUT')),
                'PATCH': len(self.get_routes_by_method('PATCH')),
                'DELETE': len(self.get_routes_by_method('DELETE'))
            },
            'routes': [
                {
                    'file': route.file,
                    'line': route.line,
                    'handler_function': route.handler_function,
                    'method': route.method,
                    'path': self.normalize_path(route.path),
                    'path_params': route.path_params,
                    'query_params': route.query_params,
                    'request_body_keys': route.request_body_keys,
                    'response_status': route.response_status,
                    'response_type': route.response_type
                }
                for route in self.routes
            ]
        }
