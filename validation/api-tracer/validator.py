"""
API Full Stack Validator

Validates API contracts across all layers: Frontend → API Gateway → Lambda
Detects route mismatches, parameter issues, response format errors, and auth patterns.

Auth Lifecycle Validation (ADR-019):
- Frontend: useUser(), useRole(), useOrganizationContext(), loading states
- Lambda: check_*_admin() helpers, external UID conversion, centralized router auth
"""

import re
import logging
import yaml
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field
from pathlib import Path

from frontend_parser import FrontendParser, APICall
from gateway_parser import GatewayParser, GatewayRoute
from lambda_parser import LambdaParser, LambdaRoute
from reporter import APIMismatch, ValidationReport
from auth_validator import AuthLifecycleValidator, AuthIssue
from code_quality_validator import CodeQualityValidator, CodeQualityIssue
from db_function_validator import DBFunctionValidator, DBFunctionIssue
from component_parser import ComponentParser, ComponentRoute

logger = logging.getLogger(__name__)


class FullStackValidator:
    """Validates API contracts across frontend, gateway, and Lambda layers."""
    
    # Default route exclusion patterns (routes that don't need frontend calls)
    DEFAULT_EXCLUSION_PATTERNS = [
        r'^/internal/',      # Internal APIs (service-to-service communication)
        r'^/webhooks/',      # Webhook endpoints (called by external services)
        r'^/health$',        # Health check endpoints
        r'^/metrics$',       # Metrics/monitoring endpoints
    ]
    
    @staticmethod
    def _load_config(config_path: Optional[Path] = None) -> Dict[str, Any]:
        """
        Load configuration from YAML file.
        
        Args:
            config_path: Path to config file (defaults to config.yaml in same directory)
            
        Returns:
            Configuration dictionary
        """
        if config_path is None:
            config_path = Path(__file__).parent / 'config.yaml'
        
        try:
            if config_path.exists():
                with open(config_path, 'r') as f:
                    config = yaml.safe_load(f)
                    logger.info(f"Loaded configuration from {config_path}")
                    return config or {}
            else:
                logger.warning(f"Config file not found: {config_path}, using defaults")
                return {}
        except Exception as e:
            logger.warning(f"Failed to load config: {e}, using defaults")
            return {}
    
    @staticmethod
    def _get_route_exclusions_from_config(config: Dict[str, Any]) -> List[str]:
        """
        Extract enabled route exclusion patterns from config.
        
        Args:
            config: Configuration dictionary
            
        Returns:
            List of regex pattern strings
        """
        patterns = []
        route_exclusions = config.get('route_exclusions', [])
        
        for exclusion in route_exclusions:
            if exclusion.get('enabled', True):  # Default to enabled if not specified
                patterns.append(exclusion['pattern'])
                logger.debug(f"Route exclusion enabled: {exclusion['pattern']} - {exclusion.get('reason', 'N/A')}")
        
        return patterns
    
    def __init__(
        self,
        frontend_parser: FrontendParser,
        gateway_parser: GatewayParser,
        lambda_parser: LambdaParser,
        aws_profile: Optional[str] = None,
        api_id: Optional[str] = None,
        aws_region: str = 'us-east-1',
        prefer_terraform: bool = False,
        validate_auth: bool = True,
        validate_layer1: bool = True,
        validate_layer2: bool = False,
        module_filter: Optional[str] = None,
        route_exclusion_patterns: Optional[List[str]] = None
    ):
        """Initialize validator with parsers and optional AWS configuration."""
        self.frontend_parser = frontend_parser
        self.gateway_parser = gateway_parser
        self.lambda_parser = lambda_parser
        self.mismatches: List[APIMismatch] = []
        self.auth_issues: List[AuthIssue] = []
        
        # AWS configuration for direct API Gateway querying
        self.aws_profile = aws_profile
        self.api_id = api_id
        self.aws_region = aws_region
        self.prefer_terraform = prefer_terraform
        
        # Auth lifecycle validation (ADR-019)
        self.validate_auth = validate_auth
        self.validate_layer1 = validate_layer1  # Layer 1: Admin auth (ADR-019a/b)
        self.validate_layer2 = validate_layer2  # Layer 2: Resource permissions (ADR-019c)
        self.auth_validator = AuthLifecycleValidator() if validate_auth else None
        
        # Code quality validation (integrated checks)
        self.code_quality_validator = CodeQualityValidator()
        self.code_quality_issues: List[CodeQualityIssue] = []
        
        # DB function validation (ADR-020)
        self.validate_db_functions = True  # Default: enabled
        self.db_function_validator = DBFunctionValidator()
        self.db_function_issues: List[DBFunctionIssue] = []
        
        # Component route metadata parser (admin components with @routes docstrings)
        self.component_parser = ComponentParser()
        self.component_routes_index: Dict[str, List[ComponentRoute]] = {}
        
        # Module filter for efficient per-module validation (e.g., 'module-kb')
        self.module_filter = module_filter
        
        # Load configuration file
        self.config = self._load_config()
        
        # Route exclusion patterns (routes that don't need frontend calls)
        # Priority: CLI args > config file > defaults
        if route_exclusion_patterns:
            self.route_exclusion_patterns = route_exclusion_patterns
            logger.info(f"Using {len(route_exclusion_patterns)} CLI-provided route exclusion patterns")
        else:
            config_patterns = self._get_route_exclusions_from_config(self.config)
            self.route_exclusion_patterns = config_patterns if config_patterns else self.DEFAULT_EXCLUSION_PATTERNS
            logger.info(f"Using {len(self.route_exclusion_patterns)} route exclusion patterns from {'config file' if config_patterns else 'defaults'}")
        
        self.compiled_patterns = [re.compile(pattern) for pattern in self.route_exclusion_patterns]
    
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
        self._validate_path_parameter_naming()
        self._validate_lambda_path_param_extraction()
        
        # Auth lifecycle validation (ADR-019)
        if self.validate_auth:
            self._validate_auth_lifecycle(project_path, self.validate_layer2)
        
        # Code quality validation (integrated checks)
        self._validate_code_quality(project_path)
        
        # DB function validation (ADR-020)
        if self.validate_db_functions:
            self._validate_db_functions(project_path)
        
        # Generate report
        report = self._generate_report()
        
        logger.info(f"Validation complete: {report.status} with {len(self.mismatches)} mismatches")
        return report
    
    def _parse_all_layers(self, project_path: str):
        """Parse frontend, gateway, and Lambda layers."""
        project = Path(project_path)
        
        # Parse frontend (packages directory or specific module)
        logger.info("Parsing frontend API calls...")
        frontend_paths = []
        if self.module_filter:
            frontend_paths.append(project / 'packages' / self.module_filter)
            # Note: Module-specific frontend code might also be in apps/web but hard to filter
        else:
            frontend_paths.append(project / 'packages')
            frontend_paths.append(project / 'apps' / 'web')
            
        for path in frontend_paths:
            if path.exists():
                logger.info(f"Parsing frontend files in: {path}")
                self.frontend_parser.parse_directory(str(path))
        
        # Filter out _module-template files from frontend calls
        self.frontend_parser.api_calls = [
            call for call in self.frontend_parser.api_calls
            if '_module-template' not in call.file
        ]
        module_info = f" (filtered to {self.module_filter})" if self.module_filter else ""
        logger.info(f"Found {len(self.frontend_parser.api_calls)} frontend API calls{module_info} (excluding templates)")
        
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
            # CORA modules are named module-* (e.g., module-ws, module-ai, module-mgmt)
            all_gateway_routes = []
            
            # Use module filter if specified
            if self.module_filter:
                glob_pattern = f'{self.module_filter}/infrastructure/outputs.tf'
            else:
                glob_pattern = 'module-*/infrastructure/outputs.tf'
            
            for module_path in (project / 'packages').glob(glob_pattern):
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
            module_info = f" (filtered to {self.module_filter})" if self.module_filter else ""
            logger.info(f"Found {len(self.gateway_parser.routes)} API Gateway routes from Terraform{module_info} (excluding templates)")
        
        # Parse Lambda handlers (specific module or all)
        logger.info("Parsing Lambda handlers...")
        if self.module_filter:
            lambda_path = project / 'packages' / self.module_filter
        else:
            lambda_path = project / 'packages'
        if lambda_path.exists():
            self.lambda_parser.parse_directory(str(lambda_path))
        
        # Filter out _module-template files from Lambda routes
        self.lambda_parser.routes = [
            route for route in self.lambda_parser.routes
            if '_module-template' not in route.file
        ]
        module_info = f" (filtered to {self.module_filter})" if self.module_filter else ""
        logger.info(f"Found {len(self.lambda_parser.routes)} Lambda route handlers{module_info} (excluding templates)")
        
        # Enhance Lambda path inference using Gateway route definitions
        self._enhance_lambda_path_inference(project)
        
        # Parse admin component route metadata (@routes docstrings)
        logger.info("Parsing admin component route metadata...")
        component_routes = []
        for path in frontend_paths:
            if path.exists():
                logger.info(f"Parsing admin components in: {path}")
                routes = self.component_parser.parse_directory(str(path))
                component_routes.extend(routes)
        
        # Build index for fast lookup
        self.component_routes_index = self.component_parser.get_component_routes_index()
        logger.info(f"Found {len(component_routes)} routes documented in {len(self.component_parser.components_with_metadata)} admin components")
        
        # Update auth validator with known components for delegation verification
        if self.auth_validator:
            component_names = self.component_parser.components_with_metadata  # Already a set
            self.auth_validator.frontend_validator.known_components = component_names
            logger.debug(f"Updated auth validator with {len(component_names)} known components: {component_names}")
    
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
        
        Note: Lambdas using dynamic routing MUST document their routes in a docstring
        following the CORA Lambda Route Docstring Standard. See:
        docs/standards/standard_LAMBDA-ROUTE-DOCSTRING.md
        """
        logger.info("Matching API Gateway → Lambda...")
        
        # Build index of Lambda routes for fast lookup
        lambda_routes_index = self._build_lambda_routes_index()
        
        for route in self.gateway_parser.routes:
            # Normalize Gateway route path to match Lambda index format
            # This allows matching routes with different param names:
            # Gateway: /ws/{workspaceId}/members  ->  Lambda: /ws/{id}/members
            normalized_path = self.lambda_parser.normalize_path(route.path)
            route_key = f"{route.method} {normalized_path}"
            
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
                        suggestion=f"Add {route.method} handler to Lambda or add route to Lambda docstring (see CORA Lambda Route Docstring Standard)"
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
                        suggestion=f"Add route to Lambda docstring for function '{route.lambda_function or 'unknown'}' (see CORA Lambda Route Docstring Standard)"
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
        
        Excludes routes matching exclusion patterns (webhooks, internal APIs, etc.)
        Also excludes routes documented in admin component @routes metadata.
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
                # Check if route matches any exclusion pattern
                excluded = False
                for pattern in self.compiled_patterns:
                    if pattern.match(normalized):
                        excluded = True
                        logger.debug(f"Excluding route {normalized} (matches pattern {pattern.pattern})")
                        break
                
                # Check if route is documented in admin component @routes metadata
                if not excluded and route_key in self.component_routes_index:
                    excluded = True
                    component_routes = self.component_routes_index[route_key]
                    component_names = [cr.component_name for cr in component_routes]
                    logger.debug(f"Route {route_key} documented in component(s): {', '.join(component_names)}")
                
                if not excluded:
                    # This Lambda route has no frontend calls and is not excluded
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
    
    def _validate_path_parameter_naming(self):
        """
        Validate path parameters use descriptive names per CORA standard.
        
        Flags routes using generic {id} instead of resource-specific names:
        - {orgId}, {workspaceId}, {providerId}, {modelId}, {memberId}, etc.
        
        Reference: docs/standards/standard_API-PATTERNS.md Part 3
        """
        logger.info("Validating path parameter naming conventions...")
        
        # Regex to extract path parameters
        param_pattern = re.compile(r'\{([^}]+)\}')
        
        for route in self.gateway_parser.routes:
            params = param_pattern.findall(route.path)
            for param in params:
                if param == 'id':
                    # Suggest descriptive name based on path context
                    suggestion = self._suggest_param_name(route.path)
                    self.mismatches.append(APIMismatch(
                        severity='error',
                        mismatch_type='path_parameter_naming',
                        gateway_file=route.file,
                        endpoint=route.path,
                        method=route.method,
                        issue=f"Generic {{id}} used in path: {route.path}",
                        suggestion=f"Use {{{suggestion}}} instead of {{id}} (see docs/standards/standard_API-PATTERNS.md)"
                    ))
    
    def _suggest_param_name(self, path: str) -> str:
        """
        Suggest a descriptive parameter name based on path context.
        
        Examples:
            /orgs/{id} -> orgId
            /ws/{id} -> workspaceId
            /providers/{id} -> providerId
            /models/{id} -> modelId
            /users/{id} -> userId
        """
        # Common path patterns and their suggested parameter names
        patterns = [
            (r'/orgs/{id}', 'orgId'),
            (r'/organizations/{id}', 'orgId'),
            (r'/ws/{id}', 'workspaceId'),
            (r'/workspaces/{id}', 'workspaceId'),
            (r'/providers/{id}', 'providerId'),
            (r'/models/{id}', 'modelId'),
            (r'/users/{id}', 'userId'),
            (r'/members/{id}', 'memberId'),
            (r'/projects/{id}', 'projectId'),
            (r'/kb/{id}', 'kbId'),
            (r'/knowledge-bases/{id}', 'kbId'),
        ]
        
        # Check each pattern
        for pattern, suggestion in patterns:
            if pattern in path:
                return suggestion
        
        # Fallback: Try to extract resource name from path
        # e.g., /resources/{id} -> resourceId
        match = re.search(r'/([a-z-]+)/{id}', path)
        if match:
            resource = match.group(1).replace('-', '_')
            # Convert plural to singular (simple heuristic)
            if resource.endswith('s') and not resource.endswith('ss'):
                resource = resource[:-1]
            return f"{resource}Id"
        
        # Ultimate fallback
        return 'resourceId'
    
    def _validate_lambda_path_param_extraction(self):
        """
        Validate that Lambda code extracts path parameters matching Gateway route definitions.
        
        This catches bugs where:
        - Lambda uses path_params.get('id') but route has {workspaceId}
        - Lambda uses path_params.get('orgId') but route has {userId}
        
        This validation closes the gap between what the route defines and what the code extracts.
        """
        logger.info("Validating Lambda path parameter extraction...")
        
        # Build a mapping: Lambda file -> list of Gateway routes pointing to it
        lambda_file_to_routes = {}
        
        for gateway_route in self.gateway_parser.routes:
            # Find Lambda routes from the same file
            matching_lambdas = [
                lr for lr in self.lambda_parser.routes
                if self._routes_match(gateway_route, lr)
            ]
            
            for lambda_route in matching_lambdas:
                if lambda_route.file not in lambda_file_to_routes:
                    lambda_file_to_routes[lambda_route.file] = []
                lambda_file_to_routes[lambda_route.file].append(gateway_route)
        
        # Check each Lambda file
        for lambda_file, gateway_routes in lambda_file_to_routes.items():
            # Get all Lambda routes from this file
            file_lambda_routes = [lr for lr in self.lambda_parser.routes if lr.file == lambda_file]
            
            if not file_lambda_routes:
                continue
            
            # Get extracted params (all routes in same file have same extracted params)
            extracted_params = set(file_lambda_routes[0].extracted_path_params)
            
            if not extracted_params:
                # No path param extractions found - skip validation for this file
                continue
            
            # Get all unique params from Gateway routes
            gateway_params = set()
            for gr in gateway_routes:
                # Extract params from Gateway route path
                param_pattern = re.compile(r'\{([^}]+)\}')
                params = param_pattern.findall(gr.path)
                gateway_params.update(params)
            
            # Check for mismatches
            for extracted in extracted_params:
                if extracted not in gateway_params:
                    # Lambda extracts a param that doesn't exist in any Gateway route
                    # Find which Gateway routes this Lambda handles
                    gateway_paths = [gr.path for gr in gateway_routes]
                    
                    # Suggest correct param based on Gateway routes
                    if gateway_params:
                        suggestion = f"Use {gateway_params} instead (from Gateway routes: {', '.join(gateway_paths)})"
                    else:
                        suggestion = f"No path parameters defined in Gateway routes: {', '.join(gateway_paths)}"
                    
                    self.mismatches.append(APIMismatch(
                        severity='error',
                        mismatch_type='lambda_path_param_extraction',
                        lambda_file=lambda_file,
                        lambda_line=1,  # Can't pinpoint exact line from extraction
                        issue=f"Lambda extracts path parameter '{extracted}' but it's not defined in any Gateway route",
                        suggestion=suggestion
                    ))
            
            # Check for params in Gateway that Lambda never extracts
            for gateway_param in gateway_params:
                if gateway_param not in extracted_params:
                    # Gateway defines a param but Lambda never extracts it
                    gateway_paths = [gr.path for gr in gateway_routes if f'{{{gateway_param}}}' in gr.path]
                    
                    self.mismatches.append(APIMismatch(
                        severity='warning',
                        mismatch_type='lambda_path_param_extraction',
                        lambda_file=lambda_file,
                        lambda_line=1,
                        issue=f"Gateway route defines path parameter '{gateway_param}' but Lambda never extracts it",
                        suggestion=f"Add path_params.get('{gateway_param}') to Lambda code (routes: {', '.join(gateway_paths)})"
                    ))
    
    def _routes_match(self, gateway_route: 'GatewayRoute', lambda_route: 'LambdaRoute') -> bool:
        """Check if a Gateway route matches a Lambda route."""
        # Normalize both paths for comparison
        normalized_gateway = self.lambda_parser.normalize_path(gateway_route.path)
        normalized_lambda = self.lambda_parser.normalize_path(lambda_route.path)
        
        # Methods must match
        if gateway_route.method != lambda_route.method:
            return False
        
        # Paths must match (normalized)
        return normalized_gateway == normalized_lambda
    
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
    
    def _validate_code_quality(self, project_path: str):
        """
        Run integrated code quality checks on all parsed files.
        
        This validates:
        - Role naming standards (Lambda + Frontend)
        - API response format (camelCase keys)
        - Key consistency (dict creation vs access)
        - org_common import signatures
        - Admin route naming (ADR-018b)
        """
        logger.info("Running integrated code quality validation...")
        
        project = Path(project_path)
        code_quality_issues = []
        
        # Validate Lambda files (filtered by module if specified)
        if self.module_filter:
            lambda_path = project / 'packages' / self.module_filter
        else:
            lambda_path = project / 'packages'
        if lambda_path.exists():
            for file_path in lambda_path.glob("**/lambda_function.py"):
                # Skip templates and build artifacts
                # .build, dist, build: Lambda build artifacts (bundled/concatenated code)
                # .next: Next.js build artifacts (transpiled frontend code)
                # node_modules: Frontend dependencies
                path_str = str(file_path)
                if any(skip in path_str for skip in ['_module-template', '.build', '.next', 'node_modules', 'dist', 'build', '__pycache__', '.venv']):
                    continue

                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    issues = self.code_quality_validator.validate_lambda_file(str(file_path), content)
                    code_quality_issues.extend(issues)
                except Exception as e:
                    logger.warning(f"Failed to validate Lambda file {file_path}: {e}")
        
        # Validate frontend files (filtered by module if specified)
        frontend_paths = []
        if self.module_filter:
            frontend_paths.append(project / 'packages' / self.module_filter)
        else:
            frontend_paths.append(project / 'packages')
            frontend_paths.append(project / 'apps' / 'web')
            
        for frontend_path in frontend_paths:
            if frontend_path.exists():
                for ext in ['tsx', 'ts']:
                    for file_path in frontend_path.glob(f"**/*.{ext}"):
                        # Skip templates and node_modules
                        if '_module-template' in str(file_path) or 'node_modules' in str(file_path):
                            continue
                        
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                            issues = self.code_quality_validator.validate_frontend_file(str(file_path), content)
                            code_quality_issues.extend(issues)
                        except Exception as e:
                            logger.warning(f"Failed to validate frontend file {file_path}: {e}")
        
        # Validate gateway routes
        route_dicts = [
            {'path': route.path, 'file': route.file, 'line': 1}
            for route in self.gateway_parser.routes
        ]
        gateway_issues = self.code_quality_validator.validate_gateway_routes(route_dicts)
        code_quality_issues.extend(gateway_issues)
        
        # Convert code quality issues to APIMismatch format for unified reporting
        for issue in code_quality_issues:
            mismatch = APIMismatch(
                severity=issue.severity,
                mismatch_type=f"quality_{issue.category}",
                frontend_file=issue.file if '.tsx' in issue.file or '.ts' in issue.file else None,
                frontend_line=issue.line if '.tsx' in issue.file or '.ts' in issue.file else None,
                lambda_file=issue.file if '.py' in issue.file else None,
                lambda_line=issue.line if '.py' in issue.file else None,
                gateway_file=issue.file if '.tf' in issue.file else None,
                issue=issue.issue,
                suggestion=f"{issue.suggestion} (Ref: {issue.standard_ref})" if issue.standard_ref else issue.suggestion
            )
            self.mismatches.append(mismatch)
        
        self.code_quality_issues = code_quality_issues
        logger.info(f"Code quality validation complete: {len(code_quality_issues)} issues found")
    
    def _validate_db_functions(self, project_path: str):
        """
        Validate database RPC functions per ADR-020.
        
        This validates:
        - Parameter naming (p_ prefix)
        - Function naming patterns (is_*, can_*, get_*, etc.)
        - Table references exist in schema
        - Table naming (ADR-011 plural requirement)
        - Schema organization (functions in correct files)
        - Python helper location (auth.py, not __init__.py)
        """
        logger.info("Validating database functions (ADR-020)...")
        
        project = Path(project_path)
        db_function_issues = []
        
        # Find all modules with database schemas
        if self.module_filter:
            module_paths = [project / 'packages' / self.module_filter]
        else:
            module_paths = list((project / 'packages').glob('module-*'))
        
        for module_path in module_paths:
            # Skip template modules
            if '_module-template' in str(module_path):
                continue
            
            if module_path.is_dir():
                try:
                    issues = self.db_function_validator.validate_module(module_path)
                    db_function_issues.extend(issues)
                except Exception as e:
                    logger.warning(f"Failed to validate DB functions in {module_path}: {e}")
        
        # Convert DB function issues to APIMismatch format for unified reporting
        for issue in db_function_issues:
            mismatch = APIMismatch(
                severity=issue.severity,
                mismatch_type=f"db_{issue.category}",
                lambda_file=issue.file if '.sql' in issue.file else None,
                lambda_line=issue.line if '.sql' in issue.file else None,
                frontend_file=issue.file if '.py' in issue.file else None,
                frontend_line=issue.line if '.py' in issue.file else None,
                issue=f"[{issue.function_name}] {issue.issue}",
                suggestion=f"{issue.suggestion} (Ref: {issue.standard_ref})"
            )
            self.mismatches.append(mismatch)
        
        self.db_function_issues = db_function_issues
        logger.info(f"DB function validation complete: {len(db_function_issues)} issues found")
    
    def _validate_auth_lifecycle(self, project_path: str, validate_layer2: bool = False):
        """
        Validate auth patterns across frontend and Lambda layers per ADR-019.
        
        This validates:
        - Layer 1 (Admin Auth): useUser(), useRole(), check_*_admin() helpers
        - Layer 2 (Resource Permissions): org membership, resource ownership checks
        
        Args:
            project_path: Path to project root
            validate_layer2: If True, also validate Layer 2 (resource permissions)
        """
        logger.info("Validating auth lifecycle patterns (ADR-019)...")
        
        project = Path(project_path)
        auth_issues = []
        
        # Validate frontend files (admin pages) - filtered by module if specified
        frontend_paths = []
        if self.module_filter:
            frontend_paths.append(project / 'packages' / self.module_filter)
        else:
            frontend_paths.append(project / 'packages')
            frontend_paths.append(project / 'apps' / 'web')
            
        for frontend_path in frontend_paths:
            if frontend_path.exists():
                for ext in ['tsx', 'ts']:
                    for file_path in frontend_path.glob(f"**/*.{ext}"):
                        # Skip templates, node_modules, and build artifacts
                        path_str = str(file_path)
                        if any(skip in path_str for skip in ['_module-template', 'node_modules', '.next']):
                            continue
                        
                        # Only validate admin pages
                        if '/admin/' in path_str or '/workspace/' in path_str:
                            try:
                                with open(file_path, 'r', encoding='utf-8') as f:
                                    content = f.read()
                                issues = self.auth_validator.validate_frontend_file(str(file_path), content)
                                auth_issues.extend(issues)
                            except Exception as e:
                                logger.warning(f"Failed to validate frontend file {file_path}: {e}")
        
        # Validate Lambda files (filtered by module if specified)
        if self.module_filter:
            lambda_path = project / 'packages' / self.module_filter
        else:
            lambda_path = project / 'packages'
        if lambda_path.exists():
            for file_path in lambda_path.glob("**/lambda_function.py"):
                # Skip templates
                if '_module-template' in str(file_path):
                    continue
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    issues = self.auth_validator.validate_lambda_file(
                        str(file_path), 
                        content,
                        validate_layer2=validate_layer2
                    )
                    auth_issues.extend(issues)
                except Exception as e:
                    logger.warning(f"Failed to validate Lambda file {file_path}: {e}")
        
        # Convert auth issues to APIMismatch format for unified reporting
        for issue in auth_issues:
            mismatch = APIMismatch(
                severity=issue.severity,
                mismatch_type=f"auth_{issue.issue_type}",
                frontend_file=issue.file if issue.layer == 'frontend' else None,
                frontend_line=issue.line if issue.layer == 'frontend' else None,
                lambda_file=issue.file if issue.layer == 'lambda' else None,
                lambda_line=issue.line if issue.layer == 'lambda' else None,
                endpoint=issue.route_path,
                method=issue.route_method,
                issue=issue.issue,
                suggestion=f"{issue.suggestion} (Ref: {issue.standard_ref})" if issue.standard_ref else issue.suggestion
            )
            self.mismatches.append(mismatch)
        
        self.auth_issues = auth_issues
        logger.info(f"Auth validation complete: {len(auth_issues)} issues found")
    
    def _generate_report(self) -> ValidationReport:
        """Generate validation report."""
        # Count errors vs warnings
        errors = [m for m in self.mismatches if m.severity == 'error']
        warnings = [m for m in self.mismatches if m.severity == 'warning']
        
        # Count auth-specific issues (separated by layer)
        auth_errors = [m for m in self.mismatches if m.mismatch_type.startswith('auth_') and m.severity == 'error']
        auth_warnings = [m for m in self.mismatches if m.mismatch_type.startswith('auth_') and m.severity == 'warning']
        
        # Layer 1 (Admin Auth - ADR-019a/b)
        # Note: auth issues are prefixed with "auth_" twice due to conversion from AuthIssue to APIMismatch
        # We separate Frontend vs Backend based on file type
        
        # Frontend Admin Auth
        frontend_auth_errors = [m for m in auth_errors if m.frontend_file]
        frontend_auth_warnings = [m for m in auth_warnings if m.frontend_file]
        
        # Breakdown frontend errors by scope (using issue message or other attributes)
        # Note: We don't have direct access to AuthIssue.admin_scope here since they were converted to APIMismatch
        # But APIMismatch.issue might contain cues, or we can look at the file path
        
        # Helper to categorize frontend issues by scope
        def categorize_frontend_scope(mismatches):
            sys = 0
            org = 0
            ws = 0
            for m in mismatches:
                # Check path cues
                path = m.frontend_file.lower() if m.frontend_file else ""
                
                if '/admin/sys/' in path or '/admin/platform/' in path:
                    sys += 1
                elif '/admin/org/' in path:
                    org += 1
                elif '/admin/ws/' in path or '/workspace/' in path:
                    ws += 1
                else:
                    # Fallback or general admin pages
                    pass
            return sys, org, ws

        fe_sys_err, fe_org_err, fe_ws_err = categorize_frontend_scope(frontend_auth_errors)
        fe_sys_warn, fe_org_warn, fe_ws_warn = categorize_frontend_scope(frontend_auth_warnings)
        
        # Backend Admin Auth (Layer 1)
        layer1_errors = [m for m in auth_errors if m.lambda_file and m.mismatch_type.startswith('auth_auth_admin_')]
        layer1_warnings = [m for m in auth_warnings if m.lambda_file and m.mismatch_type.startswith('auth_auth_admin_')]
        
        # Backend Resource Permissions (Layer 2)
        layer2_errors = [m for m in auth_errors if m.lambda_file and m.mismatch_type.startswith('auth_auth_resource_')]
        layer2_warnings = [m for m in auth_warnings if m.lambda_file and m.mismatch_type.startswith('auth_auth_resource_')]
        
        # Count code quality issues
        quality_errors = [m for m in self.mismatches if m.mismatch_type.startswith('quality_') and m.severity == 'error']
        quality_warnings = [m for m in self.mismatches if m.mismatch_type.startswith('quality_') and m.severity == 'warning']
        
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
            'lambda_unique_routes': len(self.lambda_parser.get_unique_routes()),
            # Auth-specific summary (ADR-019) with layer breakdown
            'auth_validation': {
                'enabled': self.validate_auth,
                'frontend': {
                    'name': 'Frontend Admin Auth (ADR-019a)',
                    'errors': len(frontend_auth_errors),
                    'warnings': len(frontend_auth_warnings),
                    'total': len(frontend_auth_errors) + len(frontend_auth_warnings),
                    'sys_errors': fe_sys_err,
                    'sys_warnings': fe_sys_warn,
                    'org_errors': fe_org_err,
                    'org_warnings': fe_org_warn,
                    'ws_errors': fe_ws_err,
                    'ws_warnings': fe_ws_warn
                },
                'layer1': {
                    'name': 'Backend Admin Auth (ADR-019b)',
                    'errors': len(layer1_errors),
                    'warnings': len(layer1_warnings),
                    'total': len(layer1_errors) + len(layer1_warnings)
                },
                'layer2': {
                    'name': 'Backend Resource Permissions (ADR-019c)',
                    'errors': len(layer2_errors),
                    'warnings': len(layer2_warnings),
                    'total': len(layer2_errors) + len(layer2_warnings)
                },
                'total_errors': len(auth_errors),
                'total_warnings': len(auth_warnings),
                'total_issues': len(auth_errors) + len(auth_warnings)
            },
            # Code quality summary (integrated validators)
            'code_quality_validation': {
                'enabled': True,
                'errors': len(quality_errors),
                'warnings': len(quality_warnings),
                'total_issues': len(quality_errors) + len(quality_warnings),
                'by_category': self.code_quality_validator.get_issue_summary(self.code_quality_issues).get('by_category', {}) if self.code_quality_issues else {}
            },
            # DB function validation summary (ADR-020)
            'db_function_validation': {
                'enabled': self.validate_db_functions,
                'errors': len([i for i in self.db_function_issues if i.severity == 'error']),
                'warnings': len([i for i in self.db_function_issues if i.severity == 'warning']),
                'total_issues': len(self.db_function_issues),
                'by_category': self.db_function_validator.get_issue_summary(self.db_function_issues).get('by_category', {}) if self.db_function_issues else {}
            }
        }
        
        return ValidationReport(
            status=status,
            mismatches=self.mismatches,
            summary=summary
        )
