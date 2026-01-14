-- =============================================
-- MIGRATION: Fix invite trigger recursion
-- =============================================
-- Purpose: Fix stack overflow error when creating invitations
-- Issue: auto_expire_invites trigger fires on both INSERT and UPDATE,
--        causing infinite recursion when the function performs UPDATE
-- Fix: Remove UPDATE from trigger, only fire on INSERT
-- Date: January 12, 2026
-- Safe to run: Yes - idempotent, can be run multiple times

-- Drop existing trigger
DROP TRIGGER IF EXISTS check_expired_invites ON public.user_invites;

-- Recreate trigger - ONLY on INSERT (not UPDATE)
CREATE TRIGGER check_expired_invites
    AFTER INSERT ON public.user_invites
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_expire_invites();

-- Verification query (optional - run separately to verify fix)
-- SELECT 
--     trigger_name, 
--     event_manipulation,
--     action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name = 'check_expired_invites';
-- 
-- Expected result:
-- trigger_name             | event_manipulation | action_statement
-- -------------------------+--------------------+------------------
-- check_expired_invites    | INSERT            | EXECUTE FUNCTION auto_expire_invites()
