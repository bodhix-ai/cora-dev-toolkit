# Knowledge Base Module - Database Schema

**Parent Document:** [MODULE-KB-TECHNICAL-SPEC.md](../MODULE-KB-TECHNICAL-SPEC.md)

---

## Migration Files Overview

| Migration | Table | Purpose |
|-----------|-------|---------|
| 001-kb-bases.sql | kb_bases | Main KB table with scope hierarchy |
| 002-kb-docs.sql | kb_docs | Document metadata |
| 003-kb-chunks.sql | kb_chunks | RAG chunks with pgvector |
| 004-kb-access-sys.sql | kb_access_sys | System KB org associations |
| 005-kb-access-orgs.sql | kb_access_orgs | Org-level KB enablement |
| 006-kb-access-ws.sql | kb_access_ws | Workspace-level KB enablement |
| 007-kb-access-chats.sql | kb_access_chats | Chat-level KB toggles |
| 008-kb-rpc-functions.sql | (functions) | Access control RPC functions |
| 009-kb-rls.sql | (policies) | Row Level Security policies |

---

## 2.1 Migration: `001-kb-bases.sql`

**Purpose:** Create main knowledge base table with scope hierarchy support.

```sql
-- ========================================
-- Knowledge Base Module Schema
-- Migration: 001-kb-bases.sql
-- Created: January 14, 2026
-- ========================================

-- Table: kb_bases
CREATE TABLE IF NOT EXISTS public.kb_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scope VARCHAR(50) NOT NULL,
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    chat_session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Scope constraint
    CONSTRAINT kb_bases_scope_check CHECK (
        scope IN ('sys', 'org', 'workspace', 'chat')
    ),
    
    -- Scope-field relationship constraint
    CONSTRAINT kb_bases_scope_fields_check CHECK (
        (scope = 'sys' AND org_id IS NULL AND workspace_id IS NULL AND chat_session_id IS NULL) OR
        (scope = 'org' AND org_id IS NOT NULL AND workspace_id IS NULL AND chat_session_id IS NULL) OR
        (scope = 'workspace' AND org_id IS NOT NULL AND workspace_id IS NOT NULL AND chat_session_id IS NULL) OR
        (scope = 'chat' AND org_id IS NOT NULL AND chat_session_id IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_kb_bases_scope ON public.kb_bases(scope);
CREATE INDEX idx_kb_bases_org_id ON public.kb_bases(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_kb_bases_workspace_id ON public.kb_bases(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_kb_bases_chat_session_id ON public.kb_bases(chat_session_id) WHERE chat_session_id IS NOT NULL;
CREATE INDEX idx_kb_bases_is_enabled ON public.kb_bases(is_enabled) WHERE is_deleted = false;
CREATE INDEX idx_kb_bases_created_at ON public.kb_bases(created_at DESC);

-- Partial unique index for workspace-scoped KBs (one per workspace)
CREATE UNIQUE INDEX idx_kb_bases_workspace_unique 
    ON public.kb_bases(workspace_id) 
    WHERE scope = 'workspace' AND is_deleted = false;

-- Partial unique index for chat-scoped KBs (one per chat session)
CREATE UNIQUE INDEX idx_kb_bases_chat_unique 
    ON public.kb_bases(chat_session_id) 
    WHERE scope = 'chat' AND is_deleted = false;

-- Comments
COMMENT ON TABLE public.kb_bases IS 'Knowledge bases with multi-scope hierarchy (sys, org, workspace, chat)';
COMMENT ON COLUMN public.kb_bases.scope IS 'KB scope: sys (platform), org, workspace, or chat';
COMMENT ON COLUMN public.kb_bases.config IS 'KB configuration: whoCanUpload, autoIndex, chunkSize, etc.';
```

---

## 2.2 Migration: `002-kb-docs.sql`

**Purpose:** Create document metadata table with status tracking.

