# Sprint Plan: Validation Errors S4

**Status:** 🟡 IN PROGRESS  
**Branch:** `fix/validation-errors-s4`  
**Initiative:** Error Remediation & Clean Baseline  
**Context:** [`memory-bank/context-error-remediation.md`](../../memory-bank/context-error-remediation.md)  
**Created:** January 27, 2026

---

## Sprint Goal

Eliminate 35 validation errors across Next.js Routing, Admin Auth, Audit Columns, Workspace Plugin, and TypeScript validators to continue progress toward a clean project baseline.

**Targets:**
- Next.js Routing: 20 → 0 errors
- Admin Auth: 3 → 0 errors
- Audit Column: 1 → 0 error
- Workspace Plugin: 2 → 0 errors
- TypeScript: 9 → 0 errors

**Achievement Goal:** 35 errors eliminated (35 → 0, 100% reduction)

---

## Scope

### IN SCOPE (Priority Order)

**Target Errors:** 35 validation errors across 5 validators

**Error Categories (Prioritized):**

1. **Next.js Routing (20 errors) - HIGHEST PRIORITY**
   - All 20 errors: Missing parent route `apps/web/app/admin/page.tsx`
   - Issue: Admin child routes exist but parent route missing
   - **Affected Routes:** `/admin/org/*`, `/admin/sys/*`
   - **Fix:** Create missing admin parent route file
   - **Impact:** Enables proper Next.js routing hierarchy

2. **Admin Auth (3 errors) - HIGH PRIORITY**
   - Property naming errors: `organization.name` vs `orgName`, `organization.id` vs `orgId`
   - **Affected Files:** 
     - `apps/web/app/admin/org/access/page.tsx` (line 105)
     - `apps/web/app/admin/org/ai/page.tsx` (lines 119, 127)
   - **Fix:** Update property references to match ADR-016 standards
   - **Impact:** Compliance with org admin auth patterns

3. **Audit Column (1 error) - MEDIUM PRIORITY**
   - Missing audit columns on `chat_sessions` table
   - **Affected File:** `packages/module-chat/db/schema/*.sql`
   - **Fix:** Add audit columns (created_at, updated_at, created_by, updated_by)
   - **Impact:** Database consistency with ADR-015

4. **Workspace Plugin (2 errors) - MEDIUM PRIORITY**
   - Modules not using workspace-plugin architecture
   - **Affected Modules:** module-voice, module-eval
   - **Issue:** No files using `useWorkspacePlugin` from workspace-plugin
   - **Fix:** Integrate workspace-plugin or document exemption
   - **Impact:** Compliance with ADR-017

5. **TypeScript (9 errors) - LOWEST PRIORITY**
   - Module import errors and property issues
   - **Affected Files:**
     - `module-kb/frontend/hooks/useWorkspaceKB.ts` (workspace-plugin import)
     - `module-ws/components/CreateEvaluationDialog.tsx` (module-eval import, KbDocument properties)
   - **Fix:** Resolve import paths and type definitions
   - **Impact:** Type safety and build success

### OUT OF SCOPE (Deferred)

- **Database Naming (5 errors)** - Deferred as "API standards" priority
  - Table naming violations (pluralization)
  - Index naming violations
  - Will be addressed in future sprint focusing on API/database standards
- Admin Route errors (51) - Separate initiative
- Schema Validator (10 errors) - Configuration issue, not code errors
- All validation warnings

---

## Implementation Steps

### Phase 1: Next.js Routing Fixes (20 errors) - Est. 30-45 min

#### Step 1.1: Create Admin Parent Route

**File to Create:** `templates/_project-stack-template/apps/web/app/admin/page.tsx`

**Actions:**
- [ ] Create admin parent route page component
- [ ] Add proper layout and navigation structure
- [ ] Include links to org-level and sys-level admin sections
- [ ] Follow Next.js 13+ app router patterns

**Expected Output:** Single file creation resolves all 20 routing errors

---

### Phase 2: Admin Auth Fixes (3 errors) - Est. 15-20 min

#### Step 2.1: Fix Property Naming in Admin Pages

**Files to Update:**
- [ ] `templates/_modules-core/module-access/routes/admin/org/access/page.tsx` (line 105)
  - Change `organization.name` → `organization.orgName`
