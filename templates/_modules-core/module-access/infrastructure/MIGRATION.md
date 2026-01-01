# Migration Guide: Replacing user-management with org-module

This guide explains how to migrate from the old `user-management` Lambda to the new org-module infrastructure.

## Overview

**What's Being Replaced:**

- **Old Lambda:** `user-management` (single Lambda with 5 endpoints)
- **Old Routes:** `/user/*` and `/organizations`
- **Status:** Partially implemented, not fully tested, no RLS/audit support

**What's Being Added:**

- **New Module:** `org-module` (4 Lambda functions with 12 endpoints)
- **New Routes:** `/identities/*`, `/profiles/*`, `/orgs/*`
- **Benefits:** Complete RLS support, audit logging, RBAC, comprehensive testing

## Route Comparison

### Old Routes (Being Removed)

| Method | Path                         | Lambda          | Status           |
| ------ | ---------------------------- | --------------- | ---------------- |
| GET    | `/user/profile`              | user-management | Untested         |
| GET    | `/user/organizations`        | user-management | Untested         |
| PUT    | `/user/current-organization` | user-management | Untested         |
| POST   | `/user/initialize`           | user-management | Partially tested |
| POST   | `/organizations`             | user-management | Partially tested |

### New Routes (Being Added)

| Method | Path                            | Lambda                | Replaces                     |
| ------ | ------------------------------- | --------------------- | ---------------------------- |
| POST   | `/identities/provision`         | identities-management | `/user/initialize`           |
| GET    | `/profiles/me`                  | profiles              | `/user/profile`              |
| PUT    | `/profiles/me`                  | profiles              | `/user/current-organization` |
| GET    | `/orgs`                         | orgs                  | `/user/organizations`        |
| POST   | `/orgs`                         | orgs                  | `/organizations`             |
| GET    | `/orgs/{id}`                    | orgs                  | New                          |
| PUT    | `/orgs/{id}`                    | orgs                  | New                          |
| DELETE | `/orgs/{id}`                    | orgs                  | New                          |
| GET    | `/orgs/{id}/members`            | members               | New                          |
| POST   | `/orgs/{id}/members`            | members               | New                          |
| PUT    | `/orgs/{id}/members/{memberId}` | members               | New                          |
| DELETE | `/orgs/{id}/members/{memberId}` | members               | New                          |

## Key Workflow: First User Login & Org Creation

### Old Flow (user-management)

```
1. User logs in via Okta
2. Frontend calls POST /user/initialize
3. Lambda creates user record
4. Frontend calls POST /organizations
5. Lambda creates org, makes user owner
```

### New Flow (org-module)

```
1. User logs in via Okta
2. Frontend calls POST /identities/provision
   - Creates external_identity record
   - Creates profile record
   - Returns user profile with empty org list
3. Frontend calls POST /orgs
   - Creates organization
   - Automatically adds user as org_owner
   - Creates org_members record
   - Returns org details
4. Frontend calls PUT /profiles/me with {current_org_id}
   - Sets user's active organization
   - Returns updated profile
```

**Key Differences:**

- **RLS Enforcement:** All operations respect row-level security
- **Audit Trail:** All changes logged in audit_log table
- **RBAC:** Proper role-based access control enforced
- **Separation of Concerns:** Identity provisioning separate from org management

## Migration Steps

### Prerequisites

1. **Database Schema Deployed:**

   ```bash
   # Verify org-module schema is deployed to Supabase
   # Check for tables: external_identities, profiles, org, org_members, audit_log
   ```

2. **Lambda Packages Built:**

   ```bash
   cd sts-career-stack/packages/org-module/backend
   ./build.sh
   ```

3. **Secrets Configured:**
   ```bash
   # Verify Supabase credentials in AWS Secrets Manager
   aws secretsmanager get-secret-value --secret-id dev-supabase-credentials
   ```

### Step 1: Remove Old user-management Infrastructure

Edit `sts-career-infra/terraform/environments/dev/main.tf`:

```hcl
# REMOVE this block:
module "user_management" {
  source = "../../modules/lambda"

  environment     = local.environment
  function_name   = "user-management"
  description     = "User management API (5 endpoints: user profile, organizations, initialization, organization creation)"
  source_dir      = "${path.module}/../../../../sts-career-stack/apps/backend/lambdas/user-management"
  lambda_role_arn = module.lambda_role.role_arn
  layer_arns      = [module.common_layer.layer_arn]
  memory_size     = 256
  timeout         = 30

  environment_variables = {
    SUPABASE_URL              = module.secrets.secret_arns["supabase-credentials"]
    SUPABASE_SERVICE_ROLE_KEY = module.secrets.secret_arns["supabase-credentials"]
    REGION                    = local.region
  }

  tags = local.common_tags
}
```

