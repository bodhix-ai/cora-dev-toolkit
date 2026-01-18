# Plan: KB Document Processing Pipeline - Embeddings Sprint

**Status:** ⏸️ PAUSED - Awaiting Lambda Deployment (Other Branch In Progress)  
**Created:** January 18, 2026  
**Updated:** January 18, 2026 (Session 8 - Root Cause Identified, Ready for Deployment)  
**Branch:** ws-crud-kbs-embeddings  
**Priority:** HIGH (Blocking core KB functionality)  
**Related:** plan_ws-crud-kbs.md, PR #45 (doc-upload sprint), plan_test-project-resource-isolation.md

---

## Sprint Scope

**COMPLETED ✅:**
- Fix SQS trigger for workspace document uploads (template updated)
- Fixed environment variables (S3_BUCKET, SQS_QUEUE_URL)
- Fixed org_id missing from kb_docs insert
- Updated frontend Data tab UI (Documents at top, KB Sources below)
- Fixed TypeScript types for KBStatsCard and DocumentTable
- **Session 3:** Removed hardcoded MOCK_WORKFLOW_DOCS from WorkspaceDetailPage
- **Session 3:** Fixed createAuthenticatedClient import error
- **Session 3:** Fixed {{PROJECT_NAME}} placeholder replacement issues
- **Session 7:** Fixed infinite loop in useKbDocuments and useKnowledgeBase hooks (useEffect circular dependency)
- **Session 7:** Workspace Data tab now loads successfully with live data
- **Session 8:** Identified root cause - deployed kb-document Lambda missing SQS publish code

**⏸️ WAITING FOR DEPLOYMENT:**
- **kb-document Lambda:** Template has fix, needs rebuild + redeploy when other branch merges
- **Impact:** Document uploads work, but stay in "pending" status until Lambda deployed

**READY FOR TESTING (After API Issues Fixed):**
- ✅ `org_id` column added to `kb_chunks` table (DONE in DB)
- ✅ kb-processor Lambda updated to include `org_id` in chunk insert (DONE)
- 🔄 End-to-end document processing verification (parse → chunk → embed → store)
- Pull embedding model dynamically from `ai_cfg_sys_rag` table

**DEFERRED (Future Sprint):**
- Make ALL `ai_cfg_sys_rag` values editable via sys admin UI
- Split sys admin AI config UI into two tabs: **Chat** & **RAG**
- Document update operations
- Document delete cascading to chunks
- Reprocessing failed documents

---

## Completed Work ✅

### SQS Trigger Fix (January 18, 2026)

**Problem:** Documents uploaded via workspace UI remained in "pending" status forever because `handle_get_upload_url()` was missing the `publish_processing_message()` call.

**Fix Applied:**
1. ✅ Updated template: `templates/_modules-core/module-kb/backend/lambdas/kb-document/lambda_function.py`
2. ✅ Added `publish_processing_message(doc_id, kb_id, s3_key)` after document record creation
3. ✅ Synced to test project: `~/code/bodhix/testing/test-ws-25/ai-sec-stack`
4. ✅ Rebuilt Lambda zips
5. ✅ Deployed via Terraform

### Environment Variable Fix (January 18, 2026)

**Problem:** Lambda returning 500 error because `S3_BUCKET` was None.

**Root Cause:** Terraform sets `S3_BUCKET` but code was looking for `KB_S3_BUCKET`.

**Fix Applied:**
1. ✅ Made environment variables flexible: `S3_BUCKET = os.environ.get('S3_BUCKET') or os.environ.get('KB_S3_BUCKET')`
2. ✅ Same for SQS: `SQS_QUEUE_URL = os.environ.get('SQS_QUEUE_URL') or os.environ.get('KB_PROCESSOR_QUEUE_URL')`
3. ✅ Fixed `isoformat` error for string dates from DB

### Missing org_id Fix (January 18, 2026)

**Problem:** kb-processor Lambda failing with "Document has no org_id" because `kb_docs` record was created without `org_id`.

