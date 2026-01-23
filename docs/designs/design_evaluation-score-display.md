# Evaluation Score Display Design

**Date:** January 22, 2026  
**Status:** Draft - Awaiting Review  
**Context:** UI Enhancements Phase 2 - Issue A2 Revised  
**Related Plan:** `docs/plans/plan_ui-enhancements-p2.md`

---

## Overview

This document specifies the design for displaying evaluation scores (overall document evaluation score and individual criteria scores) with configuration-based customization. The score display adapts based on system/org-level configuration:

**Base Display (Always Shown):**
- **Status chip with name/color** (e.g., "Compliant", "Fully Compliant") - always displayed

**Additional Display (When Enabled):**
- **Numerical score chip** (e.g., "85%") - added when `show_decimal_score` is `true`

**Scoring Modes:**
- **Boolean scoring** - Simple pass/fail (e.g., "Compliant", "Non-Compliant")
- **Detailed scoring** - Multi-level granularity (e.g., "Fully Compliant", "Partially Compliant", "Non-Compliant")

---

## Configuration Schema

### System-Level Configuration

**Table:** `eval_sys_cfg`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `categorical_mode` | VARCHAR(20) | Scoring mode: `"boolean"` or `"detailed"` |
| `show_decimal_score` | BOOLEAN | If `true`, show numerical score; if `false`, show status chip only |
| `created_at` | TIMESTAMPTZ | Timestamp |
| `updated_at` | TIMESTAMPTZ | Timestamp |

**Example:**
```sql
INSERT INTO eval_sys_cfg (categorical_mode, show_decimal_score)
VALUES ('detailed', true);
```

### Organization-Level Configuration

**Table:** `eval_org_cfg`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `org_id` | UUID | References `orgs.id` |
| `categorical_mode` | VARCHAR(20) | Overrides system mode if set |
| `show_decimal_score` | BOOLEAN | Overrides system setting if set |
| `created_at` | TIMESTAMPTZ | Timestamp |
| `updated_at` | TIMESTAMPTZ | Timestamp |

**Example:**
```sql
INSERT INTO eval_org_cfg (org_id, categorical_mode, show_decimal_score)
VALUES ('org-uuid-here', 'boolean', false);
```

### System-Level Status Options

**Table:** `eval_sys_status_options`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `categorical_mode` | VARCHAR(20) | Applies to: `"boolean"` or `"detailed"` |
| `name` | VARCHAR(100) | Display name (e.g., "Compliant", "Partially Compliant") |
| `color` | VARCHAR(50) | MUI color (e.g., "success", "warning", "error") |
| `score_value` | DECIMAL(5,2) | Minimum score threshold (0-100) |
| `sort_order` | INTEGER | Display order |
| `created_at` | TIMESTAMPTZ | Timestamp |
| `updated_at` | TIMESTAMPTZ | Timestamp |

**Example - Boolean Mode:**
```sql
INSERT INTO eval_sys_status_options (categorical_mode, name, color, score_value, sort_order)
VALUES 
  ('boolean', 'Compliant', 'success', 80.00, 1),
  ('boolean', 'Non-Compliant', 'error', 0.00, 2);
```

**Example - Detailed Mode:**
```sql
INSERT INTO eval_sys_status_options (categorical_mode, name, color, score_value, sort_order)
VALUES 
  ('detailed', 'Fully Compliant', 'success', 90.00, 1),
  ('detailed', 'Largely Compliant', 'info', 80.00, 2),
  ('detailed', 'Partially Compliant', 'warning', 60.00, 3),
  ('detailed', 'Non-Compliant', 'error', 0.00, 4);
```

### Organization-Level Status Options

**Table:** `eval_org_status_options`

Same schema as `eval_sys_status_options`, with additional `org_id` column.

**Purpose:** Allows orgs to customize status names, colors, and thresholds.

---

## Configuration Precedence Rules

### Rule 1: Org Config Overrides System Config

```
Effective Config = eval_org_cfg ?? eval_sys_cfg
```

**Logic:**
- If `eval_org_cfg.show_decimal_score` is set (not null), use it
- Otherwise, fall back to `eval_sys_cfg.show_decimal_score`
- Same logic applies to `categorical_mode`

