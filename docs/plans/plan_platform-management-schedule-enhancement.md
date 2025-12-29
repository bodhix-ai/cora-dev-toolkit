# Platform Management Schedule Enhancement Plan

**Created:** December 29, 2025  
**Status:** IN PROGRESS  
**Priority:** HIGH

## Executive Summary

Enhance the Lambda warming schedule management in `module-mgmt` to achieve feature parity with the legacy `pm-app-stack` implementation. This includes visual schedule management, cost estimation, preset configurations, and Lambda inventory display.

---

## Current Status (As of 3:49 PM EST)

### ✅ Completed (Phase 1 & Phase 2 - Partial)

**Phase 1: Foundation** - **COMPLETE**
- ✅ Created `utils/schedulePresets.ts` - Preset definitions and schedule utilities
- ✅ Created `utils/costCalculation.ts` - Cost estimation logic
- ✅ Created `hooks/useLambdaFunctions.ts` - Lambda inventory fetching hook

**Phase 2: Core Components** - **3 of 5 COMPLETE**
- ✅ Created `components/admin/schedule/SchedulePresets.tsx` - Preset selector
- ✅ Created `components/admin/schedule/TimezoneSelector.tsx` - Timezone dropdown
- ✅ Created `components/admin/schedule/CostCalculator.tsx` - Cost display
- ⏳ **PENDING:** `components/admin/schedule/WeeklyScheduleVisualizer.tsx`
- ⏳ **PENDING:** `components/admin/schedule/DayScheduleEditor.tsx`

### ⏳ Remaining Work

**Phase 2: Core Components** (Remaining)
- [ ] Port `WeeklyScheduleVisualizer.tsx` - Visual weekly schedule display
- [ ] Port `DayScheduleEditor.tsx` - Modal for editing day schedules

**Phase 3: Integration & Layout**
- [ ] Refactor `ScheduleTab.tsx` to use new components and weekly schedule
- [ ] Add breadcrumb navigation to all admin pages
- [ ] Implement accordion layout with expand/collapse controls
- [ ] Update `CostTab.tsx` with actual cost calculator
- [ ] Update `PerformanceTab.tsx` with Lambda inventory table

**Phase 4: Backend API**
- [ ] Verify `GET /platform/lambda-functions` endpoint exists
- [ ] Test `PUT /platform/lambda-config/{key}` supports weekly_schedule data

**Phase 5: Testing & Validation**
- [ ] Test all schedule presets
- [ ] Test timezone changes
- [ ] Test day schedule editing
- [ ] Verify cost calculations
- [ ] Test Lambda inventory display

---

## Feature Comparison

| Feature | Legacy pm-app-stack | Current cora-dev-toolkit | Status |
|---------|---------------------|--------------------------|--------|
| Toggle On/Off | ✅ | ✅ | **IMPLEMENTED** |
| Schedule Presets | ✅ | ⏳ | **IN PROGRESS** |
| Timezone Selector | ✅ | ⏳ | **IN PROGRESS** |
| Weekly Schedule Editor | ✅ | ❌ | **PENDING** |
| Day Schedule Editor | ✅ | ❌ | **PENDING** |
| Visual Schedule Display | ✅ | ❌ | **PENDING** |
| Cost Calculator | ✅ | ⏳ | **IN PROGRESS** |
| Lambda Functions Inventory | ✅ | ❌ | **PENDING** |
| Breadcrumb Navigation | ✅ | ❌ | **PENDING** |
| Accordion Layout | ✅ | ❌ | **PENDING** |

---

## Files Created (8 files)

### Utilities (2 files)
1. `templates/_cora-core-modules/module-mgmt/frontend/utils/schedulePresets.ts`
   - Preset definitions (Business Hours, 24/7, Off, Custom)
   - Schedule manipulation utilities
   - Time validation functions
   - Weekly hours calculation

2. `templates/_cora-core-modules/module-mgmt/frontend/utils/costCalculation.ts`
   - AWS pricing constants
   - Monthly cost calculation
   - Cost impact level determination
   - Cost formatting utilities

### Hooks (1 file)
3. `templates/_cora-core-modules/module-mgmt/frontend/hooks/useLambdaFunctions.ts`
   - Fetches Lambda functions inventory from API
   - Returns function details (memory, timeout, runtime)
   - Includes loading and error states

### Components (5 files)
4. `templates/_cora-core-modules/module-mgmt/frontend/components/admin/schedule/SchedulePresets.tsx`
   - Toggle button group for preset selection
   - Visual icons and descriptions
   - Custom/Off preset warnings

5. `templates/_cora-core-modules/module-mgmt/frontend/components/admin/schedule/TimezoneSelector.tsx`
   - Dropdown for timezone selection
   - Common US and international timezones
   - Helper text explaining timezone usage

6. `templates/_cora-core-modules/module-mgmt/frontend/components/admin/schedule/CostCalculator.tsx`
   - Monthly cost estimate display
   - Cost breakdown (Lambda, EventBridge, CloudWatch)
   - Usage statistics (invocations, hours/week)
   - Annual projection
   - Cost optimization tips

---

## Files to Create (2 files)

### Complex Components

7. **`components/admin/schedule/WeeklyScheduleVisualizer.tsx`** (PENDING)
   - Visual representation of weekly schedule
   - Shows enabled/disabled days
   - Displays time ranges per day
   - Click to edit functionality
   - Source: `policy/legacy/pm-app-stack/apps/web/app/admin/config/performance/components/WeeklyScheduleVisualizer.tsx`

