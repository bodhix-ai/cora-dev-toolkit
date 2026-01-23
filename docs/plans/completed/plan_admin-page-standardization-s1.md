# Plan: Admin Page Standardization

**Status:** ✅ COMPLETE - All Auth Fixes, Breadcrumbs & Validation (0 Errors on 19 Pages)
**Created:** January 18, 2026  
**Started:** January 21, 2026  
**Completed:** January 22, 2026  
**Priority:** HIGH (Technical Debt / Code Quality)  
**Scope:** All system and organization admin pages

**Current Progress:**
- ✅ Phase 1 COMPLETE: Comprehensive audit of all 19 admin pages (3 parts)
  - ✅ Part A: Authentication patterns audited (19/19 pages) - 6 critical, 8 need improvement, 5 compliant
  - ✅ Part B: UI/Layout patterns audited (19/19 pages) - 4 critical issues found
  - ✅ Part C: Module ownership audited (11/11 pages) - 4 duplicates, 5 orphans, 2 shell pages
- ✅ Critical architectural decision: ALL admin pages MUST be module-owned
- ✅ Identified 10 critical issues requiring fixes (auth, URL, breadcrumbs, design, ownership)
- ✅ **Phase 2A COMPLETE:** All 6 critical auth fixes applied to templates (January 22, 2026)
  - ✅ Fix 1/6: `/admin/organizations` - Already used Pattern A (verified)
  - ✅ Fix 2/6: `/admin/sys` - Split into server + client components, tested & working
  - ✅ Fix 3/6: `/admin/org` - Split into server + client components, added org admin auth
  - ✅ Fix 4/6: `module-ws/admin/sys/ws` - Added Pattern A authentication
  - ✅ Fix 5/6: `module-ws/admin/workspaces` - Added Pattern A authentication
  - ✅ Fix 6/6: `module-eval/admin/sys/eval` - Added Pattern A authentication
  - ✅ Fixed URL pattern: `/admin/platform` → `/admin/sys` 
  - ✅ Fixed navigation label: "System Admin" → "Sys Admin"
  - ✅ Fixed fs module errors with server/client component split
- ✅ **Phase 2B COMPLETE:** All 8 pages with partial auth issues fixed (January 22, 2026)
  - ✅ Fix 1/8: `/admin/access/orgs/[id]` - Added loading, auth, authz checks
  - ✅ Fix 2/8: `/admin/ai` - Added explicit auth and authz checks
  - ✅ Fix 3/8: `/admin/sys/chat` - Added Pattern A auth to placeholder
  - ✅ Fix 4/8: `/admin/org/chat` - Added Pattern A auth to placeholder
  - ✅ Fix 5/8: `/admin/org/kb` - Added Pattern A auth to placeholder
  - ✅ Fix 6/8: `module-kb/admin/org/kb` - Added loading and isAuthenticated checks
  - ✅ Fix 7/8: `module-ws/admin/org/ws/[id]` - Added full Pattern A auth
  - ✅ Fix 8/8: `module-eval/admin/org/eval` - Replaced OrgContext with useUser
- ✅ **Phase 2C COMPLETE:** Breadcrumb standardization across all admin pages (January 22, 2026)
  - ✅ Created ADR-015 breadcrumb navigation standard (2-level and 3-level patterns)
  - ✅ Fixed 8 existing admin component breadcrumbs (Access, AI, Mgmt, KB x2, WS x2, OrgDetails)
  - ✅ Added breadcrumbs to 2 eval admin pages (SysEvalConfigPage, OrgEvalConfigPage)
  - ✅ Verified user-facing pages use correct dynamic labels (WorkspaceDetailPage, EvalDetailPage)
  - ✅ All breadcrumbs use Material-UI components with NavigateNext separator
  - ✅ All breadcrumbs include proper aria-label attributes for accessibility
  - ✅ Synced all 10 breadcrumb files to test-eval project (~/code/bodhix/testing/test-eval/ai-sec-stack)