**Pseudocode:**
```typescript
function getEffectiveConfig(orgId: string): EvalConfig {
  const sysConfig = getSystemConfig();
  const orgConfig = getOrgConfig(orgId);
  
  return {
    categoricalMode: orgConfig?.categoricalMode ?? sysConfig.categoricalMode,
    showDecimalScore: orgConfig?.showDecimalScore ?? sysConfig.showDecimalScore,
  };
}
```

### Rule 2: Status Options Follow Same Precedence

```
Effective Status Options = eval_org_status_options ?? eval_sys_status_options
```

**Logic:**
- If org has custom status options for the current `categorical_mode`, use them
- Otherwise, fall back to system status options

**Pseudocode:**
```typescript
function getEffectiveStatusOptions(orgId: string, categoricalMode: 'boolean' | 'detailed'): StatusOption[] {
  const orgOptions = getOrgStatusOptions(orgId, categoricalMode);
  
  if (orgOptions.length > 0) {
    return orgOptions;
  }
  
  return getSystemStatusOptions(categoricalMode);
}
```

---

## Score-to-Status Mapping Logic

### Overall Document Evaluation Score

**Source:** `eval_doc_summaries.compliance_score` (0-100)

**Mapping Algorithm:**
```typescript
function getStatusForScore(score: number, statusOptions: StatusOption[]): StatusOption {
  // Sort status options by score_value DESC
  const sorted = [...statusOptions].sort((a, b) => b.scoreValue - a.scoreValue);
  
  // Find first option where score >= scoreValue
  for (const option of sorted) {
    if (score >= option.scoreValue) {
      return option;
    }
  }
  
  // Fallback to lowest option (should never happen if data is correct)
  return sorted[sorted.length - 1];
}
```

**Example - Detailed Mode:**
- Score: 92% → "Fully Compliant" (green) because 92 >= 90
- Score: 85% → "Largely Compliant" (blue) because 85 >= 80 but < 90
- Score: 65% → "Partially Compliant" (yellow) because 65 >= 60 but < 80
- Score: 45% → "Non-Compliant" (red) because 45 >= 0 but < 60

**Example - Boolean Mode:**
- Score: 85% → "Compliant" (green) because 85 >= 80
- Score: 65% → "Non-Compliant" (red) because 65 < 80

### Individual Criteria Evaluation Score

**Source:** `eval_criteria_results.ai_score_value` (0-100)

**Same mapping logic** as overall document score, but applied to individual criteria.

---

## Display Variations

### Base Display (Always Shown)

**Status Name/Color Chip** - Always displayed regardless of `show_decimal_score` setting

**Display Format:**
- Chip showing status name (e.g., "Compliant", "Partially Compliant", "Fully Compliant")
- Color based on status option
- Always present as the primary indicator

**Visual Mockup:**
```
┌──────────────────────┐
│  Fully Compliant  │  (Green background, white text)
└──────────────────────┘
```

**Size Constraint:**
- Height: 56-64px (matches combined height of "Evaluation Results" header + status chip)
- Width: Adjusts to text content

**MUI Component:**
```tsx
<Chip
  label={statusOption.name}
  color={statusOption.color as "success" | "warning" | "error" | "info"}
  size="large"
  sx={{
    height: '56px',
    fontSize: '1.125rem',
    fontWeight: 'medium',
    paddingX: 3,
  }}
/>
```

### Additional Display (show_decimal_score = true)

**Numerical Score Chip** - Displayed **in addition to** the status chip when `show_decimal_score = true`

**Display Format:**
- Additional chip with percentage (e.g., "85%")
- Same color as status chip
- Positioned to the right of the status chip

**Visual Mockup (Both Chips Together):**
```
┌──────────────────────┐  ┌──────────────┐
│  Fully Compliant  │  │     92%     │  (Both green, side by side)
└──────────────────────┘  └──────────────┘
```

**Size Constraint:**
- Same height as status chip (56-64px)
- Minimum width: 80px
- Gap between chips: 12px

