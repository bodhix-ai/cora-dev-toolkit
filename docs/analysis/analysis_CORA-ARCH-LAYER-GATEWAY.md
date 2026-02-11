# API Gateway Layer Analysis - AWS API Gateway v2

**Part of:** [CORA Architecture & Performance Analysis](./analysis_CORA-ARCH-PERFORMANCE.md)  
**Layer:** API Gateway  
**Status:** 🟢 Active  
**Last Updated:** February 11, 2026

---

## 2.1 Current Architecture

**Technology:** AWS API Gateway HTTP API (v2)  
**Integration:** Lambda Proxy Integration  
**Authorization:** Custom Lambda Authorizer (JWT validation)  
**Monorepo Impact:** None (infrastructure layer, separate repo)

---

## 2.2 Pros

**Managed Service Benefits:**
- ✅ Auto-scaling (0 to millions of requests)
- ✅ Built-in DDoS protection (AWS Shield)
- ✅ Request/response transformation
- ✅ Request validation at edge
- ✅ CloudWatch metrics and logging
- ✅ CORS configuration at gateway level

**Security Enforcement:**
- ✅ **Zero-trust enforcement** - Every request validated
- ✅ JWT validation before Lambda invocation
- ✅ IAM-based access control
- ✅ Audit trail (CloudWatch logs)
- ✅ Rate limiting and throttling

**Operational:**
- ✅ No servers to manage
- ✅ Pay-per-request pricing
- ✅ Multi-region deployment (failover)

---

## 2.3 Cons

**Latency Overhead:**
- ⚠️ +20-50ms per request (Gateway processing)
- ⚠️ +10-30ms for custom authorizer invocation
- ⚠️ Cold start penalty on auth Lambda (1-2s first request)
- **Total added latency:** 30-80ms per request (100ms worst case)

**Limitations:**
- ❌ 29-second timeout limit (long-running operations fail)
- ❌ 10MB payload limit (large file uploads require S3 presigned URLs)
- ❌ WebSocket connections require separate gateway
- ⚠️ Authorizer caching (5 minutes) - Changes take time to propagate

**Complexity:**
- ⚠️ Additional layer to manage and monitor
- ⚠️ More failure points in request path
- ⚠️ Error handling across Gateway + Lambda

---

## 2.4 Security Considerations

**Zero-Trust Enforcement:**
```
Request Flow:
1. Client → API Gateway (TLS termination)
2. Gateway → Custom Authorizer Lambda (JWT validation)
3. Authorizer → Returns IAM policy (allow/deny)
4. Gateway → Backend Lambda (if allowed)
5. Lambda → Database (with user context)
```

**Security Strengths:**
- ✅ Every request authenticated (no bypass)
- ✅ Centralized auth logic (one authorizer for all routes)
- ✅ Request validation before reaching Lambda
- ✅ CORS enforcement at perimeter

**Security Considerations:**
- ⚠️ Authorizer caching means revoked tokens valid for up to 5 minutes
- ⚠️ API Gateway logs contain request data (PII concerns)
- ⚠️ Custom authorizer is single point of failure

---

## 2.5 Performance Characteristics

**Request Latency Breakdown:**
```
TLS handshake:        ~50ms (first request)
Gateway processing:   ~20ms
Authorizer Lambda:    ~30ms (cached), ~1-2s (cold start)
Backend Lambda:       ~10ms (warm), ~1-3s (cold start)
Lambda execution:     ~50-200ms (business logic)
Database query:       ~10-50ms
Response processing:  ~10ms
─────────────────────────────────
Warm path total:      ~180-410ms
Cold path total:      ~2-5 seconds
```

**Throughput:**
- Gateway capacity: 10,000 requests/second (default)
- Burst capacity: 5,000 requests/second
- Authorizer cache: Reduces load by 95%+

---

## 2.6 Alternative Architecture Options

### Option A: Keep API Gateway (Current)

**When to choose:**
- Zero-trust security is non-negotiable
- Need centralized auth enforcement
- Want full audit trail of all requests
- External compliance requirements (SOC2, HIPAA, etc.)

**Optimization Path:**
- Enable Gateway-level caching (reduce Lambda invocations)
- Increase authorizer cache TTL (5 → 15 minutes)
- Use VPC Link for Lambda (reduce cold starts)
- Request validation at Gateway (fail fast)

**Estimated Improvement:** ⭐⭐⭐⭐ (4/5) - Can reduce p95 latency by 30-40%

---

### Option B: Hybrid - Gateway for Writes, Direct for Reads

**Architecture:**
```
Writes:  Next.js → API Gateway → Lambda → Database
Reads:   Next.js → Supabase Direct → RLS
```

**Benefits:**
- ✅ **Reduced latency:** Read queries skip Gateway + Lambda
- ✅ **Lower cost:** Fewer Lambda invocations
- ✅ **Better performance:** Direct Postgres connections
- ✅ **Still secured:** RLS policies enforce access control

**Security Model:**
- Write operations: Full zero-trust via Gateway
- Read operations: Defense-in-depth via RLS
- Admin operations: Always via Gateway

**Tradeoffs:**
- ⚠️ **Not pure zero-trust:** Reads bypass Gateway
- ⚠️ **RLS must be perfect:** It's the only protection
- ⚠️ **More complex:** Two data access patterns

**Industry Alignment:**
- Supabase's recommended architecture
- Used by Cal.com, Dub.sh, many SaaS apps
- OWASP: Defense-in-depth > single perimeter

**Estimated Performance:** ⭐⭐⭐⭐⭐ (5/5) - Eliminates Gateway latency for 80% of requests

---

### Option C: Application Load Balancer (ALB)

**Architecture:**
```
ALB → Next.js Container (with API routes) → Database
      ↓
  JWT validation in Next.js middleware
```

**Benefits:**
- ✅ **Lower latency:** ALB adds ~5-10ms vs Gateway's 20-50ms
- ✅ **Higher throughput:** ALB handles more requests/second
- ✅ **Simpler:** One less layer (no Lambda)
- ✅ **WebSocket support:** Native in ALB

**Tradeoffs:**
- ❌ **No request transformation:** Must handle in application
- ❌ **No built-in caching:** Need to implement
- ❌ **Auth in application:** Not at perimeter (less secure)

**Not Recommended:** Loses zero-trust enforcement point

---

## 2.7 Recommendations - API Gateway Layer

**P0 - Immediate:**
1. **Enable Gateway caching** - Cache GET responses for 60 seconds (reduce Lambda load)
2. **Increase authorizer cache TTL** - 5 → 15 minutes (reduce auth Lambda invocations)
3. **Request validation** - Validate request schemas at Gateway (fail fast)

**P1 - Short Term:**
4. **Evaluate hybrid model** - Gateway for writes, direct Supabase for reads
5. **VPC Link** - Connect Gateway to Lambda via VPC (reduce cold starts)
6. **Monitor cold starts** - Alert on p95 > 1 second

**P2 - Long Term:**
7. **Authorizer optimization** - Pre-warm authorizer Lambda (provisioned concurrency)
8. **Multi-region** - Deploy Gateway in multiple regions (reduce latency)

---

**[← Back to Master Index](./analysis_CORA-ARCH-PERFORMANCE.md)**
