# Org-Module Infrastructure - Core Resources
# Defines Lambda layer, functions, IAM roles, and CloudWatch alarms for org-module

locals {
  # Resource naming prefix
  prefix = "${var.project_name}-${var.environment}-${var.module_name}"

  # Lambda build directory
  build_dir = "${path.module}/../backend/.build"

  # Common Lambda configuration
  lambda_runtime     = "python3.13"
  lambda_timeout     = 30
  lambda_memory_size = 256

  # Merge common tags with module-specific tags
  tags = merge(var.common_tags, {
    Module = var.module_name
  })
}

# =============================================================================
# Lambda Layer - org-common
# =============================================================================

resource "aws_lambda_layer_version" "org_common" {
  filename            = "${local.build_dir}/org-common-layer.zip"
  layer_name          = "${local.prefix}-common"
  description         = "Common utilities for org-module (Supabase client, DB helpers, validators)"
  compatible_runtimes = [local.lambda_runtime]
  source_code_hash    = filebase64sha256("${local.build_dir}/org-common-layer.zip")

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# IAM Role for Lambda Functions
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
# Lambda Function - identities-management
# =============================================================================

resource "aws_lambda_function" "identities_management" {
  filename         = "${local.build_dir}/identities-management.zip"
  function_name    = "${local.prefix}-identities-management"
  description      = "Identity provisioning - Okta to Supabase (POST /identities/provision)"
  handler          = "lambda_function.lambda_handler"
  runtime          = local.lambda_runtime
  role             = aws_iam_role.lambda.arn
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size
  source_code_hash = filebase64sha256("${local.build_dir}/identities-management.zip")

  layers = [aws_lambda_layer_version.org_common.arn]

  environment {
    variables = {
      REGION              = var.aws_region
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      LOG_LEVEL           = var.log_level
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "identities_management" {
  name              = "/aws/lambda/${aws_lambda_function.identities_management.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# =============================================================================
# Lambda Function - profiles
# =============================================================================

resource "aws_lambda_function" "profiles" {
  filename         = "${local.build_dir}/profiles.zip"
  function_name    = "${local.prefix}-profiles"
  description      = "User profile management (GET/PUT /profiles/me)"
  handler          = "lambda_function.lambda_handler"
  runtime          = local.lambda_runtime
  role             = aws_iam_role.lambda.arn
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size
  source_code_hash = filebase64sha256("${local.build_dir}/profiles.zip")

  layers = [aws_lambda_layer_version.org_common.arn]

  environment {
    variables = {
      REGION              = var.aws_region
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      LOG_LEVEL           = var.log_level
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "profiles" {
  name              = "/aws/lambda/${aws_lambda_function.profiles.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# =============================================================================
# Lambda Function - orgs
# =============================================================================

resource "aws_lambda_function" "orgs" {
  filename         = "${local.build_dir}/orgs.zip"
  function_name    = "${local.prefix}-orgs"
  description      = "Organization CRUD (GET/POST /orgs, GET/PUT/DELETE /orgs/:id)"
  handler          = "lambda_function.lambda_handler"
  runtime          = local.lambda_runtime
  role             = aws_iam_role.lambda.arn
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size
  source_code_hash = filebase64sha256("${local.build_dir}/orgs.zip")

  layers = [aws_lambda_layer_version.org_common.arn]

  environment {
    variables = {
      REGION              = var.aws_region
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      LOG_LEVEL           = var.log_level
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "orgs" {
  name              = "/aws/lambda/${aws_lambda_function.orgs.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# =============================================================================
# Lambda Function - members
# =============================================================================

resource "aws_lambda_function" "members" {
  filename         = "${local.build_dir}/members.zip"
  function_name    = "${local.prefix}-members"
  description      = "Membership management (GET/POST/PUT/DELETE /orgs/:id/members)"
  handler          = "lambda_function.lambda_handler"
  runtime          = local.lambda_runtime
  role             = aws_iam_role.lambda.arn
  timeout          = local.lambda_timeout
  memory_size      = local.lambda_memory_size
  source_code_hash = filebase64sha256("${local.build_dir}/members.zip")

  layers = [aws_lambda_layer_version.org_common.arn]

  environment {
    variables = {
      REGION              = var.aws_region
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      LOG_LEVEL           = var.log_level
    }
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "members" {
  name              = "/aws/lambda/${aws_lambda_function.members.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# =============================================================================
# CloudWatch Alarms (Optional - only if SNS topic provided)
# =============================================================================

# Alarm for identities-management errors
resource "aws_cloudwatch_metric_alarm" "identities_management_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-identities-management-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when identities-management Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.identities_management.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}

# Alarm for profiles errors
resource "aws_cloudwatch_metric_alarm" "profiles_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-profiles-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when profiles Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.profiles.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}

# Alarm for orgs errors
resource "aws_cloudwatch_metric_alarm" "orgs_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-orgs-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when orgs Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.orgs.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}

# Alarm for members errors
resource "aws_cloudwatch_metric_alarm" "members_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-members-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when members Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.members.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}
