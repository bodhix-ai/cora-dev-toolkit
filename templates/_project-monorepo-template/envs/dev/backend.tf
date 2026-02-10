# Terraform Backend Configuration
# Remote state storage in S3 with DynamoDB state locking

terraform {
  backend "s3" {
    # These values are set by bootstrap_tf_state.sh
    # Format: {project}-terraform-state-{region}
    bucket         = "{{PROJECT_NAME}}-terraform-state-us-east-1"
    key            = "envs/dev/terraform.tfstate"
    region         = "us-east-1"
    
    # State locking with DynamoDB
    # Format: {project}-terraform-locks
    dynamodb_table = "{{PROJECT_NAME}}-terraform-locks"
    
    # Security
    encrypt = true
  }
}
