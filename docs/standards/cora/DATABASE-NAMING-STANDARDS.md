# Database Naming Standards

**Version:** 1.0  
**Date:** 2025-11-12  
**Status:** Draft - Pending Implementation  
**Owner:** Engineering Team

## Overview

This document establishes the official naming conventions for all database objects in the STS Career Platform. These standards ensure consistency, maintainability, and reduce confusion across the codebase.

---

## Table of Contents

1. [Table Naming Standards](#table-naming-standards)
2. [Column Naming Standards](#column-naming-standards)
3. [Constraint Naming Standards](#constraint-naming-standards)
4. [Index Naming Standards](#index-naming-standards)
5. [View Naming Standards](#view-naming-standards)
6. [Function and Trigger Naming](#function-and-trigger-naming)
7. [General Principles](#general-principles)

---

## Table Naming Standards

### Rule 1: Single-Word Tables → Plural Form

Single-word entity tables must use **plural form**.

**✅ Correct:**
```sql
CREATE TABLE orgs (...);
CREATE TABLE users (...);
CREATE TABLE resumes (...);
CREATE TABLE profiles (...);
```

**❌ Incorrect:**
```sql
CREATE TABLE org (...);     -- Should be: orgs
CREATE TABLE user (...);    -- Should be: users
CREATE TABLE resume (...);  -- Should be: resumes
CREATE TABLE profile (...); -- Should be: profiles
```

### Rule 2: Prefixed/Compound Tables → Plural Main Noun

For tables with prefixes (module/entity prefixes), the **main noun** should be plural.

**✅ Correct:**
```sql
CREATE TABLE org_members (...);        -- Plural: members
CREATE TABLE cert_campaigns (...);     -- Plural: campaigns
CREATE TABLE cert_commitments (...);   -- Plural: commitments
CREATE TABLE user_certs (...);         -- Plural: certs
CREATE TABLE resume_experiences (...); -- Plural: experiences
```

**❌ Incorrect:**
```sql
CREATE TABLE org_member (...);      -- Should be: org_members
CREATE TABLE cert_campaign (...);   -- Should be: cert_campaigns
CREATE TABLE user_cert (...);       -- Should be: user_certs
CREATE TABLE resume_experience (...); -- Should be: resume_experiences
```

### Rule 3: Junction/Mapping Tables → Both Nouns Singular

For many-to-many junction tables, use singular forms for both entities, connected by underscore.

**✅ Correct:**
```sql
CREATE TABLE user_org (...);          -- Maps user to org
CREATE TABLE cert_campaign_cert (...); -- Maps campaign to cert
CREATE TABLE org_role_permission (...); -- Maps role to permission
```

**Pattern:** `{entity1_singular}_{entity2_singular}`

### Rule 4: Abbreviations for Long Names

For compound names exceeding 3 words or 25 characters, use standard abbreviations.

**Standard Abbreviations:**
- `external` → `ext`
- `certification` → `cert`
- `reference` → `ref`
- `attribute` → `attr`
- `configuration` → `config`
- `experience` → `exp`
- `education` → `ed`

**✅ Correct:**
```sql
CREATE TABLE user_ext_certs (...);           -- Instead of: user_external_certifications
CREATE TABLE user_ext_cert_attributes (...); -- Instead of: user_external_certification_attributes
CREATE TABLE cert_ref_data (...);            -- Instead of: certification_reference_data
```

### Rule 5: Reserved Keywords - Avoid or Quote

Avoid SQL reserved keywords for table names. If unavoidable, always quote them.

**❌ Avoid:**
```sql
CREATE TABLE user (...);   -- "user" is reserved in many SQL databases
CREATE TABLE order (...);  -- "order" is reserved
```

**✅ Better:**
```sql
CREATE TABLE users (...);  -- Plural avoids keyword
CREATE TABLE orders (...); -- Plural avoids keyword
```

### Rule 6: Entity-Relational Prefix Abbreviations

When a main entity table name exceeds 10 characters, a **documented abbreviation** MAY be used as the prefix for related tables. The prefix does not need to match the first letters of the main table - it must be a clear, unambiguous abbreviation.

**Pattern:** `{abbreviation}_{related_entity_plural}`

**Approved Prefix Abbreviations:**

| Main Table | Prefix | Rationale |
|------------|--------|-----------|
| workspaces | ws_ | Standard industry abbreviation for "workspace" |
| workflows | wf_ | Standard industry abbreviation for "workflow" |
| certifications | cert_ | Common abbreviation, avoids very long names |
| organizations | org_ | First 3 letters (also commonly recognized) |

**✅ Correct:**
```sql
-- Main table (full name, plural)
CREATE TABLE workspaces (...);

-- Related tables (abbreviated prefix + plural)
CREATE TABLE ws_members (...);        -- Workspace members
CREATE TABLE ws_config (...);         -- Workspace configuration
CREATE TABLE ws_favorites (...);      -- Workspace favorites

-- Another example:
CREATE TABLE workflows (...);
CREATE TABLE wf_steps (...);          -- Workflow steps
CREATE TABLE wf_triggers (...);       -- Workflow triggers
```

**❌ Incorrect:**
```sql
CREATE TABLE workspace_members (...);  -- Too verbose (though not wrong)
CREATE TABLE wksp_members (...);       -- Undocumented abbreviation
CREATE TABLE wrk_members (...);        -- Unclear abbreviation
```

**Documentation Requirement:**
- All prefix abbreviations MUST be documented in this standard
- Abbreviations MUST be consistent across entire project
- Once chosen for a module, the abbreviation cannot change
- Abbreviations should be 2-4 characters + underscore

### Rule 7: Namespace/Scope Prefixes

For tables that represent **configuration, settings, or scope** rather than entity relationships, use a namespace prefix WITHOUT requiring a corresponding main entity table.

**Pattern:** `{namespace}_{descriptive_name}`

**Common Namespace Prefixes:**

| Prefix | Meaning | Use Case | Example Tables |
|--------|---------|----------|----------------|
| platform_ | Platform-wide settings | Configuration, registry, system tables | platform_idp_config, platform_module_registry, platform_lambda_config |
| system_ | System-level internals | Background processes, health checks | system_audit_log, system_health_check, system_migrations |
| app_ | Application settings | Feature flags, app config | app_config, app_feature_flags, app_settings |

**When to Use Namespace Prefixes:**
- Configuration/settings tables (often singletons)
- Audit and logging tables
- System metadata tables
- Registry/catalog tables
- Tables that don't "belong" to a user-facing entity

**Key Difference:**
- `org_members` → relates to `orgs` table (entity-relational prefix from Rule 6)
- `platform_idp_config` → no `platforms` table needed (namespace prefix)

**✅ Correct:**
```sql
-- Platform namespace (no "platforms" table exists or needed)
CREATE TABLE platform_idp_config (...);
CREATE TABLE platform_module_registry (...);
CREATE TABLE platform_lambda_config (...);

-- System namespace
CREATE TABLE system_audit_log (...);
CREATE TABLE system_health_check (...);
```

**❌ Incorrect:**
```sql
-- Don't use namespace prefixes for entity relationships
CREATE TABLE platform_members (...);  -- Should be: ws_members, org_members, etc.
```

---

## Column Naming Standards

### Rule 1: Snake Case for All Columns

All column names must use **snake_case** (lowercase with underscores).

**✅ Correct:**
```sql
first_name
created_at
org_id
current_org_id
is_active
```

**❌ Incorrect:**
```sql
firstName    -- camelCase
CreatedAt    -- PascalCase
OrgID        -- Mixed case
isActive     -- camelCase
```

### Rule 2: Primary Keys → `id`

Primary key columns should be named simply `id` (not prefixed with table name).

**✅ Correct:**
```sql
CREATE TABLE orgs (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);
```

**❌ Incorrect:**
```sql
CREATE TABLE orgs (
  org_id UUID PRIMARY KEY,  -- Redundant prefix
  name TEXT NOT NULL
);
```

### Rule 3: Foreign Keys → `{table_singular}_id`

Foreign key columns should reference the singular form of the related table + `_id`.

**✅ Correct:**
```sql
CREATE TABLE org_members (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES orgs(id),     -- References orgs table
  user_id UUID REFERENCES users(id)    -- References users table
);
```

**❌ Incorrect:**
```sql
CREATE TABLE org_members (
  id UUID PRIMARY KEY,
  orgs_id UUID REFERENCES orgs(id),    -- Should be: org_id
  owner UUID REFERENCES users(id)       -- Should be: user_id
);
```

### Rule 4: Boolean Columns → `is_` or `has_` Prefix

Boolean/flag columns should clearly indicate true/false nature.

**✅ Correct:**
```sql
is_active BOOLEAN DEFAULT TRUE
is_public BOOLEAN DEFAULT FALSE
has_logo BOOLEAN DEFAULT FALSE
```

**❌ Incorrect:**
```sql
active BOOLEAN       -- Ambiguous
public BOOLEAN       -- Reserved keyword
logo BOOLEAN         -- Unclear meaning
```

### Rule 5: Timestamp Columns → Standard Suffixes

Use consistent suffixes for temporal columns.

**Standard Suffixes:**
- `_at` for timestamps: `created_at`, `updated_at`, `deleted_at`
- `_date` for dates only: `birth_date`, `start_date`, `end_date`
- `_time` for time only: `start_time`, `end_time`

**✅ Correct:**
```sql
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
start_date DATE
expires_on DATE
```

**❌ Incorrect:**
```sql
created TIMESTAMPTZ     -- Should be: created_at
update_time TIMESTAMPTZ -- Should be: updated_at
start DATE              -- Should be: start_date
expiration DATE         -- Should be: expires_on or expires_at
```

### Rule 6: JSON/JSONB Columns → Descriptive Plural

JSONB columns storing collections should use descriptive plural names.

**✅ Correct:**
```sql
metadata JSONB        -- Generic settings/data
settings JSONB        -- Configuration settings
attributes JSONB      -- Collection of attributes
permissions JSONB     -- Collection of permissions
```

### Rule 7: Enum Columns → Descriptive Noun + Check Constraint

Enum-like columns should have clear names and documented valid values.

**✅ Correct:**
```sql
status VARCHAR(20) NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'inactive', 'pending', 'archived'))
  
role_name VARCHAR(50) NOT NULL DEFAULT 'org_user'
  CHECK (role_name IN ('org_user', 'org_admin', 'org_owner'))
  
subscription_tier VARCHAR(20) NOT NULL DEFAULT 'basic'
  CHECK (subscription_tier IN ('basic', 'professional', 'enterprise'))
```

---

## Constraint Naming Standards

### Primary Key Constraints

**Pattern:** `{table_name}_pkey`

```sql
CONSTRAINT orgs_pkey PRIMARY KEY (id)
CONSTRAINT org_members_pkey PRIMARY KEY (id)
```

### Foreign Key Constraints

**Pattern:** `fk_{child_table}_{column_name}`

```sql
CONSTRAINT fk_org_members_org_id FOREIGN KEY (org_id) REFERENCES orgs(id)
CONSTRAINT fk_org_members_user_id FOREIGN KEY (user_id) REFERENCES users(id)
CONSTRAINT fk_cert_commitments_org_id FOREIGN KEY (org_id) REFERENCES orgs(id)
```

### Unique Constraints

**Pattern:** `{table_name}_{column(s)}_key` or `uc_{table}_{column(s)}`

```sql
CONSTRAINT orgs_slug_key UNIQUE (slug)
CONSTRAINT org_members_org_user_key UNIQUE (org_id, user_id)
CONSTRAINT uc_user_cert_credential UNIQUE (user_id, org_id, credential_id)
```

### Check Constraints

**Pattern:** `{table_name}_{column}_check`

```sql
CONSTRAINT org_members_role_check CHECK (role_name IN ('org_user', 'org_admin', 'org_owner'))
CONSTRAINT cert_commitments_status_check CHECK (status IN ('committed', 'in_progress', 'completed', 'expired'))
```

---

## Index Naming Standards

### Single Column Index

**Pattern:** `idx_{table_name}_{column_name}`

```sql
CREATE INDEX idx_org_members_org_id ON org_members(org_id);
CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE INDEX idx_cert_commitments_status ON cert_commitments(status);
```

### Composite Index

**Pattern:** `idx_{table_name}_{col1}_{col2}_{...}`

```sql
CREATE INDEX idx_org_members_org_user ON org_members(org_id, user_id);
CREATE INDEX idx_cert_commitments_user_org ON cert_commitments(user_id, org_id);
CREATE INDEX idx_cert_commitments_org_status ON cert_commitments(org_id, status);
```

### Partial/Filtered Index

**Pattern:** `idx_{table_name}_{column}_where_{condition}`

```sql
CREATE INDEX idx_org_members_org_id_where_active 
  ON org_members(org_id) WHERE active = true;
  
CREATE INDEX idx_cert_commitments_user_id_where_active 
  ON cert_commitments(user_id) WHERE status = 'in_progress';
```

### Full-Text Search Index

**Pattern:** `idx_{table_name}_{column}_fts`

```sql
CREATE INDEX idx_orgs_name_fts ON orgs USING gin(to_tsvector('english', name));
CREATE INDEX idx_cert_ref_data_name_fts ON cert_ref_data USING gin(to_tsvector('english', cert_name));
```

---

## View Naming Standards

### Regular Views

Views should use descriptive names, optionally with `_view` suffix for clarity.

**Pattern:** `{descriptive_name}` or `{descriptive_name}_view`

```sql
CREATE VIEW user_org_memberships AS ...
CREATE VIEW org_member_details AS ...
CREATE VIEW active_cert_campaigns AS ...
CREATE VIEW external_certifications AS ...
```

### Materialized Views

Materialized views should have `_mv` suffix.

**Pattern:** `{descriptive_name}_mv`

```sql
CREATE MATERIALIZED VIEW cert_analytics_mv AS ...
CREATE MATERIALIZED VIEW org_stats_mv AS ...
```

---

## Function and Trigger Naming

### Functions

**Pattern:** `{verb}_{object}` or `{purpose}_function`

```sql
CREATE FUNCTION update_updated_at_column() ...
CREATE FUNCTION get_user_current_org_id(user_email TEXT) ...
CREATE FUNCTION is_org_member(user_email TEXT, org_id UUID) ...
CREATE FUNCTION calculate_cert_progress(user_id UUID) ...
```

### Triggers

**Pattern:** `{action}_{table}_{column/purpose}` or `{table}_{purpose}_trigger`

```sql
CREATE TRIGGER update_orgs_updated_at 
  BEFORE UPDATE ON orgs ...
  
CREATE TRIGGER update_org_members_updated_at 
  BEFORE UPDATE ON org_members ...
  
CREATE TRIGGER ensure_org_has_owner_trigger 
  BEFORE DELETE ON org_members ...
```

---

## General Principles

### 1. Consistency is Key

Once a pattern is established, apply it consistently across all similar objects.

### 2. Readability Over Brevity

Prefer clear, descriptive names over short, cryptic abbreviations (except for standard abbreviations).

**✅ Correct:**
```sql
CREATE TABLE cert_commitments (...);
CREATE TABLE user_ext_certs (...);
```

**❌ Incorrect:**
```sql
CREATE TABLE cc (...);     -- Too cryptic
CREATE TABLE usrextcrt (...); -- Unreadable
```

### 3. Avoid Unnecessary Prefixes

Don't prefix table names with redundant module identifiers if context is clear.

**✅ Correct:**
```sql
-- In certification-module schema:
CREATE TABLE cert_campaigns (...);   -- Clear context
CREATE TABLE cert_commitments (...); -- Clear context
```

**❌ Incorrect:**
```sql
-- Redundant prefixes:
CREATE TABLE certification_module_cert_campaigns (...);
```

### 4. Case Sensitivity

PostgreSQL is case-insensitive for unquoted identifiers. Always use lowercase with underscores for consistency.

### 5. Length Limits

Keep names under 63 characters (PostgreSQL identifier limit). Use abbreviations for very long names.

### 6. Documentation

Always add comments to tables and important columns:

```sql
COMMENT ON TABLE cert_commitments IS 'User commitments to earn specific certifications';
COMMENT ON COLUMN cert_commitments.org_id IS 'Organization ID for multi-tenancy isolation';
```

---

## Migration Guidelines

### When Renaming Existing Tables

1. **Create migration script** with clear documentation
2. **Update all foreign key constraints**
3. **Recreate indexes** with new naming convention
4. **Update RLS policies** referencing the table
5. **Update all application code** (Lambdas, frontend, etc.)
6. **Test thoroughly** before production deployment
7. **Plan rollback** strategy

### Example Migration Pattern

```sql
-- Step 1: Rename table
ALTER TABLE org RENAME TO orgs;

-- Step 2: Update foreign key references (if needed)
-- ALTER TABLE other_table DROP CONSTRAINT old_fk;
-- ALTER TABLE other_table ADD CONSTRAINT new_fk FOREIGN KEY (...);

-- Step 3: Update indexes
DROP INDEX IF EXISTS idx_org_slug;
CREATE INDEX idx_orgs_slug ON orgs(slug);

-- Step 4: Update RLS policies
DROP POLICY IF EXISTS "policy_name" ON org;
CREATE POLICY "policy_name" ON orgs ...;

-- Step 5: Add comment documenting change
COMMENT ON TABLE orgs IS 'Organizations table (renamed from org on 2025-11-12)';
```

---

## Enforcement

### Code Review Checklist

All database changes must:
- [ ] Follow naming conventions in this document
- [ ] Include proper constraints with standard naming
- [ ] Include indexes with standard naming
- [ ] Include table/column comments
- [ ] Update related documentation

### Automated Validation

Consider implementing pre-commit hooks or CI checks to validate:
- Table names follow plural/singular rules
- Column names use snake_case
- Constraint names follow patterns
- Index names follow patterns

---

## Appendix: Current State Analysis

### Tables Requiring Standardization

**High Priority (Core functionality):**
- `org` → `orgs`
- `user_cert` → `user_certs`
- `resume` → `resumes`

**Medium Priority:**
- `user_cert_source` → `user_cert_sources`
- `org_profile` → `org_profiles`
- `org_config` → `org_configs`

**Low Priority (External/Background):**
- `user_external_cert` → `user_ext_certs`
- `user_external_cert_attribute` → `user_ext_cert_attributes`
- `cert_source_type` → `cert_source_types`

### Tables Already Compliant

✅ Following standards:
- `org_members`
- `cert_campaigns`
- `cert_commitments`
- `profiles`
- `cert_ref_data`
- `org_certs`

---

## References

- [PostgreSQL Naming Conventions](https://www.postgresql.org/docs/current/sql-syntax-lexical.html)
- [Database Design Best Practices](https://www.postgresql.org/docs/current/ddl.html)
- Project: STS Career Platform Database Architecture

---

**Document History:**
- v1.0 (2025-11-12): Initial version - Comprehensive naming standards established
