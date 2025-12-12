# {{PROJECT_NAME}}-infra

Infrastructure repository for the {{PROJECT_NAME}} CORA application.

## Overview

This repository contains all Infrastructure as Code (IaC) for the {{PROJECT_NAME}} application, including:

- **Terraform configurations** for AWS resources
- **Lambda authorizer** for API Gateway JWT validation
- **Deployment scripts** for CORA modules
- **CI/CD workflows** for automated deployments

## Repository Structure

```
{{PROJECT_NAME}}-infra/
├── bootstrap/                    # Initial setup scripts
│   └── bootstrap_tf_state.sh     # Create Terraform state bucket
├── envs/                         # Environment-specific Terraform
│   ├── dev/                      # Development environment
│   ├── stg/                      # Staging environment
│   └── prd/                      # Production environment
├── lambdas/                      # Lambda function code
│   └── api-gateway-authorizer/   # JWT authorizer Lambda
├── modules/                      # Reusable Terraform modules
│   ├── github-oidc-role/         # GitHub Actions OIDC
│   ├── modular-api-gateway/      # CORA API Gateway
│   └── secrets/                  # AWS Secrets Manager
├── scripts/                      # Deployment scripts
│   ├── build-cora-modules.sh     # Build CORA module images
│   ├── deploy-cora-modules.sh    # Deploy CORA infrastructure
│   └── deploy-terraform.sh       # Apply Terraform changes
└── .github/workflows/            # CI/CD pipelines
```

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.0.0
- Docker (for building Lambda images)
- Access to {{PROJECT_NAME}}-stack repository

## Quick Start

### 1. Bootstrap Terraform State

```bash
cd bootstrap
./bootstrap_tf_state.sh
```

### 2. Configure Environment

```bash
cd envs/dev
cp local-secrets.tfvars.example local-secrets.tfvars
# Edit local-secrets.tfvars with your values
```

### 3. Initialize Terraform

```bash
terraform init -backend-config=backend.hcl
```

### 4. Deploy Infrastructure

```bash
# Option 1: Deploy everything
../scripts/deploy-terraform.sh dev

# Option 2: Deploy CORA modules only
../scripts/build-cora-modules.sh
../scripts/deploy-cora-modules.sh dev
```

## Environment Configuration

Each environment (`dev`, `stg`, `prd`) has its own directory with:

| File                   | Purpose                             |
| ---------------------- | ----------------------------------- |
| `main.tf`              | Module instantiations and resources |
| `variables.tf`         | Variable definitions                |
| `outputs.tf`           | Output values                       |
| `backend.hcl`          | Terraform state configuration       |
| `local-secrets.tfvars` | Sensitive values (git-ignored)      |

## CORA Module Integration

CORA modules are deployed from the `{{PROJECT_NAME}}-stack` repository. The infrastructure references module configurations via relative paths:

```hcl
module "module_name" {
  source = "../../../{{PROJECT_NAME}}-stack/packages/module-name/infrastructure"
  # ...
}
```

### Adding a New CORA Module

1. Create the module in `{{PROJECT_NAME}}-stack/packages/`
2. Add infrastructure definition in `module-name/infrastructure/`
3. Reference in `envs/{env}/main.tf`:
   ```hcl
   module "new_module" {
     source = "../../../{{PROJECT_NAME}}-stack/packages/module-name/infrastructure"
     # ...
   }
   ```
4. Add routes to `modular_api_gateway.module_routes`

## API Gateway

The CORA Modular API Gateway dynamically provisions routes from all registered modules:

```hcl
module "modular_api_gateway" {
  source = "../../modules/modular-api-gateway"

  module_routes = concat(
    module.module_access.api_routes,
    module.module_ai.api_routes,
    module.module_mgmt.api_routes,
    # Add new modules here
  )
}
```

## Security

- **JWT Authorizer**: All API routes are protected by the Lambda authorizer
- **Secrets Management**: Sensitive values stored in AWS Secrets Manager
- **OIDC**: GitHub Actions uses OIDC for AWS authentication (no long-lived credentials)

## Deployment Workflows

### Manual Deployment

```bash
./scripts/deploy-cora-modules.sh <environment>
```

### CI/CD (GitHub Actions)

Deployments are triggered automatically:

- **dev**: On push to `main` branch
- **stg**: On release candidate tags
- **prd**: On release tags with manual approval

## Troubleshooting

### Terraform State Lock

If you encounter state lock errors:

```bash
terraform force-unlock <LOCK_ID>
```

### CORA Module Build Failures

Check Docker is running and you have ECR access:

```bash
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
```

## Related Repositories

- [{{PROJECT_NAME}}-stack](../{{PROJECT_NAME}}-stack) - Application code repository
- [cora-dev-toolkit](https://github.com/bodhix-ai/cora-dev-toolkit) - CORA development toolkit

## License

Proprietary - {{ORGANIZATION_NAME}}
