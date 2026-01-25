-- ============================================================================
-- CORA Module Registry - Database Schema
-- Schema: 002-mgmt-cfg-sys-modules.sql
-- Purpose: Create the mgmt_cfg_sys_modules table for runtime module control
-- Updated: Jan 2026 - Renamed from sys_module_registry to mgmt_cfg_sys_modules (DB naming compliance)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: mgmt_cfg_sys_modules
-- Purpose: Track all registered modules and their configuration/status
-- ============================================================================

CREATE TABLE IF NOT EXISTS mgmt_cfg_sys_modules (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Module Identification
    module_name VARCHAR(100) NOT NULL UNIQUE,           -- e.g., 'module-access', 'module-kb'
    display_name VARCHAR(200) NOT NULL,                  -- e.g., 'Access Control', 'Knowledge Base'
    description TEXT,                                    -- Human-readable description
    
    -- Module Classification
    module_type VARCHAR(20) NOT NULL DEFAULT 'functional' 
        CHECK (module_type IN ('core', 'functional')),   -- Core vs functional module
    tier INTEGER NOT NULL DEFAULT 1 
        CHECK (tier BETWEEN 1 AND 3),                    -- Dependency tier (1=no deps, 2=T1 deps, 3=T1+T2 deps)
    
    -- Module Status
    is_enabled BOOLEAN NOT NULL DEFAULT true,            -- Whether module is currently enabled
    is_installed BOOLEAN NOT NULL DEFAULT true,          -- Whether module code is deployed
    
    -- Version Information
    version VARCHAR(50),                                 -- Current installed version
    min_compatible_version VARCHAR(50),                  -- Minimum compatible version
    
    -- Configuration
    config JSONB DEFAULT '{}'::jsonb,                    -- Module-specific configuration
    feature_flags JSONB DEFAULT '{}'::jsonb,             -- Feature toggles within module
    
    -- Dependencies
    dependencies JSONB DEFAULT '[]'::jsonb,              -- Array of module names this depends on
    
    -- Navigation Integration
    nav_config JSONB DEFAULT '{}'::jsonb,                -- Navigation configuration
    -- Example: {"route": "/kb", "icon": "BookOpen", "label": "Knowledge Base", "order": 10}
    
    -- Access Control
    required_permissions JSONB DEFAULT '[]'::jsonb,      -- Permissions needed to access module
    -- Example: ["kb:read", "kb:write"]
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,                                     -- User who registered the module
    updated_by UUID,                                     -- User who last updated the module
    
    -- Soft Delete
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT module_name_format CHECK (module_name ~ '^module-[a-z]+$')
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for quick module lookups by name
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_sys_modules_name 
    ON mgmt_cfg_sys_modules(module_name) 
    WHERE deleted_at IS NULL;

-- Index for filtering by module type
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_sys_modules_type 
    ON mgmt_cfg_sys_modules(module_type) 
    WHERE deleted_at IS NULL;

-- Index for filtering enabled modules
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_sys_modules_enabled 
    ON mgmt_cfg_sys_modules(is_enabled) 
    WHERE deleted_at IS NULL AND is_enabled = true;

-- Index for tier-based queries
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_sys_modules_tier 
    ON mgmt_cfg_sys_modules(tier) 
    WHERE deleted_at IS NULL;

-- ============================================================================
-- Updated At Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_mgmt_cfg_sys_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mgmt_cfg_sys_modules_timestamp 
    ON mgmt_cfg_sys_modules;

CREATE TRIGGER trigger_update_mgmt_cfg_sys_modules_timestamp 
    BEFORE UPDATE ON mgmt_cfg_sys_modules
    FOR EACH ROW
    EXECUTE FUNCTION update_mgmt_cfg_sys_modules_updated_at();

-- ============================================================================
-- Initial Core Module Data
-- ============================================================================

INSERT INTO mgmt_cfg_sys_modules (
    module_name, 
    display_name, 
    description, 
    module_type, 
    tier, 
    is_enabled,
    dependencies,
    nav_config,
    required_permissions
) VALUES 
    -- Tier 1: No dependencies
    (
        'module-access',
        'Access Control',
        'Identity and access management. Handles IDP integration, organization context, user context, and permissions.',
        'core',
        1,
        true,
        '[]'::jsonb,
        '{"route": "/admin/access", "icon": "Shield", "label": "Access Control", "order": 100, "adminOnly": true}'::jsonb,
        '["admin:access"]'::jsonb
    ),
    
    -- Tier 2: Depends on Tier 1
    (
        'module-ai',
        'AI Providers',
        'AI provider management. Handles provider enablement, model configuration, and usage monitoring.',
        'core',
        2,
        true,
        '["module-access"]'::jsonb,
        '{"route": "/admin/ai", "icon": "Bot", "label": "AI Providers", "order": 110, "adminOnly": true}'::jsonb,
        '["admin:ai"]'::jsonb
    ),
    (
        'module-ws',
        'Workspace Management',
        'Multi-tenancy workspace management. Handles workspace creation, configuration, and member management.',
        'core',
        2,
        true,
        '["module-access"]'::jsonb,
        '{"route": "/admin/ws", "icon": "Building", "label": "Workspaces", "order": 115, "adminOnly": true}'::jsonb,
        '["admin:ws"]'::jsonb
    ),
    
    -- Tier 3: Depends on Tier 1 and 2
    (
        'module-kb',
        'Knowledge Base',
        'Knowledge base and RAG. Handles document ingestion, embedding, and semantic search for AI applications.',
        'core',
        3,
        true,
        '["module-access", "module-ai"]'::jsonb,
        '{"route": "/admin/kb", "icon": "BookOpen", "label": "Knowledge Base", "order": 125, "adminOnly": true}'::jsonb,
        '["admin:kb"]'::jsonb
    ),
    (
        'module-chat',
        'Chat & Messaging',
        'Chat and messaging functionality. Provides conversational AI interface for workspaces.',
        'functional',
        3,
        true,
        '["module-access", "module-kb"]'::jsonb,
        '{"route": "/admin/chat", "icon": "MessageSquare", "label": "Chat", "order": 130, "adminOnly": true}'::jsonb,
        '["admin:chat"]'::jsonb
    ),
    (
        'module-mgmt',
        'Platform Management',
        'Platform management and monitoring. Handles Lambda management, warming, and performance monitoring.',
        'core',
        3,
        true,
        '["module-access", "module-ai"]'::jsonb,
        '{"route": "/admin/platform", "icon": "Settings", "label": "Platform", "order": 120, "adminOnly": true}'::jsonb,
        '["admin:platform"]'::jsonb
    ),
    
    -- Functional Modules (Optional - can be toggled)
    (
        'module-eval',
        'Model Evaluation',
        'Model evaluation and testing. Provides evaluation configuration, test execution, and results analysis.',
        'functional',
        3,
        true,
        '["module-access", "module-ws"]'::jsonb,
        '{"route": "/admin/eval", "icon": "ClipboardCheck", "label": "Evaluation", "order": 140, "adminOnly": true}'::jsonb,
        '["admin:eval"]'::jsonb
    ),
    (
        'module-voice',
        'Voice Interviews',
        'Voice interview capabilities. Provides AI-powered voice interviews with real-time transcription and evaluation.',
        'functional',
        3,
        true,
        '["module-access", "module-ws"]'::jsonb,
        '{"route": "/admin/voice", "icon": "Mic", "label": "Voice", "order": 145, "adminOnly": true}'::jsonb,
        '["admin:voice"]'::jsonb
    )
ON CONFLICT (module_name) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE mgmt_cfg_sys_modules IS 'Registry of all CORA modules with their configuration and status';
COMMENT ON COLUMN mgmt_cfg_sys_modules.module_name IS 'Unique module identifier following module-{purpose} convention';
COMMENT ON COLUMN mgmt_cfg_sys_modules.module_type IS 'core = required for CORA, functional = feature-specific';
COMMENT ON COLUMN mgmt_cfg_sys_modules.tier IS 'Dependency tier: 1=no deps, 2=depends on T1, 3=depends on T1+T2';
COMMENT ON COLUMN mgmt_cfg_sys_modules.is_enabled IS 'Runtime toggle - can be changed without redeployment';
COMMENT ON COLUMN mgmt_cfg_sys_modules.is_installed IS 'Whether module code is deployed to the system';
COMMENT ON COLUMN mgmt_cfg_sys_modules.config IS 'Module-specific configuration as JSON';
COMMENT ON COLUMN mgmt_cfg_sys_modules.nav_config IS 'Navigation configuration: route, icon, label, order, visibility';
COMMENT ON COLUMN mgmt_cfg_sys_modules.dependencies IS 'Array of module_name values this module depends on';