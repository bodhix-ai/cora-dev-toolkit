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
        for ext in ['ts', 'tsx', 'js', 'jsx']:
            for file_path in path.glob(f"**/*.{ext}"):
                if file_path.is_file() and 'node_modules' not in str(file_path):
                    calls = self.parse_file(str(file_path))
                    all_calls.extend(calls)
        
        logger.info(f"Parsed directory {directory}: found {len(all_calls)} total API calls")
        
        # Store calls in instance for later access
        self.api_calls = all_calls
        
        return all_calls
    
    def _strip_query_params(self, endpoint: str) -> tuple:
        """
        Strip query parameters from endpoint and return them separately.
        
        Args:
            endpoint: Endpoint string that may contain query parameters
            
        Returns:
            Tuple of (base_path, query_param_names)
            
        Examples:
            '/models?providerId={providerId}' -> ('/models', ['providerId'])
            '/orgs/{orgId}/kb?limit=10' -> ('/orgs/{orgId}/kb', ['limit'])
        """
        if '?' not in endpoint:
            return endpoint, []
        
        base_path = endpoint.split('?')[0]
        query_string = endpoint.split('?')[1]
        
        # Extract query parameter names
        query_params = []
        for param in query_string.split('&'):
            param_name = param.split('=')[0]
            query_params.append(param_name)
        
        return base_path, query_params
    
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
            
            # Check if endpoint contains dynamic variables (e.g., ${entityType}s)
            # If so, try to resolve them to concrete routes
            concrete_endpoints = self._resolve_dynamic_routes(endpoint, content)
            
            if concrete_endpoints:
                # Generate an API call for each concrete route
                for concrete_endpoint in concrete_endpoints:
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
            
            # Check if endpoint contains dynamic variables (e.g., ${entityType}s)
            # If so, try to resolve them to concrete routes
            concrete_endpoints = self._resolve_dynamic_routes(endpoint, content)
            
            if concrete_endpoints:
                # Generate an API call for each concrete route
                for concrete_endpoint in concrete_endpoints:
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
    
    def _extract_path_params(self, endpoint: str) -> List[str]:
        """
        Extract path parameters from endpoint.
        
        Examples:
            /organizations/${orgId}/kb -> ['orgId']
            /organizations/{orgId}/kb/{kbId} -> ['orgId', 'kbId']
        """
        params = []
        
        # Template literal parameters: ${param}
        template_params = re.findall(r'\$\{(\w+)\}', endpoint)
        params.extend(template_params)
        
        # Curly brace parameters: {param}
        curly_params = re.findall(r'\{(\w+)\}', endpoint)
        params.extend(curly_params)
        
        return params
    
    def normalize_endpoint(self, endpoint: str) -> str:
        """
        Normalize endpoint path for comparison.
        
        Converts template literals to curly brace format:
            /organizations/${orgId}/kb -> /organizations/{orgId}/kb
        """
        # Replace template literal parameters with curly brace format
        normalized = re.sub(r'\$\{(\w+)\}', r'{\1}', endpoint)
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
