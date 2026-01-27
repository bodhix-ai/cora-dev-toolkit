# Sprint Plan: API Tracer, UI Library & TypeScript Validation S2

**Status:** 🟡 IN PROGRESS  
**Branch:** `fix/validation-errors-s2`  
**Initiative:** Error Remediation & Clean Baseline  
**Context:** [`memory-bank/context-error-remediation.md`](../../memory-bank/context-error-remediation.md)

---

## Sprint Goal

Eliminate validation errors across API Tracer, UI Library, and TypeScript validators to improve template quality and documentation accuracy.

**Targets:**
- 0 API Tracer errors (down from 13)
- 0 UI Library errors (Tailwind CSS usage in 12 files)
- 0 TypeScript errors (module reference issues with @{{PROJECT_NAME}} placeholder)

**Total:** 0 errors across all three validators

---

## Scope

### IN SCOPE

**Target Errors:** Validation errors across 3 validators

**Error Categories:**

1. **API Tracer (13 errors → 0)** ✅ COMPLETE
   - Route parameter naming mismatches (workspaceId vs wsId)
   - Fixed module-kb infrastructure, Lambda handlers, and frontend code
   - **Affected Modules:** module-kb
   - **Validation Standard:** `docs/standards/standard_LAMBDA-ROUTE-DOCSTRING.md`

2. **UI Library (1 error - 12 files with Tailwind CSS)**
   - Tailwind CSS class usage instead of Material-UI sx prop
   - Violations of CORA UI component standards
   - **Affected Files:** 12 components across module-access, module-mgmt, module-voice
   - **Fix:** Convert all Tailwind className props to Material-UI sx props

3. **TypeScript (30+ errors)**
   - Hardcoded project name references (`@ai-sec`) instead of placeholder (`@{{PROJECT_NAME}}`)
   - Missing module type declarations in newly created projects
   - **Affected Files:** Module frontend adapters, components, and admin cards
   - **Fix:** Update all hardcoded project references to use template placeholder

**Combined Impact:**
- Improves API route documentation and frontend-backend consistency
- Ensures UI component standards compliance (Material-UI only)
- Fixes template placeholder substitution for project names
- Enables TypeScript validation for newly created projects

### OUT OF SCOPE

- Admin Route standardization (91 errors) - deferred to another team
- Accessibility errors (55)
- Frontend compliance errors (42)
- Next.js routing errors (24)
- Database naming errors (6)
- Other validation warnings

---

## Implementation Steps

### Phase 1: Analysis & Setup ✅ COMPLETE
- [x] Run fresh validation to identify all errors
- [x] Document API Tracer errors (module-kb parameter naming)
- [x] Document UI Library errors (12 files with Tailwind CSS)
- [x] Document TypeScript errors (hardcoded @ai-sec references)
- [x] Review relevant standards (Lambda Route Docstring, UI Library)
- [x] Create sprint branch `fix/validation-errors-s2`
- [x] Update context file with Sprint 2 details

### Phase 2: API Tracer Fixes (13 errors) ✅ COMPLETE
- [x] Fixed module-kb parameter naming consistency (workspaceId → wsId)
- [x] Updated infrastructure (outputs.tf) with correct route patterns
- [x] Updated Lambda handlers (lambda_function.py) to extract wsId
- [x] Updated frontend API client (api.ts) with wsId parameters
- [x] Updated frontend components (EvalDetailPage.tsx) with wsId
- [x] Followed template-first workflow
- [x] Synced fixes to test project
- [x] Validated with API Tracer: 0 errors ✅

### Phase 3: UI Library Fixes (11 files with Tailwind CSS) - 73% COMPLETE
- [x] NavLink.tsx - Converted to Material-UI Box, Link, Tooltip
- [x] ResizeHandle.tsx - Converted to Material-UI Box with drag interaction
- [x] ProfileCard.tsx (191 lines) - Converted to Material-UI Card, Typography, Avatar
- [x] Sidebar.tsx (238 lines) - Converted to Material-UI Box, IconButton
- [x] OrgSelector.tsx (240 lines) - Converted to Material-UI Select, MenuItem, FormControl
- [x] Dashboard.tsx (255 lines) - Converted to Material-UI Grid, Button, Typography
- [x] CreateOrganization.tsx (300 lines) - Converted to Material-UI TextField, Select, Alert
- [x] SidebarUserMenu.tsx (406 lines) - Converted to Material-UI Box, Menu, MenuItem
- [ ] OrgDetailsTab.tsx (573 lines) - **NEXT SESSION** - Organization details management
- [ ] ModuleAdminDashboard.tsx (898 lines) - **NEXT SESSION** - Module admin dashboard
- [ ] module-voice admin page - **NEXT SESSION** - System admin page for voice
- [ ] Sync all 11 converted files to test project
- [ ] Validate with UI Library validator (Target: 0 errors)