- ✅ **ADR-015 CREATED:** Admin Page Auth Pattern + Breadcrumb Navigation standards documented
- ✅ **VALIDATOR CREATED:** admin-auth-validator enforces Pattern A compliance
- ✅ **VALIDATION COMPLETE:** 19 pages, 0 errors, 0 warnings, 100% compliance
- ✅ **CLEANUP COMPLETE:** Deleted deprecated `/admin/platform` directory

**Session Completed:** January 22, 2026  
**Tracking Document:** `docs/plans/findings_admin-page-audit.md` (complete audit results)

**Critical Issues Summary:**
1. ✅ **6 pages with critical auth issues** - FIXED (Pattern A applied, useSession eliminated)
2. ✅ **8 pages with partial auth issues** - FIXED (All now use Pattern A)
3. ✅ **URL pattern broken** - FIXED (`/admin/platform` → `/admin/sys`, directory deleted)
4. ✅ **Navigation label wrong** - FIXED (\"System Admin\" → \"Sys Admin\")
5. ✅ **Validation enforcement** - CREATED (admin-auth-validator with 0 errors achieved)
6. ✅ **Breadcrumb standardization** - COMPLETE (ADR-015 standard created, 10 admin pages updated, synced to test-eval)
7. 🔴 **No sys/org design distinction** (pages look identical despite different scopes) - FUTURE PHASE
8. 🔴 **Module ownership issues** (11 pages in wrong location) - FUTURE PHASE

---

## Problem Statement

CORA admin pages currently suffer from **multiple inconsistencies** across several dimensions:

### 1. Authentication Patterns (CRITICAL)
- Multiple authentication patterns (useSession, useUser, none)
- Some pages crash with SessionProvider errors
- Unclear role requirements

### 2. URL Structure (HIGH PRIORITY)
- Inconsistent URL patterns (`/admin/access` vs `/admin/sys/kb` vs `/admin/org/kb`)
- No clear naming convention
- Ambiguous hierarchy (sys vs org vs workspace)

### 3. Breadcrumbs & Navigation (HIGH PRIORITY)
- Inconsistent or missing breadcrumbs
- Unclear page titles
- No standardized navigation patterns

### 4. Page Layout (MEDIUM PRIORITY)
- Different header styles
- Inconsistent spacing and layout
- Variable loading states

### Impact

1. **Developer Confusion** - No clear pattern to follow when creating new admin pages
2. **Maintenance Burden** - Multiple patterns to maintain and debug
3. **User Experience Issues** - Confusing navigation, inconsistent UI
4. **Testing Complexity** - Different patterns require different test approaches

## Current State Analysis

### Authentication Pattern Inconsistencies

| Page | Pattern | Auth Check Location | Status |
|------|---------|---------------------|--------|
| `/admin/access` | Pattern A | Page-level useUser() + explicit checks | ✅ Working |
| `/admin/ai` | Pattern A | Page-level useUser() + authAdapter | ✅ Working |
| `/admin/mgmt` | Pattern A | Page-level useUser() + explicit checks | ✅ Working |
| `/admin/sys/kb` | **Pattern A** | **Page-level useUser() + explicit checks** | **✅ FIXED & VERIFIED (Jan 18, 2026)** |
| `/admin/sys/kb` (old) | Anti-pattern | useSession() (caused SessionProvider error) | ❌ Broken (replaced) |
| `/admin/sys/eval` | Pattern B | No checks - components handle internally | ⚠️ Works but inconsistent |
| `/admin/sys/chat` | Pattern C | No checks - placeholder page | ⚠️ Placeholder only |

**This is absurd.** We need ONE standard pattern.

**UPDATE (Jan 18, 2026):** The KB admin page fix proves that **Pattern A is the correct approach** - it resolved the SessionProvider error and is now working perfectly.

### URL Structure Inconsistencies

| Current URL | Purpose | Issues |
|-------------|---------|--------|
| `/admin/access` | Sys admin - Access control | Missing `/sys/` prefix |
| `/admin/ai` | Sys admin - AI enablement | Missing `/sys/` prefix |
| `/admin/mgmt` | Sys admin - Management | Missing `/sys/` prefix |
| `/admin/sys/kb` | Sys admin - KB config | Has `/sys/` prefix ✅ |
| `/admin/sys/eval` | Sys admin - Eval config | Has `/sys/` prefix ✅ |
| `/admin/sys/chat` | Sys admin - Chat config | Has `/sys/` prefix ✅ |
| `/admin/sys/ws` | Sys admin - Workspace config | Has `/sys/` prefix ✅ |
| `/admin/org/kb` | Org admin - KB config | Different hierarchy |
| `/admin/organizations` | Sys admin - Org management | Should be `/admin/sys/orgs` |

**Problems:**
1. No consistent prefix pattern for sys admin pages
2. Some pages use module names directly (`/admin/access`)
3. Others use scope prefix (`/admin/sys/kb`)
4. Unclear URL hierarchy

### Breadcrumb & Navigation Inconsistencies

| Page | Current Breadcrumbs | Expected Breadcrumbs |
|------|-------------------|---------------------|
| `/admin/access` | Unknown | Admin > System > Access Control |
| `/admin/ai` | Unknown | Admin > System > AI Enablement |
| `/admin/sys/kb` | Unknown | Admin > System > Knowledge Base |
| `/admin/org/kb` | Unknown | Admin > Organization > Knowledge Base |

**Problems:**
1. Unknown which pages have breadcrumbs
2. No standardized breadcrumb structure
3. Inconsistent page titles

---

## Proposed Standards

### Standard 1: Authentication Pattern

### The Standard: "useUser with Explicit Auth"

**All admin pages MUST follow this pattern:**

```typescript
"use client";

import React from "react";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { CircularProgress, Box, Alert } from "@mui/material";
import { AdminPageComponent } from "@{{PROJECT_NAME}}/module-xyz";

/**
 * [Sys/Org] Admin Page - [Feature Name]
 * 
 * Admin page for [description].
 * Requires [role requirements].
 */
export default function AdminPageRoute() {
  const { profile, loading, isAuthenticated } = useUser();

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Authentication check
  if (!isAuthenticated || !profile) {
    return (
      <Box p={4}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  // Authorization check (sys admin pages)
  const isSysAdmin = ['sys_owner', 'sys_admin'].includes(profile.sysRole || '');
  if (!isSysAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. System administrator role required.
        </Alert>
      </Box>
    );
  }

  // OR: Authorization check (org admin pages)
  const isOrgAdmin = ['org_owner', 'org_admin'].includes(profile.orgRole || '');
  if (!isOrgAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. Organization administrator role required.
        </Alert>
      </Box>
    );
  }

  // Render the page component
  return <AdminPageComponent />;
}
```

### Why This Pattern?

**Advantages:**
1. ✅ **Explicit** - Authentication logic visible at page level
2. ✅ **Consistent** - Same pattern everywhere
3. ✅ **No SessionProvider errors** - Uses useUser, not useSession
4. ✅ **Clear loading states** - Handles loading, unauthenticated, unauthorized separately
5. ✅ **Self-documenting** - Easy to understand role requirements
6. ✅ **Testable** - Clear branches for unit testing

**Why NOT Other Patterns:**
- ❌ **useSession()** - Requires SessionProvider, not part of CORA auth flow
- ❌ **No checks** - Unclear where auth happens, harder to debug
- ❌ **Component-level auth** - Inconsistent, hard to enforce standards

---

## Implementation Plan

### Phase 1: Comprehensive Audit ⏳ IN PROGRESS

**Started:** January 21, 2026  
**Status:** Audit framework created, 19 pages identified  
**Action:** Document all admin pages - authentication patterns AND UI/layout patterns.

**CRITICAL ARCHITECTURAL DECISION (Jan 21, 2026):**
- ✅ **All admin pages MUST be module-owned** (confirmed with stakeholder)
- Project-stack-template should NOT contain admin pages (only shell/layout)
- Identified 11 orphan pages requiring relocation to appropriate modules
- See Part C in findings document for detailed module assignment proposals

**Part A: Authentication Audit**

**System Admin Pages:**
- [ ] `/admin/access/page.tsx` - Pattern A (useUser) ✅ CORRECT
- [ ] `/admin/ai/page.tsx` - Pattern A (useUser + authAdapter) ✅ CORRECT
- [ ] `/admin/mgmt/page.tsx` - Pattern A (useUser) ✅ CORRECT
- [x] `/admin/sys/kb/page.tsx` - **Pattern A (useUser) ✅ FIXED & VERIFIED WORKING (Jan 18, 2026)**
- [ ] `/admin/sys/chat/page.tsx` - Pattern C (placeholder) ⚠️ NEEDS UPDATE
- [ ] `/admin/sys/eval/page.tsx` - Pattern B (no checks) ⚠️ NEEDS UPDATE
- [ ] `/admin/sys/ws/page.tsx` - Unknown ⚠️ NEEDS AUDIT

**Organization Admin Pages:**
- [ ] `/admin/org/kb/page.tsx` - Unknown ⚠️ NEEDS AUDIT
- [ ] Other org admin pages - Unknown ⚠️ NEEDS AUDIT

**Workspace Admin Pages:**
- [ ] Workspace admin routes - Unknown ⚠️ NEEDS AUDIT

**Part B: UI/Layout Audit**

**For each admin page, document:**
- [ ] Header style (Material-UI components used, hierarchy)
- [ ] Breadcrumb implementation (if present)
- [ ] Page padding/margins (Box, Container, or custom)
- [ ] Use of collapse/expand components (Accordion, Collapse)
- [ ] Card/section layouts (Paper, Card, custom divs)
- [ ] Loading states (CircularProgress, Skeleton, custom)
- [ ] Error display patterns (Alert, Snackbar, custom)
- [ ] Action button placement (top-right, bottom, floating)
- [ ] Table/list patterns (DataGrid, Table, custom)
- [ ] Form layouts (spacing, grouping, validation display)

**Part C: Module Ownership Audit (NEW - Jan 21, 2026)**

**Action:** Identify orphan pages and propose correct module ownership.

**Discovered Issues:**
- 11 admin pages found in project-stack-template (should be 0)
- Several potential duplicates between project-stack and module templates
- Need to relocate orphans to: module-access, module-ai, module-mgmt, module-chat, module-kb
- One page (`/admin/org/page.tsx`) needs clarification: shell page or module-ws?

**Output:** `docs/plans/findings_admin-page-audit.md` (includes all three parts)

### Phase 2: Propose Standards (REQUIRES APPROVAL)

**Action:** Create comprehensive admin page standards document for review and approval.

**Part A: Authentication Standard** (already defined - Pattern A with useUser)

**Part B: UI/Layout Standards** (TO BE DEFINED)
### Phase 3: Create Templates (After Approval)

**Action:** Create standardized admin page templates based on approved standards from Phase 2.

**File:** `templates/_project-stack-template/docs/ADMIN-PAGE-TEMPLATE.tsx`

```typescript
/**
 * CORA Admin Page Template
 * 
 * Copy this template when creating new admin pages.
 * DO NOT deviate from this pattern without ADR approval.
 * 
 * Usage:
 * 1. Copy this file to your route location
 * 2. Update the imports for your module
 * 3. Update the authorization check (sys vs org)
 * 4. Update the component being rendered
 * 5. Delete this comment block
 */

"use client";

import React from "react";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { CircularProgress, Box, Alert } from "@mui/material";
// TODO: Import your admin component
// import { YourAdminComponent } from "@{{PROJECT_NAME}}/module-xyz";

export default function AdminPageRoute() {
  const { profile, loading, isAuthenticated } = useUser();

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Authentication check
  if (!isAuthenticated || !profile) {
    return (
      <Box p={4}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  // TODO: Choose ONE authorization check based on page type

  // OPTION A: System Admin Page
  const isSysAdmin = ['sys_owner', 'sys_admin'].includes(profile.sysRole || '');
  if (!isSysAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. System administrator role required.
        </Alert>
      </Box>
    );
  }

  // OPTION B: Organization Admin Page
  // const isOrgAdmin = ['org_owner', 'org_admin'].includes(profile.orgRole || '');
  // if (!isOrgAdmin) {
  //   return (
  //     <Box p={4}>
  //       <Alert severity="error">
  //         Access denied. Organization administrator role required.
  //       </Alert>
  //     </Box>
  //   );
  // }

  // TODO: Replace with your admin component
  return (
    <Box p={4}>
      <Alert severity="warning">
        Replace this with your admin component
      </Alert>
    </Box>
  );
}
```

### Phase 4: Update All Admin Pages (After Template Creation)

**Action:** Systematically update each page to use the standard pattern.

**Priority Order:**
1. **High Priority** - Pages that are broken or have errors
2. **Medium Priority** - Pages using deprecated patterns
3. **Low Priority** - Placeholder pages

**Update Checklist (per page):**
- [ ] Read current page implementation
- [ ] Identify what it does (if not obvious)
- [ ] Copy standard template
- [ ] Port necessary imports
- [ ] Port authorization logic
- [ ] Port component rendering
- [ ] Test page loads
- [ ] Test authentication (logged out)
- [ ] Test authorization (wrong role)
- [ ] Test success case (correct role)
- [ ] Update template

### Phase 5: Create ADR

**Action:** Document this as an architectural decision.

**File:** `docs/arch decisions/ADR-015-ADMIN-PAGE-AUTH-PATTERN.md`

**Contents:**
- Context: Current inconsistency problem
- Decision: Standard pattern (useUser with explicit checks)
- Rationale: Why this pattern over others
- Consequences: What this means for developers
- Compliance: How to enforce this standard

### Phase 6: Add Validation

**Action:** Create validator to enforce the standard.

**Tool:** `validation/admin-page-validator/`

**Checks:**
- ✅ All admin pages use `useUser()` from module-access
- ❌ No admin pages use `useSession()` from next-auth
- ✅ All admin pages have loading check
- ✅ All admin pages have authentication check
- ✅ All admin pages have authorization check
- ✅ All checks follow standard structure

**Integration:** Add to `validation/cora-validate.py` as new validator.

### Phase 7: Update Documentation

**Action:** Update developer guides.

**Files to Update:**
- `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md` - Add admin page section
- `README.md` - Link to admin page template
- `.clinerules` - Add admin page pattern rule

**New Documentation:**
- Create `docs/standards/standard_ADMIN-PAGE-PATTERN.md`
- Include examples of correct and incorrect patterns
- Include troubleshooting guide for common issues

---

## Rollout Strategy

### Option A: Big Bang (NOT RECOMMENDED)

Update all pages at once in a single PR.

**Pros:** Fast, complete
**Cons:** High risk, hard to test, merge conflicts

### Option B: Incremental (RECOMMENDED)

Update pages incrementally, module by module.

**Phase 1:** Fix broken pages (immediate)
- `/admin/sys/kb` (just fixed)
- Any other pages with errors

**Phase 2:** Update sys admin pages (sprint 1)
- `/admin/access`
- `/admin/ai`
- `/admin/mgmt`
- `/admin/sys/chat`
- `/admin/sys/eval`
- `/admin/sys/ws`

**Phase 3:** Update org admin pages (sprint 2)
- All `/admin/org/` routes

**Phase 4:** Update workspace admin pages (sprint 3)
- All workspace admin routes

**Phase 5:** Validation and documentation (sprint 4)
- Add validators
- Update documentation
- Create ADR

---

## Success Criteria

### Technical Criteria

- [ ] All admin pages use `useUser()` pattern
- [ ] Zero admin pages use `useSession()` 
- [ ] All admin pages have consistent structure
- [ ] Validator passes 100% compliance
- [ ] All admin pages have tests

### Developer Experience Criteria

- [ ] New developers can copy template without guidance
- [ ] Pattern is documented in ADR
- [ ] Violations caught by validation tools
- [ ] Common issues documented with solutions

### User Experience Criteria

- [ ] No SessionProvider errors
- [ ] Consistent loading states across all admin pages
- [ ] Consistent error messages
- [ ] Clear role requirement messaging

---

## Testing Strategy

### Unit Tests

**Each admin page should have:**
```typescript
describe('AdminPageRoute', () => {
  it('shows loading state while fetching user', () => {
    // Mock useUser with loading: true
    // Assert loading spinner shown
  });

  it('shows authentication error when not logged in', () => {
    // Mock useUser with isAuthenticated: false
    // Assert error message shown
  });

  it('shows authorization error for wrong role', () => {
    // Mock useUser with wrong role
    // Assert access denied message shown
  });

  it('renders admin component for authorized user', () => {
    // Mock useUser with correct role
    // Assert component rendered
  });
});
```

### Integration Tests

**Test flow:**
1. Navigate to admin page while logged out → redirect to login
2. Login with regular user → access denied
3. Login with admin user → page loads successfully

### E2E Tests

**Test scenarios:**
- All admin pages accessible to sys_owner
- All admin pages accessible to sys_admin
- All admin pages blocked for regular users
- All admin pages show consistent error messages

---

## Migration Guide

### For Developers

**When creating a new admin page:**
1. Copy `templates/_project-stack-template/docs/ADMIN-PAGE-TEMPLATE.tsx`
2. Update imports for your module
3. Choose sys admin or org admin authorization
4. Replace placeholder with your component
5. Test all authentication states
6. Run validation: `./validation/cora-validate.py --admin-pages`

**When updating an existing admin page:**
1. Review current implementation
2. Identify what it does (business logic)
3. Copy standard template
4. Port business logic to template structure
5. Test all authentication states
6. Run validation
7. Update template in toolkit

### Common Migration Patterns

**Pattern 1: useSession → useUser**
```typescript
// BEFORE
const { data: session } = useSession();
const apiClient = createAuthenticatedClient(session.accessToken);

// AFTER
const { profile, loading, isAuthenticated } = useUser();
// Hooks handle API client internally, no manual creation needed
```

**Pattern 2: No checks → useUser checks**
```typescript
// BEFORE
export default function AdminPage() {
  return <AdminComponent />;
}

// AFTER
export default function AdminPage() {
  const { profile, loading, isAuthenticated } = useUser();
  
  if (loading) return <CircularProgress />;
  if (!isAuthenticated) return <Alert>Not logged in</Alert>;
  if (!isSysAdmin) return <Alert>Access denied</Alert>;
  
  return <AdminComponent />;
}
```

---

## Risk Assessment

### Low Risk

- ✅ Pattern already proven in access, ai, mgmt pages
- ✅ useUser is part of CORA core (module-access)
- ✅ No external dependencies
- ✅ Easy to test

### Medium Risk

- ⚠️ Many pages need updating (time investment)
- ⚠️ Could introduce regressions if not tested properly
- ⚠️ Template needs to be maintained going forward

### High Risk

- ❌ None identified

---

## Future Enhancements

### Phase 2 (After Standardization)

**1. Higher-Order Component (HOC)**
Create a `withAdminAuth` HOC to reduce boilerplate:

```typescript
import { withAdminAuth } from "@{{PROJECT_NAME}}/module-access";

function MyAdminPage() {
  return <MyAdminComponent />;
}

export default withAdminAuth(MyAdminPage, {
  requiredRole: 'sys_admin', // or 'org_admin'
});
```

**2. Route-Level Middleware**
Move auth checks to Next.js middleware:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin/sys')) {
    // Check for sys_admin role
    // Return redirect if unauthorized
  }
}
```

**3. Declarative Auth**
Use file-based routing conventions:

```typescript
// admin/sys/kb/page.tsx
export const auth = {
  requiredRole: 'sys_admin',
  redirectTo: '/unauthorized',
};

