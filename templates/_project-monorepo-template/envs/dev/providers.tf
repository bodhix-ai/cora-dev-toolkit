# {{PROJECT_NAME}}-infra - Terraform Providers Configuration
# Provider requirements and configurations

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = "{{AWS_REGION}}"

  default_tags {
    tags = {
      Project     = "{{PROJECT_NAME}}"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
