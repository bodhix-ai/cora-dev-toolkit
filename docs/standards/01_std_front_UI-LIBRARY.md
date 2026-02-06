# CORA Standard: UI Library

**Version**: 1.0  
**Status**: Active  
**Last Updated**: January 17, 2026

---

## Overview

All CORA modules MUST use Material-UI (@mui/material) as the standard UI component library. This ensures consistency, accessibility, and maintainability across all CORA applications.

## Required UI Library

**REQUIRED**: Material-UI (MUI)
- Package: `@mui/material`
- Icons: `@mui/icons-material`
- Version: 5.x or later

## Prohibited UI Libraries

The following UI libraries are **PROHIBITED** in CORA modules:

❌ **Shadcn UI**
- `@/components/ui/*` imports
- Any Shadcn UI components

❌ **Custom UI Package**
- `@{{PROJECT_NAME}}/ui` imports
- Project-specific UI component packages

❌ **Tailwind CSS**
- Tailwind utility classes in `className` attributes
- Tailwind configuration files (`tailwind.config.js`, etc.)
- `@tailwind` directives in CSS files
- Use Material-UI's `sx` prop instead

❌ **styled-components**
- Direct styled-components usage
- ESLint rule enforces this: `"no-styled-components": "error"`

❌ **Other Component Libraries**
- Ant Design
- Chakra UI
- React Bootstrap
- Any non-Material-UI library

## Required Patterns

### Import Pattern

✅ **CORRECT**:
```typescript
import { Button, TextField, Dialog } from '@mui/material';
import { Send, Delete } from '@mui/icons-material';
```

❌ **WRONG**:
```typescript
import { Button } from '@/components/ui/button';        // Shadcn
import { Input } from '@{{PROJECT_NAME}}/ui';            // Custom package
import styled from 'styled-components';                  // styled-components
```

### Styling Pattern

✅ **CORRECT** - Use MUI's `sx` prop:
```typescript
<Box sx={{ 
  display: 'flex', 
  gap: 2, 
  p: 2,
  bgcolor: 'background.paper'
}}>
  <Button variant="contained" color="primary">
    Click Me
  </Button>
</Box>
```

❌ **WRONG** - Tailwind classes:
```typescript
<div className="flex gap-2 p-4 bg-white">
  <button className="bg-blue-500 text-white px-4 py-2">
    Click Me
  </button>
</div>
```

## Component Mapping

### Common Shadcn → Material-UI Conversions

| Shadcn UI | Material-UI |
|-----------|-------------|
| `Button` | `Button`, `IconButton` |
| `Input` | `TextField` |
| `Textarea` | `TextField` (multiline) |
| `Dialog` | `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions` |
| `Badge` | `Chip`, `Badge` |
| `Alert` | `Alert` |
| `Select` | `Select`, `FormControl` |
| `Checkbox` | `Checkbox`, `FormControlLabel` |
| `Switch` | `Switch`, `FormControlLabel` |
| `Label` | Built into `TextField` |
| `Card` | `Card`, `CardContent`, `CardHeader`, `CardActions` |
| `DropdownMenu` | `Menu`, `MenuItem` |
| `Tabs` | `Tabs`, `Tab` |
| `ScrollArea` | `Box` with `overflow: 'auto'` |
| `Separator` | `Divider` |
| `Collapsible` | `Accordion`, `AccordionSummary`, `AccordionDetails` |

## Validation

### Automated Validation

The UI library compliance is enforced through:

1. **Validation Script**: `scripts/validate-ui-library.sh`
   - **NEW (v2.0.0)**: Detects Tailwind CSS usage (10 regex patterns)
   - **NEW (v2.0.0)**: Detects Tailwind configuration files
   - **NEW (v2.0.0)**: Detects @tailwind directives in CSS
   - Checks for Shadcn UI imports
   - Checks for custom UI packages
   - Checks for styled-components usage
   - Verifies Material-UI usage
   - Runs during project creation

2. **Python CLI**: `validation/ui-library-validator/cli.py`
   - Integration with validation orchestrator (`cora-validate.py`)
   - Part of CORA compliance suite
   - Supports JSON/text output formats

