# CORA Standard: Module Frontend TypeScript Configuration

**Standard ID:** STANDARD-MODULE-TSCONFIG  
**Category:** Build Configuration  
**Status:** ✅ Required  
**Created:** 2026-01-19  
**Updated:** 2026-01-19  
**Related Standards:** CORA Module Structure

## Overview

All CORA modules **MUST** have a `tsconfig.json` file in their `frontend/` directory. This enables TypeScript compilation, type-checking, and module resolution.

## The Rule

**Every CORA module frontend MUST have:**
```
templates/_modules-{type}/{module-name}/frontend/tsconfig.json
```

**Examples:**
- ✅ `templates/_modules-core/module-kb/frontend/tsconfig.json`
- ✅ `templates/_modules-functional/module-voice/frontend/tsconfig.json`
- ❌ Missing tsconfig.json → Module cannot be built

## Standard Pattern

### Required Configuration

```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

### Configuration Breakdown

| Property | Value | Purpose |
|----------|-------|---------|
| `extends` | `"../../../tsconfig.json"` | Inherits root TypeScript config |
| `outDir` | `"dist"` | Compiled output directory |
| `jsx` | `"react-jsx"` | React JSX transformation |
| `esModuleInterop` | `true` | CommonJS/ES module compatibility |
| `skipLibCheck` | `true` | Faster builds (skip .d.ts validation) |
| `include` | `["**/*.ts", "**/*.tsx"]` | Source files to compile |
| `exclude` | `["node_modules", "dist"]` | Exclude from compilation |

## Why This Standard Exists

### The Problem (Before)

Without `tsconfig.json`:
- ❌ TypeScript cannot compile the module
- ❌ `pnpm build` fails for the module package
- ❌ No `dist/` directory is generated
- ❌ TypeScript cannot resolve imports like `@{project}/module-{name}`
- ❌ 2,150+ "Cannot find module" errors in validation

### The Solution (After)

With proper `tsconfig.json`:
- ✅ TypeScript compiles the module successfully
- ✅ `pnpm build` generates `dist/` directory
- ✅ Module imports resolve correctly
- ✅ Type-checking works across the codebase
- ✅ 98% reduction in TypeScript errors

## Impact

**Discovery Date:** 2026-01-19  
**Impact:** Adding tsconfig.json to module-voice and module-eval eliminated **2,105 TypeScript errors** (98% reduction!)

## File Locations

### In CORA Toolkit Templates

```
cora-dev-toolkit/
└── templates/
    ├── _modules-core/
    │   ├── module-access/frontend/tsconfig.json
    │   ├── module-ai/frontend/tsconfig.json
    │   ├── module-chat/frontend/tsconfig.json
    │   ├── module-kb/frontend/tsconfig.json
    │   └── module-mgmt/frontend/tsconfig.json
    └── _modules-functional/
        ├── module-eval/frontend/tsconfig.json
        ├── module-voice/frontend/tsconfig.json
        └── module-ws/frontend/tsconfig.json
```

### In Generated Projects

```
{project}-stack/
└── packages/
    ├── module-access/
    │   └── frontend/tsconfig.json
    ├── module-kb/
    │   └── frontend/tsconfig.json
    └── (other modules...)
```

The `create-cora-project.sh` script copies these files from templates to the generated project.

## Validation

### Automated Validator (TODO)

Create a validator that checks:
```python
# Pseudocode for validator
for module in get_all_modules():
    tsconfig_path = f"{module}/frontend/tsconfig.json"
    if not file_exists(tsconfig_path):
        error(f"Missing: {tsconfig_path}")
    else:
        validate_tsconfig_pattern(tsconfig_path)
```

### Manual Check

```bash
# Check if tsconfig.json exists for all modules
find templates/_modules-* -type d -name "frontend" -exec test -f {}/tsconfig.json \; -print

# Or use this one-liner to find missing tsconfig.json files:
find templates/_modules-* -type d -name "frontend" ! -exec test -f {}/tsconfig.json \; -print
```

## Creating New Modules

When creating a new CORA module:

1. **Create the frontend directory:**
   ```bash
   mkdir -p templates/_modules-functional/module-{name}/frontend
   ```

2. **Copy the standard tsconfig.json:**
   ```bash
   cp templates/_modules-core/module-kb/frontend/tsconfig.json \
      templates/_modules-functional/module-{name}/frontend/tsconfig.json
   ```

3. **Or create from template:**
   ```json
   {
     "extends": "../../../tsconfig.json",
     "compilerOptions": {
       "outDir": "dist",
       "jsx": "react-jsx",
       "esModuleInterop": true,
       "skipLibCheck": true
     },
     "include": ["**/*.ts", "**/*.tsx"],
     "exclude": ["node_modules", "dist"]
   }
   ```

4. **Verify it builds:**
   ```bash
   cd templates/_modules-functional/module-{name}/frontend
   pnpm tsc
   ```

## Common Issues

### Missing tsconfig.json

**Symptom:**
```
error TS5083: Cannot read file 'tsconfig.json'.
ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL build: `tsc -b`
```

**Solution:**
Add `tsconfig.json` to the module's `frontend/` directory using the standard pattern above.

### Wrong extends Path

**Symptom:**
```
error TS5090: Cannot find referenced config file '../../../tsconfig.json'.
```

**Solution:**
Ensure `extends` path is correct relative to module location:
- Core modules: `"../../../tsconfig.json"`
- Functional modules: `"../../../tsconfig.json"`

### Incorrect outDir

**Symptom:**
Build succeeds but no `dist/` directory created, or files in wrong location.

**Solution:**
Ensure `outDir` is set to `"dist"` (relative to frontend directory).

## Related Standards

- **Module Structure:** Modules must follow standard directory structure
- **Module Naming:** Modules use `module-{purpose}` naming convention
- **Build Process:** All modules must be buildable with `pnpm build`
- **Import Patterns:** Modules use `@{project}/module-{name}` import pattern

## References

- **Discovery:** Validation Remediation Phase 1.2 (2026-01-19)
- **Plan:** `docs/plans/plan_validation-remediation.md`
- **Commit:** eafb4c2 - "feat: add missing tsconfig.json files for module frontends"
- **Impact:** 2,105 errors eliminated (98% reduction)

## Next Steps

- [ ] Create automated validator for tsconfig.json presence
- [ ] Add tsconfig.json check to module template scaffolding
- [ ] Document in module development guide
- [ ] Add to pre-commit hooks

---

**Key Takeaway:** Every CORA module frontend needs `tsconfig.json` to be buildable and type-checkable. This is a required configuration file, not optional.
