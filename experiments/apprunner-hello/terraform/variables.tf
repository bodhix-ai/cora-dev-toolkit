variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile to use"
  type        = string
  default     = "ai-sec-nonprod"
}

variable "app_name" {
  description = "Application name (used for App Runner service and IAM roles)"
  type        = string
  default     = "apprunner-hello"
}

variable "ecr_repo_name" {
  description = "ECR repository name"
  type        = string
  default     = "apprunner-hello"
}