# Tabbed Interface Standard Retrofit Plan

**Status**: 🟡 PLANNED  
**Priority**: Medium  
**Created**: January 22, 2026  
**Standard**: `docs/standards/standard_CORA-UI-LIBRARY.md` (Section: Tabbed Interface Standard)

---

## Overview

Following the approval of the CORA Tabbed Interface Standard, this plan documents all files using `<Tabs>` components that need to be updated to comply with the standard.

**Standard Requirements:**
1. **Divider after Tabs**: `<Divider />` required between `<Tabs>` and `<TabPanel>` content
2. **Tab Content Padding**: All `<TabPanel>` content must be wrapped in `<Box sx={{ p: 3 }}>`

---

## Files Requiring Updates (17 Total)

### Module-WS (5 Files)

| File | Status | Priority | Notes |
|------|--------|----------|-------|
| `WorkspaceDetailPage.tsx` | ✅ COMPLETE | High | Applied in Jan 22 session |
| `WorkspaceDetailAdminPage.tsx` | ⏳ PENDING | High | Admin workspace detail view |
| `PlatformAdminConfigPage.tsx` | ⏳ PENDING | Medium | Platform-level WS config |
| `OrgAdminManagementPage.tsx` | ⏳ PENDING | Medium | Org-level WS management |
| `routes/ws/[id]/page.tsx` | N/A | - | May use WorkspaceDetailPage |

**Location:** `templates/_modules-core/module-ws/frontend/pages/`

---

### Module-Access (2 Files)

| File | Status | Priority | Notes |
|------|--------|----------|-------|
| `AccessControlAdmin.tsx` | ⏳ PENDING | High | Core admin interface |
| `OrgDetails.tsx` | ⏳ PENDING | Medium | Organization detail tabs |

**Location:** `templates/_modules-core/module-access/frontend/components/admin/`

---

### Module-KB (2 Files)

| File | Status | Priority | Notes |
|------|--------|----------|-------|
| `OrgAdminKBPage.tsx` | ⏳ PENDING | Medium | Org-level KB management |
| `PlatformAdminKBPage.tsx` | ⏳ PENDING | Low | Platform-level KB config |

**Location:** `templates/_modules-core/module-kb/frontend/pages/`

---

### Module-AI (1 File)

| File | Status | Priority | Notes |
|------|--------|----------|-------|
| `AIEnablementAdmin.tsx` | ⏳ PENDING | High | AI provider configuration |

**Location:** `templates/_modules-core/module-ai/frontend/components/admin/`

---

### Module-Mgmt (1 File)

| File | Status | Priority | Notes |
|------|--------|----------|-------|
| `PlatformMgmtAdmin.tsx` | ⏳ PENDING | Medium | Platform management admin |

**Location:** `templates/_modules-core/module-mgmt/frontend/components/admin/`

---

### Module-Eval (5 Files)

| File | Status | Priority | Notes |
|------|--------|----------|-------|
| `EvalDetailPage.tsx` | ⏳ PENDING | High | Main eval detail interface |
| `StatusOptionManager.tsx` | ⏳ PENDING | Low | Status config component |
| `SysEvalPromptsPage.tsx` | ⏳ PENDING | Medium | System-level prompts |
| `OrgEvalPromptsPage.tsx` | ⏳ PENDING | Medium | Org-level prompts |
| `routes/admin/org/eval/page.tsx` | ⏳ PENDING | Medium | Org eval admin route |
| `routes/admin/sys/eval/page.tsx` | ⏳ PENDING | Low | System eval admin route |

**Location:** `templates/_modules-functional/module-eval/frontend/`

---

### Project Stack Template (1 File)

| File | Status | Priority | Notes |
|------|--------|----------|-------|
| `org/settings/page.tsx` | ⏳ PENDING | Medium | Org settings page |

**Location:** `templates/_project-stack-template/apps/web/app/`

---

## Implementation Priority

### Phase 1: High Priority (User-Facing)
1. ✅ `module-ws/WorkspaceDetailPage.tsx` - COMPLETE
2. `module-ws/WorkspaceDetailAdminPage.tsx` - Workspace admin
3. `module-access/AccessControlAdmin.tsx` - Access control
4. `module-ai/AIEnablementAdmin.tsx` - AI configuration
5. `module-eval/EvalDetailPage.tsx` - Evaluation detail

**Estimated Time:** 4-6 hours

---

