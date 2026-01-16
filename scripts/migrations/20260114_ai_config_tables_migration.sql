-- ============================================================================
-- AI Config Tables Migration (Database Naming Standards - Phase 4)
-- Migrates both AI config tables used by ai-config-handler Lambda
-- ============================================================================
-- Migration Date: January 14, 2026
-- Purpose: Rename sys_rag and org_prompt_engineering to CORA naming standards
-- Impact: ai-config-handler Lambda in module-ai
-- Related: Module-KB Implementation Plan - Phase 0
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Create new tables with correct naming
-- ============================================================================

-- ai_cfg_sys_rag - same structure as sys_rag
CREATE TABLE IF NOT EXISTS ai_cfg_sys_rag (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    available_embedding_models TEXT[] DEFAULT ARRAY['text-embedding-3-small'::TEXT, 'text-embedding-3-large'::TEXT] NOT NULL,
    default_embedding_model TEXT DEFAULT 'text-embedding-3-small'::TEXT NOT NULL,
    embedding_model_costs JSONB DEFAULT '{"text-embedding-3-large": 1.5, "text-embedding-3-small": 1.0}'::jsonb,
    available_chunking_strategies TEXT[] DEFAULT ARRAY['fixed'::TEXT, 'semantic'::TEXT, 'hybrid'::TEXT] NOT NULL,
    default_chunking_strategy TEXT DEFAULT 'hybrid'::TEXT NOT NULL,
    max_chunk_size_tokens INTEGER DEFAULT 2000 NOT NULL,
    min_chunk_size_tokens INTEGER DEFAULT 100 NOT NULL,
    search_quality_presets JSONB DEFAULT '{"fast": {"max_results": 5, "similarity_threshold": 0.6}, "balanced": {"max_results": 10, "similarity_threshold": 0.7}, "comprehensive": {"max_results": 25, "similarity_threshold": 0.5}}'::jsonb NOT NULL,
    default_search_quality TEXT DEFAULT 'balanced'::TEXT NOT NULL,
    default_similarity_threshold NUMERIC(3,2) DEFAULT 0.7 NOT NULL,
    max_search_results_global INTEGER DEFAULT 50 NOT NULL,
    max_context_tokens_global INTEGER DEFAULT 8000 NOT NULL,
    ocr_enabled BOOLEAN DEFAULT true NOT NULL,
    processing_timeout_minutes INTEGER DEFAULT 30 NOT NULL,
    max_concurrent_jobs_global INTEGER DEFAULT 100 NOT NULL,
    vector_index_type TEXT DEFAULT 'ivfflat'::TEXT NOT NULL,
    backup_retention_days INTEGER DEFAULT 90 NOT NULL,
    auto_scaling_enabled BOOLEAN DEFAULT true NOT NULL,
    max_embedding_batch_size INTEGER DEFAULT 100 NOT NULL,
    embedding_cache_ttl_hours INTEGER DEFAULT 24 NOT NULL,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    provider_configurations JSONB DEFAULT '{}'::jsonb,
    default_ai_provider TEXT DEFAULT 'openai'::TEXT,
    active_providers TEXT[] DEFAULT ARRAY['openai'::TEXT],
    default_embedding_model_id UUID,
    default_chat_model_id UUID,
    system_prompt TEXT DEFAULT 'You are a helpful AI assistant that provides accurate, well-sourced answers based on the knowledge base. Always cite your sources and acknowledge when you don''t have enough information to answer a question.'::TEXT,
    CONSTRAINT ai_cfg_sys_rag_default_ai_provider_check CHECK ((default_ai_provider = ANY (ARRAY['openai'::TEXT, 'azure_openai'::TEXT, 'anthropic'::TEXT, 'aws_bedrock'::TEXT]))),
    CONSTRAINT ai_cfg_sys_rag_default_search_quality_check CHECK ((default_search_quality = ANY (ARRAY['fast'::TEXT, 'balanced'::TEXT, 'comprehensive'::TEXT]))),
    CONSTRAINT ai_cfg_sys_rag_default_similarity_threshold_check CHECK (((default_similarity_threshold >= 0.0) AND (default_similarity_threshold <= 1.0))),
    CONSTRAINT ai_cfg_sys_rag_vector_index_type_check CHECK ((vector_index_type = ANY (ARRAY['ivfflat'::TEXT, 'hnsw'::TEXT])))
);

