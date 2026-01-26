# ADR-018b: CORA API Gateway Route Standards

**Status:** DRAFT (Pending reconciliation with ADR-018a from Admin Standardization team)  
**Date:** 2026-01-25  
**Authors:** WS Plugin Architecture Team  
**Related:**
- `docs/standards/standard_API-PATTERNS.md` - Request/response patterns
- `docs/standards/standard_ADMIN-API-ROUTES.md` - Detailed route standard (this ADR's companion)
- `docs/standards/standard_MODULAR-ADMIN-ARCHITECTURE.md` - Frontend admin architecture

---

## Context

CORA applications use AWS API Gateway to route HTTP requests to Lambda functions. During the implementation of Sprint 3 (WS Plugin Architecture), we discovered significant inconsistency in API route patterns, particularly for admin routes.

### Current Problems

1. **No formal standard** for API Gateway admin routes
2. **Inconsistent patterns** across modules (some use `/admin/org/{module}`, others use `/api/{module}/admin`)
3. **Ambiguous org context** - unclear when org_id should be in path vs session vs query param
4. **Workspace routes** - no standard for workspace-scoped admin operations
5. **Validation gap** - no automated tool to check route compliance

### Existing Standards Gap

| Standard | What It Covers | Admin Routes? |
|----------|----------------|---------------|
| `standard_API-PATTERNS.md` | Request/response patterns, org_id | ❌ No |
| `standard_MODULAR-ADMIN-ARCHITECTURE.md` | Frontend Next.js admin pages | ❌ No |
| `standard_NEXTJS-ROUTING.md` | Frontend App Router | ❌ No |

**Gap:** No standard exists for API Gateway (backend) route patterns, especially admin routes.

---

## Decision

We will establish a **standardized route pattern** for all API Gateway routes in CORA applications, with clear rules for:
- Route structure and naming
- Scope levels (data, system admin, org admin, workspace admin)
- Context passing (path params vs session vs query params)

### Route Categories

CORA API routes fall into four categories:

| Category | Purpose | Org Context | Route Pattern |
|----------|---------|-------------|---------------|
| **Data API** | CRUD operations on resources | Query param (`?orgId=`) | `/{module}/{resource}` |
| **Sys Admin** | System-wide configuration | N/A (global) | `/admin/sys/{module}/{resource}` |
| **Org Admin** | Organization configuration | Session-based | `/admin/org/{module}/{resource}` |
| **WS Admin** | Workspace configuration | Path param (`{wsId}`) | `/admin/ws/{wsId}/{module}/{resource}` |

### Module Names (Canonical List)

Only these module shortnames are valid in routes:

| Module | Shortname | Type |
|--------|-----------|------|
| module-access | `access` | Core |
| module-ai | `ai` | Core |
| module-mgmt | `mgmt` | Core |
| module-ws | `ws` | Core |
| module-kb | `kb` | Core |
| module-chat | `chat` | Core |
| module-voice | `voice` | Functional |
| module-eval | `eval` | Functional |

### Standard Route Patterns

#### 1. Data API Routes

```
/{module}/{resource}
/{module}/{resource}/{id}
/{module}/{resource}/{id}/{sub-resource}
```

**Examples:**
```
GET    /ws?orgId=xxx           # List workspaces in org
POST   /ws                      # Create workspace (orgId in body)
GET    /ws/{wsId}?orgId=xxx    # Get workspace
PUT    /ws/{wsId}?orgId=xxx    # Update workspace
DELETE /ws/{wsId}?orgId=xxx    # Delete workspace
GET    /kb/documents?orgId=xxx # List KB documents
```

**Org Context:** Query parameter `orgId` (or request body for POST/PUT)

#### 2. System Admin Routes

```
/admin/sys/{module}/{resource}
/admin/sys/{module}/{resource}/{id}
```

**Examples:**
```
GET    /admin/sys/mgmt/modules        # List all registered modules
PUT    /admin/sys/mgmt/modules/{name} # Update module system config
GET    /admin/sys/access/orgs         # List all organizations
GET    /admin/sys/ai/providers        # List AI providers (system-wide)
```

**Org Context:** None (global scope)
**Required Role:** `sys_admin` or `sys_owner`

#### 3. Organization Admin Routes

```
/admin/org/{module}/{resource}
/admin/org/{module}/{resource}/{id}
```

**Examples:**
```
GET    /admin/org/mgmt/modules        # List modules for current org
PUT    /admin/org/mgmt/modules/{name} # Update module org config
GET    /admin/org/access/members      # List org members
POST   /admin/org/access/invitations  # Create invitation
GET    /admin/org/ai/usage            # Get AI usage for org
```

**Org Context:** Session-based (from authenticated user's current org context)
**Required Role:** `org_admin`, `org_owner`, `sys_admin`, or `sys_owner`

**Why session-based?** Users can belong to multiple organizations but operate in ONE org context at a time. The org context is established at login/org-switch and maintained in the session.

#### 4. Workspace Admin Routes

```
/admin/ws/{wsId}/{module}/{resource}
/admin/ws/{wsId}/{module}/{resource}/{id}
```

**Examples:**
```
GET    /admin/ws/{wsId}/mgmt/modules        # List modules for workspace
PUT    /admin/ws/{wsId}/mgmt/modules/{name} # Update module ws config
GET    /admin/ws/{wsId}/access/members      # List workspace members
GET    /admin/ws/{wsId}/kb/config           # Get KB config for workspace
```

**Org Context:** Derived from workspace (workspace belongs to an org)
**Workspace Context:** Path parameter `{wsId}`
**Required Role:** Workspace admin or higher

**Why path-based for wsId?** Users can access multiple workspaces within their current org context. The workspace must be explicit in the URL to specify which workspace is being configured.

### Context Passing Summary

| Scope | Org Context Source | Additional Context |
|-------|-------------------|-------------------|
| Data API | `?orgId=` (query param) or body | Resource IDs in path |
| Sys Admin | None (global) | None |
| Org Admin | Session (authenticated user's org) | None |
| WS Admin | Derived from workspace | `{wsId}` in path |

### Route Validation Rules

1. **Prefix Required:** Admin routes must start with `/admin/`; data routes start with `/{module}/`
2. **Scope Required:** Admin routes must include scope: `sys`, `org`, or `ws`
3. **Module Required:** Routes must include a valid module shortname
4. **Resource Required:** Routes must include a resource name
5. **Consistent Casing:** Use lowercase with hyphens (`kebab-case`)
6. **Path Parameters:** Use `{camelCase}` for path parameters (e.g., `{wsId}`, `{orgId}`)
7. **No Trailing Slashes:** Routes must not end with `/`

### Anti-Patterns (DO NOT USE)

```
❌ /admin/{module}/{resource}          # Missing scope (sys/org/ws)
❌ /api/{module}/{resource}            # Don't use /api prefix for data routes
❌ /admin/org/{orgId}/{module}/...     # Org ID should not be in path
❌ /admin/ws/{module}/{resource}       # Missing wsId for workspace scope
❌ /admin/organization/...             # Use 'org' not 'organization'
❌ /admin/sys/module-mgmt/...          # Use shortname 'mgmt' not 'module-mgmt'
```

---

## Consequences

### Benefits

1. **Consistency:** All CORA projects follow the same route patterns
2. **Discoverability:** Routes are self-documenting and predictable
3. **Security:** Clear context passing prevents authorization bypasses
4. **Maintainability:** Easier to validate, test, and refactor routes
5. **Documentation:** API documentation can be auto-generated from patterns

### Trade-offs

1. **Migration Effort:** Existing non-compliant routes need remediation
2. **Learning Curve:** Developers must learn the standard patterns
3. **Rigidity:** Less flexibility in route design (intentional)

### Implementation Requirements

1. **ADR Approval:** This ADR must be approved and reconciled with ADR-018a
2. **Standard Document:** Create `standard_ADMIN-API-ROUTES.md` with detailed examples
3. **Validation Tool:** Create `validation/admin-route-validator/` to check compliance
4. **Migration Plan:** Document path to remediate non-compliant routes
5. **Template Updates:** Update module templates with compliant route patterns

---

## Alternatives Considered

### Alternative 1: Org ID in Path for Org Admin Routes

```
/admin/org/{orgId}/{module}/{resource}
```

**Why Rejected:** 
- Users operate in one org context at a time (session-based)
- Adding orgId to path duplicates session context
- Inconsistent with how org context is managed in CORA (org selector changes session)
- Could lead to authorization confusion (path orgId vs session orgId mismatch)

### Alternative 2: Unified Admin Route Without Scope

```
/admin/{module}/{resource}
```

**Why Rejected:**
- No distinction between sys/org/ws scope
- Ambiguous authorization requirements
- Harder to implement scope-specific middleware

### Alternative 3: REST-Style Nesting

```
/orgs/{orgId}/workspaces/{wsId}/modules/{name}/config
```

**Why Rejected:**
- Deeply nested routes are harder to maintain
- Inconsistent with existing CORA patterns
- Requires passing all parent IDs even when not needed

---

## Implementation Plan

### Phase 1: Documentation (This Sprint)
- [x] Create ADR-018b (this document)
- [ ] Create `standard_ADMIN-API-ROUTES.md`
- [ ] Create validation script

### Phase 2: Validation (This Sprint)
- [ ] Audit current API Gateway routes
- [ ] Generate compliance report
- [ ] Identify remediation priorities

### Phase 3: Remediation (Future)
- [ ] Update non-compliant routes
- [ ] Update templates with compliant patterns
- [ ] Run full validation to confirm compliance

### Phase 4: Reconciliation
- [ ] Reconcile with ADR-018a from Admin Standardization team
- [ ] Merge into final ADR-018
- [ ] Archive ADR-018a and ADR-018b

---

## References

- `docs/standards/standard_API-PATTERNS.md` - Request/response patterns
- `docs/standards/standard_MODULAR-ADMIN-ARCHITECTURE.md` - Frontend admin architecture
- `docs/guides/guide_API-TRACING-VALIDATION.md` - API tracing tool
- `validation/api-tracer/` - Existing route validation tool

---

**Last Updated:** 2026-01-25  
**Status:** DRAFT - Pending reconciliation with ADR-018a