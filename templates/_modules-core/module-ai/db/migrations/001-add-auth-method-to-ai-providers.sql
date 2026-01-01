-- =============================================================================
-- Migration: Add auth_method column to ai_providers table
-- =============================================================================
-- Date: December 30, 2025
-- Description: Adds auth_method column to support IAM role authentication
-- Idempotent: Safe to run multiple times

-- Add auth_method column if it doesn't exist
DO $$ 
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_providers' 
        AND column_name = 'auth_method'
    ) THEN
        -- Add column with default value
        ALTER TABLE public.ai_providers 
        ADD COLUMN auth_method TEXT DEFAULT 'secrets_manager';
        
        -- Update existing rows to set auth_method based on credentials_secret_path
        -- If credentials_secret_path is empty/null, assume iam_role (for AWS Bedrock)
        UPDATE public.ai_providers
        SET auth_method = CASE 
            WHEN provider_type = 'aws_bedrock' AND (credentials_secret_path IS NULL OR credentials_secret_path = '') THEN 'iam_role'
            ELSE 'secrets_manager'
        END;
        
        RAISE NOTICE 'Added auth_method column to ai_providers table';
    ELSE
        RAISE NOTICE 'auth_method column already exists, skipping';
    END IF;
END $$;

-- Add CHECK constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'ai_providers' 
        AND constraint_name = 'valid_auth_method'
    ) THEN
        ALTER TABLE public.ai_providers 
        ADD CONSTRAINT valid_auth_method CHECK (auth_method IN ('iam_role', 'secrets_manager', 'ssm_parameter'));
        
        RAISE NOTICE 'Added valid_auth_method constraint';
    ELSE
        RAISE NOTICE 'valid_auth_method constraint already exists, skipping';
    END IF;
END $$;

-- Update column comment
COMMENT ON COLUMN public.ai_providers.auth_method IS 'Authentication method: iam_role (AWS only), secrets_manager (all providers), ssm_parameter (dev only)';
