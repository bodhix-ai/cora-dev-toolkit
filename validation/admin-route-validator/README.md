# CORA Admin Route Validator

Validates API Gateway routes against the CORA Admin API Routes Standard.

**Standard:** `docs/standards/standard_ADMIN-API-ROUTES.md`  
**ADR:** `docs/arch decisions/ADR-018b-API-GATEWAY-ROUTE-STANDARDS.md`

## Usage

```bash
# Basic usage
python validate_routes.py /path/to/project

# Verbose output (shows files being scanned)
python validate_routes.py /path/to/project --verbose

# JSON output for CI/CD
python validate_routes.py /path/to/project --output json
```

## What It Validates

### Route Categories

| Category | Pattern | Validation |
|----------|---------|------------|
| Sys Admin | `/admin/sys/{module}/{resource}` | Must have valid module shortname |
| Org Admin | `/admin/org/{module}/{resource}` | Must have valid module shortname |
| WS Admin | `/admin/ws/{wsId}/{module}/{resource}` | Must include `{wsId}` and valid module |
| Data API | `/{module}/{resource}` | Warns if module not in standard list |

### Valid Module Shortnames

- `access` (module-access)
- `ai` (module-ai)
- `mgmt` (module-mgmt)
- `ws` (module-ws)
- `kb` (module-kb)
- `chat` (module-chat)
- `voice` (module-voice)
- `eval` (module-eval)

### Anti-Patterns Detected

- Missing scope (sys/org/ws) in admin route
- Using `/api/` prefix for data routes
- Org ID in path for org admin routes
- Missing `{wsId}` in workspace admin routes
- Using `organization` instead of `org`
- Using full module name instead of shortname
- Trailing slashes
- Uppercase characters

## Output Example

```
======================================================================
CORA Admin Route Validation Report
======================================================================

Total routes scanned: 45
Compliant routes: 42
Non-compliant routes: 3

Routes by category:
  data_api: 25
  org_admin: 10
  sys_admin: 8
  ws_admin: 2

❌ ERRORS (3):
----------------------------------------------------------------------
  /admin/ai/providers
    File: modules/api/outputs.tf:23
    Issue: Admin route missing scope (sys/org/ws)
    → Use /admin/sys/, /admin/org/, or /admin/ws/{wsId}/

  /admin/ws/mgmt/modules
    File: modules/api/outputs.tf:45
    Issue: Missing {wsId} in workspace admin route
    → Expected: /admin/ws/{wsId}/mgmt/modules

======================================================================
❌ Status: FAILED - 3 route(s) non-compliant
======================================================================
```

## CI/CD Integration

```yaml
# .github/workflows/validate.yml
- name: Validate API Routes
  run: python validation/admin-route-validator/validate_routes.py .
```

Exit code is `1` if any errors found, `0` if all routes compliant.

## Files Scanned

The validator scans:
- **Terraform files:** `**/outputs.tf`, `**/routes.tf`, `**/api*.tf`
- **Lambda files:** `**/lambda_function.py` (docstring routes)

## Related Documentation

- `docs/standards/standard_ADMIN-API-ROUTES.md` - Route standard
- `docs/standards/standard_API-PATTERNS.md` - Request/response patterns
- `docs/arch decisions/ADR-018b-API-GATEWAY-ROUTE-STANDARDS.md` - Architecture decision