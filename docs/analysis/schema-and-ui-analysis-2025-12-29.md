# Schema & UI Feature Analysis - December 29, 2025

## Executive Summary

This analysis investigates two critical areas:
1. **Schema SQL Issues**: References to non-existent tables and roles
2. **Lambda Warming UI Feature Gaps**: Missing features compared to legacy implementation

## 1. Schema SQL Issues

### 1.1 Wrong Table References: `profiles` vs `user_profiles`

**Context**: The table was renamed from `profiles` to `user_profiles` in December 2025 for standardization, but many schema files still reference the old table name.

**Impact**: RLS policies and queries will fail because the `profiles` table no longer exists.

#### Affected Files (9 schema files):

**module-ai schemas:**
1. `templates/_cora-core-modules/module-ai/db/schema/001-ai-providers.sql`
2. `templates/_cora-core-modules/module-ai/db/schema/002-ai-models.sql`
3. `templates/_cora-core-modules/module-ai/db/schema/003-ai-validation-history.sql`
4. `templates/_cora-core-modules/module-ai/db/schema/004-ai-validation-progress.sql`
5. `templates/_cora-core-modules/module-ai/db/schema/006-platform-rag.sql`
6. `templates/_cora-core-modules/module-ai/db/schema/007-org-prompt-engineering.sql`

**module-ai migrations:**
7. `templates/_cora-core-modules/module-ai/db/migrations/002-remove-org-id-make-platform-level.sql`
8. `templates/_cora-core-modules/module-ai/db/migrations/003-add-model-summary-view-and-validation-history.sql`
9. `templates/_cora-core-modules/module-ai/db/migrations/004-add-validation-progress-tracking.sql`

#### Example of Issue:

**Current (Broken):**
```sql
CREATE POLICY "ai_providers_admin_access" ON public.ai_providers
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles  -- ❌ Table doesn't exist
      WHERE profiles.user_id = auth.uid()
      AND profiles.global_role IN ('super_admin', 'global_owner', 'global_admin')
    )
  );
```

**Should Be:**
```sql
CREATE POLICY "ai_providers_admin_access" ON public.ai_providers
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles  -- ✅ Correct table name
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.global_role IN ('platform_owner', 'platform_admin', 'global_owner', 'global_admin')
    )
  );
```

### 1.2 Wrong Role References: `super_admin` Role Doesn't Exist

**Context**: The role `super_admin` doesn't exist in the system. The correct platform-level roles are `platform_owner` and `platform_admin`.

**Impact**: RLS policies will never grant access because the role check always fails.

#### Affected Files (Same 9 files as above):

All files that reference `profiles` also reference `super_admin` in role checks.

#### Example of Issue:

**Current (Broken):**
```sql
AND profiles.global_role = 'super_admin'::text  -- ❌ Role doesn't exist
```

**Should Be:**
```sql
AND user_profiles.global_role IN ('platform_owner', 'platform_admin')  -- ✅ Correct roles
```

#### Note on module-access Schemas:

Two module-access schema files DO include `super_admin` in their role lists but also include the correct roles:
- `templates/_cora-core-modules/module-access/db/schema/005-idp-config.sql`
- `templates/_cora-core-modules/module-access/db/schema/007-auth-events-sessions.sql`

These files use: `IN ('platform_owner', 'platform_admin', 'super_admin', 'global_owner', 'global_admin')`

**Analysis**: While not ideal, these won't break functionality because they also include the correct roles. However, `super_admin` should be removed for consistency.

### 1.3 Additional Table Reference Issues

**Context**: During table standardization in December 2025, several tables were renamed, but not all references were updated.

#### Issue #1: `org` vs `orgs`

**Correct Table Name**: `orgs` (plural)  
**Impact**: Scripts fail with table not found errors

**Affected Files** (3 files):
1. `templates/_cora-core-modules/module-access/db/clear-org-data.sql`
   - Uses `DELETE FROM public.org;` should be `DELETE FROM public.orgs;`

