# Frontend Standards Consolidation Plan

**Status:** ✅ COMPLETE  
**Created:** February 6, 2026  
**Completed:** February 6, 2026 (Session 19)  
**Context:** Session 19 - Standards Consolidation
**Related:** `memory-bank/context-error-remediation.md`, ADR-019  

---

## Executive Summary

Consolidate 5 fragmented frontend standards into 3 comprehensive, authoritative documents that eliminate ambiguity around admin page architecture and multi-tenant context requirements.

**Goal:** Create BRIGHT LINE standards that make it impossible to miss required context for API calls.

---

## Current State Analysis

### Existing Frontend Standards (5 total)

| Standard | Created | Purpose | Status |
|----------|---------|---------|--------|
| `01_std_front_ADMIN-CARD-PATTERN.md` | Dec 24, 2025 | Platform Admin dashboard cards | ✅ Keep (merge into ARCH) |
| `01_std_front_ADMIN-COMPONENTS.md` | Feb 5, 2026 | Admin page component pattern | ✅ Keep (merge into ARCH) |
| `01_std_front_ORG-ADMIN-PAGE-AUTH.md` | Jan 23, 2026 | Org admin auth (hooks pattern) | ⚠️ **DEPRECATE** (conflicts with component pattern) |
| `01_std_front_AUTH.md` | Nov 9, 2025 | General auth patterns, API clients | ✅ Expand (add bright line table) |
| `01_std_front_CORA-UI-LIBRARY.md` | Jan 17, 2026 | UI library (MUI only), styling | ✅ Rename to UI-LIBRARY |

### Admin Page Compliance (16 pages)

| Pattern | Count | Percentage |
|---------|-------|------------|
| **Component Pattern (NEW - Correct)** | 3 | 19% |
| **Hooks Pattern (OLD - Various Flavors)** | 13 | 81% |

**Compliant Pages:** org/access, org/ai, sys/mgmt  
**Non-Compliant:** All others (need migration)

### Standards Conflicts

**CONFLICT:** `ADMIN-COMPONENTS` (Feb 2026) vs `ORG-ADMIN-PAGE-AUTH` (Jan 2026)

| Aspect | ADMIN-COMPONENTS (NEW) | ORG-ADMIN-PAGE-AUTH (OLD) |
|--------|------------------------|---------------------------|
| Page Pattern | Just render `<OrgModuleAdmin />` | Use hooks directly in page |
| Auth Handling | Component handles internally | Page handles with useUser, useRole |
| Compliance | 3 pages (19%) | 13 pages (81%) |

**These are mutually exclusive patterns - cannot follow both.**

---

## Target State: 3 Comprehensive Standards

| Standard | Covers | References |
|----------|--------|------------|
| **`01_std_front_AUTH.md`** | All auth patterns, BRIGHT LINE context table, Layer 1 + Layer 2 | ADR-019, 019a, 019b, 019c |
| **`01_std_front_ADMIN-ARCH.md`** | Admin page structure (component delegation, cards) | ADR-015, ADR-016 |
| **`01_std_front_UI-LIBRARY.md`** | MUI, styling, components | — |

---

## Implementation Tasks

### Phase 1: Expand AUTH Standard (CRITICAL)

**File:** `docs/standards/01_std_front_AUTH.md`

**Add Section:** Multi-Tenant Context Requirements (MANDATORY)

**BRIGHT LINE Table:**

