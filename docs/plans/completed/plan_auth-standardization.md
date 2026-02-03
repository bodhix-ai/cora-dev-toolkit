# Plan: Authentication Standardization Across CORA Modules

**Initiative:** Auth Standardization  
**Created:** January 30, 2026  
**Status:** 🔴 Critical - Active  
**Priority:** P0 - Blocking development efficiency  

---

## Executive Summary

**Problem:** CORA modules lack consistent authentication patterns, causing:
- 2-8 hours wasted debugging auth issues per module
- Inconsistent security implementations
- Developer confusion about correct patterns
- Fragile code that breaks when patterns diverge

**Root Cause:** No centralized auth library or enforced standards for common auth checks.

**Proposed Solution:** Create a standard `cora_auth.py` library with consistent functions for all auth scenarios.

---

## Current State - Authentication Chaos

### Module-by-Module Auth Audit

**Audit Date:** January 30, 2026  
**Standard Reference:** `docs/standards/standard_LAMBDA-AUTHORIZATION.md` (Centralized Router Auth Pattern)

| Module | Admin Routes | Auth Pattern | Profile Queries | Pattern Quality | Needs Update |
|--------|--------------|--------------|-----------------|-----------------|--------------|
| module-mgmt | ✅ Yes | ✅ **Centralized** | 1 per request | ⭐⭐⭐⭐⭐ **Reference** | ❌ No |
| module-access | N/A | Per-handler | Per handler | ⭐⭐⭐ Good | N/A (data API) |
| module-ai | ✅ Yes | ⚠️ Per-handler (helpers) | Per handler | ⭐⭐⭐ Acceptable | ✅ Yes |
| module-ws | ✅ Yes | ⚠️ Per-handler | Per handler | ⭐⭐ Fair | ✅ Yes |
| module-kb | ✅ Yes | ⚠️ Per-handler | Per handler | ⭐⭐ Fair | ✅ Yes |
| module-eval | ✅ Yes | ⚠️ Per-handler | Per handler | ⭐⭐ Fair | ✅ Yes |
| module-voice | ✅ Yes | ⚠️ Per-handler | Per handler | ⭐⭐ Fair | ✅ Yes |
| module-chat | ✅ Yes | ❌ **Per-handler (broken)** | 17 per request | ⭐ **Poor** | ✅ **YES** |

**Key Findings:**
1. **Only 1/8 modules** use the centralized router auth pattern (module-mgmt)
2. **7/8 modules** use per-handler auth checks (duplicate auth logic across handlers)
3. **Module-chat** has the most severe issue: 17 duplicate profile queries per request
4. **Module-ai** uses helper functions (`_require_admin_access()`) which is better than inline but still per-handler
5. **Module-access** correctly uses per-handler auth because it handles data API routes (resource ownership), not admin routes

**Pattern Analysis:**

| Pattern | Modules | Profile Queries | Maintainability | Security Risk |
|---------|---------|-----------------|-----------------|---------------|
| **Centralized Router** | 1 (mgmt) | 1 per request | ✅ Excellent | ✅ Low |
| **Per-handler (helpers)** | 1 (ai) | N per request | ⚠️ Fair | ⚠️ Medium |
| **Per-handler (inline)** | 5 (ws, kb, eval, voice, chat) | N per request | ❌ Poor | ❌ High |
| **Data API per-handler** | 1 (access) | Per handler | ✅ Appropriate | ✅ Low |

**Impact Assessment:**

**Current State Problems:**
- ❌ **16x code duplication** across module-chat's 17 handlers
- ❌ **17 profile queries** per request in module-chat (should be 1)
- ❌ **Easy to forget auth checks** when adding new handlers
- ❌ **Inconsistent error messages** across modules
- ❌ **Hard to audit** security across scattered auth code

**After Centralized Router Pattern:**
- ✅ **1 profile query** per request (all modules)
- ✅ **Single auth check** at router level
- ✅ **Impossible to bypass** - all routes protected
- ✅ **Consistent error messages**
- ✅ **Easy to audit** - all auth in one place

---

## Auth Requirement Categories

### 1. System Admin Authorization

**Use Case:** Platform-wide admin operations (sys owner or sys admin)

**Current Pattern (Working):**
```python
# Extract JWT from Authorization header
auth_header = event.get('headers', {}).get('authorization', '')
jwt_token = auth_header.replace('Bearer ', '').strip()

# Check sys admin status via database RPC
is_authorized = common.is_sys_admin(jwt_token)
```

