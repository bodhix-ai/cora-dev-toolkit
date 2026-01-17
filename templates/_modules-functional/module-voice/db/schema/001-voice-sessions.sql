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
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
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
    
    -- Constraints
    CONSTRAINT voice_sessions_status_check CHECK (
        status IN ('pending', 'ready', 'active', 'completed', 'failed', 'cancelled')
    ),
    CONSTRAINT voice_sessions_duration_check CHECK (
        duration_seconds IS NULL OR duration_seconds >= 0
    )
);

-- Indexes
CREATE INDEX idx_voice_sessions_org_id ON public.voice_sessions(org_id);
CREATE INDEX idx_voice_sessions_workspace_id ON public.voice_sessions(workspace_id);
CREATE INDEX idx_voice_sessions_status ON public.voice_sessions(status);
CREATE INDEX idx_voice_sessions_created_at ON public.voice_sessions(created_at DESC);
CREATE INDEX idx_voice_sessions_config_id ON public.voice_sessions(config_id);
CREATE INDEX idx_voice_sessions_interview_type ON public.voice_sessions(interview_type);
-- Composite index for common query: sessions in workspace
CREATE INDEX idx_voice_sessions_ws_user ON public.voice_sessions(workspace_id, created_by) WHERE workspace_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "voice_sessions_select_policy" ON public.voice_sessions
    FOR SELECT USING (can_access_org_data(org_id));

CREATE POLICY "voice_sessions_insert_policy" ON public.voice_sessions
    FOR INSERT WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "voice_sessions_update_policy" ON public.voice_sessions
    FOR UPDATE USING (can_modify_org_data(org_id))
    WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "voice_sessions_delete_policy" ON public.voice_sessions
    FOR DELETE USING (can_modify_org_data(org_id));

-- Updated at trigger
CREATE TRIGGER update_voice_sessions_updated_at
    BEFORE UPDATE ON public.voice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.voice_sessions IS 'Voice interview sessions with Daily.co room details';
COMMENT ON COLUMN public.voice_sessions.org_id IS 'Organization ID for multi-tenancy';
COMMENT ON COLUMN public.voice_sessions.workspace_id IS 'Workspace (for workspace-scoped sessions, NULL for org-level sessions)';
COMMENT ON COLUMN public.voice_sessions.status IS 'Session lifecycle: pending, ready, active, completed, failed, cancelled';
COMMENT ON COLUMN public.voice_sessions.daily_room_token IS 'Daily.co participant token (expires after 24h)';
COMMENT ON COLUMN public.voice_sessions.ecs_task_arn IS 'ECS task ARN for Pipecat bot';
