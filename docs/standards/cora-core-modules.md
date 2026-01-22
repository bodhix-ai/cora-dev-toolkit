# CORA Core Modules Specification

**Status:** 📋 Phase 1 Documentation  
**Created:** December 10, 2025  
**Purpose:** Define the three required core modules for all CORA-compliant applications

---

## Overview

Every CORA application requires three **core modules** that provide foundational capabilities. These modules form the backbone of the CORA architecture and must be present in every `{project}-stack` repository.

### Core Modules Summary

| Module          | Purpose                   | Tier | Current Name (pm-app)                       |
| --------------- | ------------------------- | ---- | ------------------------------------------- |
| `module-access` | Identity & access control | 1    | `org-module`                                |
| `module-ai`     | AI provider management    | 2    | `ai-enablement-module` + `ai-config-module` |
| `module-mgmt`   | Platform management       | 3    | `lambda-mgmt-module`                        |

---

## Tier System

CORA modules are organized into tiers based on their dependencies:

```
┌─────────────────────────────────────────────────┐
│                    Tier 3                        │
│              module-mgmt                         │
│   (depends on Tier 1 & 2 modules)               │
├─────────────────────────────────────────────────┤
│                    Tier 2                        │
│               module-ai                          │
│   (depends on Tier 1 modules only)              │
├─────────────────────────────────────────────────┤
│                    Tier 1                        │
│             module-access                        │
│   (zero dependencies on other CORA modules)     │
└─────────────────────────────────────────────────┘
```

### Tier Rules

- **Tier 1:** No dependencies on other CORA modules. May depend on external packages.
- **Tier 2:** May only depend on Tier 1 modules.
- **Tier 3:** May depend on Tier 1 and Tier 2 modules.
- **Functional Modules:** May depend on any core module (Tier 1-3).

---

## Module Dependency Graph

```
┌──────────────┐
│ module-mgmt  │ (Tier 3)
└──────┬───────┘
       │ depends on
       ▼
┌──────────────┐
│  module-ai   │ (Tier 2)
└──────┬───────┘
       │ depends on
       ▼
┌──────────────┐
│module-access │ (Tier 1)
└──────────────┘

Functional modules can depend on any:
┌──────────────┐
│  module-kb   │───────┐
│ module-chat  │───────┼──► Core Modules
│module-project│───────┘
└──────────────┘
```

---

## module-access (Tier 1)

### Purpose

Provides identity and access control capabilities including IDP integration, organization context, user context, and permission management.

### Current Implementation: `org-module`

The current `org-module` in pm-app-stack will be renamed to `module-access` with enhanced capabilities.

### module.json

```json
{
  "name": "module-access",
  "version": "1.0.0",
  "description": "Identity and access control for CORA applications",
  "tier": 1,
  "author": "CORA Team",

  "dependencies": {
    "modules": [],
    "packages": ["@supabase/supabase-js", "@okta/okta-react", "next-auth"]
  },

  "provides": {
    "database": {
      "tables": [
        "organizations",
        "organization_memberships",
        "user_profiles",
        "permissions",
        "roles"
      ],
      "functions": ["get_user_org_context", "check_permission"]
    },

    "lambdas": ["access-org", "access-user", "access-permissions"],

    "routes": [
      "GET /orgs",
      "GET /orgs/{orgId}",
      "GET /orgs/{orgId}/members",
      "POST /orgs/{orgId}/members",
      "DELETE /orgs/{orgId}/members/{userId}",
      "GET /users/me",
      "PUT /users/me",
      "GET /permissions"
    ],

    "frontend": {
      "components": [
        "OrgSwitcher",
        "UserProfile",
        "MemberList",
        "PermissionGuard",
        "RoleSelector"
      ],
      "hooks": [
        "useOrganization",
        "useUser",
        "usePermissions",
        "useOrgContext"
      ],
      "contexts": ["OrgContext", "UserContext", "PermissionContext"]
    }
  },

  "permissions": {
    "database": ["rds:ExecuteStatement"],
    "secrets": ["secretsmanager:GetSecretValue"],
    "external": []
  }
}
```

### Directory Structure

