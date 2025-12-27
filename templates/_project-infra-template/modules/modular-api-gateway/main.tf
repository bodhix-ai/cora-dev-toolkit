# Modular API Gateway - Main Configuration
# Creates a dedicated API Gateway for CORA modules with dynamic route provisioning

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  # Create unique keys for integrations and routes
  route_keys = {
    for route in var.module_routes :
    "${route.method}-${replace(route.path, "/", "-")}" => route
  }

  tags = merge(var.common_tags, {
    Component = "modular-api-gateway"
    Type      = "CORA"
  })
}

# =============================================================================
# API Gateway
# =============================================================================

resource "aws_apigatewayv2_api" "modular" {
  name          = "${var.name_prefix}-${var.environment}-modular"
  protocol_type = "HTTP"

  cors_configuration {
    allow_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    allow_origins = var.allowed_origins
    allow_headers = ["*"]
    max_age       = 300
  }

  tags = local.tags
}

# =============================================================================
# Lambda Authorizer (Optional)
# =============================================================================

resource "aws_apigatewayv2_authorizer" "jwt" {
  count = var.authorizer_lambda_arn != "" ? 1 : 0

  api_id           = aws_apigatewayv2_api.modular.id
  authorizer_type  = "REQUEST"
  # Construct proper API Gateway invoke URI from Lambda ARN
  authorizer_uri   = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.authorizer_lambda_arn}/invocations"
  name             = "${var.name_prefix}-${var.environment}-jwt-authorizer"
  
  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = false
  
  identity_sources = ["$request.header.Authorization"]
  
  # Authorizer results cache (5 minutes)
  authorizer_result_ttl_in_seconds = 300
}

# Lambda permission for API Gateway to invoke authorizer
resource "aws_lambda_permission" "authorizer" {
  count = var.authorizer_lambda_arn != "" ? 1 : 0

  statement_id  = "AllowAPIGatewayInvoke-${var.name_prefix}-${var.environment}"
  action        = "lambda:InvokeFunction"
  function_name = var.authorizer_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.modular.execution_arn}/*"
}

# =============================================================================
# CloudWatch Logs
# =============================================================================

resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/api_gateway/${aws_apigatewayv2_api.modular.name}"
  retention_in_days = var.log_retention_days

  tags = local.tags
}

# =============================================================================
# API Gateway Stage
# =============================================================================

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.modular.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn
    format = jsonencode({
      requestId               = "$context.requestId"
      sourceIp                = "$context.identity.sourceIp"
      requestTime             = "$context.requestTime"
      protocol                = "$context.protocol"
      httpMethod              = "$context.httpMethod"
      resourcePath            = "$context.resourcePath"
      routeKey                = "$context.routeKey"
      status                  = "$context.status"
      responseLength          = "$context.responseLength"
      integrationErrorMessage = "$context.integrationErrorMessage"
    })
  }

  tags = local.tags
}

# =============================================================================
# Lambda Integrations (one per unique Lambda invoke ARN)
# =============================================================================

# Create integrations using route keys (static) instead of Lambda ARNs (computed)
# This avoids Terraform's "for_each argument will be known only after apply" error
resource "aws_apigatewayv2_integration" "lambda" {
  for_each = local.route_keys

  api_id             = aws_apigatewayv2_api.modular.id
  integration_type   = "AWS_PROXY"
  integration_uri    = each.value.integration
  payload_format_version = "2.0"
}

# =============================================================================
# API Gateway Routes (dynamically created from module outputs)
# =============================================================================

resource "aws_apigatewayv2_route" "module_routes" {
  for_each = local.route_keys

  api_id    = aws_apigatewayv2_api.modular.id
  route_key = "${each.value.method} ${each.value.path}"
  # Use the same key as the integration (method-path)
  target    = "integrations/${aws_apigatewayv2_integration.lambda[each.key].id}"
  
  # Attach authorizer to non-public routes if authorizer is configured
  authorization_type = var.authorizer_lambda_arn != "" && !each.value.public ? "CUSTOM" : "NONE"
  authorizer_id      = var.authorizer_lambda_arn != "" && !each.value.public ? aws_apigatewayv2_authorizer.jwt[0].id : null
}

# =============================================================================
# Lambda Permissions (allow API Gateway to invoke Lambda functions)
# =============================================================================

resource "aws_lambda_permission" "api_gateway" {
  for_each = local.route_keys

  # Sanitize statement_id: replace invalid characters with underscores
  statement_id  = "AllowModularAPIGateway-${replace(replace(each.key, "{", ""), "}", "")}"
  action        = "lambda:InvokeFunction"
  # Extract Lambda ARN from API Gateway invoke URI
  # Format: arn:aws:apigateway:REGION:lambda:path/2015-03-31/functions/LAMBDA_ARN/invocations
  # We need just the LAMBDA_ARN part
  function_name = regex("functions/([^/]+)", each.value.integration)[0]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.modular.execution_arn}/*/*"
}
