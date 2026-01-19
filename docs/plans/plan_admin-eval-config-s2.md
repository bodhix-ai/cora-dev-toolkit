# Admin Eval Config Validation Plan (Sprint S2)

**Status**: 🔄 IN PROGRESS (Sys Admin ✅ COMPLETE | Org Admin 🔜 NEXT)  
**Priority**: HIGH (Module validation & integration testing)  
**Sprint Goal**: Validate sys and org admin functionality for managing eval config data, ending with document evaluation in workspace  
**Branch**: `admin-eval-config-s2`  
**Estimated Duration**: 1-2 sessions (~2-4 hours)  
**Session 1 Status**: Sys Admin Config ✅ COMPLETE

---

## Executive Summary

This sprint validates the admin configuration functionality for module-eval. The goal is to verify that:
1. **Sys admins** can configure platform-wide evaluation defaults (scoring modes, prompts, status options)
2. **Org admins** can override org-specific settings and manage doc types/criteria
3. **Users** can create evaluations using dynamic configurations stored in the database

**End-to-End Goal:** Process a single document through evaluation and display results in UI using admin-configured settings.

---

## Database Tables Being Validated

| Table | Purpose | Admin Level | Key Fields |
|-------|---------|-------------|------------|
| `eval_cfg_sys` | Platform-wide defaults | Sys Admin | categorical_mode, show_numerical_score |
| `eval_cfg_sys_prompts` | System AI prompts | Sys Admin | prompt_type, system_prompt, user_prompt_template, temperature |
| `eval_cfg_org` | Org-specific overrides | Org Admin | org_id, ai_config_delegated, categorical_mode, show_numerical_score |
| `eval_cfg_org_prompts` | Org prompt overrides | Org Admin (delegated) | org_id, prompt_type, system_prompt, temperature |

**Related Tables:**
- `eval_sys_status_options` - Platform status options (sys admin)
- `eval_org_status_options` - Org status options (org admin)
- `eval_doc_types` - Document types (org admin)
- `eval_criteria_sets` - Criteria sets (org admin)
- `eval_criteria_items` - Individual criteria (org admin)

---

## API Routes Reference

### System Admin Routes (`/admin/sys/eval/...`)

**Config:**
- `GET /admin/sys/eval/config` - Get sys config
- `PATCH /admin/sys/eval/config` - Update sys config

**Status Options:**
- `GET /admin/sys/eval/status-options` - List sys status options
- `POST /admin/sys/eval/status-options` - Create status option
- `PATCH /admin/sys/eval/status-options/{id}` - Update status option
- `DELETE /admin/sys/eval/status-options/{id}` - Delete status option

**Prompts:**
- `GET /admin/sys/eval/prompts` - List sys prompts
- `PATCH /admin/sys/eval/prompts/{type}` - Update prompt config
- `POST /admin/sys/eval/prompts/{type}/test` - Test prompt

**Delegation:**
- `GET /admin/sys/eval/orgs` - List orgs with delegation status
- `PATCH /admin/sys/eval/orgs/{orgId}/delegation` - Toggle delegation

### Org Admin Routes (`/admin/org/eval/...`)

**Config:**
- `GET /admin/org/eval/config?orgId={id}` - Get org config (merged with sys)
- `PATCH /admin/org/eval/config` - Update org config

**Status Options:**
- `GET /admin/org/eval/status-options?orgId={id}` - List org status options
- `POST /admin/org/eval/status-options` - Create status option
- `PATCH /admin/org/eval/status-options/{id}` - Update status option
- `DELETE /admin/org/eval/status-options/{id}` - Delete status option

**Prompts (delegation required):**
- `GET /admin/org/eval/prompts` - List org prompts (merged with sys)
- `PATCH /admin/org/eval/prompts/{type}` - Update prompt (if delegated)
- `POST /admin/org/eval/prompts/{type}/test` - Test prompt (if delegated)

