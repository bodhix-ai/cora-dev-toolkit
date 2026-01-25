# Plan: Admin Page Standardization - Sprint 2 (URL & Navigation)

**Status:** ✅ COMPLETE (Code Implementation)  
**Created:** January 22, 2026  
**Completed:** January 22, 2026  
**Priority:** HIGH  
**Depends On:** [Sprint 1 - Auth & Breadcrumb Foundation](completed/plan_admin-page-standardization-s1.md)

## Sprint 1 Completion Summary

✅ **Sprint 1 COMPLETE** (January 22, 2026) - See: `docs/plans/completed/plan_admin-page-standardization-s1.md`

**Achievements:**
- ✅ Authentication pattern standardization (Pattern A with useUser)
- ✅ 14 pages fixed to use Pattern A authentication
- ✅ Breadcrumb standardization across all admin pages
- ✅ ADR-015 created (Admin Page Auth Pattern + Breadcrumb Navigation)
- ✅ admin-auth-validator created and enforcing compliance
- ✅ 19 pages validated, 0 errors, 100% compliance
- ✅ `/admin/platform` deprecated directory deleted

**Foundation Established:**
- Pattern A authentication is the standard
- Breadcrumb navigation patterns defined (2-level and 3-level)
- Validation tooling in place
- All admin pages have proper auth checks

---

## Sprint 2 Scope

Sprint 1 testing revealed **critical issues** that require expansion of the standardization effort:

### 1. URL Structure Standardization (MAJOR)

**Problem:** Inconsistent URL patterns create confusion and break deep linking.

**Current State:**
- Mixed 2-part and 3-part URLs: `/admin/access` vs `/admin/sys/kb`
- No clear standard for sys admin pages
- Unclear hierarchy

**Goal:** Migrate ALL admin pages to 3-part URL standard: `/admin/{scope}/{module}`

**Impact:**
- Clearer URL structure
- Consistent navigation
- Better deep linking support
- Easier to understand scope (sys vs org)

### 2. Missing Admin Pages (CREATE NEW)

**Problem:** Testing revealed 404 errors for expected admin pages.

**Missing Pages:**
- `/admin/sys/voice` - Sys admin voice configuration (404 error)
- `/admin/org/access` - Org admin user management (does not exist)

**Requirements:**
- Create proper routes with Pattern A authentication
- Add breadcrumbs following ADR-015 standard
- Integrate with existing navigation

### 3. Org Admin Page Scope Fixes (CRITICAL)

**Problem:** Some org admin pages show sys admin content instead of org-scoped content.

**Issues:**
- Wrong scope: Org admin pages rendering sys admin components
- Data leakage: Org admins seeing system-wide data
- Role confusion: Unclear which scope is active

**Goal:** Ensure all `/admin/org/*` pages show org-scoped content only.

### 4. Comprehensive End-to-End Testing

**Problem:** No systematic testing of all admin pages.

**Goal:** 100% coverage of all admin pages with documented test results.

**Test Coverage:**
- Navigation (all pages reachable)
- Breadcrumbs (correct labels, hrefs)
- Auth boundaries (correct role enforcement)
- Scope correctness (sys vs org content)

---

## Issues Discovered from Sprint 1 Testing

❌ **Breadcrumb testing failed due to:**
1. Some admin pages unreachable (404s)
2. Some org admin pages show sys admin pages
3. URL inconsistency causes navigation confusion

❌ **Missing pages found:**
- Sys admin voice config page (referenced in nav, but 404)
- Org admin access page (needed for user management)

❌ **Scope issues found:**
- Org admin pages should show org-scoped content, but some show sys content
- Need clear separation between sys and org admin interfaces

---

## Implementation Plan

### Phase 1: URL Structure Migration ✅ TEMPLATES COMPLETE!

**Status:** Template migrations complete (January 22, 2026). Test project updates pending.

**Goal:** Migrate all 2-part URLs to 3-part standard: `/admin/{scope}/{module}`