```
module-access/
├── module.json
├── README.md
│
├── backend/
│   ├── access-common/          # Shared backend utilities
│   │   ├── __init__.py
│   │   ├── org_context.py      # Organization context utilities
│   │   ├── user_context.py     # User context utilities
│   │   └── permissions.py      # Permission checking
│   │
│   ├── handlers/               # Lambda handlers
│   │   ├── org_handler.py
│   │   ├── user_handler.py
│   │   └── permissions_handler.py
│   │
│   └── tests/
│       └── test_access.py
│
├── db/
│   ├── schema/
│   │   ├── 001-organizations.sql
│   │   ├── 002-memberships.sql
│   │   ├── 003-permissions.sql
│   │   └── 004-apply-rls.sql
│   └── seed/
│       └── seed-roles.sql
│
├── frontend/
│   ├── components/
│   │   ├── OrgSwitcher.tsx
│   │   ├── UserProfile.tsx
│   │   ├── MemberList.tsx
│   │   └── PermissionGuard.tsx
│   │
│   ├── contexts/
│   │   ├── OrgContext.tsx
│   │   ├── UserContext.tsx
│   │   └── PermissionContext.tsx
│   │
│   ├── hooks/
│   │   ├── useOrganization.ts
│   │   ├── useUser.ts
│   │   └── usePermissions.ts
│   │
│   └── index.ts
│
├── infrastructure/
│   └── lambda-config.tf
│
├── docs/
│   ├── README.md
│   ├── api-reference.md
│   └── integration-guide.md
│
└── tests/
    └── e2e/
        └── access.spec.ts
```

### Key Capabilities

| Capability            | Description                            |
| --------------------- | -------------------------------------- |
| IDP Integration       | Okta, Cognito, or other OIDC providers |
| Organization Context  | Multi-tenant organization support      |
| User Context          | User profiles and preferences          |
| Permission Management | Role-based access control (RBAC)       |
| Membership Management | Organization membership CRUD           |

---

## module-ai (Tier 2)

### Purpose

Manages AI provider configuration, model enablement, and AI-related settings. Consolidates provider management with usage monitoring.

### Current Implementation: `ai-enablement-module` + `ai-config-module`

These two modules will be merged into a single `module-ai` with unified capabilities.

### module.json

```json
{
  "name": "module-ai",
  "version": "1.0.0",
  "description": "AI provider management and configuration for CORA applications",
  "tier": 2,
  "author": "CORA Team",

  "dependencies": {
    "modules": ["module-access"],
    "packages": ["@anthropic-ai/sdk", "openai", "@aws-sdk/client-bedrock"]
  },

  "provides": {
    "database": {
      "tables": [
        "ai_providers",
        "ai_models",
        "ai_provider_config",
        "ai_usage_logs"
      ],
      "functions": ["get_enabled_providers", "log_ai_usage"]
    },

    "lambdas": ["ai-providers", "ai-config", "ai-usage"],

    "routes": [
      "GET /ai/providers",
      "GET /ai/providers/{providerId}",
      "PUT /ai/providers/{providerId}",
      "POST /ai/providers/{providerId}/enable",
      "POST /ai/providers/{providerId}/disable",
      "GET /ai/models",
      "GET /ai/models/{modelId}",
      "PUT /ai/models/{modelId}/config",
      "GET /ai/usage",
      "GET /ai/usage/summary"
    ],

    "frontend": {
      "components": [
        "ProviderList",
        "ProviderCard",
        "ProviderConfig",
        "ModelSelector",
        "UsageDashboard"
      ],
      "hooks": ["useAIProviders", "useAIModels", "useAIConfig", "useAIUsage"],
      "contexts": ["AIContext", "AIConfigContext"]
    }
  },

  "permissions": {
    "database": ["rds:ExecuteStatement"],
    "secrets": ["secretsmanager:GetSecretValue"],
    "external": ["bedrock:InvokeModel"]
  }
}
```

### Directory Structure

```
module-ai/
├── module.json
├── README.md
│
├── backend/
│   ├── ai-common/              # Shared AI utilities
│   │   ├── __init__.py
│   │   ├── providers.py        # Provider abstractions
│   │   ├── models.py           # Model configurations
│   │   └── usage.py            # Usage tracking
│   │
│   ├── handlers/
│   │   ├── providers_handler.py
│   │   ├── config_handler.py
│   │   └── usage_handler.py
│   │
│   └── tests/
│       └── test_ai.py
│
├── db/
│   ├── schema/
│   │   ├── 001-ai-providers.sql
│   │   ├── 002-ai-models.sql
│   │   ├── 003-ai-config.sql
│   │   ├── 004-ai-usage.sql
│   │   └── 005-apply-rls.sql
│   └── seed/
│       ├── seed-providers.sql
│       └── seed-models.sql
│
├── frontend/
│   ├── components/
│   │   ├── ProviderList.tsx
│   │   ├── ProviderCard.tsx
│   │   ├── ProviderConfig.tsx
│   │   ├── ModelSelector.tsx
│   │   └── UsageDashboard.tsx
│   │
│   ├── contexts/
│   │   ├── AIContext.tsx
│   │   └── AIConfigContext.tsx
│   │
│   ├── hooks/
│   │   ├── useAIProviders.ts
│   │   ├── useAIModels.ts
│   │   ├── useAIConfig.ts
│   │   └── useAIUsage.ts
│   │
│   └── index.ts
│
├── infrastructure/
│   └── lambda-config.tf
│
├── docs/
│   ├── README.md
│   ├── provider-integration.md
│   └── model-configuration.md
│
└── tests/
    └── e2e/
        └── ai.spec.ts
```

