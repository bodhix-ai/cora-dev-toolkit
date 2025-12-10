# AI Assistant Guide: Creating CORA-Compliant Modules

**For AI Assistants: Step-by-Step Instructions to Create Modules That Work First Time**

This guide is specifically designed for AI assistants (like Claude, ChatGPT, etc.) to create fully CORA-compliant modules without multiple iteration cycles.

---

## 🤖 Quick Start for AI Assistants

When asked to create a new CORA module, follow this **exact sequence**:

### Phase 1: Information Gathering (CRITICAL - DO FIRST)

```
1. Read these files IN THIS ORDER:
   ✓ packages/_module-template/backend/lambdas/entity/lambda_function.py
   ✓ docs/development/CORA-PATTERNS-COOKBOOK.md (sections 1-6 minimum)
   ✓ docs/development/CORA-PATTERNS-CHECKLIST.md
   ✓ packages/org-module/backend/layers/org-common/python/org_common/__init__.py

2. Understand the request:
   - Module name (must end in -module)
   - Entity name (singular, lowercase)
   - Entity fields and their types
   - Business logic requirements
```

### Phase 2: Use the Generator Script (RECOMMENDED)

```bash
# Let the script do the heavy lifting
./scripts/create-cora-module.sh <module-name> <entity-name>

# Example:
./scripts/create-cora-module.sh resume-module resume
```

**Then customize** the generated code for specific requirements.

### Phase 3: Manual Creation (If Generator Not Used)

If you must create manually, follow this checklist:

---

## ✅ CORA Compliance Checklist for AI

Use this checklist when creating OR reviewing code:

### Backend Lambda Function

```python
# 1. IMPORTS (REQUIRED)
import json
from typing import Dict, Any, List
import org_common as common  # ✓ MUST use 'common' alias

# 2. LAMBDA HANDLER SIGNATURE (REQUIRED)
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    # ✓ MUST log incoming request
    print(json.dumps(event, default=str))

    try:
        # ✓ MUST extract user context
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']

        # ✓ MUST convert to Supabase UUID
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)

        # ✓ MUST support both API Gateway v1 and v2 formats
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
        if not http_method:
            return common.bad_request_response('HTTP method not found in request')

        # ✓ MUST handle OPTIONS for CORS
        if http_method == 'OPTIONS':
            return common.success_response({})

        # Route to handlers...

    # ✓ MUST have comprehensive error handling
    except KeyError as e:
        print(f'KeyError: {str(e)}')
        return common.unauthorized_response(f'Missing user information: {str(e)}')
    except common.NotFoundError as e:
        print(f'NotFoundError: {str(e)}')
        return common.unauthorized_response(f'User not found: {str(e)}') if 'user' in str(e).lower() \
            else common.not_found_response(str(e))
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response('Internal server error')
```

### Multi-Tenant Data Access (CRITICAL)

```python
# ✓ ALWAYS require org_id in GET endpoints
def handle_get_all(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    query_params = event.get('queryStringParameters', {}) or {}

    # ✓ MUST require org_id
    org_id = query_params.get('orgId')
    if not org_id:
        raise common.ValidationError('orgId query parameter is required')

    # ✓ MUST validate UUID
    org_id = common.validate_uuid(org_id, 'orgId')

    # ✓ MUST verify user has access to organization
    membership = common.find_one(
        table='org_members',
        filters={'org_id': org_id, 'person_id': user_id, 'active': True}
    )
    if not membership:
        raise common.ForbiddenError('You do not have access to this organization')

    # ✓ MUST filter by org_id in query
    entities = common.find_many(
        table='entity',
        filters={'org_id': org_id},  # REQUIRED!
        select='*'
    )

    return common.success_response(common.format_records(entities))
```

### Create/Update Operations

