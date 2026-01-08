"""
API Gateway Parser

Parses Terraform API Gateway configuration to extract route definitions.
Identifies HTTP methods, paths, Lambda integrations, and CORS settings.
"""

import re
import logging
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class GatewayRoute:
    """Represents an API Gateway route definition."""
    file: str
    line: int
    method: str  # GET, POST, PUT, PATCH, DELETE
    path: str  # /organizations/{orgId}/kb
    lambda_function: Optional[str] = None  # pm-app-dev-kb-base-handler
    authorization: Optional[str] = None  # JWT, None
    cors_enabled: bool = True
    source_code: str = ""  # Original source code snippet


class GatewayParser:
    """Parses Terraform API Gateway configuration."""
    
    def __init__(self):
        """Initialize gateway parser."""
        self.routes: List[GatewayRoute] = []
        self.current_file: str = ""
    
    def parse_file(self, file_path: str) -> List[GatewayRoute]:
        """
        Parse a Terraform file to extract API Gateway routes.
        
        Args:
            file_path: Path to the Terraform file
            
        Returns:
            List of GatewayRoute objects
        """
        self.current_file = file_path
        self.routes = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse route definitions
            self._parse_route_definitions(content)
            
            logger.info(f"Parsed {file_path}: found {len(self.routes)} routes")
            return self.routes
            
        except Exception as e:
            logger.error(f"Failed to parse {file_path}: {e}")
            return []
    
    def parse_directory(self, directory: str, pattern: str = "**/*.tf") -> List[GatewayRoute]:
        """
        Parse all Terraform files in a directory.
        
        Args:
            directory: Directory path
            pattern: Glob pattern for files
            
        Returns:
            List of all GatewayRoute objects found
        """
        all_routes = []
        path = Path(directory)
        
        for file_path in path.glob(pattern):
            if file_path.is_file():
                routes = self.parse_file(str(file_path))
                all_routes.extend(routes)
        
        logger.info(f"Parsed directory {directory}: found {len(all_routes)} total routes")
        return all_routes
    
    def _parse_route_definitions(self, content: str):
        """
        Parse route definitions from Terraform content.
        
        This handles multiple Terraform patterns:
        1. aws_apigatewayv2_route resources (HTTP API)
        2. aws_api_gateway_method resources (REST API)
        3. Modular API gateway pattern (our custom module)
        4. CORA module api_routes outputs (infrastructure/outputs.tf)
        """
        # Parse HTTP API routes (APIGatewayV2)
        self._parse_apigw_v2_routes(content)
        
        # Parse REST API routes (API Gateway v1)
        self._parse_apigw_v1_routes(content)
        
        # Parse modular API gateway pattern (custom module)
        self._parse_modular_routes(content)
        
        # Parse CORA module api_routes outputs
        self._parse_cora_module_routes(content)
    
    def _parse_apigw_v2_routes(self, content: str):
        """
        Parse APIGatewayV2 route resources.
        
        Example:
            resource "aws_apigatewayv2_route" "kb_list" {
              api_id    = aws_apigatewayv2_api.main.id
              route_key = "GET /organizations/{orgId}/kb"
              target    = "integrations/${aws_apigatewayv2_integration.kb_base.id}"
            }
        """
        # Pattern: resource "aws_apigatewayv2_route" with route_key
        route_pattern = r'resource\s+"aws_apigatewayv2_route"\s+"(\w+)"\s*\{([^}]+)\}'
        
        for match in re.finditer(route_pattern, content, re.DOTALL):
            route_name = match.group(1)
            route_body = match.group(2)
            
            # Extract route_key (e.g., "GET /organizations/{orgId}/kb")
            route_key_match = re.search(r'route_key\s*=\s*"([^"]+)"', route_body)
            if not route_key_match:
                continue
            
            route_key = route_key_match.group(1)
            
            # Parse method and path from route_key
            method, path = self._parse_route_key(route_key)
            
            # Extract Lambda function from target (if present)
            lambda_function = self._extract_lambda_from_target(route_body)
            
            # Extract authorization
            authorization = self._extract_authorization(route_body)
            
            # Extract line number
            line = content[:match.start()].count('\n') + 1
            
            self.routes.append(GatewayRoute(
                file=self.current_file,
                line=line,
                method=method,
                path=path,
                lambda_function=lambda_function,
                authorization=authorization,
                source_code=match.group(0)
            ))
    
    def _parse_apigw_v1_routes(self, content: str):
        """
        Parse API Gateway v1 method resources.
        
        Example:
            resource "aws_api_gateway_method" "kb_get" {
              rest_api_id   = aws_api_gateway_rest_api.main.id
              resource_id   = aws_api_gateway_resource.kb.id
              http_method   = "GET"
              authorization = "CUSTOM"
            }
        """
        # Pattern: resource "aws_api_gateway_method"
        method_pattern = r'resource\s+"aws_api_gateway_method"\s+"(\w+)"\s*\{([^}]+)\}'
        
        for match in re.finditer(method_pattern, content, re.DOTALL):
            method_name = match.group(1)
            method_body = match.group(2)
            
            # Extract HTTP method
            http_method_match = re.search(r'http_method\s*=\s*"([^"]+)"', method_body)
            if not http_method_match:
                continue
            
            method = http_method_match.group(1)
            
            # Try to extract resource path (would need cross-reference with resources)
            # For now, use method name as hint
            path = f"/{method_name}"  # Placeholder - needs more sophisticated parsing
            
            # Extract authorization
            authorization = self._extract_authorization(method_body)
            
            # Extract line number
            line = content[:match.start()].count('\n') + 1
            
            self.routes.append(GatewayRoute(
                file=self.current_file,
                line=line,
                method=method,
                path=path,
                authorization=authorization,
                source_code=match.group(0)
            ))
    
    def _parse_modular_routes(self, content: str):
        """
        Parse modular API gateway pattern (custom module outputs).
        
        Example:
            module "api_gateway" {
              source = "./modules/modular-api-gateway"
              
              routes = {
                "kb_list" = {
                  method      = "GET"
                  path        = "/organizations/{orgId}/kb"
                  lambda_arn  = module.kb_base.lambda_arn
                  authorizer  = "jwt"
                }
              }
            }
        """
        # Pattern: routes = { ... }
        routes_block_pattern = r'routes\s*=\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}'
        
        for match in re.finditer(routes_block_pattern, content, re.DOTALL):
            routes_content = match.group(1)
            
            # Extract individual route definitions
            route_def_pattern = r'"(\w+)"\s*=\s*\{([^}]+)\}'
            
            for route_match in re.finditer(route_def_pattern, routes_content):
                route_name = route_match.group(1)
                route_body = route_match.group(2)
                
                # Extract method
                method_match = re.search(r'method\s*=\s*"([^"]+)"', route_body)
                method = method_match.group(1) if method_match else 'GET'
                
                # Extract path
                path_match = re.search(r'path\s*=\s*"([^"]+)"', route_body)
                path = path_match.group(1) if path_match else f"/{route_name}"
                
                # Extract Lambda ARN reference
                lambda_match = re.search(r'lambda_arn\s*=\s*([^\n]+)', route_body)
                lambda_function = self._extract_lambda_name_from_arn(lambda_match.group(1)) if lambda_match else None
                
                # Extract authorizer
                auth_match = re.search(r'authorizer\s*=\s*"([^"]+)"', route_body)
                authorization = auth_match.group(1).upper() if auth_match else None
                
                # Extract line number
                line = content[:route_match.start()].count('\n') + 1
                
                self.routes.append(GatewayRoute(
                    file=self.current_file,
                    line=line,
                    method=method.upper(),
                    path=path,
                    lambda_function=lambda_function,
                    authorization=authorization,
                    source_code=route_match.group(0)
                ))
    
    def _parse_cora_module_routes(self, content: str):
        """
        Parse CORA module api_routes output blocks.

        Example:
            output "api_routes" {
              value = [
                {
                  method      = "GET"
                  path        = "/providers"
                  integration = aws_lambda_alias.provider.invoke_arn
                  public      = false
                },
                ...
              ]
            }
        
        Also handles concat() pattern:
            output "api_routes" {
              value = concat(
                [...],
                [...]
              )
            }
        """
        # Find output "api_routes" block start
        output_start = re.search(r'output\s+"api_routes"\s*\{', content)
        if not output_start:
            return

        # Find the value = [ or value = concat( position
        value_start_pattern = r'value\s*=\s*\['
        value_start = re.search(value_start_pattern, content[output_start.start():])
        
        # Also check for concat() pattern
        if not value_start:
            concat_pattern = r'value\s*=\s*concat\s*\('
            concat_start = re.search(concat_pattern, content[output_start.start():])
            if concat_start:
                # For concat, we need to find all arrays inside and parse them
                self._parse_concat_routes(content, output_start.start() + concat_start.end())
            return
        
        # Calculate absolute position
        array_start = output_start.start() + value_start.end()
        
        # Now find the matching ] by tracking brace depth
        brace_depth = 0
        bracket_depth = 1  # We just opened one [
        array_end = array_start
        
        for i, char in enumerate(content[array_start:], start=array_start):
            if char == '{':
                brace_depth += 1
            elif char == '}':
                brace_depth -= 1
            elif char == '[':
                bracket_depth += 1
            elif char == ']':
                bracket_depth -= 1
                if bracket_depth == 0 and brace_depth == 0:
                    array_end = i
                    break
        
        if array_end <= array_start:
            logger.warning(f"Could not find closing bracket for api_routes in {self.current_file}")
            return
        
        # Extract the routes content between [ and ]
        routes_content = content[array_start:array_end]
        
        # Extract individual route objects: { method = "GET" path = "/providers" ... }
        # Match complete route objects by tracking brace depth
        route_starts = []
        for match in re.finditer(r'\{', routes_content):
            route_starts.append(match.start())
        
        for start_pos in route_starts:
            # Find matching closing brace
            depth = 1
            end_pos = start_pos + 1
            for i, char in enumerate(routes_content[start_pos + 1:], start=start_pos + 1):
                if char == '{':
                    depth += 1
                elif char == '}':
                    depth -= 1
                    if depth == 0:
                        end_pos = i
                        break
            
            if depth != 0:
                continue  # Couldn't find matching brace
            
            # Extract route body
            route_body = routes_content[start_pos + 1:end_pos]
            
            # Extract method
            method_match = re.search(r'method\s*=\s*"([^"]+)"', route_body)
            if not method_match:
                continue
            method = method_match.group(1).upper()
            
            # Extract path
            path_match = re.search(r'path\s*=\s*"([^"]+)"', route_body)
            if not path_match:
                continue
            path = path_match.group(1)
            
            # Extract integration (Lambda ARN)
            integration_match = re.search(r'integration\s*=\s*([^\n]+)', route_body)
            lambda_function = None
            if integration_match:
                integration = integration_match.group(1).strip()
                # Extract Lambda function name from integration ARN
                # e.g., aws_lambda_function.identities_management.invoke_arn -> identities_management
                lambda_match = re.search(r'(?:aws_lambda_alias|aws_lambda_function)\.(\w+)', integration)
                if lambda_match:
                    lambda_function = lambda_match.group(1)
            
            # Extract public flag (determines if authorization is required)
            public_match = re.search(r'public\s*=\s*(true|false)', route_body)
            authorization = None if (public_match and public_match.group(1) == 'true') else 'JWT'
            
            # Calculate line number (from start of content)
            line = content[:array_start + start_pos].count('\n') + 1
            
            self.routes.append(GatewayRoute(
                file=self.current_file,
                line=line,
                method=method,
                path=path,
                lambda_function=lambda_function,
                authorization=authorization,
                source_code=routes_content[start_pos:end_pos + 1]
            ))
    
    def _parse_concat_routes(self, content: str, start_pos: int):
        """
        Parse routes from a concat() block.
        
        This extracts all arrays inside the concat() and parses route objects from each.
        """
        # Find all arrays in the concat block by tracking parenthesis depth
        paren_depth = 1  # We're already inside the concat(
        i = start_pos
        
        while i < len(content) and paren_depth > 0:
            char = content[i]
            if char == '(':
                paren_depth += 1
            elif char == ')':
                paren_depth -= 1
            elif char == '[' and paren_depth == 1:
                # Found start of an array inside concat
                array_start = i + 1
                bracket_depth = 1
                brace_depth = 0
                
                for j, c in enumerate(content[array_start:], start=array_start):
                    if c == '{':
                        brace_depth += 1
                    elif c == '}':
                        brace_depth -= 1
                    elif c == '[':
                        bracket_depth += 1
                    elif c == ']':
                        bracket_depth -= 1
                        if bracket_depth == 0:
                            # Found matching ]
                            routes_content = content[array_start:j]
                            self._parse_routes_from_array(routes_content, array_start)
                            i = j  # Continue after this array
                            break
            i += 1
    
    def _parse_routes_from_array(self, routes_content: str, base_offset: int):
        """Parse route objects from an array content string."""
        # Find all route objects by tracking braces
        route_starts = []
        for match in re.finditer(r'\{', routes_content):
            route_starts.append(match.start())
        
        for start_pos in route_starts:
            # Find matching closing brace
            depth = 1
            end_pos = start_pos + 1
            for i, char in enumerate(routes_content[start_pos + 1:], start=start_pos + 1):
                if char == '{':
                    depth += 1
                elif char == '}':
                    depth -= 1
                    if depth == 0:
                        end_pos = i
                        break
            
            if depth != 0:
                continue  # Couldn't find matching brace
            
            # Extract route body
            route_body = routes_content[start_pos + 1:end_pos]
            
            # Extract method
            method_match = re.search(r'method\s*=\s*"([^"]+)"', route_body)
            if not method_match:
                continue
            method = method_match.group(1).upper()
            
            # Extract path
            path_match = re.search(r'path\s*=\s*"([^"]+)"', route_body)
            if not path_match:
                continue
            path = path_match.group(1)
            
            # Extract integration (Lambda ARN)
            integration_match = re.search(r'integration\s*=\s*([^\n]+)', route_body)
            lambda_function = None
            if integration_match:
                integration = integration_match.group(1).strip()
                lambda_match = re.search(r'(?:aws_lambda_alias|aws_lambda_function)\.(\\w+)', integration)
                if lambda_match:
                    lambda_function = lambda_match.group(1)
            
            # Extract public flag
            public_match = re.search(r'public\s*=\s*(true|false)', route_body)
            authorization = None if (public_match and public_match.group(1) == 'true') else 'JWT'
            
            # Calculate approximate line number
            line = routes_content[:start_pos].count('\n') + 1
            
            self.routes.append(GatewayRoute(
                file=self.current_file,
                line=line,
                method=method,
                path=path,
                lambda_function=lambda_function,
                authorization=authorization,
                source_code=routes_content[start_pos:end_pos + 1]
            ))
    
    def _parse_route_key(self, route_key: str) -> tuple:
        """
        Parse route_key into method and path.
        
        Example:
            "GET /organizations/{orgId}/kb" -> ('GET', '/organizations/{orgId}/kb')
        """
        parts = route_key.split(' ', 1)
        if len(parts) == 2:
            return parts[0].upper(), parts[1]
        else:
            return 'GET', parts[0]
    
    def _extract_lambda_from_target(self, content: str) -> Optional[str]:
        """Extract Lambda function name from target integration reference."""
        # Pattern: module.kb_base.lambda_arn or aws_lambda_function.handler.arn
        lambda_pattern = r'(?:module\.(\w+)|aws_lambda_function\.(\w+))'
        match = re.search(lambda_pattern, content)
        if match:
            return match.group(1) or match.group(2)
        return None
    
    def _extract_lambda_name_from_arn(self, arn_ref: str) -> Optional[str]:
        """Extract Lambda function name from ARN reference."""
        # Pattern: module.kb_base.lambda_arn
        module_pattern = r'module\.(\w+)'
        match = re.search(module_pattern, arn_ref)
        if match:
            return match.group(1)
        return None
    
    def _extract_authorization(self, content: str) -> Optional[str]:
        """Extract authorization type from Terraform block."""
        auth_match = re.search(r'authorization\s*=\s*"([^"]+)"', content)
        if auth_match:
            return auth_match.group(1).upper()
        
        # Check for authorizer reference
        authorizer_match = re.search(r'authorizer\s*=\s*"([^"]+)"', content)
        if authorizer_match:
            return authorizer_match.group(1).upper()
        
        return None
    
    def get_unique_routes(self) -> Set[str]:
        """Get set of all unique routes (method + path)."""
        return {f"{route.method} {route.path}" for route in self.routes}
    
    def get_routes_by_method(self, method: str) -> List[GatewayRoute]:
        """Get all routes for a specific HTTP method."""
        return [route for route in self.routes if route.method == method.upper()]
    
    def get_routes_by_path(self, path: str) -> List[GatewayRoute]:
        """Get all routes for a specific path."""
        return [route for route in self.routes if route.path == path]
    
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
                    'method': route.method,
                    'path': route.path,
                    'lambda_function': route.lambda_function,
                    'authorization': route.authorization,
                    'cors_enabled': route.cors_enabled
                }
                for route in self.routes
            ]
        }
