# Module: module-eval-optimizer
# Outputs for Eval Optimization Infrastructure

# =============================================================================
# LAMBDA OUTPUTS
# =============================================================================

output "opt_orchestrator_function_name" {
  description = "Name of the optimization orchestrator Lambda function"
  value       = aws_lambda_function.opt_orchestrator.function_name
}

output "opt_orchestrator_function_arn" {
  description = "ARN of the optimization orchestrator Lambda function"
  value       = aws_lambda_function.opt_orchestrator.arn
}

output "opt_orchestrator_invoke_arn" {
  description = "Invoke ARN of the optimization orchestrator Lambda function"
  value       = aws_lambda_function.opt_orchestrator.invoke_arn
}

# =============================================================================
# IAM OUTPUTS
# =============================================================================

output "opt_orchestrator_role_arn" {
  description = "ARN of the optimization orchestrator IAM role"
  value       = aws_iam_role.opt_orchestrator_role.arn
}

output "opt_orchestrator_role_name" {
  description = "Name of the optimization orchestrator IAM role"
  value       = aws_iam_role.opt_orchestrator_role.name
}

# =============================================================================
# LAMBDA LAYER OUTPUTS
# =============================================================================

output "eval_opt_common_layer_arn" {
  description = "ARN of the eval_opt_common Lambda layer (ADR-019c permissions)"
  value       = aws_lambda_layer_version.eval_opt_common.arn
}

output "eval_opt_common_layer_version" {
  description = "Version of the eval_opt_common Lambda layer"
  value       = aws_lambda_layer_version.eval_opt_common.version
}

# =============================================================================
# API GATEWAY OUTPUTS
# =============================================================================

output "api_integration_id" {
  description = "ID of the API Gateway integration"
  value       = aws_apigatewayv2_integration.opt_orchestrator.id
}

output "api_routes" {
  description = "Map of API Gateway route IDs"
  value = {
    create_run      = aws_apigatewayv2_route.create_run.id
    list_runs       = aws_apigatewayv2_route.list_runs.id
    get_run         = aws_apigatewayv2_route.get_run.id
    get_run_results = aws_apigatewayv2_route.get_run_results.id
    delete_run      = aws_apigatewayv2_route.delete_run.id
  }
}

# =============================================================================
# CLOUDWATCH OUTPUTS
# =============================================================================

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.opt_orchestrator.name
}

output "log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.opt_orchestrator.arn
}