2. `templates/_cora-core-modules/module-access/db/reset-test-data.sql`
   - Uses `DELETE FROM org;` should be `DELETE FROM orgs;`
   - Uses `SELECT 'org', COUNT(*) FROM org` should be `SELECT 'orgs', COUNT(*) FROM orgs`

3. `templates/_cora-core-modules/module-access/db/reset-specific-test-user.sql`
   - Uses `DELETE FROM public.org WHERE...` should be `DELETE FROM public.orgs WHERE...`

#### Issue #2: `external_identities` vs `user_auth_ext_ids`

**Correct Table Name**: `user_auth_ext_ids` (renamed in Dec 2025)  
**Impact**: Scripts fail with table not found errors

**Affected Files** (2 files):
1. `templates/_cora-core-modules/module-access/db/reset-test-data.sql`
   - Uses `DELETE FROM external_identities;` should be `DELETE FROM user_auth_ext_ids;`
   - Uses `SELECT 'external_identities', COUNT(*) FROM external_identities` should be `SELECT 'user_auth_ext_ids', COUNT(*) FROM user_auth_ext_ids`

2. `templates/_cora-core-modules/module-access/db/reset-specific-test-user.sql`
   - Uses `DELETE FROM public.external_identities WHERE...` should be `DELETE FROM public.user_auth_ext_ids WHERE...`

#### Issue #3: `provider_model_deployments` (Non-Existent Table)

**Status**: Table does NOT exist in current schema  
**Impact**: CRITICAL - Migration will fail with constraint errors

**Affected Files** (1 file):
1. `templates/_cora-core-modules/module-ai/db/migrations/20251109_add_ai_config_fields.sql`
   - Multiple references to `REFERENCES public.provider_model_deployments(id)`
   - `SELECT 1 FROM public.provider_model_deployments WHERE...`

**Analysis**: This appears to be a legacy migration that references a table that was either:
- Never created in the new schema structure
- Renamed to something else
- Deprecated and removed

**Recommendation**: This migration file should either be:
- Updated to reference the correct table (if it was renamed)
- Removed if it's obsolete
- Modified to create the table first if it's still needed

### 1.4 Summary of Schema Issues

| Issue Type | Affected Files | Severity | Fix Required |
|------------|----------------|----------|-----------------|
| `profiles` → `user_profiles` | 9 files (module-ai) | **CRITICAL** | Yes - RLS policies fail |
| `super_admin` role | Same 9 files | **CRITICAL** | Yes - Access denied |
| `org` → `orgs` | 3 files (module-access) | **CRITICAL** | Yes - Scripts fail |
| `external_identities` → `user_auth_ext_ids` | 2 files (module-access) | **CRITICAL** | Yes - Scripts fail |
| `provider_model_deployments` (non-existent) | 1 file (module-ai migration) | **CRITICAL** | Yes - Migration fails |
| `super_admin` in role lists | 2 files (module-access) | **LOW** | Optional cleanup |

**Total Files Needing Fixes**: 15 critical, 2 optional

---

## 2. Lambda Warming UI Feature Comparison

### 2.1 Legacy pm-app-stack Features

**Location**: `policy/legacy/pm-app-stack/apps/web/app/admin/config/performance/`

#### Comprehensive Feature Set:

1. **Lambda Warming Toggle** ✅
   - Enable/disable warming with immediate feedback
   - Status chips showing enabled/disabled state

2. **Schedule Presets** ✅
   - Pre-configured schedules (business_hours, 24x7, weekends_only, custom)
   - One-click preset application
   - Automatic preset detection

3. **Timezone Selector** ✅
   - Full timezone support
   - Visual timezone display
   - Schedule adapts to selected timezone

4. **Weekly Schedule Configuration** ✅
   - Day-by-day schedule editing
   - Visual weekly schedule representation
   - Hours per week calculation

5. **Day Schedule Editor** ✅
   - Edit individual day schedules
   - Set start/end times per day
   - Apply schedule to multiple days at once
   - Visual time selection

6. **Cost Calculator** ✅
   - Real-time monthly cost estimation
   - Cost impact levels (low, moderate, high)
   - Color-coded cost indicators
   - Breakdown by hours/week and requests/month

