-- ============================================================================
-- Module: module-eval-optimizer
-- Migration: 001-eval-opt-doc-groups
-- Description: Document groups for sample documents used in optimization
-- ============================================================================

-- ============================================================================
-- DOCUMENT GROUPS
-- ============================================================================

-- Create eval_opt_doc_groups table
CREATE TABLE IF NOT EXISTS eval_opt_doc_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ws_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    primary_doc_id UUID NOT NULL,  -- References kb_docs.id
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add table comment
COMMENT ON TABLE eval_opt_doc_groups IS 'Document groups (primary doc + supporting artifacts) for optimization';
COMMENT ON COLUMN eval_opt_doc_groups.ws_id IS 'Workspace foreign key';
COMMENT ON COLUMN eval_opt_doc_groups.name IS 'Document group name';
COMMENT ON COLUMN eval_opt_doc_groups.primary_doc_id IS 'Primary document ID from kb_docs';
COMMENT ON COLUMN eval_opt_doc_groups.status IS 'Evaluation status: pending, evaluated, validated';

-- Add constraint for status values (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'eval_opt_doc_groups_status_check'
    ) THEN
        ALTER TABLE eval_opt_doc_groups 
          ADD CONSTRAINT eval_opt_doc_groups_status_check 
          CHECK (status IN ('pending', 'evaluated', 'validated'));
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_opt_doc_group_workspace 
    ON eval_opt_doc_groups(ws_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_doc_group_primary_doc 
    ON eval_opt_doc_groups(primary_doc_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_doc_group_status 
    ON eval_opt_doc_groups(ws_id, status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_eval_opt_doc_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_opt_doc_groups_updated_at ON eval_opt_doc_groups;
CREATE TRIGGER eval_opt_doc_groups_updated_at
    BEFORE UPDATE ON eval_opt_doc_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_opt_doc_groups_updated_at();

-- ============================================================================
-- DOCUMENT GROUP MEMBERS
-- ============================================================================

-- Create eval_opt_doc_group_members table
CREATE TABLE IF NOT EXISTS eval_opt_doc_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES eval_opt_doc_groups(id) ON DELETE CASCADE,
    doc_id UUID NOT NULL,  -- References kb_docs.id
    doc_type VARCHAR(50) NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    added_by UUID REFERENCES auth.users(id)
);

-- Add table comment
COMMENT ON TABLE eval_opt_doc_group_members IS 'Supporting documents in a document group';
COMMENT ON COLUMN eval_opt_doc_group_members.group_id IS 'Document group foreign key';
COMMENT ON COLUMN eval_opt_doc_group_members.doc_id IS 'Document ID from kb_docs';
COMMENT ON COLUMN eval_opt_doc_group_members.doc_type IS 'Document type: primary, proof, supporting';

-- Add constraint for doc_type values (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'eval_opt_doc_group_members_doc_type_check'
    ) THEN
        ALTER TABLE eval_opt_doc_group_members 
          ADD CONSTRAINT eval_opt_doc_group_members_doc_type_check 
          CHECK (doc_type IN ('primary', 'proof', 'supporting'));
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_opt_doc_member_group 
    ON eval_opt_doc_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_doc_member_doc 
    ON eval_opt_doc_group_members(doc_id);
CREATE INDEX IF NOT EXISTS idx_eval_opt_doc_member_type 
    ON eval_opt_doc_group_members(group_id, doc_type);

-- ============================================================================
-- End of migration
-- ============================================================================
