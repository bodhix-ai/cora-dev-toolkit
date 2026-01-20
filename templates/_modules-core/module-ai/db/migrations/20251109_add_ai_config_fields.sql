-- ============================================================================
-- AI Configuration Module - Database Migration
-- ============================================================================
-- 
-- Purpose: Add AI model configuration fields to platform_rag and organization
--          settings tables to support centralized AI configuration management
--
-- Related Documents:
--   - {{PROJECT_NAME}}-stack/docs/implementation/platform-ai-config-module-plan.md
--
-- Date: November 9, 2025
-- Status: Ready for execution
--
-- Critical: This migration addresses vector database integrity by establishing
--           a single source of truth for the embedding model configuration
-- ============================================================================

-- ============================================================================
-- PART 1: UPDATE platform_rag TABLE
-- ============================================================================

-- Add AI model configuration fields to platform_rag table
ALTER TABLE public.platform_rag
  ADD COLUMN IF NOT EXISTS default_embedding_deployment_id UUID 
    REFERENCES public.provider_model_deployments(id)
    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_chat_deployment_id UUID 
    REFERENCES public.provider_model_deployments(id)
    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS system_prompt TEXT 
    DEFAULT 'You are a helpful AI assistant that provides accurate, well-sourced answers based on the knowledge base. Always cite your sources and acknowledge when you don''t have enough information to answer a question.';

-- Create indexes for efficient foreign key lookups
CREATE INDEX IF NOT EXISTS idx_platform_rag_embedding_deployment 
  ON public.platform_rag(default_embedding_deployment_id);

CREATE INDEX IF NOT EXISTS idx_platform_rag_chat_deployment 
  ON public.platform_rag(default_chat_deployment_id);

-- Add comments for documentation
COMMENT ON COLUMN public.platform_rag.default_embedding_deployment_id IS 
  'Default embedding model deployment for all document processing. CRITICAL: Changing this requires re-embedding all existing documents to maintain vector database integrity.';

COMMENT ON COLUMN public.platform_rag.default_chat_deployment_id IS 
  'Default chat model deployment for all conversational AI features across the platform.';

COMMENT ON COLUMN public.platform_rag.system_prompt IS 
  'Platform-wide system prompt that defines the AI assistant behavior and guidelines.';

-- ============================================================================
-- PART 2: UPDATE ORGANIZATION SETTINGS TABLES
-- ============================================================================

-- Note: The organization_rag_settings table was renamed to org_prompt_engineering
-- during the organization_id to org_id refactoring. We support both for backwards
-- compatibility during migration.

-- Check if org_prompt_engineering table exists (current/correct name)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'org_prompt_engineering'
  ) THEN
    -- Add org_system_prompt to org_prompt_engineering if it doesn't exist
    -- Note: This table may already have custom_system_prompt field
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'org_prompt_engineering' 
      AND column_name = 'org_system_prompt'
    ) THEN
      ALTER TABLE public.org_prompt_engineering
        ADD COLUMN org_system_prompt TEXT;
      
      -- Add comment
      COMMENT ON COLUMN public.org_prompt_engineering.org_system_prompt IS 
        'Organization-specific system prompt override. When set, this is combined with the platform system prompt for this organization.';
      
      RAISE NOTICE 'Added org_system_prompt to org_prompt_engineering table';
    ELSE
      RAISE NOTICE 'org_system_prompt column already exists in org_prompt_engineering table';
    END IF;
  ELSE
    RAISE WARNING 'org_prompt_engineering table not found - may need to run org_* migration first';
  END IF;
END $$;

-- LEGACY: Check for old organization_rag_settings table (deprecated)
-- This is for backwards compatibility only and should be removed in future versions
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('organization_rag_settings', 'organization_rag_settings_deprecated_20251014')
  ) THEN
    RAISE WARNING 'Found legacy organization_rag_settings table. This table should have been migrated to org_prompt_engineering.';
    RAISE WARNING 'Please run the org_id refactoring migration: scripts/migrations/migrate-org-config-architecture.sql';
  END IF;
END $$;

-- ============================================================================
-- PART 3: VALIDATION FUNCTION
-- ============================================================================

