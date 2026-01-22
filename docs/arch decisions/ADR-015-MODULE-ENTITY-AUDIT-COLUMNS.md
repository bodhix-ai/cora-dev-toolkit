# ADR-015: Module Entity Audit Columns and Soft Delete Standard

**Status:** ✅ ACCEPTED  
**Date:** 2026-01-22  
**Author:** Engineering Team  
**Context:** Discovered during workspace resource counts implementation (Issue #7)

---

## Context and Problem Statement

During implementation of workspace resource counts, we discovered inconsistencies in audit column patterns across CORA module entity tables:

- **voice_sessions**: Missing `is_deleted`, `deleted_at`, `deleted_by` columns entirely
- **chat_sessions**: Had BOTH `is_deleted` AND `deleted_at` (inconsistent usage)
- **kb_docs**: Had `is_deleted` (consistent)
- **eval_doc_summaries**: Had `is_deleted` (consistent)

This inconsistency caused:
1. Query failures when trying to filter deleted records
2. Confusion about which column to use for soft delete checks
3. Lack of recovery capability for accidentally deleted records
4. Missing audit trail for who deleted records and when

**Question:** What standard audit columns should ALL CORA module entity tables have?

---

## Decision

All CORA module entity tables that support CRUD operations MUST include a **complete set of audit columns** following the CORA Standard Audit Column Pattern.

### Required Audit Columns

Every module entity table (primary tables representing core module entities like sessions, documents, evaluations, etc.) MUST have:

```sql
-- CORA Standard Audit Columns (REQUIRED)
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_by UUID NOT NULL REFERENCES auth.users(id),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_by UUID REFERENCES auth.users(id),

-- CORA Standard Soft Delete Columns (REQUIRED)
is_deleted BOOLEAN NOT NULL DEFAULT false,
deleted_at TIMESTAMPTZ,
deleted_by UUID REFERENCES auth.users(id)
```

### Column Definitions

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | When record was created |
| `created_by` | UUID | NOT NULL | - | User who created the record |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | When record was last updated |
| `updated_by` | UUID | NULL | - | User who last updated the record |
| `is_deleted` | BOOLEAN | NOT NULL | false | Soft delete flag (primary deletion indicator) |
| `deleted_at` | TIMESTAMPTZ | NULL | - | When record was soft deleted |
| `deleted_by` | UUID | NULL | - | User who soft deleted the record |

---

## Soft Delete Pattern

### Primary Indicator: `is_deleted`

**The `is_deleted` boolean column is the PRIMARY indicator for soft deletion.**

**WHY:** Boolean checks are faster, simpler, and more explicit than NULL checks on timestamps.

```sql
-- ✅ CORRECT: Use is_deleted for queries
SELECT * FROM module_entity WHERE is_deleted = false;

-- ❌ WRONG: Don't use deleted_at for queries
SELECT * FROM module_entity WHERE deleted_at IS NULL;
```

### Consistency Requirement

To maintain consistency between `is_deleted` and `deleted_at`, use a trigger:

```sql
CREATE OR REPLACE FUNCTION sync_{table}_is_deleted()
RETURNS TRIGGER AS $$
BEGIN
  -- When deleted_at is set, ensure is_deleted is true
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    NEW.is_deleted := true;
  END IF;
  
  -- When deleted_at is cleared (restore), ensure is_deleted is false
  IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    NEW.is_deleted := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER {table}_sync_is_deleted
  BEFORE UPDATE ON {table}
  FOR EACH ROW
  EXECUTE FUNCTION sync_{table}_is_deleted();
```

### Soft Delete Operation

```sql
-- Soft delete a record
UPDATE module_entity
SET 
  deleted_at = NOW(),
  deleted_by = :user_id,
  is_deleted = true,  -- Explicitly set both
  updated_at = NOW(),
  updated_by = :user_id
WHERE id = :entity_id;
```

### Recovery (Restore) Operation

```sql
-- Restore a soft-deleted record
UPDATE module_entity
SET 
  deleted_at = NULL,
  deleted_by = NULL,
  is_deleted = false,
  updated_at = NOW(),
  updated_by = :user_id
WHERE id = :entity_id;
```

---

## Required Indexes

For performance, create partial indexes on soft delete columns:

```sql
-- Index for active (not deleted) records
CREATE INDEX idx_{table}_is_deleted 
  ON {table}(is_deleted) 
  WHERE is_deleted = false;

-- Composite index for workspace + not deleted queries
CREATE INDEX idx_{table}_ws_not_deleted
  ON {table}(ws_id, is_deleted)
  WHERE is_deleted = false;

-- Index for finding records to permanently delete (retention cleanup)
CREATE INDEX idx_{table}_deletion_cleanup
  ON {table}(deleted_at)
  WHERE deleted_at IS NOT NULL;
```

---

## Required Triggers

### 1. Updated At Trigger (Standard)

```sql
CREATE OR REPLACE FUNCTION update_{table}_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER {table}_updated_at 
    BEFORE UPDATE ON {table}
    FOR EACH ROW
    EXECUTE FUNCTION update_{table}_updated_at();
```

### 2. Soft Delete Sync Trigger (For Consistency)

See "Consistency Requirement" section above.

---

## Retention and Permanent Deletion

### Retention Window

Tables MAY define a retention policy for soft-deleted records:

```sql
-- Optional: Add retention_days column to table or org config
retention_days INTEGER DEFAULT 30
```

### Permanent Deletion

Permanently delete records that have exceeded the retention window:

```sql
-- Cleanup function (run via scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_{table}()
RETURNS TABLE (
    deleted_count INTEGER,
    entity_ids UUID[]
) AS $$
DECLARE
    v_deleted_ids UUID[];
    v_count INTEGER;
BEGIN
    -- Find expired records (example: 30 days)
    SELECT ARRAY_AGG(id) INTO v_deleted_ids
    FROM {table}
    WHERE deleted_at IS NOT NULL
    AND deleted_at + INTERVAL '30 days' < NOW();
    
    -- Permanently delete
    DELETE FROM {table}
    WHERE id = ANY(v_deleted_ids);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_count, COALESCE(v_deleted_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Documentation Requirements

### Table Comments

```sql
COMMENT ON TABLE {table} IS '{Description of table purpose}';
```

### Column Comments

```sql
-- Standard audit column comments
COMMENT ON COLUMN {table}.created_at IS 'When the record was created';
COMMENT ON COLUMN {table}.created_by IS 'User who created this record';
COMMENT ON COLUMN {table}.updated_at IS 'When the record was last updated';
COMMENT ON COLUMN {table}.updated_by IS 'User who last updated this record';

-- Standard soft delete column comments
COMMENT ON COLUMN {table}.is_deleted IS 'Soft delete flag - primary indicator for deletion status';
COMMENT ON COLUMN {table}.deleted_at IS 'Timestamp when the record was soft deleted';
COMMENT ON COLUMN {table}.deleted_by IS 'User who soft deleted this record';
```

---

## Migration Pattern for Existing Tables

When adding audit columns to existing tables:

```sql
-- Add columns (idempotent)
ALTER TABLE {table}
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID NULL;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = '{table}_deleted_by_fkey'
  ) THEN
    ALTER TABLE {table}
      ADD CONSTRAINT {table}_deleted_by_fkey 
      FOREIGN KEY (deleted_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_{table}_is_deleted 
  ON {table}(is_deleted) 
  WHERE is_deleted = false;

-- Add triggers
CREATE OR REPLACE FUNCTION sync_{table}_is_deleted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    NEW.is_deleted := true;
  END IF;
  
  IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    NEW.is_deleted := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS {table}_sync_is_deleted ON {table};
CREATE TRIGGER {table}_sync_is_deleted
  BEFORE UPDATE ON {table}
  FOR EACH ROW
  EXECUTE FUNCTION sync_{table}_is_deleted();

-- Add comments
COMMENT ON COLUMN {table}.is_deleted IS 
  'Soft delete flag - automatically synced with deleted_at via trigger';
COMMENT ON COLUMN {table}.deleted_at IS 
  'Timestamp when the record was soft deleted';
COMMENT ON COLUMN {table}.deleted_by IS 
  'User who soft deleted this record';
```

---

## Rationale

### Why Both `is_deleted` AND `deleted_at`?

**Performance + Auditability**

- `is_deleted` (boolean) - Fast filtering, clear intent, used in queries
- `deleted_at` (timestamp) - Audit trail, recovery window tracking, retention policies

**Example Benefits:**

```sql
-- Fast query (boolean index)
SELECT * FROM sessions WHERE ws_id = :ws_id AND is_deleted = false;

-- Retention cleanup (timestamp index)
DELETE FROM sessions 
WHERE deleted_at IS NOT NULL 
AND deleted_at + INTERVAL '30 days' < NOW();

-- Audit report
SELECT deleted_by, deleted_at, COUNT(*) 
FROM sessions 
WHERE is_deleted = true
GROUP BY deleted_by, deleted_at;
```

### Why Triggers for Consistency?

Prevents data inconsistency where `is_deleted` and `deleted_at` get out of sync due to:
- Manual updates
- Migration scripts
- Bulk operations
- Application bugs

The trigger ensures **database-level guarantees** regardless of how the data is modified.

---

## Examples

### ✅ CORRECT: Module Entity Table (voice_sessions)

```sql
CREATE TABLE voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    ws_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Business columns
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    session_metadata JSONB NOT NULL DEFAULT '{}',
    
    -- CORA Standard Audit Columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    -- CORA Standard Soft Delete Columns
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);
```

### ✅ CORRECT: Query Pattern

```sql
-- Filter by is_deleted (primary indicator)
SELECT * FROM voice_sessions 
WHERE ws_id = :ws_id 
AND is_deleted = false;

