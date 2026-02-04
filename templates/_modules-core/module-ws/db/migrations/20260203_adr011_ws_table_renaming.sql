-- =============================================
-- Migration: ADR-011 Table Naming Compliance
-- =============================================
-- Purpose: Rename workspace tables to comply with ADR-011 naming standards
-- Date: 2026-02-03
-- Sprint: S4 - WS Plugin Architecture
--
-- Tables renamed:
--   ws_configs      → ws_cfg_sys      (Rule 8.1: Config tables use _cfg_ pattern)
--   ws_org_settings → ws_cfg_org      (Rule 8.1: Config tables use _cfg_ pattern)
--   ws_activity_log → ws_log_activity (Rule 8.2: Log tables use _log_ pattern)
--
-- IMPORTANT: Run this migration BEFORE deploying Lambda code that uses new names

-- =============================================
-- Step 0: Create trigger functions FIRST (needed for triggers)
-- =============================================

-- ws_cfg_sys trigger function
CREATE OR REPLACE FUNCTION update_ws_cfg_sys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ws_cfg_org trigger function
CREATE OR REPLACE FUNCTION update_ws_cfg_org_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Step 1: Rename ws_configs → ws_cfg_sys
-- =============================================

-- Check if old table exists and new doesn't (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ws_configs')
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ws_cfg_sys') THEN
        
        -- Rename table
        ALTER TABLE public.ws_configs RENAME TO ws_cfg_sys;
        
        -- Update primary key constraint name
        ALTER TABLE public.ws_cfg_sys 
            DROP CONSTRAINT IF EXISTS ws_configs_pkey;
        ALTER TABLE public.ws_cfg_sys 
            ADD CONSTRAINT ws_cfg_sys_pkey PRIMARY KEY (id);
        
        -- Update check constraints
        ALTER TABLE public.ws_cfg_sys 
            DROP CONSTRAINT IF EXISTS ws_configs_color_check;
        ALTER TABLE public.ws_cfg_sys 
            ADD CONSTRAINT ws_cfg_sys_color_check CHECK (default_color ~ '^#[0-9A-Fa-f]{6}$');
        
        ALTER TABLE public.ws_cfg_sys 
            DROP CONSTRAINT IF EXISTS ws_configs_retention_days_check;
        ALTER TABLE public.ws_cfg_sys 
            ADD CONSTRAINT ws_cfg_sys_retention_days_check CHECK (
                default_retention_days IS NULL OR (default_retention_days >= 1 AND default_retention_days <= 365)
            );
        
        ALTER TABLE public.ws_cfg_sys 
            DROP CONSTRAINT IF EXISTS ws_configs_max_tags_check;
        ALTER TABLE public.ws_cfg_sys 
            ADD CONSTRAINT ws_cfg_sys_max_tags_check CHECK (
                max_tags_per_workspace IS NULL OR (max_tags_per_workspace >= 1 AND max_tags_per_workspace <= 50)
            );
        
        ALTER TABLE public.ws_cfg_sys 
            DROP CONSTRAINT IF EXISTS ws_configs_max_tag_length_check;
        ALTER TABLE public.ws_cfg_sys 
            ADD CONSTRAINT ws_cfg_sys_max_tag_length_check CHECK (
                max_tag_length IS NULL OR (max_tag_length >= 3 AND max_tag_length <= 50)
            );
        
        -- Update trigger
        DROP TRIGGER IF EXISTS ws_configs_updated_at ON public.ws_cfg_sys;
        CREATE TRIGGER ws_cfg_sys_updated_at 
            BEFORE UPDATE ON public.ws_cfg_sys
            FOR EACH ROW
            EXECUTE FUNCTION update_ws_cfg_sys_updated_at();
        
        -- Update RLS policies
        DROP POLICY IF EXISTS "Everyone can view ws_configs" ON public.ws_cfg_sys;
        CREATE POLICY "Everyone can view ws_cfg_sys" ON public.ws_cfg_sys
            FOR SELECT TO authenticated USING (true);
        
        DROP POLICY IF EXISTS "Sys admins can update ws_configs" ON public.ws_cfg_sys;
        CREATE POLICY "Sys admins can update ws_cfg_sys" ON public.ws_cfg_sys
            FOR UPDATE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE user_profiles.user_id = auth.uid()
                    AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE user_profiles.user_id = auth.uid()
                    AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
                )
            );
        
        DROP POLICY IF EXISTS "Service role full access to ws_configs" ON public.ws_cfg_sys;
        CREATE POLICY "Service role full access to ws_cfg_sys" ON public.ws_cfg_sys
            FOR ALL
            USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
        
        -- Add table comment
        COMMENT ON TABLE public.ws_cfg_sys IS 'Platform-level configuration for workspace module. Renamed from ws_configs on 2026-02-03 to comply with ADR-011.';
        
        RAISE NOTICE 'Successfully renamed ws_configs → ws_cfg_sys';
    ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ws_cfg_sys') THEN
        RAISE NOTICE 'Table ws_cfg_sys already exists, skipping rename';
    ELSE
        RAISE NOTICE 'Table ws_configs does not exist, nothing to rename';
    END IF;
