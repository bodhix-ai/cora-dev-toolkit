# Sprint S3: Resource Permission Validation - Implementation Plan

**Status**: 🟡 IN PROGRESS  
**Priority**: HIGH  
**Estimated Duration**: 8-12 hours  
**Created**: 2026-02-01  
**Branch**: `auth-standardization-s3`  
**Context**: [context-auth-standardization.md](../../memory-bank/context-auth-standardization.md)  
**Dependencies**: ADR-019c, S2 completion

---

## Executive Summary

Sprint S3 extends the api-tracer validator to assess compliance with ADR-019c (Resource Permission Authorization) - the second authorization layer for data routes (`/{module}/*`). This sprint focuses on ASSESSMENT FIRST: enhance the validator, run it across all modules, then decide whether to include fixes in S3 or defer to separate sprints.

**Current State:**
- ✅ Layer 1 validation complete (admin auth - ADR-019a/b)
- ✅ All 8 modules 100% compliant with admin auth patterns
- ❌ No validation for Layer 2 (resource permissions - ADR-019c)
- ❌ Unknown scope of Layer 2 non-compliance

**Goal:** Extend validator to detect ADR-019c compliance issues, assess scope, then plan fixes.

---

## Scope

### In Scope
- [x] Validator architecture: Layer 1 vs Layer 2 distinction ✅ (S3 Session 1)
- [x] CLI flags for layer control (`--layer1-only`, `--layer2-only`, `--resource-perms`) ✅ (S3 Session 1)
- [x] Layer 2 validation implementation (resource permission patterns) ✅ (S3 Session 1)
- [x] Assessment report: baseline of non-compliance per module ✅ (S3 Session 1)
- [x] Sprint scoping decision: fixes in S3 vs separate sprints ✅ (S3 Session 1)

### Out of Scope
- Actual fixes to Layer 2 issues (dependent on assessment results)
- Frontend resource permission patterns (future)
- Resource sharing implementation (future)

---

## Phase 1: Start Sprint S3 (30 minutes)

### Step 1.1: Create Branch and Plan ✅ COMPLETE

**Actions:**
- [x] Create branch `auth-standardization-s3` from main
- [x] Create plan file `plan_s3-auth-standardization.md`
- [x] Update context file with S3 entry ✅ (S3 Session 1)

**Expected Output:** Branch and plan ready

---

## Phase 2: Enhance Validator Architecture ✅ COMPLETE

**Status:** ✅ Complete (S3 Session 1)

### Step 2.1: Add Layer Distinction in Issue Types ✅ COMPLETE

**Current state:** All auth issues use `auth_*` prefix without layer distinction.

**New structure:**
```python
# Layer 1: Admin Authorization (ADR-019a/b)
auth_admin_missing_check_sys_admin
auth_admin_missing_check_org_admin
auth_admin_missing_org_context_extraction
...

# Layer 2: Resource Permissions (ADR-019c)
auth_resource_missing_org_membership_check
auth_resource_missing_ownership_check
auth_resource_admin_role_override
auth_resource_missing_scope_before_permission
```

**Actions:**
- [x] Update `AuthIssueType` class with layer-prefixed constants ✅ (S3 Session 1)
- [x] Add new Layer 2 issue types ✅ (S3 Session 1)
- [x] Update existing validators to use new issue type naming ✅ (S3 Session 1)

**Expected Output:** Clear layer distinction in all issue types ✅ COMPLETE

---

### Step 2.2: Add CLI Flags for Layer Control

**New flags:**
```bash
--layer1-only      # Admin auth validation only (ADR-019a/b)
--layer2-only      # Resource permission validation only (ADR-019c)
--all-auth         # Both layers (default)
--resource-perms   # Enable Layer 2 (default: on when implemented)
--no-resource-perms # Disable Layer 2
```

**Actions:**
- [x] Add CLI flags to `validation/api-tracer/cli.py` ✅ (S3 Session 1)
- [x] Update `FullStackValidator.__init__()` to accept layer control params ✅ (S3 Session 1)
- [x] Ensure backward compatibility with existing `--auth-only` flag ✅ (S3 Session 1)

