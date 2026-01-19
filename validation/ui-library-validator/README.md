# UI Library Validator

**Status**: ✅ Production Ready  
**Version**: 2.0.0  
**Last Updated**: January 18, 2026

## Overview

The UI Library Validator ensures all CORA modules comply with the **Material-UI (@mui/material) standard** and detects violations from competing UI libraries like Tailwind CSS, Shadcn UI, and styled-components.

## Purpose

CORA mandates **Material-UI as the exclusive UI library** to ensure:
- Consistent user experience across all modules
- Accessibility compliance (WCAG 2.1 AA)
- Maintainable, professional styling
- Theme-based customization

This validator **prevents non-compliant code** from being deployed by detecting violations during project creation and validation test suite execution.

## Features

### Detects 8 Types of Violations:

| Check | What It Detects | Severity |
|-------|----------------|----------|
| **1. Tailwind CSS Classes** | `className` attributes with Tailwind patterns (flex, px-, text-, bg-, rounded, etc.) | ❌ Error |
| **2. Tailwind Config Files** | `tailwind.config.js`, `tailwind.config.ts`, etc. | ❌ Error |
| **3. Tailwind Directives** | `@tailwind` directives in CSS files | ❌ Error |
| **4. Shadcn UI Imports** | Imports from `@/components/ui/*` | ❌ Error |
| **5. Custom UI Packages** | Imports from `@{project}/ui` | ❌ Error |
| **6. styled-components** | Imports from `styled-components` | ❌ Error |
| **7. Custom UI Directory** | Existence of `packages/ui/` directory | ❌ Error |
| **8. Material-UI Usage** | Verifies `@mui/material` imports exist | ⚠️ Warning if missing |

### Tailwind CSS Detection Patterns (10 Regex Patterns):

The validator detects common Tailwind className patterns:

```typescript
// Layout utilities
className="flex items-center justify-between"
className="grid grid-cols-3 gap-4"

// Spacing utilities
className="px-4 py-2"
className="mx-auto mt-8"

// Color utilities
className="bg-blue-500 text-white"
className="border-gray-300"

// Typography utilities
className="text-lg font-bold"
className="font-semibold text-gray-900"

// Size utilities
className="w-full h-screen"

// Rounded corners
className="rounded-lg"

// Hover states
className="hover:bg-gray-100"
```

## Usage

### Standalone Execution

```bash
# Run on templates directory
./scripts/validate-ui-library.sh templates

# Run on specific project
./scripts/validate-ui-library.sh /path/to/project-stack

# Run on specific module
./scripts/validate-ui-library.sh templates/_modules-functional/module-eval
```

### Integrated with Validation Suite

```bash
# Run all validators including UI library
python validation/cora-validate.py project /path/to/project-stack

# Run only UI library validator
python validation/cora-validate.py project /path/to/project --validators ui_library

# Save results for later analysis
python validation/cora-validate.py project /path/to/project --save-results
```

### Python CLI

```bash
# JSON output for programmatic use
python -m ui-library-validator.cli /path/to/project --format json

# Text output for human reading
python -m ui-library-validator.cli /path/to/project --format text
```

## Output Examples

### ✅ Clean Project (No Violations)

```
==============================================================================
CORA UI Library Compliance Validation
==============================================================================

Scanning path: templates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECK 1: Scanning for Tailwind CSS class usage in components
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ No Tailwind CSS classes found

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECK 2: Scanning for Tailwind configuration files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ No Tailwind configuration files found

... (all checks pass)

==============================================================================
VALIDATION SUMMARY
==============================================================================

✅ PASSED: All UI library compliance checks passed

All modules follow CORA Material-UI standard.
```

### ❌ Project with Violations

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHECK 1: Scanning for Tailwind CSS class usage in components
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ VIOLATION: Found Tailwind CSS class usage in components

Files with Tailwind classes detected:

  templates/_modules-functional/module-eval/frontend/components/DocTypeManager.tsx
  templates/_modules-functional/module-eval/frontend/components/CriteriaSetManager.tsx
  templates/_modules-functional/module-eval/frontend/pages/EvalListPage.tsx

  CORA Standard: Use Material-UI sx prop instead of Tailwind classes
  Example:
    ❌ className="flex items-center gap-2 px-4 py-2"
    ✅ sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 4, py: 2 }}

  See: docs/standards/standard_CORA-UI-LIBRARY.md

==============================================================================
VALIDATION SUMMARY
==============================================================================

❌ FAILED: 1 violation(s) found

Violations must be fixed before proceeding.

