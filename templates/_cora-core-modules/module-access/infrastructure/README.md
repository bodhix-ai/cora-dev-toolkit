# Org-Module Infrastructure

Terraform configuration for deploying org-module Lambda functions and supporting infrastructure to AWS.

## Overview

This infrastructure module creates:

- **1 Lambda Layer** (`org-common`) - Shared utilities for all Lambda functions
- **4 Lambda Functions** - Handling 12 API endpoints total
- **1 IAM Role** - Lambda execution role with Secrets Manager access
- **4 CloudWatch Alarms** - Error monitoring (optional)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Main Infrastructure (sts-career-infra)                      │
│  ├── Secrets Manager (Supabase credentials)                 │
│  ├── API Gateway HTTP API                                   │
│  └── Imports org-module ─────────────────────┐              │
└──────────────────────────────────────────────┼──────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────┐
│  Org-Module Infrastructure                                   │
│  ├── Lambda Layer (org-common)                              │
│  ├── IAM Role (with Secrets Manager access)                 │
│  ├── Lambda: identities-management                          │
│  ├── Lambda: profiles                                        │
│  ├── Lambda: orgs                                            │
│  ├── Lambda: members                                         │
│  └── CloudWatch Alarms (error monitoring)                   │
└─────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL with RLS)                             │
│  ├── Tables: external_identities, profiles, org, etc.      │
│  └── RLS Policies + Helper Functions                        │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.5.0
3. **Built Lambda packages** (run `backend/build.sh` first)
4. **Supabase credentials** stored in AWS Secrets Manager
5. **Database schema** already deployed to Supabase

## Resources Created

### Lambda Layer

| Resource                              | Name               | Description                                                |
| ------------------------------------- | ------------------ | ---------------------------------------------------------- |
| `aws_lambda_layer_version.org_common` | `{env}-org-common` | Shared utilities (Supabase client, DB helpers, validators) |

**Dependencies:**

- `supabase>=2.3.4`
- `boto3>=1.34.0`
- `typing-extensions>=4.9.0`

### Lambda Functions

| Function                | Name                              | Endpoints | Description                             |
| ----------------------- | --------------------------------- | --------- | --------------------------------------- |
| `identities_management` | `{env}-org-identities-management` | 1         | Identity provisioning (Okta → Supabase) |
| `profiles`              | `{env}-org-profiles`              | 2         | User profile management                 |
| `orgs`                  | `{env}-org-orgs`                  | 5         | Organization CRUD                       |
| `members`               | `{env}-org-members`               | 4         | Membership management                   |

**Common Configuration:**

- Runtime: Python 3.13
- Memory: 256 MB
- Timeout: 30 seconds
- Layer: org-common

### IAM Role

| Resource                      | Name                       | Description                 |
| ----------------------------- | -------------------------- | --------------------------- |
| `aws_iam_role.lambda`         | `{env}-org-lambda-role`    | Lambda execution role       |
| `aws_iam_role_policy.secrets` | `{env}-org-secrets-access` | Secrets Manager read access |

**Attached Policies:**

- `AWSLambdaBasicExecutionRole` (CloudWatch Logs)
- Custom policy for Secrets Manager access

### CloudWatch Alarms (Optional)

Created only if `sns_topic_arn` is provided:

| Alarm                                    | Metric | Threshold  | Description                  |
| ---------------------------------------- | ------ | ---------- | ---------------------------- |
| `{env}-org-identities-management-errors` | Errors | >5 in 5min | Identity provisioning errors |
| `{env}-org-profiles-errors`              | Errors | >5 in 5min | Profile management errors    |
| `{env}-org-orgs-errors`                  | Errors | >5 in 5min | Organization CRUD errors     |
| `{env}-org-members-errors`               | Errors | >5 in 5min | Membership management errors |

## Variables

### Required Variables

| Variable              | Type     | Description                                    |
| --------------------- | -------- | ---------------------------------------------- |
| `environment`         | `string` | Environment name (dev, tst, stg, prd)          |
| `supabase_secret_arn` | `string` | ARN of Supabase credentials in Secrets Manager |

### Optional Variables

| Variable        | Type          | Default       | Description                                    |
| --------------- | ------------- | ------------- | ---------------------------------------------- |
| `module_name`   | `string`      | `"org"`       | Module name for resource naming                |
| `aws_region`    | `string`      | `"us-east-1"` | AWS region                                     |
| `sns_topic_arn` | `string`      | `""`          | SNS topic for alarms (empty = no alarms)       |
| `log_level`     | `string`      | `"INFO"`      | Lambda log level (DEBUG, INFO, WARNING, ERROR) |
| `common_tags`   | `map(string)` | `{}`          | Tags to apply to all resources                 |

## Outputs

