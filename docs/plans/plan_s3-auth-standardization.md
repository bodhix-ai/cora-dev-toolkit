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
- [ ] Validator architecture: Layer 1 vs Layer 2 distinction
- [ ] CLI flags for layer control (`--layer1-only`, `--layer2-only`, `--resource-perms`)
- [ ] Layer 2 validation implementation (resource permission patterns)
- [ ] Assessment report: baseline of non-compliance per module
- [ ] Sprint scoping decision: fixes in S3 vs separate sprints

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
- [ ] Update context file with S3 entry

**Expected Output:** Branch and plan ready

---

## Phase 2: Enhance Validator Architecture (2-3 hours)

### Step 2.1: Add Layer Distinction in Issue Types

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
- [ ] Update `AuthIssueType` class with layer-prefixed constants
- [ ] Add new Layer 2 issue types
- [ ] Update existing validators to use new issue type naming

**Expected Output:** Clear layer distinction in all issue types

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
- [ ] Add CLI flags to `validation/api-tracer/cli.py`
- [ ] Update `FullStackValidator.__init__()` to accept layer control params
- [ ] Ensure backward compatibility with existing `--auth-only` flag

**Expected Output:** Granular control over which auth layers to validate

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
- [ ] Update `validation/api-tracer/reporter.py` to group auth issues by layer
- [ ] Add layer summaries to JSON output
- [ ] Add layer summaries to markdown/text output

**Expected Output:** Clear separation of Layer 1 vs Layer 2 issues in reports

---

## Phase 3: Implement Layer 2 Validation (3-4 hours)

### Step 3.1: Detect Data Routes

**Data routes** = Non-admin routes in modules (e.g., `/{module}/sessions`, `/chat/{id}`)

**Distinction:**
- **Admin routes:** `/admin/*` → Layer 1 validation (existing)
- **Data routes:** `/{module}/*` (excluding `/admin/*`) → Layer 2 validation (new)

**Actions:**
- [ ] Add `_detect_data_routes()` method to `LambdaAuthValidator`
- [ ] Extract data route patterns from Lambda docstrings
- [ ] Categorize routes by type (admin vs data)

**Expected Output:** List of data routes per Lambda file

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
- [ ] Add `_check_org_membership_before_resource()` method
- [ ] Detect `is_org_member`, `is_ws_member`, `can_access_org_resource` calls
- [ ] Validate call order (membership → permission)

**Expected Output:** Issues for missing/misordered membership checks

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
- [ ] Add `_check_resource_ownership()` method
- [ ] Detect `can_*`, `is_*_owner`, `check_resource_ownership` patterns
- [ ] Flag data routes without permission checks

**Expected Output:** Issues for missing resource permission checks

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
- [ ] Add `_check_admin_role_override()` method
- [ ] Detect admin checks in data route handlers
- [ ] Allow exceptions with `# ADR-019c exception:` comment

**Expected Output:** Issues for admin override anti-patterns

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
- [ ] Create `ResourcePermissionValidator` class in `auth_validator.py`
- [ ] Integrate with `AuthLifecycleValidator`
- [ ] Add to `FullStackValidator` validation flow

**Expected Output:** Working Layer 2 validator

---

## Phase 4: Run Assessment (1-2 hours)

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
- [ ] Run validator on all modules
- [ ] Capture output for each module
- [ ] Generate summary report

**Expected Output:** Validation results per module per layer

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

## Phase 5: Sprint Scoping Decision (30 minutes)

### Step 5.1: Review Assessment Results

**Decision criteria:**
- **Small scope** (≤10 errors): Include fixes in S3
- **Medium scope** (11-30 errors): Prioritize critical modules in S3, defer rest to S4
- **Large scope** (>30 errors): S3 = assessment only, fixes in S4+

**Actions:**
- [ ] Review baseline results
- [ ] Calculate total fix effort
- [ ] Make scoping decision

**Expected Output:** Decision on S3 scope

---

### Step 5.2: Update Plan Accordingly

**If fixes in S3:**
- [ ] Add Phase 6: Fix Layer 2 Issues
- [ ] Prioritize modules by issue count
- [ ] Estimate remaining sprint time

**If fixes deferred:**
- [ ] Mark S3 complete after assessment
- [ ] Create plan stub for S4
- [ ] Document handoff items

**Expected Output:** Updated plan reflecting decision

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