7. **Lambda Functions List** ✅
   - Complete inventory of Lambda functions
   - Memory configuration (MB)
   - Timeout settings (seconds)
   - Runtime information
   - Last modified timestamps
   - Descriptions for each function

8. **Visual Components** ✅
   - Weekly schedule visualizer (heatmap/timeline)
   - Collapsible accordion sections
   - Expand/collapse all controls
   - Responsive design

#### Supporting Components:

- `CostCalculator.tsx` - Cost estimation logic
- `DayScheduleEditor.tsx` - Individual day editing modal
- `DayScheduleRow.tsx` - Day schedule row component
- `SchedulePresets.tsx` - Preset selector
- `TimezoneSelector.tsx` - Timezone dropdown
- `WeeklyScheduleVisualizer.tsx` - Visual schedule display
- `types/schedule.ts` - TypeScript type definitions
- `utils/costCalculation.ts` - Cost calculation utilities
- `utils/schedulePresets.ts` - Preset configurations

### 2.2 Current cora-dev-toolkit Features

**Location**: `bodhix/cora-dev-toolkit/templates/_cora-core-modules/module-mgmt/frontend/components/admin/`

#### Limited Feature Set:

1. **Lambda Warming Toggle** ✅
   - Enable/disable warming
   - Basic toggle with switch

2. **Basic Schedule Input** ✅
   - Single text field for EventBridge expression
   - Examples: `rate(5 minutes)` or `cron(0/5 * * * ? *)`
   - No visual schedule representation

3. **Concurrency Setting** ✅
   - Number input for concurrency (1-10)
   - Simple validation

4. **Performance Tab** ❌ PLACEHOLDER
   - Future placeholder only
   - No actual implementation

5. **Cost Tab** ❌ PLACEHOLDER
   - Future placeholder only
   - No actual implementation

6. **Lambda Functions List** ❌ NOT IMPLEMENTED
   - No inventory of Lambda functions
   - No memory/timeout/runtime display
   - No function management

### 2.3 Feature Gap Analysis

| Feature | Legacy | Current | Status | Priority |
|---------|--------|---------|--------|----------|
| Warming Toggle | ✅ | ✅ | **Implemented** | - |
| Schedule Presets | ✅ | ❌ | **MISSING** | HIGH |
| Timezone Selector | ✅ | ❌ | **MISSING** | HIGH |
| Weekly Schedule Editor | ✅ | ❌ | **MISSING** | HIGH |
| Day Schedule Editor | ✅ | ❌ | **MISSING** | MEDIUM |
| Visual Schedule Display | ✅ | ❌ | **MISSING** | MEDIUM |
| Cost Calculator | ✅ | ❌ | **MISSING** | HIGH |
| Lambda Functions List | ✅ | ❌ | **MISSING** | HIGH |
| Basic Schedule Input | ❌ | ✅ | **Current Only** | - |
| Concurrency Setting | ✅ | ✅ | **Implemented** | - |

### 2.4 User State Comparison

**Legacy Implementation:**
- User can set different schedules for each day of the week
- User can see visual representation of when warming occurs
- User can calculate exact monthly costs
- User can view all Lambda functions and their configurations
- User can select timezone for schedule interpretation

**Current Implementation:**
- User can only enter raw EventBridge expression
- User has no visual feedback on schedule
- User has no cost estimation
- User cannot see Lambda function inventory
- User has no timezone control (defaults to UTC)

**Impact**: Platform admins lose significant functionality for managing Lambda warming schedules compared to the legacy system.

---

## 3. Fix Plans

### 3.1 Schema SQL Fixes (CRITICAL - Should Fix Immediately)

**Priority**: CRITICAL  
**Complexity**: LOW  
**Risk**: LOW (straightforward find/replace)  
**Estimated Effort**: 30 minutes

#### Fix Approach:

**Option 1: Fix in Current Session** ✅ RECOMMENDED
- Simple find/replace operation
- Low risk of breaking existing functionality
- Can be validated quickly with schema validator
- All fixes in template files (template-first workflow)

