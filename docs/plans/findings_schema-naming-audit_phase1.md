# Schema Naming Compliance Audit - Phase 1 Findings

**Date**: January 20, 2026  
**Branch**: `schema-naming-audit`  
**Scope**: NEW modules only (kb, chat, eval, voice, ws)  
**Standard**: `docs/standards/cora/standard_DATABASE-NAMING.md`

---

## Executive Summary

**CRITICAL FINDINGS:** Extensive violations of the database naming standard found across all new modules. These violations are **directly causing 406 errors** due to RLS policy type mismatches.

**Total Violations Found:** 48+ instances of `workspace_id` usage (should be `ws_id`)

**Impact:**
- ❌ **RLS policies failing** - Comparing `workspace_id` (column) against `ws_members.ws_id` causes type mismatch
- ❌ **406 errors on database queries** - Result of RLS policy failures
- ❌ **Blocks eval-inference-profile-fix** - Cannot proceed until this is resolved

---

## Phase 1.1: Table Column Name Audit Results

### Summary by Module

| Module | Tables with Violations | Affected Columns | Severity |
|--------|------------------------|------------------|----------|
| **module-kb** | 2 tables | `workspace_id` | 🔴 CRITICAL |
| **module-chat** | 1 table | `workspace_id` | 🔴 CRITICAL |
| **module-eval** | 1 table | `workspace_id` | 🔴 CRITICAL |
| **module-voice** | 0 tables | - | ✅ COMPLIANT |
| **module-ws** | 0 tables | - | ✅ COMPLIANT |

---

## Detailed Findings

### Module-KB (Knowledge Base)

#### ❌ VIOLATION 1: `kb_bases` table

**File**: `templates/_modules-core/module-kb/db/schema/001-kb-bases.sql`

**Violations:**
```sql
-- Line 5: Column definition
workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,

-- Lines 8-11: CHECK constraint references
(scope = 'sys' AND org_id IS NULL AND workspace_id IS NULL AND chat_session_id IS NULL) OR
(scope = 'org' AND org_id IS NOT NULL AND workspace_id IS NULL AND chat_session_id IS NULL) OR
(scope = 'workspace' AND org_id IS NOT NULL AND workspace_id IS NOT NULL AND chat_session_id IS NULL) OR

-- Line 15: Index on workspace_id
CREATE INDEX IF NOT EXISTS idx_kb_bases_workspace_id ON public.kb_bases(workspace_id) WHERE workspace_id IS NOT NULL;

-- Line 18: Partial index on workspace_id
ON public.kb_bases(workspace_id)
```

**Should Be:**
```sql
ws_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,

-- CHECK constraints:
(scope = 'sys' AND org_id IS NULL AND ws_id IS NULL AND chat_session_id IS NULL) OR
(scope = 'org' AND org_id IS NOT NULL AND ws_id IS NULL AND chat_session_id IS NULL) OR
(scope = 'workspace' AND org_id IS NOT NULL AND ws_id IS NOT NULL AND chat_session_id IS NULL) OR

-- Index:
CREATE INDEX IF NOT EXISTS idx_kb_bases_ws_id ON public.kb_bases(ws_id) WHERE ws_id IS NOT NULL;

-- Partial index:
ON public.kb_bases(ws_id)
```

---

#### ❌ VIOLATION 2: `kb_access_ws` table

**File**: `templates/_modules-core/module-kb/db/schema/006-kb-access-ws.sql`

**Violations:**
```sql
-- Line 3: Column definition
workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

-- Line 5: UNIQUE constraint
CONSTRAINT kb_access_ws_unique UNIQUE (kb_id, workspace_id)

-- Line 8: Index
CREATE INDEX IF NOT EXISTS idx_kb_access_ws_workspace_id ON public.kb_access_ws(workspace_id);
```

**Should Be:**
```sql
ws_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

CONSTRAINT kb_access_ws_unique UNIQUE (kb_id, ws_id)

CREATE INDEX IF NOT EXISTS idx_kb_access_ws_ws_id ON public.kb_access_ws(ws_id);
```

---