**Database RPC:**
```sql
CREATE OR REPLACE FUNCTION public.is_sys_admin(jwt text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND sys_role IN ('sys_owner', 'sys_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Issues:**
- ❌ Chat module was calling `common.is_sys_admin(supabase_user_id)` - wrong parameter type
- ❌ No validation that JWT is provided before calling
- ❌ No consistent error messages

---

### 2. Organization Admin Authorization

**Use Case:** Org-wide admin operations (org owner or org admin within user's org)

**Current Pattern (Working):**
```python
# Extract JWT
jwt_token = auth_header.replace('Bearer ', '').strip()

# Get user info (includes org_id, org_role)
user_info = common.get_user_info(jwt_token)
org_id = user_info.get('org_id')
org_role = user_info.get('org_role')

# Check org admin status
is_org_admin = org_role in ['org_owner', 'org_admin']
```

**Database RPC:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_info(jwt text)
RETURNS jsonb AS $$
DECLARE
  user_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'user_id', id,
    'org_id', org_id,
    'org_role', org_role,
    'sys_role', sys_role
  ) INTO user_data
  FROM user_profiles
  WHERE id = auth.uid();
  
  RETURN user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Issues:**
- ❌ Some Lambdas check `org_role in ['org_owner', 'org_admin']`, others only check `org_owner`
- ❌ No helper function for "is user org admin of org X?"
- ❌ Cross-org access not properly validated in all cases

---

### 3. Workspace Admin Authorization

**Use Case:** Workspace-scoped admin operations (ws owner or ws admin)

**Current Pattern (Partial):**
```python
# Get user info
user_info = common.get_user_info(jwt_token)
user_id = user_info.get('user_id')

# Check workspace membership and role
ws_member = common.execute_sql(
    "SELECT role FROM workspace_members WHERE workspace_id = %s AND user_id = %s",
    (ws_id, user_id)
)

is_ws_admin = ws_member and ws_member[0]['role'] in ['ws_owner', 'ws_admin']
```

**Issues:**
- ❌ No RPC function for workspace role check
- ❌ Some modules query `workspace_members` directly, others use different patterns
- ❌ Workspace role inheritance not consistently applied

---

### 4. Chat Admin/Access Authorization

**Use Case:** Chat session access control (owner, shared via workspace, shared directly)

**Current Pattern (Inconsistent):**
```python
# Check if user owns chat
session = common.execute_sql(
    "SELECT user_id FROM chat_sessions WHERE id = %s",
    (session_id,)
)

is_owner = session and session[0]['user_id'] == user_id

# Check if chat is shared with user
# TODO: Multiple patterns exist, none are standard
```

**Issues:**
- ❌ No standard pattern for checking chat access
- ❌ Chat sharing logic scattered across multiple queries
- ❌ Workspace-based chat access not consistently implemented

---

### 5. Voice Session Authorization

**Use Case:** Voice session ownership and access

**Current Pattern (Inconsistent):**
```python
# Check session ownership
session = common.execute_sql(
    "SELECT user_id FROM voice_sessions WHERE id = %s",
    (session_id,)
)

is_owner = session and session[0]['user_id'] == user_id
```

**Issues:**
- ❌ No sharing mechanism defined
- ❌ No workspace-based access
- ❌ No org admin override pattern

---

## Proposed Standard: CORA Auth Library

### File: `cora_auth.py` (new common library)

```python
"""
CORA Authentication Library

Provides standardized authentication and authorization functions
for all CORA modules.

Usage:
    from cora_auth import CORAuth
    
    auth = CORAuth(jwt_token)
    
    # System admin checks
    if auth.is_sys_admin():
        # Allow platform-wide operations
        
    # Organization admin checks
    if auth.is_org_admin():
        # Allow org-scoped operations
        
    # Resource access checks
    if auth.can_access_workspace(ws_id):
        # Allow workspace access
"""

import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

@dataclass
class UserContext:
    """User authentication context"""
    user_id: str
    org_id: str
    org_role: str
    sys_role: Optional[str]
    email: str
    
