# Sprint Plan: TypeScript Error Remediation S1

**Status:** 🟡 IN PROGRESS  
**Branch:** `fix/typescript-errors-s1`  
**Initiative:** Error Remediation & Clean Baseline  
**Context:** [`memory-bank/context-error-remediation.md`](../../memory-bank/context-error-remediation.md)

---

## Sprint Goal

Eliminate all 46 TypeScript errors in the project templates to achieve 0 TypeScript errors across the entire CORA codebase.

---

## Scope

### IN SCOPE

**Target Errors:** 46 TypeScript errors (all in module-eval)

**Error Categories:**
1. Type assignment mismatches (TS2322) - CreateInput vs UpdateInput union types
2. Missing properties on types (TS2339) - scoreValue, editedScoreValue
3. Property access on potentially undefined types

**Affected Files:**
- `templates/_modules-functional/module-eval/frontend/components/CriteriaItemEditor.tsx`
- `templates/_modules-functional/module-eval/frontend/components/CriteriaSetManager.tsx`
- `templates/_modules-functional/module-eval/frontend/components/DocTypeManager.tsx`
- `templates/_modules-functional/module-eval/frontend/components/EvalQAList.tsx`
- Additional module-eval frontend components as identified

### OUT OF SCOPE

- Admin Route standardization (91 errors) - deferred to another team
- Accessibility errors (55)
- Frontend compliance errors (42)
- Next.js routing errors (24)
- Database naming errors (6)
- Other validation warnings

---

## Implementation Steps

### Phase 1: Analysis & Setup
- [x] Run fresh validation on test-admin-2 (276 total errors)
- [x] Identify TypeScript error breakdown (46 errors)
- [x] Create initiative context file
- [x] Create sprint branch
- [x] Create sprint plan

### Phase 2: TypeScript Error Fixes

**Status:** 🟢 50%+ MILESTONE ACHIEVED (23-24 of 46 errors fixed - 50-52%)

**Completed - Session 1:**
- [x] Extract complete TypeScript error list with file/line numbers
- [x] Analyze error patterns and root causes (4 patterns identified)
- [x] Fix missing property errors - Type definitions updated (5 errors):
  - Added `editedScoreValue` to `EvalResultEdit`
  - Added `scoreValue` to `aiResult` in `CriteriaResultWithItem`
  - Added `citations` to `Evaluation`
  - Added `documentId` and `metadata` to `EvaluationDocument`
- [x] Commit: 5399448 "fix(types): add missing properties to module-eval type definitions"

**Completed - Session 2:**
- [x] Fix hook interface mismatches (8 errors):
  - Fixed EvalDetailPage: exportPdf/exportXlsx → downloadPdf/downloadXlsx
  - Fixed EvalListPage: evaluation prop, useAnyProcessing call, exportAll methods
  - Added hasOrgOverride to EvalSysPromptConfig
- [x] Commit: 2bf8ec3 "fix(typescript): resolve module-eval hook and component prop errors"

**Completed - Session 3:**
- [x] Fix component prop mismatches (1 error):
  - Fixed OrgEvalCriteriaPage: CriteriaSetManager props (onCreate, onUpdate, onDelete, onViewItems, onFilterChange)
  - Fixed hook method name: importSet → importFromFile
- [x] Commit: d5a8e2e "fix(typescript): fix OrgEvalCriteriaPage component prop mismatches"

**Completed - Session 4:**
- [x] Analyzed remaining 32 errors
- [x] Categorized by fix priority and complexity
- [x] Identified fix patterns for next session

**Completed - Session 5:**
- [x] Fix string-to-Error conversions (7 errors):
  - Applied pattern: `error instanceof Error ? error : new Error(error || 'Unknown error')`
  - Fixed ErrorState components in 7 files (EvalDetailPage, EvalListPage, OrgEvalConfigPage, OrgEvalCriteriaPage, OrgEvalDocTypesPage, OrgEvalPromptsPage, SysEvalConfigPage)
- [x] Commit: 254f60b "fix(typescript): convert string errors to Error objects in ErrorState components"
- [x] Fix CategoricalMode type issues (2-3 errors):
  - Imported `CategoricalMode` type from `../types`
  - Changed function parameter types from `string` to `CategoricalMode` in OrgEvalConfigPage and SysEvalConfigPage
  - CategoricalMode is union type: `"boolean" | "detailed"`
