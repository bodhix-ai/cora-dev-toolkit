# CORA Module Build & Deployment Standardization Plan

**Date:** December 12, 2025  
**Status:** 📋 DRAFT - Pending Review  
**Purpose:** Standardize module build and deployment to enable automated validation

---

## Executive Summary

The Phase 6 testing cycle revealed critical inconsistencies in how CORA modules are built and deployed. These inconsistencies block the development of validation scripts for module infrastructure deployment and create confusion for developers. This plan proposes a unified, standardized approach.

### Current Problems

1. **Mixed Deployment Methods**

   - module-ai: Containerized (2 separate Docker images needed)
   - module-mgmt: Containerized (1 Docker image)
   - module-access: Zip-based deployment (no Docker)

2. **Infrastructure Gaps**

   - build-cora-modules.sh looks for `backend/Dockerfile` (wrong location)
   - Dockerfiles are actually in `lambdas/*/Dockerfile` subdirectories
   - No standardized build scripts per module
   - Multiple Lambda functions per module not supported

3. **Validation Blockers**
   - Can't create validation scripts when deployment patterns are inconsistent
   - Can't predict what artifacts will be created during build
   - Can't validate infrastructure templates without knowing deployment method

### Goals

1. **Standardize deployment method** across all CORA modules
2. **Simplify build tooling** for consistent artifact creation
3. **Enable validation scripts** for infrastructure deployment
4. **Reduce developer cognitive load** with clear patterns

---

## Analysis: Containerization vs. Zip-Based Deployment

### Option A: Containerized Deployment (Docker)

**Pros:**

- ✅ Consistent runtime environment across local/AWS
- ✅ Better dependency management (system packages, binary dependencies)
- ✅ Easier local testing (run container locally)
- ✅ More flexibility for complex dependencies (e.g., AI libraries)
- ✅ Industry standard for modern Lambda development
- ✅ Better for modules with heavy dependencies (module-ai, module-kb with embeddings)

**Cons:**

- ❌ Slower cold starts (container image pull + extraction)
- ❌ More complex build process (Docker required)
- ❌ Larger artifact sizes (images vs. zips)
- ❌ Requires ECR repository per Lambda function
- ❌ More infrastructure to manage (ECR, image lifecycle policies)
- ❌ Higher developer complexity (Docker knowledge required)

**Performance:**

- Cold start: ~1-3s additional latency vs. zip
- Warm execution: Identical to zip
- Image size: 200-500MB typical (vs. 50MB zip)

**Development Complexity:**

- Requires Docker Desktop installed
- Requires understanding of Dockerfile syntax
- Requires ECR authentication for AWS CLI
- Build time: 2-5 minutes per image (vs. seconds for zip)

**Deployment Complexity:**

- Requires `docker build`, `docker tag`, `docker push` for each Lambda
- Requires ECR repository creation in Terraform
- Requires image URI management in Terraform variables
- More moving parts = more failure modes

---

### Option B: Zip-Based Deployment (Lambda Layers)

**Pros:**

- ✅ Faster cold starts (no container extraction)
- ✅ Simpler build process (just zip files)
- ✅ Smaller artifact sizes
- ✅ No ECR infrastructure needed
- ✅ Lower developer complexity (no Docker required)
- ✅ Faster build times (seconds vs. minutes)
- ✅ Works well for pure Python/Node.js with pip/npm dependencies

**Cons:**

- ❌ Limited to 250MB unzipped (50MB zipped for direct upload)
- ❌ Harder to manage system-level dependencies
- ❌ Different environment between local dev and AWS
- ❌ Lambda layers add complexity for shared dependencies
- ❌ Dependency conflicts harder to debug

**Performance:**

- Cold start: ~500ms-1s (fastest option)
- Warm execution: Identical to containers
- Package size: 10-50MB typical (with layers)

**Development Complexity:**

- Simpler: just Python/Node.js and pip/npm
- No Docker knowledge required
- Standard package managers (pip, npm)
- Build time: 10-30 seconds

**Deployment Complexity:**

- Simple: zip file upload to S3 or direct to Lambda
- Layer management requires versioning strategy
- Easier to troubleshoot (fewer moving parts)

