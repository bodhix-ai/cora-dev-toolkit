-- Migration: Add workspace_id to kb_docs table
-- Date: 2026-01-20
-- Purpose: Fix eval-processor Lambda error "column kb_docs.workspace_id does not exist"
-- Issue: Evaluation processor needs to filter documents by workspace for proper context retrieval

-- Step 1: Add workspace_id column (nullable initially to allow backfill)
ALTER TABLE public.kb_docs
ADD COLUMN IF NOT EXISTS workspace_id uuid NULL;

-- Step 2: Add foreign key constraint to workspaces table
ALTER TABLE public.kb_docs
ADD CONSTRAINT kb_docs_workspace_id_fkey 
FOREIGN KEY (workspace_id) 
REFERENCES workspaces (id) 
ON DELETE CASCADE;

-- Step 3: Backfill workspace_id from kb_bases
-- This assumes kb_bases table has workspace_id column
UPDATE public.kb_docs d
SET workspace_id = kb.workspace_id
FROM kb_bases kb
WHERE d.kb_id = kb.id
AND d.workspace_id IS NULL;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_kb_docs_workspace_id 
ON public.kb_docs USING btree (workspace_id) 
TABLESPACE pg_default
WHERE (workspace_id IS NOT NULL);

-- Step 5: Verify the migration
SELECT 
    COUNT(*) as total_docs,
    COUNT(workspace_id) as docs_with_workspace,
    COUNT(*) - COUNT(workspace_id) as docs_without_workspace
FROM public.kb_docs;
