-- =============================================
-- MODULE-WS: Workspace Table
-- =============================================
-- Purpose: Collaborative workspace containers for organizing team resources
-- Source: Created for CORA toolkit Dec 2025

-- =============================================
-- EXTENSION: Text Search
-- =============================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================
-- WORKSPACE TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.workspace (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#1976d2',
    icon VARCHAR(50) NOT NULL DEFAULT 'WorkspaceIcon',
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    retention_days INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT workspace_status_check CHECK (status IN ('active', 'archived')),
    CONSTRAINT workspace_color_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT workspace_retention_check CHECK (retention_days > 0)
);

-- =============================================
-- INDEXES
-- =============================================

-- Partial unique index for active workspaces (unique name per org, excluding deleted)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_name_org_unique ON public.workspace(org_id, name) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_org_id ON public.workspace(org_id);
CREATE INDEX IF NOT EXISTS idx_workspace_status ON public.workspace(status);
CREATE INDEX IF NOT EXISTS idx_workspace_deleted_at ON public.workspace(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workspace_created_at ON public.workspace(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_updated_at ON public.workspace(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_tags ON public.workspace USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_workspace_name_trgm ON public.workspace USING GIN(name gin_trgm_ops);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.workspace IS 'Collaborative workspace containers for organizing team resources';
COMMENT ON COLUMN public.workspace.org_id IS 'Organization ID for multi-tenancy';
COMMENT ON COLUMN public.workspace.name IS 'Workspace name (unique per org among active workspaces)';
COMMENT ON COLUMN public.workspace.description IS 'Optional workspace description';
COMMENT ON COLUMN public.workspace.color IS 'Hex color for UI display (#RRGGBB format)';
COMMENT ON COLUMN public.workspace.icon IS 'Material UI icon name for display';
COMMENT ON COLUMN public.workspace.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN public.workspace.status IS 'Workspace status: active or archived';
COMMENT ON COLUMN public.workspace.deleted_at IS 'Soft delete timestamp - workspace retained for retention_days';
COMMENT ON COLUMN public.workspace.deleted_by IS 'User who soft-deleted the workspace';
COMMENT ON COLUMN public.workspace.retention_days IS 'Days to retain workspace after soft deletion before permanent deletion';
COMMENT ON COLUMN public.workspace.created_by IS 'User who created the workspace';
COMMENT ON COLUMN public.workspace.updated_by IS 'User who last updated the workspace';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.workspace ENABLE ROW LEVEL SECURITY;

-- Workspace members can view their workspaces
DROP POLICY IF EXISTS "Workspace members can view workspaces" ON public.workspace;
CREATE POLICY "Workspace members can view workspaces" ON public.workspace
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL AND
    EXISTS (
        SELECT 1 FROM public.ws_member
        WHERE ws_member.ws_id = workspace.id
        AND ws_member.user_id = auth.uid()
        AND ws_member.deleted_at IS NULL
    )
);

-- Org members can create workspaces
DROP POLICY IF EXISTS "Org members can create workspaces" ON public.workspace;
CREATE POLICY "Org members can create workspaces" ON public.workspace
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = workspace.org_id
        AND org_members.person_id = auth.uid()
        AND org_members.active = true
    )
);

-- Workspace admins and owners can update
DROP POLICY IF EXISTS "Workspace admins and owners can update" ON public.workspace;
CREATE POLICY "Workspace admins and owners can update" ON public.workspace
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ws_member
        WHERE ws_member.ws_id = workspace.id
        AND ws_member.user_id = auth.uid()
        AND ws_member.ws_role IN ('ws_owner', 'ws_admin')
        AND ws_member.deleted_at IS NULL
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ws_member
        WHERE ws_member.ws_id = workspace.id
        AND ws_member.user_id = auth.uid()
        AND ws_member.ws_role IN ('ws_owner', 'ws_admin')
        AND ws_member.deleted_at IS NULL
    )
);

-- Only workspace owners can delete
DROP POLICY IF EXISTS "Workspace owners can delete" ON public.workspace;
CREATE POLICY "Workspace owners can delete" ON public.workspace
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ws_member
        WHERE ws_member.ws_id = workspace.id
        AND ws_member.user_id = auth.uid()
        AND ws_member.ws_role = 'ws_owner'
        AND ws_member.deleted_at IS NULL
    )
);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to workspace" ON public.workspace;
CREATE POLICY "Service role full access to workspace" ON public.workspace
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace TO authenticated;

COMMENT ON POLICY "Workspace members can view workspaces" ON public.workspace IS 'Only workspace members can view workspace details';
COMMENT ON POLICY "Org members can create workspaces" ON public.workspace IS 'Any org member can create a workspace in their organization';
COMMENT ON POLICY "Workspace admins and owners can update" ON public.workspace IS 'Only ws_admin and ws_owner roles can update workspace settings';
COMMENT ON POLICY "Workspace owners can delete" ON public.workspace IS 'Only ws_owner role can soft-delete a workspace';

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_workspace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspace_updated_at ON public.workspace;
CREATE TRIGGER workspace_updated_at 
    BEFORE UPDATE ON public.workspace
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_updated_at();
