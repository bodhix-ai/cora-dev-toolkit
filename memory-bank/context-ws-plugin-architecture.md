# Context: WS Plugin Architecture

**Created:** January 24, 2026  
**Updated:** January 25, 2026 (Sprint 2 revised approach)  
**Primary Focus:** Module integration patterns for workspaces

## Initiative Overview

Define and implement the architecture for functional modules (kb, chat, voice, eval) to integrate with workspace (ws) as plugins. This includes:

- Type definitions and shared interfaces
- Module availability checking (via sys_module_registry)
- Config inheritance pattern (sys → org → ws)
- Module registration system
- Dynamic feature toggling within workspaces

## Modules Affected

| Module | Role | Integration Type |
|--------|------|------------------|
| module-ws | Host/Shell | Provides workspace context |
| module-mgmt | Registry | Manages module availability (is_enabled, is_installed) |
| module-kb | Plugin | Knowledge base features |
| module-chat | Plugin | Chat/messaging features |
| module-voice | Plugin | Voice interview features |
| module-eval | Plugin | Evaluation features |

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-------|
| S1 | `feature/ws-plugin-arch-s1` | `docs/plans/plan_ws-plugin-arch-s1.md` | ✅ Complete | 2026-01-25 |
| S2 | `feature/ws-plugin-arch-s2` | `docs/plans/plan_ws-plugin-arch-s2.md` | ✅ Complete | 2026-01-25 |
| S3 | `feature/ws-plugin-arch-s3` | `docs/plans/plan_ws-plugin-arch-s3.md` | 🟡 Active | - |

## Naming Pattern (Initiative-Wide Consistency)

All sprints in the **WS Plugin Architecture** initiative follow this naming pattern:

- **Branch:** `feature/ws-plugin-arch-s{N}`
- **Plan:** `docs/plans/plan_ws-plugin-arch-s{N}.md`
- **Context:** `memory-bank/context-ws-plugin-arch.md` (shared across all sprints)

**Why this pattern:**
- Uses abbreviations (arch = architecture) for brevity
- Makes it clear all sprints are part of the same initiative
- Sprint number differentiation is obvious
- Easy to track related work across branches
- Consistent with git branch naming best practices

## Current Sprint

- **Branch:** `feature/ws-plugin-arch-s3`
- **Plan:** `docs/plans/plan_ws-plugin-arch-s3.md`
- **Status:** 🟡 Active
- **Focus:** Dynamic module configuration (org/workspace config overrides, real-time updates)

## Sprint 1 Summary

**Duration:** ~6 hours  
**Result:** ✅ All objectives achieved

**Deliverables:**
1. ✅ Workspace plugin validator created (`validation/workspace-plugin-validator/`)
2. ✅ All modules migrated (kb, chat, voice, eval)
3. ✅ 100% compliance achieved (0 module-level violations)
4. ✅ Documentation complete (ADR-017, analysis docs)

**Metrics:**
- Module-level violations: 3 → 0 (100% reduction)
- Total errors: 3 → 0 (100% reduction)
- File warnings: 30 → 26 (13% reduction)

## Sprint 2 Summary

**Duration:** ~3 hours  
**Result:** ✅ All objectives achieved

**Key Discovery:** During planning, discovered that `module-mgmt` already has complete module registry infrastructure:
- ✅ `sys_module_registry` database table (is_enabled, is_installed, config, featureFlags)
- ✅ `/api/platform/modules` API endpoint
- ✅ `useModuleRegistry` hook with module availability checking
- ✅ `ModuleGate` and `ModuleConditional` components

**Revised Approach:** Instead of building config inheritance from scratch, integrate existing module-mgmt system with workspace-plugin architecture from Sprint 1.

**Goals:**
1. Extend `WorkspacePluginContext` with module availability
2. Connect `WorkspacePluginProvider` to `useModuleRegistry`
3. Prepare types for future org/workspace config overrides

## Architecture Decisions

### Sprint 2 Decisions

**Decision 1: Shell-Level vs Plugin-Level Filtering**
- **Chosen:** Shell-level filtering (Option B)
- **Rationale:** Cleaner architecture, single responsibility, already exists via ModuleGate

