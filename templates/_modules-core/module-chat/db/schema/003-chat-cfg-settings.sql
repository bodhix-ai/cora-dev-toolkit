-- =============================================
-- MODULE-CHAT: Configuration Tables
-- =============================================
-- Purpose: Platform and organization-level chat settings
-- Source: Created for CORA toolkit admin standardization (Sprint 3b)

-- =============================================
-- CHAT_CFG_SYS_SETTINGS TABLE
-- =============================================
-- Platform-wide chat configuration

CREATE TABLE IF NOT EXISTS public.chat_cfg_sys_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    
    -- Chat defaults
    default_title_format VARCHAR(255) NOT NULL DEFAULT 'Chat {timestamp}',
    message_retention_days INTEGER NOT NULL DEFAULT 365,
    session_timeout_minutes INTEGER NOT NULL DEFAULT 60,
    max_message_length INTEGER NOT NULL DEFAULT 10000,
    max_kb_groundings INTEGER NOT NULL DEFAULT 5,
    
    -- AI defaults
    default_ai_provider VARCHAR(50),
    default_ai_model VARCHAR(100),
    
    -- Advanced config (JSONB)
    streaming_config JSONB NOT NULL DEFAULT jsonb_build_object(
        'enabled', true,
        'buffer_size', 1024,
        'timeout_seconds', 300
    ),
    citation_display_config JSONB NOT NULL DEFAULT jsonb_build_object(
        'enabled', true,
        'show_source_preview', true,
        'max_citations_per_response', 10
    ),
    
    -- Audit columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT chat_cfg_sys_settings_key_check CHECK (char_length(config_key) >= 1),
    CONSTRAINT chat_cfg_sys_settings_retention_check CHECK (message_retention_days >= 1 AND message_retention_days <= 3650),
    CONSTRAINT chat_cfg_sys_settings_timeout_check CHECK (session_timeout_minutes >= 1 AND session_timeout_minutes <= 1440),
    CONSTRAINT chat_cfg_sys_settings_msg_length_check CHECK (max_message_length >= 100 AND max_message_length <= 100000),
    CONSTRAINT chat_cfg_sys_settings_kb_check CHECK (max_kb_groundings >= 1 AND max_kb_groundings <= 20)
);

-- =============================================
-- CHAT_CFG_ORG_SETTINGS TABLE
-- =============================================
-- Organization-specific chat configuration overrides

CREATE TABLE IF NOT EXISTS public.chat_cfg_org_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID UNIQUE NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    
    -- Overrides (NULL = use platform default)
    message_retention_days INTEGER,
    max_message_length INTEGER,
    max_kb_groundings INTEGER,
    default_ai_provider VARCHAR(50),
    default_ai_model VARCHAR(100),
    
    -- Org-specific policies
    sharing_policy JSONB NOT NULL DEFAULT jsonb_build_object(
        'allow_public_sharing', false,
        'allow_workspace_sharing', true,
        'require_approval', false
    ),
    
    -- Audit columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT chat_cfg_org_settings_retention_check CHECK (message_retention_days IS NULL OR (message_retention_days >= 1 AND message_retention_days <= 3650)),
    CONSTRAINT chat_cfg_org_settings_msg_length_check CHECK (max_message_length IS NULL OR (max_message_length >= 100 AND max_message_length <= 100000)),
    CONSTRAINT chat_cfg_org_settings_kb_check CHECK (max_kb_groundings IS NULL OR (max_kb_groundings >= 1 AND max_kb_groundings <= 20))
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_chat_cfg_sys_settings_key ON public.chat_cfg_sys_settings(config_key);
CREATE INDEX IF NOT EXISTS idx_chat_cfg_org_settings_org_id ON public.chat_cfg_org_settings(org_id);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.chat_cfg_sys_settings IS 'Platform-wide chat configuration settings';
COMMENT ON COLUMN public.chat_cfg_sys_settings.config_key IS 'Unique configuration key (usually "default")';
COMMENT ON COLUMN public.chat_cfg_sys_settings.default_title_format IS 'Format for auto-generated chat titles';
COMMENT ON COLUMN public.chat_cfg_sys_settings.message_retention_days IS 'Days to retain messages before archival';
COMMENT ON COLUMN public.chat_cfg_sys_settings.session_timeout_minutes IS 'Minutes of inactivity before session timeout';
COMMENT ON COLUMN public.chat_cfg_sys_settings.max_message_length IS 'Maximum characters per message';
COMMENT ON COLUMN public.chat_cfg_sys_settings.max_kb_groundings IS 'Maximum KB bases per chat';
COMMENT ON COLUMN public.chat_cfg_sys_settings.streaming_config IS 'Streaming response configuration (buffer size, timeout)';
COMMENT ON COLUMN public.chat_cfg_sys_settings.citation_display_config IS 'Citation display settings';

COMMENT ON TABLE public.chat_cfg_org_settings IS 'Organization-specific chat configuration overrides';
COMMENT ON COLUMN public.chat_cfg_org_settings.org_id IS 'Organization ID (unique per org)';
COMMENT ON COLUMN public.chat_cfg_org_settings.message_retention_days IS 'Override platform retention (NULL = use default)';
COMMENT ON COLUMN public.chat_cfg_org_settings.max_message_length IS 'Override platform max message length (NULL = use default)';
COMMENT ON COLUMN public.chat_cfg_org_settings.max_kb_groundings IS 'Override platform max KB groundings (NULL = use default)';
COMMENT ON COLUMN public.chat_cfg_org_settings.sharing_policy IS 'Organization sharing policies';

-- =============================================
-- NOTE: Row Level Security (RLS) Policies
-- =============================================
-- RLS policies for these tables are defined in 007-chat-rls.sql
-- This ensures all tables exist before applying security constraints

-- =============================================
-- TRIGGERS: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_chat_cfg_sys_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_chat_cfg_org_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_cfg_sys_settings_updated_at ON public.chat_cfg_sys_settings;
CREATE TRIGGER chat_cfg_sys_settings_updated_at BEFORE UPDATE ON public.chat_cfg_sys_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_cfg_sys_settings_updated_at();

DROP TRIGGER IF EXISTS chat_cfg_org_settings_updated_at ON public.chat_cfg_org_settings;
CREATE TRIGGER chat_cfg_org_settings_updated_at BEFORE UPDATE ON public.chat_cfg_org_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_cfg_org_settings_updated_at();

-- =============================================
-- SEED DATA
-- =============================================
-- Insert default platform configuration

INSERT INTO public.chat_cfg_sys_settings (config_key, default_title_format, message_retention_days, session_timeout_minutes, max_message_length, max_kb_groundings)
VALUES ('default', 'Chat {timestamp}', 365, 60, 10000, 5)
ON CONFLICT (config_key) DO NOTHING;
