# Module-AI Merge Plan: ai-config + ai-enablement

**Date:** December 11, 2025  
**Author:** Claude (Cline Agent)  
**Purpose:** Document the analysis methodology and execution plan for merging ai-config-module and ai-enablement-module into a unified module-ai

---

## Part 1: Analysis Methodology (Repeatable Template)

This section describes the systematic approach used to analyze a CORA module for completeness. **This methodology can be repeated for module-access and module-mgmt.**

### Step 1: Identify Source Modules in pm-app-stack

```bash
# List all packages that might be related to the target module
find pm-app-stack/packages -maxdepth 1 -type d -name "*<module-keyword>*"

# For module-ai, we found:
# - pm-app-stack/packages/ai-config-module
# - pm-app-stack/packages/ai-enablement-module
```

### Step 2: Explore Module Structure

```bash
# List all TypeScript, SQL files in each module
find pm-app-stack/packages/<module-name> -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.sql" -o -name "*.py" \)

# Key directories to check:
# - frontend/           # React components, hooks, types
# - backend/lambdas/    # Lambda functions
# - backend/layers/     # Shared Lambda layers
# - db/schema/          # Base SQL schema files
# - db/migrations/      # Incremental migrations
```

### Step 3: Find All Lambda Functions

```bash
# Find all Lambda code directories
find pm-app-stack/packages/<module-name> -type d -name "lambdas"

# List Lambda function files
find pm-app-stack/packages/<module-name>/backend -name "*.py" -o -name "*.ts"
```

### Step 4: Extract Database Table References from Code

```bash
# Search for table references in Lambda code
grep -rn "<table_name>" pm-app-stack/packages/<module-name> --include="*.py" --include="*.ts"

# Common patterns to search for:
# - table='<name>'
# - from '<name>'
# - .table('<name>')
# - supabase.from('<name>')
```

### Step 5: Query Production Database for Table Schemas

```bash
# Get ALL tables from production
curl -s "$SUPABASE_URL/rest/v1/" -H "apikey: $KEY" | jq '.definitions | keys[]'

# Get columns for specific table
curl -s "$SUPABASE_URL/rest/v1/<table>?select=*&limit=1" -H "apikey: $KEY" | jq '.[0] | keys'
```

### Step 6: Compare Against Toolkit Migration Files

```bash
# List current schema files in toolkit
ls -la cora-dev-toolkit/templates/_cora-core-modules/<module>/db/schema/
ls -la cora-dev-toolkit/templates/_cora-core-modules/<module>/db/migrations/

# Check what tables each file creates
grep -E "CREATE TABLE|CREATE VIEW" <file>.sql
```

### Step 7: Verify RLS Policies

```bash
# Check for RLS policies in each schema file
grep -E "ENABLE ROW LEVEL SECURITY|CREATE POLICY" <file>.sql

# Required policies for each table:
# 1. Admin access policy (for authenticated admins)
# 2. Service role policy (for Lambda functions)
```

### Step 8: Document Findings

Create a summary table showing:

- All tables required by the module
- Whether each table is in schema/ or migrations/
- RLS policy status
- External dependencies (tables from other modules)

---

## Part 2: Module-AI Analysis Results

### Source Modules Identified

| Source Module        | Location                                     | Purpose                         |
| -------------------- | -------------------------------------------- | ------------------------------- |
| ai-config-module     | `pm-app-stack/packages/ai-config-module`     | Org-level AI configuration      |
| ai-enablement-module | `pm-app-stack/packages/ai-enablement-module` | Platform AI provider management |

### Database Tables Required