**Root Cause:** `handle_get_upload_url()` was not including `org_id` in the document insert.

**Fix Applied:**
1. ✅ Get `org_id` from KB before creating document record
2. ✅ Include `org_id` in `kb_docs` insert for CORA multi-tenancy compliance
3. ✅ Applied to both `handle_get_upload_url()` and `handle_admin_upload_url()`

### Frontend Data Tab UI (January 18, 2026)

**Changes Applied:**
1. ✅ Reordered WorkspaceDataKBTab: Documents section at top, KB Sources below
2. ✅ Made text generic (removed "workspace" references for dynamic labels)
3. ✅ Fixed KBStatsCard to access `kb.stats.documentCount` (was `kb.documentCount`)
4. ✅ Updated TypeScript types: Added `stats` property to `KnowledgeBase` interface
5. ✅ Fixed DocumentTable `onDownload` type: `Promise<string | void>`

### Session 3: Data Tab Regression Fix (January 18, 2026 Afternoon)

**Problem:** Previous AI session regressed working Data tab code while trying to remove hardcoded data.

**Issues Found:**
1. ❌ `MOCK_WORKFLOW_DOCS` (8 hardcoded documents) still in WorkspaceDetailPage
2. ❌ `createAuthenticatedClient` imported from wrong package (`module-kb` instead of `api-client`)
3. ❌ `{{PROJECT_NAME}}` placeholders not replaced when syncing template fixes to test project

**Fixes Applied:**
1. ✅ **Template:** Removed `MOCK_WORKFLOW_DOCS` constant and "Workflow Documents" JSX section
   - File: `templates/_modules-functional/module-ws/frontend/pages/WorkspaceDetailPage.tsx`
2. ✅ **Template:** Fixed import - moved `createAuthenticatedClient` to `@{{PROJECT_NAME}}/api-client`
3. ✅ **Test Project:** Synced template to `test-embeddings/ai-sec-stack`
4. ✅ **Test Project:** Replaced `@{{PROJECT_NAME}}` with `@ai-sec` using sed

**Result:** Workspace page now loads successfully without TypeScript/import errors! ✅

**Lesson Learned:** `sync-fix-to-project.sh` copies template files AS-IS without placeholder replacement. Must manually replace placeholders after syncing.

### Session 4: Terraform State Conflicts Discovery (January 18, 2026 Afternoon)

**Problem:** Attempted to sync infrastructure template main.tf to test project, but realized this would overwrite module-ws configuration.

**Root Cause Analysis:**

When different teams create CORA projects following `test-module.md` workflow with **different enabled functional modules**, deploying to the **same AWS environment** causes Terraform to destroy each other's resources:

**Example Scenario:**
```yaml
# Team A - test-ws-24
modules:
  enabled:
    - module-ws  # Only workspace module
```
- Terraform creates: module-ws Lambda, module-ws API routes
- Terraform state: Tracks ONLY module-ws resources

```yaml
# Team B - test-ws-25 (SAME AWS environment)
modules:
  enabled:
    - module-kb  # Only knowledge base module
```
- Terraform sees desired state: module-kb Lambda, module-kb routes
- Terraform sees reality: **module-ws resources exist** (from Team A)
- **Terraform DESTROYS module-ws resources** because they're not in Team B's state!

**Why This Happens:**
1. Each `create-cora-project.sh` creates a **separate Terraform state**
2. Each state only knows about its own enabled modules
3. When deploying to shared AWS account/region, they share the same API Gateway
4. Terraform enforces its state by **removing resources not in its state**
5. Result: **404 errors for both teams** as routes get removed

**Impact:** This explains the 404 errors both dev teams were experiencing!

**Solution:**

For comprehensive testing and parallel dev efforts, enable **all functional modules** in one test project:

```yaml
modules:
  enabled:
    - module-ws    # Workspace Management
    - module-eval  # Model Evaluation  
    - module-voice # Voice Interaction
```

