# Test6 Accessibility Fixes - File-by-File Remediation Plan

**Date:** December 24, 2025  
**Status:** 🚧 Ready for Implementation  
**Purpose:** Fix all 56 accessibility errors in CORA templates to ensure test7 passes validation

---

## Executive Summary

Test6 validation revealed **56 accessibility errors** across template components. This document provides a detailed, file-by-file fix plan to remediate all issues before creating test7.

**Scope:** Fix all template files in `cora-dev-toolkit/templates/_cora-core-modules/`

---

## Error Categories Summary

| Error Type | Count | WCAG Level | Priority |
|------------|-------|------------|----------|
| Missing form labels | 38 | A | HIGH |
| Missing IconButton labels | 15 | A | HIGH |
| Empty links | 1 | A | HIGH |
| Heading level skips | 1 | A | MEDIUM |
| Manual review items | 6 | - | LOW |

**Total Errors:** 56  
**Estimated Fix Time:** 2-3 hours

---

## Module-Mgmt Fixes

### File 1: `module-mgmt/frontend/components/ModuleAwareNavigation.tsx`

**Line 60** - Empty Link Element

**Error:**
```
baseline_test_id: 14.A-LinkPurpose
message: "Link has no text content"
severity: error
```

**Current Code:**
```tsx
<a
```

**Fix Required:**
```tsx
// Need to see more context, but likely:
<a href={href} aria-label="Navigate to module">
  {/* Add visible text or icon with label */}
</a>
```

**Action:** Search for the empty `<a` tag on line 60 and add either:
- Visible text content
- Or `aria-label` with descriptive text

---

### File 2: `module-mgmt/frontend/components/ModuleAdminDashboard.tsx`

**Multiple Issues** (5 errors)

#### Error 1 - Line 215: Textarea Missing Label

**Current Code:**
```tsx
<textarea
```

**Fix Required:**
```tsx
<textarea
  aria-label="Module description"
  // OR wrap with <label>
/>
```

#### Error 2 - Line 226: Textarea Missing Label

**Current Code:**
```tsx
<textarea
```

**Fix Required:**
```tsx
<textarea
  aria-label="Module configuration"
  // OR wrap with <label>
/>
```

#### Error 3 - Line 386: Input Missing Label

**Current Code:**
```tsx
<input
```

**Fix Required:**
```tsx
<input
  aria-label="Module setting"
  // OR add corresponding <label> with htmlFor
/>
```

#### Error 4 - Line 236: Heading Skip (h2 → h4)

**Error:**
```
baseline_test_id: 13.A-HeadingLevel
message: "Heading level skipped (h2 → h4, skipped 1 level(s))"
```

**Current Code:**
```tsx
<h4>Module Information</h4>
```

**Fix Required:**
```tsx
// Change to h3 (or change parent to h2 if this should be h3)
<h3>Module Information</h3>
```

**Action Plan for ModuleAdminDashboard.tsx:**
1. Open file in editor
2. Search for `<textarea` on lines 215 and 226
3. Add `aria-label` or wrap with `<label>`
4. Search for `<input` on line 386
5. Add `aria-label` or corresponding `<label>`
6. Fix heading hierarchy around line 236

---

### File 3: `module-mgmt/frontend/hooks/useLambdaWarming.ts`

**Line 44** - Switch Missing Label

**Error:**
```
baseline_test_id: 10.A-FormLabel
message: "Form input missing label"
element_type: Switch
```

**Current Code:**
```tsx
*     <Switch
```

**Fix Required:**
```tsx
<Switch
  aria-label="Enable Lambda warming"
  // OR
  inputProps={{ 'aria-label': 'Enable Lambda warming' }}
/>
```

**Note:** This appears to be in JSDoc comments (the `*` prefix). If it's just documentation, add note that the example should include aria-label.

---

## Module-AI Fixes

### File 4: `module-ai/frontend/components/PlatformAIConfigPanel.tsx`

**Line 156** - TextField Missing Label

**Current Code:**
```tsx
<TextField
```

**Fix Required:**
```tsx
<TextField
  label="Configuration setting"
  // OR
  aria-label="Configuration setting"
/>
```

---

### File 5: `module-ai/frontend/components/OrgAIConfigPanel.tsx`

**Line 204** - TextField Missing Label

**Current Code:**
```tsx
<TextField
```

