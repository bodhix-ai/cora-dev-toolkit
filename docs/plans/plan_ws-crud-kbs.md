# Plan: Workspace KB CRUD Operations

**Status:** 🟡 In Progress  
**Created:** January 17, 2026  
**Last Updated:** January 17, 2026  
**Branch:** ws-crud-kbs  
**Owner:** Module-WS Team  
**Related Modules:** module-ws, module-kb

---

## Overview

Implement workspace-level Knowledge Base CRUD operations, enabling users to manage KB documents and view available global/org KBs from the workspace detail page.

**This is Part 1 of a 3-part workspace feature implementation:**
- ✅ **Part 1 (this branch):** KB operations (ws-crud-kbs)
- ⏳ Part 2: Chat operations (ws-crud-chats)
- ⏳ Part 3: Evaluation operations (ws-crud-evals)

---

## Success Criteria

This branch is complete when:

1. ✅ **Document Upload:** Users can upload documents to workspace-level KB
2. ✅ **Document Delete:** Users can delete documents from workspace-level KB  
3. ✅ **View Enabled KBs:** Users can see global KBs that have been enabled for their workspace
4. ✅ **View Org KBs:** Users can see organization KBs available to their workspace
5. ✅ **API Integration:** All KB operations use GET, POST, DELETE endpoints (no mock data)

---

## Current State

**Location:** `templates/_modules-functional/module-ws/frontend/pages/WorkspaceDetailPage.tsx`

**Mock Data (Data Tab):**
- **MOCK_KB_DOCS** (lines 197-208) - Hard-coded knowledge base documents
- **MOCK_KB_STATS** (lines 210-216) - Hard-coded KB statistics

**Goal:** Replace mock data with real API calls to module-kb backend.

---

## API Endpoints Required

### 1. List Workspace KB Documents
```
GET /workspaces/{workspaceId}/kb/documents
```

**Response:**
```typescript
{
  data: KbDocument[]
}
```

### 2. Upload Document to Workspace KB
```
POST /workspaces/{workspaceId}/kb/documents
```

**Request:**
```typescript
{
  filename: string
  fileSize: number
  mimeType: string
}
```

**Response:**
```typescript
{
  data: {
    document: KbDocument
    uploadUrl: string  // S3 presigned URL
  }
}
```

### 3. Delete Document from Workspace KB
```
DELETE /workspaces/{workspaceId}/kb/documents/{documentId}
```

**Response:**
```typescript
{
  success: boolean
}
```

### 4. Get Workspace KB Info
```
GET /workspaces/{workspaceId}/kb
```

**Response:**
```typescript
{
  data: {
    kb: KnowledgeBase
    availableKbs: AvailableKb[]  // Global & org KBs enabled for this workspace
  }
}
```

---

## Implementation Plan

### Phase 1: Frontend Hooks Integration

**Files to modify:**
- `templates/_modules-functional/module-ws/frontend/pages/WorkspaceDetailPage.tsx`

**Steps:**

1. **Import KB Hooks**
   ```typescript
   import { useKbDocuments, useKnowledgeBase } from '@{{PROJECT_NAME}}/module-kb';
   import { createKbModuleClient } from '@{{PROJECT_NAME}}/module-kb';
   ```

2. **Create KB API Client**
   ```typescript
   const kbApiClient = useMemo(() => {
     if (session?.accessToken) {
       return createKbModuleClient(session.accessToken as string);
     }
     return null;
   }, [session?.accessToken]);
   ```

3. **Use KB Documents Hook**
   ```typescript
   const {
     documents: kbDocuments,
     loading: kbDocsLoading,
     error: kbDocsError,
     uploadDocument,
     deleteDocument,
     downloadDocument
   } = useKbDocuments({
     scope: 'workspace',
     scopeId: workspaceId,
     apiClient: kbApiClient ? { kb: kbApiClient } : undefined,
     autoFetch: true
   });
   ```

4. **Use Knowledge Base Hook**
   ```typescript
   const {
     kb,
     availableKbs,
     loading: kbLoading,
     error: kbError
   } = useKnowledgeBase({
     scope: 'workspace',
     scopeId: workspaceId,
     apiClient: kbApiClient ? { kb: kbApiClient } : undefined,
     autoFetch: true
   });
   ```

5. **Replace Mock Data**
   - Replace `MOCK_KB_DOCS` with `kbDocuments`
   - Replace `MOCK_KB_STATS` with `kb` object properties
   - Add loading/error states to UI

---

### Phase 2: UI Updates

**Data Tab - KB Documents Section:**

1. **Documents Table**
   - Display `kbDocuments` instead of `MOCK_KB_DOCS`
   - Show loading spinner when `kbDocsLoading === true`
   - Show error alert if `kbDocsError` is present