**Tasks:**

#### 1.1 Move Sys Admin Routes - TEMPLATES ✅
- [x] Move `/admin/access` → `/admin/sys/access` ✅
  - [x] Update route file location in template ✅
  - [x] Update module.config.yaml (`templates/_modules-core/module-access/`) ✅
  - [x] Delete old route directory in template ✅
  - [ ] Update test project YAML config (manual or recreate)
  - [ ] Sync route to test project
  - [ ] Test navigation flow in test project
- [x] Move `/admin/ai` → `/admin/sys/ai` ✅
  - [x] Update route file location in template ✅
  - [x] Update module.config.yaml (`templates/_modules-core/module-ai/`) ✅
  - [x] Delete old route directory in template ✅
  - [ ] Update test project YAML config (manual or recreate)
  - [ ] Sync route to test project
  - [ ] Test navigation flow in test project
- [x] Move `/admin/mgmt` → `/admin/sys/mgmt` ✅
  - [x] Update route file location in template ✅
  - [x] Update module.config.yaml (`templates/_modules-core/module-mgmt/`) ✅
  - [x] Delete old route directory in template ✅
  - [ ] Update test project YAML config (manual or recreate)
  - [ ] Sync route to test project
  - [ ] Test navigation flow in test project
- [x] Move `/admin/organizations` → `/admin/sys/orgs` ✅
  - [x] Update route file location in template ✅
  - [x] Delete old route directory in template ✅
  - [ ] **Note:** No module config (navigation link, not admin card)
  - [ ] Sync route to test project
  - [ ] Update hardcoded nav links (if any)
  - [ ] Test navigation flow in test project

#### 1.2 Update Navigation Components
- [x] **Templates auto-updated via module.config.yaml** ✅
  - Admin cards now use new paths from module configs
  - New projects will have correct URLs automatically
- [ ] Verify no hardcoded old URLs in template components
- [ ] Check for hardcoded URLs in navigation files
- [ ] Update any deep links in admin components (if found)
- [ ] Grep templates for old URL patterns

#### 1.3 Update Module Templates ✅
- [x] Update module-access route references ✅
  - Updated: `module.config.yaml` admin_card path
- [x] Update module-ai route references ✅
  - Updated: `module.config.yaml` admin_card path
- [x] Update module-mgmt route references ✅
  - Updated: `module.config.yaml` admin_card path
- [x] module-kb already uses `/admin/sys/kb` ✅ (no change needed)
- [x] module-ws already uses `/admin/sys/ws` ✅ (no change needed)
- [x] module-eval already uses `/admin/sys/eval` ✅ (no change needed)
- [x] module-chat already uses `/admin/sys/chat` ✅ (no change needed)
- [x] module-voice already uses `/admin/sys/voice` ✅ (no change needed)

#### 1.4 Test All Navigation Flows (PENDING - Requires Test Project Update)
- [ ] **Option 1:** Recreate test project with updated templates
  - Fastest way to get all changes applied
  - Run: `./scripts/create-cora-project.sh --input setup.config.test-admin.yaml`
- [ ] **Option 2:** Manual sync to existing test project
  - Update YAML config for each module
  - Sync route files from templates
  - Delete old route directories
  - Restart dev server
- [ ] Test sys admin dashboard → all sys pages
- [ ] Test org admin dashboard → all org pages
- [ ] Test breadcrumb navigation (clicking breadcrumb links)
- [ ] Test direct URL navigation (deep links)
- [ ] Verify no 404s

**Validation:** All admin URLs follow `/admin/{scope}/{module}` pattern.

**Template Status:** ✅ COMPLETE - All future projects will use 3-part URLs  
**Test Project Status:** ⏳ PENDING - Needs recreation or manual sync

---

### Phase 2: Create Missing Admin Pages ✅ COMPLETE

#### 2.1 Create Sys Admin Voice Config Page ✅

