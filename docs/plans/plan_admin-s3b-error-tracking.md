# Admin Standardization S3b - Error Tracking Plan

**Created:** January 28, 2026  
**Test Project:** ~/code/bodhix/test-admin/ai-mod-stack  
**Baseline:** 61 validation errors (down from 72)

## Overview

This plan tracks the remaining validation errors discovered after initial template fixes in Sprint 3b Session 14.

---

## Error Categories & Priorities

### Priority 0: Critical Template Fixes (18 errors)

#### 1. TypeScript Property Errors (15 errors)
**Issue:** Chat admin components use `user` property that doesn't exist on `UserContextType`  
**Root Cause:** Phase 1 fix changed `idToken` to incorrect property  
**Estimated Time:** 30 minutes

**Files Affected:**
- `module-chat/frontend/components/admin/OrgAnalyticsTab.tsx:56`
- `module-chat/frontend/components/admin/OrgSessionsTab.tsx:66`
- `module-chat/frontend/components/admin/OrgSettingsTab.tsx:36`
- `module-chat/frontend/components/admin/SysAnalyticsTab.tsx:59`
- `module-chat/frontend/components/admin/SysSessionsTab.tsx:60`
- `module-chat/frontend/components/admin/SysSettingsTab.tsx:36`
- Plus 9 more files

**Fix Required:**
1. Read `templates/_project-stack-template/packages/shared-ui/hooks/useUser.tsx`
2. Identify correct UserContextType property (likely `profile`, `session`, or `isAuthenticated`)
3. Update all 15 component files with correct property

**Status:** 🔴 Not Started

---

#### 2. API Response Transformation (2 errors)
**Issue:** RPC functions return snake_case JSON without camelCase transformation  
**Estimated Time:** 20 minutes

**Errors:**
- `chat-session/lambda_function.py:1204` - `handle_sys_get_analytics()`
- `chat-session/lambda_function.py:1540` - `handle_org_get_analytics()`

**Fix Required:**
```python
# Current (WRONG):
analytics = common.rpc('get_sys_chat_analytics')
return common.success_response(analytics)  # Returns snake_case

# Fixed (CORRECT):
analytics = common.rpc('get_sys_chat_analytics')
return common.success_response({
    'totalSessions': analytics['totalSessions'],
    'totalMessages': analytics['totalMessages'],
    'activeSessions': {
        'last24Hours': analytics['activeSessions']['last24Hours'],
        'last7Days': analytics['activeSessions']['last7Days'],
        'last30Days': analytics['activeSessions']['last30Days']
    }
})
```

**Status:** 🔴 Not Started

---

#### 3. Schema Table Reference Error (1 error)
**Issue:** Voice credentials Lambda references non-existent `access_users` table  
**Estimated Time:** 5 minutes

**Error:**
- `module-voice/backend/lambdas/voice-credentials/lambda_function.py:61`
- "Table 'access_users' does not exist in schema"

**Fix Required:**
- Identify correct table name (likely `user_profiles` or similar)
- Update table reference in query

**Status:** 🔴 Not Started

---

### Priority 1: Route & Docstring Alignment (9 errors)

#### 4. KB Lambda Docstring Mismatch (8 errors)
**Issue:** API Gateway routes use `/bases` resource, Lambda docstrings don't document it  
**Estimated Time:** 15 minutes

**Infrastructure Routes (outputs.tf):**
- `GET /admin/org/kb/bases`
- `POST /admin/org/kb/bases`
- `GET /admin/org/kb/bases/{id}`
- `PUT /admin/org/kb/bases/{id}`
- `DELETE /admin/org/kb/bases/{id}`
- `GET /admin/sys/kb/bases`
- `POST /admin/sys/kb/bases`
- Plus 1 more

**Lambda Docstrings (Currently WRONG):**
```python
"""
Routes - Org Admin:
- GET /admin/org/kb - List knowledge bases
- POST /admin/org/kb - Create knowledge base
"""
```

**Fix Required:**
```python
"""
Routes - Org Admin:
- GET /admin/org/kb/bases - List knowledge bases
- POST /admin/org/kb/bases - Create knowledge base
- GET /admin/org/kb/bases/{id} - Get knowledge base details
- PUT /admin/org/kb/bases/{id} - Update knowledge base
- DELETE /admin/org/kb/bases/{id} - Delete knowledge base

Routes - Sys Admin:
- GET /admin/sys/kb/bases - List all knowledge bases
- POST /admin/sys/kb/bases - Create platform knowledge base
"""
```

**Files to Update:**
- `templates/_modules-core/module-kb/backend/lambdas/kb-base/lambda_function.py`

**Status:** 🔴 Not Started

---

