# Schema Validator

**Validates Lambda database queries against actual Supabase schema.**

Part of Phase 1 Validation Tools for CORA Migration Master Plan.

## Overview

The Schema Validator analyzes Python Lambda functions, extracts Supabase database queries using AST parsing, and validates them against the actual database schema. It detects mismatches and proposes fixes (migrations OR code changes).

### Key Features

- **AST-based query extraction** - Parses Python code to find Supabase queries
- **Live schema introspection** - Connects to Supabase to get actual schema
- **Smart error detection** - Finds missing tables, wrong column names, type mismatches
- **Proposed fixes** - Generates SQL migrations or code patches with confidence scores
- **Multiple output formats** - Text, JSON (AI-friendly), and Markdown
- **Zero false positives** - Careful validation logic to avoid noise

### Why This Tool Is Critical

**Phase 0 Deployment Failures** (November 24, 2025):

- **ai-config-module**: Schema mismatch causing 500 errors (wrong column names)
- **ai-enablement-module**: Invalid function imports
- **Impact**: 3+ hours debugging time per deployment failure

**Solution**: Automated validation catches issues in <1 minute before deployment.

---

## Installation

### Prerequisites

- Python 3.11+
- Access to Supabase database
- Environment variables for database connection

### Install Dependencies

```bash
cd pm-app-stack/scripts/validation/schema-validator
pip install -r requirements.txt
```

---

## Configuration

### Environment Variables

Create a `.env` file in the `schema-validator` directory (or project root):

```bash
# Supabase Database Credentials
SUPABASE_DB_HOST=your-db-host.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-password
```

**⚠️ Important**: The `.env` file should be gitignored. Never commit credentials.

### Check Credentials

Verify credentials are configured correctly:

```bash
python cli.py check-credentials
```

Output:

```
✅ All required environment variables are configured.
```

---

## Usage

### Basic Usage

Validate a single Lambda file:

```bash
python cli.py --path /path/to/lambda_function.py
```

Validate a directory (recursive):

```bash
python cli.py --path /path/to/packages/
```

### Output Formats

#### Text Output (Human-Readable)

```bash
python cli.py --path packages/ai-config-module/backend/lambdas/ --output text
```

Output:

```
================================================================================
SCHEMA VALIDATION REPORT
================================================================================

Status: FAILED
Total Queries Checked: 15
Tables Checked: 3
Errors: 2
Warnings: 0

--------------------------------------------------------------------------------
ERRORS
--------------------------------------------------------------------------------

[1] Column 'org_id' does not exist in table 'kb_bases'
    File: packages/kb-module/backend/lambdas/kb-base/lambda_function.py
    Line: 42
    Table: kb_bases
    Column: org_id
    Suggestion: Did you mean 'organization_id'?

================================================================================
✗ Schema validation failed. Please review errors above.
================================================================================
```

#### JSON Output (AI-Friendly) ⭐ **RECOMMENDED FOR AI AGENTS**

```bash
python cli.py --path packages/ --output json
```

Output:

```json
{
  "status": "failed",
  "summary": {
    "total_queries": 15,
    "error_count": 2,
    "warning_count": 0,
    "tables_checked": 3
  },
  "errors": [
    {
      "severity": "error",
      "file": "packages/kb-module/backend/lambdas/kb-base/lambda_function.py",
      "line": 42,
      "table": "kb_bases",
      "column": "org_id",
      "issue": "Column 'org_id' does not exist in table 'kb_bases'",
      "suggestion": "Did you mean 'organization_id'?"
    }
  ],
  "warnings": []
}
```

#### Markdown Output (GitHub PR Comments)

```bash
python cli.py --path packages/ --output markdown
```

Output: Formatted markdown report with emoji and proper formatting for GitHub.

### Proposed Fixes

Generate proposed fixes for validation errors:

```bash
python cli.py --path packages/ --propose-fixes
```

Output includes:

- **Code patches** - For typos and obvious fixes (high confidence)
- **SQL migrations** - For missing tables/columns (lower confidence)
- **Confidence scores** - How confident the tool is about each fix
- **Rationale** - Explanation for each proposed fix

### Verbose Logging

Enable debug logging:

```bash
python cli.py --path packages/ --verbose
```

### Clear Cache

Force schema re-introspection:

```bash
python cli.py --path packages/ --clear-cache
```

---

## AI Usage Guide

### For AI Agents (Cline, GitHub Copilot, etc.)

**Recommended Command:**

```bash
python pm-app-stack/scripts/validation/schema-validator/cli.py \
  --path pm-app-stack/packages/ \
  --output json \
  --propose-fixes
```

**Why JSON output?**

- Structured data easy to parse
- Machine-readable error details
- Can be piped to other tools
- No ANSI color codes

**Exit Codes:**

- `0` - Validation passed
- `1` - Validation failed (errors found)
- `2` - Tool error (configuration issue, exception)

### Example AI Workflow

1. **Run validation**:

   ```bash
   python cli.py --path packages/ai-config-module/ --output json > validation.json
   ```

2. **Parse JSON output**:

   ```python
   import json
   with open('validation.json') as f:
       report = json.load(f)

   if report['status'] == 'failed':
       for error in report['errors']:
           print(f"Fix needed: {error['file']}:{error['line']}")
           print(f"  Issue: {error['issue']}")
           print(f"  Suggestion: {error['suggestion']}")
   ```

3. **Apply fixes programmatically**:
   - Parse error location (file + line)
   - Read suggestion
   - Apply code change or generate migration

