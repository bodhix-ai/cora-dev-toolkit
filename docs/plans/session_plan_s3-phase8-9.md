# Session Plan: S3 Phase 8 & 9 Implementation

**Date:** February 1, 2026  
**Sprint:** S3 (Auth Standardization - Resource Permissions)  
**Focus:** Implement ADR-019c Layer 2 for module-eval and module-chat  
**Estimated Duration:** 6-8 hours  
**Test Environment:** 
- Stack: `/Users/aaron/code/bodhix/testing/admin-ui/ai-mod-stack`
- Infra: `/Users/aaron/code/bodhix/testing/admin-ui/ai-mod-infra`

---

## Session Objectives

1. **Phase 8:** Implement ADR-019c resource permissions for module-eval (20 errors → 0)
2. **Phase 9:** Implement ADR-019c resource permissions for module-chat (48 errors → 0)
3. **Validation:** Confirm 0 Layer 2 errors for both modules
4. **Deployment:** Deploy and test both modules in test environment

---

## Phase 8: module-eval (3-4 hours)

**Current Status:** 20 Layer 2 errors, 0 warnings  
**Lambdas:** eval-results, eval-prompts  
**Goal:** Implement org membership + resource permission checks

### 8.1: Review & Plan RPC Functions (~30 min)

**Actions:**
- [ ] Read `templates/_modules-functional/module-eval/db/schema/014-eval-rpc-functions.sql`
- [ ] Verify existing functions:
  - [ ] `can_manage_eval_config(p_user_id, p_org_id)` - Admin function
  - [ ] `is_eval_owner(p_user_id, p_eval_id)` - Ownership check
- [ ] Identify missing functions needed:
  - [ ] `can_view_eval(p_user_id, p_eval_id)` - View permission
  - [ ] `can_edit_eval(p_user_id, p_eval_id)` - Edit permission

**Expected Output:** List of RPC functions to add to schema

---

### 8.2: Add Missing RPC Functions to Schema (~45 min)

**Pattern:**
```sql
-- Check if user can view an evaluation (ownership + future sharing)
CREATE OR REPLACE FUNCTION can_view_eval(p_user_id UUID, p_eval_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN is_eval_owner(p_user_id, p_eval_id);
    -- Future: Add sharing check
END;
$$;

COMMENT ON FUNCTION can_view_eval IS 'ADR-019c: Check if user can view evaluation';
```

**Actions:**
- [ ] Add `can_view_eval()` function to schema file
- [ ] Add `can_edit_eval()` function to schema file
- [ ] Add GRANT statements for both functions
- [ ] Verify parameter order: `(p_user_id, p_eval_id)` (ADR-019c standard)

**Files Modified:**
- `templates/_modules-functional/module-eval/db/schema/014-eval-rpc-functions.sql`

---

### 8.3: Create & Run Database Migration (~30 min)

**Migration File:** `templates/_modules-functional/module-eval/db/migrations/20260201_adr019c_eval_permission_rpcs.sql`

**Actions:**
- [ ] Create migration file with new RPC functions
- [ ] Copy function definitions from schema file
- [ ] Add GRANT statements
- [ ] Sync migration to test project stack repo
- [ ] Run migration in test database:
  ```bash
  cd ~/code/bodhix/testing/admin-ui/ai-mod-stack/packages/module-eval/db/migrations
  # Run via Supabase migrations or psql
  ```
- [ ] Verify functions exist:
  ```sql
  \df can_view_eval
  \df can_edit_eval
  ```

**Expected Output:** Functions deployed to test database

---

### 8.4: Verify eval_common/permissions.py (~15 min)

**Location:** `templates/_modules-functional/module-eval/backend/layers/eval_common/python/eval_common/permissions.py`

**Note:** This file was created in Phase 6 (see plan), verify it exists and is complete.

**Expected Content:**
```python
"""Evaluation resource permission helpers per ADR-019c."""
from org_common.db import call_rpc

def is_eval_owner(user_id: str, eval_id: str) -> bool:
    """Check if user is owner of evaluation."""
    return call_rpc('is_eval_owner', {'p_user_id': user_id, 'p_eval_id': eval_id})

def can_view_eval(user_id: str, eval_id: str) -> bool:
    """Check if user can view evaluation (ownership + future sharing)."""
    return call_rpc('can_view_eval', {'p_user_id': user_id, 'p_eval_id': eval_id})

def can_edit_eval(user_id: str, eval_id: str) -> bool:
    """Check if user can edit evaluation (ownership + future edit shares)."""
    return call_rpc('can_edit_eval', {'p_user_id': user_id, 'p_eval_id': eval_id})
```

