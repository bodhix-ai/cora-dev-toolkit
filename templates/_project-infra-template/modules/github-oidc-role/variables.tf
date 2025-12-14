variable "environment" {
  description = "Environment name (e.g., dev, stg, prd)"
  type        = string
}

variable "github_owner" {
  description = "GitHub organization or user that owns the repository"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name (without owner)"
  type        = string
}

variable "name_prefix" {
  description = "Prefix for IAM role name"
  type        = string
  default     = "pm-app-oidc"
}

variable "create_oidc_provider" {
  description = "Create the OIDC provider in this stack"
  type        = bool
  default     = true
}

variable "existing_oidc_provider_arn" {
  description = "If create_oidc_provider=false, provide an existing provider ARN"
  type        = string
  default     = null
}

variable "oidc_audience" {
  description = "OIDC audience"
  type        = string
  default     = "sts.amazonaws.com"
}

variable "thumbprints" {
  description = "Thumbprint list for the GitHub OIDC provider"
  type        = list(string)
  default     = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "s3_bucket_prefix" {
  description = "Prefix for S3 bucket names this role can manage"
  type        = string
  default     = "pm-app-"
}

variable "lambda_function_prefix" {
  description = "Prefix for Lambda functions this role can manage"
  type        = string
  default     = "pm-app-"
}

variable "iam_role_prefix" {
  description = "Prefix for IAM roles this role may PassRole"
  type        = string
  default     = "pm-app-"
}

variable "additional_policy_arns" {
  description = "Additional managed policies to attach"
  type        = list(string)
  default     = []
}

variable "extra_policy_json" {
  description = "Optional extra inline policy JSON (string). If empty, none is added."
  type        = string
  default     = ""
}
