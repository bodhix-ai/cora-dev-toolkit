-- ============================================================================
-- Supabase Role Verification Script
-- ============================================================================
-- Purpose: Verify that Supabase default roles exist and have correct permissions
-- Use Case: Troubleshooting connection issues, RLS policy problems, or new databases
-- ============================================================================

\echo '============================================================'
\echo 'Supabase Role Verification'
\echo '============================================================'
\echo ''

-- ============================================================================
-- PART 1: Check if default roles exist
-- ============================================================================
\echo '1. Checking if default Supabase roles exist...'
\echo ''

SELECT 
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ All default roles exist'
        ELSE '❌ Missing roles! Expected 4, found ' || COUNT(*)::text
    END as status
FROM pg_roles 
WHERE rolname IN ('postgres', 'anon', 'authenticated', 'service_role');

SELECT 
    rolname as role_name,
    CASE 
        WHEN rolsuper THEN '✅ Superuser'
        ELSE '❌ Not superuser'
    END as superuser_status,
    CASE 
        WHEN rolcanlogin THEN '✅ Can login'
        ELSE '⚠️  Cannot login (OK for anon/authenticated/service_role)'
    END as login_status
FROM pg_roles 
WHERE rolname IN ('postgres', 'anon', 'authenticated', 'service_role')
ORDER BY rolname;

\echo ''

-- ============================================================================
-- PART 2: Check schema permissions
-- ============================================================================
\echo '2. Checking schema permissions for default roles...'
\echo ''

SELECT 
    nspname as schema_name,
    CASE 
        WHEN has_schema_privilege('anon', nspname, 'USAGE') THEN '✅'
        ELSE '❌'
    END as anon_usage,
    CASE 
        WHEN has_schema_privilege('authenticated', nspname, 'USAGE') THEN '✅'
        ELSE '❌'
    END as authenticated_usage,
    CASE 
        WHEN has_schema_privilege('service_role', nspname, 'USAGE') THEN '✅'
        ELSE '❌'
    END as service_role_usage
FROM pg_namespace
WHERE nspname IN ('public', 'auth', 'storage')
ORDER BY nspname;

\echo ''

-- ============================================================================
-- PART 3: Check table permissions (if tables exist)
-- ============================================================================
\echo '3. Checking table permissions (sample: first 5 tables in public schema)...'
\echo ''

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM pg_tables 
    WHERE schemaname = 'public';
    
    IF table_count = 0 THEN
        RAISE NOTICE '⚠️  No tables found in public schema (OK for empty database)';
    ELSE
        RAISE NOTICE 'Found % tables in public schema', table_count;
    END IF;
END $$;

SELECT 
    tablename,
    CASE 
        WHEN has_table_privilege('anon', 'public.' || tablename, 'SELECT') THEN '✅ SELECT'
        ELSE '❌ No SELECT'
    END as anon_perms,
    CASE 
        WHEN has_table_privilege('authenticated', 'public.' || tablename, 'SELECT') THEN '✅ SELECT'
        ELSE '❌ No SELECT'
    END as authenticated_perms,
    CASE 
        WHEN has_table_privilege('service_role', 'public.' || tablename, 'SELECT') THEN '✅ SELECT'
        ELSE '❌ No SELECT'
    END as service_role_perms
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename
LIMIT 5;

\echo ''

-- ============================================================================
-- PART 4: Check default privileges
-- ============================================================================
\echo '4. Checking default privileges for future tables...'
\echo ''

SELECT 
    pg_get_userbyid(defaclrole) as grantor,
    defaclnamespace::regnamespace as schema,
    defaclobjtype as object_type,
    CASE defaclobjtype
        WHEN 'r' THEN 'table'
        WHEN 'S' THEN 'sequence'
        WHEN 'f' THEN 'function'
        WHEN 'T' THEN 'type'
        WHEN 'n' THEN 'schema'
    END as type_name,
    (
        SELECT string_agg(privilege, ', ')
        FROM aclexplode(defaclacl) AS x(grantor, grantee, privilege, grantable)
        WHERE grantee = (SELECT oid FROM pg_roles WHERE rolname = 'anon')
    ) as anon_privileges,
    (
        SELECT string_agg(privilege, ', ')
        FROM aclexplode(defaclacl) AS x(grantor, grantee, privilege, grantable)
        WHERE grantee = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
    ) as authenticated_privileges,
    (
        SELECT string_agg(privilege, ', ')
        FROM aclexplode(defaclacl) AS x(grantor, grantee, privilege, grantable)
        WHERE grantee = (SELECT oid FROM pg_roles WHERE rolname = 'service_role')
    ) as service_role_privileges
