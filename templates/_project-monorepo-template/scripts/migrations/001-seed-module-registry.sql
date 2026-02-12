-- =============================================================================
-- CORA Module Registry - Core Modules Seed Data
-- =============================================================================
-- Migration: 001-seed-module-registry.sql
-- Purpose: Seed sys_module_registry with all 6 core CORA modules
-- Idempotent: Yes (uses ON CONFLICT DO NOTHING)
-- Dependencies: Requires sys_module_registry table to exist
-- Created: 2026-01-25
-- Updated: 2026-01-25 (Sprint 3a - module-chat reclassified as functional)
-- =============================================================================

-- This migration seeds the module registry with all core CORA modules.
-- It is safe to run multiple times due to ON CONFLICT clause.

INSERT INTO sys_module_registry (
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
    -- Tier 1: Foundation modules (no dependencies)
    (
        'module-access',
        'Access',
        'Identity and access management. Handles IDP integration, organization context, user context, and permissions.',
        'core',
        1,
        true,
        '[]'::jsonb,
        '{"route": "/admin/access", "icon": "Shield", "label": "Access Control", "order": 105, "adminOnly": true}'::jsonb,
        '["admin:access"]'::jsonb
    ),

    -- Tier 2: Baseline services (depends on Tier 1)
    (
        'module-ai',
        'AI',
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
        'Workspace',
        'Multi-tenancy workspace management. Handles workspace creation, configuration, and member management.',
        'core',
        2,
        true,
        '["module-access"]'::jsonb,
        '{"route": "/admin/ws", "icon": "Building", "label": "Workspaces", "order": 120, "adminOnly": true}'::jsonb,
        '["admin:ws"]'::jsonb
    ),

    -- Tier 3: Feature modules (depends on Tier 1 and 2)
    (
        'module-kb',
        'Knowledge',
        'Knowledge base and RAG. Handles document ingestion, embedding, and semantic search for AI applications.',
        'core',
        3,
        true,
        '["module-access", "module-ai"]'::jsonb,
        '{"route": "/admin/kb", "icon": "BookOpen", "label": "Knowledge Bases", "order": 115, "adminOnly": true}'::jsonb,
        '["admin:kb"]'::jsonb
    ),
    (
        'module-chat',
        'Chat',
        'Chat and messaging functionality. Provides conversational AI interface for workspaces.',
        'functional',
        3,
        true,
        '["module-access", "module-kb"]'::jsonb,
        '{"route": "/admin/chat", "icon": "MessageSquare", "label": "Chats", "order": 125, "adminOnly": true}'::jsonb,
        '["admin:chat"]'::jsonb
    ),
    (
        'module-mgmt',
        'Management',
        'Platform management and monitoring. Handles Lambda management, warming, and performance monitoring.',
        'core',
        3,
        true,
        '["module-access", "module-ai"]'::jsonb,
        '{"route": "/admin/mgmt", "icon": "Settings", "label": "Management", "order": 100, "adminOnly": true}'::jsonb,
        '["admin:platform"]'::jsonb
    ),

    -- Functional Modules (Optional - can be toggled)
    (
        'module-eval',
        'Evaluation',
        'Model evaluation and testing. Provides evaluation configuration, test execution, and results analysis.',
        'functional',
        3,
        true,
        '["module-access", "module-ws"]'::jsonb,
        '{"route": "/admin/eval", "icon": "ClipboardCheck", "label": "Evaluations", "order": 135, "adminOnly": true}'::jsonb,
        '["admin:eval"]'::jsonb
    ),
    (
        'module-voice',
        'Voice',
        'Voice interview capabilities. Provides AI-powered voice interviews with real-time transcription and evaluation.',
        'functional',
        3,
        true,
        '["module-access", "module-ws"]'::jsonb,
        '{"route": "/admin/voice", "icon": "Mic", "label": "Voice Interactions", "order": 130, "adminOnly": true}'::jsonb,
        '["admin:voice"]'::jsonb
    )
ON CONFLICT (module_name) DO NOTHING;

-- =============================================================================
-- Verification Query
-- =============================================================================
-- Run this after the migration to verify all modules are present:
--
-- SELECT 
--     module_name, 
--     display_name, 
--     module_type, 
--     tier, 
--     is_enabled,
--     is_installed
-- FROM sys_module_registry
-- ORDER BY tier, module_name;
--
-- Expected: 8 modules (5 core, 3 functional: chat, eval, voice)
-- =============================================================================