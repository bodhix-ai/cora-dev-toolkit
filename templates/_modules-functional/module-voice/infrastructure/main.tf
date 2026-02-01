# Voice Module - Main Terraform Configuration
# Lambda functions, IAM, S3, and SQS resources

terraform {
  required_version = ">= 1.5.0"
}

locals {
  module_name = "voice"
  lambda_prefix = "${var.project_name}-${var.environment}-voice"
  
  common_tags = merge(var.common_tags, {
    Module      = "voice"
    Environment = var.environment
  })
}

# =============================================================================
# IAM ROLE FOR LAMBDA FUNCTIONS
# =============================================================================

resource "aws_iam_role" "voice_lambda_role" {
  count = var.module_voice_enabled ? 1 : 0
  
  name = "${local.lambda_prefix}-lambda-role"
  
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
  
  tags = local.common_tags
}

resource "aws_iam_role_policy" "voice_lambda_policy" {
  count = var.module_voice_enabled ? 1 : 0
  
  name = "${local.lambda_prefix}-lambda-policy"
  role = aws_iam_role.voice_lambda_role[0].id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = compact([
          var.supabase_secret_arn,
          var.daily_api_key_secret_arn,
          var.deepgram_api_key_secret_arn,
          var.cartesia_api_key_secret_arn
        ])
      },
      {
        # Voice credentials Lambda needs to manage secrets for platform/org voice credentials
        Effect = "Allow"
        Action = [
          "secretsmanager:CreateSecret",
          "secretsmanager:PutSecretValue",
          "secretsmanager:DeleteSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:TagResource"
        ]
        Resource = "arn:aws:secretsmanager:*:*:secret:voice/*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:RunTask",
          "ecs:StopTask",
          "ecs:DescribeTasks"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ecs:cluster" = var.ecs_cluster_name != "" ? "arn:aws:ecs:*:*:cluster/${var.ecs_cluster_name}" : "none"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = var.ecs_task_role_arn != "" ? var.ecs_task_role_arn : "arn:aws:iam::*:role/none"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = var.transcript_s3_bucket != "" ? "arn:aws:s3:::${var.transcript_s3_bucket}/*" : (
          var.module_voice_enabled ? "${aws_s3_bucket.transcripts[0].arn}/*" : "arn:aws:s3:::none/*"
        )
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage"
        ]
        Resource = var.module_voice_enabled ? aws_sqs_queue.standby_pool[0].arn : "arn:aws:sqs:*:*:none"
      }
    ]
  })
}

# =============================================================================
# LAMBDA FUNCTIONS
# =============================================================================

# Voice Sessions Lambda
resource "aws_lambda_function" "voice_sessions" {
  count = var.module_voice_enabled ? 1 : 0
  
  function_name = "${local.lambda_prefix}-sessions"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = var.module_voice_lambda_timeout
  memory_size   = var.module_voice_lambda_memory
  
  filename         = "${path.module}/../backend/.build/voice-sessions.zip"
  source_code_hash = filebase64sha256("${path.module}/../backend/.build/voice-sessions.zip")
  
  role = aws_iam_role.voice_lambda_role[0].arn
  
  layers = compact([
    var.org_common_layer_arn,
    var.ai_common_layer_arn
  ])
  
  environment {
    variables = {
      SUPABASE_SECRET_ARN         = var.supabase_secret_arn
      ENVIRONMENT                 = var.environment
      ECS_CLUSTER_NAME            = var.ecs_cluster_name
      ECS_TASK_DEFINITION_ARN     = var.ecs_task_definition_arn
      ECS_SUBNETS                 = join(",", var.ecs_subnets)
      ECS_SECURITY_GROUPS         = join(",", var.ecs_security_groups)
      DAILY_API_KEY_SECRET_ARN    = var.daily_api_key_secret_arn
      TRANSCRIPT_S3_BUCKET        = var.transcript_s3_bucket != "" ? var.transcript_s3_bucket : (var.module_voice_enabled ? aws_s3_bucket.transcripts[0].bucket : "")
      STANDBY_SQS_QUEUE_URL       = var.module_voice_enabled ? aws_sqs_queue.standby_pool[0].url : ""
      WEBSOCKET_API_URL           = var.websocket_api_url
    }
  }
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = local.common_tags
}

# Voice Configs Lambda
resource "aws_lambda_function" "voice_configs" {
  count = var.module_voice_enabled ? 1 : 0
  
  function_name = "${local.lambda_prefix}-configs"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = var.module_voice_lambda_timeout
  memory_size   = 256
  
  filename         = "${path.module}/../backend/.build/voice-configs.zip"
  source_code_hash = filebase64sha256("${path.module}/../backend/.build/voice-configs.zip")
  
  role = aws_iam_role.voice_lambda_role[0].arn
  
  layers = [var.org_common_layer_arn]
  
  environment {
    variables = {
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      ENVIRONMENT         = var.environment
    }
  }
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = local.common_tags
}

# Voice Analytics Lambda
resource "aws_lambda_function" "voice_analytics" {
  count = var.module_voice_enabled ? 1 : 0
  
  function_name = "${local.lambda_prefix}-analytics"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = var.module_voice_lambda_timeout
  memory_size   = 256
  
  filename         = "${path.module}/../backend/.build/voice-analytics.zip"
  source_code_hash = filebase64sha256("${path.module}/../backend/.build/voice-analytics.zip")
  
  role = aws_iam_role.voice_lambda_role[0].arn
  
  layers = [var.org_common_layer_arn]
  
  environment {
    variables = {
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      ENVIRONMENT         = var.environment
    }
  }
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = local.common_tags
}

# Voice Credentials Lambda
resource "aws_lambda_function" "voice_credentials" {
  count = var.module_voice_enabled ? 1 : 0
  
  function_name = "${local.lambda_prefix}-credentials"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = var.module_voice_lambda_timeout
  memory_size   = 256
  
  filename         = "${path.module}/../backend/.build/voice-credentials.zip"
  source_code_hash = filebase64sha256("${path.module}/../backend/.build/voice-credentials.zip")
  
  role = aws_iam_role.voice_lambda_role[0].arn
  
  layers = [var.org_common_layer_arn]
  
  environment {
    variables = {
      SUPABASE_SECRET_ARN         = var.supabase_secret_arn
      ENVIRONMENT                 = var.environment
      DEEPGRAM_API_KEY_SECRET_ARN = var.deepgram_api_key_secret_arn
      CARTESIA_API_KEY_SECRET_ARN = var.cartesia_api_key_secret_arn
    }
  }
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = local.common_tags
}

# Voice Transcripts Lambda
resource "aws_lambda_function" "voice_transcripts" {
  count = var.module_voice_enabled ? 1 : 0
  
  function_name = "${local.lambda_prefix}-transcripts"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = var.module_voice_lambda_timeout
  memory_size   = 512
  
  filename         = "${path.module}/../backend/.build/voice-transcripts.zip"
  source_code_hash = filebase64sha256("${path.module}/../backend/.build/voice-transcripts.zip")
  
  role = aws_iam_role.voice_lambda_role[0].arn
  
  layers = compact([
    var.org_common_layer_arn,
    var.ai_common_layer_arn
  ])
  
  environment {
    variables = {
      SUPABASE_SECRET_ARN         = var.supabase_secret_arn
      ENVIRONMENT                 = var.environment
      TRANSCRIPT_S3_BUCKET        = var.transcript_s3_bucket != "" ? var.transcript_s3_bucket : (var.module_voice_enabled ? aws_s3_bucket.transcripts[0].bucket : "")
      DEEPGRAM_API_KEY_SECRET_ARN = var.deepgram_api_key_secret_arn
    }
  }
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = local.common_tags
}

# Voice WebSocket Lambda
resource "aws_lambda_function" "voice_websocket" {
  count = var.module_voice_enabled ? 1 : 0
  
  function_name = "${local.lambda_prefix}-websocket"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = 300
  memory_size   = 512
  
  filename         = "${path.module}/../backend/.build/voice-websocket.zip"
  source_code_hash = filebase64sha256("${path.module}/../backend/.build/voice-websocket.zip")
  
  role = aws_iam_role.voice_lambda_role[0].arn
  
  layers = compact([
    var.org_common_layer_arn,
    var.ai_common_layer_arn
  ])
  
  environment {
    variables = {
      SUPABASE_SECRET_ARN         = var.supabase_secret_arn
      ENVIRONMENT                 = var.environment
      ECS_CLUSTER_NAME            = var.ecs_cluster_name
      WEBSOCKET_API_URL           = var.websocket_api_url
      DEEPGRAM_API_KEY_SECRET_ARN = var.deepgram_api_key_secret_arn
    }
  }
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = local.common_tags
}

# =============================================================================
# S3 BUCKET FOR TRANSCRIPTS
# =============================================================================

resource "aws_s3_bucket" "transcripts" {
  count = var.module_voice_enabled && var.transcript_s3_bucket == "" ? 1 : 0
  
  bucket = "${var.project_name}-${var.environment}-voice-transcripts"
  
  tags = local.common_tags
}

resource "aws_s3_bucket_lifecycle_configuration" "transcripts" {
  count  = var.module_voice_enabled && var.transcript_s3_bucket == "" ? 1 : 0
  bucket = aws_s3_bucket.transcripts[0].id
  
  rule {
    id     = "archive-old-transcripts"
    status = "Enabled"
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    expiration {
      days = 365
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "transcripts" {
  count  = var.module_voice_enabled && var.transcript_s3_bucket == "" ? 1 : 0
  bucket = aws_s3_bucket.transcripts[0].id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# =============================================================================
# SQS QUEUE FOR STANDBY BOT POOL
# =============================================================================

resource "aws_sqs_queue" "standby_pool" {
  count = var.module_voice_enabled ? 1 : 0
  
  name                       = "${local.lambda_prefix}-standby-pool"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 3600
  
  tags = local.common_tags
}
