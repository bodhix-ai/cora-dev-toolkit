# Plan: Fix Project Creation Config & Validation Errors

**Status:** ✅ COMPLETE
**Branch:** `fix/create-project-config`
**Priority:** High
**Created:** January 27, 2026
**Completed:** January 27, 2026

## Executive Summary

This sprint addressed a critical issue in the project creation script where relative paths for configuration files failed during execution. Additionally, it resolved remaining validation errors in `module-eval` and `module-access` templates to ensure new projects are compliant from the start.

## Work Completed

### 1. Project Creation Script Fix
**File:** `scripts/create-cora-project.sh`
- **Issue:** Using `--input setup.config.yaml` with a relative path failed because the script changes directories internally.
- **Fix:** Converted `INPUT_CONFIG` path to an absolute path at the start of execution.
- **Impact:** Project creation now works robustly with relative config paths.

### 2. Validation Fixes (Template Updates)
**Module-Eval:**
- **EvalQAList.tsx:** Fixed heading skip level (h1 → h4) by using `component="div"` and removing `variant="h4"`.
- **EvalSummaryPanel.tsx:** Fixed heading skip levels (h4 → h3).
- **EvalDetailPage.tsx:** Fixed empty link text accessibility issue by adding `aria-label` to all links in markdown converter.

**Module-Access:**
- **admin/org/access/page.tsx:** Fixed Admin Auth error by changing `organization.name` → `organization.orgName` (ADR-016 compliance).

### 3. Verification
- **Project Created:** `ai-ccat`
- **Repos Created:** `keepitsts/ai-ccat-infra`, `keepitsts/ai-ccat-stack`
- **Validation:** Ran full validation suite on `ai-ccat` project.
- **Result:** 0 errors, 100% compliance.

## Next Steps
- Merge changes to main.
- Continue with Sprint S5 (Audit Column Compliance).
