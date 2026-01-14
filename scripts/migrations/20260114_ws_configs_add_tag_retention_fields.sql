-- Migration: Add tag constraints and retention days to ws_configs
-- Date: 2026-01-14
-- Purpose: Add missing fields for workspace configuration defaults that were in UI but not in schema

-- Add default_retention_days column
ALTER TABLE public.ws_configs
ADD COLUMN IF NOT EXISTS default_retention_days integer NULL DEFAULT 30;

-- Add max_tags_per_workspace column
ALTER TABLE public.ws_configs
ADD COLUMN IF NOT EXISTS max_tags_per_workspace integer NULL DEFAULT 10;

-- Add max_tag_length column
ALTER TABLE public.ws_configs
ADD COLUMN IF NOT EXISTS max_tag_length integer NULL DEFAULT 20;

-- Add constraints for the new fields
ALTER TABLE public.ws_configs
ADD CONSTRAINT ws_configs_retention_days_check 
CHECK (default_retention_days IS NULL OR (default_retention_days >= 1 AND default_retention_days <= 365));

ALTER TABLE public.ws_configs
ADD CONSTRAINT ws_configs_max_tags_check 
CHECK (max_tags_per_workspace IS NULL OR (max_tags_per_workspace >= 1 AND max_tags_per_workspace <= 50));

ALTER TABLE public.ws_configs
ADD CONSTRAINT ws_configs_max_tag_length_check 
CHECK (max_tag_length IS NULL OR (max_tag_length >= 3 AND max_tag_length <= 50));

-- Update existing config record with default values if it exists
UPDATE public.ws_configs
SET 
  default_retention_days = COALESCE(default_retention_days, 30),
  max_tags_per_workspace = COALESCE(max_tags_per_workspace, 10),
  max_tag_length = COALESCE(max_tag_length, 20)
WHERE id = '00000000-0000-0000-0000-000000000001';

COMMENT ON COLUMN public.ws_configs.default_retention_days IS 'Default retention period in days for deleted workspaces (1-365)';
COMMENT ON COLUMN public.ws_configs.max_tags_per_workspace IS 'Maximum number of tags allowed per workspace (1-50)';
COMMENT ON COLUMN public.ws_configs.max_tag_length IS 'Maximum character length for workspace tags (3-50)';
