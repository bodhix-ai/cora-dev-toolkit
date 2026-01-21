-- ========================================
-- Voice Module - Sessions Table
-- Created: January 16, 2026
-- ========================================

-- Drop if exists for idempotency
DROP TABLE IF EXISTS public.voice_sessions CASCADE;

-- Table: voice_sessions
CREATE TABLE public.voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    ws_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255),
    candidate_email VARCHAR(255),
    interview_type VARCHAR(100) NOT NULL,
    config_id UUID REFERENCES public.voice_configs(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    daily_room_url TEXT,
    daily_room_name VARCHAR(255),
    daily_room_token TEXT,
    ecs_task_arn TEXT,
    session_metadata JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Permission/Sharing Columns (added for owner+assignee+shares model)
    assigned_to UUID REFERENCES auth.users(id),
    is_shared_with_workspace BOOLEAN NOT NULL DEFAULT false,
    
    -- Constraints
    CONSTRAINT voice_sessions_status_check CHECK (
        status IN ('pending', 'ready', 'active', 'completed', 'failed', 'cancelled')
    ),
    CONSTRAINT voice_sessions_duration_check CHECK (
        duration_seconds IS NULL OR duration_seconds >= 0
    ),
    CONSTRAINT voice_sessions_participant_check CHECK (
        (candidate_email IS NOT NULL) OR (assigned_to IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_voice_sessions_org_id ON public.voice_sessions(org_id);
CREATE INDEX idx_voice_sessions_ws_id ON public.voice_sessions(ws_id);
CREATE INDEX idx_voice_sessions_status ON public.voice_sessions(status);
CREATE INDEX idx_voice_sessions_created_at ON public.voice_sessions(created_at DESC);
CREATE INDEX idx_voice_sessions_config_id ON public.voice_sessions(config_id);
CREATE INDEX idx_voice_sessions_interview_type ON public.voice_sessions(interview_type);
CREATE INDEX idx_voice_sessions_assigned_to ON public.voice_sessions(assigned_to) WHERE assigned_to IS NOT NULL;
-- Composite index for common query: sessions in workspace
CREATE INDEX idx_voice_sessions_ws_user ON public.voice_sessions(ws_id, created_by) WHERE ws_id IS NOT NULL;

-- Trigger function
CREATE OR REPLACE FUNCTION update_voice_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS voice_sessions_updated_at ON public.voice_sessions;
CREATE TRIGGER voice_sessions_updated_at 
    BEFORE UPDATE ON public.voice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_sessions_updated_at();

-- Comments
COMMENT ON TABLE public.voice_sessions IS 'Voice interview sessions with Daily.co room details';
COMMENT ON COLUMN public.voice_sessions.org_id IS 'Organization ID for multi-tenancy';
COMMENT ON COLUMN public.voice_sessions.ws_id IS 'Workspace (for workspace-scoped sessions, NULL for org-level sessions)';
COMMENT ON COLUMN public.voice_sessions.candidate_name IS 'External candidate name (for job interviews)';
COMMENT ON COLUMN public.voice_sessions.candidate_email IS 'External candidate email (for job interviews)';
COMMENT ON COLUMN public.voice_sessions.assigned_to IS 'Internal user assigned to participate (for career/content interviews)';
COMMENT ON COLUMN public.voice_sessions.is_shared_with_workspace IS 'Whether session is shared with all workspace members';
COMMENT ON COLUMN public.voice_sessions.status IS 'Session lifecycle: pending, ready, active, completed, failed, cancelled';
COMMENT ON COLUMN public.voice_sessions.daily_room_token IS 'Daily.co participant token (expires after 24h)';
COMMENT ON COLUMN public.voice_sessions.ecs_task_arn IS 'ECS task ARN for Pipecat bot';