```python
# ✓ CREATE: MUST include org_id and created_by
def handle_create(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))

    # ✓ MUST validate required fields
    org_id = common.validate_required(body.get('org_id'), 'org_id')
    org_id = common.validate_uuid(org_id, 'org_id')

    # ✓ MUST verify org access before creating
    membership = common.find_one(
        table='org_members',
        filters={'org_id': org_id, 'person_id': user_id, 'active': True}
    )
    if not membership:
        raise common.ForbiddenError('You do not have access to this organization')

    # ✓ MUST include org_id and created_by
    entity = common.insert_one(
        table='entity',
        data={
            'org_id': org_id,       # REQUIRED
            'created_by': user_id,  # REQUIRED
            **other_fields
        }
    )

    # ✓ MUST use created_response (201)
    return common.created_response(common.format_record(entity))

# ✓ UPDATE: MUST verify access and include updated_by
def handle_update(event: Dict[str, Any], user_id: str, entity_id: str) -> Dict[str, Any]:
    # ✓ MUST validate UUID
    entity_id = common.validate_uuid(entity_id, 'entity_id')

    # ✓ MUST fetch existing to verify access
    entity = common.find_one(table='entity', filters={'id': entity_id})
    if not entity:
        raise common.NotFoundError('Entity not found')

    # ✓ MUST verify org access
    membership = common.find_one(
        table='org_members',
        filters={'org_id': entity['org_id'], 'person_id': user_id, 'active': True}
    )
    if not membership:
        raise common.ForbiddenError('You do not have access to this entity')

    # ✓ MUST include updated_by
    updated = common.update_one(
        table='entity',
        filters={'id': entity_id},
        data={**update_fields, 'updated_by': user_id}  # REQUIRED
    )

    return common.success_response(common.format_record(updated))
```

---

## 🚫 NEVER Do These Things

### ❌ Direct statusCode Returns

```python
# ❌ NEVER do this:
return {
    'statusCode': 200,
    'body': json.dumps({'data': result})
}

# ✅ ALWAYS do this:
return common.success_response(result)
```

### ❌ Queries Without org_id

```python
# ❌ NEVER do this:
entities = common.find_many(table='entity', select='*')

# ✅ ALWAYS do this:
entities = common.find_many(
    table='entity',
    filters={'org_id': org_id},  # REQUIRED
    select='*'
)
```

### ❌ Missing User Context

```python
# ❌ NEVER do this:
def lambda_handler(event, context):
    # Direct access without user context
    entities = get_all_entities()

# ✅ ALWAYS do this:
def lambda_handler(event, context):
    user_info = common.get_user_from_event(event)
    user_id = common.get_supabase_user_id_from_okta_uid(user_info['user_id'])
    entities = get_all_entities(user_id, org_id)
```

### ❌ Unvalidated Input

```python
# ❌ NEVER do this:
org_id = body.get('org_id')
entity = create_entity(org_id)

# ✅ ALWAYS do this:
org_id = common.validate_required(body.get('org_id'), 'org_id')
org_id = common.validate_uuid(org_id, 'org_id')
entity = create_entity(org_id)
```

---

## 🏗️ Infrastructure & Deployment Architecture

**CRITICAL: Every CORA module is a full-stack unit with its own Terraform configuration.**

### Module Structure (Complete Full-Stack)

```
pm-app-stack/packages/my-module/
├── backend/
│   ├── lambdas/
│   │   └── entity/
│   │       ├── Dockerfile         # Lambda container definition
│   │       ├── lambda_function.py # Lambda handler code
│   │       └── requirements.txt   # Python dependencies
│   └── layers/                    # Optional: shared utilities
├── db/schema/                     # Database migrations
│   ├── 001-tables.sql
│   └── 002-rls-policies.sql
├── frontend/                      # React components
│   ├── components/
│   ├── hooks/
│   └── types/
└── infrastructure/                # ⚡ Terraform configuration
    ├── main.tf                    # Lambda, IAM, CloudWatch resources
    ├── variables.tf               # Input variables (image URI, etc.)
    ├── outputs.tf                 # Exports api_routes, Lambda ARNs
    └── versions.tf                # Terraform version constraints
```

