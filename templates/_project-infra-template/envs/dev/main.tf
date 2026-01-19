# {{PROJECT_NAME}}-infra - Development Environment
# Main Terraform configuration for CORA application infrastructure

# ========================================================================
# GitHub OIDC Role
# ========================================================================
# Enables GitHub Actions to assume AWS roles via OIDC (no long-lived credentials)

module "github_oidc_role" {
  source               = "../../modules/github-oidc-role"
  environment          = "dev"
  github_owner         = var.github_owner
  github_repo          = var.github_repo
  create_oidc_provider = true

  # Prefix scoping
  name_prefix            = "{{PROJECT_NAME}}-oidc"
  s3_bucket_prefix       = "{{PROJECT_NAME}}-"
  lambda_function_prefix = "{{PROJECT_NAME}}-"
  iam_role_prefix        = "{{PROJECT_NAME}}-"
}

# ========================================================================
# Secrets Management
# ========================================================================
# Centralized secrets for CORA modules

module "secrets" {
  source = "../../modules/secrets"

  name_prefix               = "{{PROJECT_NAME}}"
  environment               = "dev"
  supabase_url              = var.supabase_url
  supabase_anon_key         = var.supabase_anon_key_value
  supabase_service_role_key = var.supabase_service_role_key_value
  supabase_jwt_secret       = var.supabase_jwt_secret_value

  common_tags = {
    Environment = "dev"
    Project     = "{{PROJECT_NAME}}"
    ManagedBy   = "terraform"
  }
}

# ========================================================================
# API Gateway Lambda Authorizer
# ========================================================================
# Multi-provider JWT validation (Okta or Clerk)

# ========================================================================
# API Gateway Lambda Authorizer
# ========================================================================
# Multi-provider JWT validation (Okta or Clerk)
# Built with dependencies using: ../../lambdas/api-gateway-authorizer/build.sh

resource "aws_iam_role" "authorizer" {
  name = "{{PROJECT_NAME}}-${var.environment}-authorizer-role"

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

  tags = {
    Environment = var.environment
    Project     = "{{PROJECT_NAME}}"
    Component   = "authorizer"
    ManagedBy   = "terraform"
  }
}

resource "aws_iam_role_policy_attachment" "authorizer_basic" {
  role       = aws_iam_role.authorizer.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "authorizer" {
  filename         = "../../build/authorizer.zip"
  function_name    = "{{PROJECT_NAME}}-${var.environment}-api-gateway-authorizer"
  role             = aws_iam_role.authorizer.arn
  handler          = "lambda_function.lambda_handler"
  source_code_hash = filebase64sha256("../../build/authorizer.zip")
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256
  description      = "API Gateway JWT authorizer - validates tokens from Okta or Clerk"

  environment {
    variables = {
      PROVIDER       = var.auth_provider
      CLERK_ISSUER   = var.clerk_jwt_issuer
      CLERK_AUDIENCE = var.clerk_jwt_audience
      OKTA_ISSUER    = var.okta_issuer
      OKTA_AUDIENCE  = var.okta_audience
      LOG_LEVEL      = var.log_level
      ENVIRONMENT    = var.environment
    }
  }

  tags = {
    Environment = var.environment
    Project     = "{{PROJECT_NAME}}"
    Component   = "authorizer"
    ManagedBy   = "terraform"
  }
}

resource "aws_cloudwatch_log_group" "authorizer" {
  name              = "/aws/lambda/${aws_lambda_function.authorizer.function_name}"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Project     = "{{PROJECT_NAME}}"
    Component   = "authorizer"
    ManagedBy   = "terraform"
  }
}

# ========================================================================
# CORA Modules
# ========================================================================
# Add CORA modules from the stack repository here.
# Each module exports api_routes that are provisioned in modular_api_gateway.
#
# Example:
module "module_access" {
  source = "../../../{{PROJECT_NAME}}-stack/packages/module-access/infrastructure"

  project_name        = "{{PROJECT_NAME}}"
  environment         = "dev"
  module_name         = "access"
  supabase_secret_arn = module.secrets.supabase_secret_arn
  aws_region          = var.aws_region
  log_level           = var.log_level

  common_tags = {
    Environment = "dev"
    Project     = "{{PROJECT_NAME}}"
    ManagedBy   = "terraform"
    Module      = "module-access"
    ModuleType  = "CORA"
  }
}

module "module_ai" {
  source = "../../../{{PROJECT_NAME}}-stack/packages/module-ai/infrastructure"

  project_name         = "{{PROJECT_NAME}}"
  environment          = "dev"
  module_name          = "ai"
  org_common_layer_arn = module.module_access.layer_arn
  supabase_secret_arn  = module.secrets.supabase_secret_arn
  aws_region           = var.aws_region
  log_level            = var.log_level

