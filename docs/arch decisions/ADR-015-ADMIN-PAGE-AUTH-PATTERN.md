# ADR-015: Admin Page Authentication Pattern

**Status:** PROPOSED  
**Date:** January 22, 2026  
**Authors:** AI Development Team  
**Related:** Phase 2A & 2B Admin Page Standardization Sprint

---

## Context

During the admin page audit (January 21-22, 2026), we discovered significant inconsistencies in authentication patterns across all 19 admin pages in the CORA Development Toolkit templates:

**Initial State (Before Fixes):**
- 6 critical auth issues (0 authentication, security risks)
- 8 pages with partial auth issues (incomplete Pattern A)
- 5 pages compliant with Pattern A
- Mix of 3 different patterns: useUser, useSession (deprecated), and no checks

**Problems Identified:**

1. **Security Risks:** Some admin landing pages had ZERO authentication checks
2. **Deprecated Patterns:** Using `useSession()` from next-auth causing SessionProvider errors
3. **Inconsistent Loading States:** Some pages showed loading, others didn't
4. **Inconsistent Error Messages:** No standard way to display auth errors
5. **Mixed Authorization Logic:** Some at page-level, some in components
6. **Outdated Patterns:** Using OrgContext instead of useUser hook

**Impact:**
- Difficult for developers to know which pattern to follow
- Maintenance burden with multiple patterns to support
- Potential security vulnerabilities
- Inconsistent user experience

## Decision

**All admin pages MUST follow Pattern A: "useUser with Explicit Auth Checks"**

This pattern requires:
1. Use `useUser()` hook from `@{project}/module-access`
2. Explicit loading state check
3. Explicit authentication check (isAuthenticated && profile)
4. Explicit authorization check (role-based)
5. Consistent error UI (Alert components)
6. Page-level checks (not delegated to components)

## Decision Summary

This ADR defines TWO standards for all admin pages:
1. **Part A: Authentication Pattern** (Pattern A with useUser)
2. **Part B: Breadcrumb Standard** (Consistent navigation UX)

Both are REQUIRED for all admin pages.

---

## Part A: Authentication Pattern

### Complete Implementation (Pattern A)

```typescript
"use client";

import React from "react";
import { useUser } from "@{project}/module-access";
import { CircularProgress, Box, Alert } from "@mui/material";
import { YourAdminComponent } from "@{project}/module-xyz";

/**
 * Admin Page Route - [Feature Name]
 * 
 * [Brief description of what this admin page does]
 * 
 * Required Roles:
 * - Sys Admin: sys_owner, sys_admin
 * OR
 * - Org Admin: org_owner, org_admin
 */
export default function AdminPageRoute() {
  const { profile, loading, isAuthenticated } = useUser();

  // Step 1: Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Step 2: Authentication check
  if (!isAuthenticated || !profile) {
    return (
      <Box p={4}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  // Step 3: Authorization check (choose ONE based on page type)
  
  // OPTION A: System Admin Only
  const isSysAdmin = ["sys_owner", "sys_admin"].includes(
    profile.sysRole || ""
  );

  if (!isSysAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. System administrator role required.
        </Alert>
      </Box>
    );
  }

  // OPTION B: Organization Admin (or System Admin)
  // const isOrgAdmin = ["org_owner", "org_admin"].includes(
  //   profile.orgRole || ""
  // );
  // const isSysAdmin = ["sys_owner", "sys_admin"].includes(
  //   profile.sysRole || ""
  // );
  //
  // if (!isOrgAdmin && !isSysAdmin) {
  //   return (
  //     <Box p={4}>
  //       <Alert severity="error">
  //         Access denied. Organization administrator role required.
  //       </Alert>
  //     </Box>
  //   );
  // }

  // Step 4: Render the admin component
  return <YourAdminComponent />;
}
```

### Key Components

#### 1. Loading State
```typescript
if (loading) {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
      <CircularProgress />
    </Box>
  );
}
```

**Why:**
- Prevents flash of error message while auth is loading
- Consistent loading UI across all pages
- Minimum height prevents layout shift

#### 2. Authentication Check
```typescript
if (!isAuthenticated || !profile) {
  return (
    <Box p={4}>
      <Alert severity="error">
        You must be logged in to access this page.
      </Alert>
    </Box>
  );
}
```

