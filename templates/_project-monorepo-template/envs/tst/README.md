# {{PROJECT_NAME}}-infra - Test Environment

Copy files from `../dev/` and update for test:

1. Copy `main.tf`, `variables.tf`, `providers.tf`, `backend.tf`
2. Update `variables.tf` default for `environment = "tst"`
3. Create `backend.hcl` with `key = "tst/terraform.tfstate"`
4. Adjust resource configurations as needed for test

## AWS Account Configuration

**Account:** Non-Production (same as dev)

| Environment | AWS Account |
| ----------- | ----------- |
| dev         | Non-Prod    |
| tst         | Non-Prod    |
| stg         | Prod        |
| prd         | Prod        |

## Quick Setup

```bash
# Copy dev configuration
cp ../dev/*.tf .

# Update environment variable default
sed -i '' 's/default     = "dev"/default     = "tst"/' variables.tf

# Initialize terraform
terraform init -backend-config=backend.hcl
```

## Purpose

Test environment is used for:

- Integration testing before staging
- QA validation
- Pre-release verification
- Longer-running test scenarios
