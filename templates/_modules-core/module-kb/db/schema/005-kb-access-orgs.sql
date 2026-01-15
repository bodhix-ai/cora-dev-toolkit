-- ========================================
-- Knowledge Base Module Schema
-- Migration: 005-kb-access-orgs.sql
-- Created: January 14, 2026
-- ========================================

-- Table: kb_access_orgs
-- Org admin enables KBs at org level - required for org members to use the KB
CREATE TABLE IF NOT EXISTS public.kb_access_orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One enablement per KB-org pair
    CONSTRAINT kb_access_orgs_unique UNIQUE (knowledge_base_id, org_id)
);

-- Indexes
CREATE INDEX idx_kb_access_orgs_kb_id ON public.kb_access_orgs(knowledge_base_id);
CREATE INDEX idx_kb_access_orgs_org_id ON public.kb_access_orgs(org_id);
CREATE INDEX idx_kb_access_orgs_is_enabled ON public.kb_access_orgs(is_enabled) WHERE is_enabled = true;

-- Comments
COMMENT ON TABLE public.kb_access_orgs IS 'Org-level KB enablement (Step 2: org admin enables KB for org members)';
COMMENT ON COLUMN public.kb_access_orgs.is_enabled IS 'Org admin can enable/disable KBs for their organization';
