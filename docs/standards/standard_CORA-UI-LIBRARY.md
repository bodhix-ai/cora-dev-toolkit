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

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-17 | Initial standard documenting Material-UI requirement |

---

**Questions?** Contact the CORA Architecture team or refer to [Material-UI Documentation](https://mui.com/).
