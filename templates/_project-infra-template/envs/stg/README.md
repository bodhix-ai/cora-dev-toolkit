# {{PROJECT_NAME}}-infra - Staging Environment

Copy files from `../dev/` and update for staging:

1. Copy `main.tf`, `variables.tf`, `providers.tf`, `backend.tf`
2. Update `variables.tf` default for `environment = "stg"`
3. Create `backend.hcl` with `key = "stg/terraform.tfstate"`
4. Adjust resource configurations as needed for staging

## Quick Setup

```bash
# Copy dev configuration
cp ../dev/*.tf .

# Update environment variable default
sed -i '' 's/default     = "dev"/default     = "stg"/' variables.tf

# Initialize terraform
terraform init -backend-config=backend.hcl
```
