# Local vs S3 Lambda Deployment - Architecture Decision

**Date:** December 16, 2025  
**Status:** Decided - Local Build Pattern  
**Decision:** Use local .build/ zips with Terraform, NOT S3 bucket approach

---

## TL;DR

**Old (WRONG) Approach:** Build Lambda zips → Upload to S3 → Terraform references S3  
**New (CORRECT) Approach:** Build Lambda zips locally → Terraform uploads them directly to AWS

---

## The Two Approaches Compared

### ❌ OLD APPROACH: S3 Bucket Pattern

**Workflow:**
```bash
# 1. Build Lambda zips
cd module-access/backend
./build.sh  # Creates zips in .build/

# 2. Upload to S3
aws s3 cp .build/profiles.zip s3://my-project-lambda-artifacts/lambdas/profiles.zip

# 3. Terraform references S3
terraform apply  # Lambda pulls from S3
```

**Terraform Configuration:**
```terraform
resource "aws_lambda_function" "profiles" {
  function_name = "${local.prefix}-profiles"
  
  # S3 approach - WRONG!
  s3_bucket = var.lambda_bucket  # "my-project-lambda-artifacts"
  s3_key    = "lambdas/profiles.zip"
  
  # No source_code_hash means Terraform can't detect changes!
}
```

**Problems with S3 Approach:**

1. **Two-Step Deployment:** Requires separate script to upload to S3 before Terraform
2. **State Management Issues:** Terraform doesn't track zip file changes properly
3. **Drift Detection Fails:** If someone manually updates S3, Terraform doesn't notice
4. **Extra Infrastructure:** Requires S3 bucket, bucket policies, lifecycle rules
5. **Permissions Complexity:** Need S3 read/write permissions for CI/CD
6. **Version Confusion:** Hard to know which version is deployed
7. **Race Conditions:** Multiple deploys can overwrite each other's S3 objects

### ✅ NEW APPROACH: Local Build Pattern

**Workflow:**
```bash
# 1. Build Lambda zips locally
cd module-access/backend
./build.sh  # Creates zips in .build/

# 2. Terraform handles everything else
cd ../../infrastructure
terraform apply  # Terraform uploads zips directly to Lambda
```

**Terraform Configuration:**
```terraform
locals {
  # Point to local build directory
  build_dir = "${path.module}/../backend/.build"
}

resource "aws_lambda_function" "profiles" {
  function_name = "${local.prefix}-profiles"
  
  # Local approach - CORRECT!
  filename         = "${local.build_dir}/profiles.zip"
  source_code_hash = filebase64sha256("${local.build_dir}/profiles.zip")
  
  # Terraform automatically detects changes and updates Lambda
}
```

**Benefits of Local Approach:**

1. **Single-Step Deployment:** Just run `terraform apply`
2. **Automatic Change Detection:** `source_code_hash` ensures Terraform knows when code changed
3. **No Drift:** Terraform is source of truth for Lambda code
4. **Simpler Infrastructure:** No S3 bucket needed
5. **Simpler Permissions:** Only Lambda deployment permissions needed
6. **Clear Version Control:** Git + Terraform state = complete picture
7. **Atomic Updates:** Terraform handles the entire deployment transaction

---

## Architecture Comparison

### Old S3 Pattern (BROKEN)

```
┌─────────────────────────────────────────────────────────────┐
│ Developer Workflow                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Edit Lambda code                                         │
│  2. Run ./build.sh  → Creates .build/profiles.zip           │
│  3. Run ./deploy-to-s3.sh  → Uploads to S3                  │
│  4. Run terraform apply  → Updates Lambda                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌────────────────┐      ┌──────────────┐      ┌──────────────┐
│   Developer    │ ───► │  S3 Bucket   │ ───► │  AWS Lambda  │
│   Machine      │      │  (staging)   │      │  (runtime)   │
└────────────────┘      └──────────────┘      └──────────────┘
     |                        |                      |
     |                        └──────────────────────┘
     |                   Terraform reads from S3
     |
     └──── Terraform doesn't know if zip changed! ❌
```

**Key Problem:** Terraform only knows the S3 key name (`lambdas/profiles.zip`), not the actual content. If you update the zip in S3, Terraform doesn't detect the change.

### New Local Pattern (CORRECT)

