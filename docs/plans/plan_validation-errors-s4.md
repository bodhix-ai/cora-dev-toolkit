# Sprint Plan: Validation Errors S4

**Status:** ✅ COMPLETE  
**Branch:** `fix/validation-errors-s4`  
**Initiative:** Error Remediation & Clean Baseline  
**Context:** [`memory-bank/context-error-remediation.md`](../../memory-bank/context-error-remediation.md)  
**Created:** January 27, 2026  
**Completed:** January 27, 2026

---

## Sprint Goal

Eliminate Next.js Routing and Admin Auth validation errors to establish proper route structure and authentication patterns.

**Actual Achievement:**
- Next.js Routing: 20 → 0 errors ✅
- Admin Auth: 5 → 0 errors ✅  
- **Total: 25 errors eliminated (100% of achievable scope)**

**Scope Changes:**
- Audit Column work moved to Sprint S5 (8 non-compliant tables discovered, not 1 error)
- Workspace Plugin removed from scope (handled by WS Plugin Architecture initiative - see `memory-bank/context-ws-plugin-architecture.md`)
- TypeScript errors deferred to future sprint

---

## Scope

### COMPLETED

**Errors Fixed:** 25 validation errors across 2 validators

1. **Next.js Routing (20 errors) - ✅ COMPLETE**
   - Created 4 route pages to resolve missing parent routes
   - Deleted orphaned `/org` directory
   - All routing hierarchy issues resolved

2. **Admin Auth (5 errors) - ✅ COMPLETE**
   - Fixed deprecated useSession → useUser pattern
   - Fixed property naming (orgName, orgId) 
   - Added authentication checks
   - ADR-016 compliance achieved

### DEFERRED TO OTHER INITIATIVES

- **Audit Column (8 non-compliant tables)** → Sprint S5 (dedicated sprint created)
- **Workspace Plugin (2 errors)** → WS Plugin Architecture initiative (see `memory-bank/context-ws-plugin-architecture.md`)
- **TypeScript (9 errors)** → Future sprint
- **Database Naming (5 errors)** → API standards initiative

---

## Implementation Summary

### Phase 1: Next.js Routing (20 → 0 errors) ✅

**Files Created:**
1. `templates/_project-stack-template/apps/web/app/admin/page.tsx`
   - Admin dashboard with role-based routing
   - Redirects sys admins to sys panel, org admins to org panel

2. `templates/_project-stack-template/apps/web/app/auth/page.tsx`
   - Session expired handler
   - Clears stale auth state, redirects to signin
   - Helps prevent redirect loops on token expiration

3. `templates/_project-stack-template/apps/web/app/admin/sys/access/orgs/page.tsx`
   - Parent route for org detail pages
   - Redirects to `/admin/sys/access`

4. `templates/_project-stack-template/apps/web/app/admin/org/access/page.tsx`
   - Moved from `/org/settings/page.tsx`
   - Organization member/invite management
   - Relocated to proper `/admin/org` structure

**Files Deleted:**
- Removed orphaned `/org` directory (replaced by `/admin/org/access`)

**Result:** Next.js Routing validator ✅ PASSED (0 errors)

---

### Phase 2: Admin Auth (5 → 0 errors) ✅

**Files Modified:**

1. `templates/_project-stack-template/apps/web/app/admin/page.tsx`
   - Replaced deprecated useSession with useUser hook
   - Updated to use CORA auth pattern (ADR-016)
   - Fixed role checking to use profile.sysRole and organizations

2. `templates/_project-stack-template/apps/web/app/admin/sys/access/orgs/page.tsx`
   - Added useUser hook
   - Added proper authentication check (isAuthenticated && profile)
   - Added loading and auth state handling

3. `templates/_modules-core/module-ai/routes/admin/org/ai/page.tsx`
   - Fixed property naming: organization.name → orgName
   - Fixed property naming: organization.id → orgId
   - ADR-016 compliance achieved