**Location:** `templates/_modules-functional/module-voice/routes/admin/sys/voice/page.tsx`

**Status:** ✅ COMPLETE

**Completed:**
- [x] Created route file with Pattern A authentication
- [x] Connected to existing `SysVoiceConfigPage` component
- [x] Added breadcrumbs: "Sys Admin > Voice"
- [x] Route properly integrated with module-voice
- [x] Follows ADR-015 authentication pattern

**Component Structure:**
```typescript
"use client";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { SysVoiceConfigPage } from "@{{PROJECT_NAME}}/module-voice";

export default function SysVoiceRoute() {
  const { profile, loading, isAuthenticated } = useUser();
  
  // Pattern A auth checks
  // ...
  
  return <SysVoiceConfigPage />;
}
```

#### 2.2 Create Org Admin Access Page (User Management) ✅

**Location:** `templates/_modules-core/module-access/routes/admin/org/access/page.tsx`

**Status:** ✅ COMPLETE

**Completed:**
- [x] Created route file with Pattern A authentication
- [x] Created `OrgAccessPage` component with full user management UI
- [x] Added breadcrumbs: "Org Admin > Access"
- [x] Implemented user management features:
  - View all users in organization (both roles)
  - Edit/delete/invite users (org_owner only)
  - Read-only mode for org_admin
- [x] Exported component from module-access index
- [x] Follows ADR-015 authentication pattern

**Functionality:**

**Org Owner Capabilities:**
- View all users in current organization
- Edit user details (email, name, role)
- Delete users from organization
- Invite new users to organization

**Org Admin Capabilities:**
- View all users in current organization (read-only)
- No edit or delete permissions

**Scope:**
- Current organization only (NOT listing all organizations)
- Filter by current user's `profile.orgId`
- Display org-scoped user data

**Component Structure:**
```typescript
"use client";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { OrgAccessPage } from "@{{PROJECT_NAME}}/module-access";

export default function OrgAccessRoute() {
  const { profile, loading, isAuthenticated } = useUser();
  
  // Pattern A auth checks for org admin
  // ...
  
  return <OrgAccessPage orgId={profile.orgId} isOwner={profile.orgRole === 'org_owner'} />;
}
```

**OrgAccessPage Component Requirements:**
- User list table (DataGrid or MUI Table)
- Edit/Delete actions (org owner only)
- View-only mode (org admin)
- Filter by orgId (current org only)
- Proper role-based rendering

---

### Phase 3: Fix Org Admin Scope Issues ✅ COMPLETE

**Goal:** Ensure all `/admin/org/*` pages show org-scoped content, not sys admin content.

**Status:** ✅ COMPLETE - All scope issues fixed!

#### 3.1 Audit Results ✅

**Pages Audited:** 4 of 4 existing org admin routes (100% coverage)

**Routes Audited:**
- [x] `/admin/org/kb` (module-kb)
- [x] `/admin/org/eval` (module-eval)
- [x] `/admin/org/ws` (module-ws workspace list)
- [x] `/admin/org/ws/[id]` (module-ws workspace detail)

#### 3.2 Scope Issues Identified ✅

**Critical Finding:** ALL 4 pages incorrectly allowed sys admin access!

**Problem Pattern Found:**
```typescript
// WRONG - Checking for both sys admin AND org admin roles
const isSysAdmin = ["sys_owner", "sys_admin"].includes(profile.sysRole || "");
const isOrgAdmin = ["org_owner", "org_admin"].includes(profile.orgRole || "");

if (!isOrgAdmin && !isSysAdmin) {
  // deny access
}
```

**Why This Was Wrong:**
- Org admin pages are org-scoped (filtered by orgId)
- Sys admin pages are system-wide (no org filtering)
- Sys admins should use sys admin pages, not org admin pages
- Mixing roles creates scope confusion and security boundaries

#### 3.3 Scope Issues Fixed ✅

