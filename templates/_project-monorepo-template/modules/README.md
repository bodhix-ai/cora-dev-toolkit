# Terraform Modules

This directory contains reusable Terraform modules for CORA infrastructure.

## Required Modules

Copy these modules from an existing CORA project or the `cora-dev-toolkit` reference:

| Module                 | Description                                      | Source   |
| ---------------------- | ------------------------------------------------ | -------- |
| `modular-api-gateway/` | CORA API Gateway with dynamic route provisioning | Required |
| `secrets/`             | AWS Secrets Manager for centralized secrets      | Required |
| `github-oidc-role/`    | GitHub Actions OIDC authentication for AWS       | Required |

## Setup Instructions

### Option 1: Copy from Existing Project

```bash
# Copy from an existing CORA project (e.g., pm-app-infra)
cp -r ../../../pm-app-infra/modules/modular-api-gateway ./
cp -r ../../../pm-app-infra/modules/secrets ./
cp -r ../../../pm-app-infra/modules/github-oidc-role ./
```

### Option 2: Use as Symlinks (Development)

```bash
# Create symlinks to existing modules (for development only)
ln -s ../../../pm-app-infra/modules/modular-api-gateway ./modular-api-gateway
ln -s ../../../pm-app-infra/modules/secrets ./secrets
ln -s ../../../pm-app-infra/modules/github-oidc-role ./github-oidc-role
```

## Module Descriptions

### modular-api-gateway

The CORA Modular API Gateway dynamically provisions routes from CORA modules:

- Creates AWS API Gateway HTTP API
- Provisions routes from module `api_routes` outputs
- Attaches Lambda authorizer for JWT validation
- Supports CORS configuration

### secrets

Centralized secrets management using AWS Secrets Manager:

- Stores Supabase credentials
- Provides secret ARNs to CORA modules
- Supports rotation policies

### github-oidc-role

Enables secure GitHub Actions deployments:

- Creates OIDC identity provider in AWS
- Creates IAM role assumable by GitHub Actions
- Scopes permissions to specific repos and branches

## Adding New Modules

When adding project-specific modules:

1. Create module directory: `modules/my-module/`
2. Add required files: `main.tf`, `variables.tf`, `outputs.tf`
3. Reference in `envs/{env}/main.tf`
4. Document module purpose and usage