- [x] Commit: 813edc9 "fix(typescript): import and use CategoricalMode type instead of string"

**Remaining (22-23 errors) - Prioritized by Fix Complexity:**

1. **MEDIUM PRIORITY - Function Signature Mismatches (~5 errors)**
   - Union type handling (CreateInput | UpdateInput)
   - ToggleDelegationInput vs boolean
   - Parameter type incompatibilities

2. **LOW PRIORITY - Hook Interface Issues (~4 errors)**
   - Missing `test` method on usePrompts hook (OrgEvalPromptsPage:243)
   - Missing `processingIds` on useAnyProcessing hook
   - Other missing hook methods

3. **COMPLEX - CriteriaItemEditor Integration (~3 errors)**
   - OrgEvalCriteriaPage.tsx:295
   - OrgEvalCriteriaPageV2.tsx:356
   - **Requires refactor:** Component expects full object + items + callbacks, not just IDs

4. **MEDIUM - Component Prop Mismatches (~6 errors)**
   - Missing statusOptions in ResultEditDialogProps (EvalDetailPage:1269)
   - Various type compatibility issues

**Next Steps (Target: 75% completion):**
- [ ] Fix function signature mismatches (~5 errors)
- [ ] Fix component prop mismatches (~6 errors)
- [ ] This would achieve 34-35 errors fixed (74-76% completion)

### Phase 3: Template Updates & Testing
- [ ] Update affected files in templates (template-first workflow)
- [ ] Sync fixes to test-admin-2 using fix-and-sync workflow
- [ ] Run TypeScript type-check on test-admin-2
- [ ] Run full validation suite on test-admin-2

### Phase 4: Verification & Documentation
- [ ] Confirm 0 TypeScript errors in validation
- [ ] Update context file with completion notes
- [ ] Document any interface changes or patterns established
- [ ] Prepare PR with summary of changes

---

## Success Criteria

- [ ] TypeScript validator shows 0 errors (down from 46)
- [ ] All module-eval components type-check successfully
- [ ] No regressions introduced (other validator counts unchanged)
- [ ] Fixes applied to templates first, then synced to test project
- [ ] Changes documented in context file

---

## Technical Approach

### Error Pattern 1: Type Assignment Mismatches

**Issue:** Functions expect union types but receive single types
```typescript
// Error: Type 'CreateInput' is not assignable to 'CreateInput | UpdateInput'
onSubmit={(input: CreateCriteriaItemInput) => Promise<void>}
// Expected
onSubmit={(input: CreateCriteriaItemInput | UpdateCriteriaItemInput) => Promise<void>}
```

**Fix:** Update function signatures to accept proper union types

### Error Pattern 2: Missing Properties on Types

**Issue:** Properties don't exist on type definitions
```typescript
// Error: Property 'scoreValue' does not exist on type '{ id: string; ... }'
const value = result.scoreValue
```

**Fix:** Update type definitions to include missing properties or use optional chaining

### Error Pattern 3: Property Access on Undefined

**Issue:** Accessing properties without null/undefined checks
```typescript
// Error: Object is possibly 'undefined'
editedScoreValue.scoreValue
```

**Fix:** Add optional chaining or type guards

---

## Template-First Workflow

All fixes follow this process:

1. **Fix in Template** - Update file in `templates/_modules-functional/module-eval/`
2. **Sync to Test Project** - Use `scripts/sync-fix-to-project.sh` to copy to test-admin-2
3. **Verify** - Run type-check and validation on test-admin-2
4. **Iterate** - Repeat until error is resolved

---

## Validation Commands

**TypeScript type-check only:**
```bash
cd /Users/aaron/code/bodhix/testing/test-admin-2/ai-sec-stack
pnpm run type-check
```

**Full validation:**
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit
python3 validation/cora-validate.py project /Users/aaron/code/bodhix/testing/test-admin-2/ai-sec-stack --format text
```

---

## Dependencies

**Completed Prerequisites:**
- ✅ WS Plugin Architecture S1/S2 - Eliminated 328 TypeScript errors
- ✅ Admin Standardization S3a - Fixed module infrastructure

**Blocking Issues:** None

---

## Notes

- Focus on module-eval only - all 46 errors are in this module
- Use existing patterns from recent WS Plugin work
- Maintain backward compatibility
- Document any interface changes in ADRs if significant

---

**Created:** January 26, 2026  
**Last Updated:** January 26, 2026