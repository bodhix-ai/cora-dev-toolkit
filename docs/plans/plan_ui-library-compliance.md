# UI Library Compliance Plan

**Status**: 📋 PLANNED  
**Priority**: MEDIUM (Quality & Standards Compliance)  
**Sprint Goal**: Convert all remaining Tailwind CSS components to Material-UI for 100% CORA UI library compliance  
**Branch**: `feature/ui-library-compliance`  
**Parent Plan**: `plan_module-eval-config.md` (Material-UI conversion work)  
**Estimated Duration**: 1-2 sessions (~2-4 hours)

---

## Executive Summary

This plan addresses the remaining 12 files in core modules (module-access and module-mgmt) that still use Tailwind CSS instead of Material-UI. All functional modules (module-eval, module-voice, module-ws, module-kb, module-chat) are already 100% compliant. This work ensures consistent UI styling across the entire CORA platform.

**Background:**
- Sessions 145-148 converted module-eval (20 files) and module-voice (7 files) to Material-UI
- Validation in Session 148 revealed 12 remaining violations in core modules
- All violations are in module-access (11 files) and module-mgmt (1 file)

---

## Current Status

### Validation Results (Session 148)

**Overall:** ❌ 12 files with Tailwind violations (down from 39 baseline)

**By Module:**
- ✅ module-eval: 0 violations (was: 18) - **100% COMPLETE**
- ✅ module-voice: 0 violations (was: 7) - **100% COMPLETE**
- ✅ module-ws: 0 violations - **100% COMPLETE**
- ✅ module-kb: 0 violations - **100% COMPLETE**
- ✅ module-chat: 0 violations - **100% COMPLETE**
- ✅ module-ai: 0 violations - **100% COMPLETE**
- ❌ module-access: **11 violations** (core module)
- ❌ module-mgmt: **1 violation** (core module)

**Material-UI Adoption:**
- Total files with MUI: 195 files
- Conversion progress: 27 of 39 violations fixed (69% complete)
- Remaining work: 12 files (31%)

---

## Scope

### Files to Convert

#### Module-Access (11 files)

**Layout Components (6 files):**
1. `frontend/components/layout/Dashboard.tsx` - Main dashboard wrapper/layout
2. `frontend/components/layout/Sidebar.tsx` - Navigation sidebar
3. `frontend/components/layout/NavLink.tsx` - Navigation link component
4. `frontend/components/layout/ResizeHandle.tsx` - Sidebar resize handle
5. `frontend/components/layout/SidebarUserMenu.tsx` - User menu in sidebar

**Admin Components (1 file):**
6. `frontend/components/admin/OrgDetailsTab.tsx` - Organization details tab

**Onboarding Components (1 file):**
7. `frontend/components/onboarding/CreateOrganization.tsx` - Org creation wizard

**Organization Components (3 files):**
8. `frontend/components/org/InviteMemberDialog.tsx` - Member invitation dialog
9. `frontend/components/org/OrgMembersList.tsx` - Organization members list
10. `frontend/components/org/OrgSelector.tsx` - Organization selector dropdown

**Profile Components (1 file):**
11. `frontend/components/profile/ProfileCard.tsx` - User profile card

#### Module-Mgmt (1 file)

**Admin Components (1 file):**
1. `frontend/components/ModuleAdminDashboard.tsx` - Module administration dashboard

---

## Conversion Strategy

### Phase 1: Layout Components (Priority 1)
**Files:** 6 files (Dashboard, Sidebar, NavLink, ResizeHandle, SidebarUserMenu)  
**Impact:** High - affects all pages in the application  
**Estimated Time:** 1-1.5 hours

**Approach:**
- These components form the core navigation structure
- Must maintain existing functionality (collapsible sidebar, routing, user menu)
- Convert in order of dependency (Dashboard → Sidebar → NavLink → ResizeHandle → SidebarUserMenu)

### Phase 2: Org & Admin Components (Priority 2)
**Files:** 5 files (OrgDetailsTab, CreateOrganization, InviteMemberDialog, OrgMembersList, OrgSelector)  
**Impact:** Medium - affects org admin workflows  
**Estimated Time:** 30-45 minutes

**Approach:**
- Convert admin components first (OrgDetailsTab)
- Then onboarding (CreateOrganization)
- Finally org management (InviteMemberDialog, OrgMembersList, OrgSelector)

### Phase 3: Profile & Mgmt Components (Priority 3)
**Files:** 2 files (ProfileCard, ModuleAdminDashboard)  
**Impact:** Low - specific feature areas  
**Estimated Time:** 15-30 minutes

**Approach:**
- ProfileCard - user profile display
- ModuleAdminDashboard - module management UI

---

## Conversion Patterns

### Common Tailwind → Material-UI Mappings

**Layout:**
- `className="flex"` → `sx={{ display: 'flex' }}`
- `className="flex-col"` → `sx={{ flexDirection: 'column' }}`
- `className="items-center"` → `sx={{ alignItems: 'center' }}`
- `className="justify-between"` → `sx={{ justifyContent: 'space-between' }}`
- `className="gap-2"` → `sx={{ gap: 2 }}`

