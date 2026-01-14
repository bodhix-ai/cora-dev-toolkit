# Rollback Procedure: AI Config Tables Migration

**Migration Date:** January 14, 2026  
**Migration File:** `20260114_ai_config_tables_migration.sql`  
**Related:** Module-KB Implementation Plan - Phase 0

---

## When to Roll Back

Roll back this migration if:
- API endpoints fail to read/write AI config data after deployment
- Lambda functions show errors related to table names
- Data integrity issues are discovered in the new tables
- Unexpected application behavior related to AI configuration

---

## Rollback Steps

### 1. Stop Affected Services

```bash
# Stop or scale down affected Lambda functions
# This prevents write conflicts during rollback
```

### 2. Execute Rollback SQL

```sql
BEGIN;

-- ============================================================================
-- 1. Recreate old tables with original names
-- ============================================================================

CREATE TABLE IF NOT EXISTS sys_rag (
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
    CONSTRAINT sys_rag_default_ai_provider_check CHECK ((default_ai_provider = ANY (ARRAY['openai'::TEXT, 'azure_openai'::TEXT, 'anthropic'::TEXT, 'aws_bedrock'::TEXT]))),
    CONSTRAINT sys_rag_default_search_quality_check CHECK ((default_search_quality = ANY (ARRAY['fast'::TEXT, 'balanced'::TEXT, 'comprehensive'::TEXT]))),
    CONSTRAINT sys_rag_default_similarity_threshold_check CHECK (((default_similarity_threshold >= 0.0) AND (default_similarity_threshold <= 1.0))),
    CONSTRAINT sys_rag_vector_index_type_check CHECK ((vector_index_type = ANY (ARRAY['ivfflat'::TEXT, 'hnsw'::TEXT])))
);

CREATE TABLE IF NOT EXISTS org_prompt_engineering (
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
    CONSTRAINT org_prompt_engineering_citation_style_check CHECK ((citation_style = ANY (ARRAY['inline'::TEXT, 'footnote'::TEXT, 'endnote'::TEXT, 'none'::TEXT]))),
    CONSTRAINT org_prompt_engineering_max_response_length_check CHECK ((max_response_length = ANY (ARRAY['concise'::TEXT, 'moderate'::TEXT, 'detailed'::TEXT]))),
    CONSTRAINT org_prompt_engineering_policy_mission_type_check CHECK ((policy_mission_type = ANY (ARRAY['research'::TEXT, 'compliance'::TEXT, 'education'::TEXT, 'general'::TEXT]))),
    CONSTRAINT org_prompt_engineering_response_tone_check CHECK ((response_tone = ANY (ARRAY['professional'::TEXT, 'casual'::TEXT, 'technical'::TEXT, 'simple'::TEXT])))
);

-- ============================================================================
-- 2. Copy data back from new tables to old tables
-- ============================================================================

INSERT INTO sys_rag SELECT * FROM ai_cfg_sys_rag ON CONFLICT (id) DO NOTHING;
INSERT INTO org_prompt_engineering SELECT * FROM ai_cfg_org_prompts ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. Recreate indexes on old tables
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sys_rag_active_providers ON sys_rag USING GIN (active_providers);
CREATE INDEX IF NOT EXISTS idx_sys_rag_chat_deployment ON sys_rag USING BTREE (default_chat_model_id);
CREATE INDEX IF NOT EXISTS idx_sys_rag_embedding_deployment ON sys_rag USING BTREE (default_embedding_model_id);
CREATE INDEX IF NOT EXISTS idx_sys_rag_provider_configs ON sys_rag USING GIN (provider_configurations);
CREATE UNIQUE INDEX IF NOT EXISTS sys_rag_singleton ON sys_rag USING BTREE ((true));
CREATE INDEX IF NOT EXISTS idx_org_prompt_engineering_org_id ON org_prompt_engineering USING BTREE (org_id);

-- ============================================================================
-- 4. Recreate foreign keys on old tables
-- ============================================================================

ALTER TABLE ONLY sys_rag
    ADD CONSTRAINT sys_rag_default_chat_model_id_fkey 
    FOREIGN KEY (default_chat_model_id) 
    REFERENCES ai_models(id) 
    ON DELETE SET NULL;

ALTER TABLE ONLY sys_rag
    ADD CONSTRAINT sys_rag_default_embedding_model_id_fkey 
    FOREIGN KEY (default_embedding_model_id) 
    REFERENCES ai_models(id) 
    ON DELETE SET NULL;

ALTER TABLE ONLY sys_rag
    ADD CONSTRAINT sys_rag_updated_by_fkey 
    FOREIGN KEY (updated_by) 
    REFERENCES auth.users(id);

ALTER TABLE ONLY org_prompt_engineering
    ADD CONSTRAINT org_prompt_engineering_configured_by_fkey 
    FOREIGN KEY (configured_by) 
    REFERENCES auth.users(id);

ALTER TABLE ONLY org_prompt_engineering
    ADD CONSTRAINT org_prompt_engineering_org_id_fkey 
    FOREIGN KEY (org_id) 
    REFERENCES orgs(id) 
    ON DELETE CASCADE;

-- ============================================================================
-- 5. Enable RLS on old tables
-- ============================================================================

ALTER TABLE sys_rag ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_prompt_engineering ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sys_rag" ON sys_rag 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "System admins can modify sys_rag" ON sys_rag 
    TO authenticated 
    USING ((EXISTS ( SELECT 1 FROM user_profiles 
        WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.sys_role IN ('sys_owner', 'sys_admin'))))))
    WITH CHECK ((EXISTS ( SELECT 1 FROM user_profiles 
        WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.sys_role IN ('sys_owner', 'sys_admin'))))));

CREATE POLICY "Sys admins can manage prompt engineering" ON org_prompt_engineering 
    TO authenticated 
    USING ((EXISTS ( SELECT 1 FROM user_profiles 
        WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.sys_role IN ('sys_owner', 'sys_admin'))))));

-- ============================================================================
-- 6. Drop new tables and views
-- ============================================================================

DROP VIEW IF EXISTS sys_rag CASCADE;
DROP VIEW IF EXISTS org_prompt_engineering CASCADE;
DROP TABLE IF EXISTS ai_cfg_sys_rag CASCADE;
DROP TABLE IF EXISTS ai_cfg_org_prompts CASCADE;

-- ============================================================================
-- 7. Grant permissions on old tables
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON sys_rag TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON org_prompt_engineering TO authenticated;
GRANT ALL ON sys_rag TO service_role;
GRANT ALL ON org_prompt_engineering TO service_role;

COMMIT;
```

