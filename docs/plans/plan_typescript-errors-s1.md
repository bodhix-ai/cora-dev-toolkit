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

**Status:** 🟢 70% COMPLETE (32 of 46 errors fixed)

**Completed - Sessions 1-5:**
- [x] Fixed 27 errors (46 → 19) - 59% reduction
- [x] Type definitions, hook interfaces, component props, string-to-Error conversions, CategoricalMode types
- [x] All changes committed and synced to test-admin-2
- [x] See Session 1-5 commits in context file for details

**Completed - Sessions 6-9:**
- [x] Fixed 13 errors (32 → 19) - continued incremental progress
- [x] Hook method signatures, function parameter types, component integration
- [x] All changes committed to branch
- [x] Multiple commits: See git log for session-by-session details

**Completed - Session 10:**
- [x] Fixed 5 errors (19 → 14) - union types & optional chaining
- [x] Files modified:
  1. `EvalSummaryPanel.tsx` - Optional chaining for evaluation.documents
  2. `OrgEvalPromptsPage.tsx` - Conditional rendering for currentPrompt
  3. `CriteriaItemEditor.tsx` - Union types in handleAdd/handleUpdate
  4. `CriteriaSetManager.tsx` - Union types in handleCreate/handleUpdate
  5. `DocTypeManager.tsx` - Union types in handleCreate/handleUpdate
- [x] Commit: ef2f4ec "fix(typescript): session 10 - fixed 5 errors with union types and optional chaining (19->14)"
- [x] Synced all fixes to test-admin-2 and validated

**Cumulative Progress:**
- Starting: 46 TypeScript errors
- Current: 14 TypeScript errors
- **Total Fixed: 32 errors (70% reduction!)**

**Remaining (14 errors) - Prioritized for Session 11+:**

1. **EASY - Config Pages (2 errors)**
   - OrgEvalConfigPage.tsx:276 - Function signature expects union type
   - SysEvalConfigPage.tsx:263 - Same pattern

2. **MEDIUM - Import Functions (3 errors)**
   - OrgEvalCriteriaPage.tsx:257 - Import input type mismatch
   - OrgEvalCriteriaPage.tsx:324 - Import return type mismatch
   - OrgEvalCriteriaPageV2.tsx:385 - Import return type mismatch

3. **COMPLEX - Component Props (2 errors)**
   - OrgEvalCriteriaPage.tsx:295 - CriteriaItemEditor expects full object
   - OrgEvalCriteriaPageV2.tsx:356 - Same issue

4. **MEDIUM - Hook Issues (2 errors)**
   - OrgEvalPromptsPage.tsx:243 - Missing 'test' method
   - OrgEvalPromptsPage.tsx:326 - Test function signature mismatch

5. **COMPLEX - Store Issues (3 errors)**
   - store/evalStore.ts:437 - Type 'unknown' not assignable
   - store/evalStore.ts:580 - Boolean not assignable to ToggleDelegationInput
   - store/evalStore.ts:1411 - Complex Zustand type issue

6. **EASY - Type Import (1 error)**
   - EvalQAList.tsx:322 - StatusOption import conflict

7. **MEDIUM - Toggle Delegation (1 error)**
   - SysEvalConfigPage.tsx:290 - Function signature mismatch

**Next Steps (Target: 0 errors):**
- [ ] Fix config page signatures (2 errors - quick wins)
- [ ] Fix hook issues (2 errors - medium complexity)
- [ ] Fix import functions (3 errors - medium complexity)
- [ ] Address store issues (3 errors - complex, may need architectural decisions)
- [ ] Fix remaining component props and type imports (4 errors)
- [ ] **Estimated:** 2-3 more focused sessions to reach 0 errors

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