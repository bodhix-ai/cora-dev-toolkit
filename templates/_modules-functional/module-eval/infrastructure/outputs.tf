# Module Eval Infrastructure - Outputs

# =============================================================================
# Lambda Functions
# =============================================================================

output "lambda_function_arns" {
  description = "ARNs of all Lambda functions in module-eval"
  value = {
    eval_config    = aws_lambda_function.eval_config.arn
    eval_processor = aws_lambda_function.eval_processor.arn
    eval_results   = aws_lambda_function.eval_results.arn
  }
}

output "lambda_function_names" {
  description = "Names of all Lambda functions in module-eval"
  value = {
    eval_config    = aws_lambda_function.eval_config.function_name
    eval_processor = aws_lambda_function.eval_processor.function_name
    eval_results   = aws_lambda_function.eval_results.function_name
  }
}

output "lambda_invoke_arns" {
  description = "Invoke ARNs for API Gateway integration"
  value = {
    eval_config    = aws_lambda_function.eval_config.invoke_arn
    eval_processor = aws_lambda_function.eval_processor.invoke_arn
    eval_results   = aws_lambda_function.eval_results.invoke_arn
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
# SQS Queues
# =============================================================================

output "sqs_queue_url" {
  description = "URL of the eval processor SQS queue"
  value       = aws_sqs_queue.eval_processor.url
}

output "sqs_queue_arn" {
  description = "ARN of the eval processor SQS queue"
  value       = aws_sqs_queue.eval_processor.arn
}

output "sqs_dlq_url" {
  description = "URL of the eval processor dead letter queue"
  value       = aws_sqs_queue.eval_processor_dlq.url
}

output "sqs_dlq_arn" {
  description = "ARN of the eval processor dead letter queue"
  value       = aws_sqs_queue.eval_processor_dlq.arn
}

# =============================================================================
# S3 Export Bucket
# =============================================================================

output "export_bucket_name" {
  description = "Name of the S3 export bucket (if created)"
  value       = var.create_export_bucket ? aws_s3_bucket.exports[0].bucket : var.export_bucket_name
}

output "export_bucket_arn" {
  description = "ARN of the S3 export bucket (if created)"
  value       = var.create_export_bucket ? aws_s3_bucket.exports[0].arn : var.export_bucket_arn
}

# =============================================================================
# API Routes for API Gateway Integration
# =============================================================================

output "api_routes" {
  description = "API Gateway routes to be added to main API Gateway"
  value = [
    # =========================================================================
    # eval-config: System Admin Config Routes
    # =========================================================================
    {
      method      = "GET"
      path        = "/admin/sys/eval/config"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/admin/sys/eval/config"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },

    # =========================================================================
    # eval-config: System Admin Status Options
    # =========================================================================
    {
      method      = "GET"
      path        = "/admin/sys/eval/status-options"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/sys/eval/status-options"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/admin/sys/eval/status-options/{id}"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/admin/sys/eval/status-options/{id}"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },

    # =========================================================================
    # eval-config: System Admin Prompts
    # =========================================================================
    {
      method      = "GET"
      path        = "/admin/sys/eval/prompts"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/admin/sys/eval/prompts/{type}"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/sys/eval/prompts/{type}/test"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },

    # =========================================================================
    # eval-config: System Admin Delegation
    # =========================================================================
    {
      method      = "GET"
      path        = "/admin/sys/eval/orgs"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/admin/sys/eval/orgs/{orgId}/delegation"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },

    # =========================================================================
    # eval-config: Org Admin Config Routes
    # =========================================================================
    {
      method      = "GET"
      path        = "/admin/org/eval/config"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/admin/org/eval/config"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },

    # =========================================================================
    # eval-config: Org Admin Status Options
    # =========================================================================
    {
      method      = "GET"
      path        = "/admin/org/eval/status-options"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/org/eval/status-options"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/admin/org/eval/status-options/{id}"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/admin/org/eval/status-options/{id}"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },

    # =========================================================================
    # eval-config: Org Admin Prompts
    # =========================================================================
    {
      method      = "GET"
      path        = "/admin/org/eval/prompts"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/admin/org/eval/prompts/{type}"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/org/eval/prompts/{type}/test"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },

    # =========================================================================
    # eval-config: Doc Types
    # =========================================================================
    {
      method      = "GET"
      path        = "/admin/org/eval/doc-types"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/org/eval/doc-types"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/admin/org/eval/doc-types/{id}"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/admin/org/eval/doc-types/{id}"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/admin/org/eval/doc-types/{id}"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },

    # =========================================================================
    # eval-config: Criteria Sets
    # =========================================================================
    {
      method      = "GET"
      path        = "/admin/org/eval/criteria-sets"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/org/eval/criteria-sets"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/admin/org/eval/criteria-sets/{id}"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/admin/org/eval/criteria-sets/{id}"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/admin/org/eval/criteria-sets/{id}"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/org/eval/criteria-sets/import"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },

    # =========================================================================
    # eval-config: Criteria Items
    # =========================================================================
    {
      method      = "GET"
      path        = "/admin/org/eval/criteria-sets/{id}/items"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/org/eval/criteria-sets/{id}/items"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/admin/org/eval/criteria-items/{id}"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/admin/org/eval/criteria-items/{id}"
      integration = aws_lambda_function.eval_config.invoke_arn
      public      = false
    },

    # =========================================================================
    # eval-results: Evaluation CRUD
    # =========================================================================
    {
      method      = "POST"
      path        = "/workspaces/{wsId}/eval"
      integration = aws_lambda_function.eval_results.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/workspaces/{wsId}/eval"
      integration = aws_lambda_function.eval_results.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/workspaces/{wsId}/eval/{id}"
      integration = aws_lambda_function.eval_results.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/workspaces/{wsId}/eval/{id}/status"
      integration = aws_lambda_function.eval_results.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/workspaces/{wsId}/eval/{id}"
      integration = aws_lambda_function.eval_results.invoke_arn
      public      = false
    },

    # =========================================================================
    # eval-results: Result Editing
    # =========================================================================
    {
      method      = "PATCH"
      path        = "/workspaces/{wsId}/eval/{id}/results/{resultId}"
      integration = aws_lambda_function.eval_results.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/workspaces/{wsId}/eval/{id}/results/{resultId}/history"
      integration = aws_lambda_function.eval_results.invoke_arn
      public      = false
    },

    # =========================================================================
    # eval-results: Export
    # =========================================================================
    {
      method      = "GET"
      path        = "/workspaces/{wsId}/eval/{id}/export/pdf"
      integration = aws_lambda_function.eval_results.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/workspaces/{wsId}/eval/{id}/export/xlsx"
      integration = aws_lambda_function.eval_results.invoke_arn
      public      = false
    }
  ]
}
