# TypeScript Error Analysis - test-cite Project

**Date:** January 25, 2026  
**Project:** test-cite (~/code/bodhix/testing/test-cite)  
**Related:** ADR-017 WS Plugin Architecture, Sprint 1

---

## Executive Summary

TypeScript validation on test-cite project confirms the cross-module type-checking issue documented in ADR-017.

**Total Errors:** 125  
**Session.accessToken Errors:** 78 (62% of total)  
**Module-Eval Specific Errors:** 47 (38% of total)

---

## Error Breakdown

### 1. Session.accessToken Errors (78 total)

All errors are of the form: `Property 'accessToken' does not exist on type 'Session'`

These occur when module-eval's TypeScript compilation type-checks module-ws source files due to the import:
```typescript
import { useWorkspaceConfig } from "@ai-sec/module-ws";
```

**Distribution by File:**

| File | Error Count | Purpose |
|------|-------------|---------|
| `useWorkspace.ts` | 27 | Workspace CRUD operations |
| `OrgAdminManagementPage.tsx` | 20 | Org admin workspace management |
| `WorkspaceDetailPage.tsx` | 9 | Workspace detail view |
| `WorkspaceDetailAdminPage.tsx` | 8 | Admin workspace detail |
| `useWorkspaceConfig.ts` | 6 | Workspace configuration hook |
| `WorkspaceListPage.tsx` | 4 | Workspace list view |
| `useWorkspaces.ts` | 3 | Workspace list hook |
| `PlatformAdminConfigPage.tsx` | 1 | Platform config |

**Root Cause:**

The Session type augmentation in `module-ws/frontend/types/next-auth.d.ts`:
```typescript
declare module "next-auth" {
  interface Session {
    accessToken: string;  // ← This augmentation doesn't propagate
    idToken: string;
    expiresAt: number;
    user: { id: string } & DefaultSession["user"];
  }
}
```

This augmentation is scoped to module-ws's compilation context. When module-eval imports from module-ws and TypeScript type-checks the module-ws source files, the augmentation doesn't apply, causing 78 type errors.

---

## 2. Module-Eval Specific Errors (47 total)

These are unrelated to the WS plugin architecture issue and represent technical debt in module-eval:

### Type Mismatch Errors (18)
- `CriteriaItemEditor.tsx` - CreateCriteriaItemInput vs UpdateCriteriaItemInput
- `CriteriaSetManager.tsx` - CreateCriteriaSetInput vs UpdateCriteriaSetInput
- `DocTypeManager.tsx` - CreateDocTypeInput vs UpdateDocTypeInput
- `EvalQAList.tsx` - StatusOption type incompatibility
- Various config pages - CategoricalMode type mismatches

### Missing Properties (12)
- `EvalQAList.tsx` - editedScoreValue, scoreValue
- `EvalDetailPage.tsx` - citations, exportPdf, exportXlsx, documentId, metadata
- `EvalProgressCard` - evaluationId property
- `EvalResultEdit` - missing properties in currentEdit

### Function Signature Mismatches (10)
- Export functions (exportPdf, exportXlsx) - argument count mismatches
- Test function - parameter type mismatches
- Edit result handlers - input type incompatibilities

### Other (7)
- Missing 'draft' status in EvaluationStatus enum
- 'process' not found (needs @types/node)
- Type assertion issues in store

---

## Impact Assessment

### Session.accessToken Errors (High Priority)

**Severity:** Critical  
**Impact:** Blocks TypeScript compilation, prevents development

**Scope:**
- All module-ws hooks (useWorkspace, useWorkspaceConfig, useWorkspaces)
- All module-ws admin pages
- Any functional module that imports from module-ws (eval, kb, chat, voice)

**Solution:** Implement ADR-017 WS Plugin Architecture
- Create `packages/shared` with workspace-plugin types
- Remove direct module-ws imports from functional modules
- Use composition pattern via React Context

**Estimated Fix Time:** 2-3 hours for infrastructure + 1 hour per module migration

### Module-Eval Specific Errors (Medium Priority)

**Severity:** Medium  
**Impact:** Type safety issues, potential runtime bugs

**Scope:**
- Module-eval frontend only
- Does not affect other modules

**Solution:** Fix module-eval type definitions and component props
- Update type definitions to match API contracts
- Fix component prop interfaces
- Add missing enum values

**Estimated Fix Time:** 3-4 hours

---

## Recommendations

### Immediate (Sprint 1)

1. **Implement WS Plugin Architecture** (ADR-017)
   - Create shared package with workspace-plugin types
   - Migrate module-eval to use workspace context
   - Verify Session.accessToken errors are eliminated

2. **Document Pattern**
   - Create guide for building workspace-aware modules
   - Update module development docs

### Follow-up (Sprint 2)

1. **Migrate Other Modules**
   - module-kb
   - module-chat
   - module-voice

2. **Fix Module-Eval Technical Debt**
   - Address type mismatches
   - Fix missing properties
   - Update function signatures

---

## Validation Strategy

### Pre-Fix Baseline
- ✅ test-cite: 125 errors (78 Session.accessToken, 47 module-eval)

### Post-Fix Target
- 🎯 0 Session.accessToken errors
- 🎯 47 module-eval errors (to be addressed separately)

### Comparison Projects
- test-cite (existing) - Pre-fix baseline
- test-ws-25 (new) - Fresh project for post-fix validation

---

## References

- ADR-017: WS Plugin Architecture
- `validation-test-cite.txt` - Full error output
- `memory-bank/context-ws-plugin-architecture.md`
- `docs/plans/plan_feature-ws-plugin-architecture-s1.md`