2. **Upload Button**
   - Wire to `uploadDocument()` function
   - Show upload progress
   - Refresh list after successful upload

3. **Delete Button**
   - Wire to `deleteDocument(documentId)` function
   - Show confirmation dialog
   - Refresh list after successful delete

4. **Download Button**
   - Wire to `downloadDocument(documentId)` function
   - Open download URL in new tab

**Data Tab - KB Stats Section:**

1. **Statistics Card**
   - Display stats from `kb` object
   - Show loading skeleton when `kbLoading === true`
   - Handle case where workspace has no KB yet

2. **Available KBs List**
   - Display `availableKbs` (global & org KBs)
   - Show which ones are enabled
   - Indicate KB scope (global vs org)

---

### Phase 3: Testing

**Manual Testing Checklist:**

- [ ] Navigate to workspace detail page → Data tab
- [ ] Verify KB documents table displays real data (or empty if no docs)
- [ ] Upload a document - verify it appears in the table
- [ ] Download a document - verify download works
- [ ] Delete a document - verify it's removed from the table
- [ ] Verify KB statistics card shows real data
- [ ] Verify available KBs section shows global/org KBs
- [ ] Test error states (disconnect network, verify error messages)
- [ ] Test loading states (slow network, verify spinners)

**API Testing:**

- [ ] GET /workspaces/{id}/kb/documents returns correct data
- [ ] POST /workspaces/{id}/kb/documents uploads successfully
- [ ] DELETE /workspaces/{id}/kb/documents/{docId} deletes successfully
- [ ] GET /workspaces/{id}/kb returns KB info and available KBs

**Edge Cases:**

- [ ] Workspace with no KB yet (should show empty state)
- [ ] Workspace with no documents (should show empty table)
- [ ] Large file upload (test progress indicator)
- [ ] Upload failure (test error handling)
- [ ] Delete failure (test error handling)

---

## Code Location Strategy

### Template-First Workflow

**Rule:** Always update templates first, then sync to test projects.

1. **Primary location:** `templates/_modules-functional/module-ws/frontend/pages/WorkspaceDetailPage.tsx`
2. **Test location:** `~/code/bodhix/testing/test-ws-{N}/ai-sec-stack/packages/module-ws/frontend/pages/WorkspaceDetailPage.tsx`

**Workflow:**
```bash
# 1. Edit template
vim templates/_modules-functional/module-ws/frontend/pages/WorkspaceDetailPage.tsx

# 2. Sync to test project
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-ws-{N}/ai-sec-stack "module-ws/frontend/pages/WorkspaceDetailPage.tsx"

# 3. Test in browser
cd ~/code/bodhix/testing/test-ws-{N}/ai-sec-stack
./scripts/start-dev.sh
```

---

## Rollback Plan

If issues arise during implementation:

1. **Feature Flag Approach:**
   ```typescript
   const USE_REAL_KB_DATA = process.env.NEXT_PUBLIC_USE_REAL_KB_DATA === 'true';
   
   const displayData = USE_REAL_KB_DATA ? kbDocuments : MOCK_KB_DOCS;
   ```

2. **Keep mock data commented out** (don't delete immediately)

3. **Test thoroughly before removing mocks**

---

## Dependencies

**Required Hooks (from module-kb):**
- `useKbDocuments` - Document CRUD operations
- `useKnowledgeBase` - KB info and available KBs
- `createKbModuleClient` - API client factory

**Backend APIs (must exist):**
- Workspace KB document endpoints
- Workspace KB info endpoint

---

## Progress Tracking

### Phase 1: Frontend Hooks Integration
- [ ] Import KB hooks and client
- [ ] Create KB API client with session token
- [ ] Add useKbDocuments hook
- [ ] Add useKnowledgeBase hook
- [ ] Replace MOCK_KB_DOCS references
- [ ] Replace MOCK_KB_STATS references

### Phase 2: UI Updates
- [ ] Update documents table to use real data
- [ ] Add loading states
- [ ] Add error states
- [ ] Wire upload button
- [ ] Wire delete button
- [ ] Wire download button
- [ ] Update stats card
- [ ] Add available KBs list

### Phase 3: Testing
- [ ] Manual testing complete
- [ ] API testing complete
- [ ] Edge case testing complete
- [ ] User acceptance testing complete

### Deployment
- [ ] Code synced to test project
- [ ] Test project deployed
- [ ] Production testing complete
- [ ] PR created and merged

---

## Related Documents

- [Module-KB Implementation Plan](./plan_module-kb-implementation.md)
- [CORA Module Development Process](../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md)
- [Fast Iteration Testing](../guides/guide_FAST-ITERATION-TESTING.md)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-17 | Initial plan created | AI Assistant |
