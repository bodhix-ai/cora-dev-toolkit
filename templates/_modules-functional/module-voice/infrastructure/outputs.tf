# Voice Module - Terraform Outputs
# Outputs for API Gateway integration

output "voice_lambda_functions" {
  description = "Voice module Lambda function ARNs"
  value = var.module_voice_enabled ? {
    voice_sessions   = aws_lambda_function.voice_sessions[0].arn
    voice_configs    = aws_lambda_function.voice_configs[0].arn
  } : {}
}

output "api_routes" {
  description = "API routes for voice module (for APIGW integration)"
  value = var.module_voice_enabled ? [
    # Sessions routes
    {
      method      = "GET"
      path        = "/api/voice/sessions"
      integration = aws_lambda_function.voice_sessions[0].invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/api/voice/sessions/{id}"
      integration = aws_lambda_function.voice_sessions[0].invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/api/voice/sessions"
      integration = aws_lambda_function.voice_sessions[0].invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/api/voice/sessions/{id}"
      integration = aws_lambda_function.voice_sessions[0].invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/api/voice/sessions/{id}"
      integration = aws_lambda_function.voice_sessions[0].invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/api/voice/sessions/{id}/start"
      integration = aws_lambda_function.voice_sessions[0].invoke_arn
      public      = false
    },
    # Configs routes
    {
      method      = "GET"
      path        = "/api/voice/configs"
      integration = aws_lambda_function.voice_configs[0].invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/api/voice/configs/{id}"
      integration = aws_lambda_function.voice_configs[0].invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/api/voice/configs"
      integration = aws_lambda_function.voice_configs[0].invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/api/voice/configs/{id}"
      integration = aws_lambda_function.voice_configs[0].invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/api/voice/configs/{id}"
      integration = aws_lambda_function.voice_configs[0].invoke_arn
      public      = false
    }
  ] : []
}

output "voice_s3_bucket_arn" {
  description = "S3 bucket ARN for transcript storage"
  value       = var.module_voice_enabled && var.transcript_s3_bucket == "" ? aws_s3_bucket.transcripts[0].arn : ""
}

output "voice_sqs_queue_url" {
  description = "SQS queue URL for standby bot pool"
  value       = var.module_voice_enabled ? aws_sqs_queue.standby_pool[0].url : ""
}
