# Voice Module - Terraform Outputs
# Outputs for API Gateway integration

output "voice_lambda_functions" {
  description = "Voice module Lambda function ARNs"
  value = var.module_voice_enabled ? {
    voice_sessions   = aws_lambda_function.voice_sessions[0].arn
    voice_configs    = aws_lambda_function.voice_configs[0].arn
  } : {}
}

output "voice_api_routes" {
  description = "API routes for voice module (for APIGW integration)"
  value = var.module_voice_enabled ? [
    # Sessions routes
    {
      method      = "GET"
      path        = "/api/voice/sessions"
      lambda_name = "voice-sessions"
      description = "List voice sessions"
    },
    {
      method      = "GET"
      path        = "/api/voice/sessions/{id}"
      lambda_name = "voice-sessions"
      description = "Get voice session by ID"
    },
    {
      method      = "POST"
      path        = "/api/voice/sessions"
      lambda_name = "voice-sessions"
      description = "Create voice session"
    },
    {
      method      = "PUT"
      path        = "/api/voice/sessions/{id}"
      lambda_name = "voice-sessions"
      description = "Update voice session"
    },
    {
      method      = "DELETE"
      path        = "/api/voice/sessions/{id}"
      lambda_name = "voice-sessions"
      description = "Delete voice session"
    },
    {
      method      = "POST"
      path        = "/api/voice/sessions/{id}/start"
      lambda_name = "voice-sessions"
      description = "Start bot for voice session"
    },
    # Configs routes
    {
      method      = "GET"
      path        = "/api/voice/configs"
      lambda_name = "voice-configs"
      description = "List voice configs"
    },
    {
      method      = "GET"
      path        = "/api/voice/configs/{id}"
      lambda_name = "voice-configs"
      description = "Get voice config by ID"
    },
    {
      method      = "POST"
      path        = "/api/voice/configs"
      lambda_name = "voice-configs"
      description = "Create voice config"
    },
    {
      method      = "PUT"
      path        = "/api/voice/configs/{id}"
      lambda_name = "voice-configs"
      description = "Update voice config"
    },
    {
      method      = "DELETE"
      path        = "/api/voice/configs/{id}"
      lambda_name = "voice-configs"
      description = "Delete voice config"
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
