# Voice Module - Terraform Variables
# Required variables for voice module infrastructure

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

# Module enablement
variable "module_voice_enabled" {
  description = "Enable voice module"
  type        = bool
  default     = true
}

# Lambda configuration
variable "module_voice_lambda_timeout" {
  description = "Lambda function timeout for voice module"
  type        = number
  default     = 30
}

variable "module_voice_lambda_memory" {
  description = "Lambda function memory for voice module"
  type        = number
  default     = 512
}

# Lambda layers
variable "org_common_layer_arn" {
  description = "ARN of org_common Lambda layer (from module-access)"
  type        = string
}

variable "ai_common_layer_arn" {
  description = "ARN of ai_common Lambda layer"
  type        = string
  default     = ""
}

# Supabase
variable "supabase_secret_arn" {
  description = "ARN of Supabase credentials in AWS Secrets Manager"
  type        = string
  sensitive   = true
}

# AWS Configuration
variable "aws_region" {
  description = "AWS region for Lambda functions"
  type        = string
  default     = "us-east-1"
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

# ECS configuration (for Pipecat bot)
variable "ecs_cluster_name" {
  description = "ECS cluster name for Pipecat bots"
  type        = string
  default     = ""
}

variable "ecs_task_definition_arn" {
  description = "ECS task definition ARN for Pipecat bot"
  type        = string
  default     = ""
}

variable "ecs_subnets" {
  description = "Subnets for ECS tasks"
  type        = list(string)
  default     = []
}

variable "ecs_security_groups" {
  description = "Security groups for ECS tasks"
  type        = list(string)
  default     = []
}

variable "ecs_task_role_arn" {
  description = "IAM role ARN for ECS task execution"
  type        = string
  default     = ""
}

# S3 configuration
variable "transcript_s3_bucket" {
  description = "S3 bucket for transcript storage"
  type        = string
  default     = ""
}

# SQS configuration
variable "standby_pool_size" {
  description = "Number of standby bots during business hours"
  type        = number
  default     = 2
}

# Secrets Manager ARNs
variable "daily_api_key_secret_arn" {
  description = "AWS Secrets Manager ARN for Daily.co API key"
  type        = string
  default     = ""
}

variable "deepgram_api_key_secret_arn" {
  description = "AWS Secrets Manager ARN for Deepgram API key"
  type        = string
  default     = ""
}

variable "cartesia_api_key_secret_arn" {
  description = "AWS Secrets Manager ARN for Cartesia API key"
  type        = string
  default     = ""
}

# WebSocket API
variable "websocket_api_url" {
  description = "WebSocket API URL for real-time transcript streaming"
  type        = string
  default     = ""
}

# Tags
variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
