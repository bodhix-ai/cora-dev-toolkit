# Plan: Authentication Standardization Across CORA Modules

**Initiative:** Auth Standardization  
**Created:** January 30, 2026  
**Last Updated:** January 30, 2026 - Expanded Scope to All 27 Lambdas  
**Status:** ✅ COMPLETE  
**Completed:** January 30, 2026  
**Priority:** P0 - Blocking development efficiency  
**Next Sprint:** [plan_s1-auth-standardization.md](./completed/plan_s1-auth-standardization.md)

---

## Executive Summary

**Problem:** CORA modules lack consistent authentication patterns across 27 Lambda functions, causing:
- 2-8 hours wasted debugging auth issues per module
- Inconsistent security implementations (12 sys admin, 11 org admin, 4 ws admin patterns)
- Developer confusion about correct patterns
- Fragile code that breaks when patterns diverge

**Root Cause:** No centralized auth standards or helper functions enforced across modules.

**Proposed Solution:** 
1. Define standard auth patterns for sys_admin, org_admin, and ws_admin
2. Create helper functions in org-common layer (DRY principle)
3. Migrate all 27 lambdas to use standard patterns (4 sprints: S0-S3)
4. Enforce standards via validation tools

**Scope:** All 27 Lambda functions across 8 CORA modules (6 core + 2 functional)

**Timeline:** 4-6 weeks (32-46 hours estimated effort)

---

## Sprint Overview

| Sprint | Focus | Lambdas | Duration | Status |
|--------|-------|---------|----------|--------|
| **S0** | Analysis & Standards Definition | All 27 audited | 5-6 hours | ✅ Complete |
| **S1** | Validation Suite & Error Baseline | All 8 modules | 12 hours | ✅ Complete |
| **S2** | Admin Auth Standardization | All 8 modules | 10 hours | ✅ Complete |
| **S3** | Resource Permission Standardization | All 8 modules | TBD | ⚪ Planned |

---

## Sprint S0: Analysis & Standards Definition

**Goal:** Complete audit of all 27 lambdas and define standard auth patterns.

**Duration:** 4-6 hours

**Branch:** `auth-standardization-s0`

### Objectives

- [x] Audit all 27 lambda functions for current auth patterns
- [x] Document sys admin, org admin, ws admin implementations
- [x] Identify duplicate and inconsistent patterns
- [x] Define standard constants and helper functions
- [x] Document role hierarchy (no inheritance)
- [x] Document chat/voice sharing patterns
- [x] Create ADR for auth standardization (ADR-019)
- [x] Update .clinerules with auth standards
- [x] Create validation script for auth patterns (deferred to S1)
- [x] Define S1-S3 sprint plans (detailed)

### Deliverables

1. **Lambda Audit Report** ✅ Complete
   - 27 lambdas inventoried
   - 12 sys admin implementations identified
   - 11 org admin implementations identified
   - 4 ws admin implementations identified

2. **Standard Patterns Document** ✅ Complete
   - Role constants: `SYS_ADMIN_ROLES`, `ORG_ADMIN_ROLES`, `WS_ADMIN_ROLES`
   - Helper functions: `check_sys_admin()`, `check_org_admin()`, `check_ws_admin()`
   - Centralized router auth pattern documented
   - Org context extraction pattern documented

3. **Architectural Decision Record** ✅ Complete
   - ADR-019: Auth Standardization Strategy
   - ADR-019a: Frontend Authorization
   - ADR-019b: Backend Authorization
   - ADR-019c: Resource Permission Authorization (S2 Session 4)

4. **Sprint Plans** ✅ Complete
   - S1: Validation suite and error baseline (completed)
   - S2: Admin auth standardization (completed)
   - S3: Resource permissions (planned)

### Lambda Audit Results

#### Sys Admin (12 lambdas)

