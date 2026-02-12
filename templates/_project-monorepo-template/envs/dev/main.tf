# {{PROJECT_NAME}}-infra - Development Environment
# Main Terraform configuration for CORA application infrastructure

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
  source = "../../packages/module-access/infrastructure"

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
  source = "../../packages/module-ai/infrastructure"

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

module "module_ws" {
  source = "../../packages/module-ws/infrastructure"

  project_name         = "{{PROJECT_NAME}}"
  environment          = "dev"
  org_common_layer_arn = module.module_access.layer_arn
  supabase_secret_arn  = module.secrets.supabase_secret_arn
  aws_region           = var.aws_region
  log_level            = var.log_level

  common_tags = {
    Environment = "dev"
    Project     = "{{PROJECT_NAME}}"
    ManagedBy   = "terraform"
    Module      = "module-ws"
    ModuleType  = "CORA"
  }
}

module "module_mgmt" {
  source = "../../packages/module-mgmt/infrastructure"

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
  source = "../../packages/module-kb/infrastructure"

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
  source = "../../packages/module-chat/infrastructure"

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
# ECR Repository
# ========================================================================
# Container image registry (shared across nonprod environments: dev, tst)
# Conditional: created in first environment (dev), referenced in subsequent (tst)

module "ecr_web" {
  count  = var.create_ecr ? 1 : 0  # Only create in first env (dev)
  source = "../../modules/ecr"

  name_prefix = "{{PROJECT_NAME}}"
  environment = "nonprod"  # Shared across nonprod account (dev, tst)
  app_name    = "web"

  common_tags = {
    Environment = "nonprod"
    Project     = "{{PROJECT_NAME}}"
    ManagedBy   = "terraform"
    App         = "web"
  }
}

# Data source to look up existing ECR (for subsequent envs like tst)
data "aws_ecr_repository" "web" {
  count = var.create_ecr ? 0 : 1  # Only look up if not creating
  name  = "{{PROJECT_NAME}}-nonprod-web"
}

# Local to resolve ECR URL regardless of source
locals {
  ecr_repository_url  = var.create_ecr ? module.ecr_web[0].repository_url : data.aws_ecr_repository.web[0].repository_url
  ecr_repository_name = var.create_ecr ? module.ecr_web[0].repository_name : data.aws_ecr_repository.web[0].name
}

# ========================================================================
# App Runner Service (DISABLED - uncomment when ready to deploy)
# ========================================================================
# Deploys Next.js web application to AWS App Runner

# module "app_runner_web" {
#   source = "../../modules/app-runner"
#
#   name_prefix         = "{{PROJECT_NAME}}"
#   environment         = "dev"
#   app_name            = "web"
#   ecr_repository_url  = local.ecr_repository_url
#
#   port              = 3000  # Next.js default port (proven working in team deployments)
#   health_check_path = "/api/healthcheck"  # Matches working deployments
#   cpu               = "1024"  # 1 vCPU
#   memory            = "2048"  # 2 GB
#   auto_deploy       = true
#
#   environment_variables = {
#     NODE_ENV                  = "production"
#     HOSTNAME                  = "0.0.0.0"  # Next.js must listen on all interfaces for App Runner
#     PORT                      = "3000"     # Next.js default port
#     AUTH_TRUST_HOST           = "true"     # CRITICAL: Required for NextAuth behind reverse proxy (App Runner)
#     NEXT_PUBLIC_CORA_API_URL  = module.modular_api_gateway.api_gateway_url  # Fixed: was NEXT_PUBLIC_API_URL
#     NEXTAUTH_URL              = "https://${var.app_domain}"
#     NEXTAUTH_SECRET           = var.nextauth_secret
#     OKTA_ISSUER               = var.okta_issuer
#     OKTA_CLIENT_ID            = var.okta_audience
#     OKTA_CLIENT_SECRET        = ""  # Add to variables if using Okta client credentials flow
#     SUPABASE_URL              = var.supabase_url
#     SUPABASE_ANON_KEY         = var.supabase_anon_key_value
#   }
#
#   common_tags = {
#     Environment = "dev"
#     Project     = "{{PROJECT_NAME}}"
#     ManagedBy   = "terraform"
#     App         = "web"
#   }
# }

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
  # - module_ws (Tier 2)
  # - module_mgmt (Tier 3)
  # - module_kb (Tier 3 - Core AI Capability)
  # - module_chat (Tier 3 - Core AI Capability)
  #
  # Functional modules are added dynamically by create-cora-project.sh
  # based on the modules.enabled list in the input config file.
  module_routes = concat(
    module.module_access.api_routes,
    module.module_ai.api_routes,
    module.module_ws.api_routes,
    module.module_mgmt.api_routes,
    module.module_kb.api_routes,
    module.module_chat.api_routes,
    []
  )

  # CORS configuration - allows requests from App Runner web application
  allowed_origins = var.allowed_origins

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
# Note: GitHub OIDC role managed centrally by STS hub-and-spoke pattern

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

# App Runner outputs (DISABLED - uncomment when App Runner is enabled)
# output "app_runner_service_url" {
#   description = "URL of the App Runner web service"
#   value       = module.app_runner_web.app_runner_service_url
# }
#
# output "app_runner_service_arn" {
#   description = "ARN of the App Runner web service"
#   value       = module.app_runner_web.app_runner_service_arn
# }

# ECR outputs (ACTIVE - for image push practice)
output "ecr_web_repository_url" {
  description = "URL of the ECR repository for web application"
  value       = local.ecr_repository_url
}

output "ecr_web_repository_name" {
  description = "Name of the ECR repository for web application"
  value       = local.ecr_repository_name
}
