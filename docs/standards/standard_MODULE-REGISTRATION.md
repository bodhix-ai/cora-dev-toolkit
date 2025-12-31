# CORA Module Registration Standard

**Status:** Draft  
**Version:** 1.0  
**Last Updated:** December 31, 2025

## Table of Contents

1. [Overview](#overview)
2. [Module Lifecycle](#module-lifecycle)
3. [Module Import Process](#module-import-process)
4. [Module Enable Process](#module-enable-process)
5. [Module Configuration](#module-configuration)
6. [Module Registration with module-mgmt](#module-registration-with-module-mgmt)
7. [Implementation Guide](#implementation-guide)
8. [Validation](#validation)

---

## Overview

This document defines the standard process for importing, enabling, and configuring CORA modules in a project. Not every project uses every module, so modules are imported on-demand and configured for the specific project's needs.

### Purpose

- Provide a clear process for adding new modules to a CORA project
- Ensure consistent module configuration across projects
- Enable module discovery and management through `module-mgmt`
- Support AI-driven guided configuration

### Principles

1. **Explicit Import** - Modules are not auto-included; they must be explicitly added
2. **Guided Configuration** - Each module provides a configuration guide
3. **Validation** - Configuration is validated before module activation
4. **Registration** - All modules register with `module-mgmt` for tracking

---

## Module Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│ 1. AVAILABLE (in toolkit/registry)                      │
│    - Module exists in cora-dev-toolkit or registry      │
│    - Not yet added to project                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. IMPORTED (copied to project)                         │
│    - Module code copied to packages/                    │
│    - Dependencies declared in package.json              │
│    - Not yet configured or deployed                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. CONFIGURED (ready for deployment)                    │
│    - Configuration completed via guided process         │
│    - Environment variables set                          │
│    - Database migrations prepared                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. ENABLED (active in environment)                      │
│    - Database migrations applied                        │
│    - Lambdas deployed                                   │
│    - Frontend integrated                                │
│    - Registered with module-mgmt                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. ACTIVE (in use)                                      │
│    - Module serving traffic                             │
│    - Monitoring enabled                                 │
│    - Health checks passing                              │
└─────────────────────────────────────────────────────────┘
```

---

## Module Import Process

### Step 1: Module Discovery

**Human Activity:**
```bash
# List available modules in toolkit
ls cora-dev-toolkit/templates/_cora-core-modules/
ls cora-dev-toolkit/templates/_module-template/

# Or browse module registry (future)
# cora module list --available
```

### Step 2: Import Module Code

**Method A: Copy from Toolkit Template (Recommended)**

```bash
# From cora-dev-toolkit directory
./scripts/import-module.sh <module-name> <target-project-path>

# Example:
./scripts/import-module.sh module-kb /Users/aaron/code/policy/legacy/pm-app-stack
```

**Script Behavior:**
1. Validates module exists in toolkit
2. Copies module to `<target-project>/packages/<module-name>/`
3. Updates project `pnpm-workspace.yaml`
4. Adds module dependencies to project `package.json`
5. Creates `.module-status.json` with status: `IMPORTED`

**Method B: Create New Module from Template**

```bash
# Create new functional module
cd <target-project>
../cora-dev-toolkit/scripts/create-cora-module.sh <module-name> <entity-name>
```

### Step 3: Install Dependencies

```bash
# In project root
cd pm-app-stack
pnpm install
```

**Result:** Module code is in project, dependencies installed, status: `IMPORTED`

---

## Module Enable Process

### Step 1: Review Module Requirements

Each module includes a `MODULE-CONFIG-GUIDE.md`:

```markdown
# module-kb Configuration Guide

## Prerequisites
- PostgreSQL database with pgvector extension
- S3 bucket for document storage
- OpenAI API key for embeddings

## Required Configuration
1. Database connection
2. Storage configuration
3. AI provider credentials

## Optional Configuration
- Embedding model selection
- Chunk size for document processing
- Retrieval parameters
```

### Step 2: Guided Configuration Process

**AI-Driven Configuration Assistant:**

```typescript
// Future: Interactive configuration CLI
// cora module configure <module-name>

interface ModuleConfigurationPrompt {
  module: string;
  questions: ConfigurationQuestion[];
}

interface ConfigurationQuestion {
  id: string;
  prompt: string;
  type: 'text' | 'select' | 'boolean' | 'secret';
  required: boolean;
  default?: any;
  validation?: (value: any) => boolean;
}

// Example for module-kb
const kbConfig: ModuleConfigurationPrompt = {
  module: 'kb-module',
  questions: [
    {
      id: 'storage_provider',
      prompt: 'Select storage provider for documents',
      type: 'select',
      required: true,
      options: ['s3', 'supabase-storage', 'local'],
      default: 's3'
    },
    {
      id: 's3_bucket',
      prompt: 'S3 bucket name for document storage',
      type: 'text',
      required: true,
      validation: (v) => /^[a-z0-9-]+$/.test(v)
    },
    {
      id: 'embedding_model',
      prompt: 'Select embedding model',
      type: 'select',
      required: true,
      options: ['text-embedding-3-small', 'text-embedding-3-large'],
      default: 'text-embedding-3-small'
    }
  ]
};
```

**Configuration Output:** `.module-config/<module-name>.json`

```json
{
  "module": "kb-module",
  "version": "1.0.0",
  "config": {
    "storage_provider": "s3",
    "s3_bucket": "pm-app-dev-documents",
    "embedding_model": "text-embedding-3-small",
    "chunk_size": 1000,
    "chunk_overlap": 200
  },
  "secrets": {
    "openai_api_key": "aws-secrets-manager:pm-app-dev-openai-key"
  },
  "status": "CONFIGURED",
  "configured_at": "2025-12-31T12:00:00Z",
  "configured_by": "user@example.com"
}
```

### Step 3: Environment Variable Mapping

Module configuration maps to environment variables for Lambda functions:

```bash
# From .module-config/kb-module.json → Lambda environment
STORAGE_PROVIDER=s3
S3_BUCKET=pm-app-dev-documents
EMBEDDING_MODEL=text-embedding-3-small
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
OPENAI_API_KEY_SECRET_ARN=arn:aws:secretsmanager:...
```

### Step 4: Validate Configuration

```bash
# Run module configuration validation
pnpm run validate:module-config kb-module

# Checks:
# - All required fields present
# - Values pass validation rules
# - Secrets exist in AWS Secrets Manager
# - Database extensions available
```

**Result:** Module configured, status: `CONFIGURED`

---

## Module Configuration

### Configuration Storage

**Project Level:** `.module-config/<module-name>.json` (gitignored)

```json
{
  "module": "module-name",
  "version": "1.0.0",
  "environment": "dev",
  "config": {
    "feature_flags": {},
    "integration_settings": {}
  },
  "secrets_mapping": {
    "api_key": "aws-secrets-manager:arn",
    "db_password": "aws-secrets-manager:arn"
  },
  "status": "CONFIGURED",
  "metadata": {
    "configured_at": "ISO-8601 timestamp",
    "configured_by": "email",
    "last_validated": "ISO-8601 timestamp"
  }
}
```

**Database Level:** `module_mgmt.module_config` table

```sql
CREATE TABLE module_mgmt.module_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(100) NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    environment VARCHAR(20) NOT NULL,
    config JSONB NOT NULL,
    status VARCHAR(20) NOT NULL,
    version VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, module_name, environment)
);
```

### Configuration Template in module.json

Each module defines its configuration schema:

```json
{
  "name": "kb-module",
  "version": "1.0.0",
  "configuration": {
    "required": [
      {
        "key": "storage_provider",
        "type": "select",
        "options": ["s3", "supabase-storage"],
        "description": "Document storage backend"
      },
      {
        "key": "embedding_model",
        "type": "select",
        "options": ["text-embedding-3-small", "text-embedding-3-large"],
        "description": "OpenAI embedding model"
      }
    ],
    "optional": [
      {
        "key": "chunk_size",
        "type": "number",
        "default": 1000,
        "description": "Document chunk size for embeddings"
      }
    ],
    "secrets": [
      {
        "key": "openai_api_key",
        "description": "OpenAI API key for embeddings",
        "storage": "aws-secrets-manager"
      }
    ]
  }
}
```

---

## Module Registration with module-mgmt

### Registration Process

When a module is enabled, it registers with `module-mgmt`:

```typescript
// Automatic registration during deployment
interface ModuleRegistration {
  project_id: string;
  module_name: string;
  module_version: string;
  environment: string;
  status: 'ENABLED' | 'DISABLED' | 'ERROR';
  lambda_functions: string[];
  api_routes: string[];
  database_tables: string[];
  dependencies: string[];
  config_hash: string;
  deployed_at: string;
  deployed_by: string;
}

// POST /platform/modules/register
const registration: ModuleRegistration = {
  project_id: 'pm-app',
  module_name: 'kb-module',
  module_version: '1.0.0',
  environment: 'dev',
  status: 'ENABLED',
  lambda_functions: [
    'pm-app-dev-kb-base',
    'pm-app-dev-kb-document'
  ],
  api_routes: [
    '/api/kb/bases',
    '/api/kb/documents'
  ],
  database_tables: [
    'kb_base',
    'kb_document',
    'kb_chunk'
  ],
  dependencies: [
    'module-access@1.0.0',
    'module-ai@1.0.0',
    'module-mgmt@1.0.0'
  ],
  config_hash: 'sha256:abc123...',
  deployed_at: '2025-12-31T12:00:00Z',
  deployed_by: 'deploy-system'
};
```

### Module Registry Schema

```sql
-- Module registry in module-mgmt
CREATE TABLE module_mgmt.module_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(100) NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    module_version VARCHAR(20) NOT NULL,
    environment VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    lambda_functions JSONB,
    api_routes JSONB,
    database_tables JSONB,
    dependencies JSONB,
    config_hash VARCHAR(64),
    deployed_at TIMESTAMPTZ,
    deployed_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, module_name, environment)
);

-- Module status log
CREATE TABLE module_mgmt.module_status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_registry_id UUID REFERENCES module_mgmt.module_registry(id),
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    reason TEXT,
    changed_by VARCHAR(255),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Implementation Guide

### For Module Developers

**1. Create Configuration Schema in module.json**

Add `configuration` section to your `module.json`:

```json
{
  "name": "my-module",
  "configuration": {
    "required": [...],
    "optional": [...],
    "secrets": [...]
  }
}
```

**2. Create Configuration Guide**

Add `MODULE-CONFIG-GUIDE.md` to module root:

```markdown
# my-module Configuration Guide

## Prerequisites
- List prerequisites

## Required Configuration
- Document required settings

## Step-by-Step Setup
1. ...
2. ...
```

**3. Add Configuration Validation**

Create `scripts/validate-config.sh`:

```bash
#!/bin/bash
# Validate module configuration

CONFIG_FILE=".module-config/my-module.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Configuration file not found"
    exit 1
fi

# Validate required fields
# ...
```

**4. Register Module on Deployment**

Add to deployment script:

```bash
# After successful deployment
curl -X POST https://api.example.com/platform/modules/register \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "project_id": "'$PROJECT_ID'",
    "module_name": "my-module",
    "environment": "'$ENVIRONMENT'",
    "status": "ENABLED"
  }'
```

### For Project Consumers

**1. Import Module**

```bash
./cora-dev-toolkit/scripts/import-module.sh my-module ./my-project
cd my-project
pnpm install
```

**2. Configure Module**

```bash
# Interactive configuration (future)
# pnpm run cora:configure my-module

# Or manually create .module-config/my-module.json
```

**3. Validate Configuration**

```bash
pnpm run validate:module-config my-module
```

**4. Deploy Module**

```bash
# Database migrations
cd my-project-infra
./scripts/run-database-migrations.sh dev my-module

# Infrastructure
terraform apply -var-file=dev.tfvars

# Verify registration
curl https://api.example.com/platform/modules?project=my-project&environment=dev
```

---

## Validation

### Configuration Validation Checklist

- [ ] All required configuration fields present
- [ ] Configuration values pass validation rules
- [ ] Secrets exist in AWS Secrets Manager
- [ ] Database prerequisites met (extensions, roles)
- [ ] Infrastructure variables defined
- [ ] Dependencies resolved

### Module Registration Validation

- [ ] Module registered in `module_mgmt.module_registry`
- [ ] Status is `ENABLED`
- [ ] Lambda functions deployed
- [ ] API routes accessible
- [ ] Database tables created
- [ ] Health check passing

### Automated Validation Script

```bash
#!/bin/bash
# scripts/validate-module-registration.sh

MODULE_NAME=$1
ENVIRONMENT=$2

echo "Validating module registration: $MODULE_NAME in $ENVIRONMENT"

# Check configuration file
if [ ! -f ".module-config/$MODULE_NAME.json" ]; then
    echo "❌ Configuration file missing"
    exit 1
fi

# Check database registration
psql -c "SELECT * FROM module_mgmt.module_registry 
         WHERE module_name='$MODULE_NAME' 
         AND environment='$ENVIRONMENT'" | grep -q "$MODULE_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Module registered in database"
else
    echo "❌ Module not registered in database"
    exit 1
fi

# Check Lambda deployment
aws lambda list-functions --query "Functions[?contains(FunctionName, '$MODULE_NAME')].FunctionName" | grep -q "$MODULE_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Lambda functions deployed"
else
    echo "❌ Lambda functions not found"
    exit 1
fi

echo "✅ Module validation complete"
```

---

## Future Enhancements

### Interactive Configuration CLI

```bash
# Future feature
cora module configure kb-module

# Interactive prompts:
# ? Select storage provider: (s3, supabase-storage, local)
# ? S3 bucket name: pm-app-dev-documents
# ? Embedding model: (text-embedding-3-small, text-embedding-3-large)
# ...
# ✅ Configuration saved to .module-config/kb-module.json
```

### Module Marketplace/Registry

- Central registry of available modules
- Version management
- Module discovery
- Rating/reviews

### Dependency Resolution

- Automatic dependency installation
- Version conflict detection
- Dependency graph visualization

---

## Related Documentation

- [standard_MODULE-DEPENDENCIES.md](./standard_MODULE-DEPENDENCIES.md) - Module dependency management
- [guide_CORA-MODULE-DEVELOPMENT-PROCESS.md](../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md) - Module development workflow
- [standard_module-integration-spec.md](./standard_module-integration-spec.md) - Module integration specification

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** December 31, 2025
