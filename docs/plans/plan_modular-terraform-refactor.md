# Modular Terraform Architecture Refactor

**Status**: 📋 PLANNED - Not Started  
**Priority**: MEDIUM (Performance Optimization)  
**Estimated Duration**: 2-3 weeks  
**Created**: January 20, 2026  
**Branch**: `refactor/modular-terraform`  
**Issue**: Performance - 10+ minute deployments for single Lambda changes

---

## Executive Summary

The current monolithic Terraform deployment approach does not scale with CORA's modular architecture. With 40+ Lambdas, 19 SQS queues, dozens of API Gateway routes, and 5 S3 buckets in a single state, any infrastructure change requires a full terraform apply taking 10+ minutes.

**Goal**: Refactor infrastructure-as-code to match CORA's modular design, enabling:
- **Fast iteration**: Deploy single module in ~30-60 seconds
- **Isolation**: Module failures don't affect others
- **Parallel deployment**: Multiple modules can be deployed simultaneously
- **Better DX**: Developers work on module-specific infrastructure

**Approach**: Split monolithic Terraform state into:
1. Core infrastructure (shared resources)
2. Per-module Terraform states (isolated resources)
3. API Gateway assembly (imports module routes)

---

## Current State Analysis

### Monolithic Structure
```
ai-sec-infra/envs/dev/
├── terraform.tfstate  # Single state with ALL resources
├── main.tf
├── modules/
│   ├── module-access/
│   ├── module-ai/
│   ├── module-eval/
│   └── ...
```

### Problems

| Problem | Impact | Severity |
|---------|--------|----------|
| 10+ minute deployments | Slow iteration, developer frustration | 🔴 HIGH |
| All-or-nothing deploys | Can't deploy single module | 🔴 HIGH |
| Cascading failures | One module breaks, all affected | 🟡 MEDIUM |
| No parallelization | Serial deployment only | 🟡 MEDIUM |
| Poor isolation | Module changes affect unrelated resources | 🟡 MEDIUM |

### Resource Counts (as of Jan 2026)
- **Lambdas**: 40+
- **Lambda Layers**: 8
- **SQS Queues**: 19
- **API Gateway Routes**: 60+
- **IAM Roles/Policies**: 50+
- **S3 Buckets**: 5
- **CloudWatch Log Groups**: 40+

---

## Proposed Architecture

### Directory Structure
```
{project}-infra/
├── README.md
├── scripts/
│   ├── deploy-module.sh        # Deploy single module
│   ├── deploy-all-modules.sh   # Deploy all modules (parallel)
│   └── destroy-module.sh       # Destroy single module
│
├── core/                        # State 1: Shared Infrastructure
│   ├── main.tf                 # VPC, S3, RDS, base IAM
│   ├── outputs.tf              # Export ARNs for modules
│   ├── backend.tf
│   └── envs/
│       ├── dev/
│       └── prod/
│
├── modules/                     # Each module = separate state
│   ├── module-access/          # State 2
│   │   ├── main.tf             # Access Lambdas, layer, routes
│   │   ├── variables.tf        # Import core outputs
│   │   ├── outputs.tf          # Export Lambda ARNs, route defs
│   │   ├── backend.tf
│   │   └── envs/
│   │       ├── dev/
│   │       └── prod/
│   │
│   ├── module-ai/              # State 3
│   ├── module-chat/            # State 4
│   ├── module-eval/            # State 5
│   ├── module-kb/              # State 6
│   ├── module-mgmt/            # State 7
│   ├── module-voice/           # State 8
│   └── module-ws/              # State 9
│
└── gateway/                     # State 10: API Gateway Assembly
    ├── main.tf                 # API Gateway + Authorizer
    ├── routes.tf               # Import all module route definitions
    ├── outputs.tf              # Export API Gateway URL
    ├── backend.tf
    └── envs/
        ├── dev/
        └── prod/
```

### State Separation Strategy

**Core Infrastructure State** (rarely changes)
- VPC, Subnets, Security Groups
- RDS/Supabase connection config
- S3 buckets (shared: lambda-artifacts, document storage)
- Base IAM roles
- Secrets Manager secrets

