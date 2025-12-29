-- =============================================================================
-- MODULE-ACCESS: Auth Events & Session Tracking
-- =============================================================================
-- Purpose: Track authentication events and user session activity
-- Features:
--   1. Login/logout event logging (success and failures)
--   2. User session duration tracking
--   3. Failed login audit trail
--   4. Active session monitoring
-- Created: December 20, 2025
-- Updated: December 20, 2025 - Renamed auth_event_log → user_auth_log

-- -----------------------------------------------------------------------------
-- TABLE: user_auth_log
-- Tracks all authentication-related events for audit and security monitoring
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_auth_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event details
    event_type VARCHAR(50) NOT NULL,  -- 'login_success', 'login_failed', 'logout', 'session_expired', 'provisioning_denied', 'bootstrap_created'
    
    -- User identification
    user_email TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
    
    -- Request context
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Failure/error information
    failure_reason TEXT,  -- For failed logins, provisioning denials, etc.
    
    -- Additional context (flexible JSONB for provider-specific data)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamp
    occurred_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_event_type CHECK (
        event_type IN (
            'login_success',
            'login_failed',
            'logout',
            'session_expired',
            'provisioning_denied',
            'provisioning_invited',
            'provisioning_domain',
            'bootstrap_created',
            'token_refresh',
            'password_reset'
        )
    )
);

-- -----------------------------------------------------------------------------
-- TABLE: user_sessions
-- Tracks user session duration and activity for usage analytics
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session identification
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
    
    -- Session lifecycle
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ended_at TIMESTAMPTZ,
    
    -- Computed session duration (auto-calculated)
    session_duration_seconds INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (COALESCE(ended_at, last_activity_at) - started_at))::INTEGER
    ) STORED,
    
    -- Request context
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Session metadata (device, browser, etc.)
    metadata JSONB DEFAULT '{}'::jsonb
);

-- -----------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- -----------------------------------------------------------------------------

-- Auth event log indexes
CREATE INDEX IF NOT EXISTS idx_user_auth_log_user_id ON public.user_auth_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_auth_log_email ON public.user_auth_log(user_email);
CREATE INDEX IF NOT EXISTS idx_user_auth_log_type ON public.user_auth_log(event_type);
CREATE INDEX IF NOT EXISTS idx_user_auth_log_occurred_at ON public.user_auth_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_auth_log_org_id ON public.user_auth_log(org_id);

-- Failed login tracking (for security monitoring)
CREATE INDEX IF NOT EXISTS idx_user_auth_log_failures ON public.user_auth_log(event_type, user_email, occurred_at)
    WHERE event_type IN ('login_failed', 'provisioning_denied');

-- User session indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_org_id ON public.user_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON public.user_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(user_id, last_activity_at)
    WHERE ended_at IS NULL;

-- -----------------------------------------------------------------------------
-- TRIGGER: Auto-update last_activity_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_sessions_activity_trigger ON public.user_sessions;
DROP TRIGGER IF EXISTS user_sessions_activity_trigger ON public.user_sessions;
CREATE TRIGGER user_sessions_activity_trigger BEFORE UPDATE ON public.user_sessions
    FOR EACH ROW
    WHEN (OLD.ended_at IS NULL AND NEW.ended_at IS NULL)
    EXECUTE FUNCTION update_session_activity();

