# Context: WS Plugin Architecture

**Created:** January 24, 2026  
**Primary Focus:** Module integration patterns for workspaces

## Initiative Overview

Define and implement the architecture for functional modules (kb, chat, voice, eval) to integrate with workspace (ws) as plugins. This includes:

- Type definitions and shared interfaces
- Config inheritance pattern (sys → org → ws)
- Module registration system
- Dynamic feature toggling within workspaces

## Modules Affected

| Module | Role | Integration Type |
|--------|------|------------------|
| module-ws | Host/Shell | Provides workspace context |
| module-kb | Plugin | Knowledge base features |
| module-chat | Plugin | Chat/messaging features |
| module-voice | Plugin | Voice interview features |
| module-eval | Plugin | Evaluation features |

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-----------|
| S1 | `feature/ws-plugin-architecture-s1` | `docs/plans/plan_feature-ws-plugin-architecture-s1.md` | ✅ Complete | 2026-01-25 |
| S2 | `feature/ws-plugin-architecture-s2` | `docs/plans/plan_ws-plugin-architecture-s2.md` | ⏳ Ready | - |
| S3 | `feature/ws-plugin-architecture-s3` | `docs/plans/plan_ws-plugin-architecture-s3.md` | ⏳ Planned | - |

## Naming Pattern (Initiative-Wide Consistency)

All sprints in the **WS Plugin Architecture** initiative follow this naming pattern:

- **Branch:** `feature/ws-plugin-architecture-s{N}`
- **Plan:** `docs/plans/plan_ws-plugin-architecture-s{N}.md`
- **Context:** `memory-bank/context-ws-plugin-architecture.md` (shared across all sprints)

**Why this pattern:**
- Makes it clear all sprints are part of the same initiative
- Sprint number differentiation is obvious
- Easy to track related work across branches
- Consistent with git branch naming best practices

## Current Sprint

- **Branch:** `feature/ws-plugin-architecture-s2`
- **Plan:** `docs/plans/plan_ws-plugin-architecture-s2.md`
- **Status:** ⏳ Ready to Start
- **Focus:** Config inheritance system (sys → org → ws cascade)

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

## Next Sprint Planning

**Sprint 2: Config Inheritance System** (Planned)
- Implement sys → org → ws config cascade
- Define config override patterns
- Document config inheritance behavior

## Technical Context

### Root Cause of Current Type Errors

Module-eval imports from module-ws, but tsconfig path mappings point to SOURCE files (.ts), not compiled declarations (.d.ts). This causes TypeScript to type-check module-ws source files when compiling module-eval, and the type augmentation for Session doesn't apply across compilation contexts.

**Current Error Count:** 78 `accessToken does not exist on type 'Session'` errors (confirmed across multiple test projects)

**Working Pattern (apps/web):**
- Excludes `../../packages/**/*` from tsconfig
- This prevents cross-module source type-checking

### Architectural Goal

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

## Key Decisions

- ✅ **ADR-017: WS Plugin Architecture** - Documented January 25, 2026
  - Status: Proposed (pending user approval)
  - Decision: Use composition pattern where apps/web provides workspace context to plugins via React Context
  - Impact: Eliminates 78 Session.accessToken errors, establishes clear host/plugin boundary

## Session Log

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
- **Status:** Sprint 1 complete! All objectives achieved. Ready for Sprint 2 (config inheritance).

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