**Why:**
- Explicit check prevents undefined access to profile
- Uses Material-UI Alert for consistent error display
- Clear message for users

#### 3. Authorization Check
```typescript
const isSysAdmin = ["sys_owner", "sys_admin"].includes(
  profile.sysRole || ""
);

if (!isSysAdmin) {
  return (
    <Box p={4}>
      <Alert severity="error">
        Access denied. System administrator role required.
      </Alert>
    </Box>
  );
}
```

**Why:**
- Role check is explicit and visible at page-level
- Self-documenting (clear what roles are required)
- Consistent error message format

---

## Part B: Breadcrumb Standard

### Overview

All admin pages MUST use consistent breadcrumbs for navigation clarity.

### Breadcrumb Format

```
[Scope] > [Module] > [Resource] (optional)
```

### Rules

**1. Scope (First Level):**
- System admin pages: **"Sys Admin"**
- Organization admin pages: **"Org Admin"**
- Must match the org selector menu options

**2. Module (Second Level):**
- Use module name WITHOUT "module-" prefix
- **Full/partial words:** Capitalize first letter only (Access, Eval, Mgmt)
- **Acronyms:** All caps (AI, WS, KB)

**3. Resource (Third Level - Optional):**
- For dynamic routes (e.g., `/admin/access/orgs/[id]`)
- Use resource name, not ID (e.g., "Acme Corp" not "uuid-123")
- Only add if the page displays a specific resource

**4. Shell/Landing Pages:**
- **NO breadcrumbs** on `/admin/sys` or `/admin/org`
- These are top-level landing pages with no nesting

### Module Name Reference

| Module | Breadcrumb Name | Type | Example Page |
|--------|----------------|------|--------------|
| module-access | Access | Full word | `/admin/access` |
| module-ai | AI | Acronym | `/admin/ai` |
| module-mgmt | Mgmt | Partial word | `/admin/mgmt` |
| module-kb | KB | Acronym | `/admin/sys/kb` |
| module-ws | WS | Acronym | `/admin/sys/ws` |
| module-eval | Eval | Full word | `/admin/sys/eval` |
| module-chat | Chat | Full word | `/admin/sys/chat` |

### Examples

**✅ CORRECT:**
```
/admin/access → "Sys Admin > Access"
/admin/ai → "Sys Admin > AI"
/admin/mgmt → "Sys Admin > Mgmt"
/admin/sys/kb → "Sys Admin > KB"
/admin/sys/ws → "Sys Admin > WS"
/admin/org/eval → "Org Admin > Eval"
/admin/access/orgs/[id] → "Sys Admin > Access > Acme Corp"
/admin/sys → NO BREADCRUMBS (landing page)
/admin/org → NO BREADCRUMBS (landing page)
```

**❌ INCORRECT:**
```
"Admin Dashboard > Access Control" (legacy term, wrong format)
"System Admin > access" (not abbreviated, lowercase)
"Sys Admin > module-access" (includes 'module-' prefix)
"SYS ADMIN > ACCESS" (all caps for non-acronym)
"Sys Admin > Ai" (acronym not all caps)
```

### Rationale

**Why This Pattern?**

1. **Consistency:** All pages follow the same format
2. **Clarity:** Users know their location in the admin hierarchy
3. **Matches UI:** Breadcrumbs match org selector menu (Sys Admin / Org Admin)
4. **Concise:** Module names are short and clear
5. **Professional:** Proper capitalization (full words vs acronyms)

---

## Anti-Patterns (DO NOT USE)

### ❌ Anti-Pattern 1: useSession() from next-auth
```typescript
// DON'T DO THIS
import { useSession } from 'next-auth/react';

const { data: session } = useSession();
```

**Problems:**
- Requires SessionProvider wrapper
- Not part of CORA auth flow
- Causes SessionProvider errors
- Deprecated in CORA

### ❌ Anti-Pattern 2: No Page-Level Checks
```typescript
// DON'T DO THIS
export default function AdminPage() {
  return <AdminComponent />; // Component handles auth internally
}
```