3. **ESLint Rules**:
   ```json
   {
     "no-styled-components": "error"
   }
   ```

**Validator Detects 8 Types of Violations:**
- ✅ Tailwind CSS classes in `className` attributes
- ✅ Tailwind configuration files (`tailwind.config.*`)
- ✅ `@tailwind` directives in CSS files
- ✅ Shadcn UI imports (`@/components/ui/*`)
- ✅ Custom UI package imports (`@{project}/ui`)
- ✅ styled-components usage
- ✅ Custom UI package directories
- ✅ Missing Material-UI imports (warning)

**Documentation**: See `validation/ui-library-validator/README.md` for complete details.

### Manual Validation

To manually validate a module:

```bash
# Standalone validator
./scripts/validate-ui-library.sh templates/_modules-core/module-name

# Integrated with validation suite
python validation/cora-validate.py project /path/to/project --validators ui_library

# Run on entire templates directory
./scripts/validate-ui-library.sh templates
```

Expected output:
```
✅ PASSED: All UI library compliance checks passed

✅ No Tailwind CSS classes found
✅ No Tailwind configuration files found
✅ No @tailwind directives found
✅ No Shadcn UI imports found
✅ No custom UI package imports found
✅ No styled-components usage found
✅ No custom UI package directory found
✅ Material-UI imports found (168 files)
```

## Accessibility

Material-UI provides built-in accessibility features:

- ✅ ARIA attributes on all components
- ✅ Keyboard navigation support
- ✅ Screen reader compatibility
- ✅ Focus management
- ✅ Color contrast compliance

These features align with CORA's Section 508 and WCAG compliance requirements.

## Theming

All Material-UI components automatically inherit from the CORA theme:

```typescript
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* Your app */}
    </ThemeProvider>
  );
}
```

## Migration Guide

### Migrating from Shadcn UI to Material-UI

1. **Replace Imports**:
   ```typescript
   // Before
   import { Button } from "@/components/ui/button";
   
   // After
   import { Button } from "@mui/material";
   ```

2. **Update Components**:
   ```typescript
   // Before
   <Button variant="default" size="lg" className="mt-4">
     Click Me
   </Button>
   
   // After
   <Button variant="contained" size="large" sx={{ mt: 2 }}>
     Click Me
   </Button>
   ```

3. **Convert Styling**:
   - Replace Tailwind classes with MUI's `sx` prop
   - Use MUI's spacing system (units of 8px)
   - Use theme tokens for colors

4. **Remove Dependencies**:
   - Remove `@/components/ui/*` directory
   - Remove Tailwind CSS if not used elsewhere
   - Remove `cn()` utility if not needed

## Examples

### Form Component

```typescript
import { TextField, Button, Box, FormControl, FormLabel } from '@mui/material';

export function MyForm() {
  return (
    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl>
        <TextField
          label="Email"
          type="email"
          required
          fullWidth
          variant="outlined"
        />
      </FormControl>
      
      <FormControl>
        <TextField
          label="Message"
          multiline
          rows={4}
          fullWidth
          variant="outlined"
        />
      </FormControl>
      
      <Button variant="contained" color="primary" type="submit">
        Submit
      </Button>
    </Box>
  );
}
```

### Dialog Component

```typescript
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button 
} from '@mui/material';

export function MyDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogContent>
        Are you sure you want to proceed?
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onClose} variant="contained" color="primary">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

## Enforcement

### Project Creation

The UI library validation runs automatically during project creation:

```bash
./scripts/create-cora-project.sh my-project
# Runs validation/ui-library-validator/cli.py automatically
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
./scripts/validate-ui-library.sh .
```

### CI/CD Pipeline

Include in your CI pipeline:

```yaml
- name: Validate UI Library Compliance
  run: ./scripts/validate-ui-library.sh .
