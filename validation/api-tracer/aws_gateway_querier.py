"""
AWS API Gateway Querier

Queries AWS API Gateway v2 directly to retrieve route information.
This is used as an alternative to parsing Terraform files, which may not
detect dynamically created routes (e.g., routes created via for_each loops).
"""

import boto3
import logging
from typing import List, Optional
from dataclasses import dataclass

from gateway_parser import GatewayRoute

logger = logging.getLogger(__name__)


class AWSGatewayQuerier:
    """Queries AWS API Gateway v2 for route information."""
    
    def __init__(self, aws_profile: Optional[str] = None, region: str = 'us-east-1'):
        """
        Initialize AWS API Gateway querier.
        
        Args:
            aws_profile: AWS CLI profile name (optional, uses default if not provided)
            region: AWS region (default: us-east-1)
        """
        self.aws_profile = aws_profile
        self.region = region
        
        try:
            # Create boto3 session with optional profile
            session_kwargs = {'region_name': region}
            if aws_profile:
                session_kwargs['profile_name'] = aws_profile
            
            session = boto3.Session(**session_kwargs)
            self.client = session.client('apigatewayv2')
            logger.info(f"AWS API Gateway client initialized (region: {region}, profile: {aws_profile or 'default'})")
        except Exception as e:
            logger.error(f"Failed to initialize AWS client: {e}")
            raise
    
    def get_routes(self, api_id: str) -> List[GatewayRoute]:
        """
        Query routes from AWS API Gateway v2 with pagination support.
        
        Args:
            api_id: API Gateway ID
            
        Returns:
            List of GatewayRoute objects
        """
        try:
            logger.info(f"Querying routes from AWS API Gateway: {api_id}")
            
            # Get routes from API Gateway with pagination
            routes = []
            next_token = None
            
            while True:
                # Build request parameters
                params = {'ApiId': api_id}
                if next_token:
                    params['NextToken'] = next_token
                
                # Get page of routes
                response = self.client.get_routes(**params)
                routes.extend(response.get('Items', []))
                
                # Check if there are more pages
                next_token = response.get('NextToken')
                if not next_token:
                    break
            
            # Convert AWS routes to GatewayRoute objects
            gateway_routes = []
            for route in routes:
                gateway_route = self._convert_to_gateway_route(route, api_id)
                if gateway_route:
                    gateway_routes.append(gateway_route)
            
            logger.info(f"Retrieved {len(gateway_routes)} routes from AWS API Gateway")
            return gateway_routes
            
        except self.client.exceptions.NotFoundException:
            logger.error(f"API Gateway not found: {api_id}")
            return []
        except self.client.exceptions.TooManyRequestsException:
            logger.error("AWS API rate limit exceeded")
            return []
        except Exception as e:
            logger.error(f"Failed to query AWS API Gateway: {e}")
            return []
    
    def _convert_to_gateway_route(self, aws_route: dict, api_id: str) -> Optional[GatewayRoute]:
        """
        Convert AWS API Gateway route to GatewayRoute object.
        
        Args:
            aws_route: Route data from AWS API Gateway
            api_id: API Gateway ID
            
        Returns:
            GatewayRoute object or None if conversion fails
        """
        try:
            # Parse route key (e.g., "GET /profiles/me")
            route_key = aws_route.get('RouteKey', '')
            method, path = self._parse_route_key(route_key)
            
            # Extract integration ID and Lambda function
            target = aws_route.get('Target', '')
            integration_id = None
            lambda_function = None
            
            if target:
                # Target format: "integrations/{integration-id}"
                integration_id = target.split('/')[-1] if '/' in target else None
                
                # Try to get Lambda function name from integration
                if integration_id:
                    lambda_function = self._get_lambda_from_integration(api_id, integration_id)
            
            # Extract authorizer
            authorizer_id = aws_route.get('AuthorizerId')
            authorization = 'JWT' if authorizer_id else None
            
            return GatewayRoute(
                file=f"AWS:{api_id}",  # Indicate this came from AWS, not Terraform
                line=0,  # Not applicable for AWS-sourced routes
                method=method,
                path=path,
                lambda_function=lambda_function,
                authorization=authorization,
                cors_enabled=True,  # Assume CORS is enabled
                source_code=f"AWS Route: {route_key}"
            )
            
        except Exception as e:
            logger.warning(f"Failed to convert AWS route: {e}")
            return None
    
    def _parse_route_key(self, route_key: str) -> tuple:
        """
        Parse route_key into method and path.
        
        Args:
            route_key: Route key string (e.g., "GET /profiles/me")
            
        Returns:
            Tuple of (method, path)
        """
        parts = route_key.split(' ', 1)
        if len(parts) == 2:
            return parts[0].upper(), parts[1]
        else:
            # Default to GET if method not specified
            return 'GET', parts[0]
    
    def _get_lambda_from_integration(self, api_id: str, integration_id: str) -> Optional[str]:
        """
        Get Lambda function name from API Gateway integration.
        
        Args:
            api_id: API Gateway ID
            integration_id: Integration ID
            
        Returns:
            Lambda function name or None
        """
        try:
            response = self.client.get_integration(
                ApiId=api_id,
                IntegrationId=integration_id
            )
            
            # Extract Lambda ARN from integration URI
            # Format: arn:aws:apigateway:{region}:lambda:path/2015-03-31/functions/arn:aws:lambda:{region}:{account}:function:{name}/invocations
            integration_uri = response.get('IntegrationUri', '')
            
            if 'lambda' in integration_uri and 'function' in integration_uri:
                # Extract function name from ARN
                parts = integration_uri.split(':function:')
                if len(parts) > 1:
                    func_part = parts[1].split('/')[0]
                    return func_part
            
            return None
            
        except Exception as e:
            logger.debug(f"Could not get Lambda function from integration {integration_id}: {e}")
            return None