| Module | Lambda | Current Pattern | Profile Queries | Action |
|--------|--------|-----------------|-----------------|--------|
| access | identities-management | Direct `profile.sys_role` check | 1 | Standardize inline |
| access | idp-config | `profile.sys_role in SYS_ADMIN_ROLES` | 1 | Use constant ✓ |
| access | members | Direct `profile.sys_role` check | 1 | Standardize inline |
| access | org-email-domains | Direct `profile.sys_role` check | 1 | Standardize inline |
| access | orgs | Direct `profile.sys_role` check (2 places!) | 2 | Centralize |
| access | profiles | Direct `profile.sys_role` check | 1 | Standardize inline |
| ai | provider | Helper `_require_admin_access()` | 1 | Use constant |
| ai | ai-config-handler | Helper with `profile.sys_role` | 1 | Use constant |
| kb | kb-base | Direct `profile.sys_role` check | 1 | Standardize inline |
| kb | kb-document | `common.is_sys_admin(user_id)` | 1 | Use RPC ✓ |
| mgmt | lambda-mgmt | **REFERENCE** - Centralized router | 1 | **Best practice** |
| ws | workspace | Helper `_is_sys_admin()` | 1 | Use constant |

**Total:** 12 lambdas, 14 duplicate checks

#### Org Admin (11 lambdas)

| Module | Lambda | Current Pattern | Profile Queries | Action |
|--------|--------|-----------------|-----------------|--------|
| access | identities-management | `org_role in ['org_admin', 'org_owner']` | 1 | Use constant |
| access | invites | `org_role not in ['org_admin', 'org_owner']` (3x!) | 3 | Centralize |
| access | members | `validate_org_role()` + inline check | 1 | Use constant |
| access | orgs | `org_role not in ['org_admin', 'org_owner']` (2x!) | 2 | Centralize |
| chat | chat-session | **Centralized router** | 1 | **Good pattern** |
| chat | chat-message | `org_role not in ['org_admin', 'org_owner']` | 1 | Use constant |
| kb | kb-base | `org_role in ['org_owner', 'org_admin']` | 1 | Use constant |
| kb | kb-document | `org_role in ['org_owner', 'org_admin']` | 1 | Use constant |
| mgmt | lambda-mgmt | **REFERENCE** - Centralized router | 1 | **Best practice** |
| ws | workspace | Helper `_is_org_admin()` | 1 | Use constant |
| eval | eval-config | Helper with inline check | 1 | Use constant |
| eval | eval-results | `org_role in ['org_owner', 'org_admin']` | 1 | Use constant |

**Total:** 11 lambdas, 16 duplicate checks

#### WS Admin (4 lambdas)

| Module | Lambda | Current Pattern | Profile Queries | Action |
|--------|--------|-----------------|-----------------|--------|
| ws | workspace | `_is_ws_admin_or_owner()` via RPC | 1 | **Good pattern** |
| chat | chat-session | Resource ownership check | N/A | Add ws sharing |
| voice | voice-sessions | Resource ownership check | N/A | Add ws sharing |
| kb | kb-document | Resource ownership check | N/A | Add ws sharing |

**Total:** 4 lambdas, need workspace sharing standardization

### Key Findings

**Critical Issues:**
1. **5 lambdas** have duplicate auth checks within the same function (invites: 3x, orgs: 2x)
2. **Zero consistency** in constant usage (`SYS_ADMIN_ROLES` vs inline lists)
3. **No standard** for org_role checks (positive vs negative checks, different orders)
4. **Workspace sharing** not standardized across chat/voice/kb

**Best Practices Found:**
1. **module-mgmt** - Centralized router auth pattern (reference implementation)
2. **module-ws** - Good helper functions for workspace roles
3. **module-ai** - Good helper functions (but need constant usage)

---

## Sprint S1: Org Admin Standardization

**Goal:** Standardize all 11 org admin lambdas to use consistent patterns.

**Duration:** 8-12 hours

**Branch:** `auth-standardization-s1`

### Prerequisites from S0