8. **`components/admin/schedule/DayScheduleEditor.tsx`** (PENDING)
   - Modal dialog for editing day schedules
   - Time range picker (start/end times)
   - Multi-day application (apply to multiple days)
   - Add/remove time ranges
   - Source: `policy/legacy/pm-app-stack/apps/web/app/admin/config/performance/components/DayScheduleEditor.tsx`

---

## Files to Modify (5 files)

### Integration Files

1. **`components/admin/ScheduleTab.tsx`** (MAJOR REFACTOR)
   - Replace basic EventBridge input with visual schedule components
   - Integrate SchedulePresets component
   - Integrate TimezoneSelector component
   - Integrate WeeklyScheduleVisualizer component
   - Integrate DayScheduleEditor component
   - Use weekly_schedule from LambdaWarmingConfig
   - Add unsaved changes detection
   - Implement accordion layout

2. **`components/admin/PlatformMgmtAdmin.tsx`** (ADD BREADCRUMBS)
   - Add breadcrumb navigation at top
   - Format: Admin Dashboard > Platform Management

3. **`components/admin/CostTab.tsx`** (REPLACE PLACEHOLDER)
   - Remove placeholder content
   - Use CostCalculator component
   - Display cost estimate based on current schedule

4. **`components/admin/PerformanceTab.tsx`** (ADD LAMBDA INVENTORY)
   - Use useLambdaFunctions hook
   - Display Lambda functions table
   - Show memory, timeout, runtime, last modified
   - Include function descriptions

5. **Other Admin Pages** (ADD BREADCRUMBS)
   - Add breadcrumb navigation to all admin pages
   - Consistent navigation experience

---

## Data Model (Already Exists!)

The data types are already defined in `module-mgmt/frontend/types/index.ts`:

```typescript
interface LambdaWarmingConfig {
  enabled: boolean;
  timezone: string;
  interval_minutes: number;
  weekly_schedule: WeeklySchedule;  // ✅ Already defined!
  lambda_functions: string[];
  preset?: string;  // ✅ Already defined!
}

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface DaySchedule {
  enabled: boolean;
  ranges: TimeRange[];
}

interface TimeRange {
  start: string;  // HH:MM format
  end: string;    // HH:MM format
}
```

**Note:** The current implementation only uses `schedule` (EventBridge expression) and `concurrency`. The `weekly_schedule` field exists in the type definition but is not being used by the current UI. The enhancement will make use of this field.

---

## Implementation Notes

### Key Changes from Legacy

1. **Import Paths**: Updated to use cora-dev-toolkit structure
   - `from "../types/schedule"` → `from "../../../types"`
   - `from "../utils/schedulePresets"` → `from "../../../utils/schedulePresets"`

2. **Hook Pattern**: Using CORA auth adapter pattern
   - `const { authAdapter } = useUser();`
   - `useLambdaWarming(authAdapter)`
   - `useLambdaFunctions(authAdapter)`

3. **API Client**: Using CORA authenticated client
   - Already implemented in `lib/api.ts`
   - `listLambdaFunctions()` method exists
   - `updateWarmingConfig()` method exists

### Backward Compatibility

The enhancement maintains backward compatibility:
- Existing `schedule` and `concurrency` fields still work
- New `weekly_schedule` field is optional
- If `weekly_schedule` is not set, defaults to business hours preset
- Preset detection automatically identifies matching presets

---

## Testing Plan

### Unit Tests
- [ ] Test schedule preset detection
- [ ] Test cost calculations with different schedules
- [ ] Test time validation functions
- [ ] Test weekly hours calculation

### Integration Tests
- [ ] Test preset selection updates schedule
- [ ] Test timezone change updates all times
- [ ] Test day editing saves correctly
- [ ] Test cost calculator updates with schedule changes
- [ ] Test Lambda inventory loads successfully

### E2E Tests
- [ ] Test complete workflow: preset → custom → save
- [ ] Test breadcrumb navigation
- [ ] Test accordion expand/collapse
- [ ] Test responsive design on mobile

---

## Estimated Completion Time

**Total Original Estimate:** 6-9 hours

**Completed So Far:** ~2 hours (Phase 1 + 60% of Phase 2)

**Remaining:**
- Phase 2 (40%): 1-2 hours
- Phase 3: 2 hours
- Phase 4: 0.5 hours (likely already exists)
- Phase 5: 1 hour

**Total Remaining:** ~4-5 hours

---

## Next Steps

1. **Complete Phase 2** - Port remaining components:
   - WeeklyScheduleVisualizer.tsx
   - DayScheduleEditor.tsx

2. **Begin Phase 3** - Integration:
   - Refactor ScheduleTab.tsx to use new components
   - Add breadcrumb navigation

3. **Test & Validate** - Ensure all features work correctly

---

## References

**Legacy Implementation:**
- `policy/legacy/pm-app-stack/apps/web/app/admin/config/performance/`

**Current Implementation:**
- `bodhix/cora-dev-toolkit/templates/_cora-core-modules/module-mgmt/frontend/`

**Documentation:**
- `bodhix/cora-dev-toolkit/docs/analysis/schema-and-ui-analysis-2025-12-29.md`

---

**Status:** Ready for continuation after user review  
**Last Updated:** December 29, 2025, 3:49 PM EST