**Doc Types:**
- `GET /admin/org/eval/doc-types` - List doc types
- `POST /admin/org/eval/doc-types` - Create doc type
- `PATCH /admin/org/eval/doc-types/{id}` - Update doc type
- `DELETE /admin/org/eval/doc-types/{id}` - Delete doc type

**Criteria Sets:**
- `GET /admin/org/eval/criteria-sets` - List criteria sets
- `POST /admin/org/eval/criteria-sets` - Create criteria set
- `GET /admin/org/eval/criteria-sets/{id}` - Get criteria set with items
- `PATCH /admin/org/eval/criteria-sets/{id}` - Update criteria set
- `DELETE /admin/org/eval/criteria-sets/{id}` - Delete criteria set
- `POST /admin/org/eval/criteria-sets/import` - Import from spreadsheet

---

## Validation Steps (Happy Path)

### Step 1: Verify Test Environment

**Action:**
- Confirm test-embed project exists and has module-eval deployed
- Verify admin routes are accessible

**Expected:**
- Project at `~/code/bodhix/testing/test-embed/ai-sec-stack` (or similar)
- Module-eval Lambdas deployed (eval-config, eval-processor, eval-results)
- API Gateway routes registered

---

### Step 2: Sys Admin - Platform Defaults

**Page:** `/admin/sys/eval/config`

**Actions:**
1. Navigate to system eval config page
2. Verify Config tab loads:
   - Categorical mode dropdown (boolean/detailed)
   - Show numerical score checkbox
   - Save button
3. Verify Status Options section:
   - List of status options displays
   - Can create/edit/delete status options
4. Verify Prompts tab:
   - Shows 3 prompt configs (doc_summary, evaluation, eval_summary)
   - Can view/edit system prompts

**Expected:**
- ✅ Page loads without errors
- ✅ Config displays current sys defaults
- ✅ Can update scoring mode and save
- ✅ Status options CRUD operations work
- ✅ Prompts display with current templates

---

### Step 3: Sys Admin - Org Delegation (Optional)

**Page:** `/admin/sys/eval/config` (Org Delegation section)

**Actions:**
1. View list of organizations
2. Toggle delegation for test org (enable AI config delegation)

**Expected:**
- ✅ Orgs list displays
- ✅ Can toggle delegation on/off
- ✅ Database updates `eval_cfg_org.ai_config_delegated`

**Note:** This is optional. If skipped, org admin cannot customize AI prompts.

---

### Step 4: Org Admin - Configure Org Settings

**Page:** `/admin/org/eval/config`

**Actions:**
1. Navigate to org eval config page
2. Verify merged config displays (sys defaults + org overrides)
3. Optionally override categorical mode
4. Optionally override numerical score display
5. Save changes

**Expected:**
- ✅ Page loads with merged config
- ✅ Shows which settings are org overrides vs sys defaults
- ✅ Can override settings and save
- ✅ Setting to null reverts to sys default

---

### Step 5: Org Admin - Create Document Type

**Page:** `/admin/org/eval/doc-types`

**Actions:**
1. Navigate to doc types page
2. Click "Create Doc Type"
3. Enter details:
   - **Name:** "IT Security Policy"
   - **Description:** "Compliance evaluation for IT security policies"
4. Save

**Expected:**
- ✅ Doc type created successfully
- ✅ Appears in doc types list
- ✅ Can edit/deactivate doc type

---

### Step 6: Org Admin - Create Criteria Set

**Page:** `/admin/org/eval/criteria`

**Actions:**
1. Navigate to criteria sets page
2. Click "Create Criteria Set"
3. Enter details:
   - **Doc Type:** "IT Security Policy" (from Step 5)
   - **Name:** "NIST Cybersecurity Framework Subset"
   - **Version:** "1.0"
   - **Description:** "Core NIST CSF criteria"
4. Add criteria items manually OR import from CSV

