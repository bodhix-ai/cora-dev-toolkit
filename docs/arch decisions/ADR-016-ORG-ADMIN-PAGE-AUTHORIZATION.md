# ADR-016: Org Admin Page Authorization Pattern

**Status:** ACCEPTED  
**Date:** January 23, 2026  
**Authors:** AI Development Team  
**Related Standard:** `docs/standards/standard_ORG-ADMIN-PAGE-AUTHORIZATION.md`

---

## Context

During the admin page standardization effort (January 21-23, 2026), we discovered critical bugs in organization-level admin pages that caused access control failures:

**Problems Discovered:**

1. **`profile.orgRole` doesn't exist** - Multiple pages checked this non-existent field, causing authorization to always fail
2. **`organization.id` vs `organization.orgId`** - Incorrect field access caused `undefined` to be passed to child components
3. **`profile.orgId` doesn't exist** - Similar to #1, this field doesn't exist on the Profile type
4. **Inconsistent patterns** - Different pages used different approaches (direct field access, array search, hooks)
5. **Missing sys admin access** - Some pages blocked sys admins from accessing org-level pages

**Impact:**
- Users with valid org_owner/org_admin roles were denied access
- Sys admins couldn't access org-level pages for oversight
- Data-driven components received `undefined` instead of valid org IDs
- Inconsistent user experience across admin pages

**Root Cause Analysis:**

The `Profile` type structure is:
```typescript
interface Profile extends User {
  organizations: UserOrganization[];  // Org roles are HERE
}

interface User {
  sysRole: "sys_user" | "sys_admin" | "sys_owner";  // sysRole is direct
  currentOrgId: string | null;  // NOT orgId
  // NO orgRole field!
}
```

The `UserOrganization` type structure is:
```typescript
interface UserOrganization {
  orgId: string;      // NOT id
  orgName: string;    // NOT name
  role: OrgRole;
}
```

Developers incorrectly assumed:
- `profile.orgRole` existed (it doesn't - org role is in `organizations[]` array)
- `organization.id` and `organization.name` existed (they're `orgId` and `orgName`)
- `profile.orgId` existed (it's `currentOrgId`)

---

## Decision

**All org admin pages MUST use the `useRole()` hook for authorization checks.**

The `useRole()` hook correctly computes:
- `isOrgAdmin` - by finding the user's role in the current organization from `profile.organizations[]`
- `isSysAdmin` - by checking `profile.sysRole`

**Additionally, org admin pages MUST:**
1. Allow both org admins AND sys admins (for platform oversight)
2. Use `currentOrganization` from `useOrganizationContext()` (not `organization`)
3. Access org data via `organization.orgId` and `organization.orgName`

---

## Standard Pattern

```typescript
"use client";

import { useUser, useOrganizationContext, useRole } from "@{project}/module-access";

export default function OrgAdminPage() {
  const { profile, loading, isAuthenticated } = useUser();
  const { currentOrganization: organization } = useOrganizationContext();
  const { isOrgAdmin, isSysAdmin } = useRole();

  if (loading) return <Loading />;
  if (!isAuthenticated || !profile) return <AuthRequired />;
  
  // MUST allow both org admins AND sys admins
  if (!isOrgAdmin && !isSysAdmin) return <AccessDenied />;
  
  if (!organization) return <SelectOrg />;

  // Use organization.orgId, NOT organization.id
  return <Content orgId={organization.orgId} />;
}
```

---

## Alternatives Considered

### Alternative 1: Keep checking profile.organizations[] directly

```typescript
const isOrgAdmin = profile?.organizations?.some(
  (org) => org.orgId === profile.currentOrgId && 
           ["org_owner", "org_admin"].includes(org.role)
);
```

**Rejected because:**
- Verbose and error-prone
- Duplicates logic already in `useRole()` hook
- Easy to get wrong (we saw 5+ different implementations)

### Alternative 2: Add profile.orgRole as a computed property

Could modify the Profile type to include a computed `orgRole` property.

**Rejected because:**
- Requires backend changes
- The `useRole()` hook already solves this
- Would still need to handle sys admin access separately

### Alternative 3: Create a dedicated useOrgAdminAuth() hook

Could create a new hook specifically for org admin page authorization.

**Considered but deferred because:**
- `useRole()` already provides what we need
- Adding another hook increases complexity
- May revisit if authorization logic becomes more complex

---

## Consequences

### Positive

✅ **Consistent Pattern** - All org admin pages use the same authorization approach  
✅ **Type Safety** - Using hooks prevents accessing non-existent fields  
✅ **Sys Admin Access** - Platform admins can access org pages for oversight  
✅ **Validation Support** - Pattern can be validated automatically  
✅ **Self-Documenting** - `useRole()` makes the authorization intent clear  

### Negative

⚠️ **Migration Required** - 6+ existing pages need to be updated  
⚠️ **Learning Curve** - Developers must learn the correct pattern  

### Mitigation

- Created standard document with examples
- Created validation script to catch violations
- Documented anti-patterns explicitly

---

## Validation

This decision is enforced by the `org-admin-auth-validator`:

```bash
python3 ./validation/cora-validate.py project . --validators org-admin-auth
```

**Checks:**
- ERROR: Usage of `profile.orgRole`
- ERROR: Usage of `profile.orgId`
- ERROR: Usage of `organization.id` (should be `orgId`)
- ERROR: Usage of `organization.name` (should be `orgName`)
- WARNING: Missing `useRole()` import
- WARNING: Auth check without sys admin allowance

---

## Affected Files

**Fixed (compliant):**
- `OrgAdminClientPage.tsx`
- `module-eval/routes/admin/org/eval/page.tsx`

**Require fixes:**
- `module-kb/routes/admin/org/kb/page.tsx`
- `module-ws/routes/admin/org/ws/page.tsx`
- `module-access/routes/admin/org/access/page.tsx`
- `project-stack/apps/web/app/admin/org/kb/page.tsx`
- `project-stack/apps/web/app/admin/org/chat/page.tsx`

---

## Related Documents

- **Standard:** `docs/standards/standard_ORG-ADMIN-PAGE-AUTHORIZATION.md`
- **ADR-015:** Admin Page Authentication Pattern (general pattern)
- **Validation:** `validation/org-admin-auth-validator/`

---

**Document Version:** 1.0  
**Decision Status:** ACCEPTED  
**Last Updated:** January 23, 2026