**Per-Module States** (frequent changes)
- Lambda functions (all module Lambdas)
- Lambda layers (module-specific)
- SQS queues (module-specific)
- IAM policies (module-specific)
- CloudWatch log groups
- Route definitions (exported as outputs)

**API Gateway State** (imports from modules)
- API Gateway v2 HTTP API
- Authorizer Lambda
- Route integrations (uses data sources from module outputs)

---

## Implementation Plan

### Phase 1: Analysis & Planning (Week 1, Days 1-2)

#### 1.1 Resource Inventory
**Task**: Categorize all current Terraform resources

```bash
cd {project}-infra/envs/dev
terraform state list > current-resources.txt
```

**Categories**:
- ✅ Core (shared across all modules)
- ✅ Module-specific (belongs to one CORA module)
- ✅ Gateway (API Gateway resources)

**Deliverable**: `resource-categorization.xlsx`

#### 1.2 Dependency Mapping
**Task**: Identify resource dependencies

**Questions to answer**:
- What resources depend on core infrastructure?
- What resources do modules share?
- How do API Gateway routes depend on Lambda functions?

**Tool**: Create dependency graph
```bash
terraform graph | dot -Tpng > dependency-graph.png
```

**Deliverable**: `dependency-map.md`

#### 1.3 Backend Configuration
**Task**: Plan S3 backend structure for multiple states

```hcl
# core/backend.tf
terraform {
  backend "s3" {
    bucket         = "{project}-terraform-state"
    key            = "core/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "{project}-terraform-locks"
    encrypt        = true
  }
}

# modules/module-access/backend.tf
terraform {
  backend "s3" {
    bucket         = "{project}-terraform-state"
    key            = "modules/module-access/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "{project}-terraform-locks"
    encrypt        = true
  }
}
```

**Deliverable**: Backend configuration for all states

---

### Phase 2: Extract Core Infrastructure (Week 1, Days 3-5)

#### 2.1 Create Core Module Structure
```bash
mkdir -p core/envs/{dev,prod}
```

**Files to create**:
- `core/main.tf` - VPC, S3, RDS, IAM
- `core/variables.tf` - Environment-specific vars
- `core/outputs.tf` - Export ARNs
- `core/backend.tf` - S3 backend config

#### 2.2 Move Core Resources
**Resources to move**:
- `aws_vpc.*`
- `aws_subnet.*`
- `aws_security_group.*` (shared only)
- `aws_s3_bucket.*` (lambda-artifacts, documents)
- `aws_secretsmanager_secret.*`
- Base IAM roles (if any)

