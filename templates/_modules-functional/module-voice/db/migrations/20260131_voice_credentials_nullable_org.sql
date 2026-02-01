-- ========================================
-- Voice Module - Allow NULL org_id for platform credentials
-- Created: January 31, 2026
-- Purpose: Platform-level voice credentials (sys admin) have no org
-- ========================================

-- Make org_id nullable for platform-level credentials
ALTER TABLE public.voice_credentials
ALTER COLUMN org_id DROP NOT NULL;

-- Drop the existing unique constraint
ALTER TABLE public.voice_credentials
DROP CONSTRAINT IF EXISTS voice_credentials_service_org_unique;

-- Add a new unique constraint that handles NULL org_id
-- For platform credentials (org_id IS NULL): one per service
-- For org credentials (org_id IS NOT NULL): one per service per org
CREATE UNIQUE INDEX voice_credentials_service_org_unique 
ON public.voice_credentials (service_name, org_id) 
WHERE org_id IS NOT NULL;

CREATE UNIQUE INDEX voice_credentials_service_platform_unique 
ON public.voice_credentials (service_name) 
WHERE org_id IS NULL;

-- Add comment explaining the dual-level credential system
COMMENT ON TABLE public.voice_credentials IS 'Voice service credentials - platform-level (org_id NULL) or org-level (org_id set)';