---

## Advanced Usage

### List All Tables

```bash
python cli.py list-tables
```

Output:

```
📊 Found 25 tables:
   - kb_bases
   - kb_documents
   - organizations
   - profiles
   - ...
```

JSON format:

```bash
python cli.py list-tables --output json
```

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│  CLI (cli.py)                                   │
│  - Command-line interface                       │
│  - Orchestrates validation workflow             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Schema Inspector (schema_inspector.py)         │
│  - Connects to Supabase                         │
│  - Introspects database schema                  │
│  - Caches schema for performance                │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Query Parser (query_parser.py)                 │
│  - Parses Python files with AST                 │
│  - Extracts Supabase client calls               │
│  - Builds query reference map                   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Validator (validator.py)                       │
│  - Compares queries vs schema                   │
│  - Detects mismatches                           │
│  - Generates validation report                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Fix Proposer (fix_proposer.py)                 │
│  - Generates SQL migrations                     │
│  - Generates code patches                       │
│  - Assigns confidence scores                    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Reporter (reporter.py)                         │
│  - Formats output (text/json/markdown)          │
│  - Color-coded terminal output                  │
│  - AI-friendly JSON format                      │
└─────────────────────────────────────────────────┘
```

### Detected Query Patterns

- `.select()` - Column list extraction
- `.insert()` - Column list from dict keys
- `.update()` - Column list from dict keys
- `.delete()` - No column validation
- `.eq()`, `.neq()`, `.gt()`, `.lt()` - Filter column extraction
- `.filter()` - Complex filter column extraction

### Example Detected Queries

```python
# Detected: table='kb_bases', columns=['id', 'name', 'org_id'], operation='select'
supabase.table('kb_bases').select('id', 'name', 'org_id').execute()

# Detected: table='profiles', columns=['email', 'name'], operation='insert'
supabase.table('profiles').insert({'email': email, 'name': name}).execute()

# Detected: table='kb_bases', columns=['organization_id'], operation='eq'
supabase.table('kb_bases').select('*').eq('organization_id', org_id).execute()
```

---

## Troubleshooting

### "Connection refused" or "Database connection failed"

**Problem**: Cannot connect to Supabase database.

**Solution**:

1. Check `.env` file exists and has correct credentials
2. Verify network connectivity to Supabase
3. Run `python cli.py check-credentials`

### "No queries found"

**Problem**: Parser didn't detect any Supabase queries.

**Solution**:

1. Verify files contain Supabase client calls (`.table().select()`, etc.)
2. Check Python syntax is valid
3. Run with `--verbose` to see parsing details

### "ModuleNotFoundError: No module named 'psycopg2'"

**Problem**: Dependencies not installed.

**Solution**:

```bash
pip install -r requirements.txt
```

### False Positives

**Problem**: Tool reports errors that aren't actually errors.

**Solution**:

1. Check if column name is dynamic (variable, not string literal)
2. Parser may not detect complex query patterns
3. Report issue for investigation

---

## Integration

### Pre-Commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Validate staged Lambda files

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep 'backend/lambdas/.*\.py$')

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

python pm-app-stack/scripts/validation/schema-validator/cli.py \
  --path pm-app-stack/packages/ \
  --output text

if [ $? -ne 0 ]; then
  echo "❌ Schema validation failed. Fix issues or use 'git commit --no-verify' to skip."
  exit 1
fi
```

### CI/CD (GitHub Actions)

See Session 3 of Implementation Plan for CI/CD integration.

---

## Examples

### Example 1: Validate Single Module

```bash
python cli.py --path ../../packages/ai-config-module/backend/lambdas/
```

### Example 2: Validate All Packages with Fixes

```bash
python cli.py --path ../../packages/ --propose-fixes --output json
```

### Example 3: Check Specific File

```bash
python cli.py --path ../../packages/kb-module/backend/lambdas/kb-base/lambda_function.py
```

---

## API Reference (Python)

### Programmatic Usage

```python
from schema_inspector import SchemaInspector
from query_parser import QueryParser
from validator import Validator
from reporter import Reporter

# Initialize
inspector = SchemaInspector()
parser = QueryParser()
validator = Validator(inspector, parser)
reporter = Reporter()

# Validate
report = validator.validate('/path/to/lambda_function.py')

# Get JSON output
import json
json_report = reporter.format_report(report, output_format='json')
data = json.loads(json_report)

# Check status
if data['status'] == 'failed':
    for error in data['errors']:
        print(f"Error: {error['issue']}")

# Cleanup
inspector.close()
```

---

## Contributing

When modifying this tool:

1. Follow existing code patterns
2. Update this README
3. Test against actual Lambda functions
4. Ensure JSON output remains AI-friendly
5. Add new detection patterns to `query_parser.py`

---

## Version History

- **v1.0.0** (November 25, 2025) - Initial implementation
  - AST-based query parsing
  - Schema introspection
  - Fix proposal system
  - Multiple output formats

---

## Related Documentation

- Implementation Plan: `pm-app-stack/docs/implementation/phase-1-validation-tools-implementation-plan.md`
- CORA Migration Master Plan: `pm-app-stack/docs/project/cora-migration-master-plan.md`
- Memory Bank: `pm-app-stack/memory-bank/activeContext.md`

---

## Support

For issues or questions:

1. Check this README
2. Review implementation plan
3. Run with `--verbose` for debug info
4. Check `.env` file configuration

---

**Built for AI agents and developers alike.** 🤖 + 👨‍💻
