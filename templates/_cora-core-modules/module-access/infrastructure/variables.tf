# Org-Module Infrastructure - Input Variables

variable "project_name" {
  description = "Project name (used in resource naming prefix)"
  type        = string
  default     = "career"
}

variable "environment" {
  description = "Environment name (dev, tst, stg, prd)"
  type        = string

  validation {
    condition     = contains(["dev", "tst", "stg", "prd"], var.environment)
    error_message = "Environment must be one of: dev, tst, stg, prd"
  }
}

variable "module_name" {
  description = "Name of the module (used in resource naming)"
  type        = string
  default     = "org"
}

variable "aws_region" {
  description = "AWS region for Lambda functions"
  type        = string
  default     = "us-east-1"
}

variable "supabase_secret_arn" {
  description = "ARN of Supabase credentials in AWS Secrets Manager"
  type        = string
  sensitive   = true
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms (optional)"
  type        = string
  default     = ""
}

variable "log_level" {
  description = "Log level for Lambda functions (DEBUG, INFO, WARNING, ERROR)"
  type        = string
  default     = "INFO"

  validation {
    condition     = contains(["DEBUG", "INFO", "WARNING", "ERROR"], var.log_level)
    error_message = "Log level must be one of: DEBUG, INFO, WARNING, ERROR"
  }
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
