# App Runner Module - Input Variables

variable "name_prefix" {
  description = "Prefix for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, stg, prd)"
  type        = string
}

variable "app_name" {
  description = "Application name (e.g., web, studio)"
  type        = string
}

variable "port" {
  description = "Port number the application listens on"
  type        = number
  default     = 3000
}

variable "health_check_path" {
  description = "Health check endpoint path"
  type        = string
  default     = "/api/health"
}

variable "cpu" {
  description = "CPU units for App Runner instance (256, 512, 1024, 2048, 4096)"
  type        = string
  default     = "1024"
}

variable "memory" {
  description = "Memory (MB) for App Runner instance (512, 1024, 2048, 3072, 4096, 6144, 8192, 10240, 12288)"
  type        = string
  default     = "2048"
}

variable "auto_deploy" {
  description = "Enable automatic deployment when new images are pushed to ECR"
  type        = bool
  default     = true
}

variable "environment_variables" {
  description = "Environment variables for the application"
  type        = map(string)
  default     = {}
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}