export default function KBAdminPage() {
  // No auth checks needed - handled by framework
  return <KBAdminComponent />;
}
```

---

## References

- **ADR-007:** CORA Auth Shell Standard
- **ADR-010:** Cognito External IDP Strategy
- **Verified Fix (Jan 18, 2026):** KB admin page SessionProvider error resolved by switching from `useSession()` to `useUser()` pattern
- **Working Examples:** `/admin/access`, `/admin/ai`, `/admin/mgmt`, `/admin/sys/kb` (now fixed)
- **Template Location:** `templates/_modules-core/module-kb/routes/admin/sys/kb/page.tsx` (verified correct pattern)

## KB Admin Page Fix Details (January 18, 2026)

**Problem:** KB admin page crashed with "useSession must be wrapped in <SessionProvider />" error.

**Root Cause:** Page was using `useSession()` from next-auth/react, which requires SessionProvider wrapper. Other working admin pages use `useUser()` from module-access instead.

**Solution Applied:**
```typescript
// ❌ BEFORE (broken):
import { useSession } from 'next-auth/react';
import { createAuthenticatedClient } from '@{{PROJECT_NAME}}/api-client';
import { createKbModuleClient } from '@{{PROJECT_NAME}}/module-kb';

const { data: session } = useSession();
const kbClient = useMemo(() => {
  if (!session?.accessToken) return null;
  const authClient = createAuthenticatedClient(session.accessToken as string);
  return createKbModuleClient(authClient);
}, [session]);

