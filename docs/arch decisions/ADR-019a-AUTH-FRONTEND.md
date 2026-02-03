# ADR-019a: Frontend Authorization Decision

**Status:** Approved  
**Date:** January 31, 2026  
**Parent ADR:** [ADR-019: CORA Authorization Standardization](./ADR-019-AUTH-STANDARDIZATION.md)

---

## Overview

This document captures the **decision rationale** for CORA frontend authorization patterns. For implementation details and code examples, see the active standard:

**👉 Implementation Standard:** [01_std_front_ORG-ADMIN-PAGE-AUTH.md](../standards/01_std_front_ORG-ADMIN-PAGE-AUTH.md)

---

## Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth Hooks | `useUser()`, `useRole()` | Consistent auth state management |
| Org Context | `useOrganizationContext()` | Multi-org support, user may have different roles per org |
| Loading State | Check before role check | Prevent flash of unauthorized content |
| Role Constants | Centralized TypeScript constants | Consistent, type-safe role checks |
| API Context | Pass orgId/wsId in request | Backend needs context for authorization |

---

## Key Decisions

### 1. Hook-Based Authorization

**Decision:** Use React hooks (`useUser`, `useRole`, `useOrganizationContext`) for all auth state.

**Why:**
- Consistent loading state handling across all pages
- Automatic re-rendering when auth state changes
- Centralized auth logic in reusable hooks
- Type-safe with TypeScript

**Alternative Considered:** Higher-order components (HOCs)
- Rejected: Hooks are more composable, better TypeScript support

### 2. Separate useRole() Hook

**Decision:** Create dedicated `useRole()` hook instead of extending `useUser()`.

**Why:**
- `useUser()` handles authentication (who you are)
- `useRole()` handles authorization (what you can do)
- Separation of concerns
- Role information may require additional queries

**What useRole() provides:**
- `isSysAdmin`: true if user has sys_owner or sys_admin role
- `isOrgAdmin`: true if user has org_owner or org_admin role in current org
- `hasPermission(role)`: Check specific role

### 3. Organization Context for Multi-Org Users

**Decision:** Use `useOrganizationContext()` for org admin pages (`/admin/org/*`).

**Why:**
- Users can belong to multiple organizations
- User may have different roles in each org (admin in org A, user in org B)
- Frontend must know WHICH org the user is operating in
- Selected org context passed to API for backend authorization

**Pattern:**
```typescript
const { currentOrganization } = useOrganizationContext();
// Pass currentOrganization.orgId to API calls
```

### 4. Loading State First Pattern

**Decision:** Always check loading state BEFORE authorization.

**Why:**
- Prevents "flash of unauthorized content"
- During loading, role data may be undefined → incorrect denial
- Better UX with loading spinner

**Correct Order:**
1. Check `isLoading` → show spinner
2. Check `isAuthenticated` → redirect to login
3. Check role → show access denied
4. Render content

### 5. Pass Context in API Requests

**Decision:** Frontend MUST pass `orgId`/`wsId` to backend API calls.

**Why:**
- JWT token does NOT contain org/ws context
- User may have different roles in different orgs
- Backend uses context for authorization check
- Prevents "act as admin in wrong org" bugs

---

## Route Pattern Requirements

| Route Pattern | Required Hooks | Context to API |
|--------------|----------------|----------------|
| `/admin/sys/*` | `useUser()`, `useRole()` | None |
| `/admin/org/*` | `useUser()`, `useRole()`, `useOrganizationContext()` | `orgId` |
| `/admin/ws/*` | `useUser()`, `useWorkspace()` | `wsId` |

---

## Implementation Reference

For complete implementation details, code examples, and patterns:

| Topic | Standard Reference |
|-------|-------------------|
| Complete Page Template | [01_std_front_ORG-ADMIN-PAGE-AUTH.md](../standards/01_std_front_ORG-ADMIN-PAGE-AUTH.md) |
| Required Hooks | [01_std_front_ORG-ADMIN-PAGE-AUTH.md#required-elements](../standards/01_std_front_ORG-ADMIN-PAGE-AUTH.md) |
| Anti-Patterns | [01_std_front_ORG-ADMIN-PAGE-AUTH.md#anti-patterns-do-not-use](../standards/01_std_front_ORG-ADMIN-PAGE-AUTH.md) |
| Type Reference | [01_std_front_ORG-ADMIN-PAGE-AUTH.md#type-reference](../standards/01_std_front_ORG-ADMIN-PAGE-AUTH.md) |

---

## Validation

Frontend auth patterns are validated by the api-tracer validator as part of full-stack auth lifecycle validation.

```bash
# Run validation
python3 validation/cora-validate.py project <stack-path> --validators api-tracer
```

---

## Related Documents

- [ADR-019: CORA Authorization Standardization](./ADR-019-AUTH-STANDARDIZATION.md) - Parent ADR
- [ADR-019b: Backend Authorization Decision](./ADR-019b-AUTH-BACKEND.md) - Backend decisions
- [01_std_front_ORG-ADMIN-PAGE-AUTH.md](../standards/01_std_front_ORG-ADMIN-PAGE-AUTH.md) - **Implementation Standard**
- [ADR-015: Admin Page Auth Pattern](./ADR-015-ADMIN-PAGE-AUTH-PATTERN.md) - Original admin auth ADR
- [ADR-016: Org Admin Page Authorization](./ADR-016-ORG-ADMIN-PAGE-AUTHORIZATION.md) - Original org admin ADR

---

**Status:** ✅ Approved  
**Parent:** ADR-019  
**Tracking:** Sprint S2 of Auth Standardization Initiative