Remove old routes from API Gateway:

```hcl
# REMOVE these from lambda_integrations:
lambda_integrations = {
  # ... other integrations
  # user_management = { invoke_arn = module.user_management.function_invoke_arn }  # REMOVE
}

# REMOVE these from routes:
routes = {
  # ... other routes
  # get_user_profile = {                        # REMOVE
  #   route_key       = "GET /user/profile"
  #   integration_key = "user_management"
  #   public          = false
  # }
  # get_user_organizations = {                  # REMOVE
  #   route_key       = "GET /user/organizations"
  #   integration_key = "user_management"
  #   public          = false
  # }
  # put_user_current_organization = {           # REMOVE
  #   route_key       = "PUT /user/current-organization"
  #   integration_key = "user_management"
  #   public          = false
  # }
  # post_user_initialize = {                    # REMOVE
  #   route_key       = "POST /user/initialize"
  #   integration_key = "user_management"
  #   public          = false
  # }
  # post_organizations = {                      # REMOVE
  #   route_key       = "POST /organizations"
  #   integration_key = "user_management"
  #   public          = false
  # }
}
```

Remove old Lambda permissions:

```hcl
# REMOVE from aws_lambda_permission.api_gateway_invoke for_each:
resource "aws_lambda_permission" "api_gateway_invoke" {
  for_each = {
    resume_management        = module.resume_management.function_name
    certification_management = module.certification_management.function_name
    document_upload          = module.document_upload.function_name
    support                  = module.support.function_name
    external_integration     = module.external_integration.function_name
    campaign_management      = module.campaign_management.function_name
    admin_operations         = module.admin_operations.function_name
    # user_management          = module.user_management.function_name  # REMOVE THIS LINE
  }

  # ... rest of config
}
```

### Step 2: Add org-module Infrastructure

Add module import to `sts-career-infra/terraform/environments/dev/main.tf`:

```hcl
# =============================================================================
# Org-Module Infrastructure
# =============================================================================

module "org_module" {
  source = "../../../../sts-career-stack/packages/org-module/infrastructure"

  environment          = var.environment
  module_name          = "org"
  aws_region           = var.aws_region
  supabase_secret_arn  = module.secrets.secret_arns["supabase-credentials"]
  sns_topic_arn        = "" # Optional: Add SNS topic ARN for CloudWatch alarms
  log_level            = var.log_level

  common_tags = {
    Environment = var.environment
    Project     = "sts-career"
    ManagedBy   = "terraform"
  }
}
```

### Step 3: Add API Gateway Routes (Dynamic Integration)

Add after the module definition:

```hcl
# =============================================================================
# Org-Module API Gateway Integration
# =============================================================================

# Create integrations for org-module routes
resource "aws_apigatewayv2_integration" "org_module" {
  for_each = { for route in module.org_module.api_routes : "${route.method} ${route.path}" => route }

  api_id           = module.api_gateway.api_id
  integration_type = "AWS_PROXY"
  integration_uri  = each.value.integration

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

# Grant API Gateway permission to invoke org-module Lambda functions
resource "aws_lambda_permission" "org_module" {
  for_each = module.org_module.lambda_function_names

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${module.api_gateway.api_execution_arn}/*/*"
}
```

### Step 4: Deploy Changes

```bash
cd sts-career-infra/terraform/environments/dev

# Review changes (should show old resources being destroyed, new ones created)
terraform plan

# Apply changes
terraform apply
```

**Expected Changes:**

```
Plan: 21 to add, 0 to change, 6 to destroy.

Resources to destroy:
  - module.user_management.aws_lambda_function.this
  - aws_lambda_permission.api_gateway_invoke["user_management"]
  - aws_apigatewayv2_route.* (5 old routes)
  - aws_apigatewayv2_integration.* (5 old integrations)

Resources to create:
  - module.org_module.aws_lambda_layer_version.org_common
  - module.org_module.aws_lambda_function.identities_management
  - module.org_module.aws_lambda_function.profiles
  - module.org_module.aws_lambda_function.orgs
  - module.org_module.aws_lambda_function.members
  - module.org_module.aws_iam_role.lambda
  - module.org_module.aws_iam_role_policy_attachment.lambda_basic
  - module.org_module.aws_iam_role_policy.secrets
  - aws_apigatewayv2_integration.org_module (12 routes)
  - aws_apigatewayv2_route.org_module (12 routes)
  - aws_lambda_permission.org_module (4 functions)
  - module.org_module.aws_cloudwatch_metric_alarm.* (4 alarms if SNS configured)
```

