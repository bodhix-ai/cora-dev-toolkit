-- =============================================
-- MODULE-WS: Workspace Member Table
-- =============================================
-- Purpose: Many-to-many relationship between workspaces and users with role-based access control
-- Source: Created for CORA toolkit Dec 2025

-- =============================================
-- WS_MEMBER TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.ws_member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ws_id UUID NOT NULL REFERENCES public.workspace(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    ws_role VARCHAR(50) NOT NULL DEFAULT 'ws_user',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT ws_member_role_check CHECK (ws_role IN ('ws_owner', 'ws_admin', 'ws_user'))
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ws_member_ws_id ON public.ws_member(ws_id);
CREATE INDEX IF NOT EXISTS idx_ws_member_user_id ON public.ws_member(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_member_ws_role ON public.ws_member(ws_role);
CREATE INDEX IF NOT EXISTS idx_ws_member_updated_at ON public.ws_member(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ws_member_deleted_at ON public.ws_member(deleted_at) WHERE deleted_at IS NULL;

-- Unique active membership (user can only be a member once per workspace)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_member_unique_active ON public.ws_member(ws_id, user_id) 
    WHERE deleted_at IS NULL;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.ws_member IS 'Workspace membership with role-based access control';
COMMENT ON COLUMN public.ws_member.ws_id IS 'Foreign key to workspace table';
COMMENT ON COLUMN public.ws_member.user_id IS 'Foreign key to auth.users table';
COMMENT ON COLUMN public.ws_member.ws_role IS 'Member role: ws_owner (full control), ws_admin (update settings, view-only members), ws_user (view-only)';
COMMENT ON COLUMN public.ws_member.deleted_at IS 'Soft delete timestamp for membership';
COMMENT ON COLUMN public.ws_member.created_by IS 'User who added this member';
COMMENT ON COLUMN public.ws_member.updated_by IS 'User who last updated this membership';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.ws_member ENABLE ROW LEVEL SECURITY;

-- Workspace members can view other members
DROP POLICY IF EXISTS "Workspace members can view members" ON public.ws_member;
CREATE POLICY "Workspace members can view members" ON public.ws_member
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL AND
    EXISTS (
        SELECT 1 FROM public.ws_member wm
        WHERE wm.ws_id = ws_member.ws_id
        AND wm.user_id = auth.uid()
        AND wm.deleted_at IS NULL
    )
);

-- Only workspace owners can add members
DROP POLICY IF EXISTS "Workspace owners can add members" ON public.ws_member;
CREATE POLICY "Workspace owners can add members" ON public.ws_member
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ws_member wm
        WHERE wm.ws_id = ws_member.ws_id
        AND wm.user_id = auth.uid()
        AND wm.ws_role = 'ws_owner'
        AND wm.deleted_at IS NULL
    )
);

-- Only workspace owners can update member roles
DROP POLICY IF EXISTS "Workspace owners can update members" ON public.ws_member;
CREATE POLICY "Workspace owners can update members" ON public.ws_member
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ws_member wm
        WHERE wm.ws_id = ws_member.ws_id
        AND wm.user_id = auth.uid()
        AND wm.ws_role = 'ws_owner'
        AND wm.deleted_at IS NULL
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ws_member wm
        WHERE wm.ws_id = ws_member.ws_id
        AND wm.user_id = auth.uid()
        AND wm.ws_role = 'ws_owner'
        AND wm.deleted_at IS NULL
    )
);

-- Owners can remove members, or users can remove themselves
DROP POLICY IF EXISTS "Owners or self can remove members" ON public.ws_member;
CREATE POLICY "Owners or self can remove members" ON public.ws_member
FOR DELETE
TO authenticated
USING (
    -- User is removing themselves
    user_id = auth.uid() OR
    -- User is a workspace owner
    EXISTS (
        SELECT 1 FROM public.ws_member wm
        WHERE wm.ws_id = ws_member.ws_id
        AND wm.user_id = auth.uid()
        AND wm.ws_role = 'ws_owner'
        AND wm.deleted_at IS NULL
    )
);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to ws_member" ON public.ws_member;
CREATE POLICY "Service role full access to ws_member" ON public.ws_member
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ws_member TO authenticated;

COMMENT ON POLICY "Workspace members can view members" ON public.ws_member IS 'Any workspace member can view other members';
COMMENT ON POLICY "Workspace owners can add members" ON public.ws_member IS 'Only ws_owner can add new members';
COMMENT ON POLICY "Workspace owners can update members" ON public.ws_member IS 'Only ws_owner can change member roles';
COMMENT ON POLICY "Owners or self can remove members" ON public.ws_member IS 'Owners can remove anyone, users can remove themselves';

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_ws_member_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ws_member_updated_at ON public.ws_member;
CREATE TRIGGER ws_member_updated_at 
    BEFORE UPDATE ON public.ws_member
    FOR EACH ROW
    EXECUTE FUNCTION update_ws_member_updated_at();