- [x] Standard constants defined (`ORG_ADMIN_ROLES`)
- [ ] Helper function `is_org_admin()` implemented in org-common
- [ ] Validation script ready to test compliance

### Lambdas to Migrate (11)

**Priority 1 - Critical (Duplicate Checks):**
1. `access/invites` - 3 duplicate checks → Centralize at router
2. `access/orgs` - 2 duplicate checks → Centralize at router

**Priority 2 - High Impact (Inline Lists):**
3. `access/identities-management` - Use constant
4. `access/members` - Use constant
5. `chat/chat-message` - Use constant
6. `kb/kb-base` - Use constant
7. `kb/kb-document` - Use constant
8. `eval/eval-results` - Use constant

**Priority 3 - Good Pattern (Needs Constant):**
9. `chat/chat-session` - Already centralized, use constant
10. `ws/workspace` - Already has helper, use constant
11. `eval/eval-config` - Already has helper, use constant

### Implementation Pattern

**Standard Constant:**
```python
# In org_common/__init__.py
ORG_ADMIN_ROLES = ['org_owner', 'org_admin']
```

**Standard Helper:**
```python
# In org_common/auth_helpers.py
def is_org_admin(org_id: str, user_id: str) -> bool:
    """Check if user has org admin privileges in specified organization.
    
    Args:
        org_id: Organization UUID
        user_id: User UUID (Supabase user_id)
    
    Returns:
        True if user is org_owner or org_admin in the organization
    """
    membership = find_one('org_members', {
        'org_id': org_id, 
        'user_id': user_id
    })
    return membership and membership.get('org_role') in ORG_ADMIN_ROLES
```

**Usage Pattern (Centralized Router):**
```python
# At router level (once per request)
org_id = user_info.get('org_id') or query_params.get('org_id')

if path.startswith('/admin/org/'):
    if not common.is_org_admin(org_id, user_id):
        return common.forbidden_response('Organization admin role required')
```

### Validation Criteria

- [ ] All 11 lambdas use `ORG_ADMIN_ROLES` constant
- [ ] All org admin checks use `is_org_admin()` helper
- [ ] No duplicate auth checks within same lambda
- [ ] org_id always validated for org routes
- [ ] Validation script passes for all 11 lambdas

### Testing Plan

1. **Unit Tests:** Test helper function with various scenarios
2. **Integration Tests:** Test each lambda with org_admin and org_user roles
3. **Regression Tests:** Ensure no existing functionality broken
4. **Performance Tests:** Verify single query per request

---

## Sprint S2: Sys Admin Standardization

**Goal:** Standardize all 12 sys admin lambdas to use consistent patterns.

**Duration:** 8-12 hours

**Branch:** `auth-standardization-s2`

### Prerequisites from S0

- [x] Standard constants defined (`SYS_ADMIN_ROLES`)
- [ ] Helper function `is_sys_admin()` implemented in org-common
- [ ] Validation script ready to test compliance

### Lambdas to Migrate (12)

**Priority 1 - Critical (Duplicate Checks):**
1. `access/orgs` - Also has sys admin routes, needs centralization

**Priority 2 - High Impact (Inline Lists):**
2. `access/identities-management` - Use constant
3. `access/members` - Use constant
4. `access/org-email-domains` - Use constant
5. `access/profiles` - Use constant
6. `kb/kb-base` - Use constant
7. `kb/kb-document` - Already uses RPC, ensure consistent

**Priority 3 - Good Pattern (Needs Constant):**
8. `ai/provider` - Has helper, use constant
9. `ai/ai-config-handler` - Has helper, use constant
10. `ws/workspace` - Has helper, use constant
11. `eval/eval-config` - Has helper, use constant
12. `mgmt/lambda-mgmt` - Already uses constant ✓ (verify only)

**Note:** `access/idp-config` already uses `SYS_ADMIN_ROLES` constant ✓

### Implementation Pattern

**Standard Constant:**
```python
# In org_common/__init__.py
SYS_ADMIN_ROLES = ['sys_owner', 'sys_admin']
```

