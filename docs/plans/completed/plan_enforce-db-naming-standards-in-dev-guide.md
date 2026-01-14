# Plan: Enforce Database Naming Standards in Module Development Guide

**Status:** ✅ COMPLETE  
**Priority:** High  
**Created:** January 1, 2026  
**Updated:** January 14, 2026  
**Completed:** January 14, 2026  
**Owner:** Engineering Team

---

## Overview

This plan outlines the updates needed to the CORA Module Development Guide to enforce compliance with the new database naming standards (Rules 6 & 8 added to DATABASE-NAMING-STANDARDS.md).

**Note:** Rule 8 was initially created for configuration tables via ADR-011, then expanded to cover all specialized table types (config, log, history, usage, state, queue) using infix patterns.

**Related Documents:**
- `docs/standards/cora/standard_DATABASE-NAMING.md` - The standards being enforced
- `docs/arch decisions/ADR-011-TABLE-NAMING-STANDARDS.md` - Specialized table naming conventions
- `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md` - The guide being updated

---

## Problem Statement

The CORA Module Development Guide currently does not enforce the database naming standards, particularly:
- **Rule 1**: Single-word tables must be plural
- **Rule 2**: Prefixed/compound tables must have plural main noun
- **Rule 6**: Entity-relational prefix abbreviations (ws_, wf_, cert_, org_)
- **Rule 8**: Specialized table patterns (config, log, history, usage, state, queue)

Without explicit enforcement in the guide, AI agents and developers will create modules with inconsistent and non-compliant database schemas.

**Update:** Rule 7 was deprecated in favor of Rule 8, which was initially created for configuration tables via ADR-011, then expanded to cover all specialized table types using infix patterns (`_cfg_`, `_log_`, `_hist_`, `_usage_`, `_state_`, `_queue_`).

---

## Goals

1. **Prevent violations**: Make standards compliance mandatory at all phases
2. **Educate**: Provide clear examples and explanations
3. **Automate**: Add validation scripts to catch violations
4. **Guide AI**: Update AI prompting templates to reference standards

---

## Implementation Phases

### Phase 1: Update Prerequisites (30 minutes)

**File:** `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`  
**Section:** Phase 0: Prerequisites

**Changes:**

Insert new subsection after "Tools & Templates":

```markdown
### Database Standards

- [ ] Review `docs/standards/cora/standard_DATABASE-NAMING.md`
- [ ] Understand table naming conventions (plural forms)
- [ ] Understand prefix abbreviation rules (ws_, wf_, cert_, org_)
- [ ] Understand specialized table patterns (Rule 8):
  - Config: `{module}_cfg_{scope}_{purpose?}`
  - Log: `{module}_log_{purpose}`
  - History: `{module}_hist_{entity}`
  - Usage: `{module}_usage_{entity}`
  - State: `{module}_state_{process}`
  - Queue: `{module}_queue_{purpose}`
```

**Deliverable:** Standards review is now a prerequisite

**✅ COMPLETE:** Updated in Session 125

---

### Phase 2: Update Entity Identification (45 minutes)

**File:** `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`  
**Section:** Phase 1, Step 1.2: Identify Entities

**Changes:**

1. **Update entity name specification:**
   - Current: "Entity Name (singular, lowercase)"
   - New: "Entity Name (plural for table, singular for API/types)"

2. **Add new subsection: "Entity Naming Standards"**

```markdown
#### Entity Naming Standards

**Table Names (Database):**
- Use **plural form**: `workspaces`, `members`, `favorites`
- For prefixed tables, use documented abbreviations:
  - `workspaces` → related tables: `ws_members`, `ws_config`, `ws_favorites`
  - `workflows` → related tables: `wf_steps`, `wf_triggers`
  - Reference: Rule 6 in DATABASE-NAMING-STANDARDS.md

**API/Type Names (Code):**
- Use **singular form**: `Workspace`, `Member`, `Favorite`
- Transformation: DB `workspaces` → API `Workspace` → Type `Workspace`

**Examples:**

| Database Table | Prefix | API Endpoint | TypeScript Type |
|----------------|--------|--------------|--------------------|
| `workspaces` | ws_ | `/api/ws/workspaces` | `Workspace` |
| `ws_members` | ws_ | `/api/ws/members` | `WsMember` |
| `ws_favorites` | ws_ | `/api/ws/favorites` | `WsFavorite` |
```