Required Actions:
  1. Remove all Tailwind CSS class usage
  2. Remove Tailwind configuration files
  3. Remove @tailwind directives from CSS files
  4. Remove all Shadcn UI imports
  5. Remove custom UI packages (packages/ui)
  6. Rewrite components using Material-UI (@mui/material)
  7. Remove styled-components usage

Migration Guide:
  - Replace className with sx prop
  - Use Material-UI components (Box, Typography, Button, etc.)
  - Use Material-UI theme for consistent styling

See: docs/standards/standard_CORA-UI-LIBRARY.md
```

## Migration Guide

### Converting Tailwind to Material-UI

**Before (Tailwind CSS):**
```tsx
export function MyComponent() {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg">
      <span className="text-lg font-semibold text-gray-900">Title</span>
      <button className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
        Click Me
      </button>
    </div>
  );
}
```

**After (Material-UI):**
```tsx
import { Box, Typography, Button } from "@mui/material";

export function MyComponent() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 4,
        py: 2,
        backgroundColor: "grey.50",
        borderRadius: 2,
      }}
    >
      <Typography variant="h6" fontWeight={600}>
        Title
      </Typography>
      <Button variant="contained" color="primary">
        Click Me
      </Button>
    </Box>
  );
}
```

### Common Conversions

| Tailwind | Material-UI |
|----------|-------------|
| `className="flex items-center gap-2"` | `sx={{ display: 'flex', alignItems: 'center', gap: 2 }}` |
| `className="px-4 py-2"` | `sx={{ px: 4, py: 2 }}` |
| `className="bg-blue-500 text-white"` | `sx={{ backgroundColor: 'primary.main', color: 'white' }}` |
| `className="rounded-lg"` | `sx={{ borderRadius: 2 }}` |
| `className="text-lg font-bold"` | `<Typography variant="h6" fontWeight={700}>` |
| `className="w-full"` | `sx={{ width: '100%' }}` or `fullWidth` prop |

## Integration Points

### 1. Project Creation

The validator runs automatically when creating new CORA projects:

```bash
./scripts/create-cora-project.sh my-project
# Validator runs during project creation
# Fails if templates contain violations
```

### 2. Validation Test Suite

Integrated with `cora-validate.py` orchestrator:

```bash
python validation/cora-validate.py project /path/to/project
# UI library validator included in suite
```

### 3. Pre-Commit Hooks

Can be added to pre-commit configuration:

```yaml
- repo: local
  hooks:
    - id: ui-library-validator
      name: UI Library Validator
      entry: ./scripts/validate-ui-library.sh
      language: script
      pass_filenames: false
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Violations found (must be fixed) |

## Performance

- **Speed**: ~500-1000ms for typical project (8 modules)
- **Scale**: Handles projects with 100+ components
- **Memory**: Minimal (<50MB)

## Troubleshooting

### False Positives

**Issue**: Validator flags legitimate className usage (e.g., CSS Modules, third-party components)

**Solution**: The validator specifically targets Tailwind patterns. If you have false positives:
1. Check if the className actually uses Tailwind utilities
2. If legitimate, the file may need refactoring to use Material-UI
3. Report false positive patterns to improve validator

### No Material-UI Imports Warning

**Issue**: Warning about missing Material-UI imports despite using Material-UI

**Solution**: This is a detection check. If you see this warning:
1. Verify `@mui/material` imports exist in your components
2. Check that imports are formatted correctly
3. This is a WARNING, not an error

## Development

### Adding New Detection Patterns

Edit `scripts/validate-ui-library.sh`:

```bash
# Add new Tailwind pattern
TAILWIND_PATTERNS=(
  # Existing patterns...
  "className=\".*\\byour-new-pattern\\b.*\""
)
```

### Testing

```bash
# Test on known-good templates
./scripts/validate-ui-library.sh templates/_modules-core/module-access

# Test on known-bad examples (should fail)
./scripts/validate-ui-library.sh /path/to/tailwind-example
```

## Related Documentation

- **CORA UI Library Standard**: `docs/standards/standard_CORA-UI-LIBRARY.md`
- **CORA Frontend Standard**: `docs/standards/standard_CORA-FRONTEND.md`
- **Material-UI Documentation**: https://mui.com/material-ui/
- **Validation Suite Documentation**: `validation/README.md`

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-01-18 | Added Tailwind CSS detection (3 new checks, 10 regex patterns) |
| 1.0.0 | 2025-12-01 | Initial release (Shadcn, styled-components, custom UI detection) |

## Support

For issues or questions:
1. Check this README
2. Review `docs/standards/standard_CORA-UI-LIBRARY.md`
3. Run validator with `--verbose` flag for detailed output
4. Report issues via `/reportbug` command

---

**Maintained by**: CORA Development Team  
**License**: Proprietary  
**Repository**: cora-dev-toolkit/validation/ui-library-validator
