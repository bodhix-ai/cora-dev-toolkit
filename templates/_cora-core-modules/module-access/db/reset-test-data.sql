-- Reset Test Data for Org-Module
-- Use this to clear all test data and start fresh
-- Run this in Supabase SQL Editor

-- IMPORTANT: This script will delete ALL data from org-related tables
-- Use with caution - only in dev/test environments

-- Step 1: Temporarily disable the ensure_org_has_owner trigger
-- This trigger prevents deleting the last org_owner, but we want to clear all test data
ALTER TABLE org_members DISABLE TRIGGER ensure_org_has_owner_trigger;

-- Step 2: Delete org_members (has FKs to both org and auth.users)
DELETE FROM org_members;

-- Step 3: Delete org records (has FK to auth.users for owner_id, created_by, updated_by)
DELETE FROM orgs;

-- Step 4: Re-enable the trigger
ALTER TABLE org_members ENABLE TRIGGER ensure_org_has_owner_trigger;

-- Step 5: Delete profiles (has FK to auth.users for user_id, created_by, updated_by)
DELETE FROM user_profiles;

-- Step 6: Delete external_identities (has FK to auth.users)
DELETE FROM user_auth_ext_ids;

-- Step 7: Delete from auth.users
-- NOTE: This requires service_role access in Supabase
-- If you get permission errors, use the Supabase Dashboard instead:
-- Go to Authentication > Users > Select user > Delete user

-- For testing, you can also use Supabase Admin API via SQL:
-- This works if you have the auth schema access
DELETE FROM auth.users 
WHERE email = 'Aaron.Kilinski@simpletechnology.io';

-- Step 8: Verify all tables are empty
SELECT 'org_members' as table_name, COUNT(*) as count FROM org_members
UNION ALL
SELECT 'orgs', COUNT(*) FROM orgs
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'user_auth_ext_ids', COUNT(*) FROM user_auth_ext_ids
UNION ALL
SELECT 'auth.users', COUNT(*) FROM auth.users WHERE email = 'Aaron.Kilinski@simpletechnology.io';

-- NOTE: If you get FK constraint errors, the deletion order is critical.
-- The order above should work, but if it doesn't, you may need to temporarily
-- disable FK checks (not recommended in production):
-- 
-- SET session_replication_role = 'replica';
-- -- run deletions
-- SET session_replication_role = 'origin';
