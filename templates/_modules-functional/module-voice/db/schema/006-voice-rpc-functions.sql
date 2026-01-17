-- ========================================
-- Voice Module - RPC Functions
-- Created: January 16, 2026
-- ========================================

-- Function: Get session with related data
CREATE OR REPLACE FUNCTION get_voice_session_details(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'session', row_to_json(s),
        'config', row_to_json(c),
        'transcript', row_to_json(t),
        'analytics', row_to_json(a)
    )
    INTO v_result
    FROM public.voice_sessions s
    LEFT JOIN public.voice_configs c ON s.config_id = c.id
    LEFT JOIN public.voice_transcripts t ON t.session_id = s.id
    LEFT JOIN public.voice_analytics a ON a.session_id = s.id
    WHERE s.id = p_session_id;
    
    RETURN v_result;
END;
$$;

-- Function: Get org voice statistics
CREATE OR REPLACE FUNCTION get_org_voice_stats(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_sessions', COUNT(*),
        'completed_sessions', COUNT(*) FILTER (WHERE status = 'completed'),
        'avg_duration_seconds', ROUND(AVG(duration_seconds) FILTER (WHERE status = 'completed')),
        'avg_score', ROUND(AVG(a.overall_score)::numeric, 1),
        'sessions_this_month', COUNT(*) FILTER (WHERE s.created_at >= date_trunc('month', NOW())),
        'sessions_this_week', COUNT(*) FILTER (WHERE s.created_at >= date_trunc('week', NOW()))
    )
    INTO v_result
    FROM public.voice_sessions s
    LEFT JOIN public.voice_analytics a ON a.session_id = s.id
    WHERE s.org_id = p_org_id;
    
    RETURN v_result;
END;
$$;

-- Function: Update session status with validation
CREATE OR REPLACE FUNCTION update_voice_session_status(
    p_session_id UUID,
    p_new_status VARCHAR(50),
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status VARCHAR(50);
    v_valid_transitions JSONB := '{
        "pending": ["ready", "failed", "cancelled"],
        "ready": ["active", "cancelled"],
        "active": ["completed", "failed", "cancelled"]
    }'::jsonb;
BEGIN
    -- Get current status
    SELECT status INTO v_current_status
    FROM public.voice_sessions
    WHERE id = p_session_id;
    
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;
    
    -- Check if transition is valid
    IF NOT (v_valid_transitions->v_current_status ? p_new_status) THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', v_current_status, p_new_status;
    END IF;
    
    -- Update status
    UPDATE public.voice_sessions
    SET 
        status = p_new_status,
        updated_by = p_user_id,
        updated_at = NOW(),
        started_at = CASE WHEN p_new_status = 'active' THEN NOW() ELSE started_at END,
        completed_at = CASE WHEN p_new_status IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END
    WHERE id = p_session_id;
    
    RETURN TRUE;
END;
$$;

-- Function: Calculate session duration
CREATE OR REPLACE FUNCTION calculate_voice_session_duration(p_session_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_duration INTEGER;
BEGIN
    SELECT EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER
    INTO v_duration
    FROM public.voice_sessions
    WHERE id = p_session_id
    AND started_at IS NOT NULL
    AND completed_at IS NOT NULL;
    
    -- Update the session with calculated duration
    IF v_duration IS NOT NULL THEN
        UPDATE public.voice_sessions
        SET duration_seconds = v_duration
        WHERE id = p_session_id;
    END IF;
    
    RETURN COALESCE(v_duration, 0);
END;
$$;

-- Function: Get active sessions count for org
CREATE OR REPLACE FUNCTION get_org_active_voice_sessions(p_org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM public.voice_sessions
    WHERE org_id = p_org_id
    AND status IN ('pending', 'ready', 'active');
    
    RETURN v_count;
END;
$$;

-- Comments
COMMENT ON FUNCTION get_voice_session_details(UUID) IS 'Get session with related config, transcript, and analytics';
COMMENT ON FUNCTION get_org_voice_stats(UUID) IS 'Get aggregated voice interview statistics for an organization';
COMMENT ON FUNCTION update_voice_session_status(UUID, VARCHAR, UUID) IS 'Update session status with transition validation';
COMMENT ON FUNCTION calculate_voice_session_duration(UUID) IS 'Calculate and store session duration from timestamps';
COMMENT ON FUNCTION get_org_active_voice_sessions(UUID) IS 'Get count of active sessions for an organization';