-- ai_cfg_org_prompts - same structure as org_prompt_engineering
CREATE TABLE IF NOT EXISTS ai_cfg_org_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL UNIQUE,
    policy_mission_type TEXT,
    custom_system_prompt TEXT,
    custom_context_prompt TEXT,
    citation_style TEXT DEFAULT 'inline'::TEXT NOT NULL,
    include_page_numbers BOOLEAN DEFAULT true NOT NULL,
    include_source_metadata BOOLEAN DEFAULT true NOT NULL,
    response_tone TEXT,
    max_response_length TEXT,
    configured_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    org_system_prompt TEXT,
    CONSTRAINT ai_cfg_org_prompts_citation_style_check CHECK ((citation_style = ANY (ARRAY['inline'::TEXT, 'footnote'::TEXT, 'endnote'::TEXT, 'none'::TEXT]))),
    CONSTRAINT ai_cfg_org_prompts_max_response_length_check CHECK ((max_response_length = ANY (ARRAY['concise'::TEXT, 'moderate'::TEXT, 'detailed'::TEXT]))),
    CONSTRAINT ai_cfg_org_prompts_policy_mission_type_check CHECK ((policy_mission_type = ANY (ARRAY['research'::TEXT, 'compliance'::TEXT, 'education'::TEXT, 'general'::TEXT]))),
    CONSTRAINT ai_cfg_org_prompts_response_tone_check CHECK ((response_tone = ANY (ARRAY['professional'::TEXT, 'casual'::TEXT, 'technical'::TEXT, 'simple'::TEXT])))
);

-- ============================================================================
-- 2. Copy data from old tables (if they exist)
-- ============================================================================

DO $$
BEGIN
    -- Check if sys_rag exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sys_rag') THEN
        INSERT INTO ai_cfg_sys_rag 
        SELECT * FROM sys_rag
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Migrated % rows from sys_rag to ai_cfg_sys_rag', 
            (SELECT COUNT(*) FROM ai_cfg_sys_rag);
    ELSE
        RAISE NOTICE 'Table sys_rag does not exist, skipping data migration';
    END IF;
    
    -- Check if org_prompt_engineering exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'org_prompt_engineering') THEN
        INSERT INTO ai_cfg_org_prompts 
        SELECT * FROM org_prompt_engineering
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Migrated % rows from org_prompt_engineering to ai_cfg_org_prompts', 
            (SELECT COUNT(*) FROM ai_cfg_org_prompts);
    ELSE
        RAISE NOTICE 'Table org_prompt_engineering does not exist, skipping data migration';
    END IF;
END $$;

-- ============================================================================
-- 3. Recreate indexes
-- ============================================================================

-- Indexes for ai_cfg_sys_rag
CREATE INDEX IF NOT EXISTS idx_ai_cfg_sys_rag_active_providers 
    ON ai_cfg_sys_rag USING GIN (active_providers);

CREATE INDEX IF NOT EXISTS idx_ai_cfg_sys_rag_chat_deployment 
    ON ai_cfg_sys_rag USING BTREE (default_chat_model_id);

CREATE INDEX IF NOT EXISTS idx_ai_cfg_sys_rag_embedding_deployment 
    ON ai_cfg_sys_rag USING BTREE (default_embedding_model_id);

CREATE INDEX IF NOT EXISTS idx_ai_cfg_sys_rag_provider_configs 
    ON ai_cfg_sys_rag USING GIN (provider_configurations);

-- Singleton constraint - only one ai_cfg_sys_rag record allowed
CREATE UNIQUE INDEX IF NOT EXISTS ai_cfg_sys_rag_singleton 
    ON ai_cfg_sys_rag USING BTREE ((true));

-- Indexes for ai_cfg_org_prompts
CREATE INDEX IF NOT EXISTS idx_ai_cfg_org_prompts_org_id 
    ON ai_cfg_org_prompts USING BTREE (org_id);

-- ============================================================================
-- 4. Add foreign key constraints
-- ============================================================================

-- Foreign keys for ai_cfg_sys_rag
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_cfg_sys_rag_default_chat_model_id_fkey'
        AND conrelid = 'public.ai_cfg_sys_rag'::regclass
    ) THEN
        ALTER TABLE ONLY ai_cfg_sys_rag
            ADD CONSTRAINT ai_cfg_sys_rag_default_chat_model_id_fkey 
            FOREIGN KEY (default_chat_model_id) 
            REFERENCES ai_models(id) 
            ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_cfg_sys_rag_default_embedding_model_id_fkey'
        AND conrelid = 'public.ai_cfg_sys_rag'::regclass
    ) THEN
        ALTER TABLE ONLY ai_cfg_sys_rag
            ADD CONSTRAINT ai_cfg_sys_rag_default_embedding_model_id_fkey 
            FOREIGN KEY (default_embedding_model_id) 
            REFERENCES ai_models(id) 
            ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_cfg_sys_rag_updated_by_fkey'
        AND conrelid = 'public.ai_cfg_sys_rag'::regclass
    ) THEN
        ALTER TABLE ONLY ai_cfg_sys_rag
            ADD CONSTRAINT ai_cfg_sys_rag_updated_by_fkey 
            FOREIGN KEY (updated_by) 
            REFERENCES auth.users(id);
    END IF;
