# Voice Module - Terraform Outputs
# Outputs for API Gateway integration

output "voice_lambda_functions" {
  description = "Voice module Lambda function ARNs"
  value = var.module_voice_enabled ? {
    voice_sessions     = aws_lambda_function.voice_sessions[0].arn
    voice_configs      = aws_lambda_function.voice_configs[0].arn
    voice_credentials  = aws_lambda_function.voice_credentials[0].arn
    voice_analytics    = aws_lambda_function.voice_analytics[0].arn
    voice_transcripts  = aws_lambda_function.voice_transcripts[0].arn
    voice_websocket    = aws_lambda_function.voice_websocket[0].arn
  } : {}
}

output "api_routes" {
  description = "API routes for voice module (for APIGW integration)"
  value = var.module_voice_enabled ? concat(
    # =============================================================================
    # DATA API ROUTES - Voice Sessions
    # =============================================================================
    [
      {
        method      = "GET"
        path        = "/voice/sessions"
        integration = aws_lambda_function.voice_sessions[0].invoke_arn
        public      = false
      },
      {
        method      = "GET"
        path        = "/voice/sessions/{sessionId}"
        integration = aws_lambda_function.voice_sessions[0].invoke_arn
        public      = false
      },
      {
        method      = "POST"
        path        = "/voice/sessions"
        integration = aws_lambda_function.voice_sessions[0].invoke_arn
        public      = false
      },
      {
        method      = "PUT"
        path        = "/voice/sessions/{sessionId}"
        integration = aws_lambda_function.voice_sessions[0].invoke_arn
        public      = false
      },
      {
        method      = "DELETE"
        path        = "/voice/sessions/{sessionId}"
        integration = aws_lambda_function.voice_sessions[0].invoke_arn
        public      = false
      },
      {
        method      = "POST"
        path        = "/voice/sessions/{sessionId}/start"
        integration = aws_lambda_function.voice_sessions[0].invoke_arn
        public      = false
      },
      {
        method      = "GET"
        path        = "/voice/sessions/{sessionId}/kbs"
        integration = aws_lambda_function.voice_sessions[0].invoke_arn
        public      = false
      },
      {
        method      = "POST"
        path        = "/voice/sessions/{sessionId}/kbs"
        integration = aws_lambda_function.voice_sessions[0].invoke_arn
        public      = false
      },
      {
        method      = "PUT"
        path        = "/voice/sessions/{sessionId}/kbs/{kbId}"
        integration = aws_lambda_function.voice_sessions[0].invoke_arn
        public      = false
      },
      {
        method      = "DELETE"
        path        = "/voice/sessions/{sessionId}/kbs/{kbId}"
        integration = aws_lambda_function.voice_sessions[0].invoke_arn
        public      = false
      },
    ],
    # =============================================================================
    # DATA API ROUTES - Voice Configs
    # =============================================================================
    [
      {
        method      = "GET"
        path        = "/voice/configs"
        integration = aws_lambda_function.voice_configs[0].invoke_arn
        public      = false
      },
      {
        method      = "GET"
        path        = "/voice/configs/{configId}"
        integration = aws_lambda_function.voice_configs[0].invoke_arn
        public      = false
      },
      {
        method      = "POST"
        path        = "/voice/configs"
        integration = aws_lambda_function.voice_configs[0].invoke_arn
        public      = false
      },
      {
        method      = "PUT"
        path        = "/voice/configs/{configId}"
        integration = aws_lambda_function.voice_configs[0].invoke_arn
        public      = false
      },
      {
        method      = "DELETE"
        path        = "/voice/configs/{configId}"
        integration = aws_lambda_function.voice_configs[0].invoke_arn
        public      = false
      },
    ],
    # =============================================================================
    # DATA API ROUTES - Voice Credentials
    # =============================================================================
    [
      {
        method      = "GET"
        path        = "/voice/credentials"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
      {
        method      = "GET"
        path        = "/voice/credentials/{credentialId}"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
      {
        method      = "POST"
        path        = "/voice/credentials"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
      {
        method      = "PUT"
        path        = "/voice/credentials/{credentialId}"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
      {
        method      = "DELETE"
        path        = "/voice/credentials/{credentialId}"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
    ],
    # =============================================================================
    # ADMIN ROUTES - System Admin (Credentials)
    # =============================================================================
    [
      {
        method      = "GET"
        path        = "/admin/sys/voice/credentials"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
      {
        method      = "GET"
        path        = "/admin/sys/voice/credentials/{credentialId}"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
      {
        method      = "POST"
        path        = "/admin/sys/voice/credentials"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
      {
        method      = "PUT"
        path        = "/admin/sys/voice/credentials/{credentialId}"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
      {
        method      = "DELETE"
        path        = "/admin/sys/voice/credentials/{credentialId}"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
      {
        method      = "POST"
        path        = "/admin/sys/voice/credentials/{credentialId}/validate"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
    ],
    # =============================================================================
    # ADMIN ROUTES - Organization Admin (Credentials)
    # =============================================================================
    [
      {
        method      = "GET"
        path        = "/admin/org/voice/credentials"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
      {
        method      = "GET"
        path        = "/admin/org/voice/credentials/{credentialId}"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
      {
        method      = "POST"
        path        = "/admin/org/voice/credentials"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
      {
        method      = "PUT"
        path        = "/admin/org/voice/credentials/{credentialId}"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
      {
        method      = "DELETE"
        path        = "/admin/org/voice/credentials/{credentialId}"
        integration = aws_lambda_function.voice_credentials[0].invoke_arn
        public      = false
      },
    ],
    # =============================================================================
    # ADMIN ROUTES - Organization Admin (Configs)
    # =============================================================================
    [
      {
        method      = "GET"
        path        = "/admin/org/voice/configs"
        integration = aws_lambda_function.voice_configs[0].invoke_arn
        public      = false
      },
      {
        method      = "GET"
        path        = "/admin/org/voice/configs/{configId}"
        integration = aws_lambda_function.voice_configs[0].invoke_arn
        public      = false
      },
      {
        method      = "POST"
        path        = "/admin/org/voice/configs"
        integration = aws_lambda_function.voice_configs[0].invoke_arn
        public      = false
      },
      {
        method      = "PUT"
        path        = "/admin/org/voice/configs/{configId}"
        integration = aws_lambda_function.voice_configs[0].invoke_arn
        public      = false
      },
      {
        method      = "DELETE"
        path        = "/admin/org/voice/configs/{configId}"
        integration = aws_lambda_function.voice_configs[0].invoke_arn
        public      = false
      },
    ]
  ) : []
}

output "voice_s3_bucket_arn" {
  description = "S3 bucket ARN for transcript storage"
  value       = var.module_voice_enabled && var.transcript_s3_bucket == "" ? aws_s3_bucket.transcripts[0].arn : ""
}

output "voice_sqs_queue_url" {
  description = "SQS queue URL for standby bot pool"
  value       = var.module_voice_enabled ? aws_sqs_queue.standby_pool[0].url : ""
}