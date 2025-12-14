"""
API Full Stack Validator

Validates API contracts across all layers: Frontend → API Gateway → Lambda
Detects route mismatches, parameter issues, and response format errors.
"""

import logging
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field
from pathlib import Path

from frontend_parser import FrontendParser, APICall
from gateway_parser import GatewayParser, GatewayRoute
from lambda_parser import LambdaParser, LambdaRoute
from reporter import APIMismatch, ValidationReport

logger = logging.getLogger(__name__)


class FullStackValidator:
    """Validates API contracts across frontend, gateway, and Lambda layers."""
    
    def __init__(
        self,
        frontend_parser: FrontendParser,
        gateway_parser: GatewayParser,
        lambda_parser: LambdaParser,
        aws_profile: Optional[str] = None,
        api_id: Optional[str] = None,
        aws_region: str = 'us-east-1',
        prefer_terraform: bool = False
    ):
        """Initialize validator with parsers and optional AWS configuration."""
        self.frontend_parser = frontend_parser
        self.gateway_parser = gateway_parser
        self.lambda_parser = lambda_parser
        self.mismatches: List[APIMismatch] = []
        
        # AWS configuration for direct API Gateway querying
        self.aws_profile = aws_profile
        self.api_id = api_id
        self.aws_region = aws_region
        self.prefer_terraform = prefer_terraform
    
    def validate(self, project_path: str) -> ValidationReport:
        """
        Validate API contracts across all layers.
        
        Args:
            project_path: Path to project root
            
        Returns:
            ValidationReport with all mismatches
        """
        logger.info(f"Starting full stack API validation for: {project_path}")
        
        # Parse all three layers
        self._parse_all_layers(project_path)
        
        # Perform cross-layer validation
        self._match_frontend_to_gateway()
        self._match_gateway_to_lambda()
        self._validate_parameters()
        self._validate_orphaned_routes()
        
        # Generate report
        report = self._generate_report()
        
        logger.info(f"Validation complete: {report.status} with {len(self.mismatches)} mismatches")
        return report
    
    def _parse_all_layers(self, project_path: str):
        """Parse frontend, gateway, and Lambda layers."""
        project = Path(project_path)
        
        # Parse frontend (packages directory)
        logger.info("Parsing frontend API calls...")
        frontend_path = project / 'packages'
        if frontend_path.exists():
            self.frontend_parser.parse_directory(str(frontend_path))
        
        # Filter out _module-template files from frontend calls
        self.frontend_parser.api_calls = [
            call for call in self.frontend_parser.api_calls
            if '_module-template' not in call.file
        ]
        logger.info(f"Found {len(self.frontend_parser.api_calls)} frontend API calls (excluding templates)")
        
        # Parse API Gateway routes - try AWS first, fallback to Terraform
        logger.info("Parsing API Gateway routes...")
        
        # Try AWS API Gateway querying first (if configured and not prefer_terraform)
        aws_routes_loaded = False
        if self.api_id and not self.prefer_terraform:
            try:
                from aws_gateway_querier import AWSGatewayQuerier
                logger.info(f"Attempting AWS API Gateway query (API ID: {self.api_id}, Profile: {self.aws_profile or 'default'})")
                
                querier = AWSGatewayQuerier(self.aws_profile, self.aws_region)
                aws_routes = querier.get_routes(self.api_id)
                
                if aws_routes:
                    self.gateway_parser.routes = aws_routes
                    aws_routes_loaded = True
                    logger.info(f"✅ Successfully loaded {len(aws_routes)} routes from AWS API Gateway")
                else:
                    logger.warning("⚠️ AWS query returned 0 routes, falling back to Terraform parsing")
                    
            except ImportError as e:
                logger.warning(f"⚠️ AWS querying not available (boto3 not installed): {e}")
                logger.info("Falling back to Terraform parsing...")
            except Exception as e:
                logger.warning(f"⚠️ AWS query failed: {e}")
                logger.info("Falling back to Terraform parsing...")
        
        # Fallback to Terraform parsing (if AWS query wasn't successful or prefer_terraform)
        if not aws_routes_loaded:
            if self.prefer_terraform:
                logger.info("Using Terraform parsing (--prefer-terraform flag set)")
            else:
                logger.info("Using Terraform parsing (AWS credentials not configured)")
            
            # Parse from CORA module infrastructure outputs
            all_gateway_routes = []
            for module_path in (project / 'packages').glob('*-module/infrastructure/outputs.tf'):
                # Skip _module-template
                if '_module-template' in str(module_path):
                    logger.info(f"Skipping template module: {module_path}")
                    continue
                if module_path.is_file():
                    logger.info(f"Parsing routes from {module_path}")
                    routes = self.gateway_parser.parse_file(str(module_path))
                    all_gateway_routes.extend(routes)
            
            # Update gateway_parser.routes with accumulated routes
            self.gateway_parser.routes = all_gateway_routes
            logger.info(f"Found {len(self.gateway_parser.routes)} API Gateway routes from Terraform (excluding templates)")
        
        # Parse Lambda handlers
        logger.info("Parsing Lambda handlers...")
        lambda_path = project / 'packages'
        if lambda_path.exists():
            self.lambda_parser.parse_directory(str(lambda_path))
        
        # Filter out _module-template files from Lambda routes
        self.lambda_parser.routes = [
            route for route in self.lambda_parser.routes
            if '_module-template' not in route.file
        ]
        logger.info(f"Found {len(self.lambda_parser.routes)} Lambda route handlers (excluding templates)")
        
        # Enhance Lambda path inference using Gateway route definitions
        self._enhance_lambda_path_inference(project)
    
    def _enhance_lambda_path_inference(self, project: Path):
        """
        Enhance Lambda path inference by using Gateway route definitions.
        
        When a Lambda handler uses dynamic routing (path = event['rawPath']),
        the Lambda parser detects it as path '/'. This method infers the actual
        paths from Gateway route definitions.
        
        Strategy:
        1. Group Gateway routes by Lambda function
        2. For each Lambda route with path '/', check if there's a Gateway route
           pointing to the same Lambda function with the same method
        3. If found, create a new Lambda route with the inferred path
        """
        logger.info("Enhancing Lambda path inference from Gateway routes...")
        
        # Build mapping: lambda_function -> list of gateway routes
        lambda_to_gateway = {}
        for gateway_route in self.gateway_parser.routes:
            if gateway_route.lambda_function:
                func_name = gateway_route.lambda_function
                if func_name not in lambda_to_gateway:
                    lambda_to_gateway[func_name] = []
                lambda_to_gateway[func_name].append(gateway_route)
        
        # Find Lambda routes that need inference (path = '/')
        generic_routes = [r for r in self.lambda_parser.routes if r.path == '/']
        
        # Create new inferred routes
        inferred_routes = []
        for lambda_route in generic_routes:
            # Try to match Lambda file to function name
            # e.g., packages/org-module/backend/lambdas/orgs/lambda_function.py -> orgs
            lambda_func_name = self._extract_lambda_function_name(lambda_route.file, project)
            
            if lambda_func_name and lambda_func_name in lambda_to_gateway:
                # Find matching Gateway routes (same method)
                gateway_matches = [
                    gr for gr in lambda_to_gateway[lambda_func_name]
                    if gr.method == lambda_route.method
                ]
                
                for gateway_route in gateway_matches:
                    # Create inferred route with Gateway path
                    inferred_route = LambdaRoute(
                        file=lambda_route.file,
                        line=lambda_route.line,
                        handler_function=lambda_route.handler_function,
                        method=lambda_route.method,
                        path=gateway_route.path,  # Use Gateway path
                        path_params=lambda_route.path_params,
                        query_params=lambda_route.query_params,
                        request_body_keys=lambda_route.request_body_keys,
                        response_status=lambda_route.response_status,
                        response_type=lambda_route.response_type,
                        source_code=lambda_route.source_code
                    )
                    inferred_routes.append(inferred_route)
        
        # Add inferred routes to Lambda parser
        original_count = len(self.lambda_parser.routes)
        self.lambda_parser.routes.extend(inferred_routes)
        
        logger.info(f"Inferred {len(inferred_routes)} Lambda routes from Gateway definitions")
        logger.info(f"Total Lambda routes: {len(self.lambda_parser.routes)} (was {original_count})")
    
    def _extract_lambda_function_name(self, lambda_file: str, project: Path) -> Optional[str]:
        """
        Extract Lambda function name from file path.
        
        Examples:
            packages/org-module/backend/lambdas/orgs/lambda_function.py -> orgs
            packages/kb-module/backend/lambdas/kb-base/lambda_function.py -> kb_base
            packages/ai-config-module/backend/lambdas/ai-config-handler/lambda_function.py -> ai_config_handler
        """
        # Convert to Path for easier manipulation
        file_path = Path(lambda_file)
        
        # Find the parent directory of lambda_function.py
        # This is typically the Lambda function name
        if file_path.name == 'lambda_function.py':
            func_dir = file_path.parent.name
            # Convert hyphens to underscores to match Terraform naming
            return func_dir.replace('-', '_')
        
        return None
    
    def _match_frontend_to_gateway(self):
        """
        Match frontend API calls to API Gateway routes.
        
        Detects:
        - Frontend calls to non-existent routes (404 errors)
        - HTTP method mismatches
        """
        logger.info("Matching frontend → API Gateway...")
        
        # Build index of gateway routes for fast lookup
        gateway_routes_index = self._build_gateway_routes_index()
        
        for call in self.frontend_parser.api_calls:
            # Normalize endpoint for comparison
            normalized_endpoint = self.frontend_parser.normalize_endpoint(call.endpoint)
            route_key = f"{call.method} {normalized_endpoint}"
            
            # Check if route exists in gateway
            if route_key not in gateway_routes_index:
                # Route not found - check if it's a method mismatch
                path_matches = self._find_gateway_routes_by_path(normalized_endpoint)
                
                if path_matches:
                    # Path exists but method is wrong
                    available_methods = [r.method for r in path_matches]
                    self.mismatches.append(APIMismatch(
                        severity='error',
                        mismatch_type='method_mismatch',
                        frontend_file=call.file,
                        frontend_line=call.line,
                        endpoint=normalized_endpoint,
                        method=call.method,
                        issue=f"Frontend calls {call.method} but API Gateway only supports: {', '.join(available_methods)}",
                        suggestion=f"Change frontend to use {available_methods[0]} or add {call.method} route to API Gateway"
                    ))
                else:
                    # Route completely missing
                    self.mismatches.append(APIMismatch(
                        severity='error',
                        mismatch_type='route_not_found',
                        frontend_file=call.file,
                        frontend_line=call.line,
                        endpoint=normalized_endpoint,
                        method=call.method,
                        issue=f"Frontend calls {call.method} {normalized_endpoint} but route doesn't exist in API Gateway",
                        suggestion="Add route to API Gateway or fix frontend endpoint"
                    ))
    
    def _match_gateway_to_lambda(self):
        """
        Match API Gateway routes to Lambda handlers.
        
        Detects:
        - Gateway routes without Lambda handlers
        - Lambda handler configuration issues
        """
        logger.info("Matching API Gateway → Lambda...")
        
        # Build index of Lambda routes for fast lookup
        lambda_routes_index = self._build_lambda_routes_index()
        
        for route in self.gateway_parser.routes:
            route_key = f"{route.method} {route.path}"
            
            # Check if Lambda handler exists for this route
            if route_key not in lambda_routes_index:
                # Check if path exists with different method
                path_matches = self._find_lambda_routes_by_path(route.path)
                
                if path_matches:
                    # Path exists but method not handled
                    available_methods = [r.method for r in path_matches]
                    self.mismatches.append(APIMismatch(
                        severity='error',
                        mismatch_type='missing_lambda_handler',
                        gateway_file=route.file,
                        endpoint=route.path,
                        method=route.method,
                        issue=f"API Gateway defines {route.method} {route.path} but Lambda only handles: {', '.join(available_methods)}",
                        suggestion=f"Add {route.method} handler to Lambda or remove route from API Gateway"
                    ))
                else:
                    # No handler found at all
                    self.mismatches.append(APIMismatch(
                        severity='error',
                        mismatch_type='missing_lambda_handler',
                        gateway_file=route.file,
                        endpoint=route.path,
                        method=route.method,
                        issue=f"API Gateway defines {route.method} {route.path} but no Lambda handler found",
                        suggestion=f"Implement Lambda handler for this route (Lambda function: {route.lambda_function or 'unknown'})"
                    ))
    
    def _validate_parameters(self):
        """
        Validate parameters across frontend and Lambda layers.
        
        Detects:
        - Path parameter mismatches
        - Query parameter mismatches
        """
        logger.info("Validating parameters across layers...")
        
        # Build Lambda routes index
        lambda_routes_index = self._build_lambda_routes_index()
        
        for call in self.frontend_parser.api_calls:
            normalized_endpoint = self.frontend_parser.normalize_endpoint(call.endpoint)
            route_key = f"{call.method} {normalized_endpoint}"
            
            # Find corresponding Lambda route
            lambda_routes = lambda_routes_index.get(route_key, [])
            
            if lambda_routes:
                lambda_route = lambda_routes[0]  # Take first match
                
                # Validate path parameters
                frontend_params = set(call.path_params)
                lambda_params = set(lambda_route.path_params)
                
                # Check for parameter mismatches
                missing_in_lambda = frontend_params - lambda_params
                extra_in_lambda = lambda_params - frontend_params
                
                if missing_in_lambda:
                    self.mismatches.append(APIMismatch(
                        severity='warning',
                        mismatch_type='parameter_mismatch',
                        frontend_file=call.file,
                        frontend_line=call.line,
                        lambda_file=lambda_route.file,
                        lambda_line=lambda_route.line,
                        endpoint=normalized_endpoint,
                        method=call.method,
                        issue=f"Frontend sends path parameters {missing_in_lambda} but Lambda doesn't use them",
                        suggestion="Verify parameter usage is consistent"
                    ))
                
                if extra_in_lambda:
                    self.mismatches.append(APIMismatch(
                        severity='warning',
                        mismatch_type='parameter_mismatch',
                        frontend_file=call.file,
                        frontend_line=call.line,
                        lambda_file=lambda_route.file,
                        lambda_line=lambda_route.line,
                        endpoint=normalized_endpoint,
                        method=call.method,
                        issue=f"Lambda expects path parameters {extra_in_lambda} but frontend doesn't send them",
                        suggestion="Verify parameter usage is consistent"
                    ))
    
    def _validate_orphaned_routes(self):
        """
        Detect orphaned routes (Lambda handlers with no frontend calls).
        
        These might indicate:
        - Dead code
        - Missing frontend implementation
        - Internal-only endpoints
        """
        logger.info("Checking for orphaned routes...")
        
        # Build index of frontend endpoints
        frontend_endpoints = set()
        for call in self.frontend_parser.api_calls:
            normalized = self.frontend_parser.normalize_endpoint(call.endpoint)
            frontend_endpoints.add(f"{call.method} {normalized}")
        
        # Check Lambda routes
        for route in self.lambda_parser.routes:
            normalized = self.lambda_parser.normalize_path(route.path)
            route_key = f"{route.method} {normalized}"
            
            if route_key not in frontend_endpoints:
                # This Lambda route has no frontend calls
                # Mark as warning (might be intentional, e.g., webhooks)
                self.mismatches.append(APIMismatch(
                    severity='warning',
                    mismatch_type='orphaned_route',
                    lambda_file=route.file,
                    lambda_line=route.line,
                    endpoint=normalized,
                    method=route.method,
                    issue=f"Lambda handler for {route.method} {normalized} exists but no frontend calls found",
                    suggestion="This might be intentional (webhooks, internal APIs) or dead code to remove"
                ))
    
    def _build_gateway_routes_index(self) -> Dict[str, List[GatewayRoute]]:
        """Build index of gateway routes by method + path."""
        index = {}
        for route in self.gateway_parser.routes:
            key = f"{route.method} {route.path}"
            if key not in index:
                index[key] = []
            index[key].append(route)
        return index
    
    def _build_lambda_routes_index(self) -> Dict[str, List[LambdaRoute]]:
        """Build index of Lambda routes by method + path."""
        index = {}
        for route in self.lambda_parser.routes:
            normalized_path = self.lambda_parser.normalize_path(route.path)
            key = f"{route.method} {normalized_path}"
            if key not in index:
                index[key] = []
            index[key].append(route)
        return index
    
    def _find_gateway_routes_by_path(self, path: str) -> List[GatewayRoute]:
        """Find all gateway routes for a specific path (any method)."""
        return [r for r in self.gateway_parser.routes if r.path == path]
    
    def _find_lambda_routes_by_path(self, path: str) -> List[LambdaRoute]:
        """Find all Lambda routes for a specific path (any method)."""
        normalized_path = self.lambda_parser.normalize_path(path)
        return [
            r for r in self.lambda_parser.routes 
            if self.lambda_parser.normalize_path(r.path) == normalized_path
        ]
    
    def _generate_report(self) -> ValidationReport:
        """Generate validation report."""
        # Count errors vs warnings
        errors = [m for m in self.mismatches if m.severity == 'error']
        warnings = [m for m in self.mismatches if m.severity == 'warning']
        
        # Determine status
        status = 'failed' if errors else 'passed'
        
        # Build summary
        summary = {
            'frontend_calls': len(self.frontend_parser.api_calls),
            'gateway_routes': len(self.gateway_parser.routes),
            'lambda_handlers': len(self.lambda_parser.routes),
            'mismatches': len(self.mismatches),
            'errors': len(errors),
            'warnings': len(warnings),
            'frontend_unique_endpoints': len(self.frontend_parser.get_unique_endpoints()),
            'gateway_unique_routes': len(self.gateway_parser.get_unique_routes()),
            'lambda_unique_routes': len(self.lambda_parser.get_unique_routes())
        }
        
        return ValidationReport(
            status=status,
            mismatches=self.mismatches,
            summary=summary
        )
