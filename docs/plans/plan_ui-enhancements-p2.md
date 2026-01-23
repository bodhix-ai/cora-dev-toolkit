# UI Enhancements Plan - Phase 2

**Status**: 🟡 PLANNED  
**Branch**: `ui-enhancements` (continuing from P1)  
**Priority**: 🟢 Medium  
**Created**: January 21, 2026  
**Owner**: Engineering Team  

---

## Executive Summary

Phase 2 continues the UI/UX improvements for the Eval and Workspace modules. Phase 1 completed 8 core issues plus significant enhancements. Phase 2 focuses on workspace/audit management features and platform-level customization.

**Progress: 5/7 issues resolved (71%)**

**Completed Today (Jan 22, 2026):**
- ✅ Issue #1: Creation Date & Days Active
- ✅ Issue #2: Status Chip  
- ✅ Issue #3: Edit Metadata Dialog
- ✅ Issue #7: Resource Counts (Full Stack Implementation Verified)
- ✅ Issue #4: Eval Card Naming (VERIFIED WORKING)

**Modules Affected:**
- `module-ws` - Workspace UI improvements ✅ (4 issues complete)
- `module-eval` - Evaluation card naming ✅ (complete)
- `module-kb` - DocumentStatusBadge error fixed ✅ (bonus fix)
- Platform-level - Theming and branding ⏳ (pending)

---

## Issues to Address

### 1. Workspace/Audit Card - Add Creation Date & Days Active

**Location:** Workspace List Page - Card Display  
**Issue:** Workspace cards missing creation timestamp and age metrics  
**Impact:** Users can't see when workspaces were created or how long they've been active  
**Priority:** Medium  
**Status:** ✅ COMPLETE (Jan 22, 2026)

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
**Status:** ✅ COMPLETE (Jan 22, 2026)

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
**Status:** ✅ COMPLETE (Jan 22, 2026)

**Implementation Notes (Completed):**
- WorkspaceForm component already handled both create and edit modes
- Added status field dropdown to allow toggling between Active/Archived
- Edit dialog was already wired up via WorkspaceListPage

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

### 7. Workspace Card - Add Resource Counts & Optimize Layout

**Location:** Workspace List Page - Card Display  
**Issue:** Workspace cards lack visibility into resource counts (evaluations, docs, members)  
**Impact:** Users can't quickly assess workspace activity/content without opening it  
**Priority:** Medium  
**Status:** ✅ COMPLETE (Jan 22, 2026) - **Full Stack Implementation Verified**

**Implementation Delivered (All Layers):**

**✅ Database Layer:**
- Created `get_workspace_resource_counts(p_workspace_ids UUID[])` RPC function
- Efficient batch query for multiple workspaces
- Gracefully handles optional modules (eval, voice) via exception handling
- Returns zeros if tables don't exist (module not installed)
- **File:** `templates/_modules-core/module-ws/db/schema/007-workspace-rpc-functions.sql`
- **Migration:** `templates/_modules-core/module-ws/db/migrations/20260122_add_workspace_resource_counts.sql`

**✅ Backend Lambda:**
- Calls RPC function for all workspaces in single query (no N+1 problem)
- Returns counts in API response: `documentCount`, `evaluationCount`, `chatCount`, `voiceCount`
- Graceful error handling if RPC function not found (migration not run)
- **File:** `templates/_modules-core/module-ws/backend/lambdas/workspace/lambda_function.py`

**✅ Frontend Display:**
- Added all count fields to Workspace TypeScript interface
- Created dedicated "Resource Metrics" section with 3-column grid layout
- Used icons for visual clarity (📄 Documents, 📊 Evaluations, 💬 Chats, 🎤 Voice)
- Conditional rendering (only shows if count > 0)
- Proper tooltips with singular/plural forms
- **Files:**
  - `templates/_modules-core/module-ws/frontend/components/WorkspaceCard.tsx`
  - `templates/_modules-core/module-ws/frontend/types/index.ts`

**API Response Format:**
```json
{
  "id": "...",
  "name": "Starbucks",
  "memberCount": 1,
  "documentCount": 12,      // ✅ NEW
  "evaluationCount": 3,     // ✅ NEW (0 if module not installed)
  "chatCount": 8,           // ✅ NEW
  "voiceCount": 2           // ✅ NEW (0 if module not installed)
}
```

**Performance:** Single RPC call for all workspaces (efficient batch processing)

**See Also:** `docs/plans/completed/BACKEND-TODO-workspace-counts.md` for complete implementation details

**Requirements:**
- Add count of evaluations in workspace
- Add count of documents in workspace
- Add count of members in workspace (already shows, but may need repositioning)
- Optimize card layout to accommodate new information without overwhelming UI
- Maintain readability and visual hierarchy

**Implementation Notes:**
- Check if `evaluation_count` and `document_count` are available in workspace API response
- May need to add computed fields to API if not present
- Consider visual grouping of metrics (icons + counts)
- Layout optimization strategies:
  - Use collapsible sections for detailed info
  - Group related metrics together
  - Consider tabs or accordion for dense information
  - Use icons instead of text labels where possible
  - Adjust spacing and font sizes for balance