### Phase 2: Medium Priority (Admin Interfaces)
6. `module-ws/OrgAdminManagementPage.tsx`
7. `module-ws/PlatformAdminConfigPage.tsx`
8. `module-access/OrgDetails.tsx`
9. `module-kb/OrgAdminKBPage.tsx`
10. `module-mgmt/PlatformMgmtAdmin.tsx`
11. `module-eval/SysEvalPromptsPage.tsx`
12. `module-eval/OrgEvalPromptsPage.tsx`
13. `module-eval/routes/admin/org/eval/page.tsx`
14. `web/app/org/settings/page.tsx`

**Estimated Time:** 8-10 hours

---

### Phase 3: Low Priority (Config Components)
15. `module-kb/PlatformAdminKBPage.tsx`
16. `module-eval/StatusOptionManager.tsx`
17. `module-eval/routes/admin/sys/eval/page.tsx`

**Estimated Time:** 2-3 hours

---

## Standard Application Pattern

For each file, apply this pattern:

### Before (Non-Compliant)
```typescript
<Paper>
  <Tabs value={activeTab} onChange={handleTabChange}>
    <Tab label="Tab 1" />
    <Tab label="Tab 2" />
  </Tabs>
  
  <TabPanel value={activeTab} index={0}>
    {/* Content directly in TabPanel - NO PADDING */}
    <Typography>Content here</Typography>
  </TabPanel>
</Paper>
```

### After (Compliant)
```typescript
<Paper>
  <Tabs value={activeTab} onChange={handleTabChange}>
    <Tab label="Tab 1" />
    <Tab label="Tab 2" />
  </Tabs>
  <Divider /> {/* CORA UI Standard: Tab separator bar */}
  
  <TabPanel value={activeTab} index={0}>
    <Box sx={{ p: 3 }}> {/* CORA UI Standard: Tab content padding (24px) */}
      <Typography>Content here</Typography>
    </Box>
  </TabPanel>
</Paper>
```

---

## Validation Script

Create automated validation to detect non-compliant tabbed interfaces:

```bash
# Check for <Tabs> without following <Divider />
grep -r "<Tabs" templates/ | while read line; do
  # Extract file and check for Divider in next 5 lines
  file=$(echo "$line" | cut -d':' -f1)
  # ... validation logic
done
```

---

## Testing Checklist

After applying the standard to each file:

- [ ] Verify visual separator appears between tabs and content
- [ ] Verify 24px padding on all sides of tab content
- [ ] Test with content that includes top-aligned actions (buttons, chips)
- [ ] Verify no content touches container edges
- [ ] Check responsive behavior on mobile/tablet
- [ ] Verify accessibility (screen reader navigation)

---

## Progress Tracking

**Total Files:** 17  
**Completed:** 1 (6%)  
**Pending:** 16 (94%)

### Completed
- ✅ 2026-01-22: `module-ws/WorkspaceDetailPage.tsx` - Applied tab separator + padding

### Pending
- Phase 1: 4 files (High Priority)
- Phase 2: 10 files (Medium Priority)
- Phase 3: 3 files (Low Priority)

---

## Future Enforcement

### Pre-commit Hook
Add to validation suite:
```bash
./scripts/validate-tabbed-interfaces.sh
```

### ESLint Rule (Future)
Consider custom ESLint rule:
```javascript
{
  "cora/tabbed-interface-standard": "error"
}
```

### Documentation
Update component guidelines:
- Add to `docs/standards/standard_CORA-UI-LIBRARY.md` ✅ DONE
- Reference in module development guides
- Include in code review checklist

---

## Related Documents

- **Standard:** `docs/standards/standard_CORA-UI-LIBRARY.md` (v1.1)
- **Original Discussion:** Session Jan 22, 2026 (UX analysis of tab separator options)
- **Test Project:** `~/code/bodhix/testing/test-optim/ai-sec-stack`

---

## Notes

### Why This Matters

**Before Standard:** Actions/buttons at top of tab content felt "arbitrary" or "floating"

**After Standard:** 
- Clear visual hierarchy (tabs → separator → content)
- Consistent padding prevents edge-touching
- Actions feel purposeful in defined space
- Matches Material Design patterns (Gmail, Drive, GitHub)

### User Feedback (Jan 22, 2026)

> "After seeing the '+ EVALUATION' button on the same horizontal band as the status chip, it doesn't look correct. While the status chips moving up to be where the previous header was looks good, the button seems to be arbitrarily pushed down from the top."

**Solution:** Add light horizontal separator bar between tabs and content to provide clear separation and context for top-level actions.

---

**Status:** 🟡 PLANNED  
**Next Action:** Begin Phase 1 (High Priority files)  
**Estimated Total Time:** 14-19 hours  
**Last Updated:** January 22, 2026