```sql
-- ========================================
-- Knowledge Base Module Schema
-- Migration: 002-kb-docs.sql
-- Created: January 14, 2026
-- ========================================

-- Table: kb_docs
CREATE TABLE IF NOT EXISTS public.kb_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kb_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
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
        status IN ('pending', 'processing', 'indexed', 'failed')
    ),
    
    -- File size constraint (50 MB max)
    CONSTRAINT kb_docs_file_size_check CHECK (
        file_size > 0 AND file_size <= 52428800
    )
);

-- Indexes
CREATE INDEX idx_kb_docs_kb_id ON public.kb_docs(kb_id);
CREATE INDEX idx_kb_docs_status ON public.kb_docs(status);
CREATE INDEX idx_kb_docs_created_at ON public.kb_docs(created_at DESC);
CREATE INDEX idx_kb_docs_created_by ON public.kb_docs(created_by);
CREATE INDEX idx_kb_docs_is_deleted ON public.kb_docs(is_deleted) WHERE is_deleted = false;

-- Comments
COMMENT ON TABLE public.kb_docs IS 'Document metadata with S3 storage and processing status';
COMMENT ON COLUMN public.kb_docs.s3_key IS 'S3 object key: {org_id}/{workspace_id}/{kb_id}/{doc_id}/{filename}';
COMMENT ON COLUMN public.kb_docs.status IS 'Processing status: pending, processing, indexed, failed';
```

---

## 2.3 Migration: `003-kb-chunks.sql`

**Purpose:** Create RAG chunks table with pgvector embeddings.

```sql
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
CREATE INDEX idx_kb_chunks_kb_id ON public.kb_chunks(kb_id);
CREATE INDEX idx_kb_chunks_document_id ON public.kb_chunks(document_id);
CREATE INDEX idx_kb_chunks_chunk_index ON public.kb_chunks(document_id, chunk_index);

-- pgvector index for similarity search (HNSW for better out-of-box performance)
CREATE INDEX idx_kb_chunks_embedding ON public.kb_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Comments
COMMENT ON TABLE public.kb_chunks IS 'RAG text chunks with pgvector embeddings for semantic search';
COMMENT ON COLUMN public.kb_chunks.embedding IS 'Vector embedding (1024 dims for Bedrock Titan V2)';
COMMENT ON COLUMN public.kb_chunks.embedding_model IS 'Model used: amazon.titan-embed-text-v2:0, text-embedding-ada-002, etc.';
```

---

## 2.4 Migration: `004-kb-access-sys.sql`

**Purpose:** Create system KB org association table.

```sql
-- ========================================
-- Knowledge Base Module Schema
-- Migration: 004-kb-access-sys.sql
-- Created: January 14, 2026
-- ========================================

-- Table: kb_access_sys
CREATE TABLE IF NOT EXISTS public.kb_access_sys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One association per KB-org pair
    CONSTRAINT kb_access_sys_unique UNIQUE (knowledge_base_id, org_id)
);

-- Indexes
CREATE INDEX idx_kb_access_sys_kb_id ON public.kb_access_sys(knowledge_base_id);
CREATE INDEX idx_kb_access_sys_org_id ON public.kb_access_sys(org_id);
CREATE INDEX idx_kb_access_sys_is_enabled ON public.kb_access_sys(is_enabled) WHERE is_enabled = true;

-- Comments
COMMENT ON TABLE public.kb_access_sys IS 'Associates system KBs with organizations';
COMMENT ON COLUMN public.kb_access_sys.is_enabled IS 'Platform admin can enable/disable system KB for specific orgs';
```

---

## 2.5 Migration: `005-kb-access-orgs.sql`

**Purpose:** Create org-level KB enablement table (Step 2 of 4-level inheritance chain).

```sql
-- ========================================
-- Knowledge Base Module Schema
-- Migration: 005-kb-access-orgs.sql
-- Created: January 14, 2026
-- ========================================

-- Table: kb_access_orgs
-- Org admin enables KBs at org level - required for org members to use the KB
CREATE TABLE IF NOT EXISTS public.kb_access_orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One enablement per KB-org pair
    CONSTRAINT kb_access_orgs_unique UNIQUE (knowledge_base_id, org_id)
);

-- Indexes
CREATE INDEX idx_kb_access_orgs_kb_id ON public.kb_access_orgs(knowledge_base_id);
CREATE INDEX idx_kb_access_orgs_org_id ON public.kb_access_orgs(org_id);
CREATE INDEX idx_kb_access_orgs_is_enabled ON public.kb_access_orgs(is_enabled) WHERE is_enabled = true;

-- Comments
COMMENT ON TABLE public.kb_access_orgs IS 'Org-level KB enablement (Step 2: org admin enables KB for org members)';
COMMENT ON COLUMN public.kb_access_orgs.is_enabled IS 'Org admin can enable/disable KBs for their organization';
```