```

## Rationale

### Why Material-UI?

1. **Consistency**: Uniform look and feel across all CORA modules
2. **Accessibility**: Built-in ARIA support and WCAG compliance
3. **Theming**: Centralized theme management
4. **Maintenance**: Single library to update and maintain
5. **Documentation**: Comprehensive official documentation
6. **Community**: Large community and ecosystem
7. **TypeScript**: First-class TypeScript support

### Why Not Shadcn UI?

1. **Fragmentation**: Each project maintains its own component code
2. **Inconsistency**: Components can drift between projects
3. **Maintenance**: Harder to update across multiple projects
4. **Dependencies**: Requires Tailwind CSS and other dependencies

## Related Documents

- **ADR-013**: Core vs Functional Module Classification
- **standard_CORA-FRONTEND.md**: CORA Frontend Standards (Section 4.2: Material-UI Usage)
- **plan_module-chat-mui-migration.md**: MUI Migration Plan and Implementation

## Tabbed Interface Standard

### Tab Separator Bar (Required)

**All tabbed interfaces MUST include a visual separator (Divider) between tab navigation and tab content.**

✅ **CORRECT Pattern**:
```typescript
<Paper>
  <Tabs value={activeTab} onChange={handleTabChange}>
    <Tab label="Overview" {...a11yProps(0)} />
    <Tab label="Docs" {...a11yProps(1)} />
    <Tab label="Settings" {...a11yProps(2)} />
  </Tabs>
  <Divider /> {/* REQUIRED: Visual separator */}
  
  <TabPanel value={activeTab} index={0}>
    <Box sx={{ p: 3 }}> {/* Standard padding */}
      {/* Tab content */}
    </Box>
  </TabPanel>
</Paper>
```

❌ **WRONG - No separator**:
```typescript
<Paper>
  <Tabs value={activeTab} onChange={handleTabChange}>
    <Tab label="Overview" />
  </Tabs>
  {/* Missing Divider - creates visual ambiguity */}
  <TabPanel value={activeTab} index={0}>
    {/* Content appears disconnected from tabs */}
  </TabPanel>
</Paper>
```

**Rationale:**
- **Clear Visual Hierarchy**: Separates navigation from content
- **Industry Standard**: Common in Material Design (Gmail, Drive, GitHub)
- **Purposeful Actions**: Buttons/controls in tab content feel intentional, not arbitrary
- **Consistent**: Same pattern across all CORA modules
- **Scalable**: Works with or without tab-level actions/filters

### Tab Content Padding (Required)

**All tab content MUST use standard padding of 3 spacing units (24px).**

**Standard Padding Pattern**:
```typescript
<TabPanel value={activeTab} index={0}>
  <Box sx={{ p: 3 }}> {/* p: 3 = 24px (3 × 8px MUI spacing) */}
    {/* Content with proper spacing from edges */}
  </Box>
</TabPanel>
```

**Padding Values**:
- **Default Tab Content**: `p: 3` (24px all sides)
- **Dense Content**: `p: 2` (16px) - Only if explicitly needed
- **Expansive Content**: `p: 4` (32px) - Rare, high-level pages only

**Never use zero padding** - content should never touch container edges.

### Complete Tabbed Interface Example

```typescript
import { 
  Paper, 
  Tabs, 
  Tab, 
  Box, 
  Divider,
  Button,
  Typography 
} from '@mui/material';

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export function MyTabbedInterface() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Paper>
      {/* Tab navigation */}
      <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
        <Tab label="Overview" />
        <Tab label="Details" />
        <Tab label="Settings" />
      </Tabs>
      
      {/* Required separator */}
      <Divider />
      
      {/* Tab content with standard padding */}
      <TabPanel value={activeTab} index={0}>
        <Typography variant="h6" gutterBottom>
          Overview Content
        </Typography>
        {/* Content has 24px padding from all edges */}
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">Details</Typography>
          <Button variant="contained">Action</Button>
        </Box>
        {/* Actions feel purposeful with separator above */}
      </TabPanel>
    </Paper>
  );
}
```

### Tab Content Layout Patterns

**Pattern 1: Content with Top Actions**
```typescript
<TabPanel value={activeTab} index={0}>
  <Box sx={{ p: 3 }}>
    {/* Actions row (aligned to padding) */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Chip label="Filter 1" />
        <Chip label="Filter 2" />
      </Box>
      <Button variant="contained">Create New</Button>
    </Box>
    
    {/* Main content */}
    <Typography>Content here...</Typography>
  </Box>
</TabPanel>
```

**Pattern 2: Simple Content**
```typescript
<TabPanel value={activeTab} index={0}>
  <Box sx={{ p: 3 }}>
    <Typography variant="body1">
      Simple text content with proper padding.
    </Typography>
  </Box>
</TabPanel>
```

**Pattern 3: Grid Layout**
```typescript
<TabPanel value={activeTab} index={0}>
  <Box sx={{ p: 3 }}>
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2 }}>Card 1</Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2 }}>Card 2</Paper>
      </Grid>
    </Grid>
  </Box>
