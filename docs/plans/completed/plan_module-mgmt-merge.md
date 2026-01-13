# Module-Mgmt Merge Plan: lambda-mgmt + Module Registration

**Date:** December 11, 2025  
**Completed:** December 11, 2025  
**Status:** ✅ **COMPLETED**
**Author:** Claude (Cline Agent)  
**Purpose:** Document the analysis and execution plan for merging lambda-mgmt-module with new module registration functionality into unified module-mgmt

---

## Part 1: Analysis Summary

### Source Modules

| Source                | Location                                                    | Purpose                                 | Status                      |
| --------------------- | ----------------------------------------------------------- | --------------------------------------- | --------------------------- |
| `lambda-mgmt-module`  | `pm-app-stack/packages/lambda-mgmt-module`                  | Lambda warming & EventBridge management | ✅ Deployed to production   |
| Module Registry (NEW) | `cora-dev-toolkit/templates/_cora-core-modules/module-mgmt` | Runtime module enable/disable           | 🆕 Designed, schema created |

### Key Finding: Two-Part Merge

Unlike module-ai (which merged two existing modules), **module-mgmt merges an existing module with NEW functionality**:

1. **Existing:** Lambda warming, EventBridge sync, platform config
2. **New:** Module registry, usage tracking, dynamic navigation

---

## Part 2: Database Tables

### Production Tables (from lambda-mgmt-module)

| Table                    | Schema File                      | Purpose                                       |
| ------------------------ | -------------------------------- | --------------------------------------------- |
| `platform_lambda_config` | `001-platform-lambda-config.sql` | Lambda warming schedules and platform configs |

### New Tables (from toolkit)

| Table                         | Schema File                        | Purpose                       |
| ----------------------------- | ---------------------------------- | ----------------------------- |
| `platform_module_registry`    | `003-platform-module-registry.sql` | Runtime module enable/disable |
| `platform_module_usage`       | `004-platform-module-usage.sql`    | Raw usage event tracking      |
| `platform_module_usage_daily` | `004-platform-module-usage.sql`    | Aggregated daily statistics   |

### RLS Policies

| Table                         | File                          | Notes                                |
| ----------------------------- | ----------------------------- | ------------------------------------ |
| `platform_lambda_config`      | `002-rls-policies.sql`        | Super admin access                   |
| `platform_module_registry`    | `005-platform-module-rls.sql` | Platform admin + enabled module read |
| `platform_module_usage`       | `005-platform-module-rls.sql` | Org-scoped access                    |
| `platform_module_usage_daily` | `005-platform-module-rls.sql` | Org-scoped access                    |

**Note:** Lambda functions use Supabase `service_role` key which automatically bypasses RLS. No explicit service_role policies are needed.

---

## Part 3: Lambda Functions

### Existing Lambda: `lambda-mgmt`

**Location:** `pm-app-stack/packages/lambda-mgmt-module/backend/lambdas/lambda-mgmt/`

**Dependencies:**

- `org_common` layer (from module-access)
- `lambda_mgmt_common` layer (EventBridgeManager)

**Endpoints:**
| Method | Route | Handler | Purpose |
|--------|-------|---------|---------|
| GET | `/platform/lambda-config` | `handle_list_configs` | List all configs |
| GET | `/platform/lambda-config/{configKey}` | `handle_get_config` | Get specific config |
| PUT | `/platform/lambda-config/{configKey}` | `handle_update_config` | Update config + sync EventBridge |
| GET | `/platform/lambda-functions` | `handle_list_functions` | List Lambda functions |
| POST | `/platform/lambda-config/sync` | `handle_sync_eventbridge` | Manual EventBridge sync |

### New Lambda Handlers: Module Registry

**Location:** `cora-dev-toolkit/templates/_cora-core-modules/module-mgmt/backend/handlers/`

**Files:**

- `module_registry.py` - Module CRUD operations
- `module_usage.py` - Usage tracking

**Endpoints:**
| Method | Route | Handler | Purpose |
|--------|-------|---------|---------|
| GET | `/platform/modules` | `list_modules_handler` | List registered modules |
| GET | `/platform/modules/{name}` | `get_module_handler` | Get module details |
| PUT | `/platform/modules/{name}` | `update_module_handler` | Update module config |
| POST | `/platform/modules/{name}/enable` | `enable_module_handler` | Enable module |
| POST | `/platform/modules/{name}/disable` | `disable_module_handler` | Disable module |
| POST | `/platform/modules` | `register_module_handler` | Register new module |

---

## Part 4: Frontend Components

### Existing (lambda-mgmt-module)

| File                          | Purpose                   |
| ----------------------------- | ------------------------- |
| `hooks/useLambdaFunctions.ts` | Lambda function list hook |
| `hooks/useLambdaWarming.ts`   | Warming config hook       |
| `lib/api.ts`                  | API client                |
| `types/index.ts`              | TypeScript types          |

### New (toolkit)

| File                                   | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `hooks/useModuleRegistry.ts`           | Module registry hook                        |
| `components/ModuleAdminDashboard.tsx`  | Admin dashboard                             |
| `components/ModuleAwareNavigation.tsx` | Dynamic navigation based on enabled modules |

