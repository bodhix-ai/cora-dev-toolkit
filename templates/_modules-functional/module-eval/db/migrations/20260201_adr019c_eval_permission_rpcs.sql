-- ============================================================================
-- Migration: Add ADR-019c resource permission RPC functions
-- Date: 2026-02-01
-- Module: module-eval
-- Description: Add can_view_eval and can_edit_eval functions for Layer 2 auth
-- ============================================================================

-- Check if user can view an evaluation (ownership + future sharing)
CREATE OR REPLACE FUNCTION can_view_eval(p_user_id UUID, p_eval_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check ownership (sharing to be added in future)
    RETURN is_eval_owner(p_user_id, p_eval_id);
    
    -- Future: Add sharing check
    -- OR EXISTS (
    --     SELECT 1 FROM eval_shares
    --     WHERE eval_id = p_eval_id
    --     AND shared_with_user_id = p_user_id
    --     AND can_view = true
    -- )
END;
$$;

COMMENT ON FUNCTION can_view_eval IS 'ADR-019c: Check if user can view evaluation (ownership + future sharing)';

-- Check if user can edit an evaluation (ownership + future edit shares)
CREATE OR REPLACE FUNCTION can_edit_eval(p_user_id UUID, p_eval_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check ownership (edit sharing to be added in future)
    RETURN is_eval_owner(p_user_id, p_eval_id);
    
    -- Future: Add edit sharing check
    -- OR EXISTS (
    --     SELECT 1 FROM eval_shares
    --     WHERE eval_id = p_eval_id
    --     AND shared_with_user_id = p_user_id
    --     AND can_edit = true
    -- )
END;
$$;

COMMENT ON FUNCTION can_edit_eval IS 'ADR-019c: Check if user can edit evaluation (ownership + future edit shares)';

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION can_view_eval(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_edit_eval(UUID, UUID) TO authenticated;

-- ============================================================================
-- End of migration
-- ============================================================================