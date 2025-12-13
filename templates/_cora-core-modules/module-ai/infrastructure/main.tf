# Module AI Infrastructure - Zip-Based Deployment
# Defines Lambda functions, shared layer, IAM roles, and CloudWatch resources
# Supports both ai-config-handler and provider Lambda functions with common-ai layer

locals {
  # Resource naming prefix
  prefix = "${var.project_name}-${var.environment}-${var.module_name}"

  # Common Lambda configuration
  lambda_timeout     = 300  # 5 minutes (required for validating ~105 models)
  lambda_memory_size = 512
  lambda_runtime     = "python3.11"

  # Merge common tags with module-specific tags
  tags = merge(var.common_tags, {
    Module = var.module_name
  })
}

# =============================================================================
# IAM Role for Lambda Functions (shared by both lambdas)
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
          "arn:aws:secretsmanager:${var.aws_region}:*:secret:/${var.project_name}/${var.environment}/ai-providers/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:*:parameter/${var.project_name}/${var.environment}/ai-providers/*"
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
          "bedrock:ListInferenceProfiles",
          "bedrock:GetFoundationModel"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:Converse"
        ]
        Resource = [
          "arn:aws:bedrock:*::foundation-model/*",
          "arn:aws:bedrock:*:*:inference-profile/*"
        ]
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
  name        = "/${var.project_name}/${var.environment}/ai-providers/aws-bedrock"
  description = "AWS Bedrock provider credentials for AI Enablement"
  type        = "SecureString"
  value       = jsonencode({
    use_iam_role = true
    region       = var.aws_region
  })

  tags = local.tags
}

# =============================================================================
# Lambda Layer - common-ai (shared by both Lambda functions)
# =============================================================================

resource "aws_lambda_layer_version" "common_ai" {
  layer_name          = "${local.prefix}-common-ai"
  description         = "Common AI utilities: models, types, validators for module-ai"
  s3_bucket           = var.lambda_bucket
  s3_key              = "layers/common-ai-layer.zip"
  compatible_runtimes = [local.lambda_runtime]

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# Lambda Function - ai-config-handler
# Handles platform and organization AI configuration management
# =============================================================================

resource "aws_lambda_function" "ai_config_handler" {
  function_name = "${local.prefix}-ai-config-handler"
  description   = "AI Configuration management (platform and org-level settings)"
  role          = aws_iam_role.lambda.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory_size
  publish       = true

  # Zip-based deployment from S3
  s3_bucket = var.lambda_bucket
  s3_key    = "lambdas/ai-config-handler.zip"

  # Attach shared layer
  layers = [
    aws_lambda_layer_version.common_ai.arn,
    var.org_common_layer_arn  # From module-access
  ]

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

resource "aws_lambda_alias" "ai_config_handler" {
  name             = "live"
  function_name    = aws_lambda_function.ai_config_handler.function_name
  function_version = aws_lambda_function.ai_config_handler.version
}

resource "aws_cloudwatch_log_group" "ai_config_handler" {
  name              = "/aws/lambda/${aws_lambda_function.ai_config_handler.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# =============================================================================
# Lambda Function - provider
# Handles AI provider and model management (CRUD, discovery, testing)
# =============================================================================

resource "aws_lambda_function" "provider" {
  function_name = "${local.prefix}-provider"
  description   = "AI Provider and Model management (CRUD, discovery, testing)"
  role          = aws_iam_role.lambda.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory_size
  publish       = true

  # Zip-based deployment from S3
  s3_bucket = var.lambda_bucket
  s3_key    = "lambdas/provider.zip"

  # Attach shared layer
  layers = [
    aws_lambda_layer_version.common_ai.arn,
    var.org_common_layer_arn  # From module-access
  ]

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

resource "aws_cloudwatch_metric_alarm" "ai_config_handler_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-ai-config-handler-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when ai-config-handler Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.ai_config_handler.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}

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