### 3. Revert Lambda Code Changes

**File:** `templates/_modules-core/module-ai/backend/lambdas/ai-config-handler/lambda_function.py`

Revert all references from:
- `ai_cfg_sys_rag` → `sys_rag`
- `ai_cfg_org_prompts` → `org_prompt_engineering`

**Git Command:**
```bash
cd ~/code/bodhix/cora-dev-toolkit
git checkout <commit-before-migration> templates/_modules-core/module-ai/backend/lambdas/ai-config-handler/lambda_function.py
```

### 4. Revert Template Schema Files

**Git Command:**
```bash
# Restore old schema files from archive
cd templates/_modules-core/module-ai/db/schema
mv archive/006-sys-rag.sql.old 006-sys-rag.sql
mv archive/007-org-prompt-engineering.sql.old 007-org-prompt-engineering.sql

# Remove new schema files
rm 006-ai-cfg-sys-rag.sql
rm 007-ai-cfg-org-prompts.sql
```

### 5. Redeploy Lambda Functions

```bash
# From {project}-infra directory
./scripts/deploy-lambda.sh module-ai/ai-config-handler
```

### 6. Verify Rollback

```bash
# Check table existence
psql $DATABASE_URL -c "\dt ai_cfg_sys_rag"  # Should not exist
psql $DATABASE_URL -c "\dt sys_rag"  # Should exist

# Test API endpoints
curl -X GET "https://${API_URL}/platform/ai-config/embedding" \
  -H "Authorization: Bearer ${TOKEN}"

curl -X GET "https://${API_URL}/orgs/${ORG_ID}/ai-config/prompts" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Verification Checklist

After rollback, verify:

- [ ] Old tables (`sys_rag`, `org_prompt_engineering`) exist
- [ ] New tables (`ai_cfg_sys_rag`, `ai_cfg_org_prompts`) do not exist
- [ ] All data from new tables copied back to old tables
- [ ] Row counts match between tables before rollback
- [ ] Lambda functions deployed with old table names
- [ ] API endpoints return valid responses
- [ ] No errors in CloudWatch logs
- [ ] Template schema files restored to original names

---

## Data Loss Risk

**LOW RISK** - This rollback procedure is safe because:
1. The migration created **new** tables without dropping old ones immediately
2. Backward-compatible views ensured old code continued working
3. Data was copied, not moved
4. Both old and new tables coexisted during the migration

**IMPORTANT:** If you've added NEW data to the new tables (`ai_cfg_sys_rag`, `ai_cfg_org_prompts`) since the migration, that data will be preserved in the rollback. The INSERT statements use `ON CONFLICT DO NOTHING` to avoid duplicate key errors.

---

## Prevention for Future Migrations

To avoid needing rollbacks:
1. Test migrations in dev/staging first
2. Use feature flags for Lambda code changes
3. Keep backward-compatible views for 1 week
4. Monitor CloudWatch logs closely after deployment
5. Have a monitoring dashboard for API endpoint health

---

## Contact

If rollback fails or unexpected issues arise:
1. Check CloudWatch logs for detailed error messages
2. Verify database connection and permissions
3. Review the migration SQL file for any missed steps
4. Contact the development team for assistance