**Decision 2: API Endpoint**
- **Chosen:** Use existing `/api/platform/modules`
- **Rationale:** Already has all required data, avoid API proliferation

**Decision 3: Caching Strategy**
- **Chosen:** React state + context-level caching
- **Rationale:** Module availability rarely changes, simple and performant

## Module Registry Structure

### System Level (sys_module_registry)

```sql
CREATE TABLE sys_module_registry (
  id UUID PRIMARY KEY,
  module_name VARCHAR(100) UNIQUE,
  display_name VARCHAR(200),
  module_type VARCHAR(20),  -- 'core' | 'functional'
  tier INTEGER,             -- 1, 2, or 3
  is_enabled BOOLEAN,       -- SysAdmin toggle
  is_installed BOOLEAN,     -- Module deployed?
  config JSONB,             -- Module-specific config
  feature_flags JSONB,      -- Feature toggles
  nav_config JSONB,         -- Navigation config
  dependencies JSONB,       -- Array of module_name
  ...
);
```

**Module Available If:** `is_installed = true AND is_enabled = true`

### Future: Org Level (org_module_config)

- Orgs can disable modules for their organization
- Orgs can override system-level config/feature flags
- Will integrate with licensing/paywall system

### Future: Workspace Level (ws_module_config)

- Workspaces can override org/system config/feature flags
- Cannot enable if org/system disabled
- Inherits from org → system cascade

## Integration with Admin Standardization

The admin standardization project is implementing module enablement toggles via the module-mgmt admin config page, which updates `sys_module_registry.is_enabled`.

**Integration Points:**
- Module availability checks `is_installed AND is_enabled`
- Admin config changes should trigger module registry refresh
- Future: Org-level overrides will integrate with licensing system

## Technical Context

### Root Cause of Current Type Errors (Sprint 1 Context)

Module-eval imports from module-ws, but tsconfig path mappings point to SOURCE files (.ts), not compiled declarations (.d.ts). This causes TypeScript to type-check module-ws source files when compiling module-eval, and the type augmentation for Session doesn't apply across compilation contexts.

**Current Error Count:** 78 `accessToken does not exist on type 'Session'` errors (confirmed across multiple test projects)

**Working Pattern (apps/web):**
- Excludes `../../packages/**/*` from tsconfig
- This prevents cross-module source type-checking

### Architectural Goal (Sprint 1)

Instead of having plugins import directly from host (current):
```typescript
// ❌ Current - plugin imports from host
import { useWorkspaceConfig } from "@ai-sec/module-ws";
```

Use composition pattern (target):
```typescript
// ✅ Target - host provides context, plugins consume
// apps/web composes host + plugins
// Plugins receive workspace context via React Context or props
```

**Sprint 1 Achievement:** This pattern is now established via `WorkspacePluginContext` and `useWorkspacePlugin`.

**Sprint 2 Addition:** Add module availability to this context.

## Key Decisions

- ✅ **ADR-017: WS Plugin Architecture** - Documented January 25, 2026
  - Status: Approved
  - Decision: Use composition pattern where apps/web provides workspace context to plugins via React Context
  - Impact: Eliminates 78 Session.accessToken errors, establishes clear host/plugin boundary
  - **Sprint 2 Update:** Add module availability integration section

## Session Log

### January 25, 2026 - Sprint 3 Planning Session ✅ API Route Standards Established

**Status:** Planning / Prerequisite Work  
**Duration:** ~4 hours  
**Focus:** Establishing API route standards to unblock S3 implementation

**Context:**
Sprint 3 requires new admin API routes for org/workspace module configuration:
- `/admin/org/{module}/modules` - Org-level module config
- `/admin/ws/{wsId}/{module}/modules` - Workspace-level module config

However, CORA lacked standardized API route patterns, creating uncertainty about:
- Route structure (scope prefixes, module shortnames)
- Context passing (orgId in path vs session, wsId placement)
- Admin route patterns (sys/org/ws scopes)

**Decision:** Establish comprehensive API route standards before implementing S3 database/API phases.

**Work Completed:**

**1. API Route Standards Foundation**
- ✅ Created ADR-018b: API Gateway Route Standards
- ✅ Created standard_ADMIN-API-ROUTES.md (comprehensive standard)
- ✅ Defined route patterns for all scopes (sys admin, org admin, ws admin, data API)
- ✅ Clarified context passing (org via session, wsId in path)
- ✅ Documented module shortname usage

