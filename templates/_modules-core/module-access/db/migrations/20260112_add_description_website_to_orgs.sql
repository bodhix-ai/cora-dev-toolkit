-- =============================================
-- Migration: Add description and website_url columns to orgs table
-- Date: 2026-01-12
-- =============================================
-- Purpose: Add missing columns that are referenced in the Lambda code and UI

-- Add description column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orgs' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.orgs ADD COLUMN description TEXT NULL;
        COMMENT ON COLUMN public.orgs.description IS 'Organization description';
    END IF;
END $$;

-- Add website_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orgs' 
        AND column_name = 'website_url'
    ) THEN
        ALTER TABLE public.orgs ADD COLUMN website_url TEXT NULL;
        COMMENT ON COLUMN public.orgs.website_url IS 'Organization website URL';
    END IF;
END $$;
