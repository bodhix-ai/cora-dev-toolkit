# =============================================================================
# Module-WS: Main Infrastructure Resources
# =============================================================================

locals {
  module_name = "module-ws"
  name_prefix = "${var.environment}-${var.project_name}-ws"

  default_tags = merge(var.common_tags, {
    Module      = local.module_name
    Environment = var.environment
    Project     = var.project_name
  })
}

# =============================================================================
# IAM Role for Lambda Functions
# =============================================================================

resource "aws_iam_role" "lambda" {
  name = "${local.name_prefix}-lambda-role"

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

  tags = local.default_tags
}

# Basic Lambda execution policy (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Secrets Manager access for Supabase credentials
resource "aws_iam_role_policy" "secrets" {
  name = "${local.name_prefix}-secrets"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = [
        var.supabase_secret_arn
      ]
    }]
  })
}

# =============================================================================
# Lambda Function: Workspace Handler
# =============================================================================

resource "aws_lambda_function" "workspace" {
  function_name = "${local.name_prefix}-workspace"
  filename      = var.workspace_lambda_zip
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.13"
  role          = aws_iam_role.lambda.arn

  layers = [var.org_common_layer_arn]

  environment {
    variables = {
      ENVIRONMENT         = var.environment
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      LOG_LEVEL           = var.log_level
    }
  }

  timeout     = var.lambda_timeout
  memory_size = var.lambda_memory_size

  tags = local.default_tags

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash
    ]
  }
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "workspace_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.workspace.function_name
  principal     = "apigateway.amazonaws.com"
}

# =============================================================================
# Lambda Function: Cleanup Handler
# =============================================================================

resource "aws_lambda_function" "cleanup" {
  count = var.enable_cleanup_job ? 1 : 0

  function_name = "${local.name_prefix}-cleanup"
  filename      = var.cleanup_lambda_zip
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.13"
  role          = aws_iam_role.lambda.arn

  layers = [var.org_common_layer_arn]

  environment {
    variables = {
      ENVIRONMENT         = var.environment
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      LOG_LEVEL           = var.log_level
    }
  }

  timeout     = 60 # Cleanup may take longer
  memory_size = var.lambda_memory_size

  tags = local.default_tags

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash
    ]
  }
}

# =============================================================================
# EventBridge Rule: Daily Cleanup Schedule
# =============================================================================

resource "aws_cloudwatch_event_rule" "cleanup_schedule" {
  count = var.enable_cleanup_job ? 1 : 0

  name                = "${local.name_prefix}-cleanup-schedule"
  description         = "Daily trigger for workspace cleanup job"
  schedule_expression = var.cleanup_schedule

  tags = local.default_tags
}

resource "aws_cloudwatch_event_target" "cleanup_lambda" {
  count = var.enable_cleanup_job ? 1 : 0

  rule      = aws_cloudwatch_event_rule.cleanup_schedule[0].name
  target_id = "WorkspaceCleanupLambda"
  arn       = aws_lambda_function.cleanup[0].arn
}

resource "aws_lambda_permission" "cleanup_eventbridge" {
  count = var.enable_cleanup_job ? 1 : 0

  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cleanup[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cleanup_schedule[0].arn
}

# =============================================================================
# CloudWatch Alarms (Optional)
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "workspace_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.name_prefix}-workspace-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Alert when workspace Lambda function has errors"

  dimensions = {
    FunctionName = aws_lambda_function.workspace.function_name
  }

  alarm_actions = [var.sns_topic_arn]

  tags = local.default_tags
}

resource "aws_cloudwatch_metric_alarm" "cleanup_errors" {
  count = var.sns_topic_arn != "" && var.enable_cleanup_job ? 1 : 0

  alarm_name          = "${local.name_prefix}-cleanup-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "Alert when cleanup Lambda function has errors"

  dimensions = {
    FunctionName = aws_lambda_function.cleanup[0].function_name
  }

  alarm_actions = [var.sns_topic_arn]

  tags = local.default_tags
}
