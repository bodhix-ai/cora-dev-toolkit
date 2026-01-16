# Module-KB Implementation Plan

**Status**: 🔄 IN PROGRESS (Phase 0 ✅, Phase 1 ✅)  
**Priority**: HIGH (Foundation for module-chat and module-wf)  
**Module Type**: Core Module (Tier 2)  
**Template Location**: `templates/_modules-core/module-kb/`  
**Dependencies**: module-access, module-mgmt, module-ws, module-ai (ai_cfg_sys_rag table)  
**Estimated Duration**: 11-16 sessions (~33-48 hours)

**Prerequisites**: ✅ Phase 0 (AI Config Table Migration) COMPLETE - All referenced tables use correct naming  
**Phase 1**: ✅ Foundation & Specification COMPLETE - All 4 spec documents finalized

---

## Executive Summary

Implement a CORA-compliant Knowledge Base module with multi-scope document management, RAG embeddings using pgvector, and simplified UX where regular users only see workspace/chat document upload and KB toggles, while admins manage org/platform KBs via admin pages.

---

## Source Material

**Legacy Location**: `~/code/policy/legacy/pm-app-stack/packages/kb-module/`

**Key Components to Migrate**:
- 3 Lambda functions: kb-base, kb-document, kb-processor
- Multi-scope hierarchy: global → org → workspace → chat
- Frontend: 25+ components, document upload, KB management
- Database: pgvector integration for RAG embeddings

---

## Scope Clarifications

### Four Scopes (Global → Org → Workspace → Chat)

1. **Global (sys)**: Platform-wide KBs managed by platform admins
   - Example: "CORA Best Practices", "Industry Regulations"
   - Visible to all orgs when enabled by platform admin

2. **Org**: Organization-level KBs managed by org admins
   - Example: "Company Policies", "Department Guidelines"
   - Visible to all org members when enabled

3. **Workspace**: Workspace-level KBs (new scope)
   - Auto-created when user uploads first doc to workspace
   - Owned by workspace, accessible to workspace members

4. **Chat**: Chat-level KBs
   - Auto-created when user uploads doc to chat
   - Scoped to individual chat session

### UX Simplification

**Regular Users See:**
- Document upload to workspace/chat (creates KB automatically)
- KB toggle selector (shows KBs enabled by admins)
- NO left navigation for KB management

**Platform/Org Admins See:**
- Admin pages for org/platform KB CRUD
- Enable/disable KBs for users
- Document management for admin-level KBs

---

## Phase 0: Prerequisite - AI Config Table Migration ✅ COMPLETE (Session 127)

**Duration**: 1 session (~6 hours actual)  
**Risk Level**: ⚠️ MEDIUM - AI config functionality  
**Lambda Impact**: `module-ai/ai-config-handler` only  
**Status**: ✅ COMPLETE - Migration executed successfully, zero errors, zero downtime

