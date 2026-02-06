# Validator Output Format Standard

**Standard ID:** 05_std_quality_VALIDATOR-OUTPUT  
**Version:** 1.0  
**Created:** February 5, 2026  
**Related ADRs:** ADR-012 (Validation Skills Strategy)  
**Validators:** All validators  

---

## Overview

This standard defines the unified output format for all CORA validation tools. Consistent output enables:
- Module-level error aggregation across validators
- Better prioritization through severity levels
- Improved reporting and visualization
- Easier integration with CI/CD pipelines

---

## Standard Error/Warning Format

All validators MUST return errors and warnings in this format:

```python
{
    "module": str,           # Module name (e.g., "module-kb", "module-chat")
    "category": str,         # Error category (e.g., "Accessibility", "Route Matching")
    "file": str,            # File path relative to project root
    "line": int | None,     # Line number (optional, if applicable)
    "message": str,         # Human-readable error message
    "severity": str,        # Severity level: "critical", "high", "medium", "low"
    "suggestion": str | None # How to fix (optional)
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `module` | `str` | Module name extracted from file path |
| `category` | `str` | Error category for grouping related issues |
| `file` | `str` | Relative path to file containing the issue |
| `message` | `str` | Clear, actionable description of the problem |
| `severity` | `str` | One of: `critical`, `high`, `medium`, `low` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `line` | `int` | Line number where issue occurs (when available) |
| `suggestion` | `str` | Recommended fix or next steps |

---

## Module Extraction

The `module` field identifies which CORA module contains the error.

### Extraction Rules

1. **From file path:** Extract from `packages/module-{name}/` or `templates/_modules-*/module-{name}/`
2. **Format:** Always use `module-{name}` format (e.g., `module-kb`, not `kb`)
3. **Core modules:** Use full name (e.g., `module-access`, `module-ws`, `module-ai`)
4. **Functional modules:** Use full name (e.g., `module-eval`, `module-voice`)
5. **Non-module files:** Use `app-shell` or `infrastructure` as appropriate

### Example Extraction Patterns

```python
# Pattern 1: Stack repo package
"packages/module-kb/frontend/pages/KbPage.tsx" → "module-kb"

# Pattern 2: Template core module
"templates/_modules-core/module-access/backend/lambda.py" → "module-access"

# Pattern 3: Template functional module
"templates/_modules-functional/module-eval/frontend/EvalPage.tsx" → "module-eval"

# Pattern 4: App shell
"apps/web/app/page.tsx" → "app-shell"

# Pattern 5: Infrastructure
"envs/dev/main.tf" → "infrastructure"
```

### Utility Function

```python
from validation.shared.output_format import extract_module_from_path

module = extract_module_from_path("packages/module-kb/frontend/pages/KbPage.tsx")
# Returns: "module-kb"
```

---

## Category Taxonomy

The `category` field groups related errors for better organization.

### Standard Categories

| Category | Description | Example Errors |
|----------|-------------|----------------|
| **Accessibility** | WCAG/Section 508 compliance | Missing aria-labels, heading hierarchy |
| **Route Matching** | API Gateway ↔ Lambda ↔ Frontend | Route not found, orphaned routes |
| **Authentication** | Auth lifecycle validation | Missing auth checks, wrong helpers |
| **Authorization** | Permission/role validation | Missing role checks, scope validation |
| **Code Quality** | Type safety, naming, patterns | Any types, inline role lists |
| **Database** | Schema, naming, RLS | Table naming, missing RLS policies |
| **Documentation** | Code documentation | Missing docstrings, outdated comments |
| **Import** | Module boundaries, dependencies | Cross-module imports, circular deps |
| **Structure** | File organization | Wrong directory, missing files |
| **TypeScript** | Type checking | Type errors, missing types |

### Validator-Specific Categories

Validators may use custom categories when standard categories don't fit:

```python
# Custom category examples
"Lambda Deployment"    # Infrastructure validators
"Next.js Routing"      # Next.js-specific validators
"Workspace Plugin"     # Architecture-specific validators
```

---

## Severity Levels

The `severity` field indicates the impact and urgency of the issue.

### Severity Definitions

| Level | Symbol | When to Use | Examples |
|-------|--------|-------------|----------|
| **critical** | 🔴 | Security vulnerabilities, data loss risks | Missing auth checks, SQL injection risks |
| **high** | 🟠 | Functionality broken, major UX issues | Route 404s, broken API calls |
| **medium** | 🟡 | Code quality, best practices | Type safety, naming conventions |
| **low** | 🔵 | Suggestions, minor improvements | Orphaned routes, missing comments |

### Assignment Guidelines

```python
# Critical: Security/data issues
severity = "critical" if "missing auth" in error else ...

# High: Broken functionality
severity = "high" if "route not found" in error else ...

# Medium: Code quality
severity = "medium" if "type safety" in error else ...

# Low: Best practices
severity = "low" if "orphaned route" in error else ...
```

---

## Implementation Patterns

### Pattern 1: Using Shared Utility

```python
from validation.shared.output_format import create_error, create_warning

