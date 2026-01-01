# Module Infrastructure

## Overview

This directory contains Terraform configuration for deploying the module infrastructure.

**⚠️ IMPORTANT:** This directory is REQUIRED for all CORA modules. The `outputs.tf` file defines API routes that must be integrated with the API Gateway by the infra repository.

## Prerequisites

- Terraform >= 1.5.0
- AWS CLI configured
- Access to Supabase credentials in AWS Secrets Manager
- org_common Lambda layer deployed

## Required Files

| File | Purpose |
|------|---------|
| `versions.tf` | Terraform version constraints |
| `variables.tf` | Module input variables |
| `main.tf` | Core infrastructure resources (Lambda, IAM, EventBridge) |
| `outputs.tf` | **CRITICAL** - API routes for API Gateway integration |
| `README.md` | This file - infrastructure documentation |

## Usage

This module is designed to be used from the main infrastructure repository:

```hcl
module "module_{name}" {
  source = "../../../{project}-stack/packages/module-{name}/infrastructure"

  environment          = "dev"
  project_name         = "my-project"
  aws_region           = "us-east-1"
  supabase_secret_arn  = module.secrets.supabase_secret_arn
  org_common_layer_arn = module.common_layers.org_common_arn
  sns_topic_arn        = module.monitoring.sns_topic_arn

  common_tags = {
    Environment = "dev"
    Project     = "my-project"
    ManagedBy   = "terraform"
  }
}
```

## Variables

See `variables.tf` for all available variables.

## Outputs

See `outputs.tf` for all module outputs, including:
- `api_routes` - **CRITICAL**: Routes for API Gateway integration
- `lambda_function_arns` - ARNs of deployed Lambda functions
- `lambda_function_names` - Names for monitoring/debugging

## Building Lambda Packages

Before deploying, build the Lambda packages:

```bash
# From module directory
cd backend/lambdas/{entity}
zip -r function.zip lambda_function.py

# Or use the project's build script
cd {project}-infra
./scripts/build-cora-modules.sh module-{name}
```

## API Routes Output

The `api_routes` output is consumed by the infra repo's scripts to automatically configure API Gateway. Format:

```hcl
output "api_routes" {
  value = [
    {
      method      = "GET"
      path        = "/api/{module}/{entities}"
      integration = aws_lambda_function.entity.invoke_arn
      description = "List entities"
    },
    # ... more routes
  ]
}
