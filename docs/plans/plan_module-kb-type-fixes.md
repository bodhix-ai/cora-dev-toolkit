# Module-KB Type Error Fixes

**Branch:** `ws-crud-kbs-embeddings`  
**Status:** Ready for Implementation  
**Branch Strategy:** Fix in `ws-crud-kbs-embeddings`, then PR to `main`  
**Estimated Time:** 1-2 hours  
**Date:** January 18, 2026

---

## Executive Summary

Type errors are appearing in **module-kb** (NOT module-chat as initially suspected). The errors stem from API response type mismatches where the code expects nested `{ documents: KbDocument[] }` structure but the API returns flat `KbDocument[]` arrays.

**Key Finding:** The `ws-crud-kbs-embeddings` branch is the active development branch for KB features and should contain these fixes before merging to main.

---

## Error Scope

### Affected Files (6 total)

#### 1. `templates/_modules-core/module-kb/frontend/hooks/useKbDocuments.ts`
**Line 86:**
```typescript
// ERROR: Property 'documents' does not exist on type 'KbDocument[]'
setDocuments(response.data.documents || []);
```

**Fix:**
```typescript
// response.data IS KbDocument[], not { documents: KbDocument[] }
setDocuments(response.data || []);
```

---

#### 2. `templates/_modules-core/module-kb/frontend/hooks/useWorkspaceKB.ts` (via module-access)
**Lines 140, 142, 144, 146 (multiple):**
```typescript
// ERROR: Property 'scope' does not exist on type 'AvailableKb'
```

**Root Cause:** The `AvailableKb` type definition is missing the `scope` property.

**Fix:** Add `scope` property to `AvailableKb` type in `types.ts`:
```typescript
export interface AvailableKb {
  kb_id: string;
  name: string;
  scope: 'org' | 'workspace' | 'chat';  // ADD THIS
  description?: string;
  // ... other fields
}
```

---

#### 3. `templates/_modules-core/module-kb/frontend/hooks/useWorkspaceKB.ts`
**Line 177:**
```typescript
// ERROR: 'contentType' does not exist in type 'UploadDocumentInput'
```

**Root Cause:** Using `contentType` instead of `mimeType`.

**Fix:**
```typescript
// Change from:
const input: UploadDocumentInput = {
  filename: file.name,
  fileSize: file.size,
  contentType: file.type,  // WRONG
};

// To:
const input: UploadDocumentInput = {
  filename: file.name,
  fileSize: file.size,
  mimeType: file.type,  // CORRECT
};
```

---

#### 4. `templates/_modules-core/module-kb/frontend/hooks/useWorkspaceKB.ts`
**Line 222:**
```typescript
// ERROR: 'enabled' does not exist in type 'ToggleKbInput'
```

**Root Cause:** Incorrect property name in `ToggleKbInput`.

**Fix:** Check `types.ts` for correct property name (likely `isEnabled` or `is_enabled`).

---

#### 5. `templates/_modules-core/module-kb/frontend/pages/OrgAdminKBPage.tsx`
**Line 274:**
```typescript
// ERROR: Type '(file: File) => Promise<void>' is not assignable to 
//        type '(files: File[]) => Promise<void>'
```

**Root Cause:** Function signature mismatch - expecting array but receiving single file.

**Fix:** Update function signature to accept `File[]` and handle first file:
```typescript
// Change from:
onUpload={uploadDocument}  // expects (file: File)

// To:
onUpload={(files) => uploadDocument(files[0])}  // converts File[] to File
```

---

#### 6. `templates/_modules-core/module-kb/frontend/pages/PlatformAdminKBPage.tsx`
**Line 362:**
Same error as OrgAdminKBPage.tsx - same fix applies.

---

## Git Branch Strategy

Following **CORA Standard: Branching Strategy** (docs/standards/standard_BRANCHING-STRATEGY.md):

### Option 1: Fix in Current Branch (RECOMMENDED)

Since `ws-crud-kbs-embeddings` is already the active development branch for KB features:

