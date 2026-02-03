# Module-KB Infrastructure - Local Zip-Based Deployment
# Defines Lambda layer, functions, S3 bucket, SQS queue, IAM roles, and CloudWatch resources
# Uses local .build/ directory for Lambda artifacts

locals {
  # Resource naming prefix
  prefix = "${var.project_name}-${var.environment}-${var.module_name}"

  # Local build directory (relative to this infrastructure/ directory)
  build_dir = "${path.module}/../backend/.build"

  # Common Lambda configuration
  lambda_runtime = "python3.11"

  # Merge common tags with module-specific tags
  tags = merge(var.common_tags, {
    Module = var.module_name
  })
}

# =============================================================================
# Lambda Layer - org-common (Reused from module-access)
# =============================================================================

# Note: org-common layer is shared across modules and should be deployed by module-access
# This data source references the existing layer from module-access
data "aws_lambda_layer_version" "org_common" {
  layer_name = "${var.project_name}-${var.environment}-access-common"
}

# =============================================================================
# Lambda Layer - kb_common (Local zip-based)
# =============================================================================

resource "aws_lambda_layer_version" "kb_common" {
  layer_name          = "${local.prefix}-kb-common"
  description         = "KB module permissions helpers"
  filename            = "${local.build_dir}/kb_common-layer.zip"
  source_code_hash    = filebase64sha256("${local.build_dir}/kb_common-layer.zip")
  compatible_runtimes = [local.lambda_runtime]

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# S3 Bucket for Document Storage
# =============================================================================

resource "aws_s3_bucket" "kb_documents" {
  bucket = "${local.prefix}-documents"
  tags   = local.tags
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "kb_documents" {
  bucket = aws_s3_bucket.kb_documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning for document recovery
resource "aws_s3_bucket_versioning" "kb_documents" {
  bucket = aws_s3_bucket.kb_documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle policy: Delete soft-deleted documents after 30 days
resource "aws_s3_bucket_lifecycle_configuration" "kb_documents" {
  bucket = aws_s3_bucket.kb_documents.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "delete-incomplete-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# CORS configuration for presigned URL uploads from browser
resource "aws_s3_bucket_cors_configuration" "kb_documents" {
  bucket = aws_s3_bucket.kb_documents.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# =============================================================================
# SQS Queue for Async Document Processing
# =============================================================================

# Dead Letter Queue for failed processing
resource "aws_sqs_queue" "kb_processor_dlq" {
  name                      = "${local.prefix}-processor-dlq"
  message_retention_seconds = 1209600 # 14 days
  tags                      = local.tags
}

# Main processing queue
resource "aws_sqs_queue" "kb_processor" {
  name                       = "${local.prefix}-processor-queue"
  visibility_timeout_seconds = 600 # 10 minutes (2x Lambda timeout)
  message_retention_seconds  = 1209600 # 14 days
  receive_wait_time_seconds  = 20 # Long polling

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.kb_processor_dlq.arn
    maxReceiveCount     = 3 # Retry up to 3 times before DLQ
  })

  tags = local.tags
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

# Policy for Secrets Manager access (Supabase credentials)
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

# Policy for S3 access (document storage)
resource "aws_iam_role_policy" "s3" {
  name = "${local.prefix}-s3-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      Resource = [
        aws_s3_bucket.kb_documents.arn,
        "${aws_s3_bucket.kb_documents.arn}/*"
      ]
    }]
  })
}

# Policy for SQS access (document processing queue)
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
        Resource = [
          aws_sqs_queue.kb_processor.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          aws_sqs_queue.kb_processor.arn
        ]
      }
    ]
  })
}

# Policy for Bedrock access (embedding generation for kb-processor)
resource "aws_iam_role_policy" "bedrock" {
  name = "${local.prefix}-bedrock-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "bedrock:InvokeModel"
      ]
      Resource = [
        "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v2:0",
        "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v1",
        "arn:aws:bedrock:${var.aws_region}::foundation-model/*"
      ]
    }]
  })
}

# =============================================================================
# Lambda Function - kb-base
# =============================================================================

