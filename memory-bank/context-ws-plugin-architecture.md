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
| S1 | `feature/ws-plugin-architecture-s1` | `docs/plans/plan_feature-ws-plugin-architecture-s1.md` | 🟡 Active | - |
| S2 | `feature/ws-plugin-config` | `plan_ws-plugin-config.md` | ⏳ Planned | - |
| S3 | `feature/ws-module-registration` | `plan_ws-module-registration.md` | ⏳ Planned | - |

## Current Sprint

- **Branch:** `feature/ws-plugin-architecture-s1`
- **Plan:** `docs/plans/plan_feature-ws-plugin-architecture-s1.md`
- **Focus:** Fix TypeScript type errors (e.g., Session.accessToken) and establish initial plugin interface/types to prevent cross-module type-checking.

## Technical Context

### Root Cause of Current Type Errors

Module-eval imports from module-ws, but tsconfig path mappings point to SOURCE files (.ts), not compiled declarations (.d.ts). This causes TypeScript to type-check module-ws source files when compiling module-eval, and the type augmentation for Session doesn't apply across compilation contexts.

**Current Error Count:** 78 `accessToken does not exist on type 'Session'` errors

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

- (Pending) ADR-017: WS Plugin Architecture

## Session Log

### January 24, 2026 - Root Cause Analysis
- Identified that module-eval's import from module-ws causes cross-module type-checking
- Found that apps/web works by excluding packages from tsconfig
- Determined architectural approach: plugins should not import directly from host