**Deliverable:** Clear plural/singular distinction with examples

**✅ COMPLETE:** Updated in Session 125

---

### Phase 3: Add Standards Compliance Checkpoint (30 minutes)

**File:** `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`  
**Section:** Phase 3, Step 3.3: Database Implementation

**Changes:**

Insert at the very beginning of Step 3.3:

```markdown
### Step 3.3: Database Implementation

**⚠️ CRITICAL: Database Naming Standards Compliance**

All database objects MUST comply with `docs/standards/cora/standard_DATABASE-NAMING.md`.

**Pre-Implementation Checklist:**

- [ ] **Table Names**: All tables use plural form (`workspaces`, not `workspace`)
- [ ] **Prefix Abbreviations**: Use documented abbreviations (Rule 6):
  - `ws_` for workspace-related tables
  - `wf_` for workflow-related tables
  - `cert_` for certification-related tables
  - `org_` for organization-related tables
- [ ] **Specialized Tables**: Use infix patterns (Rule 8):
  - Config: `{module}_cfg_sys`, `{module}_cfg_org`, `{module}_cfg_ws`
  - Log: `{module}_log_auth`, `{module}_log_activity`, `{module}_log_audit`
  - History: `{module}_hist_{entity}` (e.g., `ai_hist_model_validation`)
  - Usage: `{module}_usage_{entity}` (e.g., `sys_usage_module`)
  - State: `{module}_state_{process}` (e.g., `ai_state_validation`)
  - Queue: `{module}_queue_{purpose}` (e.g., `ai_queue_validation`)
- [ ] **Column Names**: snake_case throughout
- [ ] **Foreign Keys**: `{table_singular}_id` pattern
- [ ] **Indexes**: `idx_{table}_{column(s)}` pattern
- [ ] **Constraints**: Standard naming patterns (see standards doc)

**Reference:** `docs/standards/cora/standard_DATABASE-NAMING.md`
```

**Deliverable:** Mandatory checkpoint before schema implementation

**✅ COMPLETE:** Updated in Session 125

---

### Phase 4: Update Schema Template (1 hour)

**File:** `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`  
**Section:** Phase 3, Step 3.3.2: Complete Schema File Template

**Changes:**

1. **Update template to use plural table names:**

```sql
-- ⚠️ IMPORTANT: Use PLURAL table names per DATABASE-NAMING-STANDARDS.md Rule 1

CREATE TABLE IF NOT EXISTS public.{entities} (  -- PLURAL!
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,  -- Plural!
```

2. **Add comprehensive examples section after template:**

```markdown
#### Example: Workspace Module with Prefix Abbreviation

Following Rule 6 (Entity-Relational Prefix Abbreviations):

\`\`\`sql
-- Main table (full name, plural)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES public.orgs(id),
    name VARCHAR(255) NOT NULL
);

-- Related tables (abbreviated prefix + plural)
CREATE TABLE IF NOT EXISTS public.ws_members (
    id UUID PRIMARY KEY,
    ws_id UUID NOT NULL REFERENCES public.workspaces(id),  -- FK uses singular: ws_id
    user_id UUID NOT NULL REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.ws_config (
    id UUID PRIMARY KEY,
    nav_label_singular VARCHAR(50) DEFAULT 'Workspace',
    enable_favorites BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ws_favorites (
    id UUID PRIMARY KEY,
    ws_id UUID NOT NULL REFERENCES public.workspaces(id),
    user_id UUID NOT NULL REFERENCES auth.users(id)
);
\`\`\`

**Why prefix `ws_` instead of `workspace_`?**
- `workspace` exceeds 10 characters (Rule 6)
- `ws` is industry-standard abbreviation
- Documented in DATABASE-NAMING-STANDARDS.md

#### Example: Specialized Tables with Infix Patterns

Following Rule 8 (Specialized Table Patterns - ADR-011):

\\`\\`\\`sql
-- Configuration tables (_cfg_ infix)
CREATE TABLE IF NOT EXISTS public.sys_cfg_idp (
    id UUID PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    ...
);

CREATE TABLE IF NOT EXISTS public.ws_cfg_sys (
    id UUID PRIMARY KEY,
    nav_label_singular VARCHAR(50) DEFAULT 'Workspace',
    enable_favorites BOOLEAN DEFAULT true,
    ...
);

