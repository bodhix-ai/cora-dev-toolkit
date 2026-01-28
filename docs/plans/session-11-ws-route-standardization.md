# Session 11: Workspace Route Standardization

**Date:** January 27, 2026  
**Sprint:** Admin Standardization S3b  
**Branch:** `admin-page-s3b`  
**Status:** Analysis Complete - 26 Routes Need Fixing

---

## Problem Statement

API Gateway has significant inconsistencies for workspace-related routes. According to CORA standards:

- ✅ **Correct:** `/ws/{wsId}`
- ❌ **Wrong:** `/workspaces/{workspaceId}`
- ❌ **Wrong:** `/workspaces/{wsId}` (wrong path)
- ❌ **Wrong:** `/ws/{workspaceId}` (wrong parameter)

---

## Affected Modules (3 modules, 26 routes)

### Module-Chat: Both Path and Parameter Wrong (5 routes)

**Current:** `/workspaces/{workspaceId}`  
**Correct:** `/ws/{wsId}`

| Method | Current Route | Correct Route |
|--------|--------------|---------------|
| GET | `/workspaces/{workspaceId}/chats` | `/ws/{wsId}/chats` |
| POST | `/workspaces/{workspaceId}/chats` | `/ws/{wsId}/chats` |
| GET | `/workspaces/{workspaceId}/chats/{sessionId}` | `/ws/{wsId}/chats/{sessionId}` |
| PATCH | `/workspaces/{workspaceId}/chats/{sessionId}` | `/ws/{wsId}/chats/{sessionId}` |
| DELETE | `/workspaces/{workspaceId}/chats/{sessionId}` | `/ws/{wsId}/chats/{sessionId}` |

**Files to update:**
- `templates/_modules-core/module-chat/infrastructure/outputs.tf`
- `templates/_modules-core/module-chat/backend/lambdas/chat-session/lambda_function.py`
- `templates/_modules-core/module-chat/frontend/lib/api.ts`

---

### Module-Eval: Wrong Path, Correct Parameter (10 routes)

**Current:** `/workspaces/{wsId}`  
**Correct:** `/ws/{wsId}`

| Method | Current Route | Correct Route |
|--------|--------------|---------------|
| POST | `/workspaces/{wsId}/eval` | `/ws/{wsId}/eval` |
| GET | `/workspaces/{wsId}/eval` | `/ws/{wsId}/eval` |
| GET | `/workspaces/{wsId}/eval/{evalId}` | `/ws/{wsId}/eval/{evalId}` |
| PATCH | `/workspaces/{wsId}/eval/{evalId}` | `/ws/{wsId}/eval/{evalId}` |
| GET | `/workspaces/{wsId}/eval/{evalId}/status` | `/ws/{wsId}/eval/{evalId}/status` |
| DELETE | `/workspaces/{wsId}/eval/{evalId}` | `/ws/{wsId}/eval/{evalId}` |
| PATCH | `/workspaces/{wsId}/eval/{evalId}/results/{resultId}` | `/ws/{wsId}/eval/{evalId}/results/{resultId}` |
| GET | `/workspaces/{wsId}/eval/{evalId}/results/{resultId}/history` | `/ws/{wsId}/eval/{evalId}/results/{resultId}/history` |
| GET | `/workspaces/{wsId}/eval/{evalId}/export/pdf` | `/ws/{wsId}/eval/{evalId}/export/pdf` |
| GET | `/workspaces/{wsId}/eval/{evalId}/export/xlsx` | `/ws/{wsId}/eval/{evalId}/export/xlsx` |

**Files to update:**
- `templates/_modules-functional/module-eval/infrastructure/outputs.tf`
- `templates/_modules-functional/module-eval/backend/lambdas/eval-runner/lambda_function.py` (docstring only)
- `templates/_modules-functional/module-eval/backend/lambdas/eval-results/lambda_function.py` (docstring only)
- `templates/_modules-functional/module-eval/frontend/lib/api.ts`

---

### Module-WS: Correct Path, Wrong Parameter (11 routes)

**Current:** `/ws/{workspaceId}`  
**Correct:** `/ws/{wsId}`

