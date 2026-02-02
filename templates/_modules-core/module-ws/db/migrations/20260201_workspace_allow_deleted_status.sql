-- =============================================
-- Migration: Allow 'deleted' status for workspaces
-- =============================================
-- Purpose: Update workspaces_status_check constraint to allow 'deleted' status
-- Date: 2026-02-01
-- Reason: UI has both delete and archive buttons with different semantics
-- Issue: soft_delete_ws RPC function sets status='deleted' which violated old constraint

-- Drop the old constraint
ALTER TABLE public.workspaces 
DROP CONSTRAINT IF EXISTS workspaces_status_check;

-- Add the new constraint with 'deleted' allowed
ALTER TABLE public.workspaces 
ADD CONSTRAINT workspaces_status_check CHECK (status IN ('active', 'archived', 'deleted'));

-- Update the column comment to reflect the new allowed values
COMMENT ON COLUMN public.workspaces.status IS 'Workspace status: active, archived, or deleted';