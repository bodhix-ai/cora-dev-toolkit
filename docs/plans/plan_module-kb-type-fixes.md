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

**Status:** ✅ COMPLETE - All type errors resolved

---

## 🔧 Next Task: Add TypeScript Validation to Test Suite

**Priority:** HIGH  
**Estimated Time:** 1-2 hours  
**Status:** Scoped for next session

### Objective

Create a TypeScript typecheck validator and integrate it into the CORA validation suite to prevent type errors from being reintroduced.

### Why This Is Critical

1. **Prevention:** The 16 type errors we just fixed would have been caught automatically
2. **Pre-Deployment Safety:** Catch type errors before infrastructure deployment
3. **CI/CD Integration:** Enable automated type checking in build pipelines
4. **Developer Experience:** Faster feedback loop during development

### Implementation Plan

#### 1. Create TypeScript Validator Script

**Location:** `validation/typescript-validator/`

**Files to Create:**
```
validation/typescript-validator/
├── __init__.py
├── typescript_validator.py
└── README.md
```

**Core Logic (`typescript_validator.py`):**
```python
"""
TypeScript Type Check Validator

Runs TypeScript compiler in type-check mode across all packages.
Identifies type errors with file, line, and column information.
"""

import subprocess
import json
import re
from pathlib import Path
from typing import List, Dict

class TypeScriptValidator:
    def __init__(self, stack_path: str):
        self.stack_path = Path(stack_path)
        self.errors = []
        
    def validate(self) -> Dict:
        """Run pnpm -r typecheck and parse errors"""
        cmd = f"cd {self.stack_path} && pnpm -r typecheck"
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True
        )
        
        # Parse TypeScript errors from output
        # Format: file(line,col): error TS####: message
        error_pattern = r'(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)'
        
        for line in result.stdout.split('\n'):
            match = re.match(error_pattern, line)
            if match:
                self.errors.append({
                    'file': match.group(1),
                    'line': int(match.group(2)),
                    'column': int(match.group(3)),
                    'code': match.group(4),
                    'message': match.group(5)
                })
        
        return {
            'passed': len(self.errors) == 0,
            'error_count': len(self.errors),
            'errors': self.errors
        }
```

#### 2. Integrate with `cora-validate.py`

**Location:** `validation/cora-validate.py`

**Changes Required:**

```python
# Add import
from typescript_validator.typescript_validator import TypeScriptValidator

# Add to validator registry
VALIDATORS = {
    # ... existing validators ...
    'typescript': {
        'name': 'TypeScript Type Check',
        'class': TypeScriptValidator,
        'enabled': True,
        'blocking': True,  # Fail build if type errors
        'order': 2,  # Run early (after structure validation)
    },
}

# Add CLI flag
parser.add_argument(
    '--skip-typescript',
    action='store_true',
    help='Skip TypeScript type checking'
)
```

#### 3. Update Validation Workflows

**Files to Update:**
- `.cline/workflows/validate.md` - Add typecheck step
- `scripts/pre-deploy-check.sh` - Include typecheck
- `docs/guides/guide_VALIDATION-TOOLS-IMPLEMENTATION.md` - Document new validator

#### 4. Configuration Options

**Add to `.env.example`:**
```bash
# TypeScript Validation
TYPESCRIPT_STRICT_MODE=true          # Fail on any type error
TYPESCRIPT_IGNORE_TEMPLATES=true    # Ignore template placeholder errors
TYPESCRIPT_MAX_ERRORS=0             # Maximum allowed errors (0 = none)
```

#### 5. Integration Checklist

- [ ] Create `validation/typescript-validator/` directory
- [ ] Implement `TypeScriptValidator` class
- [ ] Add to `cora-validate.py` validator registry
- [ ] Update `.cline/workflows/validate.md`
- [ ] Update `scripts/pre-deploy-check.sh`
- [ ] Add configuration options to `.env.example`
- [ ] Create test cases for validator
- [ ] Update documentation in `guide_VALIDATION-TOOLS-IMPLEMENTATION.md`
- [ ] Test on clean project (expect pass)
- [ ] Test on project with errors (expect fail)
- [ ] Create PR with implementation

### Success Criteria

1. ✅ TypeScript typecheck runs as part of `cora-validate.py`
2. ✅ Catches all 16+ type errors we just fixed
3. ✅ Provides clear, actionable error messages
4. ✅ Fails validation when type errors exist
5. ✅ Integrates with existing validation workflows
6. ✅ Documented in validation guide

### Related Files

- Implementation: `validation/typescript-validator/typescript_validator.py`
- Integration: `validation/cora-validate.py`
- Workflow: `.cline/workflows/validate.md`
- Documentation: `docs/guides/guide_VALIDATION-TOOLS-IMPLEMENTATION.md`

---

**Ready for Next Session:** Implementation scoped and ready to execute
