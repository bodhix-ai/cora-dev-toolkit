-- ========================================
-- Knowledge Base Module Schema
-- Migration: 006-kb-access-ws.sql
-- Created: January 14, 2026
-- ========================================

-- Table: kb_access_ws
-- Workspace admin enables KBs for workspace-associated chats
CREATE TABLE IF NOT EXISTS public.kb_access_ws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One enablement per KB-workspace pair
    CONSTRAINT kb_access_ws_unique UNIQUE (knowledge_base_id, workspace_id)
);

-- Indexes
CREATE INDEX idx_kb_access_ws_kb_id ON public.kb_access_ws(knowledge_base_id);
CREATE INDEX idx_kb_access_ws_workspace_id ON public.kb_access_ws(workspace_id);
CREATE INDEX idx_kb_access_ws_is_enabled ON public.kb_access_ws(is_enabled) WHERE is_enabled = true;

-- Comments
COMMENT ON TABLE public.kb_access_ws IS 'Workspace-level KB enablement (Step 3: workspace admin enables KB for workspace chats)';
COMMENT ON COLUMN public.kb_access_ws.is_enabled IS 'Workspace admin can enable/disable KBs for their workspace';