**Expected Output:** Granular control over which auth layers to validate ✅ COMPLETE

---

### Step 2.3: Update Reporter to Group by Layer

**Current output:** Single auth section, no layer distinction.

**New output format:**
```
=== AUTH VALIDATION RESULTS ===

Layer 1: Admin Authorization (ADR-019a/b)
  Errors:   0
  Warnings: 0
  Status:   ✅ PASS

Layer 2: Resource Permissions (ADR-019c)
  Errors:   23
  Warnings: 5
  Status:   ❌ FAIL

By Module:
  module-chat:
    - Layer 1: 0 errors, 0 warnings
    - Layer 2: 5 errors, 2 warnings
  
  module-voice:
    - Layer 1: 0 errors, 0 warnings
    - Layer 2: 8 errors, 1 warning
  
  module-kb:
    - Layer 1: 0 errors, 0 warnings
    - Layer 2: 4 errors, 1 warning
```

**Actions:**
- [x] Update `validation/api-tracer/reporter.py` to group auth issues by layer ✅ (S3 Session 1)
- [x] Add layer summaries to JSON output ✅ (S3 Session 1)
- [x] Add layer summaries to markdown/text output ✅ (S3 Session 1)

**Expected Output:** Clear separation of Layer 1 vs Layer 2 issues in reports ✅ COMPLETE

**Session 2 Enhancement:** Reporter updated with color-coded layer breakdown display
- Updated validator.py: `_generate_report()` to separate Layer 1/Layer 2 counts
- Updated reporter.py: `_format_text()` with color-coded layer display
- Updated cli.py: Handle new summary structure with backward compatibility
- Fixed layer detection for doubled prefix (`auth_auth_admin_*`, `auth_auth_resource_*`)

---

## Phase 3: Implement Layer 2 Validation ✅ COMPLETE

**Status:** ✅ Complete (S3 Session 1)

### Step 3.1: Detect Data Routes

**Data routes** = Non-admin routes in modules (e.g., `/{module}/sessions`, `/chat/{id}`)

**Distinction:**
- **Admin routes:** `/admin/*` → Layer 1 validation (existing)
- **Data routes:** `/{module}/*` (excluding `/admin/*`) → Layer 2 validation (new)

**Actions:**
- [x] Add `_detect_data_routes()` method to `LambdaAuthValidator` ✅ (S3 Session 1)
- [x] Extract data route patterns from Lambda docstrings ✅ (S3 Session 1)
- [x] Categorize routes by type (admin vs data) ✅ (S3 Session 1)

**Expected Output:** List of data routes per Lambda file ✅ COMPLETE

---

### Step 3.2: Validate Org Membership Before Resource Permission

**Required pattern per ADR-019c:**
```python
# 1. Fetch resource
resource = common.find_one('table', {'id': resource_id})

# 2. Verify org membership (MUST come first)
if not call_rpc('is_org_member', {'p_org_id': resource['org_id'], 'p_user_id': user_id}):
    return common.forbidden_response('Not a member')

# 3. Check resource permission (ownership/sharing)
if not can_access_resource(user_id, resource_id):
    return common.forbidden_response('Access denied')
```

**Detection logic:**
- Parse Lambda AST for data route handlers
- Check for `is_org_member` or `can_access_org_resource` call
- Check order: membership check BEFORE permission check
- Flag if missing or out of order

**Actions:**
- [x] Add `_check_org_membership_before_resource()` method ✅ (S3 Session 1)
- [x] Detect `is_org_member`, `is_ws_member`, `can_access_org_resource` calls ✅ (S3 Session 1)
- [x] Validate call order (membership → permission) ✅ (S3 Session 1)

**Expected Output:** Issues for missing/misordered membership checks ✅ COMPLETE

---

### Step 3.3: Validate Resource Ownership/Permission Checks

**Required pattern:**
```python
# Module-specific permission helpers (in module layer)
from chat_common.permissions import can_access_chat

if not can_access_chat(user_id, session_id):
    return common.forbidden_response('Access denied')
```

