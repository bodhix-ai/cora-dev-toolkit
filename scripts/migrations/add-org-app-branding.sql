-- =============================================
-- Migration: Add App Branding to Organizations
-- =============================================
-- Purpose: Add app_name and app_icon columns for customizable org branding
-- Date: 2026-01-12
-- Author: CORA Development Toolkit

-- Add columns if they don't exist
ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS app_name TEXT NULL;
ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS app_icon TEXT NULL;

-- Add comments
COMMENT ON COLUMN public.orgs.app_name IS 'Custom app name displayed in sidebar for this organization';
COMMENT ON COLUMN public.orgs.app_icon IS 'MUI icon name for sidebar branding (default: AutoAwesomeOutlined)';

-- Verify migration
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orgs' 
        AND column_name IN ('app_name', 'app_icon')
    ) THEN
        RAISE NOTICE 'Migration successful: app_name and app_icon columns added to orgs table';
    ELSE
        RAISE EXCEPTION 'Migration failed: columns were not created';
    END IF;
END $$;
