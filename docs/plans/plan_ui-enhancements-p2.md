# UI Enhancements Plan - Phase 2

**Status**: 🟡 PLANNED  
**Branch**: `ui-enhancements` (continuing from P1)  
**Priority**: 🟢 Medium  
**Created**: January 21, 2026  
**Owner**: Engineering Team  

---

## Executive Summary

Phase 2 continues the UI/UX improvements for the Eval and Workspace modules. Phase 1 completed 8 core issues plus significant enhancements. Phase 2 focuses on workspace/audit management features and platform-level customization.

**Progress: 0/6 issues resolved (0%)**

**Modules Affected:**
- `module-ws` - Workspace UI improvements
- `module-eval` - Evaluation card naming
- Platform-level - Theming and branding

---

## Issues to Address

### 1. Workspace/Audit Card - Add Creation Date & Days Active

**Location:** Workspace List Page - Card Display  
**Issue:** Workspace cards missing creation timestamp and age metrics  
**Impact:** Users can't see when workspaces were created or how long they've been active  
**Priority:** Medium  
**Status:** ⏳ PLANNED

**Requirements:**
- Display creation date on workspace card
- Calculate and display "days active" (time since creation)
- Consistent formatting with other timestamp displays

**Implementation Notes:**
- Check if `created_at` column exists in workspaces table
- Add to card metadata section
- Use existing date formatting utilities

**Files to Modify:**
- `templates/_modules-core/module-ws/frontend/components/WorkspaceCard.tsx` (or similar)
- `templates/_modules-core/module-ws/frontend/pages/WorkspaceListPage.tsx`

---

### 2. Workspace/Audit Card - Add Status Chip

**Location:** Workspace List Page - Card Display  
**Issue:** No visual indicator of workspace status (active, archived, etc.)  
**Impact:** Users can't quickly identify workspace state  
**Priority:** Medium  
**Status:** ⏳ PLANNED

**Requirements:**
- Add status chip to workspace card
- Color-code by status (e.g., green = active, gray = archived)
- Position prominently on card (top-right corner)

**Implementation Notes:**
- Define workspace status enum (if not already defined)
- Use MUI Chip component with appropriate colors
- Consider status options: Active, Archived, Completed, On Hold

**Files to Modify:**
- `templates/_modules-core/module-ws/frontend/components/WorkspaceCard.tsx`
- May need to add `status` field to workspace schema if not present

---

### 3. Workspace/Audit Card - Add Edit to Popup Menu

**Location:** Workspace List Page - Card Actions Menu  
**Issue:** No way to edit workspace metadata from list view  
**Impact:** Users must navigate to detail page to edit basic info  
**Priority:** Medium  
**Status:** ⏳ PLANNED

**Requirements:**
- Add "Edit" option to workspace card popup menu
- Open dialog to edit metadata: title, description, status, tags
- **Do NOT allow editing:** docs, evals, members (managed separately)
- Validate and save changes via API

**Implementation Notes:**
- Create `EditWorkspaceDialog` component
- Add to popup menu alongside existing actions
- Use form validation for required fields
- Update workspace via API call

**Files to Modify:**
- `templates/_modules-core/module-ws/frontend/components/WorkspaceCard.tsx` (menu)
- `templates/_modules-core/module-ws/frontend/components/EditWorkspaceDialog.tsx` (new)
- `templates/_modules-core/module-ws/frontend/hooks/useWorkspaces.ts` (update mutation)

---

### 4. Eval Card - Update Temporary Placeholder Name

**Location:** Evaluation Card Display  
**Issue:** New evaluations show concatenated placeholder name instead of meaningful identifier  
**Impact:** Users can't easily identify what document is being evaluated  
**Priority:** High  
**Status:** ⏳ PLANNED

**Requirements:**
- Change placeholder from concatenated string to: "{Document Name} - {Date}"
- Apply when evaluation is first created (before completion)
- Update after evaluation completes (if needed)

**Current Behavior (assumed):**
```
"eval-doc-abc123-xyz789"
```

**Desired Behavior:**
```
"NIST SP 800-53 Rev 5 - Jan 21, 2026"
```

**Implementation Notes:**
- Check where temporary name is generated (likely in eval-processor Lambda)
- Update naming logic to use document name + date
- May need to pass document name to evaluation creation

**Files to Modify:**
- `templates/_modules-functional/module-eval/backend/lambdas/eval-processor/lambda_function.py` (naming logic)
- `templates/_modules-functional/module-eval/frontend/components/EvalCard.tsx` (display)

---

### 5. Organization Logo Upload

**Location:** Organization Settings Page (Platform-Level)  
**Issue:** No way for organizations to customize branding with logo  
**Impact:** Platform looks generic, lacks org identity  
**Priority:** Low  
**Status:** ⏳ PLANNED

**Requirements:**
- Allow org admins to upload custom logo
- Image processing: resize, crop, optimize
- Support formats: PNG, JPG, SVG
- Display logo in:
  - Sidebar header
  - Login page
  - Email templates (future)
  - Reports/exports (future)

**Technical Considerations:**
- **Storage:** S3 bucket for org logos (`s3://{bucket}/orgs/{org_id}/logo.{ext}`)
- **Processing:** Lambda or client-side resize/crop
- **CDN:** CloudFront for fast delivery
- **Fallback:** Default CORA logo if none uploaded

**Implementation Approach:**
1. Add `logo_url` column to `organizations` table
2. Create `OrgLogoUpload` component with image cropper
3. Create `org-logo-upload` Lambda for processing
4. Update `OrgSidebar` to display custom logo
5. Add logo management to org settings page

