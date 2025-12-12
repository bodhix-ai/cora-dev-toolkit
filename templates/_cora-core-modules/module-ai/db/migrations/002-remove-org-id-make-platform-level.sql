-- Migration: Remove org_id from ai_providers and ai_models to make them platform-level
-- Also updates platform_rag column names for clarity

-- Step 1: Drop triggers and functions that reference old column names
-- Use CASCADE to automatically drop dependent triggers
DROP FUNCTION IF EXISTS validate_chat_deployment() CASCADE;
DROP FUNCTION IF EXISTS validate_embedding_deployment() CASCADE;

-- Step 2: Drop existing RLS policies
DROP POLICY IF EXISTS "ai_providers_org_members_access" ON public.ai_providers;
DROP POLICY IF EXISTS "ai_models_org_members_access" ON public.ai_models;

-- Step 3: Remove org_id columns and constraints
ALTER TABLE public.ai_models DROP CONSTRAINT IF EXISTS ai_models_org_id_fkey;
ALTER TABLE public.ai_providers DROP CONSTRAINT IF EXISTS ai_providers_org_id_fkey;
ALTER TABLE public.ai_providers DROP CONSTRAINT IF EXISTS ai_providers_org_id_name_key;

ALTER TABLE public.ai_providers DROP COLUMN IF EXISTS org_id;
ALTER TABLE public.ai_models DROP COLUMN IF EXISTS org_id;

-- Step 4: Update unique constraint on ai_providers (remove org_id)
ALTER TABLE public.ai_providers ADD CONSTRAINT ai_providers_name_key UNIQUE(name);

-- Step 5: Create new RLS policies for super_admin, global_owner, and global_admin access only
CREATE POLICY "ai_providers_admin_access" ON public.ai_providers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.global_role IN ('super_admin', 'global_owner', 'global_admin')
        )
    );

CREATE POLICY "ai_models_admin_access" ON public.ai_models
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.global_role IN ('super_admin', 'global_owner', 'global_admin')
        )
    );

-- Step 6: Update platform_rag column names for clarity
-- Rename from deployment_id to model_id to reflect new schema
ALTER TABLE public.platform_rag 
    RENAME COLUMN default_embedding_deployment_id TO default_embedding_model_id;

ALTER TABLE public.platform_rag 
    RENAME COLUMN default_chat_deployment_id TO default_chat_model_id;

-- Step 7: Drop old foreign key constraints on platform_rag (if they exist)
ALTER TABLE public.platform_rag 
    DROP CONSTRAINT IF EXISTS platform_rag_default_embedding_deployment_id_fkey;

ALTER TABLE public.platform_rag 
    DROP CONSTRAINT IF EXISTS platform_rag_default_chat_deployment_id_fkey;

-- Step 8: Clear existing values since they reference the old table
-- These will need to be reconfigured through the admin UI after migration
UPDATE public.platform_rag 
SET default_embedding_model_id = NULL, 
    default_chat_model_id = NULL;

-- Step 9: Add new foreign key constraints to ai_models
ALTER TABLE public.platform_rag 
    ADD CONSTRAINT platform_rag_default_embedding_model_id_fkey 
    FOREIGN KEY (default_embedding_model_id) 
    REFERENCES public.ai_models(id) 
    ON DELETE SET NULL;

ALTER TABLE public.platform_rag 
    ADD CONSTRAINT platform_rag_default_chat_model_id_fkey 
    FOREIGN KEY (default_chat_model_id) 
    REFERENCES public.ai_models(id) 
    ON DELETE SET NULL;

-- Step 10: Update table comments
COMMENT ON TABLE public.ai_providers IS 'Platform-level configuration for external AI providers. Only accessible by super_admin, global_owner, and global_admin.';
COMMENT ON TABLE public.ai_models IS 'Platform-level catalog of AI models discovered from configured providers. Only accessible by super_admin, global_owner, and global_admin.';
COMMENT ON COLUMN public.platform_rag.default_embedding_model_id IS 'Default embedding model for the entire platform. References ai_models.id.';
COMMENT ON COLUMN public.platform_rag.default_chat_model_id IS 'Default chat model for the entire platform. References ai_models.id.';