class CORAuth:
    """CORA Authentication and Authorization"""
    
    def __init__(self, jwt_token: str, supabase_client):
        """
        Initialize auth context
        
        Args:
            jwt_token: JWT token from Authorization header
            supabase_client: Supabase client instance
        """
        self.jwt = jwt_token
        self.supabase = supabase_client
        self._user_context: Optional[UserContext] = None
        
    def get_user_context(self) -> UserContext:
        """Get user context from JWT (cached)"""
        if self._user_context is None:
            result = self.supabase.rpc('get_user_info', {'jwt': self.jwt}).execute()
            data = result.data
            self._user_context = UserContext(**data)
        return self._user_context
    
    # System Admin Checks
    
    def is_sys_admin(self) -> bool:
        """Check if user has sys admin privileges"""
        result = self.supabase.rpc('is_sys_admin', {'jwt': self.jwt}).execute()
        return result.data
    
    def is_sys_owner(self) -> bool:
        """Check if user is sys owner"""
        user = self.get_user_context()
        return user.sys_role == 'sys_owner'
    
    def require_sys_admin(self):
        """Raise exception if not sys admin"""
        if not self.is_sys_admin():
            raise PermissionError("System administrator access required")
    
    # Organization Admin Checks
    
    def is_org_admin(self, org_id: Optional[str] = None) -> bool:
        """
        Check if user has org admin privileges
        
        Args:
            org_id: Optional org to check. If None, checks user's own org.
        """
        user = self.get_user_context()
        
        # Check against specific org if provided
        if org_id and org_id != user.org_id:
            # Sys admins can access any org
            if self.is_sys_admin():
                return True
            return False
        
        # Check user's org role
        return user.org_role in ['org_owner', 'org_admin']
    
    def is_org_owner(self, org_id: Optional[str] = None) -> bool:
        """Check if user is org owner"""
        user = self.get_user_context()
        
        if org_id and org_id != user.org_id:
            return False
        
        return user.org_role == 'org_owner'
    
    def require_org_admin(self, org_id: Optional[str] = None):
        """Raise exception if not org admin"""
        if not self.is_org_admin(org_id):
            raise PermissionError("Organization administrator access required")
    
    # Workspace Access Checks
    
    def can_access_workspace(self, ws_id: str) -> bool:
        """Check if user can access workspace"""
        result = self.supabase.rpc('can_access_workspace', {
            'jwt': self.jwt,
            'workspace_id': ws_id
        }).execute()
        return result.data
    
    def is_ws_admin(self, ws_id: str) -> bool:
        """Check if user has workspace admin privileges"""
        result = self.supabase.rpc('is_ws_admin', {
            'jwt': self.jwt,
            'workspace_id': ws_id
        }).execute()
        return result.data
    
    def require_ws_access(self, ws_id: str):
        """Raise exception if no workspace access"""
        if not self.can_access_workspace(ws_id):
            raise PermissionError("Workspace access denied")
    
    # Chat Access Checks
    
    def can_access_chat(self, session_id: str) -> bool:
        """Check if user can access chat session"""
        result = self.supabase.rpc('can_access_chat', {
            'jwt': self.jwt,
            'session_id': session_id
        }).execute()
        return result.data
    
    def is_chat_owner(self, session_id: str) -> bool:
        """Check if user owns chat session"""
        user = self.get_user_context()
        result = self.supabase.table('chat_sessions') \
            .select('user_id') \
            .eq('id', session_id) \
            .execute()
        
        if not result.data:
            return False
        
        return result.data[0]['user_id'] == user.user_id
    
    def require_chat_access(self, session_id: str):
        """Raise exception if no chat access"""
        if not self.can_access_chat(session_id):
            raise PermissionError("Chat session access denied")
    
    # Voice Session Access Checks
    
    def can_access_voice_session(self, session_id: str) -> bool:
        """Check if user can access voice session"""
        result = self.supabase.rpc('can_access_voice_session', {
            'jwt': self.jwt,
            'session_id': session_id
        }).execute()
        return result.data
    
    def require_voice_access(self, session_id: str):
        """Raise exception if no voice session access"""
        if not self.can_access_voice_session(session_id):
            raise PermissionError("Voice session access denied")
```

---

## Required Database RPC Functions

### 1. Workspace Access RPC

```sql
CREATE OR REPLACE FUNCTION public.can_access_workspace(
    jwt text,
    workspace_id uuid
)
RETURNS boolean AS $$
DECLARE
    user_id uuid;
BEGIN
    -- Get user ID from JWT
    user_id := auth.uid();
    
    -- Sys admins can access any workspace
    IF EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = user_id
        AND sys_role IN ('sys_owner', 'sys_admin')
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Check workspace membership
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = workspace_id
        AND user_id = user_id
        AND role IN ('ws_owner', 'ws_admin', 'ws_member')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Workspace Admin RPC