**Or generic pattern:**
```python
# Generic helpers (in org-common)
if not common.check_resource_ownership(user_id, 'chats', chat_id):
    return common.forbidden_response('Access denied')
```

**Detection logic:**
- Check for `can_*` function calls (module-specific)
- Check for `is_*_owner` RPC calls
- Check for `check_resource_ownership` calls
- Flag if missing

**Actions:**
- [x] Add `_check_resource_ownership()` method ✅ (S3 Session 1)
- [x] Detect `can_*`, `is_*_owner`, `check_resource_ownership` patterns ✅ (S3 Session 1)
- [x] Flag data routes without permission checks ✅ (S3 Session 1)

**Expected Output:** Issues for missing resource permission checks ✅ COMPLETE

---

### Step 3.4: Detect Admin Role Override Anti-Pattern

**Anti-pattern per ADR-019c:**
```python
# WRONG: Admin gets automatic access to user data
if is_sys_admin(user_id):
    return get_user_chat(session_id)  # Bypasses ownership check
```

**Correct pattern:**
```python
# CORRECT: Admin must be granted access explicitly
if not can_access_chat(user_id, session_id):
    return common.forbidden_response('Access denied')
# No admin override
```

**Detection logic:**
- Check for `is_*_admin` or `check_*_admin` calls in data route handlers
- If found, flag as anti-pattern (unless documented exception)

**Actions:**
- [x] Add `_check_admin_role_override()` method ✅ (S3 Session 1)
- [x] Detect admin checks in data route handlers ✅ (S3 Session 1)
- [x] Allow exceptions with `# ADR-019c exception:` comment ✅ (S3 Session 1)

**Expected Output:** Issues for admin override anti-patterns ✅ COMPLETE

---

### Step 3.5: Create ResourcePermissionValidator Class

**Architecture:**
```python
class ResourcePermissionValidator:
    """Validates Lambda resource permission patterns per ADR-019c."""
    
    def __init__(self):
        self.issues: List[AuthIssue] = []
        self.data_routes: List[Tuple[str, str]] = []  # (method, path)
    
    def validate_file(self, file_path: str, content: str) -> List[AuthIssue]:
        """Validate a Lambda file for resource permission patterns."""
        # Extract data routes
        # Check org membership before permission
        # Check resource ownership/permission
        # Detect admin override anti-patterns
        return self.issues
```

**Actions:**
- [x] Create `ResourcePermissionValidator` class in `auth_validator.py` ✅ (S3 Session 1)
- [x] Integrate with `AuthLifecycleValidator` ✅ (S3 Session 1)
- [x] Add to `FullStackValidator` validation flow ✅ (S3 Session 1)

**Expected Output:** Working Layer 2 validator ✅ COMPLETE

---

## Phase 4: Run Assessment ✅ COMPLETE

**Status:** ✅ Complete (S3 Session 1)

### Step 4.1: Validate All Modules with Both Layers

**Command:**
```bash
# All modules, both layers
python3 validation/api-tracer/cli.py validate \
  --path ~/code/bodhix/testing/admin-ui/ai-mod-stack \
  --all-auth \
  --prefer-terraform

# Per module with both layers
for module in module-chat module-kb module-voice module-eval module-mgmt module-ai module-ws module-access; do
  echo "=== $module ==="
  python3 validation/api-tracer/cli.py validate \
    --path ~/code/bodhix/testing/admin-ui/ai-mod-stack \
    --module $module \
    --all-auth \
    --prefer-terraform
done
```

**Actions:**
- [x] Run validator on all modules ✅ (S3 Session 1)
- [x] Capture output for each module ✅ (S3 Session 1)
- [x] Generate summary report ✅ (S3 Session 1)

**Expected Output:** Validation results per module per layer ✅ COMPLETE

---

### Step 4.2: Document Baseline Results

