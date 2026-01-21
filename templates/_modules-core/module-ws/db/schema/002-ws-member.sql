-- =============================================
-- MODULE-WS: Workspace Member Table
-- =============================================
-- Purpose: Many-to-many relationship between workspaces and users with role-based access control
-- Source: Created for CORA toolkit Dec 2025

-- =============================================
-- WS_MEMBERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.ws_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ws_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    ws_role VARCHAR(50) NOT NULL DEFAULT 'ws_user',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT ws_members_role_check CHECK (ws_role IN ('ws_owner', 'ws_admin', 'ws_user'))
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ws_members_ws_id ON public.ws_members(ws_id);
CREATE INDEX IF NOT EXISTS idx_ws_members_user_id ON public.ws_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_members_ws_role ON public.ws_members(ws_role);
CREATE INDEX IF NOT EXISTS idx_ws_members_updated_at ON public.ws_members(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ws_members_deleted_at ON public.ws_members(deleted_at) WHERE deleted_at IS NULL;

-- Unique active membership (user can only be a member once per workspace)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_members_unique_active ON public.ws_members(ws_id, user_id) 
    WHERE deleted_at IS NULL;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.ws_members IS 'Workspace membership with role-based access control';
COMMENT ON COLUMN public.ws_members.ws_id IS 'Foreign key to workspaces table';
COMMENT ON COLUMN public.ws_members.user_id IS 'Foreign key to auth.users table';
COMMENT ON COLUMN public.ws_members.ws_role IS 'Member role: ws_owner (full control), ws_admin (update settings, view-only members), ws_user (view-only)';
COMMENT ON COLUMN public.ws_members.deleted_at IS 'Soft delete timestamp for membership';
COMMENT ON COLUMN public.ws_members.created_by IS 'User who added this member';
COMMENT ON COLUMN public.ws_members.updated_by IS 'User who last updated this membership';

-- =============================================
-- NOTE: Row Level Security (RLS) Policies
-- =============================================
-- RLS policies for this table are defined in 006-apply-rls.sql
-- This ensures all tables exist before applying security constraints

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_ws_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ws_members_updated_at ON public.ws_members;
CREATE TRIGGER ws_members_updated_at 
    BEFORE UPDATE ON public.ws_members
    FOR EACH ROW
    EXECUTE FUNCTION update_ws_members_updated_at();