-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Function: log_auth_event
-- Convenience function for logging auth events from Lambda functions
CREATE OR REPLACE FUNCTION log_auth_event(
    p_event_type VARCHAR(50),
    p_user_email TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_org_id UUID DEFAULT NULL,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_failure_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO public.user_auth_log (
        event_type,
        user_email,
        user_id,
        org_id,
        ip_address,
        user_agent,
        failure_reason,
        metadata
    ) VALUES (
        p_event_type,
        p_user_email,
        p_user_id,
        p_org_id,
        p_ip_address,
        p_user_agent,
        p_failure_reason,
        p_metadata
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: start_user_session
-- Create a new session record
CREATE OR REPLACE FUNCTION start_user_session(
    p_user_id UUID,
    p_org_id UUID DEFAULT NULL,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    INSERT INTO public.user_sessions (
        user_id,
        org_id,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        p_user_id,
        p_org_id,
        p_ip_address,
        p_user_agent,
        p_metadata
    )
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: end_user_session
-- Mark a session as ended
CREATE OR REPLACE FUNCTION end_user_session(p_session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.user_sessions
    SET ended_at = NOW()
    WHERE id = p_session_id
      AND ended_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: get_active_sessions
-- Get currently active sessions for a user
CREATE OR REPLACE FUNCTION get_active_sessions(p_user_id UUID)
RETURNS TABLE (
    session_id UUID,
    org_id UUID,
    started_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    duration_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id AS session_id,
        user_sessions.org_id,
        user_sessions.started_at,
        user_sessions.last_activity_at,
        (session_duration_seconds / 60)::INTEGER AS duration_minutes
    FROM public.user_sessions
    WHERE user_id = p_user_id
      AND ended_at IS NULL
    ORDER BY started_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_auth_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- RLS: user_auth_log
-- -----------------------------------------------------------------------------

-- Drop existing policies if they exist (makes this script idempotent)
DROP POLICY IF EXISTS user_auth_log_select_admin ON public.user_auth_log;
DROP POLICY IF EXISTS user_auth_log_select_own ON public.user_auth_log;

-- Platform admins can view all auth events
CREATE POLICY user_auth_log_select_admin ON public.user_auth_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles p
            WHERE p.user_id = auth.uid()
            AND p.global_role IN ('platform_owner', 'platform_admin', 'super_admin', 'global_admin', 'global_owner')
        )
    );

-- Users can view their own auth events
CREATE POLICY user_auth_log_select_own ON public.user_auth_log
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Note: Service role bypasses RLS automatically, no policy needed

-- -----------------------------------------------------------------------------
-- RLS: user_sessions
-- -----------------------------------------------------------------------------

-- Drop existing policies if they exist (makes this script idempotent)
DROP POLICY IF EXISTS user_sessions_select_admin ON public.user_sessions;
DROP POLICY IF EXISTS user_sessions_select_own ON public.user_sessions;

-- Platform admins can view all sessions
CREATE POLICY user_sessions_select_admin ON public.user_sessions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles p
            WHERE p.user_id = auth.uid()
            AND p.global_role IN ('platform_owner', 'platform_admin', 'super_admin', 'global_admin', 'global_owner')
        )
    );

-- Users can view their own sessions
CREATE POLICY user_sessions_select_own ON public.user_sessions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Note: Service role bypasses RLS automatically, no policy needed

-- -----------------------------------------------------------------------------
-- COMMENTS
-- -----------------------------------------------------------------------------
COMMENT ON TABLE public.user_auth_log IS 'Audit log for all authentication and authorization events';
COMMENT ON COLUMN public.user_auth_log.event_type IS 'Type of auth event (login_success, login_failed, logout, etc.)';
COMMENT ON COLUMN public.user_auth_log.failure_reason IS 'Reason for login failure or provisioning denial';
COMMENT ON COLUMN public.user_auth_log.metadata IS 'Additional event context (provider-specific data, etc.)';

COMMENT ON TABLE public.user_sessions IS 'User session tracking for activity monitoring and analytics';
COMMENT ON COLUMN public.user_sessions.session_duration_seconds IS 'Auto-calculated session duration from started_at to ended_at (or last_activity_at)';
COMMENT ON COLUMN public.user_sessions.last_activity_at IS 'Last recorded user activity (updated via heartbeat or activity beacon)';

-- -----------------------------------------------------------------------------
-- EXAMPLE QUERIES
-- -----------------------------------------------------------------------------
/*
-- Get failed login attempts in last 24 hours
SELECT user_email, COUNT(*) as attempts, MAX(occurred_at) as last_attempt
FROM user_auth_log
WHERE event_type = 'login_failed'
  AND occurred_at > NOW() - INTERVAL '24 hours'
GROUP BY user_email
ORDER BY attempts DESC;

-- Get average session duration by org
SELECT o.name, AVG(us.session_duration_seconds / 60)::INTEGER as avg_minutes
FROM user_sessions us
JOIN orgs o ON o.id = us.org_id
WHERE us.ended_at IS NOT NULL
GROUP BY o.name
ORDER BY avg_minutes DESC;

-- Get currently active users
SELECT p.email, p.full_name, us.started_at, us.last_activity_at
FROM user_sessions us
JOIN user_profiles p ON p.user_id = us.user_id
WHERE us.ended_at IS NULL
  AND us.last_activity_at > NOW() - INTERVAL '30 minutes'
ORDER BY us.last_activity_at DESC;
*/
