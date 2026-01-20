-- ============================================================================
-- Module: module-eval
-- Migration: add-mode-to-org-status-options
-- Description: Add 'mode' column to eval_org_status_options table
-- Run this on existing deployments where the table already exists
-- ============================================================================

-- Add mode column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eval_org_status_options' 
        AND column_name = 'mode'
    ) THEN
        ALTER TABLE eval_org_status_options 
        ADD COLUMN mode TEXT NOT NULL DEFAULT 'detailed';
        
        -- Add constraint for mode values
        ALTER TABLE eval_org_status_options
        ADD CONSTRAINT eval_org_status_options_mode_check
        CHECK (mode IN ('boolean', 'detailed', 'both'));
        
        -- Create index for mode filtering
        CREATE INDEX IF NOT EXISTS idx_eval_org_status_options_mode
        ON eval_org_status_options(org_id, mode);
        
        -- Update unique constraint (drop old one if exists, add new one)
        ALTER TABLE eval_org_status_options
        DROP CONSTRAINT IF EXISTS eval_org_status_options_org_name_unique;
        
        ALTER TABLE eval_org_status_options
        ADD CONSTRAINT eval_org_status_options_org_name_mode_unique 
        UNIQUE (org_id, name, mode);
        
        -- Add comment
        COMMENT ON COLUMN eval_org_status_options.mode IS 'Which scoring mode uses this option: boolean, detailed, or both';
        
        RAISE NOTICE 'Added mode column to eval_org_status_options';
    ELSE
        RAISE NOTICE 'mode column already exists in eval_org_status_options';
    END IF;
END $$;

-- ============================================================================
-- End of migration
-- ============================================================================
