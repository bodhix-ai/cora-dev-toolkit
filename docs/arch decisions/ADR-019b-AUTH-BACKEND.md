# ADR-019b: Backend Authorization Decision

**Status:** Approved  
**Date:** January 31, 2026  
**Parent ADR:** [ADR-019: CORA Authorization Standardization](./ADR-019-AUTH-STANDARDIZATION.md)

---

## Overview

This document captures the **decision rationale** for CORA backend authorization patterns. For implementation details and code examples, see the active standard:

**👉 Implementation Standard:** [03_std_back_AUTH.md](../standards/03_std_back_AUTH.md)

---

## Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Identity Architecture | Two-Tier (External + Internal) | External IDP for auth, internal DB for authorization |
| Auth Check Location | Centralized Router | DRY principle, single point of enforcement |
| Role Storage | Database only | JWT tokens don't contain roles (IDP limitation) |
| Auth Functions | RPC functions | Reusable in Lambda + RLS policies |
| Context Extraction | Helper functions | Consistent org_id/ws_id extraction |

---

## Key Decisions

### 1. Two-Tier Identity Architecture

**Decision:** Use a two-tier identity system with external IDP for authentication and Supabase for authorization.

**Why:**
- External IDPs (Okta, Clerk) handle SSO, MFA, and identity federation
- BUT external IDPs don't store application-specific roles (sys_admin, org_admin, ws_admin)
- Supabase stores role information in `user_profiles`, `org_members`, `ws_members`
- Requires UID mapping: `external_uid` → `supabase_user_id` via `user_auth_ext_ids` table

**Alternative Considered:** Store roles in IDP custom claims
- Rejected: IDP-specific, requires IDP admin access to update roles, not queryable by RLS

### 2. Centralized Router Auth Pattern

**Decision:** All admin Lambdas use centralized authorization at the router level.

**Why:**
- Eliminates duplicated auth checks across 10-20 handlers per Lambda
- Impossible to forget auth check on new routes (single enforcement point)
- Single database query per request (not per handler)
- Easy to audit (all auth logic in one place)

**Problems Solved:**
- module-chat had 17x duplicate auth checks
- 2-8 hours wasted per module debugging inconsistent auth
- Missing auth checks on some routes

### 3. Database RPC Functions

**Decision:** Use parameterized RPC functions (`is_sys_admin`, `is_org_admin`, `is_ws_admin`) for all authorization checks.

**Why:**
- Same functions used in Lambda code AND RLS policies
- Guarantees consistency across all access paths
- SECURITY DEFINER ensures proper execution context
- Parameter order standardized: `(p_user_id, p_context_id)`

**Alternative Considered:** Direct SQL queries in Lambda
- Rejected: Would need duplicate logic in RLS policies

### 4. Context Extraction Helpers

**Decision:** Standardize org_id/ws_id extraction via `get_org_context_from_event()` and `get_ws_context_from_event()`.

**Why:**
- Users can belong to multiple orgs/workspaces with different roles
- Frontend provides context via query params, path params, or body
- Helper functions check all sources consistently
- Validation ensures context extraction before auth check

---

## Implementation Reference

For complete implementation details, code examples, and patterns:

| Topic | Standard Reference |
|-------|-------------------|
| Lambda Handler Template | [03_std_back_AUTH.md#lambda-handler-template](../standards/03_std_back_AUTH.md) |
| org-common Helper Functions | [03_std_back_AUTH.md#helper-functions](../standards/03_std_back_AUTH.md) |
| Database RPC Functions | [03_std_back_AUTH.md#database-rpc-functions](../standards/03_std_back_AUTH.md) |
| Centralized Router Pattern | [03_std_back_AUTH.md#centralized-router-auth-pattern](../standards/03_std_back_AUTH.md) |
| Anti-Patterns | [03_std_back_AUTH.md#common-mistakes-to-avoid](../standards/03_std_back_AUTH.md) |
| Validation Checklist | [03_std_back_AUTH.md#checklist-for-lambda-authorization](../standards/03_std_back_AUTH.md) |

---

## Validation

Backend auth patterns are validated by the api-tracer validator as part of full-stack auth lifecycle validation.

```bash
# Run validation
python3 validation/cora-validate.py project <stack-path> --validators api-tracer
```

---

## Related Documents

- [ADR-019: CORA Authorization Standardization](./ADR-019-AUTH-STANDARDIZATION.md) - Parent ADR
- [ADR-019a: Frontend Authorization Decision](./ADR-019a-AUTH-FRONTEND.md) - Frontend decisions
- [03_std_back_AUTH.md](../standards/03_std_back_AUTH.md) - **Implementation Standard**
- [ADR-019 Appendix A: Options Comparison](./ADR-019-AUTH-STANDARDIZATION-APPENDIX-A-COMPARISON.md) - Full options analysis

---

**Status:** ✅ Approved  
**Parent:** ADR-019  
**Tracking:** Sprint S2 of Auth Standardization Initiative