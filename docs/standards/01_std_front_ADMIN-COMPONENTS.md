# CORA Standard: Admin Page Component Pattern

**Version:** 1.0  
**Category:** Frontend (01)  
**Status:** ✅ APPROVED  
**Created:** February 5, 2026  
**Related ADRs:** ADR-004, ADR-015, ADR-016  
**Validators:** api-tracer (component metadata check)

---

## Purpose

Establish a single standardized pattern for all CORA admin pages to ensure:
- **Consistency** - Every admin page follows the same architecture
- **Scalability** - Admin UIs can grow complex without refactoring
- **Encapsulation** - Modules own their admin logic AND UI
- **Traceability** - Validators can verify all admin routes are used
- **Maintainability** - Admin UI fixes benefit all projects

---

## The Standard

### Rule 1: ALL Admin Pages Use Module Components

**Every admin page MUST import and render a module-provided admin component.**

```typescript
// ✅ CORRECT: Standard pattern for all admin pages
import { OrgModuleAdmin } from '@{{PROJECT_NAME}}/module-{name}';

export default function OrgModuleAdminPage() {
  return <OrgModuleAdmin />;
}
```

```typescript
// ❌ WRONG: Direct API calls in admin pages
import { useUser } from '@{{PROJECT_NAME}}/module-access';

export default function OrgModuleAdminPage() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/admin/org/module/data').then(...); // ❌ NO
  }, []);
  
  return <div>...</div>;
}
```

**No exceptions. Simple or complex, all admin pages use components.**

---

### Rule 2: Module Components MUST Document Their Routes

**Every module admin component MUST include a route manifest in its docstring.**

**Format:**
```typescript
/**
 * @component {ComponentName}
 * @routes
 * - {METHOD} {PATH}
 * - {METHOD} {PATH}
 */
```

**Example:**
```typescript
// module-chat/frontend/components/OrgChatAdmin.tsx

/**
 * Organization Chat Admin Component
 * Provides admin interface for managing chat configuration,
 * sessions, and analytics at the organization level.
 *
 * @component OrgChatAdmin
 * @routes
 * - GET /admin/org/chat/config
 * - PUT /admin/org/chat/config
 * - GET /admin/org/chat/sessions
 * - GET /admin/org/chat/sessions/{id}
 * - DELETE /admin/org/chat/sessions/{id}
 * - POST /admin/org/chat/sessions/{id}/restore
 * - GET /admin/org/chat/analytics
 * - GET /admin/org/chat/analytics/users
 * - GET /admin/org/chat/analytics/workspaces
 * - GET /admin/org/chat/messages/{id}
 */
export const OrgChatAdmin = () => {
  // Component implementation
  const config = useOrgChatConfig();
  const sessions = useOrgChatSessions();
  
  return (
    <div>
      {/* Admin UI */}
    </div>
  );
};
```

---

## Component Naming Convention

### Org-Level Admin Components

**Pattern:** `Org{Module}Admin`

**Examples:**
- `OrgChatAdmin` - Chat admin for organization scope
- `OrgKbAdmin` - KB admin for organization scope
- `OrgEvalAdmin` - Eval admin for organization scope

### Sys-Level Admin Components

**Pattern:** `Sys{Module}Admin`

**Examples:**
- `SysChatAdmin` - Chat admin for system scope
- `SysKbAdmin` - KB admin for system scope
- `SysAiAdmin` - AI admin for system scope

### Workspace-Level Admin Components (Rare)

**Pattern:** `Ws{Module}Admin`

**Example:**
- `WsMgmtAdmin` - Workspace management admin

---

## Module Requirements

### Each Module Must Provide:

1. **Org Admin Component** (if module has org-level admin)
   - Location: `packages/module-{name}/frontend/components/admin/OrgModuleAdmin.tsx`
   - Export: Named export from `frontend/index.ts`

2. **Sys Admin Component** (if module has sys-level admin)
   - Location: `packages/module-{name}/frontend/components/admin/SysModuleAdmin.tsx`
   - Export: Named export from `frontend/index.ts`

3. **Route Metadata** (both components)
   - Complete `@routes` docstring
   - One entry per route (METHOD + PATH)
   - Includes path parameters in `{param}` format

### Module Export Example:

```typescript
// packages/module-chat/frontend/index.ts

// ... other exports

// Admin components
export { OrgChatAdmin } from './components/admin/OrgChatAdmin';
export { SysChatAdmin } from './components/admin/SysChatAdmin';
```

---

## Admin Page Patterns

### Organization Admin Page

```typescript
// apps/web/app/admin/org/{module}/page.tsx
'use client';

import { Org{Module}Admin } from '@{{PROJECT_NAME}}/module-{module}';

export default function Organization{Module}AdminPage() {
  return <Org{Module}Admin />;
}
```

### System Admin Page

```typescript
// apps/web/app/admin/sys/{module}/page.tsx
'use client';

import { Sys{Module}Admin } from '@{{PROJECT_NAME}}/module-{module}';

export default function System{Module}AdminPage() {
  return <Sys{Module}Admin />;
}
```

---

## Validation Rules

### Validator Checks (api-tracer)

**Check 1: Admin Page Uses Component**
- ❌ ERROR: Admin page makes direct API calls
- ❌ ERROR: Admin page uses raw `fetch()`
- ✅ PASS: Admin page imports and renders module component