**Format:**
```markdown
## Layer 2 Resource Permission Validation Baseline

**Date:** 2026-02-01  
**Validator Version:** api-tracer v2.0 (with ADR-019c support)

### Summary

| Layer | Errors | Warnings | Status |
|-------|--------|----------|--------|
| Layer 1 (Admin Auth) | 0 | 0 | ✅ PASS |
| Layer 2 (Resource Perms) | 23 | 5 | ❌ FAIL |

### By Module

| Module | Layer 1 Errors | Layer 2 Errors | Layer 2 Warnings | Total Issues |
|--------|---------------|----------------|------------------|--------------|
| module-chat | 0 | 5 | 2 | 7 |
| module-voice | 0 | 8 | 1 | 9 |
| module-kb | 0 | 4 | 1 | 5 |
| module-eval | 0 | 6 | 1 | 7 |
| module-mgmt | 0 | 0 | 0 | 0 |
| module-ai | 0 | 0 | 0 | 0 |
| module-ws | 0 | 0 | 0 | 0 |
| module-access | 0 | 0 | 0 | 0 |

### Issue Breakdown

By issue type:
- `auth_resource_missing_org_membership_check`: 12
- `auth_resource_missing_ownership_check`: 8
- `auth_resource_admin_role_override`: 3
- `auth_resource_missing_scope_before_permission`: 5

### Analysis

Modules with data routes (chat, voice, kb, eval) show Layer 2 issues.
Modules without data routes (mgmt, ai, ws, access) are compliant by default.

Estimated fix time: X-Y hours
```

**Actions:**
- [ ] Create baseline document in this plan file
- [ ] Summarize results by module and issue type
- [ ] Estimate fix effort

**Expected Output:** Baseline assessment document

---

## Phase 5: Sprint Scoping Decision ✅ COMPLETE

### Assessment Results

**Total Layer 2 Issues:** 312 errors, 138 warnings across 6 modules

**By Module (Priority Order):**
1. module-ws (2 errors) - Quick win
2. module-eval (20 errors) - Small scope
3. module-chat (48 errors) - Medium scope
4. module-kb (58 errors) - Medium scope
5. module-access (84 errors) - Large scope
6. module-voice (100 errors) - Largest scope

**Decision:** ✅ **Fix all 312 errors in S3** (Option A)
- Estimated effort: 20-30 hours
- Systematic approach: smallest to largest modules
- Template-first workflow with validation after each module

---

## Phase 6: Implement Core ADR-019c Patterns (2-3 hours) ✅ PARTIAL COMPLETE

**Status:** 50% complete (3 of 6 modules + tooling)

### Step 6.0: Infrastructure Improvements ✅ COMPLETE

**Actions Completed:**
- [x] Enhanced `scripts/sync-fix-to-project.sh` to support `backend/layers/` paths
- [x] Added patterns for core and functional module layers
- [x] Layer files validated to only sync to stack repo (not infra)

**Impact:** Will significantly accelerate remaining module deployments (kb, access, voice)

---

### Step 6.1: Create Module-Specific Permission Helpers ✅ PARTIAL COMPLETE

**Pattern:** Each module implements its own permission layer (ADR-019c design)

**Template structure:**
```python
# templates/_modules-*/backend/layers/*_common/python/*_common/permissions.py

from org_common.db import call_rpc

def can_access_<resource>(user_id: str, resource_id: str) -> bool:
    """Check if user can access resource (ownership + future sharing)"""
    # Check ownership
    if call_rpc('is_<resource>_owner', {
        'p_user_id': user_id, 
        'p_resource_id': resource_id
    }):
        return True
    
    # Future: Check sharing
    # if call_rpc('is_resource_shared_with', {...}):
    #     return True
    
    return False
```