### Lambda Functions

| Output                  | Description                          |
| ----------------------- | ------------------------------------ |
| `lambda_function_arns`  | Map of function ARNs                 |
| `lambda_function_names` | Map of function names                |
| `lambda_invoke_arns`    | Map of invoke ARNs (for API Gateway) |

### IAM Role

| Output          | Description                |
| --------------- | -------------------------- |
| `iam_role_arn`  | Lambda execution role ARN  |
| `iam_role_name` | Lambda execution role name |

### Lambda Layer

| Output          | Description          |
| --------------- | -------------------- |
| `layer_arn`     | org-common layer ARN |
| `layer_version` | Layer version number |

### API Routes

| Output       | Description                                    |
| ------------ | ---------------------------------------------- |
| `api_routes` | List of API routes for API Gateway integration |

**Example route structure:**

```hcl
{
  method      = "POST"
  path        = "/identities/provision"
  integration = "arn:aws:lambda:..."
  public      = false
}
```

## Usage

### Step 1: Build Lambda Packages

Before deploying infrastructure, build the Lambda packages:

```bash
cd ../backend
./build.sh
```

This creates ZIP files in `.build/` directory:

- `org-common-layer.zip`
- `identities-management.zip`
- `profiles.zip`
- `orgs.zip`
- `members.zip`

### Step 2: Import Module in Main Infrastructure

Add to `sts-career-infra/terraform/environments/dev/main.tf`:

```hcl
module "org_module" {
  source = "../../../../sts-career-stack/packages/org-module/infrastructure"

  environment          = var.environment
  module_name          = "org"
  aws_region           = var.aws_region
  supabase_secret_arn  = module.secrets.secret_arns["supabase-credentials"]
  sns_topic_arn        = "" # Optional: Add SNS topic for alarms
  log_level            = var.log_level

  common_tags = {
    Environment = var.environment
    Project     = "sts-career"
    ManagedBy   = "terraform"
  }
}
```

### Step 3: Add API Gateway Routes (Dynamic Integration)

The module provides an `api_routes` output that contains all route specifications. Dynamically create API Gateway integrations and routes from this output:

```hcl
# Create integrations for org-module routes
resource "aws_apigatewayv2_integration" "org_module" {
  for_each = { for route in module.org_module.api_routes : "${route.method} ${route.path}" => route }

  api_id           = module.api_gateway.api_id
  integration_type = "AWS_PROXY"
  integration_uri  = each.value.integration

  # Timeout for Lambda integration (default: 30000ms)
  timeout_milliseconds = 30000
}

# Create routes for org-module endpoints
resource "aws_apigatewayv2_route" "org_module" {
  for_each = { for route in module.org_module.api_routes : "${route.method} ${route.path}" => route }

  api_id    = module.api_gateway.api_id
  route_key = "${each.value.method} ${each.value.path}"
  target    = "integrations/${aws_apigatewayv2_integration.org_module[each.key].id}"

  # Apply authorization based on route.public flag
  authorization_type = each.value.public ? "NONE" : "CUSTOM"
  authorizer_id      = each.value.public ? null : module.api_gateway.authorizer_id
}
```

**Key Benefits:**

- **Automatic Route Discovery**: New endpoints added to the module are automatically deployed
- **Less Boilerplate**: No need to manually define each route
- **Consistent Authorization**: Routes inherit authorization settings from module specification
- **DRY Principle**: Route definitions live in one place (module outputs)

### Step 4: Add Lambda Permissions

Grant API Gateway permission to invoke the Lambda functions:

```hcl
resource "aws_lambda_permission" "org_module" {
  for_each = module.org_module.lambda_function_names

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${module.api_gateway.api_execution_arn}/*/*"
}
```

### Step 5: Deploy

```bash
cd sts-career-infra/terraform/environments/dev
terraform init
terraform plan
terraform apply
```

## Environment Variables

Lambda functions receive these environment variables:

| Variable              | Value                     | Description                                  |
| --------------------- | ------------------------- | -------------------------------------------- |
| `REGION`              | `var.aws_region`          | AWS region                                   |
| `SUPABASE_SECRET_ARN` | `var.supabase_secret_arn` | Secrets Manager ARN for Supabase credentials |
| `LOG_LEVEL`           | `var.log_level`           | Logging level                                |

**Secrets Manager Secret Format:**

```json
{
  "url": "https://xxx.supabase.co",
  "service_role_key": "eyJhbGc..."
}
```

## API Endpoints

### Identity Management

| Method | Path                    | Function              | Description                     |
| ------ | ----------------------- | --------------------- | ------------------------------- |
| POST   | `/identities/provision` | identities-management | Provision Okta user to Supabase |

### Profile Management