- [ ] `templates/_modules-core/module-ai/routes/admin/org/ai/page.tsx` (lines 119, 127)
  - Change `organization.name` → `organization.orgName`
  - Change `organization.id` → `organization.orgId`

**Expected Output:** 3 errors resolved, ADR-016 compliance achieved

---

### Phase 3: Audit Column Fix (1 error) - Est. 20-30 min

#### Step 3.1: Add Audit Columns to chat_sessions Table

**File to Update:** `templates/_modules-core/module-chat/db/schema/*.sql`

**Actions:**
- [ ] Locate chat_sessions table schema file
- [ ] Add audit columns following ADR-015 pattern:
  - `created_at TIMESTAMPTZ DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ DEFAULT NOW()`
  - `created_by UUID REFERENCES auth.users(id)`
  - `updated_by UUID REFERENCES auth.users(id)`
- [ ] Add trigger for `updated_at` auto-update

**Expected Output:** 1 error resolved, database consistency improved

---

### Phase 4: Workspace Plugin Integration (2 errors) - Est. 30-60 min

#### Step 4.1: Investigate Module Requirements

**Actions:**
- [ ] Review module-voice and module-eval for workspace context usage
- [ ] Determine if workspace-plugin integration is needed or exemption appropriate
- [ ] Check ADR-017 for exemption criteria

#### Step 4.2: Implement Fix (Option A or B)

**Option A: Integrate workspace-plugin**
- [ ] Add `useWorkspacePlugin` imports to relevant components
- [ ] Update components to use workspace context from plugin
- [ ] Test workspace context access

**Option B: Document Exemption**
- [ ] If modules don't need workspace context, document exemption
- [ ] Update validator configuration to exclude exempted modules

**Expected Output:** 2 errors resolved or properly exempted

---

### Phase 5: TypeScript Fixes (9 errors) - Est. 45-90 min

#### Step 5.1: Fix Module Import Errors

**Files to Update:**
- [ ] Fix `@ai-sec/shared/workspace-plugin` import in `module-kb/frontend/hooks/useWorkspaceKB.ts`
  - Update import path or tsconfig.json paths
- [ ] Fix `@ai-sec/module-eval` import in `module-ws/components/CreateEvaluationDialog.tsx`
  - Update import path or package.json references

#### Step 5.2: Fix KbDocument Type Issues

**File:** `module-ws/components/CreateEvaluationDialog.tsx` (lines 319-320)

**Actions:**
- [ ] Add `document` property to `KbDocument` type definition
- [ ] OR update component to use correct property name
- [ ] Verify type consistency across module-kb and module-ws

**Expected Output:** 9 errors resolved, type safety restored

---

### Phase 6: Template Updates & Testing

- [ ] All fixes applied to templates (template-first workflow)
- [ ] Sync fixes to test project using fix-and-sync workflow
- [ ] Run validation suite on test project
- [ ] Verify all 5 validators pass

---

### Phase 7: Verification & Documentation

- [ ] Confirm 0 errors across all 5 targeted validators
- [ ] Update context file with Sprint S4 completion
- [ ] All fixes committed to branch fix/validation-errors-s4
- [ ] Ready for Sprint S5 (Database Naming + remaining errors)

---

## Success Criteria

- [ ] Next.js Routing validator shows 0 errors (down from 20)
- [ ] Admin Auth validator shows 0 errors (down from 3)
- [ ] Audit Column validator shows 0 errors (down from 1)
- [ ] Workspace Plugin validator shows 0 errors (down from 2)
- [ ] TypeScript validator shows 0 errors (down from 9)
- [ ] **Total: 35 errors eliminated**
- [ ] No regressions introduced (other validator counts unchanged)
- [ ] Fixes applied to templates first, then synced to test project
- [ ] Changes documented in context file

---

## Technical Approach

### 1. Next.js Routing - App Router Parent Routes

**Required Pattern:**
```tsx
// apps/web/app/admin/page.tsx
export default function AdminPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <nav>
        <Link href="/admin/org">Organization Admin</Link>
        <Link href="/admin/sys">System Admin</Link>
      </nav>
    </div>
  );
}
```

**Key Points:**
- Parent route must exist for child routes to be valid
- Layout inheritance from parent to children
- Navigation structure for admin sections

### 2. Admin Auth - Property Naming

