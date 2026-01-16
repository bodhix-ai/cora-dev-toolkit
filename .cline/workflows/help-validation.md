# CORA Validation Help

This workflow lists all available validation commands and their usage.

## Available Workflows

| Command | Purpose |
|---------|---------|
| `/validate.md` | Run full validation suite, see all errors |
| `/validate-backend.md` | Run backend validators only (Lambda, API, Auth) |
| `/validate-frontend.md` | Run frontend validators only (A11y, UI) |
| `/fix-backend.md` | Get backend fix guidance (Lambda, API Gateway) |
| `/fix-data.md` | Get database fix guidance (Schema, Naming, RLS) |
| `/fix-frontend.md` | Get frontend fix guidance (Accessibility, UI) |
| `/fix-structure.md` | Get structure fix guidance (Imports, Files) |
| `/fix-and-sync.md <file>` | Fix template and sync to test project |
| `/help-validation.md` | Show this help |

## Quick Start

1. **Run validation**: `/validate.md`
2. **Review errors**: Grouped by domain (Backend, Data, Frontend, Structure)
3. **Fix issues**: Say "Fix the [domain] errors" or use `/fix-[domain].md`
4. **Re-validate**: Run `/validate.md` again to confirm fixes

## Skill Activation

Skills provide deep expertise and activate automatically when you say:

| Domain | Trigger Phrases |
|--------|-----------------|
| **Backend** | "Fix the Lambda errors", "API routing issue", "authorizer problem", "502 error" |
| **Data** | "Fix the database naming", "schema error", "RLS policy", "ADR-011" |
| **Frontend** | "Fix the accessibility errors", "a11y issue", "WCAG", "Section 508" |
| **Structure** | "Fix the import violations", "module boundaries", "file structure" |

If skills don't activate, use the `/fix-*.md` workflows directly.

## Domain Reference

| Domain | Validators | Typical Errors |
|--------|------------|----------------|
| **Backend** | api-tracer, cora-compliance, role-naming | Lambda config, API routes, auth |
| **Data** | db-naming, schema, rpc-function | Table naming, RLS, migrations |
| **Frontend** | a11y, frontend-compliance | Alt text, labels, contrast |
| **Structure** | structure, import, portability | Cross-module imports, file locations |

## Troubleshooting

**Workflow not found?**
- Ensure `.cline/workflows/` exists
- Check that workflows are enabled in Cline Settings → Features

**Skill not activating?**
- Try more specific trigger phrases (see above)
- Use the fallback workflow: `/fix-backend.md`, `/fix-data.md`, etc.

**Validation script failing?**
- Ensure Python 3 is installed
- Run: `pip install -r validation/requirements.txt`
- Verify you're in the project root directory
