-- =============================================
-- MODULE-AI: System RAG Configuration
-- =============================================
-- Purpose: System-wide RAG (Retrieval Augmented Generation) settings
-- Note: Singleton table - only one record allowed
-- Source: Extracted from pm-app production database (Dec 2025)
-- Updated: Jan 2026 - Renamed from platform_* to sys_*

-- =============================================
-- SYS_RAG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.sys_rag (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    available_embedding_models text[] DEFAULT ARRAY['text-embedding-3-small'::text, 'text-embedding-3-large'::text] NOT NULL,
    default_embedding_model text DEFAULT 'text-embedding-3-small'::text NOT NULL,
    embedding_model_costs jsonb DEFAULT '{"text-embedding-3-large": 1.5, "text-embedding-3-small": 1.0}'::jsonb,
    available_chunking_strategies text[] DEFAULT ARRAY['fixed'::text, 'semantic'::text, 'hybrid'::text] NOT NULL,
    default_chunking_strategy text DEFAULT 'hybrid'::text NOT NULL,
    max_chunk_size_tokens integer DEFAULT 2000 NOT NULL,
    min_chunk_size_tokens integer DEFAULT 100 NOT NULL,
    search_quality_presets jsonb DEFAULT '{"fast": {"max_results": 5, "similarity_threshold": 0.6}, "balanced": {"max_results": 10, "similarity_threshold": 0.7}, "comprehensive": {"max_results": 25, "similarity_threshold": 0.5}}'::jsonb NOT NULL,
    default_search_quality text DEFAULT 'balanced'::text NOT NULL,
    default_similarity_threshold numeric(3,2) DEFAULT 0.7 NOT NULL,
    max_search_results_global integer DEFAULT 50 NOT NULL,
    max_context_tokens_global integer DEFAULT 8000 NOT NULL,
    ocr_enabled boolean DEFAULT true NOT NULL,
    processing_timeout_minutes integer DEFAULT 30 NOT NULL,
    max_concurrent_jobs_global integer DEFAULT 100 NOT NULL,
    vector_index_type text DEFAULT 'ivfflat'::text NOT NULL,
    backup_retention_days integer DEFAULT 90 NOT NULL,
    auto_scaling_enabled boolean DEFAULT true NOT NULL,
    max_embedding_batch_size integer DEFAULT 100 NOT NULL,
    embedding_cache_ttl_hours integer DEFAULT 24 NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_configurations jsonb DEFAULT '{}'::jsonb,
    default_ai_provider text DEFAULT 'openai'::text,
    active_providers text[] DEFAULT ARRAY['openai'::text],
    default_embedding_model_id uuid,
    default_chat_model_id uuid,
    system_prompt text DEFAULT 'You are a helpful AI assistant that provides accurate, well-sourced answers based on the knowledge base. Always cite your sources and acknowledge when you don''t have enough information to answer a question.'::text,
    CONSTRAINT sys_rag_default_ai_provider_check CHECK ((default_ai_provider = ANY (ARRAY['openai'::text, 'azure_openai'::text, 'anthropic'::text, 'aws_bedrock'::text]))),
    CONSTRAINT sys_rag_default_search_quality_check CHECK ((default_search_quality = ANY (ARRAY['fast'::text, 'balanced'::text, 'comprehensive'::text]))),
    CONSTRAINT sys_rag_default_similarity_threshold_check CHECK (((default_similarity_threshold >= 0.0) AND (default_similarity_threshold <= 1.0))),
    CONSTRAINT sys_rag_vector_index_type_check CHECK ((vector_index_type = ANY (ARRAY['ivfflat'::text, 'hnsw'::text])))
);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN public.sys_rag.provider_configurations IS 'Multi-provider configuration storage. Each key is a provider type (openai, azure_openai, anthropic, aws_bedrock) with nested configuration.';
COMMENT ON COLUMN public.sys_rag.default_ai_provider IS 'Default AI provider to use for embeddings and chat. Must be one of: openai, azure_openai, anthropic, aws_bedrock';
COMMENT ON COLUMN public.sys_rag.active_providers IS 'List of currently active/enabled providers. Organizations can only select from active providers.';
COMMENT ON COLUMN public.sys_rag.default_embedding_model_id IS 'Default embedding model for the entire platform. References ai_models.id.';
COMMENT ON COLUMN public.sys_rag.default_chat_model_id IS 'Default chat model for the entire platform. References ai_models.id.';
COMMENT ON COLUMN public.sys_rag.system_prompt IS 'System-wide system prompt that defines the AI assistant behavior and guidelines.';

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_sys_rag_active_providers ON public.sys_rag USING gin (active_providers);
CREATE INDEX IF NOT EXISTS idx_sys_rag_chat_deployment ON public.sys_rag USING btree (default_chat_model_id);
CREATE INDEX IF NOT EXISTS idx_sys_rag_embedding_deployment ON public.sys_rag USING btree (default_embedding_model_id);
CREATE INDEX IF NOT EXISTS idx_sys_rag_provider_configs ON public.sys_rag USING gin (provider_configurations);

