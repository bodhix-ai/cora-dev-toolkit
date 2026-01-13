# CORA Infrastructure Fix Plan

**Date:** December 16, 2025  
**Completed:** December 16, 2025  
**Status:** ✅ **COMPLETED**
**Priority:** CRITICAL  

---

## Problem Summary

The current CORA infrastructure setup is broken because:

1. ❌ **Wrong approach**: Created `cora-module` in infra template that uses S3
2. ❌ **Missing infrastructure**: Templates don't have `infrastructure/` directories in stack modules
3. ❌ **No route exports**: API Gateway has no routes because modules don't export them
4. ❌ **Wrong build flow**: Trying to use S3 instead of local zips

**Result:** Lambda functions exist but are disconnected from API Gateway (404 errors)

---

## The Correct Pattern (from working policy project)

### Structure
```
pm-app-stack/packages/org-module/
├── backend/
│   ├── lambdas/
│   ├── layers/
│   ├── build.sh          # Builds to .build/
│   └── .build/           # Created by build.sh
│       ├── org-common-layer.zip
│       ├── profiles.zip
│       ├── orgs.zip
│       └── members.zip
├── infrastructure/
│   ├── main.tf           # References LOCAL .build/ zips
│   ├── variables.tf
│   ├── outputs.tf        # Exports api_routes
│   └── versions.tf
└── frontend/
```

### Key Pattern Elements

1. **Local Build Files (NOT S3)**
   ```terraform
   # main.tf
   locals {
     build_dir = "${path.module}/../backend/.build"
   }
   
   resource "aws_lambda_function" "profiles" {
     filename         = "${local.build_dir}/profiles.zip"
     source_code_hash = filebase64sha256("${local.build_dir}/profiles.zip")
     # ...
   }
   ```

2. **Route Exports**
   ```terraform
   # outputs.tf
   output "api_routes" {
     value = [
       {
         method      = "GET"
         path        = "/profiles/me"
         integration = aws_lambda_function.profiles.invoke_arn
         public      = false
       },
       # ... more routes
     ]
   }
   ```

3. **Infra Project References Modules**
   ```terraform
   # ai-sec-infra/envs/dev/main.tf
   module "module_access" {
     source = "../../../ai-sec-stack/packages/module-access/infrastructure"
     
     project_name        = "ai-sec"
     environment         = "dev"
     module_name         = "access"
     supabase_secret_arn = module.secrets.supabase_secret_arn
     # ...
   }
   
   module "modular_api_gateway" {
     module_routes = concat(
       module.module_access.api_routes,
       module.module_ai.api_routes,
       module.module_mgmt.api_routes,
       []
     )
   }
   ```

---

## Implementation Plan

### Phase 1: Copy Working Infrastructure to Templates

**Goal:** Add `infrastructure/` to each module in the stack template

**Steps:**

1. **Copy org-module infrastructure to module-access template**
   ```bash
   # Source: working policy project
   cp -r ~/code/policy/pm-app-stack/packages/org-module/infrastructure \
         ~/code/bodhix/cora-dev-toolkit/templates/_cora-core-modules/module-access/
   ```

2. **Adapt for module-access**
   - Update function names in main.tf
   - Add missing functions (idp-config, org-email-domains)
   - Update layer name to `org-common` (currently used in module-access)
   - Update outputs.tf with all module-access routes

3. **Copy and adapt for module-ai**
   - Find working ai-enablement-module in policy project
   - Copy infrastructure/
   - Adapt for module-ai naming and functions

4. **Copy and adapt for module-mgmt**
   - Find working lambda-mgmt-module in policy project
   - Copy infrastructure/
   - Adapt for module-mgmt naming and functions

5. **Update variables.tf for all modules**
   - Ensure consistent variable names
   - Required: `project_name`, `environment`, `module_name`, `supabase_secret_arn`, `aws_region`, `log_level`
   - Optional: `sns_topic_arn` (for CloudWatch alarms)

### Phase 2: Update Stack Template Package Structure

**Goal:** Ensure templates have complete infrastructure

**Steps:**

1. **Verify build.sh exists in each module**
   ```bash
   ls -la templates/_cora-core-modules/module-access/backend/build.sh
   ls -la templates/_cora-core-modules/module-ai/backend/build.sh
   ls -la templates/_cora-core-modules/module-mgmt/backend/build.sh
   ```

2. **Update build.sh if needed**
   - Ensure Python 3.13 flags
   - Verify output to `.build/` directory
   - Check layer and function naming consistency

