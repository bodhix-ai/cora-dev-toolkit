# CORA Validation Errors - Sprint S8

**Status:** 🟡 IN PROGRESS  
**Branch:** `feature/validation-errors-s8`  
**Created:** February 8, 2026  
**Context:** `memory-bank/context-error-remediation.md`  
**Current Focus:** Org Admin Parity + Six Error Category Remediation

---

## 📊 Executive Summary

Sprint S8 combines feature work (org admin tabbed interface) with systematic error remediation across six targeted categories. This dual-track approach completes admin page standardization while making significant progress toward Silver certification.

**S7 Baseline (2026-02-08 10:17 AM):**
- **Total Errors:** 507
- **Total Warnings:** 488
- **Certification:** BRONZE
- **Admin Routes:** 36 → 6 ✅ (98.5% complete in S7)

**S8 Target Categories:**
1. **Schema** - 94 errors (database integrity)
2. **Accessibility** - 58 errors (Section 508 compliance)
3. **Workspace Plugin** - Unknown count (architectural compliance)
4. **CORA Compliance** - Unknown count (framework standards)
5. **Auth** - Unknown count (authentication/authorization patterns)
6. **Portability** - Unknown count (deployment flexibility)

**S8 Objectives:**
1. **Feature:** Org admin tabbed interface for organization management
2. **Errors:** Reduce targeted categories by 60-80%
3. **Certification:** Position for Silver certification path

---

## 🎯 Scope

### Track 1: Feature Work - Org Admin Tabbed Interface

**Problem:** Org admins lack the tabbed interface that sys admins have for organization management.

**Current State:**
- **Sys admins:** Navigate to `/admin/sys/access/orgs/[id]` → See `<OrgDetails>` component with 5 tabs
  - Overview, Domains, Members, Invites, AI Config
- **Org admins:** Navigate to `/admin/org/access` → Only see `<OrgAccessAdmin>` with simple member table

**Gap:** Org admins cannot access Overview, Domains, or Invites management for their own organization.

**Solution Options:**
1. **Option A:** Replace `/admin/org/access` to render `<OrgDetails>` instead of `<OrgAccessAdmin>`
2. **Option B:** Create new route `/admin/org` or `/admin/org/overview` that renders `<OrgDetails>`

**Scope:**
- [ ] Choose implementation approach (Option A or B)
- [ ] Create/update route to render `<OrgDetails>` for org admins
- [ ] Test all 5 tabs work correctly for org admins
- [ ] Update navigation and breadcrumbs
- [ ] Verify authorization works correctly
- [ ] Document the pattern

**Expected Outcome:** Org admins have full organization management capabilities via tabbed interface

---

### Track 2: Error Remediation - Six Categories

#### 2.1 Schema Errors (94) - HIGH PRIORITY

**Likely Issues:**
- Table naming violations (ADR-011)
- Missing/incorrect audit columns (ADR-015)
- RLS policy gaps
- Foreign key/constraint issues
- Index optimization needs

**Approach:**
1. Run schema validator to get error list
2. Categorize errors by type
3. Fix systematic patterns first (naming, audit columns)
4. Address RLS and constraints
5. Re-validate

**Success Criteria:**
- [ ] All table names follow ADR-011 standards
- [ ] All tables have correct audit columns (ADR-015)
- [ ] RLS policies present and correct
- [ ] 94 → <15 errors (80%+ reduction)

---

#### 2.2 Accessibility Errors (58) - COMPLETE THE CATEGORY

**Likely Issues:**
- Missing ARIA labels on new components
- Button/link accessibility gaps
- Form field label associations
- Color contrast issues
- Keyboard navigation problems

**Approach:**
1. Run a11y validator for detailed error report
2. Fix by component/page systematically
3. Focus on admin pages and new eval/voice components
4. Re-validate until zero errors

**Success Criteria:**
- [ ] All admin pages pass accessibility checks
- [ ] All form fields have proper labels
- [ ] All interactive elements have ARIA attributes
- [ ] 58 → 0 errors (100% reduction)
- [ ] Section 508 compliance achieved

---

#### 2.3 Workspace Plugin Errors (Unknown) - ARCHITECTURAL

**Likely Issues:**
- Plugin registration violations (ADR-017)
- Missing plugin metadata
- Incorrect plugin export patterns
- Plugin interface mismatches

**Approach:**
1. Run workspace-plugin-validator to get baseline
2. Review ADR-017 for compliance requirements
3. Fix plugins that don't follow architecture
4. Ensure all functional modules have correct plugin structure
5. Re-validate

**Success Criteria:**
- [ ] All plugins follow ADR-017 architecture
- [ ] Plugin metadata complete and correct
- [ ] Plugin exports match interface contracts
- [ ] Baseline → <10 errors

---

#### 2.4 CORA Compliance Errors (Unknown) - FRAMEWORK

**Likely Issues:**
- Module structure violations
- Missing required files/exports
- Incorrect package.json configurations
- Template placeholder issues

**Approach:**
1. Run cora-compliance-validator for error list
2. Fix module structure issues
3. Ensure all required exports present
4. Verify package.json compliance
5. Re-validate