**Progress:** 8 of 11 files converted (73%)  
**Remaining:** 3 large files (1,471+ lines combined)  
**Status:** Paused at 81% context usage - fresh session recommended

### Phase 4: TypeScript Fixes (30+ errors)
- [ ] Identify all files with hardcoded @ai-sec references
- [ ] Update to use @{{PROJECT_NAME}} placeholder
- [ ] Follow template-first workflow
- [ ] Sync fixes to test project
- [ ] Run `pnpm install` on test project
- [ ] Validate with TypeScript validator

**Pattern to Follow:**
```python
"""
Module Name - Lambda Function Name

Routes - Category:
- GET /actual/route/path - Description
- POST /actual/route/path - Description
- PUT /actual/route/path/{id} - Description
"""
```

### Phase 4: Template Updates & Testing
- [ ] Update affected files in templates (template-first workflow)
- [ ] Sync fixes to test project using fix-and-sync workflow
- [ ] Run API Tracer and UI Library validators on test project
- [ ] Run full validation suite to ensure no regressions

### Phase 5: Verification & Documentation
- [ ] Confirm 0 API Tracer errors in validation
- [ ] Confirm 0 UI Library errors in validation
- [ ] Update context file with completion notes
- [ ] Document any route patterns or standards established
- [ ] Prepare for Sprint 3

---

## Success Criteria

- [x] API Tracer validator shows 0 errors (down from 13) ✅
- [ ] UI Library validator shows 0 errors (12 files converted to Material-UI)
- [ ] TypeScript validator shows 0 errors (placeholder substitution fixed)
- [ ] All Lambda route parameters use consistent naming (wsId)
- [ ] All UI components use Material-UI sx prop (no Tailwind classes)
- [ ] All module references use @{{PROJECT_NAME}} placeholder
- [ ] TypeScript validator auto-runs `pnpm install` if node_modules missing
- [ ] No regressions introduced (other validator counts unchanged)
- [ ] Fixes applied to templates first, then synced to test project
- [ ] Changes documented in context file

---

## Technical Approach

### 1. API Tracer - Lambda Route Documentation Standard

**Required Format:**
```python
"""
{Module Name} - {Lambda Function Name}

Routes - {Category}:
- {METHOD} {/route/path} - {Description}
- {METHOD} {/route/path/{param}} - {Description}
"""
```

**Example:**
```python
"""
Access Module - Organizations Lambda

Routes - Organization Management:
- GET /orgs - List organizations for current user
- GET /orgs/{orgId} - Get organization details
- POST /orgs - Create new organization
- PUT /orgs/{orgId} - Update organization
- DELETE /orgs/{orgId} - Delete organization
"""
```

### API Tracer Fix Workflow

1. **Identify Mismatch** - Run API Tracer to see which Lambda has mismatch
2. **Check API Gateway** - Review actual routes configured in Terraform
3. **Update Docstring** - Update Lambda function docstring in template
4. **Sync & Test** - Sync to test project and re-validate
5. **Iterate** - Repeat until validator passes

### 2. UI Library Validation

**Standard:** CORA UI components must use Material-UI only (no Tailwind CSS)

**Common Issues:**
- Tailwind CSS classes in className props (use Material-UI sx prop instead)
- Missing Material-UI component imports
- Improper use of utility classes vs theme-based styling

**Conversion Pattern:**
```tsx
// ❌ WRONG - Tailwind classes
<div className="flex items-center gap-3 px-4 py-3">

// ✅ CORRECT - Material-UI sx prop
<Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 4, py: 3 }}>
```

**Fix Workflow:**

