# CORA Monorepo Deployment Options

**Status:** Active  
**Created:** February 13, 2026  
**Purpose:** Guide for deploying CORA monorepo apps to AWS

---

## Overview

CORA monorepo applications can be deployed to AWS using two options:

1. **ECS Fargate with ALB** (Recommended for most use cases)
2. **App Runner** (Simpler, but less configurable)

Both options support the same Docker image built from the monorepo.

---

## Option 1: ECS Fargate with ALB (Recommended)

### Pros
- ✅ Full control over networking (VPC, security groups, subnets)
- ✅ Better visibility (CloudWatch logs, metrics, task details)
- ✅ More scaling options (CPU, memory, task count)
- ✅ Can integrate with existing VPC infrastructure
- ✅ Blue-green deployments built-in
- ✅ Cost-effective for steady workloads

### Cons
- ⚠️ More infrastructure to manage (ALB, target groups, security groups)
- ⚠️ Slightly more complex Terraform configuration

### When to Use
- Production deployments
- Applications requiring custom networking
- Integration with existing AWS infrastructure
- Need for detailed monitoring and control

### Infrastructure Components

```
┌─────────────────────────────────────┐
│   Application Load Balancer (ALB)  │
│         Port 80 (HTTP)              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       Target Group (Port 3000)      │
│     Health Check: /api/health       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      ECS Cluster (Fargate)          │
│                                     │
│  ┌───────────────────────────┐    │
│  │   ECS Task (Container)    │    │
│  │   - Next.js App           │    │
│  │   - Port 3000             │    │
│  │   - 256 CPU / 512 MB      │    │
│  └───────────────────────────┘    │
└─────────────────────────────────────┘
```

### Terraform Structure

```
{project}-infra/
└── envs/
    └── dev/
        └── ecs/
            ├── main.tf          # ECS cluster, service, task
            ├── alb.tf           # Load balancer, listeners, target groups
            ├── security.tf      # Security groups
            ├── variables.tf
            └── outputs.tf
```

### Cost Estimate (dev environment)
- ALB: ~$16/month
- ECS Fargate (1 task, 256 CPU, 512 MB): ~$5/month
- **Total: ~$21/month**

---

## Option 2: App Runner

### Pros
- ✅ Simplest deployment (minimal infrastructure)
- ✅ Auto-scales to zero (pay only when used)
- ✅ Built-in SSL certificate
- ✅ Automatic deployments on image push (optional)
- ✅ Cost-effective for low-traffic workloads

### Cons
- ⚠️ Less control over networking
- ⚠️ Limited visibility (fewer CloudWatch logs)
- ⚠️ Health check configuration less flexible
- ⚠️ Cannot customize scaling as much

### When to Use
- Development/staging environments
- Low-traffic applications
- Rapid prototyping
- Cost-sensitive deployments

### Infrastructure Components

```
┌─────────────────────────────────────┐
│        App Runner Service           │
│                                     │
│  - Built-in Load Balancer          │
│  - SSL Certificate (*.awsapprunner) │
│  - Health Check: /api/health        │
│  - Port 3000                        │
│  - Auto-scaling (0-25 instances)    │
└─────────────────────────────────────┘
```

### Terraform Structure

```
{project}-infra/
└── envs/
    └── dev/
        └── apprunner/
            ├── main.tf          # App Runner service
            ├── iam.tf           # ECR access role, instance role
            ├── variables.tf
            └── outputs.tf
```

### Cost Estimate (dev environment)
- App Runner (1 vCPU, 2 GB): ~$25/month (if always running)
- App Runner (auto-scale to zero): ~$5-10/month (low traffic)
- **Total: $5-25/month** (depends on usage)

---

## Common Requirements (Both Options)

### 1. ECR Repository

Both options require a Docker image in ECR:

```bash
# Build for AWS (REQUIRED)
./scripts/build-docker-aws.sh {project}-web latest

# Push to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin {account}.dkr.ecr.us-east-1.amazonaws.com

docker tag {project}-web:latest {account}.dkr.ecr.us-east-1.amazonaws.com/{project}-web:latest
docker push {account}.dkr.ecr.us-east-1.amazonaws.com/{project}-web:latest
```