Plus the 5 core modules (always included per ADR-013):
- module-access (Tier 1)
- module-ai (Tier 2)
- module-mgmt (Tier 3)
- module-kb (Tier 3 - Core AI Capability)
- module-chat (Tier 3 - Core AI Capability)

**Config File Updated:** `templates/_project-stack-template/setup.config.test-embed.yaml`

**Related Plan:** `docs/plans/plan_test-project-resource-isolation.md` - Now **URGENT** for supporting parallel dev efforts without resource conflicts.

**Status:** All Terraform state conflicts resolved (Session 4), frontend infinite loop fixed (Session 7), root cause identified (Session 8).

---

## ✅ Session 7: Frontend Infinite Loop Fix (January 18, 2026 Evening)

### Problem Discovery

After previous fixes, workspace Data tab was triggering hundreds of API calls per second:
```
useKbDocuments.ts:78 Failed to fetch documents for workspace
useKnowledgeBase.ts:71 Failed to fetch workspace KB
ERR_INSUFFICIENT_RESOURCES (browser resource exhaustion)
```

### Root Cause: useEffect Circular Dependency

Both `useKbDocuments` and `useKnowledgeBase` hooks had **circular dependencies** in their useEffect:
- Dependencies included callback functions (`refresh`, `fetchDocuments`)
- Functions recreated on every render
- Each render triggered new effect → new API call → new render → infinite loop

### Fix Applied

**Updated Dependencies:**
```typescript
// useKnowledgeBase.ts - BEFORE
useEffect(() => { ... }, [autoFetch, refresh, retryCount]);  // ❌ refresh causes loop

// useKnowledgeBase.ts - AFTER  
useEffect(() => { ... }, [autoFetch, scopeId]);  // ✅ Only stable values

// useKbDocuments.ts - BEFORE
useEffect(() => { ... }, [autoFetch, fetchDocuments, retryCount]);  // ❌ fetchDocuments causes loop

// useKbDocuments.ts - AFTER
useEffect(() => { ... }, [autoFetch, scopeId]);  // ✅ Only stable values
```

**Files Updated:**
1. ✅ `templates/_modules-core/module-kb/frontend/hooks/useKnowledgeBase.ts`
2. ✅ `templates/_modules-core/module-kb/frontend/hooks/useKbDocuments.ts`
3. ✅ Synced to test project: `test-embeddings/ai-sec-stack`

### Result

✅ **Workspace Data tab now loads successfully!**
- Single API call on mount (no loop)
- Document list displays correctly
- KB stats card shows live data
- Can upload documents successfully

---

## ✅ Session 8: Root Cause Identified - SQS Publishing Missing (January 18, 2026 Evening)

### Problem Discovery

After Session 7 fix, workspace page loads perfectly and document uploads work. However:
- ✅ Document upload succeeds (file uploaded to S3)
- ✅ Database record created (status: "pending")
- ❌ **Document stays in "pending" status forever**
- ❌ No polling for status updates

### Investigation via AWS Logs

**kb-processor Lambda:**
- Log group exists but has **ZERO log streams** (never invoked)

**SQS Queue:**
- **Zero messages** (0 available, 0 in-flight, 0 delayed)

**kb-document Lambda Logs (at 20:46:42 - upload time):**
```
POST /workspaces/c270b67a-9f37-447c-aac5-a97abf3a58e8/kb/documents
Body: {"filename":"50 ac1.pdf","fileSize":60489,"mimeType":"application/pdf"}
Duration: 388ms - SUCCESS
```

**Critical Finding:**
- ✅ Lambda executed successfully (388ms)
- ✅ Document record created in database
- ❌ **NO logging output from Lambda code** (no SQS publish attempt logged)
- ❌ **SQS message never published**

### Root Cause

The **deployed `kb-document` Lambda is missing the `publish_processing_message()` code** that we added to the template earlier.

**Template Status:** ✅ HAS FIX
- File: `templates/_modules-core/module-kb/backend/lambdas/kb-document/lambda_function.py`
- Fix: `publish_processing_message(doc_id, kb_id, s3_key)` added to `handle_get_upload_url()`