**CSV Import Example:**
```csv
criteria_id,requirement,description,category,weight
POL-001,Password complexity requirements,Requires minimum 12 characters with mix of character types,Authentication,10
POL-002,Multi-factor authentication,Requires MFA for all privileged accounts,Authentication,15
POL-003,Encryption at rest,Requires AES-256 encryption for all sensitive data,Data Protection,20
POL-004,Access logging,Requires comprehensive access logs with 1-year retention,Monitoring,8
POL-005,Incident response plan,Requires documented incident response procedures,Compliance,12
```

**Expected:**
- ✅ Criteria set created successfully
- ✅ Criteria items imported or added manually
- ✅ Can view criteria set with all items
- ✅ Can edit/delete items

---

### Step 7: User - Create Evaluation

**Page:** `/eval` (workspace evaluation page)

**Actions:**
1. Navigate to workspace eval page
2. Click "New Evaluation" or "Create Evaluation"
3. Select doc type: "IT Security Policy"
4. Select criteria set: "NIST Cybersecurity Framework Subset"
5. Upload test document (PDF, 5-10 pages)
6. Submit for processing

**Expected:**
- ✅ Doc type dropdown populated from org config
- ✅ Criteria set dropdown populated for selected doc type
- ✅ File upload succeeds
- ✅ Evaluation created with status "pending"
- ✅ Processing triggered (SQS message sent)

---

### Step 8: Verify Results Display

**Page:** `/eval/{id}` (evaluation details page)

**Actions:**
1. Wait for processing to complete (check status)
2. View evaluation results
3. Verify:
   - Criteria results display with status options from org config
   - Scoring mode matches org config (boolean vs detailed)
   - Document summary displays
   - Compliance score calculated correctly

**Expected:**
- ✅ Processing completes successfully
- ✅ Results display all criteria items
- ✅ Status labels/colors match org config
- ✅ Numerical score shows/hides based on org config
- ✅ Can view citations and explanations

---

## Test Environment

**Project:** test-embed  
**Paths:**
- Stack: `~/code/bodhix/testing/test-embed/ai-sec-stack`
- Infra: `~/code/bodhix/testing/test-embed/ai-sec-infra`

**Test Users:**
- **Sys Admin:** User with `sys_role='sys_admin'` in `user_profiles`
- **Org Admin:** User with `org_role='org_admin'` in `org_members`
- **Workspace Member:** Regular user for evaluation testing

**Test Data:**
- **Test Organization:** Existing org in test-embed project
- **Test Document:** Sample IT security policy PDF (5-10 pages)
- **Test Criteria:** CSV file with 5-10 criteria items

---

## RLS Policy Validation (Implicit)

While we're doing happy path testing, we implicitly validate these RLS policies:

| Table | Policy | Expected Behavior |
|-------|--------|-------------------|
| `eval_cfg_sys` | sys_admin only | ✅ Sys admin can read/write, non-sys admin gets 403 |
| `eval_cfg_org` | org_admin for own org | ✅ Org admin can read/write for their org |
| `eval_cfg_org_prompts` | delegation required | ✅ Only accessible if `ai_config_delegated=true` |
| `eval_doc_types` | org members read, org admin write | ✅ Members can select, admins can manage |
| `eval_criteria_sets` | org members read, org admin write | ✅ Members can select, admins can manage |

---

## Success Criteria

### Sprint Complete When:
1. ✅ Sys admin can configure platform defaults (config, prompts, status options)
2. ✅ Org admin can override org settings
3. ✅ Org admin can create doc types and criteria sets
4. ✅ User can create evaluation using org config
5. ✅ Evaluation processes successfully
6. ✅ Results display in UI with dynamic config applied

### Definition of Done:
- [x] All sys admin validation steps completed (Steps 1-3)
- [ ] All org admin validation steps completed (Steps 4-6)
- [ ] At least one document evaluated end-to-end (Steps 7-8)
- [ ] Results display correctly in UI
- [ ] No errors in CloudWatch logs
- [x] Config changes persist across page refreshes (sys admin verified)

---

## Known Issues & Workarounds

*To be documented during testing*

---

## Session Tracking