**Problems:**
- Auth logic hidden in component
- Hard to audit security
- Inconsistent patterns across pages
- Can't see auth requirements at route level

### ❌ Anti-Pattern 3: OrgContext Instead of useUser
```typescript
// DON'T DO THIS
import { useContext } from 'react';
import { OrgContext } from '@{project}/module-access';

const context = useContext(OrgContext);
```

**Problems:**
- Outdated pattern
- Doesn't provide isAuthenticated or loading state
- Inconsistent with other pages
- No auth checks

### ❌ Anti-Pattern 4: Returning null Instead of Error
```typescript
// DON'T DO THIS
if (!hasPermission) {
  return null;
}
```

**Problems:**
- User sees blank page (confusing)
- No feedback about why access denied
- Hard to debug

## Rationale

### Why Pattern A Over Other Approaches?

**1. Explicitness Over Implicitness**
- Auth logic visible at page-level (not hidden in components)
- Easy to audit security
- Self-documenting code

**2. Consistency**
- Same pattern everywhere
- Easier for developers to remember
- Reduces maintenance burden

**3. No SessionProvider Errors**
- Uses CORA's useUser hook (not next-auth's useSession)
- Works with both Clerk and Okta auth providers
- Part of standard CORA auth flow

**4. Better UX**
- Clear loading states (no flash of content)
- Explicit error messages (not blank pages)
- Consistent error UI across all admin pages

**5. Testability**
- Clear branches for unit testing
- Easy to mock useUser hook
- Predictable behavior

## Implementation Guide

### For New Admin Pages

1. **Copy the template** from ADR-015 (above)
2. **Update the imports** for your module
3. **Choose authorization type** (sys admin or org admin)
4. **Replace placeholder** with your admin component
5. **Test all states** (loading, unauthenticated, unauthorized, success)

### For Existing Admin Pages

1. **Read current implementation**
2. **Identify what it does** (business logic)
3. **Copy Pattern A template**
4. **Port business logic** to template structure
5. **Test all states**
6. **Update template** in cora-dev-toolkit

### Migration Examples

#### Example 1: Converting from No Checks
```typescript
// BEFORE (Anti-Pattern 2)
export default function AdminPage() {
  return <AdminComponent />;
}

// AFTER (Pattern A)
export default function AdminPage() {
  const { profile, loading, isAuthenticated } = useUser();
  
  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}><CircularProgress /></Box>;
  if (!isAuthenticated || !profile) return <Box p={4}><Alert severity="error">You must be logged in to access this page.</Alert></Box>;
  
  const isSysAdmin = ["sys_owner", "sys_admin"].includes(profile.sysRole || "");
  if (!isSysAdmin) return <Box p={4}><Alert severity="error">Access denied. System administrator role required.</Alert></Box>;
  
  return <AdminComponent />;
}
```

#### Example 2: Converting from OrgContext
```typescript
// BEFORE (Anti-Pattern 3)
const context = useContext(OrgContext);
const currentOrg = context?.currentOrg;

if (!currentOrg) {
  return <Alert severity="warning">Please select an organization.</Alert>;
}

// AFTER (Pattern A)
const { profile, loading, isAuthenticated } = useUser();
const { organization } = useOrganizationContext();

if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}><CircularProgress /></Box>;
if (!isAuthenticated || !profile) return <Box p={4}><Alert severity="error">You must be logged in to access this page.</Alert></Box>;

const isOrgAdmin = ["org_owner", "org_admin"].includes(profile.orgRole || "");
const isSysAdmin = ["sys_owner", "sys_admin"].includes(profile.sysRole || "");

if (!isOrgAdmin && !isSysAdmin) return <Box p={4}><Alert severity="error">Access denied. Organization administrator role required.</Alert></Box>;
if (!organization) return <Box p={4}><Alert severity="warning">Please select an organization to manage settings.</Alert></Box>;
```

## Validation & Enforcement

### Automated Validation

A validator script (`validation/admin-auth-validator/`) will check:

✅ **Required Checks:**
- [ ] Uses `useUser()` from module-access
- [ ] Has loading state check with CircularProgress
- [ ] Has authentication check (isAuthenticated && profile)
- [ ] Has authorization check (role check)
- [ ] Uses Alert component for errors
- [ ] All checks are page-level (before component render)