**Actions:**
- [ ] Read existing permissions.py file
- [ ] Verify wrapper functions exist for all RPC functions
- [ ] Update if any functions missing
- [ ] Verify `__init__.py` exports functions

**Expected Output:** Permission helpers ready for Lambda imports

---

### 8.5: Update eval-results Lambda (~1 hour)

**File:** `templates/_modules-functional/module-eval/backend/lambdas/eval-results/lambda_function.py`

**ADR-019c Pattern:**
```python
from eval_common.permissions import can_view_eval, can_edit_eval
from org_common import can_access_org_resource

def handle_get_eval(user_id, event, eval_id):
    # 1. Fetch resource
    eval_result = common.find_one('eval_doc_summary', {'id': eval_id})
    if not eval_result:
        return common.not_found_response('Evaluation not found')
    
    # 2. Verify org membership (MUST come first per ADR-019c)
    if not can_access_org_resource(user_id, eval_result['org_id']):
        return common.forbidden_response('Not a member of organization')
    
    # 3. Check resource permission
    if not can_view_eval(user_id, eval_id):
        return common.forbidden_response('Access denied to evaluation')
    
    return common.success_response(eval_result)
```

**Data Routes to Fix (from Lambda docstring):**
- GET /evals/{evalId} - Get eval results
- GET /evals/{evalId}/details - Get detailed results
- POST /evals - Create eval
- PATCH /evals/{evalId} - Update eval
- DELETE /evals/{evalId} - Delete eval

**Actions:**
- [ ] Add imports: `from eval_common.permissions import can_view_eval, can_edit_eval`
- [ ] Add import: `from org_common import can_access_org_resource`
- [ ] Update GET routes (view permission):
  - [ ] GET /evals/{evalId}
  - [ ] GET /evals/{evalId}/details
- [ ] Update POST/PATCH/DELETE routes (edit permission):
  - [ ] POST /evals
  - [ ] PATCH /evals/{evalId}
  - [ ] DELETE /evals/{evalId}

**Expected Output:** eval-results Lambda with full ADR-019c compliance

---

### 8.6: Update eval-prompts Lambda (~45 min)

**File:** `templates/_modules-functional/module-eval/backend/lambdas/eval-prompts/lambda_function.py`

**Data Routes to Fix:**
- GET /evals/{evalId}/prompts - Get eval prompts
- POST /evals/{evalId}/prompts - Create prompt
- PATCH /evals/{evalId}/prompts/{promptId} - Update prompt
- DELETE /evals/{evalId}/prompts/{promptId} - Delete prompt

**Actions:**
- [ ] Add imports: `from eval_common.permissions import can_view_eval, can_edit_eval`
- [ ] Add import: `from org_common import can_access_org_resource`
- [ ] Update GET routes (view permission)
- [ ] Update POST/PATCH/DELETE routes (edit permission)

**Expected Output:** eval-prompts Lambda with full ADR-019c compliance

---

### 8.7: Validate, Sync, Deploy, Test (~45 min)

**Actions:**
- [ ] Run Layer 2 validation:
  ```bash
  cd ~/code/bodhix/cora-dev-toolkit
  python3 validation/api-tracer/cli.py validate \
    --path ~/code/bodhix/testing/admin-ui/ai-mod-stack \
    --module module-eval \
    --layer2-only \
    --prefer-terraform
  ```
- [ ] Verify: **0 Layer 2 errors**
- [ ] Sync permission helpers to test project:
  ```bash
  ./scripts/sync-fix-to-project.sh \
    ~/code/bodhix/testing/admin-ui/ai-mod-stack \
    "module-eval/backend/layers/eval_common/python/eval_common/permissions.py"
  ```
- [ ] Sync Lambda updates to test project:
  ```bash
  ./scripts/sync-fix-to-project.sh \
    ~/code/bodhix/testing/admin-ui/ai-mod-stack \
    "module-eval/backend/lambdas/eval-results/lambda_function.py"
  
  ./scripts/sync-fix-to-project.sh \
    ~/code/bodhix/testing/admin-ui/ai-mod-stack \
    "module-eval/backend/lambdas/eval-prompts/lambda_function.py"
  ```
- [ ] Build module-eval Lambdas:
  ```bash
  cd ~/code/bodhix/testing/admin-ui/ai-mod-stack/packages/module-eval/backend
  bash build.sh
  ```
