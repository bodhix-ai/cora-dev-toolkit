# Module: module-eval-optimizer
# Outputs for Eval Optimization Infrastructure

# =============================================================================
# LAMBDA OUTPUTS
# =============================================================================

output "lambda_function_arns" {
  description = "ARNs of all Lambda functions in module-eval-opt"
  value = {
    opt_orchestrator = aws_lambda_function.opt_orchestrator.arn
  }
}

output "lambda_function_names" {
  description = "Names of all Lambda functions in module-eval-opt"
  value = {
    opt_orchestrator = aws_lambda_function.opt_orchestrator.function_name
  }
}

output "lambda_invoke_arns" {
  description = "Invoke ARNs for API Gateway integration"
  value = {
    opt_orchestrator = aws_lambda_function.opt_orchestrator.invoke_arn
  }
}

# =============================================================================
# IAM OUTPUTS
# =============================================================================

output "iam_role_arn" {
  description = "ARN of the optimization orchestrator IAM role"
  value       = aws_iam_role.opt_orchestrator_role.arn
}

# =============================================================================
# LAMBDA LAYER OUTPUTS
# =============================================================================

output "layer_arn" {
  description = "ARN of the eval_opt_common Lambda layer"
  value       = aws_lambda_layer_version.eval_opt_common.arn
}

# =============================================================================
# API ROUTES (Inversion of Control)
# =============================================================================

output "api_routes" {
  description = "API Gateway routes to be added to main API Gateway"
  value = [
    # =========================================================================
    # Optimization Runs
    # =========================================================================
    {
      method      = "POST"
      path        = "/ws/{wsId}/optimization/runs"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/ws/{wsId}/optimization/runs"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/ws/{wsId}/optimization/runs/{runId}"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/ws/{wsId}/optimization/runs/{runId}/results"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/ws/{wsId}/optimization/runs/{runId}"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    },
    # =========================================================================
    # Phase & Variation Tracking
    # =========================================================================
    {
      method      = "GET"
      path        = "/ws/{wsId}/optimization/runs/{runId}/phases"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/ws/{wsId}/optimization/runs/{runId}/variations"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    },
    # =========================================================================
    # Response Sections
    # =========================================================================
    {
      method      = "GET"
      path        = "/ws/{wsId}/optimization/runs/{runId}/sections"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/ws/{wsId}/optimization/runs/{runId}/sections"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    },
    # =========================================================================
    # Truth Sets
    # =========================================================================
    {
      method      = "GET"
      path        = "/ws/{wsId}/optimization/runs/{runId}/truth-sets"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/ws/{wsId}/optimization/runs/{runId}/truth-sets"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/ws/{wsId}/optimization/runs/{runId}/truth-sets/{tsId}"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/ws/{wsId}/optimization/runs/{runId}/truth-sets/{tsId}"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/ws/{wsId}/optimization/runs/{runId}/truth-sets/{tsId}"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    },
    # =========================================================================
    # Optimization Trigger
    # =========================================================================
    {
      method      = "POST"
      path        = "/ws/{wsId}/optimization/runs/{runId}/optimize"
      integration = aws_lambda_function.opt_orchestrator.invoke_arn
      public      = false
    }
  ]
}

# =============================================================================
# CLOUDWATCH OUTPUTS
# =============================================================================

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.opt_orchestrator.name
}