### Step 5: Update Frontend

Update the authentication flow in the frontend:

**Old Code (to be replaced):**

```typescript
// POST /user/initialize
const initUser = async (token: string) => {
  const response = await fetch(`${API_URL}/user/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

// POST /organizations
const createOrg = async (name: string, token: string) => {
  const response = await fetch(`${API_URL}/organizations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  return response.json();
};
```

**New Code:**

```typescript
// POST /identities/provision
const provisionUser = async (
  oktaUserId: string,
  email: string,
  name: string,
  token: string
) => {
  const response = await fetch(`${API_URL}/identities/provision`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      okta_user_id: oktaUserId,
      email: email,
      name: name,
    }),
  });
  return response.json();
};

// POST /orgs
const createOrg = async (name: string, token: string) => {
  const response = await fetch(`${API_URL}/orgs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  return response.json();
};

// PUT /profiles/me (set current org)
const setCurrentOrg = async (orgId: string, token: string) => {
  const response = await fetch(`${API_URL}/profiles/me`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ current_org_id: orgId }),
  });
  return response.json();
};
```

**Updated First Login Flow:**

```typescript
async function handleFirstLogin(oktaUser: any, token: string) {
  // Step 1: Provision user identity
  const profile = await provisionUser(
    oktaUser.sub,
    oktaUser.email,
    oktaUser.name,
    token
  );

  // Step 2: Check if user has organizations
  if (profile.data.organizations.length === 0) {
    // Create first organization
    const org = await createOrg(`${oktaUser.name}'s Organization`, token);

    // Set as current organization
    await setCurrentOrg(org.data.id, token);
  } else {
    // User already has org (e.g., invited to another org)
    // Set their first org as current
    await setCurrentOrg(profile.data.organizations[0].id, token);
  }

  // Redirect to dashboard
  router.push("/dashboard");
}
```

## Testing the Migration

### Test Case 1: New User First Login

**Prerequisites:**

- Fresh Okta user (never logged in before)
- Supabase database with org-module schema deployed

**Steps:**

1. Log in to application with new Okta user
2. Frontend should call `POST /identities/provision`
3. Frontend should prompt for organization name
4. Frontend should call `POST /orgs` with organization name
5. Frontend should call `PUT /profiles/me` to set current org
6. User should land on dashboard

**Verification:**

```sql
-- Verify user was provisioned
SELECT * FROM public.external_identities WHERE okta_user_id = '<okta-user-id>';

-- Verify profile was created
SELECT * FROM public.profiles WHERE email = '<user-email>';

-- Verify org was created
SELECT * FROM public.org WHERE name = '<org-name>';

-- Verify user is org owner
SELECT * FROM public.org_members
WHERE user_id = '<user-id>' AND role = 'org_owner';

-- Verify audit trail
SELECT * FROM public.audit_log
WHERE user_id = '<user-id>'
ORDER BY created_at DESC;
```

### Test Case 2: Existing User Login

**Prerequisites:**

- User already provisioned in Supabase
- User already member of an organization

**Steps:**

1. Log in to application with existing user
2. Frontend should call `GET /profiles/me`
3. Should return user profile with organizations list
4. User should land on dashboard with their current org active

**Verification:**

```sql
-- Verify profile retrieval includes orgs
SELECT p.*,
       (SELECT json_agg(json_build_object(
         'id', o.id,
         'name', o.name,
         'role', om.role
       ))
       FROM public.org o
       JOIN public.org_members om ON o.id = om.org_id
       WHERE om.user_id = p.id AND om.is_active = true
       ) as organizations
FROM public.profiles p
WHERE p.email = '<user-email>';
```

### Test Case 3: Create Additional Organization

**Prerequisites:**

- Existing user logged in

**Steps:**

1. Navigate to "Create Organization" page
2. Enter organization name
3. Frontend calls `POST /orgs`
4. New organization should be created
5. User should be added as `org_owner`
6. User should be switched to new org

**Verification:**

```sql
-- Verify new org created
SELECT * FROM public.org WHERE name = '<new-org-name>';

-- Verify user is owner
SELECT * FROM public.org_members
WHERE org_id = '<new-org-id>'
  AND user_id = '<user-id>'
  AND role = 'org_owner';