- [ ] Copy zips to infra repo:
  ```bash
  cp .build/*.zip ~/code/bodhix/testing/admin-ui/ai-mod-infra/build/module-eval/
  ls -lh ~/code/bodhix/testing/admin-ui/ai-mod-infra/build/module-eval/
  ```
- [ ] Deploy via Terraform:
  ```bash
  cd ~/code/bodhix/testing/admin-ui/ai-mod-infra
  ./scripts/deploy-terraform.sh dev
  ```
- [ ] Test eval UI:
  - [ ] Navigate to /admin/org/eval page
  - [ ] Create new eval
  - [ ] View eval results
  - [ ] Update eval
  - [ ] Delete eval
  - [ ] Verify no permission errors in logs

**Expected Output:** module-eval fully deployed and tested with 0 Layer 2 errors

---

### Phase 8 Completion Checklist

- [ ] RPC schema updated with can_view_eval, can_edit_eval
- [ ] Database migration created and executed
- [ ] Permission helpers verified/updated
- [ ] eval-results Lambda updated with permission checks
- [ ] eval-prompts Lambda updated with permission checks
- [ ] Validation passing (0 Layer 2 errors)
- [ ] Deployed to test environment
- [ ] UI tested and working
- [ ] Committed: "feat(module-eval): implement ADR-019c resource permission checks"

---

## Phase 9: module-chat (4-5 hours)

**Current Status:** 48 Layer 2 errors, 44 warnings  
**Lambdas:** chat-session, chat-message, chat-stream  
**Goal:** Wire up existing permission helpers to Lambda handlers

**Key Insight from S3 Session 3:**
- `chat_common/permissions.py` already exists with full implementation
- RPC functions already exist and are correct
- Issue: Lambda handlers NOT calling permission helpers yet
- ~24 unique data routes need fixes across 3 Lambdas

---

### 9.1: Review Existing RPC Schema (~15 min)

**File:** `templates/_modules-core/module-chat/db/schema/006-chat-rpc-functions.sql`

**Expected Functions (verify only, no changes needed):**
- `is_chat_owner(p_user_id, p_session_id)` - Ownership check
- `can_view_chat(p_user_id, p_session_id)` - View permission
- `can_edit_chat(p_user_id, p_session_id)` - Edit permission
- `get_accessible_chats(p_user_id, p_org_id, p_ws_id)` - Utility

**Actions:**
- [ ] Read RPC schema file
- [ ] Confirm all functions exist with correct parameter order
- [ ] Verify functions include sharing logic (ownership + shared_with)
- [ ] **No migration needed** - functions already deployed

**Expected Output:** Confirmation that RPC schema is ADR-019c compliant

---

### 9.2: Verify chat_common/permissions.py (~15 min)

**File:** `templates/_modules-core/module-chat/backend/layers/chat_common/python/chat_common/permissions.py`

**Expected Content (verify only):**
```python
def is_chat_owner(user_id: str, session_id: str) -> bool:
    """Check if user is owner of chat session."""
    return call_rpc('is_chat_owner', {'p_user_id': user_id, 'p_session_id': session_id})

def can_view_chat(user_id: str, session_id: str) -> bool:
    """Check if user can view chat (ownership + sharing)."""
    return call_rpc('can_view_chat', {'p_user_id': user_id, 'p_session_id': session_id})

def can_edit_chat(user_id: str, session_id: str) -> bool:
    """Check if user can edit chat (ownership + edit shares)."""
    return call_rpc('can_edit_chat', {'p_user_id': user_id, 'p_session_id': session_id})
```

**Actions:**
- [ ] Read existing permissions.py file
- [ ] Verify all wrapper functions exist
- [ ] Verify `__init__.py` exports functions
- [ ] **No changes needed** - file already complete from S2

**Expected Output:** Permission helpers confirmed ready for use

---

### 9.3: Update chat-session Lambda (~2 hours)

**File:** `templates/_modules-core/module-chat/backend/lambdas/chat-session/lambda_function.py`

**ADR-019c Pattern:**
```python
from chat_common.permissions import can_view_chat, can_edit_chat, is_chat_owner
from org_common import can_access_org_resource, can_access_ws_resource

def handle_get_session(user_id, event, session_id):
    # 1. Fetch resource
    session = common.find_one('chat_sessions', {'id': session_id})
    if not session:
        return common.not_found_response('Chat session not found')
    
    # 2. Verify org/ws membership (MUST come first per ADR-019c)
    if session.get('org_id'):
        if not can_access_org_resource(user_id, session['org_id']):
            return common.forbidden_response('Not a member of organization')
    
    if session.get('workspace_id'):
        if not can_access_ws_resource(user_id, session['workspace_id']):
            return common.forbidden_response('Not a member of workspace')
    
    # 3. Check resource permission
    if not can_view_chat(user_id, session_id):
        return common.forbidden_response('Access denied to chat session')
    
    return common.success_response(session)
```

