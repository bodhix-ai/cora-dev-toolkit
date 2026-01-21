# UI Enhancements Plan

**Status**: 🟡 IN PROGRESS  
**Branch**: `ui-enhancements`  
**Priority**: 🟢 Medium  
**Created**: January 21, 2026  
**Started**: January 21, 2026  
**Owner**: Engineering Team  

---

## Executive Summary

This sprint addresses frontend UI/UX improvements identified during user testing of the Eval module. All issues are contained within existing module templates and require no backend changes.

**Modules Affected:**
- `module-eval` - Evaluation UI improvements

---

## Issues to Address

### 1. Audit List Page - Filters Not Working

**Location:** Audit List Page (card list view)  
**Issue:** Audit filters are not functioning properly on the audit card list  
**Impact:** Users cannot filter audits, making navigation difficult  
**Priority:** High  

**Tasks:**
- [ ] Identify filter implementation in audit list page
- [ ] Debug filter logic
- [ ] Test filter functionality
- [ ] Verify across different filter types

---

### 2. Eval Card - Update "Days Active" Label

**Location:** Eval Card component  
**Issue:** Label reads "Days Active" but should read "Eval Age"  
**Impact:** Inconsistent terminology  
**Priority:** Low  

**Tasks:**
- [ ] Find Eval Card component
- [ ] Update label text
- [ ] Verify display in all contexts

---

### 3. Eval Details - Criteria Results Expandable/Collapsible

**Location:** Eval Details page  
**Issue:** Criteria results need to be expandable and collapsible for better readability  
**Impact:** Large evaluation results are difficult to navigate  
**Priority:** High  

**Tasks:**
- [ ] Add accordion/collapse component to criteria results
- [ ] Implement expand/collapse state management
- [ ] Add visual indicators (chevron icons)
- [ ] Test expand/collapse functionality

---

### 4. Eval Details - Rename "Criteria Results" to "Results"

**Location:** Eval Details page  
**Issue:** Section header reads "Criteria Results" but should be simplified to "Results"  
**Impact:** Minor - label verbosity  
**Priority:** Low  

**Tasks:**
- [ ] Update section header text
- [ ] Verify consistency across eval detail views

---

### 5. Eval Details - Apply HTML Formatting to Assessment Content

**Location:** Eval Details page (assessment content display)  
**Issue:** Assessment content displays as plain text, needs HTML formatting  
**Impact:** Formatted content (bold, lists, etc.) not rendering correctly  
**Priority:** Medium  

**Tasks:**
- [ ] Identify assessment content display component
- [ ] Add HTML sanitization library (if needed)
- [ ] Implement safe HTML rendering
- [ ] Test with various formatted content

---

### 6. Eval Details - Citations Tab Not Populating

**Location:** Eval Details page - Citations tab  
**Issue:** Citations tab exists but doesn't populate with citation data  
**Impact:** Users cannot view evaluation citations  
**Priority:** High  

**Tasks:**
- [ ] Debug citations data fetch
- [ ] Verify API response includes citations
- [ ] Check citation data mapping to UI
- [ ] Test citations display

---

### 7. Eval Details - Citations Not Viewable on Paperclip Click

**Location:** Eval Details page - Citation paperclip icon  
**Issue:** Clicking paperclip icon doesn't show citation details  
**Impact:** Citation references are not accessible  
**Priority:** High  

**Tasks:**
- [ ] Implement paperclip click handler
- [ ] Add citation detail modal/popover
- [ ] Display citation content
- [ ] Test citation viewing

---

### 8. Eval Details - Dynamic Workspace Label in Breadcrumbs

**Location:** Eval Details page - Breadcrumb navigation  
**Issue:** Breadcrumbs need to use dynamic workspace label (e.g., "Audit" vs "Audits")  
**Impact:** Navigation breadcrumbs use generic terminology  
**Priority:** Medium  

**Tasks:**
- [ ] Identify breadcrumb component
- [ ] Add workspace label configuration
- [ ] Implement dynamic label substitution
- [ ] Test with different workspace types

---

## Implementation Approach

### Strategy: Frontend-Only Changes

All changes are isolated to frontend components in the `module-eval` template:
- `templates/_modules-functional/module-eval/frontend/`

**No backend or database changes required.**

### File Locations (Expected)

1. **Audit List Page**: `pages/AuditListPage.tsx` or similar
2. **Eval Card**: `components/EvalCard.tsx`
3. **Eval Details**: `pages/EvalDetailPage.tsx`
4. **Citations**: `components/CitationsList.tsx`, `components/CitationModal.tsx`
5. **Breadcrumbs**: `components/Breadcrumbs.tsx` or in layout

---

## Testing Strategy

### Per Issue After Fix:

1. **Manual Testing:**
   - Test the specific functionality
   - Verify visual appearance
   - Test edge cases

2. **Integration Testing:**
   - Test navigation flow
   - Verify no regressions in other areas
   - Test across different screen sizes

3. **User Acceptance:**
   - Verify fix addresses original issue
   - Check for any new issues introduced

---

## Success Criteria

- [x] All 8 UI issues documented
- [ ] Audit filters function correctly
- [ ] "Days Active" changed to "Eval Age"
- [ ] Criteria results are expandable/collapsible
- [ ] "Criteria Results" renamed to "Results"
- [ ] Assessment content renders HTML formatting
- [ ] Citations tab populates with data
- [ ] Paperclip icon shows citation details
- [ ] Breadcrumbs use dynamic workspace label
- [ ] All changes tested and verified
- [ ] Template changes synced to test project (if applicable)

---

## Estimated Timeline

| Task | Duration | Notes |
|------|----------|-------|
| **Issue 1: Audit Filters** | 1-2 hours | Debug and fix |
| **Issue 2: Label Update** | 15 min | Simple text change |
| **Issue 3: Expandable Results** | 2-3 hours | Component work |
| **Issue 4: Rename Header** | 15 min | Simple text change |
| **Issue 5: HTML Formatting** | 1-2 hours | Safe HTML rendering |
| **Issue 6: Citations Tab** | 1-2 hours | Debug data flow |
| **Issue 7: Paperclip Click** | 1-2 hours | Modal implementation |
| **Issue 8: Dynamic Breadcrumbs** | 1-2 hours | Config + implementation |
| **Testing** | 2-3 hours | All issues |
| **Total** | **10-17 hours** | ~2 work days |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing eval functionality | Low | Medium | Test thoroughly, revert if needed |
| HTML rendering XSS vulnerability | Medium | High | Use sanitization library, test malicious input |
| Performance impact from expandable results | Low | Low | Use efficient React patterns |

---

## Next Steps

1. **Locate Files**: Find all affected components in module-eval template
2. **Prioritize**: Start with high-priority issues (filters, citations)
3. **Implement**: Make changes to template files
4. **Test**: Verify each fix individually
5. **Integrate**: Test all changes together
6. **Document**: Update any relevant documentation
7. **Sync**: Sync template changes to test project (if applicable)

---

**Document Status:** 🟡 IN PROGRESS  
**Progress:** 0/8 issues resolved  
**Current Phase:** Setup & Planning  
**Next Action:** Locate affected files in module-eval template  
**Session Started:** January 21, 2026
