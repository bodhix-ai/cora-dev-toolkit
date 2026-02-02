# Session Plan: S3 Phase 10 - module-kb ADR-019c Implementation

**Status**: 🟡 IN PROGRESS  
**Created**: 2026-02-02  
**Module**: module-kb  
**Errors**: 58 Layer 2 errors → 0 (target)  
**Estimated Time**: 5-6 hours  
**Branch**: `auth-standardization-s3`

---

## Overview

Implement ADR-019c (Resource Permission Authorization) for module-kb by:
1. Adding missing database RPC functions for KB resource permissions
2. Completing the kb_common/permissions.py layer
3. Updating kb-base and kb-document Lambdas with the two-step pattern

---

## Current State

### Validation Errors (58 total)
- 58 Layer 2 errors (missing org/workspace membership validation)
- 40 warnings
- 42 code quality errors (key_consistency - not auth-related)

### Lambda Files
- `kb-base/lambda_function.py` - 21 routes (workspace, chat, admin scopes)
- `kb-document/lambda_function.py` - 19 routes (workspace, chat, admin scopes)
- `kb-processor/lambda_function.py` - Background processing (no auth routes)

### Root Cause
Lambdas use **local helper functions** that query tables directly:
- `check_workspace_access()` - Direct ws_members query
- `check_ws_admin_access()` - Direct ws_members query
- `check_chat_access()` - Direct chat_sessions query

Missing ADR-019c two-step pattern:
1. Membership check via `common.can_access_ws_resource()`
2. Resource permission check via `kb_common.permissions`

### Existing Infrastructure
- `kb_common/permissions.py` exists with stubs (`is_kb_owner`, `can_view_kb`, `can_edit_kb`)
- Database RPCs: `can_access_kb()`, `can_upload_to_kb()` exist
- Missing: RPC functions that the stubs call

---

## Implementation Steps

### Step 1: Add Database RPC Functions (30 min)

**File**: `templates/_modules-core/module-kb/db/schema/008-kb-rpc-functions.sql`

Add 6 new permission RPC functions:

```sql
-- ADR-019c: Resource Permission Functions

-- Check if user is the owner of a KB base
CREATE OR REPLACE FUNCTION is_kb_owner(p_user_id UUID, p_kb_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_kb RECORD;
BEGIN
    SELECT * INTO v_kb FROM public.kb_bases 
    WHERE id = p_kb_id AND is_deleted = false;
    
    IF v_kb IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN v_kb.created_by = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can view KB (ownership + future sharing)
CREATE OR REPLACE FUNCTION can_view_kb(p_user_id UUID, p_kb_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Currently: ownership only
    -- Future: will include sharing logic
    RETURN is_kb_owner(p_user_id, p_kb_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can edit KB (ownership + future edit permissions)
CREATE OR REPLACE FUNCTION can_edit_kb(p_user_id UUID, p_kb_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Currently: ownership only
    -- Future: will include edit permission shares
    RETURN is_kb_owner(p_user_id, p_kb_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can delete KB (ownership only)
CREATE OR REPLACE FUNCTION can_delete_kb(p_user_id UUID, p_kb_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_kb_owner(p_user_id, p_kb_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can view KB document
CREATE OR REPLACE FUNCTION can_view_kb_document(p_user_id UUID, p_doc_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_doc RECORD;
BEGIN
    SELECT * INTO v_doc FROM public.kb_docs 
    WHERE id = p_doc_id AND is_deleted = false;
    
    IF v_doc IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check KB access
    RETURN can_view_kb(p_user_id, v_doc.kb_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can edit/delete KB document
CREATE OR REPLACE FUNCTION can_edit_kb_document(p_user_id UUID, p_doc_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_doc RECORD;
BEGIN
    SELECT * INTO v_doc FROM public.kb_docs 
    WHERE id = p_doc_id AND is_deleted = false;
    
    IF v_doc IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check KB edit permission
    RETURN can_edit_kb(p_user_id, v_doc.kb_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION is_kb_owner IS 'Check if user is owner of KB base';
COMMENT ON FUNCTION can_view_kb IS 'Check if user can view KB (ownership + future sharing)';
COMMENT ON FUNCTION can_edit_kb IS 'Check if user can edit KB (ownership + future edit permissions)';
COMMENT ON FUNCTION can_delete_kb IS 'Check if user can delete KB (ownership only)';
COMMENT ON FUNCTION can_view_kb_document IS 'Check if user can view KB document';
COMMENT ON FUNCTION can_edit_kb_document IS 'Check if user can edit/delete KB document';
```

**Action Items**:
- [ ] Add RPC functions to 008-kb-rpc-functions.sql
- [ ] Create migration file

---

### Step 2: Create Migration File (15 min)

**File**: `templates/_modules-core/module-kb/db/migrations/20260202_adr019c_kb_permission_rpcs.sql`

