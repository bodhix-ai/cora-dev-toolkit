# ADR-018: API Route Structure

**Status:** ✅ Accepted  
**Date:** January 25, 2026  
**Deciders:** Aaron (Product Owner)  
**Related:** ADR-015 (Admin Page Auth Pattern), ADR-016 (Org Admin Authorization)

---

## Context

CORA has inconsistent API route patterns across modules, with legacy remnants like:
- `/platform/modules` (legacy prefix)
- `/api/sys/modules` (incorrect admin pattern)
- `/api/voice` (user route with incorrect prefix)

This inconsistency creates confusion and violates the principle of predictable, self-documenting APIs.

**Problem Statement:**
- Module routes don't indicate which module owns them
- Admin routes don't distinguish between sys/org scope
- User routes have unnecessary `/api/` prefix
- No clear standard for route organization

---

## Decision

We adopt a **three-tier route structure** that clearly indicates scope, module ownership, and resource:

### Route Patterns

#### 1. Admin Routes (Module Administration)
```
/admin/{scope}/{module}/{resource}
```

**Components:**
- `{scope}`: `sys` (system admin) or `org` (org admin)
- `{module}`: Module short name without "module-" prefix (e.g., `mgmt`, `kb`, `eval`)
- `{resource}`: The tab name or resource being managed (e.g., `modules`, `lambda-config`, `criteria-sets`)

**Examples:**
```
/admin/sys/mgmt/modules           # System admin - Modules tab
/admin/sys/mgmt/lambda-config     # System admin - Lambda tab
/admin/org/kb/documents           # Org admin - KB documents
/admin/org/eval/criteria-sets     # Org admin - Eval criteria
/admin/org/voice/configs          # Org admin - Voice configs
/admin/org/ws/workspaces          # Org admin - Workspace management
```

**Pattern Rule:** There is generally a correlation between the admin UI tab name and the `{resource}` segment.

#### 2. User Routes (Regular User Operations)
```
/{resource}
```

**No prefix** - user routes are top-level resources.

**Examples:**
```
/chats           # User chat operations
/kb              # User KB operations (document uploads, queries)
/eval            # User evaluation operations
/ws              # User workspace operations
/voice           # User voice operations
```

**Anti-pattern:** Do NOT use `/api/{resource}` for user routes. The `/api/` prefix is NOT part of the standard.

---

## Route Table by Module

| Module | Scope | Admin Route Pattern | User Route Pattern |
|--------|-------|--------------------|--------------------|
| **module-mgmt** | sys | `/admin/sys/mgmt/modules`, `/admin/sys/mgmt/lambda-config` | N/A (admin-only) |
| **module-kb** | org | `/admin/org/kb/documents`, `/admin/org/kb/configs` | `/kb`, `/kb/query` |
| **module-eval** | org | `/admin/org/eval/criteria-sets`, `/admin/org/eval/doc-types` | `/eval`, `/eval/results` |
| **module-voice** | org | `/admin/org/voice/configs` | `/voice` |
| **module-chat** | org | `/admin/org/chat/...` | `/chats` |
| **module-ws** | org | `/admin/org/ws/workspaces` | `/ws`, `/ws/config` |
| **module-ai** | org | `/admin/org/ai/providers` | `/ai` (if user-facing) |
| **module-access** | org | `/admin/org/access/...` | N/A (admin-only) |

---

## Benefits

### 1. **Self-Documenting**
Routes clearly indicate:
- **Admin vs User:** `/admin/` prefix vs no prefix
- **Scope:** `sys` (platform-wide) vs `org` (organization-specific)
- **Module Owner:** Which module handles the route
- **Resource:** What entity is being managed

### 2. **Consistent with UI Structure**
- Admin UI tabs map directly to `{resource}` segments
- Example: "Modules" tab → `/admin/sys/mgmt/modules`

### 3. **Clear Authorization Model**
- `/admin/sys/` → sys_admin role required
- `/admin/org/` → org_admin role required
- `/{resource}` → user role required

### 4. **Module Isolation**
- Each module owns its routes: `/admin/org/{module}/...`
- No route collisions between modules