---

### Option C: Hybrid Approach (Per-Module Decision)

**Pros:**

- ✅ Optimize per module based on requirements
- ✅ Use containers only where needed (heavy dependencies)
- ✅ Use zips for simple modules (access, mgmt)

**Cons:**

- ❌ **Inconsistent patterns** (the problem we're trying to solve!)
- ❌ Validation scripts must handle both methods
- ❌ Documentation must cover both approaches
- ❌ Developers must learn both patterns

---

## Recommendation: Standardize on Zip-Based Deployment with Lambda Layers

### Important Clarification: Docker for Local Dev Only

**Docker will still be used for local development and testing**, but NOT for production deployment:

- ✅ **Developers CAN use Docker locally** - Build containers to test Lambda functions in a Docker environment
- ✅ **AWS SAM CLI supports Docker** - `sam local invoke` runs Lambda functions in Docker containers
- ❌ **NO Docker images deployed to AWS** - Production uses zip files uploaded to S3
- ❌ **NO ECR infrastructure required** - No container registry needed

This approach gives developers the **best of both worlds**:

- **Local**: Docker for consistent testing environment
- **Production**: Zips for fast cold starts and simple deployment

### Rationale

After evaluating all three options against our goals, **Option B (Zip-Based)** is recommended because:

1. **Simplicity Over Flexibility**

   - CORA modules are primarily CRUD API handlers
   - Heavy AI workloads (embeddings, model inference) should use external services (OpenAI, Bedrock)
   - We don't need 500MB of ML libraries in Lambda functions

2. **Performance**

   - Faster cold starts matter more than build flexibility
   - Most CORA endpoints are user-facing (< 500ms target)
   - Container cold starts add 1-3s latency (unacceptable for UX)

3. **Developer Experience**

   - Not all developers have Docker expertise
   - Simpler onboarding for new developers
   - Faster iteration cycles (seconds vs. minutes)

4. **Validation Enablement**

   - Single build pattern = single validation script
   - Predictable artifacts (always \*.zip files)
   - Easier to validate infrastructure templates

5. **Existing Success**
   - module-access already uses zip deployment successfully
   - No complaints about dependency management
   - Proven pattern in production (pm-app)

### Migration Path

**Modules to Convert:**

- ❌ module-ai: Convert from Docker → Zip + Layers
- ❌ module-mgmt: Convert from Docker → Zip + Layers
- ✅ module-access: Already zip-based (no changes)

---

## Standardized Architecture

### Module Structure (File System)

```
packages/module-{name}/
├── backend/
│   ├── layers/                          # Shared code
│   │   └── common-{name}/               # Layer naming: common-{name}
│   │       ├── requirements.txt         # Python dependencies
│   │       └── python/
│   │           └── {name}_common/       # Python module: {name}_common
│   │               ├── __init__.py
│   │               ├── models.py
│   │               └── utils.py
│   └── lambdas/                         # Lambda functions
│       ├── {function-1}/
│       │   ├── lambda_function.py       # Handler
│       │   └── requirements.txt         # Function-specific deps (if any)
│       └── {function-2}/
│           └── lambda_function.py
├── frontend/                            # Frontend package
├── db/                                  # Database schemas
└── infrastructure/                      # Terraform modules
    └── main.tf
```

**Key Principles:**

- ✅ Shared code goes in `backend/layers/common-{name}/` (note: `common-` prefix)
- ✅ Lambda handlers go in `backend/lambdas/{function}/lambda_function.py`
- ✅ One `requirements.txt` per layer (shared dependencies)
- ✅ Optional `requirements.txt` per Lambda (function-specific dependencies)
- ❌ NO Dockerfiles in module templates (but developers can use Docker locally)
- ❌ NO Docker-based deployment scripts

---

### Build Process (Standardized)

```bash
# For each module in packages/module-*/

# Step 1: Build shared layer
cd backend/layers/common-{name}/
pip install -r requirements.txt -t python/
cd ../../..
zip -r common-{name}.zip backend/layers/common-{name}/python/

# Step 2: Build each Lambda function
for lambda in backend/lambdas/*/; do
  cd $lambda

  # If function has its own requirements.txt
  if [ -f requirements.txt ]; then
    pip install -r requirements.txt -t ./package/
  fi

  # Copy Lambda handler
  cp lambda_function.py ./package/ || cp -r . ./package/

  # Create zip
  cd package/
  zip -r ../../../../{lambda-name}.zip .
  cd ../../../..
done

# Step 3: Upload to S3
aws s3 cp common-{name}.zip s3://{bucket}/layers/
for zip in *.zip; do
  aws s3 cp $zip s3://{bucket}/lambdas/
done
```

**Output Artifacts:**

- `common-{name}.zip` (layer)
- `{function-1}.zip` (Lambda 1)
- `{function-2}.zip` (Lambda 2)
- etc.

---

### Infrastructure Pattern (Terraform)

```hcl
# Module infrastructure template

# Layer resource
resource "aws_lambda_layer_version" "module_layer" {
  layer_name          = "${var.project_prefix}-common-${var.module_name}"
  s3_bucket           = var.lambda_bucket
  s3_key              = "layers/common-${var.module_name}.zip"
  compatible_runtimes = ["python3.11"]
}

# Lambda functions (one per handler)
resource "aws_lambda_function" "function_1" {
  function_name = "${var.project_prefix}-${var.module_name}-function-1"
  s3_bucket     = var.lambda_bucket
  s3_key        = "lambdas/${var.module_name}-function-1.zip"
  handler       = "lambda_function.handler"
  runtime       = "python3.11"

  layers = [aws_lambda_layer_version.module_layer.arn]

  environment {
    variables = {
      SUPABASE_URL = var.supabase_url
      # ...
    }
  }
}

resource "aws_lambda_function" "function_2" {
  function_name = "${var.project_prefix}-${var.module_name}-function-2"
  s3_bucket     = var.lambda_bucket
  s3_key        = "lambdas/${var.module_name}-function-2.zip"
  handler       = "lambda_function.handler"
  runtime       = "python3.11"

  layers = [aws_lambda_layer_version.module_layer.arn]

  # ...
}
```

**Key Principles:**

- ✅ One layer per module (shared dependencies)
- ✅ One Lambda function per handler/route
- ✅ All zips stored in S3 (not inline code)
- ✅ Consistent naming: `{project}-common-{module}` for layers, `{project}-{module}-{function}` for functions

---

## Handling Modules with Heavy Dependencies

### Dependency Size Strategy

For modules with many or large dependencies (e.g., data processing, ML inference), follow this strategy:

**1. Audit Dependencies First**

```bash
# Check unzipped size of dependencies
pip install -r requirements.txt -t ./temp/
du -sh ./temp/
```

**2. Size Limits to Remember**

- Lambda deployment package (with layers): **250MB unzipped**
- Lambda layer: **50MB zipped, 250MB unzipped**
- Direct upload: **50MB zipped** (use S3 for larger)

**3. Optimization Techniques**

| Technique                    | Description                          | Example                                       |
| ---------------------------- | ------------------------------------ | --------------------------------------------- |
| **Remove Dev Dependencies**  | Strip test/build tools               | `pip install --no-dev`                        |
| **Use Smaller Alternatives** | Choose lightweight libraries         | `httpx` instead of `requests`                 |
| **External Services**        | Offload heavy processing             | Use OpenAI API instead of local models        |
| **Separate Functions**       | Split heavy deps to dedicated Lambda | ML inference in separate function             |
| **Pre-compiled Layers**      | Use AWS-provided layers              | `AWSLambda-Python311-SciPy38` for numpy/scipy |

**4. If Dependencies Exceed 250MB**

You have three options:

**Option A: Use AWS-Provided Layers**

```hcl
layers = [
  "arn:aws:lambda:us-east-1:668099181075:layer:AWSLambda-Python311-SciPy38:1",
  aws_lambda_layer_version.module_layer.arn
]
```

**Option B: Split Into Multiple Functions**

```
# Instead of one heavy Lambda:
lambda-ai-inference (300MB dependencies) ❌

# Split into:
lambda-ai-config (50MB dependencies) ✅
lambda-ai-inference (200MB dependencies) ✅
```

**Option C: Use EFS for Large Dependencies** (Advanced)

```hcl
resource "aws_efs_file_system" "lambda_dependencies" {
  # Mount large dependencies from EFS
  # Only use if absolutely necessary
}
```

**5. Module-Specific Guidance**

| Module            | Typical Size | Strategy                                          |
| ----------------- | ------------ | ------------------------------------------------- |
| **module-access** | 20-50MB      | Standard zip deployment                           |
| **module-ai**     | 50-150MB     | Audit dependencies, remove unused AI libraries    |
| **module-mgmt**   | 10-30MB      | Standard zip deployment                           |
| **module-kb**     | 100-200MB    | Use AWS layers for embeddings, external vector DB |

**6. Monitoring Dependency Bloat**

Add validation check in CI/CD:

```bash
# scripts/validate-dependency-size.sh
MAX_SIZE_MB=200

for layer in backend/layers/*/; do
  size=$(du -sm "$layer" | cut -f1)
  if [ $size -gt $MAX_SIZE_MB ]; then
    echo "ERROR: Layer $layer exceeds ${MAX_SIZE_MB}MB"
    exit 1
  fi
done
```

**Key Principle**: If a module requires >200MB of dependencies, **rethink the architecture**. Heavy processing should be offloaded to external services, separate functions, or containerized ECS tasks (not Lambda).

---

## Implementation Plan

### Phase 1: Update Build Tooling (4 hours)

**Goal:** Create unified build script that works for all modules

- [ ] **1.1 Create `scripts/build-lambda-zip.sh`**
  - Takes module path as argument
  - Builds layer zip
  - Builds all Lambda function zips
  - Outputs to `build/{module}/` directory
- [ ] **1.2 Update `scripts/build-cora-modules.sh`**
  - Remove Docker logic
  - Call `build-lambda-zip.sh` for each module
  - Generate manifest of built artifacts
- [ ] **1.3 Create `scripts/deploy-lambda-zips.sh`**
  - Upload layer zips to S3
  - Upload function zips to S3
  - Output S3 URIs for Terraform

**Validation:**

- ✅ Script builds all 3 core modules without errors
- ✅ Generates correct zip files in `build/` directory
- ✅ No Docker dependencies required

---

### Phase 2: Convert module-ai to Zip-Based (6 hours)

**Goal:** Migrate module-ai from Docker to zip deployment

- [ ] **2.1 Remove Docker artifacts**
  - Delete `lambdas/ai-config-handler/Dockerfile`
  - Delete `lambdas/provider/Dockerfile`
- [ ] **2.2 Add requirements.txt files**
  - Create `layers/common-ai/requirements.txt` (shared deps)
  - Audit dependencies - check total size < 200MB unzipped
  - Create `lambdas/ai-config-handler/requirements.txt` (if needed)
  - Create `lambdas/provider/requirements.txt` (if needed)
- [ ] **2.3 Update infrastructure**
  - Change from `image_uri` to `s3_bucket` + `s3_key`
  - Add Lambda layer resource
  - Update outputs to expect zip URIs
- [ ] **2.4 Test build and deploy**
  - Run `build-lambda-zip.sh` on module-ai
  - Deploy to ai-sec test environment
  - Validate Lambda functions work

**Validation:**

- ✅ module-ai builds without Docker
- ✅ Both Lambda functions deploy successfully
- ✅ API endpoints respond correctly

---

### Phase 3: Convert module-mgmt to Zip-Based (4 hours)

**Goal:** Migrate module-mgmt from Docker to zip deployment

- [ ] **3.1 Remove Docker artifacts**
  - Delete `lambdas/lambda-mgmt/Dockerfile`
- [ ] **3.2 Add requirements.txt files**
  - Create `layers/common-mgmt/requirements.txt`
  - Audit dependencies - check total size < 200MB unzipped
  - Update `lambdas/lambda-mgmt/requirements.txt`
- [ ] **3.3 Update infrastructure**
  - Change from `image_uri` to `s3_bucket` + `s3_key`
  - Add Lambda layer resource
- [ ] **3.4 Test build and deploy**
  - Run `build-lambda-zip.sh` on module-mgmt
  - Deploy to ai-sec test environment
  - Validate Lambda management endpoints work

**Validation:**

- ✅ module-mgmt builds without Docker
- ✅ Lambda function deploys successfully
- ✅ Module registry endpoints respond correctly

---

### Phase 4: Validation Scripts (6 hours)

**Goal:** Create infrastructure validation for standardized deployment

- [ ] **4.1 Create `validation/infra-validator/`**
  - Validate module structure matches standard
  - Check for requirements.txt presence
  - Verify no Dockerfiles exist
  - Check infrastructure uses S3 artifact pattern
- [ ] **4.2 Create `validation/build-validator/`**
  - Validate build artifacts are created
  - Check zip file structure
  - Verify layer includes all dependencies
  - Check Lambda handler is present
- [ ] **4.3 Integrate with cora-validate.py**
  - Add `infra` validator option
  - Add `build` validator option
  - Update certification report template
- [ ] **4.4 Update CI/CD validation gates**
  - Add build validation to GitHub Actions
  - Require passing infra validation for PRs
  - Document validation requirements

**Validation:**

- ✅ All validators pass for 3 core modules
- ✅ Validation catches missing requirements.txt
- ✅ Validation catches Dockerfile presence
- ✅ Certification report includes infra compliance

---

### Phase 5: Documentation Updates (4 hours)

**Goal:** Update all documentation to reflect new standard

- [ ] **5.1 Update cora-core-modules.md**
  - Remove references to Docker deployment
  - Add zip-based deployment section
  - Update build process documentation
- [ ] **5.2 Update cora-project-boilerplate.md**
  - Document standardized module structure
  - Explain layer vs. function dependencies
  - Add build script usage guide
- [ ] **5.3 Update creating-modules.md**
  - Remove Docker template instructions
  - Add requirements.txt template
  - Update infrastructure template
- [ ] **5.4 Create deployment-guide.md**
  - Step-by-step build process
  - S3 upload instructions
  - Terraform deployment workflow
  - Troubleshooting common issues

**Validation:**

- ✅ All docs reference zip-based deployment
- ✅ No lingering Docker references
- ✅ Clear guidance for developers

---

### Phase 6: Update Templates (4 hours)

**Goal:** Update toolkit templates to use new standard

- [ ] **6.1 Update `_cora-core-modules/` templates**
  - Remove all Dockerfiles
  - Add requirements.txt files
  - Update infrastructure modules
- [ ] **6.2 Update `_module-template/`**
  - Remove Docker scaffolding
  - Add requirements.txt template
  - Update README with zip-based instructions
- [ ] **6.3 Update `_project-infra-template/`**
  - Update `scripts/build-cora-modules.sh`
  - Update `scripts/deploy-cora-modules.sh`
  - Remove ECR infrastructure references
- [ ] **6.4 Update `create-cora-project.sh`**
  - Remove ECR creation logic
  - Add S3 lambda bucket creation
  - Update placeholder replacement for zip-based

**Validation:**

- ✅ New project created with `--with-core-modules` uses zip-based deployment
- ✅ No Docker references in templates
- ✅ Build scripts work out of the box

---

### Phase 7: Retrofit pm-app-stack (6 hours)

**Goal:** Apply new standard to production pm-app project

- [ ] **7.1 Plan migration strategy**
  - Identify all Docker-based modules
  - Create rollback plan
  - Schedule deployment window
- [ ] **7.2 Convert pm-app modules**
  - Convert ai-enablement-module → module-ai
  - Convert lambda-mgmt-module → module-mgmt
  - Test locally
- [ ] **7.3 Deploy to dev environment**
  - Build all zips
  - Upload to S3
  - Apply Terraform changes
  - Smoke test all endpoints
- [ ] **7.4 Deploy to production**
  - Follow production deployment checklist
  - Monitor for errors
  - Document any issues

**Validation:**

- ✅ pm-app-stack passes all validations
- ✅ Production deployment successful
- ✅ No performance regression

---

## Timeline Estimate

| Phase                          | Estimated Hours | Dependencies        | Status     |
| ------------------------------ | --------------- | ------------------- | ---------- |
| Phase 1: Build Tooling         | 4 hours         | None                | 🔲 Pending |
| Phase 2: Convert module-ai     | 6 hours         | Phase 1             | 🔲 Pending |
| Phase 3: Convert module-mgmt   | 4 hours         | Phase 1             | 🔲 Pending |
| Phase 4: Validation Scripts    | 6 hours         | Phase 2, 3          | 🔲 Pending |
| Phase 5: Documentation Updates | 4 hours         | Phase 2, 3          | 🔲 Pending |
| Phase 6: Update Templates      | 4 hours         | Phase 2, 3, 5       | 🔲 Pending |
| Phase 7: Retrofit pm-app       | 6 hours         | Phase 1, 2, 3, 4, 6 | 🔲 Pending |
| **Total**                      | **34 hours**    | ~9 sessions         |            |

---

## Risk Assessment

### High Risk

1. **Performance Regression**

   - **Risk:** Zip-based cold starts may still be slow with large dependencies
   - **Mitigation:** Provision concurrent execution to keep functions warm
   - **Fallback:** Add CloudWatch alarm for p99 latency > 2s

2. **Dependency Size Limits**
   - **Risk:** Module dependencies exceed 250MB unzipped limit
   - **Mitigation:** Audit current dependencies, remove unused packages
   - **Fallback:** Split heavy dependencies into separate functions

### Medium Risk

3. **Build Script Complexity**

   - **Risk:** Unified build script may not handle all edge cases
   - **Mitigation:** Extensive testing on all 3 core modules
   - **Fallback:** Module-specific build scripts if needed

4. **Developer Pushback**
   - **Risk:** Developers may prefer Docker for local testing
   - **Mitigation:** Provide local testing guide with virtual environments
   - **Fallback:** Allow local Docker usage, but not in CI/CD

### Low Risk

5. **S3 Upload Failures**
   - **Risk:** Network issues during deployment
   - **Mitigation:** Retry logic in deploy script
   - **Fallback:** Manual S3 upload

---

## Success Criteria

### Must Have (Phase 1-6)

- ✅ All 3 core modules build without Docker
- ✅ Unified build script works for all modules
- ✅ Infrastructure validation scripts pass
- ✅ Documentation updated and accurate
- ✅ Templates generate zip-based deployments
- ✅ New projects work out of the box

### Should Have (Phase 7)

- ✅ pm-app-stack migrated to new standard
- ✅ Production deployment successful
- ✅ Zero errors in module validation

### Nice to Have

- ⏳ Performance improvement over Docker (faster cold starts)
- ⏳ Build time improvement (seconds vs. minutes)
- ⏳ Developer satisfaction survey (simpler > complex)

---

## Open Questions

1. **Layer Versioning Strategy**

   - Q: How do we version Lambda layers?
   - A: Use Git SHA in layer name (e.g., `common-ai-abc1234`)

2. **Shared Dependencies Across Modules**

   - Q: Should multiple modules share a single "cora-common" layer?
   - A: No - each module should be self-contained for portability

3. **Local Development Environment**

   - Q: How do developers test Lambda functions locally without Docker?
   - A: Use Python virtual environments + AWS SAM Local (supports zip-based)

4. **Gradual Rollout**
   - Q: Can we deploy module-by-module or must it be all-at-once?
   - A: Module-by-module is fine - no dependencies between deployment methods

---

## Decision Record

**Date:** December 12, 2025  
**Decision:** Standardize on zip-based Lambda deployment with layers  
**Rationale:** Simplicity, performance, developer experience, validation enablement  
**Alternatives Considered:** Docker-only, hybrid approach  
**Status:** Pending approval

**Approvers:**

- [ ] Technical Lead
- [ ] DevOps Lead
- [ ] CORA Toolkit Maintainer

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Get approval** for standardization decision
3. **Schedule Phase 1** implementation (build tooling)
4. **Begin implementation** following phase order

---

**Document Version:** 1.0  
**Last Updated:** December 12, 2025  
**Status:** Draft - Pending Review