**Fix Required:**
```tsx
<TextField
  label="Organization AI setting"
  // OR
  aria-label="Organization AI setting"
/>
```

---

### File 6: `module-ai/frontend/components/ModelSelectionModal.tsx`

**Multiple Issues** (3 errors)

#### Error 1 - Line 94: TextField Missing Label

**Current Code:**
```tsx
<TextField
```

**Fix Required:**
```tsx
<TextField
  label="Search models"
  // OR
  aria-label="Search models"
/>
```

#### Error 2 - Line 103: Select Missing Label

**Current Code:**
```tsx
<Select
```

**Fix Required:**
```tsx
<Select
  label="Filter by capability"
  // OR
  aria-label="Filter by capability"
/>
```

#### Error 3 - Line 118: Select Missing Label

**Current Code:**
```tsx
<Select
```

**Fix Required:**
```tsx
<Select
  label="Sort by"
  // OR
  aria-label="Sort by"
/>
```

**Action Plan for ModelSelectionModal.tsx:**
1. Open file
2. Add `label` prop to TextField on line 94
3. Add `label` prop to Select on line 103
4. Add `label` prop to Select on line 118

---

### File 7: `module-ai/frontend/components/providers/ProviderForm.tsx`

**Multiple Issues** (6 errors)

#### Error 1 - Line 106: TextField Missing Label

**Current Code:**
```tsx
<TextField
```

**Fix Required:**
```tsx
<TextField
  label="Provider name"
  aria-label="Provider name"
/>
```

#### Error 2 - Line 119: TextField Missing Label

**Current Code:**
```tsx
<TextField
```

**Fix Required:**
```tsx
<TextField
  label="Provider display name"
  aria-label="Provider display name"
/>
```

#### Error 3 - Line 128: TextField Missing Label

**Current Code:**
```tsx
<TextField
```

**Fix Required:**
```tsx
<TextField
  label="Provider description"
  aria-label="Provider description"
  multiline
  rows={3}
/>
```

#### Error 4 - Line 149: TextField Missing Label

**Current Code:**
```tsx
<TextField
```

**Fix Required:**
```tsx
<TextField
  label="API endpoint URL"
  aria-label="API endpoint URL"
/>
```

#### Error 5 - Line 164: Switch Missing Label

**Current Code:**
```tsx
<Switch
```

**Fix Required:**
```tsx
<FormControlLabel
  control={<Switch />}
  label="Enable provider"
/>
// OR
<Switch
  inputProps={{ 'aria-label': 'Enable provider' }}
/>
```

#### Error 6 - Line 252: IconButton Missing Label

**Current Code:**
```tsx
<IconButton onClick={handleMenuOpen} aria-label="Provider actions">
```

**Wait - this already HAS aria-label!** 

**Analysis:** The validator detected it but may have flagged it for review. Check if the aria-label is descriptive enough.

**Fix Required:**
```tsx
// Make label more specific
<IconButton 
  onClick={handleMenuOpen} 
  aria-label="Open provider menu with edit and delete options"
>
```

**Action Plan for ProviderForm.tsx:**
1. Open file
2. Add `label` prop to all TextField components (lines 106, 119, 128, 149)
3. Wrap Switch on line 164 with FormControlLabel or add inputProps aria-label
4. Verify IconButton on line 252 has descriptive aria-label

---

## Additional Errors (from JSON truncation)

The validation report was truncated at 300 lines. There are likely **40+ more errors** in other files. 

**Action Required:** Run full a11y validation with no output limit:

```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit/validation
python3 -m a11y-validator.cli /Users/aaron/code/sts/test6/ai-sec-stack --format json > full-a11y-report.json
```

Then analyze the complete report to identify remaining errors.

---

## Implementation Checklist

### Phase 1: Fix Known Errors (2 hours)

- [ ] **module-mgmt/frontend/components/ModuleAwareNavigation.tsx**
  - [ ] Fix empty link on line 60

- [ ] **module-mgmt/frontend/components/ModuleAdminDashboard.tsx**
  - [ ] Add label to textarea on line 215
  - [ ] Add label to textarea on line 226
  - [ ] Add label to input on line 386
  - [ ] Fix heading level skip on line 236 (h4 → h3)

- [ ] **module-mgmt/frontend/hooks/useLambdaWarming.ts**
  - [ ] Update JSDoc example to include aria-label on Switch (line 44)