**Check 2: Component Has Route Metadata**
- ❌ ERROR: Module component missing `@routes` docstring
- ❌ WARNING: Module component has empty `@routes` section
- ✅ PASS: Module component documents all routes

**Check 3: Routes Match Implementation**
- ❌ WARNING: Documented route not found in API Gateway
- ❌ WARNING: API Gateway route not documented in component
- ✅ PASS: All routes documented and match backend

---

## Migration Guide

### For Existing Admin Pages Using Direct API Calls

**Before:**
```typescript
export default function OrgModuleAdminPage() {
  const [config, setConfig] = useState(null);
  
  useEffect(() => {
    fetch('/api/admin/org/module/config')
      .then(res => res.json())
      .then(data => setConfig(data.data));
  }, []);
  
  return <div>{/* Custom admin UI */}</div>;
}
```

**After:**
```typescript
// 1. Create module component
// packages/module-{name}/frontend/components/admin/OrgModuleAdmin.tsx
/**
 * @component OrgModuleAdmin
 * @routes
 * - GET /admin/org/{module}/config
 * - PUT /admin/org/{module}/config
 */
export const OrgModuleAdmin = () => {
  const [config, setConfig] = useState(null);
  
  useEffect(() => {
    // Component makes API calls internally
    fetch('/api/admin/org/module/config')
      .then(res => res.json())
      .then(data => setConfig(data.data));
  }, []);
  
  return <div>{/* Admin UI */}</div>;
};

// 2. Export from module
// packages/module-{name}/frontend/index.ts
export { OrgModuleAdmin } from './components/admin/OrgModuleAdmin';

// 3. Update page to use component
// apps/web/app/admin/org/{module}/page.tsx
export default function OrgModuleAdminPage() {
  return <OrgModuleAdmin />; // Now uses component
}
```

---

## Benefits

### For Developers

1. **Predictable Pattern** - Every admin page looks the same
2. **Less Boilerplate** - No repeated auth/loading/error logic
3. **Type Safety** - Module exports typed components
4. **Easy Maintenance** - Fix bug once, all projects benefit

### For Projects

1. **Consistency** - All admin UIs follow same patterns
2. **Faster Development** - Just import and render component
3. **Automatic Updates** - Module updates propagate to all projects
4. **Better Testing** - Test component once, not every page

### For Validation

1. **Traceability** - Validator reads component metadata
2. **Accurate Reports** - No false "orphaned route" errors
3. **Enforced Standards** - Validator checks component usage
4. **Better Documentation** - Routes documented in code

---

## Common Patterns

### Loading States

**Handled by component, not page:**
```typescript
// Component handles loading internally
export const OrgModuleAdmin = () => {
  const { data, loading, error } = useModuleData();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <AdminUI data={data} />;
};
```

### Auth Checks

**Handled by component, not page:**
```typescript
// Component checks auth internally
export const OrgModuleAdmin = () => {
  const { isOrgAdmin } = useRole();
  
  if (!isOrgAdmin) {
    return <UnauthorizedMessage />;
  }
  
  return <AdminUI />;
};
```

### API Calls

**Component uses module hooks/clients:**
```typescript
// Component uses its own hooks
export const OrgModuleAdmin = () => {
  const config = useOrgModuleConfig();  // From module
  const data = useOrgModuleData();      // From module
  
  return <AdminUI config={config} data={data} />;
};
```

---

## Anti-Patterns

### ❌ Direct API Calls in Page

```typescript
// WRONG: Page makes API calls
export default function OrgModuleAdminPage() {
  const [data, setData] = useState(null);
  
  fetch('/api/admin/org/module/data').then(...); // ❌
  
  return <div>{data}</div>;
}
```

### ❌ Component Without Route Metadata

```typescript
// WRONG: Missing @routes docstring
export const OrgModuleAdmin = () => {
  // Component makes API calls but doesn't document them
  fetch('/api/admin/org/module/data'); // ❌ Not documented
  
  return <div>...</div>;
};
```

### ❌ Incomplete Route Documentation

```typescript
/**
 * @component OrgModuleAdmin
 * @routes
 * - GET /admin/org/module/config
 * // ❌ Missing other routes the component calls
 */
export const OrgModuleAdmin = () => {
  fetch('/api/admin/org/module/config');     // ✅ Documented
  fetch('/api/admin/org/module/data');       // ❌ NOT documented
  fetch('/api/admin/org/module/analytics');  // ❌ NOT documented
  
  return <div>...</div>;
};
```

---

## Related Standards

- [01_std_front_AUTH](./01_std_front_AUTH.md) - Frontend authorization patterns
- [02_std_api_ROUTES](./02_std_api_ROUTES.md) - API route naming standards
- [03_std_back_AUTH](./03_std_back_AUTH.md) - Backend authorization patterns

---

## Related ADRs

- [ADR-004](../arch%20decisions/ADR-004-NEXTAUTH-API-CLIENT-PATTERN.md) - NextAuth API Client Pattern
- [ADR-015](../arch%20decisions/ADR-015-ADMIN-PAGE-AUTH-PATTERN.md) - Admin Page Auth Pattern
- [ADR-016](../arch%20decisions/ADR-016-ORG-ADMIN-PAGE-AUTHORIZATION.md) - Org Admin Page Authorization

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-05 | Initial standard - all admin pages use module components with route metadata |

---

**Maintained by:** CORA Development Team  
**Questions?** See [ADR-004](../arch%20decisions/ADR-004-NEXTAUTH-API-CLIENT-PATTERN.md) for rationale