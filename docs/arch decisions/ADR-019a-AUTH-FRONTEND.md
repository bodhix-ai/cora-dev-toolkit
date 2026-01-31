# ADR-019a: Frontend Authorization

**Status:** Approved  
**Date:** January 31, 2026  
**Parent ADR:** [ADR-019: CORA Authorization Standardization](./ADR-019-AUTH-STANDARDIZATION.md)

---

## Overview

This document defines the frontend authorization patterns for CORA applications. It covers React hooks, context providers, loading states, and API client configuration required for proper authorization at each level (sys, org, ws).

**Related ADRs:**
- [ADR-015: Admin Page Auth Pattern](./ADR-015-ADMIN-PAGE-AUTH-PATTERN.md)
- [ADR-016: Org Admin Page Authorization](./ADR-016-ORG-ADMIN-PAGE-AUTHORIZATION.md)

---

## Authorization Hooks

### useUser() - Base Authentication

All protected pages MUST use the `useUser()` hook to verify authentication:

```typescript
import { useUser } from '@/lib/auth/hooks';

export default function ProtectedPage() {
  const { user, isLoading } = useUser();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    redirect('/login');
    return null;
  }
  
  return <PageContent user={user} />;
}
```

### useRole() - Role-Based Authorization

Admin pages MUST use the `useRole()` hook to check authorization:

```typescript
import { useRole } from '@/lib/auth/hooks';

// System admin page
export default function SystemAdminPage() {
  const { sysRole, isLoading } = useRole();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // Check sys admin access
  const isSysAdmin = sysRole === 'sys_owner' || sysRole === 'sys_admin';
  if (!isSysAdmin) {
    return <AccessDenied message="System admin access required" />;
  }
  
  return <SystemAdminContent />;
}
```

### useOrganizationContext() - Org-Level Authorization

Organization admin pages MUST extract org context AND check org role:

```typescript
import { useRole } from '@/lib/auth/hooks';
import { useOrganizationContext } from '@/lib/org/hooks';

// Org admin page
export default function OrgAdminPage() {
  const { orgRole, isLoading: roleLoading } = useRole();
  const { orgId, isLoading: orgLoading } = useOrganizationContext();
  
  if (roleLoading || orgLoading) {
    return <LoadingSpinner />;
  }
  
  if (!orgId) {
    return <SelectOrganization />;
  }
  
  // Check org admin access
  const isOrgAdmin = orgRole === 'org_owner' || orgRole === 'org_admin';
  if (!isOrgAdmin) {
    return <AccessDenied message="Organization admin access required" />;
  }
  
  return <OrgAdminContent orgId={orgId} />;
}
```

### useWorkspace() - Workspace-Level Authorization

Workspace admin pages MUST extract workspace context AND check ws role:

```typescript
import { useWorkspace } from '@/lib/workspace/hooks';

// Workspace admin page
export default function WorkspaceAdminPage() {
  const { wsId, wsRole, isLoading } = useWorkspace();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!wsId) {
    return <SelectWorkspace />;
  }
  
  // Check ws admin access
  const isWsAdmin = wsRole === 'ws_owner' || wsRole === 'ws_admin';
  if (!isWsAdmin) {
    return <AccessDenied message="Workspace admin access required" />;
  }
  
  return <WorkspaceAdminContent wsId={wsId} />;
}
```

---

## Route Pattern Mapping

| Route Pattern | Required Hooks | Context Extraction | Role Check |
|--------------|----------------|-------------------|------------|
| `/admin/sys/*` | `useUser()`, `useRole()` | None | `sysRole in ['sys_owner', 'sys_admin']` |
| `/admin/org/*` | `useUser()`, `useRole()`, `useOrganizationContext()` | `orgId` | `orgRole in ['org_owner', 'org_admin']` |
| `/admin/ws/*` | `useUser()`, `useWorkspace()` | `wsId` | `wsRole in ['ws_owner', 'ws_admin']` |
| `/ws/*` (user) | `useUser()`, `useWorkspace()` | `wsId` | Membership check |

---

## Loading State Requirements

**CRITICAL:** All auth checks MUST handle loading states properly to avoid flash of unauthorized content.

### ✅ CORRECT Pattern

```typescript
export default function AdminPage() {
  const { sysRole, isLoading } = useRole();
  
  // ALWAYS check loading first
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // Then check authorization
  if (!['sys_owner', 'sys_admin'].includes(sysRole)) {
    return <AccessDenied />;
  }
  
  return <AdminContent />;
}
```

### ❌ INCORRECT Pattern

```typescript
export default function AdminPage() {
  const { sysRole, isLoading } = useRole();
  
  // ❌ WRONG: Checking role before loading complete
  if (!['sys_owner', 'sys_admin'].includes(sysRole)) {
    return <AccessDenied />;  // Shows briefly during load!
  }
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return <AdminContent />;
}
```

---

## API Client Configuration

### Passing Context IDs

When making API calls to admin endpoints, the frontend MUST pass context IDs:

```typescript
// System admin API call - no context needed
const response = await api.get('/admin/sys/mgmt/modules');

// Org admin API call - MUST pass orgId
const response = await api.get('/admin/org/chat/config', {
  params: { orgId }  // camelCase in query params
});

// Workspace admin API call - MUST pass wsId
const response = await api.get('/admin/ws/settings', {
  params: { wsId }  // camelCase in query params
});
```

### API Client Hook Pattern