- [ ] **module-ai/frontend/components/PlatformAIConfigPanel.tsx**
  - [ ] Add label to TextField on line 156

- [ ] **module-ai/frontend/components/OrgAIConfigPanel.tsx**
  - [ ] Add label to TextField on line 204

- [ ] **module-ai/frontend/components/ModelSelectionModal.tsx**
  - [ ] Add label to TextField on line 94
  - [ ] Add label to Select on line 103
  - [ ] Add label to Select on line 118

- [ ] **module-ai/frontend/components/providers/ProviderForm.tsx**
  - [ ] Add label to TextField on line 106
  - [ ] Add label to TextField on line 119
  - [ ] Add label to TextField on line 128
  - [ ] Add label to TextField on line 149
  - [ ] Add label to Switch on line 164
  - [ ] Improve IconButton aria-label on line 252

### Phase 2: Identify Remaining Errors (30 minutes)

- [ ] Run full a11y validation (no output limit)
- [ ] Document remaining ~40 errors
- [ ] Create fix plan for each

### Phase 3: Fix Remaining Errors (1-2 hours)

- [ ] Fix all identified errors
- [ ] Follow same patterns as Phase 1

### Phase 4: Validation (30 minutes)

- [ ] Copy fixes back to templates in `cora-dev-toolkit/templates/`
- [ ] Run a11y validator against templates
- [ ] Verify 0 errors
- [ ] Create test7 from fixed templates
- [ ] Validate test7 passes all checks

---

## MUI Component Accessibility Best Practices

### TextField
```tsx
// ✅ CORRECT
<TextField
  label="Field name"
  helperText="Optional description"
/>

// ✅ ALSO CORRECT
<TextField
  aria-label="Field name"
  placeholder="Enter value"
/>
```

### Select
```tsx
// ✅ CORRECT
<FormControl>
  <InputLabel id="select-label">Choose option</InputLabel>
  <Select labelId="select-label">
    <MenuItem value="1">Option 1</MenuItem>
  </Select>
</FormControl>

// ✅ ALSO CORRECT  
<Select
  label="Choose option"
  aria-label="Choose option"
>
  <MenuItem value="1">Option 1</MenuItem>
</Select>
```

### Switch
```tsx
// ✅ CORRECT
<FormControlLabel
  control={<Switch />}
  label="Enable feature"
/>

// ✅ ALSO CORRECT
<Switch
  inputProps={{ 'aria-label': 'Enable feature' }}
/>
```

### IconButton
```tsx
// ✅ CORRECT
<IconButton aria-label="Delete item">
  <DeleteIcon />
</IconButton>

// ❌ WRONG
<IconButton>
  <DeleteIcon />
</IconButton>
```

### Links
```tsx
// ✅ CORRECT
<a href="/page">Go to page</a>

// ✅ ALSO CORRECT
<a href="/page" aria-label="Go to page">
  <ArrowIcon />
</a>

// ❌ WRONG
<a href="/page"></a>
```

---

## Testing Strategy

### Unit Testing

After each file fix:
1. Run a11y validator on that specific file
2. Verify error count decreases
3. Commit change with message: `fix(a11y): Add label to [component] in [file]`

### Integration Testing

After all fixes:
1. Run full a11y validation on templates
2. Expected result: **0 errors**
3. Create test7 from fixed templates
4. Run validation on test7
5. Expected result: **0 errors**

---

## Success Criteria

- [ ] All 56+ accessibility errors fixed in templates
- [ ] A11y validator returns 0 errors
- [ ] Test7 created from templates passes a11y validation
- [ ] All fixes follow MUI best practices
- [ ] No regressions in functionality

---

## Rollback Plan

If fixes cause issues:

1. **Revert template changes:**
   ```bash
   cd /Users/aaron/code/bodhix/cora-dev-toolkit
   git diff templates/
   git checkout templates/
   ```

2. **Delete test7:**
   ```bash
   rm -rf ~/code/sts/test7
   ```

3. **Document what went wrong**
4. **Create alternative fix approach**

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Get approval** to proceed with fixes
3. **Start Phase 1** implementation
4. **Track progress** using checklist above
5. **Validate** after each phase
6. **Create test7** once all fixes complete

---

**Document Version:** 1.0  
**Created:** December 24, 2025  
**Status:** Ready for Implementation  
**Estimated Completion:** 4-6 hours total