### 5. **Predictable API Discovery**
- Developers can infer route structure from module name
- API documentation follows consistent patterns

---

## Implementation

### Lambda Handler Pattern

```python
def lambda_handler(event: Dict[str, Any], context: object) -> Dict[str, Any]:
    """
    Routes - Module Name:
    - GET /admin/{scope}/{module}/{resource} - Description
    - POST /admin/{scope}/{module}/{resource} - Description
    """
    
    path = event.get('path', '')
    http_method = event.get('httpMethod', '')
    
    # Route dispatcher
    if path.endswith('/admin/sys/mgmt/modules') and http_method == 'GET':
        return handle_list_modules()
    
    elif '/admin/sys/mgmt/modules/' in path and http_method == 'PUT':
        module_name = path_parameters.get('name')
        return handle_update_module(module_name, body, user_id)
```

### Frontend Hook Pattern

```typescript
const API_BASE = "/admin/sys/mgmt/modules";

export function useModuleRegistry() {
  const updateModule = async (name: string, updates: Partial<ModuleUpdate>) => {
    const response = await fetch(`/admin/sys/mgmt/modules/${name}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    // ...
  };
}
```

---

## Migration Plan

### Phase 1: Core Module Routes (Immediate)
- [x] module-mgmt: `/platform/modules` → `/admin/sys/mgmt/modules`
- [ ] Audit all core modules for `/platform/` remnants

### Phase 2: Functional Module Routes
- [ ] module-voice: `/api/voice` → `/voice` (user), `/admin/org/voice/...` (admin)
- [ ] module-eval: Verify user routes have no `/api/` prefix
- [ ] module-kb: Verify user routes have no `/api/` prefix

### Phase 3: API Gateway Integration Updates
- [ ] Update API Gateway route mappings to match new patterns
- [ ] Update Lambda integration configs

### Phase 4: Documentation
- [x] Create ADR-018-API-ROUTE-STRUCTURE.md
- [ ] Update module development guides with route patterns
- [ ] Add route validator to CORA compliance checks

---

## Validation

### Route Compliance Checks

Create validator to ensure:
1. **No `/api/` prefix on user routes**
2. **Admin routes follow `/admin/{scope}/{module}/{resource}` pattern**
3. **Module short name matches directory structure**
4. **Routes documented in Lambda function docstrings**

Example violations:
```
❌ /api/voice                    # Should be /voice (user) or /admin/org/voice/... (admin)
❌ /platform/modules              # Legacy prefix, should be /admin/sys/mgmt/modules
❌ /admin/sys/modules             # Missing module segment, should be /admin/sys/mgmt/modules
❌ /api/sys/lambda-config         # Wrong prefix, should be /admin/sys/mgmt/lambda-config
```

---

## Consequences

### Positive
- Consistent, predictable API structure
- Clear authorization boundaries
- Easy to discover and document routes
- Module ownership is explicit
- Scales well with new modules

### Negative
- **Breaking change** - requires migration of existing routes
- Frontend code needs updates to use new routes
- API Gateway integration configs need updates
- Documentation needs comprehensive updates

### Neutral
- Route length increases slightly (adds module segment to admin routes)

---

## Open Questions

**Q: Should user routes include the module segment?**  
**A:** No. User routes are resource-oriented (`/chats`, `/kb`, `/eval`), not module-oriented. The module segment is only for admin routes to indicate which module handles administration.

**Q: What about routes that span multiple modules?**  
**A:** Use the "primary owner" module. For example, if eval uses KB functionality, eval endpoints live under `/eval` (user) or `/admin/org/eval/...` (admin).

**Q: How do we handle API versioning?**  
**A:** Not addressed in this ADR. Versioning will be handled via API Gateway or accept headers if needed in the future.

---

## Related Documentation

- **ADR-015:** Admin Page Auth Pattern
- **ADR-016:** Org Admin Page Authorization
- **standard_LAMBDA-ROUTE-DOCSTRING.md:** Lambda route documentation standard
- **guide_API-TRACING-VALIDATION.md:** API route validation guide

---

**Document Status:** ✅ Active  
**Last Updated:** January 25, 2026