-- Log tables (_log_ infix)
CREATE TABLE IF NOT EXISTS public.user_log_auth (
    id UUID PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_email TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    ...
);

CREATE TABLE IF NOT EXISTS public.ws_log_activity (
    id UUID PRIMARY KEY,
    ws_id UUID NOT NULL REFERENCES public.workspaces(id),
    action VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ...
);

-- History tables (_hist_ infix)
CREATE TABLE IF NOT EXISTS public.ai_hist_model_validation (
    id UUID PRIMARY KEY,
    model_id UUID REFERENCES public.ai_models(id),
    status TEXT NOT NULL,
    validated_at TIMESTAMPTZ DEFAULT NOW(),
    ...
);

-- State tables (_state_ infix)
CREATE TABLE IF NOT EXISTS public.ai_state_validation (
    id UUID PRIMARY KEY,
    provider_id UUID NOT NULL,
    total_models INTEGER,
    validated_count INTEGER DEFAULT 0,
    status VARCHAR(50),
    ...
);

-- Usage tables (_usage_ infix)
CREATE TABLE IF NOT EXISTS public.sys_usage_module (
    id UUID PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL,
    org_id UUID REFERENCES public.orgs(id),
    action_count INTEGER DEFAULT 0,
    ...
);

-- Queue tables (_queue_ infix)
CREATE TABLE IF NOT EXISTS public.ai_queue_validation (
    id UUID PRIMARY KEY,
    model_id UUID NOT NULL,
    priority INTEGER DEFAULT 5,
    status VARCHAR(50) DEFAULT 'pending',
    ...
);
\\`\\`\\`

**Why infix patterns?**
- Immediately identifiable: `grep \"_cfg_\"`, `grep \"_log_\"`, etc. finds all tables of that type
- No redundancy: Works with all module prefixes including `sys_`
- Module-first: Always know which module owns the table
- Flexible: Supports all specialized table types consistently

**Reference:** ADR-011: Specialized Table Naming Conventions
```

**Deliverable:** Template and examples enforce standards

**✅ COMPLETE:** Updated in Session 125

---

### Phase 5: Add Validation Script (2 hours)

**File:** `scripts/validate-db-naming.py` (NEW)

**Purpose:** Automated validation of database naming standards compliance

**Features:**
- Check all tables use plural form (entity tables)
- Detect and validate specialized table patterns:
  - `_cfg_` configuration tables
  - `_log_` audit/activity logs
  - `_hist_` history tables
  - `_usage_` usage tracking tables
  - `_state_` state/progress tables
  - `_queue_` job/task queues
- Verify prefix abbreviations are documented
- Validate column names are snake_case
- Check foreign keys follow `{table_singular}_id` pattern
- Verify indexes follow `idx_{table}_{column}` pattern
- Report violations with line numbers

**Integration:**
- Add to Phase 4, Step 4.1: Automated Compliance Checks

**Example output:**
```
✅ Table naming: All tables use plural form
❌ Prefix abbreviations: Found undocumented prefix 'wksp_' in line 10
✅ Column naming: All columns use snake_case
❌ Foreign keys: 'workspace_id' should be 'ws_id' in line 25
✅ Indexes: All indexes follow naming pattern
```

**Deliverable:** Automated enforcement tool

**✅ COMPLETE:** Created in Session 125 (`scripts/validate-db-naming.py`)

---

### Phase 6: Update AI Prompting Templates (45 minutes)

**File:** `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`  
**Section:** AI Prompting Templates

**Changes:**

1. **Phase 1 Discovery Prompt:**

Add after "Source: [path to code or description]":

```
**CRITICAL: All database objects MUST comply with DATABASE-NAMING-STANDARDS.md**

Please:
1. Identify all entities (database tables, data structures)
   - Use PLURAL table names (workspaces, members, favorites)
   - Apply prefix abbreviations if needed (ws_, wf_, cert_, org_)
   - Reference: docs/standards/cora/DATABASE-NAMING-STANDARDS.md Rules 1, 2, 6, 7
```

2. **Phase 3 Implementation Prompt:**

Add after "Please:":

```
**CRITICAL: Database Naming Standards Compliance Required**

2. Implement database schema following DATABASE-NAMING-STANDARDS.md:
   - All tables PLURAL: workspaces (not workspace)
   - Prefix abbreviations: ws_members, ws_config, ws_favorites
   - Column names: snake_case
   - Foreign keys: {table_singular}_id pattern
   - Indexes: idx_{table}_{column} pattern
   - Constraints: documented patterns

