# Context: Authentication Standardization

**Created:** January 30, 2026
**Last Updated:** January 30, 2026 - Expanded Scope to All 27 Lambdas
**Primary Focus:** Standardization of authentication patterns across all CORA modules (sys, org, ws admin)

## Initiative Overview

The goal of this initiative is to standardize authentication and authorization patterns across **all 27 Lambda functions** in the 8 CORA modules. Currently, modules use inconsistent patterns for checking system admin, organization admin, and workspace admin privileges, leading to fragile code, security risks, and developer confusion.

**Problem:**
- **12 different implementations** of sys admin checks across modules
- **11 different implementations** of org admin checks across modules
- **4 different implementations** of workspace admin checks (only in module-ws)
- Inconsistent auth checks (some use RPC, some direct SQL, some inline, some helpers)
- Module-chat was broken due to incorrect pattern (passing user_id instead of JWT to RPC)
- 2-8 hours wasted per module debugging auth issues
- No standard pattern for workspace admin authorization

**Solution:**
- Create standardized auth helper functions in `org-common` layer
- Define standard patterns for sys_admin, org_admin, and ws_admin checks
- Implement DRY principle: single source of truth for each auth level
- Migrate all 27 lambdas to use standard patterns
- Enforce standards via validation tools

## Sprint Structure

The initiative is organized into 4 sprints:

| Sprint | Focus | Lambdas | Estimated Effort |
|--------|-------|---------|------------------|
| **S0** | Analysis & Standards Definition | All 27 | 4-6 hours |
| **S1** | Org Admin Standardization | 11 lambdas | 8-12 hours |
| **S2** | Sys Admin Standardization | 12 lambdas | 8-12 hours |
| **S3** | WS Admin Standardization | 4 lambdas + shared resources | 12-16 hours |

**Total Estimated Effort:** 32-46 hours (4-6 weeks at part-time pace)

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|--------------|
| S0 | `auth-standardization-s0` | `plan_auth-standardization-s0.md` | 🟡 Active | - |
| S1 | TBD | `plan_auth-standardization-s1.md` (to be created) | ⚪ Planned | - |
| S2 | TBD | `plan_auth-standardization-s2.md` (to be created) | ⚪ Planned | - |
| S3 | TBD | `plan_auth-standardization-s3.md` (to be created) | ⚪ Planned | - |

## Current Sprint: S0 - Analysis & Standards Definition

- **Branch:** `auth-standardization-s0`
- **Plan:** `docs/plans/plan_auth-standardization-s0.md`
- **Focus:** 
  - Audit all 27 lambdas for current auth patterns
  - Define standard patterns for sys, org, ws admin checks
  - Document role hierarchy and access rules
  - Create implementation roadmap for S1-S3

## Lambda Inventory (27 Total)

### Core Modules (18 Lambdas)

**module-access (7):**
- identities-management (sys admin)
- idp-config (sys admin)
- invites (org admin - 3 duplicate checks!)
- members (sys + org admin)
- org-email-domains (sys admin)
- orgs (sys + org admin - 2 duplicate checks!)
- profiles (sys admin)

**module-ai (2):**
- provider (sys admin via helper)
- ai-config-handler (sys admin via helper)

**module-chat (3):**
- chat-session (sys + org admin - centralized router)
- chat-message (org admin)
- chat-stream (no admin routes)

**module-kb (3):**
- kb-processor (SQS - no admin routes)
- kb-base (sys + org admin)
- kb-document (sys + org admin)

**module-mgmt (1):**
- lambda-mgmt (sys + org admin - **REFERENCE PATTERN**)

**module-ws (2):**
- workspace (sys + org + ws admin - good helpers)
- cleanup (internal - no admin routes)

### Functional Modules (9 Lambdas)

**module-eval (3):**
- eval-config (sys + org admin)
- eval-processor (SQS - no admin routes)
- eval-results (sys + org admin)

**module-voice (6):**
- voice-analytics (needs analysis)
- voice-configs (needs analysis)
- voice-credentials (needs analysis)
- voice-sessions (needs analysis)
- voice-transcripts (needs analysis)
- voice-websocket (needs analysis)

## Key Architectural Decisions

### 1. No Role Inheritance

**CRITICAL:** Role levels are completely independent with NO inheritance:

- **sys_admin** → ONLY sys admin features (platform-wide operations)
- **org_admin** → ONLY org admin features (organization-scoped operations)
- **ws_admin** → ONLY workspace admin features (workspace-scoped operations)

A sys_admin does NOT automatically get org_admin or ws_admin privileges. They must be explicitly granted those roles for specific organizations/workspaces.

**Exception:** sys_admin can bypass RLS using the admin role, but ONLY on admin/sys routes (e.g., `/admin/sys/*`). This does not grant them org or workspace access.

### 2. Standard Function Location

All standard auth helper functions will be implemented in the **org-common layer** (`module-access/backend/layers/org-common/python/org_common/`).

This ensures:
- Single source of truth (DRY)
- Shared across all modules
- Easy to update and maintain
- Consistent performance optimization

### 3. Workspace Role Assessment

All workspace role checks must use a single common method:
- DRY principle (one place to update)
- Performance-optimized (fastest execution)
- Consistent across all modules

Implementation: RPC function `is_ws_admin()` or helper `_is_ws_admin()` that calls the RPC.