**Data Routes to Fix:**
- GET /ws/{wsId}/chats - List workspace chats
- GET /chats/{sessionId} - Get single chat
- POST /ws/{wsId}/chats - Create chat
- PATCH /chats/{sessionId} - Update chat
- DELETE /chats/{sessionId} - Delete chat
- GET /chats/{sessionId}/kbs - Get KB groundings
- POST /chats/{sessionId}/kbs - Add KB grounding
- DELETE /chats/{sessionId}/kbs/{kbId} - Remove KB grounding
- GET /chats/{sessionId}/shares - Get shares
- POST /chats/{sessionId}/shares - Create share
- DELETE /chats/{sessionId}/shares/{shareId} - Delete share

**Actions:**
- [ ] Add imports: `from chat_common.permissions import can_view_chat, can_edit_chat, is_chat_owner`
- [ ] Add imports: `from org_common import can_access_org_resource, can_access_ws_resource`
- [ ] Update GET routes (view permission):
  - [ ] GET /ws/{wsId}/chats
  - [ ] GET /chats/{sessionId}
  - [ ] GET /chats/{sessionId}/kbs
  - [ ] GET /chats/{sessionId}/shares
- [ ] Update POST/PATCH/DELETE routes (edit permission):
  - [ ] POST /ws/{wsId}/chats
  - [ ] PATCH /chats/{sessionId}
  - [ ] DELETE /chats/{sessionId}
  - [ ] POST /chats/{sessionId}/kbs
  - [ ] DELETE /chats/{sessionId}/kbs/{kbId}
  - [ ] POST /chats/{sessionId}/shares
  - [ ] DELETE /chats/{sessionId}/shares/{shareId}

**Expected Output:** chat-session Lambda with full ADR-019c compliance

---

### 9.4: Update chat-message Lambda (~1 hour)

**File:** `templates/_modules-core/module-chat/backend/lambdas/chat-message/lambda_function.py`

**Data Routes to Fix:**
- GET /chats/{sessionId}/messages - List messages
- POST /chats/{sessionId}/messages - Send message
- PATCH /chats/{sessionId}/messages/{messageId} - Update message
- DELETE /chats/{sessionId}/messages/{messageId} - Delete message

**Actions:**
- [ ] Add imports: `from chat_common.permissions import can_view_chat, can_edit_chat`
- [ ] Add imports: `from org_common import can_access_org_resource, can_access_ws_resource`
- [ ] Update GET routes (view permission)
- [ ] Update POST/PATCH/DELETE routes (edit permission)

**Expected Output:** chat-message Lambda with full ADR-019c compliance

---

### 9.5: Update chat-stream Lambda (~1 hour)

**File:** `templates/_modules-core/module-chat/backend/lambdas/chat-stream/lambda_function.py`

**Data Routes to Fix:**
- POST /chats/{sessionId}/stream - Stream chat response
- GET /chats/{sessionId}/stream - Get stream status

**Actions:**
- [ ] Add imports: `from chat_common.permissions import can_view_chat, can_edit_chat`
- [ ] Add imports: `from org_common import can_access_org_resource, can_access_ws_resource`
- [ ] Update stream routes with permission checks
- [ ] Verify streaming still works after permission checks

**Expected Output:** chat-stream Lambda with full ADR-019c compliance

---

### 9.6: Validate, Sync, Deploy, Test (~1 hour)

**Actions:**
- [ ] Run Layer 2 validation:
  ```bash
  cd ~/code/bodhix/cora-dev-toolkit
  python3 validation/api-tracer/cli.py validate \
    --path ~/code/bodhix/testing/admin-ui/ai-mod-stack \
    --module module-chat \
    --layer2-only \
    --prefer-terraform
  ```
- [ ] Verify: **0 Layer 2 errors, 0 warnings**
- [ ] Sync Lambda updates to test project:
  ```bash
  ./scripts/sync-fix-to-project.sh \
    ~/code/bodhix/testing/admin-ui/ai-mod-stack \
    "module-chat/backend/lambdas/chat-session/lambda_function.py"
  
  ./scripts/sync-fix-to-project.sh \
    ~/code/bodhix/testing/admin-ui/ai-mod-stack \
    "module-chat/backend/lambdas/chat-message/lambda_function.py"
  
  ./scripts/sync-fix-to-project.sh \
    ~/code/bodhix/testing/admin-ui/ai-mod-stack \
    "module-chat/backend/lambdas/chat-stream/lambda_function.py"
  ```