**Standard Helper:**
```python
# In org_common/auth_helpers.py
def is_sys_admin(user_id: str) -> bool:
    """Check if user has sys admin privileges.
    
    Args:
        user_id: User UUID (Supabase user_id)
    
    Returns:
        True if user is sys_owner or sys_admin
    """
    profile = find_one('user_profiles', {'user_id': user_id})
    return profile and profile.get('sys_role') in SYS_ADMIN_ROLES
```

**Usage Pattern (Centralized Router):**
```python
# At router level (once per request)
profile = common.find_one('user_profiles', {'user_id': supabase_user_id})

if path.startswith('/admin/sys/'):
    is_sys_admin = profile.get('sys_role') in common.SYS_ADMIN_ROLES
    if not is_sys_admin:
        return common.forbidden_response('System admin role required')
```

### Validation Criteria

- [ ] All 12 lambdas use `SYS_ADMIN_ROLES` constant
- [ ] All sys admin checks use consistent pattern
- [ ] No duplicate auth checks within same lambda
- [ ] Centralized router auth where possible
- [ ] Validation script passes for all 12 lambdas

### Testing Plan

1. **Unit Tests:** Test helper function with various scenarios
2. **Integration Tests:** Test each lambda with sys_admin and sys_user roles
3. **Regression Tests:** Ensure no existing functionality broken
4. **Performance Tests:** Verify single query per request

---

## Sprint S3: WS Admin + Sharing Standardization

**Goal:** Standardize workspace admin checks and implement consistent sharing patterns for chat/voice/kb.

**Duration:** 12-16 hours

**Branch:** `auth-standardization-s3`

### Prerequisites from S0

- [x] Standard constants defined (`WS_ADMIN_ROLES`)
- [ ] Helper function `is_ws_admin()` implemented in org-common
- [ ] RPC functions for workspace sharing created
- [ ] Chat/voice sharing pattern documented

### Lambdas to Migrate (4 + Sharing)

**Workspace Admin (4 lambdas):**
1. `ws/workspace` - Already has good helper, verify pattern
2. `chat/chat-session` - Add workspace context checks
3. `voice/voice-sessions` - Add workspace context checks
4. `kb/kb-document` - Add workspace context checks

**Sharing Pattern Implementation:**
- Chat sessions with `chat_shares` and workspace sharing
- Voice sessions with `voice_shares` and workspace sharing
- KB documents with workspace sharing

### Implementation Pattern

**Standard Constant:**
```python
# In org_common/__init__.py
WS_ADMIN_ROLES = ['ws_owner', 'ws_admin']
```

**Standard Helper:**
```python
# In org_common/auth_helpers.py
def is_ws_admin(ws_id: str, user_id: str) -> bool:
    """Check if user has workspace admin privileges.
    
    Uses RPC function for performance (single query with role check).
    
    Args:
        ws_id: Workspace UUID
        user_id: User UUID (Supabase user_id)
    
    Returns:
        True if user is ws_owner or ws_admin in the workspace
    """
    result = rpc('is_ws_admin_or_owner', {
        'p_ws_id': ws_id, 
        'p_user_id': user_id
    })
    return result is True

def can_access_resource(resource_id: str, user_id: str, resource_type: str) -> bool:
    """Check if user can access a workspace-scoped resource.
    
    Checks in order:
    1. Is user the owner?
    2. Is resource in a workspace the user is a member of?
    3. Is resource directly shared with user?
    
    Args:
        resource_id: Resource UUID (chat session, voice session, kb document)
        user_id: User UUID (Supabase user_id)
        resource_type: 'chat', 'voice', or 'kb'
    
    Returns:
        True if user has access via any mechanism
    """
    # Use RPC function for each resource type
    rpc_name = f'can_access_{resource_type}'
    result = rpc(rpc_name, {
        'p_resource_id': resource_id,
        'p_user_id': user_id
    })
    return result is True
```

