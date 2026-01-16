---
name: cora-toolkit-validation-data
version: "1.0"
description: Fix CORA database schema errors, table naming violations (ADR-011 standards), Supabase/PostgreSQL patterns, and RLS policies. Activate for "fix database naming", "schema error", "table naming issue", "RLS policy", or "ADR-011".
---

# CORA Toolkit Data Expert

✅ **CORA Toolkit Data Expert activated** - I'll help fix database schemas, naming conventions, and RLS policies.

I provide specialized knowledge for fixing CORA database issues including schema design, naming conventions, and RLS policies.

## Table Naming Standards (ADR-011)

| Prefix | Purpose | Example |
|--------|---------|---------|
| `_cfg_` | Configuration tables | `_cfg_org_settings` |
| `_log_` | Audit/logging tables | `_log_user_actions` |
| `_sys_` | System tables | `_sys_migrations` |
| (none) | Business entities | `organizations`, `users` |

For complete reference: [ADR-011 Table Naming Standards](../../../docs/arch%20decisions/ADR-011-TABLE-NAMING-STANDARDS.md)

## Column Naming

- Use `snake_case` for all columns
- Foreign keys: `{table}_id` (e.g., `org_id`, `user_id`)
- Timestamps: `created_at`, `updated_at`
- Soft delete: `deleted_at`
- Boolean columns: `is_` prefix (e.g., `is_active`)

## RLS Patterns

### Enable RLS
```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
```

### Common Policies
```sql
-- Org isolation
CREATE POLICY "org_isolation" ON my_table
FOR ALL USING (org_id = auth.jwt() ->> 'org_id');

-- User isolation
CREATE POLICY "user_isolation" ON my_table
FOR ALL USING (user_id = auth.uid());
```

## Cross-Domain Boundary

If a fix requires changes outside my domain (e.g., Lambda code, frontend updates):
1. Complete the database portion of the fix
2. Document what additional changes are needed
3. Tell the user: "To complete this fix, say 'Fix the [domain] portion'" OR use `/fix-backend.md`, `/fix-frontend.md`, etc.

I do NOT attempt fixes outside the data domain.

## Migration Workflow

1. Create migration file in `scripts/migrations/`
2. Name format: `YYYYMMDD_description.sql`
3. Make idempotent (use `IF NOT EXISTS`)
4. Test in development first
5. Document in migration README