- [ ] Build module-chat Lambdas:
  ```bash
  cd ~/code/bodhix/testing/admin-ui/ai-mod-stack/packages/module-chat/backend
  bash build.sh
  ```
- [ ] Copy zips to infra repo:
  ```bash
  cp .build/*.zip ~/code/bodhix/testing/admin-ui/ai-mod-infra/build/module-chat/
  ls -lh ~/code/bodhix/testing/admin-ui/ai-mod-infra/build/module-chat/
  ```
- [ ] Deploy via Terraform:
  ```bash
  cd ~/code/bodhix/testing/admin-ui/ai-mod-infra
  ./scripts/deploy-terraform.sh dev
  ```
- [ ] Test chat UI:
  - [ ] Navigate to /ws/{wsId} page
  - [ ] Create new chat session
  - [ ] Send messages
  - [ ] View chat history
  - [ ] Edit chat session
  - [ ] Delete chat session
  - [ ] Test KB grounding (add/remove KB)
  - [ ] Test chat sharing (create/delete share)
  - [ ] Test streaming responses
  - [ ] Verify no permission errors in logs

**Expected Output:** module-chat fully deployed and tested with 0 Layer 2 errors

---

### Phase 9 Completion Checklist

- [ ] RPC schema verified (no changes needed)
- [ ] Permission helpers verified (no changes needed)
- [ ] chat-session Lambda updated with permission checks
- [ ] chat-message Lambda updated with permission checks
- [ ] chat-stream Lambda updated with permission checks
- [ ] Validation passing (0 Layer 2 errors)
- [ ] Deployed to test environment
- [ ] UI tested and working (all chat operations)
- [ ] Streaming tested and working
- [ ] Committed: "feat(module-chat): implement ADR-019c resource permission checks"

---

## Session Success Criteria

**Validation:**
- [x] Phase 8: module-eval shows 0 Layer 2 errors
- [ ] Phase 9: module-chat shows 0 Layer 2 errors
- [ ] Both modules maintain 0 Layer 1 errors (admin auth)

**Deployment:**
- [ ] module-eval Lambdas deployed successfully
- [ ] module-chat Lambdas deployed successfully
- [ ] Zero-downtime blue-green deployment verified

**Testing:**
- [ ] module-eval UI fully functional
- [ ] module-chat UI fully functional
- [ ] No permission errors in CloudWatch logs
- [ ] No regressions in existing functionality

**Documentation:**
- [ ] Session plan updated with progress
- [ ] Context file updated with S3 Session 4 log
- [ ] Commits pushed to `auth-standardization-s3` branch

---

## Post-Session Actions

1. **Update Context File:**
   - Add S3 Session 4 entry to `memory-bank/context-auth-standardization.md`
   - Document metrics: errors before/after, time spent, issues encountered

2. **Update S3 Plan:**
   - Mark Phase 8 steps as complete
   - Mark Phase 9 steps as complete
   - Update Phase 10 (module-kb) status if time permits

3. **Commit Work:**
   ```bash
   git add templates/
   git commit -m "feat(module-eval): implement ADR-019c resource permission checks"
   git commit -m "feat(module-chat): implement ADR-019c resource permission checks"
   git push origin auth-standardization-s3
   ```

4. **Prepare for Next Session:**
   - Remaining modules: module-kb (58 errors), module-access (84 errors), module-voice (100 errors)
   - Total remaining: 242 Layer 2 errors across 3 modules
   - Estimated time: 14-18 hours (Phases 10-12)

---

## Key Patterns to Follow

**ADR-019c Two-Step Check:**
```python
# 1. Membership check (org or workspace)
if not can_access_org_resource(user_id, resource['org_id']):
    return forbidden_response('Not a member')

# 2. Resource permission check (ownership or sharing)
if not can_view_resource(user_id, resource_id):
    return forbidden_response('Access denied')
```

**Import Pattern:**
```python
# Module-specific permissions (in module layer)
from {module}_common.permissions import can_view_{resource}, can_edit_{resource}

# Core membership checks (in org-common)
from org_common import can_access_org_resource, can_access_ws_resource
```

**Error Messages:**
- Membership failure: "Not a member of organization" or "Not a member of workspace"
- Permission failure: "Access denied to {resource}"

---

**Session Plan Created:** February 1, 2026  
**Branch:** `auth-standardization-s3`  
**Sprint:** S3 of Auth Standardization Initiative
