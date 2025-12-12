# {{PROJECT_NAME}}-infra - Production Environment

Copy files from `../dev/` and update for production:

1. Copy `main.tf`, `variables.tf`, `providers.tf`, `backend.tf`
2. Update `variables.tf` default for `environment = "prd"`
3. Create `backend.hcl` with `key = "prd/terraform.tfstate"`
4. Adjust resource configurations as needed for production
5. **Enable production-grade settings** (e.g., multi-AZ, deletion protection)

## Quick Setup

```bash
# Copy dev configuration
cp ../dev/*.tf .

# Update environment variable default
sed -i '' 's/default     = "dev"/default     = "prd"/' variables.tf

# Initialize terraform
terraform init -backend-config=backend.hcl
```

## Production Considerations

- Enable deletion protection on critical resources
- Configure appropriate retention periods for logs
- Set up CloudWatch alarms and monitoring
- Review and restrict IAM permissions
- Enable encryption at rest for all data stores