```sql
-- Migration: Add ADR-019c KB Resource Permission RPC Functions
-- Created: 2026-02-02
-- Sprint: S3 Phase 10

-- Check if functions already exist, drop if they do
DROP FUNCTION IF EXISTS is_kb_owner(UUID, UUID);
DROP FUNCTION IF EXISTS can_view_kb(UUID, UUID);
DROP FUNCTION IF EXISTS can_edit_kb(UUID, UUID);
DROP FUNCTION IF EXISTS can_delete_kb(UUID, UUID);
DROP FUNCTION IF EXISTS can_view_kb_document(UUID, UUID);
DROP FUNCTION IF EXISTS can_edit_kb_document(UUID, UUID);

-- Create new functions (copy from 008-kb-rpc-functions.sql)
-- [Function definitions here]
```

**Action Items**:
- [ ] Create migration file with function definitions

---

### Step 3: Complete kb_common/permissions.py (15 min)

**File**: `templates/_modules-core/module-kb/backend/layers/kb_common/python/kb_common/permissions.py`

Add missing helpers:

```python
def can_delete_kb(user_id: str, kb_id: str) -> bool:
    """
    Check if user can delete KB base (ownership only).
    
    Args:
        user_id: The user ID to check
        kb_id: The KB base ID
        
    Returns:
        True if user can delete the KB, False otherwise
    """
    return rpc('can_delete_kb', {
        'p_user_id': user_id,
        'p_kb_id': kb_id
    })


def can_view_kb_document(user_id: str, doc_id: str) -> bool:
    """
    Check if user can view KB document.
    
    Args:
        user_id: The user ID to check
        doc_id: The document ID
        
    Returns:
        True if user can view the document, False otherwise
    """
    return rpc('can_view_kb_document', {
        'p_user_id': user_id,
        'p_doc_id': doc_id
    })


def can_edit_kb_document(user_id: str, doc_id: str) -> bool:
    """
    Check if user can edit/delete KB document.
    
    Args:
        user_id: The user ID to check
        doc_id: The document ID
        
    Returns:
        True if user can edit the document, False otherwise
    """
    return rpc('can_edit_kb_document', {
        'p_user_id': user_id,
        'p_doc_id': doc_id
    })
```

**Action Items**:
- [ ] Add missing helper functions to permissions.py

---

### Step 4: Update kb-base Lambda (1.5 hours)

**File**: `templates/_modules-core/module-kb/backend/lambdas/kb-base/lambda_function.py`

**Changes**:
1. Add import at top: `from kb_common.permissions import can_view_kb, can_edit_kb`
2. Remove local helper functions: `check_workspace_access()`, `check_ws_admin_access()`, `check_chat_access()`
3. Update router functions to use two-step pattern

**Example - Workspace Routes**:

**Before**:
```python
def route_workspace_handlers(...):
    # Check workspace access for all routes
    if not check_workspace_access(user_id, workspace_id):
        return common.forbidden_response('You do not have access to this workspace')
```

**After**:
```python
def route_workspace_handlers(...):
    # Step 1: Membership check
    if not common.can_access_ws_resource(user_id, workspace_id):
        return common.forbidden_response('Not a workspace member')
    
    # For KB-specific operations, also check KB permissions
    if kb_id:
        # Step 2: Resource permission check
        if method in ['GET'] and not can_view_kb(user_id, kb_id):
            return common.forbidden_response('Cannot access this KB')
        elif method in ['PATCH', 'DELETE'] and not can_edit_kb(user_id, kb_id):
            return common.forbidden_response('Cannot modify this KB')
```

**Routes to update (21 total)**:
- Workspace scope: 9 routes
- Chat scope: 8 routes
- Org admin: 5 routes (already compliant - Layer 1 only)
- Sys admin: 9 routes (already compliant - Layer 1 only)

**Action Items**:
- [ ] Add permission layer import
- [ ] Remove local helper functions
- [ ] Update route_workspace_handlers() with two-step pattern
- [ ] Update route_chat_handlers() with two-step pattern
- [ ] Verify admin routes remain unchanged

---

### Step 5: Update kb-document Lambda (1.5 hours)

**File**: `templates/_modules-core/module-kb/backend/lambdas/kb-document/lambda_function.py`

**Changes**:
1. Add import: `from kb_common.permissions import can_view_kb_document, can_edit_kb_document`
2. Remove local helper functions
3. Update handler functions with two-step pattern

**Example - Workspace Documents**:

**Before**:
```python
def handle_workspace_documents(...):
    # Verify workspace access
    if not check_workspace_access(user_id, workspace_id):
        return common.forbidden_response("Access denied to workspace")
```