</TabPanel>
```

### Modules Using Tabs (Apply Standard)

**Core Modules:**
- ✅ `module-ws` - WorkspaceDetailPage (Overview, Docs, Evaluations, Settings)
- ✅ `module-kb` - (if using tabs)
- ✅ `module-chat` - (if using tabs)
- ✅ `module-mgmt` - (if using tabs)

**Functional Modules:**
- ✅ `module-eval` - EvalDetailPage (if using tabs)
- ✅ `module-voice` - (if using tabs)

**All new tabbed interfaces MUST follow this standard.**

---

## Content Padding Standards

### Standard Padding Values

**CORA uses Material-UI's 8px spacing system.**

| Use Case | Padding | Pixels | Usage |
|----------|---------|--------|-------|
| **Tab Content** | `p: 3` | 24px | Default for all tab panels |
| **Cards** | `p: 2` | 16px | Card content padding |
| **Dialogs** | `p: 3` | 24px | Dialog content padding |
| **Sections** | `pb: 3, mb: 3` | 24px | Between major sections |
| **Dense UI** | `p: 2` | 16px | Compact layouts only |
| **Expansive** | `p: 4` | 32px | High-level container pages |

### Spacing Utilities

```typescript
// MUI spacing units: 1 unit = 8px
sx={{ 
  p: 3,     // padding: 24px (all sides)
  px: 3,    // padding-left, padding-right: 24px
  py: 3,    // padding-top, padding-bottom: 24px
  pt: 3,    // padding-top: 24px
  pr: 3,    // padding-right: 24px
  pb: 3,    // padding-bottom: 24px
  pl: 3,    // padding-left: 24px
  
  m: 3,     // margin: 24px (all sides)
  mx: 3,    // margin-left, margin-right: 24px
  my: 3,    // margin-top, margin-bottom: 24px
  
  gap: 2,   // gap: 16px (for flex/grid)
}}
```

### Common Padding Patterns

**Container Padding**:
```typescript
<Container maxWidth="lg" sx={{ py: 4 }}>
  {/* Page content with vertical padding */}
</Container>
```

**Section Spacing**:
```typescript
<Box sx={{ mb: 3, pb: 3, borderBottom: 1, borderColor: 'divider' }}>
  {/* Section with bottom margin and divider */}
</Box>
```

**Nested Content**:
```typescript
<Paper sx={{ p: 3 }}>
  <Typography variant="h6" gutterBottom>
    Title
  </Typography>
  <Box sx={{ pl: 2 }}> {/* Indent nested content */}
    <Typography variant="body2">
      Nested content
    </Typography>
  </Box>
</Paper>
```

---

## Module Resource Count Display Standard

### Hide Zero Counts Pattern (Required)

**Resource count metrics from modules MUST only be displayed when count > 0.**

This pattern:
- ✅ Reduces cognitive load (users don't process meaningless zeros)
- ✅ Automatically handles optional modules (eval, voice) - if module disabled or unused, counts don't show
- ✅ Cleaner, more scannable cards
- ✅ Progressive disclosure (information appears when it matters)
- ✅ Industry standard (Gmail, GitHub, Slack don't show "0" badges)

✅ **CORRECT Pattern** - Conditional rendering:
```typescript
// WorkspaceCard.tsx - Only render metrics with data
<Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
  {/* Members - always show (core feature) */}
  {workspace.memberCount > 0 && (
    <Tooltip title="Members">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Group fontSize="small" color="action" />
        <Typography variant="body2">{workspace.memberCount}</Typography>
      </Box>
    </Tooltip>
  )}
  
  {/* Documents - core module KB */}
  {workspace.documentCount > 0 && (
    <Tooltip title="Documents">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Description fontSize="small" color="action" />
        <Typography variant="body2">{workspace.documentCount}</Typography>
      </Box>
    </Tooltip>
  )}
  
  {/* Evaluations - optional module (only shows if enabled AND count > 0) */}
  {workspace.evaluationCount > 0 && (
    <Tooltip title="Evaluations">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Assessment fontSize="small" color="action" />
        <Typography variant="body2">{workspace.evaluationCount}</Typography>
      </Box>
    </Tooltip>
  )}
  
  {/* Voice - optional module (only shows if enabled AND count > 0) */}
  {workspace.voiceCount > 0 && (
    <Tooltip title="Voice Sessions">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Mic fontSize="small" color="action" />
        <Typography variant="body2">{workspace.voiceCount}</Typography>
      </Box>
    </Tooltip>
  )}