3. **Add .gitignore to backend/**
   ```
   .build/
   *.pyc
   __pycache__/
   ```

### Phase 3: Clean Up Infra Template

**Goal:** Remove incorrect cora-module approach

**Steps:**

1. **Delete broken cora-module**
   ```bash
   rm -rf templates/_project-infra-template/modules/cora-module/
   ```

2. **Update infra template main.tf**
   - Remove `module "cora_module_access"` block
   - Restore proper module references:
   ```terraform
   module "module_access" {
     source = "../../../${PROJECT_NAME}-stack/packages/module-access/infrastructure"
     
     project_name        = var.project_name
     environment         = var.environment
     module_name         = "access"
     aws_region          = var.aws_region
     supabase_secret_arn = module.secrets.supabase_secret_arn
     log_level           = var.log_level
     
     common_tags = var.common_tags
   }
   
   # Repeat for module-ai and module-mgmt
   ```

3. **Restore API Gateway route collection**
   ```terraform
   module "modular_api_gateway" {
     # ...
     module_routes = concat(
       module.module_access.api_routes,
       module.module_ai.api_routes,
       module.module_mgmt.api_routes,
       []
     )
   }
   ```

### Phase 4: Update ai-sec Project

**Goal:** Fix the broken ai-sec project

**Steps:**

1. **Copy fixed templates to ai-sec**
   ```bash
   # Copy infrastructure directories
   cp -r templates/_cora-core-modules/module-access/infrastructure \
         ~/code/sts/security/ai-sec-stack/packages/module-access/
   
   cp -r templates/_cora-core-modules/module-ai/infrastructure \
         ~/code/sts/security/ai-sec-stack/packages/module-ai/
   
   cp -r templates/_cora-core-modules/module-mgmt/infrastructure \
         ~/code/sts/security/ai-sec-stack/packages/module-mgmt/
   ```

2. **Rebuild Lambda packages**
   ```bash
   cd ~/code/sts/security/ai-sec-stack/packages/module-access/backend
   ./build.sh
   
   cd ~/code/sts/security/ai-sec-stack/packages/module-ai/backend
   ./build.sh
   
   cd ~/code/sts/security/ai-sec-stack/packages/module-mgmt/backend
   ./build.sh
   ```

3. **Update ai-sec-infra main.tf**
   - Remove `module "cora_module_access"` block
   - Add proper module references (see Phase 3, step 2)
   - Fix OIDC provider: `create_oidc_provider = false`

4. **Run Terraform**
   ```bash
   cd ~/code/sts/security/ai-sec-infra/envs/dev
   terraform init
   terraform plan -var-file=local-secrets.tfvars
   terraform apply -var-file=local-secrets.tfvars
   ```

### Phase 5: Verify and Test

**Steps:**

1. **Verify Lambda functions**
   ```bash
   export AWS_PROFILE=ai-sec-nonprod
   aws lambda list-functions --query 'Functions[?contains(FunctionName, `ai-sec-dev-access`)].FunctionName'
   ```

2. **Verify Lambda layer**
   ```bash
   aws lambda get-function --function-name ai-sec-dev-access-profiles \
     --query 'Configuration.{Layers:Layers[*].Arn,LastModified:LastModified}'
   ```

3. **Verify API Gateway routes**
   ```bash
   aws apigatewayv2 get-routes --api-id <API_ID> \
     --query 'Items[?contains(RouteKey, `profile`)].{Route:RouteKey,Target:Target}'
   ```

4. **Test endpoints**
   - Navigate to application
   - Test /profiles/me
   - Check Lambda logs for errors
   - Verify NO import errors!

---

## Success Criteria

✅ Templates have complete infrastructure/ directories  
✅ ai-sec Lambda functions updated with Python 3.13  
✅ API Gateway routes restored and working  
✅ No 404 errors on /profiles/me  
✅ Lambda logs show no import errors  
✅ User provisioning works  

---

## Common Issues and Solutions

### Issue: "No such file or directory" for .build/

**Solution:** Run build.sh first!
```bash
cd packages/module-access/backend
./build.sh
```

### Issue: Terraform can't find module

**Solution:** Verify relative path is correct
```terraform
source = "../../../${PROJECT_NAME}-stack/packages/module-access/infrastructure"
```

### Issue: Routes still not working

**Solution:** Check that:
1. Module outputs api_routes
2. API Gateway module receives module_routes
3. Lambda permissions are set correctly

---

## Files to Create/Update

### Templates to Update
- `templates/_cora-core-modules/module-access/infrastructure/` (NEW)
  - main.tf
  - variables.tf
  - outputs.tf
  - versions.tf
- `templates/_cora-core-modules/module-ai/infrastructure/` (NEW)
- `templates/_cora-core-modules/module-mgmt/infrastructure/` (NEW)
- `templates/_project-infra-template/modules/` (DELETE cora-module/)
- `templates/_project-infra-template/envs/dev/main.tf` (UPDATE)

### ai-sec Project to Update
- `ai-sec-stack/packages/module-access/infrastructure/` (ADD)
- `ai-sec-stack/packages/module-ai/infrastructure/` (ADD)
- `ai-sec-stack/packages/module-mgmt/infrastructure/` (ADD)
- `ai-sec-infra/envs/dev/main.tf` (FIX)

---

## Estimated Time

- Phase 1: 30 minutes
- Phase 2: 10 minutes
- Phase 3: 15 minutes
- Phase 4: 20 minutes
- Phase 5: 15 minutes

**Total: ~90 minutes**

---

## Reference

**Working Project:** `/Users/aaron/code/policy/pm-app-stack/`  
**Working Module:** `packages/org-module/infrastructure/`  
**Broken Project:** `/Users/aaron/code/sts/security/ai-sec-*`  
**Templates:** `/Users/aaron/code/bodhix/cora-dev-toolkit/templates/`
