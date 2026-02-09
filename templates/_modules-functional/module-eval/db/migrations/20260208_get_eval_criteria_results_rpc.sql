-- Migration: Add get_eval_criteria_results RPC function
-- Sprint 5 Phase 1: Fix JSONB 406 error when fetching criteria results
-- Date: 2026-02-08

-- =====================================================
-- Function: get_eval_criteria_results
-- =====================================================
-- Purpose: Fetch criteria results with ai_result cast to text to avoid
--          Supabase REST API 406 error on JSONB columns when using select=*
--
-- This function enables eval-results Lambda to fetch criteria results
-- via common.rpc() instead of common.find_many(), avoiding the JSONB issue.
-- =====================================================

-- Drop existing function if signature changed (required when changing return type)
DROP FUNCTION IF EXISTS get_eval_criteria_results(UUID);

CREATE OR REPLACE FUNCTION get_eval_criteria_results(p_eval_summary_id UUID)
RETURNS TABLE (
    id UUID,
    eval_summary_id UUID,
    criteria_item_id UUID,
    ai_result TEXT,  -- Cast from JSONB to TEXT to avoid 406 error
    ai_status_id UUID,
    ai_score_value NUMERIC,
    ai_confidence INTEGER,
    ai_citations TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ecr.id,
        ecr.eval_summary_id,
        ecr.criteria_item_id,
        ecr.ai_result::TEXT,  -- Cast JSONB to TEXT
        ecr.ai_status_id,
        ecr.ai_score_value,
        ecr.ai_confidence,
        ecr.ai_citations::TEXT,  -- Cast JSONB to TEXT
        ecr.processed_at,
        ecr.created_at
    FROM eval_criteria_results ecr
    WHERE ecr.eval_summary_id = p_eval_summary_id
    ORDER BY ecr.created_at ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_eval_criteria_results(UUID) TO authenticated;

-- Verification
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'get_eval_criteria_results'
    ) THEN
        RAISE NOTICE '✅ RPC function get_eval_criteria_results created successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to create RPC function get_eval_criteria_results';
    END IF;
END $$;