### Supported Providers

| Provider  | Status    | Models                      |
| --------- | --------- | --------------------------- |
| Anthropic | Supported | Claude 3.5, Claude 3        |
| OpenAI    | Supported | GPT-4, GPT-4 Turbo, GPT-3.5 |
| Bedrock   | Supported | Claude, Titan, Llama        |
| Azure     | Planned   | Azure OpenAI models         |

---

## module-mgmt (Tier 3)

### Purpose

Provides platform management capabilities including Lambda function management, warming strategies, performance monitoring, and system health.

### Current Implementation: `lambda-mgmt-module`

The current implementation will be renamed to `module-mgmt` with expanded platform management features.

### module.json

```json
{
  "name": "module-mgmt",
  "version": "1.0.0",
  "description": "Platform management and monitoring for CORA applications",
  "tier": 3,
  "author": "CORA Team",

  "dependencies": {
    "modules": ["module-access", "module-ai"],
    "packages": ["@aws-sdk/client-lambda", "@aws-sdk/client-cloudwatch"]
  },

  "provides": {
    "database": {
      "tables": [
        "platform_lambda_config",
        "platform_health_checks",
        "platform_metrics",
        "platform_module_registry"
      ],
      "functions": ["get_lambda_config", "log_health_check"]
    },

    "lambdas": ["lambda-mgmt", "platform-health", "module-registry"],

    "routes": [
      "GET /platform/lambda-config",
      "GET /platform/lambda-config/{configKey}",
      "PUT /platform/lambda-config/{configKey}",
      "POST /platform/lambda-config/sync",
      "GET /platform/lambda-functions",
      "POST /platform/lambda-functions/{name}/warm",
      "GET /platform/health",
      "GET /platform/metrics",
      "GET /platform/modules",
      "PUT /platform/modules/{name}"
    ],

    "frontend": {
      "components": [
        "LambdaConfigTable",
        "LambdaFunctionList",
        "HealthDashboard",
        "MetricsChart",
        "ModuleRegistry"
      ],
      "hooks": [
        "useLambdaConfig",
        "useLambdaFunctions",
        "usePlatformHealth",
        "useModuleRegistry"
      ],
      "contexts": ["PlatformContext"]
    }
  },

  "permissions": {
    "database": ["rds:ExecuteStatement"],
    "lambda": [
      "lambda:ListFunctions",
      "lambda:GetFunction",
      "lambda:InvokeFunction",
      "lambda:UpdateFunctionConfiguration"
    ],
    "cloudwatch": ["cloudwatch:GetMetricData", "cloudwatch:PutMetricData"]
  }
}
```

### Directory Structure

```
module-mgmt/
├── module.json
├── README.md
│
├── backend/
│   ├── mgmt-common/            # Shared management utilities
│   │   ├── __init__.py
│   │   ├── lambda_ops.py       # Lambda operations
│   │   ├── health.py           # Health check utilities
│   │   ├── metrics.py          # Metrics collection
│   │   └── warming.py          # Warming strategies
│   │
│   ├── handlers/
│   │   ├── lambda_config_handler.py
│   │   ├── lambda_functions_handler.py
│   │   ├── health_handler.py
│   │   └── module_registry_handler.py
│   │
│   └── tests/
│       └── test_mgmt.py
│
├── db/
│   ├── schema/
│   │   ├── 001-lambda-config.sql
│   │   ├── 002-health-checks.sql
│   │   ├── 003-metrics.sql
│   │   ├── 004-module-registry.sql
│   │   └── 005-apply-rls.sql
│   └── seed/
│       └── seed-default-config.sql
│
├── frontend/
│   ├── components/
│   │   ├── LambdaConfigTable.tsx
│   │   ├── LambdaFunctionList.tsx
│   │   ├── HealthDashboard.tsx
│   │   ├── MetricsChart.tsx
│   │   └── ModuleRegistry.tsx
│   │
│   ├── contexts/
│   │   └── PlatformContext.tsx
│   │
│   ├── hooks/
│   │   ├── useLambdaConfig.ts
│   │   ├── useLambdaFunctions.ts
│   │   ├── usePlatformHealth.ts
│   │   └── useModuleRegistry.ts
│   │
│   └── index.ts
│
├── infrastructure/
│   └── lambda-config.tf
│
├── docs/
│   ├── README.md
│   ├── lambda-warming-guide.md
│   └── monitoring-guide.md
│
└── tests/
    └── e2e/
        └── mgmt.spec.ts
```

