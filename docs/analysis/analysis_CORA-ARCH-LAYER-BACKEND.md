# Backend Layer Analysis - AWS Lambda (Python)

**Part of:** [CORA Architecture & Performance Analysis](./analysis_CORA-ARCH-PERFORMANCE.md)  
**Layer:** Backend  
**Status:** 🟢 Active  
**Last Updated:** February 11, 2026

---

## 3.1 Current Architecture

**Technology:** AWS Lambda (Python 3.11)  
**Framework:** org-common layer (shared utilities)  
**Deployment:** 
- Monorepo: Build scripts in stack repo (`packages/module-*/backend/build.sh`)
- Infrastructure: Terraform in infra repo (`module-*/infrastructure/main.tf`)

**Lambda Inventory (Core Modules):**
- module-access: 4 Lambdas (invites, orgs, users, auth)
- module-ai: 2 Lambdas (providers, config)
- module-ws: 3 Lambdas (workspaces, config, plugins)
- module-mgmt: 3 Lambdas (modules, lambda-config, monitoring)
- module-kb: 4 Lambdas (documents, queries, ingest, vectors)
- module-chat: 3 Lambdas (chats, messages, streaming)
- **Total:** 20-30 Lambda functions

---

## 3.2 Pros

**Serverless Benefits:**
- ✅ **Auto-scaling:** 0 to thousands of concurrent executions
- ✅ **Pay-per-use:** No cost when idle
- ✅ **Isolation:** Each request in separate execution environment
- ✅ **No server management:** AWS handles OS, patching, scaling
- ✅ **Built-in redundancy:** Multi-AZ by default

**Development Experience:**
- ✅ Independent deployment per Lambda
- ✅ Single-responsibility functions (ADR-005)
- ✅ Shared org-common layer (code reuse)
- ✅ Easy to test (unit test handlers)

**Security:**
- ✅ IAM-based execution roles (least privilege)
- ✅ VPC isolation option
- ✅ Secrets via Parameter Store/Secrets Manager
- ✅ CloudWatch logging (audit trail)

---

## 3.3 Cons

**Cold Start Penalties:**
- ⚠️ **Initial invocation:** 1-3 seconds (Python import, dependencies)
- ⚠️ **Frequency:** Depends on traffic (low traffic = more cold starts)
- ⚠️ **Unpredictable:** Can't control when cold starts occur
- **Impact:** p95 latency spikes, poor user experience

**Connection Management:**
- ⚠️ **Database connections:** Each Lambda creates new connection
- ⚠️ **Connection pooling:** Difficult without external pooler (PgBouncer)
- ⚠️ **Max connections:** Postgres has connection limits (100-500)
- **Risk:** Connection exhaustion under high load

**Limitations:**
- ❌ **15-minute timeout:** Long-running tasks fail
- ❌ **10GB memory limit:** Large data processing constrained
- ❌ **512MB /tmp storage:** Limited local storage
- ⚠️ **No persistent state:** Must use external storage

**Complexity:**
- ⚠️ 20-30 separate Lambda functions to manage
- ⚠️ Deployment coordination (multiple Lambdas per module)
- ⚠️ Debugging distributed systems (X-Ray tracing needed)

---

## 3.4 Security Considerations

**Execution Model:**
```
API Gateway → Lambda Authorizer → Backend Lambda → Database
              (validates JWT)     (business logic)   (RLS)
```

**Security Strengths:**
- ✅ **Execution roles:** Each Lambda has specific IAM role (least privilege)
- ✅ **No shared state:** Isolation between invocations
- ✅ **Secrets management:** Secrets from Parameter Store (not env vars)
- ✅ **VPC option:** Can isolate in private subnet

**Security Considerations:**
- ⚠️ **Execution role drift:** Roles can become overly permissive over time
- ⚠️ **Layer versioning:** org-common layer must be kept in sync
- ⚠️ **Environment variables:** Some secrets still in Lambda config

---

## 3.5 Performance Characteristics

**Cold Start Analysis:**
```
Lambda initialization: 200-400ms
Python runtime load:   300-500ms  
Import dependencies:   500-1000ms (org-common, supabase, requests)
Handler ready:         Total = 1-2 seconds
─────────────────────────────────
First request:         1-3 seconds
```

