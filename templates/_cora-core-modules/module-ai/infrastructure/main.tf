# AI Enablement Module Infrastructure - Core Resources
# Defines Lambda function, IAM role, and CloudWatch resources for ai-enablement-module

locals {
  # Resource naming prefix
  prefix = "${var.project_name}-${var.environment}-${var.module_name}"

  # Common Lambda configuration
  lambda_timeout     = 300  # 5 minutes (required for validating ~105 models)
  lambda_memory_size = 512

  # Merge common tags with module-specific tags
  tags = merge(var.common_tags, {
    Module = var.module_name
  })
}

# =============================================================================
# IAM Role for Lambda Function
# =============================================================================

resource "aws_iam_role" "lambda" {
  name               = "${local.prefix}-lambda-role"
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
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Policy for Secrets Manager access
resource "aws_iam_role_policy" "secrets" {
  name = "${local.prefix}-secrets-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          var.supabase_secret_arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:*:secret:/${project}/${var.environment}/ai-providers/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:*:parameter/${project}/${var.environment}/ai-providers/*"
        ]
      }
    ]
  })
}

# Policy for Bedrock access (model discovery and testing)
resource "aws_iam_role_policy" "bedrock" {
  name = "${local.prefix}-bedrock-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = "arn:aws:bedrock:*::foundation-model/*"
      }
    ]
  })
}

# Policy for Lambda self-invocation (async validation worker)
resource "aws_iam_role_policy" "lambda_invoke" {
  name = "${local.prefix}-lambda-invoke"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = aws_lambda_function.provider.arn
      }
    ]
  })
}

# =============================================================================
# SSM Parameters for AI Provider Credentials
# =============================================================================

# AWS Bedrock provider credentials (uses IAM role authentication)
resource "aws_ssm_parameter" "bedrock_credentials" {
  name        = "/${project}/${var.environment}/ai-providers/aws-bedrock"
  description = "AWS Bedrock provider credentials for AI Enablement"
  type        = "SecureString"
  value       = jsonencode({
    use_iam_role = true
    region       = var.aws_region
  })

  tags = local.tags
}

# =============================================================================
# Lambda Function - provider
# =============================================================================

resource "aws_lambda_function" "provider" {
  function_name = "${local.prefix}-provider"
  description   = "AI Provider and Model management (CRUD, discovery, testing)"
  package_type  = "Image"
  image_uri     = var.lambda_image_uri
  role          = aws_iam_role.lambda.arn
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory_size
  publish       = true

  environment {
    variables = {
      REGION              = var.aws_region
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      LOG_LEVEL           = var.log_level
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

resource "aws_lambda_alias" "provider" {
  name             = "live"
  function_name    = aws_lambda_function.provider.function_name
  function_version = aws_lambda_function.provider.version
}

resource "aws_cloudwatch_log_group" "provider" {
  name              = "/aws/lambda/${aws_lambda_function.provider.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# =============================================================================
# CloudWatch Alarms (Optional - only if SNS topic provided)
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "provider_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-provider-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when provider Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.provider.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}
