-- Clear Org and Org Members Data
-- Use this script to delete all records from the org and org_members tables.
-- This is useful for re-testing the initial user provisioning and org creation flow.

-- Step 1: Temporarily disable the trigger that prevents deleting the last org owner.
-- This is necessary to clear the tables completely.
RAISE NOTICE 'Disabling org_members trigger...';
ALTER TABLE public.org_members DISABLE TRIGGER ensure_org_has_owner_trigger;

-- Step 2: Delete all records from org_members.
-- This must be done before deleting from the org table to avoid foreign key violations.
RAISE NOTICE 'Deleting all records from org_members...';
DELETE FROM public.org_members;

-- Step 3: Delete all records from the org table.
RAISE NOTICE 'Deleting all records from org...';
DELETE FROM public.org;

-- Step 4: Re-enable the trigger.
RAISE NOTICE 'Re-enabling org_members trigger...';
ALTER TABLE public.org_members ENABLE TRIGGER ensure_org_has_owner_trigger;

RAISE NOTICE 'Successfully cleared org and org_members tables.';