**Warm Execution:**
```
Handler invocation:    ~5-10ms
Business logic:        ~20-100ms (varies by complexity)
Database query:        ~10-50ms
Response formatting:   ~5-10ms
─────────────────────────────────
Total:                 40-170ms
```

**Concurrency:**
- Account limit: 1,000 concurrent executions (default)
- Per-function reserve: Can reserve capacity
- Burst limit: +500/minute

---

## 3.6 Alternative Architecture Options

### Option A: Keep Lambda + Provisioned Concurrency

**Architecture:** Same as current, but with always-warm Lambdas

**Benefits:**
- ✅ **Eliminates cold starts:** Pre-warmed execution environments
- ✅ **Predictable latency:** Consistent p95/p99
- ✅ **Simple migration:** Just enable provisioned concurrency

**Tradeoffs:**
- ⚠️ **Cost increase:** Pay for provisioned capacity even when idle
- ⚠️ **Right-sizing challenge:** Need to predict peak load

**Optimization:**
- Provision 2-5 instances per critical Lambda
- Use Application Auto Scaling (scale on schedule/metrics)
- Enable only for user-facing Lambdas (not admin)

**Estimated Improvement:** ⭐⭐⭐⭐⭐ (5/5) - Eliminates cold starts completely

**Industry Alignment:** Standard for production Lambda applications

---

### Option B: AWS Fargate (Containerized Services)

**Architecture:**
```
API Gateway → ALB → ECS Fargate Containers → Database
```

**Benefits:**
- ✅ **No cold starts:** Containers always running
- ✅ **Persistent connections:** Database connection pooling
- ✅ **More control:** Can use any runtime, dependencies
- ✅ **Long-running tasks:** No 15-minute limit

**Tradeoffs:**
- ❌ **Always-on cost:** Pay for containers even when idle
- ❌ **Slower auto-scaling:** Scale in minutes vs seconds
- ⚠️ **More operational overhead:** Health checks, deployments
- ⚠️ **Larger attack surface:** Long-lived containers

**When to consider:**
- High steady traffic (cold starts are frequent)
- Need persistent database connections
- Long-running background tasks

**Estimated Performance:** ⭐⭐⭐⭐⭐ (5/5) - No cold starts, optimal for steady load

---

### Option C: Lambda + PgBouncer (Connection Pooling)

**Architecture:**
```
Lambda → PgBouncer (RDS Proxy) → PostgreSQL
```

**Benefits:**
- ✅ **Connection pooling:** Reuse database connections
- ✅ **Higher throughput:** 1000s of Lambda invocations share 100 connections
- ✅ **Failover:** RDS Proxy handles database failover
- ✅ **Keep Lambda:** No architecture change

**Tradeoffs:**
- ⚠️ **Added latency:** +1-5ms per query (proxy overhead)
- ⚠️ **Cost:** RDS Proxy charges (but saves on Lambda cold starts)

**When to use:**
- High concurrency (100+ simultaneous Lambda invocations)
- Connection exhaustion issues
- Want to keep Lambda but reduce cold starts

**Estimated Improvement:** ⭐⭐⭐⭐ (4/5) - Solves connection issues, slight latency increase

---

## 3.7 Recommendations - Backend Layer

**P0 - Immediate:**
1. **Provisioned concurrency** - Enable on critical user-facing Lambdas (2-5 instances)
2. **Connection pooling** - Implement RDS Proxy or PgBouncer for Supabase
3. **Layer optimization** - Reduce org-common layer size (remove unused dependencies)

**P1 - Short Term:**
4. **Lambda monitoring** - Alert on cold start rate > 10%
5. **X-Ray tracing** - Enable for request tracing across Lambdas
6. **Memory optimization** - Right-size Lambda memory (faster = cheaper)

**P2 - Long Term:**
7. **Evaluate Fargate** - If steady load increases, consider containerized services
8. **Async processing** - Move long-running tasks to SQS + Lambda (15-min limit workaround)

---

**[← Back to Master Index](./analysis_CORA-ARCH-PERFORMANCE.md)**