-- Verify audit trail
SELECT * FROM public.audit_log
WHERE table_name = 'org'
  AND operation = 'INSERT'
  AND new_row_data->>'id' = '<new-org-id>';
```

## Rollback Plan

If issues arise during deployment:

### Quick Rollback (Git Revert)

```bash
cd sts-career-infra
git revert HEAD
git push origin main

# Re-run deployment
cd terraform/environments/dev
terraform apply
```

### Manual Rollback

1. **Remove org-module configuration from main.tf**
2. **Restore user-management configuration**
3. **Run terraform apply**
4. **Revert frontend changes**

## Differences from Old Implementation

### 1. Identity Provisioning

- **Old:** Combined with initialization
- **New:** Separate endpoint (`POST /identities/provision`)
- **Benefit:** Clean separation of concerns

### 2. RLS Enforcement

- **Old:** None - direct database access
- **New:** All queries automatically scoped by organization
- **Benefit:** Data isolation guaranteed at database level

### 3. Audit Logging

- **Old:** None
- **New:** All changes logged in `audit_log` table
- **Benefit:** Complete audit trail for compliance

### 4. Role-Based Access Control

- **Old:** No role checks
- **New:** Comprehensive RBAC with 4 org roles + 3 global roles
- **Benefit:** Granular permission management

### 5. Error Handling

- **Old:** Generic error responses
- **New:** Structured error responses with proper status codes
- **Benefit:** Better debugging and user feedback

## Post-Migration Verification

### 1. Verify Lambda Functions

```bash
# List org-module Lambda functions
aws lambda list-functions --query "Functions[?starts_with(FunctionName, 'dev-org')]"

# Verify user-management Lambda is deleted
aws lambda get-function --function-name dev-user-management
# Should return: ResourceNotFoundException
```

### 2. Verify API Gateway Routes

```bash
# Get API Gateway ID
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='dev-career-api'].ApiId" --output text)

# List routes
aws apigatewayv2 get-routes --api-id $API_ID --query "Items[?starts_with(RouteKey, 'POST /orgs') || starts_with(RouteKey, 'GET /profiles')]"

# Verify old routes are gone
aws apigatewayv2 get-routes --api-id $API_ID --query "Items[?starts_with(RouteKey, 'GET /user')]"
# Should return empty array
```

### 3. Verify IAM Roles

```bash
# Verify org-module IAM role
aws iam get-role --role-name dev-org-lambda-role

# Verify Secrets Manager permissions
aws iam get-role-policy --role-name dev-org-lambda-role --policy-name dev-org-secrets-access
```

### 4. Test Endpoints

```bash
# Get token from Okta (replace with actual token)
TOKEN="<your-okta-token>"

# Test identity provisioning
curl -X POST https://<api-id>.execute-api.us-east-1.amazonaws.com/identities/provision \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"okta_user_id": "test", "email": "test@example.com", "name": "Test User"}'

# Test profile retrieval
curl -X GET https://<api-id>.execute-api.us-east-1.amazonaws.com/profiles/me \
  -H "Authorization: Bearer $TOKEN"

# Test organization creation
curl -X POST https://<api-id>.execute-api.us-east-1.amazonaws.com/orgs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Organization"}'
```

## Troubleshooting

### Issue: "Secret ARN not provided"

**Cause:** Supabase secret not configured correctly

**Solution:**

```bash
# Verify secret exists
aws secretsmanager get-secret-value --secret-id dev-supabase-credentials

# Check Lambda environment variables
aws lambda get-function-configuration --function-name dev-org-profiles \
  --query 'Environment.Variables'
```

### Issue: "Record not found" after creation

**Cause:** RLS policies blocking access

**Solution:**

- Verify JWT token contains correct user_id
- Check user is member of organization
- Verify RLS helper functions are deployed

```sql
-- Test RLS helper function
SELECT can_access_org_data('<org-id>');
```

### Issue: Frontend getting 401 Unauthorized

**Cause:** Okta token not being passed correctly

**Solution:**

- Verify Authorization header format: `Bearer <token>`
- Check token expiration
- Verify Okta authorizer is configured correctly

## Summary

✅ **Removed:** 1 Lambda function, 5 API routes
✅ **Added:** 4 Lambda functions, 12 API routes, 1 Lambda layer
✅ **Benefits:** RLS enforcement, audit logging, RBAC, comprehensive testing
✅ **Migration:** Clean replacement, no gradual rollout needed
✅ **Testing:** Verify first login flow works end-to-end

The new org-module provides the same functionality as the old user-management Lambda while adding critical features like RLS, audit logging, and proper RBAC.