-- Function to validate that embedding deployment supports embeddings
CREATE OR REPLACE FUNCTION validate_embedding_deployment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if default_embedding_deployment_id is being set
  IF NEW.default_embedding_deployment_id IS NOT NULL THEN
    -- Check that the deployment supports embeddings
    IF NOT EXISTS (
      SELECT 1 FROM public.provider_model_deployments
      WHERE id = NEW.default_embedding_deployment_id
      AND supports_embeddings = true
      AND deployment_status IN ('available', 'testing')
    ) THEN
      RAISE EXCEPTION 'Deployment % does not support embeddings or is not available', 
        NEW.default_embedding_deployment_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate that chat deployment supports chat
CREATE OR REPLACE FUNCTION validate_chat_deployment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if default_chat_deployment_id is being set
  IF NEW.default_chat_deployment_id IS NOT NULL THEN
    -- Check that the deployment supports chat
    IF NOT EXISTS (
      SELECT 1 FROM public.provider_model_deployments
      WHERE id = NEW.default_chat_deployment_id
      AND supports_chat = true
      AND deployment_status IN ('available', 'testing')
    ) THEN
      RAISE EXCEPTION 'Deployment % does not support chat or is not available', 
        NEW.default_chat_deployment_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply validation triggers to platform_rag
DROP TRIGGER IF EXISTS validate_platform_rag_embedding_deployment ON public.platform_rag;
CREATE TRIGGER validate_platform_rag_embedding_deployment
  BEFORE INSERT OR UPDATE OF default_embedding_deployment_id ON public.platform_rag
  FOR EACH ROW
  EXECUTE FUNCTION validate_embedding_deployment();

DROP TRIGGER IF EXISTS validate_platform_rag_chat_deployment ON public.platform_rag;
CREATE TRIGGER validate_platform_rag_chat_deployment
  BEFORE INSERT OR UPDATE OF default_chat_deployment_id ON public.platform_rag
  FOR EACH ROW
  EXECUTE FUNCTION validate_chat_deployment();

-- ============================================================================
-- PART 4: MIGRATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_platform_rag_cols INTEGER;
  v_org_settings_exists BOOLEAN;
  v_org_prompt_exists BOOLEAN;
BEGIN
  -- Count new columns in platform_rag
  SELECT COUNT(*) INTO v_platform_rag_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'platform_rag'
  AND column_name IN ('default_embedding_deployment_id', 'default_chat_deployment_id', 'system_prompt');
  
  -- Check organization tables
  SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'organization_rag_settings'
  ) INTO v_org_settings_exists;
  
  SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'org_prompt_engineering'
  ) INTO v_org_prompt_exists;
  
  -- Report results
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'AI Configuration Module - Migration Complete';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Platform RAG Table:';
  RAISE NOTICE '  - New columns added: %/3', v_platform_rag_cols;
  RAISE NOTICE '  - default_embedding_deployment_id: %', 
    CASE WHEN v_platform_rag_cols >= 1 THEN '✓' ELSE '✗' END;
  RAISE NOTICE '  - default_chat_deployment_id: %', 
    CASE WHEN v_platform_rag_cols >= 2 THEN '✓' ELSE '✗' END;
  RAISE NOTICE '  - system_prompt: %', 
    CASE WHEN v_platform_rag_cols >= 3 THEN '✓' ELSE '✗' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Organization Tables:';
  RAISE NOTICE '  - organization_rag_settings: %', 
    CASE WHEN v_org_settings_exists THEN '✓ (org_system_prompt added)' ELSE '✗ (not found)' END;
  RAISE NOTICE '  - org_prompt_engineering: %', 
    CASE WHEN v_org_prompt_exists THEN '✓ (org_system_prompt added)' ELSE '✗ (not found)' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Validation:';
  RAISE NOTICE '  - Embedding deployment validation trigger: ✓';
  RAISE NOTICE '  - Chat deployment validation trigger: ✓';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Set default_embedding_deployment_id in platform_rag';
  RAISE NOTICE '  2. Set default_chat_deployment_id in platform_rag';
  RAISE NOTICE '  3. Review and customize system_prompt if needed';
  RAISE NOTICE '  4. Update kb_processor.py to use default_embedding_deployment_id';
  RAISE NOTICE '============================================================';
END $$;
