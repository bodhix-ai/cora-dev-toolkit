# API Full Stack Tracer

**Validates complete API request flow: Frontend → API Gateway → Lambda → Response**

Part of Phase 1 Validation Tools for CORA Migration Master Plan.

## Overview

The API Full Stack Tracer analyzes API contracts across all three layers of the application stack and validates they are consistent. It detects route mismatches, parameter issues, and response format errors before they reach production.

### Key Features

- **Multi-layer parsing** - Parses TypeScript (frontend), Terraform (gateway), Python (Lambda)
- **Smart pattern detection** - Handles multiple API client patterns (fetch, SWR, authenticated clients)
- **Contract validation** - Ensures frontend → gateway → Lambda contracts match
- **Route matching** - Detects missing routes, method mismatches, parameter issues
- **Multiple output formats** - Text, JSON (AI-friendly), and Markdown
- **Zero false positives** - Careful validation logic to avoid noise

### Why This Tool Is Critical

**Phase 0 Integration Failures** (November 24, 2025):

- **ai-config-module**: Response format mismatch (wrapped vs unwrapped data)
- **ai-enablement-module**: Frontend expects array but receives object
- **Impact**: 3+ hours debugging integration issues

**Solution**: Automated validation catches mismatches in <1 minute before deployment.

---

## Installation

### Prerequisites

- Python 3.11+
- Access to project codebase (TypeScript, Terraform, Python)

### Install Dependencies

```bash
cd pm-app-stack/scripts/validation/api-tracer
pip install -r requirements.txt
```

---

## Usage

### Basic Usage

Validate entire project:

```bash
python cli.py --path /path/to/pm-app-stack
```

### Output Formats

#### Text Output (Human-Readable)

```bash
python cli.py --path pm-app-stack --output text
```

Output:

```
================================================================================
API FULL STACK VALIDATION REPORT
================================================================================

Status: FAILED
Frontend API Calls: 42
API Gateway Routes: 38
Lambda Handlers: 35
Mismatches Found: 4
Warnings: 2

--------------------------------------------------------------------------------
ERRORS
--------------------------------------------------------------------------------

[1] ROUTE_NOT_FOUND: Frontend calls endpoint that doesn't exist in API Gateway
    Endpoint: GET /organizations/{orgId}/kb/settings
    Frontend: packages/kb-module/frontend/hooks/useKBSettings.ts:15
    Suggestion: Add route to API Gateway or remove frontend call

================================================================================
✗ API validation failed. Please review mismatches above.
================================================================================
```

#### JSON Output (AI-Friendly) ⭐ **RECOMMENDED FOR AI AGENTS**

```bash
python cli.py --path pm-app-stack --output json
```

Output:

```json
{
  "status": "failed",
  "summary": {
    "frontend_calls": 42,
    "gateway_routes": 38,
    "lambda_handlers": 35,
    "mismatches": 4
  },
  "errors": [
    {
      "severity": "error",
      "mismatch_type": "route_not_found",
      "endpoint": "/organizations/{orgId}/kb/settings",
      "method": "GET",
      "frontend_file": "packages/kb-module/frontend/hooks/useKBSettings.ts",
      "frontend_line": 15,
      "gateway_file": null,
      "lambda_file": null,
      "issue": "Frontend calls endpoint that doesn't exist in API Gateway",
      "suggestion": "Add route to API Gateway or remove frontend call"
    }
  ]
}
```

#### Markdown Output (GitHub PR Comments)

```bash
python cli.py --path pm-app-stack --output markdown
```

### Testing Individual Layers

Parse frontend API calls only:

```bash
python cli.py --path pm-app-stack --frontend-only
```

Parse API Gateway routes only:

```bash
python cli.py --path pm-app-stack --gateway-only
```

Parse Lambda handlers only:

```bash
python cli.py --path pm-app-stack --lambda-only
```

### Verbose Logging

Enable debug logging:

```bash
python cli.py --path pm-app-stack --verbose
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
│  Frontend Parser (frontend_parser.py)           │
│  - Parses TypeScript/JavaScript files           │
│  - Extracts API calls (fetch, SWR, clients)     │
│  - Builds frontend API contract                 │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Gateway Parser (gateway_parser.py)             │
│  - Parses Terraform configuration               │
│  - Extracts API Gateway routes                  │
│  - Builds gateway route map                     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Lambda Parser (lambda_parser.py)               │
│  - Parses Python Lambda handlers                │
│  - Extracts route handlers (AST-based)          │
│  - Builds Lambda API contract                   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Validator (validator.py) - SESSION 7          │
│  - Matches frontend → gateway → Lambda          │
│  - Detects mismatches                           │
│  - Generates validation report                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Reporter (reporter.py)                         │
│  - Formats output (text/json/markdown)          │
│  - Color-coded terminal output                  │
│  - AI-friendly JSON format                      │
└─────────────────────────────────────────────────┘
```

### Detected Patterns

#### Frontend API Calls

- Direct `fetch()` calls
- `authenticatedClient.get/post/put/delete()` calls
- `useSWR()` hooks
- Custom API client wrappers

