-- =============================================
-- SUPABASE DEFAULT PRIVILEGES SETUP
-- =============================================
-- Purpose: Configure default permissions for database objects
-- Run: FIRST (before any table creation)
-- Idempotent: Safe to run multiple times
--
-- This ensures that new tables automatically grant appropriate permissions.
--
-- IMPORTANT: In hosted Supabase, you cannot use "FOR ROLE postgres" or
-- "FOR ROLE supabase_admin" as that requires superuser privileges.
-- Instead, we set defaults for the current role (migration owner).
--
-- Reference: https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html

-- =============================================
-- DEFAULT PRIVILEGES FOR FUTURE OBJECTS
-- =============================================
-- These apply to objects created by the current role (migration owner)

-- Default privileges for tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON TABLES TO authenticated;

-- Default privileges for sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Default privileges for functions
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- =============================================
-- GRANT PERMISSIONS ON ALL EXISTING OBJECTS
-- =============================================
-- Default privileges only apply to FUTURE objects.
-- We need to grant permissions on objects that already exist.

-- CRITICAL: Grant to service_role for Lambda function access
-- service_role is used by Lambda functions and needs full access
-- (RLS policies don't apply to service_role, so this is safe)
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER 
ON ALL TABLES IN SCHEMA public 
TO service_role;

GRANT SELECT, USAGE, UPDATE 
ON ALL SEQUENCES IN SCHEMA public 
TO service_role;

GRANT EXECUTE 
ON ALL FUNCTIONS IN SCHEMA public 
TO service_role;

-- Grant to authenticated for regular user access
-- (RLS policies will control row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE 
ON ALL TABLES IN SCHEMA public 
TO authenticated;

GRANT USAGE, SELECT 
ON ALL SEQUENCES IN SCHEMA public 
TO authenticated;

GRANT EXECUTE 
ON ALL FUNCTIONS IN SCHEMA public 
TO authenticated;

-- =============================================
-- VERIFICATION QUERY (OPTIONAL)
-- =============================================
-- To verify default privileges are set correctly, run:
--
-- SELECT 
--     defaclrole::regrole AS grantor,
--     defaclnamespace::regnamespace AS schema,
--     defaclobjtype AS object_type,
--     defaclacl AS privileges
-- FROM pg_default_acl
-- WHERE defaclnamespace = 'public'::regnamespace;
--
-- Expected: Defaults set for current migration role as grantor
--
-- To verify existing objects have permissions:
--
-- SELECT tablename, grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public'
-- AND tablename IN ('external_identities', 'user_invites', 'profiles', 'organizations')
-- ORDER BY tablename, grantee, privilege_type;

-- =============================================
-- NOTES
-- =============================================
-- 1. This file MUST run FIRST (before any tables are created)
-- 2. Idempotent: Safe to run multiple times without side effects
-- 3. service_role: Required for Lambda functions (bypasses RLS)
-- 4. authenticated: Required for logged-in users (subject to RLS)
-- 5. anon: NOT granted by default (too risky for public access)
-- 6. RLS policies (defined in individual table schemas) control row-level access
-- 7. These grants control table-level access (checked BEFORE RLS)
