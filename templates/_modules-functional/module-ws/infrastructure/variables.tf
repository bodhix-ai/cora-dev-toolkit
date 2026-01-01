# =============================================================================
# Module-WS: Input Variables
# =============================================================================

# -----------------------------------------------------------------------------
# Required Variables
# -----------------------------------------------------------------------------

variable "environment" {
  description = "Environment name (dev, tst, stg, prd)"
  type        = string

  validation {
    condition     = contains(["dev", "tst", "stg", "prd"], var.environment)
    error_message = "Environment must be one of: dev, tst, stg, prd"
  }
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "supabase_secret_arn" {
  description = "ARN of Supabase credentials in AWS Secrets Manager"
  type        = string
  sensitive   = true
}

variable "org_common_layer_arn" {
  description = "ARN of the org_common Lambda layer"
  type        = string
}

# -----------------------------------------------------------------------------
# Optional Variables
# -----------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "log_level" {
  description = "Log level for Lambda functions"
  type        = string
  default     = "INFO"

  validation {
    condition     = contains(["DEBUG", "INFO", "WARNING", "ERROR"], var.log_level)
    error_message = "Log level must be one of: DEBUG, INFO, WARNING, ERROR"
  }
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms (optional)"
  type        = string
  default     = ""
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 256
}

variable "cleanup_schedule" {
  description = "CloudWatch Events schedule expression for cleanup job"
  type        = string
  default     = "cron(0 2 * * ? *)" # Daily at 2:00 AM UTC
}

variable "enable_cleanup_job" {
  description = "Whether to enable the scheduled cleanup job"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Lambda Package Paths
# -----------------------------------------------------------------------------

variable "workspace_lambda_zip" {
  description = "Path to workspace Lambda deployment package"
  type        = string
  default     = "../backend/lambdas/workspace/function.zip"
}

variable "cleanup_lambda_zip" {
  description = "Path to cleanup Lambda deployment package"
  type        = string
  default     = "../backend/lambdas/cleanup/function.zip"
}