END $$;

-- =============================================
-- Step 2: Rename ws_org_settings → ws_cfg_org
-- =============================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ws_org_settings')
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ws_cfg_org') THEN
        
        -- Rename table
        ALTER TABLE public.ws_org_settings RENAME TO ws_cfg_org;
        
        -- Update primary key constraint name
        ALTER TABLE public.ws_cfg_org 
            DROP CONSTRAINT IF EXISTS ws_org_settings_pkey;
        ALTER TABLE public.ws_cfg_org 
            ADD CONSTRAINT ws_cfg_org_pkey PRIMARY KEY (id);
        
        -- Update unique constraint
        ALTER TABLE public.ws_cfg_org 
            DROP CONSTRAINT IF EXISTS ws_org_settings_org_id_unique;
        ALTER TABLE public.ws_cfg_org 
            DROP CONSTRAINT IF EXISTS ws_org_settings_org_id_key;
        ALTER TABLE public.ws_cfg_org 
            ADD CONSTRAINT ws_cfg_org_org_id_key UNIQUE (org_id);
        
        -- Update foreign key constraints
        ALTER TABLE public.ws_cfg_org 
            DROP CONSTRAINT IF EXISTS ws_org_settings_org_id_fkey;
        ALTER TABLE public.ws_cfg_org 
            ADD CONSTRAINT fk_ws_cfg_org_org_id FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE;
        
        -- Update check constraint
        ALTER TABLE public.ws_cfg_org 
            DROP CONSTRAINT IF EXISTS ws_org_settings_max_workspaces_check;
        ALTER TABLE public.ws_cfg_org 
            ADD CONSTRAINT ws_cfg_org_max_workspaces_check CHECK (
                max_workspaces_per_user >= 1 AND max_workspaces_per_user <= 100
            );
        
        -- Update index
        DROP INDEX IF EXISTS idx_ws_org_settings_org_id;
        CREATE INDEX IF NOT EXISTS idx_ws_cfg_org_org_id ON public.ws_cfg_org(org_id);
        
        -- Update trigger
        DROP TRIGGER IF EXISTS trigger_update_ws_org_settings_updated_at ON public.ws_cfg_org;
        CREATE TRIGGER trigger_update_ws_cfg_org_updated_at
            BEFORE UPDATE ON public.ws_cfg_org
            FOR EACH ROW
            EXECUTE FUNCTION update_ws_cfg_org_updated_at();
        
        -- Update RLS policies
        DROP POLICY IF EXISTS "Org members can view org settings" ON public.ws_cfg_org;
        CREATE POLICY "Org members can view org config" ON public.ws_cfg_org
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.org_members
                    WHERE org_members.org_id = ws_cfg_org.org_id
                    AND org_members.user_id = auth.uid()
                )
            );
        
        DROP POLICY IF EXISTS "Org and sys admins can create settings" ON public.ws_cfg_org;
        CREATE POLICY "Org and sys admins can create config" ON public.ws_cfg_org
            FOR INSERT TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE user_profiles.user_id = auth.uid()
                    AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
                )
                OR
                EXISTS (
                    SELECT 1 FROM public.org_members
                    WHERE org_members.org_id = ws_cfg_org.org_id
                    AND org_members.user_id = auth.uid()
                    AND org_members.org_role IN ('org_owner', 'org_admin')
                )
            );
        
        DROP POLICY IF EXISTS "Org and sys admins can update settings" ON public.ws_cfg_org;
        CREATE POLICY "Org and sys admins can update config" ON public.ws_cfg_org
            FOR UPDATE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE user_profiles.user_id = auth.uid()
                    AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
                )
                OR
                EXISTS (
                    SELECT 1 FROM public.org_members
                    WHERE org_members.org_id = ws_cfg_org.org_id
                    AND org_members.user_id = auth.uid()
                    AND org_members.org_role IN ('org_owner', 'org_admin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE user_profiles.user_id = auth.uid()
                    AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
                )
                OR
                EXISTS (
                    SELECT 1 FROM public.org_members
                    WHERE org_members.org_id = ws_cfg_org.org_id
                    AND org_members.user_id = auth.uid()
                    AND org_members.org_role IN ('org_owner', 'org_admin')
                )
            );
        
        DROP POLICY IF EXISTS "Service role full access to ws_org_settings" ON public.ws_cfg_org;
        CREATE POLICY "Service role full access to ws_cfg_org" ON public.ws_cfg_org
            FOR ALL
            USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
        
        -- Add table comment
        COMMENT ON TABLE public.ws_cfg_org IS 'Organization-level workspace configuration. Renamed from ws_org_settings on 2026-02-03 to comply with ADR-011.';
        
        RAISE NOTICE 'Successfully renamed ws_org_settings → ws_cfg_org';
    ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ws_cfg_org') THEN
        RAISE NOTICE 'Table ws_cfg_org already exists, skipping rename';
    ELSE
        RAISE NOTICE 'Table ws_org_settings does not exist, nothing to rename';
    END IF;
