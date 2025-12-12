# CORA Structure Validator

Validates project and module structure against CORA standards.

## Features

- **Project Validation**: Validates both stack and infra repo structures
- **Module Validation**: Validates individual CORA module structure
- **Automatic Detection**: Detects project type (stack vs infra) automatically
- **Multiple Output Formats**: Text, JSON, and Markdown reports

## Installation

```bash
cd cora-dev-toolkit/validation
pip install -r requirements.txt  # If any dependencies needed
```

## Usage

### Validate a Project

```bash
# Validate a stack project
python -m structure_validator.cli /path/to/my-project-stack

# Validate an infra project
python -m structure_validator.cli /path/to/my-project-infra
```

### Validate a Module

```bash
python -m structure_validator.cli /path/to/module-kb --module
```

### Output Formats

```bash
# Text output (default)
python -m structure_validator.cli /path/to/project

# JSON output (CI/CD friendly)
python -m structure_validator.cli /path/to/project --format json

# Markdown report
python -m structure_validator.cli /path/to/project --format markdown --output report.md
```

### Options

| Option            | Description                            |
| ----------------- | -------------------------------------- |
| `--module`, `-m`  | Validate as module (default: project)  |
| `--format`, `-f`  | Output format: text, json, markdown    |
| `--output`, `-o`  | Write report to file                   |
| `--verbose`, `-v` | Verbose output                         |
| `--no-color`      | Disable colored output                 |
| `--strict`        | Exit with error code if warnings found |

## Validation Rules

### Stack Project Rules

| Rule                      | Severity | Description                                           |
| ------------------------- | -------- | ----------------------------------------------------- |
| `stack-required-dir`      | Error    | apps/, packages/, scripts/ directories required       |
| `stack-required-file`     | Error    | pnpm-workspace.yaml, package.json, README.md required |
| `stack-recommended-file`  | Warning  | .clinerules, tsconfig.json, .gitignore recommended    |
| `pnpm-workspace-packages` | Error    | pnpm-workspace.yaml must have packages field          |
| `packages-empty`          | Warning  | packages/ should contain modules                      |
| `apps-web`                | Warning  | apps/web/ expected for Next.js app                    |

### Infra Project Rules

| Rule                  | Severity | Description                                  |
| --------------------- | -------- | -------------------------------------------- |
| `infra-required-dir`  | Error    | envs/, modules/, lambdas/, scripts/ required |
| `infra-required-file` | Error    | README.md required                           |
| `infra-environment`   | Warning  | envs/dev/, envs/stg/, envs/prd/ expected     |
| `terraform-files`     | Warning  | main.tf, variables.tf expected in each env   |
| `authorizer-lambda`   | Warning  | api-gateway-authorizer lambda expected       |

### Module Rules

| Rule                      | Severity | Description                               |
| ------------------------- | -------- | ----------------------------------------- |
| `module-naming`           | Warning  | Should follow module-{purpose} pattern    |
| `module-naming-purpose`   | Warning  | Purpose should be single word             |
| `module-required-file`    | Error    | package.json, README.md required          |
| `module-recommended-file` | Warning  | module.json, tsconfig.json recommended    |
| `module-json-field`       | Error    | module.json must have name, version, tier |
| `module-tier`             | Error    | tier must be 1, 2, or 3                   |
| `module-entry-point`      | Warning  | src/index.ts or src/index.tsx expected    |

### Common Rules

| Rule                 | Severity | Description                            |
| -------------------- | -------- | -------------------------------------- |
| `project-json`       | Warning  | project.json recommended               |
| `project-json-field` | Error    | name, version required in project.json |
| `package-name-match` | Warning  | Package name should match directory    |

## Exit Codes

| Code | Meaning                                                      |
| ---- | ------------------------------------------------------------ |
| 0    | Validation passed                                            |
| 1    | Validation failed (errors found, or warnings in strict mode) |

## Integration with cora-validate.py

This validator is automatically called by the unified orchestrator:

```bash
python cora-validate.py project /path/to/project --validators structure
```

## Example Output

### Text Output

```
======================================================================
CORA Structure Validation Report
======================================================================

Target: /path/to/my-project-stack
Type: project
Status: ✓ PASSED

Errors: 0
Warnings: 2
Info: 1

----------------------------------------------------------------------
Warnings:
  ⚠ Missing recommended file: .clinerules
    Path: /path/to/my-project-stack/.clinerules
    Rule: stack-recommended-file

  ⚠ Missing project.json file
    Path: /path/to/my-project-stack/project.json
    Rule: project-json
    Suggestion: Create project.json with project metadata

----------------------------------------------------------------------
Info:
  ℹ PyYAML not installed - skipping pnpm-workspace.yaml validation

======================================================================
```

### JSON Output

```json
{
  "target_path": "/path/to/my-project-stack",
  "validation_type": "project",
  "passed": true,
  "status": "passed",
  "errors": [],
  "warnings": [
    {
      "message": "Missing recommended file: .clinerules",
      "path": "/path/to/my-project-stack/.clinerules",
      "rule": "stack-recommended-file",
      "suggestion": null
    }
  ],
  "info": [],
  "summary": {
    "errors": 0,
    "warnings": 1,
    "info": 0,
    "total_issues": 1
  }
}
```

## References

- [CORA Project Boilerplate](../../docs/cora-project-boilerplate.md)
- [CORA Core Modules](../../docs/cora-core-modules.md)
- [CORA Module Definition of Done](../../docs/cora-module-definition-of-done.md)
