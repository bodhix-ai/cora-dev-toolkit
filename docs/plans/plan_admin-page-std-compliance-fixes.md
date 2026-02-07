# Admin Page Migration Execution Plan

**Created:** February 6, 2026 - Session 20  
**Updated:** February 7, 2026 - Session 21 (Fresh baseline)  
**Status:** In Progress

---

## Fresh Baseline (Feb 7, 2026)

### Validator Results
```
Auth Validation (ADR-019):
  Frontend (Admin Pages): 34 errors, 0 warnings
    - Sys Admin: 16 errors, 0 warnings
    - Org Admin: 16 errors, 0 warnings
```

### Current State
- **Non-compliant pages:** 34 (16 sys + 16 org)
- **Note:** This is higher than the original 13-page estimate because validator also checks:
  - Module route files (`packages/module-*/routes/admin/*`)
  - Web app route files (`apps/web/app/admin/*`)
  - Sub-pages like `/admin/sys/access/orgs/[id]/page.tsx`

### Session 21 Progress ✅ COMPLETE
- [x] Fixed `01_std_front_ADMIN-ARCH.md` standard - added differentiated patterns for sys/org/ws scopes
- [x] Fixed `OrgChatAdmin.tsx` template - uses `loading` from `useUser()` (not `useRole()`)
- [x] Fixed `SysChatAdmin.tsx` template - extracts token from authAdapter for sys tabs
- [x] Fixed `sys/chat/page.tsx` - converted to thin wrapper pattern
- [x] Created `OrgKbAdmin.tsx` component - extracted logic from org KB page
- [x] Created `SysKbAdmin.tsx` component - extracted logic from sys KB page
- [x] Created `SysAccessAdmin.tsx` component - extracted logic from sys access page
- [x] Created `SysAiAdmin.tsx` component - extracted logic from sys AI page
- [x] Created 3 admin index.ts files (module-access, module-ai, module-kb)
- [x] Synced all changes to test project - builds without TypeScript errors
- [x] Validation: 34→29 "admin not thin wrapper" errors (5 pages now passing)

### Components Status
- **Created in Session 21:** SysKbAdmin, OrgKbAdmin, SysAccessAdmin, SysAiAdmin
- **Already Existed:** OrgAccessAdmin, OrgAiAdmin, OrgChatAdmin, SysChatAdmin
- **Total Compliant:** 8 components
- **Missing:** WS (2), Mgmt (2), Eval (2), Voice (2) = ~8 components

### Key Insight
The high error count (34) includes both web app pages AND module route pages. Each module has its own routes in `packages/module-*/routes/admin/` that also need to follow the thin wrapper pattern.

---

## Execution Strategy

### Tier 1: Quick Wins - Use Existing Components (30 min)
**Goal:** Migrate pages that already have components

#### 1.1 Chat Pages (2 pages) ✅ COMPLETE
- [x] Component exists: `OrgChatAdmin` and `SysChatAdmin`
- [x] Fixed component hook patterns
- [x] `/admin/org/chat/page.tsx` - already uses component (was checking internal hooks)
- [x] `/admin/sys/chat/page.tsx` - converted to thin wrapper
- [x] Synced and validated

**Result:** Chat pages now passing validation (34→33 errors)

---

### Tier 2: Extract Logic - KB Pages (2-3 hours)
**Goal:** Convert existing page logic into components

#### 2.1 Org KB Page (1 hour) ✅ COMPLETE
- [x] Create `OrgKbAdmin` component in `module-kb/frontend/components/admin/`
- [x] Extract logic from `/admin/org/kb/page.tsx` (150+ lines)
- [x] Add @routes metadata
- [x] Update page to render component only
- [x] Export from module-kb package
- [x] Synced to test project

#### 2.2 Sys KB Page (1 hour) ✅ COMPLETE
- [x] Create `SysKbAdmin` component in `module-kb/frontend/components/admin/`
- [x] Extract logic from `/admin/sys/kb/page.tsx` (200+ lines)
- [x] Add @routes metadata
- [x] Update page to render component only
- [x] Export from module-kb package
- [x] Synced to test project

**Result:** 2 pages migrated (34→31 errors), ~350 lines moved to components

---

### Tier 3: Create Simple Components - Remaining Pages (3-4 hours)
**Goal:** Create new components for remaining pages

#### 3.1 Fix Broken Page - SysMgmtAdmin (1 hour)
- [ ] Create `SysMgmtAdmin` component in `module-mgmt/frontend/components/admin/`
- [ ] Integrate `SysMgmtModulesAdmin` functionality
- [ ] Add warming/monitoring/storage/cost placeholders
- [ ] Add @routes metadata
- [ ] Export from module-mgmt package
- [ ] Page already renders component, just needs component to exist

#### 3.2 Access Pages (30 min) ✅ COMPLETE
- [x] Org already exists: `OrgAccessAdmin`
- [x] Create `SysAccessAdmin` in `module-access/frontend/components/admin/`
- [x] Extract logic from `/admin/sys/access/page.tsx`
- [x] Add @routes metadata
- [x] Update page to thin wrapper
- [x] Create admin index.ts
- [x] Synced to test project

