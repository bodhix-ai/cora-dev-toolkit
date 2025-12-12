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

variable "lambda_image_uri" {
  description = "Docker image URI for Lambda function from ECR"
  type        = string
}

variable "supabase_secret_arn" {
  description = "ARN of Secrets Manager secret containing Supabase credentials"
  type        = string
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