**2. Admin Route Validator**
- ✅ Developed validation/admin-route-validator/
- ✅ Detects missing scope prefixes
- ✅ Validates module shortname usage
- ✅ Identifies API prefix violations
- ✅ Integrated with cora-validate.py orchestrator
- ✅ Baseline validation run: 86 errors, 90 warnings (11% compliance)

**3. API Route Migration Plan**
- ✅ Created docs/plans/backlog/plan_api-route-migration.md
- ✅ Grouped 86 errors by module and priority
- ✅ Prioritized admin routes (Phases 1-3: 34 errors, 40% of total)
- ✅ Defined phased implementation (aligns with admin standardization)
- ✅ Created integration strategy with ongoing work

**Files Created:**
- `docs/arch decisions/ADR-018b-API-GATEWAY-ROUTE-STANDARDS.md`
- `docs/standards/standard_ADMIN-API-ROUTES.md`
- `validation/admin-route-validator/validate_routes.py`
- `validation/admin-route-validator/cli.py`
- `validation/admin-route-validator/__init__.py`
- `validation/admin-route-validator/README.md`
- `docs/plans/backlog/plan_api-route-migration.md`

**Files Modified:**
- `validation/cora-validate.py` (added admin_routes validator)

**Impact on Sprint 3:**

**Unblocked:**
- ✅ S3 Phase 2 (Backend API) now has clear route patterns
- ✅ Design document route ambiguities resolved
- ✅ Integration with admin standardization clarified

**Routes for S3:**
```
# System Admin - Module Management
GET  /admin/sys/mgmt/modules
PUT  /admin/sys/mgmt/modules/{moduleName}

# Org Admin - Module Management  
GET  /admin/org/mgmt/modules
PUT  /admin/org/mgmt/modules/{moduleName}

# Workspace Admin - Module Management
GET  /admin/ws/{wsId}/mgmt/modules
PUT  /admin/ws/{wsId}/mgmt/modules/{moduleName}
```

**Next Session:**
- Evaluate options to integrate admin standardization work with API route migration (Phases 1-2)
- Decide if S3 Phase 1 (database schema) proceeds independently or waits for route migration coordination
- Consider if S3 should integrate Phase 1-2 of API route migration plan

**Status:** Sprint 3 prerequisites established. Ready to proceed with Phase 1 (database schema) or coordinate with route migration.

---

### January 25, 2026 - Sprint 2 Complete ✅

**Planning Phase:**
- Reviewed admin standardization context and `sys_module_registry` schema
- Discovered existing module-mgmt infrastructure (useModuleRegistry, ModuleGate, etc.)
- Made architectural recommendations:
  - Use shell-level filtering (ModuleGate) instead of plugin-level checks
  - Use existing `/api/platform/modules` endpoint
  - React Context caching with refresh triggers
- Revised Sprint 2 scope from "build config inheritance" to "integrate existing systems"

**Implementation Phase:**
- ✅ **Phase 1: Extended WorkspacePluginContext**
  - Added `ModuleAvailability` interface
  - Added `ModuleConfig` interface
  - Added `ModuleConfigResolution` interface
  - Added future `OrgModuleConfig` and `WorkspaceModuleConfig` types
  - Updated `WorkspacePluginContext` with `moduleAvailability` field
- ✅ **Phase 2: Connected to module-mgmt**
  - Updated `WorkspacePluginProvider` to use `useModuleRegistry`
  - Implemented `isModuleAvailable()` helper function
  - Implemented `getModuleConfig()` helper function
  - Computed `enabledModules` array
  - Integrated loading state with module registry loading
- ✅ **Phase 3: Documentation**
  - Updated ADR-017 with Sprint 2 module availability integration
  - Created comprehensive usage guide: `docs/guides/guide_MODULE-AVAILABILITY-INTEGRATION.md`
  - Documented shell-level ModuleGate pattern
  - Documented future org/workspace config inheritance