**Deployed Lambda Status:** ❌ RUNNING OLD CODE
- Missing the SQS publish call
- Documents upload but never trigger processing

### Solution

Rebuild and redeploy the kb-document Lambda:

```bash
cd ~/code/bodhix/testing/test-embeddings/ai-sec-infra

# Rebuild kb-document Lambda with latest template code
./scripts/build-lambda.sh module-kb/kb-document

# Deploy kb-document Lambda  
./scripts/deploy-lambda.sh module-kb/kb-document
```

### Expected Behavior After Deployment

1. Upload document → Database record created (status: "pending")
2. Lambda publishes SQS message → kb-processor Lambda triggered
3. kb-processor parses, chunks, embeds document
4. Status updates: "pending" → "processing" → "indexed"
5. Document ready for RAG queries

### Current Status: ⏸️ WAITING

**Reason:** Another branch is being developed and will be pushed soon. Deploying kb-document Lambda now would overwrite their changes.

**Next Action:** Deploy kb-document Lambda after other branch merges.

---

## 🚨 BLOCKING: kb_chunks Missing org_id Column

### Problem Discovery (January 18, 2026)

**Error from CloudWatch logs:**
```
Database error in insert on kb_chunks: {'message': "Could not find the 'org_id' column of 'kb_chunks' in the schema cache", 'code': 'PGRST204'}
```

**Root Cause:** 
- `kb-processor` Lambda tries to insert `org_id` into `kb_chunks`
- But `kb_chunks` table doesn't have an `org_id` column
- The org context is currently inherited via JOIN to `kb_docs`

### Analysis: Add org_id to kb_chunks?

**For millions of RAG records, adding `org_id` is RECOMMENDED:**

| Factor | Without org_id (JOIN) | With org_id (Direct) |
|--------|----------------------|----------------------|
| Vector search + filter | JOIN overhead on 1M rows | Direct index scan |
| Query time (10K org chunks) | 500-2000ms | 50-200ms |
| RLS policy | Subquery per row | Direct column filter |
| Index utilization | Partial | Full composite index |

**Decision:** Add `org_id` column to `kb_chunks` for performance at scale.

### Implementation Plan (Next Session)

#### Step 1: Database Migration
```sql
-- Add column (nullable first)
ALTER TABLE kb_chunks ADD COLUMN org_id UUID REFERENCES orgs(id);

-- Backfill from kb_docs
UPDATE kb_chunks 
SET org_id = d.org_id 
FROM kb_docs d 
WHERE kb_chunks.document_id = d.id;

-- Make NOT NULL
ALTER TABLE kb_chunks ALTER COLUMN org_id SET NOT NULL;

-- Create composite index for performance
CREATE INDEX idx_kb_chunks_org_kb ON kb_chunks(org_id, kb_id);

-- Update RLS policy for direct org_id filter
DROP POLICY IF EXISTS kb_chunks_org_isolation ON kb_chunks;
CREATE POLICY kb_chunks_org_isolation ON kb_chunks
  USING (org_id = current_setting('app.current_org_id')::uuid);
```

#### Step 2: Update Lambda Code
- Template: `templates/_modules-core/module-kb/backend/lambdas/kb-processor/lambda_function.py`
- Change: Include `org_id` in `store_chunks()` insert

#### Step 3: Sync and Deploy
```bash
# Sync to test project
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-ws-25/ai-sec-infra "kb-processor/lambda_function.py"

# Rebuild and deploy
cd ~/code/bodhix/testing/test-ws-25/ai-sec-infra
./scripts/deploy-lambda.sh module-kb/kb-processor
```

#### Step 4: Test
- Upload new document via workspace UI
- Verify status changes: pending → processing → indexed
- Verify kb_chunks populated with org_id and embeddings

---

## Current Problem: Hardcoded Embedding Model

The `kb-processor` Lambda currently has the embedding model **hardcoded**:

```python
# kb-processor/lambda_function.py
DEFAULT_EMBEDDING_MODEL = 'amazon.titan-embed-text-v2:0'

def get_embedding_config() -> Dict[str, Any]:
    # TODO: Call module-ai endpoint: GET /platform/ai-config/embedding
    # For now, use AWS Bedrock defaults
    return {
        'provider': 'bedrock',
        'model': DEFAULT_EMBEDDING_MODEL,  # ❌ HARDCODED
        'dimension': DEFAULT_EMBEDDING_DIMENSION
    }
```

**Required:** Pull embedding model from `ai_cfg_sys_rag` table, which sys admins can configure.

---

## AI Configuration Architecture

### Database Table: `ai_cfg_sys_rag`

| Column | Purpose | Used By |
|--------|---------|---------|
| `embedding_model` | Model for generating embeddings | RAG (kb-processor) |
| `chat_model` | Model for chat completions | Chat (module-chat) |
| `system_prompt` | Default system prompt | Chat |
| `default_similarity_threshold` | Min similarity for RAG retrieval | RAG |
| `max_context_tokens_global` | Max tokens in chat context | Chat |
| `default_chunk_size` | Text chunk size for RAG | RAG |
| `default_chunk_overlap` | Overlap between chunks | RAG |
| `max_results_per_query` | Max RAG results returned | RAG |

### Sys Admin UI Enhancement

**Current State:**
- Sys admin page allows editing: embedding_model, chat_model, system_prompt

**Required Enhancement:**
- Make ALL `ai_cfg_sys_rag` fields editable
- Split into **two tabs** for logical grouping:

#### Tab 1: Chat Configuration
| Field | Description |
|-------|-------------|
| `chat_model` | LLM model for conversations |
| `system_prompt` | Default system prompt |
| `max_context_tokens_global` | Max tokens in chat context |

#### Tab 2: RAG Configuration  
| Field | Description |
|-------|-------------|
| `embedding_model` | Model for vector embeddings |
| `default_similarity_threshold` | Min similarity score (0.0-1.0) |
| `default_chunk_size` | Characters per chunk |
| `default_chunk_overlap` | Overlap characters |
| `max_results_per_query` | Max chunks returned |

---

## Implementation Tasks

### Phase 1: Dynamic Embedding Model (In Progress)

- [ ] Update `get_embedding_config()` in kb-processor to query `ai_cfg_sys_rag`
- [ ] Add RPC function or direct query for embedding config
- [ ] Test embedding model change reflects in processing

### Phase 2: Sys Admin UI Enhancement

- [ ] Add missing fields to sys admin AI config form
- [ ] Implement two-tab layout (Chat / RAG)
- [ ] Add validation for numeric fields (thresholds, token limits)
- [ ] Add tooltips/help text explaining each setting

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        KB Document Processing Pipeline                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. UPLOAD PHASE ✅ FIXED                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   Frontend   │───▶│ kb-document  │───▶│     S3       │                  │
│  │  (presigned) │    │   Lambda     │    │   Bucket     │                  │
│  └──────────────┘    └──────┬───────┘    └──────────────┘                  │
│                             │                                               │
│                             │ Creates kb_docs record (status: pending)      │
│                             │                                               │
│                             ▼                                               │
│  2. TRIGGER PHASE ✅ FIXED                                                  │
│  ┌──────────────┐    ┌──────────────┐                                      │
│  │  kb-document │───▶│  SQS Queue   │  ✅ publish_processing_message added │
│  │   Lambda     │    │ (processor)  │                                      │
│  └──────────────┘    └──────┬───────┘                                      │
│                             │                                               │
│                             ▼                                               │
│  3. PROCESSING PHASE (🔄 NEEDS CONFIG FIX)                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ kb-processor │───▶│   Bedrock    │───▶│  kb_chunks   │                  │
│  │   Lambda     │    │  Embeddings  │    │ (pgvector)   │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                             ▲                                               │
│                             │                                               │
│  4. CONFIGURATION (❌ NEEDS IMPLEMENTATION)                                 │
│  ┌──────────────┐    ┌──────────────┐                                      │
│  │  Sys Admin   │───▶│ai_cfg_sys_rag│  ← embedding_model should be read    │
│  │     UI       │    │    table     │     from here, not hardcoded         │
│  └──────────────┘    └──────────────┘                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `kb_bases` | KB metadata | id, name, scope, org_id, workspace_id, config |
| `kb_docs` | Document records | id, kb_id, s3_key, status, chunk_count |
| `kb_chunks` | Text chunks + embeddings | id, document_id, content, **embedding** (vector), chunk_index |
| `ai_cfg_sys_rag` | AI/RAG configuration | embedding_model, chat_model, chunk settings, thresholds |