#### API Gateway Routes

- `aws_apigatewayv2_route` resources (HTTP API)
- `aws_api_gateway_method` resources (REST API)
- Modular API gateway pattern (custom module)

#### Lambda Handlers

- Method-based routing: `if method == 'GET':`
- Path-based routing: `if path.startswith('/organizations'):`
- Handler functions: `handle_list_bases()`, etc.
- **Dispatcher pattern** (via docstring): Routes documented in module docstring

---

## Dispatcher Pattern Support (Added Nov 30, 2025)

### What is the Dispatcher Pattern?

Some Lambdas use a **dispatcher pattern** where a single `lambda_handler()` function routes requests based on path parameters (e.g., `orgId`, `chatId`) rather than explicit path string matching. This pattern is common in multi-scope modules like `kb-module`.

**Example dispatcher pattern:**

```python
def lambda_handler(event, context):
    path_params = event.get('pathParameters', {}) or {}
    org_id = path_params.get('orgId')
    chat_id = path_params.get('chatId')

    if chat_id:
        return _handle_chat_scope(event, ...)
    elif org_id:
        return _handle_org_scope(event, ...)
```

The traditional AST parser looks for patterns like `if method == 'GET':` or `if path == '/some/path':`, which don't exist in dispatcher pattern Lambdas.

### How to Document Routes for Dispatcher Pattern Lambdas

To enable API Tracer validation for dispatcher pattern Lambdas, add routes to the **module docstring** at the top of the file:

```python
"""
My Lambda Function - CORA Compliant
Handles XYZ operations.

Routes - Organization Scoped:
- GET    /organizations/{orgId}/resource           - List resources
- POST   /organizations/{orgId}/resource           - Create resource
- DELETE /organizations/{orgId}/resource/{id}      - Delete resource

Routes - Chat Scoped:
- GET    /chats/{chatId}/resource                  - Get chat resource
- POST   /chats/{chatId}/resource                  - Create chat resource
"""
```

**Format:** `- METHOD  /path/{param}  - description`

The API Tracer will automatically:

1. Detect the module docstring
2. Parse routes matching the `- METHOD /path` pattern
3. Extract path parameters from `{param}` placeholders
4. Skip AST-based parsing if docstring routes are found

### Troubleshooting Dispatcher Pattern Issues

#### Issue: "Missing Lambda Handler" errors for routes that work in production

**Symptoms:**

- API Tracer reports routes as missing handlers
- The Lambda uses a dispatcher pattern (routes via pathParameters)
- Routes are correctly defined in `infrastructure/outputs.tf`

**Solution:**
Add routes to the module docstring at the top of `lambda_function.py`:

```python
"""
My Lambda Function

Routes:
- GET    /path/{param}/resource    - Description
- POST   /path/{param}/resource    - Description
"""
```

#### Issue: Routes not detected from docstring

**Check these:**

1. **Docstring must be at module level** (first statement in file)
2. **Format must match**: `- METHOD  /path  - description` (hyphen, space, method, spaces, path)
3. **Methods supported**: GET, POST, PUT, PATCH, DELETE (case-insensitive)
4. **Path must start with `/`**

**Debug command:**

```bash
python3 -c "
import sys
sys.path.insert(0, 'scripts/validation/api-tracer')
from lambda_parser import LambdaParser
parser = LambdaParser()
routes = parser.parse_file('packages/your-module/backend/lambdas/your-lambda/lambda_function.py')
for r in routes:
    print(f'{r.method:6} {r.path}')
print(f'Total: {len(routes)} routes')
"
```

#### Issue: Both docstring and AST routes being detected

This shouldn't happen - docstring routes take precedence. If docstring routes are found, AST parsing is skipped. Check the logs for `(docstring)` vs `(AST)`:

```
lambda_parser - INFO - Parsed path/to/lambda_function.py (docstring): found 6 route handlers
```

### Example: kb-module Dispatcher Pattern

The `kb-module` uses the dispatcher pattern for multi-scope support:

**`kb-base/lambda_function.py`:**

```python
"""
KB Base Lambda Function - CORA Compliant
Handles multi-scope knowledge base CRUD operations.

Routes - Organization Scoped:
- GET    /organizations/{orgId}/kb           - List all KBs for organization
- POST   /organizations/{orgId}/kb           - Create new organization KB
- PATCH  /organizations/{orgId}/kb/{kbId}    - Update KB settings

Routes - Chat Scoped:
- GET    /chats/{chatId}/kb                  - Get or list KB for chat
- POST   /chats/{chatId}/kb                  - Create chat-scoped KB
- PATCH  /chats/{chatId}/kb/{kbId}           - Update chat KB settings
"""
```

**Validation result:**

```
=== kb-base Lambda ===
GET    /organizations/{orgId}/kb
POST   /organizations/{orgId}/kb
PATCH  /organizations/{orgId}/kb/{kbId}
GET    /chats/{chatId}/kb
POST   /chats/{chatId}/kb
PATCH  /chats/{chatId}/kb/{kbId}
Total: 6 routes
```

---

