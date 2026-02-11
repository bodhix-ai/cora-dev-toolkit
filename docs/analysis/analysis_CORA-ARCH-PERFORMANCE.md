# CORA Architecture & Performance Analysis - Master Index

**Document Type:** Technical Analysis - Master Index  
**Status:** 🟢 Active  
**Created:** February 11, 2026  
**Last Updated:** February 11, 2026  
**Context:** Monorepo deployment pattern (ADR-023)

---

## Executive Summary

This analysis evaluates CORA's n-tiered architecture in the context of the new monorepo deployment pattern, examining performance characteristics, security posture, and architectural alternatives for each layer.

**Key Finding:** There is a fundamental architectural tension between Next.js's design philosophy (data-at-the-edge, direct database access) and CORA's zero-trust security requirement (all queries through API Gateway). This analysis explores whether this tension warrants architectural changes.

---

## Document Structure

This analysis is organized across 5 documents for AI context compatibility:

| Document | Description | Lines |
|----------|-------------|-------|
| **This file** | Master index, summary, recommendations | ~400 |
| [Frontend Layer](./analysis_CORA-ARCH-LAYER-FRONTEND.md) | Next.js + App Runner analysis | ~300 |
| [API Gateway Layer](./analysis_CORA-ARCH-LAYER-GATEWAY.md) | AWS API Gateway v2 analysis | ~250 |
| [Backend Layer](./analysis_CORA-ARCH-LAYER-BACKEND.md) | AWS Lambda (Python) analysis | ~250 |
| [Database Layer](./analysis_CORA-ARCH-LAYER-DATABASE.md) | Supabase PostgreSQL analysis | ~250 |

---

## Master Index - Layer-by-Layer Summary

| Layer | Current Architecture | Performance | Security | Key Tradeoffs | Priority | Details |
|-------|---------------------|-------------|----------|---------------|----------|---------|
| **Frontend** | Next.js 14 + App Runner | ⭐⭐⭐ (3/5) | ⭐⭐⭐⭐ (4/5) | Complex for limited benefit | P1 | [View →](./analysis_CORA-ARCH-LAYER-FRONTEND.md) |
| **API Gateway** | AWS API Gateway v2 (HTTP) | ⭐⭐⭐⭐ (4/5) | ⭐⭐⭐⭐⭐ (5/5) | Latency vs Zero Trust | P2 | [View →](./analysis_CORA-ARCH-LAYER-GATEWAY.md) |
| **Backend** | AWS Lambda (Python 3.11) | ⭐⭐⭐ (3/5) | ⭐⭐⭐⭐ (4/5) | Cold starts vs isolation | P1 | [View →](./analysis_CORA-ARCH-LAYER-BACKEND.md) |
| **Database** | Supabase (PostgreSQL + RLS) | ⭐⭐⭐⭐ (4/5) | ⭐⭐⭐⭐ (4/5) | RLS overhead vs security | P2 | [View →](./analysis_CORA-ARCH-LAYER-DATABASE.md) |

**Overall Architecture Score:** ⭐⭐⭐½ (3.5/5)

---

## Performance Bottlenecks Identified

1. 🔴 **Frontend cold starts** (3-8 seconds on App Runner) - See [Frontend Analysis](./analysis_CORA-ARCH-LAYER-FRONTEND.md)
2. 🔴 **Lambda cold starts** (1-3 seconds first invocation) - See [Backend Analysis](./analysis_CORA-ARCH-LAYER-BACKEND.md)
3. 🟡 **API Gateway latency** (+20-50ms per request) - See [Gateway Analysis](./analysis_CORA-ARCH-LAYER-GATEWAY.md)
4. 🟡 **RLS policy evaluation** (+10-30% query time) - See [Database Analysis](./analysis_CORA-ARCH-LAYER-DATABASE.md)

---

## Security Strengths

