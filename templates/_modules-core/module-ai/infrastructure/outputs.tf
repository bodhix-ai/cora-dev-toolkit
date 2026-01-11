# =============================================================================
# Module-AI: Outputs
# =============================================================================
# Outputs for the AI Provider Management module
# =============================================================================

# -----------------------------------------------------------------------------
# Lambda Function Outputs
# -----------------------------------------------------------------------------

output "lambda_function_arns" {
  description = "ARNs of all Lambda functions in this module"
  value = {
    provider = aws_lambda_alias.provider.arn
  }
}

output "lambda_function_names" {
  description = "Names of all Lambda functions (for monitoring/debugging)"
  value = {
    provider = aws_lambda_alias.provider.function_name
  }
}

output "lambda_invoke_arns" {
  description = "Invoke ARNs for API Gateway integration"
  value = {
    provider = aws_lambda_alias.provider.invoke_arn
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
# -----------------------------------------------------------------------------

output "api_routes" {
  description = "API Gateway routes for this module (used by infra scripts)"
  value = [
    # Organization AI Configuration
    {
      method      = "GET"
      path        = "/orgs/{orgId}/ai/config"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Get organization AI configuration"
      public      = false
    },
    # Provider CRUD
    {
      method      = "GET"
      path        = "/providers"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "List all AI providers"
      public      = false
    },
    {
      method      = "POST"
      path        = "/providers"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Create a new provider"
      public      = false
    },
    {
      method      = "GET"
      path        = "/providers/{providerId}"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Get provider details"
      public      = false
    },
    {
      method      = "PUT"
      path        = "/providers/{providerId}"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Update provider configuration"
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/providers/{providerId}"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Delete provider"
      public      = false
    },
    {
      method      = "POST"
      path        = "/providers/{providerId}/discover"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Discover available models from provider"
      public      = false
    },
    {
      method      = "POST"
      path        = "/providers/{providerId}/validate-models"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Start async validation for provider models"
      public      = false
    },
    {
      method      = "GET"
      path        = "/providers/{providerId}/validation-status"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Get validation status for a provider"
      public      = false
    },
    # Model Management
    {
      method      = "GET"
      path        = "/models"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "List all AI models"
      public      = false
    },
    {
      method      = "GET"
      path        = "/models/{modelId}"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Get a single model by ID"
      public      = false
    },
    {
      method      = "POST"
      path        = "/models/{modelId}/test"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Test a model with a prompt"
      public      = false
    }
  ]
}
