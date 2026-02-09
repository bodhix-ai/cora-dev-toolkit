-- Migration: Add section_responses JSONB column to eval_opt_truth_keys
-- Sprint 5 - Fix truth set save/load persistence
-- Date: 2026-02-09
--
-- Problem: Frontend sends section_responses as nested JSON object, but backend
-- maps individual fields to flat columns (truth_confidence, truth_explanation, etc.).
-- On reload, the GET handler returns flat columns which the frontend can't map back
-- to the original section_responses structure. Custom section data is also lost.
--
-- Solution: Store the complete section_responses JSON in a dedicated JSONB column.
-- This preserves ALL custom fields and enables round-trip persistence.

-- Add section_responses JSONB column (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eval_opt_truth_keys'
        AND column_name = 'section_responses'
    ) THEN
        ALTER TABLE eval_opt_truth_keys
        ADD COLUMN section_responses JSONB;

        COMMENT ON COLUMN eval_opt_truth_keys.section_responses IS
            'Complete section responses JSON from frontend (score, justification, citations, custom fields)';
    END IF;
END $$;

-- Backfill existing records: reconstruct section_responses from flat columns
UPDATE eval_opt_truth_keys
SET section_responses = jsonb_build_object(
    'score', truth_confidence,
    'justification', COALESCE(truth_explanation, ''),
    'citations', CASE 
        WHEN truth_citations IS NOT NULL THEN truth_citations::jsonb
        ELSE '[]'::jsonb
    END
)
WHERE section_responses IS NULL
AND (truth_confidence IS NOT NULL OR truth_explanation IS NOT NULL);

-- Verify migration
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eval_opt_truth_keys'
        AND column_name = 'section_responses'
    ) INTO col_exists;

    IF col_exists THEN
        RAISE NOTICE '✅ Migration successful: section_responses column exists on eval_opt_truth_keys';
    ELSE
        RAISE EXCEPTION '❌ Migration FAILED: section_responses column NOT found';
    END IF;
END $$;