**Option 2: Defer to New Session**
- Only if current session is focused on other critical work
- Should not wait more than 1 day due to RLS policy failures

#### Files to Fix:

**Step 1: Fix module-ai schemas** (6 files)
```bash
# Find/replace in these files:
- templates/_cora-core-modules/module-ai/db/schema/001-ai-providers.sql
- templates/_cora-core-modules/module-ai/db/schema/002-ai-models.sql
- templates/_cora-core-modules/module-ai/db/schema/003-ai-validation-history.sql
- templates/_cora-core-modules/module-ai/db/schema/004-ai-validation-progress.sql
- templates/_cora-core-modules/module-ai/db/schema/006-platform-rag.sql
- templates/_cora-core-modules/module-ai/db/schema/007-org-prompt-engineering.sql

# Changes:
1. Replace: FROM public.profiles → FROM public.user_profiles
2. Replace: profiles.user_id → user_profiles.user_id
3. Replace: profiles.global_role → user_profiles.global_role
4. Replace: 'super_admin' → Remove from role lists or use correct roles
5. Update comments that reference super_admin
```

**Step 2: Fix module-ai migrations** (3 files)
```bash
# Same changes for:
- templates/_cora-core-modules/module-ai/db/migrations/002-remove-org-id-make-platform-level.sql
- templates/_cora-core-modules/module-ai/db/migrations/003-add-model-summary-view-and-validation-history.sql
- templates/_cora-core-modules/module-ai/db/migrations/004-add-validation-progress-tracking.sql
```

**Step 3: Fix module-access reset scripts - org vs orgs** (3 files)
```bash
# Fix in these files:
- templates/_cora-core-modules/module-access/db/clear-org-data.sql
- templates/_cora-core-modules/module-access/db/reset-test-data.sql
- templates/_cora-core-modules/module-access/db/reset-specific-test-user.sql

# Changes:
1. Replace: DELETE FROM public.org → DELETE FROM public.orgs
2. Replace: DELETE FROM org → DELETE FROM orgs
3. Replace: FROM org → FROM orgs
4. Replace: SELECT 'org', COUNT(*) FROM org → SELECT 'orgs', COUNT(*) FROM orgs
```

**Step 4: Fix module-access reset scripts - external_identities vs user_auth_ext_ids** (2 files)
```bash
# Fix in these files:
- templates/_cora-core-modules/module-access/db/reset-test-data.sql
- templates/_cora-core-modules/module-access/db/reset-specific-test-user.sql

# Changes:
1. Replace: DELETE FROM external_identities → DELETE FROM user_auth_ext_ids
2. Replace: DELETE FROM public.external_identities → DELETE FROM public.user_auth_ext_ids
3. Replace: FROM external_identities → FROM user_auth_ext_ids
4. Replace: SELECT 'external_identities', COUNT(*) FROM external_identities → SELECT 'user_auth_ext_ids', COUNT(*) FROM user_auth_ext_ids
```

**Step 5: Fix or remove provider_model_deployments migration** (1 file)
```bash
# File:
- templates/_cora-core-modules/module-ai/db/migrations/20251109_add_ai_config_fields.sql

# Options:
A. Remove the migration entirely if it's obsolete
B. Update to reference correct table if it was renamed
C. Comment out the problematic sections with explanation

# Recommended: INVESTIGATE FIRST
# - Check legacy pm-app-stack for this table
# - Determine if feature is still needed
# - If needed, create the table first
# - If obsolete, remove migration file
```

**Step 6: Optional cleanup** (2 files)
```bash
# Remove 'super_admin' from role lists:
- templates/_cora-core-modules/module-access/db/schema/005-idp-config.sql
- templates/_cora-core-modules/module-access/db/schema/007-auth-events-sessions.sql

# Change:
IN ('platform_owner', 'platform_admin', 'super_admin', 'global_owner', 'global_admin')
# To:
IN ('platform_owner', 'platform_admin', 'global_owner', 'global_admin')
```

#### Validation:

```bash
# Run schema validator to confirm fixes:
cd bodhix/cora-dev-toolkit
python validation/cora-validate.py --validators schema
```

### 3.2 Lambda Warming UI Enhancement (MEDIUM - Plan for Future Session)

**Priority**: MEDIUM  
**Complexity**: HIGH  
**Risk**: MEDIUM (significant UI/UX changes)  
**Estimated Effort**: 4-8 hours

#### Fix Approach:

**Recommendation: NEW SESSION** ✅

**Rationale**:
1. Significant frontend development required
2. Multiple new components to create
3. New backend API endpoints may be needed
4. Requires thorough testing and UX validation
5. Should follow template-first workflow
6. May require database schema changes for storing weekly schedules

#### Implementation Plan:

**Phase 1: Data Model Enhancement** (1-2 hours)
- Add weekly_schedule column to platform_lambda_config
- Add timezone column
- Add preset column
- Update API to handle new fields
- Create migration script

**Phase 2: Core Components** (2-3 hours)
- Port SchedulePresets component
- Port TimezoneSelector component
- Port WeeklyScheduleVisualizer component
- Port DayScheduleEditor component
- Create TypeScript types (schedule.ts)

**Phase 3: Utility Functions** (1 hour)
- Port costCalculation.ts
- Port schedulePresets.ts
- Add preset detection logic
- Add schedule validation

**Phase 4: Integration** (1-2 hours)
- Update ScheduleTab to use new components
- Add accordion layout like legacy
- Integrate cost calculator
- Add Lambda functions list
- Test all features

**Phase 5: Backend API** (1-2 hours)
- Add Lambda functions list endpoint
- Update config endpoints for new fields
- Add validation for weekly schedules
- Test API responses

#### Dependencies:

1. **Backend API**:
   - `GET /platform/lambda-functions` - List all Lambda functions
   - `PUT /platform/lambda-config/{key}` - Must support weekly_schedule, timezone, preset

2. **Database Schema**:
   - `platform_lambda_config.config_value` must store:
     - `weekly_schedule` (JSON object)
     - `timezone` (string)
     - `preset` (string)
     - `interval_minutes` (number)

3. **Frontend Libraries**:
   - All MUI components already available
   - No additional dependencies needed

#### Files to Create/Modify:

**New Files** (7 files):
```
templates/_cora-core-modules/module-mgmt/frontend/components/admin/
├── performance/
│   ├── CostCalculator.tsx
│   ├── DayScheduleEditor.tsx
│   ├── DayScheduleRow.tsx
│   ├── SchedulePresets.tsx
│   ├── TimezoneSelector.tsx
│   └── WeeklyScheduleVisualizer.tsx
└── types/
    └── schedule.ts

templates/_cora-core-modules/module-mgmt/frontend/utils/
├── costCalculation.ts
└── schedulePresets.ts
```

**Modified Files** (3 files):
```
templates/_cora-core-modules/module-mgmt/frontend/components/admin/
├── ScheduleTab.tsx (major refactor)
├── CostTab.tsx (implement instead of placeholder)
└── PerformanceTab.tsx (optional - Lambda functions list)

templates/_cora-core-modules/module-mgmt/frontend/hooks/
└── useLambdaWarming.ts (update for new fields)

templates/_cora-core-modules/module-mgmt/backend/
└── routes/platform.py (add Lambda functions endpoint)
```

#### Migration Strategy:

**Option A: Big Bang** ❌ NOT RECOMMENDED
- Replace entire ScheduleTab at once
- High risk of breaking existing functionality
- Difficult to test incrementally

**Option B: Incremental** ✅ RECOMMENDED
1. Add new fields to database (backward compatible)
2. Create new components without removing old ones
3. Add feature flags to toggle between old/new UI
4. Test new UI thoroughly
5. Remove old UI after validation
6. Clean up feature flags

---

## 4. Recommendations

### 4.1 Immediate Actions (Current Session)

1. **Fix Schema SQL Issues** ✅ DO NOW
   - Critical bugs affecting RLS policies
   - Low risk, high impact
   - Quick to fix and validate
   - Prevents access control failures