---

## Part 5: Schema File Restructuring (Completed)

### Before (Migrations) - NOW DELETED

```
module-mgmt/db/
├── schema/
│   ├── 001-platform-lambda-config.sql
│   └── 002-rls-policies.sql
└── migrations/
    ├── 001-platform-module-registry.sql   ← DELETED
    ├── 002-platform-module-usage.sql      ← DELETED
    └── 003-platform-module-rls.sql        ← DELETED
```

### After (Schema) - CURRENT STATE

```
module-mgmt/db/
├── schema/
│   ├── 001-platform-lambda-config.sql    ✅ Existing
│   ├── 002-rls-policies.sql              ✅ Existing
│   ├── 003-platform-module-registry.sql  ✅ Created Dec 11, 2025
│   ├── 004-platform-module-usage.sql     ✅ Created Dec 11, 2025
│   └── 005-platform-module-rls.sql       ✅ Created Dec 11, 2025
└── migrations/
    └── (for future ALTER statements only)
```

---

## Part 6: Execution Plan

### Phase 1: Schema Files ✅ COMPLETE

- [x] Create `003-platform-module-registry.sql` in schema/
- [x] Create `004-platform-module-usage.sql` in schema/
- [x] Create `005-platform-module-rls.sql` in schema/

### Phase 2: Deploy to Production (Pending)

- [ ] Run `003-platform-module-registry.sql` against production database
- [ ] Run `004-platform-module-usage.sql` against production database
- [ ] Run `005-platform-module-rls.sql` against production database
- [ ] Verify tables created with correct indexes

### Phase 3: Integrate Lambda Handlers ✅ COMPLETE

- [x] Add module registry routes to existing `lambda-mgmt` Lambda
- [x] Add module registry handler functions (list, get, update, enable, disable, register)
- [ ] Update API Gateway with new routes (deployment task)
- [ ] Test enable/disable module flow (deployment task)

### Phase 4: Frontend Integration (Pending)

- [ ] Add `useModuleRegistry` hook to lambda-mgmt-module
- [ ] Add `ModuleAdminDashboard` component
- [ ] Integrate `ModuleAwareNavigation` into app shell

### Phase 5: Clean Up ✅ COMPLETE

- [x] Remove redundant migration files from toolkit
- [x] Update documentation (this document)

---

## Part 7: Final module-mgmt Structure

```
module-mgmt/
├── module.json
├── README.md
│
├── backend/
│   ├── lambdas/
│   │   └── lambda-mgmt/
│   │       ├── Dockerfile
│   │       ├── lambda_function.py        # Main handler with all routes
│   │       └── requirements.txt
│   │
│   ├── handlers/
│   │   ├── module_registry.py           # Module registry handlers
│   │   └── module_usage.py              # Usage tracking handlers
│   │
│   ├── layers/
│   │   └── lambda-mgmt-common/
│   │       └── python/lambda_mgmt_common/
│   │           ├── eventbridge.py
│   │           └── schedule.py
│   │
│   └── middleware/
│       └── module_middleware.py         # Module-aware middleware
│
├── db/
│   ├── schema/
│   │   ├── 001-platform-lambda-config.sql    ✅
│   │   ├── 002-rls-policies.sql              ✅
│   │   ├── 003-platform-module-registry.sql  ✅ NEW
│   │   ├── 004-platform-module-usage.sql     ✅ NEW
│   │   └── 005-platform-module-rls.sql       ✅ NEW
│   └── migrations/
│       └── (for future ALTER statements)
│
├── frontend/
│   ├── index.ts
│   ├── components/
│   │   ├── ModuleAdminDashboard.tsx      ✅ NEW
│   │   └── ModuleAwareNavigation.tsx     ✅ NEW
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── useLambdaFunctions.ts         ✅ Existing
│   │   ├── useLambdaWarming.ts           ✅ Existing
│   │   └── useModuleRegistry.ts          ✅ NEW
│   ├── lib/
│   │   └── api.ts
│   └── types/
│       └── index.ts
│
├── infrastructure/
│   ├── main.tf
│   ├── outputs.tf
│   ├── variables.tf
│   └── versions.tf
│
└── tests/
    ├── backend/
    └── frontend/
```

---

## Appendix: Key Capabilities Summary

| Capability                 | Source             | Status             |
| -------------------------- | ------------------ | ------------------ |
| Lambda function listing    | lambda-mgmt-module | ✅ Production      |
| Lambda warming schedules   | lambda-mgmt-module | ✅ Production      |
| EventBridge rule sync      | lambda-mgmt-module | ✅ Production      |
| Platform config management | lambda-mgmt-module | ✅ Production      |
| Module registration        | NEW                | 📋 Schema complete |
| Module enable/disable      | NEW                | 📋 Schema complete |
| Module usage tracking      | NEW                | 📋 Schema complete |
| Dynamic navigation         | NEW                | 📋 Schema complete |

---

**Document Status:** Phase 1 Complete  
**Last Updated:** December 11, 2025  
**Next Step:** Phase 2 (Deploy tables to production)