**Note**: This phase corresponds to **Phase 4** of the [Database Naming Migration Plan](../plans/plan_db-naming-migration.md#phase-4-ai-config-tables--handled-by-module-kb-phase-0).

### Why This Is Required

Module-kb's kb-processor Lambda retrieves embedding configuration via `GET /platform/ai-config/embedding`, which reads from AI config tables. Since both AI config tables (`sys_rag` and `org_prompt_engineering`) are used by the same Lambda (`ai-config-handler`), we migrate BOTH tables together as a prerequisite to module-kb implementation.

This approach:
1. Follows the "touch each Lambda only once" principle
2. Ensures all new module-kb code references correctly-named tables from day one
3. Avoids future migration debt

**Rationale**: Migrating only `sys_rag` would require touching `ai-config-handler` Lambda again later for `org_prompt_engineering`. By doing both now, we complete all AI config table migrations in a single pass.

### 0.1 Tables to Migrate

| Current Name | New Name | Type | Scope |
|--------------|----------|------|-------|
| `sys_rag` | `ai_cfg_sys_rag` | Config | System (Platform) |
| `org_prompt_engineering` | `ai_cfg_org_prompts` | Config | Organization |

**Migration SQL** (`scripts/migrations/20260114_ai_config_tables_migration.sql`):
```sql
-- ============================================================================
-- AI Config Tables Migration (Database Naming Standards - Phase 4)
-- Migrates both AI config tables used by ai-config-handler Lambda
-- ============================================================================

-- 1. Create new tables with correct naming
CREATE TABLE ai_cfg_sys_rag (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    embedding_provider VARCHAR(50) NOT NULL,
    embedding_model VARCHAR(100) NOT NULL,
    embedding_dimension INTEGER NOT NULL DEFAULT 1024,
    embedding_api_key TEXT,
    embedding_endpoint TEXT,
    config JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE ai_cfg_org_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE NOT NULL,
    prompt_type VARCHAR(50) NOT NULL,
    prompt_content TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Copy data from old tables
INSERT INTO ai_cfg_sys_rag 
SELECT * FROM sys_rag;

INSERT INTO ai_cfg_org_prompts 
SELECT * FROM org_prompt_engineering;

-- 3. Update foreign keys (if any - ai_cfg_org_prompts already has FK)
-- ai_cfg_sys_rag has no FKs beyond created_by/updated_by (already defined)

-- 4. Recreate indexes
CREATE INDEX idx_ai_cfg_sys_rag_provider ON ai_cfg_sys_rag(embedding_provider);
CREATE INDEX idx_ai_cfg_sys_rag_enabled ON ai_cfg_sys_rag(is_enabled);

CREATE INDEX idx_ai_cfg_org_prompts_org_id ON ai_cfg_org_prompts(org_id);
CREATE INDEX idx_ai_cfg_org_prompts_type ON ai_cfg_org_prompts(prompt_type);
CREATE INDEX idx_ai_cfg_org_prompts_enabled ON ai_cfg_org_prompts(is_enabled);

-- 5. Recreate RLS policies
ALTER TABLE ai_cfg_sys_rag ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cfg_org_prompts ENABLE ROW LEVEL SECURITY;

-- RLS for ai_cfg_sys_rag
CREATE POLICY "Platform admins can manage RAG config"
    ON ai_cfg_sys_rag
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.sys_role = 'platform_admin'
        )
    );

CREATE POLICY "All authenticated users can view RAG config"
    ON ai_cfg_sys_rag
    FOR SELECT
    TO authenticated
    USING (is_enabled = true);

-- RLS for ai_cfg_org_prompts
CREATE POLICY "Org admins can manage org prompts"
    ON ai_cfg_org_prompts
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM org_members
            WHERE org_members.org_id = ai_cfg_org_prompts.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
        )
    );

CREATE POLICY "Org members can view enabled org prompts"
    ON ai_cfg_org_prompts
    FOR SELECT
    TO authenticated
    USING (
        is_enabled = true
        AND EXISTS (
            SELECT 1 FROM org_members
            WHERE org_members.org_id = ai_cfg_org_prompts.org_id
            AND org_members.user_id = auth.uid()
        )
    );

-- 6. Create backward-compatible views (temporary - remove after 1 week)
CREATE VIEW sys_rag AS SELECT * FROM ai_cfg_sys_rag;
CREATE VIEW org_prompt_engineering AS SELECT * FROM ai_cfg_org_prompts;

-- 7. Add comments documenting migration
COMMENT ON TABLE ai_cfg_sys_rag IS 'RAG embedding configuration (migrated from sys_rag on 2026-01-14)';
COMMENT ON TABLE ai_cfg_org_prompts IS 'Organization prompt engineering config (migrated from org_prompt_engineering on 2026-01-14)';
```

### 0.2 Code Changes

**Lambda:** `templates/_modules-core/module-ai/backend/lambdas/ai-config-handler/lambda_function.py`

Update all SQL queries referencing both tables:
```python
# Before:
# SELECT * FROM sys_rag WHERE is_enabled = true
# SELECT * FROM org_prompt_engineering WHERE org_id = %s

# After:
# SELECT * FROM ai_cfg_sys_rag WHERE is_enabled = true
# SELECT * FROM ai_cfg_org_prompts WHERE org_id = %s
```

**Template Schemas:**
- `templates/_modules-core/module-ai/db/schema/006-sys-rag.sql` → `006-ai-cfg-sys-rag.sql`
  - Update CREATE TABLE statement to use new name
  - Update all index names
  - Update all constraint names
  
- `templates/_modules-core/module-ai/db/schema/007-org-prompt-engineering.sql` → `007-ai-cfg-org-prompts.sql`
  - Update CREATE TABLE statement to use new name
  - Update all index names
  - Update all constraint names

### 0.3 Testing Checklist

- [ ] Create migration SQL file in `scripts/migrations/`
- [ ] Test migration in dev environment
- [ ] Verify data copied correctly (row count match for BOTH tables)
- [ ] Test RAG configuration read via API (`GET /platform/ai-config/embedding`)
- [ ] Test RAG configuration write via API (`PUT /platform/ai-config/embedding`)
- [ ] Test org prompt configuration read via API (`GET /orgs/{orgId}/ai-config/prompts`)
- [ ] Test org prompt configuration write via API (`PUT /orgs/{orgId}/ai-config/prompts`)
- [ ] Verify kb-processor can retrieve embedding config
- [ ] Verify RLS policies work correctly:
  - Platform admins can edit `ai_cfg_sys_rag`
  - All authenticated users can read enabled `ai_cfg_sys_rag`
  - Org admins can edit `ai_cfg_org_prompts` for their org
  - Org members can read enabled `ai_cfg_org_prompts` for their org
- [ ] Confirm backward-compatible views work for BOTH tables
- [ ] Update template schema files (both 006 and 007)
- [ ] Update ai-config-handler Lambda code

### 0.4 Rollback Plan

If issues arise during or after migration:

1. **Immediate Rollback:**
   ```sql
   -- Drop new tables (data still in old tables)
   DROP TABLE IF EXISTS ai_cfg_sys_rag CASCADE;
   DROP TABLE IF EXISTS ai_cfg_org_prompts CASCADE;
   DROP VIEW IF EXISTS sys_rag;
   DROP VIEW IF EXISTS org_prompt_engineering;
   
   -- Revert Lambda code to use old table names
   ```

2. **View Safety Net:**
   - Backward-compatible views (`sys_rag`, `org_prompt_engineering`) ensure old code continues working
   - Keep views active for 1 week post-migration
   - Remove views only after confirming stability

3. **Partial Rollback:**
   - If only one table has issues, can roll back individually
   - Both tables are independent (no FK between them)

### 0.5 Deliverables

- [ ] Migration SQL file created and tested
- [ ] `ai_cfg_sys_rag` table created with correct naming and structure
- [ ] `ai_cfg_org_prompts` table created with correct naming and structure
- [ ] Data migrated from `sys_rag` to `ai_cfg_sys_rag`
- [ ] Data migrated from `org_prompt_engineering` to `ai_cfg_org_prompts`
- [ ] `ai-config-handler` Lambda updated to use new table names (both tables)
- [ ] Template schema files renamed and updated (006 and 007)
- [ ] Backward-compatible views created (both tables)
- [ ] All tests passing
- [ ] Documentation updated in migration plan

**Success Criteria:**
- Zero downtime during migration
- All existing AI config functionality works unchanged (RAG + org prompts)
- New module-kb code references correct table names from start
- Validation passes: `python scripts/validate-db-naming.py` (0 violations for both tables)
- Database Naming Migration Plan Phase 4 marked as complete

---

## Phase 1: Foundation & Specification (Sessions 104-106)

**Rationale**: Migrating only `sys_rag` would require touching `ai-config-handler` Lambda again later for `org_prompt_engineering`. By doing both now, we complete all AI config table migrations in a single pass.

### 0.1 Tables to Migrate

| Current Name | New Name | Type | Scope |
|--------------|----------|------|-------|
| `sys_rag` | `ai_cfg_sys_rag` | Config | System (Platform) |
| `org_prompt_engineering` | `ai_cfg_org_prompts` | Config | Organization |

**Migration SQL** (`scripts/migrations/20260114_ai_config_tables_migration.sql`):
```sql
-- ============================================================================
-- AI Config Tables Migration (Database Naming Standards - Phase 4)
-- Migrates both AI config tables used by ai-config-handler Lambda
-- ============================================================================

-- 1. Create new tables with correct naming
CREATE TABLE ai_cfg_sys_rag (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    embedding_provider VARCHAR(50) NOT NULL,
    embedding_model VARCHAR(100) NOT NULL,
    embedding_dimension INTEGER NOT NULL DEFAULT 1024,
    embedding_api_key TEXT,
    embedding_endpoint TEXT,
    config JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE ai_cfg_org_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE NOT NULL,
    prompt_type VARCHAR(50) NOT NULL,
    prompt_content TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Copy data from old tables
INSERT INTO ai_cfg_sys_rag 
SELECT * FROM sys_rag;

INSERT INTO ai_cfg_org_prompts 
SELECT * FROM org_prompt_engineering;

-- 3. Update foreign keys (if any - ai_cfg_org_prompts already has FK)
-- ai_cfg_sys_rag has no FKs beyond created_by/updated_by (already defined)

-- 4. Recreate indexes
CREATE INDEX idx_ai_cfg_sys_rag_provider ON ai_cfg_sys_rag(embedding_provider);
CREATE INDEX idx_ai_cfg_sys_rag_enabled ON ai_cfg_sys_rag(is_enabled);

CREATE INDEX idx_ai_cfg_org_prompts_org_id ON ai_cfg_org_prompts(org_id);
CREATE INDEX idx_ai_cfg_org_prompts_type ON ai_cfg_org_prompts(prompt_type);
CREATE INDEX idx_ai_cfg_org_prompts_enabled ON ai_cfg_org_prompts(is_enabled);

-- 5. Recreate RLS policies
ALTER TABLE ai_cfg_sys_rag ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cfg_org_prompts ENABLE ROW LEVEL SECURITY;

-- RLS for ai_cfg_sys_rag
CREATE POLICY "Platform admins can manage RAG config"
    ON ai_cfg_sys_rag
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.sys_role = 'platform_admin'
        )
    );

CREATE POLICY "All authenticated users can view RAG config"
    ON ai_cfg_sys_rag
    FOR SELECT
    TO authenticated
    USING (is_enabled = true);

-- RLS for ai_cfg_org_prompts
CREATE POLICY "Org admins can manage org prompts"
    ON ai_cfg_org_prompts
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM org_members
            WHERE org_members.org_id = ai_cfg_org_prompts.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
        )
    );

CREATE POLICY "Org members can view enabled org prompts"
    ON ai_cfg_org_prompts
    FOR SELECT
    TO authenticated
    USING (
        is_enabled = true
        AND EXISTS (
            SELECT 1 FROM org_members
            WHERE org_members.org_id = ai_cfg_org_prompts.org_id
            AND org_members.user_id = auth.uid()
        )
    );

-- 6. Create backward-compatible views (temporary - remove after 1 week)
CREATE VIEW sys_rag AS SELECT * FROM ai_cfg_sys_rag;
CREATE VIEW org_prompt_engineering AS SELECT * FROM ai_cfg_org_prompts;

-- 7. Add comments documenting migration
COMMENT ON TABLE ai_cfg_sys_rag IS 'RAG embedding configuration (migrated from sys_rag on 2026-01-14)';
COMMENT ON TABLE ai_cfg_org_prompts IS 'Organization prompt engineering config (migrated from org_prompt_engineering on 2026-01-14)';
```

### 0.2 Code Changes

**Lambda:** `templates/_modules-core/module-ai/backend/lambdas/ai-config-handler/lambda_function.py`

Update all SQL queries referencing both tables:
```python
# Before:
# SELECT * FROM sys_rag WHERE is_enabled = true
# SELECT * FROM org_prompt_engineering WHERE org_id = %s

# After:
# SELECT * FROM ai_cfg_sys_rag WHERE is_enabled = true
# SELECT * FROM ai_cfg_org_prompts WHERE org_id = %s
```

**Template Schemas:**
- `templates/_modules-core/module-ai/db/schema/006-sys-rag.sql` → `006-ai-cfg-sys-rag.sql`
  - Update CREATE TABLE statement to use new name
  - Update all index names
  - Update all constraint names
  
- `templates/_modules-core/module-ai/db/schema/007-org-prompt-engineering.sql` → `007-ai-cfg-org-prompts.sql`
  - Update CREATE TABLE statement to use new name
  - Update all index names
  - Update all constraint names

### 0.3 Testing Checklist ✅ ALL COMPLETE

- [x] Create migration SQL file in `scripts/migrations/`
- [x] Test migration in dev environment
- [x] Verify data copied correctly (row count match for BOTH tables)
- [x] Test RAG configuration read via API (`GET /platform/ai-config/embedding`)
- [x] Test RAG configuration write via API (`PUT /platform/ai-config/embedding`)
- [x] Test org prompt configuration read via API (`GET /orgs/{orgId}/ai-config`)
- [x] Test org prompt configuration write via API (`PUT /orgs/{orgId}/ai-config`)
- [x] Verify kb-processor can retrieve embedding config
- [x] Verify RLS policies work correctly:
  - Platform admins can edit `ai_cfg_sys_rag`
  - All authenticated users can read enabled `ai_cfg_sys_rag`
  - Org admins can edit `ai_cfg_org_prompts` for their org
  - Org members can read enabled `ai_cfg_org_prompts` for their org
- [x] Confirm backward-compatible views work for BOTH tables
- [x] Update template schema files (both 006 and 007)
- [x] Update ai-config-handler Lambda code
- [x] **Frontend validation - ALL fields display correctly:**
  - Policy Mission Type, Custom Prompts, Citation Config, Response Config
  - Audit columns (`updated_by`, `created_by`) populating correctly
  - Zero errors in browser console
  - Zero TypeScript compilation errors

### 0.4 Rollback Plan

If issues arise during or after migration:

1. **Immediate Rollback:**
   ```sql
   -- Drop new tables (data still in old tables)
   DROP TABLE IF EXISTS ai_cfg_sys_rag CASCADE;
   DROP TABLE IF EXISTS ai_cfg_org_prompts CASCADE;
   DROP VIEW IF EXISTS sys_rag;
   DROP VIEW IF EXISTS org_prompt_engineering;
   
   -- Revert Lambda code to use old table names
   ```

2. **View Safety Net:**
   - Backward-compatible views (`sys_rag`, `org_prompt_engineering`) ensure old code continues working
   - Keep views active for 1 week post-migration
   - Remove views only after confirming stability

3. **Partial Rollback:**
   - If only one table has issues, can roll back individually
   - Both tables are independent (no FK between them)

### 0.5 Deliverables ✅ ALL COMPLETE

- [x] Migration SQL file created and tested
- [x] `ai_cfg_sys_rag` table created with correct naming and structure
- [x] `ai_cfg_org_prompts` table created with correct naming and structure
- [x] Data migrated from `sys_rag` to `ai_cfg_sys_rag`
- [x] Data migrated from `org_prompt_engineering` to `ai_cfg_org_prompts`
- [x] `ai-config-handler` Lambda updated to use new table names (both tables)
- [x] Template schema files renamed and updated (006 and 007)
- [x] Backward-compatible views created (both tables)
- [x] Frontend component fixed: `OrgAIConfigTab.tsx` data access bug resolved
- [x] All backend tests passing
- [x] All frontend validation passing (UI displays all fields correctly)
- [x] Documentation updated in migration plan

**Success Criteria:** ✅ ALL MET
- ✅ Zero downtime during migration
- ✅ All existing AI config functionality works unchanged (RAG + org prompts)
- ✅ New module-kb code references correct table names from start
- ✅ Validation passes: `python scripts/validate-db-naming.py` (0 violations for both tables)
- ✅ Database Naming Migration Plan Phase 4 marked as complete
- ✅ **Frontend validation complete:** All RAG config fields display correctly
- ✅ **Audit columns working:** `updated_by`, `created_by` populating correctly
- ✅ **End-to-end testing complete:** Backend API + Frontend UI fully validated

**Git Commit:** `95bf750` - feat(module-kb): Complete Phase 0 - AI Config Table Migration  
**Branch:** `feature/module-kb-implementation`  
**Files Changed:** 8 files, 952 insertions, 28 deletions (includes OrgAIConfigTab.tsx fix)

**Frontend Fix:** Session 127 (same day) - Fixed `OrgAIConfigTab.tsx` data access bug
- Component was accessing `response.policyMissionType` instead of `response.data.policyMissionType`
- Fixed in template + synced to test project
- User validated: All fields display correctly, audit columns working

---

## Phase 1: Foundation & Specification ✅ COMPLETE (Session 128)

**Duration**: 1 session (~3 hours actual)
**Status**: ✅ COMPLETE - All 4 specification documents finalized

### 1.1 Module Specification Documents

**Location**: `docs/specifications/module-kb/`

- [x] Create specification directory structure
- [x] Write `MODULE-KB-SPEC.md` (parent specification):
  - Overview and purpose
  - Multi-scope architecture (global/org/workspace/chat)
  - Dependencies: module-ws, module-access, module-mgmt
  - Integration points with module-chat, module-wf
- [x] Write `MODULE-KB-TECHNICAL-SPEC.md`:
  - 7 entities with 4-level access control model
  - 9 database migrations (001-009)
  - Lambda functions (kb-base, kb-document, kb-processor)
  - API endpoints with route docstrings
  - S3 bucket structure for documents
  - SQS queue for async processing
  - pgvector embedding storage with HNSW indexing
- [x] Write `MODULE-KB-USER-UX-SPEC.md`:
  - User personas and flows
  - Document upload to workspace/chat
  - KB toggle selector (shows available KBs)
  - Document preview and management
  - Component library specifications
- [x] Write `MODULE-KB-ADMIN-UX-SPEC.md`:
  - **Platform Admin Global KB Management**:
    - Admin page: `/admin/sys/kb` (full CRUD for global KBs)
    - Create/edit/delete global KBs
    - Upload documents to global KBs
    - Associate global KBs with orgs (enable/disable per org)
    - View org usage analytics
    - Platform admin card: Quick stats + "Manage Global KBs" link
  - **Org Admin KB Management**:
    - Admin page: `/admin/org/kb` (full CRUD for org KBs)
    - Create/edit/delete org KBs
    - Upload documents to org KBs
    - Enable/disable KBs for workspace use
    - View org KB usage stats (which workspaces/users accessing)
    - Org admin card: Quick stats + "Manage Org KBs" link
  - **Admin Workflows**:
    - Bulk document upload (CSV import for metadata + S3 upload)
    - KB templates (pre-configured KBs with common docs)
    - Document approval workflow (review before indexing)
    - Access audit logs (who accessed which KB/document)
  - Platform admin global KB management pages
  - Org admin KB management pages  
  - Admin card specifications for dashboards
  - Component library for admin UIs
  - Interaction patterns for CRUD operations
  - Admin testing requirements

### 1.2 Data Model Design ✅ COMPLETE

- [x] Design CORA-compliant database schema with 7 entities:
  - `kb_bases` - KB metadata (scope, org_id, workspace_id, chat_session_id)
  - `kb_docs` - Document metadata (s3_key, status) - NOTE: uses `kb_docs` not `kb_documents`
  - `kb_chunks` - RAG chunks with pgvector embeddings (1024 dims default)
  - `kb_access_global` - Step 1: Sys admin shares global KB with org
  - `kb_access_orgs` - Step 2: Org admin enables KB for org
  - `kb_access_ws` - Step 3: Workspace admin enables KB for workspace
  - `kb_access_chats` - Step 4: User selects KB for chat
- [x] Map legacy tables to CORA tables
- [x] Define RLS policies for multi-tenant access (9 migrations total)
- [x] Document pgvector integration strategy (HNSW indexing)
- [x] Define S3 bucket structure: `{org_id}/{workspace_id}/{kb_id}/{doc_id}/{filename}`

### 1.3 API Endpoint Design ✅ COMPLETE

- [x] Define Lambda route structure with docstrings
- [x] Map legacy endpoints to CORA patterns
- [x] Document camelCase API response format
- [x] Define presigned URL flow for S3 uploads
- [x] Define RAG search endpoint (`POST /kb/search`)

### 1.4 4-Level Access Control Model ✅ COMPLETE

Documented cascading inheritance chain:
- Global KB: Requires all 4 levels enabled (Steps 1→2→3→4)
- Org KB: Requires levels 2-4 (no sys admin sharing)
- Workspace KB: Requires levels 3-4 (no org admin sharing)
- Chat KB: User controls directly (Step 4 only)

**Deliverables** ✅ ALL COMPLETE:
- `MODULE-KB-SPEC.md` - Parent overview (~400 lines)
- `MODULE-KB-TECHNICAL-SPEC.md` - Complete technical spec (~2700 lines)
- `MODULE-KB-USER-UX-SPEC.md` - User flows and components (~1200 lines)
- `MODULE-KB-ADMIN-UX-SPEC.md` - Admin pages and cards (~1000 lines)
- Total: ~5300 lines of specification

**Completed:** January 14, 2026 (Session 128)

---

## Phase 2: Database Schema (Sessions 107-108)

**Duration**: 2 sessions (~6-8 hours)

### 2.1 Core Tables

- [ ] Create `db/schema/001-kb-base.sql`:
  ```sql
  CREATE TABLE kb_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('global', 'org', 'workspace', 'chat')),
    org_id UUID REFERENCES orgs(id),
    workspace_id UUID REFERENCES workspaces(id),
    chat_session_id UUID REFERENCES chat_sessions(id),
    config JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
  );
  ```

- [ ] Create `db/schema/002-kb-document.sql`:
  ```sql
  CREATE TABLE kb_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kb_id UUID REFERENCES kb_bases(id) ON DELETE CASCADE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    s3_key VARCHAR(512) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'indexed', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] Create `db/schema/003-kb-chunk.sql` (with pgvector):
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  
  CREATE TABLE kb_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kb_id UUID REFERENCES kb_bases(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES kb_documents(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1024),  -- Default: AWS Bedrock Titan Text Embeddings V2 (1024 dimensions)
    chunk_index INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding_model VARCHAR(100),  -- Track which model generated this embedding
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  CREATE INDEX kb_chunks_embedding_idx ON kb_chunks USING ivfflat (embedding vector_cosine_ops);
  CREATE INDEX kb_chunks_kb_id_idx ON kb_chunks(kb_id);
  CREATE INDEX kb_chunks_document_id_idx ON kb_chunks(document_id);
  ```

### 2.2 Access Control Tables

- [ ] Create `db/schema/004-kb-access-global.sql`:
  ```sql
  CREATE TABLE kb_access_global (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_base_id UUID REFERENCES kb_bases(id) ON DELETE CASCADE NOT NULL,
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(knowledge_base_id, org_id)
  );
  ```

- [ ] Create `db/schema/005-kb-access-chat.sql`:
  ```sql
  CREATE TABLE kb_access_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_base_id UUID REFERENCES kb_bases(id) ON DELETE CASCADE NOT NULL,
    chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    is_override BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(knowledge_base_id, chat_session_id)
  );
  ```

### 2.3 RPC Functions

- [ ] Create `db/schema/006-kb-rpc-functions.sql`:
  - `is_kb_owner(user_id, kb_id)` → boolean
  - `can_upload_to_kb(user_id, kb_id)` → boolean
  - `can_access_kb(user_id, kb_id)` → boolean
  - `get_accessible_kbs_for_workspace(user_id, workspace_id)` → kb[]
  - `get_accessible_kbs_for_chat(user_id, chat_id)` → kb[]

### 2.4 RLS Policies

- [ ] Create `db/schema/007-apply-rls.sql`:
  - Enable RLS on all KB tables
  - Policies for global/org/workspace/chat scopes
  - Admin bypass policies
  - Read/write policies based on scope

**Deliverables**:
- Complete database schema
- RPC functions for access control
- RLS policies

---

## Phase 3: Backend - KB Base Lambda (Sessions 109-110)

**Duration**: 2 sessions (~6-8 hours)

### 3.1 Lambda Structure

**Location**: `backend/lambdas/kb-base/`

- [ ] Create `lambda_function.py` with route docstring:
  ```python
  """
  KB Base Lambda - Knowledge Base CRUD Operations
  
  Routes - Workspace Scoped:
  - GET /workspaces/{workspaceId}/kb - Get workspace KB
  - POST /workspaces/{workspaceId}/kb - Create workspace KB (auto)
  - PATCH /workspaces/{workspaceId}/kb/{kbId} - Update KB settings
  - GET /workspaces/{workspaceId}/available-kbs - List toggleable KBs
  - POST /workspaces/{workspaceId}/kbs/{kbId}/toggle - Toggle KB access
  
  Routes - Chat Scoped:
  - GET /chats/{chatId}/kb - Get chat KB
  - POST /chats/{chatId}/kb - Create chat KB (auto)
  - GET /chats/{chatId}/available-kbs - List toggleable KBs
  - POST /chats/{chatId}/kbs/{kbId}/toggle - Toggle KB access
  
  Routes - Org Admin:
  - GET /admin/org/kbs - List org KBs
  - POST /admin/org/kbs - Create org KB
  - GET /admin/org/kbs/{kbId} - Get org KB
  - PATCH /admin/org/kbs/{kbId} - Update org KB
  - DELETE /admin/org/kbs/{kbId} - Delete org KB
  
  Routes - Platform Admin:
  - GET /admin/sys/kbs - List global KBs
  - POST /admin/sys/kbs - Create global KB
  - GET /admin/sys/kbs/{kbId} - Get global KB
  - PATCH /admin/sys/kbs/{kbId} - Update global KB
  - DELETE /admin/sys/kbs/{kbId} - Delete global KB
  - POST /admin/sys/kbs/{kbId}/orgs - Associate KB with org
  - DELETE /admin/sys/kbs/{kbId}/orgs/{orgId} - Remove org association
  """
  ```

### 3.2 Core Handlers

- [ ] Implement workspace scope handlers:
  - `handle_get_workspace_kb()` - Get or auto-create
  - `handle_list_available_kbs_for_workspace()` - Show toggleable KBs
  - `handle_toggle_kb_for_workspace()` - Enable/disable KB access
  
- [ ] Implement chat scope handlers:
  - `handle_get_chat_kb()` - Get or auto-create
  - `handle_list_available_kbs_for_chat()` - Show toggleable KBs
  - `handle_toggle_kb_for_chat()` - Enable/disable KB access

- [ ] Implement org admin handlers:
  - `handle_list_org_kbs()` - List org-level KBs
  - `handle_create_org_kb()` - Create new org KB
  - `handle_update_org_kb()` - Update org KB
  - `handle_delete_org_kb()` - Soft delete org KB

- [ ] Implement platform admin handlers:
  - `handle_list_global_kbs()` - List all global KBs
  - `handle_create_global_kb()` - Create new global KB
  - `handle_associate_global_kb_org()` - Enable global KB for org
  - `handle_remove_global_kb_org()` - Disable global KB for org

### 3.3 Helper Functions

- [ ] `get_or_create_workspace_kb(user_id, workspace_id)` - Auto-create on first doc
- [ ] `get_or_create_chat_kb(user_id, chat_id)` - Auto-create on first doc
- [ ] `check_kb_access(user_id, kb_id, required_permission)` - Unified auth check
- [ ] `enrich_kb_stats(kbs)` - Add document/chunk counts

### 3.4 Configuration

- [ ] Create `requirements.txt`:
  ```
  boto3==1.34.0
  psycopg2-binary==2.9.9
  requests==2.31.0
  ```
- [ ] Create `Dockerfile` for local testing
- [ ] Update `backend/build.sh` to include kb-base

**Deliverables**:
- Complete kb-base Lambda function
- CORA-compliant route docstrings
- Multi-scope access control

---

## Phase 4: Backend - KB Document Lambda (Sessions 111-112)

**Duration**: 2 sessions (~6-8 hours)

### 4.1 Lambda Structure

**Location**: `backend/lambdas/kb-document/`

- [ ] Create `lambda_function.py` with route docstring:
  ```python
  """
  KB Document Lambda - Document Upload/Download Operations
  
  Routes - Workspace Scoped:
  - GET /workspaces/{workspaceId}/kb/documents - List documents
  - POST /workspaces/{workspaceId}/kb/documents - Get presigned upload URL
  - GET /workspaces/{workspaceId}/kb/documents/{docId} - Get document metadata
  - DELETE /workspaces/{workspaceId}/kb/documents/{docId} - Delete document
  - GET /workspaces/{workspaceId}/kb/documents/{docId}/download - Get presigned download URL
  
  Routes - Chat Scoped:
  - GET /chats/{chatId}/kb/documents - List documents
  - POST /chats/{chatId}/kb/documents - Get presigned upload URL
  - GET /chats/{chatId}/kb/documents/{docId} - Get document metadata
  - DELETE /chats/{chatId}/kb/documents/{docId} - Delete document
  
  Routes - Org Admin:
  - POST /admin/org/kbs/{kbId}/documents - Upload to org KB
  - GET /admin/org/kbs/{kbId}/documents - List org KB documents
  - DELETE /admin/org/kbs/{kbId}/documents/{docId} - Delete from org KB
  
  Routes - Platform Admin:
  - POST /admin/sys/kbs/{kbId}/documents - Upload to global KB
  - GET /admin/sys/kbs/{kbId}/documents - List global KB documents
  """
  ```

### 4.2 Core Handlers

- [ ] Implement presigned URL generation:
  - `handle_get_upload_url()` - Generate S3 presigned PUT URL
  - `handle_get_download_url()` - Generate S3 presigned GET URL
  - S3 key structure: `{org_id}/{workspace_id}/{kb_id}/{doc_id}/{filename}`

- [ ] Implement document CRUD:
  - `handle_list_documents()` - List documents with pagination
  - `handle_get_document()` - Get document metadata
  - `handle_delete_document()` - Soft delete document, queue cleanup

- [ ] Implement document callback:
  - `handle_upload_complete()` - Called after S3 upload complete
  - Create kb_document record
  - Publish to SQS for processing

### 4.3 S3 Integration

- [ ] Configure S3 bucket with proper CORS
- [ ] Implement presigned URL generation with expiration (15 min)
- [ ] Add validation for file types (PDF, DOCX, TXT, MD)
- [ ] Add file size limits (50 MB per file)

### 4.4 SQS Integration

- [ ] Publish message to `{project}-kb-processor-queue` after upload:
  ```json
  {
    "document_id": "uuid",
    "kb_id": "uuid",
    "s3_bucket": "bucket-name",
    "s3_key": "path/to/doc",
    "action": "index"
  }
  ```

**Deliverables**:
- Complete kb-document Lambda
- S3 presigned URL integration
- SQS message publishing

---

## Phase 5: Backend - KB Processor Lambda (Sessions 113-114)

**Duration**: 2 sessions (~6-8 hours)

### 5.1 Lambda Structure

**Location**: `backend/lambdas/kb-processor/`

- [ ] Create `lambda_function.py` for async processing:
  - Triggered by SQS messages
  - Processes one document at a time
  - Updates kb_document status (processing → indexed/failed)

### 5.2 Document Processing Pipeline

- [ ] Implement document parsing:
  - `parse_pdf()` - Extract text from PDF using pypdf or PyMuPDF
  - `parse_docx()` - Extract text from DOCX using python-docx
  - `parse_txt()` - Read plain text files
  - `parse_markdown()` - Read markdown files

- [ ] Implement text chunking:
  - `chunk_text(text, chunk_size=1000, overlap=200)` - Split into chunks
  - Preserve sentence boundaries
  - Add metadata (page numbers, headings)

- [ ] Implement embedding generation:
  - `get_embedding_config()` - Call module-ai for platform embedding config
  - `generate_embeddings(chunks, provider, model, api_key)` - Dynamic provider support
  - Support OpenAI (ada-002, text-embedding-3), Azure, Bedrock, Vertex
  - Batch processing (provider-specific batch limits)
  - Rate limiting and retry logic (provider-specific)

- [ ] Implement storage:
  - Store chunks in `kb_chunks` table with embeddings
  - Update `kb_document` status to "indexed"
  - Log processing metrics

### 5.3 Error Handling

- [ ] Handle parsing errors (corrupt files, unsupported formats)
- [ ] Handle API rate limits (retry with exponential backoff)
- [ ] Store error messages in `kb_document.error_message`
- [ ] Dead letter queue for failed messages

### 5.4 Configuration

- [ ] Create `requirements.txt`:
  ```
  boto3==1.34.0
  psycopg2-binary==2.9.9
  openai==1.10.0
  pypdf==4.0.0
  python-docx==1.1.0
  tiktoken==0.5.2
  ```

**Deliverables**:
- Complete kb-processor Lambda
- Document parsing pipeline
- pgvector embedding storage

---

## Phase 6: Infrastructure (Session 115)

**Duration**: 1 session (~3-4 hours)

### 6.1 Terraform Resources

**Location**: `infrastructure/`

- [ ] Create `main.tf`:
  - 3 Lambda functions (kb-base, kb-document, kb-processor)
  - S3 bucket for documents with CORS
  - SQS queue for processing
  - API Gateway routes
  - Lambda execution roles with proper permissions

- [ ] Create `variables.tf`:
  ```hcl
  variable "project_name" {}
  variable "environment" {}
  variable "org_common_layer_arn" {}
  variable "supabase_url" {}
  variable "supabase_anon_key" {}
  variable "supabase_service_role_key" {}
  variable "openai_api_key" {}
  ```

- [ ] Create `outputs.tf`:
  ```hcl
  output "kb_api_endpoint" {}
  output "kb_s3_bucket" {}
  output "kb_processor_queue_url" {}
  ```

- [ ] Create `versions.tf` with provider constraints

### 6.2 Lambda Configuration

- [ ] kb-base: Memory 512 MB, Timeout 30s
- [ ] kb-document: Memory 256 MB, Timeout 30s
- [ ] kb-processor: Memory 1024 MB, Timeout 300s (5 min)
- [ ] All use `source_code_hash` for code change detection
- [ ] All use `lifecycle { create_before_destroy = true }`

### 6.3 IAM Policies

- [ ] kb-base: Supabase access (via secrets), CloudWatch logs
- [ ] kb-document: S3 read/write, SQS publish, Supabase, CloudWatch
- [ ] kb-processor: S3 read, SQS consume, Supabase, OpenAI (via secrets), CloudWatch

**Deliverables**:
- Complete Terraform infrastructure
- Proper IAM permissions
- S3 and SQS resources

---

## Phase 7: Frontend - Types & API (Session 116)

**Duration**: 1 session (~3-4 hours)

### 7.1 TypeScript Types

**Location**: `frontend/types/index.ts`

- [ ] Define KB types (camelCase):
  ```typescript
  export interface KnowledgeBase {
    id: string;
    name: string;
    description?: string;
    scope: 'global' | 'org' | 'workspace' | 'chat';
    orgId?: string;
    workspaceId?: string;
    chatSessionId?: string;
    config: KBConfig;
    isEnabled: boolean;
    stats: KBStats;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy?: string;
  }
  
  export interface KBConfig {
    whoCanUpload: 'admin' | 'all_members';
    autoIndex: boolean;
  }
  
  export interface KBStats {
    documentCount: number;
    chunkCount: number;
    totalSize: number;
  }
  
  export interface KBDocument {
    id: string;
    kbId: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    status: 'pending' | 'processing' | 'indexed' | 'failed';
    errorMessage?: string;
    createdAt: string;
    createdBy: string;
  }
  
  export interface KBToggleOption {
    kb: KnowledgeBase;
    isEnabled: boolean;
    source: 'global' | 'org' | 'workspace';
  }
  ```

### 7.2 API Client

**Location**: `frontend/lib/api.ts`

- [ ] Implement KB API functions:
  ```typescript
  // Workspace KB
  export async function getWorkspaceKB(workspaceId: string): Promise<KnowledgeBase | null>
  export async function listAvailableKBsForWorkspace(workspaceId: string): Promise<KBToggleOption[]>
  export async function toggleKBForWorkspace(workspaceId: string, kbId: string, enabled: boolean): Promise<void>
  
  // Chat KB
  export async function getChatKB(chatId: string): Promise<KnowledgeBase | null>
  export async function listAvailableKBsForChat(chatId: string): Promise<KBToggleOption[]>
  
  // Documents
  export async function listKBDocuments(kbId: string): Promise<KBDocument[]>
  export async function getUploadUrl(kbId: string, filename: string, fileSize: number): Promise<{uploadUrl: string, documentId: string}>
  export async function markUploadComplete(documentId: string): Promise<void>
  export async function deleteDocument(documentId: string): Promise<void>
  
  // Admin APIs
  export async function listOrgKBs(orgId: string): Promise<KnowledgeBase[]>
  export async function createOrgKB(orgId: string, name: string, description?: string): Promise<KnowledgeBase>
  ```

**Deliverables**:
- Complete TypeScript types
- API client functions

---

## Phase 8: Frontend - Hooks (Sessions 117-118)

**Duration**: 2 sessions (~6-8 hours)

### 8.1 KB Management Hooks

**Location**: `frontend/hooks/`

- [ ] Create `useWorkspaceKB.ts`:
  ```typescript
  export function useWorkspaceKB(workspaceId: string) {
    const [kb, setKb] = useState<KnowledgeBase | null>(null);
    const [availableKBs, setAvailableKBs] = useState<KBToggleOption[]>([]);
    const [loading, setLoading] = useState(true);
    
    const toggleKB = async (kbId: string, enabled: boolean) => { /* ... */ };
    
    return { kb, availableKBs, loading, toggleKB, refresh };
  }
  ```

- [ ] Create `useChatKB.ts` - Similar to workspace KB hook

- [ ] Create `useKBDocuments.ts`:
  ```typescript
  export function useKBDocuments(kbId: string | null) {
    const [documents, setDocuments] = useState<KBDocument[]>([]);
    const [loading, setLoading] = useState(false);
    
    const uploadDocument = async (file: File) => { /* presigned URL flow */ };
    const deleteDocument = async (docId: string) => { /* soft delete */ };
    
    return { documents, loading, uploadDocument, deleteDocument, refresh };
  }
  ```

### 8.2 Admin Hooks

- [ ] Create `useOrgKBs.ts`:
  ```typescript
  export function useOrgKBs(orgId: string) {
    const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
    const [loading, setLoading] = useState(true);
    
    const createKB = async (name: string, description?: string) => { /* ... */ };
    const updateKB = async (kbId: string, data: Partial<KnowledgeBase>) => { /* ... */ };
    const deleteKB = async (kbId: string) => { /* ... */ };
    
    return { kbs, loading, createKB, updateKB, deleteKB, refresh };
  }
  ```

- [ ] Create `useGlobalKBs.ts` - Similar for platform admin

**Deliverables**:
- Complete hooks for KB management
- Document upload hooks
- Admin hooks

---

## Phase 9: Frontend - Components (Sessions 119-121)

**Duration**: 3 sessions (~9-12 hours)

### 9.1 KB Toggle Selector

**Location**: `frontend/components/`

- [ ] Create `KBToggleSelector.tsx`:
  - Shows available KBs (org + global)
  - Toggle switches to enable/disable
  - Grouped by source (org, global)
  - Badge shows enabled state
  - Admin-only indicator for restricted KBs

### 9.2 Document Upload

- [ ] Create `DocumentUploadZone.tsx`:
  - Drag-and-drop file upload
  - Multiple file support
  - Progress bars per file
  - File validation (type, size)
  - Auto-refresh KB stats after upload

- [ ] Create `DocumentTable.tsx`:
  - List documents with status badges
  - Filter by status (pending, indexed, failed)
  - Download button (presigned URL)
  - Delete button with confirmation
  - File size and date formatting

### 9.3 KB Stats Display

- [ ] Create `KBStatsCard.tsx`:
  - Document count
  - Total storage size
  - Chunk count (for indexed docs)
  - Last indexed timestamp
  - Progress indicator for processing docs

### 9.4 Admin Components

- [ ] Create `OrgKBList.tsx`:
  - List org KBs with stats
  - Create new KB button
  - Edit/delete actions
  - Enable/disable toggle

- [ ] Create `GlobalKBList.tsx`:
  - List global KBs
  - Associate with orgs dialog
  - Manage org associations

- [ ] Create `KBFormDialog.tsx`:
  - Create/edit KB form
  - Name, description, config fields
  - Validation

**Deliverables**:
- KB toggle selector
- Document upload components
- Admin CRUD components

---

## Phase 10: Frontend - Pages & Routes (Sessions 122-123)

**Duration**: 2 sessions (~6-8 hours)

### 10.1 Admin Pages

**Location**: `frontend/pages/`

- [ ] Create `OrgAdminKBPage.tsx`:
  - Org KB list
  - Create KB dialog
  - Document management per KB
  - Enable/disable for workspace use

- [ ] Create `PlatformAdminKBPage.tsx`:
  - Global KB list
  - Create global KB dialog
  - Org association management
  - Usage analytics

### 10.2 Admin Cards

**Location**: `frontend/admin/`

- [ ] Create `orgAdminCard.tsx`:
  - Card for org admin dashboard
  - Shows org KB count
  - Quick create button
  - Link to full page

- [ ] Create `platformAdminCard.tsx`:
  - Card for platform admin dashboard
  - Shows global KB count
  - Link to full page

### 10.3 Routes

**Location**: `routes/`

- [ ] Create `routes/admin/org/kb/page.tsx`:
  - Renders OrgAdminKBPage
  - Role check: org_admin
  - Breadcrumb: Admin > Organization > Knowledge Bases

- [ ] Create `routes/admin/org/kb/[id]/page.tsx`:
  - Renders individual KB detail page for org admin
  - Document management for this KB
  - Access logs and analytics

- [ ] Create `routes/admin/sys/kb/page.tsx`:
  - Renders PlatformAdminKBPage
  - Role check: platform_admin
  - Breadcrumb: Admin > System > Knowledge Bases

- [ ] Create `routes/admin/sys/kb/[id]/page.tsx`:
  - Renders individual global KB detail page
  - Document management
  - Org association management
  - Cross-org usage analytics

- [ ] Update `routes/ws/[id]/page.tsx`:
  - Integrate KB toggle selector in Data tab
  - Integrate document upload in Data tab

**Deliverables**:
- Admin pages for KB management
- Admin cards for dashboards
- Next.js routes

---

## Phase 11: Integration & Testing (Sessions 124-125)

**Duration**: 2 sessions (~6-8 hours)

### 11.1 Workspace Integration

- [ ] Update `module-ws/WorkspaceDetailPage.tsx`:
  - Replace mock KB data with real `useWorkspaceKB()` hook
  - Replace mock document data with real `useKBDocuments()` hook
  - Integrate `KBToggleSelector` in Data tab
  - Integrate `DocumentUploadZone` in Data tab
  - Integrate `DocumentTable` in Data tab

### 11.2 Module Registration

- [ ] Update `module.json` with complete metadata
- [ ] Register in `templates/_modules-functional/README.md`
- [ ] Add to CORA module registry

### 11.3 Validation

- [ ] Run API response validator:
  ```bash
  python validation/api-response-validator/validate_api_responses.py
  ```
- [ ] Run frontend compliance validator:
  ```bash
  npm run validate:frontend
  ```
- [ ] Run structure validator:
  ```bash
  python validation/structure-validator/validate_structure.py
  ```
- [ ] Fix any compliance issues

### 11.4 End-to-End Testing

- [ ] Create test project with module-kb:
  ```bash
  ./scripts/create-cora-project.sh test-kb-01
  ```
- [ ] Deploy infrastructure
- [ ] Test workspace KB auto-creation on first doc upload
- [ ] Test document processing pipeline (upload → index → search)
- [ ] Test KB toggle selector (enable/disable org/global KBs)
- [ ] Test org admin KB CRUD
- [ ] Test platform admin global KB management
- [ ] Test pgvector similarity search

**Deliverables**:
- Fully integrated module-kb
- Validation passing
- End-to-end testing complete

---

## Phase 12: Documentation (Session 126)

**Duration**: 1 session (~3-4 hours)

### 12.1 Module Documentation

- [ ] Update `templates/_modules-functional/module-kb/README.md`:
  - Overview and features
  - Architecture diagram
  - Setup instructions
  - Configuration options
  - Usage examples

### 12.2 Integration Guide

- [ ] Update `INTEGRATION-GUIDE.md`:
  - Add module-kb section
  - Document KB scope hierarchy
  - Document KB toggle UX pattern
  - Document RAG integration

### 12.3 Developer Guide

- [ ] Create `docs/guides/guide_MODULE-KB-DEVELOPMENT.md`:
  - Adding new document parsers
  - Customizing chunking strategy
  - Testing embedding generation
  - Monitoring processing pipeline

### 12.4 Memory Bank Update

- [ ] Update `memory-bank/activeContext.md`:
  - Mark module-kb as complete
  - Document lessons learned
  - Note any deviations from plan

**Deliverables**:
- Complete module documentation
- Updated integration guide
- Developer guide

---

## Success Criteria

### Functional Requirements

- [ ] Users can upload documents to workspaces and chats
- [ ] Documents auto-create workspace/chat-scoped KBs
- [ ] Users can toggle org/global KBs for workspaces
- [ ] Documents are parsed and indexed with pgvector embeddings
- [ ] Org admins can create and manage org-level KBs
- [ ] Platform admins can create and manage global KBs
- [ ] Platform admins can associate global KBs with orgs
- [ ] Document processing status is visible to users
- [ ] Failed documents show error messages

### Technical Requirements

- [ ] All Lambda functions have CORA-compliant route docstrings
- [ ] Database schema follows CORA naming conventions
- [ ] API responses use camelCase
- [ ] RLS policies enforce multi-tenant access control
- [ ] S3 presigned URLs expire after 15 minutes
- [ ] SQS processing handles retries and dead letter queue
- [ ] pgvector embeddings default to AWS Bedrock Titan V2 (1024 dimensions)
- [ ] Terraform uses `source_code_hash` for code change detection

### Validation Requirements

- [ ] API response validator: 0 violations
- [ ] Frontend compliance validator: 0 violations
- [ ] Structure validator: 0 violations
- [ ] All tests passing in test project

---

## Dependencies

### Required Modules
- `module-access` - Authentication and authorization
- `module-mgmt` - Platform management
- `module-ws` - Workspace context

### Required Infrastructure
- Supabase with pgvector extension enabled
- S3 bucket for document storage
- SQS queue for async processing
- OpenAI API key for embeddings

### Required Services
- API Gateway for Lambda routes
- CloudWatch for logging
- Secrets Manager for API keys

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| pgvector performance degrades with large datasets | HIGH | Use IVFFlat indexing, monitor query times, consider partitioning |
| Document processing takes too long | MEDIUM | Use Lambda concurrency limits, add progress tracking, implement batch processing |
| S3 costs increase with large uploads | MEDIUM | Add file size limits (50 MB), implement lifecycle policies for old docs |
| OpenAI API rate limits hit during peak usage | MEDIUM | Implement exponential backoff, batch embedding generation, consider caching |
| Workspace KB auto-creation creates too many KBs | LOW | Add soft delete + cleanup job, consider KB merging for small workspaces |

---

## Open Questions

1. **Embedding Model**: Should we support multiple embedding models (ada-002, text-embedding-3)?
   - **Decision**: Start with ada-002, add abstraction layer for future models

2. **Chunking Strategy**: Fixed size vs. semantic chunking?
   - **Decision**: Start with fixed size (1000 chars, 200 overlap), add semantic chunking in v2

3. **Document Retention**: How long to keep deleted documents?
   - **Decision**: 30-day soft delete window, then permanent deletion

4. **KB Sharing**: Should users be able to share workspace KBs across workspaces?
   - **Decision**: No in v1, consider for v2 based on user feedback

---

## Module Integration Patterns

### Integration with Module-Chat

**KB Grounding Flow**:
1. Chat calls `GET /chats/{sessionId}/available-kbs` (from module-kb)
2. User selects KBs to ground via KB toggle selector
3. Chat calls `POST /chats/{sessionId}/kbs/{kbId}/toggle` (from module-kb)
4. When sending message, chat-stream Lambda:
   - Calls module-kb RAG endpoint: `POST /kb/search` with query
   - Receives relevant chunks with citations
   - Injects context into AI prompt
   - Returns response with citation metadata

**API Contract (module-kb exposes)**:
```typescript
// KB Toggle for Chat
GET /chats/{chatId}/available-kbs → { workspaceKb, orgKbs[], globalKbs[] }
POST /chats/{chatId}/kbs/{kbId}/toggle → { isEnabled: boolean }

// RAG Context Retrieval
POST /kb/search → { chunks: Chunk[], citations: Citation[] }
  Request: { query: string, kbIds: string[], topK: number }
  Response: { chunks: [{ content, kbId, docId, chunkIndex }], citations: [...] }
```

### Integration with Module-Workspace

**Workspace KB Auto-Creation**:
1. User uploads doc to workspace via DocumentUploadZone
2. Component calls `POST /workspaces/{workspaceId}/kb/documents`
3. If workspace KB doesn't exist, module-kb auto-creates it
4. Document is uploaded to S3, processing begins

**Workspace Data Tab**:
- KB toggle selector: Calls `GET /workspaces/{workspaceId}/available-kbs`
- Document table: Calls `GET /workspaces/{workspaceId}/kb/documents`
- Upload zone: Calls `POST /workspaces/{workspaceId}/kb/documents`

### Integration with Module-AI

**Embedding Generation (Platform Admin Configurable)**:
- Sys admin configures embedding model in module-ai platform settings
- Supported providers: OpenAI (ada-002, text-embedding-3), Azure OpenAI, AWS Bedrock (Titan), Google Vertex AI (textembedding-gecko)
- Module-kb kb-processor Lambda calls module-ai: `GET /platform/ai-config/embedding`
- Response includes: `{ provider: 'openai'|'azure'|'bedrock'|'vertex', model: string, apiKey: string, dimension: number }`
- kb-processor uses configured model to generate embeddings
- pgvector column dimension must match configured model (requires migration if model changes)

**Dynamic Dimension Handling**:
- AWS Bedrock Titan Text Embeddings V2: **1024 dimensions (DEFAULT)**
- OpenAI ada-002: 1536 dimensions
- OpenAI text-embedding-3-small: 1536 dimensions
- OpenAI text-embedding-3-large: 3072 dimensions
- Google Vertex textembedding-gecko: 768 dimensions
- Azure OpenAI: Depends on deployed model

**Default Choice Rationale**:
- AWS Bedrock Titan V2 (1024 dims) offers best compromise:
  - Better performance than larger models (faster indexing, lower storage)
  - Sufficient accuracy for most RAG use cases
  - Cost-effective for high-volume embedding generation
  - Native AWS integration (no API keys needed if using IAM roles)

**Token Usage Tracking**:
- Module-kb tracks embedding token usage (indexing)
- Module-chat tracks completion token usage (RAG responses)
- Both report to module-ai for consolidated billing/analytics

**API Contract (module-ai exposes)**:
```typescript
// Get Platform Embedding Configuration (sys admin sets this)
GET /platform/ai-config/embedding → { 
  provider: 'openai'|'azure'|'bedrock'|'vertex',
  model: string,
  apiKey: string,
  dimension: number,
  endpoint?: string  // For Azure/custom endpoints
}

// Get Org's Completion Model Configuration (for chat)
GET /orgs/{orgId}/ai-config/completion → { 
  provider: string,
  model: string,
  apiKey: string,
  temperature: number,
  maxTokens: number
}

// Report Token Usage
POST /orgs/{orgId}/ai-usage → { 
  tokens: number, 
  operation: 'embedding'|'completion', 
  model: string,
  timestamp: string 
}
```

**Migration Considerations**:
- If sys admin changes embedding model to different dimension, requires:
  1. Database migration to alter pgvector column dimension
  2. Re-indexing all existing documents (can be done async)
  3. Migration script provided in module-kb

---

## Navigation Integration

**No Left Nav for Regular Users**: KB management is NOT in left navigation. KBs are accessed contextually:
- Via workspace Data tab (upload docs, toggle KBs)
- Via chat KB selector (select which KBs to ground)

**Admin Navigation**:
- Platform Admin: Left nav link "Knowledge Bases" → `/admin/sys/kb`
- Org Admin: Left nav link "Knowledge Bases" → `/admin/org/kb`

**Admin Left Nav Structure**:
```
Admin (Platform)
├── Dashboard
├── Organizations
├── Knowledge Bases ← NEW (module-kb)
└── Settings

Admin (Org)
├── Dashboard
├── Members
├── Knowledge Bases ← NEW (module-kb)
└── Settings
```

---

## Next Steps After Completion

1. **Module-Chat Implementation**: Use module-kb for RAG context retrieval
2. **Module-Workflow Implementation**: Use module-kb for document analysis workflows
3. **Search Enhancement**: Add full-text search across all accessible KBs
4. **Analytics**: Add usage tracking for KB access and document views
5. **V2 Features**: Semantic chunking, multi-model embeddings, KB templates

---

**Status**: 🔄 IN PROGRESS (Phase 0 ✅, Phase 1 ✅, Phase 2 NEXT)  
**Last Updated**: January 14, 2026 (Session 128)  
**Next Review**: After Phase 2 completion (Database Schema)

**Phase 0 Completed**: January 14, 2026 (Session 127) - Migration successful, zero errors, zero downtime  
**Phase 1 Completed**: January 14, 2026 (Session 128) - All 4 specification documents finalized (~5300 lines)

**Cross-Reference**: [Database Naming Migration Plan - Phase 4](../plans/plan_db-naming-migration.md#phase-4-ai-config-tables--handled-by-module-kb-phase-0)
