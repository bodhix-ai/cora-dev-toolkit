# Plan: Fix KB Document Processing Pipeline

**Status:** 🟡 IN PROGRESS  
**Created:** January 18, 2026  
**Priority:** HIGH (Blocking core KB functionality)  
**Related:** plan_ws-crud-kbs.md

---

## Problem Statement

Documents uploaded via workspace UI remain in "pending" status forever because:
1. Upload creates record in `kb_docs` with status='pending' ✅
2. Document uploaded to S3 ✅
3. **SQS message NOT sent** to trigger processing ❌
4. `kb-processor` Lambda never runs, no chunks/embeddings created

## Root Cause

`handle_get_upload_url()` in `kb-document/lambda_function.py` is missing the call to `publish_processing_message()`.

**Admin upload works** because `handle_admin_upload_url()` includes this call.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        KB Document Processing Pipeline                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. UPLOAD PHASE                                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   Frontend   │───▶│ kb-document  │───▶│     S3       │                  │
│  │  (presigned) │    │   Lambda     │    │   Bucket     │                  │
│  └──────────────┘    └──────┬───────┘    └──────────────┘                  │
│                             │                                               │
│                             │ Creates kb_docs record (status: pending)      │
│                             │                                               │
│                             ▼                                               │
│  2. TRIGGER PHASE (❌ BROKEN FOR WORKSPACE UPLOADS)                         │
│  ┌──────────────┐    ┌──────────────┐                                      │
│  │  kb-document │───▶│  SQS Queue   │  ← Missing publish_processing_message│
│  │   Lambda     │    │ (processor)  │                                      │
│  └──────────────┘    └──────┬───────┘                                      │
│                             │                                               │
│                             ▼                                               │
│  3. PROCESSING PHASE                                                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ kb-processor │───▶│   Bedrock    │───▶│  kb_chunks   │                  │
│  │   Lambda     │    │  Embeddings  │    │ (pgvector)   │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                                                                             │
│  Processing steps:                                                          │
│  - Download from S3                                                         │
│  - Parse document (PDF, DOCX, TXT, MD)                                     │
│  - Chunk text with overlap                                                  │
│  - Generate embeddings via Bedrock Titan V2                                │
│  - Store chunks + embeddings in kb_chunks                                   │
│  - Update kb_docs status → 'indexed'                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `kb_bases` | KB metadata | id, name, scope, org_id, workspace_id |
| `kb_docs` | Document records | id, kb_id, s3_key, status, chunk_count |
| `kb_chunks` | Text chunks + embeddings | id, document_id, content, **embedding** (vector), chunk_index |

**Embeddings Location:** `kb_chunks.embedding` column (pgvector, 1024 dimensions)

---

## Fix Implementation

### Step 1: Add SQS Trigger to Workspace Upload

**File:** `templates/_modules-core/module-kb/backend/lambdas/kb-document/lambda_function.py`

**Change:** Add `publish_processing_message()` call to `handle_get_upload_url()`

```python
# After creating document record (around line 268):
common.insert_one(
    table='kb_docs',
    data={...}
)

# ADD THIS:
# Publish SQS message for processing
publish_processing_message(doc_id, kb_id, s3_key)

return common.success_response({...})
```

### Step 2: Sync to Test Project

```bash
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/<test-project>/ai-sec-infra "kb-document/lambda_function.py"
```

### Step 3: Deploy Lambda

```bash
cd ~/code/bodhix/testing/<test-project>/ai-sec-infra
./scripts/deploy-lambda.sh module-kb/kb-document
```

### Step 4: Test Upload Flow

1. Upload a new document via workspace UI
2. Check CloudWatch logs for `kb-document` Lambda (should show SQS publish)
3. Check CloudWatch logs for `kb-processor` Lambda (should show processing)
4. Verify `kb_chunks` table has entries
5. Verify document status changes from 'pending' → 'processing' → 'indexed'

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
```

---

## Success Criteria

- [ ] Documents uploaded via workspace show status 'indexed' (not 'pending')
- [ ] `kb_chunks` table populated with document chunks
- [ ] `kb_chunks.embedding` column contains vector data
- [ ] Processing logs visible in CloudWatch for kb-processor Lambda

---

## Related Documentation

- [Module-KB Implementation Plan](./plan_module-kb-implementation.md)
- [KB Development Guide](../guides/guide_MODULE-KB-DEVELOPMENT.md)
- [Fast Iteration Testing](../guides/guide_FAST-ITERATION-TESTING.md)