FROM pg_default_acl
WHERE defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
   OR defaclnamespace = 0;

\echo ''

-- ============================================================================
-- PART 5: Check RLS status on tables
-- ============================================================================
\echo '5. Checking Row-Level Security (RLS) status on tables...'
\echo ''

DO $$
DECLARE
    table_count INTEGER;
    rls_enabled_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM pg_tables 
    WHERE schemaname = 'public';
    
    IF table_count = 0 THEN
        RAISE NOTICE '⚠️  No tables found (OK for empty database)';
    ELSE
        SELECT COUNT(*) INTO rls_enabled_count
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public'
        AND c.relrowsecurity = true;
        
        RAISE NOTICE 'Tables with RLS enabled: % / %', rls_enabled_count, table_count;
    END IF;
END $$;

SELECT 
    tablename,
    CASE 
        WHEN c.relrowsecurity THEN '✅ Enabled'
        ELSE '⚠️  Disabled'
    END as rls_status,
    CASE 
        WHEN c.relforcerowsecurity THEN '✅ Forced (even for table owner)'
        ELSE '⚠️  Not forced'
    END as rls_forced
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
ORDER BY tablename
LIMIT 10;

\echo ''

-- ============================================================================
-- PART 6: Summary and Recommendations
-- ============================================================================
\echo '6. Summary and Recommendations'
\echo ''

DO $$
DECLARE
    role_count INTEGER;
    table_count INTEGER;
    rls_enabled_count INTEGER;
BEGIN
    -- Check roles
    SELECT COUNT(*) INTO role_count
    FROM pg_roles 
    WHERE rolname IN ('postgres', 'anon', 'authenticated', 'service_role');
    
    -- Check tables
    SELECT COUNT(*) INTO table_count 
    FROM pg_tables 
    WHERE schemaname = 'public';
    
    -- Check RLS
    IF table_count > 0 THEN
        SELECT COUNT(*) INTO rls_enabled_count
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public'
        AND c.relrowsecurity = true;
    ELSE
        rls_enabled_count := 0;
    END IF;
    
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'VERIFICATION SUMMARY';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    
    -- Role check
    IF role_count = 4 THEN
        RAISE NOTICE '✅ All 4 default Supabase roles exist';
    ELSE
        RAISE NOTICE '❌ PROBLEM: Only % / 4 roles exist', role_count;
        RAISE NOTICE '   → Contact Supabase support - roles may not be set up correctly';
    END IF;
    
    -- Table check
    IF table_count = 0 THEN
        RAISE NOTICE '⚠️  No tables in public schema (expected for new/empty database)';
        RAISE NOTICE '   → Run CORA database setup to create tables';
    ELSE
        RAISE NOTICE '✅ Found % tables in public schema', table_count;
    END IF;
    
    -- RLS check
    IF table_count > 0 THEN
        IF rls_enabled_count = table_count THEN
            RAISE NOTICE '✅ RLS enabled on all % tables', table_count;
        ELSIF rls_enabled_count > 0 THEN
            RAISE NOTICE '⚠️  RLS enabled on % / % tables', rls_enabled_count, table_count;
            RAISE NOTICE '   → Review tables without RLS - may be intentional';
        ELSE
            RAISE NOTICE '❌ RLS not enabled on any tables';
            RAISE NOTICE '   → Check schema files - RLS should be enabled via ALTER TABLE ... ENABLE ROW LEVEL SECURITY';
        END IF;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
END $$;

\echo ''
\echo '============================================================'
\echo 'Verification complete!'
\echo '============================================================'
\echo ''
\echo 'If you see issues:'
\echo '1. Missing roles → Contact Supabase support'
\echo '2. Missing permissions → Check default privileges configuration'
\echo '3. No tables → Run CORA database setup script'
\echo '4. RLS issues → Review schema files for RLS configuration'
\echo ''