1. **Identify Violation** - Run UI Library validator to see files with Tailwind
2. **Convert to Material-UI** - Replace className with sx prop, use Box/Typography
3. **Handle Dark Mode** - Use theme.palette.mode conditionals
4. **Update Template** - Fix component in template first
5. **Sync & Test** - Sync to test project and re-validate
6. **Iterate** - Repeat until validator passes

### 3. TypeScript Validation

**Standard:** Template placeholders must be used for project-specific references

**Common Issues:**
- Hardcoded project names (`@ai-sec/api-client`) instead of placeholder
- Missing module type declarations due to incorrect imports

**Conversion Pattern:**
```tsx
// ❌ WRONG - Hardcoded project name
import { apiClient } from '@ai-sec/api-client';
import type { ModuleConfig } from '@ai-sec/shared-types';

// ✅ CORRECT - Template placeholder
import { apiClient } from '@{{PROJECT_NAME}}/api-client';
import type { ModuleConfig } from '@{{PROJECT_NAME}}/shared-types';
```

**Fix Workflow:**

1. **Identify Hardcoded References** - Find all `@ai-sec` or other project names
2. **Replace with Placeholder** - Update to `@{{PROJECT_NAME}}`
3. **Update Template** - Fix in template first
4. **Sync & Test** - Sync to test project
5. **Run pnpm install** - Install dependencies to resolve types
6. **Validate** - Run TypeScript validator

---

## Template-First Workflow

All fixes follow this process:

1. **Fix in Template** - Update Lambda file in `templates/_modules-*/*/backend/`
2. **Sync to Test Project** - Use `scripts/sync-fix-to-project.sh` to copy to test project
3. **Verify** - Run API Tracer validation on test project
4. **Iterate** - Repeat until error is resolved

---

## Validation Commands

**API Tracer validation:**
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit
python3 validation/api-tracer/api_tracer_validator.py --stack-path <test-project-stack-path> --infra-path <test-project-infra-path>
```

**UI Library validation:**
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit
./validation/ui-library-validator/validate_ui_library.sh <test-project-stack-path>
```

**Full validation:**
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit
python3 validation/cora-validate.py project <test-project-stack-path> --format text
```

---

## Dependencies

**Completed Prerequisites:**
- ✅ TypeScript Error Remediation S1 - Eliminated 46 TypeScript errors
- ✅ WS Plugin Architecture S1/S2 - Fixed plugin type system
- ✅ Admin Standardization S3a - Fixed module infrastructure

**Blocking Issues:** None

---

## Notes

**API Tracer:**
- API Tracer errors are documentation issues, not functional bugs
- However, accurate route documentation is critical for:
  - API testing and validation
  - Developer onboarding and understanding
  - Future refactoring and maintenance
  - Compliance with CORA standards
- Focus on accuracy and completeness of route documentation

**UI Library:**
- UI Library errors ensure consistent component usage across the platform
- Maintaining UI standards improves:
  - User experience consistency
  - Accessibility compliance
  - Component reusability
  - Design system adherence

**Combined Sprint Rationale:**
- Both validators have small error counts (7 + 2 = 9 total)
- Both are template quality improvements, not functional changes
- Efficient to address together in single sprint
- Achieves faster progress toward 0-error baseline

---

**Conversion Pattern Established:**
- Replace Tailwind `className` with Material-UI `sx` prop
- Use theme-aware dark mode: `theme.palette.mode === 'dark'`
- Convert layout classes to Box/Grid components
- Convert form elements to TextField/Select/Button
- Maintain responsive design with MUI breakpoints
- Preserve all functionality and accessibility
- Use consistent color schemes across dark/light modes

**Next Session Priorities:**
1. Complete remaining 3 UI Library files (1,471+ lines)
   - OrgDetailsTab.tsx (573 lines)
   - ModuleAdminDashboard.tsx (898 lines)
   - module-voice admin page
2. Sync all 11 converted files to test project
3. Run UI Library validation → Target: 0 errors
4. Fix TypeScript placeholder issues (30+ @ai-sec → @{{PROJECT_NAME}})
5. Run TypeScript validation → Target: 0 errors
6. Sprint S2 complete

---

**Created:** January 26, 2026  
**Last Updated:** January 26, 2026 (Session 1 complete - API Tracer ✅, UI Library 73%)
