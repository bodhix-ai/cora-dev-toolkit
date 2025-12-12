-- Reset a Specific Test User and their Data
-- Use this to clear a single test user and their associated orgs/profiles to re-test the provisioning flow.
-- Run this in the Supabase SQL Editor.

-- Instructions:
-- 1. Replace the placeholder email 'user@example.com' with the email of the user you want to delete.
-- 2. Run the entire script.

DO $$
DECLARE
    user_to_delete_email TEXT := 'Aaron.Kilinski@simpletechnology.io';
    user_to_delete_id UUID;
BEGIN
    -- Step 1: Get the user's UUID from their email
    SELECT id INTO user_to_delete_id FROM auth.users WHERE email = user_to_delete_email;

    IF user_to_delete_id IS NULL THEN
        RAISE NOTICE 'User with email % not found.', user_to_delete_email;
        RETURN;
    END IF;

    RAISE NOTICE 'Starting cleanup for user ID: %', user_to_delete_id;

    -- Step 2: Temporarily disable the trigger that prevents deleting the last org owner
    RAISE NOTICE 'Disabling org_members trigger...';
    ALTER TABLE org_members DISABLE TRIGGER ensure_org_has_owner_trigger;

    -- Step 3: Delete org memberships associated with the user
    RAISE NOTICE 'Deleting from org_members...';
    DELETE FROM public.org_members WHERE user_id = user_to_delete_id;

    -- Step 4: Delete orgs owned by the user
    RAISE NOTICE 'Deleting from orgs...';
    DELETE FROM public.org WHERE owner_id = user_to_delete_id;

    -- Step 5: Delete the user's profile
    RAISE NOTICE 'Deleting from profiles...';
    DELETE FROM public.profiles WHERE user_id = user_to_delete_id;

    -- Step 6: Delete external identities
    RAISE NOTICE 'Deleting from external_identities...';
    DELETE FROM public.external_identities WHERE auth_user_id = user_to_delete_id;

    -- Step 7: Finally, delete the user from auth.users
    -- This requires elevated privileges.
    RAISE NOTICE 'Deleting from auth.users...';
    DELETE FROM auth.users WHERE id = user_to_delete_id;

    -- Step 8: Re-enable the trigger
    RAISE NOTICE 'Re-enabling org_members trigger...';
    ALTER TABLE org_members ENABLE TRIGGER ensure_org_has_owner_trigger;

    RAISE NOTICE 'Cleanup complete for user %.', user_to_delete_email;
END $$;