#### 5. Frontend Route Parameter Error (1 error)
**Issue:** Eval detail page calls `/ws/{workspaceId}` but route uses `{wsId}`  
**Estimated Time:** 10 minutes

**Error:**
- `module-eval/frontend/pages/EvalDetailPage.tsx:200`
- "Frontend calls GET /ws/{workspaceId} but route doesn't exist in API Gateway"

**Fix Required:**
- Update frontend API call from `workspaceId` to `wsId`
- Verify all eval module API calls use correct parameter name

**Status:** 🔴 Not Started

---

### Priority 2: Non-Blocking Issues (34 errors)

#### 6. Frontend Compliance (23 errors)
**Issue:** Missing aria-labels and `any` types  
**Estimated Time:** 1-2 hours

**Common Patterns:**
- Missing `aria-label` on IconButton components
- Using `any` type instead of specific types
- Need systematic review of frontend components

**Status:** 🔴 Not Started (Defer to future sprint)

---

#### 7. Admin Auth Warnings (10 warnings)
**Issue:** Some admin pages missing explicit role checks or Alert components

**Examples:**
- `apps/web/app/admin/page.tsx` - Auth checks don't use Alert component
- `apps/web/app/admin/org/eval/page.tsx` - Missing explicit role check
- `apps/web/app/admin/org/ws/page.tsx` - Missing useRole() hook

**Status:** ⚠️ Warnings only (not blocking)

---

#### 8. Workspace Plugin Warnings (29 warnings)
**Issue:** Files use workspace data without workspace-plugin import

**Status:** ⚠️ Warnings only (not blocking)

---

## Summary Statistics

| Priority | Category | Count | Time Est | Status |
|----------|----------|-------|----------|--------|
| P0 | TypeScript properties | 15 | 30 min | 🔴 Not Started |
| P0 | API transformation | 2 | 20 min | 🔴 Not Started |
| P0 | Schema table ref | 1 | 5 min | 🔴 Not Started |
| P1 | KB docstrings | 8 | 15 min | 🔴 Not Started |
| P1 | Frontend route param | 1 | 10 min | 🔴 Not Started |
| P2 | Frontend compliance | 23 | 2 hrs | 🔴 Deferred |
| P2 | Admin auth warnings | 10 | - | ⚠️ Warnings |
| P2 | WS plugin warnings | 29 | - | ⚠️ Warnings |

**Total Critical Errors (P0-P1):** 27 errors  
**Total Time to Fix:** ~1.5 hours  
**Total Warnings (P2):** 39 warnings

---

## Execution Plan

### Phase 1: TypeScript Property Fix (30 min)
1. Read `useUser.tsx` to identify correct property
2. Update 15 chat admin component files
3. Test with TypeScript type-check
4. Commit: "fix(chat): correct UserContextType property in admin components"

### Phase 2: API Response Transform (20 min)
1. Update 2 analytics handler functions
2. Add transformation layer for RPC responses
3. Test with API response validator
4. Commit: "fix(chat): transform RPC analytics to camelCase"

### Phase 3: Schema & Routes (30 min)
1. Fix voice credentials table reference (5 min)
2. Update KB Lambda docstrings (15 min)
3. Fix eval frontend route parameter (10 min)
4. Commit: "fix(voice,kb,eval): correct schema references and route docs"

### Phase 4: Validation & Documentation (30 min)
1. Re-run validation suite
2. Verify error count reduced to ~34 (warnings only)
3. Update context and plan docs
4. Commit: "docs(admin-s3b): session 14 validation results"

---

## Testing Strategy

After each phase:
```bash
cd ~/code/bodhix/test-admin/ai-mod-stack

# TypeScript validation
pnpm -r run type-check

# API response validation
cd /Users/aaron/code/bodhix/cora-dev-toolkit
python validation/api-response-validator/validator.py ~/code/bodhix/test-admin/ai-mod-stack

# Schema validation
python validation/schema-validator/validator.py ~/code/bodhix/test-admin/ai-mod-stack

# Full suite (final check)
python validation/cora-validate.py ~/code/bodhix/test-admin/ai-mod-stack
```

---

## Success Criteria

**Phase 1-3 Complete:**
- ✅ TypeScript type-check passes (0 errors)
- ✅ API response validator passes (0 errors)
- ✅ Schema validator passes (0 errors)
- ✅ Admin route validator passes (0 errors)
- ✅ API tracer passes (0 errors)

**Certification Goal:**
- Bronze → **Silver** (< 10 critical errors)
- Target: **Gold** (0 critical errors, warnings acceptable)

---

## Notes

- Frontend compliance (23 errors) deferred to future sprint - requires systematic component audit
- Admin auth warnings (10) and workspace plugin warnings (29) are non-blocking
- Focus on P0-P1 errors to achieve Silver/Gold certification