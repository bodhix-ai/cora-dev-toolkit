# {{PROJECT_NAME}}-infra - Development Environment Variables
# Variable definitions for Terraform configuration

# ========================================================================
# Environment Configuration
# ========================================================================

variable "environment" {
  description = "Deployment environment (dev, stg, prd)"
  type        = string
  default     = "dev"
}

variable "log_level" {
  description = "Logging level for Lambda functions"
  type        = string
  default     = "INFO"
}

# ========================================================================
# GitHub Configuration
# ========================================================================

variable "github_owner" {
  description = "GitHub organization or username"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

# ========================================================================
# Authentication Provider Configuration
# ========================================================================

variable "auth_provider" {
  description = "Authentication provider (clerk or okta)"
  type        = string
  default     = "clerk"
}

# Clerk Configuration
variable "clerk_jwt_issuer" {
  description = "Clerk JWT issuer URL"
  type        = string
  default     = ""
}

variable "clerk_jwt_audience" {
  description = "Clerk JWT audience"
  type        = string
  default     = ""
}

variable "clerk_jwks_url" {
  description = "Clerk JWKS URL for token verification"
  type        = string
  default     = ""
}

variable "clerk_secret_key_value" {
  description = "Clerk secret key"
  type        = string
  sensitive   = true
  default     = ""
}

# Okta Configuration
variable "okta_issuer" {
  description = "Okta JWT issuer URL"
  type        = string
  default     = ""
}

variable "okta_audience" {
  description = "Okta JWT audience"
  type        = string
  default     = ""
}

# ========================================================================
# Supabase Configuration
# ========================================================================

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
}

variable "supabase_anon_key_value" {
  description = "Supabase anonymous key"
  type        = string
  sensitive   = true
}

variable "supabase_service_role_key_value" {
  description = "Supabase service role key"
  type        = string
  sensitive   = true
}

variable "supabase_jwt_secret_value" {
  description = "Supabase JWT secret"
  type        = string
  sensitive   = true
}

# ========================================================================
# Lambda Artifacts (S3 Zip-Based Deployment)
# ========================================================================
# S3 bucket where Lambda zip packages are stored by deploy-cora-modules.sh

variable "lambda_bucket" {
  description = "S3 bucket containing Lambda zip artifacts"
  type        = string
  default     = "{{PROJECT_NAME}}-lambda-artifacts"
}
