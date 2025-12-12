# {{PROJECT_NAME}}-infra - Terraform Backend Configuration
# S3 backend for state management with DynamoDB locking

terraform {
  backend "s3" {
    # Configuration provided via backend.hcl
    # Run: terraform init -backend-config=backend.hcl
  }
}