**Fixed All 4 Pages:**
- [x] `/admin/org/kb` - Removed sys admin role check ✅
- [x] `/admin/org/eval` - Removed sys admin role check ✅
- [x] `/admin/org/ws` - Removed sys admin role check ✅
- [x] `/admin/org/ws/[id]` - Removed sys admin role check ✅

**Correct Pattern Applied:**
```typescript
// CORRECT - Only check org roles for org admin pages
const isOrgAdmin = profile.orgRole === "org_owner" || 
                   profile.orgRole === "org_admin";

if (!isOrgAdmin) {
  // deny access
}
```

#### 3.4 Org Admin Auth Verification ✅

- [x] All `/admin/org/*` routes check for `org_owner` or `org_admin` role ONLY
- [x] All org admin components filter data by `profile.orgId`
- [x] No org admin pages allow sys admin access
- [x] Clear role boundaries established

**Additional Finding:**
- `/admin/org/chat` route does not exist (module-chat has no admin routes)
- Similar to voice issue from Phase 2
- Should be addressed in future sprint if needed

**Validation:** ✅ All org admin pages now properly scoped with correct role checks!

---

### Phase 4: Comprehensive End-to-End Testing

**Goal:** Systematically test all admin pages with documented results.

#### 4.1 Create Admin Page Test Matrix

**Test Matrix Structure:**

| Page | URL | Scope | Auth Role | Navigation | Breadcrumbs | Content Scope | Status |
|------|-----|-------|-----------|------------|-------------|---------------|--------|
| Access Admin | `/admin/sys/access` | Sys | sys_admin+ | ✅/❌ | ✅/❌ | System-wide | ✅/❌ |
| AI Admin | `/admin/sys/ai` | Sys | sys_admin+ | ✅/❌ | ✅/❌ | System-wide | ✅/❌ |
| ... | ... | ... | ... | ... | ... | ... | ... |

**Test Cases per Page:**
1. **Navigation Test:** Page reachable from admin dashboard
2. **Breadcrumb Test:** Breadcrumbs present, labels correct, hrefs work
3. **Auth Test:** Correct role required (sys_admin for sys pages, org_admin for org pages)
4. **Scope Test:** Content shows correct scope (system-wide vs org-scoped)
5. **Deep Link Test:** Direct URL navigation works

#### 4.2 Test All Sys Admin Pages

**Pages to Test:**
- [ ] `/admin/sys/access` - Access control management
- [ ] `/admin/sys/ai` - AI provider enablement
- [ ] `/admin/sys/mgmt` - Platform management
- [ ] `/admin/sys/orgs` - Organization management
- [ ] `/admin/sys/kb` - Knowledge base config
- [ ] `/admin/sys/chat` - Chat config
- [ ] `/admin/sys/eval` - Eval config
- [ ] `/admin/sys/ws` - Workspace config
- [ ] `/admin/sys/voice` - Voice config (NEW)

**For Each Page:**
- [ ] Navigate from sys admin dashboard
- [ ] Verify breadcrumbs (labels, hrefs)
- [ ] Verify auth (sys_admin+ required)
- [ ] Verify content scope (system-wide)
- [ ] Test direct URL access
- [ ] Document results in test matrix

#### 4.3 Test All Org Admin Pages

**Pages to Test:**
- [ ] `/admin/org/access` - User management (NEW)
- [ ] `/admin/org/kb` - KB config
- [ ] `/admin/org/chat` - Chat config
- [ ] `/admin/org/eval` - Eval config
- [ ] `/admin/org/ws/[id]` - Workspace detail

**For Each Page:**
- [ ] Navigate from org admin dashboard
- [ ] Verify breadcrumbs (labels, hrefs)
- [ ] Verify auth (org_admin+ required)
- [ ] **CRITICAL:** Verify content scope (org-scoped, NOT system-wide)
- [ ] Test direct URL access
- [ ] Document results in test matrix

