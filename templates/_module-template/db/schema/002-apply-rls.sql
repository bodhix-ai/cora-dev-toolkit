-- =============================================
-- MODULE-NAME: RLS Policies for Entity Table
-- =============================================
-- Purpose: Apply Row Level Security policies
-- Dependencies: org-module RLS helper functions

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE public.entity ENABLE ROW LEVEL SECURITY;

-- =============================================
-- DROP EXISTING POLICIES (for development)
-- =============================================

DROP POLICY IF EXISTS "entity_select_policy" ON public.entity;
DROP POLICY IF EXISTS "entity_insert_policy" ON public.entity;
DROP POLICY IF EXISTS "entity_update_policy" ON public.entity;
DROP POLICY IF EXISTS "entity_delete_policy" ON public.entity;

-- =============================================
-- SELECT POLICY
-- =============================================
-- Users can view entities in their organizations

CREATE POLICY "entity_select_policy"
  ON public.entity
  FOR SELECT
  TO authenticated
  USING (can_access_org_data(org_id));

COMMENT ON POLICY "entity_select_policy" ON public.entity IS 
  'Users can view entities in organizations they belong to';

-- =============================================
-- INSERT POLICY
-- =============================================
-- Users can create entities in their organizations

CREATE POLICY "entity_insert_policy"
  ON public.entity
  FOR INSERT
  TO authenticated
  WITH CHECK (can_access_org_data(org_id));

COMMENT ON POLICY "entity_insert_policy" ON public.entity IS 
  'Users can create entities in organizations they belong to';

-- =============================================
-- UPDATE POLICY
-- =============================================
-- Org admins/owners can update entities

CREATE POLICY "entity_update_policy"
  ON public.entity
  FOR UPDATE
  TO authenticated
  USING (can_modify_org_data(org_id))
  WITH CHECK (can_modify_org_data(org_id));

COMMENT ON POLICY "entity_update_policy" ON public.entity IS 
  'Org admins and owners can update entities in their organizations';

-- =============================================
-- DELETE POLICY
-- =============================================
-- Org admins/owners can delete entities

CREATE POLICY "entity_delete_policy"
  ON public.entity
  FOR DELETE
  TO authenticated
  USING (can_modify_org_data(org_id));

COMMENT ON POLICY "entity_delete_policy" ON public.entity IS 
  'Org admins and owners can delete entities in their organizations';

-- =============================================
-- VERIFY POLICIES
-- =============================================

-- List all policies on entity table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'entity';
