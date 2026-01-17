# Voice Module - Database Schema

**Module Name:** module-voice  
**Version:** 1.0  
**Status:** Draft  
**Created:** January 16, 2026

**Parent Specification:** [MODULE-VOICE-TECHNICAL-SPEC.md](../MODULE-VOICE-TECHNICAL-SPEC.md)

---

## Table of Contents

1. [Migration Overview](#1-migration-overview)
2. [Migration: 001_voice_sessions.sql](#2-migration-001_voice_sessionssql)
3. [Migration: 002_voice_transcripts.sql](#3-migration-002_voice_transcriptssql)
4. [Migration: 003_voice_configs.sql](#4-migration-003_voice_configssql)
5. [Migration: 004_voice_credentials.sql](#5-migration-004_voice_credentialssql)
6. [Migration: 005_voice_analytics.sql](#6-migration-005_voice_analyticssql)
7. [Migration: 006_voice_session_kb.sql](#7-migration-006_voice_session_kbsql)
8. [Migration: 007_voice_rpc_functions.sql](#8-migration-007_voice_rpc_functionssql)

---

## 1. Migration Overview

| Migration | Table | Purpose |
|-----------|-------|---------|
| 001_voice_sessions.sql | voice_sessions | Interview sessions with Daily.co rooms |
| 002_voice_transcripts.sql | voice_transcripts | Interview transcripts with S3 archival |
| 003_voice_configs.sql | voice_configs | Pipecat interview configurations |
| 004_voice_credentials.sql | voice_credentials | Voice service API credentials |
| 005_voice_analytics.sql | voice_analytics | AI-generated interview analysis |
| 006_voice_session_kb.sql | voice_session_kb | KB grounding associations |
| 007_voice_rpc_functions.sql | (functions) | Helper RPC functions |

---

## 2. Migration: `001_voice_sessions.sql`

```sql
-- ========================================
-- Voice Module - Sessions Table
-- Migration: 001_voice_sessions.sql
-- Created: January 16, 2026
-- ========================================

-- Drop if exists for idempotency
DROP TABLE IF EXISTS public.voice_sessions CASCADE;

-- Table: voice_sessions
CREATE TABLE public.voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
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
CREATE INDEX idx_voice_sessions_workspace_id ON public.voice_sessions(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_voice_sessions_status ON public.voice_sessions(status);
CREATE INDEX idx_voice_sessions_created_at ON public.voice_sessions(created_at DESC);
CREATE INDEX idx_voice_sessions_config_id ON public.voice_sessions(config_id);
CREATE INDEX idx_voice_sessions_interview_type ON public.voice_sessions(interview_type);

-- Enable RLS
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "voice_sessions_select_policy" ON public.voice_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_sessions.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_sessions_insert_policy" ON public.voice_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_sessions.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_sessions_update_policy" ON public.voice_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_sessions.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_sessions_delete_policy" ON public.voice_sessions
    FOR DELETE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_sessions.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
            AND org_members.active = true
        )
    );

-- Updated at trigger
CREATE TRIGGER update_voice_sessions_updated_at
    BEFORE UPDATE ON public.voice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.voice_sessions IS 'Voice interview sessions with Daily.co room details';
COMMENT ON COLUMN public.voice_sessions.org_id IS 'Organization ID for multi-tenancy';
COMMENT ON COLUMN public.voice_sessions.workspace_id IS 'Optional workspace association for scoping';
COMMENT ON COLUMN public.voice_sessions.status IS 'Session lifecycle: pending, ready, active, completed, failed, cancelled';
COMMENT ON COLUMN public.voice_sessions.daily_room_token IS 'Daily.co participant token (expires after 24h)';
```

---

## 3. Migration: `002_voice_transcripts.sql`

```sql
-- ========================================
-- Voice Module - Transcripts Table
-- Migration: 002_voice_transcripts.sql
-- Created: January 16, 2026
-- ========================================

DROP TABLE IF EXISTS public.voice_transcripts CASCADE;

CREATE TABLE public.voice_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    transcript_text TEXT,
    transcript_s3_url TEXT,
    candidate_name VARCHAR(255),
    interview_type VARCHAR(100),
    summary TEXT,
    word_count INTEGER,
    speaker_segments JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_voice_transcripts_org_id ON public.voice_transcripts(org_id);
CREATE INDEX idx_voice_transcripts_session_id ON public.voice_transcripts(session_id);
CREATE INDEX idx_voice_transcripts_created_at ON public.voice_transcripts(created_at DESC);

-- Enable RLS
ALTER TABLE public.voice_transcripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "voice_transcripts_select_policy" ON public.voice_transcripts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_transcripts.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_transcripts_insert_policy" ON public.voice_transcripts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_transcripts.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_transcripts_update_policy" ON public.voice_transcripts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_transcripts.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_transcripts_delete_policy" ON public.voice_transcripts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_transcripts.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
            AND org_members.active = true
        )
    );

-- Updated at trigger
CREATE TRIGGER update_voice_transcripts_updated_at
    BEFORE UPDATE ON public.voice_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.voice_transcripts IS 'Interview transcripts with S3 archival';
COMMENT ON COLUMN public.voice_transcripts.speaker_segments IS 'JSON array of speaker segments with timestamps';
```

---

## 4. Migration: `003_voice_configs.sql`

```sql
-- ========================================
-- Voice Module - Configs Table
-- Migration: 003_voice_configs.sql
-- Created: January 16, 2026
-- ========================================

DROP TABLE IF EXISTS public.voice_configs CASCADE;

CREATE TABLE public.voice_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    interview_type VARCHAR(100) NOT NULL,
    description TEXT,
    config_json JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Unique name per org
    CONSTRAINT voice_configs_name_org_unique UNIQUE (org_id, name)
);

-- Indexes
CREATE INDEX idx_voice_configs_org_id ON public.voice_configs(org_id);
CREATE INDEX idx_voice_configs_is_active ON public.voice_configs(is_active);
CREATE INDEX idx_voice_configs_interview_type ON public.voice_configs(interview_type);

-- Enable RLS
ALTER TABLE public.voice_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "voice_configs_select_policy" ON public.voice_configs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_configs.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_configs_insert_policy" ON public.voice_configs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_configs.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_configs_update_policy" ON public.voice_configs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_configs.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_configs_delete_policy" ON public.voice_configs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_configs.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
            AND org_members.active = true
        )
    );

-- Updated at trigger
CREATE TRIGGER update_voice_configs_updated_at
    BEFORE UPDATE ON public.voice_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.voice_configs IS 'Pipecat interview configurations per organization';
COMMENT ON COLUMN public.voice_configs.config_json IS 'Full Pipecat configuration JSON';
```

---

## 5. Migration: `004_voice_credentials.sql`

```sql
-- ========================================
-- Voice Module - Credentials Table
-- Migration: 004_voice_credentials.sql
-- Created: January 16, 2026
-- ========================================

DROP TABLE IF EXISTS public.voice_credentials CASCADE;

CREATE TABLE public.voice_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    service_name VARCHAR(50) NOT NULL,
    credentials_secret_arn TEXT NOT NULL,
    config_metadata JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- One credential per service per org
    CONSTRAINT voice_credentials_service_org_unique UNIQUE (org_id, service_name),
    CONSTRAINT voice_credentials_service_check CHECK (
        service_name IN ('daily', 'deepgram', 'cartesia')
    )
);

-- Indexes
CREATE INDEX idx_voice_credentials_org_id ON public.voice_credentials(org_id);
CREATE INDEX idx_voice_credentials_service ON public.voice_credentials(service_name);
CREATE INDEX idx_voice_credentials_is_active ON public.voice_credentials(is_active);

-- Enable RLS
ALTER TABLE public.voice_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin-only access)
CREATE POLICY "voice_credentials_select_policy" ON public.voice_credentials
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_credentials.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_credentials_insert_policy" ON public.voice_credentials
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_credentials.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_credentials_update_policy" ON public.voice_credentials
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_credentials.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_credentials_delete_policy" ON public.voice_credentials
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_credentials.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
            AND org_members.active = true
        )
    );

-- Updated at trigger
CREATE TRIGGER update_voice_credentials_updated_at
    BEFORE UPDATE ON public.voice_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.voice_credentials IS 'Voice service credentials (Daily, Deepgram, Cartesia)';
COMMENT ON COLUMN public.voice_credentials.credentials_secret_arn IS 'AWS Secrets Manager ARN for actual credentials';
```

---

## 6. Migration: `005_voice_analytics.sql`

```sql
-- ========================================
-- Voice Module - Analytics Table
-- Migration: 005_voice_analytics.sql
-- Created: January 16, 2026
-- ========================================

DROP TABLE IF EXISTS public.voice_analytics CASCADE;

CREATE TABLE public.voice_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    transcript_id UUID REFERENCES public.voice_transcripts(id) ON DELETE SET NULL,
    overall_score NUMERIC(5,2),
    category_scores JSONB NOT NULL DEFAULT '{}',
    strengths TEXT[] NOT NULL DEFAULT '{}',
    weaknesses TEXT[] NOT NULL DEFAULT '{}',
    recommendations TEXT[] NOT NULL DEFAULT '{}',
    key_moments JSONB NOT NULL DEFAULT '[]',
    detailed_analysis JSONB NOT NULL DEFAULT '{}',
    model_used VARCHAR(100),
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- One analytics per session
    CONSTRAINT voice_analytics_session_unique UNIQUE (session_id),
    CONSTRAINT voice_analytics_score_check CHECK (
        overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)
    )
);

-- Indexes
CREATE INDEX idx_voice_analytics_org_id ON public.voice_analytics(org_id);
CREATE INDEX idx_voice_analytics_session_id ON public.voice_analytics(session_id);
CREATE INDEX idx_voice_analytics_transcript_id ON public.voice_analytics(transcript_id);
CREATE INDEX idx_voice_analytics_overall_score ON public.voice_analytics(overall_score DESC);

-- Enable RLS
ALTER TABLE public.voice_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "voice_analytics_select_policy" ON public.voice_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_analytics.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_analytics_insert_policy" ON public.voice_analytics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_analytics.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_analytics_update_policy" ON public.voice_analytics
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_analytics.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.active = true
        )
    );

CREATE POLICY "voice_analytics_delete_policy" ON public.voice_analytics
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.org_id = voice_analytics.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
            AND org_members.active = true
        )
    );

-- Updated at trigger
CREATE TRIGGER update_voice_analytics_updated_at
    BEFORE UPDATE ON public.voice_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.voice_analytics IS 'AI-generated interview analysis and scoring';
COMMENT ON COLUMN public.voice_analytics.category_scores IS 'JSON object with scores per evaluation category';
```

---

## 7. Migration: `006_voice_session_kb.sql`

```sql
-- ========================================
-- Voice Module - Session KB Junction Table
-- Migration: 006_voice_session_kb.sql
-- Created: January 16, 2026
-- ========================================

DROP TABLE IF EXISTS public.voice_session_kb CASCADE;

CREATE TABLE public.voice_session_kb (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    kb_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    added_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Unique constraint on session-kb pair
    CONSTRAINT voice_session_kb_unique UNIQUE (session_id, kb_id)
);

-- Indexes
CREATE INDEX idx_voice_session_kb_session_id ON public.voice_session_kb(session_id);
CREATE INDEX idx_voice_session_kb_kb_id ON public.voice_session_kb(kb_id);
CREATE INDEX idx_voice_session_kb_enabled ON public.voice_session_kb(session_id, is_enabled) 
    WHERE is_enabled = true;

-- Enable RLS
ALTER TABLE public.voice_session_kb ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from session access)
CREATE POLICY "voice_session_kb_select_policy" ON public.voice_session_kb
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.voice_sessions vs
            JOIN public.org_members om ON om.org_id = vs.org_id
            WHERE vs.id = voice_session_kb.session_id
            AND om.user_id = auth.uid()
            AND om.active = true
        )
    );

CREATE POLICY "voice_session_kb_insert_policy" ON public.voice_session_kb
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.voice_sessions vs
            JOIN public.org_members om ON om.org_id = vs.org_id
            WHERE vs.id = voice_session_kb.session_id
            AND om.user_id = auth.uid()
            AND om.active = true
        )
    );

CREATE POLICY "voice_session_kb_update_policy" ON public.voice_session_kb
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.voice_sessions vs
            JOIN public.org_members om ON om.org_id = vs.org_id
            WHERE vs.id = voice_session_kb.session_id
            AND om.user_id = auth.uid()
            AND om.active = true
        )
    );

CREATE POLICY "voice_session_kb_delete_policy" ON public.voice_session_kb
    FOR DELETE USING (
        added_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.voice_sessions vs
            JOIN public.org_members om ON om.org_id = vs.org_id
            WHERE vs.id = voice_session_kb.session_id
            AND om.user_id = auth.uid()
            AND om.org_role IN ('org_owner', 'org_admin')
            AND om.active = true
        )
    );

-- Comments
COMMENT ON TABLE public.voice_session_kb IS 'Junction table linking voice sessions to knowledge bases for AI grounding';
COMMENT ON COLUMN public.voice_session_kb.is_enabled IS 'User can toggle KB on/off per session';
```

---

## 8. Migration: `007_voice_rpc_functions.sql`

```sql
-- ========================================
-- Voice Module - RPC Functions
-- Migration: 007_voice_rpc_functions.sql
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
        'analytics', row_to_json(a),
        'kbs', COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'id', kb.id,
                'name', kb.name,
                'isEnabled', sk.is_enabled
            ))
            FROM public.voice_session_kb sk
            JOIN public.kb_bases kb ON kb.id = sk.kb_id
            WHERE sk.session_id = s.id),
            '[]'::jsonb
        )
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
        'active_sessions', COUNT(*) FILTER (WHERE status = 'active'),
        'avg_duration_seconds', ROUND(AVG(duration_seconds) FILTER (WHERE status = 'completed')),
        'avg_score', ROUND(AVG(a.overall_score)::numeric, 1),
        'sessions_this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())),
        'sessions_this_week', COUNT(*) FILTER (WHERE created_at >= date_trunc('week', NOW()))
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

-- Function: Get enabled KBs for a session (for AI grounding)
CREATE OR REPLACE FUNCTION get_voice_session_kbs(p_session_id UUID)
RETURNS TABLE (
    kb_id UUID,
    kb_name VARCHAR(255),
    kb_scope VARCHAR(50)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT kb.id, kb.name, kb.scope
    FROM public.voice_session_kb sk
    JOIN public.kb_bases kb ON kb.id = sk.kb_id
    WHERE sk.session_id = p_session_id
    AND sk.is_enabled = true
    AND kb.is_enabled = true
    AND kb.is_deleted = false;
END;
$$;

-- Comments
COMMENT ON FUNCTION get_voice_session_details IS 'Get full session details including config, transcript, analytics, and KBs';
COMMENT ON FUNCTION get_org_voice_stats IS 'Get organization-level voice interview statistics';
COMMENT ON FUNCTION update_voice_session_status IS 'Update session status with state machine validation';
COMMENT ON FUNCTION get_voice_session_kbs IS 'Get enabled knowledge bases for AI grounding in a session';
```

---

**Document Version:** 1.0  
**Last Updated:** January 16, 2026