**Success Criteria:**
- [ ] All modules pass structure checks
- [ ] All required exports present
- [ ] Package configurations correct
- [ ] Baseline → <10 errors

---

#### 2.5 Auth Errors (Unknown) - SECURITY

**Likely Issues:**
- Missing auth checks on routes
- Incorrect role validation patterns
- Auth helper function violations (ADR-019)
- Centralized auth pattern violations

**Approach:**
1. Run auth-pattern-validator and lambda-auth-validator
2. Fix routes missing auth checks
3. Update to use standard helper functions (ADR-019)
4. Ensure centralized router auth pattern
5. Re-validate

**Success Criteria:**
- [ ] All admin routes have auth checks
- [ ] All use standard helper functions (isOrgAdmin, isSysAdmin, etc.)
- [ ] Centralized auth pattern followed
- [ ] Baseline → 0 errors

---

#### 2.6 Portability Errors (Unknown) - DEPLOYMENT

**Likely Issues:**
- Hardcoded project names
- Hardcoded AWS regions
- Missing template placeholders
- Environment-specific configurations

**Approach:**
1. Run portability-validator for error list
2. Replace hardcoded values with placeholders
3. Ensure environment variables used correctly
4. Verify templates portable across projects
5. Re-validate

**Success Criteria:**
- [ ] No hardcoded project names
- [ ] No hardcoded regions/credentials
- [ ] All templates use correct placeholders
- [ ] Baseline → 0 errors

---

## 📝 Implementation Plan

### Phase 0: Baseline Validation (30 min)

- [ ] Run full validation suite on admin-s7 test project
- [ ] Document current counts for all 6 categories
- [ ] Identify quick wins vs systematic fixes
- [ ] Prioritize work order

### Phase 1: Org Admin Feature (2-3 hours)

- [ ] Choose implementation approach (Option A or B)
- [ ] Update/create route for org admin org details
- [ ] Test all 5 tabs work for org admins
- [ ] Update navigation and breadcrumbs
- [ ] Sync to test project and verify
- [ ] Document pattern

### Phase 2: Schema Errors (3-4 hours)

- [ ] Run schema validator, categorize errors
- [ ] Fix table naming violations (ADR-011)
- [ ] Fix audit column issues (ADR-015)
- [ ] Fix RLS policy gaps
- [ ] Re-validate, target 80%+ reduction

### Phase 3: Accessibility Errors (2-3 hours)

- [ ] Run a11y validator, get error list
- [ ] Fix admin page accessibility
- [ ] Fix eval/voice component accessibility
- [ ] Fix form field labels and ARIA attributes
- [ ] Re-validate until zero errors

### Phase 4: Remaining Categories (4-5 hours)

- [ ] Workspace Plugin - architectural compliance
- [ ] CORA Compliance - framework standards
- [ ] Auth - security patterns
- [ ] Portability - deployment flexibility

### Phase 5: Final Validation (1 hour)

- [ ] Run full validation suite
- [ ] Document error reduction per category
- [ ] Calculate total error reduction
- [ ] Verify certification level improvement

---

## ✅ Success Criteria

**Feature Work:**
- [ ] Org admins have tabbed interface for organization management
- [ ] All 5 tabs functional (Overview, Domains, Members, Invites, AI Config)
- [ ] Navigation and breadcrumbs updated
- [ ] Authorization works correctly

**Error Remediation:**
- [ ] Schema: 94 → <15 errors (80%+ reduction)
- [ ] Accessibility: 58 → 0 errors (100% reduction)
- [ ] Workspace Plugin: Baseline → <10 errors
- [ ] CORA Compliance: Baseline → <10 errors
- [ ] Auth: Baseline → 0 errors
- [ ] Portability: Baseline → 0 errors

**Overall:**
- [ ] Total errors: 507 → <350 (30%+ reduction)
- [ ] Certification: Bronze → Silver path established
- [ ] Zero TypeScript compilation errors
- [ ] All changes synced to test project and verified

---

## 🚧 Key Safeguards

1. **Baseline First:** Run validation before starting fixes to establish current state
2. **One Category at a Time:** Complete one category before moving to next
3. **Test After Each Fix:** Verify fixes don't break existing functionality
4. **Document Patterns:** Update ADRs and standards as patterns emerge
5. **Template-First:** All fixes to templates, then sync to test projects

---

## 🔗 Related Resources

- [Context: Error Remediation](../memory-bank/context-error-remediation.md)
- [ADR-011: Table Naming Standards](../arch%20decisions/ADR-011-TABLE-NAMING-STANDARDS.md)
- [ADR-015: Module Entity Audit Columns](../arch%20decisions/ADR-015-MODULE-ENTITY-AUDIT-COLUMNS.md)
- [ADR-017: WS Plugin Architecture](../arch%20decisions/ADR-017-WS-PLUGIN-ARCHITECTURE.md)
- [ADR-019: Auth Standardization](../arch%20decisions/ADR-019-AUTH-STANDARDIZATION.md)
- [Guide: Sprint Management](../guides/guide_SPRINT-MANAGEMENT.md)

---

## 📝 Session Notes

*Sessions will be logged here as work progresses.*

---