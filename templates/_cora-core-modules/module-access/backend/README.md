# Org-Module Backend

Backend implementation for the org-module using AWS Lambda functions and Supabase database.

## Architecture

The backend consists of:

- **1 Lambda Layer** (`org-common`) - Shared utilities for all Lambda functions
- **4 Lambda Functions** - Handling 12 API endpoints total

### Lambda Layer: org-common

Provides shared functionality:

- **Supabase Client**: Database connection with secrets management
- **Database Helpers**: Query execution, result formatting
- **Response Builders**: Standard API Gateway response formats
- **Error Handlers**: Custom exception classes
- **Validators**: Input validation functions

**Dependencies:**

- `supabase>=2.3.4` - Supabase client library
- `boto3>=1.34.0` - AWS SDK for Secrets Manager
- `typing-extensions>=4.9.0` - Type hints support

### Lambda Functions

#### 1. identities-management

Handles provisioning of external identities (Okta) to Supabase.

**Endpoints:**

- `POST /identities/provision` - Provision Okta user to Supabase

**Use Case:** Called during authentication flow when a user logs in via Okta for the first time.

#### 2. profiles

Handles user profile operations.

**Endpoints:**

- `GET /profiles/me` - Get current user's profile
- `PUT /profiles/me` - Update current user's profile

**Features:**

- Returns user profile with organization list
- Validates organization membership when switching current org
- Global role updates restricted to global admins

#### 3. orgs

Handles CRUD operations for organizations.

**Endpoints:**

- `GET /orgs` - List user's organizations
- `POST /orgs` - Create new organization
- `GET /orgs/:id` - Get organization details
- `PUT /orgs/:id` - Update organization
- `DELETE /orgs/:id` - Delete organization

**Features:**

- Creator automatically becomes org_owner
- Update/delete requires org_admin or org_owner role
- Includes member count in organization details

#### 4. members

Handles organization membership management.

**Endpoints:**

- `GET /orgs/:id/members` - List organization members
- `POST /orgs/:id/members` - Add member (invite)
- `PUT /orgs/:id/members/:memberId` - Update member role
- `DELETE /orgs/:id/members/:memberId` - Remove member

**Features:**

- Membership management requires org_owner role
- Prevents removing last owner
- Soft delete for member removal
- Returns member profiles with membership info

## Database Access

All Lambda functions use **Supabase** for database access with:

- **Service role key** from AWS Secrets Manager
- **Row Level Security (RLS)** enforcement via JWT tokens
- **15+ RLS helper functions** from org-module schema

### RLS Functions Used

- `can_access_org_data(org_id)` - Read access check
- `can_modify_org_data(org_id)` - Write access check
- `can_manage_org_membership(org_id)` - Membership management check
- `is_org_member(org_id)`, `is_org_admin(org_id)`, `is_org_owner(org_id)` - Role checks

See `packages/org-module/db/schema/007-rls-helper-functions.sql` for full list.

## Building

Run the build script to package Lambda functions and layer:

```bash
cd packages/org-module/backend
./build.sh
```

This creates ZIP files in `.build/` directory:

- `org-common-layer.zip` - Lambda layer
- `identities-management.zip` - Lambda function
- `profiles.zip` - Lambda function
- `orgs.zip` - Lambda function
- `members.zip` - Lambda function

## Environment Variables

Lambda functions require these environment variables:

```bash
REGION=us-east-1
SUPABASE_SECRET_ARN=arn:aws:secretsmanager:region:account:secret:name
```

Secrets Manager secret format:

```json
{
  "url": "https://xxx.supabase.co",
  "service_role_key": "eyJhbGc..."
}
```

## API Response Format

All endpoints return consistent JSON responses:

**Success:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**

```json
{
  "success": false,
  "error": "Error message"
}
```

**Status Codes:**

- `200` - Success (GET, PUT, DELETE)
- `201` - Created (POST)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not authorized)
- `404` - Not Found
- `500` - Internal Server Error

## Authentication

Lambda functions extract user information from API Gateway authorizer context:

```python
user_info = common.get_user_from_event(event)
user_id = user_info['user_id']
email = user_info['email']
```

Expected authorizer format (HTTP API v2):

```json
{
  "requestContext": {
    "authorizer": {
      "lambda": {
        "sub": "user-uuid",
        "username": "user@example.com"
      }
    }
  }
}
```

## Error Handling

Custom exception classes map to HTTP status codes:

- `ValidationError` → 400 Bad Request
- `UnauthorizedError` → 401 Unauthorized
- `ForbiddenError` → 403 Forbidden
- `NotFoundError` → 404 Not Found
- `InternalError` → 500 Internal Server Error

## Testing

### Manual Testing

1. Build Lambda packages:

   ```bash
   ./build.sh
   ```

2. Deploy to AWS Lambda (manually or via Terraform)

3. Test via API Gateway:
   ```bash
   curl -X GET https://api-url/profiles/me \
     -H "Authorization: Bearer <jwt-token>"
   ```

### Local Testing

Create test events matching API Gateway format:

```python
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

from lambda_function import lambda_handler
response = lambda_handler(event, None)
```

## Deployment

See `packages/org-module/infrastructure/` for Terraform deployment configuration.

The backend is deployed as part of the main infrastructure via:

```bash
cd sts-career-infra/terraform/environments/dev
terraform apply
```

## Monitoring

Lambda functions log to CloudWatch:

- Request/response logging
- Error stack traces
- Database query logs

CloudWatch alarms should be configured for:

- Error rate
- Duration (cold starts)
- Throttles

## Security

### Secrets Management

- Secrets stored in AWS Secrets Manager
- Retrieved at runtime (never hardcoded)
- Cached for Lambda function lifetime

### RLS Enforcement

- All queries automatically scoped by organization
- JWT token used for user context
- Service role key bypasses RLS (use carefully)

### Input Validation

- UUID validation for IDs
- Email validation
- String length limits
- Role validation

## Development

### Adding New Endpoints

1. Add handler function to appropriate Lambda
2. Update routing in `lambda_handler()`
3. Add validation using `org_common` validators
4. Use `org_common.find_one/find_many` for queries
5. Return using `org_common.success_response()`

### Adding New Lambda Function

1. Create directory: `lambdas/<function-name>/`
2. Create `lambda_function.py` with handler
3. Create `requirements.txt` (if needed)
4. Update `build.sh` LAMBDAS array
5. Add to Terraform configuration

## Troubleshooting

### "Secret ARN not provided"

- Check `SUPABASE_SECRET_ARN` environment variable
- Verify IAM role has `secretsmanager:GetSecretValue` permission

### "Record not found"

- RLS policies may be blocking access
- Verify user is member of organization
- Check JWT token contains correct user_id

### "Internal server error"

- Check CloudWatch logs for stack traces
- Verify Supabase connection
- Check database schema is up to date

## Resources

- [CORA Module Integration Spec](../../docs/architecture/module-integration-spec.md)
- [Org-Module Database Schema](../db/schema/)
- [Supabase Python Client](https://github.com/supabase-community/supabase-py)
- [AWS Lambda Python](https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html)
