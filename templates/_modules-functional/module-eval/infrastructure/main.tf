# Module Eval Infrastructure - Local Zip-Based Deployment
# Defines Lambda functions, IAM roles, SQS queue, and CloudWatch log groups
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

  # Config Lambda configuration (handles many routes, needs more memory)
  config_timeout     = 60
  config_memory_size = 512

  # Processor Lambda configuration (long-running async processing)
  processor_timeout     = 900  # 15 minutes for evaluation processing
  processor_memory_size = 1024

  # Results Lambda configuration (includes PDF/XLSX generation)
  results_timeout     = 120  # 2 minutes for exports
  results_memory_size = 1024

  # Merge common tags with module-specific tags
  tags = merge(var.common_tags, {
    Module = var.module_name
  })
}

# =============================================================================
# SQS Queue for Async Processing
# =============================================================================

resource "aws_sqs_queue" "eval_processor" {
  name                       = "${local.prefix}-processor-queue"
  visibility_timeout_seconds = local.processor_timeout + 60  # Lambda timeout + buffer
  message_retention_seconds  = 86400  # 1 day
  receive_wait_time_seconds  = 20     # Long polling
  
  # Enable content-based deduplication if using FIFO
  # fifo_queue = false

  tags = local.tags
}

# Dead Letter Queue for failed messages
resource "aws_sqs_queue" "eval_processor_dlq" {
  name                      = "${local.prefix}-processor-dlq"
  message_retention_seconds = 604800  # 7 days

  tags = local.tags
}

# DLQ redrive policy
resource "aws_sqs_queue_redrive_policy" "eval_processor" {
  queue_url = aws_sqs_queue.eval_processor.id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.eval_processor_dlq.arn
    maxReceiveCount     = 3
  })
}

# =============================================================================
# S3 Bucket for Export Files (Optional - use existing bucket if provided)
# =============================================================================

resource "aws_s3_bucket" "exports" {
  count  = var.create_export_bucket ? 1 : 0
  bucket = "${local.prefix}-exports"

  tags = local.tags
}

resource "aws_s3_bucket_lifecycle_configuration" "exports" {
  count  = var.create_export_bucket ? 1 : 0
  bucket = aws_s3_bucket.exports[0].id

  rule {
    id     = "expire-exports"
    status = "Enabled"

    filter {
      prefix = ""  # Apply to all objects in bucket
    }

    expiration {
      days = 7  # Auto-delete exports after 7 days
    }
  }
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

# Policy for SQS access
resource "aws_iam_role_policy" "sqs" {
  name = "${local.prefix}-sqs-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueUrl"
        ]
        Resource = aws_sqs_queue.eval_processor.arn
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.eval_processor.arn
      }
    ]
  })
}

# Policy for S3 access (exports)
resource "aws_iam_role_policy" "s3" {
  name = "${local.prefix}-s3-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject",
        "s3:GetObject"
      ]
      Resource = var.create_export_bucket ? "${aws_s3_bucket.exports[0].arn}/*" : "${var.export_bucket_arn}/*"
    }]
  })
}

# Policy for Bedrock access (for AI calls)
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
# Lambda Function - eval-config
# =============================================================================
# Handles configuration, doc types, criteria sets, status options

resource "aws_lambda_function" "eval_config" {
  function_name = "${local.prefix}-eval-config"
  description   = "MODULE-EVAL: Configuration, doc types, criteria sets, status options"
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  role          = aws_iam_role.lambda.arn
  timeout       = local.config_timeout
  memory_size   = local.config_memory_size
  publish       = true

  # Local zip-based deployment
  filename         = "${local.build_dir}/eval-config.zip"
  source_code_hash = filebase64sha256("${local.build_dir}/eval-config.zip")

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

resource "aws_lambda_alias" "eval_config" {
  name             = "live"
  function_name    = aws_lambda_function.eval_config.function_name
  function_version = aws_lambda_function.eval_config.version
}

resource "aws_cloudwatch_log_group" "eval_config" {
  name              = "/aws/lambda/${aws_lambda_function.eval_config.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# =============================================================================
# Lambda Function - eval-processor
# =============================================================================
# Handles async evaluation processing triggered by SQS

resource "aws_lambda_function" "eval_processor" {
  function_name = "${local.prefix}-eval-processor"
  description   = "MODULE-EVAL: Async evaluation processing (SQS triggered)"
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  role          = aws_iam_role.lambda.arn
  timeout       = local.processor_timeout
  memory_size   = local.processor_memory_size
  publish       = true

  # Local zip-based deployment
  filename         = "${local.build_dir}/eval-processor.zip"
  source_code_hash = filebase64sha256("${local.build_dir}/eval-processor.zip")

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

resource "aws_lambda_alias" "eval_processor" {
  name             = "live"
  function_name    = aws_lambda_function.eval_processor.function_name
  function_version = aws_lambda_function.eval_processor.version
}

resource "aws_cloudwatch_log_group" "eval_processor" {
  name              = "/aws/lambda/${aws_lambda_function.eval_processor.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# SQS trigger for eval-processor
resource "aws_lambda_event_source_mapping" "eval_processor_sqs" {
  event_source_arn = aws_sqs_queue.eval_processor.arn
  function_name    = aws_lambda_function.eval_processor.arn
  batch_size       = 1  # Process one evaluation at a time

  # Enable partial batch response for better error handling
  function_response_types = ["ReportBatchItemFailures"]
}

# =============================================================================
# Lambda Function - eval-results
# =============================================================================
# Handles evaluation CRUD, result editing, and exports

resource "aws_lambda_function" "eval_results" {
  function_name = "${local.prefix}-eval-results"
  description   = "MODULE-EVAL: Evaluation CRUD, result editing, PDF/XLSX export"
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  role          = aws_iam_role.lambda.arn
  timeout       = local.results_timeout
  memory_size   = local.results_memory_size
  publish       = true

  # Local zip-based deployment
  filename         = "${local.build_dir}/eval-results.zip"
  source_code_hash = filebase64sha256("${local.build_dir}/eval-results.zip")

  layers = [var.org_common_layer_arn]

  environment {
    variables = {
      REGION                   = var.aws_region
      SUPABASE_SECRET_ARN      = var.supabase_secret_arn
      EVAL_PROCESSOR_QUEUE_URL = aws_sqs_queue.eval_processor.url
      EXPORT_BUCKET            = var.create_export_bucket ? aws_s3_bucket.exports[0].bucket : var.export_bucket_name
      LOG_LEVEL                = var.log_level
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

resource "aws_lambda_alias" "eval_results" {
  name             = "live"
  function_name    = aws_lambda_function.eval_results.function_name
  function_version = aws_lambda_function.eval_results.version
}

resource "aws_cloudwatch_log_group" "eval_results" {
  name              = "/aws/lambda/${aws_lambda_function.eval_results.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# =============================================================================
# CloudWatch Alarms (Optional - only if SNS topic provided)
# =============================================================================

# Alarm for eval-config errors
resource "aws_cloudwatch_metric_alarm" "eval_config_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-eval-config-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when eval-config Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.eval_config.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}

# Alarm for eval-processor errors
resource "aws_cloudwatch_metric_alarm" "eval_processor_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-eval-processor-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 3
  alarm_description   = "Alert when eval-processor Lambda has >3 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.eval_processor.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}

# Alarm for eval-results errors
resource "aws_cloudwatch_metric_alarm" "eval_results_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-eval-results-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when eval-results Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.eval_results.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}

# Alarm for DLQ messages (failed processing)
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when evaluation processing fails (messages in DLQ)"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.eval_processor_dlq.name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}