**Pattern:**
```tsx
// ❌ WRONG
<Typography>{organization.name}</Typography>
<div data-org-id={organization.id}>

// ✅ CORRECT
<Typography>{organization.orgName}</Typography>
<div data-org-id={organization.orgId}>
```

**Reference:** ADR-016 - Org Admin Page Authorization

### 3. Audit Columns - Database Schema

**Pattern:**
```sql
-- Add to table creation
created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
created_by UUID REFERENCES auth.users(id),
updated_by UUID REFERENCES auth.users(id)

-- Add trigger for auto-update
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Reference:** ADR-015 - Module Entity Audit Columns

### 4. Workspace Plugin - Module Integration

**Pattern:**
```tsx
// Component using workspace context
import { useWorkspacePlugin } from '@{PROJECT}/shared/workspace-plugin';

export function MyComponent() {
  const { workspaceId, workspaceName } = useWorkspacePlugin();
  // ... use workspace context
}
```

**Reference:** ADR-017 - WS Plugin Architecture

### 5. TypeScript - Module Imports

**Pattern:**
```json
// tsconfig.json - paths configuration
{
  "compilerOptions": {
    "paths": {
      "@{PROJECT}/shared/*": ["./apps/shared/*"],
      "@{PROJECT}/module-*": ["./packages/module-*/frontend"]
    }
  }
}
```

---

## Template-First Workflow

All fixes follow this process:

1. **Fix in Template** - Update file in `templates/_modules-*/` or `templates/_project-stack-template/`
2. **Sync to Test Project** - Use `scripts/sync-fix-to-project.sh` to copy to test project
3. **Verify** - Run validators on test project
4. **Iterate** - Repeat until error is resolved

---

## Validation Commands

**Full validation:**
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit
python3 validation/cora-validate.py project ~/code/bodhix/testing/test-access/ai-sec-stack --format text
```

**Individual validators:**
```bash
# Next.js Routing
npx ts-node validation/nextjs-routing-validator/index.ts ~/code/bodhix/testing/test-access/ai-sec-stack

# Admin Auth
python3 validation/admin-auth-validator/validator.py ~/code/bodhix/testing/test-access/ai-sec-stack

# Audit Column
python3 validation/audit-column-validator/validator.py ~/code/bodhix/testing/test-access/ai-sec-stack

# Workspace Plugin
npx ts-node validation/workspace-plugin-validator/index.ts ~/code/bodhix/testing/test-access/ai-sec-stack

# TypeScript
cd ~/code/bodhix/testing/test-access/ai-sec-stack && pnpm run type-check
```

---

## Dependencies

**Completed Prerequisites:**
- ✅ TypeScript Error Remediation S1 - Eliminated 46 TypeScript errors
- ✅ API Tracer & UI Library S2 - Eliminated 13 API Tracer + 12 UI Library errors
- ✅ Accessibility & Frontend S3 - Eliminated 58 accessibility + 2 frontend errors

**Blocking Issues:** None

---

## Notes

**Sprint Rationale:**
- Focuses on structural and compliance issues before API standards work
- Next.js routing is foundational - must be fixed for proper app structure
- Admin auth compliance ensures consistent security patterns
- Audit columns provide data tracking foundation
- Workspace plugin integration ensures module architecture compliance
- TypeScript fixes restore type safety

**Deferred to S5:**
- Database Naming (5 errors) - Part of broader API standards initiative
- Will be addressed alongside API response formatting and naming conventions

---

## Session Log

### Session 1 (Jan 27, 2026) - Plan Creation

**Sprint Setup:**
- Created Sprint S4 branch `fix/validation-errors-s4`
- Created plan file with prioritized scope
- Updated context file with S4 details

**Prioritized Scope:**
1. Next.js Routing (20 errors)
2. Admin Auth (3 errors)
3. Audit Column (1 error)
4. Workspace Plugin (2 errors)
5. TypeScript (9 errors)

**Deferred:** Database Naming (5 errors) as "API standards" priority

**Next Session:**
- Begin Phase 1: Next.js Routing fixes
- Create admin parent route page
- Sync to test project and validate

---

**Created:** January 27, 2026  
**Last Updated:** January 27, 2026  
**Status:** 🟡 IN PROGRESS - Sprint S4 started