// ✅ AFTER (working):
import { useUser } from '@{{PROJECT_NAME}}/module-access';

const { profile, loading, isAuthenticated } = useUser();

// Pattern A: Explicit auth checks
if (loading) return <CircularProgress />;
if (!isAuthenticated || !profile) return <Alert>Not logged in</Alert>;
const isSysAdmin = ['sys_owner', 'sys_admin'].includes(profile.sysRole || '');
if (!isSysAdmin) return <Alert>Access denied</Alert>;
```

**Result:** Page now loads successfully without SessionProvider error. Hooks handle API client creation internally, no manual `createAuthenticatedClient` needed.

**Template Status:** ✅ Template updated and verified at `templates/_modules-core/module-kb/routes/admin/sys/kb/page.tsx`

**Lesson Learned:** ALL admin pages should use Pattern A (useUser with explicit checks), NOT useSession(). This is now the proven, verified standard.

---

## Appendix: Admin Page Inventory

### System Admin Pages

| Path | Current Pattern | Status | Priority |
|------|----------------|--------|----------|
| `/admin/access` | useUser ✅ | Compliant | Low |
| `/admin/ai` | useUser ✅ | Compliant | Low |
| `/admin/mgmt` | useUser ✅ | Compliant | Low |
| `/admin/sys/kb` | **useUser ✅** | **FIXED & VERIFIED WORKING (Jan 18, 2026)** | Low |
| `/admin/sys/chat` | No checks ⚠️ | Needs Update | Medium |
| `/admin/sys/eval` | No checks ⚠️ | Needs Update | Medium |
| `/admin/sys/ws` | Unknown ⚠️ | Needs Audit | High |

### Organization Admin Pages

| Path | Current Pattern | Status | Priority |
|------|----------------|--------|----------|
| `/admin/org/kb` | Unknown ⚠️ | Needs Audit | High |
| TBD | TBD | TBD | TBD |

### Workspace Admin Pages

| Path | Current Pattern | Status | Priority |
|------|----------------|--------|----------|
| TBD | TBD | TBD | TBD |

---

## Implementation Timeline

| Phase | Duration | Effort | Dependencies |
|-------|----------|--------|--------------|
| Phase 1: Audit | 2 days | 1 dev | None |
| Phase 2: Template | 1 day | 1 dev | Phase 1 |
| Phase 3: Update Pages | 5 days | 1-2 devs | Phase 2 |
| Phase 4: ADR | 1 day | 1 dev | Phase 3 |
| Phase 5: Validation | 3 days | 1 dev | Phase 3 |
| Phase 6: Documentation | 2 days | 1 dev | Phase 4, 5 |

**Total:** ~14 days (2.8 weeks) with 1 developer

---

## Sign-Off

**Created By:** AI Agent (Cline)  
**Date:** January 18, 2026  
**Status:** PLAN ONLY - Not Yet Implemented  
**Next Action:** Review and approve this plan before implementation
