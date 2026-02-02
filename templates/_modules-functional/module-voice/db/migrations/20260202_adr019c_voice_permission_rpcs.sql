-- Migration: Add ADR-019c Voice Permission RPCs
-- Created: 2026-02-02
-- Purpose: Add resource permission functions for voice module

-- ========================================
-- ADR-019c Resource Permission Functions
-- ========================================

-- Voice Session Permissions
CREATE OR REPLACE FUNCTION can_view_voice_session(
    p_user_id UUID,
    p_session_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- User can view if:
    -- 1. They are a member of the session's org
    -- 2. They created the session OR are assigned to it
    RETURN EXISTS (
        SELECT 1 FROM public.voice_sessions vs
        INNER JOIN public.org_members om ON vs.org_id = om.org_id
        WHERE vs.id = p_session_id
        AND om.user_id = p_user_id
        AND (vs.created_by = p_user_id OR vs.assigned_to = p_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_edit_voice_session(
    p_user_id UUID,
    p_session_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- User can edit if they created the session
    RETURN EXISTS (
        SELECT 1 FROM public.voice_sessions
        WHERE id = p_session_id
        AND created_by = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_delete_voice_session(
    p_user_id UUID,
    p_session_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- User can delete if they created the session
    RETURN EXISTS (
        SELECT 1 FROM public.voice_sessions
        WHERE id = p_session_id
        AND created_by = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Voice Config Permissions
CREATE OR REPLACE FUNCTION can_view_voice_config(
    p_user_id UUID,
    p_config_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- User can view if they are a member of the config's org
    RETURN EXISTS (
        SELECT 1 FROM public.voice_configs vc
        INNER JOIN public.org_members om ON vc.org_id = om.org_id
        WHERE vc.id = p_config_id
        AND om.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_edit_voice_config(
    p_user_id UUID,
    p_config_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- User can edit if they are org admin or created the config
    RETURN EXISTS (
        SELECT 1 FROM public.voice_configs vc
        INNER JOIN public.org_members om ON vc.org_id = om.org_id
        WHERE vc.id = p_config_id
        AND om.user_id = p_user_id
        AND (om.role IN ('admin', 'owner') OR vc.created_by = p_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Voice Transcript Permissions
CREATE OR REPLACE FUNCTION can_view_voice_transcript(
    p_user_id UUID,
    p_transcript_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- User can view if they are a member of the transcript's org
    -- and have access to the associated session
    RETURN EXISTS (
        SELECT 1 FROM public.voice_transcripts vt
        INNER JOIN public.org_members om ON vt.org_id = om.org_id
        LEFT JOIN public.voice_sessions vs ON vt.session_id = vs.id
        WHERE vt.id = p_transcript_id
        AND om.user_id = p_user_id
        AND (vs.created_by = p_user_id OR vs.assigned_to = p_user_id OR vs.id IS NULL)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Voice Analytics Permissions
CREATE OR REPLACE FUNCTION can_view_voice_analytics(
    p_user_id UUID,
    p_session_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- User can view analytics if they can view the session
    RETURN can_view_voice_session(p_user_id, p_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION can_view_voice_session(UUID, UUID) IS 'ADR-019c: Check if user can view voice session';
COMMENT ON FUNCTION can_edit_voice_session(UUID, UUID) IS 'ADR-019c: Check if user can edit voice session';
COMMENT ON FUNCTION can_delete_voice_session(UUID, UUID) IS 'ADR-019c: Check if user can delete voice session';
COMMENT ON FUNCTION can_view_voice_config(UUID, UUID) IS 'ADR-019c: Check if user can view voice config';
COMMENT ON FUNCTION can_edit_voice_config(UUID, UUID) IS 'ADR-019c: Check if user can edit voice config';
COMMENT ON FUNCTION can_view_voice_transcript(UUID, UUID) IS 'ADR-019c: Check if user can view voice transcript';
COMMENT ON FUNCTION can_view_voice_analytics(UUID, UUID) IS 'ADR-019c: Check if user can view voice analytics';