---

## 2.6 Migration: `006-kb-access-ws.sql`

**Purpose:** Create workspace-level KB enablement table (Step 3 of 4-level inheritance chain).

```sql
-- ========================================
-- Knowledge Base Module Schema
-- Migration: 006-kb-access-ws.sql
-- Created: January 14, 2026
-- ========================================

-- Table: kb_access_ws
-- Workspace admin enables KBs for workspace-associated chats
CREATE TABLE IF NOT EXISTS public.kb_access_ws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One enablement per KB-workspace pair
    CONSTRAINT kb_access_ws_unique UNIQUE (knowledge_base_id, workspace_id)
);

-- Indexes
CREATE INDEX idx_kb_access_ws_kb_id ON public.kb_access_ws(knowledge_base_id);
CREATE INDEX idx_kb_access_ws_workspace_id ON public.kb_access_ws(workspace_id);
CREATE INDEX idx_kb_access_ws_is_enabled ON public.kb_access_ws(is_enabled) WHERE is_enabled = true;

-- Comments
COMMENT ON TABLE public.kb_access_ws IS 'Workspace-level KB enablement (Step 3: workspace admin enables KB for workspace chats)';
COMMENT ON COLUMN public.kb_access_ws.is_enabled IS 'Workspace admin can enable/disable KBs for their workspace';
```

---

## 2.7 Migration: `007-kb-access-chats.sql`

**Purpose:** Create chat KB toggle tracking table (Step 4 of 4-level inheritance chain).

```sql
-- ========================================
-- Knowledge Base Module Schema
-- Migration: 007-kb-access-chats.sql
-- Created: January 14, 2026
-- ========================================

-- Table: kb_access_chats
CREATE TABLE IF NOT EXISTS public.kb_access_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    chat_session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_override BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One toggle per KB-chat pair
    CONSTRAINT kb_access_chats_unique UNIQUE (knowledge_base_id, chat_session_id)
);

-- Indexes
CREATE INDEX idx_kb_access_chats_kb_id ON public.kb_access_chats(knowledge_base_id);
CREATE INDEX idx_kb_access_chats_chat_id ON public.kb_access_chats(chat_session_id);
CREATE INDEX idx_kb_access_chats_enabled ON public.kb_access_chats(chat_session_id, is_enabled) 
    WHERE is_enabled = true;

-- Comments
COMMENT ON TABLE public.kb_access_chats IS 'Chat-level KB enablement (Step 4: user enables KB for specific chat session)';
COMMENT ON COLUMN public.kb_access_chats.is_override IS 'True if user explicitly toggled (vs. default inheritance)';
```

---

## 2.8 Migration: `008-kb-rpc-functions.sql`

**Purpose:** Create helper functions for KB access control with 4-level inheritance chain support.