#### 4.4 Document All Findings
- [ ] Create comprehensive test results document
- [ ] List all discovered issues (404s, wrong content, broken navigation)
- [ ] Prioritize issues (critical, high, medium, low)
- [ ] Create fix plan for each issue

#### 4.5 Fix and Retest
- [ ] Fix all critical issues
- [ ] Fix all high priority issues
- [ ] Retest failed cases
- [ ] Update test matrix with results
- [ ] Verify 100% pass rate

**Validation:** All admin pages pass all test cases with 0 failures.

---

## Admin Page Test Matrix

### System Admin Pages

| Page | URL | Auth Role | Navigation | Breadcrumbs | Content Scope | Status |
|------|-----|-----------|------------|-------------|---------------|--------|
| **Access Admin** | `/admin/sys/access` | sys_admin+ | [ ] Reachable from dashboard<br>[ ] Card link correct | [ ] Present<br>[ ] Labels: "Sys Admin > Access"<br>[ ] Hrefs work | [ ] System-wide users<br>[ ] All organizations visible | [ ] PASS / FAIL |
| **AI Admin** | `/admin/sys/ai` | sys_admin+ | [ ] Reachable from dashboard<br>[ ] Card link correct | [ ] Present<br>[ ] Labels: "Sys Admin > AI"<br>[ ] Hrefs work | [ ] System-wide AI config<br>[ ] All providers visible | [ ] PASS / FAIL |
| **Management Admin** | `/admin/sys/mgmt` | sys_admin+ | [ ] Reachable from dashboard<br>[ ] Card link correct | [ ] Present<br>[ ] Labels: "Sys Admin > Management"<br>[ ] Hrefs work | [ ] System-wide monitoring<br>[ ] Platform-level data | [ ] PASS / FAIL |
| **Organizations Admin** | `/admin/sys/orgs` | sys_admin+ | [ ] Reachable from dashboard<br>[ ] Card link correct | [ ] Present<br>[ ] Labels: "Sys Admin > Organizations"<br>[ ] Hrefs work | [ ] All organizations<br>[ ] System-wide org list | [ ] PASS / FAIL |
| **KB Config** | `/admin/sys/kb` | sys_admin+ | [ ] Reachable from dashboard<br>[ ] Card link correct | [ ] Present<br>[ ] Labels: "Sys Admin > KB"<br>[ ] Hrefs work | [ ] System-wide KB config<br>[ ] All KB settings | [ ] PASS / FAIL |
| **Chat Config** | `/admin/sys/chat` | sys_admin+ | [ ] Reachable from dashboard<br>[ ] Card link correct | [ ] Present<br>[ ] Labels: "Sys Admin > Chat"<br>[ ] Hrefs work | [ ] System-wide chat config | [ ] PASS / FAIL |
| **Eval Config** | `/admin/sys/eval` | sys_admin+ | [ ] Reachable from dashboard<br>[ ] Card link correct | [ ] Present<br>[ ] Labels: "Sys Admin > Eval"<br>[ ] Hrefs work | [ ] System-wide eval config | [ ] PASS / FAIL |
| **Workspace Config** | `/admin/sys/ws` | sys_admin+ | [ ] Reachable from dashboard<br>[ ] Card link correct | [ ] Present<br>[ ] Labels: "Sys Admin > Workspaces"<br>[ ] Hrefs work | [ ] System-wide WS config | [ ] PASS / FAIL |
| **Voice Config (NEW)** | `/admin/sys/voice` | sys_admin+ | [ ] Reachable from dashboard<br>[ ] Card link correct | [ ] Present<br>[ ] Labels: "Sys Admin > Voice"<br>[ ] Hrefs work | [ ] System-wide voice config | [ ] PASS / FAIL |

### Organization Admin Pages