# Create an error
error = create_error(
    file="packages/module-kb/frontend/KbPage.tsx",
    line=42,
    message="Missing aria-label on IconButton",
    category="Accessibility",
    severity="high",
    suggestion="Add aria-label prop to IconButton"
)

# create_error automatically extracts module from file path
# Returns:
# {
#     "module": "module-kb",
#     "category": "Accessibility",
#     "file": "packages/module-kb/frontend/KbPage.tsx",
#     "line": 42,
#     "message": "Missing aria-label on IconButton",
#     "severity": "high",
#     "suggestion": "Add aria-label prop to IconButton"
# }
```

### Pattern 2: Manual Construction

```python
# When you need full control
error = {
    "module": extract_module_from_path(file_path),
    "category": "Route Matching",
    "file": file_path,
    "line": line_number,  # or None
    "message": f"Route {route} not found in API Gateway",
    "severity": "high",
    "suggestion": f"Add route to {lambda_name} Lambda configuration"
}
```

### Pattern 3: Validator Output

```python
class MyValidator:
    def validate(self, project_path: str) -> dict:
        errors = []
        warnings = []
        
        for issue in self.find_issues(project_path):
            error = create_error(
                file=issue.file,
                line=issue.line,
                message=issue.message,
                category=self.category_name,
                severity=issue.severity
            )
            errors.append(error)
        
        return {
            "validator": "my-validator",
            "errors": errors,
            "warnings": warnings,
            "summary": {...}
        }
```

---

## Migration Guide

### For Existing Validators

1. **Import shared utilities:**
   ```python
   from validation.shared.output_format import create_error, create_warning
   ```

2. **Update error creation:**
   ```python
   # Old way
   errors.append(f"Missing aria-label at {file}:{line}")
   
   # New way
   errors.append(create_error(
       file=file,
       line=line,
       message="Missing aria-label on IconButton",
       category="Accessibility",
       severity="high"
   ))
   ```

3. **Ensure all required fields:**
   - `module` - Extracted automatically from file path
   - `category` - Choose from standard taxonomy or create custom
   - `file` - Relative path to project root
   - `message` - Clear, actionable description
   - `severity` - One of: critical, high, medium, low

### Backward Compatibility

During migration period:
- Validators may return mix of old and new formats
- Orchestrator (`cora-validate.py`) handles both formats
- New format preferred for module aggregation

---

## Testing Requirements

### Unit Tests

Every validator MUST include tests that verify:
1. All errors include required fields
2. Module extraction works correctly
3. Severity levels are assigned consistently
4. File paths are relative to project root

### Example Test

```python
def test_validator_output_format():
    validator = MyValidator()
    results = validator.validate("test-project-path")
    
    for error in results["errors"]:
        # Required fields
        assert "module" in error
        assert "category" in error
        assert "file" in error
        assert "message" in error
        assert "severity" in error
        
        # Valid severity
        assert error["severity"] in ["critical", "high", "medium", "low"]
        
        # Module format
        assert error["module"].startswith("module-") or error["module"] in ["app-shell", "infrastructure"]
```

---

## Examples

### Example 1: Accessibility Error

```python
{
    "module": "module-kb",
    "category": "Accessibility",
    "file": "packages/module-kb/frontend/components/KbSearchBar.tsx",
    "line": 42,
    "message": "IconButton missing aria-label (WCAG 1.1.1)",
    "severity": "high",
    "suggestion": "Add aria-label=\"Search knowledge base\" to IconButton"
}
```

### Example 2: Route Matching Error

```python
{
    "module": "module-chat",
    "category": "Route Matching",
    "file": "packages/module-chat/frontend/api/chatApi.ts",
    "line": 156,
    "message": "Frontend calls route POST /chats/{chatId}/messages but route not found in API Gateway",
    "severity": "high",
    "suggestion": "Add route to chat-handler Lambda or update frontend to use correct route"
}
```

### Example 3: Type Safety Warning

```python
{
    "module": "module-eval",
    "category": "Code Quality",
    "file": "packages/module-eval/frontend/hooks/useEvaluations.ts",
    "line": 78,
    "message": "Function parameter uses 'any' type",
    "severity": "medium",
    "suggestion": "Replace 'any' with 'Evaluation' type"
}
```

### Example 4: Authentication Critical Error

```python
{
    "module": "module-ws",
    "category": "Authentication",
    "file": "packages/module-ws/backend/lambdas/workspace/lambda_function.py",
    "line": 234,
    "message": "Admin route /admin/ws/create missing check_sys_admin() call",
    "severity": "critical",
    "suggestion": "Add check_sys_admin(user_id) before allowing workspace creation"
}
```

---

## Related Standards

- **ADR-012:** Validation Skills Strategy
- **05_std_quality_ROLE-NAMING:** Role naming consistency
- **00_index_STANDARDS:** Standards index and organization

---

## Changelog

### Version 1.0 (February 5, 2026)
- Initial standard creation
- Defined required/optional fields
- Established module extraction rules
- Defined category taxonomy
- Defined severity levels
- Created implementation patterns
- Added migration guide

---

**Maintained by:** CORA Development Team  
**Questions:** See `docs/plans/plan_validator-enhancements.md`