```bash
# Already on ws-crud-kbs-embeddings
git status  # Verify current branch

# Make fixes to template files
# (6 files listed above)

# Commit fixes
git add .
git commit -m "fix(module-kb): Resolve TypeScript type errors in KB frontend

- Fix API response structure in useKbDocuments (documents property)
- Add missing 'scope' property to AvailableKb type
- Correct contentType to mimeType in upload inputs
- Fix enabled property in ToggleKbInput
- Update file upload handlers to accept File[] arrays

Resolves: 16 TypeScript compilation errors in module-kb frontend"

# Push to remote
git push origin ws-crud-kbs-embeddings

# When ready, create PR to main
gh pr create --base main \
  --title "fix(module-kb): KB type fixes and embeddings processing" \
  --body "Fixes TypeScript type errors in module-kb frontend and implements embeddings processing improvements."
```

### Option 2: Create Dedicated Fix Branch

If you prefer to separate type fixes from embeddings work:

```bash
# Start from main
git checkout main
git pull origin main

# Create fix branch
git checkout -b fix/module-kb-type-errors

# Make fixes
# ... (same 6 files)

# Commit and push
git add .
git commit -m "fix(module-kb): Resolve TypeScript type errors"
git push -u origin fix/module-kb-type-errors

# Create PR
gh pr create --base main \
  --title "fix(module-kb): Resolve frontend type errors" \
  --body "Fixes 16 TypeScript compilation errors in module-kb frontend components and hooks."

# After merge, update ws-crud-kbs-embeddings
git checkout ws-crud-kbs-embeddings
git pull origin main  # Sync the fixes
```

---

## Recommended Approach

**Use Option 1** (fix in current branch) because:
1. ✅ These type errors block testing of embeddings features
2. ✅ Fixes are directly related to KB document handling (same scope)
3. ✅ Faster - no branch switching or merge conflicts
4. ✅ Keeps related work together in one PR

---

## Implementation Checklist

- [ ] **Step 1:** Fix `useKbDocuments.ts` line 86 (remove `.documents`)
- [ ] **Step 2:** Add `scope` property to `AvailableKb` type in `types.ts`
- [ ] **Step 3:** Fix `useWorkspaceKB.ts` line 177 (`contentType` → `mimeType`)
- [ ] **Step 4:** Fix `useWorkspaceKB.ts` line 222 (`enabled` property)
- [ ] **Step 5:** Fix `OrgAdminKBPage.tsx` line 274 (File[] handler)
- [ ] **Step 6:** Fix `PlatformAdminKBPage.tsx` line 362 (File[] handler)
- [ ] **Step 7:** Sync fixes to test-embeddings project
- [ ] **Step 8:** Run typecheck to verify all errors resolved
- [ ] **Step 9:** Commit with conventional commit message
- [ ] **Step 10:** Push and create PR to main

---

## Testing Plan

After fixes:

```bash
# 1. Sync to test project
cd ~/code/bodhix/cora-dev-toolkit
./scripts/sync-fix-to-project.sh \
  ~/code/bodhix/testing/test-embeddings/ai-sec-stack \
  "templates/_modules-core/module-kb"

# 2. Run typecheck
cd ~/code/bodhix/testing/test-embeddings/ai-sec-stack
pnpm -r typecheck

# 3. Expected result: 0 errors
```

---

## Root Cause Analysis

**Why did this happen?**

1. **API Response Structure Changed:** The Lambda backend likely evolved from returning `{ documents: [...] }` to returning `[...]` directly, but frontend wasn't updated
2. **Missing Type Definitions:** `scope` property was added to backend but not to frontend types
3. **Type Name Inconsistency:** `contentType` vs `mimeType` naming mismatch
4. **Component Interface Mismatch:** Upload components expect `File[]` but hooks provide `File`

**Prevention:**
- Use shared type definitions between frontend and backend
- Run typecheck in CI/CD before merging
- Consider using OpenAPI/GraphQL schema for type generation

---

## Related Work

- **Current Branch:** `ws-crud-kbs-embeddings` (8 commits ahead of main)
- **Related Plan:** `docs/plans/plan_ws-kb-processing-fix.md`
- **Previous KB Fixes:** Commits c309ad9, 48979f0, 7137622

---

**Status:** Ready for implementation in `ws-crud-kbs-embeddings` branch
