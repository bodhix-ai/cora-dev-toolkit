# Frontend Layer Analysis - Next.js + App Runner

**Part of:** [CORA Architecture & Performance Analysis](./analysis_CORA-ARCH-PERFORMANCE.md)  
**Layer:** Frontend  
**Status:** 🟢 Active  
**Last Updated:** February 11, 2026

---

## 1.1 Current Architecture

**Technology:** Next.js 14 (App Router) + React 18  
**Deployment:** AWS App Runner (containerized)  
**Monorepo Impact:** 
- Container size: 260-309MB (vs 50-150MB typical)
- Build time: 5-10 minutes (vs 1-3 minutes typical)
- Memory requirement: 4GB heap for build (vs 1.4GB default)
- Dependencies: 9+ workspace packages (api-client, 6-9 modules)

---

## 1.2 Pros

**Developer Experience:**
- ✅ TypeScript end-to-end type safety
- ✅ React ecosystem (MUI components, hooks, tooling)
- ✅ Hot module reload in development
- ✅ File-based routing (convention over configuration)
- ✅ Built-in API routes (though unused due to APIGW requirement)

**Production Features:**
- ✅ Automatic code splitting
- ✅ Image optimization
- ✅ Incremental Static Regeneration (ISR) capability
- ✅ Server-side rendering (SSR) capability
- ✅ Streaming responses

**Monorepo Benefits:**
- ✅ Shared type definitions across packages
- ✅ Module code co-located with frontend components
- ✅ Single build pipeline for all modules

---

## 1.3 Cons

**Underutilized Features:**
- ❌ **SSR/ISR not beneficial** - All data fetching goes through API Gateway, negating edge rendering benefits
- ❌ **API Routes unused** - Zero-trust requires API Gateway, so Next.js API routes are bypassed
- ❌ **Server Components limited** - Can't directly query database, must call API Gateway
- ❌ **Middleware restrictions** - Auth handled by API Gateway, not Next.js middleware

**Performance Overhead:**
- ⚠️ **Large bundle size** - 260-309MB (3x typical Next.js app)
- ⚠️ **Cold start penalty** - 3-8 seconds (vs 1-2 seconds for SPA)
- ⚠️ **Hydration cost** - React hydration on every page load
- ⚠️ **Memory footprint** - 500MB-1.5GB at runtime

**Complexity Without Benefit:**
- ⚠️ App Router mental model (Server/Client components)
- ⚠️ Data fetching patterns (fetch in RSC, then client-side refetch)
- ⚠️ Build configuration complexity (transpilePackages for all modules)

---

## 1.4 Security Considerations

**Current Model:**
```
User → Next.js App → API Gateway → Lambda → Database
        (no DB access)   (auth here)
```

**Security Strengths:**
- ✅ No direct database credentials in frontend
- ✅ All requests validated at API Gateway
- ✅ CORS properly configured
- ✅ NextAuth for session management (client-side only)

**Security Weaknesses:**
- ⚠️ NEXTAUTH_SECRET must be set correctly or app crashes
- ⚠️ NEXTAUTH_URL must match deployment URL or auth fails
- ⚠️ Environment variables in container (not secrets manager)

---

## 1.5 Performance Characteristics

**Cold Start Analysis:**
- Container start: 2-4 seconds
- Next.js initialization: 1-2 seconds
- First page load: 1-2 seconds additional
- **Total cold start:** 4-8 seconds

**Warm Request:**
- Server-side rendering: 50-200ms
- Client hydration: 100-300ms
- API call to APIGW: 50-200ms
- **Total page load:** 200-700ms

**Bundle Analysis:**
- Initial JS bundle: ~300KB (gzipped)
- Vendor chunks: ~800KB (React, MUI, etc.)
- Module chunks: ~200KB each (6-9 modules)
- **Total transferred:** ~2-3MB on first visit

---

## 1.6 Alternative Architecture Options

### Option A: Keep Next.js + API Gateway (Current)

