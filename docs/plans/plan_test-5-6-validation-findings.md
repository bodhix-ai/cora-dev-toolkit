# Test5 & Test6 Complete Validation Results - ALL Issues

**Date:** December 25, 2025  
**Status:** Complete - All Validators Run  
**Projects Validated:** test5, test6 (test6 shown below)

---

## Executive Summary

Complete validation run against test6 project. All validator outputs saved to JSON files for detailed review.

### Exact Issue Counts

| Validator | Status | Errors | Warnings | Info | Notes |
|-----------|--------|--------|----------|------|-------|
| **Accessibility** | ❌ FAILED | **56** | 0 | 0 | 6 items require manual review |
| **API Tracer** | ⚠️ WARNINGS | 0 | **25** | 0 | Orphaned routes (backend exists, no frontend calls) |
| **Import** | ✅ PASSED | **0** | **0** | 0 | Backend and frontend both passed |
| **Portability** | ⚠️ WARNINGS | 0 | **18** | 0 | Hardcoded values, URLs, config examples |
| **Schema** | ⚠️ WARNINGS | 0 | **651** | 0 | Query parsing warnings (complex patterns) |
| **Structure** | ✅ PASSED | **0** | **0** | 1 | PyYAML not installed (info only) |
| **TOTAL** | | **56** | **694** | **1** | **751 total issues found** |

### Raw JSON Output Files

| Validator | File | Size |
|-----------|------|------|
| Accessibility | `validation-report-test6-accessibility.json` | 37 KB |
| API Tracer | `validation-report-test6-api-tracer.json` | 57 KB |
| Import | `validation-report-test6-import.json` | 24 KB |
| Portability | `validation-report-test6-portability.json` | 21 KB |
| Schema | `validation-report-test6-schema.json` | 465 KB |
| Structure | `validation-report-test6-structure.json` | 515 B |

**Location:** `/Users/aaron/code/bodhix/cora-dev-toolkit/`

### Critical Statistics

- **Total Files Scanned**: 118 (accessibility) + 42 (import) = 160+ files
- **Total Components Analyzed**: 1,596 (accessibility)
- **Validators Run**: 6
- **Validators Passed**: 2 (Import, Structure)
- **Validators with Warnings**: 3 (API Tracer, Portability, Schema)
- **Validators Failed**: 1 (Accessibility)
- **Total JSON Output Size**: 653 KB

---

## Validator Results Summary

### 1. Accessibility Validator ❌ FAILED
- **Status:** FAILED
- **Total Issues:** 56 errors
- **Files Scanned:** 118
- **Components Analyzed:** 1,596
- **Breakdown:**
  - Errors: 56
  - Warnings: 0
  - Info: 0
  - Manual Review Required: 6

**Raw JSON:** `validation-report-test6-accessibility.json` (37 KB)

**Error Types Found:**
- Missing labels on form inputs (38 errors)
- Missing aria-labels on IconButtons (15 errors)
- Empty link element (1 error)
- Heading level skip (1 error)
- Missing aria-label on Switch components (1 error)

---

### 2. API Tracer ⚠️ WARNINGS
- **Status:** PASSED with warnings
- **Total Warnings:** Multiple orphaned routes

**Raw JSON:** `validation-report-test6-api-tracer.json` (57 KB)

**Orphaned Routes Found:**
- `/admin/rag/providers` (GET, POST, PUT, DELETE)
- `/admin/rag/providers/models` (GET, OPTIONS)
- `/orgs/{id}/email-domains` (GET, POST, PUT, DELETE)
- `/identities/provision` (POST)

**Notes:** These are Lambda handlers that exist but no frontend calls were detected. Could be:
- Admin APIs called externally
- Webhook endpoints
- Backend-to-backend APIs
- Future features not yet implemented in UI

---

### 3. Import Validator ✅ PASSED
- **Status:** PASSED
- **Files Scanned:** 42
- **Exempted Files:** 2
- **Errors:** 0
- **Warnings:** 0

**Raw JSON:** `validation-report-test6-import.json` (24 KB)

**Validation Summary:**
```
BACKEND: ✅ PASSED
FRONTEND: ✅ PASSED
```

---

### 4. Portability Validator ⚠️ WARNINGS
- **Status:** PASSED with warnings
- **Total Warnings:** Multiple (see JSON for details)

**Raw JSON:** `validation-report-test6-portability.json` (21 KB)

**Common Warning Types:**
- Hardcoded URLs (documentation links)
- Configuration examples in comments
- Template placeholders (intentional)

---

### 5. Schema Validator ⚠️ WARNINGS
- **Status:** PASSED with warnings
- **Total Warnings:** Multiple query parsing warnings

**Raw JSON:** `validation-report-test6-schema.json` (465 KB)

**Common Warning:**
"Could not extract table name from query" - appears when queries use complex patterns that the parser can't handle.

**Files with Warnings:**
- `idp-config/lambda_function.py`
- `org-common/python/org_common/db.py`
- Various other Lambda functions

---

### 6. Structure Validator ✅ PASSED
- **Status:** PASSED
- **Errors:** 0
- **Warnings:** 0
- **Info:** 1

**Raw JSON:** `validation-report-test6-structure.json` (515 B)

