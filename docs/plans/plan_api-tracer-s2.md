# Sprint Plan: API Tracer & UI Library Validation S2

**Status:** 🟡 IN PROGRESS  
**Branch:** `fix/validation-errors-s2`  
**Initiative:** Error Remediation & Clean Baseline  
**Context:** [`memory-bank/context-error-remediation.md`](../../memory-bank/context-error-remediation.md)

---

## Sprint Goal

Eliminate 9 validation errors across API Tracer and UI Library validators to improve template quality and documentation accuracy.

**Targets:**
- 0 API Tracer errors (down from 7)
- 0 UI Library errors (down from 2)

**Total:** 0 errors (down from 9)

---

## Scope

### IN SCOPE

**Target Errors:** 9 validation errors across 2 validators

**Error Categories:**

1. **API Tracer (7 errors)**
   - Route documentation mismatches - Lambda function docstrings don't accurately document their routes
   - These errors block proper API route verification and documentation accuracy
   - **Affected Modules:** module-access, module-ai, module-ws, module-kb, module-chat, module-eval
   - **Validation Standard:** `docs/standards/standard_LAMBDA-ROUTE-DOCSTRING.md`

2. **UI Library (2 errors)**
   - UI component library compliance issues
   - Violations of CORA UI component standards
   - **Affected Areas:** Component usage or import patterns

**Combined Impact:**
- Improves API documentation accuracy
- Ensures UI component standards compliance
- Small, focused scope suitable for single sprint

### OUT OF SCOPE

- Admin Route standardization (91 errors) - deferred to another team
- Accessibility errors (55)
- Frontend compliance errors (42)
- Next.js routing errors (24)
- Database naming errors (6)
- UI Library validation errors
- Other validation warnings

---

## Implementation Steps

### Phase 1: Analysis & Setup
- [ ] Run fresh validation to identify all 9 errors
- [ ] Document API Tracer errors (which Lambda functions have route mismatches)
- [ ] Document UI Library errors (which components have violations)
- [ ] Review relevant standards (Lambda Route Docstring, UI Library)
- [ ] Create sprint branch `fix/validation-errors-s2`
- [ ] Update context file with Sprint 2 details

### Phase 2: API Tracer Fixes (7 errors)
- [ ] For each of the 7 API Tracer errors:
  - [ ] Identify the Lambda function with mismatch
  - [ ] Review actual API Gateway routes for that Lambda
  - [ ] Update Lambda docstring to match actual routes
  - [ ] Follow template-first workflow
  - [ ] Sync fix to test project
  - [ ] Validate fix with API Tracer

### Phase 3: UI Library Fixes (2 errors)
- [ ] For each of the 2 UI Library errors:
  - [ ] Identify the component or file with violation
  - [ ] Review UI Library standard requirements
  - [ ] Fix component usage/imports
  - [ ] Follow template-first workflow
  - [ ] Sync fix to test project
  - [ ] Validate fix with UI Library validator

**Pattern to Follow:**
```python
"""
Module Name - Lambda Function Name

Routes - Category:
- GET /actual/route/path - Description
- POST /actual/route/path - Description
- PUT /actual/route/path/{id} - Description
"""
```

### Phase 4: Template Updates & Testing
- [ ] Update affected files in templates (template-first workflow)
- [ ] Sync fixes to test project using fix-and-sync workflow
- [ ] Run API Tracer and UI Library validators on test project
- [ ] Run full validation suite to ensure no regressions

### Phase 5: Verification & Documentation
- [ ] Confirm 0 API Tracer errors in validation
- [ ] Confirm 0 UI Library errors in validation
- [ ] Update context file with completion notes
- [ ] Document any route patterns or standards established
- [ ] Prepare for Sprint 3

---

## Success Criteria

- [ ] API Tracer validator shows 0 errors (down from 7)
- [ ] UI Library validator shows 0 errors (down from 2)
- [ ] All Lambda route docstrings accurately reflect API Gateway routes
- [ ] All UI components comply with CORA UI standards
- [ ] No regressions introduced (other validator counts unchanged)
- [ ] Fixes applied to templates first, then synced to test project
- [ ] Changes documented in context file

---

## Technical Approach

### 1. API Tracer - Lambda Route Documentation Standard

**Required Format:**
```python
"""
{Module Name} - {Lambda Function Name}

Routes - {Category}:
- {METHOD} {/route/path} - {Description}
- {METHOD} {/route/path/{param}} - {Description}
"""
```

**Example:**
```python
"""
Access Module - Organizations Lambda

Routes - Organization Management:
- GET /orgs - List organizations for current user
- GET /orgs/{orgId} - Get organization details
- POST /orgs - Create new organization
- PUT /orgs/{orgId} - Update organization
- DELETE /orgs/{orgId} - Delete organization
"""
```

### API Tracer Fix Workflow

1. **Identify Mismatch** - Run API Tracer to see which Lambda has mismatch
2. **Check API Gateway** - Review actual routes configured in Terraform
3. **Update Docstring** - Update Lambda function docstring in template
4. **Sync & Test** - Sync to test project and re-validate
5. **Iterate** - Repeat until validator passes

### 2. UI Library Validation

**Standard:** CORA UI components must follow approved patterns and imports

**Common Issues:**
- Incorrect component imports (using non-approved libraries)
- Missing required component props
- Improper component composition

**Fix Workflow:**

1. **Identify Violation** - Run UI Library validator to see specific issues
2. **Review Standard** - Check CORA UI component standards
3. **Update Component** - Fix component usage/imports in template
4. **Sync & Test** - Sync to test project and re-validate
5. **Iterate** - Repeat until validator passes

---

## Template-First Workflow

All fixes follow this process:

1. **Fix in Template** - Update Lambda file in `templates/_modules-*/*/backend/`
2. **Sync to Test Project** - Use `scripts/sync-fix-to-project.sh` to copy to test project
3. **Verify** - Run API Tracer validation on test project
4. **Iterate** - Repeat until error is resolved

---

## Validation Commands

**API Tracer validation:**
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit
python3 validation/api-tracer/api_tracer_validator.py --stack-path <test-project-stack-path> --infra-path <test-project-infra-path>
```

**UI Library validation:**
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit
./validation/ui-library-validator/validate_ui_library.sh <test-project-stack-path>
```

**Full validation:**
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit
python3 validation/cora-validate.py project <test-project-stack-path> --format text
```

---

## Dependencies

**Completed Prerequisites:**
- ✅ TypeScript Error Remediation S1 - Eliminated 46 TypeScript errors
- ✅ WS Plugin Architecture S1/S2 - Fixed plugin type system
- ✅ Admin Standardization S3a - Fixed module infrastructure

**Blocking Issues:** None

---

## Notes

**API Tracer:**
- API Tracer errors are documentation issues, not functional bugs
- However, accurate route documentation is critical for:
  - API testing and validation
  - Developer onboarding and understanding
  - Future refactoring and maintenance
  - Compliance with CORA standards
- Focus on accuracy and completeness of route documentation

**UI Library:**
- UI Library errors ensure consistent component usage across the platform
- Maintaining UI standards improves:
  - User experience consistency
  - Accessibility compliance
  - Component reusability
  - Design system adherence

**Combined Sprint Rationale:**
- Both validators have small error counts (7 + 2 = 9 total)
- Both are template quality improvements, not functional changes
- Efficient to address together in single sprint
- Achieves faster progress toward 0-error baseline

---

**Created:** January 26, 2026  
**Last Updated:** January 26, 2026
