# ADR-014: Voice Module Permission Model

**Status:** Proposed  
**Date:** 2026-01-17  
**Deciders:** Architecture Team  
**Related:** ADR-007 (Auth Shell), ADR-009 (Module UI Integration), ADR-013 (Core Module Criteria)

---

## Context

The voice module enables AI-powered voice interviews for two distinct use cases:

1. **Job Interviews** - External candidates being interviewed for hiring
2. **Career/Content Capture** - Internal employees capturing content for:
   - Resume updates
   - Blog posts  
   - Case stories
   - Contract performance histories

This dual use case requires a permission model that supports:
- External participants (not authenticated users)
- Internal participants (authenticated org members)
- Selective sharing of interview results with hiring teams/managers
- Workspace-level visibility for team collaboration

### Existing CORA Permission Patterns

| Module | Pattern | Implementation |
|--------|---------|----------------|
| **System** | Owner/Admin/User | `user_profiles.sys_role` |
| **Organization** | Owner/Admin/User | `org_members` table |
| **Workspace** | Owner/Admin/User | `ws_members` table |
| **Chat** | **Owner + Shares** | `chat_sessions.created_by` + `chat_shares` table |

The chat module's **owner + shares** pattern was identified as the closest match since:
- Both are user-created resources (someone initiates the session)
- Both need selective sharing (share results with team)
- Both support workspace-level visibility
- Neither requires hierarchical admin roles (owner/admin/user)

---

## Decision

Implement **Owner + Assignee + Shares** model for voice sessions.

### Schema Changes

#### 1. Add Permission Columns to `voice_sessions`

```sql
ALTER TABLE voice_sessions ADD COLUMN 
  assigned_to UUID REFERENCES auth.users(id);

ALTER TABLE voice_sessions ADD COLUMN
  is_shared_with_workspace BOOLEAN NOT NULL DEFAULT false;

-- Constraint: Either external OR internal participant
ALTER TABLE voice_sessions ADD CONSTRAINT 
  voice_sessions_participant_check CHECK (
    (candidate_email IS NOT NULL) OR 
    (assigned_to IS NOT NULL)
  );
```

#### 2. Create `voice_shares` Table

```sql
CREATE TABLE public.voice_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_level VARCHAR(50) NOT NULL DEFAULT 'view',
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT voice_shares_unique UNIQUE (session_id, shared_with_user_id),
    CONSTRAINT voice_shares_permission_check CHECK (
        permission_level IN ('view', 'view_transcript', 'view_analytics')
    )
);
```

#### 3. Add Helper Functions

