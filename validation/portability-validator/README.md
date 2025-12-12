# CORA Portability Validator

Detects hardcoded values that would prevent project portability.

## Features

- **AWS Account ID Detection**: Finds hardcoded 12-digit account IDs
- **AWS Region Detection**: Detects hardcoded region strings
- **URL Detection**: Finds hardcoded URLs and domains
- **API Key Detection**: Identifies potential hardcoded API keys
- **ARN Detection**: Detects ARNs with embedded account IDs
- **Project Name Detection**: Custom pattern for project-specific names
- **Multiple Output Formats**: Text, JSON, and Markdown reports

## Installation

```bash
cd cora-dev-toolkit/validation
pip install -r requirements.txt  # If any dependencies needed
```

## Usage

### Basic Validation

```bash
# Validate a project
python -m portability_validator.cli /path/to/project

# Validate with project name detection
python -m portability_validator.cli /path/to/project --project-name pm-app
```

### Output Formats

```bash
# Text output (default)
python -m portability_validator.cli /path/to/project

# JSON output (CI/CD friendly)
python -m portability_validator.cli /path/to/project --format json

# Markdown report
python -m portability_validator.cli /path/to/project --format markdown --output report.md
```

### Options

| Option                 | Description                            |
| ---------------------- | -------------------------------------- |
| `--project-name`, `-p` | Project name to detect as hardcoded    |
| `--format`, `-f`       | Output format: text, json, markdown    |
| `--output`, `-o`       | Write report to file                   |
| `--verbose`, `-v`      | Verbose output                         |
| `--no-color`           | Disable colored output                 |
| `--strict`             | Exit with error code if warnings found |

## Detection Patterns

### AWS Account IDs (Error)

Detects 12-digit numbers that could be AWS account IDs.

```
# Will detect:
arn:aws:lambda:us-east-1:123456789012:function:myFunc
account_id = "123456789012"

# Will NOT detect (excluded contexts):
version = "1.2.3.4"
timestamp = "202312101234"
```

### AWS Regions (Warning)

Detects hardcoded AWS region strings.

```
# Will detect:
region = "us-east-1"
const REGION = 'eu-west-2'

# Excluded from:
*.tf, *.tfvars (Terraform legitimately specifies regions)
```

### API Keys (Error)

Detects patterns that look like hardcoded API keys.

```
# Will detect:
api_key = "sk_live_abcdefghij1234567890"
secret_key: "AKIAIOSFODNN7EXAMPLE"
```

### ARNs with Account IDs (Error)

Detects full ARNs that include account IDs.

```
# Will detect:
arn:aws:s3:::my-bucket
arn:aws:lambda:us-east-1:123456789012:function:myFunc
```

### S3 Bucket Names (Warning)

Detects environment-specific S3 bucket names.

```
# Will detect:
s3://my-app-dev-bucket
s3://data-production-store
```

### Hardcoded URLs (Info)

Detects non-localhost URLs.

```
# Will detect:
const API = "https://api.example.com"

# Excluded:
localhost, 127.0.0.1, example.com
*.md, *.txt, package.json files
```

## Scanned File Types

The validator scans these file extensions:

- TypeScript/JavaScript: `.ts`, `.tsx`, `.js`, `.jsx`
- Configuration: `.json`, `.yaml`, `.yml`
- Python: `.py`
- Infrastructure: `.tf`, `.tfvars`
- Shell: `.sh`
- Environment: `.env`
- Database: `.sql`

## Skipped Directories

These directories are automatically skipped:

- `node_modules`
- `.git`
- `dist`, `build`, `.next`
- `__pycache__`
- `.terraform`
- `coverage`, `.cache`
- `vendor`

## Exit Codes

| Code | Meaning                                                      |
| ---- | ------------------------------------------------------------ |
| 0    | Validation passed                                            |
| 1    | Validation failed (errors found, or warnings in strict mode) |

## Integration with cora-validate.py

This validator is automatically called by the unified orchestrator:

```bash
python cora-validate.py project /path/to/project --validators portability
```

## Example Output

### Text Output

```
======================================================================
CORA Portability Validation Report
======================================================================

Target: /path/to/my-project
Files Scanned: 47
Status: ✗ FAILED

Errors: 2
Warnings: 3
Info: 12

----------------------------------------------------------------------
Errors:
  ✗ Hardcoded AWS account ID detected
    File: /path/to/my-project/infra/main.tf:15
    Match: 123456789012
    Line: account_id = "123456789012"
    Suggestion: Use environment variable or Terraform variable for account ID

  ✗ Hardcoded ARN with account ID detected
    File: /path/to/my-project/src/config.ts:8
    Match: arn:aws:lambda:us-east-1:123456789012:
    Line: const LAMBDA_ARN = "arn:aws:lambda:us-east-1:123456789012:function:myFunc"
    Suggestion: Use Terraform data sources or variables for ARNs

----------------------------------------------------------------------
Warnings:
  ⚠ Hardcoded AWS region detected
    File: /path/to/my-project/src/config.ts:5
    Match: "us-east-1"
    Suggestion: Use environment variable AWS_REGION or configurable variable

======================================================================
```

### JSON Output

```json
{
  "target_path": "/path/to/my-project",
  "passed": false,
  "status": "failed",
  "errors": [
    {
      "message": "Hardcoded AWS account ID detected",
      "file": "/path/to/my-project/infra/main.tf",
      "line": 15,
      "line_content": "account_id = \"123456789012\"",
      "pattern": "aws_account_id",
      "matched_value": "123456789012",
      "suggestion": "Use environment variable or Terraform variable for account ID"
    }
  ],
  "warnings": [],
  "info": [],
  "files_scanned": 47,
  "summary": {
    "errors": 1,
    "warnings": 0,
    "info": 0,
    "total_issues": 1
  }
}
```

## Adding Custom Patterns

You can extend the validator with custom patterns:

```python
from portability_validator import PortabilityValidator

validator = PortabilityValidator()
validator.patterns["my_custom_pattern"] = {
    "pattern": r"my-specific-value",
    "severity": "warning",
    "message": "Custom hardcoded value detected",
    "suggestion": "Use environment variable instead",
}

result = validator.validate_path("/path/to/project")
```

## References

- [CORA Project Boilerplate](../../docs/cora-project-boilerplate.md)
- [CORA Documentation Standards](../../docs/cora-documentation-standards.md)
