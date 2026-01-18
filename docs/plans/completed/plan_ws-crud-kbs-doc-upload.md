# Plan: Workspace KB CRUD Operations

**Status:** ✅ COMPLETE - Document Upload Working  
**Created:** January 17, 2026  
**Last Updated:** January 18, 2026 (1:08 AM)  
**Branch:** ws-crud-kbs  
**Owner:** Module-WS Team  
**Related Modules:** module-ws, module-kb

---

## ✅ COMPLETED: Document Upload Working (January 18, 2026 1:08 AM)

**Milestone:** Full document upload flow working end-to-end!

**Fixes Applied This Session:**

### 1. S3 Bucket Environment Variable Mismatch
- **Error:** `TypeError: expected string or bytes-like object, got 'NoneType'`
- **Fix:** Changed `os.environ.get('KB_S3_BUCKET')` → `os.environ.get('S3_BUCKET')` to match Terraform

### 2. List Documents isoformat Error  
- **Error:** `'str' object has no attribute 'isoformat'`
- **Fix:** Added check for string vs datetime: `created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at)`

### 3. Documents Not Displaying in UI
- **Error:** Documents API returned data but UI showed empty table
- **Fix:** Handle both typed API client (array) and raw API (nested `{documents: [...]}`) response structures

**Files Modified:**
- `templates/_modules-core/module-kb/backend/lambdas/kb-document/lambda_function.py`
- `templates/_modules-core/module-kb/frontend/hooks/useKbDocuments.ts`

---

## ✅ COMPLETED: AvailableKb Type Mismatch Fix (January 18, 2026 12:46 AM)

**Problem:** KB tab crashed with `TypeError: Cannot read properties of undefined (reading 'scope')` when accessing `kb.kb.scope`

**Root Cause:** Backend `handle_list_available_kbs_for_workspace` and `handle_list_available_kbs_for_chat` returned flat structure `{id, name, scope, ...}` but frontend `AvailableKb` type expected nested structure `{kb: {id, name, scope, ...}, isEnabled, source}`

**Fix Applied:**
```python
# Before (caused TypeError):
kb_data = {
    'id': row['kb_id'],
    'name': row['kb_name'],
    'scope': row['kb_scope'],
    'isEnabled': row['is_enabled'],
    'source': row['source']
}

# After (matches AvailableKb type):
kb_data = {
    'kb': {
        'id': row['kb_id'],
        'name': row['kb_name'],
        'scope': row['kb_scope'],
        # ... other KnowledgeBase fields
    },
    'isEnabled': row['is_enabled'],
    'source': row['source']
}
```

**Files Fixed:**
- `templates/_modules-core/module-kb/backend/lambdas/kb-base/lambda_function.py`
  - Fixed `handle_list_available_kbs_for_workspace` 
  - Fixed `handle_list_available_kbs_for_chat`

**Deployment:** Lambda rebuilt and deployed via Terraform at 12:46 AM

---

## ✅ COMPLETED: Infinite Loop Fix (January 18, 2026 12:16 AM)

**Problem:** KB tab caused browser crash due to infinite API loop (`ERR_INSUFFICIENT_RESOURCES`)

**Root Cause:** Both `useKnowledgeBase.ts` and `useKbDocuments.ts` had useEffect dependencies on callback functions that changed every render due to `apiClient` being recreated.

**Fix Applied:**
```typescript
// Before (caused infinite loop):
useEffect(() => {
  if (autoFetch) { fetchDocuments(); }
}, [autoFetch, fetchDocuments]); // fetchDocuments changes every render!

// After (fixed):
useEffect(() => {
  if (autoFetch && scopeId && apiClient) { fetchDocuments(); }
}, [autoFetch, scope, scopeId]); // Only re-fetch when scope/scopeId changes
```

**Files Fixed:**
- `useKnowledgeBase.ts` - Fixed useEffect dependencies
- `useKbDocuments.ts` - Fixed useEffect dependencies  
- `DocumentTable.tsx` - Added `Array.isArray(documents)` check

---

## ✅ COMPLETED: Frontend TypeScript Errors (January 17, 2026 9:58 PM)

All TypeScript build errors fixed. Build passes with exit code 0.

### Files Modified (9 files across 3 modules):