**Files Modified:**
- `templates/_project-stack-template/packages/shared/workspace-plugin/types.ts`
- `templates/_project-stack-template/apps/web/components/WorkspacePluginProvider.tsx`
- `docs/arch decisions/ADR-017-WS-PLUGIN-ARCHITECTURE.md`
- `docs/guides/guide_MODULE-AVAILABILITY-INTEGRATION.md` (new)
- `docs/plans/plan_ws-plugin-arch-s2.md` (revised approach)
- `memory-bank/context-ws-plugin-architecture.md` (this file)

**Success Criteria - All Achieved:**
- ✅ WorkspacePluginContext includes module availability
- ✅ WorkspacePluginProvider fetches module registry on load
- ✅ Plugins can check if modules are available via context
- ✅ Shell uses ModuleGate to conditionally render plugins (documented)
- ✅ Types defined for future org/workspace config overrides
- ✅ Documentation explains integration and future config cascade

**Duration:** ~2 hours (faster than estimated 4-6 hours due to existing infrastructure)

**Status:** Sprint 2 complete! Ready for Sprint 3 (dynamic module registration and org-level config overrides).

### January 25, 2026 - Phase 4 Complete ✅ SPRINT 1 COMPLETE

- **Created workspace-plugin-validator:**
  - Detects module-level violations (modules not using workspace-plugin)
  - Identifies files that may need workspace plugin
  - Validates WorkspacePluginProvider presence
  - Provides detailed compliance reports per module
- **Migrated all remaining modules:**
  - ✅ module-kb: Updated `useWorkspaceKB` hook, removed workspaceId prop from components
  - ✅ module-chat: Updated `useChat` hook, maintained backward compatibility
  - ✅ module-voice: Updated `useVoiceSessions` hook, maintained backward compatibility
- **Final validation results:**
  - Module-level violations: 0 (down from 3)
  - Total errors: 0 (down from 3)
  - All modules compliant with ADR-017 ✅
- **Files modified in templates:**
  - `templates/_modules-core/module-kb/frontend/hooks/useWorkspaceKB.ts`
  - `templates/_modules-core/module-kb/frontend/components/WorkspaceDataKBTab.tsx`
  - `templates/_modules-core/module-chat/frontend/hooks/useChat.ts`
  - `templates/_modules-functional/module-voice/frontend/hooks/useVoiceSessions.ts`
  - `validation/workspace-plugin-validator/` (entire directory - new tool)
- **Status:** Sprint 1 complete! All objectives achieved. Ready for Sprint 2 (module registry integration).

### January 25, 2026 - Phase 3 Complete ✅

- **Implemented WS Plugin Architecture:**
  - Created `packages/shared` package with workspace-plugin module
  - Defined `WorkspacePluginContext` and `WorkspacePluginContextValue` interfaces
  - Created React Context (`WorkspacePluginContext`) and `useWorkspacePlugin` hook
  - Created `WorkspacePluginProvider` component in apps/web
  - Added comprehensive documentation in `packages/shared/README.md`
- **Migrated module-eval:**
  - Removed import from `@{{PROJECT_NAME}}/module-ws`
  - Updated to use `@{{PROJECT_NAME}}/shared/workspace-plugin`
  - Changed from `useWorkspaceConfig()` to `useWorkspacePlugin()`
- **Updated tsconfig.json:**
  - Added path mapping for `@{{PROJECT_NAME}}/shared/workspace-plugin`
- **Status:** Implementation complete, ready for testing in a created project

### January 25, 2026 - Phase 1 & 2 Complete

- **Created ADR-017:** Complete architectural documentation for WS plugin pattern
  - Defined `WorkspacePluginContext` interface as the plugin contract
  - Documented composition pattern (host provides context via React Context)
  - Included migration path and implementation details
- **Validated root cause:** Ran type-check on test-cite and test-plugin projects
  - Both projects: 125 total errors (78 Session.accessToken, 47 module-eval specific)
  - Zero variance confirms architectural root cause (not environmental)
  - Created detailed analysis docs: `analysis_ws-plugin-ts-errors-test-cite.md` and `analysis_ws-plugin-comparison.md`
- **Status:** Phase 1 & 2 complete, ready for Phase 3 implementation after user reviews ADR-017

### January 24, 2026 - Root Cause Analysis

- Identified that module-eval's import from module-ws causes cross-module type-checking
- Found that apps/web works by excluding packages from tsconfig
- Determined architectural approach: plugins should not import directly from host