resource "aws_lambda_function" "kb_base" {
  function_name = "${local.prefix}-kb-base"
  description   = "CORE-KB: Knowledge base CRUD operations (GET/POST/PATCH /kb, /kbs, toggles)"
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  role          = aws_iam_role.lambda.arn
  timeout       = 30
  memory_size   = 512
  publish       = true

  # Local zip-based deployment
  filename         = "${local.build_dir}/kb-base.zip"
  source_code_hash = filebase64sha256("${local.build_dir}/kb-base.zip")

  layers = [
    data.aws_lambda_layer_version.org_common.arn,
    aws_lambda_layer_version.kb_common.arn
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

resource "aws_lambda_alias" "kb_base" {
  name             = "live"
  function_name    = aws_lambda_function.kb_base.function_name
  function_version = aws_lambda_function.kb_base.version
}

resource "aws_cloudwatch_log_group" "kb_base" {
  name              = "/aws/lambda/${aws_lambda_function.kb_base.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# =============================================================================
# Lambda Function - kb-document
# =============================================================================

resource "aws_lambda_function" "kb_document" {
  function_name = "${local.prefix}-kb-document"
  description   = "CORE-KB: Document upload/download with S3 presigned URLs (GET/POST/DELETE /documents)"
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  role          = aws_iam_role.lambda.arn
  timeout       = 30
  memory_size   = 256
  publish       = true

  # Local zip-based deployment
  filename         = "${local.build_dir}/kb-document.zip"
  source_code_hash = filebase64sha256("${local.build_dir}/kb-document.zip")

  layers = [
    data.aws_lambda_layer_version.org_common.arn,
    aws_lambda_layer_version.kb_common.arn
  ]

  environment {
    variables = {
      REGION              = var.aws_region
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      S3_BUCKET           = aws_s3_bucket.kb_documents.id
      SQS_QUEUE_URL       = aws_sqs_queue.kb_processor.url
      LOG_LEVEL           = var.log_level
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

resource "aws_lambda_alias" "kb_document" {
  name             = "live"
  function_name    = aws_lambda_function.kb_document.function_name
  function_version = aws_lambda_function.kb_document.version
}

resource "aws_cloudwatch_log_group" "kb_document" {
  name              = "/aws/lambda/${aws_lambda_function.kb_document.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# =============================================================================
# Lambda Function - kb-processor
# =============================================================================

resource "aws_lambda_function" "kb_processor" {
  function_name = "${local.prefix}-kb-processor"
  description   = "CORE-KB: Async document processing (parse, chunk, embed, index)"
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  role          = aws_iam_role.lambda.arn
  timeout       = 300 # 5 minutes for document processing
  memory_size   = 1024 # More memory for PDF parsing and embedding generation
  publish       = true

  # Local zip-based deployment
  filename         = "${local.build_dir}/kb-processor.zip"
  source_code_hash = filebase64sha256("${local.build_dir}/kb-processor.zip")

  layers = [data.aws_lambda_layer_version.org_common.arn]

  environment {
    variables = {
      REGION              = var.aws_region
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      S3_BUCKET           = aws_s3_bucket.kb_documents.id
      LOG_LEVEL           = var.log_level
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

resource "aws_lambda_alias" "kb_processor" {
  name             = "live"
  function_name    = aws_lambda_function.kb_processor.function_name
  function_version = aws_lambda_function.kb_processor.version
}

resource "aws_cloudwatch_log_group" "kb_processor" {
  name              = "/aws/lambda/${aws_lambda_function.kb_processor.function_name}"
  retention_in_days = 14
  tags              = local.tags
}

# SQS trigger for kb-processor Lambda
resource "aws_lambda_event_source_mapping" "kb_processor_sqs" {
  event_source_arn = aws_sqs_queue.kb_processor.arn
  function_name    = aws_lambda_function.kb_processor.arn
  batch_size       = 1 # Process one document at a time
  enabled          = true

  scaling_config {
    maximum_concurrency = 10 # Max 10 concurrent processing instances
  }
}

# =============================================================================
# CloudWatch Alarms (Optional - only if SNS topic provided)
# =============================================================================

# Alarm for kb-base errors
resource "aws_cloudwatch_metric_alarm" "kb_base_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-kb-base-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when kb-base Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.kb_base.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}

# Alarm for kb-document errors
resource "aws_cloudwatch_metric_alarm" "kb_document_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-kb-document-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when kb-document Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.kb_document.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}

# Alarm for kb-processor errors
resource "aws_cloudwatch_metric_alarm" "kb_processor_errors" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-kb-processor-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when kb-processor Lambda has >5 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.kb_processor.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}

# Alarm for SQS DLQ messages
resource "aws_cloudwatch_metric_alarm" "sqs_dlq_messages" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${local.prefix}-sqs-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "Alert when messages appear in kb-processor DLQ (failed processing)"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.kb_processor_dlq.name
  }

  alarm_actions = [var.sns_topic_arn]
  tags          = local.tags
}
