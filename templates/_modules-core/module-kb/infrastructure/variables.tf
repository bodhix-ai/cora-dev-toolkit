# Module-KB Infrastructure - Input Variables
# Local Zip-Based Deployment Configuration

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
  default     = "kb"
}

variable "aws_region" {
  description = "AWS region for Lambda functions"
  type        = string
  default     = "us-east-1"
}

# =============================================================================
# Secrets and Configuration
# =============================================================================

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

# =============================================================================
# Module-Specific Configuration
# =============================================================================

variable "cors_allowed_origins" {
  description = "List of allowed origins for S3 CORS (for presigned URL uploads from browser)"
  type        = list(string)
  default     = ["*"] # Override in production with specific domains
}