| Method | Path           | Function | Description                 |
| ------ | -------------- | -------- | --------------------------- |
| GET    | `/profiles/me` | profiles | Get current user profile    |
| PUT    | `/profiles/me` | profiles | Update current user profile |

### Organization Management

| Method | Path         | Function | Description               |
| ------ | ------------ | -------- | ------------------------- |
| GET    | `/orgs`      | orgs     | List user's organizations |
| POST   | `/orgs`      | orgs     | Create new organization   |
| GET    | `/orgs/{id}` | orgs     | Get organization details  |
| PUT    | `/orgs/{id}` | orgs     | Update organization       |
| DELETE | `/orgs/{id}` | orgs     | Delete organization       |

### Membership Management

| Method | Path                            | Function | Description                |
| ------ | ------------------------------- | -------- | -------------------------- |
| GET    | `/orgs/{id}/members`            | members  | List organization members  |
| POST   | `/orgs/{id}/members`            | members  | Add member to organization |
| PUT    | `/orgs/{id}/members/{memberId}` | members  | Update member role         |
| DELETE | `/orgs/{id}/members/{memberId}` | members  | Remove member              |

## Monitoring

### CloudWatch Logs

Lambda functions log to CloudWatch Logs:

- **Log Group Pattern:** `/aws/lambda/{env}-org-{function-name}`
- **Retention:** Configured by Lambda basic execution role

**Log Levels:**

- `DEBUG` - Detailed debugging information
- `INFO` - General information (default)
- `WARNING` - Warning messages
- `ERROR` - Error messages

### CloudWatch Alarms

If SNS topic is configured, alarms trigger when:

- Error count exceeds 5 in 5-minute window
- Notifications sent to SNS topic

## Troubleshooting

### Build Fails: ZIP files not found

**Error:**

```
Error: error creating Lambda Function: InvalidParameterValueException:
Could not find .build/identities-management.zip
```

**Solution:**

```bash
cd ../backend
./build.sh
```

### Secret Not Found

**Error:**

```
Secrets Manager can't find the specified secret
```

**Check:**

1. Verify `supabase_secret_arn` variable is correct
2. Ensure secret exists in AWS Secrets Manager
3. Verify IAM role has `secretsmanager:GetSecretValue` permission

```bash
aws secretsmanager get-secret-value --secret-id {secret-arn}
```

### Permission Denied

**Error:**

```
User is not authorized to perform: secretsmanager:GetSecretValue
```

**Check IAM policy:**

```bash
aws iam get-role-policy \
  --role-name dev-org-lambda-role \
  --policy-name dev-org-secrets-access
```

### Lambda Function Not Invoked

**Check API Gateway integration:**

```bash
aws apigatewayv2 get-routes --api-id {api-id}
```

**Verify Lambda permission:**

```bash
aws lambda get-policy --function-name dev-org-profiles
```

### RLS Policy Blocking Access

**Check Supabase logs:**

1. Go to Supabase Dashboard → Logs
2. Filter by function name
3. Look for RLS policy violations

**Verify JWT token:**

- Token contains correct `user_id` claim
- User is member of organization
- User has required role for operation

## Development

### Testing Locally

Test Lambda functions locally using Python:

```python
import json
from lambda_function import lambda_handler

event = {
    'httpMethod': 'GET',
    'pathParameters': {},
    'queryStringParameters': {},
    'body': None,
    'requestContext': {
        'authorizer': {
            'lambda': {
                'sub': 'test-user-id',
                'username': 'test@example.com'
            }
        }
    }
}

response = lambda_handler(event, None)
print(json.dumps(response, indent=2))
```

### Adding New Lambda Function

1. Create Lambda code in `backend/lambdas/{function-name}/`
2. Update `backend/build.sh` to include new function
3. Add Lambda function resource to `main.tf`
4. Add function to outputs in `outputs.tf`
5. Add API routes to `api_routes` output
6. Build and deploy

## Cost Estimation

**Monthly costs (dev environment, low usage):**

| Resource         | Quantity | Cost                    |
| ---------------- | -------- | ----------------------- |
| Lambda Functions | 4        | ~$0 (free tier)         |
| Lambda Layer     | 1        | $0 (no additional cost) |
| CloudWatch Logs  | ~1 GB    | ~$0.50                  |
| Secrets Manager  | 1 secret | ~$0.40                  |
| **Total**        |          | **~$0.90/month**        |

_Note: Actual costs depend on invocation volume and log retention._

## Resources

- [Backend Documentation](../backend/README.md)
- [Database Schema](../db/schema/)
- [CORA Module Integration Spec](../../../docs/architecture/module-integration-spec.md)
- [AWS Lambda Python](https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html)
- [Supabase Python Client](https://github.com/supabase-community/supabase-py)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

## License

See project root LICENSE file.