| Table                          | Type  | Source File                 | Status            | Used By              |
| ------------------------------ | ----- | --------------------------- | ----------------- | -------------------- |
| `ai_providers`                 | TABLE | schema/001-ai-providers.sql | ✅ Complete       | Both Lambdas         |
| `ai_models`                    | TABLE | schema/002-ai-models.sql    | ✅ Complete       | Both Lambdas         |
| `ai_model_validation_history`  | TABLE | migrations/003-\*.sql       | ⚠️ Move to schema | ai-enablement Lambda |
| `ai_model_validation_progress` | TABLE | migrations/004-\*.sql       | ⚠️ Move to schema | ai-enablement Lambda |
| `ai_provider_model_summary`    | VIEW  | migrations/003-\*.sql       | ⚠️ Move to schema | Frontend queries     |

### External Dependencies (from module-access)

| Table                    | Used By          | Purpose            |
| ------------------------ | ---------------- | ------------------ |
| `profiles`               | Both Lambdas     | Admin verification |
| `org_prompt_engineering` | ai-config Lambda | Org AI settings    |

### Lambda Functions

**Lambda 1: ai-config-handler**

- Path: `packages/ai-config-module/backend/lambdas/ai-config-handler/lambda_function.py`
- Layer: `ai-config-common` (models.py, validators.py, types.py)
- Endpoints:
  - GET `/orgs/{orgId}/ai/config` - Get org AI configuration
  - PUT `/orgs/{orgId}/ai/config` - Update org AI configuration
  - GET `/admin/ai-providers` - List providers (admin)
  - GET `/admin/ai-models` - List models (admin)

**Lambda 2: provider**

- Path: `packages/ai-enablement-module/backend/lambdas/provider/lambda_function.py`
- No separate layer (inline code)
- Endpoints:
  - GET/POST/PUT/DELETE `/admin/providers` - Provider CRUD
  - POST `/admin/providers/{id}/discover` - Discover models
  - POST `/admin/providers/{id}/validate` - Validate models
  - GET `/admin/providers/{id}/validation-status` - Get validation progress

### RLS Policies Status

| Table                        | Admin Policy | Service Role Policy | Notes       |
| ---------------------------- | ------------ | ------------------- | ----------- |
| ai_providers                 | ✅           | ✅                  | Complete    |
| ai_models                    | ✅           | ✅                  | Complete    |
| ai_model_validation_history  | ✅           | ❌ Missing          | Need to add |
| ai_model_validation_progress | ✅           | ❌ Missing          | Need to add |

### Production Schema Verification

All tables verified against production database `jjsqxcbndvwzhmymrmnw.supabase.co`:

**ai_model_validation_history columns:**

```
created_at, error_message, id, latency_ms, model_id, provider_id, status,
updated_at, validated_at, validated_by, validation_category
```

**ai_model_validation_progress columns:**

```
available_count, completed_at, created_at, current_model_id, error_message, id,
last_updated_at, provider_id, started_at, status, total_models, unavailable_count,
updated_at, validated_count
```

---

## Part 3: Execution Plan

### Phase 1: Create Complete Schema Files

**Task 1.1:** Create `003-ai-validation-history.sql`

- Extract content from migrations/003-add-model-summary-view-and-validation-history.sql
- Add service role RLS policy
- Include all columns from production

**Task 1.2:** Create `004-ai-validation-progress.sql`

- Extract content from migrations/004-add-validation-progress-tracking.sql
- Add service role RLS policy
- Include all columns from production

**Task 1.3:** Create `005-ai-provider-model-summary-view.sql`

- Extract VIEW definition from migrations/003-\*.sql
- Separate from table creation for clarity

### Phase 2: Copy Lambda Code to Toolkit

**Task 2.1:** Copy ai-config-handler Lambda

```bash
# Source
pm-app-stack/packages/ai-config-module/backend/lambdas/ai-config-handler/

# Destination
cora-dev-toolkit/templates/_cora-core-modules/module-ai/backend/lambdas/ai-config-handler/
```

**Task 2.2:** Copy provider Lambda

```bash
# Source
pm-app-stack/packages/ai-enablement-module/backend/lambdas/provider/

# Destination
cora-dev-toolkit/templates/_cora-core-modules/module-ai/backend/lambdas/provider/
```

