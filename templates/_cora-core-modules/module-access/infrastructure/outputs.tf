# Org-Module Infrastructure - Outputs

# =============================================================================
# Lambda Functions
# =============================================================================

output "lambda_function_arns" {
  description = "ARNs of all Lambda functions in org-module"
  value = {
    identities_management = aws_lambda_function.identities_management.arn
    idp_config            = aws_lambda_function.idp_config.arn
    profiles              = aws_lambda_function.profiles.arn
    orgs                  = aws_lambda_function.orgs.arn
    members               = aws_lambda_function.members.arn
    org_email_domains     = aws_lambda_function.org_email_domains.arn
  }
}

output "lambda_function_names" {
  description = "Names of all Lambda functions in org-module"
  value = {
    identities_management = aws_lambda_function.identities_management.function_name
    idp_config            = aws_lambda_function.idp_config.function_name
    profiles              = aws_lambda_function.profiles.function_name
    orgs                  = aws_lambda_function.orgs.function_name
    members               = aws_lambda_function.members.function_name
    org_email_domains     = aws_lambda_function.org_email_domains.function_name
  }
}

output "lambda_invoke_arns" {
  description = "Invoke ARNs for API Gateway integration"
  value = {
    identities_management = aws_lambda_function.identities_management.invoke_arn
    idp_config            = aws_lambda_function.idp_config.invoke_arn
    profiles              = aws_lambda_function.profiles.invoke_arn
    orgs                  = aws_lambda_function.orgs.invoke_arn
    members               = aws_lambda_function.members.invoke_arn
    org_email_domains     = aws_lambda_function.org_email_domains.invoke_arn
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
# Lambda Layer
# =============================================================================

output "layer_arn" {
  description = "Lambda layer ARN for org-common utilities"
  value       = aws_lambda_layer_version.org_common.arn
}

output "layer_version" {
  description = "Lambda layer version number"
  value       = aws_lambda_layer_version.org_common.version
}

# =============================================================================
# API Routes for API Gateway Integration
# =============================================================================

output "api_routes" {
  description = "API Gateway routes to be added to main API Gateway"
  value = [
    # identities-management endpoints
    {
      method      = "POST"
      path        = "/identities/provision"
      integration = aws_lambda_function.identities_management.invoke_arn
      public      = false
    },
    # profiles endpoints
    {
      method      = "GET"
      path        = "/profiles/me"
      integration = aws_lambda_function.profiles.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/profiles/me"
      integration = aws_lambda_function.profiles.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/profiles/me/login"
      integration = aws_lambda_function.profiles.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/profiles/me/logout"
      integration = aws_lambda_function.profiles.invoke_arn
      public      = false
    },
    # orgs endpoints
    {
      method      = "GET"
      path        = "/orgs"
      integration = aws_lambda_function.orgs.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/orgs"
      integration = aws_lambda_function.orgs.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/orgs/{id}"
      integration = aws_lambda_function.orgs.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/orgs/{id}"
      integration = aws_lambda_function.orgs.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/orgs/{id}"
      integration = aws_lambda_function.orgs.invoke_arn
      public      = false
    },
    # members endpoints
    {
      method      = "GET"
      path        = "/orgs/{orgId}/members"
      integration = aws_lambda_function.members.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/orgs/{orgId}/members"
      integration = aws_lambda_function.members.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/orgs/{orgId}/members/{memberId}"
      integration = aws_lambda_function.members.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/orgs/{orgId}/members/{memberId}"
      integration = aws_lambda_function.members.invoke_arn
      public      = false
    },
    # idp-config endpoints (admin routes)
    {
      method      = "GET"
      path        = "/admin/idp-config"
      integration = aws_lambda_function.idp_config.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/admin/idp-config/{providerType}"
      integration = aws_lambda_function.idp_config.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/admin/idp-config/{providerType}/activate"
      integration = aws_lambda_function.idp_config.invoke_arn
      public      = false
    },
    # org-email-domains endpoints
    {
      method      = "GET"
      path        = "/orgs/{id}/email-domains"
      integration = aws_lambda_function.org_email_domains.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/orgs/{id}/email-domains"
      integration = aws_lambda_function.org_email_domains.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/orgs/{id}/email-domains/{domainId}"
      integration = aws_lambda_function.org_email_domains.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/orgs/{id}/email-domains/{domainId}"
      integration = aws_lambda_function.org_email_domains.invoke_arn
      public      = false
    }
  ]
}