**After**:
```python
def handle_workspace_documents(...):
    # Step 1: Membership check
    if not common.can_access_ws_resource(user_id, workspace_id):
        return common.forbidden_response("Not a workspace member")
    
    # For document-specific operations
    if doc_id:
        # Step 2: Resource permission check
        if method in ['GET'] and not can_view_kb_document(user_id, doc_id):
            return common.forbidden_response("Cannot access this document")
        elif method in ['DELETE'] and not can_edit_kb_document(user_id, doc_id):
            return common.forbidden_response("Cannot delete this document")
```

**Routes to update (19 total)**:
- Workspace scope: 6 routes
- Chat scope: 6 routes
- Org admin: 4 routes (already compliant)
- Sys admin: 3 routes (already compliant)

**Action Items**:
- [ ] Add permission layer import
- [ ] Remove local helper functions
- [ ] Update handle_workspace_documents() with two-step pattern
- [ ] Update handle_chat_documents() with two-step pattern
- [ ] Verify admin handlers remain unchanged

---

### Step 6: Build and Deploy (1 hour)

**Sync to test project**:
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit

# Sync database schema and migration
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/perm/ai-mod-stack "module-kb/db/schema/008-kb-rpc-functions.sql"
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/perm/ai-mod-stack "module-kb/db/migrations/20260202_adr019c_kb_permission_rpcs.sql"

# Sync permission layer
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/perm/ai-mod-stack "module-kb/backend/layers/kb_common/python/kb_common/permissions.py"

# Sync Lambdas
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/perm/ai-mod-stack "module-kb/backend/lambdas/kb-base/lambda_function.py"
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/perm/ai-mod-stack "module-kb/backend/lambdas/kb-document/lambda_function.py"
```

**Build module**:
```bash
cd ~/code/bodhix/testing/perm/ai-mod-stack/packages/module-kb/backend
bash build.sh
```

**Deploy via Terraform**:
```bash
cd ~/code/bodhix/testing/perm/ai-mod-infra
./scripts/deploy-terraform.sh dev
```

**Action Items**:
- [ ] Sync all files to test project
- [ ] Build module (all Lambdas + kb_common layer)
- [ ] Deploy via Terraform
- [ ] Verify deployment succeeded

---

### Step 7: Validate (30 min)

**Run validation**:
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit

python3 validation/api-tracer/cli.py validate \
  --path ~/code/bodhix/testing/perm/ai-mod-stack \
  --module module-kb \
  --all-auth \
  --prefer-terraform
```

**Expected Results**:
- **Layer 1 (Admin Auth):** 0 errors, 0 warnings ✅
- **Layer 2 (Resource Permissions):** 0 errors, 0 warnings ✅
- **Code Quality:** 42 errors (key_consistency - not auth-related)

**Action Items**:
- [ ] Run validation
- [ ] Verify 0 Layer 2 errors
- [ ] Document any unexpected issues

---

### Step 8: Update Documentation (30 min)

**Files to update**:
1. `docs/plans/plan_s3-auth-standardization.md` - Mark Phase 10 complete
2. `memory-bank/context-auth-standardization.md` - Add S3 Session 8 log
3. This session plan - Mark complete and move to `completed/`

**Commit message**:
```
feat(module-kb): implement ADR-019c resource permissions

- Add 6 KB permission RPC functions (is_kb_owner, can_view_kb, etc.)
- Complete kb_common/permissions.py with missing helpers
- Update kb-base Lambda with two-step pattern (21 routes)
- Update kb-document Lambda with two-step pattern (19 routes)
- Layer 2 validation: 58 → 0 errors

Sprint: S3 Phase 10
Ref: ADR-019c
```

**Action Items**:
- [ ] Update S3 plan (mark Phase 10 complete)
- [ ] Update context (add session log)
- [ ] Commit all changes with descriptive message
- [ ] Move session plan to completed/

---

## Success Criteria

- [x] Database RPC functions added (6 functions) ✅ COMPLETE
- [x] Migration file created ✅ COMPLETE (user confirmed SQL ran successfully)
- [x] kb_common/permissions.py completed (3 new helpers) ✅ COMPLETE
- [x] kb-base Lambda updated (21 routes) ✅ COMPLETE
- [ ] kb-document Lambda updated (19 routes) ⏳ PENDING
- [ ] All files synced to test project
- [ ] Module built successfully
- [ ] Deployed via Terraform
- [ ] Validation: 0 Layer 2 errors
- [ ] Documentation updated
- [ ] Changes committed to branch

---

## Rollback Plan

If deployment fails:
1. Revert Lambda code: `git checkout HEAD~1 templates/_modules-core/module-kb/backend/lambdas/`
2. Revert database changes: Run previous migration version
3. Redeploy: `./scripts/deploy-terraform.sh dev`

---

## Notes

- Focus on workspace and chat scopes - admin routes already compliant
- KB permissions currently ownership-based (future: sharing logic)
- Document permissions inherit from KB permissions
- kb-processor Lambda has no auth routes (background processing)

---

**Session Plan Status**: 🟡 IN PROGRESS  
**Last Updated**: 2026-02-02