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

No additional dependencies required beyond the project's existing Python environment.

## Usage

### Command Line (Recommended)

The easiest way to run the validator is using the wrapper script from your project root:

```bash
# Navigate to your project root
cd /path/to/your/project

# Validate the entire project
python3 scripts/validation/run_a11y_validator.py --target-dir .

# Validate with verbose output
python3 scripts/validation/run_a11y_validator.py --target-dir packages/ --verbose

# Validate a specific directory
python3 scripts/validation/run_a11y_validator.py --target-dir packages/module-ai --verbose

# Generate JSON report
python3 scripts/validation/run_a11y_validator.py --target-dir packages/ --format json --output report.json

# Generate markdown report
python3 scripts/validation/run_a11y_validator.py --target-dir packages/ --format markdown --output report.md

# Strict mode (fail on warnings)
python3 scripts/validation/run_a11y_validator.py --target-dir packages/ --strict
```

### Python API

If you need to use the validator programmatically:

```python
import sys
from pathlib import Path

# Add the a11y-validator directory to the path
sys.path.insert(0, str(Path(__file__).parent / "scripts/validation/a11y-validator"))

from validator import validate_path, A11yValidator
from reporter import Reporter

# Validate and print report
results = validate_path(
    path="packages/module-ai",
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

### Note on Module Import

Due to Python's restriction on hyphens in module names, the `a11y-validator` directory cannot be imported directly as a module. The recommended approach is to use the `run_a11y_validator.py` wrapper script, which handles the import path configuration automatically.

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