### Key Capabilities

| Capability         | Description                                  |
| ------------------ | -------------------------------------------- |
| Lambda Management  | List, configure, and invoke Lambda functions |
| Warming Strategies | Scheduled and on-demand function warming     |
| Health Monitoring  | System health checks and alerts              |
| Metrics Collection | Performance metrics and dashboards           |
| Module Registry    | Runtime module enablement/disablement        |

---

## Migration Guidance

### From pm-app-stack Current State

| Current Module                              | Target Module   | Migration Steps                     |
| ------------------------------------------- | --------------- | ----------------------------------- |
| `org-module`                                | `module-access` | Rename directory, update imports    |
| `ai-enablement-module` + `ai-config-module` | `module-ai`     | Merge modules, consolidate handlers |
| `lambda-mgmt-module`                        | `module-mgmt`   | Rename directory, update imports    |

### Migration Checklist

#### Step 1: Prepare

- [ ] Document all import paths using current module names
- [ ] Create branch for migration work
- [ ] Back up current module configurations

#### Step 2: Rename Directories

```bash
# In pm-app-stack/packages/
mv org-module module-access
mv lambda-mgmt-module module-mgmt

# Merge AI modules
mkdir module-ai
# Copy and merge contents from ai-enablement-module and ai-config-module
```

#### Step 3: Update Imports

```typescript
// Before
import { useOrganization } from "@packages/org-module";
import { useLambdaConfig } from "@packages/lambda-mgmt-module";
import { useAIProviders } from "@packages/ai-enablement-module";

// After
import { useOrganization } from "@packages/module-access";
import { useLambdaConfig } from "@packages/module-mgmt";
import { useAIProviders } from "@packages/module-ai";
```

#### Step 4: Update Configuration

- [ ] Update `pnpm-workspace.yaml` with new package paths
- [ ] Update `tsconfig.json` path mappings
- [ ] Update API Gateway route configurations
- [ ] Update Lambda function names

#### Step 5: Validate

```bash
# Run CORA validation
pnpm run validate

# Run tests
pnpm run test

# Verify builds
pnpm run build
```

---

## Integration Requirements

### Frontend Integration

All core modules must integrate with the Next.js application:

```typescript
// apps/web/src/app/layout.tsx
import { OrgProvider } from "@packages/module-access";
import { AIProvider } from "@packages/module-ai";
import { PlatformProvider } from "@packages/module-mgmt";

export default function RootLayout({ children }) {
  return (
    <OrgProvider>
      <AIProvider>
        <PlatformProvider>{children}</PlatformProvider>
      </AIProvider>
    </OrgProvider>
  );
}
```

### API Client Integration

Core modules must use the centralized API client:

```typescript
// packages/module-access/frontend/hooks/useOrganization.ts
import { apiClient } from "@packages/api-client";

export function useOrganization() {
  const fetchOrgs = async () => {
    return apiClient.get("/orgs");
  };
  // ...
}
```

### Backend Common Layer

Each core module must expose a common layer for other modules:

```python
# Usage in functional modules
from module_access.backend.access_common import get_org_context
from module_ai.backend.ai_common import get_provider_config
from module_mgmt.backend.mgmt_common import get_lambda_config
```

---

## Validation Requirements

Core modules must pass all validation checks:

1. **Structure Validation** - Required directories and files exist
2. **module.json Validation** - Schema is complete and valid
3. **Tier Compliance** - Dependencies follow tier rules
4. **Import Validation** - No circular dependencies
5. **Documentation** - README and API docs present

Run validation:

```bash
python scripts/validation/cora-validate.py --mode=module --path=packages/module-access
```

---

## Related Documentation

- [cora-project-boilerplate.md](./cora-project-boilerplate.md) - Project structure
- [cora-module-definition-of-done.md](./cora-module-definition-of-done.md) - Module certification
- [cora-documentation-standards.md](./cora-documentation-standards.md) - Documentation guidelines

---

**Document Version:** 1.0  
**Last Updated:** December 10, 2025  
**Status:** Phase 1 Complete