#### 3.3 AI Pages (30 min) ✅ COMPLETE
- [x] Org already exists: `OrgAiAdmin`
- [x] Create `SysAiAdmin` in `module-ai/frontend/components/admin/`
- [x] Extract logic from `/admin/sys/ai/page.tsx`
- [x] Add @routes metadata
- [x] Update page to thin wrapper
- [x] Create admin index.ts
- [x] Synced to test project

#### 3.4 WS Pages (1 hour)
- [ ] Create `OrgWsAdmin` in `module-ws/frontend/components/admin/`
- [ ] Create `SysWsAdmin` in `module-ws/frontend/components/admin/`
- [ ] Extract logic from both pages (~200 lines each)
- [ ] Add @routes metadata
- [ ] Update pages

#### 3.5 Mgmt Page (30 min)
- [ ] Create `OrgMgmtAdmin` in `module-mgmt/frontend/components/admin/`
- [ ] Extract logic from `/admin/org/mgmt/page.tsx`
- [ ] Add @routes metadata
- [ ] Update page

#### 3.6 Eval Pages (Optional - 1 hour)
- [ ] Create `OrgEvalAdmin` in `module-eval/frontend/components/admin/`
- [ ] Create `SysEvalAdmin` in `module-eval/frontend/components/admin/`
- [ ] Extract logic from both pages
- [ ] Add @routes metadata
- [ ] Update pages

#### 3.7 Voice Pages (Optional - 1 hour)
- [ ] Create `OrgVoiceAdmin` in `module-voice/frontend/components/admin/`
- [ ] Create `SysVoiceAdmin` in `module-voice/frontend/components/admin/`
- [ ] Extract logic from both pages
- [ ] Add @routes metadata
- [ ] Update pages

---

## Session Summary

### Session 21 ✅ COMPLETE (Feb 7, 2026)
**Focus:** Tier 1 + Tier 2 + Partial Tier 3

**Completed:**
1. Chat pages (30 min) - 2 pages migrated (34→33 errors)
2. KB pages (2 hours) - 2 pages migrated (33→31 errors)
3. Access sys page (30 min) - 1 page migrated (31→30 errors)
4. AI sys page (30 min) - 1 page migrated (30→29 errors)
5. Validation runs throughout - confirmed each page now compliant

**Result:** 5 of 34 pages compliant (15% improvement), 29 errors remaining

**Context Status:** 85% tokens used - recommend new session for remaining work

### Session 22 (Next - 3-4 hours)
**Focus:** Complete Tier 3 - Remaining WS, Mgmt, Eval, Voice pages

**Priority Order:**
1. **WS Pages** (1.5 hours) - Create admin directory structure + components
   - Must create `module-ws/frontend/components/admin/` directory
   - Create `OrgWsAdmin` and `SysWsAdmin` components
   - Update both web app pages to thin wrappers
   - Expected: 29→27 errors

2. **Mgmt Pages** (1.5 hours)
   - Create `OrgMgmtAdmin` component
   - Fix `SysMgmtAdmin` component (broken TypeScript)
   - Update both web app pages to thin wrappers
   - Expected: 27→25 errors

3. **Eval Pages** (1 hour - Optional)
   - Create `OrgEvalAdmin` and `SysEvalAdmin` components
   - Update web app pages to thin wrappers
   - Expected: 25→23 errors

4. **Voice Pages** (1 hour - Optional)
   - Create `OrgVoiceAdmin` and `SysVoiceAdmin` components
   - Update web app pages to thin wrappers
   - Expected: 23→21 errors

5. **Module Routes** (2-3 hours - If time permits)
   - Update `packages/module-*/routes/admin/*/page.tsx` files
   - These also need to become thin wrappers using same components
   - Expected: 21→0 errors (if all module routes fixed)

**Expected Outcome:** 25-29 errors remaining (depending on scope)

**Note:** Module route pages will also need attention to reach 0 errors. Each module has its own routes that must follow the thin wrapper pattern.

---

## Validation Checkpoints

After each tier:
1. Run `/validate.md` workflow
2. Check auth lifecycle errors (should decrease)
3. Verify pages load correctly in test project
4. Document error reduction in context file

---

## Component Export Pattern

Each component must be exported from its module's package.json:

```json
{
  "exports": {
    "./admin": {
      "types": "./frontend/components/admin/index.d.ts",
      "default": "./frontend/components/admin/index.ts"
    }
  }
}
```

And the component must be exported from the admin index:

```typescript
// module-kb/frontend/components/admin/index.ts
export { OrgKbAdmin } from './OrgKbAdmin';
export { SysKbAdmin } from './SysKbAdmin';
```

---

## Success Criteria

- [ ] All 16 module pages follow component delegation pattern
- [ ] All components have @routes metadata
- [ ] Auth lifecycle errors reduced from 3 to 0
- [ ] Validation confirms 100% compliance
- [ ] Test project loads all admin pages without errors