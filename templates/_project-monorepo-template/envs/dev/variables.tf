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
# AWS Configuration
# ========================================================================

variable "aws_region" {
description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "create_ecr" {
  description = "Whether to create ECR repository (true for first env in account, false for subsequent)"
  type        = bool
  default     = true
}

# ========================================================================
# App Runner Configuration
# ========================================================================

variable "nextauth_secret" {
  description = "NextAuth secret for session encryption (generate with: openssl rand -base64 32)"
  type        = string
  sensitive   = true
  default     = ""  # Must be set in local-secrets.tfvars for production use
}

variable "app_domain" {
  description = "Domain name for the App Runner service (e.g., app.example.com)"
  type        = string
  default     = "localhost:3000"  # Placeholder for development
}

variable "allowed_origins" {
  description = "List of allowed CORS origins for API Gateway"
  type        = list(string)
  default     = ["*"]
}
