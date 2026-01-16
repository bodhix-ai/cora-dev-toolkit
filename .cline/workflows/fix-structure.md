# CORA Structure Fix Workflow

This workflow provides structure expertise for fixing project organization and import issues.

**Use this workflow when:**
- The `cora-toolkit-validation-structure` skill doesn't activate
- You want guaranteed access to structure remediation knowledge

## Two-Repo Pattern

Every CORA project uses two repositories:

| Repo | Contains | Example |
|------|----------|---------|
| `{project}-infra` | Terraform, deploy scripts, authorizer | `pm-app-infra` |
| `{project}-stack` | Next.js app, CORA modules | `pm-app-stack` |

## Module Structure

```
packages/module-{name}/
├── backend/
│   └── {lambda-name}/
│       └── lambda_function.py
├── frontend/
│   ├── components/
│   └── routes/
├── db/
│   └── schema.sql
└── README.md
```

## Import Restrictions

### Allowed Imports
- Modules can import from shared packages
- Functional modules can import from core modules
- Components can import from their own module

### Forbidden Imports
- ❌ Functional module → Functional module
- ❌ Core module → Functional module
- ❌ Cross-module direct imports

### Example
```typescript
// ❌ Bad - cross-module import
import { Component } from 'packages/module-kb/frontend/components';

// ✅ Good - import from shared
import { Component } from '@/shared/components';

// ✅ Good - import from same module
import { Component } from '../components';
```

## Route Locations

**CRITICAL**: Routes live at module root, NOT in `frontend/`:
- ✅ `templates/_modules-functional/{module}/routes/`
- ❌ `templates/_modules-functional/{module}/frontend/routes/`

The `create-cora-project.sh` script copies from `{module}/routes/`, not `{module}/frontend/routes/`.

## File Naming

### TypeScript/React
- Components: `PascalCase.tsx` (e.g., `InviteMemberDialog.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useOrgMembers.ts`)
- Utils: `camelCase.ts` (e.g., `formatDate.ts`)
- Types: `camelCase.types.ts` (e.g., `member.types.ts`)

### Python
- Modules: `snake_case.py` (e.g., `lambda_function.py`)
- Classes: `PascalCase` inside files

### SQL
- Migrations: `YYYYMMDD_description.sql`
- Schemas: `snake_case.sql`

## Common Fixes

### Cross-Module Import
1. Identify the shared functionality
2. Move to `@/shared/` if truly shared
3. Or duplicate in each module if module-specific
4. Update all imports

### Wrong Route Location
1. Move route files to `{module}/routes/`
2. Remove from `{module}/frontend/routes/`
3. Update any imports

### File Naming Violation
1. Rename file to follow convention
2. Update all imports
3. Update any dynamic imports
