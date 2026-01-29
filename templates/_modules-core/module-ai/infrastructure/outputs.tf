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
    provider           = aws_lambda_alias.provider.arn
    ai_config_handler  = aws_lambda_alias.ai_config_handler.arn
  }
}

output "lambda_function_names" {
  description = "Names of all Lambda functions (for monitoring/debugging)"
  value = {
    provider           = aws_lambda_alias.provider.function_name
    ai_config_handler  = aws_lambda_alias.ai_config_handler.function_name
  }
}

output "lambda_invoke_arns" {
  description = "Invoke ARNs for API Gateway integration"
  value = {
    provider           = aws_lambda_alias.provider.invoke_arn
    ai_config_handler  = aws_lambda_alias.ai_config_handler.invoke_arn
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
# All routes follow the standard pattern: /admin/{scope}/ai/*
# -----------------------------------------------------------------------------

output "api_routes" {
  description = "API Gateway routes for this module (used by infra scripts)"
  value = [
    # =============================================================================
    # System Admin Routes - /admin/sys/ai/*
    # =============================================================================
    
    # Provider Management (provider lambda)
    {
      method      = "GET"
      path        = "/admin/sys/ai/providers"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "List all AI providers"
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/sys/ai/providers"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Create a new provider"
      public      = false
    },
    {
      method      = "GET"
      path        = "/admin/sys/ai/providers/{providerId}"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Get provider details"
      public      = false
    },
    {
      method      = "PUT"
      path        = "/admin/sys/ai/providers/{providerId}"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Update provider configuration"
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/admin/sys/ai/providers/{providerId}"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Delete provider"
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/sys/ai/providers/{providerId}/discover"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Discover available models from provider"
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/sys/ai/providers/{providerId}/validate-models"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Start async validation for provider models"
      public      = false
    },
    {
      method      = "GET"
      path        = "/admin/sys/ai/providers/{providerId}/validation-status"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Get validation status for a provider"
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/sys/ai/providers/test"
      integration = aws_lambda_alias.ai_config_handler.invoke_arn
      description = "Test AI provider connection"
      public      = false
    },
    
    # Model Management (provider lambda)
    {
      method      = "GET"
      path        = "/admin/sys/ai/models"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "List all AI models"
      public      = false
    },
    {
      method      = "GET"
      path        = "/admin/sys/ai/models/{modelId}"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Get a single model by ID"
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/sys/ai/models/{modelId}/test"
      integration = aws_lambda_alias.provider.invoke_arn
      description = "Test a model with a prompt"
      public      = false
    },
    
    # Platform AI Configuration (ai-config-handler)
    {
      method      = "GET"
      path        = "/admin/sys/ai/config"
      integration = aws_lambda_alias.ai_config_handler.invoke_arn
      description = "Get platform AI configuration"
      public      = false
    },
    {
      method      = "PUT"
      path        = "/admin/sys/ai/config"
      integration = aws_lambda_alias.ai_config_handler.invoke_arn
      description = "Update platform AI configuration"
      public      = false
    },
    {
      method      = "GET"
      path        = "/admin/sys/ai/orgs/{orgId}/config"
      integration = aws_lambda_alias.ai_config_handler.invoke_arn
      description = "Get organization AI configuration (sys admin viewing specific org)"
      public      = false
    },
    {
      method      = "PUT"
      path        = "/admin/sys/ai/orgs/{orgId}/config"
      integration = aws_lambda_alias.ai_config_handler.invoke_arn
      description = "Update organization AI configuration (sys admin for specific org)"
      public      = false
    },
    {
      method      = "GET"
      path        = "/admin/sys/ai/rag-config"
      integration = aws_lambda_alias.ai_config_handler.invoke_arn
      description = "Get platform RAG configuration"
      public      = false
    },
    {
      method      = "PUT"
      path        = "/admin/sys/ai/rag-config"
      integration = aws_lambda_alias.ai_config_handler.invoke_arn
      description = "Update platform RAG configuration"
      public      = false
    },
    
    # =============================================================================
    # Organization Admin Routes - /admin/org/ai/*
    # =============================================================================
    
    # Organization AI Configuration (ai-config-handler)
    {
      method      = "GET"
      path        = "/admin/org/ai/config"
      integration = aws_lambda_alias.ai_config_handler.invoke_arn
      description = "Get organization AI configuration"
      public      = false
    },
    {
      method      = "PUT"
      path        = "/admin/org/ai/config"
      integration = aws_lambda_alias.ai_config_handler.invoke_arn
      description = "Update organization AI configuration"
      public      = false
    }
  ]
}