### 4. Chat and Voice Sharing Pattern

Chat and voice sessions follow similar authorization patterns:

**Ownership:**
- Each session has an `owner` (user_id)
- Owner has full access to the session

**Sharing Mechanisms:**
- **Workspace sharing:** Session linked to workspace_id → all workspace members can access
- **Direct sharing:** Session explicitly shared via `chat_shares` or `voice_shares` table

**Authorization Check Order:**
1. Is user the owner? → Allow
2. Is session in a workspace the user is a member of? → Allow
3. Is session directly shared with user? → Allow
4. Otherwise → Deny

### 5. Standard Auth Pattern

**Preferred Pattern (from module-mgmt):**
```python
# At router level (once per request)
profile = common.find_one('user_profiles', {'user_id': supabase_user_id})

# System admin routes
if path.startswith('/admin/sys/'):
    is_sys_admin = profile.get('sys_role') in SYS_ADMIN_ROLES
    if not is_sys_admin:
        return common.forbidden_response('System admin role required')

# Organization admin routes
elif path.startswith('/admin/org/'):
    is_org_admin = profile.get('org_role') in ORG_ADMIN_ROLES  # Note: org_role is in org_members, not user_profiles!
    if not is_org_admin:
        return common.forbidden_response('Organization admin role required')

# Workspace admin routes
elif path.startswith('/ws/admin/'):
    is_ws_admin = _is_ws_admin(workspace_id, user_id)
    if not is_ws_admin:
        return common.forbidden_response('Workspace admin role required')
```

**Benefits:**
- Single profile query per request
- Centralized authorization at router level
- Clear, auditable security model
- Impossible to forget auth check

## Patterns to Standardize

### Current Issues

| Pattern | Count | Problem | Solution |
|---------|-------|---------|----------|
| Inline `sys_role in ['sys_owner', 'sys_admin']` | 4 | Duplicated code | Use constant `SYS_ADMIN_ROLES` |
| Inline `org_role in ['org_admin', 'org_owner']` | 5 | Duplicated code | Use constant `ORG_ADMIN_ROLES` |
| Per-handler auth checks | 15 | Multiple queries, error-prone | Centralized router auth |
| Missing org_id validation | 3 | Security risk | Always validate org_id for org routes |
| Wrong parameter type (user_id vs JWT) | 1 | Broken auth | Always use JWT for RPCs |

### Standard Constants

Add to `org_common/__init__.py`:
```python
# Role constants
SYS_ADMIN_ROLES = ['sys_owner', 'sys_admin']
ORG_ADMIN_ROLES = ['org_owner', 'org_admin']
WS_ADMIN_ROLES = ['ws_owner', 'ws_admin']
```

### Standard Helper Functions

Add to `org_common/auth_helpers.py` (new file):
```python
def is_sys_admin(user_id: str) -> bool:
    """Check if user has sys admin privileges."""
    profile = find_one('user_profiles', {'user_id': user_id})
    return profile and profile.get('sys_role') in SYS_ADMIN_ROLES

def is_org_admin(org_id: str, user_id: str) -> bool:
    """Check if user has org admin privileges."""
    membership = find_one('org_members', {'org_id': org_id, 'user_id': user_id})
    return membership and membership.get('org_role') in ORG_ADMIN_ROLES

def is_ws_admin(ws_id: str, user_id: str) -> bool:
    """Check if user has workspace admin privileges."""
    result = rpc('is_ws_admin_or_owner', {'p_ws_id': ws_id, 'p_user_id': user_id})
    return result is True
```

## Success Criteria

**Sprint S0 (Analysis):**
- ✅ Complete audit of all 27 lambdas
- ✅ Document current auth patterns and issues
- ✅ Define standard patterns and constants
- ✅ Create S1-S3 sprint plans

**Sprint S1 (Org Admin):**
- All 11 org admin lambdas use standard pattern
- Single constant `ORG_ADMIN_ROLES` used everywhere
- Centralized router auth where possible
- No duplicate auth checks

**Sprint S2 (Sys Admin):**
- All 12 sys admin lambdas use standard pattern
- Single constant `SYS_ADMIN_ROLES` used everywhere
- Centralized router auth where possible
- No duplicate auth checks

**Sprint S3 (WS Admin):**
- All workspace resources use standard `is_ws_admin()` helper
- Chat and voice sharing patterns standardized
- Workspace-scoped resources properly authorized
- No duplicate auth checks

**Overall Success:**
- Zero auth-related bugs in production
- Developer onboarding time reduced by 50%
- Auth pattern validation in CI/CD
- Comprehensive auth documentation

## Session Log

### January 30, 2026 - Initiative Start
- Initiative created following discovery of critical auth issues
- Initial plan focused only on sys admin standardization
- Plan created: `docs/plans/plan_auth-standardization.md`
- Context file created

### January 30, 2026 - Scope Expansion
- Scope expanded to cover sys, org, and ws admin across all 27 lambdas
- Conducted comprehensive audit of all lambda functions
- Identified 12 sys admin, 11 org admin, and 4 ws admin implementations
- Defined S0-S3 sprint structure
- Clarified role hierarchy: NO inheritance between levels
- Documented chat/voice sharing patterns
- Updated plan and context files with expanded scope