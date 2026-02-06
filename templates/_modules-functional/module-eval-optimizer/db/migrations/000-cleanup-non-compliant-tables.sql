-- ============================================================================
-- Module: module-eval-optimizer
-- Migration: 000-cleanup-non-compliant-tables
-- Description: Drop tables created with non-compliant column names (workspace_id instead of ws_id)
-- ============================================================================

-- This migration removes tables that were created with workspace_id column
-- instead of the correct ws_id column per ADR-011 naming standards.

-- Run this BEFORE running the corrected schemas (001-006)

-- ============================================================================
-- STEP 1: Drop ALL RLS policies on eval_opt tables
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on tables starting with eval_opt_
    FOR r IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE tablename LIKE 'eval_opt_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Dropped policy: % on %.%', r.policyname, r.schemaname, r.tablename;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Drop ALL eval_opt tables (in reverse dependency order)
-- ============================================================================

-- Drop child tables first (those with foreign keys)
DROP TABLE IF EXISTS eval_opt_run_results CASCADE;
DROP TABLE IF EXISTS eval_opt_truth_keys CASCADE;
DROP TABLE IF EXISTS eval_opt_doc_group_members CASCADE;

-- Drop parent tables
DROP TABLE IF EXISTS eval_opt_runs CASCADE;
DROP TABLE IF EXISTS eval_opt_response_structures CASCADE;
DROP TABLE IF EXISTS eval_opt_doc_groups CASCADE;
DROP TABLE IF EXISTS eval_opt_context_docs CASCADE;

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
        WHERE tablename LIKE 'eval_opt_%'
        ORDER BY tablename
    LOOP
        RAISE NOTICE '  - %.%', r.schemaname, r.tablename;
        table_count := table_count + 1;
    END LOOP;
    
    IF table_count = 0 THEN
        RAISE NOTICE '✅ All non-compliant eval_opt tables dropped successfully!';
    ELSE
        RAISE WARNING '⚠️  % eval_opt tables still exist. Manual review needed.', table_count;
    END IF;
END $$;

-- ============================================================================
-- After running this migration, run the corrected schemas:
-- ============================================================================
-- 001-eval-opt-doc-groups.sql     (now uses ws_id)
-- 002-eval-opt-truth-keys.sql     (now uses ws_id)
-- 003-eval-opt-runs.sql           (now uses ws_id)
-- 004-eval-opt-prompt-versions.sql (now uses ws_id)
-- 005-eval-opt-context-docs.sql   (now uses ws_id)
-- 006-eval-opt-rls.sql            (now uses ws_id in policies)
-- ============================================================================