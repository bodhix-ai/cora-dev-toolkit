# Evaluation Module - Data Model Specification

**Module Name:** module-eval  
**Version:** 1.0  
**Status:** Draft  
**Created:** January 15, 2026  
**Last Updated:** January 15, 2026

**Parent Specification:** [MODULE-EVAL-TECHNICAL-SPEC.md](../MODULE-EVAL-TECHNICAL-SPEC.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [System Configuration Entities](#system-configuration-entities)
4. [Organization Configuration Entities](#organization-configuration-entities)
5. [Document Types & Criteria Entities](#document-types--criteria-entities)
6. [Evaluation Results Entities](#evaluation-results-entities)
7. [Configuration Resolution Logic](#configuration-resolution-logic)
8. [RLS Policies](#rls-policies)
9. [RPC Functions](#rpc-functions)

---

## 1. Overview

The module-eval data model consists of 13 entities organized into 4 categories:

| Category | Entity Count | Purpose |
|----------|--------------|---------|
| System Configuration | 3 | Platform-wide defaults |
| Organization Configuration | 3 | Org-level overrides |
| Document Types & Criteria | 3 | Evaluation structure |
| Evaluation Results | 4 | Evaluation data |

### Naming Conventions

- All tables use `eval_` prefix
- System-level tables: `eval_sys_*`
- Organization-level tables: `eval_org_*`
- Snake_case for database columns
- camelCase for API responses

---

## 2. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM CONFIGURATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────────┐    ┌────────────────────┐ │
│  │ eval_sys_config  │    │eval_sys_prompt_config│    │eval_sys_status_opts│ │
│  │ (single row)     │    │ (3 rows by type)     │    │ (N default options)│ │
│  └──────────────────┘    └──────────────────────┘    └────────────────────┘ │
│           │                        │                          │              │
└───────────┼────────────────────────┼──────────────────────────┼──────────────┘
            │ (defaults)             │ (defaults)               │ (defaults)
            ▼                        ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORGANIZATION CONFIGURATION                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────────┐    ┌────────────────────┐ │
│  │ eval_org_config  │    │eval_org_prompt_config│    │eval_org_status_opts│ │
│  │ (1 per org)      │    │ (3 per org if deleg) │    │ (N per org)        │ │
│  │ has: org_id,     │    │ only if delegated    │    │ overrides sys      │ │
│  │ ai_config_deleg  │    │                      │    │                    │ │
│  └──────────────────┘    └──────────────────────┘    └────────────────────┘ │
│           │                                                                  │
└───────────┼──────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DOCUMENT TYPES & CRITERIA                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────────┐    ┌────────────────────┐ │
│  │ eval_doc_types   │───▶│ eval_criteria_sets   │───▶│eval_criteria_items │ │
│  │ (N per org)      │    │ (N per doc type)     │    │ (N per set)        │ │
│  └──────────────────┘    └──────────────────────┘    └────────────────────┘ │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EVALUATION RESULTS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────────┐                           │
│  │ eval_doc_summary │───▶│ eval_doc_set         │                           │
│  │ (1 per eval)     │    │ (N docs per eval)    │                           │
│  └────────┬─────────┘    └──────────────────────┘                           │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────┐    ┌──────────────────────┐                           │
│  │eval_criteria_res │───▶│ eval_result_edits    │                           │
│  │ (N per eval)     │    │ (N versions per res) │                           │
│  │ (AI immutable)   │    │ (human edits)        │                           │
│  └──────────────────┘    └──────────────────────┘                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. System Configuration Entities

### 3.1 eval_sys_config

**Purpose:** Platform-wide default settings for the evaluation module.

**Table:** Single row configuration table.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| categorical_mode | TEXT | NO | 'detailed' | Default scoring mode: 'boolean' or 'detailed' |
| show_numerical_score | BOOLEAN | NO | true | Show numerical compliance score |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |
| created_by | UUID | YES | NULL | User who created (FK to user_profiles) |
| updated_by | UUID | YES | NULL | User who last updated |

**Constraints:**
```sql
CONSTRAINT eval_sys_config_pkey PRIMARY KEY (id)
CONSTRAINT eval_sys_config_categorical_mode_check 
  CHECK (categorical_mode IN ('boolean', 'detailed'))
```

**Indexes:**
- None (single row table)

**Seed Data:**
```sql
INSERT INTO eval_sys_config (categorical_mode, show_numerical_score)
VALUES ('detailed', true);
```

---

### 3.2 eval_sys_prompt_config

**Purpose:** Default AI prompts and model configurations for evaluation processing.

**Table:** Three rows, one per prompt type.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| prompt_type | TEXT | NO | - | Type: 'doc_summary', 'evaluation', 'eval_summary' |
| ai_provider_id | UUID | YES | NULL | FK to ai_cfg_providers |
| ai_model_id | UUID | YES | NULL | FK to ai_cfg_models |
| system_prompt | TEXT | YES | NULL | System prompt template |
| user_prompt_template | TEXT | YES | NULL | User prompt template with placeholders |
| temperature | DECIMAL(3,2) | NO | 0.3 | AI temperature (0.0-1.0) |
| max_tokens | INTEGER | NO | 2000 | Maximum response tokens |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |
| created_by | UUID | YES | NULL | User who created |
| updated_by | UUID | YES | NULL | User who last updated |

**Constraints:**
```sql
CONSTRAINT eval_sys_prompt_config_pkey PRIMARY KEY (id)
CONSTRAINT eval_sys_prompt_config_type_unique UNIQUE (prompt_type)
CONSTRAINT eval_sys_prompt_config_type_check 
  CHECK (prompt_type IN ('doc_summary', 'evaluation', 'eval_summary'))
CONSTRAINT eval_sys_prompt_config_temp_check 
  CHECK (temperature >= 0 AND temperature <= 1)
```

**Prompt Types:**

| Type | Purpose | Template Variables |
|------|---------|-------------------|
| doc_summary | Generate document summary | `{document_content}`, `{document_name}` |
| evaluation | Evaluate criteria item | `{criteria_requirement}`, `{context}`, `{status_options}` |
| eval_summary | Generate overall summary | `{criteria_results}`, `{doc_summary}` |

**Default Prompts:**

```sql
-- doc_summary
INSERT INTO eval_sys_prompt_config (prompt_type, system_prompt, user_prompt_template)
VALUES (
  'doc_summary',
  'You are a document analysis assistant. Provide concise, accurate summaries.',
  'Summarize the following document:\n\nDocument: {document_name}\n\n{document_content}'
);

-- evaluation  
INSERT INTO eval_sys_prompt_config (prompt_type, system_prompt, user_prompt_template)
VALUES (
  'evaluation',
  'You are a compliance evaluation assistant. Evaluate documents against criteria and provide citations.',
  'Evaluate the following criteria against the provided document context.\n\nCriteria: {criteria_requirement}\n\nContext from documents:\n{context}\n\nStatus options: {status_options}\n\nProvide: status, confidence (0-100), explanation, and specific citations.'
);

-- eval_summary
INSERT INTO eval_sys_prompt_config (prompt_type, system_prompt, user_prompt_template)
VALUES (
  'eval_summary',
  'You are a compliance summary assistant. Synthesize evaluation results into actionable insights.',
  'Generate an executive summary of the following evaluation:\n\nDocument Summary:\n{doc_summary}\n\nCriteria Results:\n{criteria_results}'
);
```

---

### 3.3 eval_sys_status_options

**Purpose:** Default status options for evaluation results.

**Table:** Multiple rows for default status options.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| name | TEXT | NO | - | Status display name |
| color | TEXT | NO | '#9e9e9e' | Hex color code |
| score_value | DECIMAL(5,2) | YES | NULL | Numerical score (0-100) for aggregation |
| order_index | INTEGER | NO | 0 | Display order |
| mode | TEXT | NO | 'detailed' | Which mode uses this: 'boolean', 'detailed', 'both' |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |

**Constraints:**
```sql
CONSTRAINT eval_sys_status_options_pkey PRIMARY KEY (id)
CONSTRAINT eval_sys_status_options_name_mode_unique UNIQUE (name, mode)
CONSTRAINT eval_sys_status_options_mode_check 
  CHECK (mode IN ('boolean', 'detailed', 'both'))
```

**Indexes:**
```sql
CREATE INDEX idx_eval_sys_status_options_mode ON eval_sys_status_options(mode);
```

**Seed Data:**

```sql
-- Boolean mode options
INSERT INTO eval_sys_status_options (name, color, score_value, order_index, mode) VALUES
('Non-Compliant', '#f44336', 0, 1, 'boolean'),
('Compliant', '#4caf50', 100, 2, 'boolean');

-- Detailed mode options
INSERT INTO eval_sys_status_options (name, color, score_value, order_index, mode) VALUES
('Non-Compliant', '#f44336', 0, 1, 'detailed'),
('Major Issues', '#ff9800', 25, 2, 'detailed'),
('Minor Issues', '#ffeb3b', 50, 3, 'detailed'),
('Partial', '#8bc34a', 75, 4, 'detailed'),
('Compliant', '#4caf50', 100, 5, 'detailed'),
('Exceeds', '#2196f3', 100, 6, 'detailed');
```

---

## 4. Organization Configuration Entities

### 4.1 eval_org_config

**Purpose:** Organization-specific evaluation settings and delegation control.

**Table:** One row per organization.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| org_id | UUID | NO | - | FK to organizations |
| ai_config_delegated | BOOLEAN | NO | false | Can org customize AI prompts/models? |
| categorical_mode | TEXT | YES | NULL | Override: 'boolean' or 'detailed' (NULL = use sys) |
| show_numerical_score | BOOLEAN | YES | NULL | Override: show score (NULL = use sys) |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |
| created_by | UUID | YES | NULL | User who created |
| updated_by | UUID | YES | NULL | User who last updated |

**Constraints:**
```sql
CONSTRAINT eval_org_config_pkey PRIMARY KEY (id)
CONSTRAINT eval_org_config_org_unique UNIQUE (org_id)
CONSTRAINT eval_org_config_org_fk FOREIGN KEY (org_id) 
  REFERENCES organizations(id) ON DELETE CASCADE
CONSTRAINT eval_org_config_mode_check 
  CHECK (categorical_mode IS NULL OR categorical_mode IN ('boolean', 'detailed'))
```

**Indexes:**
```sql
CREATE INDEX idx_eval_org_config_org ON eval_org_config(org_id);
```

---

### 4.2 eval_org_prompt_config

**Purpose:** Organization-level prompt overrides (only used if ai_config_delegated = true).

**Table:** Up to 3 rows per organization (one per prompt type).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| org_id | UUID | NO | - | FK to organizations |
| prompt_type | TEXT | NO | - | Type: 'doc_summary', 'evaluation', 'eval_summary' |
| ai_provider_id | UUID | YES | NULL | FK to ai_cfg_providers (override) |
| ai_model_id | UUID | YES | NULL | FK to ai_cfg_models (override) |
| system_prompt | TEXT | YES | NULL | System prompt override |
| user_prompt_template | TEXT | YES | NULL | User prompt template override |
| temperature | DECIMAL(3,2) | YES | NULL | Temperature override |
| max_tokens | INTEGER | YES | NULL | Max tokens override |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |
| created_by | UUID | YES | NULL | User who created |
| updated_by | UUID | YES | NULL | User who last updated |

**Constraints:**
```sql
CONSTRAINT eval_org_prompt_config_pkey PRIMARY KEY (id)
CONSTRAINT eval_org_prompt_config_org_type_unique UNIQUE (org_id, prompt_type)
CONSTRAINT eval_org_prompt_config_org_fk FOREIGN KEY (org_id) 
  REFERENCES organizations(id) ON DELETE CASCADE
CONSTRAINT eval_org_prompt_config_type_check 
  CHECK (prompt_type IN ('doc_summary', 'evaluation', 'eval_summary'))
```

**Indexes:**
```sql
CREATE INDEX idx_eval_org_prompt_config_org ON eval_org_prompt_config(org_id);
```

**Usage Note:** This table is only queried when `eval_org_config.ai_config_delegated = true` for the organization.

---

### 4.3 eval_org_status_options

**Purpose:** Organization-level status options (override system defaults).

**Table:** Multiple rows per organization.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| org_id | UUID | NO | - | FK to organizations |
| name | TEXT | NO | - | Status display name |
| color | TEXT | NO | '#9e9e9e' | Hex color code |
| score_value | DECIMAL(5,2) | YES | NULL | Numerical score (0-100) |
| order_index | INTEGER | NO | 0 | Display order |
| is_active | BOOLEAN | NO | true | Soft delete flag |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |
| created_by | UUID | YES | NULL | User who created |
| updated_by | UUID | YES | NULL | User who last updated |

**Constraints:**
```sql
CONSTRAINT eval_org_status_options_pkey PRIMARY KEY (id)
CONSTRAINT eval_org_status_options_org_name_unique UNIQUE (org_id, name)
CONSTRAINT eval_org_status_options_org_fk FOREIGN KEY (org_id) 
  REFERENCES organizations(id) ON DELETE CASCADE
```

**Indexes:**
```sql
CREATE INDEX idx_eval_org_status_options_org ON eval_org_status_options(org_id);
CREATE INDEX idx_eval_org_status_options_active ON eval_org_status_options(org_id, is_active);
```

---

## 5. Document Types & Criteria Entities

### 5.1 eval_doc_types

**Purpose:** Document categories that can be evaluated (per organization).

**Table:** Multiple rows per organization.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| org_id | UUID | NO | - | FK to organizations |
| name | TEXT | NO | - | Document type name (e.g., "IT Security Policy") |
| description | TEXT | YES | NULL | Description of the document type |
| is_active | BOOLEAN | NO | true | Soft delete flag |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |
| created_by | UUID | YES | NULL | User who created |
| updated_by | UUID | YES | NULL | User who last updated |

**Constraints:**
```sql
CONSTRAINT eval_doc_types_pkey PRIMARY KEY (id)
CONSTRAINT eval_doc_types_org_name_unique UNIQUE (org_id, name)
CONSTRAINT eval_doc_types_org_fk FOREIGN KEY (org_id) 
  REFERENCES organizations(id) ON DELETE CASCADE
```

**Indexes:**
```sql
CREATE INDEX idx_eval_doc_types_org ON eval_doc_types(org_id);
CREATE INDEX idx_eval_doc_types_active ON eval_doc_types(org_id, is_active);
```

**Example Document Types:**
- IT Security Policy
- Business Continuity Plan
- Vendor Risk Assessment
- Appraisal Report
- Financial Statement

---

### 5.2 eval_criteria_sets

**Purpose:** Collections of evaluation criteria linked to document types.

**Table:** Multiple rows per document type.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| doc_type_id | UUID | NO | - | FK to eval_doc_types |
| name | TEXT | NO | - | Criteria set name |
| description | TEXT | YES | NULL | Set description |
| version | TEXT | YES | '1.0' | Version identifier |
| use_weighted_scoring | BOOLEAN | NO | false | Use weights for score calculation |
| source_file_name | TEXT | YES | NULL | Original import file name |
| is_active | BOOLEAN | NO | true | Soft delete flag |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |
| created_by | UUID | YES | NULL | User who created |
| updated_by | UUID | YES | NULL | User who last updated |

**Constraints:**
```sql
CONSTRAINT eval_criteria_sets_pkey PRIMARY KEY (id)
CONSTRAINT eval_criteria_sets_doc_type_name_version_unique 
  UNIQUE (doc_type_id, name, version)
CONSTRAINT eval_criteria_sets_doc_type_fk FOREIGN KEY (doc_type_id) 
  REFERENCES eval_doc_types(id) ON DELETE CASCADE
```

**Indexes:**
```sql
CREATE INDEX idx_eval_criteria_sets_doc_type ON eval_criteria_sets(doc_type_id);
CREATE INDEX idx_eval_criteria_sets_active ON eval_criteria_sets(doc_type_id, is_active);
```

---

### 5.3 eval_criteria_items

**Purpose:** Individual evaluation criteria within a criteria set.

**Table:** Multiple rows per criteria set.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| criteria_set_id | UUID | NO | - | FK to eval_criteria_sets |
| criteria_id | TEXT | NO | - | External identifier (from import) |
| requirement | TEXT | NO | - | The requirement text to evaluate |
| description | TEXT | YES | NULL | Additional context/guidance |
| category | TEXT | YES | NULL | Grouping category |
| weight | DECIMAL(5,2) | NO | 1.0 | Weight for scoring (if weighted) |
| order_index | INTEGER | NO | 0 | Display order |
| is_active | BOOLEAN | NO | true | Soft delete flag |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |

**Constraints:**
```sql
CONSTRAINT eval_criteria_items_pkey PRIMARY KEY (id)
CONSTRAINT eval_criteria_items_set_criteria_unique 
  UNIQUE (criteria_set_id, criteria_id)
CONSTRAINT eval_criteria_items_set_fk FOREIGN KEY (criteria_set_id) 
  REFERENCES eval_criteria_sets(id) ON DELETE CASCADE
CONSTRAINT eval_criteria_items_weight_check CHECK (weight > 0)
```

**Indexes:**
```sql
CREATE INDEX idx_eval_criteria_items_set ON eval_criteria_items(criteria_set_id);
CREATE INDEX idx_eval_criteria_items_category ON eval_criteria_items(criteria_set_id, category);
```

**Import Format (CSV/XLSX):**

| Column | Required | Description |
|--------|----------|-------------|
| criteria_id | YES | Unique identifier within set |
| requirement | YES | The compliance requirement text |
| description | NO | Additional guidance |
| category | NO | Grouping category |
| weight | NO | Scoring weight (default: 1.0) |

---

## 6. Evaluation Results Entities

### 6.1 eval_doc_summary

**Purpose:** Main evaluation record with summaries and status.

**Table:** One row per evaluation.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| workspace_id | UUID | NO | - | FK to workspaces |
| doc_type_id | UUID | NO | - | FK to eval_doc_types |
| criteria_set_id | UUID | NO | - | FK to eval_criteria_sets |
| name | TEXT | NO | - | Evaluation name/title |
| status | TEXT | NO | 'pending' | Processing status |
| progress | INTEGER | NO | 0 | Processing progress (0-100) |
| doc_summary | TEXT | YES | NULL | AI-generated document summary |
| eval_summary | TEXT | YES | NULL | AI-generated evaluation summary |
| compliance_score | DECIMAL(5,2) | YES | NULL | Overall compliance percentage |
| error_message | TEXT | YES | NULL | Error details if failed |
| started_at | TIMESTAMPTZ | YES | NULL | Processing start time |
| completed_at | TIMESTAMPTZ | YES | NULL | Processing completion time |
| is_deleted | BOOLEAN | NO | false | Soft delete flag |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |
| created_by | UUID | YES | NULL | User who created |
| updated_by | UUID | YES | NULL | User who last updated |

**Constraints:**
```sql
CONSTRAINT eval_doc_summary_pkey PRIMARY KEY (id)
CONSTRAINT eval_doc_summary_workspace_fk FOREIGN KEY (workspace_id) 
  REFERENCES workspaces(id) ON DELETE CASCADE
CONSTRAINT eval_doc_summary_doc_type_fk FOREIGN KEY (doc_type_id) 
  REFERENCES eval_doc_types(id) ON DELETE RESTRICT
CONSTRAINT eval_doc_summary_criteria_set_fk FOREIGN KEY (criteria_set_id) 
  REFERENCES eval_criteria_sets(id) ON DELETE RESTRICT
CONSTRAINT eval_doc_summary_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
CONSTRAINT eval_doc_summary_progress_check 
  CHECK (progress >= 0 AND progress <= 100)
```

**Indexes:**
```sql
CREATE INDEX idx_eval_doc_summary_workspace ON eval_doc_summary(workspace_id);
CREATE INDEX idx_eval_doc_summary_status ON eval_doc_summary(workspace_id, status);
CREATE INDEX idx_eval_doc_summary_doc_type ON eval_doc_summary(doc_type_id);
CREATE INDEX idx_eval_doc_summary_deleted ON eval_doc_summary(workspace_id, is_deleted);
```

**Status Values:**

| Status | Description |
|--------|-------------|
| pending | Created, waiting for processing |
| processing | Currently being evaluated |
| completed | Successfully completed |
| failed | Processing failed (see error_message) |

---

### 6.2 eval_doc_set

**Purpose:** Links evaluations to documents (supports multi-document evaluations).

**Table:** Multiple rows per evaluation.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| eval_summary_id | UUID | NO | - | FK to eval_doc_summary |
| kb_doc_id | UUID | NO | - | FK to kb_documents (module-kb) |
| doc_summary | TEXT | YES | NULL | Individual document summary |
| order_index | INTEGER | NO | 0 | Document order (primary first) |
| is_primary | BOOLEAN | NO | false | Is this the primary document? |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |

**Constraints:**
```sql
CONSTRAINT eval_doc_set_pkey PRIMARY KEY (id)
CONSTRAINT eval_doc_set_eval_summary_fk FOREIGN KEY (eval_summary_id) 
  REFERENCES eval_doc_summary(id) ON DELETE CASCADE
CONSTRAINT eval_doc_set_eval_doc_unique UNIQUE (eval_summary_id, kb_doc_id)
```

**Indexes:**
```sql
CREATE INDEX idx_eval_doc_set_eval ON eval_doc_set(eval_summary_id);
CREATE INDEX idx_eval_doc_set_doc ON eval_doc_set(kb_doc_id);
```

---

### 6.3 eval_criteria_results

**Purpose:** AI-generated evaluation results (immutable for audit).

**Table:** One row per criteria item per evaluation.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| eval_summary_id | UUID | NO | - | FK to eval_doc_summary |
| criteria_item_id | UUID | NO | - | FK to eval_criteria_items |
| ai_result | TEXT | YES | NULL | AI-generated explanation |
| ai_status_id | UUID | YES | NULL | FK to status option selected by AI |
| ai_confidence | INTEGER | YES | NULL | AI confidence score (0-100) |
| ai_citations | JSONB | YES | '[]' | Array of citation objects |
| processed_at | TIMESTAMPTZ | YES | NULL | When this item was processed |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |

**Constraints:**
```sql
CONSTRAINT eval_criteria_results_pkey PRIMARY KEY (id)
CONSTRAINT eval_criteria_results_eval_criteria_unique 
  UNIQUE (eval_summary_id, criteria_item_id)
CONSTRAINT eval_criteria_results_eval_summary_fk FOREIGN KEY (eval_summary_id) 
  REFERENCES eval_doc_summary(id) ON DELETE CASCADE
CONSTRAINT eval_criteria_results_criteria_item_fk FOREIGN KEY (criteria_item_id) 
  REFERENCES eval_criteria_items(id) ON DELETE RESTRICT
CONSTRAINT eval_criteria_results_confidence_check 
  CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 100))
```

**Indexes:**
```sql
CREATE INDEX idx_eval_criteria_results_eval ON eval_criteria_results(eval_summary_id);
CREATE INDEX idx_eval_criteria_results_criteria ON eval_criteria_results(criteria_item_id);
```

**Citation JSONB Schema:**

```json
{
  "citations": [
    {
      "doc_id": "uuid",
      "doc_name": "Policy.pdf",
      "chunk_id": "uuid",
      "text": "Excerpt from document...",
      "page": 5,
      "relevance_score": 0.92
    }
  ]
}
```

---

### 6.4 eval_result_edits

**Purpose:** Human edits to AI results with version control.

**Table:** Multiple rows per criteria result (version history).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| criteria_result_id | UUID | NO | - | FK to eval_criteria_results |
| version | INTEGER | NO | 1 | Edit version number |
| edited_result | TEXT | YES | NULL | Human-edited explanation |
| edited_status_id | UUID | YES | NULL | Human-selected status |
| edit_notes | TEXT | YES | NULL | Notes about the edit |
| is_current | BOOLEAN | NO | true | Is this the current version? |
| created_at | TIMESTAMPTZ | NO | now() | Edit timestamp |
| created_by | UUID | YES | NULL | User who made the edit |

**Constraints:**
```sql
CONSTRAINT eval_result_edits_pkey PRIMARY KEY (id)
CONSTRAINT eval_result_edits_result_version_unique 
  UNIQUE (criteria_result_id, version)
CONSTRAINT eval_result_edits_criteria_result_fk FOREIGN KEY (criteria_result_id) 
  REFERENCES eval_criteria_results(id) ON DELETE CASCADE
```

**Indexes:**
```sql
CREATE INDEX idx_eval_result_edits_result ON eval_result_edits(criteria_result_id);
CREATE INDEX idx_eval_result_edits_current ON eval_result_edits(criteria_result_id, is_current);
```

**Versioning Logic:**

When creating a new edit:
1. Set `is_current = false` on all existing edits for the result
2. Insert new edit with `version = MAX(version) + 1` and `is_current = true`

---

## 7. Configuration Resolution Logic

### 7.1 Get Effective Config

```python
def get_eval_config(org_id: str) -> EvalConfig:
    """Resolve evaluation config with org overrides."""
    
    # Get system defaults
    sys_config = db.query_one(
        "SELECT * FROM eval_sys_config LIMIT 1"
    )
    
    # Get org overrides
    org_config = db.query_one(
        "SELECT * FROM eval_org_config WHERE org_id = %s",
        [org_id]
    )
    
    # Merge with fallback to system defaults
    return EvalConfig(
        categorical_mode=(
            org_config.categorical_mode 
            if org_config and org_config.categorical_mode 
            else sys_config.categorical_mode
        ),
        show_numerical_score=(
            org_config.show_numerical_score 
            if org_config and org_config.show_numerical_score is not None
            else sys_config.show_numerical_score
        ),
        ai_config_delegated=(
            org_config.ai_config_delegated 
            if org_config 
            else False
        )
    )
```

### 7.2 Get Prompt Config

```python
def get_prompt_config(org_id: str, prompt_type: str) -> PromptConfig:
    """Resolve prompt config with delegation check."""
    
    # Check if org has delegation enabled
    org_config = db.query_one(
        "SELECT ai_config_delegated FROM eval_org_config WHERE org_id = %s",
        [org_id]
    )
    
    if org_config and org_config.ai_config_delegated:
        # Try org-level prompt
        org_prompt = db.query_one(
            """SELECT * FROM eval_org_prompt_config 
               WHERE org_id = %s AND prompt_type = %s""",
            [org_id, prompt_type]
        )
        if org_prompt:
            return PromptConfig.from_row(org_prompt)
    
    # Fall back to system prompt
    sys_prompt = db.query_one(
        "SELECT * FROM eval_sys_prompt_config WHERE prompt_type = %s",
        [prompt_type]
    )
    return PromptConfig.from_row(sys_prompt)
```

### 7.3 Get Status Options

```python
def get_status_options(org_id: str, mode: str) -> List[StatusOption]:
    """Get status options for org (org overrides sys)."""
    
    # Check for org-level options
    org_options = db.query(
        """SELECT * FROM eval_org_status_options 
           WHERE org_id = %s AND is_active = true
           ORDER BY order_index""",
        [org_id]
    )
    
    if org_options:
        return [StatusOption.from_row(r) for r in org_options]
    
    # Fall back to system options for mode
    sys_options = db.query(
        """SELECT * FROM eval_sys_status_options 
           WHERE mode IN (%s, 'both')
           ORDER BY order_index""",
        [mode]
    )
    return [StatusOption.from_row(r) for r in sys_options]
```

---

## 8. RLS Policies

### 8.1 System Configuration Tables

```sql
-- eval_sys_config: Only sys_admin can read/write
ALTER TABLE eval_sys_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY eval_sys_config_select ON eval_sys_config
    FOR SELECT USING (
        auth.jwt() ->> 'sys_role' IN ('sys_owner', 'sys_admin')
    );

CREATE POLICY eval_sys_config_update ON eval_sys_config
    FOR UPDATE USING (
        auth.jwt() ->> 'sys_role' IN ('sys_owner', 'sys_admin')
    );

-- eval_sys_prompt_config: Only sys_admin
ALTER TABLE eval_sys_prompt_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY eval_sys_prompt_config_select ON eval_sys_prompt_config
    FOR SELECT USING (
        auth.jwt() ->> 'sys_role' IN ('sys_owner', 'sys_admin')
    );

CREATE POLICY eval_sys_prompt_config_all ON eval_sys_prompt_config
    FOR ALL USING (
        auth.jwt() ->> 'sys_role' IN ('sys_owner', 'sys_admin')
    );

-- eval_sys_status_options: Sys admin write, all authenticated read
ALTER TABLE eval_sys_status_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY eval_sys_status_options_select ON eval_sys_status_options
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY eval_sys_status_options_all ON eval_sys_status_options
    FOR ALL USING (
        auth.jwt() ->> 'sys_role' IN ('sys_owner', 'sys_admin')
    );
```

### 8.2 Organization Configuration Tables

```sql
-- eval_org_config: Sys admin can read all, org admin can read/write own
ALTER TABLE eval_org_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY eval_org_config_sys_admin ON eval_org_config
    FOR ALL USING (
        auth.jwt() ->> 'sys_role' IN ('sys_owner', 'sys_admin')
    );

CREATE POLICY eval_org_config_org_admin ON eval_org_config
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = eval_org_config.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
        )
    );

CREATE POLICY eval_org_config_org_admin_update ON eval_org_config
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = eval_org_config.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
        )
    );

-- eval_org_prompt_config: Similar pattern with delegation check
ALTER TABLE eval_org_prompt_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY eval_org_prompt_config_delegated ON eval_org_prompt_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM eval_org_config 
            WHERE eval_org_config.org_id = eval_org_prompt_config.org_id
            AND eval_org_config.ai_config_delegated = true
        )
        AND EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = eval_org_prompt_config.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
        )
    );
```

### 8.3 Document Types & Criteria Tables

```sql
-- eval_doc_types: Org members can read, org admin can write
ALTER TABLE eval_doc_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY eval_doc_types_select ON eval_doc_types
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = eval_doc_types.org_id
            AND org_members.user_id = auth.uid()
        )
    );

CREATE POLICY eval_doc_types_all ON eval_doc_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = eval_doc_types.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
        )
    );

-- eval_criteria_sets and eval_criteria_items: Similar pattern
-- (org member select, org admin all)
```

### 8.4 Evaluation Results Tables

```sql
-- eval_doc_summary: Workspace members can access
ALTER TABLE eval_doc_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY eval_doc_summary_select ON eval_doc_summary
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_members.workspace_id = eval_doc_summary.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY eval_doc_summary_insert ON eval_doc_summary
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_members.workspace_id = eval_doc_summary.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY eval_doc_summary_update ON eval_doc_summary
    FOR UPDATE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_members.workspace_id = eval_doc_summary.workspace_id
            AND workspace_members.user_id = auth.uid()
            AND workspace_members.ws_role IN ('ws_owner', 'ws_admin')
        )
    );

CREATE POLICY eval_doc_summary_delete ON eval_doc_summary
    FOR DELETE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_members.workspace_id = eval_doc_summary.workspace_id
            AND workspace_members.user_id = auth.uid()
            AND workspace_members.ws_role IN ('ws_owner', 'ws_admin')
        )
    );
```

---

## 9. RPC Functions

### 9.1 can_manage_eval_config

```sql
CREATE OR REPLACE FUNCTION can_manage_eval_config(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM org_members
        WHERE org_id = p_org_id
        AND user_id = p_user_id
        AND org_role IN ('org_owner', 'org_admin')
    );
END;
$$;
```

### 9.2 is_eval_owner

```sql
CREATE OR REPLACE FUNCTION is_eval_owner(p_user_id UUID, p_eval_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM eval_doc_summary
        WHERE id = p_eval_id
        AND created_by = p_user_id
    );
END;
$$;
```

### 9.3 get_eval_config

```sql
CREATE OR REPLACE FUNCTION get_eval_config(p_org_id UUID)
RETURNS TABLE (
    categorical_mode TEXT,
    show_numerical_score BOOLEAN,
    ai_config_delegated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sys_config RECORD;
    v_org_config RECORD;
BEGIN
    -- Get system defaults
    SELECT * INTO v_sys_config FROM eval_sys_config LIMIT 1;
    
    -- Get org overrides
    SELECT * INTO v_org_config FROM eval_org_config WHERE org_id = p_org_id;
    
    RETURN QUERY SELECT
        COALESCE(v_org_config.categorical_mode, v_sys_config.categorical_mode),
        COALESCE(v_org_config.show_numerical_score, v_sys_config.show_numerical_score),
        COALESCE(v_org_config.ai_config_delegated, false);
END;
$$;
```

### 9.4 get_effective_status_options

```sql
CREATE OR REPLACE FUNCTION get_effective_status_options(p_org_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    color TEXT,
    score_value DECIMAL(5,2),
    order_index INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config RECORD;
    v_has_org_options BOOLEAN;
BEGIN
    -- Get effective config to determine mode
    SELECT * INTO v_config FROM get_eval_config(p_org_id);
    
    -- Check if org has custom status options
    SELECT EXISTS (
        SELECT 1 FROM eval_org_status_options 
        WHERE org_id = p_org_id AND is_active = true
    ) INTO v_has_org_options;
    
    IF v_has_org_options THEN
        RETURN QUERY
            SELECT eso.id, eso.name, eso.color, eso.score_value, eso.order_index
            FROM eval_org_status_options eso
            WHERE eso.org_id = p_org_id AND eso.is_active = true
            ORDER BY eso.order_index;
    ELSE
        RETURN QUERY
            SELECT sso.id, sso.name, sso.color, sso.score_value, sso.order_index
            FROM eval_sys_status_options sso
            WHERE sso.mode IN (v_config.categorical_mode, 'both')
            ORDER BY sso.order_index;
    END IF;
END;
$$;
```

---

**Document Version:** 1.0  
**Last Updated:** January 15, 2026