**Migration Steps**:
1. Copy resource definitions to `core/main.tf`
2. Remove from monolithic config (but don't apply yet)
3. Test in isolated environment first

#### 2.3 Deploy Core State
```bash
cd core/envs/dev
terraform init
terraform plan -out=core.tfplan
terraform apply core.tfplan
```

**Validation**:
- Verify all resources created
- Export outputs match expectations
- No drift from previous state

---

### Phase 3: Modularize CORA Modules (Week 2)

#### 3.1 Create Module Template
**Template**: `modules/_template/`
```
_template/
├── main.tf
├── variables.tf
├── outputs.tf
├── backend.tf
└── envs/
    ├── dev/
    │   ├── terraform.tfvars
    │   └── local-secrets.tfvars
    └── prod/
        ├── terraform.tfvars
        └── local-secrets.tfvars
```

**Standard Variables**:
```hcl
# variables.tf
variable "project" { type = string }
variable "environment" { type = string }
variable "aws_region" { type = string }

# From core outputs
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "lambda_artifacts_bucket" { type = string }
variable "org_common_layer_arn" { type = string }
```

**Standard Outputs**:
```hcl
# outputs.tf
output "lambda_arns" {
  value = {
    for k, v in aws_lambda_function.lambdas : k => v.arn
  }
}

output "lambda_invoke_arns" {
  value = {
    for k, v in aws_lambda_function.lambdas : k => v.invoke_arn
  }
}

output "api_routes" {
  value = [
    # Define routes for this module
    { method = "GET",  path = "/path", lambda_key = "lambda-name" },
    { method = "POST", path = "/path", lambda_key = "lambda-name" },
  ]
}
```

#### 3.2 Migrate module-access (Pilot Module)
**Why module-access first?**
- Core module (required)
- Well-understood
- Moderate complexity
- Tests full workflow

**Steps**:
1. Copy template to `modules/module-access/`
2. Move Lambda resources from monolithic config
3. Add data sources for core outputs
4. Define route outputs
5. Deploy to dev environment
6. Validate functionality
7. Document lessons learned

**Validation Checklist**:
- [ ] All Lambdas deployed successfully
- [ ] Layer attached correctly
- [ ] IAM permissions working
- [ ] API routes responding
- [ ] CloudWatch logs accessible
- [ ] No breaking changes to application

#### 3.3 Migrate Remaining Modules
**Order** (based on dependencies):
1. ✅ module-access (pilot)
2. module-ai (depends on access)
3. module-mgmt (depends on access)
4. module-chat (depends on ai, access)
5. module-kb (depends on ai, access)
6. module-eval (depends on ai, kb, access)
7. module-ws (depends on access)
8. module-voice (depends on access, ws)

**Parallel Execution**:
- Modules 2-3 can run parallel (both depend only on access)
- Modules 4-5 can run parallel (after 2-3 complete)
- Module 6-8 can run parallel (after 4-5 complete)

---

### Phase 4: API Gateway Assembly (Week 3, Days 1-2)

#### 4.1 Create Gateway Module
```
gateway/
├── main.tf           # API Gateway HTTP API
├── authorizer.tf     # Authorizer Lambda
├── routes.tf         # Dynamic route creation
├── variables.tf
├── outputs.tf
├── backend.tf
└── envs/
    ├── dev/
    └── prod/
```

#### 4.2 Import Module Route Definitions
```hcl
# gateway/routes.tf

# Import route definitions from all modules
data "terraform_remote_state" "module_access" {
  backend = "s3"
  config = {
    bucket = "{project}-terraform-state"
    key    = "modules/module-access/terraform.tfstate"
    region = "us-east-1"
  }
}

data "terraform_remote_state" "module_ai" {
  backend = "s3"
  config = {
    bucket = "{project}-terraform-state"
    key    = "modules/module-ai/terraform.tfstate"
    region = "us-east-1"
  }
}

# ... more modules

locals {
  all_routes = concat(
    data.terraform_remote_state.module_access.outputs.api_routes,
    data.terraform_remote_state.module_ai.outputs.api_routes,
    # ... more modules
  )
}

# Create routes dynamically
resource "aws_apigatewayv2_route" "routes" {
  for_each = { for route in local.all_routes : "${route.method}-${route.path}" => route }

  api_id    = aws_apigatewayv2_api.main.id
  route_key = "${each.value.method} ${each.value.path}"
  
  target = "integrations/${aws_apigatewayv2_integration.integrations[each.key].id}"
}

resource "aws_apigatewayv2_integration" "integrations" {
  for_each = { for route in local.all_routes : "${route.method}-${route.path}" => route }

  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  
  # Lookup Lambda invoke ARN from module state
  integration_uri = data.terraform_remote_state["module_${each.value.module}"].outputs.lambda_invoke_arns[each.value.lambda_key]
}
```

#### 4.3 Deploy API Gateway
```bash
cd gateway/envs/dev
terraform init
terraform plan -out=gateway.tfplan
terraform apply gateway.tfplan
```

**Validation**:
- [ ] API Gateway created
- [ ] All routes registered
- [ ] Authorizer attached
- [ ] Lambda permissions granted
- [ ] API responds to requests

---

### Phase 5: Deployment Scripts (Week 3, Days 3-4)

#### 5.1 Single Module Deployment
**Script**: `scripts/deploy-module.sh`

```bash
#!/bin/bash
# Deploy a single CORA module
# Usage: ./deploy-module.sh module-access dev

set -e

MODULE_NAME=$1
ENVIRONMENT=$2

if [ -z "$MODULE_NAME" ] || [ -z "$ENVIRONMENT" ]; then
    echo "Usage: ./deploy-module.sh <module-name> <environment>"
    exit 1
fi

MODULE_DIR="modules/${MODULE_NAME}/envs/${ENVIRONMENT}"

if [ ! -d "$MODULE_DIR" ]; then
    echo "Error: Module directory not found: $MODULE_DIR"
    exit 1
fi

echo "=================================="
echo "  Deploying ${MODULE_NAME}"
echo "  Environment: ${ENVIRONMENT}"
echo "=================================="

cd "$MODULE_DIR"

echo "[1/4] Initializing Terraform..."
terraform init

echo "[2/4] Planning changes..."
terraform plan -out=${MODULE_NAME}.tfplan

echo "[3/4] Applying changes..."
terraform apply ${MODULE_NAME}.tfplan

echo "[4/4] Cleaning up plan file..."
rm ${MODULE_NAME}.tfplan

echo "✅ Deployment complete: ${MODULE_NAME}"
```

#### 5.2 Parallel Module Deployment
**Script**: `scripts/deploy-all-modules.sh`

```bash
#!/bin/bash
# Deploy all modules in dependency order with parallelization
# Usage: ./deploy-all-modules.sh dev

set -e

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: ./deploy-all-modules.sh <environment>"
    exit 1
fi

echo "=================================="
echo "  Full System Deployment"
echo "  Environment: ${ENVIRONMENT}"
echo "=================================="

# Phase 1: Core infrastructure (must be first)
echo "[Phase 1/5] Deploying core infrastructure..."
./deploy-core.sh $ENVIRONMENT

# Phase 2: Foundation modules (parallel)
echo "[Phase 2/5] Deploying foundation modules..."
./deploy-module.sh module-access $ENVIRONMENT &
PID1=$!

wait $PID1
echo "✅ Phase 2 complete"

# Phase 3: Service modules (parallel)
echo "[Phase 3/5] Deploying service modules..."
./deploy-module.sh module-ai $ENVIRONMENT &
PID2=$!
./deploy-module.sh module-mgmt $ENVIRONMENT &
PID3=$!

wait $PID2 $PID3
echo "✅ Phase 3 complete"

# Phase 4: Application modules (parallel)
echo "[Phase 4/5] Deploying application modules..."
./deploy-module.sh module-chat $ENVIRONMENT &
PID4=$!
./deploy-module.sh module-kb $ENVIRONMENT &
PID5=$!
./deploy-module.sh module-ws $ENVIRONMENT &
PID6=$!

wait $PID4 $PID5 $PID6
echo "✅ Phase 4 complete"

# Phase 5: Functional modules (parallel)
echo "[Phase 5/5] Deploying functional modules..."
./deploy-module.sh module-eval $ENVIRONMENT &
PID7=$!
./deploy-module.sh module-voice $ENVIRONMENT &
PID8=$!

wait $PID7 $PID8
echo "✅ Phase 5 complete"

# Phase 6: API Gateway assembly
echo "[Phase 6/6] Deploying API Gateway..."
./deploy-gateway.sh $ENVIRONMENT

echo "=================================="
echo "  ✅ Full System Deployed"
echo "=================================="
```

**Expected Timing**:
- Serial (old): ~10-15 minutes
- Parallel (new): ~3-5 minutes

#### 5.3 Module Destruction Script
**Script**: `scripts/destroy-module.sh`

```bash
#!/bin/bash
# Safely destroy a module's infrastructure
# Usage: ./destroy-module.sh module-eval dev

set -e

MODULE_NAME=$1
ENVIRONMENT=$2

if [ -z "$MODULE_NAME" ] || [ -z "$ENVIRONMENT" ]; then
    echo "Usage: ./destroy-module.sh <module-name> <environment>"
    exit 1
fi

MODULE_DIR="modules/${MODULE_NAME}/envs/${ENVIRONMENT}"

echo "⚠️  WARNING: This will destroy all resources for ${MODULE_NAME}"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

cd "$MODULE_DIR"
terraform destroy -auto-approve

echo "✅ Destroyed: ${MODULE_NAME}"
```

---

## Testing Strategy

### Test Environment
- **New test project**: `test-modular-tf`
- **Purpose**: Validate modular structure without affecting existing deployments
- **Location**: `~/code/bodhix/testing/test-modular-tf/`

### Test Phases

**Phase 1: Isolated Module Test**
1. Deploy core infrastructure
2. Deploy single module (module-access)
3. Verify functionality
4. Test module updates
5. Measure deployment time

**Expected**: <60 seconds for module updates

**Phase 2: Multi-Module Test**
1. Deploy 3 modules (access, ai, mgmt)
2. Verify inter-module communication
3. Test parallel deployment
4. Measure total deployment time

**Expected**: <3 minutes for 3 modules in parallel

**Phase 3: Full System Test**
1. Deploy all 8 modules + gateway
2. Run end-to-end API tests
3. Verify all routes working
4. Check CloudWatch logs
5. Measure total deployment time

**Expected**: <5 minutes for full system

**Phase 4: Update Cycle Test**
1. Make change to single Lambda
2. Deploy only that module
3. Verify change live
4. Measure deployment time

**Expected**: <30 seconds for single Lambda update

---

## Success Criteria

### Performance Metrics
- [ ] Single module deployment: <60 seconds (vs 10+ minutes)
- [ ] Full system deployment: <5 minutes (vs 15 minutes)
- [ ] Parallel deployment working
- [ ] No resource conflicts between modules

### Functionality
- [ ] All Lambdas deployed and functional
- [ ] All API routes responding
- [ ] Inter-module communication working
- [ ] No breaking changes to application
- [ ] CloudWatch logs accessible

### Developer Experience
- [ ] Clear deployment scripts
- [ ] Comprehensive documentation
- [ ] Error messages helpful
- [ ] Easy to add new modules
- [ ] Easy to troubleshoot issues

---

## Rollback Plan

### If Issues Arise

**Option 1: Rollback Single Module**
```bash
cd modules/{module-name}/envs/dev
terraform destroy -auto-approve

# Re-deploy from monolithic if needed
cd ../../envs/dev
terraform apply -target=module.module_{name}
```

**Option 2: Rollback Entire Refactor**
1. Keep monolithic config in separate branch
2. Switch back to monolithic branch
3. Deploy monolithic config
4. Destroy modular states

**Option 3: Pause and Debug**
- Modular and monolithic can coexist temporarily
- Debug modular deployment
- Once working, remove monolithic

---

## Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| State conflicts | 🔴 HIGH | 🟡 MEDIUM | Test in isolated env first |
| Resource dependencies missed | 🟡 MEDIUM | 🟡 MEDIUM | Thorough dependency mapping |
| Deployment scripts fail | 🟡 MEDIUM | 🟢 LOW | Extensive testing, error handling |
| API Gateway route conflicts | 🟡 MEDIUM | 🟢 LOW | Unique route keys per module |
| Developer confusion | 🟢 LOW | 🟡 MEDIUM | Clear documentation, training |

---

## Documentation Updates

**Files to create**:
- `docs/guides/guide_MODULAR-TERRAFORM-DEPLOYMENT.md`
- `docs/arch decisions/ADR-015-MODULAR-TERRAFORM-ARCHITECTURE.md`
- `{project}-infra/README.md` (update)

**Files to update**:
- `docs/guides/guide_CORA-PROJECT-SETUP.md`
- `.clinerules` (deployment instructions)
- `memory-bank/activeContext.md`

---

## Future Enhancements

### Phase 6: CI/CD Integration (Future)
- GitHub Actions per module
- Automatic deployments on PR merge
- Module-specific testing pipelines

### Phase 7: Terragrunt (Optional)
- DRY Terraform configurations
- Automatic dependency management
- Simplified multi-environment deployments

### Phase 8: Multi-Region (Future)
- Deploy modules to multiple regions
- Regional failover
- Global API Gateway

---

## Checklist

### Planning Phase
- [ ] Resource categorization complete
- [ ] Dependency mapping complete
- [ ] Backend configuration designed
- [ ] Team review and approval

### Implementation Phase
- [ ] Core infrastructure extracted
- [ ] Module template created
- [ ] module-access migrated (pilot)
- [ ] Remaining modules migrated
- [ ] API Gateway assembly complete
- [ ] Deployment scripts created

### Testing Phase
- [ ] Isolated module test passed
- [ ] Multi-module test passed
- [ ] Full system test passed
- [ ] Update cycle test passed

### Documentation Phase
- [ ] Migration guide written
- [ ] ADR published
- [ ] README updated
- [ ] Team training completed

---

**Document Status**: 📋 PLANNED  
**Branch**: `refactor/modular-terraform`  
**Priority**: MEDIUM  
**Estimated Completion**: 2-3 weeks from start