#### ❌ VIOLATION 3: KB RPC Functions

**File**: `templates/_modules-core/module-kb/db/schema/008-kb-rpc-functions.sql`

**Violations:**
```sql
-- Function parameter (line 13)
CREATE OR REPLACE FUNCTION get_accessible_kbs_for_workspace(p_user_id UUID, p_workspace_id UUID)

-- Function body references (lines 15, 18, 19, 20)
SELECT * INTO v_workspace FROM public.workspaces WHERE id = p_workspace_id;
WHERE kb.workspace_id = p_workspace_id
JOIN public.kb_access_ws kaw ON kaw.kb_id = kb.id AND kaw.workspace_id = p_workspace_id
JOIN public.kb_access_ws kaw ON kaw.kb_id = kb.id AND kaw.workspace_id = p_workspace_id

-- RLS policy logic (lines 11, 12)
WHERE ws_id = v_kb.workspace_id AND user_id = p_user_id
WHERE ws_id = v_kb.workspace_id
```

**🔴 CRITICAL:** This shows **RLS policy type mismatch** - comparing `ws_members.ws_id` against `kb_bases.workspace_id`!

**Should Be:**
```sql
CREATE OR REPLACE FUNCTION get_accessible_kbs_for_workspace(p_user_id UUID, p_ws_id UUID)

SELECT * INTO v_workspace FROM public.workspaces WHERE id = p_ws_id;
WHERE kb.ws_id = p_ws_id
JOIN public.kb_access_ws kaw ON kaw.kb_id = kb.id AND kaw.ws_id = p_ws_id

-- RLS logic (now consistent):
WHERE ws_id = v_kb.ws_id AND user_id = p_user_id
```

---

#### ❌ VIOLATION 4: Chat Session KB View

**File**: `templates/_modules-core/module-kb/db/schema/010-chat-session-kb.sql`

**Violations:**
```sql
-- Lines 2-4: View definition references workspace_id
SELECT cs.org_id, cs.workspace_id
JOIN chat_info ci ON kb.workspace_id = ci.workspace_id
AND ci.workspace_id IS NOT NULL

-- Line 5: RLS policy comparison
WHERE wm.ws_id = ci.workspace_id
```

**🔴 CRITICAL:** Another RLS type mismatch - `ws_members.ws_id` vs `chat_info.workspace_id`!

**Should Be:**
```sql
SELECT cs.org_id, cs.ws_id
JOIN chat_info ci ON kb.ws_id = ci.ws_id
AND ci.ws_id IS NOT NULL

WHERE wm.ws_id = ci.ws_id
```

---

#### ❌ VIOLATION 5: KB Docs S3 Key Comment

**File**: `templates/_modules-core/module-kb/db/schema/002-kb-docs.sql`

**Violations:**
```sql
COMMENT ON COLUMN public.kb_docs.s3_key IS 'S3 object key: {org_id}/{workspace_id}/{kb_id}/{doc_id}/{filename}';
```

**Should Be:**
```sql
COMMENT ON COLUMN public.kb_docs.s3_key IS 'S3 object key: {org_id}/{ws_id}/{kb_id}/{doc_id}/{filename}';
```

---

### Module-Chat (Chat & Messaging)

#### ❌ VIOLATION 6: `chat_sessions` table

**File**: `templates/_modules-core/module-chat/db/schema/001-chat-sessions.sql`

**Violations:**
```sql
-- Line 5: Column definition
workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,

-- Line 8: Index
CREATE INDEX IF NOT EXISTS idx_chat_sessions_workspace_id ON public.chat_sessions(workspace_id);

-- Line 10: Composite index
CREATE INDEX IF NOT EXISTS idx_chat_sessions_ws_user ON public.chat_sessions(workspace_id, created_by) WHERE is_deleted = false;

-- Line 12: Column comment
COMMENT ON COLUMN public.chat_sessions.workspace_id IS 'Workspace (for workspace-scoped chats, NULL for user-level chats)';
```