**Files to Create:**
- `templates/_project-stack-template/apps/web/components/org/OrgLogoUpload.tsx`
- `templates/_modules-core/module-access/backend/lambdas/org-logo-upload/lambda_function.py` (new)
- Database migration to add `logo_url` column

**Files to Modify:**
- `templates/_project-stack-template/apps/web/components/navigation/OrgSidebar.tsx`
- `templates/_modules-core/module-access/db/schema/002-organizations.sql`

---

### 6. MUI Theme Configuration (System/Org/User Levels)

**Location:** Platform-Level Settings  
**Issue:** No way to customize MUI theme per org or user  
**Impact:** All users see same theme, no personalization  
**Priority:** Low  
**Status:** ⏳ PLANNED

**Requirements:**
- **System-level theme:** Default CORA theme (already exists)
- **Org-level theme:** Org admins can customize colors, fonts, etc.
- **User-level theme:** Individual users can override org theme
- **Inheritance:** User > Org > System (lower levels override)
- **Fallback:** If not configured, inherit from parent level

**Theme Customization Options:**
- Primary color
- Secondary color
- Font family
- Dark/light mode preference
- Component overrides (advanced)

**Implementation Approach:**
1. Add `theme_config` JSONB column to `organizations` table
2. Add `theme_config` JSONB column to `users` table (or user_preferences)
3. Create `ThemeProvider` that resolves theme hierarchy
4. Create `ThemeSettingsDialog` for org/user customization
5. Add theme preview capability

**Technical Considerations:**
- Store theme as JSON in database
- Merge themes at runtime (user overrides org, org overrides system)
- Validate theme JSON against schema
- Provide sensible defaults if invalid
- Consider performance impact of theme resolution

**Files to Create:**
- `templates/_project-stack-template/apps/web/components/theme/ThemeProvider.tsx` (enhanced)
- `templates/_project-stack-template/apps/web/components/settings/ThemeSettingsDialog.tsx`
- `templates/_project-stack-template/apps/web/lib/theme/mergeThemes.ts`

**Files to Modify:**
- `templates/_modules-core/module-access/db/schema/002-organizations.sql` (add column)
- `templates/_modules-core/module-access/db/schema/001-users.sql` (add column)
- `templates/_project-stack-template/apps/web/app/layout.tsx` (integrate ThemeProvider)

---

## Implementation Approach

### Strategy: Incremental Improvements

**Order of Implementation:**
1. **High Priority:** Issue #4 (Eval card naming) - User-facing, affects daily workflow
2. **Medium Priority:** Issues #1-3 (Workspace card enhancements) - Grouped together for efficiency
3. **Low Priority:** Issues #5-6 (Platform customization) - Nice-to-have features

### File Locations

**Workspace Module:**
- `templates/_modules-core/module-ws/frontend/components/`
- `templates/_modules-core/module-ws/frontend/pages/`
- `templates/_modules-core/module-ws/frontend/hooks/`
- `templates/_modules-core/module-ws/db/schema/` (if schema changes needed)

**Eval Module:**
- `templates/_modules-functional/module-eval/frontend/components/`
- `templates/_modules-functional/module-eval/backend/lambdas/eval-processor/`

**Platform-Level:**
- `templates/_project-stack-template/apps/web/components/`
- `templates/_modules-core/module-access/db/schema/`

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

- [ ] Workspace cards show creation date and days active
- [ ] Workspace cards show status chip with color coding
- [ ] Workspace cards have "Edit" menu option that opens metadata dialog
- [ ] Eval cards show "{Document Name} - {Date}" instead of placeholder
- [ ] Organizations can upload and display custom logos
- [ ] System/Org/User-level theme configuration functional with proper inheritance

---

## Estimated Timeline

| Task | Duration | Notes |
|------|----------|-------|
| **Issue 1: Creation Date & Days Active** | 2-3 hours | Frontend display logic |
| **Issue 2: Status Chip** | 1-2 hours | May need schema update |
| **Issue 3: Edit Metadata Dialog** | 3-4 hours | New dialog + validation |
| **Issue 4: Eval Card Naming** | 2-3 hours | Backend + frontend changes |
| **Issue 5: Org Logo Upload** | 6-8 hours | Image processing, storage, display |
| **Issue 6: Theme Configuration** | 8-12 hours | Complex feature with multiple levels |
| **Testing** | 3-4 hours | All issues |
| **Total** | **25-36 hours** | ~4-5 work days |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing workspace functionality | Low | Medium | Test thoroughly, revert if needed |
| Theme configuration affecting performance | Medium | Medium | Implement caching, optimize theme resolution |
| Logo upload storage costs | Low | Low | Implement size limits, compression |
| Schema changes requiring migration | Low | Medium | Create migration scripts for existing DBs |

---

## Next Steps

1. **Prioritize Issues** - Confirm priority order with stakeholders
2. **Start with Issue #4** - Eval card naming (high priority, user-facing)
3. **Group Workspace Issues** - Implement #1-3 together for efficiency
4. **Platform Features Last** - Logo upload and theming are nice-to-have

---

**Document Status:** 🟡 PLANNED  
**Current Phase:** Planning  
**Next Action:** Begin implementation of Issue #4 (Eval card naming)  
**Branch:** `ui-enhancements`  
**Related Plan:** `plan_ui-enhancements-p1.md` (completed)  
**Last Updated:** January 21, 2026
