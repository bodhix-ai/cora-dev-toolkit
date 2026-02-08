# Module: module-eval-optimizer
# Infrastructure for the Eval Optimization Workbench
#
# This module provides automated prompt optimization using RAG + LLM meta-prompting.
# Uses existing module-kb for document storage (NO new vector infrastructure).

terraform {
  required_version = ">= 1.5.0"
}

# =============================================================================
# LOCALS
# =============================================================================

locals {
  # Resource naming prefix
  prefix = "${var.project_name}-${var.environment}-${var.module_name}"

  # Local build directory (relative to this infrastructure/ directory)
  build_dir = "${path.module}/../backend/.build"

  # Merge common tags with module-specific tags
  tags = merge(var.common_tags, {
    Module = var.module_name
  })
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
  layer_name          = "${local.prefix}-common"
  description         = "FUNC-EVAL-OPT: Common Layer - permissions and shared utilities (ADR-019c)"
  
  filename            = "${local.build_dir}/eval_opt_common-layer.zip"
  source_code_hash    = filebase64sha256("${local.build_dir}/eval_opt_common-layer.zip")
  
  compatible_runtimes = ["python3.11"]
  
  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# LAMBDA: Optimization Orchestrator
# =============================================================================

resource "aws_lambda_function" "opt_orchestrator" {
  function_name    = "${local.prefix}-orchestrator"
  description      = "FUNC-EVAL-OPT: Orchestrator for prompt optimization"
  
  filename         = "${local.build_dir}/opt-orchestrator.zip"
  source_code_hash = filebase64sha256("${local.build_dir}/opt-orchestrator.zip")
  
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
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      REGION              = var.aws_region
    }
  }
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = local.tags
}

# =============================================================================
# IAM ROLE & POLICY
# =============================================================================

resource "aws_iam_role" "opt_orchestrator_role" {
  name = "${local.prefix}-orchestrator-role"
  
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
  
  tags = local.tags
}

resource "aws_iam_role_policy" "opt_orchestrator_policy" {
  name = "${local.prefix}-orchestrator-policy"
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
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.prefix}-orchestrator*"
      },
      # VPC Network Interfaces (if needed in future, but not currently)
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
        Resource = "${var.supabase_secret_arn}*"
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
        Resource = "arn:aws:lambda:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:function:${local.prefix}-orchestrator"
      }
    ]
  })
}

# =============================================================================
# CLOUDWATCH LOG GROUP
# =============================================================================

resource "aws_cloudwatch_log_group" "opt_orchestrator" {
  name              = "/aws/lambda/${aws_lambda_function.opt_orchestrator.function_name}"
  retention_in_days = 14
  
  tags = local.tags
}
