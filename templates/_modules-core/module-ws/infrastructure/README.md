# Module-WS Infrastructure

## Overview

This directory contains Terraform configuration for deploying the module-ws (Workspace) infrastructure.

## Prerequisites

- Terraform >= 1.5.0
- AWS CLI configured
- Access to Supabase credentials in AWS Secrets Manager
- org_common Lambda layer deployed

## Resources Created

- **Lambda Functions:**
  - `workspace` - Main CRUD handler for workspaces, members, and favorites
  - `ws-cleanup` - Scheduled cleanup of expired workspaces

- **EventBridge Rule:**
  - Daily trigger for workspace cleanup (2:00 AM UTC)

- **IAM Roles:**
  - Lambda execution role with Secrets Manager access

- **CloudWatch Alarms:**
  - Lambda error monitoring

## Usage

This module is designed to be used from the main infrastructure repository:

```hcl
module "module_ws" {
  source = "../../../{project}-stack/packages/module-ws/infrastructure"

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
- `api_routes` - Routes for API Gateway integration (CRITICAL)
- `lambda_function_arns` - ARNs of deployed Lambda functions
- `lambda_function_names` - Names for monitoring/debugging

## Building Lambda Packages

Before deploying, build the Lambda packages:

```bash
# From module-ws directory
cd backend/lambdas/workspace
zip -r function.zip lambda_function.py

cd ../cleanup
zip -r function.zip lambda_function.py
```

Or use the project's build script:

```bash
# From project-infra directory
./scripts/build-cora-modules.sh module-ws
```

## API Routes

This module provides the following API routes (exported via `outputs.tf`):

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/ws/workspaces | List user's workspaces |
| POST | /api/ws/workspaces | Create workspace |
| GET | /api/ws/workspaces/{id} | Get workspace |
| PUT | /api/ws/workspaces/{id} | Update workspace |
| DELETE | /api/ws/workspaces/{id} | Soft delete workspace |
| POST | /api/ws/workspaces/{id}/restore | Restore workspace |
| GET | /api/ws/workspaces/{id}/members | List members |
| POST | /api/ws/workspaces/{id}/members | Add member |
| PUT | /api/ws/workspaces/{workspaceId}/members/{memberId} | Update member |
| DELETE | /api/ws/workspaces/{workspaceId}/members/{memberId} | Remove member |
| POST | /api/ws/workspaces/{id}/favorite | Toggle favorite |
| GET | /api/ws/favorites | List favorites |

## EventBridge Cleanup Schedule

The cleanup Lambda runs daily at 2:00 AM UTC to permanently delete workspaces that:
1. Have been soft-deleted
2. Have exceeded their retention period (default: 30 days)
