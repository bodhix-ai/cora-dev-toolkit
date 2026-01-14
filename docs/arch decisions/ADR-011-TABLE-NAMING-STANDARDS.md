# ADR-011: Configuration Table Naming Convention

**Status:** Accepted  
**Date:** January 14, 2026  
**Deciders:** Engineering Team  
**Context:** Establish consistent naming pattern for configuration tables across CORA modules

---

## Context

CORA modules need configuration tables at multiple scope levels (system, organization, workspace, user). The current implementation has inconsistent naming:
- `sys_lambda_config` (singular, module-mgmt)
- `sys_idp_config` (singular, module-access)  
- `ws_configs` (plural, module-ws)
- `org_prompt_engineering` (no config indicator, module-ai)

A consistent naming standard is needed to allow developers and AI agents to immediately identify:
1. **Module ownership** (which module owns this table)
2. **Table type** (that it's a configuration table vs entity table)
3. **Scope level** (system, org, workspace, or user)

---

## Decision Drivers

1. **Human readability** - Developers should understand table purpose at a glance
2. **AI parseability** - Automated tooling should identify config tables programmatically
3. **Consistency** - Pattern should work across all modules and scopes
4. **Existing patterns** - Minimize disruption to current naming conventions
5. **PostgreSQL limits** - Names should stay under 63 characters
6. **Grep-friendliness** - Easy to find all tables of a specific type

---

## Options Considered

### Option A: Scope-Suffix Pattern
**Pattern:** `{module}_{scope}_configs`

**Pros:** Concise, clear scope  
**Cons:** Redundant for sys_ module (`sys_sys_configs`), config not immediately obvious

### Option B: Purpose-Suffix Pattern
**Pattern:** `{module}_{purpose}_{scope}_configs`

**Pros:** Highly descriptive  
**Cons:** Verbose, `_configs` suffix easily missed when scanning

### Option C: Config-Infix Pattern ✅ APPROVED
**Pattern:** `{module}_cfg_{scope}_{purpose}`

**Why this won?**
- `_cfg_` infix makes config tables instantly identifiable
- No redundancy (avoids `sys_sys_configs`)
- Easy to grep: `grep "_cfg_"` finds all config tables
- Balanced length and clarity

---

Now I need to create ADR-011 and make all the necessary updates. Let me start by creating the ADR file.
</thinking>

Perfect! I'll now implement the approved Option C (Config-Infix Pattern) by creating ADR-011 and making all necessary updates. Let me start by creating the ADR file.

<write_to_file>
<path>docs/arch decisions/ADR-011-CONFIG-TABLE-NAMING.md</path>
<content>
# ADR-011: Configuration Table Naming Convention

**Status:** Approved  
**Date:** January 14, 2026  
**Deciders:** Engineering Team  
**Context:** Establish consistent naming pattern for configuration tables across CORA modules

---

## Context

CORA modules need configuration tables at multiple scope levels (system, organization, workspace, user). The current implementation has inconsistent naming:
- `sys_lambda_config` (singular, module-mgmt)
- `sys_idp_config` (singular, module-access)  
- `ws_configs` (plural, module-ws)
- `org_prompt_engineering` (no config indicator, module-ai)

A consistent naming standard is needed to allow developers and AI agents to immediately identify:
1. **Module ownership** (which module owns this table)
2. **Table type** (that it's a configuration table vs entity table)
3. **Scope level** (system, org, workspace, or user)

---

## Decision Drivers

1. **Human readability** - Developers should understand table purpose at a glance
2. **AI parseability** - Automated tooling should identify config tables programmatically
3. **Consistency** - Pattern should work across all modules and scopes
4. **Existing patterns** - Minimize disruption to current naming conventions
5. **PostgreSQL limits** - Names should stay under 63 characters
6. **Grep-friendly** - Easy to find all tables of a specific type

---

## Options Considered

### Option A: Scope-Suffix Pattern

**Pattern:** `{module}_{scope}_configs`

**Pros:**
- Concise naming
- Clear scope identification
- Follows existing plural convention

**Cons:**
- ❌ Redundant for sys_ module (`sys_sys_configs`)
- Config tables not immediately distinguishable from entity tables
- No room for multiple config types per module/scope combination

---

### Option B: Purpose-Suffix Pattern

**Pattern:** `{module}_{purpose}_{scope}_configs`

**Pros:**
- Highly descriptive
- Supports multiple config types per module/scope
- Clear differentiation from entity tables

**Cons:**
- Verbose naming (longer table names)
- `_configs` suffix at end may be missed when scanning
- Purpose could be confused with entity relationships

---

### Option C: Config-Infix Pattern ✅ **APPROVED**

**Pattern:** `{module}_cfg_{scope}_{purpose}`

**Decision Rationale:**
- ✅ `_cfg_` infix immediately identifies config tables
- ✅ No redundancy (`sys_cfg_lambda` vs `sys_sys_configs`)
- ✅ Scope is clearly positioned after `_cfg_`
- ✅ Purpose is optional extension when needed
- ✅ Easy to grep: `grep "_cfg_"` finds all config tables
- ✅ Concise yet descriptive

---

Now I'll proceed with implementing the approved changes. Let me create ADR-011 first, then update the necessary files.
</thinking>

Perfect! I'll now proceed with implementing the approved Option C (Config-Infix Pattern) and creating the necessary documentation and updates.

<write_to_file>
<path>docs/arch decisions/ADR-011-CONFIG-TABLE-NAMING.md</path>
<content>
# ADR-011: Configuration Table Naming Convention

**Status:** Approved  
**Date:** January 14, 2026  
**Deciders:** Engineering Team  
**Context:** Establish consistent naming pattern for configuration tables across CORA modules

---

## Context

CORA modules need configuration tables at multiple scope levels (system, organization, workspace, user). The current implementation has inconsistent naming:
- `sys_lambda_config` (singular, module-mgmt)
- `sys_idp_config` (singular, module-access)  
- `ws_configs` (plural, module-ws)
- `org_prompt_engineering` (no config indicator, module-ai)

A consistent naming standard is needed to allow developers and AI agents to immediately identify:
1. **Module ownership** (which module owns this table)
2. **Table type** (that it's a configuration table vs entity table)
3. **Scope level** (system, org, workspace, or user)

---

## Decision Drivers

1. **Human readability** - Developers should understand table purpose at a glance
2. **AI parseability** - Automated tooling should identify config tables programmatically
3. **Consistency** - Pattern should work across all modules and scopes
4. **Existing patterns** - Minimize disruption to current naming conventions
5. **PostgreSQL limits** - Names should stay under 63 characters

---

## Options Considered

### Option A: Scope-Suffix Pattern

**Pattern:** `{module}_{scope}_configs`

**Pros:**
- Concise naming
- Clear scope identification
- Follows existing plural convention

**Cons:**
- **Redundant for sys_ module** (`sys_sys_configs`)
- Config tables not immediately distinguishable from entity tables
- No room for multiple config types per module/scope combination

### Option B: Purpose-Suffix Pattern

**Pattern:** `{module}_{purpose}_{scope}_configs`

**Pros:**
- Highly descriptive
- Supports multiple config types per module/scope
- Clear differentiation from entity tables

**Cons:**
- Verbose naming (longer table names)
- `_configs` suffix at end may be missed when scanning
- Purpose could be confused with entity relationships

### Option C: Config-Infix Pattern (✅ **APPROVED**)

**Pattern:** `{module}_cfg_{scope}_{purpose?}`

**Pros:**
- ✅ **`_cfg_` infix immediately identifies config tables**
- ✅ No redundancy (`sys_cfg_lambda` vs `sys_sys_configs`)
- ✅ Scope is clearly positioned after `_cfg_`
- ✅ Purpose is optional extension when needed
- ✅ Easy to grep: `grep "_cfg_"` finds all config tables
- ✅ Concise yet descriptive

**Cons:**
- Deviates from `_configs` plural convention (uses `_cfg_`)
- Requires migration of existing tables

---

## Decision

**Option C** has been approved for implementation.

**Rationale:**
- Immediate config table identification via `_cfg_` infix
- No naming redundancy across modules
- Grep-friendly pattern for tooling
- Flexible enough for multiple config types

---

## Implementation Examples

```sql
-- System-level configs
CREATE TABLE sys_cfg_lambda (...);  -- Lambda warming config
CREATE TABLE sys_cfg_idp (...);     -- IDP configuration

-- Module-level configs
CREATE TABLE ws_cfg_sys (...);      -- Workspace system config
CREATE TABLE ws_cfg_org (...);      -- Workspace org overrides
CREATE TABLE ai_cfg_sys (...);      -- AI system defaults
CREATE TABLE ai_cfg_org (...);      -- AI org settings
```

---

## Migration Required

### Configuration Tables

| Current Name | New Name | Module | Priority |
|--------------|----------|--------|----------|
| `sys_idp_config` | `sys_cfg_idp` | module-access | P0 (Critical) |
| `sys_lambda_config` | `sys_cfg_lambda` | module-mgmt | P1 (High) |
| `ws_configs` | `ws_cfg_sys` | module-ws | P1 (High) |
| `ws_org_settings` | `ws_cfg_org` | module-ws | P2 (Medium) |
| `org_prompt_engineering` | `ai_cfg_org_prompts` | module-ai | P2 (Medium) |
| `sys_rag` | `ai_cfg_sys_rag` | module-ai | P2 (Medium) |

### Log Tables

| Current Name | New Name | Module | Priority |
|--------------|----------|--------|----------|
| `user_auth_log` | `user_log_auth` | module-access | P3 (Low) |
| `sys_idp_audit_log` | `sys_log_idp_audit` | module-access | P3 (Low) |
| `ws_activity_log` | `ws_log_activity` | module-ws | P3 (Low) |

### History Tables

| Current Name | New Name | Module | Priority |
|--------------|----------|--------|----------|
| `ai_model_validation_history` | `ai_hist_model_validation` | module-ai | P3 (Low) |

### State/Progress Tables

| Current Name | New Name | Module | Priority |
|--------------|----------|--------|----------|
| `ai_model_validation_progress` | `ai_state_validation` | module-ai | P3 (Low) |

### Usage Tracking Tables

| Current Name | New Name | Module | Priority |
|--------------|----------|--------|----------|
| `sys_module_usage` | `sys_usage_module` | module-mgmt | P3 (Low) |
| `sys_module_usage_daily` | `sys_usage_module_daily` | module-mgmt | P3 (Low) |

---

## Related Standards

This decision extends the database naming standards documented in:
- `docs/standards/cora/DATABASE-NAMING-STANDARDS.md`
- Rule 8: Configuration Table Pattern (to be added)

---

**Status:** Approved - Ready for Implementation  
**Next Steps:** Update DATABASE-NAMING-STANDARDS.md, create migration plan, update Module Development Guide

<write_to_file>
<path>docs/arch decisions/ADR-011-CONFIG-TABLE-NAMING.md</path>
<content># ADR-011: Specialized Table Naming Conventions (Config, Log, History, Usage, State, Queue)

**Status:** Approved  
**Date:** January 14, 2026  
**Updated:** January 14, 2026 - Expanded to cover all specialized table types  
**Deciders:** Engineering Team  

---

## Context

CORA modules require specialized tables beyond entity tables (configuration, logs, history, usage tracking, state, queues). The current implementation has inconsistent naming patterns:

- `sys_lambda_config` (singular, module-mgmt)
- `sys_idp_config` (singular, module-access)  
- `ws_configs` (plural, module-ws)
- `org_prompt_engineering` (no config indicator, module-ai)

This inconsistency makes it difficult for developers and AI agents to:
1. Identify which module owns a specialized table
2. Recognize the table's purpose (config vs log vs history vs entity data)
3. Understand the scope level (for config tables: system, org, workspace, or user)
4. Quickly find all tables of a specific type via grep/search

---

## Decision Drivers

1. **Human readability** - Developers should understand table purpose at a glance
2. **AI parseability** - Automated tooling should identify config tables programmatically
3. **Consistency** - Pattern should work across all modules and scopes
4. **Existing patterns** - Minimize disruption to current naming conventions
5. **PostgreSQL limits** - Names should stay under 63 characters
6. **Grep-friendly** - Easy to search for all config tables across the codebase

---

## Options Considered

### Option A: Scope-Suffix Pattern

**Pattern:** `{module}_{scope}_configs`

**Examples:**
- `ws_sys_configs` - Workspace system config
- `ai_org_configs` - AI org config
- `sys_sys_configs` - ❌ Redundant!

**Pros:**
- Concise naming
- Clear scope identification
- Follows existing plural convention

**Cons:**
- **Redundant for sys_ module** (`sys_sys_configs`)
- Config tables not immediately distinguishable from entity tables
- No room for multiple config types per module/scope combination

---

### Option B: Purpose-Suffix Pattern

**Pattern:** `{module}_{purpose}_{scope}_configs`

**Examples:**
- `ws_labels_sys_configs` - Workspace label settings (platform)
- `ai_defaults_sys_configs` - AI defaults (platform)
- `ai_providers_org_configs` - AI provider settings (per org)

**Pros:**
- Highly descriptive
- Supports multiple config types per module/scope
- Clear differentiation from entity tables

**Cons:**
- Verbose naming (longer table names)
- `_configs` suffix at end may be missed when scanning
- Purpose could be confused with entity relationships

---

### Option C: Infix Pattern ✅ **APPROVED**

**Pattern:** `{module}_{type}_{scope_or_purpose}`

**Where `{type}` is:**
- `_cfg_` for configuration tables
- `_log_` for audit/activity logs
- `_hist_` for history/versioning tables
- `_usage_` for usage tracking
- `_state_` for state/progress tables
- `_queue_` for job/task queues

**Examples:**
- `ws_cfg_sys` - Workspace config (system level)
- `user_log_auth` - User authentication log
- `ai_hist_model_validation` - AI model validation history
- `sys_usage_module` - System module usage tracking
- `ai_state_validation` - AI validation progress state
- `ai_queue_validation` - AI validation job queue

**Pros:**
- ✅ **Infix immediately identifies table type**
- ✅ No redundancy across any module
- ✅ Grep-friendly: `grep "_cfg_"`, `grep "_log_"`, etc.
- ✅ Flexible enough for all specialized table types
- ✅ Consistent pattern across entire codebase
- ✅ Module ownership always clear (prefix)

**Cons:**
- Deviates from suffix conventions (uses infix abbreviations)
- Requires migration of existing tables
- Team needs to learn multiple infixes

---

## Comparison Matrix

| Criteria | Option A | Option B | Option C ✅ |
|----------|----------|----------|-------------|
| **Redundancy** | ❌ sys_sys_ issue | ✅ None | ✅ None |
| **Config identification** | ⚠️ Implicit | ✅ Suffix | ✅ **Infix** |
| **Scope clarity** | ✅ Clear | ✅ Clear | ✅ **Clear position** |
| **Multiple configs** | ❌ Limited | ✅ Supported | ✅ Supported |
| **Name length** | ✅ Short | ⚠️ Long | ✅ **Balanced** |
| **Grep-friendly** | ⚠️ _configs$ | ⚠️ _configs$ | ✅ **_cfg_** |
| **Migration effort** | Medium | High | Medium |

---

## Decision

**Option C: Infix Pattern** has been approved for all specialized table types.

---

### Configuration Tables

**Pattern:** `{module}_cfg_{scope}_{purpose?}`

Where:
- **{module}** = module abbreviation (`ws_`, `ai_`, `sys_`, `org_`, `user_`, `kb_`, `chat_`, `wf_`)
- **_cfg_** = config table indicator (fixed infix)
- **{scope}** = configuration scope level (`sys`, `org`, `ws`, `user`)
- **{purpose}** = optional descriptive name for specific config types

---

### Log Tables (Audit/Activity)

**Pattern:** `{module}_log_{purpose}`

Where:
- **{module}** = module abbreviation
- **_log_** = log table indicator (fixed infix)
- **{purpose}** = type of events logged (`auth`, `activity`, `audit`, `access`)

**Examples:**
- `user_log_auth` - User authentication events
- `ws_log_activity` - Workspace activity log
- `sys_log_idp_audit` - IDP configuration audit log

---

### History Tables (Versioning/Change Tracking)

**Pattern:** `{module}_hist_{entity}_{detail?}`

Where:
- **{module}** = module abbreviation
- **_hist_** = history table indicator (fixed infix)
- **{entity}** = entity being tracked
- **{detail}** = optional detail (e.g., `validation`, `changes`)

**Examples:**
- `ai_hist_model_validation` - AI model validation history
- `ws_hist_changes` - Workspace change history
- `org_hist_membership` - Organization membership history

---

### Usage Tracking Tables

**Pattern:** `{module}_usage_{entity}_{granularity?}`

Where:
- **{module}** = module abbreviation
- **_usage_** = usage tracking indicator (fixed infix)
- **{entity}** = what is being tracked
- **{granularity}** = optional time granularity (`daily`, `hourly`, `monthly`)

**Examples:**
- `sys_usage_module` - Module usage tracking
- `sys_usage_module_daily` - Daily module usage rollup
- `ai_usage_model` - AI model usage tracking

---

### State/Progress Tables

**Pattern:** `{module}_state_{process}`

Where:
- **{module}** = module abbreviation
- **_state_** = state/progress indicator (fixed infix)
- **{process}** = process being tracked

**Examples:**
- `ai_state_validation` - AI validation progress state
- `wf_state_execution` - Workflow execution state
- `kb_state_indexing` - Knowledge base indexing progress

---

### Queue Tables (Jobs/Tasks)

**Pattern:** `{module}_queue_{purpose}`

Where:
- **{module}** = module abbreviation
- **_queue_** = queue indicator (fixed infix)
- **{purpose}** = queue purpose

**Examples:**
- `ai_queue_validation` - AI validation job queue
- `kb_queue_indexing` - Knowledge base indexing queue
- `wf_queue_execution` - Workflow execution queue

---

## Implementation Examples

### Configuration Tables

```sql
-- Module-WS: Platform-wide workspace settings
CREATE TABLE ws_cfg_sys (
    id UUID PRIMARY KEY,
    nav_label_singular VARCHAR(50) DEFAULT 'Workspace',
    nav_label_plural VARCHAR(50) DEFAULT 'Workspaces',
    enable_favorites BOOLEAN DEFAULT true,
    ...
);

-- Module-WS: Org-level workspace overrides
CREATE TABLE ws_cfg_org (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES orgs(id),
    custom_label VARCHAR(50),
    ...
);

-- Module-AI: Platform-wide AI defaults
CREATE TABLE ai_cfg_sys (
    id UUID PRIMARY KEY,
    default_embedding_model_id UUID,
    default_chat_model_id UUID,
    ...
);

-- Module-AI: Org-level AI prompts
CREATE TABLE ai_cfg_org_prompts (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES orgs(id),
    custom_system_prompt TEXT,
    ...
);

-- Module-MGMT: Lambda warming configuration
CREATE TABLE sys_cfg_lambda (
    id UUID PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    ...
);

-- Module-ACCESS: IDP configuration
CREATE TABLE sys_cfg_idp (
    id UUID PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    client_id VARCHAR(255),
    ...
);
```

### Log Tables

```sql
-- Module-ACCESS: User authentication events
CREATE TABLE user_log_auth (
    id UUID PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_email TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    ...
);

-- Module-WS: Workspace activity log
CREATE TABLE ws_log_activity (
    id UUID PRIMARY KEY,
    ws_id UUID NOT NULL REFERENCES workspaces(id),
    action VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ...
);

-- Module-ACCESS: IDP audit log
CREATE TABLE sys_log_idp_audit (
    id UUID PRIMARY KEY,
    idp_config_id UUID REFERENCES sys_cfg_idp(id),
    action VARCHAR(50) NOT NULL,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    ...
);
```

### History Tables

```sql
-- Module-AI: Model validation history
CREATE TABLE ai_hist_model_validation (
    id UUID PRIMARY KEY,
    model_id UUID REFERENCES ai_models(id),
    status TEXT NOT NULL,
    validated_at TIMESTAMPTZ DEFAULT NOW(),
    ...
);

-- Module-WS: Workspace change history
CREATE TABLE ws_hist_changes (
    id UUID PRIMARY KEY,
    ws_id UUID REFERENCES workspaces(id),
    changed_fields JSONB,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    ...
);
```

### Usage Tracking Tables

```sql
-- Module-MGMT: Module usage tracking
CREATE TABLE sys_usage_module (
    id UUID PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL,
    org_id UUID REFERENCES orgs(id),
    action_count INTEGER DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    ...
);

-- Module-MGMT: Daily module usage rollup
CREATE TABLE sys_usage_module_daily (
    id UUID PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL,
    usage_date DATE NOT NULL,
    total_actions INTEGER DEFAULT 0,
    ...
);
```

### State/Progress Tables

```sql
-- Module-AI: Validation progress state
CREATE TABLE ai_state_validation (
    id UUID PRIMARY KEY,
    provider_id UUID NOT NULL,
    total_models INTEGER,
    validated_count INTEGER DEFAULT 0,
    status VARCHAR(50),
    started_at TIMESTAMPTZ,
    ...
);
```

### Queue Tables

```sql
-- Module-AI: Validation job queue
CREATE TABLE ai_queue_validation (
    id UUID PRIMARY KEY,
    model_id UUID NOT NULL,
    priority INTEGER DEFAULT 5,
    status VARCHAR(50) DEFAULT 'pending',
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    ...
);
```

---

## Scope Level Definitions

| Scope | Meaning | Typical Columns | Row Count |
|-------|---------|-----------------|-----------|
| `_sys_` | Platform-wide, applies to all orgs | No `org_id` | Singleton or key-value |
| `_org_` | Organization-scoped | Has `org_id` column | One per org |
| `_ws_` | Workspace-scoped | Has `ws_id` column | One per workspace |
| `_user_` | User-scoped preferences | Has `user_id` column | One per user |

---

## Migration Plan

### Existing Tables to Rename

| Current Name | New Name | Module | Migration Complexity |
|--------------|----------|--------|---------------------|
| `sys_lambda_config` | `sys_cfg_lambda` | module-mgmt | Medium (multi-row) |
| `sys_idp_config` | `sys_cfg_idp` | module-access | Low (singleton) |
| `ws_configs` | `ws_cfg_sys` | module-ws | Low (singleton) |
| `org_prompt_engineering` | `ai_cfg_org_prompts` | module-ai | Medium (multi-row) |

### Migration Steps

1. **Create new tables** with `_cfg_` naming
2. **Copy data** from old tables to new tables
3. **Update application code** to reference new table names
4. **Update RLS policies** and constraints
5. **Recreate foreign keys** and indexes
6. **Test thoroughly** in dev environment
7. **Drop old tables** after verification
8. **Update documentation** and templates

---

## Consequences

### Positive

- ✅ All specialized tables instantly recognizable via infix pattern
- ✅ No naming redundancy across any module or table type
- ✅ Grep-friendly: `grep "_cfg_"`, `grep "_log_"`, etc. finds all tables of that type
- ✅ Flexible enough for multiple tables per type per module
- ✅ Consistent pattern across all modules and all specialized table types
- ✅ Future modules (kb, chat, wf) can use correct naming from day one

### Negative

- ⚠️ Requires migration of existing tables (12+ tables affected)
- ⚠️ Deviates from suffix conventions (uses infix abbreviations)
- ⚠️ Team needs to learn multiple infix patterns
- ⚠️ More verbose than some current table names

### Neutral

- Migration can be done incrementally (table by table)
- Existing code continues to work until migration is complete
- Templates should be updated immediately to use new pattern

---

## Compliance

This decision updates the database naming standards:
- **Rule 8: Specialized Table Patterns** (to be updated in DATABASE-NAMING-STANDARDS.md)

All new CORA modules MUST use the infix patterns for specialized tables:
- Config: `{module}_cfg_{scope}_{purpose?}`
- Log: `{module}_log_{purpose}`
- History: `{module}_hist_{entity}`
- Usage: `{module}_usage_{entity}_{granularity?}`
- State: `{module}_state_{process}`
- Queue: `{module}_queue_{purpose}`

---

## References

- `docs/standards/cora/standard_DATABASE-NAMING.md`
- `docs/plans/plan_db-naming-migration.md` (phased migration plan)
- `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`
- `scripts/validate-db-naming.py` (validator updated to detect all patterns)

---

## Grep Reference Guide

Quick commands to find all tables of each type:

```bash
# Configuration tables
grep -r "_cfg_" templates/_modules-*/db/schema/*.sql

# Log tables
grep -r "_log_" templates/_modules-*/db/schema/*.sql

# History tables
grep -r "_hist_" templates/_modules-*/db/schema/*.sql

# Usage tracking tables
grep -r "_usage_" templates/_modules-*/db/schema/*.sql

# State/progress tables
grep -r "_state_" templates/_modules-*/db/schema/*.sql

# Queue tables
grep -r "_queue_" templates/_modules-*/db/schema/*.sql
```

---

**Status:** Approved  
**Implementation:** Phased migration Q1 2026 (see migration plan)  
**Priority:** Complete Phase 0-4 before kb, chat, wf module development
