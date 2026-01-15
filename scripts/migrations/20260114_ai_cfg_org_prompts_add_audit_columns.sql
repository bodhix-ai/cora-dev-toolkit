-- ============================================================================
-- Add Standard Audit Columns to ai_cfg_org_prompts
-- ============================================================================
-- Migration Date: January 14, 2026
-- Purpose: Add created_by and updated_by to match CORA audit standards
-- Impact: ai-config-handler Lambda
-- ============================================================================

BEGIN;

-- Add created_by column (for new records)
ALTER TABLE ai_cfg_org_prompts 
ADD COLUMN IF NOT EXISTS created_by UUID 
REFERENCES auth.users(id);

-- Add updated_by column (for updates)
ALTER TABLE ai_cfg_org_prompts 
ADD COLUMN IF NOT EXISTS updated_by UUID 
REFERENCES auth.users(id);

-- Migrate existing configured_by data to both columns
UPDATE ai_cfg_org_prompts
SET 
    created_by = configured_by,
    updated_by = configured_by
WHERE configured_by IS NOT NULL;

-- Drop the backward-compatible view (it references configured_by)
DROP VIEW IF EXISTS org_prompt_engineering;

-- Drop the obsolete configured_by column
ALTER TABLE ai_cfg_org_prompts 
DROP COLUMN IF EXISTS configured_by;

-- Recreate the view without the configured_by column (using new columns)
CREATE VIEW org_prompt_engineering AS SELECT * FROM ai_cfg_org_prompts;

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Next Steps:
-- 1. Update ai-config-handler Lambda to use created_by/updated_by
-- 2. Test org AI config save
-- 3. Verify configured_by is populated via created_by/updated_by
-- 4. Consider removing configured_by column in future migration
-- ============================================================================