```sql
-- ========================================
-- Knowledge Base Module Schema
-- Migration: 008-kb-rpc-functions.sql
-- Created: January 14, 2026
-- ========================================

-- Function: Check if user can access a KB (4-level inheritance check)
CREATE OR REPLACE FUNCTION can_access_kb(p_user_id UUID, p_kb_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_kb RECORD;
    v_has_access BOOLEAN := false;
BEGIN
    -- Get KB details
    SELECT * INTO v_kb FROM public.kb_bases WHERE id = p_kb_id AND is_deleted = false;
    
    IF v_kb IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check access based on scope with 4-level inheritance chain
    CASE v_kb.scope
        WHEN 'sys' THEN
            -- System KB requires ALL 4 levels enabled
            SELECT EXISTS (
                SELECT 1 FROM public.kb_access_sys kas
                JOIN public.kb_access_orgs kao ON kao.knowledge_base_id = kas.knowledge_base_id 
                    AND kao.org_id = kas.org_id
                JOIN public.org_members om ON om.org_id = kas.org_id
                WHERE kas.knowledge_base_id = p_kb_id
                AND kas.is_enabled = true
                AND kao.is_enabled = true
                AND om.user_id = p_user_id
            ) INTO v_has_access;
            
        WHEN 'org' THEN
            -- Org KB: Check user is org member
            SELECT EXISTS (
                SELECT 1 FROM public.org_members
                WHERE org_id = v_kb.org_id AND user_id = p_user_id
            ) INTO v_has_access;
            
        WHEN 'workspace' THEN
            -- Workspace KB: Check if user is workspace member
            SELECT EXISTS (
                SELECT 1 FROM public.ws_members
                WHERE ws_id = v_kb.workspace_id AND user_id = p_user_id
            ) INTO v_has_access;
            
        WHEN 'chat' THEN
            -- Chat KB: Check if user is chat participant
            SELECT EXISTS (
                SELECT 1 FROM public.chat_participants
                WHERE chat_session_id = v_kb.chat_session_id AND user_id = p_user_id
            ) INTO v_has_access;
    END CASE;
    
    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can upload to a KB
CREATE OR REPLACE FUNCTION can_upload_to_kb(p_user_id UUID, p_kb_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_kb RECORD;
    v_config JSONB;
    v_who_can_upload TEXT;
    v_has_permission BOOLEAN := false;
BEGIN
    IF NOT can_access_kb(p_user_id, p_kb_id) THEN
        RETURN false;
    END IF;
    
    SELECT * INTO v_kb FROM public.kb_bases WHERE id = p_kb_id AND is_deleted = false;
    v_config := v_kb.config;
    v_who_can_upload := COALESCE(v_config->>'whoCanUpload', 'all_members');
    
    CASE v_kb.scope
        WHEN 'sys' THEN
            SELECT EXISTS (
                SELECT 1 FROM public.user_profiles
                WHERE user_id = p_user_id AND sys_role = 'platform_admin'
            ) INTO v_has_permission;
            
        WHEN 'org' THEN
            IF v_who_can_upload = 'admin' THEN
                SELECT EXISTS (
                    SELECT 1 FROM public.org_members
                    WHERE org_id = v_kb.org_id 
                    AND user_id = p_user_id 
                    AND org_role IN ('org_owner', 'org_admin')
                ) INTO v_has_permission;
            ELSE
                v_has_permission := true;
            END IF;
            
        WHEN 'workspace' THEN
            IF v_who_can_upload = 'admin' THEN
                SELECT EXISTS (
                    SELECT 1 FROM public.ws_members
                    WHERE ws_id = v_kb.workspace_id 
                    AND user_id = p_user_id 
                    AND ws_role IN ('ws_owner', 'ws_admin')
                ) INTO v_has_permission;
            ELSE
                v_has_permission := true;
            END IF;
            
        WHEN 'chat' THEN
            v_has_permission := true;
    END CASE;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get accessible KBs for a workspace
CREATE OR REPLACE FUNCTION get_accessible_kbs_for_workspace(p_user_id UUID, p_workspace_id UUID)
RETURNS TABLE (
    kb_id UUID,
    kb_name VARCHAR(255),
    kb_scope VARCHAR(50),
    is_enabled BOOLEAN,
    source TEXT
) AS $$
DECLARE
    v_workspace RECORD;
BEGIN
    SELECT * INTO v_workspace FROM public.workspaces WHERE id = p_workspace_id;
    
    -- Return workspace's own KB
    RETURN QUERY
    SELECT kb.id, kb.name, kb.scope, kb.is_enabled, 'workspace'::TEXT
    FROM public.kb_bases kb
    WHERE kb.workspace_id = p_workspace_id
    AND kb.scope = 'workspace'
    AND kb.is_deleted = false;
    
    -- Return org KBs enabled at workspace level
    RETURN QUERY
    SELECT kb.id, kb.name, kb.scope, kaw.is_enabled, 'org'::TEXT
    FROM public.kb_bases kb
    JOIN public.kb_access_ws kaw ON kaw.knowledge_base_id = kb.id AND kaw.workspace_id = p_workspace_id
    WHERE kb.org_id = v_workspace.org_id
    AND kb.scope = 'org'
    AND kb.is_deleted = false
    AND kb.is_enabled = true
    AND kaw.is_enabled = true;
    
    -- Return system KBs enabled through full inheritance chain
    RETURN QUERY
    SELECT kb.id, kb.name, kb.scope, kaw.is_enabled, 'sys'::TEXT
    FROM public.kb_bases kb
    JOIN public.kb_access_sys kas ON kas.knowledge_base_id = kb.id
    JOIN public.kb_access_orgs kao ON kao.knowledge_base_id = kb.id AND kao.org_id = kas.org_id
    JOIN public.kb_access_ws kaw ON kaw.knowledge_base_id = kb.id AND kaw.workspace_id = p_workspace_id
    WHERE kas.org_id = v_workspace.org_id
    AND kb.scope = 'sys'
    AND kb.is_deleted = false
    AND kb.is_enabled = true
    AND kas.is_enabled = true
    AND kao.is_enabled = true
    AND kaw.is_enabled = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Semantic search across KBs
CREATE OR REPLACE FUNCTION search_kb_chunks(
    p_query_embedding vector(1024),
    p_kb_ids UUID[],
    p_top_k INTEGER DEFAULT 5,
    p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    chunk_id UUID,
    kb_id UUID,
    document_id UUID,
    content TEXT,
    similarity FLOAT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS chunk_id,
        c.kb_id,
        c.document_id,
        c.content,
        (1 - (c.embedding <=> p_query_embedding))::FLOAT AS similarity,
        c.metadata
    FROM public.kb_chunks c
    WHERE c.kb_id = ANY(p_kb_ids)
    AND c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> p_query_embedding)) >= p_similarity_threshold
    ORDER BY c.embedding <=> p_query_embedding
    LIMIT p_top_k;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION can_access_kb IS 'Check if user can access a KB based on scope and 4-level inheritance';
COMMENT ON FUNCTION can_upload_to_kb IS 'Check if user can upload documents to a KB';
COMMENT ON FUNCTION get_accessible_kbs_for_workspace IS 'Get all KBs accessible in a workspace context';
COMMENT ON FUNCTION search_kb_chunks IS 'Semantic search across multiple KBs using pgvector';
```