❌ **Prohibited Patterns:**
- [ ] No `useSession()` from next-auth/react
- [ ] No `useContext(OrgContext)` for auth
- [ ] No pages without auth checks
- [ ] No returning `null` for auth failures

### Code Review Checklist

When reviewing new admin pages, verify:

- [ ] Pattern A is used correctly
- [ ] Loading, auth, and authz checks are present
- [ ] Error messages are clear and consistent
- [ ] Role requirements are documented in comments
- [ ] No anti-patterns are used

## Consequences

### Positive

✅ **Improved Security:** All admin pages have consistent auth checks  
✅ **Better UX:** Consistent loading and error states  
✅ **Easier Maintenance:** One pattern to maintain, not three  
✅ **Self-Documenting:** Auth requirements visible at page-level  
✅ **Easier Testing:** Clear branches for unit tests  
✅ **No SessionProvider Errors:** Uses CORA's auth hooks  

### Negative

⚠️ **Migration Effort:** Existing pages need to be updated  
⚠️ **More Boilerplate:** Pattern A requires more code than no checks  
⚠️ **Learning Curve:** Developers need to learn the pattern  

### Mitigation

- Provide template for copy-paste
- Add validation to catch non-compliance
- Document pattern in ADR and plan
- Update all templates in cora-dev-toolkit

## Status After Phase 2B

**All 19 admin pages now comply with Pattern A:**

✅ **Project Stack Template (11 pages):**
- `/admin/access/page.tsx` - Pattern A ✅
- `/admin/access/orgs/[id]/page.tsx` - Pattern A ✅ (Fixed Phase 2B)
- `/admin/ai/page.tsx` - Pattern A ✅ (Fixed Phase 2B)
- `/admin/mgmt/page.tsx` - Pattern A ✅
- `/admin/organizations/page.tsx` - Pattern A ✅ (Fixed Phase 2A)
- `/admin/sys/page.tsx` - Pattern A ✅ (Fixed Phase 2A)
- `/admin/sys/chat/page.tsx` - Pattern A ✅ (Fixed Phase 2B)
- `/admin/sys/kb/page.tsx` - Pattern A ✅
- `/admin/org/page.tsx` - Pattern A ✅ (Fixed Phase 2A)
- `/admin/org/chat/page.tsx` - Pattern A ✅ (Fixed Phase 2B)
- `/admin/org/kb/page.tsx` - Pattern A ✅ (Fixed Phase 2B)

✅ **Module Templates (8 pages):**
- `module-kb/routes/admin/sys/kb/page.tsx` - Pattern A ✅
- `module-kb/routes/admin/org/kb/page.tsx` - Pattern A ✅ (Fixed Phase 2B)
- `module-ws/routes/admin/sys/ws/page.tsx` - Pattern A ✅ (Fixed Phase 2A)
- `module-ws/routes/admin/org/ws/page.tsx` - Pattern A ✅
- `module-ws/routes/admin/org/ws/[id]/page.tsx` - Pattern A ✅ (Fixed Phase 2B)
- `module-ws/routes/admin/workspaces/page.tsx` - Pattern A ✅ (Fixed Phase 2A)
- `module-eval/routes/admin/sys/eval/page.tsx` - Pattern A ✅ (Fixed Phase 2A)
- `module-eval/routes/admin/org/eval/page.tsx` - Pattern A ✅ (Fixed Phase 2B)

**Result:** 100% compliance with Pattern A authentication standard!

## Related Documents

- **Audit Findings:** `docs/plans/findings_admin-page-audit.md`
- **Implementation Plan:** `docs/plans/plan_admin-page-standardization.md`
- **ADR-007:** CORA Auth Shell Standard (root-level auth)
- **ADR-010:** Cognito External IDP Strategy

## Next Steps

1. [x] Create ADR-015 (this document)
2. [ ] Create validation script (`validation/admin-auth-validator/`)
3. [ ] Add validator to `validation/cora-validate.py`
4. [ ] Update developer documentation
5. [ ] Present for approval

---

**Document Version:** 1.0  
**Status:** PROPOSED - Awaiting review and approval  
**Last Updated:** January 22, 2026