```
┌─────────────────────────────────────────────────────────────┐
│ Developer Workflow                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Edit Lambda code                                         │
│  2. Run ./build.sh  → Creates .build/profiles.zip           │
│  3. Run terraform apply  → Terraform does everything         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌────────────────┐                        ┌──────────────┐
│   Developer    │ ──────────────────────►│  AWS Lambda  │
│   Machine      │   Terraform uploads     │  (runtime)   │
└────────────────┘   zip directly          └──────────────┘
     |
     └──── source_code_hash = hash of local zip ✅
           Terraform detects ANY change!
```

**Key Benefit:** Terraform computes the hash of the local zip file. If the zip changes (even by 1 byte), Terraform detects it and updates Lambda.

---

## Real-World Example: Why This Matters

### Scenario: You fix a bug in profiles Lambda

**With S3 Approach (OLD):**
```bash
# 1. Edit code
vim lambdas/profiles/lambda_function.py

# 2. Build
./build.sh  # Creates .build/profiles.zip

# 3. Upload to S3
aws s3 cp .build/profiles.zip s3://my-bucket/lambdas/profiles.zip

# 4. Run Terraform
terraform plan
# Output: No changes. Infrastructure is up-to-date. ❌ WRONG!
# Terraform doesn't know the S3 object changed!

# 5. Force update (workaround)
terraform taint aws_lambda_function.profiles  # Manually mark as changed
terraform apply  # Now it updates

# RESULT: Extra manual steps, error-prone
```

**With Local Approach (NEW):**
```bash
# 1. Edit code
vim lambdas/profiles/lambda_function.py

# 2. Build
./build.sh  # Creates .build/profiles.zip

# 3. Run Terraform
terraform plan
# Output: 
#   ~ resource "aws_lambda_function" "profiles" {
#       ~ source_code_hash = "abc123..." -> "def456..."  ✅ DETECTED!
#     }

terraform apply  # Automatically updates Lambda

# RESULT: Works perfectly, no manual intervention
```

---

## Technical Deep Dive: How source_code_hash Works

### What is `source_code_hash`?

```terraform
resource "aws_lambda_function" "profiles" {
  filename         = "${local.build_dir}/profiles.zip"
  source_code_hash = filebase64sha256("${local.build_dir}/profiles.zip")
  #                  ^^^^^^^^^^^^^^^^
  #                  Terraform function that computes SHA256 hash
  #                  of the zip file contents
}
```

**How it works:**

1. Terraform reads the local zip file: `.build/profiles.zip`
2. Computes SHA256 hash of the entire file: `abc123...`
3. Stores this hash in Terraform state
4. On next `terraform plan`:
   - Computes hash again: `def456...`
   - Compares to stored hash: `abc123...`
   - If different → "Lambda code changed, need to update"
   - If same → "No change needed"

**Why this is reliable:**

- SHA256 is cryptographic hash: 1 byte change = completely different hash
- Local file access is fast and reliable
- No network calls needed for change detection
- Works perfectly with Git + CI/CD

---

## Build & Deploy Workflow (NEW APPROACH)

### Developer Local Development

```bash
# Project structure:
my-project-stack/packages/module-access/
├── backend/
│   ├── lambdas/
│   │   ├── profiles/
│   │   │   └── lambda_function.py
│   │   ├── orgs/
│   │   └── members/
│   ├── layers/
│   │   └── org-common/
│   ├── build.sh          # Builds ALL Lambda zips
│   └── .build/            # ← Created by build.sh
│       ├── org-common-layer.zip
│       ├── profiles.zip
│       ├── orgs.zip
│       └── members.zip
└── infrastructure/
    ├── main.tf            # References ../backend/.build/*.zip
    ├── outputs.tf
    └── variables.tf

# Workflow:
cd backend
./build.sh                 # Builds all zips to .build/

cd ../infrastructure
terraform plan             # Shows which Lambdas changed
terraform apply            # Updates only changed Lambdas
```

### CI/CD Pipeline (GitHub Actions)

```yaml
name: Deploy Module Access

on:
  push:
    branches: [main]
    paths:
      - 'packages/module-access/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Lambda zips
        run: |
          cd packages/module-access/backend
          ./build.sh
      
      - name: Deploy with Terraform
        run: |
          cd packages/module-access/infrastructure
          terraform init
          terraform apply -auto-approve
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

**Key Points:**

1. **Simple:** Just build, then terraform apply
2. **Fast:** No S3 upload step
3. **Reliable:** Terraform detects every change
4. **Atomic:** Entire deployment succeeds or fails together

---

## Infra Repository Pattern

The infrastructure repository (e.g., `my-project-infra`) references the stack modules:

```
my-project-infra/envs/dev/
├── main.tf
├── backend.tf
└── variables.tf

