# =============================================================================
# Module-WS: Outputs
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
    workspace = aws_lambda_function.workspace.arn
    cleanup   = var.enable_cleanup_job ? aws_lambda_function.cleanup[0].arn : null
  }
}

output "lambda_function_names" {
  description = "Names of all Lambda functions (for monitoring/debugging)"
  value = {
    workspace = aws_lambda_function.workspace.function_name
    cleanup   = var.enable_cleanup_job ? aws_lambda_function.cleanup[0].function_name : null
  }
}

output "lambda_invoke_arns" {
  description = "Invoke ARNs for API Gateway integration"
  value = {
    workspace = aws_lambda_function.workspace.invoke_arn
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
    # Workspace CRUD
    {
      method      = "GET"
      path        = "/api/ws/workspaces"
      integration = aws_lambda_function.workspace.invoke_arn
      description = "List user's workspaces"
      public      = false
    },
    {
      method      = "POST"
      path        = "/api/ws/workspaces"
      integration = aws_lambda_function.workspace.invoke_arn
      description = "Create new workspace"
      public      = false
    },
    {
      method      = "GET"
      path        = "/api/ws/workspaces/{id}"
      integration = aws_lambda_function.workspace.invoke_arn
      description = "Get workspace details"
      public      = false
    },
    {
      method      = "PUT"
      path        = "/api/ws/workspaces/{id}"
      integration = aws_lambda_function.workspace.invoke_arn
      description = "Update workspace"
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/api/ws/workspaces/{id}"
      integration = aws_lambda_function.workspace.invoke_arn
      description = "Soft delete workspace"
      public      = false
    },
    # Workspace Restore
    {
      method      = "POST"
      path        = "/api/ws/workspaces/{id}/restore"
      integration = aws_lambda_function.workspace.invoke_arn
      description = "Restore soft-deleted workspace"
      public      = false
    },
    # Workspace Members
    {
      method      = "GET"
      path        = "/api/ws/workspaces/{id}/members"
      integration = aws_lambda_function.workspace.invoke_arn
      description = "List workspace members"
      public      = false
    },
    {
      method      = "POST"
      path        = "/api/ws/workspaces/{id}/members"
      integration = aws_lambda_function.workspace.invoke_arn
      description = "Add member to workspace"
      public      = false
    },
    {
      method      = "PUT"
      path        = "/api/ws/workspaces/{workspaceId}/members/{memberId}"
      integration = aws_lambda_function.workspace.invoke_arn
      description = "Update member role"
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/api/ws/workspaces/{workspaceId}/members/{memberId}"
      integration = aws_lambda_function.workspace.invoke_arn
      description = "Remove member from workspace"
      public      = false
    },
    # Workspace Favorites
    {
      method      = "POST"
      path        = "/api/ws/workspaces/{id}/favorite"
      integration = aws_lambda_function.workspace.invoke_arn
      description = "Toggle workspace favorite"
      public      = false
    },
    {
      method      = "GET"
      path        = "/api/ws/favorites"
      integration = aws_lambda_function.workspace.invoke_arn
      description = "List user's favorite workspaces"
      public      = false
    }
  ]
}

# -----------------------------------------------------------------------------
# EventBridge Outputs (Cleanup Job)
# -----------------------------------------------------------------------------

output "cleanup_schedule_rule_arn" {
  description = "ARN of the EventBridge cleanup schedule rule"
  value       = var.enable_cleanup_job ? aws_cloudwatch_event_rule.cleanup_schedule[0].arn : null
}

output "cleanup_schedule_rule_name" {
  description = "Name of the EventBridge cleanup schedule rule"
  value       = var.enable_cleanup_job ? aws_cloudwatch_event_rule.cleanup_schedule[0].name : null
}