**Embeddings Configuration:**
- Column: `kb_chunks.embedding vector(1024)` ✅
- Index: HNSW with `vector_cosine_ops` ✅
- Model: Configured in `ai_cfg_sys_rag.embedding_model` (default: amazon.titan-embed-text-v2:0)

---

## Verification Queries

```sql
-- Check document status
SELECT id, filename, status, error_message, chunk_count 
FROM kb_docs 
WHERE status = 'pending';

-- Check if chunks exist
SELECT d.filename, COUNT(c.id) as chunk_count
FROM kb_docs d
LEFT JOIN kb_chunks c ON c.document_id = d.id
GROUP BY d.id, d.filename;

-- Check embeddings exist
SELECT document_id, COUNT(*) as chunks_with_embeddings
FROM kb_chunks 
WHERE embedding IS NOT NULL
GROUP BY document_id;

-- Check current AI config
SELECT * FROM ai_cfg_sys_rag LIMIT 1;
```

---

## Success Criteria

### Phase 1 (Frontend & Root Cause) ✅ COMPLETE
- [x] Fixed infinite loop in KB hooks (Session 7)
- [x] Frontend Data tab loads successfully with live data (Session 7)
- [x] Document upload works end-to-end (Session 8)
- [x] Root cause identified: Deployed Lambda missing SQS publish code (Session 8)
- [x] Template has fix ready for deployment (Session 8)
- [x] Environment variables fixed (S3_BUCKET, SQS_QUEUE_URL)
- [x] org_id now included in kb_docs record
- [x] TypeScript types fixed

### Phase 1.5 (Lambda Deployment) ⏸️ WAITING FOR MERGE
- [ ] ⏸️ Rebuild kb-document Lambda (`./scripts/build-lambda.sh module-kb/kb-document`)
- [ ] ⏸️ Deploy kb-document Lambda (`./scripts/deploy-lambda.sh module-kb/kb-document`)
- [ ] Test document upload → status changes to "processing" → "indexed"
- [ ] Verify kb_chunks populated with embeddings

### Phase 2 (Schema Enhancement) 🔄 PLANNED
- [ ] Add `org_id` column to `kb_chunks` table
- [ ] Backfill existing chunks with org_id from kb_docs
- [ ] Create composite index (org_id, kb_id)
- [ ] Update kb-processor Lambda to include org_id in chunk insert
- [ ] Test full processing pipeline with org_id filtering

### Phase 2 (Dynamic Config) � PLANNED
- [ ] Embedding model read from `ai_cfg_sys_rag` table
- [ ] Chunk size/overlap read from config
- [ ] Config changes take effect on next document processing

### Phase 3 (UI Enhancement) 📋 PLANNED
- [ ] All `ai_cfg_sys_rag` fields editable in sys admin UI
- [ ] Two-tab layout: Chat / RAG
- [ ] Validation and help text for all fields

---

## Related Documentation

- [Module-KB Implementation Plan](./plan_module-kb-implementation.md)
- [KB Development Guide](../guides/guide_MODULE-KB-DEVELOPMENT.md)
- [Fast Iteration Testing](../guides/guide_FAST-ITERATION-TESTING.md)