**When to choose:**
- Need SSR for SEO (marketing pages)
- Want unified codebase for marketing + app
- Team expertise in Next.js

**Optimization Path:**
- Provisioned capacity on App Runner (eliminate cold starts)
- Static page pre-rendering where possible
- Aggressive code splitting per module
- CDN caching for static assets

**Estimated Improvement:** ⭐⭐⭐⭐ (4/5) - Can reduce cold starts to near-zero

---

### Option B: React SPA + Vite + API Gateway

**Architecture:**
```
CDN (static files) → React SPA → API Gateway → Lambda → Database
```

**Benefits:**
- ✅ **Simpler:** No SSR complexity, pure client-side rendering
- ✅ **Faster cold starts:** Static files served from CDN (~100ms)
- ✅ **Smaller bundles:** 50-100MB container vs 260-309MB
- ✅ **Lower cost:** S3 + CloudFront << App Runner
- ✅ **Better caching:** Aggressive CDN caching of static assets

**Tradeoffs:**
- ❌ No SSR (but not using it effectively anyway)
- ❌ Slightly worse initial load (SPA hydration)
- ⚠️ Need to implement code splitting manually

**Industry Alignment:** 
- Gmail, Figma, Linear, Notion = SPAs with API backends
- Zero-trust SaaS apps typically use SPA pattern

**Estimated Performance:** ⭐⭐⭐⭐⭐ (5/5) - CDN-served static files

---

### Option C: Next.js with Direct Supabase Access

**Architecture:**
```
Next.js (App Router) → Supabase (direct) + API Gateway (admin only)
               ↓
        Row-Level Security
```

**Benefits:**
- ✅ **Utilize Next.js properly:** Server Components with direct DB queries
- ✅ **Eliminate Gateway latency:** Direct Supabase connection
- ✅ **Streaming SSR:** Real-time data streaming to browser
- ✅ **Edge rendering:** Deploy to Vercel Edge (closer to users)

**Security Model:**
- User reads: Next.js → Supabase (protected by RLS)
- Admin operations: Next.js → API Gateway → Lambda
- Multi-layer defense: Gateway for writes, RLS for reads

**Tradeoffs:**
- ⚠️ **Not zero-trust:** Some queries bypass API Gateway
- ⚠️ **RLS must be bulletproof:** It's the only protection on reads
- ⚠️ **Connection pooling needed:** Next.js → Postgres connections

**Industry Alignment:**
- Vercel reference architecture for Supabase
- Used by: Cal.com, Dub.sh, other open-source SaaS

**Estimated Performance:** ⭐⭐⭐⭐⭐ (5/5) - Streaming SSR, edge rendering

---

## 1.7 Recommendations - Frontend Layer

**P0 - Immediate (Current Architecture):**
1. **Provisioned capacity** - Enable App Runner provisioned instances (eliminate cold starts)
2. **Health check optimization** - Reduce interval from 10s to 5s, timeout to 2s
3. **Environment secrets** - Move to AWS Secrets Manager (not container env vars)

**P1 - Short Term (3-6 months):**
4. **Evaluate SPA migration** - Given that SSR benefits aren't realized, consider React SPA + Vite
5. **Module lazy loading** - Load modules on-demand, not upfront (reduce initial bundle)
6. **CDN for static assets** - CloudFront in front of App Runner

**P2 - Long Term (6-12 months):**
7. **Security model review** - Evaluate whether RLS + direct Supabase is acceptable for reads
8. **Edge rendering** - If adopting Option C, deploy to Vercel Edge or CloudFront Functions

---

## Industry Comparisons

**Linear (Task Management SaaS):**
- Frontend: React SPA + GraphQL
- **Latency:** p95 < 200ms

**Notion (Collaboration SaaS):**
- Frontend: React SPA
- **Latency:** p95 < 150ms

**Cal.com (Scheduling SaaS):**
- Frontend: Next.js (direct Supabase access)
- **Latency:** p95 < 300ms

---

**[← Back to Master Index](./analysis_CORA-ARCH-PERFORMANCE.md)**