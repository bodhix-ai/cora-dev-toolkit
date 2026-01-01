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
-- WORKSPACES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
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
    CONSTRAINT workspaces_status_check CHECK (status IN ('active', 'archived')),
    CONSTRAINT workspaces_color_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT workspaces_retention_check CHECK (retention_days > 0)
);

-- =============================================
-- INDEXES
-- =============================================

-- Partial unique index for active workspaces (unique name per org, excluding deleted)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_name_org_unique ON public.workspaces(org_id, name) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_org_id ON public.workspaces(org_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON public.workspaces(status);
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_at ON public.workspaces(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON public.workspaces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspaces_updated_at ON public.workspaces(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspaces_tags ON public.workspaces USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_workspaces_name_trgm ON public.workspaces USING GIN(name gin_trgm_ops);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.workspaces IS 'Collaborative workspace containers for organizing team resources';
COMMENT ON COLUMN public.workspaces.org_id IS 'Organization ID for multi-tenancy';
COMMENT ON COLUMN public.workspaces.name IS 'Workspace name (unique per org among active workspaces)';
COMMENT ON COLUMN public.workspaces.description IS 'Optional workspace description';
COMMENT ON COLUMN public.workspaces.color IS 'Hex color for UI display (#RRGGBB format)';
COMMENT ON COLUMN public.workspaces.icon IS 'Material UI icon name for display';
COMMENT ON COLUMN public.workspaces.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN public.workspaces.status IS 'Workspace status: active or archived';
COMMENT ON COLUMN public.workspaces.deleted_at IS 'Soft delete timestamp - workspace retained for retention_days';
COMMENT ON COLUMN public.workspaces.deleted_by IS 'User who soft-deleted the workspace';
COMMENT ON COLUMN public.workspaces.retention_days IS 'Days to retain workspace after soft deletion before permanent deletion';
COMMENT ON COLUMN public.workspaces.created_by IS 'User who created the workspace';
COMMENT ON COLUMN public.workspaces.updated_by IS 'User who last updated the workspace';

-- =============================================
-- NOTE: Row Level Security (RLS) Policies
-- =============================================
-- RLS policies for this table are defined in 006-apply-rls.sql
-- This ensures all tables exist before applying security constraints

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_workspaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspaces_updated_at ON public.workspaces;
CREATE TRIGGER workspaces_updated_at 
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_workspaces_updated_at();
