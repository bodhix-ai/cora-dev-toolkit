# Module AI Infrastructure - Outputs
# Includes outputs for both ai-config-handler and provider Lambda functions

# =============================================================================
# Lambda Layer
# =============================================================================

output "common_ai_layer_arn" {
  description = "ARN of the common-ai Lambda layer"
  value       = aws_lambda_layer_version.common_ai.arn
}

# =============================================================================
# Lambda Functions - AI Config Handler
# =============================================================================

output "ai_config_handler_function_arn" {
  description = "ARN of the ai-config-handler Lambda function"
  value       = aws_lambda_function.ai_config_handler.arn
}

output "ai_config_handler_function_name" {
  description = "Name of the ai-config-handler Lambda function"
  value       = aws_lambda_function.ai_config_handler.function_name
}

output "ai_config_handler_invoke_arn" {
  description = "Invoke ARN for ai-config-handler API Gateway integration"
  value       = aws_lambda_function.ai_config_handler.invoke_arn
}

output "ai_config_handler_alias_invoke_arn" {
  description = "Invoke ARN for the ai-config-handler live alias"
  value       = aws_lambda_alias.ai_config_handler.invoke_arn
}

# =============================================================================
# Lambda Functions - Provider
# =============================================================================

output "provider_function_arn" {
  description = "ARN of the provider Lambda function"
  value       = aws_lambda_function.provider.arn
}

output "provider_function_name" {
  description = "Name of the provider Lambda function"
  value       = aws_lambda_function.provider.function_name
}

output "provider_invoke_arn" {
  description = "Invoke ARN for provider API Gateway integration"
  value       = aws_lambda_function.provider.invoke_arn
}

output "provider_alias_invoke_arn" {
  description = "Invoke ARN for the provider live alias"
  value       = aws_lambda_alias.provider.invoke_arn
}

# =============================================================================
# IAM Role
# =============================================================================

output "iam_role_arn" {
  description = "IAM role ARN for Lambda functions"
  value       = aws_iam_role.lambda.arn
}

output "iam_role_name" {
  description = "IAM role name for Lambda functions"
  value       = aws_iam_role.lambda.name
}

# =============================================================================
# API Routes for API Gateway Integration
# =============================================================================

output "api_routes" {
  description = "API Gateway routes to be added to modular API Gateway"
  value = concat(
    # AI Config Handler routes (platform and org-level config)
    [
      {
        method      = "GET"
        path        = "/admin/ai/config"
        integration = aws_lambda_alias.ai_config_handler.invoke_arn
        public      = false
      },
      {
        method      = "PUT"
        path        = "/admin/ai/config"
        integration = aws_lambda_alias.ai_config_handler.invoke_arn
        public      = false
      },
      {
        method      = "GET"
        path        = "/admin/ai/models"
        integration = aws_lambda_alias.ai_config_handler.invoke_arn
        public      = false
      },
      {
        method      = "GET"
        path        = "/orgs/{orgId}/ai/config"
        integration = aws_lambda_alias.ai_config_handler.invoke_arn
        public      = false
      },
      {
        method      = "PUT"
        path        = "/orgs/{orgId}/ai/config"
        integration = aws_lambda_alias.ai_config_handler.invoke_arn
        public      = false
      },
      # AI Provider Configuration routes
      {
        method      = "GET"
        path        = "/admin/ai/rag-config"
        integration = aws_lambda_alias.ai_config_handler.invoke_arn
        public      = false
      },
      {
        method      = "PUT"
        path        = "/admin/ai/rag-config"
        integration = aws_lambda_alias.ai_config_handler.invoke_arn
        public      = false
      },
      {
        method      = "GET"
        path        = "/admin/ai/providers"
        integration = aws_lambda_alias.ai_config_handler.invoke_arn
        public      = false
      },
      {
        method      = "POST"
        path        = "/admin/ai/providers/test"
        integration = aws_lambda_alias.ai_config_handler.invoke_arn
        public      = false
      },
      {
        method      = "GET"
        path        = "/admin/ai/providers/models"
        integration = aws_lambda_alias.ai_config_handler.invoke_arn
        public      = false
      }
    ],
    # Provider CRUD and model management routes
    [
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
      {
        method      = "POST"
        path        = "/providers/{id}/discover"
        integration = aws_lambda_alias.provider.invoke_arn
        public      = false
      },
      {
        method      = "POST"
        path        = "/providers/{id}/validate-models"
        integration = aws_lambda_alias.provider.invoke_arn
        public      = false
      },
      {
        method      = "GET"
        path        = "/providers/{id}/validation-status"
        integration = aws_lambda_alias.provider.invoke_arn
        public      = false
      },
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
  )
}