```typescript
import { useOrganizationContext } from '@/lib/org/hooks';
import { useApiClient } from '@/lib/api/hooks';

export function useOrgAdminApi() {
  const { orgId } = useOrganizationContext();
  const api = useApiClient();
  
  const getConfig = async () => {
    if (!orgId) throw new Error('Organization context required');
    return api.get('/admin/org/chat/config', { params: { orgId } });
  };
  
  const updateConfig = async (config: OrgConfig) => {
    if (!orgId) throw new Error('Organization context required');
    return api.put('/admin/org/chat/config', { ...config, orgId });
  };
  
  return { getConfig, updateConfig };
}
```

---

## Role Constants (Frontend)

Use consistent role constants in TypeScript:

```typescript
// lib/auth/constants.ts

export const SYS_ADMIN_ROLES = ['sys_owner', 'sys_admin'] as const;
export const ORG_ADMIN_ROLES = ['org_owner', 'org_admin'] as const;
export const WS_ADMIN_ROLES = ['ws_owner', 'ws_admin'] as const;

export type SysRole = typeof SYS_ADMIN_ROLES[number] | 'sys_user';
export type OrgRole = typeof ORG_ADMIN_ROLES[number] | 'org_user';
export type WsRole = typeof WS_ADMIN_ROLES[number] | 'ws_user';

// Helper functions
export const isSysAdmin = (role?: string): boolean => 
  SYS_ADMIN_ROLES.includes(role as any);

export const isOrgAdmin = (role?: string): boolean => 
  ORG_ADMIN_ROLES.includes(role as any);

export const isWsAdmin = (role?: string): boolean => 
  WS_ADMIN_ROLES.includes(role as any);
```

---

## Complete Page Template

### System Admin Page

```typescript
'use client';

import { useUser, useRole } from '@/lib/auth/hooks';
import { isSysAdmin } from '@/lib/auth/constants';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AccessDenied } from '@/components/ui/AccessDenied';

export default function SystemAdminPage() {
  const { user, isLoading: userLoading } = useUser();
  const { sysRole, isLoading: roleLoading } = useRole();
  
  // Loading state
  if (userLoading || roleLoading) {
    return <LoadingSpinner />;
  }
  
  // Auth check
  if (!user) {
    redirect('/login');
    return null;
  }
  
  // Authorization check
  if (!isSysAdmin(sysRole)) {
    return <AccessDenied message="System admin access required" />;
  }
  
  return (
    <div>
      <h1>System Admin</h1>
      {/* Page content */}
    </div>
  );
}
```

### Org Admin Page

```typescript
'use client';

import { useUser, useRole } from '@/lib/auth/hooks';
import { useOrganizationContext } from '@/lib/org/hooks';
import { isOrgAdmin } from '@/lib/auth/constants';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AccessDenied } from '@/components/ui/AccessDenied';
import { SelectOrganization } from '@/components/org/SelectOrganization';

export default function OrgAdminPage() {
  const { user, isLoading: userLoading } = useUser();
  const { orgRole, isLoading: roleLoading } = useRole();
  const { orgId, isLoading: orgLoading } = useOrganizationContext();
  
  // Loading state
  if (userLoading || roleLoading || orgLoading) {
    return <LoadingSpinner />;
  }
  
  // Auth check
  if (!user) {
    redirect('/login');
    return null;
  }
  
  // Org context check
  if (!orgId) {
    return <SelectOrganization />;
  }
  
  // Authorization check
  if (!isOrgAdmin(orgRole)) {
    return <AccessDenied message="Organization admin access required" />;
  }
  
  return (
    <div>
      <h1>Organization Admin</h1>
      {/* Page content - use orgId in API calls */}
    </div>
  );
}
```

---

## Validation Requirements

The api-tracer validator checks frontend files for:

1. **useUser() hook** - Present in all protected pages
2. **useRole() hook** - Present in admin pages
3. **useOrganizationContext()** - Present in `/admin/org/*` pages
4. **useWorkspace()** - Present in `/admin/ws/*` pages
5. **Loading state check** - `isLoading` checked before role check
6. **Role check** - Appropriate role constant used

### Common Validation Errors

| Error | Fix |
|-------|-----|
| `Missing useRole() in admin page` | Add `useRole()` hook |
| `Missing loading state check` | Check `isLoading` before role check |
| `Missing useOrganizationContext() in org admin page` | Add org context hook |
| `orgId not passed to API call` | Include `orgId` in params |

---

## Anti-Patterns

### ❌ Checking Role from JWT

```typescript
// ❌ WRONG: JWT does not contain role
const { user } = useUser();
if (user?.role !== 'admin') {  // role is not in JWT!
  return <AccessDenied />;
}
```

### ❌ Hardcoding Role Strings

```typescript
// ❌ WRONG: Hardcoded strings
if (sysRole !== 'sys_admin') {
  return <AccessDenied />;
}

// ✅ CORRECT: Use constants
if (!isSysAdmin(sysRole)) {
  return <AccessDenied />;
}
```

### ❌ Missing Org Context in API Call

```typescript
// ❌ WRONG: Missing orgId
const response = await api.get('/admin/org/chat/config');

// ✅ CORRECT: Include orgId
const response = await api.get('/admin/org/chat/config', {
  params: { orgId }
});
```

---

## References

- [ADR-019: CORA Authorization Standardization](./ADR-019-AUTH-STANDARDIZATION.md) - Parent ADR
- [ADR-019b: Backend Authorization](./ADR-019b-AUTH-BACKEND.md) - Lambda patterns
- [ADR-015: Admin Page Auth Pattern](./ADR-015-ADMIN-PAGE-AUTH-PATTERN.md) - Original admin auth ADR
- [ADR-016: Org Admin Page Authorization](./ADR-016-ORG-ADMIN-PAGE-AUTHORIZATION.md) - Original org admin ADR

---

**Status:** ✅ Approved  
**Parent:** ADR-019  
**Tracking:** Sprint S1 of Auth Standardization Initiative