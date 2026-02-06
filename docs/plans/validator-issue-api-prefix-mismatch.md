# API Prefix Mismatch - Validator Issue

**Date:** February 5, 2026  
**Issue:** Validator reports 103 admin routes as "orphaned" but they ARE used by UI  
**Root Cause:** Next.js `/api/` prefix handling  

---

## The Problem

**Validator reports as orphaned:**
- `GET /admin/org/ai/config`
- `GET /admin/org/access/users`
- `GET /admin/sys/ai/config`
- ... (103 total routes)

**But these ARE called by frontend!**

---

## Root Cause Analysis

### Frontend Calls (with `/api/` prefix):
```typescript
// File: apps/web/app/admin/org/ai/page.tsx (line 54, 91)
await fetch('/api/admin/org/ai/config', ...)
```

### Backend Exposes (without `/api/` prefix):
```python
# Lambda docstring route
GET /admin/org/ai/config
```

### The Mismatch:
- **Frontend:** `/api/admin/org/ai/config`
- **Backend:** `/admin/org/ai/config`
- **Result:** Validator sees these as different routes!

---

## Why This Happens

**Next.js Routing Pattern:**
1. Frontend makes request to `/api/admin/org/ai/config`
2. Next.js `apps/web/app/api/[[...path]]/route.ts` catches all `/api/*` routes
3. Next.js forwards to API Gateway **after stripping `/api/` prefix**
4. API Gateway receives request for `/admin/org/ai/config` (no `/api/` prefix)
5. Lambda handles `/admin/org/ai/config`

**The validator doesn't understand this Next.js routing convention.**

---

## Impact

- **False Positives:** 103 legitimate UI-driven routes flagged as orphaned
- **Noise:** Makes it hard to find actual dead code
- **Trust:** Developers lose confidence in validator accuracy

---

## Solution Options

### Option 1: Update Validator (RECOMMENDED)
Enhance `validation/api-tracer/` to:
1. Detect Next.js pattern (presence of `app/api/[[...path]]/route.ts`)
2. When matching routes, strip `/api/` prefix from frontend calls
3. Match `/api/admin/org/ai/config` → `/admin/org/ai/config`

**Pros:** Fixes root cause, benefits all projects  
**Cons:** Requires validator code changes  

### Option 2: Whitelist Pattern (WORKAROUND)
Add to `validation/api-tracer/config.yaml`:
```yaml
route_exclusions:
  - pattern: "^/admin/"
    reason: "Admin routes (Next.js /api/ prefix not detected by validator)"
    enabled: true
```

**Pros:** Quick fix, unblocks S6  
**Cons:** Hides the issue, won't catch actual dead admin routes  

### Option 3: Document as Known Limitation
Add to validator docs:
- Known issue with Next.js `/api/` prefix
- Manual verification required for admin routes

**Pros:** Acknowledges issue  
**Cons:** Doesn't solve the problem  

---

## Recommendation

For **Sprint S6 (immediate):**
- Use Option 2 (whitelist) to unblock error reduction goal
- Document this as a known limitation

For **Future (Phase 3/4):**
- Implement Option 1 (validator enhancement)
- Add Next.js routing awareness to API Tracer
- Remove whitelist once validator is fixed

---

## Related Files

- Frontend example: `apps/web/app/admin/org/ai/page.tsx`
- Next.js router: `apps/web/app/api/[[...path]]/route.ts`
- Validator config: `validation/api-tracer/config.yaml`
- Analysis script: `scripts/analyze_orphans.py`