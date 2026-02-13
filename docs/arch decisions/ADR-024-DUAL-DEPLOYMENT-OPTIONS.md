# ADR-024: Dual Deployment Options for CORA Monorepo

**Status:** Accepted  
**Date:** February 13, 2026  
**Decision Maker:** Development Team  
**Related:** ADR-023 (Monorepo Build Standards)

---

## Context

CORA monorepo applications (Next.js with pnpm workspace) require containerized deployment to AWS. After evaluating AWS container services, two options are viable:

1. **ECS Fargate with ALB** - Full container orchestration
2. **AWS App Runner** - Simplified managed service

Both services can run the same Docker image, but have different cost profiles, compliance status, and operational characteristics.

---

## Decision

**CORA will support BOTH deployment options**, with environment-specific recommendations:

### Environment-Based Deployment Strategy

| Environment | Service | Rationale |
|-------------|---------|-----------|
| **DEV** | App Runner | Low traffic, auto-scale to zero, cost savings |
| **TST** | App Runner | Infrequent use, simple setup, cost savings |
| **STG** | ECS Fargate | Mirror PRD for performance testing |
| **PRD** | ECS Fargate | FedRAMP compliance, cost-effective for steady traffic |

### For Prototypes/Demos
- **App Runner** - Faster setup, auto-scale to zero

### For Federal Clients
- **ECS Fargate ONLY** - App Runner not FedRAMP authorized

---

## Rationale

### Cost Analysis

**App Runner Pricing:**
- 1.5-2x more expensive per compute unit than ECS
- BUT cheaper overall for low-traffic due to:
  - No ALB cost (~$16-18/month saved)
  - Auto-scale to zero (idle capacity ~$0)
- **Example:** 1 vCPU, 2GB RAM
  - Low traffic: ~$5-10/month (scales to zero)
  - High traffic: ~$72/month (always running)

**ECS Fargate Pricing:**
- Lower per-unit compute cost
- BUT requires ALB (~$16-18/month)
- Always runs minimum 1 task (no scale-to-zero)
- **Example:** 1 task (256 CPU, 512 MB) + ALB
  - Always on: ~$21/month
  - Can use Spot instances (70% savings)

**Cost Crossover:**
- App Runner cheaper: <10 hours/month usage
- ECS cheaper: Steady/high traffic

### Compliance Requirements

**FedRAMP Authorization:**
- **ECS Fargate:** ✅ FedRAMP High authorized
- **App Runner:** ❌ NOT FedRAMP authorized

**Impact:** Any deployment for US Federal clients MUST use ECS.

### Operational Considerations

**App Runner:**
- ✅ Simplest setup (minimal Terraform)
- ✅ Auto-scale to zero
- ✅ Built-in SSL
- ❌ Limited networking control
- ❌ Less visibility (CloudWatch logs)

**ECS Fargate:**
- ✅ Full VPC integration
- ✅ Detailed monitoring
- ✅ Blue-green deployments
- ❌ More complex infrastructure
- ❌ Requires ALB, security groups, etc.

### Environment Rationale

**DEV/TST → App Runner:**
- Used infrequently (developers' local environments primary)
- Auto-scale to zero = huge cost savings
- Simpler to maintain
- No compliance requirements for internal dev

**STG → ECS Fargate:**
- Must mirror PRD for accurate performance testing
- Same infrastructure patterns as PRD
- Validates deployment process before PRD

**PRD → ECS Fargate:**
- FedRAMP compliance (federal clients)
- Cost-effective for steady traffic
- Better monitoring and control
- Production-grade infrastructure

---

## Consequences

### Positive

1. **Cost Optimization**
   - DEV/TST: Save ~$10-15/month per environment (auto-scale to zero)
   - PRD: Lower compute costs for steady traffic

2. **Flexibility**
   - Right tool for the job (environment-specific)
   - Prototypes can use simpler App Runner
   - Production gets full control

3. **Compliance**
   - Can serve federal clients (ECS PRD)
   - Meet FedRAMP requirements

4. **Developer Experience**
   - Simpler dev/test environments (App Runner)
   - Full control for production debugging (ECS)

### Negative

1. **Dual Maintenance**
   - Must maintain Terraform for both
   - Document both deployment paths
   - Test both options

2. **Context Switching**
   - Developers must understand differences
   - Different commands/workflows per environment

3. **Complexity**
   - More decision-making required
   - Need clear guidelines (this ADR)

### Mitigation

1. **Clear Guidelines:** This ADR + deployment guide
2. **Automation:** Scripts/Terraform handle differences
3. **Documentation:** Separate guides for each option
4. **Training:** Team education on when to use which

---

## Implementation

### 1. Terraform Modules

Create reusable modules:
```
templates/_project-infra-template/
├── modules/
│   ├── ecs-web/         # ECS Fargate + ALB
│   └── apprunner-web/   # App Runner service
```

### 2. Environment Configuration

Each environment specifies its deployment type:
```hcl
# envs/dev/main.tf
module "web" {
  source = "../../modules/apprunner-web"
  # ...
}

# envs/prd/main.tf
module "web" {
  source = "../../modules/ecs-web"
  # ...
}
```

### 3. Documentation

- `docs/guides/guide_DEPLOY-ECS.md` - ECS deployment guide
- `docs/guides/guide_DEPLOY-APPRUNNER.md` - App Runner deployment guide
- `docs/plans/plan_MONOREPO-DEPLOYMENT-OPTIONS.md` - Decision guide (this)

### 4. Standards

- `30_std_infra_DOCKER-AWS.md` - Platform requirements (linux/amd64)
- `30_std_infra_DOCKER-MAC.md` - Local vs AWS builds

---

## Alternatives Considered

### 1. ECS Only (Rejected)
- **Pros:** Single path, simpler maintenance
- **Cons:** Higher cost for DEV/TST, overkill for prototypes
- **Why Rejected:** Unnecessarily complex for low-traffic environments

### 2. App Runner Only (Rejected)
- **Pros:** Simplest, one path
- **Cons:** NOT FedRAMP compliant, expensive for PRD
- **Why Rejected:** Cannot serve federal clients, cost-prohibitive for production

### 3. Lambda (Rejected)
- **Pros:** Serverless, auto-scale, cheap
- **Cons:** Next.js on Lambda has limitations, cold starts, complexity
- **Why Rejected:** Not worth the trade-offs vs containers

---

## References

- [AWS App Runner Pricing](https://aws.amazon.com/apprunner/pricing/)
- [ECS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [FedRAMP Authorized Services](https://marketplace.fedramp.gov/)
- Cost comparison: [cloudonaut.io analysis](https://cloudonaut.io/aws-app-runner-vs-ecs-fargate/)
- Reddit discussion: [App Runner vs ECS cost comparison](https://www.reddit.com/r/aws/comments/1ayb46c/aws_app_runner_vs_fargate_which_one_should_i/)

---

## Decision Log

- **2026-02-13:** Initial decision after 3-day deployment investigation
- Platform issue (ARM vs amd64) resolved with `30_std_infra_DOCKER-AWS.md`
- Both ECS and App Runner tested successfully with hello-world app

---

**Status:** Accepted  
**Impact:** All future CORA monorepo deployments  
**Review Date:** 2026-08-13 (6 months)