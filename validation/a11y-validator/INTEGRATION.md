# Integration Guide: Section 508 Accessibility Validator

This guide explains how to integrate the Section 508 Accessibility Validator into the PolicyMind validation workflow.

## Quick Start

```bash
# Install dependencies
cd pm-app-stack/scripts/validation/a11y-validator
pip install -r requirements.txt

# Run validation
cd pm-app-stack
python -m scripts.validation.a11y_validator.cli packages/
```

## Integration with Existing Validation Tools

PolicyMind has three existing validation tools:

1. **Schema Validator** - Validates Lambda database queries
2. **Import Validator** - Validates Lambda imports and frontend auth independence
3. **API Tracer** - Validates API contracts

The A11y Validator complements these by focusing on frontend accessibility.

## Package.json Scripts

Add these scripts to `pm-app-stack/package.json`:

```json
{
  "scripts": {
    "validate:a11y": "python3 scripts/validation/a11y-validator/cli.py packages/",
    "validate:a11y:report": "python3 scripts/validation/a11y-validator/cli.py packages/ --format markdown --output accessibility-report.md",
    "validate:a11y:errors": "python3 scripts/validation/a11y-validator/cli.py packages/ --severity error",
    "validate:a11y:strict": "python3 scripts/validation/a11y-validator/cli.py packages/ --strict"
  }
}
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/accessibility-validation.yml`:

```yaml
name: Accessibility Validation

on:
  pull_request:
    paths:
      - 'pm-app-stack/packages/**/*.tsx'
      - 'pm-app-stack/packages/**/*.jsx'
      - 'pm-app-stack/apps/**/*.tsx'
      - 'pm-app-stack/apps/**/*.jsx'

jobs:
  validate-accessibility:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd pm-app-stack/scripts/validation/a11y-validator
          pip install -r requirements.txt
      
      - name: Run accessibility validation
        run: |
          cd pm-app-stack
          python -m scripts.validation.a11y_validator.cli packages/ \
            --format markdown \
            --output accessibility-report.md
      
      - name: Check validation status
        run: |
          cd pm-app-stack
          python -m scripts.validation.a11y_validator.cli packages/ --severity error
      
      - name: Upload report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: accessibility-report
          path: pm-app-stack/accessibility-report.md
```

## Usage Recommendations

### Development Workflow

1. **Feature Development** - Validate components as you build them
2. **Pre-commit** - Automated via git hook (errors only)
3. **Pull Request** - Generate report for PR description
4. **Release Preparation** - Full validation with all severities

### Severity Levels

- **Error**: MUST be fixed before merge (blocks PR)
- **Warning**: SHOULD be fixed (doesn't block PR, but tracked)
- **Info**: For awareness (e.g., decorative images verified)

## References

- [ICT Testing Baseline](https://ictbaseline.access-board.gov/)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Section 508 Standards](https://www.section508.gov/)
