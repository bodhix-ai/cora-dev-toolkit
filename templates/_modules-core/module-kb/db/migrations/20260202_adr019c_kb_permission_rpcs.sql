-- ========================================
-- Migration: Add ADR-019c KB Resource Permission RPC Functions
-- Created: 2026-02-02
-- Sprint: S3 Phase 10
-- Purpose: Add ownership-based permission checks for KB resources
-- ========================================

-- Check if functions already exist, drop if they do
DROP FUNCTION IF EXISTS is_kb_owner(UUID, UUID);
DROP FUNCTION IF EXISTS can_view_kb(UUID, UUID);
DROP FUNCTION IF EXISTS can_edit_kb(UUID, UUID);
DROP FUNCTION IF EXISTS can_delete_kb(UUID, UUID);
DROP FUNCTION IF EXISTS can_view_kb_document(UUID, UUID);
DROP FUNCTION IF EXISTS can_edit_kb_document(UUID, UUID);

-- ========================================
-- Create new permission functions
-- ========================================

-- Function: Check if user is the owner of a KB base
CREATE OR REPLACE FUNCTION is_kb_owner(p_user_id UUID, p_kb_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_kb RECORD;
BEGIN
    SELECT * INTO v_kb FROM public.kb_bases 
    WHERE id = p_kb_id AND is_deleted = false;
    
    IF v_kb IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN v_kb.created_by = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can view KB (ownership + future sharing)
CREATE OR REPLACE FUNCTION can_view_kb(p_user_id UUID, p_kb_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Currently: ownership only
    -- Future: will include sharing logic
    RETURN is_kb_owner(p_user_id, p_kb_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can edit KB (ownership + future edit permissions)
CREATE OR REPLACE FUNCTION can_edit_kb(p_user_id UUID, p_kb_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Currently: ownership only
    -- Future: will include edit permission shares
    RETURN is_kb_owner(p_user_id, p_kb_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can delete KB (ownership only)
CREATE OR REPLACE FUNCTION can_delete_kb(p_user_id UUID, p_kb_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_kb_owner(p_user_id, p_kb_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can view KB document
CREATE OR REPLACE FUNCTION can_view_kb_document(p_user_id UUID, p_doc_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_doc RECORD;
BEGIN
    SELECT * INTO v_doc FROM public.kb_docs 
    WHERE id = p_doc_id AND is_deleted = false;
    
    IF v_doc IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check KB access
    RETURN can_view_kb(p_user_id, v_doc.kb_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can edit/delete KB document
CREATE OR REPLACE FUNCTION can_edit_kb_document(p_user_id UUID, p_doc_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_doc RECORD;
BEGIN
    SELECT * INTO v_doc FROM public.kb_docs 
    WHERE id = p_doc_id AND is_deleted = false;
    
    IF v_doc IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check KB edit permission
    RETURN can_edit_kb(p_user_id, v_doc.kb_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Add comments
-- ========================================

COMMENT ON FUNCTION is_kb_owner IS 'Check if user is owner of KB base';
COMMENT ON FUNCTION can_view_kb IS 'Check if user can view KB (ownership + future sharing)';
COMMENT ON FUNCTION can_edit_kb IS 'Check if user can edit KB (ownership + future edit permissions)';
COMMENT ON FUNCTION can_delete_kb IS 'Check if user can delete KB (ownership only)';
COMMENT ON FUNCTION can_view_kb_document IS 'Check if user can view KB document';
COMMENT ON FUNCTION can_edit_kb_document IS 'Check if user can edit/delete KB document';