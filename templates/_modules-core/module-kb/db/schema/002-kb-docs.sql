-- ========================================
-- Knowledge Base Module Schema
-- Migration: 002-kb-docs.sql
-- Created: January 14, 2026
-- ========================================

-- Table: kb_docs
CREATE TABLE IF NOT EXISTS public.kb_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kb_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    s3_key VARCHAR(512) NOT NULL UNIQUE,
    s3_bucket VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Status constraint
    CONSTRAINT kb_docs_status_check CHECK (
        status IN ('pending', 'uploaded', 'processing', 'indexed', 'failed')
    ),
    
    -- File size constraint (50 MB max)
    CONSTRAINT kb_docs_file_size_check CHECK (
        file_size > 0 AND file_size <= 52428800
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_docs_kb_id ON public.kb_docs(kb_id);
CREATE INDEX IF NOT EXISTS idx_kb_docs_org_id ON public.kb_docs(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kb_docs_status ON public.kb_docs(status);
CREATE INDEX IF NOT EXISTS idx_kb_docs_created_at ON public.kb_docs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_docs_created_by ON public.kb_docs(created_by);
CREATE INDEX IF NOT EXISTS idx_kb_docs_is_deleted ON public.kb_docs(is_deleted) WHERE is_deleted = false;

-- Comments
COMMENT ON TABLE public.kb_docs IS 'Document metadata with S3 storage and processing status';
COMMENT ON COLUMN public.kb_docs.org_id IS 'Organization ID (NULL for system-level KBs, inherited from kb_bases)';
COMMENT ON COLUMN public.kb_docs.s3_key IS 'S3 object key: {org_id}/{ws_id}/{kb_id}/{doc_id}/{filename}';
COMMENT ON COLUMN public.kb_docs.status IS 'Processing status: pending, processing, indexed, failed';

-- Backfill org_id from parent KB for existing documents (idempotent)
DO $$
BEGIN
    -- Only run if column was just added and has NULL values
    IF EXISTS (SELECT 1 FROM public.kb_docs WHERE org_id IS NULL LIMIT 1) THEN
        UPDATE public.kb_docs 
        SET org_id = (SELECT org_id FROM public.kb_bases WHERE id = kb_docs.kb_id)
        WHERE org_id IS NULL;
    END IF;
END $$;
