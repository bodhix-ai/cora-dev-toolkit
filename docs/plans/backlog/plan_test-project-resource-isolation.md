# Plan: Test Project Resource Isolation

**Status:** 📋 PLANNED  
**Created:** January 18, 2026  
**Priority:** MEDIUM (Prevents test environment conflicts)  
**Related:** test-module.md workflow, create-cora-project.sh

---

## Problem Statement

Test projects currently share AWS resource names (e.g., `ai-sec-dev-kb-documents`, `ai-sec-dev-*` Lambdas) causing conflicts when:

1. **Switching between test projects** - Resources from test-ws-24, test-ws-25, test-embeddings all use same names
2. **Terraform destroy/recreate** - S3 buckets with data can't be deleted
3. **Manual cleanup** - Deleting S3 files directly creates orphaned database records

### Example of Current Problem

```
Test Project 1: test-ws-24/ai-sec-infra
  ├── S3: ai-sec-dev-kb-documents  ← SHARED NAME
  ├── Lambda: ai-sec-dev-kb-processor ← SHARED NAME
  └── DB records pointing to S3 files

Test Project 2: test-ws-25/ai-sec-infra  
  ├── S3: ai-sec-dev-kb-documents  ← SAME NAME = CONFLICT
  ├── Lambda: ai-sec-dev-kb-processor ← SAME NAME = CONFLICT
  └── DB records pointing to SAME S3 files
```

**Result:** Orphaned database records when S3 is cleaned up.

---

## Solution Overview

### Part 1: Unique Project Names from Config File

Derive unique project names from the setup config file's folder name suffix:

```yaml
# setup.config.test-ws-24.yaml
project:
  name: ai-sec-ws24  # Derived from filename suffix "test-ws-24"

# setup.config.test-embeddings.yaml  
project:
  name: ai-sec-embeddings  # Derived from filename suffix "test-embeddings"
```

This creates isolated resources:
- `ai-sec-ws24-dev-kb-documents`
- `ai-sec-embeddings-dev-kb-documents`

### Part 2: Database Cleanup RPC Function

Add a proper cleanup RPC function to handle orphaned records:

```sql
-- Function to clean up KB data for a specific project
CREATE OR REPLACE FUNCTION cleanup_kb_data_by_prefix(bucket_prefix TEXT)
RETURNS TABLE (
  chunks_deleted INTEGER,
  docs_deleted INTEGER,
  kbs_deleted INTEGER
) AS $$
DECLARE
  v_chunks_deleted INTEGER;
  v_docs_deleted INTEGER;
  v_kbs_deleted INTEGER;
BEGIN
  -- Delete in reverse dependency order
  
  -- 1. Delete chunks (most dependent)
  DELETE FROM kb_chunks 
  WHERE document_id IN (
    SELECT id FROM kb_docs 
    WHERE s3_key LIKE bucket_prefix || '%'
  );
  GET DIAGNOSTICS v_chunks_deleted = ROW_COUNT;
  
  -- 2. Delete documents
  DELETE FROM kb_docs 
  WHERE s3_key LIKE bucket_prefix || '%';
  GET DIAGNOSTICS v_docs_deleted = ROW_COUNT;
  
  -- 3. Optionally delete KBs if no documents remain
  DELETE FROM kb_bases
  WHERE id NOT IN (SELECT DISTINCT kb_id FROM kb_docs);
  GET DIAGNOSTICS v_kbs_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT v_chunks_deleted, v_docs_deleted, v_kbs_deleted;
END;
$$ LANGUAGE plpgsql;
```

---

## Implementation Tasks

### Task 1: Update create-cora-project.sh Script

**File:** `scripts/create-cora-project.sh`

**Change:** Auto-derive project name from config file suffix if not explicitly set:

```bash
# Current logic
PROJECT_NAME=$(yq '.project.name // ""' "$INPUT_CONFIG")

# New logic
if [[ -z "$PROJECT_NAME" ]]; then
  # Extract suffix from config filename
  # setup.config.test-ws-24.yaml → test-ws-24 → ai-sec-ws24
  CONFIG_SUFFIX=$(basename "$INPUT_CONFIG" .yaml | sed 's/setup\.config\.//')
  if [[ "$CONFIG_SUFFIX" =~ ^test- ]]; then
    # Convert test-ws-24 → ws24, test-embeddings → embeddings
    UNIQUE_SUFFIX=$(echo "$CONFIG_SUFFIX" | sed 's/test-//' | sed 's/-//')
    PROJECT_NAME="${BASE_PROJECT_NAME}-${UNIQUE_SUFFIX}"
  fi
fi
```

### Task 2: Add Cleanup RPC to Database Schema

**File:** `templates/_modules-core/module-kb/db/schema/009-kb-rls.sql`

Add the `cleanup_kb_data_by_prefix()` function to the schema.

### Task 3: Update test-module.md Workflow

**File:** `.cline/workflows/test-module.md`

Add **Phase 0.5: Cleanup Previous Test Environment**:

```bash
# Phase 0.5: Cleanup Previous Test Environment (if reusing resources)

### Step 0.5.1: Clean Database Tables

# Only needed if reusing same project name
psql $SUPABASE_URL -c "SELECT cleanup_kb_data_by_prefix('ai-sec-dev-');"

### Step 0.5.2: Clean S3 Buckets  

# Only AFTER database cleanup
aws s3 rm s3://ai-sec-dev-kb-documents --recursive
```

### Task 4: Add force_destroy for Dev S3 Buckets

**File:** `templates/_modules-core/module-kb/infra/main.tf`

```hcl
resource "aws_s3_bucket" "kb_documents" {
  bucket        = "${var.prefix}-kb-documents"
  force_destroy = var.environment == "dev" ? true : false
  
  # ... rest of config
}
```

---

## Testing Plan

### Test 1: Unique Naming

1. Create test project: `setup.config.test-ws-30.yaml`
2. Verify resources created: `ai-sec-ws30-dev-*`
3. Create another: `setup.config.test-ws-31.yaml`
4. Verify resources created: `ai-sec-ws31-dev-*`
5. Confirm no conflicts between ws30 and ws31

### Test 2: Cleanup RPC

1. Upload documents to workspace KB
2. Verify data in: `kb_docs`, `kb_chunks`, S3
3. Run: `SELECT cleanup_kb_data_by_prefix('ai-sec-ws30-dev-kb-documents/');`
4. Verify all KB data cleaned up
5. Verify no orphaned records

### Test 3: force_destroy

1. Create test project with data in S3
2. Run: `terraform destroy`
3. Verify S3 bucket deleted automatically (no manual intervention)

---

## Rollout Strategy

### Phase 1: Add Cleanup RPC (Immediate)

- ✅ Add RPC function to schema
- ✅ Test manually
- ✅ Document usage

### Phase 2: Update Project Naming (Next Sprint)

- Update `create-cora-project.sh`
- Update documentation
- Test with new projects

### Phase 3: Update Workflows (Following Sprint)

- Update `test-module.md`
- Update `.clinerules`
- Train AI on new workflow

---

## Success Criteria

- [ ] Test projects use unique resource names derived from config filename
- [ ] Database cleanup RPC function available and tested
- [ ] `force_destroy = true` configured for dev S3 buckets
- [ ] test-module.md workflow includes cleanup phase
- [ ] No resource conflicts when running multiple test projects
- [ ] No orphaned database records when cleaning up test environments

---

## Notes

**Current Workaround:** User manually deletes database rows when conflicts occur.

**After Implementation:** Automated cleanup through RPC function + unique naming prevents conflicts.

**Why This Matters:** Saves time during testing iterations and prevents data integrity issues.
