-- Migration: Rename workspace_id to ws_id in kb_docs table
-- Date: 2026-01-20
-- Purpose: Fix naming standard violation (ADR-011, Rule 3)
-- Context: Previous migration created workspace_id, but standard requires ws_id
-- Reference: docs/standards/cora/standard_DATABASE-NAMING.md Rule 3

-- Step 1: Add ws_id column (nullable initially)
ALTER TABLE public.kb_docs
ADD COLUMN IF NOT EXISTS ws_id uuid NULL;

-- Step 2: Copy data from workspace_id to ws_id
UPDATE public.kb_docs
SET ws_id = workspace_id
WHERE workspace_id IS NOT NULL;

-- Step 3: Add foreign key constraint to workspaces table
ALTER TABLE public.kb_docs
ADD CONSTRAINT kb_docs_ws_id_fkey 
FOREIGN KEY (ws_id) 
REFERENCES workspaces (id) 
ON DELETE CASCADE;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_kb_docs_ws_id 
ON public.kb_docs USING btree (ws_id) 
TABLESPACE pg_default
WHERE (ws_id IS NOT NULL);

-- Step 5: Verify data copied correctly
DO $$
DECLARE
    mismatched_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mismatched_count
    FROM public.kb_docs
    WHERE (workspace_id IS NOT NULL AND ws_id IS NULL)
       OR (workspace_id IS NULL AND ws_id IS NOT NULL)
       OR (workspace_id != ws_id);
    
    IF mismatched_count > 0 THEN
        RAISE EXCEPTION 'Data mismatch detected: % rows have different workspace_id and ws_id values', mismatched_count;
    END IF;
    
    RAISE NOTICE 'Data verification passed: workspace_id and ws_id match for all rows';
END $$;

-- Step 6: Drop old constraint and index
ALTER TABLE public.kb_docs
DROP CONSTRAINT IF EXISTS kb_docs_workspace_id_fkey;

DROP INDEX IF EXISTS idx_kb_docs_workspace_id;

-- Step 7: Drop old workspace_id column
ALTER TABLE public.kb_docs
DROP COLUMN IF EXISTS workspace_id;

-- Step 8: Verify final state
SELECT 
    COUNT(*) as total_docs,
    COUNT(ws_id) as docs_with_workspace,
    COUNT(*) - COUNT(ws_id) as docs_without_workspace
FROM public.kb_docs;

-- Step 9: Verify column exists
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'kb_docs' 
  AND column_name IN ('ws_id', 'workspace_id')
ORDER BY column_name;

COMMENT ON COLUMN public.kb_docs.ws_id IS 'Foreign key to workspaces table (uses ws_ abbreviation per naming standard)';