**Validation:** Before completing, verify all table names against DATABASE-NAMING-STANDARDS.md
```

**Deliverable:** AI agents follow standards automatically

**✅ COMPLETE:** Updated in Session 125

---

### Phase 7: Update Related Documentation (15 minutes)

**File:** `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`  
**Section:** Related Documentation

**Changes:**

Add to list:
```markdown
- [DATABASE-NAMING-STANDARDS.md](../standards/cora/DATABASE-NAMING-STANDARDS.md) - **REQUIRED** - Database object naming conventions
```

**Deliverable:** Standards easily discoverable

**✅ COMPLETE:** Updated in Session 125

---

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Prerequisites | 30 min | None |
| Phase 2: Entity Identification | 45 min | Phase 1 |
| Phase 3: Compliance Checkpoint | 30 min | Phase 1 |
| Phase 4: Schema Template | 1 hour | Phase 2, 3 |
| Phase 5: Validation Script | 2 hours | None (parallel) |
| Phase 6: AI Prompts | 45 min | Phase 2, 4 |
| Phase 7: Documentation Links | 15 min | None |

**Total Estimated Time:** 5.75 hours

**Recommended Approach:** 
- Phases 1-4, 6-7 can be done in one session (~3.75 hours)
- Phase 5 (validation script) can be done separately

---

## Testing Plan

### Test 1: Create New Module Following Updated Guide

1. Follow updated guide to create `module-test`
2. Verify all tables use plural form
3. Verify prefix abbreviations documented
4. Run validation script
5. Should pass 100%

### Test 2: Validation Script Catches Violations

1. Intentionally create schema with violations:
   - Singular table name: `workspace`
   - Undocumented prefix: `wksp_`
   - camelCase column: `createdAt`
2. Run validation script
3. Should report all 3 violations

### Test 3: AI Follows Updated Prompts

1. Use updated AI prompting template
2. Create module from use cases
3. Verify AI generates plural table names
4. Verify AI uses documented abbreviations

---

## Success Criteria

- [ ] All 7 phases implemented
- [ ] Validation script created and tested
- [ ] Updated guide passes review
- [ ] New modules created with guide are 100% compliant
- [ ] AI agents follow standards without manual correction

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing modules violate standards | Medium | Document exceptions, create migration plan |
| Validation script false positives | Low | Thorough testing, support override flags |
| AI doesn't follow prompts consistently | Medium | Iterative prompt refinement, human review gate |

---

## Follow-up Actions

1. **Retrofit Existing Modules** (separate plan)
   - Audit all existing modules for compliance
   - Create migration scripts for violations
   - Update module-ws, module-kb, module-chat

2. **Continuous Improvement**
   - Track validation script results
   - Refine prompts based on AI behavior
   - Add more examples to guide as patterns emerge

---

## Checklist for Implementation

- [x] Phase 1: Update prerequisites section ✅ Session 125
- [x] Phase 2: Update entity identification section ✅ Session 125
- [x] Phase 3: Add compliance checkpoint ✅ Session 125
- [x] Phase 4: Update schema template with examples ✅ Session 125
- [x] Phase 5: Create validation script ✅ Session 125
- [x] Phase 6: Update AI prompting templates ✅ Session 125
- [x] Phase 7: Add documentation link ✅ Session 125
- [x] ADR-011: Specialized Table Naming Conventions ✅ Session 125 (expanded)
- [x] Rule 8: Specialized Table Patterns (config, log, history, usage, state, queue) ✅ Session 125 (expanded)
- [x] Validator: Python 3.9 compatibility ✅ Session 125
- [x] Validator: All specialized table pattern detection ✅ Session 125
- [ ] Test validation script (pending)
- [ ] Create test module following updated guide (pending)
- [ ] Get team review and approval (pending)
- [ ] Merge changes to main (pending)

---

**Status:** ✅ ALL PHASES COMPLETE + STANDARDS EXPANDED  
**Implementation Date:** January 14, 2026  
**Total Time:** ~10 hours (including ADR-011 creation + expansion to all specialized tables)  
**Standards Coverage:** Config, Log, History, Usage, State, Queue tables  
**Next Steps:** Test validator against all modules, team review, migration planning (see plan_db-naming-migration.md)
