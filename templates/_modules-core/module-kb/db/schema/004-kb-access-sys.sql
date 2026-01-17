-- ========================================
-- Knowledge Base Module Schema
-- Migration: 004-kb-access-sys.sql
-- Created: January 14, 2026
-- ========================================

-- Table: kb_access_sys
CREATE TABLE IF NOT EXISTS public.kb_access_sys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kb_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One association per KB-org pair
    CONSTRAINT kb_access_sys_unique UNIQUE (kb_id, org_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_access_sys_kb_id ON public.kb_access_sys(kb_id);
CREATE INDEX IF NOT EXISTS idx_kb_access_sys_org_id ON public.kb_access_sys(org_id);
CREATE INDEX IF NOT EXISTS idx_kb_access_sys_is_enabled ON public.kb_access_sys(is_enabled) WHERE is_enabled = true;

-- Comments
COMMENT ON TABLE public.kb_access_sys IS 'Associates system KBs with organizations';
COMMENT ON COLUMN public.kb_access_sys.is_enabled IS 'Platform admin can enable/disable system KB for specific orgs';