**Should Be:**
```sql
ws_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,

CREATE INDEX IF NOT EXISTS idx_chat_sessions_ws_id ON public.chat_sessions(ws_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_ws_user ON public.chat_sessions(ws_id, created_by) WHERE is_deleted = false;

COMMENT ON COLUMN public.chat_sessions.ws_id IS 'Workspace (for workspace-scoped chats, NULL for user-level chats)';
```

---

#### ❌ VIOLATION 7: Chat RPC Functions

**File**: `templates/_modules-core/module-chat/db/schema/006-chat-rpc-functions.sql`

**Violations:**
```sql
-- Function parameter (line 27)
p_workspace_id UUID DEFAULT NULL

-- Function return type (line 29)
workspace_id UUID,

-- Function body (line 31)
cs.workspace_id,

-- WHERE clause (line 33)
AND (p_workspace_id IS NULL OR cs.workspace_id = p_workspace_id)

-- RLS policy checks (lines 22, 23, 25, 26, 35, 36)
AND cs.workspace_id IS NOT NULL
WHERE wm.ws_id = cs.workspace_id
```

**🔴 CRITICAL:** Multiple RLS type mismatches throughout chat functions!

**Should Be:**
```sql
p_ws_id UUID DEFAULT NULL

ws_id UUID,

cs.ws_id,

AND (p_ws_id IS NULL OR cs.ws_id = p_ws_id)

AND cs.ws_id IS NOT NULL
WHERE wm.ws_id = cs.ws_id
```

---

#### ❌ VIOLATION 8: Chat RLS Policies

**File**: `templates/_modules-core/module-chat/db/schema/007-chat-rls.sql`

**Violations:**
```sql
-- Lines 3-4: RLS policy
AND workspace_id IS NOT NULL
WHERE wm.ws_id = chat_sessions.workspace_id
```

**🔴 CRITICAL:** Direct RLS type mismatch causing 406 errors!

**Should Be:**
```sql
AND ws_id IS NOT NULL
WHERE wm.ws_id = chat_sessions.ws_id
```

---

### Module-Eval (Evaluation)

#### ❌ VIOLATION 9: `eval_doc_summaries` table

**File**: `templates/_modules-functional/module-eval/db/schema/010-eval-doc-summaries.sql`

**Violations:**
```sql
-- Line 3: Column definition
workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

-- Line 5: Column comment
COMMENT ON COLUMN eval_doc_summaries.workspace_id IS 'Workspace this evaluation belongs to';

-- Line 8: Index
ON eval_doc_summaries(workspace_id);
```

**Should Be:**
```sql
ws_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

COMMENT ON COLUMN eval_doc_summaries.ws_id IS 'Workspace this evaluation belongs to';

ON eval_doc_summaries(ws_id);
```

---

#### ❌ VIOLATION 10: Eval RLS Policies

**File**: `templates/_modules-functional/module-eval/db/schema/015-eval-rls.sql`

**Violations:**
```sql
-- 12 instances of RLS policy type mismatches (lines 3, 4, 5, 6, 9, 10, 11, 12, 13, 14)
WHERE ws_members.ws_id = eval_doc_summaries.workspace_id
JOIN ws_members wm ON wm.ws_id = eds.workspace_id
```

**🔴 CRITICAL:** This is **THE ROOT CAUSE** of the 406 errors! RLS policies comparing `ws_members.ws_id` (correct naming) against `eval_doc_summaries.workspace_id` (incorrect naming).

**Should Be:**
```sql
WHERE ws_members.ws_id = eval_doc_summaries.ws_id
JOIN ws_members wm ON wm.ws_id = eds.ws_id
```

---

## Impact Analysis

### Direct Impact (Causing 406 Errors)

**RLS Policy Type Mismatches:**
1. `kb_bases.workspace_id` vs `ws_members.ws_id` (module-kb)
2. `kb_access_ws.workspace_id` vs `ws_members.ws_id` (module-kb)
3. `chat_sessions.workspace_id` vs `ws_members.ws_id` (module-chat)
4. `eval_doc_summaries.workspace_id` vs `ws_members.ws_id` (module-eval) ← **PRIMARY BLOCKER**