  common_tags = {
    Environment = "dev"
    Project     = "{{PROJECT_NAME}}"
    ManagedBy   = "terraform"
    Module      = "module-ai"
    ModuleType  = "CORA"
  }
}

module "module_mgmt" {
  source = "../../../{{PROJECT_NAME}}-stack/packages/module-mgmt/infrastructure"

  project_name         = "{{PROJECT_NAME}}"
  environment          = "dev"
  module_name          = "mgmt"
  org_common_layer_arn = module.module_access.layer_arn
  supabase_secret_arn  = module.secrets.supabase_secret_arn
  aws_region           = var.aws_region
  log_level            = var.log_level

  common_tags = {
    Environment = "dev"
    Project     = "{{PROJECT_NAME}}"
    ManagedBy   = "terraform"
    Module      = "module-mgmt"
    ModuleType  = "CORA"
  }
}

module "module_kb" {
  source = "../../../{{PROJECT_NAME}}-stack/packages/module-kb/infrastructure"

  project_name         = "{{PROJECT_NAME}}"
  environment          = "dev"
  module_name          = "kb"
  org_common_layer_arn = module.module_access.layer_arn
  supabase_secret_arn  = module.secrets.supabase_secret_arn
  aws_region           = var.aws_region
  log_level            = var.log_level

  common_tags = {
    Environment = "dev"
    Project     = "{{PROJECT_NAME}}"
    ManagedBy   = "terraform"
    Module      = "module-kb"
    ModuleType  = "CORA"
  }
}

module "module_chat" {
  source = "../../../{{PROJECT_NAME}}-stack/packages/module-chat/infrastructure"

  project_name         = "{{PROJECT_NAME}}"
  environment          = "dev"
  module_name          = "chat"
  org_common_layer_arn = module.module_access.layer_arn
  supabase_secret_arn  = module.secrets.supabase_secret_arn
  aws_region           = var.aws_region
  log_level            = var.log_level

  common_tags = {
    Environment = "dev"
    Project     = "{{PROJECT_NAME}}"
    ManagedBy   = "terraform"
    Module      = "module-chat"
    ModuleType  = "CORA"
  }
}

# ========================================================================
# CORA Modular API Gateway
# ========================================================================
# Dynamically provisions routes from all CORA modules

module "modular_api_gateway" {
  source = "../../modules/modular-api-gateway"

  name_prefix = "{{PROJECT_NAME}}"
  environment = "dev"

  # Collect routes from all CORA modules
  # Core modules (always included per ADR-013):
  # - module_access (Tier 1)
  # - module_ai (Tier 2)
  # - module_mgmt (Tier 3)
  # - module_kb (Tier 3 - Core AI Capability)
  # - module_chat (Tier 3 - Core AI Capability)
  #
  # Functional modules are added dynamically by create-cora-project.sh
  # based on the modules.enabled list in the input config file.
  module_routes = concat(
    module.module_access.api_routes,
    module.module_ai.api_routes,
    module.module_mgmt.api_routes,
    module.module_kb.api_routes,
    module.module_chat.api_routes,
    []
  )

  # Attach JWT authorizer for authentication
  authorizer_lambda_arn  = aws_lambda_function.authorizer.arn
  authorizer_lambda_name = aws_lambda_function.authorizer.function_name

  common_tags = {
    Environment = "dev"
    Project     = "{{PROJECT_NAME}}"
    ManagedBy   = "terraform"
    GatewayType = "CORA-Modular"
  }
}

# ========================================================================
# Outputs
# ========================================================================

output "role_arn" {
  description = "GitHub OIDC role ARN"
  value       = module.github_oidc_role.role_arn
}

output "role_name" {
  description = "GitHub OIDC role name"
  value       = module.github_oidc_role.role_name
}

output "supabase_secret_arn" {
  description = "ARN of Supabase secret in AWS Secrets Manager"
  value       = module.secrets.supabase_secret_arn
  sensitive   = true
}

output "modular_api_gateway_url" {
  description = "CORA Modular API Gateway URL"
  value       = module.modular_api_gateway.api_gateway_url
}

output "modular_api_gateway_id" {
  description = "CORA Modular API Gateway ID"
  value       = module.modular_api_gateway.api_gateway_id
}

output "authorizer_lambda_arn" {
  description = "ARN of API Gateway authorizer Lambda"
  value       = aws_lambda_function.authorizer.arn
}

output "authorizer_lambda_name" {
  description = "Name of API Gateway authorizer Lambda"
  value       = aws_lambda_function.authorizer.function_name
}
