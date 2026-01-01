# =============================================================================
# Module: Outputs
# =============================================================================
# CRITICAL: The api_routes output is used by the infra repo's scripts to
# automatically configure API Gateway routes. This must be kept in sync
# with the Lambda handler's route dispatcher.
# =============================================================================

# -----------------------------------------------------------------------------
# Lambda Function Outputs
# -----------------------------------------------------------------------------

output "lambda_function_arns" {
  description = "ARNs of all Lambda functions in this module"
  value = {
    entity = aws_lambda_function.entity.arn
  }
}

output "lambda_function_names" {
  description = "Names of all Lambda functions (for monitoring/debugging)"
  value = {
    entity = aws_lambda_function.entity.function_name
  }
}

output "lambda_invoke_arns" {
  description = "Invoke ARNs for API Gateway integration"
  value = {
    entity = aws_lambda_function.entity.invoke_arn
  }
}

# -----------------------------------------------------------------------------
# IAM Outputs
# -----------------------------------------------------------------------------

output "iam_role_arn" {
  description = "IAM role ARN for Lambda functions"
  value       = aws_iam_role.lambda.arn
}

output "iam_role_name" {
  description = "IAM role name for Lambda functions"
  value       = aws_iam_role.lambda.name
}

# -----------------------------------------------------------------------------
# API Routes for API Gateway Integration (CRITICAL)
# -----------------------------------------------------------------------------
# These routes are consumed by the infra repo's API Gateway configuration
# to automatically set up routing for this module's endpoints.
#
# ⚠️ IMPORTANT: Keep this in sync with the Lambda handler's route dispatcher!
# 
# Format:
#   - method: HTTP method (GET, POST, PUT, DELETE)
#   - path: API path with path parameters in curly braces
#   - integration: Lambda invoke ARN
#   - description: Human-readable description
# -----------------------------------------------------------------------------

output "api_routes" {
  description = "API Gateway routes for this module (used by infra scripts)"
  value = [
    # Entity CRUD - Update these to match your actual endpoints
    {
      method      = "GET"
      path        = "/api/{module}/{entities}"
      integration = aws_lambda_function.entity.invoke_arn
      description = "List entities"
    },
    {
      method      = "POST"
      path        = "/api/{module}/{entities}"
      integration = aws_lambda_function.entity.invoke_arn
      description = "Create entity"
    },
    {
      method      = "GET"
      path        = "/api/{module}/{entities}/{id}"
      integration = aws_lambda_function.entity.invoke_arn
      description = "Get entity"
    },
    {
      method      = "PUT"
      path        = "/api/{module}/{entities}/{id}"
      integration = aws_lambda_function.entity.invoke_arn
      description = "Update entity"
    },
    {
      method      = "DELETE"
      path        = "/api/{module}/{entities}/{id}"
      integration = aws_lambda_function.entity.invoke_arn
      description = "Delete entity"
    }
  ]
}
