# CORA Data Fix Workflow

This workflow provides data expertise for fixing database schemas, naming conventions, and RLS policies.

**Use this workflow when:**
- The `cora-toolkit-validation-data` skill doesn't activate
- You want guaranteed access to data remediation knowledge

## Table Naming Standards (ADR-011)

| Prefix | Purpose | Example |
|--------|---------|---------|
| `_cfg_` | Configuration tables | `_cfg_org_settings` |
| `_log_` | Audit/logging tables | `_log_user_actions` |
| `_sys_` | System tables | `_sys_migrations` |
| (none) | Business entities | `organizations`, `users` |

For complete reference: [ADR-011 Table Naming Standards](../docs/arch%20decisions/ADR-011-TABLE-NAMING-STANDARDS.md)

## Column Naming

- Use `snake_case` for all columns
- Foreign keys: `{table}_id` (e.g., `org_id`, `user_id`)
- Timestamps: `created_at`, `updated_at`
- Soft delete: `deleted_at`
- Boolean columns: `is_` prefix (e.g., `is_active`, `is_deleted`)

## RLS Patterns

### Enable RLS
```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
```

### Common Policies
```sql
-- Users can see their own org's data
CREATE POLICY "org_isolation" ON my_table
FOR ALL USING (org_id = auth.jwt() ->> 'org_id');

-- Users can only see their own records
CREATE POLICY "user_isolation" ON my_table
FOR ALL USING (user_id = auth.uid());
```

### Testing RLS
1. Test with different user contexts
2. Verify superuser can bypass
3. Check service role access

## Migration Workflow

1. Create migration file in `scripts/migrations/`
2. Name format: `YYYYMMDD_description.sql`
3. Make idempotent (use `IF NOT EXISTS`, `IF EXISTS`)
4. Test in development first
5. Document in migration README

### Idempotent Pattern
```sql
-- Add column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'my_table' AND column_name = 'new_column'
    ) THEN
        ALTER TABLE my_table ADD COLUMN new_column TEXT;
    END IF;
END $$;
```

## Common Fixes

### Table Name Violation
1. Create migration to rename table
2. Update all references in code
3. Update RLS policies
4. Test thoroughly

### Missing RLS
1. Enable RLS on the table
2. Create appropriate policies
3. Test with different user contexts

### Foreign Key Issues
1. Ensure referenced table exists
2. Use proper naming convention
3. Consider ON DELETE behavior
