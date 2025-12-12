# AI Enablement Module Infrastructure - Outputs

# =============================================================================
# Lambda Functions
# =============================================================================

output "lambda_function_arn" {
  description = "ARN of the provider Lambda function"
  value       = aws_lambda_function.provider.arn
}

output "lambda_function_name" {
  description = "Name of the provider Lambda function"
  value       = aws_lambda_function.provider.function_name
}

output "lambda_invoke_arn" {
  description = "Invoke ARN for API Gateway integration"
  value       = aws_lambda_function.provider.invoke_arn
}

output "lambda_alias_invoke_arn" {
  description = "Invoke ARN for the live alias"
  value       = aws_lambda_alias.provider.invoke_arn
}

# =============================================================================
# IAM Role
# =============================================================================

output "iam_role_arn" {
  description = "IAM role ARN for Lambda function"
  value       = aws_iam_role.lambda.arn
}

output "iam_role_name" {
  description = "IAM role name for Lambda function"
  value       = aws_iam_role.lambda.name
}

# =============================================================================
# API Routes for API Gateway Integration
# =============================================================================

output "api_routes" {
  description = "API Gateway routes to be added to modular API Gateway"
  value = [
    # Provider CRUD endpoints
    {
      method      = "GET"
      path        = "/providers"
      integration = aws_lambda_alias.provider.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/providers"
      integration = aws_lambda_alias.provider.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/providers/{id}"
      integration = aws_lambda_alias.provider.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/providers/{id}"
      integration = aws_lambda_alias.provider.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/providers/{id}"
      integration = aws_lambda_alias.provider.invoke_arn
      public      = false
    },
    # Model discovery endpoint
    {
      method      = "POST"
      path        = "/providers/{providerId}/discover"
      integration = aws_lambda_alias.provider.invoke_arn
      public      = false
    },
    # Model validation endpoint
    {
      method      = "POST"
      path        = "/providers/{providerId}/validate-models"
      integration = aws_lambda_alias.provider.invoke_arn
      public      = false
    },
    # Validation status endpoint
    {
      method      = "GET"
      path        = "/providers/{providerId}/validation-status"
      integration = aws_lambda_alias.provider.invoke_arn
      public      = false
    },
    # Model management endpoints
    {
      method      = "GET"
      path        = "/models"
      integration = aws_lambda_alias.provider.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/models/{id}"
      integration = aws_lambda_alias.provider.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/models/{id}/test"
      integration = aws_lambda_alias.provider.invoke_arn
      public      = false
    }
  ]
}
