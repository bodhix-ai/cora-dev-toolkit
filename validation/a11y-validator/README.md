# Section 508 Accessibility Validator

Automated validation tool for React/TypeScript components against Section 508 accessibility requirements.

## Overview

This tool validates React/TypeScript components against:
- **ICT Testing Baseline for Web v3.1** - Standardized test procedures
- **WCAG 2.1 Level AA** - Web Content Accessibility Guidelines

## Features

✅ **Automated Static Analysis**
- Scans `.tsx`, `.jsx`, `.ts`, `.js` files
- Extracts JSX elements and validates accessibility attributes
- Maps violations to specific baseline tests and WCAG success criteria

✅ **Comprehensive Coverage**
- Images (alt text, IconButton labels)
- Forms (labels, error messages)
- Links (purpose, text content)
- Structure (heading hierarchy)
- Keyboard access patterns
- ARIA attributes

✅ **Multiple Output Formats**
- Text (with colors)
- JSON (machine-readable)
- Markdown (documentation-ready)

✅ **CI/CD Integration**
- Exit codes for pass/fail
- Strict mode for warnings
- Filtering by severity or baseline test

## Installation

```bash
# Install dependencies
cd pm-app-stack/scripts/validation/a11y-validator
pip install -r requirements.txt
```

## Usage

### Command Line

```bash
# Validate a directory
python -m scripts.validation.a11y_validator.cli packages/kb-module/src/components

# Validate with verbose output
python -m scripts.validation.a11y_validator.cli packages/ --verbose

# Generate JSON report
python -m scripts.validation.a11y_validator.cli packages/ --format json --output report.json

# Generate markdown report
python -m scripts.validation.a11y_validator.cli packages/ --format markdown --output report.md

# Show baseline coverage
python -m scripts.validation.a11y_validator.cli --show-coverage

# Filter by severity
python -m scripts.validation.a11y_validator.cli packages/ --severity error

# Filter by baseline test
python -m scripts.validation.a11y_validator.cli packages/ --baseline 6.A

# Strict mode (fail on warnings)
python -m scripts.validation.a11y_validator.cli packages/ --strict
```

### Python API

```python
from scripts.validation.a11y_validator import validate_path, A11yValidator

# Validate and print report
results = validate_path(
    path="packages/kb-module/src/components",
    output_format="text",
    verbose=True
)

# Use validator directly
validator = A11yValidator(verbose=True)
results = validator.validate_directory("packages/")

# Access results
print(f"Errors: {results['summary']['errors']}")
print(f"Warnings: {results['summary']['warnings']}")
print(f"Status: {results['status']}")
```

## Baseline Test Coverage

### Fully Automated (✓ Full)

| Test | Name | Detection |
|------|---------|-----------|
| 5.A | Name, Role, Value - Name | Button labels, ARIA names |
| 6.A | Images - Meaningful | Missing alt text, IconButton labels |
| 6.B | Images - Decorative | Decorative image verification |
| 10.A | Forms - Label | Missing labels, placeholder-only inputs |
| 13.A | Content Structure - Headings | Heading hierarchy violations |
| 14.A | Links - Purpose | Empty links, vague link text |
| 19.A | Frames - Title | Missing iframe titles |

### Partially Automated (✓ Partial)

| Test | Name | Manual Verification |
|------|------|---------------------|
| 1.A | Keyboard Access | Verify keyboard handlers work correctly |
| 2.A | Focus Visible | Verify alternative focus indicators |
| 5.B | Name, Role, Value - Role | Verify role is semantically correct |
| 5.C | Name, Role, Value - State | Verify state changes are announced |
| 7.A | Sensory Characteristics | Verify information not conveyed by color alone |
| 8.A | Contrast Minimum | Use WebAIM tool to verify 4.5:1 ratio |
| 10.C | Forms - Error Identification | Verify error messages are clear |
| 11.A | Page Titles | Verify page titles are descriptive |
| 13.B | Content Structure - Lists | Verify list semantics are correct |

### Manual Testing Required (✗ Manual)

| Test | Name | Reason |
|------|------|--------|
| 2.B | Focus Order | Runtime keyboard navigation testing |
| 16.A | Audio-Only | Transcript review |
| 17.A | Media Player Controls | Runtime media player testing |
| 21.A | Timed Events | Runtime timing testing |
| 22.A | Resize Text | Browser zoom testing |

## Output Examples

### Text Format

```
================================================================================
Section 508 Accessibility Validation Report
================================================================================

Status: FAILED
Files Scanned: 15
Components Analyzed: 234

Errors: 5
Warnings: 12
Manual Review Required: 6
```

### JSON Format

```json
{
  "status": "failed",
  "summary": {
    "files_scanned": 15,
    "components_analyzed": 234,
    "errors": 5,
    "warnings": 12
  },
  "errors": [...]
}
```

## CI/CD Integration

See `INTEGRATION.md` for detailed integration guides.

## References

- [ICT Testing Baseline for Web](https://ictbaseline.access-board.gov/)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Section 508 Standards](https://www.section508.gov/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

## License

Internal tool for PolicyMind project.
