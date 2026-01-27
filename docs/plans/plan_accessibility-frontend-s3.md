# Sprint Plan: Accessibility & Frontend Compliance S3

**Status:** 🟡 IN PROGRESS  
**Branch:** `fix/validation-errors-s3`  
**Initiative:** Error Remediation & Clean Baseline  
**Context:** [`memory-bank/context-error-remediation.md`](../../memory-bank/context-error-remediation.md)

---

## Sprint Goal

Eliminate validation errors across Accessibility and Frontend Compliance validators to improve CORA template quality, user experience, and standards compliance.

**Targets:**
- 0 Accessibility errors (down from 55)
- 0 Frontend Compliance errors (down from 42)

**Total:** 0 errors across both validators (97 errors total)

---

## Scope

### IN SCOPE

**Target Errors:** Validation errors across 2 validators

**Error Categories:**

1. **Accessibility (55 errors)**
   - Section 508 / WCAG compliance issues
   - Missing ARIA labels and roles
   - Keyboard navigation problems
   - Color contrast issues
   - Screen reader compatibility
   - **Affected Modules:** module-access, module-mgmt, module-eval, module-voice, module-kb, module-chat
   - **Validation Standard:** Section 508, WCAG 2.1 Level AA

2. **Frontend Compliance (42 errors)**
   - CORA frontend standards violations
   - Component pattern inconsistencies
   - UI/UX best practices violations
   - **Affected Modules:** All frontend modules
   - **Fix:** Align all components with CORA frontend standards

**Combined Impact:**
- Ensures accessibility for users with disabilities
- Improves CORA template quality and standards compliance
- Enables better user experience across all modules
- Supports legal compliance (Section 508)

### OUT OF SCOPE

- Admin Route errors (7 remaining - minimal priority)
- TypeScript monorepo configuration (9 errors - deferred to S4)
- Audit columns (1 error - deferred to S4)
- Database naming errors (6)
- Next.js routing errors (24)
- Other validation warnings

---

## Implementation Steps

### Phase 1: Analysis & Setup
- [ ] Run fresh validation to identify all errors
- [ ] Document Accessibility errors by category
- [ ] Document Frontend Compliance errors by category
- [ ] Review relevant standards (Section 508, WCAG, CORA Frontend)
- [ ] Update context file with Sprint S3 details
- [ ] Prioritize fixes by impact and difficulty

### Phase 2: Accessibility Fixes (55 errors)

**Common Issues:**
- Missing `aria-label` on interactive elements
- Missing `role` attributes
- Insufficient color contrast
- Missing keyboard navigation support
- Missing focus indicators
- Non-descriptive link text

**Fix Workflow:**
1. Run A11y validator to identify specific issues
2. Update component templates with accessibility attributes
3. Test with screen reader (if possible)
4. Follow template-first workflow
5. Sync fixes to test project
6. Re-validate

### Phase 3: Frontend Compliance Fixes (42 errors)

**Common Issues:**
- Inconsistent component patterns
- Missing error boundaries
- Improper state management
- UI/UX best practices violations
- Component architecture issues

**Fix Workflow:**
1. Run Frontend Compliance validator to identify issues
2. Update components to align with CORA standards
3. Follow template-first workflow
4. Sync fixes to test project
5. Re-validate

### Phase 4: Template Updates & Testing
- [ ] Update affected files in templates (template-first workflow)
- [ ] Sync fixes to test project using fix-and-sync workflow
- [ ] Run Accessibility and Frontend Compliance validators
- [ ] Run full validation suite to ensure no regressions

### Phase 5: Verification & Documentation
- [ ] Confirm 0 Accessibility errors in validation
- [ ] Confirm 0 Frontend Compliance errors in validation
- [ ] Update context file with completion notes
- [ ] Document any new patterns or standards established
- [ ] Prepare for Sprint S4

---

## Success Criteria

- [ ] Accessibility validator shows 0 errors (down from 55)
- [ ] Frontend Compliance validator shows 0 errors (down from 42)
- [ ] All components meet Section 508 / WCAG 2.1 Level AA standards
- [ ] All components align with CORA frontend standards
- [ ] No regressions introduced (other validator counts unchanged)
- [ ] Fixes applied to templates first, then synced to test project
- [ ] Changes documented in context file

---

## Technical Approach

### 1. Accessibility - Section 508 / WCAG Compliance

**Required Standards:**
- All interactive elements must have accessible names
- All form inputs must have associated labels
- Color contrast ratios must meet WCAG AA (4.5:1 for normal text, 3:1 for large text)
- All functionality must be keyboard accessible
- Focus indicators must be visible
- ARIA attributes must be used correctly

**Example Fixes:**
```tsx
// ❌ WRONG - Missing aria-label
<button onClick={handleClick}>
  <IconComponent />
</button>

// ✅ CORRECT - Has aria-label
<button onClick={handleClick} aria-label="Delete item">
  <IconComponent />
</button>

// ❌ WRONG - Insufficient color contrast
<Box sx={{ color: '#999', backgroundColor: '#fff' }}>

// ✅ CORRECT - Meets WCAG AA contrast ratio
<Box sx={{ color: '#666', backgroundColor: '#fff' }}>
```

### 2. Frontend Compliance - CORA Standards

**Required Patterns:**
- Error boundaries for all route components
- Consistent loading states
- Proper error handling and user feedback
- Component composition following CORA patterns
- State management using approved patterns

**Example Fixes:**
```tsx
// ❌ WRONG - No error boundary
<ComponentThatMightError />

// ✅ CORRECT - With error boundary
<ErrorBoundary fallback={<ErrorState />}>
  <ComponentThatMightError />
</ErrorBoundary>
```

---

## Template-First Workflow

All fixes follow this process:

1. **Fix in Template** - Update component file in `templates/_modules-*/*/frontend/`
2. **Sync to Test Project** - Use `scripts/sync-fix-to-project.sh` to copy to test project
3. **Verify** - Run Accessibility and Frontend Compliance validators on test project
4. **Iterate** - Repeat until error is resolved

---

## Validation Commands

**Accessibility validation:**
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit
python3 validation/run_a11y_validator.py --stack-path <test-project-stack-path>
```

**Frontend Compliance validation:**
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit
npx ts-node validation/frontend-compliance-validator/index.ts <test-project-stack-path>
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
- ✅ API Tracer & UI Library S2 - Eliminated 13 API Tracer + 12 UI Library errors

**Blocking Issues:** None

---

## Notes

**Accessibility:**
- Accessibility is a legal requirement (Section 508) for government and many commercial applications
- Improves user experience for all users, not just those with disabilities
- Critical for CORA template quality and adoption

**Frontend Compliance:**
- Ensures consistent patterns across all CORA modules
- Improves maintainability and developer experience
- Supports long-term template sustainability

**Sprint Rationale:**
- Both validators focus on user experience and quality
- Natural pairing: accessibility (user-facing) + compliance (developer-facing)
- Achieves significant progress toward 0-error baseline (97 errors)

---

**Created:** January 27, 2026  
**Last Updated:** January 27, 2026 (Sprint S3 initialized)