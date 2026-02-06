# Module: module-eval-optimizer
# Infrastructure for the Eval Optimization Workbench
#
# This module provides automated prompt optimization using RAG + LLM meta-prompting.
# Uses existing module-kb for document storage (NO new vector infrastructure).

terraform {
  required_version = ">= 1.5.0"
}

# =============================================================================
# DATA SOURCES
# =============================================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# =============================================================================
# LAMBDA LAYER: eval_opt_common (ADR-019c compliant permissions)
# =============================================================================

resource "aws_lambda_layer_version" "eval_opt_common" {
  layer_name          = "${var.project_name}-${var.environment}-eval-opt-common"
  description         = "Eval Optimizer Common Layer - permissions and shared utilities (ADR-019c)"
  
  filename            = var.eval_opt_common_layer_zip
  source_code_hash    = filebase64sha256(var.eval_opt_common_layer_zip)
  
  compatible_runtimes = ["python3.11"]
  
  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# LAMBDA: Optimization Orchestrator
# =============================================================================

resource "aws_lambda_function" "opt_orchestrator" {
  function_name    = "${var.project_name}-${var.environment}-eval-opt-orchestrator"
  description      = "Eval Optimization Orchestrator - RAG + LLM meta-prompting for prompt optimization"
  
  filename         = var.opt_orchestrator_zip
  source_code_hash = filebase64sha256(var.opt_orchestrator_zip)
  
  handler = "lambda_function.lambda_handler"
  runtime = "python3.11"
  timeout = 900  # 15 minutes for optimization runs
  memory_size = 1024
  
  role = aws_iam_role.opt_orchestrator_role.arn
  
  layers = [
    var.org_common_layer_arn,
    aws_lambda_layer_version.eval_opt_common.arn
  ]
  
  environment {
    variables = {
      LOG_LEVEL           = var.log_level
      SUPABASE_URL        = var.supabase_url
      SUPABASE_KEY_SECRET = var.supabase_key_secret_name
      ENVIRONMENT         = var.environment
    }
  }
  
  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = merge(var.tags, {
    Module    = "module-eval-optimizer"
    Component = "opt-orchestrator"
  })
}

# =============================================================================
# IAM ROLE & POLICY
# =============================================================================

resource "aws_iam_role" "opt_orchestrator_role" {
  name = "${var.project_name}-${var.environment}-eval-opt-orchestrator-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.tags
}

resource "aws_iam_role_policy" "opt_orchestrator_policy" {
  name = "${var.project_name}-${var.environment}-eval-opt-orchestrator-policy"
  role = aws_iam_role.opt_orchestrator_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # CloudWatch Logs
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-${var.environment}-eval-opt-orchestrator*"
      },
      # VPC Network Interfaces
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
          "ec2:AssignPrivateIpAddresses",
          "ec2:UnassignPrivateIpAddresses"
        ]
        Resource = "*"
      },
      # Secrets Manager (for Supabase key)
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.supabase_key_secret_name}*"
      },
      # Bedrock (for AI model invocation)
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*"
      },
      # Self-invocation for async processing
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = "arn:aws:lambda:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-${var.environment}-eval-opt-orchestrator"
      }
    ]
  })
}

# =============================================================================
# API GATEWAY INTEGRATION
# =============================================================================

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.opt_orchestrator.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}

# API Gateway integration
resource "aws_apigatewayv2_integration" "opt_orchestrator" {
  api_id             = var.api_gateway_id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.opt_orchestrator.invoke_arn
  integration_method = "POST"
  
  payload_format_version = "2.0"
}

# =============================================================================
# API GATEWAY ROUTES
# =============================================================================

# POST /api/workspaces/{wsId}/optimization/runs
resource "aws_apigatewayv2_route" "create_run" {
  api_id    = var.api_gateway_id
  route_key = "POST /api/workspaces/{wsId}/optimization/runs"
  target    = "integrations/${aws_apigatewayv2_integration.opt_orchestrator.id}"
  
  authorization_type = "CUSTOM"
  authorizer_id      = var.authorizer_id
}

# GET /api/workspaces/{wsId}/optimization/runs
resource "aws_apigatewayv2_route" "list_runs" {
  api_id    = var.api_gateway_id
  route_key = "GET /api/workspaces/{wsId}/optimization/runs"
  target    = "integrations/${aws_apigatewayv2_integration.opt_orchestrator.id}"
  
  authorization_type = "CUSTOM"
  authorizer_id      = var.authorizer_id
}

# GET /api/workspaces/{wsId}/optimization/runs/{runId}
resource "aws_apigatewayv2_route" "get_run" {
  api_id    = var.api_gateway_id
  route_key = "GET /api/workspaces/{wsId}/optimization/runs/{runId}"
  target    = "integrations/${aws_apigatewayv2_integration.opt_orchestrator.id}"
  
  authorization_type = "CUSTOM"
  authorizer_id      = var.authorizer_id
}

# GET /api/workspaces/{wsId}/optimization/runs/{runId}/results
resource "aws_apigatewayv2_route" "get_run_results" {
  api_id    = var.api_gateway_id
  route_key = "GET /api/workspaces/{wsId}/optimization/runs/{runId}/results"
  target    = "integrations/${aws_apigatewayv2_integration.opt_orchestrator.id}"
  
  authorization_type = "CUSTOM"
  authorizer_id      = var.authorizer_id
}

# DELETE /api/workspaces/{wsId}/optimization/runs/{runId}
resource "aws_apigatewayv2_route" "delete_run" {
  api_id    = var.api_gateway_id
  route_key = "DELETE /api/workspaces/{wsId}/optimization/runs/{runId}"
  target    = "integrations/${aws_apigatewayv2_integration.opt_orchestrator.id}"
  
  authorization_type = "CUSTOM"
  authorizer_id      = var.authorizer_id
}

# =============================================================================
# CLOUDWATCH LOG GROUP
# =============================================================================

resource "aws_cloudwatch_log_group" "opt_orchestrator" {
  name              = "/aws/lambda/${aws_lambda_function.opt_orchestrator.function_name}"
  retention_in_days = var.log_retention_days
  
  tags = var.tags
}