</Box>
```

❌ **WRONG - Always showing zeros**:
```typescript
// Don't do this - clutters interface with meaningless data
<Box sx={{ display: 'flex', gap: 2 }}>
  <Typography>Members: {workspace.memberCount || 0}</Typography>
  <Typography>Docs: {workspace.documentCount || 0}</Typography>
  <Typography>Evals: {workspace.evaluationCount || 0}</Typography>
  {/* User sees "Members: 1, Docs: 0, Evals: 0" - poor UX */}
</Box>
```

### Empty State Handling

**When ALL counts are zero, show placeholder content:**

```typescript
// WorkspaceCard.tsx
const hasAnyResources = 
  workspace.memberCount > 0 || 
  workspace.documentCount > 0 || 
  workspace.evaluationCount > 0 ||
  workspace.chatCount > 0 ||
  workspace.voiceCount > 0;

{!hasAnyResources && (
  <Typography variant="caption" color="text.secondary">
    No resources yet
  </Typography>
)}
```

### Backend Implementation

**Backend MUST return 0 for disabled/missing modules gracefully:**

```python
# Lambda function - graceful handling for optional modules
def _get_workspace_counts(workspace_ids: List[str]) -> Dict[str, Dict[str, int]]:
    """
    Get resource counts with graceful handling for optional modules.
    Returns 0 for missing tables (disabled modules) without errors.
    """
    counts = {ws_id: {
        'member_count': 0,
        'document_count': 0,
        'evaluation_count': 0,  # Optional - may be 0 if module disabled
        'chat_count': 0,
        'voice_count': 0,       # Optional - may be 0 if module disabled
    } for ws_id in workspace_ids}
    
    # Core module queries (always execute)
    # Optional module queries (catch table-not-found errors)
    # ...
    
    return counts
```

**Frontend receives all counts (0 if module disabled), decides what to display.**

### Benefits of This Pattern

1. **Dynamic Module Support**: Optional modules (eval, voice) automatically hide when:
   - Module not enabled in project → table doesn't exist → backend returns 0 → frontend doesn't render
   - Module enabled but not used → count = 0 → frontend doesn't render
   - No frontend module detection logic needed!

2. **Cleaner Cards**: New/empty workspaces don't show rows of zeros

3. **Cognitive Efficiency**: Users only process actionable information

4. **Scalable**: As more modules are added, cards don't become cluttered

5. **Consistent with Industry**: Gmail (no "0 attachments"), GitHub (no "0 issues"), Slack (no "0 messages")

### Applicable To

This pattern applies to:
- ✅ Workspace list cards (module resource counts)
- ✅ Dashboard summary cards
- ✅ Any list/card interface showing metrics from multiple modules
- ✅ Sidebar badges/indicators

Do NOT hide zeros for:
- ❌ Explicit status dashboards (analytics wants to see zeros)
- ❌ Comparison tables (need consistent columns)
- ❌ Progress indicators (0% is meaningful)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.2 | 2026-01-22 | Added module resource count display standard (hide zero counts) |
| 1.1 | 2026-01-22 | Added tabbed interface standard (separator bar, padding) |
| 1.0 | 2026-01-17 | Initial standard documenting Material-UI requirement |

---

**Questions?** Contact the CORA Architecture team or refer to [Material-UI Documentation](https://mui.com/).