END $$;

-- =============================================
-- Step 3: Rename ws_activity_log → ws_log_activity
-- =============================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ws_activity_log')
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ws_log_activity') THEN
        
        -- Rename table
        ALTER TABLE public.ws_activity_log RENAME TO ws_log_activity;
        
        -- Update primary key constraint name
        ALTER TABLE public.ws_log_activity 
            DROP CONSTRAINT IF EXISTS ws_activity_log_pkey;
        ALTER TABLE public.ws_log_activity 
            ADD CONSTRAINT ws_log_activity_pkey PRIMARY KEY (id);
        
        -- Update foreign key constraints
        ALTER TABLE public.ws_log_activity 
            DROP CONSTRAINT IF EXISTS ws_activity_log_ws_id_fkey;
        ALTER TABLE public.ws_log_activity 
            ADD CONSTRAINT fk_ws_log_activity_ws_id FOREIGN KEY (ws_id) REFERENCES workspaces(id) ON DELETE CASCADE;
        
        ALTER TABLE public.ws_log_activity 
            DROP CONSTRAINT IF EXISTS ws_activity_log_user_id_fkey;
        ALTER TABLE public.ws_log_activity 
            ADD CONSTRAINT fk_ws_log_activity_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        
        -- Update indexes
        DROP INDEX IF EXISTS idx_ws_activity_log_ws_id;
        CREATE INDEX IF NOT EXISTS idx_ws_log_activity_ws_id ON public.ws_log_activity(ws_id);
        
        DROP INDEX IF EXISTS idx_ws_activity_log_user_id;
        CREATE INDEX IF NOT EXISTS idx_ws_log_activity_user_id ON public.ws_log_activity(user_id);
        
        DROP INDEX IF EXISTS idx_ws_activity_log_created_at;
        CREATE INDEX IF NOT EXISTS idx_ws_log_activity_created_at ON public.ws_log_activity(created_at DESC);
        
        -- Update RLS policies
        DROP POLICY IF EXISTS "Workspace members can view activity" ON public.ws_log_activity;
        CREATE POLICY "Workspace members can view activity" ON public.ws_log_activity
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.ws_members
                    WHERE ws_members.ws_id = ws_log_activity.ws_id
                    AND ws_members.user_id = auth.uid()
                    AND ws_members.deleted_at IS NULL
                )
            );
        
        DROP POLICY IF EXISTS "Service role can insert activity logs" ON public.ws_log_activity;
        CREATE POLICY "Service role can insert activity logs" ON public.ws_log_activity
            FOR INSERT
            WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
        
        DROP POLICY IF EXISTS "Service role full access to ws_activity_log" ON public.ws_log_activity;
        CREATE POLICY "Service role full access to ws_log_activity" ON public.ws_log_activity
            FOR ALL
            USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
        
        -- Add table comment
        COMMENT ON TABLE public.ws_log_activity IS 'Workspace activity audit log. Renamed from ws_activity_log on 2026-02-03 to comply with ADR-011.';
        
        RAISE NOTICE 'Successfully renamed ws_activity_log → ws_log_activity';
    ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ws_log_activity') THEN
        RAISE NOTICE 'Table ws_log_activity already exists, skipping rename';
    ELSE
        RAISE NOTICE 'Table ws_activity_log does not exist, nothing to rename';
    END IF;
END $$;

-- =============================================
-- Verification
-- =============================================

DO $$
DECLARE
    v_ws_cfg_sys_exists BOOLEAN;
    v_ws_cfg_org_exists BOOLEAN;
    v_ws_log_activity_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ws_cfg_sys') INTO v_ws_cfg_sys_exists;
    SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ws_cfg_org') INTO v_ws_cfg_org_exists;
    SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ws_log_activity') INTO v_ws_log_activity_exists;
    
    RAISE NOTICE '=== Migration Verification ===';
    RAISE NOTICE 'ws_cfg_sys exists: %', v_ws_cfg_sys_exists;
    RAISE NOTICE 'ws_cfg_org exists: %', v_ws_cfg_org_exists;
    RAISE NOTICE 'ws_log_activity exists: %', v_ws_log_activity_exists;
    
    IF v_ws_cfg_sys_exists AND v_ws_cfg_org_exists AND v_ws_log_activity_exists THEN
        RAISE NOTICE '✅ All tables renamed successfully (ADR-011 compliant)';
    ELSE
        RAISE WARNING '⚠️ Some tables may not have been renamed. Check above messages.';
    END IF;
END $$;