| Page | URL | Auth Role | Navigation | Breadcrumbs | Content Scope | Status |
|------|-----|-----------|------------|-------------|---------------|--------|
| **Access (User Mgmt) (NEW)** | `/admin/org/access` | org_admin+ | [ ] Reachable from dashboard<br>[ ] Card link correct | [ ] Present<br>[ ] Labels: "Org Admin > Access"<br>[ ] Hrefs work | [ ] **Current org users ONLY**<br>[ ] Filtered by orgId<br>[ ] Edit/delete for org_owner | [ ] PASS / FAIL |
| **KB Config** | `/admin/org/kb` | org_admin+ | [ ] Reachable from dashboard<br>[ ] Card link correct | [ ] Present<br>[ ] Labels: "Org Admin > KB"<br>[ ] Hrefs work | [ ] **Current org KB ONLY**<br>[ ] Filtered by orgId | [ ] PASS / FAIL |
| **Chat Config** | `/admin/org/chat` | org_admin+ | [ ] Reachable from dashboard<br>[ ] Card link correct | [ ] Present<br>[ ] Labels: "Org Admin > Chat"<br>[ ] Hrefs work | [ ] **Current org chat ONLY**<br>[ ] Filtered by orgId | [ ] PASS / FAIL |
| **Eval Config** | `/admin/org/eval` | org_admin+ | [ ] Reachable from dashboard<br>[ ] Card link correct | [ ] Present<br>[ ] Labels: "Org Admin > Eval"<br>[ ] Hrefs work | [ ] **Current org eval ONLY**<br>[ ] Filtered by orgId | [ ] PASS / FAIL |
| **Workspace Detail** | `/admin/org/ws/[id]` | org_admin+ | [ ] Reachable from WS list<br>[ ] Navigation correct | [ ] Present<br>[ ] Labels: "Org Admin > Workspaces > [Name]"<br>[ ] Hrefs work | [ ] **Current org workspace ONLY**<br>[ ] Filtered by orgId | [ ] PASS / FAIL |

### Deep Link Tests

| URL | Expected Behavior | Auth Redirect | Status |
|-----|-------------------|---------------|--------|
| `/admin/sys/access` | Load sys access page (if sys_admin) | Redirect to login if not authenticated | [ ] PASS / FAIL |
| `/admin/org/access` | Load org access page (if org_admin) | Redirect to login if not authenticated | [ ] PASS / FAIL |
| All admin URLs | No 404 errors | Proper auth enforcement | [ ] PASS / FAIL |

---

## Org Admin Access Page - Detailed Requirements

### Route Location
`templates/_modules-core/module-access/routes/admin/org/access/page.tsx`

### Component Location
`templates/_modules-core/module-access/admin-components/OrgAccessPage.tsx`

### User Roles & Permissions

**Org Owner (`org_role = 'org_owner'`):**
- ✅ View all users in current organization
- ✅ Edit user details (email, name, role)
- ✅ Delete users from organization
- ✅ Invite new users to organization

**Org Admin (`org_role = 'org_admin'`):**
- ✅ View all users in current organization (read-only)
- ❌ No edit permissions
- ❌ No delete permissions
- ❌ No invite permissions

### Data Scope
- **Current organization only** (filtered by `profile.orgId`)
- **NOT system-wide** (should NOT show users from other orgs)
- **NOT all organizations** (should NOT list all orgs)

### UI Components

**User List Table:**
- User email
- User name
- User role (org_owner, org_admin, org_member)
- Actions column (edit, delete - org owner only)

**Actions:**
- Edit user button (org owner only)
- Delete user button (org owner only)
- Invite user button (org owner only)

**View-Only Mode (Org Admin):**
- Table shows same data
- No action buttons visible
- Info message: "View-only access. Contact your organization owner to manage users."

### Integration

**Navigation:**
- Add "Access Management" card to org admin dashboard
- Card href: `/admin/org/access`
- Card description: "Manage users in your organization"

**Breadcrumbs:**
- Labels: "Org Admin > Access"
- Hrefs: `/admin/org` → `/admin/org/access`

