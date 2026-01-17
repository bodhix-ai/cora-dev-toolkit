-- =============================================
-- MODULE-AI: Organization Prompt Engineering
-- =============================================
-- Purpose: Organization-specific RAG configuration and prompt customization
-- Note: One record per organization
-- Source: Extracted from pm-app production database (Dec 2025)
-- Updated: Jan 2026 - Renamed from org_prompt_engineering to ai_cfg_org_prompts (CORA naming standards)

-- =============================================
-- AI_CFG_ORG_PROMPTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_cfg_org_prompts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid NOT NULL UNIQUE,
    policy_mission_type text,
    custom_system_prompt text,
    custom_context_prompt text,
    citation_style text DEFAULT 'inline'::text NOT NULL,
    include_page_numbers boolean DEFAULT true NOT NULL,
    include_source_metadata boolean DEFAULT true NOT NULL,
    response_tone text,
    max_response_length text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_system_prompt text,
    CONSTRAINT ai_cfg_org_prompts_citation_style_check CHECK ((citation_style = ANY (ARRAY['inline'::text, 'footnote'::text, 'endnote'::text, 'none'::text]))),
    CONSTRAINT ai_cfg_org_prompts_max_response_length_check CHECK ((max_response_length = ANY (ARRAY['concise'::text, 'moderate'::text, 'detailed'::text]))),
    CONSTRAINT ai_cfg_org_prompts_policy_mission_type_check CHECK ((policy_mission_type = ANY (ARRAY['research'::text, 'compliance'::text, 'education'::text, 'general'::text]))),
    CONSTRAINT ai_cfg_org_prompts_response_tone_check CHECK ((response_tone = ANY (ARRAY['professional'::text, 'casual'::text, 'technical'::text, 'simple'::text])))
);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.ai_cfg_org_prompts IS 'Organization prompt engineering settings (migrated from org_prompt_engineering on 2026-01-14). Contains RAG configuration, citation style, and custom prompts. Used by module-ai ai-config-handler Lambda.';
COMMENT ON COLUMN public.ai_cfg_org_prompts.org_system_prompt IS 'Organization-specific system prompt override. When set, this is combined with the platform system prompt for this organization.';

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ai_cfg_org_prompts_org_id ON public.ai_cfg_org_prompts USING btree (org_id);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_ai_cfg_org_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ai_cfg_org_prompts_updated_at ON public.ai_cfg_org_prompts;
DROP TRIGGER IF EXISTS update_ai_cfg_org_prompts_updated_at ON public.ai_cfg_org_prompts;
DROP TRIGGER IF EXISTS update_ai_cfg_org_prompts_updated_at ON public.ai_cfg_org_prompts;
CREATE TRIGGER update_ai_cfg_org_prompts_updated_at BEFORE UPDATE ON public.ai_cfg_org_prompts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_ai_cfg_org_prompts_updated_at();

-- =============================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================

-- Add foreign keys if they don't exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_cfg_org_prompts_created_by_fkey'
        AND conrelid = 'public.ai_cfg_org_prompts'::regclass
    ) THEN
        ALTER TABLE ONLY public.ai_cfg_org_prompts
            ADD CONSTRAINT ai_cfg_org_prompts_created_by_fkey 
            FOREIGN KEY (created_by) 
            REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_cfg_org_prompts_updated_by_fkey'
        AND conrelid = 'public.ai_cfg_org_prompts'::regclass
    ) THEN
        ALTER TABLE ONLY public.ai_cfg_org_prompts
            ADD CONSTRAINT ai_cfg_org_prompts_updated_by_fkey 
            FOREIGN KEY (updated_by) 
            REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_cfg_org_prompts_org_id_fkey'
        AND conrelid = 'public.ai_cfg_org_prompts'::regclass
    ) THEN
        ALTER TABLE ONLY public.ai_cfg_org_prompts
            ADD CONSTRAINT ai_cfg_org_prompts_org_id_fkey 
            FOREIGN KEY (org_id) 
            REFERENCES public.orgs(id) 
            ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.ai_cfg_org_prompts ENABLE ROW LEVEL SECURITY;

-- Sys admins can manage all prompt engineering settings
DROP POLICY IF EXISTS "Sys admins can manage prompt engineering" ON public.ai_cfg_org_prompts;
DROP POLICY IF EXISTS "Sys admins can manage prompt engineering" ON public.ai_cfg_org_prompts;
DROP POLICY IF EXISTS "Sys admins can manage prompt engineering" ON public.ai_cfg_org_prompts;
CREATE POLICY "Sys admins can manage prompt engineering" ON public.ai_cfg_org_prompts 
    TO authenticated 
    USING ((EXISTS ( SELECT 1
       FROM public.user_profiles
      WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.sys_role IN ('sys_owner', 'sys_admin'))))));

-- =============================================
-- EXAMPLE USAGE
-- =============================================

/*
-- Insert organization-specific prompt engineering settings
INSERT INTO public.ai_cfg_org_prompts (
    org_id,
    policy_mission_type,
    citation_style,
    response_tone,
    org_system_prompt
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000',
    'research',
    'inline',
    'professional',
    'Focus on providing evidence-based policy recommendations with citations to source documents.'
);
*/