1. ✅ Zero-trust architecture enforced at API Gateway
2. ✅ Row-level security on all data access
3. ✅ IAM-based Lambda authorization
4. ✅ Multi-layer defense (Gateway → Lambda → RLS)

---

## The Architectural Tension

**The Core Issue:**
```
Next.js is designed for: Direct DB access → SSR/ISR benefits
CORA requires:          All queries through API Gateway → Zero trust

Result: Paying complexity cost of Next.js WITHOUT performance benefits
```

**Impact:**
- Next.js SSR/ISR features are underutilized (all data through APIGW anyway)
- Container size 3x typical (260-309MB vs 50-150MB)
- Cold starts 2-4x slower (3-8 seconds vs 1-2 seconds for SPA)

**See:** [Frontend Layer Analysis](./analysis_CORA-ARCH-LAYER-FRONTEND.md) for detailed discussion and alternatives.

---

## Cross-Layer Performance Optimization Recommendations

### Quick Wins (1-2 days implementation)

| Priority | Layer | Recommendation | Impact | Effort | Details |
|----------|-------|---------------|--------|--------|---------|
| 🔴 P0 | Backend | Enable provisioned concurrency on top 5 Lambdas | ⭐⭐⭐⭐⭐ | Low | [Backend →](./analysis_CORA-ARCH-LAYER-BACKEND.md#37-recommendations) |
| 🔴 P0 | Database | Deploy PgBouncer for connection pooling | ⭐⭐⭐⭐ | Low | [Database →](./analysis_CORA-ARCH-LAYER-DATABASE.md#47-recommendations) |
| 🔴 P0 | API Gateway | Enable response caching (60 seconds) | ⭐⭐⭐ | Low | [Gateway →](./analysis_CORA-ARCH-LAYER-GATEWAY.md#27-recommendations) |
| 🟡 P1 | Frontend | CDN for static assets (CloudFront) | ⭐⭐⭐⭐ | Low | [Frontend →](./analysis_CORA-ARCH-LAYER-FRONTEND.md#17-recommendations) |
| 🟡 P1 | Database | Add partial indexes (org_id, ws_id) | ⭐⭐⭐ | Low | [Database →](./analysis_CORA-ARCH-LAYER-DATABASE.md#47-recommendations) |

**Estimated Overall Improvement:** 40-60% reduction in p95 latency

---

### Medium-Term Improvements (1-2 weeks)

| Priority | Layer | Recommendation | Impact | Effort | Details |
|----------|-------|---------------|--------|--------|---------|
| 🟡 P1 | Frontend | Evaluate React SPA migration | ⭐⭐⭐⭐⭐ | Medium | [Frontend →](./analysis_CORA-ARCH-LAYER-FRONTEND.md#16-alternatives) |
| 🟡 P1 | API Gateway | VPC Link to Lambda | ⭐⭐⭐ | Medium | [Gateway →](./analysis_CORA-ARCH-LAYER-GATEWAY.md#26-alternatives) |
| 🟡 P1 | Backend | Optimize org-common layer size | ⭐⭐⭐ | Medium | [Backend →](./analysis_CORA-ARCH-LAYER-BACKEND.md#37-recommendations) |
| 🟡 P1 | Database | Read replica for reporting queries | ⭐⭐⭐⭐ | Medium | [Database →](./analysis_CORA-ARCH-LAYER-DATABASE.md#47-recommendations) |

**Estimated Overall Improvement:** Additional 20-30% improvement

---

## Three Long-Term Architectural Options (6-12 months)

### Option 1: Zero-Trust Purist (Current + Optimizations)

**Architecture:** Keep all layers, optimize each independently

**Investments:**
- Frontend: App Runner provisioned capacity
- Gateway: Multi-region deployment, edge caching
- Backend: Provisioned Lambda concurrency everywhere
- Database: Aurora Serverless v2 with RDS Proxy

**Performance:** ⭐⭐⭐⭐ (4/5)  
**Security:** ⭐⭐⭐⭐⭐ (5/5)  
**Cost:** 💰💰💰💰 (High - always-on capacity)

**When to choose:**
- Zero-trust security is non-negotiable
- Compliance requirements (SOC2, HIPAA)
- Complete audit trail required for all requests

---

### Option 2: Defense-in-Depth (Hybrid Model) - RECOMMENDED ⭐

**Architecture:**
```
Writes:  Next.js → API Gateway → Lambda → Database
Reads:   Next.js → Supabase Direct → RLS
Admin:   Always through Gateway
```

**Philosophy:** 
- API Gateway = outer perimeter for writes
- RLS = inner perimeter for reads
- Multi-layer defense, not single perimeter

**Benefits:**
- ✅ Read latency: ~100ms (vs ~300ms current)
- ✅ Lower Lambda costs (80% of requests are reads)
- ✅ Still secured by RLS (database-level enforcement)

**Tradeoffs:**
- ⚠️ Not pure zero-trust (reads bypass Gateway)
- ⚠️ RLS policies must be bulletproof

**Performance:** ⭐⭐⭐⭐⭐ (5/5)  
**Security:** ⭐⭐⭐⭐ (4/5)  
**Cost:** 💰💰 (Medium)

**Industry Alignment:** 
- OWASP: Defense-in-depth > single perimeter
- Supabase's recommended architecture
- Used by Cal.com, Dub.sh, many production SaaS apps

**Details:** See [Gateway Analysis](./analysis_CORA-ARCH-LAYER-GATEWAY.md#26-alternatives) and [Frontend Analysis](./analysis_CORA-ARCH-LAYER-FRONTEND.md#16-alternatives)

---

### Option 3: Modern SPA Stack

**Architecture:**
```
CloudFront (CDN) → S3 (React SPA) → API Gateway → Lambda → Database
                                   ↓
                           (All requests through Gateway)
```

**Changes:**
- Frontend: React SPA + Vite (not Next.js)
- Deployment: S3 + CloudFront (not App Runner)
- Backend: Keep Gateway + Lambda (zero-trust maintained)

**Benefits:**
- ✅ **Cold start elimination:** Static files from CDN (~100ms)
- ✅ **Simpler:** No SSR complexity
- ✅ **Cheaper:** S3 + CloudFront << App Runner
- ✅ **Keep zero-trust:** All API calls through Gateway

**Tradeoffs:**
- ❌ No SSR (but not using it effectively anyway)
- ⚠️ Need to implement code splitting manually

**Performance:** ⭐⭐⭐⭐⭐ (5/5)  
**Security:** ⭐⭐⭐⭐⭐ (5/5)  
**Cost:** 💰 (Low)

**Details:** See [Frontend Analysis](./analysis_CORA-ARCH-LAYER-FRONTEND.md#16-alternatives)

---

## Final Recommendations Summary

### Immediate Actions (This Month) - P0

**1. Backend: Provisioned Lambda concurrency**
- Enable on top 5 user-facing Lambdas
- Start with 2-5 instances per Lambda
- **Impact:** Eliminate cold starts, reduce p95 latency by 50%

**2. Database: Connection pooling**
- Deploy PgBouncer or RDS Proxy
- **Impact:** Reduce connection overhead, support higher concurrency

**3. API Gateway: Response caching**
- Cache GET responses for 60 seconds
- **Impact:** Reduce Lambda invocations by 30-50%

**4. Frontend: CDN for static assets**
- CloudFront in front of App Runner
- **Impact:** Reduce asset load time by 60-80%

**Expected Result:** 40-60% reduction in p95 latency (300ms → 120-180ms)

---

### Strategic Decision (Next Quarter)

**Question:** Should CORA maintain pure zero-trust, or adopt defense-in-depth?

**Option A: Optimize Current Architecture**
- Keep pure zero-trust (all requests through Gateway)
- Optimize each layer independently
- Higher cost, but maximum security

**Option B: Hybrid Model (Recommended) ⭐**
- Gateway for writes, direct Supabase for reads
- RLS as inner security boundary
- Lower latency, lower cost, still secure

**Recommendation:** **Option B (Hybrid Model)**

**Rationale:**
1. **Performance:** 80% of requests are reads → 80% latency reduction
2. **Security:** RLS is database-enforced, impossible to bypass
3. **Industry alignment:** OWASP defense-in-depth, Supabase best practices
4. **Cost:** Significant Lambda cost savings

**Risk Mitigation:**
- Comprehensive RLS policy testing
- Enable database audit logging
- Monitor for RLS policy violations
- Keep Gateway for all writes and admin operations

---

### Frontend Decision (Depends on Security Model)

**If adopting hybrid model (Option 2):**
→ **Keep Next.js** (Server Components become useful with direct Supabase)

**If keeping pure zero-trust:**
→ **Consider React SPA migration** (simpler, faster, cheaper)

**Details:** See [Frontend Layer Analysis](./analysis_CORA-ARCH-LAYER-FRONTEND.md)

---

## Success Metrics

### Performance Targets

- **p50 latency:** < 100ms (current: ~200ms)
- **p95 latency:** < 300ms (current: ~500ms)
- **p99 latency:** < 1s (current: ~2-5s)
- **Cold start rate:** < 5% (current: ~15%)

### Security Targets

- Zero RLS policy violations
- 100% audit trail coverage (writes)
- Database access logs enabled
- Regular security audits (quarterly)

---

## Recommended Path Forward

**Phase 1 (Immediate):**
- Implement quick wins (provisioned Lambda, caching, CDN)
- Monitor performance improvements
- **Goal:** 40-60% latency reduction

**Phase 2 (3 months):**
- Evaluate hybrid model (Gateway for writes, direct for reads)
- Pilot with one module (e.g., module-kb)
- Measure performance and security impact

**Phase 3 (6 months):**
- If hybrid model successful, expand to all modules
- Consider React SPA migration (if not adopting hybrid)
- Optimize database layer (Aurora Serverless, read replicas)

---

## Conclusion

### Key Findings

1. **Architectural Tension:** Next.js + Zero-Trust API Gateway creates complexity without benefit
2. **Performance Bottlenecks:** Cold starts (frontend + backend) are the primary issue
3. **Security Strength:** Multi-layer defense (Gateway + RLS) is robust
4. **Optimization Opportunity:** Hybrid model could reduce latency by 60-70%

### Recommended Next Steps

1. **Review document** with team (read master index + relevant layer analyses)
2. **Decide on security model:** Pure zero-trust vs defense-in-depth
3. **Implement P0 quick wins** (provisioned concurrency, pooling, caching)
4. **Pilot hybrid model** with one module (if adopting Option 2)
5. **Measure results** against success metrics
6. **Update document** after Phase 1 completion (May 2026)

---

## References

### Layer-Specific Analyses
- [Frontend Layer Analysis](./analysis_CORA-ARCH-LAYER-FRONTEND.md) - Next.js + App Runner
- [API Gateway Layer Analysis](./analysis_CORA-ARCH-LAYER-GATEWAY.md) - AWS API Gateway v2
- [Backend Layer Analysis](./analysis_CORA-ARCH-LAYER-BACKEND.md) - AWS Lambda (Python)
- [Database Layer Analysis](./analysis_CORA-ARCH-LAYER-DATABASE.md) - Supabase PostgreSQL

### CORA Documentation
- ADR-023: Monorepo Build Standards
- ADR-018: API Route Structure
- ADR-019: Auth Standardization
- ADR-005: Single-Responsibility Lambdas

### Industry Standards
- OWASP: Defense in Depth Principles
- NIST: Zero Trust Architecture (SP 800-207)
- AWS: Well-Architected Framework (Performance Efficiency Pillar)
- Supabase: Architecture Best Practices

---

**Document Status:** 🟢 Active  
**Next Review:** May 2026 (after implementing Phase 1 recommendations)