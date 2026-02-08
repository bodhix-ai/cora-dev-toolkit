"""
Frontend API Client Parser

Parses TypeScript/JavaScript API client files to extract API endpoints.
Identifies HTTP methods, paths, parameters, and expected responses.
"""

import re
import logging
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class APICall:
    """Represents a frontend API call."""
    file: str
    line: int
    method: str  # GET, POST, PUT, PATCH, DELETE
    endpoint: str  # /organizations/{orgId}/kb
    path_params: List[str] = field(default_factory=list)  # ['orgId']
    query_params: List[str] = field(default_factory=list)  # ['limit', 'offset']
    request_body_keys: List[str] = field(default_factory=list)  # Keys in request body
    expected_response_type: Optional[str] = None  # 'KnowledgeBase[]', etc.
    source_code: str = ""  # Original source code snippet


class FrontendParser:
    """Parses TypeScript/JavaScript API client files."""
    
    def __init__(self):
        """Initialize frontend parser."""
        self.api_calls: List[APICall] = []
        self.current_file: str = ""
    
    def parse_file(self, file_path: str) -> List[APICall]:
        """
        Parse a TypeScript/JavaScript file to extract API calls.
        
        Args:
            file_path: Path to the TypeScript/JavaScript file
            
        Returns:
            List of APICall objects
        """
        self.current_file = file_path
        self.api_calls = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse different API call patterns
            self._parse_fetch_calls(content)
            self._parse_authenticated_client_calls(content)
            self._parse_swr_calls(content)
            # Note: buildUrl and JSDoc parsing disabled for now
            # They cause route mismatches due to parameter name differences
            # TODO: Need to align normalization between frontend and backend parsers
            # self._parse_build_url_calls(content)
            # self._parse_jsdoc_routes(content)
            
            logger.info(f"Parsed {file_path}: found {len(self.api_calls)} API calls")
            return self.api_calls
            
        except Exception as e:
            logger.error(f"Failed to parse {file_path}: {e}")
            return []
    
    def parse_directory(self, directory: str, pattern: str = "**/*.{ts,tsx,js,jsx}") -> List[APICall]:
        """
        Parse all TypeScript/JavaScript files in a directory.
        
        Args:
            directory: Directory path
            pattern: Glob pattern for files
            
        Returns:
            List of all APICall objects found
        """
        all_calls = []
        path = Path(directory)
        
        # Handle glob pattern with multiple extensions
        # Skip common directories that shouldn't be scanned
        skip_dirs = ['.next', 'node_modules', '.build', 'dist', 'build', '__pycache__', '.venv']
        
        for ext in ['ts', 'tsx', 'js', 'jsx']:
            for file_path in path.glob(f"**/*.{ext}"):
                # Skip if file is in an excluded directory
                if file_path.is_file() and not any(skip in str(file_path) for skip in skip_dirs):
                    calls = self.parse_file(str(file_path))
                    all_calls.extend(calls)
        
        logger.info(f"Parsed directory {directory}: found {len(all_calls)} total API calls")
        
        # Store calls in instance for later access
        self.api_calls = all_calls
        
        return all_calls
    
    def _strip_base_url_and_query_params(self, endpoint: str) -> tuple:
        """
        Strip base URL variables and query parameters from endpoint.
        
        Args:
            endpoint: Endpoint string that may contain base URL and query parameters
            
        Returns:
            Tuple of (clean_path, query_param_names)
            
        Examples:
            '${API_BASE_URL}/models?providerId={providerId}' -> ('/models', ['providerId'])
            '${apiUrl}/orgs/{orgId}/kb?limit=10' -> ('/orgs/{orgId}/kb', ['limit'])
            '/profiles/me' -> ('/profiles/me', [])
        """
        # Strip base URL template variables (common patterns in frontend code)
        base_url_patterns = [
            r'\$\{API_BASE_URL\}',
            r'\$\{apiUrl\}',
            r'\$\{baseURL\}',
            r'\$\{API_URL\}',
            r'\$\{CORA_API_BASE\}',
            r'\$\{apiBase\}',
            r'\$\{API_BASE\}',
        ]
        
        clean_endpoint = endpoint
        for pattern in base_url_patterns:
            clean_endpoint = re.sub(pattern, '', clean_endpoint)
        
        # Ensure path starts with /
        if clean_endpoint and not clean_endpoint.startswith('/'):
            clean_endpoint = '/' + clean_endpoint
        
        # Strip query parameters
        if '?' not in clean_endpoint:
            return clean_endpoint, []
        
        base_path = clean_endpoint.split('?')[0]
        query_string = clean_endpoint.split('?')[1]
        
        # Extract query parameter names
        query_params = []
        for param in query_string.split('&'):
            param_name = param.split('=')[0]
            query_params.append(param_name)
        
        return base_path, query_params
    
    def _strip_query_params(self, endpoint: str) -> tuple:
        """
        DEPRECATED: Use _strip_base_url_and_query_params instead.
        Kept for backward compatibility.
        """
        return self._strip_base_url_and_query_params(endpoint)
    
    def _parse_fetch_calls(self, content: str):
        """
        Parse direct fetch() calls.
        
        Example:
            fetch('/organizations/${orgId}/kb', { method: 'GET' })
        """
        # Pattern: fetch('url', options)
        # Match both template literals and regular strings
        fetch_pattern = r"fetch\s*\(\s*[`'\"]([^`'\"]+)[`'\"](?:.*?method\s*:\s*['\"](\w+)['\"])?"
        
        for match in re.finditer(fetch_pattern, content, re.DOTALL):
            raw_endpoint = match.group(1)
            method = match.group(2) if match.group(2) else 'GET'
            
            # Extract line number
            line = content[:match.start()].count('\n') + 1
            
            # Strip query parameters from endpoint
            endpoint, query_params = self._strip_query_params(raw_endpoint)
            
            # Skip overly generic patterns (likely from wrapper functions)
            if self._is_generic_pattern(endpoint):
                logger.debug(f"Skipping generic pattern: {endpoint}")
                continue
            
            # Extract path parameters from template literals
            path_params = self._extract_path_params(endpoint)
            
            self.api_calls.append(APICall(
                file=self.current_file,
                line=line,
                method=method.upper(),
                endpoint=endpoint,
                path_params=path_params,
                query_params=query_params,
                source_code=match.group(0)
            ))
    
    def _parse_authenticated_client_calls(self, content: str):
        """
        Parse authenticatedClient.get/post/put/delete() calls.
        
        Example:
            authenticatedClient.get(`/organizations/${orgId}/kb`)
            authenticatedClient.post('/profiles', { data: {...} })
        """
        # Pattern: client.method('url', options)
        client_pattern = r"(?:authenticatedClient|client|apiClient)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*[`'\"]([^`'\"]+)[`'\"]"
        
        for match in re.finditer(client_pattern, content, re.IGNORECASE):
            method = match.group(1)
            raw_endpoint = match.group(2)
            
            # Extract line number
            line = content[:match.start()].count('\n') + 1
            
            # Strip query parameters from endpoint
            endpoint, query_params = self._strip_query_params(raw_endpoint)
            
            # Skip overly generic patterns (likely from wrapper functions)
            if self._is_generic_pattern(endpoint):
                logger.debug(f"Skipping generic pattern: {endpoint}")
                continue
            
            # Check if endpoint contains dynamic variables (e.g., ${entityType}s)
            # If so, try to resolve them to concrete routes
            concrete_endpoints = self._resolve_dynamic_routes(endpoint, content)
            
            if concrete_endpoints:
                # Generate an API call for each concrete route
                for concrete_endpoint in concrete_endpoints:
                    # Skip generic patterns in resolved endpoints too
                    if self._is_generic_pattern(concrete_endpoint):
                        continue
                    path_params = self._extract_path_params(concrete_endpoint)
                    self.api_calls.append(APICall(
                        file=self.current_file,
                        line=line,
                        method=method.upper(),
                        endpoint=concrete_endpoint,
                        path_params=path_params,
                        query_params=query_params,
                        source_code=match.group(0)
                    ))
            else:
                # No dynamic resolution, add as-is
                path_params = self._extract_path_params(endpoint)
                self.api_calls.append(APICall(
                    file=self.current_file,
                    line=line,
                    method=method.upper(),
                    endpoint=endpoint,
                    path_params=path_params,
                    query_params=query_params,
                    source_code=match.group(0)
                ))
    
    def _parse_build_url_calls(self, content: str):
        """
        Parse buildUrl() calls commonly used in CORA API clients.
        
        Example:
            buildUrl(`/ws/${wsId}/chats`, params)
            buildUrl('/users/me/chats', {})
        """
        # Pattern: buildUrl('url') or buildUrl(`url`)
        build_url_pattern = r"buildUrl\s*\(\s*[`'\"]([^`'\"]+)[`'\"]"
        
        for match in re.finditer(build_url_pattern, content):
            raw_endpoint = match.group(1)
            
            # Extract line number
            line = content[:match.start()].count('\n') + 1
            
            # Strip query parameters from endpoint
            endpoint, query_params = self._strip_query_params(raw_endpoint)
            
            # Skip overly generic patterns
            if self._is_generic_pattern(endpoint):
                logger.debug(f"Skipping generic pattern: {endpoint}")
                continue
            
            # Try to determine HTTP method from surrounding context
            # Look for JSDoc comment or function name hints
            method = self._infer_method_from_context(content, match.start())
            
            path_params = self._extract_path_params(endpoint)
            self.api_calls.append(APICall(
                file=self.current_file,
                line=line,
                method=method,
                endpoint=endpoint,
                path_params=path_params,
                query_params=query_params,
                source_code=match.group(0)
            ))
    
    def _parse_jsdoc_routes(self, content: str):
        """
        Parse JSDoc route comments.
        
        Example:
            * GET /users/me/chats
            * POST /ws/{wsId}/chats
            * DELETE /chats/{sessionId}
        """
        # Pattern: * METHOD /path (in JSDoc comments)
        jsdoc_pattern = r"\*\s+(GET|POST|PUT|PATCH|DELETE)\s+(/[^\s\n*]+)"
        
        for match in re.finditer(jsdoc_pattern, content, re.IGNORECASE):
            method = match.group(1).upper()
            raw_endpoint = match.group(2)
            
            # Extract line number
            line = content[:match.start()].count('\n') + 1
            
            # Strip query parameters from endpoint
            endpoint, query_params = self._strip_query_params(raw_endpoint)
            
            # Skip overly generic patterns
            if self._is_generic_pattern(endpoint):
                continue
            
            path_params = self._extract_path_params(endpoint)
            self.api_calls.append(APICall(
                file=self.current_file,
                line=line,
                method=method,
                endpoint=endpoint,
                path_params=path_params,
                query_params=query_params,
                source_code=match.group(0)
            ))
    
    def _infer_method_from_context(self, content: str, position: int) -> str:
        """
        Infer HTTP method from surrounding context.
        
        Looks at:
        1. Nearby JSDoc comments (e.g., * POST /path)
        2. Function name patterns (e.g., createX, updateX, deleteX)
        """
        # Get surrounding context (200 chars before)
        start = max(0, position - 200)
        context = content[start:position]
        
        # Check for JSDoc method comment
        jsdoc_match = re.search(r'\*\s+(GET|POST|PUT|PATCH|DELETE)\s+/', context, re.IGNORECASE)
        if jsdoc_match:
            return jsdoc_match.group(1).upper()
        
        # Check for function name patterns
        func_match = re.search(r'function\s+(\w+)', context)
        if func_match:
            func_name = func_match.group(1).lower()
            if func_name.startswith('create') or func_name.startswith('add'):
                return 'POST'
            elif func_name.startswith('update') or func_name.startswith('edit'):
                return 'PATCH'
            elif func_name.startswith('delete') or func_name.startswith('remove'):
                return 'DELETE'
            elif func_name.startswith('get') or func_name.startswith('list') or func_name.startswith('fetch'):
                return 'GET'
        
        # Default to GET
        return 'GET'
    
    def _parse_swr_calls(self, content: str):
        """
        Parse SWR hook calls (useSWR).
        
        Example:
            useSWR(`/organizations/${orgId}/kb`)
            useSWR(orgId ? `/organizations/${orgId}/kb` : null)
        """
        # Pattern: useSWR('url') or useSWR(`url`)
        swr_pattern = r"useSWR\s*\(\s*(?:\w+\s*\?\s*)?[`'\"]([^`'\"]+)[`'\"]"
        
        for match in re.finditer(swr_pattern, content):
            raw_endpoint = match.group(1)
            
            # Extract line number
            line = content[:match.start()].count('\n') + 1
            
            # Strip query parameters from endpoint
            endpoint, query_params = self._strip_query_params(raw_endpoint)
            
            # Skip overly generic patterns (likely from wrapper functions)
            if self._is_generic_pattern(endpoint):
                logger.debug(f"Skipping generic pattern: {endpoint}")
                continue
            
            # Check if endpoint contains dynamic variables (e.g., ${entityType}s)
            # If so, try to resolve them to concrete routes
            concrete_endpoints = self._resolve_dynamic_routes(endpoint, content)
            
            if concrete_endpoints:
                # Generate an API call for each concrete route
                for concrete_endpoint in concrete_endpoints:
                    # Skip generic patterns in resolved endpoints too
                    if self._is_generic_pattern(concrete_endpoint):
                        continue
                    path_params = self._extract_path_params(concrete_endpoint)
                    self.api_calls.append(APICall(
                        file=self.current_file,
                        line=line,
                        method='GET',
                        endpoint=concrete_endpoint,
                        path_params=path_params,
                        query_params=query_params,
                        source_code=match.group(0)
                    ))
            else:
                # No dynamic resolution, add as-is
                path_params = self._extract_path_params(endpoint)
                self.api_calls.append(APICall(
                    file=self.current_file,
                    line=line,
                    method='GET',
                    endpoint=endpoint,
                    path_params=path_params,
                    query_params=query_params,
                    source_code=match.group(0)
                ))
    
    def _resolve_dynamic_routes(self, endpoint: str, content: str) -> List[str]:
        """
        Resolve dynamic template literal variables to concrete routes.
        
        Example:
            Input: `/${entityType}s/${entityId}/kbs`
            Type: entityType: "chat" | "project"
            Output: ["/chats/{entityId}/kbs", "/projects/{entityId}/kbs"]
        
        Args:
            endpoint: The endpoint string with template variables
            content: Full file content to search for type definitions
            
        Returns:
            List of concrete endpoint strings, or empty list if no resolution possible
        """
        # Find all template variables in the endpoint (not path params)
        # Pattern: ${varName} but exclude ${paramName} if paramName is clearly a parameter
        template_vars = re.findall(r'\$\{(\w+)\}', endpoint)
        
        if not template_vars:
            return []
        
        # Check if any variable looks like it might be a dynamic type variable
        # Heuristics: short names that aren't typical path params (id, orgId, chatId, etc.)
        dynamic_vars = []
        for var in template_vars:
            # Skip if it's clearly a path parameter (ends with Id, is 'id', etc.)
            if var.lower().endswith('id') or var.lower() == 'id':
                continue
            # This might be a dynamic type variable
            dynamic_vars.append(var)
        
        if not dynamic_vars:
            return []
        
        # For each dynamic variable, try to find its type definition
        concrete_routes = [endpoint]
        
        for var_name in dynamic_vars:
            # Pattern 1: Function parameter with union type
            # e.g., function foo(entityType: "chat" | "project")
            # or: (entityType: "chat" | "project", ...)
            param_pattern = rf'{var_name}\s*:\s*(["\'][\w]+["\'](?:\s*\|\s*["\'][\w]+["\'])+)'
            
            # Pattern 2: Type alias
            # e.g., type EntityType = "chat" | "project"
            type_alias_pattern = rf'type\s+\w*{var_name.capitalize()}\w*\s*=\s*(["\'][\w]+["\'](?:\s*\|\s*["\'][\w]+["\'])+)'
            
            union_match = re.search(param_pattern, content) or re.search(type_alias_pattern, content)
            
            if union_match:
                # Extract string literal values from union type
                union_type = union_match.group(1)
                values = re.findall(r'["\'](\w+)["\']', union_type)
                
                if values:
                    logger.debug(f"Resolved {var_name} to union values: {values}")
                    
                    # Generate all combinations by replacing the variable
                    new_routes = []
                    for route in concrete_routes:
                        for value in values:
                            # Replace ${varName} with the literal value
                            new_route = route.replace(f'${{{var_name}}}', value)
                            
                            # Also transform related parameter names (e.g., entityId -> chatId)
                            # Pattern: {entityId} should become {chatId} when entity type is "chat"
                            if 'entityId' in new_route:
                                # Transform {entityId} to {<entityType>Id}
                                new_route = new_route.replace('{entityId}', f'{{{value}Id}}')
                            
                            new_routes.append(new_route)
                    
                    concrete_routes = new_routes
        
        # Only return if we actually resolved something
        if concrete_routes != [endpoint]:
            logger.info(f"Resolved dynamic route '{endpoint}' to {len(concrete_routes)} concrete routes")
            return concrete_routes
        
        return []
    
    def _is_generic_pattern(self, endpoint: str) -> bool:
        """
        Check if endpoint is an overly generic pattern from a wrapper function.
        
        Examples of generic patterns to skip:
            /{url}
            /${url}
            /{endpoint}
            /{path}
            /{route}
        
        Args:
            endpoint: The endpoint to check
            
        Returns:
            True if the pattern is too generic to be a real API route
        """
        # Generic single-parameter patterns (both normalized and template literal forms)
        generic_patterns = [
            r'^/\{url\}$',              # /{url} - normalized
            r'^/\$\{url\}$',            # /${url} - template literal
            r'^/\{endpoint\}$',         # /{endpoint} - normalized
            r'^/\$\{endpoint\}$',       # /${endpoint} - template literal
            r'^/\{path\}$',             # /{path} - normalized
            r'^/\$\{path\}$',           # /${path} - template literal
            r'^/\{route\}$',            # /{route} - normalized
            r'^/\$\{route\}$',          # /${route} - template literal
            r'^\$\{url\}$',             # ${url} - no slash
            r'^\$\{endpoint\}$',        # ${endpoint} - no slash
            r'^\$\{path\}$',            # ${path} - no slash
            r'^\$\{route\}$',           # ${route} - no slash
        ]
        
        for pattern in generic_patterns:
            if re.match(pattern, endpoint):
                return True
        
        return False
    
    def _extract_path_params(self, endpoint: str) -> List[str]:
        """
        Extract path parameters from endpoint.
        
        Examples:
            /organizations/${orgId}/kb -> ['orgId']
            /organizations/{orgId}/kb/{kbId} -> ['orgId', 'kbId']
            /organizations/${organization.id}/kb -> ['organization.id']
        """
        params = []
        
        # Template literal parameters: ${param} or ${obj.prop}
        # Handle dot notation for object property access
        template_params = re.findall(r'\$\{([\w.]+)\}', endpoint)
        params.extend(template_params)
        
        # Curly brace parameters: {param}
        curly_params = re.findall(r'\{([\w.]+)\}', endpoint)
        params.extend(curly_params)
        
        return params
    
    def normalize_endpoint(self, endpoint: str) -> str:
        """
        Normalize endpoint path for comparison.

        Converts ALL path parameters to generic {param} format to avoid false positives
        from parameter naming differences:
            /chats/${sessionId}/kb -> /chats/{param}/kb
            /chats/{chatId}/kb -> /chats/{param}/kb
            /organizations/${orgId}/kb -> /organizations/{param}/kb
            
        This matches the approach used in component_parser.py.
        """
        # Step 1: Replace template literal parameters (${var}) with {param}
        normalized = re.sub(r'\$\{[\w.]+\}', '{param}', endpoint)
        
        # Step 2: Replace curly brace parameters ({var}) with {param}
        normalized = re.sub(r'\{[\w.]+\}', '{param}', normalized)
        
        return normalized
    
    def get_unique_endpoints(self) -> Set[str]:
        """Get set of all unique endpoints (normalized)."""
        return {self.normalize_endpoint(call.endpoint) for call in self.api_calls}
    
    def get_calls_by_method(self, method: str) -> List[APICall]:
        """Get all API calls for a specific HTTP method."""
        return [call for call in self.api_calls if call.method == method.upper()]
    
    def get_calls_by_endpoint(self, endpoint: str) -> List[APICall]:
        """Get all API calls for a specific endpoint (normalized)."""
        normalized_endpoint = self.normalize_endpoint(endpoint)
        return [
            call for call in self.api_calls 
            if self.normalize_endpoint(call.endpoint) == normalized_endpoint
        ]
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Export API calls as dictionary (for JSON serialization).
        AI-friendly format for programmatic access.
        """
        return {
            'total_calls': len(self.api_calls),
            'unique_endpoints': list(self.get_unique_endpoints()),
            'methods': {
                'GET': len(self.get_calls_by_method('GET')),
                'POST': len(self.get_calls_by_method('POST')),
                'PUT': len(self.get_calls_by_method('PUT')),
                'PATCH': len(self.get_calls_by_method('PATCH')),
                'DELETE': len(self.get_calls_by_method('DELETE'))
            },
            'calls': [
                {
                    'file': call.file,
                    'line': call.line,
                    'method': call.method,
                    'endpoint': self.normalize_endpoint(call.endpoint),
                    'path_params': call.path_params,
                    'query_params': call.query_params,
                    'request_body_keys': call.request_body_keys,
                    'expected_response_type': call.expected_response_type
                }
                for call in self.api_calls
            ]
        }