### Session 1: Sys Admin Config Validation ✅ COMPLETE
**Date:** January 18-19, 2026  
**Duration:** ~2 hours  
**Focus:** Steps 1-3 (sys admin config, prompts, delegation)

**Completed:**
- [x] Step 1: Verify test environment (test-embed project)
- [x] Step 2: Sys admin platform defaults
  - [x] Configuration tab (scoring mode, numerical score, status options, delegation)
  - [x] Prompts tab (AI provider/model selection, prompt configs)
- [x] Step 3: Org delegation (tested in Step 2)

**Fixes Applied:**
1. ✅ **Tabbed Status Options UI** - Implemented Boolean/Detailed mode tabs with badge counts
2. ✅ **Prop Name Mismatches** - Fixed onCreate/onUpdate/onDelete handlers
3. ✅ **Org Delegation Display** - Fixed organizations not displaying
4. ✅ **401 Unauthorized Errors** - Fixed API client parameter order (token first)
5. ✅ **AI Provider/Model Selection** - Integrated module-ai useProviders hook

**Issues Found & Resolved:**
- ✅ Status options - onCreate error (prop name mismatch) → FIXED
- ✅ Status options - Edit/Delete 401 errors (JWT in URL) → FIXED (parameter order)
- ✅ Prompts - Only "default" model option → FIXED (integrated module-ai)
- ✅ Org delegation - Organizations not displaying → FIXED (prop name mismatch)

**Database Verification:**
- ✅ Status option changes persist to database
- ✅ Prompt config changes persist to database
- ✅ Org delegation toggles persist to database

**Next Session:**
- Step 4: Org admin configure settings
- Step 5: Create doc types
- Step 6: Create criteria sets

---

### Session 2: Org Admin Config & Evaluation (NEXT)
**Date:** TBD  
**Duration:** TBD  
**Focus:** Steps 4-8 (org admin config, doc types, criteria, evaluation, results)

**To Complete:**
- [ ] Step 4: Org admin configure settings
- [ ] Step 5: Create doc type
- [ ] Step 6: Create criteria set
- [ ] Step 7: Create evaluation
- [ ] Step 8: Verify results

**Issues Found:**
- (Document issues here)

**Next Steps:**
- Test org admin config page
- Create doc types and criteria sets
- Run end-to-end evaluation

---

## Related Documentation

**Implementation:**
- [Module-Eval Implementation Plan](./plan_module-eval-implementation.md)
- [Module-Eval Config Plan](./plan_module-eval-config.md)
- [Module-Eval Specification](../specifications/module-eval/MODULE-EVAL-SPEC.md)

**Database Schema:**
- `templates/_modules-functional/module-eval/db/schema/001-eval-cfg-sys.sql`
- `templates/_modules-functional/module-eval/db/schema/002-eval-cfg-sys-prompts.sql`
- `templates/_modules-functional/module-eval/db/schema/004-eval-cfg-org.sql`
- `templates/_modules-functional/module-eval/db/schema/005-eval-cfg-org-prompts.sql`

**Backend Routes:**
- `templates/_modules-functional/module-eval/backend/lambdas/eval-config/lambda_function.py`

**RLS Policies:**
- `templates/_modules-functional/module-eval/db/schema/015-eval-rls.sql`

---

## Change Log

| Date | Session | Changes |
|------|---------|------------|
| Jan 18, 2026 | - | Sprint plan created |
| Jan 18-19, 2026 | 1 | Sys admin config validation complete (Steps 1-3) |
| Jan 18-19, 2026 | 1 | Fixed status options UI (tabbed interface) |
| Jan 18-19, 2026 | 1 | Fixed API client parameter order (401 errors) |
| Jan 18-19, 2026 | 1 | Integrated module-ai provider/model selection |

---

**Status**: 🔄 IN PROGRESS (Sys Admin ✅ COMPLETE | Org Admin 🔜 NEXT)  
**Last Updated**: January 19, 2026  
**Branch**: admin-eval-config-s2  
**Test Project**: test-embed  
**Session 1**: Sys Admin Config ✅ COMPLETE
