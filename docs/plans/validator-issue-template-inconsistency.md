# Template Inconsistency - Admin Pages API Call Pattern

**Date:** February 5, 2026  
**Issue:** Template admin pages use inconsistent API call patterns  
**Root Cause:** Mixed use of `apiClient` pattern vs raw `fetch()` calls  

---

## The Problem

**Template code is INCONSISTENT:**

### ✅ CORRECT Pattern (follows standards):
```typescript
// File: admin/org/kb/page.tsx
const authenticatedClient = createAuthenticatedClient(token);
const kbClient = createKbModuleClient(authenticatedClient);
// Uses kbClient methods (abstraction handles routing)
```

### ❌ WRONG Pattern (violates standards):
```typescript
// File: admin/org/ai/page.tsx
const response = await fetch('/api/admin/org/ai/config', {
  headers: { 'Content-Type': 'application/json' },
});
```

---

## Impact

1. **Standards Violation:** `/admin/org/ai/page.tsx` doesn't follow ADR-004 (NextAuth API Client Pattern)
2. **Validator Confusion:** Validator sees `/api/admin/org/ai/config` (frontend) vs `/admin/org/ai/config` (backend) as mismatch
3. **False Positives:** 103+ admin routes flagged as "orphaned" when they're actually called (just with `/api/` prefix)

---

## Files Using CORRECT Pattern

- `admin/org/kb/page.tsx` ✅
- `admin/org/access/page.tsx` ✅
- `admin/sys/mgmt/modules/page.tsx` ✅
- `admin/sys/kb/page.tsx` ✅

## Files Using WRONG Pattern

- `admin/org/ai/page.tsx` ❌ (uses raw fetch with `/api/` prefix)
- (Need to audit all other admin pages)

---

## Solution

### Immediate (Sprint S6):
1. **Fix template code** - Convert `/admin/org/ai/page.tsx` to use proper client pattern
2. **Audit all admin pages** - Identify other files using raw fetch
3. **Validator whitelist** - Temporarily whitelist `/admin/*` routes to unblock error count reduction

### Future (Phase 3/4):
1. **Validator enhancement** - Handle `/api/` prefix stripping for projects that don't use apiClient pattern
2. **Template validation** - Add linting rule to enforce apiClient pattern usage
3. **Remove whitelist** - Once all templates use proper pattern

---

## Why This Matters

**The standards (ADR-004, ADMIN-CARD-PATTERN) require:**
- Using `createAuthenticatedClient()` from module packages
- Module-specific clients (e.g., `createKbModuleClient`)
- NO raw `fetch()` calls in admin pages

**Benefits of correct pattern:**
- Authentication handled automatically
- API routes abstracted (no hardcoded paths)
- Type safety from module clients
- Consistent error handling

---

## Next Steps

1. ✅ Identify inconsistency
2. [ ] Fix `/admin/org/ai/page.tsx` to use proper client pattern
3. [ ] Audit remaining admin pages for raw fetch usage
4. [ ] Update validator to handle both patterns temporarily
5. [ ] Enforce client pattern in all templates

---

**Document Version:** 1.0  
**Status:** 🟡 IN PROGRESS  
**Related:** ADR-004, ADMIN-CARD-PATTERN, plan_validation-errors-s6.md