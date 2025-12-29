-- =============================================
-- MODULE-AI: Organization Prompt Engineering
-- =============================================
-- Purpose: Organization-specific RAG configuration and prompt customization
-- Note: One record per organization
-- Source: Extracted from pm-app production database (Dec 2025)

-- =============================================
-- ORG_PROMPT_ENGINEERING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.org_prompt_engineering (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    policy_mission_type text,
    custom_system_prompt text,
    custom_context_prompt text,
    citation_style text DEFAULT 'inline'::text NOT NULL,
    include_page_numbers boolean DEFAULT true NOT NULL,
    include_source_metadata boolean DEFAULT true NOT NULL,
    response_tone text,
    max_response_length text,
    configured_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    org_system_prompt text,
    CONSTRAINT org_prompt_engineering_citation_style_check CHECK ((citation_style = ANY (ARRAY['inline'::text, 'footnote'::text, 'endnote'::text, 'none'::text]))),
    CONSTRAINT org_prompt_engineering_max_response_length_check CHECK ((max_response_length = ANY (ARRAY['concise'::text, 'moderate'::text, 'detailed'::text]))),
    CONSTRAINT org_prompt_engineering_policy_mission_type_check CHECK ((policy_mission_type = ANY (ARRAY['research'::text, 'compliance'::text, 'education'::text, 'general'::text]))),
    CONSTRAINT org_prompt_engineering_response_tone_check CHECK ((response_tone = ANY (ARRAY['professional'::text, 'casual'::text, 'technical'::text, 'simple'::text])))
);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.org_prompt_engineering IS 'Organization prompt engineering settings (renamed from organization_rag_settings in Oct 2025 refactoring). Contains RAG configuration, citation style, and custom prompts.';
COMMENT ON COLUMN public.org_prompt_engineering.org_system_prompt IS 'Organization-specific system prompt override. When set, this is combined with the platform system prompt for this organization.';

-- =============================================
-- CONSTRAINTS
-- =============================================

ALTER TABLE ONLY public.org_prompt_engineering
    ADD CONSTRAINT org_prompt_engineering_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.org_prompt_engineering
    ADD CONSTRAINT org_prompt_engineering_organization_id_key UNIQUE (org_id);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_org_prompt_engineering_org_id ON public.org_prompt_engineering USING btree (org_id);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_org_prompt_engineering_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_org_prompt_engineering_updated_at ON public.org_prompt_engineering;
CREATE TRIGGER update_org_prompt_engineering_updated_at BEFORE UPDATE ON public.org_prompt_engineering 
    FOR EACH ROW 
    EXECUTE FUNCTION update_org_prompt_engineering_updated_at();

-- =============================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================

ALTER TABLE ONLY public.org_prompt_engineering
    ADD CONSTRAINT org_prompt_engineering_configured_by_fkey 
    FOREIGN KEY (configured_by) 
    REFERENCES auth.users(id);

ALTER TABLE ONLY public.org_prompt_engineering
    ADD CONSTRAINT org_prompt_engineering_organization_id_fkey 
    FOREIGN KEY (org_id) 
    REFERENCES public.orgs(id) 
    ON DELETE CASCADE;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.org_prompt_engineering ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all prompt engineering settings
DROP POLICY IF EXISTS "Super admins can manage prompt engineering" ON public.org_prompt_engineering;
CREATE POLICY "Super admins can manage prompt engineering" ON public.org_prompt_engineering 
    TO authenticated 
    USING ((EXISTS ( SELECT 1
       FROM public.user_profiles
      WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.global_role IN ('platform_owner', 'platform_admin'))))));

-- =============================================
-- EXAMPLE USAGE
-- =============================================

/*
-- Insert organization-specific prompt engineering settings
INSERT INTO public.org_prompt_engineering (
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