**Usage Pattern (Workspace Admin):**
```python
# Check workspace admin access
if requires_admin:
    if not common.is_ws_admin(workspace_id, user_id):
        return common.forbidden_response('Workspace admin role required')
```

**Usage Pattern (Resource Access):**
```python
# Check if user can access chat/voice/kb resource
if not common.can_access_resource(session_id, user_id, 'chat'):
    return common.forbidden_response('You do not have access to this chat session')
```

### Database RPC Functions

**Create these RPC functions in module-ws schema:**

```sql
-- Already exists in module-ws
CREATE OR REPLACE FUNCTION is_ws_admin_or_owner(
    p_ws_id uuid,
    p_user_id uuid
)
RETURNS boolean AS $$
BEGIN
    -- Check if user is ws_owner or ws_admin
    RETURN EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_id = p_ws_id
        AND user_id = p_user_id
        AND ws_role IN ('ws_owner', 'ws_admin')
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Create these RPC functions in respective module schemas:**

```sql
-- module-chat
CREATE OR REPLACE FUNCTION can_access_chat(
    p_resource_id uuid,
    p_user_id uuid
)
RETURNS boolean AS $$
DECLARE
    v_owner_id uuid;
    v_workspace_id uuid;
BEGIN
    -- Get session owner and workspace
    SELECT user_id, workspace_id
    INTO v_owner_id, v_workspace_id
    FROM chat_sessions
    WHERE id = p_resource_id;
    
    -- Check 1: Is user the owner?
    IF v_owner_id = p_user_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check 2: Is session in a workspace the user is a member of?
    IF v_workspace_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM ws_members
            WHERE ws_id = v_workspace_id
            AND user_id = p_user_id
            AND deleted_at IS NULL
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Check 3: Is session directly shared with user?
    IF EXISTS (
        SELECT 1 FROM chat_shares
        WHERE session_id = p_resource_id
        AND shared_with_user_id = p_user_id
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- module-voice (similar pattern)
CREATE OR REPLACE FUNCTION can_access_voice(
    p_resource_id uuid,
    p_user_id uuid
)
RETURNS boolean AS $$
-- Similar implementation to can_access_chat
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Validation Criteria

- [ ] All workspace admin checks use `is_ws_admin()` helper
- [ ] All resource access checks use `can_access_resource()` helper
- [ ] Chat sessions support workspace and direct sharing
- [ ] Voice sessions support workspace and direct sharing
- [ ] KB documents support workspace sharing
- [ ] Validation script passes for all workspace-scoped resources

### Testing Plan

1. **Unit Tests:** Test helper functions with various scenarios
2. **Integration Tests:** Test workspace admin operations
3. **Sharing Tests:** Test workspace sharing and direct sharing
4. **Cross-Module Tests:** Test sharing between chat/voice/kb
5. **Performance Tests:** Verify RPC functions are efficient

---

## Architectural Decisions

### ADR-XXX: Auth Standardization Strategy

**Status:** Proposed

**Context:** 
CORA modules have 27 lambdas with inconsistent auth patterns across 3 admin levels (sys, org, ws), causing maintenance issues and security risks.

**Decision:**
1. Create standard constants in org-common layer
2. Create standard helper functions in org-common layer
3. Prefer centralized router auth over per-handler checks
4. Use RPC functions for complex auth logic (e.g., workspace roles)
5. No role inheritance: sys/org/ws admin are independent

**Consequences:**
- **Positive:** Single source of truth, easier to maintain, consistent security
- **Positive:** Performance improvement (single query per request)
- **Positive:** Easier to validate and audit
- **Negative:** Migration effort required (32-46 hours)
- **Negative:** Breaking changes to existing lambdas

### Role Hierarchy

**CRITICAL:** There is NO inheritance between role levels.

```
sys_admin → ONLY sys admin features
            NO automatic org_admin access
            NO automatic ws_admin access
            CAN bypass RLS on /admin/sys/* routes ONLY

org_admin → ONLY org admin features
            NO automatic sys_admin access
            NO automatic ws_admin access
            Limited to their organization

ws_admin  → ONLY workspace admin features
            NO automatic sys_admin access
            NO automatic org_admin access
            Limited to their workspace
```

**Example:**
- A sys_admin can access `/admin/sys/mgmt/*` routes
- The same sys_admin CANNOT access `/admin/org/ws/*` routes unless they are also an org_admin in that org
- The same sys_admin CANNOT access workspace admin features unless they are also a ws_admin in that workspace

### Sharing Pattern

Chat and voice sessions follow this authorization pattern:

1. **Owner:** User who created the session has full access
2. **Workspace Sharing:** If session has `workspace_id`, all workspace members have access
3. **Direct Sharing:** Session can be shared with specific users via `{module}_shares` table

**Check order (optimize for most common case first):**
```python
# 1. Owner check (fastest - single field comparison)
if resource.user_id == requesting_user_id:
    return True

# 2. Workspace membership check (common - single join)
if resource.workspace_id and is_ws_member(resource.workspace_id, requesting_user_id):
    return True

# 3. Direct share check (least common - table scan)
if exists_in_shares_table(resource.id, requesting_user_id):
    return True

return False
```

---

## Success Metrics

### Code Quality

- [ ] All modules use `SYS_ADMIN_ROLES`, `ORG_ADMIN_ROLES`, `WS_ADMIN_ROLES` constants
- [ ] All auth checks use standard helper functions
- [ ] Zero duplicate auth checks across all lambdas
- [ ] Centralized router auth where possible (>50% of lambdas)
- [ ] All auth logic in org-common layer (DRY)

### Security

- [ ] Consistent security model across all modules
- [ ] All auth centralized and auditable
- [ ] Role hierarchy enforced everywhere (no unintended inheritance)
- [ ] No auth bypass vulnerabilities
- [ ] All workspace resources properly authorized

### Developer Experience

- [ ] Auth patterns obvious and documented
- [ ] New lambdas use standard patterns from day 1
- [ ] Validation script catches non-compliant patterns
- [ ] Developer onboarding time reduced by 50%
- [ ] Zero auth-related bug reports after migration

### Performance

- [ ] Single profile query per request (not per handler)
- [ ] RPC functions optimized for common cases
- [ ] No performance regression vs current implementation

---

## Risk Assessment

### High Risk

- **Breaking Changes:** Changing auth patterns could break existing code
  - **Mitigation:** Comprehensive testing per module, phased rollout (S1→S2→S3)

- **Migration Errors:** Incorrectly migrating auth checks could create vulnerabilities
  - **Mitigation:** Validation script, security review, integration tests

### Medium Risk

- **Performance Impact:** Additional function calls could add latency
  - **Mitigation:** Benchmark before/after, optimize RPC functions, cache where appropriate

- **Scope Creep:** Discovery of additional auth issues during migration
  - **Mitigation:** Fixed sprint scope, parking lot for future work

### Low Risk

- **Developer Resistance:** Developers might resist new patterns
  - **Mitigation:** Clear documentation, validation enforcement, reference examples

---

## Time Estimate

| Sprint | Effort | Dependencies | Timeline |
|--------|--------|--------------|----------|
| S0: Analysis | 4-6 hours | None | Week 1 |
| S1: Org Admin | 8-12 hours | S0 complete | Week 2-3 |
| S2: Sys Admin | 8-12 hours | S0 complete | Week 3-4 |
| S3: WS Admin + Sharing | 12-16 hours | S0 complete, RPC functions | Week 4-6 |
| **Total** | **32-46 hours** | Sequential | **6 weeks** |

**Assumptions:**
- Part-time work (8-10 hours/week)
- Testing time included in estimates
- Documentation time included in estimates

---

## Sprint S0 Summary

**Sprint S0 successfully completed comprehensive audit and standards definition for CORA auth standardization.**

### What S0 Delivered

1. **Complete Lambda Audit:** All 27 lambdas inventoried and analyzed
2. **ADR-019 Created:** Comprehensive auth standardization strategy
3. **Standard Patterns Defined:** Constants, helper functions, and centralized router auth
4. **Sprint Plans Created:** Detailed plans for S1-S3 execution
5. **.clinerules Updated:** Auth standards documented for AI agent compliance

### Key Findings

- **Inconsistency:** 12 different sys admin implementations
- **Duplication:** 11 different org admin implementations  
- **Security Risk:** 5 lambdas with duplicate auth checks (vulnerability risk)
- **Performance Impact:** Multiple profile queries per request

### Next Sprints

- **S1 (Completed):** Built comprehensive validation suite, established error baseline
- **S2 (Completed):** Fixed all 41 admin auth errors across 8 modules (100% complete)
- **S3 (Planned):** Implement resource permission standardization (ADR-019c)

**Status:** ✅ Foundation complete. S1 and S2 successfully executed. S3 planned for resource permissions.

---

## Appendix: Lambda Reference Table

| Module | Lambda | Sys Admin | Org Admin | WS Admin | Current Pattern | Target Sprint |
|--------|--------|-----------|-----------|----------|-----------------|---------------|
| access | identities-management | ✅ | ✅ | ❌ | Inline checks | S1, S2 |
| access | idp-config | ✅ | ❌ | ❌ | Constant ✓ | S2 (verify) |
| access | invites | ❌ | ✅ (3x!) | ❌ | Duplicated | S1 |
| access | members | ✅ | ✅ | ❌ | Mixed | S1, S2 |
| access | org-email-domains | ✅ | ❌ | ❌ | Inline | S2 |
| access | orgs | ✅ (2x!) | ✅ (2x!) | ❌ | Duplicated | S1, S2 |
| access | profiles | ✅ | ❌ | ❌ | Inline | S2 |
| ai | provider | ✅ | ❌ | ❌ | Helper | S2 |
| ai | ai-config-handler | ✅ | ❌ | ❌ | Helper | S2 |
| chat | chat-session | ✅ | ✅ | ✅ | Centralized | S1, S2, S3 |
| chat | chat-message | ❌ | ✅ | ❌ | Inline | S1 |
| chat | chat-stream | ❌ | ❌ | ❌ | N/A | - |
| kb | kb-processor | ❌ | ❌ | ❌ | SQS | - |
| kb | kb-base | ✅ | ✅ | ❌ | Inline | S1, S2 |
| kb | kb-document | ✅ | ✅ | ✅ | RPC | S1, S2, S3 |
| mgmt | lambda-mgmt | ✅ | ✅ | ❌ | **REFERENCE** | S2 (verify) |
| ws | workspace | ✅ | ✅ | ✅ | Good helpers | S1, S2, S3 |
| ws | cleanup | ❌ | ❌ | ❌ | Internal | - |
| eval | eval-config | ✅ | ✅ | ❌ | Helper | S1, S2 |
| eval | eval-processor | ❌ | ❌ | ❌ | SQS | - |
| eval | eval-results | ✅ | ✅ | ❌ | Inline | S1, S2 |
| voice | voice-analytics | ? | ? | ? | TBD | S3 |
| voice | voice-configs | ? | ? | ? | TBD | S3 |
| voice | voice-credentials | ? | ? | ? | TBD | S3 |
| voice | voice-sessions | ❌ | ❌ | ✅ | TBD | S3 |
| voice | voice-transcripts | ? | ? | ? | TBD | S3 |
| voice | voice-websocket | ? | ? | ? | TBD | S3 |

**Total Migrations:**
- S1 (Org Admin): 11 lambdas
- S2 (Sys Admin): 12 lambdas
- S3 (WS Admin + Sharing): 4 lambdas + sharing pattern
- **Total: 27 lambdas**

---

**End of Plan**