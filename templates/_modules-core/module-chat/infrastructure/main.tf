# Module Chat Infrastructure - Local Zip-Based Deployment
# Defines Lambda functions, IAM roles, and CloudWatch log groups
# Uses local .build/ directory for Lambda artifacts

locals {
  # Resource naming prefix
  prefix = "${var.project_name}-${var.environment}-${var.module_name}"

  # Local build directory (relative to this infrastructure/ directory)
  build_dir = "${path.module}/../backend/.build"

  # Common Lambda configuration
  lambda_runtime     = "python3.11"
  lambda_timeout     = 30
  lambda_memory_size = 512

  # Streaming Lambda configuration (chat-stream needs more resources)
  stream_timeout     = 300  # 5 minutes for streaming responses
  stream_memory_size = 1024

  # Merge common tags with module-specific tags
  tags = merge(var.common_tags, {
    Module = var.module_name
  })
}

# =============================================================================
# IAM Role for Lambda Functions
# =============================================================================

resource "aws_iam_role" "lambda" {
  name = "${local.prefix}-lambda-role"
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

# Policy for Bedrock access (for AI streaming)
resource "aws_iam_role_policy" "bedrock" {
  name = "${local.prefix}-bedrock-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ]
      Resource = "*"
    }]
  })
}

# =============================================================================
# Lambda Function - chat-session
# =============================================================================
# Handles session CRUD, KB grounding, sharing, and favorites

resource "aws_lambda_function" "chat_session" {
  function_name = "${local.prefix}-chat-session"
  description   = "MODULE-CHAT: Session CRUD, KB grounding, sharing, favorites"
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  role          = aws_iam_role.lambda.arn
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory_size
  publish       = true

  # Local zip-based deployment
  filename         = "${local.build_dir}/chat-session.zip"
  source_code_hash = filebase64sha256("${local.build_dir}/chat-session.zip")

  layers = [var.org_common_layer_arn]

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

resource "aws_lambda_alias" "chat_session" {
  name             = "live"
  function_name    = aws_lambda_function.chat_session.function_name
  function_version = aws_lambda_function.chat_session.version
}

resource "aws_cloudwatch_log_group" "chat_session" {
  name              = "/aws/lambda/${aws_lambda_function.chat_session.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# =============================================================================
# Lambda Function - chat-message
# =============================================================================
# Handles message CRUD and RAG context retrieval

resource "aws_lambda_function" "chat_message" {
  function_name = "${local.prefix}-chat-message"
  description   = "MODULE-CHAT: Message CRUD and RAG context retrieval"
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  role          = aws_iam_role.lambda.arn
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory_size
  publish       = true

  # Local zip-based deployment
  filename         = "${local.build_dir}/chat-message.zip"
  source_code_hash = filebase64sha256("${local.build_dir}/chat-message.zip")

  layers = [var.org_common_layer_arn]

  environment {
    variables = {
      REGION              = var.aws_region
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      OPENAI_API_KEY      = var.openai_api_key
      LOG_LEVEL           = var.log_level
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

resource "aws_lambda_alias" "chat_message" {
  name             = "live"
  function_name    = aws_lambda_function.chat_message.function_name
  function_version = aws_lambda_function.chat_message.version
}

resource "aws_cloudwatch_log_group" "chat_message" {
  name              = "/aws/lambda/${aws_lambda_function.chat_message.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# =============================================================================
# Lambda Function - chat-stream
# =============================================================================
# Handles AI response streaming with RAG grounding
# Uses Lambda Response Streaming for real-time token delivery

resource "aws_lambda_function" "chat_stream" {
  function_name = "${local.prefix}-chat-stream"
  description   = "MODULE-CHAT: AI response streaming with RAG grounding (SSE)"
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  role          = aws_iam_role.lambda.arn
  timeout       = local.stream_timeout  # 5 minutes for streaming
  memory_size   = local.stream_memory_size
  publish       = true

  # Local zip-based deployment
  filename         = "${local.build_dir}/chat-stream.zip"
  source_code_hash = filebase64sha256("${local.build_dir}/chat-stream.zip")

  layers = [var.org_common_layer_arn]

  environment {
    variables = {
      REGION              = var.aws_region
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      OPENAI_API_KEY      = var.openai_api_key
      ANTHROPIC_API_KEY   = var.anthropic_api_key
      LOG_LEVEL           = var.log_level
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

resource "aws_lambda_alias" "chat_stream" {
  name             = "live"
  function_name    = aws_lambda_function.chat_stream.function_name
  function_version = aws_lambda_function.chat_stream.version
}

resource "aws_cloudwatch_log_group" "chat_stream" {
  name              = "/aws/lambda/${aws_lambda_function.chat_stream.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# =============================================================================
# CloudWatch Alarms (Optional - only if SNS topic provided)
# =============================================================================

# Alarm for chat-session errors
resource "aws_cloudwatch_metric_alarm" "chat_session_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-chat-session-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when chat-session Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.chat_session.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}

# Alarm for chat-message errors
resource "aws_cloudwatch_metric_alarm" "chat_message_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-chat-message-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when chat-message Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.chat_message.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}

# Alarm for chat-stream errors
resource "aws_cloudwatch_metric_alarm" "chat_stream_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-chat-stream-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when chat-stream Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.chat_stream.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}