**Task 2.3:** Copy Lambda layer

```bash
# Source
pm-app-stack/packages/ai-config-module/backend/layers/ai-config-common/

# Destination
cora-dev-toolkit/templates/_cora-core-modules/module-ai/backend/layers/ai-config-common/
```

### Phase 3: Merge Frontend Code

**Task 3.1:** Inventory frontend components

- ai-config-module: PlatformAIConfigPanel, OrgAIConfigPanel, ModelCard, ModelSelectionModal
- ai-enablement-module: ProviderForm, ProviderCard, ProviderList, ModelCard, ModelList, ViewModelsModal

**Task 3.2:** Consolidate hooks

- useAIConfig.ts (from ai-config)
- useProviders.ts, useModels.ts, useModuleData.ts (from ai-enablement)

**Task 3.3:** Merge types

- Create unified types/index.ts

### Phase 4: Clean Up

**Task 4.1:** Remove redundant migration files

- Move table definitions to schema/
- Keep only incremental ALTER statements in migrations/

**Task 4.2:** Update ai-sec-setup-guide.md

- Reference new schema files
- Document Lambda deployment

---

## Part 4: File Checklist

### Final module-ai Structure

```
module-ai/
├── db/
│   ├── schema/
│   │   ├── 001-ai-providers.sql          ✓ Complete
│   │   ├── 002-ai-models.sql             ✓ Complete
│   │   ├── 003-ai-validation-history.sql      ✓ Created Dec 11, 2025
│   │   ├── 004-ai-validation-progress.sql     ✓ Created Dec 11, 2025
│   │   └── 005-ai-provider-model-summary-view.sql  ✓ Created Dec 11, 2025
│   └── migrations/
│       └── (keep only ALTERs for existing tables)
├── backend/
│   ├── lambdas/
│   │   ├── ai-config-handler/           ✓ Copied Dec 11, 2025
│   │   │   └── lambda_function.py
│   │   └── provider/                    ✓ Copied Dec 11, 2025
│   │       └── lambda_function.py
│   └── layers/
│       └── ai-config-common/            ✓ Copied Dec 11, 2025
│           └── python/ai_config/
│               ├── __init__.py
│               ├── models.py
│               ├── types.py
│               └── validators.py
└── frontend/
    ├── components/                      TODO - Merge
    ├── hooks/                           TODO - Merge
    ├── types/                           TODO - Merge
    └── index.ts                         TODO - Create
```

---

## Appendix: Commands Used for Analysis

```bash
# 1. Find module structure
find pm-app-stack/packages/ai-config-module -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.sql" \)
find pm-app-stack/packages/ai-enablement-module -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.sql" \)

# 2. Find Lambda code
find pm-app-stack/packages -type d -name "lambdas"

# 3. Search for table references
grep -rn "ai_providers\|ai_models\|ai_model_validation" pm-app-stack/packages/ai-config-module --include="*.py"
grep -rn "ai_providers\|ai_models\|ai_model_validation" pm-app-stack/packages/ai-enablement-module --include="*.py"

# 4. Query production database
BASE_URL="https://jjsqxcbndvwzhmymrmnw.supabase.co/rest/v1"
KEY="<service_role_key>"

curl -s "$BASE_URL/ai_model_validation_history?select=*&limit=1" -H "apikey: $KEY" | jq '.[0] | keys'
curl -s "$BASE_URL/ai_model_validation_progress?select=*&limit=1" -H "apikey: $KEY" | jq '.[0] | keys'

# 5. Check existing schema files
cat cora-dev-toolkit/templates/_cora-core-modules/module-ai/db/schema/001-ai-providers.sql | grep -E "CREATE TABLE|CREATE POLICY"
```

---

**Document Status:** Phase 1 & 2 Complete  
**Last Updated:** December 11, 2025  
**Next Step:** Phase 3 (Merge frontend code) - Optional, can be done separately
