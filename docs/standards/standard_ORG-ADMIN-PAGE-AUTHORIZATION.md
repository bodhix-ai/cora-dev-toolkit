# Standard: Org Admin Page Authorization Pattern

**Status:** ACTIVE  
**Date:** January 23, 2026  
**Related ADR:** ADR-015-ADMIN-PAGE-AUTH-PATTERN.md

---

## Overview

All organization-level admin pages (`/admin/org/*`) MUST follow a consistent authorization pattern to ensure:
1. Correct role checking using the `useRole()` hook
2. Proper access to organization context data
3. Sys admin access for platform oversight

## The Standard Pattern

```typescript
"use client";

import { useUser, useOrganizationContext, useRole } from "@{project}/module-access";
import { Box, CircularProgress, Alert } from "@mui/material";

export default function OrgAdminPage() {
  const { profile, loading, isAuthenticated } = useUser();
  const { currentOrganization: organization } = useOrganizationContext();
  const { isOrgAdmin, isSysAdmin } = useRole();

  // 1. Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // 2. Authentication check
  if (!isAuthenticated || !profile) {
    return (
      <Box p={4}>
        <Alert severity="error">You must be logged in to access this page.</Alert>
      </Box>
    );
  }

  // 3. Authorization check - org admins OR sys admins can access
  if (!isOrgAdmin && !isSysAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. Organization administrator role required.
        </Alert>
      </Box>
    );
  }

  // 4. Organization context check (required for most org admin pages)
  if (!organization) {
    return (
      <Box p={4}>
        <Alert severity="warning">
          Please select an organization to manage settings.
        </Alert>
      </Box>
    );
  }

  // 5. Render page content - use organization.orgId, organization.orgName
  return <YourComponent orgId={organization.orgId} orgName={organization.orgName} />;
}
```

---

## Required Elements

### 1. Hooks (REQUIRED)

| Hook | Purpose | Required |
|------|---------|----------|
| `useUser()` | Get `profile`, `loading`, `isAuthenticated` | ✅ Yes |
| `useOrganizationContext()` | Get `currentOrganization` | ✅ Yes (if org context needed) |
| `useRole()` | Get `isOrgAdmin`, `isSysAdmin` | ✅ Yes |

### 2. Authorization Check (REQUIRED)

```typescript
const { isOrgAdmin, isSysAdmin } = useRole();

if (!isOrgAdmin && !isSysAdmin) {
  // Deny access
}
```

**Why both?** Sys admins need access to org-level pages for platform oversight.

### 3. Organization Context (REQUIRED for data-driven pages)

```typescript
const { currentOrganization: organization } = useOrganizationContext();

// Use organization.orgId, NOT organization.id
<ChildComponent orgId={organization.orgId} />
```

---

## Anti-Patterns (DO NOT USE)

### ❌ Anti-Pattern 1: Using `profile.orgRole`

```typescript
// ❌ WRONG - profile.orgRole DOES NOT EXIST
const isOrgAdmin = ["org_owner", "org_admin"].includes(profile.orgRole || "");
```

**Why it's wrong:** The `Profile` type has `sysRole` directly, but org roles are stored in `profile.organizations[].role`. The field `profile.orgRole` is `undefined`.

**✅ Correct:**
```typescript
const { isOrgAdmin } = useRole();
```

### ❌ Anti-Pattern 2: Using `organization.id` or `organization.name`

```typescript
// ❌ WRONG - UserOrganization has orgId/orgName, not id/name
<Component orgId={organization.id} orgName={organization.name} />
```

**Why it's wrong:** The `UserOrganization` type from `useOrganizationContext()` uses `orgId` and `orgName`, not `id` and `name`.

**✅ Correct:**
```typescript
<Component orgId={organization.orgId} orgName={organization.orgName} />
```

### ❌ Anti-Pattern 3: Using `profile.orgId`

```typescript
// ❌ WRONG - profile.orgId DOES NOT EXIST
<Component orgId={profile.orgId} />
```

**Why it's wrong:** The `Profile` type has `currentOrgId`, not `orgId`.

**✅ Correct:**
```typescript
const { currentOrganization: organization } = useOrganizationContext();
<Component orgId={organization.orgId} />
```

### ❌ Anti-Pattern 4: Not Allowing Sys Admins

```typescript
// ❌ WRONG - Only checks org admin, blocks sys admins
if (!isOrgAdmin) {
  return <AccessDenied />;
}
```

**Why it's wrong:** Sys admins need access for platform oversight.

**✅ Correct:**
```typescript
if (!isOrgAdmin && !isSysAdmin) {
  return <AccessDenied />;
}
```

### ❌ Anti-Pattern 5: Using `{ organization }` from useOrganizationContext

```typescript
// ❌ WRONG - Hook returns currentOrganization, not organization
const { organization } = useOrganizationContext();
```

**Why it's wrong:** The hook returns `currentOrganization`, not `organization`. Destructuring `organization` gives `undefined`.

**✅ Correct:**
```typescript
const { currentOrganization: organization } = useOrganizationContext();
```

---

## Type Reference

### Profile Type (from useUser)

```typescript
interface Profile extends User {
  organizations: UserOrganization[];
}

interface User {
  id: string;
  email: string;
  sysRole: "sys_user" | "sys_admin" | "sys_owner";
  currentOrgId: string | null;
  // Note: NO orgRole field!
}
```

### UserOrganization Type (from useOrganizationContext)

```typescript
interface UserOrganization {
  orgId: string;      // Use this, NOT 'id'
  orgName: string;    // Use this, NOT 'name'
  orgSlug?: string;
  role: OrgRole;
  isOwner: boolean;
}
```

### useRole Hook Return Type

```typescript
interface UseRoleReturn {
  role: OrgRole | null;       // Current org role
  hasPermission: (role: string) => boolean;
  isSysAdmin: boolean;        // true if sys_admin or sys_owner
  isOrgAdmin: boolean;        // true if org_admin or org_owner in current org
}
```

---

## Validation

This standard is enforced by the `org-admin-auth-validator` in the validation suite:

```bash
python3 ./validation/cora-validate.py project . --validators org-admin-auth
```

### Checks Performed

| Check | Severity | Description |
|-------|----------|-------------|
| `profile.orgRole` usage | ERROR | Detects non-existent field access |
| `profile.orgId` usage | ERROR | Detects non-existent field access |
| `organization.id` usage | ERROR | Should be `organization.orgId` |
| `organization.name` usage | ERROR | Should be `organization.orgName` |
| Missing `useRole()` import | WARNING | Should use hook for role checks |
| Missing sys admin check | WARNING | Should allow both org and sys admins |

---

## Affected Files

All files matching pattern: `*/admin/org/*/page.tsx`

### Project Stack Template
- `apps/web/app/admin/org/page.tsx` (landing page)
- `apps/web/app/admin/org/OrgAdminClientPage.tsx`
- `apps/web/app/admin/org/kb/page.tsx`
- `apps/web/app/admin/org/chat/page.tsx`

### Module Routes
- `module-eval/routes/admin/org/eval/page.tsx`
- `module-kb/routes/admin/org/kb/page.tsx`
- `module-ws/routes/admin/org/ws/page.tsx`
- `module-ws/routes/admin/org/ws/[id]/page.tsx`
- `module-access/routes/admin/org/access/page.tsx`

---

**Document Version:** 1.0  
**Last Updated:** January 23, 2026