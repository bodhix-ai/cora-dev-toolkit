# Modular API Gateway - Input Variables
# This module creates a dedicated API Gateway for CORA modules with dynamic route provisioning

variable "name_prefix" {
  description = "Prefix for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, tst, stg, prd)"
  type        = string
}

variable "module_routes" {
  description = "List of route configurations from CORA modules"
  type = list(object({
    method      = string
    path        = string
    integration = string
    public      = bool
  }))
  default = []
}

variable "allowed_origins" {
  description = "List of allowed CORS origins"
  type        = list(string)
  default     = ["*"]
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "authorizer_lambda_arn" {
  description = "ARN of Lambda authorizer function (optional)"
  type        = string
  default     = ""
}

variable "authorizer_lambda_name" {
  description = "Name of Lambda authorizer function (optional)"
  type        = string
  default     = ""
}