```markdown
## Multi-Tenant Context Requirements (MANDATORY)

**CRITICAL: Every API call MUST pass the required context for multi-tenant verification.**

| Route Pattern | Frontend MUST Pass | Backend Verifies | Reference |
|---------------|-------------------|------------------|-----------|
| `/admin/sys/*` | — (nothing) | `is_sys_admin` | ADR-019a/b |
| `/admin/org/*` | `orgId` (X-Org-Id header) | `is_org_admin` + `is_org_member` | ADR-019a/b |
| `/admin/ws/*` | `orgId` + `wsId` (headers) | `is_ws_admin` + `is_ws_member` | ADR-019a/b |
| `/{module}/{resourceId}` | `orgId` (header) + `resourceId` (URL) | `is_org_member` + `is_resource_owner` | ADR-019c |

### Failure Modes

**Missing orgId for org-scoped routes:**
- Backend: 400 Bad Request "Organization ID required"
- Frontend: MUST NOT call API without orgId

**Missing resourceId for resource routes:**
- Backend: 400 Bad Request "Resource ID required"
- Frontend: MUST include resourceId in URL path
```

**Add Section:** Resource Permissions (Backend-Enforced)

**Add Section:** References to ADR-019a/b/c

---

### Phase 2: Create ADMIN-ARCH Standard

**File:** `docs/standards/01_std_front_ADMIN-ARCH.md`

**Merge Content From:**
- `01_std_front_ADMIN-COMPONENTS.md` (component delegation pattern)
- `01_std_front_ADMIN-CARD-PATTERN.md` (dashboard cards)

**Sections:**
1. Admin Page Architecture (Component Delegation)
2. Admin Card Pattern (Dashboard Integration)
3. Auth Scope Requirements (sys/org/ws)

---

### Phase 3: Deprecate OLD Standard

**File:** `docs/standards/01_std_front_ORG-ADMIN-PAGE-AUTH.md`

**Add Deprecation Notice:**
```markdown
> ⚠️ **DEPRECATED** (February 2026)
> 
> This standard has been superseded by:
> - `01_std_front_ADMIN-ARCH.md` (admin page structure)
> - `01_std_front_AUTH.md` (auth patterns with bright line table)
>
> Admin pages should NOT use hooks directly - instead, render module components
> that handle auth internally.
```

---

### Phase 4: Rename UI-LIBRARY Standard

**Old:** `docs/standards/01_std_front_CORA-UI-LIBRARY.md`  
**New:** `docs/standards/01_std_front_UI-LIBRARY.md`

**Update:**
- File header to reflect new name
- Internal references

---

### Phase 5: Migrate 13 Admin Pages

**Pages to Update:**

**Org Admin (6 pages):**
- org/chat → Use `<OrgChatAdmin />`
- org/eval → Use `<OrgEvalAdmin />`
- org/kb → Use `<OrgKbAdmin />`
- org/mgmt → Use `<OrgMgmtAdmin />`
- org/voice → Use `<OrgVoiceAdmin />`
- org/ws → Use `<OrgWsAdmin />`

**Sys Admin (7 pages):**
- sys/access → Use `<SysAccessAdmin />`
- sys/ai → Use `<SysAiAdmin />`
- sys/chat → Use `<SysChatAdmin />`
- sys/eval → Use `<SysEvalAdmin />`
- sys/kb → Use `<SysKbAdmin />`
- sys/voice → Use `<SysVoiceAdmin />`
- sys/ws → Use `<SysWsAdmin />`

**Migration Pattern:**
```typescript
// BEFORE (hooks pattern)
'use client';
import { useUser, useRole } from '@{{PROJECT_NAME}}/module-access';

export default function OrgModuleAdminPage() {
  const { profile, loading } = useUser();
  const { isOrgAdmin } = useRole();
  
  if (loading) return <Loading />;
  if (!isOrgAdmin) return <AccessDenied />;
  
  return <OrgModuleAdmin />;
}

// AFTER (component pattern)
'use client';
import { OrgModuleAdmin } from '@{{PROJECT_NAME}}/module-{module}';

export default function OrgModuleAdminPage() {
  return <OrgModuleAdmin />;
}
```

---

### Phase 6: Update Module Components

**Components Requiring Updates (5-6 total):**

| Component | Current Props | Should Use Instead |
|-----------|--------------|-------------------|
| `OrgChatAdmin` | `authAdapter`, `orgId`, `orgName` | `useUser()`, `useOrganizationContext()` |
| `SysChatAdmin` | `token` | `useUser().authAdapter.getToken()` |
| `OrgAdminKBPage` | ~20 data props | Internal hooks (`useOrgKbs`, etc.) |
| `PlatformAdminKBPage` | ~18 data props | Internal hooks (`useSysKbs`, etc.) |
| `AccessControlAdmin` | `authAdapter` | `useUser()` |
| `AIEnablementAdmin` | `authAdapter` | `useUser()` |

**Update Pattern:**
```typescript
// BEFORE: Expects props from page
export function OrgModuleAdmin({ orgId, orgName, authAdapter }) {
  // ...
}

// AFTER: Gets context internally
export function OrgModuleAdmin() {
  const { profile } = useUser();
  const { isOrgAdmin } = useRole();
  const { currentOrganization: organization } = useOrganizationContext();
  
  // Component handles auth internally
  if (!isOrgAdmin) return <AccessDenied />;
  if (!organization) return <SelectOrganization />;
  
  // ...
}
```

---

## Success Criteria

- [ ] BRIGHT LINE table added to AUTH standard
- [ ] ADMIN-ARCH standard created (merged content)
- [ ] ORG-ADMIN-PAGE-AUTH marked deprecated
- [ ] UI-LIBRARY renamed
- [ ] 13 admin pages migrated to component pattern
- [ ] 5-6 module components updated to internalize context
- [ ] All pages follow industry best practices (Smart Components, Dumb Pages)

---

## Validation

After consolidation:

```bash
# Validate admin page patterns
python3 validation/api-tracer/cli.py validate --path <stack-path> --admin-pages

# Expected: 0 errors (all pages use component pattern)
```

---

## Timeline

| Phase | Task | Estimated Time |
|-------|------|---------------|
| 1 | Expand AUTH standard | 30 min |
| 2 | Create ADMIN-ARCH standard | 30 min |
| 3 | Deprecate OLD standard | 5 min |
| 4 | Rename UI-LIBRARY | 5 min |
| 5 | Migrate 13 admin pages | 30-60 min |
| 6 | Update 5-6 module components | 2-4 hours |
| **Total** | | **4-6 hours** |

---

## Related Documents

- [ADR-019: Auth Standardization](../arch%20decisions/ADR-019-AUTH-STANDARDIZATION.md)
- [ADR-019a: Frontend Auth](../arch%20decisions/ADR-019a-AUTH-FRONTEND.md)
- [ADR-019b: Backend Auth](../arch%20decisions/ADR-019b-AUTH-BACKEND.md)
- [ADR-019c: Resource Permissions](../arch%20decisions/ADR-019c-AUTH-RESOURCE-PERMISSIONS.md)
- [Context: Error Remediation](../../memory-bank/context-error-remediation.md)

---

**Created By:** Session 19 - Frontend Standards Consolidation  
**Status:** Ready for Implementation