```sql
CREATE OR REPLACE FUNCTION public.is_ws_admin(
    jwt text,
    workspace_id uuid
)
RETURNS boolean AS $$
DECLARE
    user_id uuid;
BEGIN
    user_id := auth.uid();
    
    -- Sys admins have admin access to all workspaces
    IF EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = user_id
        AND sys_role IN ('sys_owner', 'sys_admin')
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Check workspace admin role
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = workspace_id
        AND user_id = user_id
        AND role IN ('ws_owner', 'ws_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Chat Access RPC

```sql
CREATE OR REPLACE FUNCTION public.can_access_chat(
    jwt text,
    session_id uuid
)
RETURNS boolean AS $$
DECLARE
    user_id uuid;
    session_user_id uuid;
    session_workspace_id uuid;
BEGIN
    user_id := auth.uid();
    
    -- Get session info
    SELECT user_id, workspace_id
    INTO session_user_id, session_workspace_id
    FROM chat_sessions
    WHERE id = session_id;
    
    IF session_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Sys admins can access any chat
    IF EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = user_id
        AND sys_role IN ('sys_owner', 'sys_admin')
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user owns chat
    IF session_user_id = user_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check if chat is in user's workspace
    IF session_workspace_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = session_workspace_id
            AND user_id = user_id
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Check if chat is directly shared with user
    IF EXISTS (
        SELECT 1 FROM chat_shares
        WHERE session_id = session_id
        AND shared_with_user_id = user_id
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Voice Session Access RPC

```sql
CREATE OR REPLACE FUNCTION public.can_access_voice_session(
    jwt text,
    session_id uuid
)
RETURNS boolean AS $$
DECLARE
    user_id uuid;
    session_user_id uuid;
BEGIN
    user_id := auth.uid();
    
    -- Get session owner
    SELECT user_id
    INTO session_user_id
    FROM voice_sessions
    WHERE id = session_id;
    
    IF session_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Sys admins can access any session
    IF EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = user_id
        AND sys_role IN ('sys_owner', 'sys_admin')
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user owns session
    RETURN session_user_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Migration Plan

### Phase 1: Create Auth Library (2-3 hours)

1. **Create `cora_auth.py`**
   - Implement CORAuth class
   - Add all standard auth methods
   - Include comprehensive docstrings
   
2. **Create database RPCs**
   - Create migration script: `003-auth-rpcs.sql`
   - Add all 4 missing RPC functions
   - Test each function independently

3. **Add to org-common layer**
   - Update org-common build to include cora_auth.py
   - Rebuild and redeploy org-common layer
   - Verify layer includes new module

### Phase 2: Migrate Module-Chat (1-2 hours)

**Priority:** Immediate - currently broken

**Steps:**
1. Update chat-session Lambda to use CORAuth
2. Replace all manual auth checks with library calls
3. Test all 18 admin routes
4. Deploy and verify

**Example Migration:**
```python
# Before (BROKEN):
is_authorized = common.is_sys_admin(supabase_user_id)

# After (CORRECT):
from cora_auth import CORAuth

auth = CORAuth(jwt_token, supabase)
auth.require_sys_admin()  # Raises PermissionError if not admin
```

### Phase 3: Update All Other Modules (4-6 hours)

**Order:**
1. module-voice (needs voice session RPC)
2. module-ws (needs workspace RPC updates)
3. module-kb (needs improved access checks)
4. module-eval (standardize patterns)
5. module-ai (standardize patterns)
6. module-access (standardize patterns)
7. module-mgmt (standardize patterns)

**Per-Module Steps:**
1. Import CORAuth
2. Replace manual auth checks
3. Update error handling
4. Test all routes
5. Deploy

### Phase 4: Document Standards (1-2 hours)

1. **Create:** `docs/standards/standard_AUTHENTICATION.md`
   - Auth library usage guide
   - Common patterns and examples
   - Anti-patterns to avoid
   
2. **Update:** `.clinerules`
   - Add auth standardization rules
   - Mandate CORAuth usage
   - Add validation requirements

3. **Create Validator:** `validation/auth-pattern-validator/`
   - Detect manual auth checks
   - Enforce CORAuth usage
   - Report violations

---

## Current Inconsistencies to Document

### 1. JWT Extraction

**Good Pattern:**
```python
auth_header = event.get('headers', {}).get('authorization', '')
if not auth_header:
    return error_response(401, "Missing authorization header")
jwt_token = auth_header.replace('Bearer ', '').strip()
```

**Anti-Pattern:**
```python
# Missing validation
jwt_token = event['headers']['authorization'].replace('Bearer ', '')
```

### 2. Role Checking

**Good Pattern:**
```python
auth = CORAuth(jwt_token, supabase)
if auth.is_sys_admin():
    # Allow operation
```

**Anti-Pattern:**
```python
# Direct database query
result = common.execute_sql(
    "SELECT sys_role FROM user_profiles WHERE id = %s",
    (user_id,)
)
```

### 3. Resource Access

**Good Pattern:**
```python
auth = CORAuth(jwt_token, supabase)
auth.require_workspace_access(ws_id)  # Raises if denied
```

**Anti-Pattern:**
```python
# Manual membership check
member = common.execute_sql(
    "SELECT role FROM workspace_members WHERE workspace_id = %s AND user_id = %s",
    (ws_id, user_id)
)
if not member:
    return error_response(403, "Access denied")
```

---

## Success Metrics

### Code Quality
- ✅ All modules use CORAuth consistently
- ✅ No direct auth queries in Lambda code
- ✅ All auth logic in database RPC functions
- ✅ Comprehensive error messages

### Developer Experience
- ✅ Auth patterns obvious and documented
- ✅ New Lambdas use library from day 1
- ✅ Validator catches manual auth checks
- ✅ Less time debugging auth issues

### Security
- ✅ Consistent security model
- ✅ All auth centralized and auditable
- ✅ Role hierarchy enforced everywhere
- ✅ No auth bypass vulnerabilities

---

## Risk Assessment

### High Risk
- **Backward Compatibility:** Changing auth patterns could break existing code
  - **Mitigation:** Phased rollout, comprehensive testing per module

### Medium Risk
- **Performance:** Extra RPC calls could add latency
  - **Mitigation:** Use caching, optimize RPC functions

### Low Risk
- **Adoption:** Developers might resist new patterns
  - **Mitigation:** Clear documentation, validator enforcement

---

## Time Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Create Library | 2-3 hours | None |
| Phase 2: Fix Chat | 1-2 hours | Phase 1 |
| Phase 3: Migrate Others | 4-6 hours | Phase 2 |
| Phase 4: Documentation | 1-2 hours | Phase 3 |
| **Total** | **8-13 hours** | Sequential |

---

## Next Steps

1. **Immediate:** Finish testing chat admin fix
2. **Today:** Create CORAuth library (Phase 1)
3. **Tomorrow:** Migrate module-chat (Phase 2)
4. **This Week:** Migrate remaining modules (Phase 3)
5. **Next Week:** Documentation and validation (Phase 4)

---

## Appendix: Auth Pattern Examples

### Example 1: Sys Admin Route

```python
def handle_sys_admin_route(event, context):
    """Handle system admin operation"""
    from cora_auth import CORAuth
    
    # Extract JWT
    auth_header = event.get('headers', {}).get('authorization', '')
    if not auth_header:
        return error_response(401, "Authentication required")
    
    jwt_token = auth_header.replace('Bearer ', '').strip()
    
    # Initialize auth
    auth = CORAuth(jwt_token, supabase)
    
    # Require sys admin
    try:
        auth.require_sys_admin()
    except PermissionError as e:
        return error_response(403, str(e))
    
    # Handle operation
    return success_response({"message": "Operation complete"})
```

### Example 2: Org Admin Route

```python
def handle_org_admin_route(event, context):
    """Handle organization admin operation"""
    from cora_auth import CORAuth
    
    # Extract JWT
    jwt_token = extract_jwt(event)
    
    # Initialize auth
    auth = CORAuth(jwt_token, supabase)
    
    # Get user's org from context
    user = auth.get_user_context()
    org_id = user.org_id
    
    # Require org admin
    try:
        auth.require_org_admin(org_id)
    except PermissionError as e:
        return error_response(403, str(e))
    
    # Handle operation
    return success_response({"org_id": org_id})
```

### Example 3: Resource Access Route

```python
def handle_workspace_operation(event, context):
    """Handle workspace-scoped operation"""
    from cora_auth import CORAuth
    
    # Extract parameters
    ws_id = event['pathParameters']['wsId']
    jwt_token = extract_jwt(event)
    
    # Initialize auth
    auth = CORAuth(jwt_token, supabase)
    
    # Require workspace access
    try:
        auth.require_ws_access(ws_id)
    except PermissionError as e:
        return error_response(403, str(e))
    
    # Check if admin access needed
    if requires_admin_action():
        if not auth.is_ws_admin(ws_id):
            return error_response(403, "Workspace admin access required")
    
    # Handle operation
    return success_response({"workspace_id": ws_id})
```

---

**End of Plan**