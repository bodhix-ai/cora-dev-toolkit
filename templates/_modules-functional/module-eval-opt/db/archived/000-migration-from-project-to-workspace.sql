-- ============================================================================
-- Module: module-eval-optimizer
-- Migration: 000-migration-from-project-to-workspace
-- Description: Drop ALL eval_opt tables (old project-based schemas) before running workspace-centric schemas
-- ============================================================================

-- This migration should be run ONLY IF you previously deployed the old project-based schemas
-- Run this BEFORE running the new workspace-centric schemas (001-007)

-- ============================================================================
-- STEP 1: Drop ALL RLS policies on eval_opt tables
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on tables starting with eval_opt_ or eval_optimization_
    FOR r IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE tablename LIKE 'eval_opt_%' OR tablename LIKE 'eval_optimization_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Dropped policy: % on %.%', r.policyname, r.schemaname, r.tablename;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Drop ALL eval_opt tables (in reverse dependency order)
-- ============================================================================

-- Drop tables with foreign keys first (children)
DROP TABLE IF EXISTS eval_opt_run_results CASCADE;
DROP TABLE IF EXISTS eval_opt_truth_keys CASCADE;
DROP TABLE IF EXISTS eval_opt_doc_group_members CASCADE;
DROP TABLE IF EXISTS eval_opt_prompt_deployments CASCADE;

-- Drop parent tables
DROP TABLE IF EXISTS eval_opt_runs CASCADE;
DROP TABLE IF EXISTS eval_opt_document_groups CASCADE;
DROP TABLE IF EXISTS eval_opt_doc_groups CASCADE;  -- Both naming variants
DROP TABLE IF EXISTS eval_opt_response_structures CASCADE;
DROP TABLE IF EXISTS eval_opt_prompt_versions CASCADE;
DROP TABLE IF EXISTS eval_opt_context_docs CASCADE;

-- Drop old project-based tables (both naming variants)
DROP TABLE IF EXISTS eval_opt_test_orgs CASCADE;
DROP TABLE IF EXISTS eval_opt_project_members CASCADE;
DROP TABLE IF EXISTS eval_opt_proj_members CASCADE;
DROP TABLE IF EXISTS eval_optimization_projects CASCADE;
DROP TABLE IF EXISTS eval_opt_projects CASCADE;

-- ============================================================================
-- VERIFICATION: List any remaining eval_opt tables (should be empty)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    table_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== Remaining eval_opt tables (should be none): ===';
    FOR r IN 
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE tablename LIKE 'eval_opt_%' OR tablename LIKE 'eval_optimization_%'
        ORDER BY tablename
    LOOP
        RAISE NOTICE '  - %.%', r.schemaname, r.tablename;
        table_count := table_count + 1;
    END LOOP;
    
    IF table_count = 0 THEN
        RAISE NOTICE '✅ All eval_opt tables dropped successfully!';
    ELSE
        RAISE WARNING '⚠️  % eval_opt tables still exist. Manual review needed.', table_count;
    END IF;
END $$;

-- ============================================================================
-- After running this migration, run the new workspace-centric schemas:
-- ============================================================================
-- 001-eval-opt-doc-groups.sql
-- 002-eval-opt-truth-keys.sql
-- 003-eval-opt-runs.sql
-- 004-eval-opt-prompt-versions.sql
-- 006-eval-opt-context-docs.sql
-- 007-eval-opt-rls.sql
-- ============================================================================
