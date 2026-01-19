-- ========================================
-- Knowledge Base Module Schema
-- Migration: 003-kb-chunks.sql
-- Created: January 14, 2026
-- ========================================

-- Enable pgvector extension (requires superuser or extension already installed)
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: kb_chunks
CREATE TABLE IF NOT EXISTS public.kb_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id),  -- CORA multi-tenancy: direct org reference for performance
    kb_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.kb_docs(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1024),  -- AWS Bedrock Titan Text Embeddings V2 default
    chunk_index INTEGER NOT NULL,
    token_count INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding_model VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Chunk index must be non-negative
    CONSTRAINT kb_chunks_chunk_index_check CHECK (chunk_index >= 0)
);

-- Indexes for efficient retrieval
CREATE INDEX IF NOT EXISTS idx_kb_chunks_org_kb ON public.kb_chunks(org_id, kb_id);  -- Composite for multi-tenant RAG queries
CREATE INDEX IF NOT EXISTS idx_kb_chunks_kb_id ON public.kb_chunks(kb_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_document_id ON public.kb_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_chunk_index ON public.kb_chunks(document_id, chunk_index);

-- pgvector index for similarity search (HNSW for better out-of-box performance)
CREATE INDEX IF NOT EXISTS idx_kb_chunks_embedding ON public.kb_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Comments
COMMENT ON TABLE public.kb_chunks IS 'RAG text chunks with pgvector embeddings for semantic search';
COMMENT ON COLUMN public.kb_chunks.org_id IS 'Organization ID for CORA multi-tenancy - enables direct RLS filtering without JOINs';
COMMENT ON COLUMN public.kb_chunks.embedding IS 'Vector embedding (1024 dims for Bedrock Titan V2)';
COMMENT ON COLUMN public.kb_chunks.embedding_model IS 'Model used: amazon.titan-embed-text-v2:0, text-embedding-ada-002, etc.';