**MUI Component (Combined):**
```tsx
<Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
  {/* Status name chip - ALWAYS shown */}
  <Chip
    label={statusOption.name}
    color={statusOption.color as "success" | "warning" | "error" | "info"}
    size="large"
    sx={{
      height: '56px',
      fontSize: '1.125rem',
      fontWeight: 'medium',
      paddingX: 3,
    }}
  />
  
  {/* Numerical score chip - shown when show_decimal_score = true */}
  {config.showDecimalScore && (
    <Chip
      label={`${score.toFixed(0)}%`}
      color={statusOption.color as "success" | "warning" | "error" | "info"}
      size="large"
      sx={{
        height: '56px',
        fontSize: '1.5rem',
        fontWeight: 'bold',
        minWidth: '80px',
      }}
    />
  )}
</Box>
```

---

## Positioning in UI

### Overall Evaluation Score (Header Area)

**Location:** Evaluation Detail Page - Header section

**Layout (show_decimal_score = false):**
```
┌──────────────────────────────────────────────────────────────────┐
│  Evaluation Results                                              │
│  [Processing ▼]                    [Fully Compliant]            │
│                                     ^^^^^^^^^^^^^^^^             │
│                                  Overall Score Display           │
└──────────────────────────────────────────────────────────────────┘
```

**Layout (show_decimal_score = true):**
```
┌──────────────────────────────────────────────────────────────────┐
│  Evaluation Results                                              │
│  [Processing ▼]                [Fully Compliant]  [92%]         │
│                                 ^^^^^^^^^^^^^^^^  ^^^^^          │
│                                   Status Chip   + Score Chip     │
└──────────────────────────────────────────────────────────────────┘
```

**Positioning Rules:**
- Placed to the right of the status chip ("Processing", "Complete", etc.)
- Vertically centered with "Evaluation Results" header
- Height matches combined height of header + status chip
- Gap of 24px between status chip and score display

**Implementation:**
```tsx
<Box sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}>
  <Box>
    <Typography variant="h4">Evaluation Results</Typography>
    <Chip label="Complete" color="success" size="small" />
  </Box>
  
  {/* Compliance score display */}
  {evaluation.complianceScore != null && status === "completed" && (
    <Box sx={{ mt: -1 }}>
      <ComplianceScoreChip 
        score={evaluation.complianceScore}
        config={effectiveConfig}
        statusOptions={effectiveStatusOptions}
      />
    </Box>
  )}
</Box>
```

### Individual Criteria Scores (Results Tab)

**Location:** Evaluation Detail Page - Results Tab - Individual result cards

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Criteria 5.4.2: Personnel Screening                           │
│  [85%] or [Compliant]  ← Individual criteria score            │
│                                                                 │
│  Question: Are background checks conducted...                   │
│  Answer: Yes, fingerprint-based FBI checks...                   │
└─────────────────────────────────────────────────────────────────┘
```

**Size:** Standard chip size (32-40px height) for individual criteria

---

## API Requirements

### Backend Changes

**1. Include Configuration in Evaluation API Response**

**Endpoint:** `GET /evaluations/:id`

**Current Response:**
```json
{
  "id": "eval-uuid",
  "name": "Access Control Policy - 01/22/2026",
  "status": "completed",
  "complianceScore": 85.2,
  "criteriaResults": [...]
}
```

**Enhanced Response:**
```json
{
  "id": "eval-uuid",
  "name": "Access Control Policy - 01/22/2026",
  "status": "completed",
  "complianceScore": 85.2,
  "criteriaResults": [...],
  "scoreConfig": {
    "categoricalMode": "detailed",
    "showDecimalScore": false,
    "statusOptions": [
      {
        "id": "status-1",
        "name": "Fully Compliant",
        "color": "success",
        "scoreValue": 90.0
      },
      {
        "id": "status-2",
        "name": "Largely Compliant",
        "color": "info",
        "scoreValue": 80.0
      },
      {
        "id": "status-3",
        "name": "Partially Compliant",
        "color": "warning",
        "scoreValue": 60.0
      },
      {
        "id": "status-4",
        "name": "Non-Compliant",
        "color": "error",
        "scoreValue": 0.0
      }
    ]
  }
}
```

**Backend Implementation:**
```python
def get_evaluation(eval_id: str, org_id: str):
    evaluation = fetch_evaluation(eval_id)
    
    # Get effective config
    score_config = get_effective_eval_config(org_id)
    
    # Get effective status options
    status_options = get_effective_status_options(
        org_id, 
        score_config['categorical_mode']
    )
    
    return {
        **evaluation,
        'scoreConfig': {
            'categoricalMode': score_config['categorical_mode'],
            'showDecimalScore': score_config['show_decimal_score'],
            'statusOptions': status_options
        }
    }
