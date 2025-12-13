# Module Management Infrastructure - Input Variables
# S3 Zip-Based Deployment Configuration

variable "project_name" {
  description = "Project name prefix (e.g., '${project}')"
  type        = string
  default     = "${project}"
}

variable "environment" {
  description = "Environment name (dev, stg, prd)"
  type        = string
  validation {
    condition     = contains(["dev", "stg", "prd"], var.environment)
    error_message = "Environment must be dev, stg, or prd."
  }
}

variable "module_name" {
  description = "Module name for resource naming"
  type        = string
  default     = "lambda-mgmt"
}

variable "aws_region" {
  description = "AWS region for Lambda functions"
  type        = string
  default     = "us-east-1"
}

# =============================================================================
# S3 Zip-Based Deployment Variables
# =============================================================================

variable "lambda_bucket" {
  description = "S3 bucket name containing Lambda zip files and layers"
  type        = string
}

# =============================================================================
# Secrets and Configuration
# =============================================================================

variable "supabase_secret_arn" {
  description = "ARN of Secrets Manager secret containing Supabase credentials"
  type        = string
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms (optional)"
  type        = string
  default     = ""
}

variable "log_level" {
  description = "Logging level for Lambda function"
  type        = string
  default     = "INFO"
  validation {
    condition     = contains(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"], var.log_level)
    error_message = "Log level must be one of: DEBUG, INFO, WARNING, ERROR, CRITICAL."
  }
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