**Result:** Admin Auth validator ✅ PASSED (0 errors)

---

### Phase 3: Audit Column (scope change)

**Discovery:** 
- Validator found 8 non-compliant tables, not 1 error as originally estimated
- Requires comprehensive schema updates across 4 modules
- Estimated 3-4 hours of focused work

**Action:**
- Created comprehensive Sprint S5 plan: `docs/plans/plan_audit-columns-s5.md`
- Documented all 8 tables with specific compliance requirements
- Deferred to dedicated sprint for proper implementation

**Affected Tables:**
- chat_sessions, ws_members, workspaces (incomplete soft delete)
- orgs, org_members, user_sessions (missing audit columns)
- kb_bases, kb_docs (missing indexes/triggers)

---

### Phase 4: Workspace Plugin (removed from scope)

**Discovery:**
- Workspace Plugin architecture is already being addressed by separate WS Plugin Architecture initiative
- Active work documented in `memory-bank/context-ws-plugin-architecture.md`
- Sprint S3 of that initiative currently active

**Action:**
- Removed from Sprint S4 scope
- Validation errors (module-voice, module-eval) will be resolved by WS Plugin Architecture initiative
- No action needed in Sprint S4

---

## Success Criteria

- [x] Next.js Routing validator shows 0 errors (down from 20) ✅
- [x] Admin Auth validator shows 0 errors (down from 5) ✅
- [x] Fixes applied to templates first, then synced to test project
- [x] Changes documented and committed to branch
- [x] Sprint S5 plan created for Audit Column work
- [x] No regressions introduced

**Achievement: 25/25 errors fixed (100% of revised scope)**

---

## Template-First Workflow

All fixes followed this process:

1. **Fix in Template** - Updated files in `templates/_modules-*/` or `templates/_project-stack-template/`
2. **Sync to Test Project** - Used `scripts/sync-fix-to-project.sh` to copy to test project
3. **Verify** - Ran validators on test project
4. **Iterate** - Repeated until error resolved

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
python3 validation/cora-validate.py project <path> --format text 2>&1 | grep -A 10 "Next.js Routing"

# Admin Auth
python3 validation/cora-validate.py project <path> --format text 2>&1 | grep -A 15 "Admin Auth"
```

---

## Session Log

### Session 1 (Jan 27, 2026) - Phase 1 Complete

**Work Completed:**
- Created Sprint S4 branch and plan
- Implemented Next.js Routing fixes (20 → 0 errors)
- Created 4 route pages, deleted orphaned directory
- Committed: `7973cc6` "fix(routing): Phase 1 complete"

### Session 2 (Jan 27, 2026) - Phase 2 Complete

**Work Completed:**
- Implemented Admin Auth fixes (5 → 0 errors)
- Updated 3 template files with proper auth patterns
- Synced all changes to test-access project
- Committed: `9d459f9` "fix(auth): Phase 2 complete"

### Session 3 (Jan 27, 2026) - Audit Column Discovery

**Discovery:**
- Ran Audit Column validator
- Found 8 non-compliant tables (not 1 error)
- Created comprehensive Sprint S5 plan
- Committed: Sprint S5 plan document

### Session 4 (Jan 27, 2026) - Sprint Closure

**Actions:**
- Removed Workspace Plugin from scope (separate initiative)
- Updated plan to mark as COMPLETE
- Final status: 25/25 errors fixed (100% of achievable scope)

---

## Related Work

**Sprint S5 (Next):**
- Plan: `docs/plans/plan_audit-columns-s5.md`
- Focus: Audit Column Compliance (8 tables)
- Estimated: 3-4 hours

**WS Plugin Architecture Initiative:**
- Context: `memory-bank/context-ws-plugin-architecture.md`
- Current Sprint: S3 (Active)
- Handles: Workspace Plugin validator errors

---

**Created:** January 27, 2026  
**Last Updated:** January 27, 2026  
**Status:** ✅ COMPLETE - 25/25 errors fixed (100% of achievable scope)