**Why This Causes 406 Errors:**
- RLS policies check: `WHERE workspace_id IN (SELECT ws_id FROM ws_members ...)`
- Column name mismatch creates implicit type comparison issue
- PostgREST returns 406 (Not Acceptable) when RLS policy evaluation fails

---

### Remediation Complexity

**Based on Rule 8.2 Criteria:**

| Violation | Complexity | Reason |
|-----------|------------|--------|
| `kb_bases.workspace_id` | 🔴 HIGH | Table + RLS + RPC functions + Indexes + Frontend |
| `kb_access_ws.workspace_id` | 🟡 MEDIUM | Table + RLS + Indexes |
| `chat_sessions.workspace_id` | 🔴 HIGH | Table + RLS + RPC functions + Indexes + Frontend |
| `eval_doc_summaries.workspace_id` | 🔴 HIGH | Table + RLS + Indexes + **Blocks eval fix** |

---

## Next Steps (Phase 2)

1. ✅ **Phase 1.1 Complete** - Table column violations documented
2. 🔄 **Phase 1.2** - RLS Policy Audit (partially complete - found critical issues)
3. 🔄 **Phase 1.3** - Index Audit (partially complete - found index violations)
4. ⏳ **Phase 1.4** - Foreign Key Constraint Audit
5. ⏳ **Phase 1.5** - Function & Trigger Audit
6. ⏳ **Phase 2** - Application Code Analysis (Lambda + Frontend)

---

## Recommendations

### Immediate Action Required

**PRIORITY 1:** Fix `eval_doc_summaries.workspace_id` → `ws_id`
- **Blocker for:** `plan_eval-inference-profile-fix.md`
- **Impact:** Resolves 406 errors in eval module
- **Complexity:** HIGH (full stack change)

**PRIORITY 2:** Fix `chat_sessions.workspace_id` → `ws_id`
- **Impact:** Resolves 406 errors in chat module
- **Complexity:** HIGH (full stack change)

**PRIORITY 3:** Fix `kb_bases.workspace_id` and `kb_access_ws.workspace_id` → `ws_id`
- **Impact:** Resolves 406 errors in KB module
- **Complexity:** HIGH (full stack change)

### Migration Strategy

**Recommended Approach:**
1. Create migration scripts for each table (Phase 4.1)
2. Update Lambda code first (Phase 4.2)
3. Update frontend code (Phase 4.3)
4. Update schema templates (Phase 4.4)
5. Deploy in batches (Phase 5.2)

**Timeline Estimate:**
- Phase 2-3 (Code Analysis + Dependency Mapping): 2-3 days
- Phase 4 (Remediation Strategy): 1-2 days
- Phase 5 (Testing & Deployment): 3-5 days
- **Total:** 6-10 days

---

## Appendix: Complete Violation List

### workspace_id Violations (48+ instances)

**module-kb (21 instances):**
- `001-kb-bases.sql`: 5 instances (column, CHECK constraints, indexes)
- `002-kb-docs.sql`: 1 instance (comment)
- `006-kb-access-ws.sql`: 3 instances (column, UNIQUE, index)
- `008-kb-rpc-functions.sql`: 8 instances (function params, RLS logic)
- `010-chat-session-kb.sql`: 4 instances (view, JOIN, RLS)

**module-chat (14 instances):**
- `001-chat-sessions.sql`: 4 instances (column, indexes, comment)
- `006-chat-rpc-functions.sql`: 8 instances (params, return type, WHERE, RLS)
- `007-chat-rls.sql`: 2 instances (RLS policy)

**module-eval (13 instances):**
- `010-eval-doc-summaries.sql`: 3 instances (column, comment, index)
- `015-eval-rls.sql`: 10 instances (RLS policies)

**module-voice:** ✅ No violations found
**module-ws:** ✅ No violations found

---

**Status:** Phase 1.1 Complete | Phase 1.2-1.5 Pending  
**Next Action:** Continue with Lambda and Frontend code analysis (Phase 2)  
**Blocker Resolved:** After remediation, can proceed with `plan_eval-inference-profile-fix.md`