**Spacing:**
- `className="p-4"` → `sx={{ p: 2 }}` (note: MUI uses 8px scale)
- `className="px-4 py-2"` → `sx={{ px: 2, py: 1 }}`
- `className="m-4"` → `sx={{ m: 2 }}`

**Colors:**
- `className="bg-white"` → `sx={{ bgcolor: 'background.paper' }}`
- `className="text-gray-900"` → `sx={{ color: 'text.primary' }}`
- `className="text-gray-500"` → `sx={{ color: 'text.secondary' }}`
- `className="border-gray-200"` → `sx={{ borderColor: 'divider' }}`

**Typography:**
- `className="text-sm"` → `<Typography variant="body2">`
- `className="text-lg font-medium"` → `<Typography variant="h6">`
- `className="font-bold"` → `<Typography fontWeight="bold">`

**Components:**
- Custom divs → `<Box>`, `<Card>`, `<Paper>`
- Custom buttons → `<Button>`, `<IconButton>`
- Custom inputs → `<TextField>`, `<Select>`
- Custom modals → `<Dialog>`, `<Drawer>`

---

## Validation

### Pre-Conversion Checklist
- [ ] Review `docs/standards/standard_CORA-UI-LIBRARY.md`
- [ ] Understand existing component functionality
- [ ] Identify all Tailwind classes used in target files

### Post-Conversion Checklist
- [ ] Run UI library validator: `./scripts/validate-ui-library.sh templates/`
- [ ] Verify 0 Tailwind violations
- [ ] Verify all Material-UI components imported correctly
- [ ] Check for TypeScript errors (expected in template context)

### Testing Checklist
- [ ] Sync converted files to test project
- [ ] Verify layout components render correctly
- [ ] Test navigation (sidebar, links, routing)
- [ ] Test org management workflows
- [ ] Test user profile display
- [ ] Verify responsive behavior
- [ ] Check accessibility (keyboard navigation, ARIA labels)

---

## Success Criteria

### Must Have
1. ✅ All 12 files converted from Tailwind → Material-UI
2. ✅ UI library validator passes with 0 violations
3. ✅ All components render correctly in test project
4. ✅ No regressions in functionality
5. ✅ Consistent styling with CORA design system

### Should Have
1. ✅ Improved accessibility with Material-UI components
2. ✅ Better theme integration (dark mode support)
3. ✅ Cleaner, more maintainable code

### Nice to Have
1. Enhanced animations/transitions with Material-UI
2. Better mobile responsiveness
3. Performance improvements

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Layout components break navigation | High | Low | Test thoroughly in test project, have rollback plan |
| Sidebar resize functionality lost | Medium | Low | Ensure ResizeHandle maintains drag behavior |
| Styling inconsistencies | Medium | Medium | Use Material-UI theme consistently, test in browser |
| Components look different | Low | High | Expected - Material-UI provides professional styling |

---

## Related Documentation

**Standards:**
- [CORA UI Library Standard](../standards/standard_CORA-UI-LIBRARY.md)
- [Material-UI Documentation](https://mui.com/material-ui/)

**Previous Work:**
- [Module-Eval Config Plan](./plan_module-eval-config.md) - Sessions 145-148 Material-UI conversion

**Validation:**
- `scripts/validate-ui-library.sh` - UI library compliance validator

---

## Session Tracking

### Session 1: Layout Components Conversion
**Date**: TBD  
**Duration**: TBD  
**Focus**: Convert Phase 1 - Layout components (6 files)

**Planned:**
- [ ] Convert Dashboard.tsx
- [ ] Convert Sidebar.tsx
- [ ] Convert NavLink.tsx
- [ ] Convert ResizeHandle.tsx
- [ ] Convert SidebarUserMenu.tsx
- [ ] Run validator on module-access

**Expected Result:** 5 violations resolved

---

### Session 2: Org/Admin/Profile Components Conversion
**Date**: TBD  
**Duration**: TBD  
**Focus**: Convert Phase 2 & 3 - Remaining components (6 files)

**Planned:**
- [ ] Convert OrgDetailsTab.tsx
- [ ] Convert CreateOrganization.tsx
- [ ] Convert InviteMemberDialog.tsx
- [ ] Convert OrgMembersList.tsx
- [ ] Convert OrgSelector.tsx
- [ ] Convert ProfileCard.tsx
- [ ] Convert ModuleAdminDashboard.tsx (module-mgmt)
- [ ] Run validator on all templates
- [ ] Verify 0 violations

**Expected Result:** All 12 violations resolved, 100% compliance

---

## Completion Criteria

### Sprint Complete When:
1. ✅ All 12 files converted to Material-UI
2. ✅ UI library validator passes (0 violations)
3. ✅ All components tested in test project
4. ✅ No functional regressions
5. ✅ Documentation updated
6. ✅ Ready for PR review

### PR Checklist:
- [ ] All template files updated
- [ ] Validation passing (0 violations)
- [ ] Test results documented
- [ ] Screenshots of converted components
- [ ] CHANGELOG updated
- [ ] Context files updated
- [ ] PR description complete

---

**Status**: 📋 PLANNED  
**Last Updated**: January 18, 2026  
**Branch**: feature/ui-library-compliance (to be created)  
**Files Remaining**: 12 (module-access: 11, module-mgmt: 1)  
**Estimated Completion**: 1-2 sessions (~2-4 hours)
