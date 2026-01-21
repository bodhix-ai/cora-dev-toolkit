-- ========================================
-- Knowledge Base Module Schema
-- Migration: 001-kb-bases.sql
-- Created: January 14, 2026
-- ========================================

-- Table: kb_bases
CREATE TABLE IF NOT EXISTS public.kb_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scope VARCHAR(50) NOT NULL,
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
    ws_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    chat_session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Scope constraint
    CONSTRAINT kb_bases_scope_check CHECK (
        scope IN ('sys', 'org', 'workspace', 'chat')
    ),
    
    -- Scope-field relationship constraint
    CONSTRAINT kb_bases_scope_fields_check CHECK (
        (scope = 'sys' AND org_id IS NULL AND ws_id IS NULL AND chat_session_id IS NULL) OR
        (scope = 'org' AND org_id IS NOT NULL AND ws_id IS NULL AND chat_session_id IS NULL) OR
        (scope = 'workspace' AND org_id IS NOT NULL AND ws_id IS NOT NULL AND chat_session_id IS NULL) OR
        (scope = 'chat' AND org_id IS NOT NULL AND chat_session_id IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_bases_scope ON public.kb_bases(scope);
CREATE INDEX IF NOT EXISTS idx_kb_bases_org_id ON public.kb_bases(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kb_bases_ws_id ON public.kb_bases(ws_id) WHERE ws_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kb_bases_chat_session_id ON public.kb_bases(chat_session_id) WHERE chat_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kb_bases_is_enabled ON public.kb_bases(is_enabled) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_kb_bases_created_at ON public.kb_bases(created_at DESC);

-- Partial unique index for workspace-scoped KBs (one per workspace)
CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_bases_workspace_unique 
    ON public.kb_bases(ws_id) 
    WHERE scope = 'workspace' AND is_deleted = false;

-- Partial unique index for chat-scoped KBs (one per chat session)
CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_bases_chat_unique 
    ON public.kb_bases(chat_session_id) 
    WHERE scope = 'chat' AND is_deleted = false;

-- Comments
COMMENT ON TABLE public.kb_bases IS 'Knowledge bases with multi-scope hierarchy (sys, org, workspace, chat)';
COMMENT ON COLUMN public.kb_bases.scope IS 'KB scope: sys (platform), org, workspace, or chat';
COMMENT ON COLUMN public.kb_bases.config IS 'KB configuration: whoCanUpload, autoIndex, chunkSize, etc.';
