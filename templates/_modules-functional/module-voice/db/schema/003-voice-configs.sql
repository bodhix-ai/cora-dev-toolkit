-- ========================================
-- Voice Module - Configs Table
-- Created: January 16, 2026
-- ========================================

DROP TABLE IF EXISTS public.voice_configs CASCADE;

CREATE TABLE public.voice_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
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
    FOR SELECT USING (can_access_org_data(org_id));

CREATE POLICY "voice_configs_insert_policy" ON public.voice_configs
    FOR INSERT WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "voice_configs_update_policy" ON public.voice_configs
    FOR UPDATE USING (can_modify_org_data(org_id))
    WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "voice_configs_delete_policy" ON public.voice_configs
    FOR DELETE USING (can_modify_org_data(org_id));

-- Updated at trigger
CREATE TRIGGER update_voice_configs_updated_at
    BEFORE UPDATE ON public.voice_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.voice_configs IS 'Pipecat interview configurations per organization';
COMMENT ON COLUMN public.voice_configs.config_json IS 'Full Pipecat configuration JSON';
COMMENT ON COLUMN public.voice_configs.version IS 'Configuration version, incremented on update';