```sql
-- Check if user is owner of voice session
CREATE FUNCTION is_voice_owner(p_session_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM voice_sessions
        WHERE id = p_session_id
        AND created_by = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is assigned to voice session
CREATE FUNCTION is_voice_assignee(p_session_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM voice_sessions
        WHERE id = p_session_id
        AND assigned_to = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is member of organization (generic helper)
CREATE FUNCTION is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM org_members
        WHERE org_id = p_org_id
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Permission Levels

| Actor | Access Level | Can Do |
|-------|--------------|--------|
| **created_by** (Owner) | Full Control | View, modify, delete, share session |
| **assigned_to** (Assignee) | Participant | Participate in interview, view own transcript/analytics |
| **voice_shares** (Viewer) | Shared Access | View transcript/analytics per permission_level |
| **Workspace Members** | Team Visibility | View all data if `is_shared_with_workspace = true` |
| **Org Admins** | Administrative | N/A - No special admin privileges for voice |
| **Sys Admins** | System Override | Full access via service role for support |

### Use Case Mapping

| Scenario | candidate_email | assigned_to | created_by | Shares |
|----------|----------------|-------------|------------|---------|
| **External job interview** | `candidate@email.com` | `NULL` | HR Manager | Hiring team via `voice_shares` |
| **Internal career capture** | `NULL` | Employee UUID | Manager | Skip-level, HR via `voice_shares` |
| **Team workspace interview** | Either | Either | Team member | All workspace members if `is_shared_with_workspace = true` |

---

## Consequences

### Benefits

1. **Unified Model:** Consistent with chat module's owner+shares pattern
2. **Flexibility:** Supports both external and internal participants
3. **Granular Control:** Fine-grained sharing via `voice_shares` table
4. **Team Collaboration:** Workspace-level visibility when appropriate
5. **Simplicity:** No admin role complexity - just owner, assignee, and shares

### Trade-offs

1. **No Admin Override:** Unlike org/ws modules, no admin role has elevated access
   - **Mitigation:** Org admins can still access via workspace membership or shares
2. **Additional Table:** Requires `voice_shares` table and helper functions
   - **Mitigation:** Reuses established chat pattern, minimal complexity
3. **Schema Migration:** Adds 2 columns to `voice_sessions`
   - **Mitigation:** Nullable columns, backward compatible

### Security Considerations

- **RLS Enforcement:** All access controlled via Row Level Security policies
- **Helper Functions:** Use `SECURITY DEFINER` for consistent permission checks
- **Service Role Bypass:** System lambdas use service role for full access
- **No Direct Org Access:** Users cannot view all org voice sessions without explicit permission
  - This differs from KB module where org members can view all org KBs

---

## Alternatives Considered

### Alternative 1: Simple Org-Scoped Model

**Approach:** All org members can view all org voice sessions

**Rejected because:**
- Too permissive - interview results are sensitive
- Doesn't support selective sharing with hiring team
- No way to restrict access to career/content interviews

### Alternative 2: Workspace Admin Roles (ws_owner/ws_admin)

**Approach:** Add `voice_role` column with owner/admin/user roles

**Rejected because:**
- Adds unnecessary complexity for voice use case
- Voice sessions are user-created resources, not team resources
- Chat module demonstrates simpler owner+shares works well

### Alternative 3: Org Admin Override

**Approach:** Org admins have automatic access to all org voice sessions

**Rejected because:**
- Breaks principle of least privilege
- Interview content is sensitive (personal career info, candidate data)
- Admins can still get access via workspace membership or explicit shares

---

## Implementation Notes

### Helper Function Placement

- `is_org_member()` → Add to `module-mgmt/db/schema/003-sys-module-usage.sql`
- `is_voice_owner()` → Add to `module-voice/db/schema/006-voice-rpc-functions.sql`
- `is_voice_assignee()` → Add to `module-voice/db/schema/006-voice-rpc-functions.sql`

### RLS Policy Structure

Create `008-apply-rls.sql` following module-ws pattern with policies for:
- `voice_sessions` - owner, assignee, shares, workspace, service role
- `voice_transcripts` - inherited from parent session
- `voice_analytics` - inherited from parent session
- `voice_credentials` - org-level (not session-specific)
- `voice_configs` - org-level (not session-specific)
- `voice_shares` - owner can create/modify, shared users can view
- `voice_session_kb` - inherited from parent session

### Frontend Impact

- **Create Session UI:** Add "Assign to team member" option (user picker)
- **Session Card:** Display assignee avatar if internal interview
- **Share Dialog:** Reuse chat share dialog component
- **Permissions Display:** Show owner, assignee, and shared users

---

## References

- [ADR-007: CORA Auth Shell Standard](./ADR-007-CORA-AUTH-SHELL-STANDARD.md)
- [ADR-009: Module UI Integration](./ADR-009-MODULE-UI-INTEGRATION.md)
- [Chat Module Schema](../../templates/_modules-core/module-chat/db/schema/)
- [Workspace Module RLS](../../templates/_modules-functional/module-ws/db/schema/009-apply-rls.sql)

---

## Decision Outcome

**Status:** Proposed  
**Next Steps:**
1. Implement schema changes to `voice_sessions`
2. Create `voice_shares` table
3. Add helper functions to appropriate schema files
4. Create `008-apply-rls.sql` with all RLS policies
5. Update voice module specifications to reflect permission model
6. Test with both external and internal participant scenarios

**Approval Required:** Architecture team review before marking as Accepted
