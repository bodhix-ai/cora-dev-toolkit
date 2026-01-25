# WS Plugin Architecture (Sprint 1) - Types + TS Error Stabilization

**Status**: 🟡 IN PROGRESS  
**Priority**: **P1**  
**Estimated Duration**: 4-8 hours  
**Created**: 2026-01-25  
**Branch**: `feature/ws-plugin-architecture-s1`  
**Context**: `memory-bank/context-ws-plugin-architecture.md`

---

## Executive Summary

This sprint establishes the first concrete implementation step of the **WS Plugin Architecture** initiative.

### Current State

- ❌ TypeScript errors exist due to cross-module type-checking when plugins import from module-ws.
- ❌ Pattern for “workspace host provides context, plugins consume” is not formalized in types.

### Goal

1. **Stabilize TypeScript** by removing/containing cross-module type-checking failure modes.
2. Define an initial **WS plugin interface/type contract** that functional modules can implement/consume without importing module-ws internals.

---

## Scope

### In Scope

- [ ] Identify the minimal plugin types needed for modules to integrate with workspace.
- [ ] Fix the TS failure mode(s) (e.g., `Session.accessToken` errors) in a standards-compliant way.
- [ ] Document the resulting type/interface contract (in-code and/or docs).

### Out of Scope

- Full config inheritance system (planned Sprint 2).
- Full module registration / dynamic enablement (planned Sprint 3).
- Refactoring every module to the new plugin pattern in this sprint.

---

## Phase 1: Confirm Root Cause + Reproduce (1-2h)

- [ ] Reproduce the errors locally in the toolkit (or in a fresh test project) and capture:
  - error counts
  - key files involved
  - exact import chains
- [ ] Confirm which compilation boundary is causing `Session` augmentation to be lost.

**Expected Output:** A short summary (bullets) in this plan and/or the context file describing the confirmed root cause.

---

## Phase 2: Define Plugin Contract (1-2h)

- [ ] Create/identify a stable type contract for:
  - workspace identity
  - workspace config surface needed by plugins
  - optional capability toggles
- [ ] Ensure the contract does *not* require importing module-ws source directly.

**Expected Output:** A minimal TypeScript interface/types file (location TBD) and documentation notes.

---

## Phase 3: Apply TS Fix (2-4h)

- [ ] Implement the fix (chosen approach) and verify it removes the current type errors.
- [ ] Confirm it aligns with the CORA standards (doesn’t break portability/validation).

**Expected Output:** `pnpm -r run type-check` (or validation TS check) passes for the previously failing set.

---

## Success Criteria

- [ ] The known WS/plugin TypeScript error set is eliminated (or reduced to an agreed baseline).
- [ ] A documented plugin type/interface contract exists.
- [ ] Follow-up work is clearly staged for Sprint 2 and Sprint 3.

---

## Rollback Plan

If the approach introduces regressions:

1. Revert the commit(s) on `feature/ws-plugin-architecture-s1`.
2. Keep only documentation/analysis changes (if helpful).
3. Re-run type-check to confirm we’re back to the pre-sprint baseline.
