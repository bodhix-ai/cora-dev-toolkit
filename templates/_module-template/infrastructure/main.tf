# =============================================================================
# Module: Main Infrastructure Resources
# =============================================================================
# Replace {module} and {entity} with your module and entity names
# =============================================================================

locals {
  module_name = "module-{name}"
  name_prefix = "${var.environment}-${var.project_name}-{name}"

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
# Lambda Function: Entity Handler
# =============================================================================

resource "aws_lambda_function" "entity" {
  function_name    = "${local.name_prefix}-entity"
  filename         = var.entity_lambda_zip
  source_code_hash = filebase64sha256(var.entity_lambda_zip)
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.13"
  role             = aws_iam_role.lambda.arn

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
    create_before_destroy = true
  }
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "entity_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.entity.function_name
  principal     = "apigateway.amazonaws.com"
}

# =============================================================================
# CloudWatch Alarms (Optional)
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "entity_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.name_prefix}-entity-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Alert when entity Lambda function has errors"

  dimensions = {
    FunctionName = aws_lambda_function.entity.function_name
  }

  alarm_actions = [var.sns_topic_arn]

  tags = local.default_tags
}
}