**Authentication:**
- Pattern A with useUser
- Check for `org_owner` or `org_admin` role
- Load org users filtered by `profile.orgId`

---

## Success Criteria

✅ **URL Structure:**
- All admin pages use 3-part URL structure: `/admin/{scope}/{module}`
- No 2-part URLs remain (`/admin/access`, `/admin/ai`, etc.)
- URL structure is consistent and predictable

✅ **Page Accessibility:**
- All admin pages reachable (0 404 errors)
- Navigation cards link to correct URLs
- Deep links work correctly

✅ **Org Admin Scope:**
- All `/admin/org/*` pages show org-scoped content
- No org admin pages show sys admin content
- Org admins see only their organization's data

✅ **Navigation:**
- All navigation flows work correctly
- Breadcrumbs match URL structure
- Clicking breadcrumbs navigates to correct pages

✅ **Missing Pages Created:**
- `/admin/sys/voice` page exists and works
- `/admin/org/access` page exists and works

✅ **Testing:**
- 100% admin page test coverage
- All test cases pass
- Test matrix complete with results

✅ **Validation:**
- admin-auth-validator still passes (0 errors)
- No regressions from URL migration
- All auth boundaries properly enforced

---

## Migration Strategy

### Step 1: Create Missing Pages First
- Create `/admin/sys/voice` route and component
- Create `/admin/org/access` route and component
- Test new pages in isolation

### Step 2: URL Migration (One at a Time)
- Migrate one route at a time
- Update route, navigation, and breadcrumbs together
- Test after each migration
- Avoid breaking existing functionality

### Step 3: Fix Org Admin Scope Issues
- Audit org admin pages
- Fix scope issues
- Test with org admin user

### Step 4: Comprehensive Testing
- Run full test matrix
- Document results
- Fix any failures
- Retest until 100% pass rate

### Step 5: Update Documentation
- Update ADR-015 with URL structure standard
- Update admin page template with 3-part URLs
- Document new pages

---

## Risks & Mitigations

### Risk: Breaking Existing Navigation
- **Mitigation:** Update route, navigation, and breadcrumbs atomically
- **Mitigation:** Test each migration before moving to next

### Risk: Org Admin Data Leakage
- **Mitigation:** Audit all org admin queries for orgId filtering
- **Mitigation:** Test with real org admin user, verify scope

### Risk: Test Matrix Too Large
- **Mitigation:** Automate where possible (navigation, breadcrumbs)
- **Mitigation:** Focus on critical test cases first

### Risk: Regression in Auth Checks
- **Mitigation:** Run admin-auth-validator after each change
- **Mitigation:** Keep Pattern A authentication unchanged

---

## Timeline Estimate

| Phase | Duration | Notes |
|-------|----------|-------|
| Phase 1: URL Migration | 2-3 days | 4 routes × (route + nav + breadcrumbs + test) |
| Phase 2: Missing Pages | 2-3 days | 2 pages × (route + component + UI + test) |
| Phase 3: Org Admin Fixes | 1-2 days | Audit + fix scope issues |
| Phase 4: Testing | 2-3 days | Full test matrix + fixes |
| **Total** | **7-11 days** | ~1.5-2 weeks with 1 developer |

---

## References

- **Sprint 1 Plan:** `docs/plans/completed/plan_admin-page-standardization-s1.md`
- **Audit Findings:** `docs/plans/completed/findings_admin-page-audit.md`
- **ADR-015:** Admin Page Auth Pattern + Breadcrumb Navigation
- **Validator:** `validation/admin-auth-validator/`
- **Admin Card Pattern:** `docs/standards/standard_ADMIN-CARD-PATTERN.md`

---

## Sign-Off

**Created By:** AI Agent (Cline)  
**Date:** January 22, 2026  
**Status:** 🔴 IN PROGRESS  
**Next Action:** Begin Phase 1 - URL Structure Migration