**Actions:**
- [x] Create `permissions.py` for module-chat (already existed from S2)
- [x] Create `permissions.py` for module-ws ✅ **DEPLOYED** (S3 Session 2-3)
  - **Note:** Also aligned RPC parameter order to ADR-019c standard `(p_user_id, p_ws_id)`
  - Updated 5 database RPCs, 2 internal RPC calls, Lambda wrappers
  - **Bug Fix (S3 Session 3):** Fixed `toggle_ws_favorite` parameter mismatch
    - Created migration `20260201_adr019c_workspace_rpc_param_align.sql` with DROP statements
    - Fixed schema file parameter order: `(p_ws_id, p_user_id)` → `(p_user_id, p_ws_id)`
    - Redeployed Lambda to test environment
  - Status: Deployed to test environment, ready for UI testing
- [x] Create `permissions.py` for module-eval (template created, not deployed)
- [ ] Create `permissions.py` for module-kb
- [ ] Create `permissions.py` for module-access
- [ ] Create `permissions.py` for module-voice

**Expected Output:** Permission helper template for each module

---

### Step 6.2: Update org-common with Core Membership Helpers ✅ COMPLETE

**Already exists in templates from S2 work, verified:**
- `can_access_org_resource(user_id, org_id)`
- `can_access_ws_resource(user_id, ws_id)`
- `check_resource_ownership()` (generic)
- `check_rpc_permission()` (generic)

**Actions:**
- [x] Verify org-common helpers exist
- [x] Test helpers in test project

**Expected Output:** Core helpers available for all modules

---

### Phase 6 Summary

**Completed (3 of 6):**
- ✅ module-chat (existed from S2)
- ✅ module-ws (FULLY ALIGNED + DEPLOYED)
- ✅ module-eval (template created)

**Remaining (3 of 6):**
- ⏸️ module-kb
- ⏸️ module-access
- ⏸️ module-voice

**Next Session Goals:**
1. Verify module-ws UI testing results
2. Create permissions.py for module-kb, module-access, module-voice
3. Consider starting Phase 7 if Phase 6 completes quickly

---

## Phase 7: Fix module-ws (2 errors) - Quick Win (1 hour)

**Errors:** 2 Layer 2 errors, 14 warnings

**Lambda files:**
- `workspace/lambda_function.py`

**Pattern to implement:**
```python
# 1. Verify workspace membership
if not common.can_access_ws_resource(user_id, ws_id):
    return common.forbidden_response('Not a workspace member')

# 2. Check resource permission (if needed)
from ws_common.permissions import can_access_ws_resource
if not can_access_ws_resource(user_id, ws_id):
    return common.forbidden_response('Access denied')
```

**Actions:**
- [ ] Create `ws_common/permissions.py`
- [ ] Add membership checks to data routes
- [ ] Run validation: `--module module-ws --layer2-only`
- [ ] Deploy and test
- [ ] Commit: "fix(module-ws): implement ADR-019c resource permissions"

**Expected Output:** module-ws: 0 Layer 2 errors

---

## Phase 8: Fix module-eval (20 errors) (2-3 hours)

**Errors:** 20 Layer 2 errors, 0 warnings

**Lambda files:**
- `eval-results/lambda_function.py`
- `eval-prompts/lambda_function.py`

**Pattern:**
```python
# In eval-results Lambda
from eval_common.permissions import can_access_eval

# Get eval
eval = common.find_one('evals', {'id': eval_id})

# Verify org membership
if not common.can_access_org_resource(user_id, eval['org_id']):
    return common.forbidden_response('Not a member')

# Check eval permission
if not can_access_eval(user_id, eval_id):
    return common.forbidden_response('Access denied')
```

**Actions:**
- [ ] Create `eval_common/permissions.py`
- [ ] Implement `can_access_eval()`, `can_edit_eval()`
- [ ] Add membership + permission checks to all eval data routes
- [ ] Run validation: `--module module-eval --layer2-only`
- [ ] Sync to test project and deploy
- [ ] Test eval UI functionality
- [ ] Commit: "fix(module-eval): implement ADR-019c resource permissions"

**Expected Output:** module-eval: 0 Layer 2 errors

---

## Phase 9: Fix module-chat (48 errors) (4-5 hours)

**Errors:** 48 Layer 2 errors, 44 warnings

**Lambda files:**
- `chat-session/lambda_function.py`
- `chat-message/lambda_function.py`
- `chat-stream/lambda_function.py`