| File | Module | Fix Applied |
|------|--------|-------------|
| `useKnowledgeBase.ts` | module-kb | Made `apiClient` optional |
| `useKbDocuments.ts` | module-kb | Made `apiClient` optional |
| `DocumentTable.tsx` | module-kb | Changed `onDownload` return to `Promise<string>` |
| `WorkspaceDataKBTab.tsx` | module-kb | Changed `onDownloadDocument` to `Promise<string>` |
| `OrgAdminKBPage.tsx` | module-kb | Changed `onDownloadDocument` to `Promise<string>` |
| `PlatformAdminKBPage.tsx` | module-kb | Changed `onDownloadDocument` to `Promise<string>` |
| `WorkspaceDetailPage.tsx` | module-ws | Fixed apiClient wrapper: `{ kb: kbApiClient }` |
| `ViewModelsModal.tsx` | module-ai | Fixed snake_case property names |
| `OrgAIConfigPanel.tsx` | module-ai | Fixed snake_case property names |

### Type Errors Fixed:
1. `apiClient` type incompatibility - Made optional in hook interfaces
2. Download return type mismatch - Changed from `Promise<void>` to `Promise<string>`
3. apiClient wrapper structure - Fixed to `{ apiClient: { kb: kbApiClient } }`
4. Property naming - Fixed `requiresInferenceProfile` → `requires_inference_profile`
5. Property naming - Fixed `org_systemPrompt` → `orgSystemPrompt`, etc.

---

## ✅ COMPLETED: Import Blocker (January 17, 2026 9:35 PM)

**Problem:** Cannot import module-kb components into module-ws  
**Solution:** Changed module-kb and module-chat package.json to point to **source files** instead of compiled dist.

---

## Original Plan: Workspace KB CRUD Operations

### Overview

Implement workspace-level Knowledge Base CRUD operations, enabling users to manage KB documents and view available global/org KBs from the workspace detail page.

**This is Part 1 of a 3-part workspace feature implementation:**
- � **Part 1 (this branch):** KB operations (ws-crud-kbs) - **API 404 ISSUE**
- ⏳ Part 2: Chat operations (ws-crud-chats)
- ⏳ Part 3: Evaluation operations (ws-crud-evals)

---

## Success Criteria

This branch is complete when:

1. ✅ **COMPLETE** Document Upload: Users can upload documents to workspace-level KB
2. ⏳ **NOT TESTED** Document Delete: Users can delete documents from workspace-level KB  
3. ✅ **COMPLETE** View Enabled KBs: Users can see global KBs enabled for workspace
4. ✅ **COMPLETE** View Org KBs: Users can see organization KBs available
5. ✅ **COMPLETE** API Integration: All KB operations use real endpoints (no mock data)

**Progress:** Document upload working! Delete not yet tested. KB tab functional.

---

## API Endpoints Required

### 1. Get Workspace KB Info ← **CURRENTLY 404**
```
GET /workspaces/{workspaceId}/kb
```

### 2. List Workspace KB Documents
```
GET /workspaces/{workspaceId}/kb/documents
```

### 3. Upload Document to Workspace KB
```
POST /workspaces/{workspaceId}/kb/documents
```

### 4. Delete Document from Workspace KB
```
DELETE /workspaces/{workspaceId}/kb/documents/{documentId}
```

---

## Related Documents

- [Module-KB Implementation Plan](./plan_module-kb-implementation.md)
- [CORA Module Development Process](../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md)
- [Fast Iteration Testing](../guides/guide_FAST-ITERATION-TESTING.md)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-18 1:08 AM | Document upload working end-to-end! Fixed S3 env var, isoformat, and UI display issues | AI Assistant |
| 2026-01-18 12:46 AM | Fixed AvailableKb type mismatch - backend now returns nested {kb: ...} | AI Assistant |
| 2026-01-18 12:16 AM | Fixed infinite loop in KB hooks, looping resolved | AI Assistant |
| 2026-01-17 10:08 PM | Updated status - API 404 error, set priority for next session | AI Assistant |
| 2026-01-17 9:58 PM | All frontend TypeScript errors fixed, build passes | AI Assistant |
| 2026-01-17 9:35 PM | Import blocker resolved | AI Assistant |
| 2026-01-17 9:20 PM | Documented failure - module import issue blocks all progress | AI Assistant |
| 2026-01-17 | Initial plan created | AI Assistant |