-- Count active records
SELECT ws_id, COUNT(*) 
FROM voice_sessions 
WHERE is_deleted = false 
GROUP BY ws_id;
```

### ❌ WRONG: Missing Audit Columns

```sql
-- Missing created_by, updated_by, deleted_by
CREATE TABLE bad_example (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
```

### ❌ WRONG: Using Only `deleted_at`

```sql
-- Missing is_deleted (primary indicator)
WHERE deleted_at IS NULL
```

---

## Exceptions

### When NOT to Include Audit Columns

- **Junction/Join Tables** - Simple many-to-many relationships (e.g., `ws_members_kb_docs`)
- **Lookup/Reference Tables** - Static configuration data (e.g., `voice_configs_presets`)
- **Log/Event Tables** - Append-only audit logs (no updates/deletes needed)

**Rule of Thumb:** If the table supports UPDATE or DELETE operations that users initiate, it needs audit columns.

---

## Impact Assessment

### Tables Requiring Updates

Based on existing CORA modules:

| Module | Table | Status | Action Required |
|--------|-------|--------|-----------------|
| module-voice | `voice_sessions` | ✅ Updated | Migration applied 2026-01-22 |
| module-chat | `chat_sessions` | ⚠️ Has columns | Verify consistency |
| module-kb | `kb_docs` | ✅ Compliant | No action |
| module-eval | `eval_doc_summaries` | ✅ Compliant | No action |
| module-ws | `workspaces` | ✅ Compliant | No action |

### Migration Strategy

1. **Phase 1:** Update module schema files in toolkit templates (✅ DONE for voice)
2. **Phase 2:** Create migrations for existing tables (⏳ IN PROGRESS)
3. **Phase 3:** Validate all module tables comply with standard
4. **Phase 4:** Document in module development guide

---

## Consequences

### Positive

- **Consistency** - All module entities follow same pattern
- **Auditability** - Complete audit trail for compliance/debugging
- **Recoverability** - Users can recover accidentally deleted records
- **Performance** - Proper indexes for common query patterns
- **Maintainability** - Clear, documented standard for developers

### Negative

- **Storage** - Additional columns increase storage (minimal impact)
- **Migration Effort** - Existing tables need migrations (one-time cost)
- **Complexity** - Developers must remember to include columns (mitigated by templates)

---

## Compliance Validation

Create a validation script to check compliance:

```python
# scripts/validate-audit-columns.py
def validate_table_audit_columns(table_name, schema):
    required = {
        'created_at', 'created_by', 'updated_at', 'updated_by',
        'is_deleted', 'deleted_at', 'deleted_by'
    }
    
    actual = set(col['name'] for col in schema['columns'])
    missing = required - actual
    
    if missing:
        return {
            'compliant': False,
            'missing': list(missing),
            'table': table_name
        }
    
    return {'compliant': True, 'table': table_name}
```

---

## Related Standards

- **ADR-011:** Table Naming Standards
- **ADR-006:** Supabase Default Privileges
- **ADR-013:** Core Module Criteria

---

## References

- Implementation: `templates/_modules-functional/module-voice/db/schema/002-voice-sessions.sql`
- Migration Example: `templates/_modules-functional/module-voice/db/migrations/20260122_add_audit_columns.sql`
- Issue: UI Enhancements P2 - Issue #7 (Workspace Resource Counts)

---

**Status:** ✅ ACCEPTED  
**Next Review:** 2026-07-22 (6 months)  
**Owner:** Engineering Team