**Pattern:**
```python
# In chat-session Lambda
from chat_common.permissions import can_access_chat, can_edit_chat

# Get chat session
session = common.find_one('chat_sessions', {'id': session_id})

# Verify org membership
if not common.can_access_org_resource(user_id, session['org_id']):
    return common.forbidden_response('Not a member')

# Check chat permission
if not can_access_chat(user_id, session_id):
    return common.forbidden_response('Access denied')
```

**Actions:**
- [ ] Create `chat_common/permissions.py`
- [ ] Implement `can_access_chat()`, `can_edit_chat()`, `can_share_chat()`
- [ ] Add membership + permission checks to chat-session routes
- [ ] Add membership + permission checks to chat-message routes
- [ ] Add membership + permission checks to chat-stream routes
- [ ] Run validation: `--module module-chat --layer2-only`
- [ ] Sync to test project and deploy all 3 Lambdas
- [ ] Test chat UI (create, view, edit, delete sessions)
- [ ] Commit: "fix(module-chat): implement ADR-019c resource permissions"

**Expected Output:** module-chat: 0 Layer 2 errors

---

## Phase 10: Fix module-kb (58 errors) (5-6 hours)

**Errors:** 58 Layer 2 errors, 40 warnings

**Lambda files:**
- `kb-base/lambda_function.py`
- `kb-document/lambda_function.py`

**Pattern:**
```python
# In kb-base Lambda
from kb_common.permissions import can_access_kb, can_edit_kb

# Get KB
kb = common.find_one('kb_bases', {'id': kb_id})

# Verify org membership
if not common.can_access_org_resource(user_id, kb['org_id']):
    return common.forbidden_response('Not a member')

# Check KB permission
if not can_access_kb(user_id, kb_id):
    return common.forbidden_response('Access denied')
```

**Actions:**
- [ ] Create `kb_common/permissions.py`
- [ ] Implement `can_access_kb()`, `can_edit_kb()`, `can_manage_kb()`
- [ ] Add membership + permission checks to kb-base routes
- [ ] Add membership + permission checks to kb-document routes
- [ ] Run validation: `--module module-kb --layer2-only`
- [ ] Sync to test project and deploy both Lambdas
- [ ] Test KB UI (create, view, edit, delete bases/documents)
- [ ] Commit: "fix(module-kb): implement ADR-019c resource permissions"

**Expected Output:** module-kb: 0 Layer 2 errors

---

## Phase 11: Fix module-access (84 errors) (6-8 hours)

**Errors:** 84 Layer 2 errors, 20 warnings

**Lambda files:**
- `orgs/lambda_function.py`
- `invites/lambda_function.py`
- `users/lambda_function.py`

**Pattern:**
```python
# In users Lambda
from access_common.permissions import can_access_user, can_edit_user

# Get user profile
user_profile = common.find_one('user_profiles', {'user_id': user_id})

# Verify org membership (for org-scoped operations)
if org_id and not common.can_access_org_resource(user_id, org_id):
    return common.forbidden_response('Not a member')

# Check user permission
if not can_access_user(requesting_user_id, target_user_id):
    return common.forbidden_response('Access denied')
```

**Actions:**
- [ ] Create `access_common/permissions.py`
- [ ] Implement `can_access_user()`, `can_edit_user()`, `can_view_org()`, `can_manage_invites()`
- [ ] Add membership + permission checks to users routes
- [ ] Add membership + permission checks to orgs routes
- [ ] Add membership + permission checks to invites routes
- [ ] Run validation: `--module module-access --layer2-only`
- [ ] Sync to test project and deploy all 3 Lambdas
- [ ] Test access UI (user profiles, org membership, invites)
- [ ] Commit: "fix(module-access): implement ADR-019c resource permissions"

**Expected Output:** module-access: 0 Layer 2 errors

---

## Phase 12: Fix module-voice (100 errors) (8-10 hours)

**Errors:** 100 Layer 2 errors, 20 warnings

