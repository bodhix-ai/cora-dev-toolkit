# Terraform Module Validator

This validator checks Terraform infrastructure modules (`main.tf`, `variables.tf`, `outputs.tf`) for compliance with CORA standards.

## Validation Rules

### 1. Standard Variables Contract (CRITICAL)
Ensures modules expose the correct interface expected by the `create-cora-project.sh` generator and main infrastructure.

**Required Variables:**
- `project_name`
- `environment`

**Allowed Variables:**
- `module_name`
- `aws_region`
- `supabase_secret_arn`
- `org_common_layer_arn`
- `sns_topic_arn`
- `log_level`
- `common_tags`
- Module-specific variables (should have defaults if possible)

**Forbidden Variables:**
- `api_gateway_id` (Inversion of Control violation)
- `api_gateway_execution_arn`
- `authorizer_id`
- `subnet_ids` (Functional modules should not be VPC-bound unless necessary)
- `security_group_ids`
- `vpc_config`
- `supabase_url` (Use `SUPABASE_SECRET_ARN` instead)
- `supabase_key_secret_name`

### 2. Variable Reference Integrity (CRITICAL)
Checks that all `var.variable_name` references in `main.tf` correspond to variables defined in `variables.tf`.

### 3. Inversion of Control Pattern (HIGH)
Modules must NOT create API Gateway resources internally. Routes should be exported as data structures.

**Forbidden Resources:**
- `aws_apigatewayv2_route`
- `aws_apigatewayv2_integration`
- `aws_lambda_permission` (specifically for `apigateway.amazonaws.com`)

### 4. Required Outputs (HIGH)
Modules must export specific outputs for consumption by the main infrastructure.

**Required Outputs:**
- `api_routes` (List or map of route definitions)
- `lambda_invoke_arns` (Map of Lambda invoke ARNs)

### 5. Standard Patterns (MEDIUM)
Checks for coding standards compliance.

- **Build Directory:** Must use `locals.build_dir` pattern (e.g., `${path.module}/../backend/.build`)
- **Tags:** Must use `var.common_tags` (not `var.tags`)

## Usage

```bash
python3 validation/terraform-module-validator/cli.py validate --path templates/_modules-functional/module-eval-opt/infrastructure
```

## Dependencies

Requires `python-hcl2` for parsing Terraform files:

```bash
pip install python-hcl2
```