# main.tf references the stack modules:
```

```terraform
# main.tf in infra repository
module "module_access" {
  # Point to module in stack repository
  source = "../../../my-project-stack/packages/module-access/infrastructure"
  
  project_name        = "my-project"
  environment         = "dev"
  module_name         = "access"
  supabase_secret_arn = module.secrets.supabase_secret_arn
  aws_region          = var.aws_region
  log_level           = var.log_level
  common_tags         = var.common_tags
}

# API Gateway collects routes from all modules
module "modular_api_gateway" {
  source = "../../modules/modular-api-gateway"
  
  project_name = "my-project"
  environment  = "dev"
  
  # Collect routes from all modules
  module_routes = concat(
    module.module_access.api_routes,   # From local build!
    module.module_ai.api_routes,
    module.module_mgmt.api_routes,
    []
  )
}
```

**Key Architecture Points:**

1. **Infra repo is thin:** Just Terraform configuration
2. **Stack repo has code:** Lambda code + infrastructure definitions
3. **Modules export routes:** Each module's outputs.tf exports `api_routes`
4. **API Gateway collects routes:** Automatically wires everything together

---

## Why the Working Project (policy) Uses Local Pattern

From the infrastructure-fix-plan.md, we discovered that the working policy project uses this pattern:

```
pm-app-stack/packages/org-module/
├── backend/
│   ├── build.sh          # Builds to .build/
│   └── .build/           # LOCAL zips (not S3!)
│       ├── org-common-layer.zip
│       ├── profiles.zip
│       └── orgs.zip
├── infrastructure/       # Infrastructure in stack module
│   ├── main.tf          # References LOCAL .build/ zips
│   ├── outputs.tf       # Exports api_routes
│   └── variables.tf
```

**Why it works:**

- Simple deployment: `./build.sh && terraform apply`
- Reliable change detection: `source_code_hash` catches everything
- No S3 bucket complexity
- No drift between S3 and Lambda
- Clear source of truth: Git repo + Terraform state

---

## Migration Impact

### What We're Fixing

**Old (Broken) Setup:**
```
cora-dev-toolkit/templates/_project-infra-template/
└── modules/
    └── cora-module/          # ❌ WRONG! Infrastructure in infra repo
        ├── main.tf           # Uses S3 bucket approach
        └── variables.tf

cora-dev-toolkit/templates/_cora-core-modules/module-access/
├── backend/
│   └── build.sh
└── infrastructure/           # ❌ Existed but used S3
    ├── main.tf              # s3_bucket = var.lambda_bucket
    └── outputs.tf
```

**New (Fixed) Setup:**
```
cora-dev-toolkit/templates/_project-infra-template/
└── envs/dev/
    └── main.tf              # ✅ References stack modules

cora-dev-toolkit/templates/_cora-core-modules/module-access/
├── backend/
│   ├── build.sh
│   └── .build/              # ✅ Local zips
└── infrastructure/          # ✅ Infrastructure in stack module
    ├── main.tf             # filename = "${local.build_dir}/..."
    └── outputs.tf          # Exports api_routes
```

---

## Summary: Why Local Build Pattern is Correct

| Aspect | S3 Approach ❌ | Local Approach ✅ |
|--------|---------------|------------------|
| **Steps** | Build → Upload S3 → Terraform | Build → Terraform |
| **Change Detection** | Manual (`terraform taint`) | Automatic (`source_code_hash`) |
| **Infrastructure** | S3 bucket + policies | None needed |
| **Permissions** | S3 + Lambda | Just Lambda |
| **Drift Detection** | Fails | Perfect |
| **CI/CD Complexity** | High | Low |
| **Version Control** | Unclear | Git + State |
| **Deployment Speed** | Slower (S3 upload) | Faster (direct) |
| **Error Handling** | Multi-point failure | Single transaction |

---

## Conclusion

The local build pattern with `filename` and `source_code_hash` is:

1. **Simpler:** Fewer steps, less infrastructure
2. **More Reliable:** Automatic change detection
3. **Standard Practice:** How AWS and HashiCorp recommend deploying Lambda
4. **Battle-Tested:** Used successfully in working policy project

The S3 approach was a misunderstanding of Lambda deployment best practices. Terraform is designed to upload Lambda zips directly, and that's what we should use.

---

## References

- [Terraform aws_lambda_function Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function)
- [AWS Lambda Deployment Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- Working Reference: `/Users/aaron/code/policy/pm-app-stack/packages/org-module/infrastructure/`