### 2. Health Check Endpoint

Both require `/api/health` or `/api/healthcheck`:

```typescript
// apps/web/app/api/health/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'web',
    },
    { status: 200 }
  );
}
```

### 3. Environment Variables

Both require:
- `NODE_ENV=production`
- `HOSTNAME=0.0.0.0` (bind to all interfaces)
- `PORT=3000` (container port)
- Auth variables (NEXTAUTH_URL, etc.)

### 4. Docker Platform

Both require `linux/amd64` platform:

```bash
# ALWAYS use the AWS build script
./scripts/build-docker-aws.sh {project}-web latest
```

---

## Cost Comparison (Real Numbers)

### App Runner
- **Low Traffic** (<10 hrs/month): ~$5-10/month (scales to zero)
- **High Traffic** (always on): ~$72/month (1 vCPU, 2 GB)
- **No ALB Cost** (built-in load balancer)
- **1.5-2x higher** per-compute-unit cost than ECS

### ECS Fargate
- **Always On**: ~$21/month (256 CPU, 512 MB + ALB)
- **High Traffic**: ~$50/month (1 vCPU, 2 GB + ALB)
- **Requires ALB**: +$16-18/month fixed cost
- **Fargate Spot**: 70% savings available
- **Lower per-unit** compute cost

### Cost Crossover Point
- **App Runner cheaper:** <10 hours/month usage
- **ECS cheaper:** Steady or high traffic (>10 hrs/month)

**Source:** [cloudonaut.io analysis](https://cloudonaut.io/aws-app-runner-vs-ecs-fargate/), Reddit [cost comparison](https://www.reddit.com/r/aws/comments/1ayb46c/aws_app_runner_vs_fargate_which_one_should_i/)

---

## Decision Matrix

| Requirement | ECS Fargate | App Runner |
|-------------|-------------|------------|
| FedRAMP compliance | ✅ Authorized | ❌ NOT authorized |
| Production workload | ✅ Recommended | ❌ Use ECS |
| Federal clients | ✅ REQUIRED | ❌ Cannot use |
| Low traffic (<10 hrs/month) | ⚠️ More expensive | ✅ Much cheaper |
| High/steady traffic | ✅ Lower cost | ❌ 1.5-2x cost |
| Custom VPC | ✅ Yes | ❌ No |
| Detailed monitoring | ✅ Full access | ⚠️ Limited |
| SSL certificate | ⚠️ Need ACM | ✅ Automatic |
| Setup complexity | ⚠️ More complex | ✅ Simple |

---

## Recommendation (Environment-Based)

**Based on Cost, Usage, and Compliance:**

| Environment | Service | Rationale |
|-------------|---------|-----------|
| **DEV** | ✅ App Runner | Infrequent use, auto-scale to zero, ~$5-10/month |
| **TST** | ✅ App Runner | Low traffic, cost savings, simple setup |
| **STG** | ✅ ECS Fargate | Mirror PRD for performance testing |
| **PRD** | ✅ ECS Fargate | FedRAMP compliance + cost-effective for steady traffic |

### Special Cases

**Prototypes/Demos:**
- ✅ **App Runner** - Quick setup, auto-scale to zero

**Federal Clients:**
- ✅ **ECS Fargate ONLY** - App Runner NOT FedRAMP authorized
- ALL environments (DEV/TST/STG/PRD) must use ECS

### Why This Strategy?

**DEV/TST → App Runner:**
- Used infrequently (developers work locally)
- Auto-scale to zero saves $10-15/month per environment
- Simpler to maintain
- No compliance requirements for internal dev

**STG → ECS Fargate:**
- Must mirror PRD infrastructure exactly
- Accurate performance testing
- Validates PRD deployment process

**PRD → ECS Fargate:**
- **FedRAMP compliance** (required for federal clients)
- Cost-effective for steady traffic
- Better monitoring and debugging
- Production-grade control

---

## Next Steps

Choose your deployment option:

- **ECS Fargate:** See `docs/guides/guide_DEPLOY-ECS.md` (to be created)
- **App Runner:** See `docs/guides/guide_DEPLOY-APPRUNNER.md` (to be created)

Both guides will include complete Terraform examples and deployment instructions.