### Deployment Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. BUILD (pm-app-stack)                                 │
├─────────────────────────────────────────────────────────┤
│ docker build packages/my-module/backend/lambdas/entity  │
│ docker tag → <account>.dkr.ecr.us-east-1.amazonaws.com  │
│ docker push                                             │
│ → Outputs: ECR image URI with digest                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. DEPLOY (pm-app-infra)                                │
├─────────────────────────────────────────────────────────┤
│ # Import module Terraform from pm-app-stack             │
│ module "my_module" {                                     │
│   source = "../pm-app-stack/packages/my-module/infrastructure" │
│   lambda_image_uri = var.my_module_lambda_image_uri    │
│   ...                                                   │
│ }                                                        │
│                                                          │
│ # Wire module routes to CORA API Gateway                │
│ module "modular_api_gateway" {                          │
│   module_routes = concat(                               │
│     module.my_module.api_routes,                        │
│     module.other_module.api_routes                      │
│   )                                                      │
│ }                                                        │
└─────────────────────────────────────────────────────────┘
```

### Infrastructure Files You MUST Create

#### 1. `infrastructure/versions.tf`

```hcl
terraform {
  required_version = ">= 1.4.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}
```

#### 2. `infrastructure/variables.tf`

```hcl
variable "project_name" {
  description = "Project name (used in resource naming prefix)"
  type        = string
  default     = "pm-app"
}

variable "environment" {
  description = "Environment name (dev, tst, stg, prd)"
  type        = string
}

variable "module_name" {
  description = "Name of the module (used in resource naming)"
  type        = string
  default     = "my-module"
}

variable "lambda_image_uri" {
  description = "Docker image URI for the Lambda function"
  type        = string
}

variable "supabase_secret_arn" {
  description = "ARN of Supabase credentials in AWS Secrets Manager"
  type        = string
  sensitive   = true
}

variable "log_level" {
  description = "Log level (DEBUG, INFO, WARNING, ERROR)"
  type        = string
  default     = "INFO"
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
```

#### 3. `infrastructure/main.tf`

```hcl
locals {
  prefix = "${var.project_name}-${var.environment}-${var.module_name}"
  tags = merge(var.common_tags, { Module = var.module_name })
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda" {
  name = "${local.prefix}-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda Function (uses Docker image from ECR)
resource "aws_lambda_function" "entity" {
  function_name = "${local.prefix}-entity"
  package_type  = "Image"
  image_uri     = var.lambda_image_uri
  role          = aws_iam_role.lambda.arn
  timeout       = 30
  memory_size   = 512
  publish       = true

  environment {
    variables = {
      SUPABASE_SECRET_ARN = var.supabase_secret_arn
      LOG_LEVEL           = var.log_level
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

resource "aws_lambda_alias" "entity" {
  name             = "live"
  function_name    = aws_lambda_function.entity.function_name
  function_version = aws_lambda_function.entity.version
}

resource "aws_cloudwatch_log_group" "entity" {
  name              = "/aws/lambda/${aws_lambda_function.entity.function_name}"
  retention_in_days = 14
  tags              = local.tags
}
```

#### 4. `infrastructure/outputs.tf` (CRITICAL - Exports Routes)

```hcl
output "lambda_function_arn" {
  value = aws_lambda_function.entity.arn
}

output "lambda_invoke_arn" {
  value = aws_lambda_alias.entity.invoke_arn
}

# ⚡ REQUIRED: Export API routes for dynamic gateway provisioning
output "api_routes" {
  description = "API Gateway routes for this module"
  value = [
    {
      method      = "GET"
      path        = "/my-module/entities"
      integration = aws_lambda_alias.entity.invoke_arn
      public      = false
    },
    {
      method      = "POST"
      path        = "/my-module/entities"
      integration = aws_lambda_alias.entity.invoke_arn
      public      = false
    },
    {
      method      = "GET"
      path        = "/my-module/entities/{id}"
      integration = aws_lambda_alias.entity.invoke_arn
      public      = false
    },
    {
      method      = "PUT"
      path        = "/my-module/entities/{id}"
      integration = aws_lambda_alias.entity.invoke_arn
      public      = false
    },
    {
      method      = "DELETE"
      path        = "/my-module/entities/{id}"
      integration = aws_lambda_alias.entity.invoke_arn
      public      = false
    }
  ]
}
```

### Integration in Main Infrastructure

The main infrastructure (pm-app-infra) imports your module and wires routes:

```hcl
# In pm-app-infra/envs/dev/main.tf

module "my_module" {
  source = "../../../pm-app-stack/packages/my-module/infrastructure"

  environment         = var.environment
  lambda_image_uri    = var.my_module_lambda_image_uri
  supabase_secret_arn = var.supabase_secret_arn
  common_tags         = local.common_tags
}

module "modular_api_gateway" {
  source = "../../modules/modular-api-gateway"

  name_prefix   = var.name_prefix
  environment   = var.environment
  module_routes = concat(
    module.my_module.api_routes,
    module.other_module.api_routes
  )
}
```

### Key Principles

1. **Self-Contained**: Each module has ALL its infrastructure in `infrastructure/`
2. **Docker-Based**: Lambdas use Docker images (not zip files)
3. **ECR Storage**: Images pushed to ECR, referenced by digest
4. **Dynamic Routing**: Module outputs `api_routes`, main infra creates API Gateway routes
5. **Separate Repos**: Code in pm-app-stack, orchestration in pm-app-infra

---

## 🔍 Verification Steps

After creating code AND infrastructure, **ALWAYS** run these checks:

### 1. Run Compliance Checker

```bash
cd sts-career-stack
python3 scripts/check-api-compliance.py
```

**Expected output for compliant code:**

```
✅ COMPLIANT LAMBDA FUNCTIONS
  📦 your-module (1 Lambda)
     ✓ your-entity
```

### 2. Self-Check Against Template

Compare your code to `packages/_module-template/backend/lambdas/entity/lambda_function.py`:

- [ ] Imports match?
- [ ] Lambda handler structure matches?
- [ ] Error handling matches?
- [ ] All handlers follow same pattern?

### 3. Compliance Checklist

```
Backend Lambda:
- [ ] Imports org_common as common
- [ ] Uses get_user_from_event()
- [ ] Uses get_supabase_user_id_from_okta_uid()
- [ ] All responses use common.success_response() etc.
- [ ] All queries filter by org_id
- [ ] All creates include org_id and created_by
- [ ] All updates include updated_by
- [ ] All inputs are validated
- [ ] Comprehensive error handling
- [ ] OPTIONS method handled for CORS

Frontend Component:
- [ ] Uses createAuthenticatedClient from @sts-career/api-client
- [ ] Uses useOrganizationContext from @sts-career/org-module-frontend
- [ ] All API calls include orgId parameter
- [ ] Loading and error states handled
- [ ] Uses MUI sx prop (no styled-components)
- [ ] Icon-only buttons have aria-label
- [ ] Error boundaries in place
```

---

## 📋 Complete Example Workflow

### Scenario: User asks "Create a skills module to track employee skills"

#### Step 1: Read Reference Files

```
Read in order:
1. packages/_module-template/backend/lambdas/entity/lambda_function.py
2. docs/development/CORA-PATTERNS-COOKBOOK.md (sections 1-6)
3. docs/development/CORA-PATTERNS-CHECKLIST.md
```

#### Step 2: Use Generator

```bash
./scripts/create-cora-module.sh skills-module skill
```

#### Step 3: Customize Generated Code

The generator creates:

- `packages/skills-module/backend/lambdas/skill/lambda_function.py`
- Already 100% compliant with CORA patterns
- Just add business logic

#### Step 4: Add Business Logic

```python
# In handle_create(), add skill-specific validation:
def handle_create(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))

    # Standard CORA validation (already in template)
    org_id = common.validate_required(body.get('org_id'), 'org_id')
    org_id = common.validate_uuid(org_id, 'org_id')

    # Skill-specific validation (add this)
    name = common.validate_required(body.get('name'), 'name')
    name = common.validate_string_length(name, 'name', min_length=1, max_length=100)

    skill_level = body.get('skill_level', 'beginner')
    skill_level = common.validate_choices(
        skill_level,
        'skill_level',
        choices=['beginner', 'intermediate', 'advanced', 'expert']
    )

    # Standard CORA org access check (already in template)
    membership = common.find_one(
        table='org_members',
        filters={'org_id': org_id, 'person_id': user_id, 'active': True}
    )
    if not membership:
        raise common.ForbiddenError('You do not have access to this organization')

    # Create with CORA-compliant data structure (already in template)
    skill = common.insert_one(
        table='skill',
        data={
            'org_id': org_id,
            'name': name,
            'skill_level': skill_level,  # Business logic field
            'created_by': user_id
        }
    )

    return common.created_response(common.format_record(skill))
```

#### Step 5: Verify Compliance

```bash
python3 scripts/check-api-compliance.py
```

Should show:

```
✅ skills-module (1 Lambda)
   ✓ skill
```

#### Step 6: Create Database Schema

```sql
CREATE TABLE public.skill (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    skill_level VARCHAR(20) DEFAULT 'beginner',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- RLS Policies (REQUIRED for multi-tenancy)
ALTER TABLE public.skill ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skill_org_members_select" ON public.skill
    FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM public.org_members
        WHERE person_id = auth.uid() AND active = true
    ));
```

---

## 🎯 Key Patterns to Remember

### 1. The Golden Rule of Multi-Tenancy

**EVERY database query MUST filter by org_id AND verify user membership**

```python
# This pattern appears in EVERY handler:
org_id = get_org_id_from_request()  # From query params or body
verify_user_has_org_access(user_id, org_id)  # Check org_members
query_with_org_filter(org_id)  # Always filter by org_id
```

### 2. The org_common Import Pattern

```python
# ALWAYS use this exact import:
import org_common as common

# Then use common.* for everything:
common.get_user_from_event(event)
common.validate_uuid(id, 'id')
common.find_one(table, filters)
common.success_response(data)
```

### 3. The Response Pattern

```python
# ALWAYS use org_common response functions:
return common.success_response(data)           # 200
return common.created_response(data)           # 201
return common.bad_request_response(message)    # 400
return common.forbidden_response(message)      # 403
return common.not_found_response(message)      # 404
return common.internal_error_response(message) # 500
```

### 4. The User Context Pattern

```python
# ALWAYS extract user context in lambda_handler:
user_info = common.get_user_from_event(event)
okta_uid = user_info['user_id']
supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)

# Then pass supabase_user_id to all handlers
result = handle_operation(supabase_user_id, event)
```

### 5. The Validation Pattern

```python
# ALWAYS validate inputs:
org_id = common.validate_required(body.get('org_id'), 'org_id')
org_id = common.validate_uuid(org_id, 'org_id')
name = common.validate_string_length(name, 'name', min_length=1, max_length=255)
```

---

## 🧠 Mental Model for AI Assistants

Think of CORA module development as:

```
1. User Authentication (get_user_from_event)
   ↓
2. User Authorization (verify org membership)
   ↓
3. Input Validation (validate_*)
   ↓
4. Business Logic (your custom code)
   ↓
5. Database Operation (find_*, insert_one, update_one with org_id filter)
   ↓
6. Standard Response (success_response, error_response)
```

**Every handler follows this exact flow.**

---

## 📊 Success Metrics

Code is CORA-compliant when:

1. ✅ `python3 scripts/check-api-compliance.py` shows module as compliant
2. ✅ Code matches \_module-template structure 100%
3. ✅ All queries filter by org_id
4. ✅ All creates include org_id and created_by
5. ✅ All updates include updated_by
6. ✅ All responses use common.\* functions
7. ✅ All inputs are validated
8. ✅ Error handling covers all exception types

---

## 🔗 Quick Reference Links

When creating modules, keep these open:

1. **Template**: `packages/_module-template/backend/lambdas/entity/lambda_function.py`
2. **Patterns**: `docs/development/CORA-PATTERNS-COOKBOOK.md`
3. **Checklist**: `docs/development/CORA-PATTERNS-CHECKLIST.md`
4. **org_common API**: `packages/org-module/backend/layers/org-common/python/org_common/__init__.py`

---

## 🆘 Troubleshooting

### "Missing org_common import"

```python
# Add this at top of file:
import org_common as common
```

### "Not using standard response functions"

```python
# Replace direct returns:
return {'statusCode': 200, 'body': ...}

# With:
return common.success_response(data)
```

### "Missing org_id filtering"

```python
# Add org_id to all queries:
entities = common.find_many(
    table='entity',
    filters={'org_id': org_id},  # Add this!
    select='*'
)
```

### "Missing user context extraction"

```python
# Add to lambda_handler:
user_info = common.get_user_from_event(event)
user_id = common.get_supabase_user_id_from_okta_uid(user_info['user_id'])
```

---

## 💡 Pro Tips for AI Assistants

1. **Always read the template first** - It's the source of truth
2. **Copy the exact structure** - Don't try to optimize or simplify
3. **Use the generator script** - It does 90% of the work
4. **Validate early and often** - Check compliance after each file
5. **Follow the patterns exactly** - Even if they seem verbose
6. **Include comprehensive comments** - Explain CORA patterns for future developers
7. **Test with compliance checker** - Before claiming completion

---

## ✨ Summary

To create a CORA-compliant module that works first time:

1. **Read** the \_module-template Lambda (250 lines)
2. **Use** the generator script: `./scripts/create-cora-module.sh`
3. **Customize** business logic only
4. **Verify** with compliance checker
5. **Done** - No iteration needed!

The key is: **Don't deviate from the template patterns. They exist for a reason.**