**UX Considerations:**
With the addition of:
- Creation date + days active (Issue #1)
- Status chip (Issue #2)
- Resource counts (this issue)

The card now displays significant information. Layout should:
- Prioritize most important info (name, status)
- Group related metrics (resource counts together)
- Maintain visual breathing room
- Support both grid and list view modes

**Files to Modify:**
- `templates/_modules-core/module-ws/frontend/components/WorkspaceCard.tsx`
- `templates/_modules-core/module-ws/frontend/types/index.ts` (if adding new computed fields)
- May need backend API updates to include evaluation/document counts

---

### 4. Eval Card - Update Temporary Placeholder Name

**Location:** Evaluation Card Display  
**Issue:** New evaluations show concatenated placeholder name instead of meaningful identifier  
**Impact:** Users can't easily identify what document is being evaluated  
**Priority:** High  
**Status:** ✅ COMPLETE (Jan 22, 2026) - **VERIFIED WORKING**

**Implementation Delivered:**

**✅ Backend Lambda (eval-results):**
- Auto-renames evaluation when EVALUATE button clicked (PATCH request)
- Uses `kb_docs.filename` column (raw database column name)
- Removes file extensions (.pdf, .docx, etc.)
- Uses local server time (not UTC)
- Supports multiple document formats:
  - 1 doc: `{Document Name} - MM/DD/YYYY`
  - 2 docs: `{Doc1} & {Doc2} - MM/DD/YYYY`
  - 3+ docs: `{First Doc} + {n} more - MM/DD/YYYY`

**Root Cause Fixes Applied:**
1. **Column name mismatch**: Changed from `file_name` to `filename` (actual DB column)
2. **Timezone issue**: Changed from UTC to local time (prevents date being off by 1 day)

**Example Output:**
- Before: `"Document - 01/23/2026"` (generic name, wrong date)
- After: `"Access-Control-Policy - 01/22/2026"` (correct name, correct date)

**Files Modified:**
- `templates/_modules-functional/module-eval/backend/lambdas/eval-results/lambda_function.py`

**Status:** ✅ Deployed to test environment and **verified working** by user

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

- [x] Workspace cards show creation date and days active
- [x] Workspace cards show status chip with color coding
- [x] Workspace cards have "Edit" menu option that opens metadata dialog with status field
- [x] Workspace cards show evaluation count, document count, and optimized layout
- [x] Workspace enhancements deployed to production (Issue #7 backend + frontend)
- [x] Eval cards show "{Document Name} - {Date}" instead of placeholder ✅ VERIFIED
- [ ] Organizations can upload and display custom logos
- [ ] System/Org/User-level theme configuration functional with proper inheritance

---

## Production Deployment

**Status:** ✅ DEPLOYED (Jan 22, 2026)

**Deployed Features:**
- ✅ Database migration: `20260122_add_workspace_resource_counts.sql`
- ✅ Workspace Lambda: Updated with resource count RPC calls
- ✅ Frontend: WorkspaceCard with all 5 resource counts
- ✅ Verified: Counts displaying correctly in production UI

**Deployment Steps Completed:**
1. Applied database migration to production database
2. Built and deployed workspace Lambda to production
3. Frontend deployment (Next.js build)
4. Smoke testing verified all counts working

**Result:** All Phase 2 workspace enhancements (Issues #1-3, #7) now live in production.

---

## Estimated Timeline

| Task | Duration | Notes |
|------|----------|-------|
| **Issue 1: Creation Date & Days Active** | ~~2-3 hours~~ ✅ 2 hours | Frontend display logic |
| **Issue 2: Status Chip** | ~~1-2 hours~~ ✅ 1 hour | Layout adjustments |
| **Issue 3: Edit Metadata Dialog** | ~~3-4 hours~~ ✅ 1 hour | Added status field to existing form |
| **Issue 7: Resource Counts & Layout Optimization** | ~~3-5 hours~~ ✅ 2 hours | Types + layout with metrics grid |
| **Issue 4: Eval Card Naming** | ~~2-3 hours~~ ✅ 3 hours | Backend changes + 3 iterations to fix |
| **Issue 5: Org Logo Upload** | 6-8 hours | Image processing, storage, display |
| **Issue 6: Theme Configuration** | 8-12 hours | Complex feature with multiple levels |
| **Testing** | 3-4 hours | All issues |
| **Total** | **25-37 hours** | ~4-5 work days |

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

**Document Status:** � IN PROGRESS  
**Current Phase:** Implementation  
**Completed (Jan 22, 2026):**
- ✅ Issues #1-3 (Workspace card enhancements: creation date, status chip, edit dialog)
- ✅ Issue #7 (Resource counts - **full stack implementation verified**)
  - Database: RPC function created and migrated
  - Backend: Lambda updated to call RPC and return counts
  - Frontend: Displays counts with icons and conditional rendering
  - Optional modules (eval, voice) handled gracefully

**Completed (Jan 22, 2026):**
- ✅ Issue #4 (Eval card naming - **verified working**)
  - Backend: Fixed column name (`filename` not `file_name`)
  - Backend: Fixed timezone (local time not UTC)
  - Deployed to test environment
  - User confirmed: "the naming fix worked!"

**Remaining:** Issues #5, #6 (2 of 7)  
**Next Action:** Platform customization features (low priority)  
**Branch:** `ui-enhancements`  

**Bonus Fix:**
- ✅ DocumentStatusBadge error (module-kb) - Added guard for unknown status values

**Related Plans:**
- `plan_ui-enhancements-p1.md` (completed)
- `docs/plans/completed/BACKEND-TODO-workspace-counts.md` (Issue #7 implementation details)

**Last Updated:** January 22, 2026 7:36 PM EST
