# ADR-019: CORA Authorization Standardization

**Status:** Approved  
**Date:** January 30, 2026 (Updated: January 31, 2026)  
**Decision Makers:** Product Team  
**Impact:** Full-stack authorization across all CORA modules

---

## Overview

This ADR documents the **decision rationale and justification** for CORA authorization standardization. It defines the complete auth lifecycle from frontend to database, covering **two authorization layers**: admin authorization and resource permissions.

### Two-Layer Architecture

CORA authorization operates at two distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│                   CORA Authorization Layers                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Admin Authorization (ADR-019a/b)                  │
│  ├─ Routes: /admin/sys/*, /admin/org/*, /admin/ws/*        │
│  ├─ Purpose: Module configuration and management            │
│  ├─ Functions: check_sys_admin, check_org_admin, etc.      │
│  └─ Roles: sys_admin, org_admin, ws_admin                  │
│                                                              │
│  Layer 2: Resource Permissions (ADR-019c)                   │
│  ├─ Routes: /{module}/*                                     │
│  ├─ Purpose: User data access and operations                │
│  ├─ Functions: can_*, is_*_owner, is_*_member              │
│  └─ Patterns: Ownership, membership, sharing               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Layer 1 (Admin Authorization):**
- Controls access to **administrative features** (module configuration, system settings)
- Routes: `/admin/sys/*`, `/admin/org/*`, `/admin/ws/*`
- Based on admin roles: sys_admin, org_admin, ws_admin
- Documented in: ADR-019a (frontend), ADR-019b (backend)

**Layer 2 (Resource Permissions):**
- Controls access to **user data and resources** (chats, documents, evaluations)
- Routes: `/{module}/*` (e.g., `/chat/sessions`, `/eval/results`)
- Based on ownership, membership, and sharing
- Documented in: ADR-019c
- **Important:** Admin roles do NOT automatically grant access to user resources

### Documentation Structure

| Type | Purpose | Documents |
|------|---------|--------------|
| **ADR** (this doc) | Decision analysis, justification (WHY) | ADR-019, ADR-019a, ADR-019b, ADR-019c |
| **Standards** | Active compliance rules (WHAT) | `03_std_back_AUTH.md`, `03_std_back_RESOURCE-PERMISSIONS.md` |

**Decision Rationale (ADRs):**
- [ADR-019a: Frontend Authorization](./ADR-019a-AUTH-FRONTEND.md) - React hooks, context, loading states (Layer 1)
- [ADR-019b: Backend Authorization](./ADR-019b-AUTH-BACKEND.md) - Lambda patterns, RPC functions, database (Layer 1)
- [ADR-019c: Resource Permissions](./ADR-019c-AUTH-RESOURCE-PERMISSIONS.md) - Ownership, membership, sharing (Layer 2)

**Implementation Standards (for validation compliance):**
- [Backend Auth Standard](../standards/03_std_back_AUTH.md) - Lambda authorization patterns (Layer 1)
- [Backend Resource Permissions](../standards/03_std_back_RESOURCE-PERMISSIONS.md) - Resource permission patterns (Layer 2)
- [Frontend Org Admin Auth](../standards/01_std_front_ORG-ADMIN-PAGE-AUTH.md) - Org admin page patterns

---

## The Problem

CORA previously lacked consistent authorization patterns at both layers, causing:
- **2-8 hours wasted debugging auth issues per module**
- Inconsistent implementations across frontend and backend
- Developer confusion about which pattern to use (admin vs resource permissions)
- 17x duplicate auth checks in some modules (module-chat)
- Security gaps from mismatched frontend/backend validation
- No standardized pattern for resource ownership and sharing
- Confusion about when admin roles should grant access vs. explicit permissions

---

## The Solution: Two-Layer Auth Architecture

CORA authorization uses two distinct layers, each with consistent patterns from frontend to database:

### Layer 1: Admin Authorization (ADR-019a/b)

For administrative features and module configuration:

```mermaid
flowchart TB
    subgraph Frontend["Frontend (Next.js)"]
        direction TB
        F1[useUser hook] --> F2{Route Type?}
        F2 -->|/admin/sys/*| F3a[useRole - check sysRole]
        F2 -->|/admin/org/*| F3b[useRole + useOrganizationContext]
        F2 -->|/admin/ws/*| F3c[useWorkspace context]
        F3a --> F4[Loading state check]
        F3b --> F4
        F3c --> F4
        F4 --> F5[API call with context IDs]
    end
    
    subgraph Gateway["API Gateway"]
        G1[Route Classification]
        G1 -->|/admin/sys/*| G2a[Lambda Authorizer]
        G1 -->|/admin/org/*| G2b[Lambda Authorizer + orgId param]
        G1 -->|/admin/ws/*| G2c[Lambda Authorizer + wsId param]
    end
    
    subgraph Lambda["Lambda (Centralized Router Auth)"]
        direction TB
        L1[get_user_from_event] --> L2[get_supabase_user_id]
        L2 --> L3{Route Prefix?}
        L3 -->|/admin/sys/*| L4a[check_sys_admin]
        L3 -->|/admin/org/*| L4b["get_org_context_from_event<br/>check_org_admin"]
        L3 -->|/admin/ws/*| L4c["get_ws_context_from_event<br/>check_ws_admin"]
        L4a --> L5[403 or Execute Handler]
        L4b --> L5
        L4c --> L5
    end
    
    subgraph Database["Database (Supabase RPC)"]
        D1["user_auth_ext_ids<br/>external_uid → user_id"]
        D2a["is_sys_admin<br/>user_profiles.sys_role"]
        D2b["is_org_admin<br/>org_members.org_role"]
        D2c["is_ws_admin<br/>ws_members.ws_role"]
    end
    
    F5 --> G1
    G2a --> L1
    G2b --> L1
    G2c --> L1
    L2 --> D1
    L4a --> D2a
    L4b --> D2b
    L4c --> D2c
```

---

### Layer 2: Resource Permissions (ADR-019c)

For user data access and resource operations:

```
User → API → Lambda → Database RPC
         │      │         │
         │      │         └─ is_*_owner(user_id, resource_id)
         │      │         └─ is_org_member(user_id, org_id)  
         │      │         └─ can_access_*(user_id, resource_id)
         │      │
         │      └─ Membership check THEN permission check
         │      └─ NO admin role override (explicit grants only)
         │
         └─ Resource filtered by backend (no frontend auth)
```

**Key Differences from Layer 1:**
- Routes: `/{module}/*` (not `/admin/*`)
- Purpose: Data access (not configuration)
- Based on: Ownership + membership + sharing (not admin roles)
- Admin override: **NO** automatic access (must be explicitly granted)

---

## Authorization Matrix (Layer 1)

This table defines the **single source of truth** for Layer 1 admin authorization patterns:

| Route Pattern | Frontend Hook | Lambda Helper | RPC Function | Database Table |
|--------------|---------------|---------------|--------------|----------------|
| `/admin/sys/*` | `useRole()` → check `sysRole` | `check_sys_admin(user_id)` | `is_sys_admin(p_user_id)` | `user_profiles.sys_role` |
| `/admin/org/*` | `useRole()` + `useOrganizationContext()` | `check_org_admin(user_id, org_id)` | `is_org_admin(p_user_id, p_org_id)` | `org_members.org_role` |
| `/admin/ws/*` | `useWorkspace()` | `check_ws_admin(user_id, ws_id)` | `is_ws_admin(p_user_id, p_ws_id)` | `ws_members.ws_role` |

---

## Role Definitions

### System Level (Platform-Wide)

| Role | Column | Description |
|------|--------|-------------|
| `sys_owner` | `user_profiles.sys_role` | Platform owner - full system access |
| `sys_admin` | `user_profiles.sys_role` | System administrator - cross-org management |

**Constants:**
```python
SYS_ADMIN_ROLES = ['sys_owner', 'sys_admin']
```

### Organization Level (Per-Org Membership)

| Role | Column | Description |
|------|--------|-------------|
| `org_owner` | `org_members.org_role` | Organization owner - full org access |
| `org_admin` | `org_members.org_role` | Organization admin - org management |

**Constants:**
```python
ORG_ADMIN_ROLES = ['org_owner', 'org_admin']
```

### Workspace Level (Per-Workspace Membership)

| Role | Column | Description |
|------|--------|-------------|
| `ws_owner` | `ws_members.ws_role` | Workspace owner - full workspace access |
| `ws_admin` | `ws_members.ws_role` | Workspace admin - workspace management |
| `ws_user` | `ws_members.ws_role` | Workspace user - standard access |

**Constants:**
```python
WS_ADMIN_ROLES = ['ws_owner', 'ws_admin']
```

---

## Key Principles

### 1. Two-Tier Identity Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   CORA Identity Architecture                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tier 1: External Identity (Okta/Amazon Cognito)                     │
│  ├─ JWT Token contains: external_uid (e.g., Okta user ID)   │
│  ├─ Available in: user_info from get_user_from_event()      │
│  └─ Does NOT contain: roles, permissions, profile data      │
│                                                              │
│  Tier 2: Internal Identity (Supabase)                       │
│  ├─ Database stores: user_id (Supabase auth.users ID)       │
│  ├─ Role tables: user_profiles, org_members, ws_members     │
│  └─ Must query database to get authorization data           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Critical:** JWT tokens do NOT contain role information. Roles are always in the database.

### 2. Context Extraction (org_id, ws_id)

Users can belong to multiple organizations and workspaces with different roles. The frontend provides context:

- **Frontend** selects org/workspace and passes ID in request
- **Lambda** extracts context using helper functions
- **Database** validates membership and role

### 3. Centralized Router Auth Pattern

Admin Lambdas use centralized authorization at the router level:

```python
def lambda_handler(event, context):
    # Single auth check at router
    if path.startswith('/admin/sys/'):
        if not common.check_sys_admin(user_id):
            return common.forbidden_response('System admin required')
    
    elif path.startswith('/admin/org/'):
        org_id = common.get_org_context_from_event(event)
        if not common.check_org_admin(user_id, org_id):
            return common.forbidden_response('Org admin required')
    
    # Handlers contain business logic only - no auth checks
    return handle_route(...)
```

### 4. Unified Auth Functions

The **same RPC functions** are used in:
- Lambda authorization checks
- Row Level Security (RLS) policies
- Database triggers

This guarantees consistency across all access paths.

---

## Implementation Details

### Frontend Implementation

See: [ADR-019a: Frontend Authorization](./ADR-019a-AUTH-FRONTEND.md)

**Covers:**
- useUser() hook requirements
- useRole() hook for admin pages
- useOrganizationContext() for org routes
- Loading state patterns
- API client configuration

### Backend Implementation

See: [ADR-019b: Backend Authorization](./ADR-019b-AUTH-BACKEND.md)

**Covers:**
- Lambda centralized router pattern
- org-common helper functions
- External UID → Supabase UUID mapping
- Database RPC functions
- RLS policy patterns

---

## Validation

Authorization patterns are validated by the comprehensive api-tracer validator:

```bash
# Run full auth lifecycle validation
python validation/api-tracer/tracer.py --auth-check
```

**Checks:**
- Frontend: Hook usage, context extraction, loading states
- Lambda: Helper function usage, centralized router pattern
- Database: RPC function existence, parameter order

---

## Migration Notes

### Breaking Changes from Pre-ADR-019

1. **RPC function renames:**
   - `is_ws_admin_or_owner()` → `is_ws_admin()`
   
2. **Parameter order standardized:**
   - All functions: `(p_user_id UUID, p_context_id UUID?)`
   
3. **JWT-claims-based functions removed:**
   - Old `is_sys_admin()` (no parameters) removed
   - Old `is_org_admin()` (no parameters) removed

---

## References

### Decision Documents (ADRs)
- [ADR-019a: Frontend Authorization](./ADR-019a-AUTH-FRONTEND.md) - Layer 1 frontend patterns
- [ADR-019b: Backend Authorization](./ADR-019b-AUTH-BACKEND.md) - Layer 1 backend patterns
- [ADR-019c: Resource Permissions](./ADR-019c-AUTH-RESOURCE-PERMISSIONS.md) - Layer 2 resource permissions
- [ADR-019 Appendix A: Options Comparison](./ADR-019-AUTH-STANDARDIZATION-APPENDIX-A-COMPARISON.md)

### Related Standards
- [ADR-020: RPC Function Standards](./ADR-020-RPC-PARAMETER-NAMING.md) - Parameter naming, function naming, schema organization, Python helper deployment

### Implementation Standards (Active Compliance Rules)
- [Backend Auth Standard](../standards/03_std_back_AUTH.md) - Lambda authorization patterns (Layer 1)
- [Backend Resource Permissions](../standards/03_std_back_RESOURCE-PERMISSIONS.md) - Resource permission patterns (Layer 2)
- [Frontend Org Admin Auth](../standards/01_std_front_ORG-ADMIN-PAGE-AUTH.md) - Org admin page patterns

### Related Plans
- [Sprint Plan: S2 Auth Standardization](../plans/plan_s2-auth-standardization.md) - Layer 1 implementation
- [Sprint Plan: S3 Auth Standardization](../plans/plan_s3-auth-standardization.md) - Layer 2 implementation

---

## Validation

Authorization patterns at both layers are validated by the api-tracer validator:

```bash
# Validate both layers
python3 validation/api-tracer/cli.py validate --path <stack-path> --all-auth

# Validate only Layer 1 (admin auth)
python3 validation/api-tracer/cli.py validate --path <stack-path> --layer1-only

# Validate only Layer 2 (resource permissions)
python3 validation/api-tracer/cli.py validate --path <stack-path> --layer2-only
```

**Validation Output:**
```
Auth Validation (ADR-019):
  Layer 1 (Admin Auth): 0 errors, 0 warnings
  Layer 2 (Resource Permissions): 0 errors, 0 warnings
```

---

**Status:** ✅ Approved  
**Layers:** Layer 1 (S2 Complete) | Layer 2 (S3 In Progress)  
**Tracking:** Sprint S3 of Auth Standardization Initiative  
**Next Step:** Complete Layer 2 resource permission implementation across all modules
