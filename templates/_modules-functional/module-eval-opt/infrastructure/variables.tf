# Module: module-eval-optimizer
# Variables for Eval Optimization Infrastructure

# =============================================================================
# REQUIRED VARIABLES
# =============================================================================

variable "project_name" {
  description = "Name of the CORA project (e.g., ai-sec, pm-app)"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "opt_orchestrator_zip" {
  description = "Path to the opt-orchestrator Lambda zip file"
  type        = string
}

variable "eval_opt_common_layer_zip" {
  description = "Path to the eval_opt_common Lambda layer zip file (ADR-019c permissions)"
  type        = string
}

variable "org_common_layer_arn" {
  description = "ARN of the org-common Lambda layer"
  type        = string
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
}

variable "supabase_key_secret_name" {
  description = "Name of the Secrets Manager secret containing Supabase service key"
  type        = string
}

variable "api_gateway_id" {
  description = "ID of the API Gateway HTTP API"
  type        = string
}

variable "api_gateway_execution_arn" {
  description = "Execution ARN of the API Gateway HTTP API"
  type        = string
}

variable "authorizer_id" {
  description = "ID of the API Gateway authorizer"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for Lambda VPC configuration"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs for Lambda VPC configuration"
  type        = list(string)
}

# =============================================================================
# OPTIONAL VARIABLES
# =============================================================================

variable "log_level" {
  description = "Log level for Lambda functions (DEBUG, INFO, WARNING, ERROR)"
  type        = string
  default     = "INFO"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}