| Method | Current Route | Correct Route |
|--------|--------------|---------------|
| GET | `/ws/{workspaceId}` | `/ws/{wsId}` |
| PUT | `/ws/{workspaceId}` | `/ws/{wsId}` |
| DELETE | `/ws/{workspaceId}` | `/ws/{wsId}` |
| POST | `/ws/{workspaceId}/restore` | `/ws/{wsId}/restore` |
| GET | `/ws/{workspaceId}/members` | `/ws/{wsId}/members` |
| POST | `/ws/{workspaceId}/members` | `/ws/{wsId}/members` |
| PUT | `/ws/{workspaceId}/members/{memberId}` | `/ws/{wsId}/members/{memberId}` |
| DELETE | `/ws/{workspaceId}/members/{memberId}` | `/ws/{wsId}/members/{memberId}` |
| POST | `/ws/{workspaceId}/favorite` | `/ws/{wsId}/favorite` |
| POST | `/admin/org/ws/workspaces/{workspaceId}/restore` | `/admin/org/ws/workspaces/{wsId}/restore` |
| DELETE | `/admin/org/ws/workspaces/{workspaceId}` | `/admin/org/ws/workspaces/{wsId}` |

**Files to update:**
- `templates/_modules-core/module-ws/infrastructure/outputs.tf`
- `templates/_modules-core/module-ws/backend/lambdas/workspace/lambda_function.py` (route dispatcher)
- `templates/_modules-core/module-ws/frontend/lib/api.ts`

---

## Implementation Plan

### Phase 1: Module-Chat Standardization (1-2 hours)

1. **Infrastructure (outputs.tf):**
   - Replace all 5 routes: `/workspaces/{workspaceId}` → `/ws/{wsId}`

2. **Backend (chat-session Lambda):**
   - Update module docstring routes
   - Update route dispatcher: `'/workspaces/' in path` → `'/ws/' in path`
   - Update path parameter extraction: `workspace_id = path_params.get('workspaceId')` → `ws_id = path_params.get('wsId')`
   - Update function signatures: `handle_list_workspace_chats(event, user_id, workspace_id)` → `handle_list_workspace_chats(event, user_id, ws_id)`
   - Update internal references

3. **Frontend (api.ts):**
   - Update 2 functions: `listWorkspaceChats()`, `createWorkspaceChat()`
   - Change URLs: `/workspaces/${workspaceId}` → `/ws/${wsId}`
   - Rename parameters: `workspaceId` → `wsId`

### Phase 2: Module-Eval Standardization (30-45 min)

1. **Infrastructure (outputs.tf):**
   - Replace all 10 routes: `/workspaces/{wsId}` → `/ws/{wsId}`

2. **Backend (eval-runner & eval-results Lambdas):**
   - Update module docstrings only (parameters already correct)
   - Route dispatcher already checks for `/ws/` pattern (verify)

3. **Frontend (api.ts):**
   - Update all eval API functions
   - Change URLs: `/workspaces/${wsId}` → `/ws/${wsId}`
   - Parameters already use `wsId` (no renaming needed)

### Phase 3: Module-WS Standardization (1-2 hours)

1. **Infrastructure (outputs.tf):**
   - Replace all 11 parameters: `{workspaceId}` → `{wsId}`

2. **Backend (workspace Lambda):**
   - Update module docstring routes
   - Update path parameter extraction: `path_params.get('workspaceId')` → `path_params.get('wsId')`
   - Rename variables throughout: `workspace_id` → `ws_id`
   - Update function signatures

3. **Frontend (api.ts):**
   - Update all workspace API functions
   - Rename parameters: `workspaceId` → `wsId`
   - URLs already use `/ws/` (no path changes needed)

### Phase 4: Validation (15-30 min)

1. Run admin-route-validator on all 3 modules
2. Verify 0 errors for workspace routes
3. Check frontend TypeScript compilation
4. Verify no references to `workspaceId` remain in updated files

---

## Estimated Effort

| Phase | Duration |
|-------|----------|
| Phase 1: Module-Chat | 1-2 hours |
| Phase 2: Module-Eval | 30-45 min |
| Phase 3: Module-WS | 1-2 hours |
| Phase 4: Validation | 15-30 min |
| **TOTAL** | **3-5 hours** |

---

## Risk Assessment

**Low Risk:**
- Parameter renames are straightforward
- Path changes don't affect logic
- TypeScript will catch any missed references

**Testing Required:**
- Verify workspace-scoped chat routes work
- Verify eval routes work in workspaces
- Verify ws management routes work
- Check admin workspace routes

---

## Recommendation

**Fix all 3 modules together** to ensure consistency across the entire codebase. This is a one-time standardization effort that will eliminate confusion and ensure all workspace routes follow CORA standards.

After this fix:
- ✅ All workspace routes will use `/ws/{wsId}` pattern
- ✅ No more `/workspaces` routes
- ✅ No more `{workspaceId}` parameters
- ✅ Complete consistency across all modules

---

## Next Steps

Awaiting user approval to proceed with standardization.

---

**Document Status:** Analysis Complete  
**Last Updated:** January 27, 2026 (Session 11)