## Session 6 Status (Current)

**What's Complete:**

- ✅ Frontend parser (TypeScript/JavaScript API calls)
- ✅ Gateway parser (Terraform API Gateway routes)
- ✅ Lambda parser (Python handler routes)
- ✅ Reporter (text, JSON, markdown output)
- ✅ CLI (command-line interface with testing modes)

**What's Pending (Session 7):**

- ⚠️ Cross-layer validation logic
- ⚠️ Route matching (frontend → gateway → Lambda)
- ⚠️ Parameter validation
- ⚠️ Response format validation

**Current Capability:**

- Parse all three layers independently
- Export parsed data as JSON
- View unique endpoints/routes per layer

**Testing Commands (Session 6):**

```bash
# Test frontend parser
python cli.py --path pm-app-stack --frontend-only --output json

# Test gateway parser
python cli.py --path pm-app-stack --gateway-only --output json

# Test Lambda parser
python cli.py --path pm-app-stack --lambda-only --output json
```

---

## Examples

### Example 1: Parse Frontend API Calls

```bash
cd pm-app-stack/scripts/validation/api-tracer
python cli.py --path ../../ --frontend-only
```

Output:

```
✅ Found 42 frontend API calls
Unique endpoints: 25
  - GET /organizations/{orgId}/kb
  - POST /organizations/{orgId}/kb
  - GET /organizations/{orgId}/kb/{kbId}
  - ...
```

### Example 2: Parse API Gateway Routes

```bash
python cli.py --path ../../ --gateway-only --output json
```

Output:

```json
{
  "total_routes": 38,
  "unique_routes": [
    "GET /organizations/{orgId}/kb",
    "POST /organizations/{orgId}/kb",
    ...
  ],
  "methods": {
    "GET": 20,
    "POST": 10,
    "PUT": 5,
    "PATCH": 2,
    "DELETE": 1
  }
}
```

### Example 3: Parse Lambda Handlers

```bash
python cli.py --path ../../ --lambda-only
```

---

## AI Usage Guide

### For AI Agents (Cline, GitHub Copilot, etc.)

**Recommended Command:**

```bash
python pm-app-stack/scripts/validation/api-tracer/cli.py \
  --path pm-app-stack \
  --output json
```

**Why JSON output?**

- Structured data easy to parse
- Machine-readable error details
- Can be piped to other tools
- No ANSI color codes

**Exit Codes:**

- `0` - Validation passed
- `1` - Validation failed (mismatches found)
- `2` - Tool error (configuration issue, exception)

### Example AI Workflow

1. **Parse all layers**:

   ```bash
   python cli.py --path pm-app-stack --frontend-only --output json > frontend.json
   python cli.py --path pm-app-stack --gateway-only --output json > gateway.json
   python cli.py --path pm-app-stack --lambda-only --output json > lambda.json
   ```

2. **Analyze results**:

   ```python
   import json

   with open('frontend.json') as f:
       frontend = json.load(f)

   print(f"Frontend calls: {frontend['total_calls']}")
   print(f"Unique endpoints: {len(frontend['unique_endpoints'])}")
   ```

---

## Troubleshooting

### "ModuleNotFoundError"

**Problem**: Dependencies not installed.

**Solution**:

```bash
pip install -r requirements.txt
```

### "No API calls found"

**Problem**: Parser didn't detect API calls in frontend.

**Solution**:

1. Verify files contain API client calls (fetch, SWR, authenticatedClient)
2. Run with `--verbose` to see parsing details
3. Check if file paths are correct

### "No routes found"

**Problem**: Parser didn't detect routes in Terraform or Lambda files.

**Solution**:

1. Verify Terraform files use supported patterns (see Architecture section)
2. Verify Lambda files have route handlers
3. Run with `--verbose` to see parsing details

---

## Integration (Session 7)

Session 7 will add:

- Pre-commit hooks
- GitHub Actions workflow
- PR comment integration
- Full validation logic

---

## Version History

- **v1.1.0** (November 30, 2025) - Dispatcher Pattern Support
  - Added docstring route parsing for dispatcher pattern Lambdas
  - Lambda parser now tries docstring parsing first, falls back to AST
  - Updated pre-commit hook guidance
  - Added troubleshooting section for dispatcher pattern issues

- **v1.0.0** (November 25, 2025) - Session 6 Implementation
  - Frontend parser (TypeScript/JavaScript)
  - Gateway parser (Terraform)
  - Lambda parser (Python AST)
  - Reporter (text, JSON, markdown)
  - CLI with testing modes

---

## Related Documentation

- Implementation Plan: `pm-app-stack/docs/implementation/phase-1-validation-tools-implementation-plan.md`
- CORA Migration Master Plan: `pm-app-stack/docs/project/cora-migration-master-plan.md`
- Memory Bank: `pm-app-stack/memory-bank/activeContext.md`

---

**Built for AI agents and developers alike.** 🤖 + 👨‍💻

**Session 7 Status:** ✅ Cross-layer validation complete
**Dispatcher Pattern:** ✅ Docstring route parsing supported (Nov 30, 2025)
