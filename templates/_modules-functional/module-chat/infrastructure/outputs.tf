# Module Chat Infrastructure - Outputs

# =============================================================================
# Lambda Functions
# =============================================================================

output "lambda_function_arns" {
  description = "ARNs of all Lambda functions in module-chat"
  value = {
    chat_session = aws_lambda_function.chat_session.arn
    chat_message = aws_lambda_function.chat_message.arn
    chat_stream  = aws_lambda_function.chat_stream.arn
  }
}

output "lambda_function_names" {
  description = "Names of all Lambda functions in module-chat"
  value = {
    chat_session = aws_lambda_function.chat_session.function_name
    chat_message = aws_lambda_function.chat_message.function_name
    chat_stream  = aws_lambda_function.chat_stream.function_name
  }
}

output "lambda_invoke_arns" {
  description = "Invoke ARNs for API Gateway integration"
  value = {
    chat_session = aws_lambda_function.chat_session.invoke_arn
    chat_message = aws_lambda_function.chat_message.invoke_arn
    chat_stream  = aws_lambda_function.chat_stream.invoke_arn
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
# API Routes for API Gateway Integration
# =============================================================================

output "api_routes" {
  description = "API Gateway routes to be added to main API Gateway"
  value = [
    # =========================================================================
    # chat-session endpoints - Workspace Scoped
    # =========================================================================
    {
      method      = "GET"
      path        = "/workspaces/{workspaceId}/chats"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/workspaces/{workspaceId}/chats"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/workspaces/{workspaceId}/chats/{sessionId}"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/workspaces/{workspaceId}/chats/{sessionId}"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/workspaces/{workspaceId}/chats/{sessionId}"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },

    # =========================================================================
    # chat-session endpoints - User Level
    # =========================================================================
    {
      method      = "GET"
      path        = "/users/me/chats"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/users/me/chats"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/chats/{sessionId}"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },
    {
      method      = "PATCH"
      path        = "/chats/{sessionId}"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/chats/{sessionId}"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },

    # =========================================================================
    # chat-session endpoints - KB Grounding
    # =========================================================================
    {
      method      = "GET"
      path        = "/chats/{sessionId}/kbs"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/chats/{sessionId}/kbs"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/chats/{sessionId}/kbs/{kbId}"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },

    # =========================================================================
    # chat-session endpoints - Sharing
    # =========================================================================
    {
      method      = "GET"
      path        = "/chats/{sessionId}/shares"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/chats/{sessionId}/shares"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/chats/{sessionId}/shares/{shareId}"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },

    # =========================================================================
    # chat-session endpoints - Favorites
    # =========================================================================
    {
      method      = "POST"
      path        = "/chats/{sessionId}/favorite"
      integration = aws_lambda_function.chat_session.invoke_arn
      public      = false
    },

    # =========================================================================
    # chat-message endpoints - Messages
    # =========================================================================
    {
      method      = "GET"
      path        = "/chats/{sessionId}/messages"
      integration = aws_lambda_function.chat_message.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/chats/{sessionId}/messages"
      integration = aws_lambda_function.chat_message.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/chats/{sessionId}/messages/{messageId}"
      integration = aws_lambda_function.chat_message.invoke_arn
      public      = false
    },

    # =========================================================================
    # chat-message endpoints - Context
    # =========================================================================
    {
      method      = "POST"
      path        = "/chats/{sessionId}/context"
      integration = aws_lambda_function.chat_message.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/chats/{sessionId}/history"
      integration = aws_lambda_function.chat_message.invoke_arn
      public      = false
    },

    # =========================================================================
    # chat-stream endpoints - Streaming AI Response
    # =========================================================================
    {
      method      = "POST"
      path        = "/chats/{sessionId}/stream"
      integration = aws_lambda_function.chat_stream.invoke_arn
      public      = false
    }
  ]
}
