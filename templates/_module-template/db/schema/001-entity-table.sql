-- =============================================
-- MODULE-NAME: Entity Table
-- =============================================
-- Purpose: Store entity data with multi-tenant support
-- Dependencies: org-module (org table, RLS helpers)

-- =============================================
-- DROP EXISTING (for development only)
-- =============================================
-- DROP TABLE IF EXISTS public.entity CASCADE;

-- =============================================
-- CREATE TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.entity (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenant support (REQUIRED)
  org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
  
  -- Entity fields
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  
  -- Audit fields (RECOMMENDED)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- INDEXES
-- =============================================

-- Required: Index on org_id for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_entity_org_id 
  ON public.entity(org_id);

-- Composite index for common filtered queries
CREATE INDEX IF NOT EXISTS idx_entity_org_status 
  ON public.entity(org_id, status);

-- Index for name searches (optional)
CREATE INDEX IF NOT EXISTS idx_entity_name 
  ON public.entity(name);

-- =============================================
-- CONSTRAINTS
-- =============================================

-- Ensure status has valid values
ALTER TABLE public.entity 
  ADD CONSTRAINT entity_status_check 
  CHECK (status IN ('active', 'inactive', 'archived'));

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_entity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entity_update_timestamp
  BEFORE UPDATE ON public.entity
  FOR EACH ROW
  EXECUTE FUNCTION update_entity_timestamp();

-- Apply audit trigger from org-module
SELECT apply_audit_trigger('entity');

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.entity IS 'Multi-tenant entity data storage';
COMMENT ON COLUMN public.entity.id IS 'Primary key';
COMMENT ON COLUMN public.entity.org_id IS 'Organization foreign key - REQUIRED for multi-tenancy';
COMMENT ON COLUMN public.entity.name IS 'Entity name';
COMMENT ON COLUMN public.entity.description IS 'Entity description';
COMMENT ON COLUMN public.entity.status IS 'Entity status: active, inactive, archived';
COMMENT ON COLUMN public.entity.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.entity.updated_at IS 'Record last update timestamp';
COMMENT ON COLUMN public.entity.created_by IS 'User who created the record';
COMMENT ON COLUMN public.entity.updated_by IS 'User who last updated the record';
