# Plan: Module-Voice Validation Fixes

**Status**: ✅ TEMPLATE BUG FIXED - TypeScript Errors Remain  
**Created**: January 17, 2026  
**Updated**: January 17, 2026 (Session 14 - Template Bug Fixed)  
**Priority**: CRITICAL - Voice module must pass validation before deployment  
**Scope**: Fix validation errors across module-voice templates  
**Test Project**: test-voice (`~/code/bodhix/testing/test-voice/ai-sec-stack`)

---

## Executive Summary

**Problem**: Module-voice template had validation errors and a critical placeholder bug preventing deployment.

**Progress**: **Template bug fixed** - Package.json placeholder format corrected

**Current Status**: 
- ✅ **Validation Suite**: SILVER certification (0 errors, 8 warnings)
- ❌ **TypeScript Compilation**: 840 errors project-wide (29 in module-voice)

**Test Results (test-voice - January 17, 2026, 9:57 PM - Fresh Project)**:
- ✅ **All Validators: PASSED** (0 errors)
- ⚠️ **Accessibility: 8 warnings** (placeholder-as-label detection issues)
- ❌ **TypeScript Compilation: 840 errors** (29 in module-voice, 811 in other modules)

**Impact**: 
- ✅ Validation suite passes completely (SILVER certification)
- ✅ Template bug fixed - module now recognized by pnpm workspace
- ❌ TypeScript compilation errors block deployment
- Phase 2 pre-deployment checks uncovered compilation issues

**Goal**: Resolve TypeScript compilation errors to enable deployment.

---

## Critical Bug Fixed - Session 14

### Template Placeholder Format Bug

**Issue**: Module-voice template used incorrect placeholder format in `package.json`:
- ❌ **Before**: `@{project}/module-voice` (single braces)
- ✅ **After**: `@{{PROJECT_NAME}}/module-voice` (double braces)

**Impact**: 
- Module-voice not recognized by pnpm workspace
- `pnpm install` failed with "package not found" error
- Blocked all development and testing

**Root Cause**: 
- Core modules (module-kb, module-ai, etc.) use `{{PROJECT_NAME}}` format
- Functional module (module-voice) mistakenly used `{project}` format
- `create-cora-project.sh` only replaces `{{PROJECT_NAME}}` placeholders

**Fix**: Updated `templates/_modules-functional/module-voice/frontend/package.json`

**Verification**: Fresh project creation with fixed template - `pnpm install` successful

---

## Validation Status - Actual vs. Plan

### Original Plan Estimate (Outdated)
- 13 accessibility errors
- 5 frontend compliance errors  
- 18 total errors
- BRONZE certification

### Actual Validation Results (Session 14)
- ✅ **0 validation errors** across all validators
- ⚠️ **8 accessibility warnings** (false positives - labels exist but validator doesn't detect them)
- ✅ **SILVER certification** (all validators passing)

### Key Finding
The original plan was based on outdated test results. Current validation suite shows:
- All backend validators: PASSED
- All frontend validators: PASSED  
- Only warnings: ConfigForm.tsx inputs have labels but validator flags them

---

## TypeScript Compilation Errors (Phase 2 Discovery)

### Summary
- **Total Errors**: 840 across 52 files
- **Module-Voice Errors**: 29
- **Other Modules**: 811 (module-chat, module-ws, module-kb, module-ai, apps/web)

### Module-Voice Specific Errors (29 total)

| File | Errors | Issues |
|------|--------|--------|
| ConfigForm.tsx | 2 | Missing type declarations |
| InterviewRoom.tsx | 1 | Type issues |
| useVoiceConfigs.ts | 1 | Module import errors |
| useVoiceSession.ts | 1 | Module import errors |
| useVoiceSessions.ts | 1 | Module import errors |
| OrgVoiceConfigPage.tsx | 8 | Multiple type/import issues |
| routes/voice/[id]/page.tsx | 5 | Cannot find module errors |
| routes/voice/page.tsx | 6 | Cannot find module errors |

**Common Error Types**:
- "Cannot find module" errors
- Missing type declarations
- Implicit 'any' types

**Note**: Most errors appear to be dependency/build configuration issues rather than code logic errors.

---

## Session Tracking

### Session 12 (Jan 17) - Sprint 1 Partial
- **Focus**: Structure & Schema
- **Fixed**: 26 errors
- **Status**: Structure & Schema Passing

### Session 13 (Jan 17) - Sprint 1 Complete  
- **Focus**: CORA Compliance
- **Fixed**: 27 errors
- **Files**: All 6 voice Lambdas updated to `org_common`
- **Verification**: Created `test-voice-05`, validated 0 CORA errors
- **Status**: CORA Compliance Passing

### Session 14 (Jan 17, 9:30 PM - 10:00 PM) - Template Bug Fixed
- **Focus**: Following test-module.md workflow, fixing template issues
- **Discovered**: Plan estimates were outdated - validation actually passes
- **Fixed**: Template placeholder format bug (`{project}` → `{{PROJECT_NAME}}`)
- **File**: `templates/_modules-functional/module-voice/frontend/package.json`
- **Workflow Progress**:
  - ✅ Phase 0: Config verification
  - ✅ Phase 1: Project creation (SILVER, 0 errors)
  - ✅ Phase 2.1: Dependencies installed successfully
  - ❌ Phase 2.2: TypeScript compilation failed (840 errors)
- **Status**: Template bug fixed, TypeScript errors identified

---

## Next Steps

### Immediate (Template Fixed)
1. ✅ **Update plan document** - Reflect actual status
2. ⏳ **Commit and push changes** - Template bug fix
3. ⏳ **Create PR** - Merge to main

### Future Work (TypeScript Errors)
The 840 TypeScript errors exceed the original task scope and should be addressed separately:

1. **Module-Voice Errors (29)**: Fix "Cannot find module" and type declaration issues
2. **Project-Wide Errors (811)**: Broader effort needed for module-chat, module-ws, etc.
3. **Build Configuration**: Investigate dependency resolution and build order issues

**Recommendation**: Create separate task for TypeScript compilation fixes with proper scope and estimation.

---

## Key Learnings

1. **Validation vs. Compilation**: Validation suite (Phase 1) catches structural/compliance issues but not TypeScript compilation errors
2. **Pre-Deployment Checks Essential**: Phase 2 (test-module.md workflow) catches compilation issues before expensive Terraform deployment
3. **Template-First Workflow**: Critical for ensuring fixes propagate to all future projects
4. **Placeholder Consistency**: All templates must use `{{PROJECT_NAME}}` format, not variations

---

**Plan Owner**: Development Team  
**Success Definition**: ✅ Template bug fixed, module-voice validation passing  
**Future Work**: TypeScript compilation errors (separate task)

**Created**: January 17, 2026  
**Updated**: January 17, 2026 (Session 14 - 10:00 PM)  
**Status**: Template bug fixed ✅ | TypeScript errors identified ⏳