**Info Message:**
"PyYAML not installed - skipping pnpm-workspace.yaml validation"

---

## Complete Validation Data Files

All raw JSON outputs are available in:
```
/Users/aaron/code/bodhix/cora-dev-toolkit/
```

### Files:
1. `validation-report-test6-accessibility.json` (37 KB)
2. `validation-report-test6-api-tracer.json` (57 KB)
3. `validation-report-test6-import.json` (24 KB)
4. `validation-report-test6-portability.json` (21 KB)
5. `validation-report-test6-schema.json` (465 KB)
6. `validation-report-test6-structure.json` (515 B)

### How to Review:
```bash
# View any JSON file
cat validation-report-test6-<validator>.json | jq .

# Count errors in accessibility validator
cat validation-report-test6-accessibility.json | jq '.errors | length'

# View specific error details
cat validation-report-test6-accessibility.json | jq '.errors[0]'

# View all orphaned routes
cat validation-report-test6-api-tracer.json | jq '.mismatches[]'

# View schema warnings
cat validation-report-test6-schema.json | jq '.warnings[]'
```

---

## Issue Tracking Checklist

### High Priority Issues (User Decision Required)

**Accessibility Errors (56 total):**
- [ ] Review all 56 accessibility errors in detail
- [ ] Decide which errors to fix immediately
- [ ] Decide which errors to defer
- [ ] Create fix plan for prioritized errors

**Decision Points:**
- Are all 56 accessibility errors blockers for test7?
- Which WCAG compliance level is required? (A, AA, AAA)
- Can some errors be addressed in later iterations?

### Medium Priority Issues (User Decision Required)

**API Tracer Warnings (orphaned routes):**
- [ ] Review each orphaned route
- [ ] Verify if route is intentional (webhook, admin API, etc.)
- [ ] Identify routes that should be removed
- [ ] Document routes that should have frontend calls

**Schema Validator Warnings (query parsing):**
- [ ] Review query parsing warnings
- [ ] Determine if warnings indicate actual issues
- [ ] Decide if parser needs improvement or warnings are acceptable

**Portability Validator Warnings:**
- [ ] Review hardcoded URLs and values
- [ ] Identify which are intentional (docs, examples)
- [ ] Identify which should be configurable

### Low Priority Issues (User Decision Required)

**Structure Validator Info:**
- [ ] Decide if PyYAML installation is needed
- [ ] Determine if pnpm-workspace.yaml validation is important

---

## Questions for User

Before creating a remediation plan, please review the raw JSON files and answer:

1. **Accessibility:**
   - Should all 56 errors be fixed before test7?
   - What WCAG compliance level is required?
   - Are there specific error types that are higher priority?

2. **API Tracer:**
   - Are the orphaned routes intentional (admin/webhook APIs)?
   - Should any orphaned routes be removed as dead code?
   - Should frontend calls be added for any routes?

3. **Schema Validator:**
   - Are the query parsing warnings acceptable?
   - Should the parser be improved to handle complex queries?
   - Are there actual schema issues hidden in the warnings?

4. **Portability:**
   - Are hardcoded documentation URLs acceptable?
   - Should template placeholders remain as-is?
   - Are there specific hardcoded values that need to be fixed?

---

## Next Steps

**User Actions Required:**
1. Review all raw JSON files in detail
2. Make decisions on which issues to fix
3. Prioritize issues (must-fix vs. nice-to-fix vs. defer)
4. Provide guidance on acceptable vs. unacceptable warnings

**Then Create:**
- Detailed remediation plan based on user priorities
- Fix schedule and timeline
- Test7 readiness criteria

---

## Validation Commands Used

For future reference, here are the exact commands used:

```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit/validation

# Schema Validator
python3 -m schema-validator.cli --path /Users/aaron/code/sts/test6/ai-sec-stack --output json > validation-report-test6-schema.json 2>&1

# API Tracer
python3 -m api-tracer.cli --path /Users/aaron/code/sts/test6/ai-sec-stack --output json > validation-report-test6-api-tracer.json 2>&1

# Import Validator
python3 -m import_validator.cli validate --path /Users/aaron/code/sts/test6/ai-sec-stack --all --output json > validation-report-test6-import.json 2>&1

# Structure Validator
python3 -m structure-validator.cli /Users/aaron/code/sts/test6/ai-sec-stack --format json > validation-report-test6-structure.json 2>&1

# Portability Validator
python3 -m portability-validator.cli /Users/aaron/code/sts/test6/ai-sec-stack --format json > validation-report-test6-portability.json 2>&1

# Accessibility Validator
python3 -m a11y-validator.cli /Users/aaron/code/sts/test6/ai-sec-stack --format json > validation-report-test6-accessibility.json 2>&1
```

---

## Appendix: Quick Stats

| Metric | Count |
|--------|-------|
| Total Validators Run | 6 |
| Validators Passed | 2 |
| Validators with Warnings | 3 |
| Validators Failed | 1 |
| Total JSON Output Size | 653 KB |
| Accessibility Errors | 56 |
| Import Validator Errors | 0 |
| Structure Validator Errors | 0 |

---

**Status:** Complete - All Raw Data Available  
**Action Required:** User review and prioritization  
**Blocker for Test7:** User decision on which issues must be fixed