---

## 2.9 Migration: `009-kb-rls.sql`

**Purpose:** Apply Row Level Security policies to all KB tables.

```sql
-- ========================================
-- Knowledge Base Module Schema
-- Migration: 009-kb-rls.sql
-- Created: January 14, 2026
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.kb_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_access_sys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_access_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_access_ws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_access_chats ENABLE ROW LEVEL SECURITY;

-- ========================================
-- kb_bases Policies
-- ========================================

CREATE POLICY "kb_bases_platform_admin_all" ON public.kb_bases
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND sys_role = 'platform_admin'
    ));

CREATE POLICY "kb_bases_select" ON public.kb_bases
    FOR SELECT TO authenticated
    USING (can_access_kb(auth.uid(), id));

CREATE POLICY "kb_bases_org_admin" ON public.kb_bases
    FOR ALL TO authenticated
    USING (
        scope = 'org' AND
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_id = kb_bases.org_id
            AND user_id = auth.uid()
            AND org_role IN ('org_owner', 'org_admin')
        )
    );

-- ========================================
-- kb_docs Policies
-- ========================================

CREATE POLICY "kb_docs_select" ON public.kb_docs
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.kb_bases kb
        WHERE kb.id = kb_docs.kb_id
        AND can_access_kb(auth.uid(), kb.id)
    ));

CREATE POLICY "kb_docs_insert" ON public.kb_docs
    FOR INSERT TO authenticated
    WITH CHECK (can_upload_to_kb(auth.uid(), kb_id));

-- ========================================
-- kb_access_sys Policies
-- ========================================

CREATE POLICY "kb_access_sys_platform_admin" ON public.kb_access_sys
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND sys_role = 'platform_admin'
    ));

CREATE POLICY "kb_access_sys_select" ON public.kb_access_sys
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = kb_access_sys.org_id
        AND user_id = auth.uid()
    ));

-- ========================================
-- kb_access_orgs Policies
-- ========================================

CREATE POLICY "kb_access_orgs_admin" ON public.kb_access_orgs
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = kb_access_orgs.org_id
        AND user_id = auth.uid()
        AND org_role IN ('org_owner', 'org_admin')
    ));

-- ========================================
-- kb_access_ws Policies
-- ========================================

CREATE POLICY "kb_access_ws_admin" ON public.kb_access_ws
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ws_members
        WHERE ws_id = kb_access_ws.workspace_id
        AND user_id = auth.uid()
        AND ws_role IN ('ws_owner', 'ws_admin')
    ));

-- ========================================
-- kb_access_chats Policies
-- ========================================

CREATE POLICY "kb_access_chats_all" ON public.kb_access_chats
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE chat_session_id = kb_access_chats.chat_session_id
        AND user_id = auth.uid()
    ));
```

---

**Document Version:** 1.0  
**Last Updated:** January 15, 2026
