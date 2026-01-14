-- =============================================
-- Migration: Add missing columns to org_email_domains
-- =============================================
-- Issue: POST /orgs failing with "Could not find 'default_role' column"
-- Root Cause: org_email_domains table missing default_role and is_verified columns
-- Date: 2026-01-12

-- Add default_role column for auto-provisioning role assignment
ALTER TABLE public.org_email_domains 
ADD COLUMN IF NOT EXISTS default_role VARCHAR(50) DEFAULT 'org_user';

-- Add is_verified column for domain verification status
ALTER TABLE public.org_email_domains 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Add updated_by column for audit trail
ALTER TABLE public.org_email_domains 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add index on default_role for query performance
CREATE INDEX IF NOT EXISTS idx_org_email_domains_default_role 
    ON public.org_email_domains(default_role);

-- Add comments
COMMENT ON COLUMN public.org_email_domains.default_role IS 'Role assigned to users who auto-provision via this domain (org_user, org_admin, org_owner)';
COMMENT ON COLUMN public.org_email_domains.is_verified IS 'Whether the domain ownership has been verified';
COMMENT ON COLUMN public.org_email_domains.updated_by IS 'User who last updated this domain configuration';

-- Verify changes
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'org_email_domains'
ORDER BY ordinal_position;
