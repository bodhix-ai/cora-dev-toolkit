output "lambda_function_arn" {
  description = "ARN of the Lambda management function"
  value       = aws_lambda_function.lambda_mgmt.arn
}

output "lambda_function_name" {
  description = "Name of the Lambda management function"
  value       = aws_lambda_function.lambda_mgmt.function_name
}

output "lambda_invoke_arn" {
  description = "Invoke ARN of the Lambda function (for API Gateway integration)"
  value       = aws_lambda_function.lambda_mgmt.invoke_arn
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_mgmt.arn
}

output "api_routes" {
  description = "API Gateway routes for this module (for modular gateway integration)"
  value = [
    {
      method      = "GET"
      path        = "/admin/sys/mgmt/lambda-config"
      integration = aws_lambda_function.lambda_mgmt.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/admin/sys/mgmt/lambda-config/{configKey}"
      integration = aws_lambda_function.lambda_mgmt.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/admin/sys/mgmt/lambda-config/{configKey}"
      integration = aws_lambda_function.lambda_mgmt.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/admin/sys/mgmt/lambda-functions"
      integration = aws_lambda_function.lambda_mgmt.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/sys/mgmt/lambda-config/sync"
      integration = aws_lambda_function.lambda_mgmt.invoke_arn
      public      = false
    },
    # Module registry routes
    {
      method      = "GET"
      path        = "/admin/sys/mgmt/modules"
      integration = aws_lambda_function.lambda_mgmt.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/admin/sys/mgmt/modules/{name}"
      integration = aws_lambda_function.lambda_mgmt.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/admin/sys/mgmt/modules/{name}"
      integration = aws_lambda_function.lambda_mgmt.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/sys/mgmt/modules/{name}/enable"
      integration = aws_lambda_function.lambda_mgmt.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/sys/mgmt/modules/{name}/disable"
      integration = aws_lambda_function.lambda_mgmt.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/sys/mgmt/modules"
      integration = aws_lambda_function.lambda_mgmt.invoke_arn
      public      = false
    }
  ]
}
