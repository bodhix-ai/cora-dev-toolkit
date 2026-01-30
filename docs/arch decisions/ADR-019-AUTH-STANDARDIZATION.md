# ADR-019: Authentication and Authorization Standardization

**Status:** Accepted  
**Date:** January 30, 2026  
**Deciders:** Engineering Team  
**Related:** ADR-015 (Admin Page Auth Pattern), ADR-016 (Org Admin Page Authorization)

---

## Context

CORA modules have 27 Lambda functions with inconsistent authentication and authorization patterns across three admin levels (sys_admin, org_admin, ws_admin). This inconsistency has caused:

- **Development inefficiency:** 2-8 hours wasted per module debugging auth issues
- **Security risks:** Inconsistent implementation increases vulnerability surface
- **Code duplication:** 5 lambdas with duplicate auth checks within the same function
- **Maintenance burden:** 12 different sys admin implementations, 11 different org admin implementations
- **Developer confusion:** No clear standard for implementing new admin features

### Specific Problems Identified

1. **No standard constants:** Some modules use inline lists `['sys_owner', 'sys_admin']`, others use constants
2. **Inconsistent patterns:** Mix of RPC calls, direct SQL queries, inline checks, and helper functions
3. **Duplicate checks:** Lambdas checking the same auth multiple times in different handlers
4. **Wrong parameter types:** Some functions incorrectly passing `user_id` instead of `jwt` to RPCs
5. **No workspace standardization:** Only module-ws has workspace admin patterns, other modules lack them
6. **Performance issues:** Multiple profile queries per request in some lambdas (e.g., module-chat: 17 queries)

---

## Decision

We will standardize authentication and authorization across all CORA modules using a three-tiered approach:

### 1. Standard Constants (DRY Principle)

Define role constants in the org-common layer:

```python
# In org_common/__init__.py
SYS_ADMIN_ROLES = ['sys_owner', 'sys_admin']
ORG_ADMIN_ROLES = ['org_owner', 'org_admin']
WS_ADMIN_ROLES = ['ws_owner', 'ws_admin']
```

### 2. Standard Helper Functions

Implement reusable helper functions in org-common layer:

```python
# In org_common/auth_helpers.py

def is_sys_admin(user_id: str) -> bool:
    """Check if user has system admin privileges."""
    profile = find_one('user_profiles', {'user_id': user_id})
    return profile and profile.get('sys_role') in SYS_ADMIN_ROLES

def is_org_admin(org_id: str, user_id: str) -> bool:
    """Check if user has organization admin privileges."""
    membership = find_one('org_members', {'org_id': org_id, 'user_id': user_id})
    return membership and membership.get('org_role') in ORG_ADMIN_ROLES

def is_ws_admin(ws_id: str, user_id: str) -> bool:
    """Check if user has workspace admin privileges."""
    result = rpc('is_ws_admin_or_owner', {'p_ws_id': ws_id, 'p_user_id': user_id})
    return result is True
```

### 3. Centralized Router Auth Pattern

Prefer centralized authorization at the router level (one check per request):

```python
# At router level (lambda_handler entry point)
def lambda_handler(event, context):
    # Extract user info once
    profile = common.find_one('user_profiles', {'user_id': supabase_user_id})
    path = event.get('rawPath', '')
    
    # System admin routes
    if path.startswith('/admin/sys/'):
        if not common.is_sys_admin(profile.get('user_id')):
            return common.forbidden_response('System admin role required')
    
    # Organization admin routes
    elif path.startswith('/admin/org/'):
        if not common.is_org_admin(org_id, profile.get('user_id')):
            return common.forbidden_response('Organization admin role required')
    
    # Workspace admin routes
    elif path.startswith('/ws/admin/'):
        if not common.is_ws_admin(ws_id, profile.get('user_id')):
            return common.forbidden_response('Workspace admin role required')
    
    # Route to handlers
    return route_to_handler(event, context)
```

### 4. No Role Inheritance

**Critical Decision:** There is NO automatic inheritance between admin levels.

```
sys_admin → ONLY sys admin features (platform-wide operations)
            NO automatic org_admin access
            NO automatic ws_admin access
            
org_admin → ONLY org admin features (org-scoped operations)
            NO automatic sys_admin access
            NO automatic ws_admin access
            
ws_admin  → ONLY workspace admin features (ws-scoped operations)
            NO automatic sys_admin access
            NO automatic org_admin access
```

**Exception:** sys_admin can bypass RLS via the admin database role, but ONLY on `/admin/sys/*` routes. This does not grant org or workspace access without explicit membership.

### 5. Resource Sharing Pattern

Chat and voice sessions follow consistent authorization:

1. **Owner check:** User created the resource → allow
2. **Workspace sharing:** Resource linked to workspace → all workspace members can access
3. **Direct sharing:** Resource explicitly shared via `{module}_shares` table

Implementation via RPC functions for performance:

```sql
CREATE OR REPLACE FUNCTION can_access_chat(
    p_resource_id uuid,
    p_user_id uuid
) RETURNS boolean AS $$
    -- Check owner, workspace membership, and direct shares
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Consequences

### Positive

1. **Single Source of Truth:** All auth logic in one place (org-common layer)
2. **Performance Improvement:** Single profile query per request via centralized router auth
3. **Reduced Code Duplication:** Standard constants and helpers eliminate 27+ duplicate implementations
4. **Easier Validation:** Automated tools can verify compliance with standards
5. **Better Security:** Consistent implementation reduces vulnerability surface
6. **Developer Productivity:** Clear patterns reduce onboarding time by ~50%
7. **Maintainability:** Changes to auth logic only need updates in one place

### Negative

1. **Migration Effort:** 27 lambdas need updates (estimated 32-46 hours across 4 sprints)
2. **Breaking Changes:** Existing auth patterns must be refactored
3. **Testing Burden:** Each lambda needs comprehensive auth testing after migration
4. **Coordination Required:** Changes to org-common layer affect all modules
5. **Rollout Complexity:** Must migrate in phases to avoid disruption

### Neutral

1. **Learning Curve:** Developers must learn the new standard patterns
2. **Documentation Needs:** Comprehensive docs required for adoption
3. **Validation Tooling:** Need to create/maintain auth pattern validators

---

## Implementation

### Phase 1: Foundation (Sprint S0 - Analysis)

- [x] Audit all 27 lambdas for current auth patterns
- [x] Define standard constants and helper functions
- [x] Document role hierarchy and access rules
- [ ] Create ADR (this document)
- [ ] Update .clinerules with standards
- [ ] Create validation script skeleton

### Phase 2: Organization Admin (Sprint S1)

- Migrate 11 lambdas with org admin routes
- Focus on eliminating duplicate checks (invites: 3x, orgs: 2x)
- Implement `ORG_ADMIN_ROLES` constant everywhere
- Centralize router auth where possible

### Phase 3: System Admin (Sprint S2)

- Migrate 12 lambdas with sys admin routes
- Implement `SYS_ADMIN_ROLES` constant everywhere
- Centralize router auth where possible
- Verify module-mgmt reference pattern

### Phase 4: Workspace Admin + Sharing (Sprint S3)

- Migrate 4 lambdas with workspace admin routes
- Standardize workspace role checks via RPC
- Implement consistent sharing patterns for chat/voice/kb
- Create sharing RPC functions

---

## Validation

### Automated Checks

Create validator script that checks:
- ✅ All modules use standard constants (`SYS_ADMIN_ROLES`, `ORG_ADMIN_ROLES`, `WS_ADMIN_ROLES`)
- ✅ No inline role lists (e.g., `['sys_owner', 'sys_admin']`)
- ✅ No duplicate auth checks within same lambda
- ✅ All org admin routes validate `org_id`
- ✅ Centralized router auth used where possible
- ✅ Helper functions used instead of direct SQL/RPC calls

### Manual Review

Security review checklist:
- [ ] No auth bypass vulnerabilities
- [ ] Role hierarchy correctly enforced (no unintended inheritance)
- [ ] All workspace resources properly authorized
- [ ] Sharing patterns correctly implemented
- [ ] Error messages don't leak sensitive information

---

## Alternatives Considered

### Alternative 1: Role Inheritance Model

**Approach:** sys_admin automatically gets org_admin and ws_admin privileges.

**Rejected because:**
- Violates principle of least privilege
- Creates security risk (platform admins shouldn't auto-access all orgs/workspaces)
- Makes auditing difficult (hard to distinguish sys ops from org/ws ops)
- CORA's multi-tenant model requires strict isolation

### Alternative 2: Per-Lambda Auth (Status Quo)

**Approach:** Each lambda implements auth checks independently.

**Rejected because:**
- Already proven problematic (duplicate code, inconsistent patterns)
- High maintenance burden (changes require updating 27+ locations)
- Performance issues (multiple profile queries per request)
- Error-prone (easy to forget auth checks in new handlers)

### Alternative 3: API Gateway Authorizer Only

**Approach:** All auth logic in API Gateway Lambda authorizer.

**Rejected because:**
- Authorizer only validates JWT, not role-based access
- Business logic auth (org_id, ws_id validation) still needed in Lambdas
- Would require major architectural change
- Doesn't solve the internal consistency problem

---

## References

- **Original Discussion:** Admin Standardization Initiative (January 2026)
- **Related Issue:** Module-chat auth broken (passing user_id instead of JWT)
- **Prior Work:** ADR-015 (Admin Page Auth Pattern), ADR-016 (Org Admin Auth)
- **Implementation Plan:** `docs/plans/plan_s0-auth-standardization.md`
- **Context:** `memory-bank/context-auth-standardization.md`

---

## Notes

**Performance Impact:** Centralized router auth reduces profile queries from N (per handler) to 1 (per request). For module-chat, this is a 17x reduction.

**Security Impact:** Standardizing auth patterns makes security audits easier and reduces the attack surface by eliminating inconsistent implementations.

**Developer Impact:** New developers can reference a single standard pattern instead of learning 27 different approaches. Estimated 50% reduction in auth-related onboarding time.

---

**Status:** ✅ Accepted  
**Next Steps:** Complete S0 deliverables, begin S1 (org admin migration)