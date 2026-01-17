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
variable "access_common_layer_arn" {
  description = "ARN of access_common Lambda layer"
  type        = string
}

variable "ai_common_layer_arn" {
  description = "ARN of ai_common Lambda layer"
  type        = string
  default     = ""
}

# Supabase
variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
}

variable "supabase_service_key" {
  description = "Supabase service role key"
  type        = string
  sensitive   = true
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
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
