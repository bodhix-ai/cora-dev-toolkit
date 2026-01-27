# Module-KB Infrastructure - Outputs

# =============================================================================
# Lambda Functions
# =============================================================================

output "lambda_function_arns" {
  description = "ARNs of all Lambda functions in module-kb"
  value = {
    kb_base      = aws_lambda_function.kb_base.arn
    kb_document  = aws_lambda_function.kb_document.arn
    kb_processor = aws_lambda_function.kb_processor.arn
  }
}

output "lambda_function_names" {
  description = "Names of all Lambda functions in module-kb"
  value = {
    kb_base      = aws_lambda_function.kb_base.function_name
    kb_document  = aws_lambda_function.kb_document.function_name
    kb_processor = aws_lambda_function.kb_processor.function_name
  }
}

output "lambda_invoke_arns" {
  description = "Invoke ARNs for API Gateway integration"
  value = {
    kb_base      = aws_lambda_function.kb_base.invoke_arn
    kb_document  = aws_lambda_function.kb_document.invoke_arn
    kb_processor = aws_lambda_function.kb_processor.invoke_arn
  }
}

# =============================================================================
# IAM Role
# =============================================================================

output "iam_role_arn" {
  description = "IAM role ARN for Lambda functions"
  value       = aws_iam_role.lambda.arn
}

output "iam_role_name" {
  description = "IAM role name for Lambda functions"
  value       = aws_iam_role.lambda.name
}

# =============================================================================
# S3 Bucket
# =============================================================================

output "s3_bucket_name" {
  description = "S3 bucket name for document storage"
  value       = aws_s3_bucket.kb_documents.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN for document storage"
  value       = aws_s3_bucket.kb_documents.arn
}

# =============================================================================
# SQS Queues
# =============================================================================

output "sqs_queue_url" {
  description = "SQS queue URL for document processing"
  value       = aws_sqs_queue.kb_processor.url
}

output "sqs_queue_arn" {
  description = "SQS queue ARN for document processing"
  value       = aws_sqs_queue.kb_processor.arn
}

output "sqs_dlq_url" {
  description = "SQS DLQ URL for failed message processing"
  value       = aws_sqs_queue.kb_processor_dlq.url
}

output "sqs_dlq_arn" {
  description = "SQS DLQ ARN for failed message processing"
  value       = aws_sqs_queue.kb_processor_dlq.arn
}

# =============================================================================
# API Routes for API Gateway Integration
# =============================================================================

output "api_routes" {
  description = "API Gateway routes to be added to main API Gateway"
  value = [
    # kb-base: Workspace-scoped KB routes
    {
      method      = "GET"
      path        = "/ws/{wsId}/kb"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/ws/{wsId}/kb"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/ws/{wsId}/kb/{kbId}"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/ws/{wsId}/available-kbs"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/ws/{wsId}/kbs/{kbId}/toggle"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    # kb-base: Chat-scoped KB routes
    {
      method      = "GET"
      path        = "/chats/{chatId}/kb"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/chats/{chatId}/kb"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/chats/{chatId}/available-kbs"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/chats/{chatId}/kbs/{kbId}/toggle"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    # kb-base: Org admin routes
    {
      method      = "GET"
      path        = "/admin/org/kbs"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/org/kbs"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/admin/org/kbs/{kbId}"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/admin/org/kbs/{kbId}"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/admin/org/kbs/{kbId}"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    # kb-base: Platform admin routes
    {
      method      = "GET"
      path        = "/admin/sys/kbs"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/sys/kbs"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/admin/sys/kbs/{kbId}"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/admin/sys/kbs/{kbId}"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/admin/sys/kbs/{kbId}"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/sys/kbs/{kbId}/orgs"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/admin/sys/kbs/{kbId}/orgs/{orgId}"
      integration = aws_lambda_function.kb_base.invoke_arn
      public      = false
    },
    # kb-document: Workspace-scoped document routes
    {
      method      = "GET"
      path        = "/ws/{wsId}/kb/documents"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/ws/{wsId}/kb/documents"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/ws/{wsId}/kb/documents/{docId}"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/ws/{wsId}/kb/documents/{docId}"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/ws/{wsId}/kb/documents/{docId}/download"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/ws/{wsId}/kb/documents/{docId}/complete"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    # kb-document: Chat-scoped document routes
    {
      method      = "GET"
      path        = "/chats/{chatId}/kb/documents"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/chats/{chatId}/kb/documents"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/chats/{chatId}/kb/documents/{docId}"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/chats/{chatId}/kb/documents/{docId}"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/chats/{chatId}/kb/documents/{docId}/complete"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    # kb-document: Org admin document routes
    {
      method      = "POST"
      path        = "/admin/org/kbs/{kbId}/documents"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/admin/org/kbs/{kbId}/documents"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/admin/org/kbs/{kbId}/documents/{docId}"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/admin/org/kbs/{kbId}/documents/{docId}/complete"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    # kb-document: Platform admin document routes
    {
      method      = "POST"
      path        = "/admin/sys/kbs/{kbId}/documents"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/admin/sys/kbs/{kbId}/documents"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/admin/sys/kbs/{kbId}/documents/{docId}/complete"
      integration = aws_lambda_function.kb_document.invoke_arn
      public      = false
    }
  ]
}