**Lambda files:**
- `voice-sessions/lambda_function.py`
- `voice-analytics/lambda_function.py`

**Pattern:**
```python
# In voice-sessions Lambda
from voice_common.permissions import can_access_voice, can_edit_voice

# Get voice session
session = common.find_one('voice_sessions', {'id': session_id})

# Verify org membership
if not common.can_access_org_resource(user_id, session['org_id']):
    return common.forbidden_response('Not a member')

# Check voice permission
if not can_access_voice(user_id, session_id):
    return common.forbidden_response('Access denied')
```

**Actions:**
- [ ] Create `voice_common/permissions.py`
- [ ] Implement `can_access_voice()`, `can_edit_voice()`, `can_view_analytics()`
- [ ] Add membership + permission checks to voice-sessions routes
- [ ] Add membership + permission checks to voice-analytics routes
- [ ] Run validation: `--module module-voice --layer2-only`
- [ ] Sync to test project and deploy both Lambdas
- [ ] Test voice UI (sessions, transcripts, analytics)
- [ ] Commit: "fix(module-voice): implement ADR-019c resource permissions"

**Expected Output:** module-voice: 0 Layer 2 errors

---

## Phase 13: Final Validation and Deployment (2-3 hours)

### Step 13.1: Run Full Validation on All Modules

**Actions:**
- [ ] Run validator with both layers on all modules:
  ```bash
  python3 validation/api-tracer/cli.py validate \
    --path ~/code/bodhix/testing/admin-ui/ai-mod-stack \
    --all-auth \
    --prefer-terraform
  ```
- [ ] Verify: 0 Layer 1 errors, 0 Layer 2 errors across all 8 modules
- [ ] Document final results

**Expected Output:** Clean validation across all modules

---

### Step 13.2: Update Templates with All Fixes

**Actions:**
- [ ] Verify all permission helpers are in templates
- [ ] Verify all Lambda fixes are in templates
- [ ] Run validation on templates directory
- [ ] Commit: "feat: complete ADR-019c implementation across all modules"

**Expected Output:** Templates ready for new projects

---

### Step 13.3: Deploy to Test Project

**Actions:**
- [ ] Deploy all updated Lambdas to test project
- [ ] Run smoke tests on each module
- [ ] Verify no regressions in admin functionality
- [ ] Document any deployment issues

**Expected Output:** Test project fully compliant with ADR-019

---

### Step 13.4: Create Deployment Guide

**Actions:**
- [ ] Document deployment order for existing projects
- [ ] Create migration guide for pm-app
- [ ] Document testing checklist
- [ ] Create rollback plan

**Expected Output:** Safe deployment guide for production

---

## Success Criteria

- [x] Branch `auth-standardization-s3` created
- [ ] Plan file `plan_s3-auth-standardization.md` created
- [ ] Context file updated with S3 entry
- [ ] Validator distinguishes Layer 1 vs Layer 2 in reporting
- [ ] CLI supports layer control flags (`--layer1-only`, `--layer2-only`)
- [ ] Layer 2 validation detects:
  - Missing org membership checks
  - Missing resource ownership checks
  - Admin role override anti-patterns
- [ ] Baseline assessment documented with:
  - Errors per module per layer
  - Issue type breakdown
  - Fix effort estimate
- [ ] Sprint scoping decision made

---

## Rollback Plan

If something goes wrong:
1. Revert validator changes: `git checkout main validation/api-tracer/`
2. Delete branch: `git branch -D auth-standardization-s3`
3. Existing Layer 1 validation continues to work

---

## Related Documents

- [ADR-019c: Resource Permission Authorization](../arch%20decisions/ADR-019c-AUTH-RESOURCE-PERMISSIONS.md)
- [Sprint Management Guide](../guides/guide_SPRINT-MANAGEMENT.md)
- [Context: Auth Standardization](../../memory-bank/context-auth-standardization.md)

---

**Document Status:** 🟡 IN PROGRESS  
**Branch:** `auth-standardization-s3`  
**Sprint:** S3 of Auth Standardization Initiative