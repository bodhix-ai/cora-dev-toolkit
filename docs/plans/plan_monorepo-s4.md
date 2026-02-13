# Sprint 4: Dual Deployment Infrastructure

**Status:** Planned (Future Sprint)  
**Created:** February 13, 2026  
**Depends On:** Sprint 3 (App Runner deployment successful)  
**Related:** ADR-024 (Dual Deployment Options)

---

## Sprint Goal

Implement infrastructure-as-code templates that support **BOTH** ECS Fargate and App Runner deployment options for CORA monorepo projects, allowing developers to choose based on environment needs.

---

## Context

After Sprint 3 successfully deployed to App Runner, and ADR-024 establishing the dual deployment strategy, we need to:

1. Create reusable Terraform modules for both options
2. Make it easy to switch between deployment types
3. Document the deployment process for each option
4. Test both paths with the CORA app

---

## Objectives

1. ✅ Create Terraform modules in `templates/_project-infra-template/`:
   - `modules/ecs-web/` (ECS Fargate + ALB)
   - `modules/apprunner-web/` (App Runner service)

2. ✅ Update environment template to support deployment choice:
   - Variable to select deployment type
   - Conditional module instantiation

3. ✅ Test both deployment paths:
   - Deploy ai-mod-stack to App Runner (already done in S6)
   - Deploy ai-mod-stack to ECS Fargate (new)
   - Verify both work correctly

4. ✅ Create deployment guides:
   - `docs/guides/guide_DEPLOY-ECS.md`
   - `docs/guides/guide_DEPLOY-APPRUNNER.md`

5. ✅ Update `create-cora-monorepo.sh` script:
   - Generate both module options
   - Default to App Runner for DEV

---

## Tasks

### 1. Create Terraform Modules

**App Runner Module** (`modules/apprunner-web/`):
- [x] main.tf - App Runner service definition
- [x] iam.tf - ECR access role, instance role
- [x] variables.tf - All configurable parameters
- [x] outputs.tf - Service URL, ARN, status

**ECS Fargate Module** (`modules/ecs-web/`):
- [ ] main.tf - ECS cluster, service, task definition
- [ ] alb.tf - Application Load Balancer, target groups
- [ ] security.tf - Security groups for ALB and ECS tasks
- [ ] variables.tf - All configurable parameters
- [ ] outputs.tf - ALB URL, ECS service details

### 2. Environment Configuration

Update `envs/dev/main.tf` to support deployment choice:

```hcl
variable "deployment_type" {
  description = "Deployment type: 'apprunner' or 'ecs'"
  type        = string
  default     = "apprunner"
}

module "web_apprunner" {
  count  = var.deployment_type == "apprunner" ? 1 : 0
  source = "../../modules/apprunner-web"
  # ...
}

module "web_ecs" {
  count  = var.deployment_type == "ecs" ? 1 : 0
  source = "../../modules/ecs-web"
  # ...
}
```

### 3. Testing Plan

**Test 1: App Runner (already working from Sprint 3)**
- Build ai-mod-stack image
- Push to ECR
- Deploy via App Runner module
- Verify health checks pass
- Test CORA functionality

**Test 2: ECS Fargate (new)**
- Use same Docker image from Test 1
- Deploy via ECS module
- Verify health checks pass
- Test CORA functionality
- Compare with App Runner results

### 4. Documentation

Create comprehensive deployment guides:

**App Runner Guide:**
- Prerequisites (ECR, Docker image)
- Terraform configuration
- Deployment steps
- Health check verification
- Troubleshooting

**ECS Guide:**
- Additional prerequisites (VPC, subnets)
- Terraform configuration
- Deployment steps
- ALB configuration
- Health check verification
- Troubleshooting

### 5. Script Updates

Update `scripts/create-cora-monorepo.sh`:
- Generate both module directories
- Create example configurations for both
- Document deployment choice in README

---

## Success Criteria

- [x] Both Terraform modules exist and are well-documented
- [x] Can deploy to App Runner via module
- [ ] Can deploy to ECS Fargate via module
- [ ] Can switch between deployment types by changing variable
- [ ] Both deployment guides complete and tested
- [ ] CORA app works correctly on both platforms

---

## Out of Scope (Future Sprints)

- Multi-environment (DEV/TST/STG/PRD) - Keep as DEV only for now
- CI/CD integration - Manual deployment sufficient for now
- Cost monitoring dashboards
- Auto-scaling policies

---

## Dependencies

**From Sprint 3:**
- Working Docker image (linux/amd64)
- Successful App Runner deployment
- Health check endpoint working

**Required for Sprint 7:**
- VPC and subnet configuration (for ECS)
- ALB configuration knowledge
- Security group setup

---

## Risks & Mitigation

**Risk 1: ECS more complex than expected**
- Mitigation: Use hello-world ECS config as reference
- Already tested ECS with simple app in Sprint 3

**Risk 2: Networking issues with ECS**
- Mitigation: Use default VPC initially
- Document VPC requirements clearly

**Risk 3: Cost concerns with testing both**
- Mitigation: Deploy ECS only for testing, then tear down
- Keep App Runner running for DEV

---

## Notes

- App Runner module exists from hello-world experiment
- Can reuse patterns from `experiments/apprunner-hello/`
- ECS patterns exist from hello-world test
- Focus on making it easy to choose at deploy time

---

**Status:** Planned for Sprint 4  
**Estimated Effort:** 1-2 days  
**Priority:** Medium (foundational for ADR-024)
