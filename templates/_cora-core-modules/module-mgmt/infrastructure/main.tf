# Local variables for resource naming
locals {
  function_name = "${var.project_name}-${var.environment}-${var.module_name}"
  
  merged_tags = merge(
    var.common_tags,
    {
      Module      = var.module_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}

# IAM role for Lambda execution
resource "aws_iam_role" "lambda_mgmt" {
  name               = "${local.function_name}-role"
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

  tags = local.merged_tags
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_mgmt.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# IAM policy for EventBridge management
resource "aws_iam_policy" "eventbridge_management" {
  name        = "${local.function_name}-eventbridge-policy"
  description = "Allows Lambda management module to manage EventBridge rules"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
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
      }
    ]
  })

  tags = local.merged_tags
}

resource "aws_iam_role_policy_attachment" "eventbridge_management" {
  role       = aws_iam_role.lambda_mgmt.name
  policy_arn = aws_iam_policy.eventbridge_management.arn
}

# IAM policy for Lambda function listing
resource "aws_iam_policy" "lambda_listing" {
  name        = "${local.function_name}-lambda-list-policy"
  description = "Allows Lambda management module to list Lambda functions"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:ListFunctions",
          "lambda:GetFunction",
          "lambda:GetFunctionConfiguration"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.merged_tags
}

resource "aws_iam_role_policy_attachment" "lambda_listing" {
  role       = aws_iam_role.lambda_mgmt.name
  policy_arn = aws_iam_policy.lambda_listing.arn
}

# IAM policy for Secrets Manager access
resource "aws_iam_policy" "secrets_manager" {
  name        = "${local.function_name}-secrets-policy"
  description = "Allows Lambda management module to read Supabase credentials"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = var.supabase_secret_arn
      }
    ]
  })

  tags = local.merged_tags
}

resource "aws_iam_role_policy_attachment" "secrets_manager" {
  role       = aws_iam_role.lambda_mgmt.name
  policy_arn = aws_iam_policy.secrets_manager.arn
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda_mgmt" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 14

  tags = local.merged_tags
}

# Lambda function
resource "aws_lambda_function" "lambda_mgmt" {
  function_name = local.function_name
  role          = aws_iam_role.lambda_mgmt.arn
  package_type  = "Image"
  image_uri     = var.lambda_image_uri
  
  timeout     = 30
  memory_size = 256

  environment {
    variables = {
      LOG_LEVEL           = var.log_level
      ENVIRONMENT         = var.environment
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

  tags = local.merged_tags
}

# Lambda alias for stable endpoint
resource "aws_lambda_alias" "lambda_mgmt" {
  name             = "live"
  function_name    = aws_lambda_function.lambda_mgmt.function_name
  function_version = aws_lambda_function.lambda_mgmt.version
}