-- Singleton constraint - only one sys_rag record allowed
CREATE UNIQUE INDEX IF NOT EXISTS sys_rag_singleton ON public.sys_rag USING btree ((true));

-- =============================================
-- TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_sys_rag_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sys_rag_updated_at ON public.sys_rag;
CREATE TRIGGER update_sys_rag_updated_at BEFORE UPDATE ON public.sys_rag 
    FOR EACH ROW 
    EXECUTE FUNCTION update_sys_rag_updated_at();

-- =============================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================

-- Add foreign keys if they don't exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sys_rag_default_chat_model_id_fkey'
        AND conrelid = 'public.sys_rag'::regclass
    ) THEN
        ALTER TABLE ONLY public.sys_rag
            ADD CONSTRAINT sys_rag_default_chat_model_id_fkey 
            FOREIGN KEY (default_chat_model_id) 
            REFERENCES public.ai_models(id) 
            ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sys_rag_default_embedding_model_id_fkey'
        AND conrelid = 'public.sys_rag'::regclass
    ) THEN
        ALTER TABLE ONLY public.sys_rag
            ADD CONSTRAINT sys_rag_default_embedding_model_id_fkey 
            FOREIGN KEY (default_embedding_model_id) 
            REFERENCES public.ai_models(id) 
            ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sys_rag_updated_by_fkey'
        AND conrelid = 'public.sys_rag'::regclass
    ) THEN
        ALTER TABLE ONLY public.sys_rag
            ADD CONSTRAINT sys_rag_updated_by_fkey 
            FOREIGN KEY (updated_by) 
            REFERENCES auth.users(id);
    END IF;
END $$;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.sys_rag ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view system RAG settings
DROP POLICY IF EXISTS "Authenticated users can view sys_rag" ON public.sys_rag;
CREATE POLICY "Authenticated users can view sys_rag" ON public.sys_rag 
    FOR SELECT 
    TO authenticated 
    USING (true);

-- System admins can modify system RAG settings
DROP POLICY IF EXISTS "System admins can modify sys_rag" ON public.sys_rag;
CREATE POLICY "System admins can modify sys_rag" ON public.sys_rag 
    TO authenticated 
    USING ((EXISTS ( SELECT 1
       FROM public.user_profiles
      WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.sys_role IN ('sys_owner', 'sys_admin')))))) 
    WITH CHECK ((EXISTS ( SELECT 1
       FROM public.user_profiles
      WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.sys_role IN ('sys_owner', 'sys_admin'))))));

-- =============================================
-- SEED DATA
-- =============================================
-- Insert default system RAG configuration
-- Idempotent: Safe to run multiple times using WHERE NOT EXISTS

INSERT INTO public.sys_rag (
    available_embedding_models,
    default_embedding_model,
    embedding_model_costs,
    available_chunking_strategies,
    default_chunking_strategy,
    max_chunk_size_tokens,
    min_chunk_size_tokens,
    search_quality_presets,
    default_search_quality,
    default_similarity_threshold,
    max_search_results_global,
    max_context_tokens_global,
    ocr_enabled,
    processing_timeout_minutes,
    max_concurrent_jobs_global,
    vector_index_type,
    backup_retention_days,
    auto_scaling_enabled,
    max_embedding_batch_size,
    embedding_cache_ttl_hours,
    provider_configurations,
    default_ai_provider,
    active_providers,
    default_embedding_model_id,
    default_chat_model_id,
    system_prompt
) 
SELECT 
    ARRAY['text-embedding-3-small', 'text-embedding-3-large'],
    'text-embedding-3-small',
    '{"text-embedding-3-small": 1.0, "text-embedding-3-large": 1.5}'::jsonb,
    ARRAY['fixed', 'semantic', 'hybrid'],
    'hybrid',
    2000,
    100,
    '{
      "fast": {"similarity_threshold": 0.6, "max_results": 5},
      "balanced": {"similarity_threshold": 0.7, "max_results": 10},
      "comprehensive": {"similarity_threshold": 0.5, "max_results": 25}
    }'::jsonb,
    'balanced',
    0.7,
    50,
    8000,
    true,
    30,
    100,
    'ivfflat',
    90,
    true,
    100,
    24,
    '{}'::jsonb,
    'openai',
    ARRAY['openai'],
    NULL,  -- Set after models are discovered via "Discover Models" button
    NULL,  -- Set after models are discovered via "Discover Models" button
    'You are a helpful AI assistant that provides accurate, well-sourced answers based on the knowledge base. Always cite your sources and acknowledge when you don''t have enough information to answer a question.'
WHERE NOT EXISTS (SELECT 1 FROM public.sys_rag);
