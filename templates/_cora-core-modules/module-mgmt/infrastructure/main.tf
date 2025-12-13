# Module Management Infrastructure - S3 Zip-Based Deployment
# Defines Lambda function, shared layer, IAM roles, and CloudWatch resources
# Standardized deployment pattern using S3 bucket for Lambda artifacts

locals {
  # Resource naming prefix
  prefix = "${var.project_name}-${var.environment}-${var.module_name}"

  # Common Lambda configuration
  lambda_runtime     = "python3.11"
  lambda_timeout     = 30
  lambda_memory_size = 256

  # Merge common tags with module-specific tags
  tags = merge(var.common_tags, {
    Module      = var.module_name
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

# =============================================================================
# Lambda Layer - lambda-mgmt-common (S3 zip-based)
# =============================================================================

resource "aws_lambda_layer_version" "lambda_mgmt_common" {
  layer_name          = "${local.prefix}-common"
  description         = "Common utilities for module-mgmt (EventBridge, scheduling helpers)"
  s3_bucket           = var.lambda_bucket
  s3_key              = "layers/lambda-mgmt-common-layer.zip"
  compatible_runtimes = [local.lambda_runtime]

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# IAM Role for Lambda Functions
# =============================================================================

resource "aws_iam_role" "lambda_mgmt" {
  name               = "${local.prefix}-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = local.tags
}

# Attach basic Lambda execution policy (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_mgmt.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# IAM policy for EventBridge management
resource "aws_iam_policy" "eventbridge_management" {
  name        = "${local.prefix}-eventbridge-policy"
  description = "Allows Lambda management module to manage EventBridge rules"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "events:PutRule",
        "events:DeleteRule",
        "events:DescribeRule",
        "events:EnableRule",
        "events:DisableRule",
        "events:ListRules",
        "events:PutTargets",
        "events:RemoveTargets",
        "events:ListTargetsByRule"
      ]
      Resource = "*"
    }]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "eventbridge_management" {
  role       = aws_iam_role.lambda_mgmt.name
  policy_arn = aws_iam_policy.eventbridge_management.arn
}

# IAM policy for Lambda function listing
resource "aws_iam_policy" "lambda_listing" {
  name        = "${local.prefix}-lambda-list-policy"
  description = "Allows Lambda management module to list Lambda functions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "lambda:ListFunctions",
        "lambda:GetFunction",
        "lambda:GetFunctionConfiguration"
      ]
      Resource = "*"
    }]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "lambda_listing" {
  role       = aws_iam_role.lambda_mgmt.name
  policy_arn = aws_iam_policy.lambda_listing.arn
}

# IAM policy for Secrets Manager access
resource "aws_iam_policy" "secrets_manager" {
  name        = "${local.prefix}-secrets-policy"
  description = "Allows Lambda management module to read Supabase credentials"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = var.supabase_secret_arn
    }]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "secrets_manager" {
  role       = aws_iam_role.lambda_mgmt.name
  policy_arn = aws_iam_policy.secrets_manager.arn
}

# =============================================================================
# CloudWatch Log Group
# =============================================================================

resource "aws_cloudwatch_log_group" "lambda_mgmt" {
  name              = "/aws/lambda/${local.prefix}-registry"
  retention_in_days = 14

  tags = local.tags
}

# =============================================================================
# Lambda Function - lambda-mgmt (S3 zip-based)
# =============================================================================

resource "aws_lambda_function" "lambda_mgmt" {
  function_name = "${local.prefix}-registry"
  description   = "Module management - registry and usage tracking"
  role          = aws_iam_role.lambda_mgmt.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory_size
  publish       = true

  # S3 zip-based deployment
  s3_bucket = var.lambda_bucket
  s3_key    = "lambdas/lambda-mgmt.zip"

  # Attach shared layer
  layers = [aws_lambda_layer_version.lambda_mgmt_common.arn]

  environment {
    variables = {
      LOG_LEVEL           = var.log_level
      ENVIRONMENT         = var.environment
      REGION              = var.aws_region
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_mgmt,
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.eventbridge_management,
    aws_iam_role_policy_attachment.lambda_listing,
    aws_iam_role_policy_attachment.secrets_manager
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

# Lambda alias for stable endpoint
resource "aws_lambda_alias" "lambda_mgmt" {
  name             = "live"
  function_name    = aws_lambda_function.lambda_mgmt.function_name
  function_version = aws_lambda_function.lambda_mgmt.version
}

# =============================================================================
# CloudWatch Alarms (Optional - only if SNS topic provided)
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "lambda_mgmt_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-registry-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when lambda-mgmt Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.lambda_mgmt.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}