```

---

## Frontend Component Design

### New Component: `ComplianceScoreChip`

**Purpose:** Render overall evaluation score based on configuration

**Props:**
```typescript
interface ComplianceScoreChipProps {
  score: number; // 0-100
  config: {
    categoricalMode: 'boolean' | 'detailed';
    showDecimalScore: boolean;
  };
  statusOptions: Array<{
    id: string;
    name: string;
    color: 'success' | 'warning' | 'error' | 'info';
    scoreValue: number;
  }>;
  size?: 'small' | 'medium' | 'large'; // Default: large for header
}
```

**Implementation:**
```tsx
export function ComplianceScoreChip({
  score,
  config,
  statusOptions,
  size = 'large',
}: ComplianceScoreChipProps) {
  // Find matching status option
  const statusOption = getStatusForScore(score, statusOptions);
  
  // Display numerical score or status name
  const label = config.showDecimalScore 
    ? `${score.toFixed(0)}%` 
    : statusOption.name;
  
  // Size variants
  const sizeStyles = {
    small: { height: '32px', fontSize: '0.875rem' },
    medium: { height: '40px', fontSize: '1rem' },
    large: { height: '56px', fontSize: '1.5rem' },
  };
  
  return (
    <Chip
      label={label}
      color={statusOption.color}
      sx={{
        ...sizeStyles[size],
        fontWeight: config.showDecimalScore ? 'bold' : 'medium',
        paddingX: size === 'large' ? 3 : 2,
        minWidth: config.showDecimalScore ? '80px' : 'auto',
      }}
    />
  );
}
```

**Helper Function:**
```tsx
function getStatusForScore(
  score: number,
  statusOptions: StatusOption[]
): StatusOption {
  const sorted = [...statusOptions].sort((a, b) => b.scoreValue - a.scoreValue);
  
  for (const option of sorted) {
    if (score >= option.scoreValue) {
      return option;
    }
  }
  
  return sorted[sorted.length - 1];
}
```

### Updated Component: `EvalSummaryPanel`

**Changes:**
- Remove old `ComplianceScore` component with hardcoded large badge
- Remove compliance score from Details section (already done)

**No changes needed** - compliance score already removed in previous implementation.

### Updated Component: `EvalDetailPage`

**Changes:**
- Import new `ComplianceScoreChip` component
- Pass `scoreConfig` from API response to component

**Implementation:**
```tsx
// In Header component
<Box sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}>
  <Box>
    <Typography variant="h4" component="h1" gutterBottom>
      Evaluation Results
    </Typography>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Chip
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={statusColors[status] || "default"}
        size="small"
      />
    </Box>
  </Box>
  
  {/* NEW: Configuration-based compliance score */}
  {evaluation.complianceScore != null && 
   evaluation.scoreConfig && 
   status === "completed" && (
    <Box sx={{ mt: -1 }}>
      <ComplianceScoreChip
        score={evaluation.complianceScore}
        config={{
          categoricalMode: evaluation.scoreConfig.categoricalMode,
          showDecimalScore: evaluation.scoreConfig.showDecimalScore,
        }}
        statusOptions={evaluation.scoreConfig.statusOptions}
        size="large"
      />
    </Box>
  )}
</Box>
```

---

## Example Scenarios

### Scenario 1: System Default - Detailed Scoring with Numerical Scores

**Configuration:**
- `eval_sys_cfg.categorical_mode = "detailed"`
- `eval_sys_cfg.show_decimal_score = true`
- No org-level overrides

**Display:**
- Overall score: TWO chips side by side - "Largely Compliant" (blue) + "85%" (blue)
- Individual criteria: TWO chips side by side showing status name + percentage

**Visual:**
```
Evaluation Results
[Complete ▼]            [Largely Compliant]  [85%]
                         ^^^^^^^^^^^^^^^^^    ^^^^
                         (Both blue chips, side by side)
