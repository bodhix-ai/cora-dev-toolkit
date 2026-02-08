# Admin Page Migration Inventory

**Created:** February 6, 2026 - Session 20
**Status:** Inventory Complete
**Goal:** Migrate 13 admin pages to component delegation pattern per `01_std_front_ADMIN-ARCH.md`

---

## Summary

- **Total Admin Pages:** 16 module pages (8 org + 8 sys)
- **Already Compliant:** 3 pages (19%)
- **Need Migration:** 13 pages (81%)

---

## Already Compliant (3 pages) ✅

These pages follow the component delegation pattern:

1. **`/admin/org/access/page.tsx`** → Renders `<OrgAccessAdmin />`
2. **`/admin/org/ai/page.tsx`** → Renders `<OrgAiAdmin />`
3. **`/admin/sys/mgmt/page.tsx`** → Renders `<SysMgmtAdmin />`

---

## Pages Needing Migration (13 pages)

### Org-Level Pages (6 pages)

| Page | Current Pattern | Target Component | Module Location |
|------|----------------|------------------|-----------------|
| `/admin/org/chat/page.tsx` | Uses hooks directly | `<OrgChatAdmin />` | `module-chat/frontend/components/admin/` |
| `/admin/org/eval/page.tsx` | Uses hooks directly | `<OrgEvalAdmin />` | `module-eval/frontend/components/admin/` |
| `/admin/org/kb/page.tsx` | Uses hooks directly | `<OrgKbAdmin />` | `module-kb/frontend/components/admin/` |
| `/admin/org/mgmt/page.tsx` | Uses hooks directly | `<OrgMgmtAdmin />` | `module-mgmt/frontend/components/admin/` |
| `/admin/org/voice/page.tsx` | Uses hooks directly | `<OrgVoiceAdmin />` | `module-voice/frontend/components/admin/` |
| `/admin/org/ws/page.tsx` | Uses hooks directly | `<OrgWsAdmin />` | `module-ws/frontend/components/admin/` |

### Sys-Level Pages (7 pages)

| Page | Current Pattern | Target Component | Module Location |
|------|----------------|------------------|-----------------|
| `/admin/sys/access/page.tsx` | Uses hooks directly | `<SysAccessAdmin />` | `module-access/frontend/components/admin/` |
| `/admin/sys/ai/page.tsx` | Uses hooks directly | `<SysAiAdmin />` | `module-ai/frontend/components/admin/` |
| `/admin/sys/chat/page.tsx` | Uses hooks directly | `<SysChatAdmin />` | `module-chat/frontend/components/admin/` |
| `/admin/sys/eval/page.tsx` | Uses hooks directly | `<SysEvalAdmin />` | `module-eval/frontend/components/admin/` |
| `/admin/sys/kb/page.tsx` | Uses hooks directly | `<SysKbAdmin />` | `module-kb/frontend/components/admin/` |
| `/admin/sys/voice/page.tsx` | Uses hooks directly | `<SysVoiceAdmin />` | `module-voice/frontend/components/admin/` |
| `/admin/sys/ws/page.tsx` | Uses hooks directly | `<SysWsAdmin />` | `module-ws/frontend/components/admin/` |

---

## Migration Pattern

### Before (Current - Uses Hooks Directly)
```typescript
'use client';

import { useUser, useOrganizationContext, useRole } from '@{{PROJECT_NAME}}/module-access';
import { CircularProgress, Box, Alert } from '@mui/material';

export default function OrgExampleAdminPage() {
  const { profile, loading, isAuthenticated } = useUser();
  const { currentOrganization } = useOrganizationContext();
  const { isOrgAdmin } = useRole();
  
  // Auth checks
  if (loading) return <CircularProgress />;
  if (!isAuthenticated) return <Alert>Not authenticated</Alert>;
  if (!isOrgAdmin) return <Alert>Not authorized</Alert>;
  
  // Component logic and rendering
  return <div>...</div>;
}
```

### After (Target - Component Delegation)
```typescript
'use client';

import { OrgExampleAdmin } from '@{{PROJECT_NAME}}/module-example';

export default function OrgExampleAdminPage() {
  return <OrgExampleAdmin />;
}
```

### Component Implementation
The component handles all auth, state, and logic internally:

```typescript
/**
 * Organization Example Admin Component
 * 
 * @routes
 * - GET /admin/org/example - List resources
 * - POST /admin/org/example - Create resource
 */
'use client';

export function OrgExampleAdmin() {
  // All hooks and logic inside component
  const { profile, loading, isAuthenticated } = useUser();
  const { currentOrganization } = useOrganizationContext();
  const { isOrgAdmin } = useRole();
  
  // Auth checks
  if (loading) return <CircularProgress />;
  if (!isAuthenticated) return <Alert>Not authenticated</Alert>;
  if (!isOrgAdmin) return <Alert>Not authorized</Alert>;
  
  // Component implementation
  return <div>...</div>;
}
```

---

## Next Steps

1. **Check which components already exist** (from S6 work)
2. **Prioritize pages with auth errors** (from S6 validation)
3. **Use `/fix-and-sync.md` workflow** for each migration
4. **Update validation** after migration to confirm compliance

---

## Notes

- **Landing pages excluded:** `/admin/page.tsx`, `/admin/org/page.tsx`, `/admin/sys/page.tsx` are routing/dashboard pages, not module pages
- **Sub-pages valid:** `/admin/sys/access/orgs/*` are valid sub-pages accessed through primary access page
- **Standard reference:** `docs/standards/01_std_front_ADMIN-ARCH.md` (v2.0)