2. **Document Findings** ✅ DONE
   - This analysis document created
   - Provides context for future work

### 4.2 Future Session Actions

1. **Lambda Warming UI Enhancement** 📋 PLAN FOR NEW SESSION
   - Create detailed implementation plan
   - Estimate timeline and resources
   - Consider phased approach
   - Schedule UX review

2. **Schema Standardization Audit** 📋 FUTURE
   - Check other modules for similar issues
   - Create validation rules to prevent recurrence
   - Update documentation on naming standards

---

## 5. Testing Plan

### 5.1 Schema Fix Validation

**After fixing schema files:**

1. **Schema Validator**:
   ```bash
   python validation/cora-validate.py --validators schema
   ```

2. **Database Migration Test**:
   ```bash
   # Deploy to test environment
   cd sts/test13/ai-sec-infra
   ./scripts/run-database-migrations.sh
   ```

3. **RLS Policy Test**:
   - Login as platform_owner
   - Access `/admin/ai-providers` page
   - Verify data loads successfully
   - Check browser console for errors

### 5.2 UI Enhancement Validation (Future)

**After implementing new features:**

1. **Unit Tests**:
   - Test cost calculation functions
   - Test preset detection logic
   - Test schedule validation

2. **Integration Tests**:
   - Test API endpoints
   - Test component integration
   - Test state management

3. **E2E Tests**:
   - Test full user workflow
   - Test preset selection
   - Test schedule editing
   - Test cost calculator

4. **Manual Testing**:
   - Test on different screen sizes
   - Test with different timezones
   - Test edge cases (invalid schedules, etc.)
   - Compare UX with legacy implementation

---

## 6. Risk Assessment

### 6.1 Schema Fixes

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing queries | LOW | HIGH | Run schema validator, test in dev |
| Missing some references | LOW | MEDIUM | Use comprehensive grep search |
| Migration failures | LOW | HIGH | Test migrations in test13 first |

### 6.2 UI Enhancements

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing UI | MEDIUM | HIGH | Use feature flags, incremental rollout |
| Backend API changes needed | HIGH | MEDIUM | Plan API changes first, version endpoints |
| Performance issues | LOW | MEDIUM | Test with large datasets, optimize rendering |
| UX confusion | MEDIUM | MEDIUM | User testing, compare with legacy |

---

## 7. Success Criteria

### 7.1 Schema Fixes

- ✅ All 9 schema files reference `user_profiles` instead of `profiles`
- ✅ All 9 schema files use correct roles (remove `super_admin`)
- ✅ Schema validator passes with zero errors
- ✅ RLS policies grant access to platform_owner/platform_admin users
- ✅ Database migrations run successfully in test13

### 7.2 UI Enhancements (Future)

- ✅ Users can select schedule presets with one click
- ✅ Users can choose timezone for schedules
- ✅ Users can edit weekly schedules day-by-day
- ✅ Users see visual representation of warming schedule
- ✅ Users see estimated monthly costs
- ✅ Users can view complete Lambda functions inventory
- ✅ All features work on desktop and mobile
- ✅ Feature parity with legacy pm-app-stack implementation

---

## 8. Conclusion

### Critical Issues Identified:

1. **Schema SQL Bugs** (CRITICAL)
   - 9 files with broken RLS policies
   - Access control failures for AI module features
   - **Fix immediately in current session**

2. **UI Feature Gaps** (MEDIUM)
   - Missing 6+ major features from legacy implementation
   - Reduced functionality for platform admins
   - **Plan for dedicated future session**

### Next Steps:

**Current Session:**
1. Fix all schema SQL issues (profiles → user_profiles, remove super_admin)
2. Validate with schema validator
3. Update activeContext.md with findings

**Future Session:**
1. Create detailed UI enhancement plan
2. Implement missing Lambda warming features
3. Achieve feature parity with legacy system

---

**Document Status**: COMPLETE  
**Created**: December 29, 2025, 12:00 PM EST  
**Author**: AI Analysis (Cline Task Session)  
**Review Status**: Pending User Review