END $$;

-- Foreign keys for ai_cfg_org_prompts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_cfg_org_prompts_configured_by_fkey'
        AND conrelid = 'public.ai_cfg_org_prompts'::regclass
    ) THEN
        ALTER TABLE ONLY ai_cfg_org_prompts
            ADD CONSTRAINT ai_cfg_org_prompts_configured_by_fkey 
            FOREIGN KEY (configured_by) 
            REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_cfg_org_prompts_org_id_fkey'
        AND conrelid = 'public.ai_cfg_org_prompts'::regclass
    ) THEN
        ALTER TABLE ONLY ai_cfg_org_prompts
            ADD CONSTRAINT ai_cfg_org_prompts_org_id_fkey 
            FOREIGN KEY (org_id) 
            REFERENCES orgs(id) 
            ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- 5. Enable RLS and create policies
-- ============================================================================

ALTER TABLE ai_cfg_sys_rag ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cfg_org_prompts ENABLE ROW LEVEL SECURITY;

-- RLS for ai_cfg_sys_rag
DROP POLICY IF EXISTS "Authenticated users can view ai_cfg_sys_rag" ON ai_cfg_sys_rag;
CREATE POLICY "Authenticated users can view ai_cfg_sys_rag" 
    ON ai_cfg_sys_rag 
    FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "System admins can modify ai_cfg_sys_rag" ON ai_cfg_sys_rag;
CREATE POLICY "System admins can modify ai_cfg_sys_rag" 
    ON ai_cfg_sys_rag 
    TO authenticated 
    USING ((EXISTS ( SELECT 1
       FROM user_profiles
      WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.sys_role IN ('sys_owner', 'sys_admin')))))) 
    WITH CHECK ((EXISTS ( SELECT 1
       FROM user_profiles
      WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.sys_role IN ('sys_owner', 'sys_admin'))))));

-- RLS for ai_cfg_org_prompts
DROP POLICY IF EXISTS "Sys admins can manage prompt engineering" ON ai_cfg_org_prompts;
CREATE POLICY "Sys admins can manage prompt engineering" 
    ON ai_cfg_org_prompts 
    TO authenticated 
    USING ((EXISTS ( SELECT 1
       FROM user_profiles
      WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.sys_role IN ('sys_owner', 'sys_admin'))))));

-- ============================================================================
-- 6. Drop old tables and create backward-compatible views
-- ============================================================================

-- Drop old tables (data already migrated to new tables)
DROP TABLE IF EXISTS sys_rag CASCADE;
DROP TABLE IF EXISTS org_prompt_engineering CASCADE;

-- Create backward-compatible views (temporary - remove after 1 week)
CREATE VIEW sys_rag AS SELECT * FROM ai_cfg_sys_rag;
CREATE VIEW org_prompt_engineering AS SELECT * FROM ai_cfg_org_prompts;

-- ============================================================================
-- 7. Add comments documenting migration
-- ============================================================================

COMMENT ON TABLE ai_cfg_sys_rag IS 'RAG embedding configuration (migrated from sys_rag on 2026-01-14). Used by module-ai ai-config-handler Lambda and module-kb kb-processor Lambda.';

COMMENT ON TABLE ai_cfg_org_prompts IS 'Organization prompt engineering config (migrated from org_prompt_engineering on 2026-01-14). Used by module-ai ai-config-handler Lambda.';

COMMENT ON VIEW sys_rag IS 'DEPRECATED: Backward-compatible view. Use ai_cfg_sys_rag table directly. This view will be removed on 2026-01-21.';

COMMENT ON VIEW org_prompt_engineering IS 'DEPRECATED: Backward-compatible view. Use ai_cfg_org_prompts table directly. This view will be removed on 2026-01-21.';

-- ============================================================================
-- 8. Grant permissions
-- ============================================================================

-- Grant access to authenticated role (standard for Supabase)
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_cfg_sys_rag TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_cfg_org_prompts TO authenticated;

-- Grant access to service_role for admin operations
GRANT ALL ON ai_cfg_sys_rag TO service_role;
GRANT ALL ON ai_cfg_org_prompts TO service_role;

-- Grant view access
GRANT SELECT ON sys_rag TO authenticated;
GRANT SELECT ON org_prompt_engineering TO authenticated;

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Next Steps:
-- 1. Update module-ai/ai-config-handler Lambda to use new table names
-- 2. Update template schema files (006 and 007)
-- 3. Test RAG configuration read/write via API
-- 4. Test org prompt configuration read/write via API
-- 5. Monitor for 1 week, then remove backward-compatible views
-- ============================================================================