```

### Scenario 2: Org Override - Boolean Scoring with Status Name Only

**Configuration:**
- `eval_sys_cfg.categorical_mode = "detailed"`
- `eval_sys_cfg.show_decimal_score = true`
- `eval_org_cfg.categorical_mode = "boolean"` (OVERRIDE)
- `eval_org_cfg.show_decimal_score = false` (OVERRIDE)

**Display:**
- Overall score: ONE chip showing "Compliant" (green) - no numerical score
- Individual criteria: ONE chip showing "Compliant" or "Non-Compliant"

**Visual:**
```
Evaluation Results
[Complete ▼]                [Compliant]
                             ^^^^^^^^^^
                          (Green chip only)
```

### Scenario 3: Detailed Scoring with Both Chips

**Configuration:**
- `eval_org_cfg.categorical_mode = "detailed"`
- `eval_org_cfg.show_decimal_score = true`

**Display:**
- Overall score: TWO chips - "Partially Compliant" (yellow) + "65%" (yellow)
- Individual criteria: TWO chips showing status name + percentage

**Visual:**
```
Evaluation Results
[Complete ▼]        [Partially Compliant]  [65%]
                     ^^^^^^^^^^^^^^^^^^^^   ^^^^
                     (Both yellow chips, side by side)
```

---

## Testing Checklist

### Backend Testing

- [ ] Verify `eval_org_cfg` overrides `eval_sys_cfg` for `show_decimal_score`
- [ ] Verify `eval_org_cfg` overrides `eval_sys_cfg` for `categorical_mode`
- [ ] Verify org status options override system status options when present
- [ ] Verify fallback to system config when org config is null
- [ ] Test score-to-status mapping for all threshold values
- [ ] Test edge cases (score = 0, score = 100, score at exact threshold)
- [ ] Verify API response includes `scoreConfig` object

### Frontend Testing

- [ ] Test numerical score display (`show_decimal_score = true`)
- [ ] Test status name display (`show_decimal_score = false`)
- [ ] Test boolean mode status options (2 options)
- [ ] Test detailed mode status options (4+ options)
- [ ] Verify chip size matches header height constraint
- [ ] Test color coding for all status options
- [ ] Verify individual criteria scores use same logic
- [ ] Test with missing `scoreConfig` (graceful fallback)

---

## Implementation Checklist

- [ ] **Backend:**
  - [ ] Create `get_effective_eval_config(org_id)` function
  - [ ] Create `get_effective_status_options(org_id, categorical_mode)` function
  - [ ] Update `GET /evaluations/:id` to include `scoreConfig` in response
  - [ ] Add database migrations for config tables (if not already present)

- [ ] **Frontend:**
  - [ ] Create `ComplianceScoreChip` component
  - [ ] Create `getStatusForScore` helper function
  - [ ] Update `EvalDetailPage` to use new component in header
  - [ ] Remove old hardcoded large badge from previous implementation
  - [ ] Add TypeScript types for `scoreConfig` in Evaluation interface
  - [ ] Update individual criteria result cards to use same logic

- [ ] **Testing:**
  - [ ] Unit tests for score-to-status mapping
  - [ ] Integration tests for config precedence
  - [ ] Visual regression tests for chip sizing
  - [ ] E2E tests for all display variations

---

## Open Questions

1. **Default status options:** What should the default system status options be for boolean and detailed modes?
2. **Org admin UI:** Should org admins be able to configure `show_decimal_score` and `categorical_mode` in the UI, or is this backend-only?
3. **Migration strategy:** How do we handle existing evaluations that don't have `scoreConfig`?
4. **Criteria-level override:** Should individual criteria be able to override the evaluation-level config?

---

**Document Status:** Draft - Awaiting User Review  
**Next Steps:**
1. User reviews and provides feedback
2. Answer open questions
3. User approves design
4. Implement changes per checklist

**Last Updated:** January 22, 2026 10:07 PM EST
