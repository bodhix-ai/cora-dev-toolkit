# CORA Frontend Standards & Compliance

**Purpose**: Define frontend standards specific to CORA modular architecture, complementing existing UI/UX documentation.

**Status**: 🟡 In Progress  
**Created**: November 9, 2025  
**Scope**: Module frontend development standards and automated compliance checking

---

## Related Documentation

This document builds upon existing frontend standards:

- **Base UI/UX**: `docs/design/ui-specs.md` - Complete UI specifications
- **UI Standards**: `docs/design/ui-standards.md` - Buttons, icons, spacing, accessibility
- **UI Accessibility**: `docs/design/ui-accessibility-spec.md` - WCAG compliance
- **Architecture**: `docs/architecture/frontend.md` - Frontend architecture
- **NextAuth Pattern**: `docs/architecture/ADR-004-NEXTAUTH-API-CLIENT-PATTERN.md`

---

## 1. CORA-Specific Frontend Patterns

### 1.1 Module Structure Standards

Every CORA module frontend must follow this structure:

```
packages/[module-name]/frontend/
├── components/           # React components
│   ├── [entity]/        # Entity-specific components
│   │   ├── EntityList.tsx
│   │   ├── EntityCard.tsx
│   │   ├── EntityForm.tsx
│   │   └── EntityDetail.tsx
│   └── index.ts         # Barrel export
├── hooks/               # Custom hooks
│   ├── use[Entity].ts   # Data fetching hook
│   ├── use[Entity]Form.ts
│   └── index.ts
├── lib/                 # Module utilities
│   ├── api.ts          # API client (NextAuth pattern)
│   ├── validation.ts   # Form validation schemas
│   └── utils.ts        # Helper functions
├── types/              # TypeScript definitions
│   └── index.ts        # Exported types
├── index.ts            # Module entry point
└── package.json        # Module dependencies
```

**Compliance Check**: Directory structure validation

---

## 2. API Client Pattern (NextAuth)

### 2.1 Standard Pattern

**✅ CORRECT (NextAuth Pattern)**:

```tsx
// packages/resume-module/frontend/lib/api.ts
import { getSession } from "next-auth/react";

export const resumeApi = {
  async getResumes(orgId: string) {
    const session = await getSession();
    if (!session?.accessToken) throw new Error("Not authenticated");

    const response = await fetch(
      `/api/proxy/resumes?org_id=${orgId}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },
};
```

**❌ WRONG (Direct Fetch)**:

```tsx
// Don't do this - bypasses NextAuth, no org context
export async function getResumes() {
  const response = await fetch("/api/resumes");
  return response.json();
}
```

### 2.2 Compliance Rules

**Frontend Compliance Checker** must validate:

1. **No direct fetch() in components**
   - Components must use hooks or API client
   - Detect: `fetch()` calls in `.tsx` files (excluding API client files)

2. **API client uses NextAuth**
   - Check for `getSession()` import and usage
   - Check for `Authorization` header with `session.accessToken`

3. **Org context in API calls**
   - Check for `org_id` or `orgId` parameter in API calls
   - For multi-tenant data endpoints only

4. **Standard error handling**
   - Check for response.ok validation
   - Check for try/catch in async operations

**Example Validation Pattern**:

```typescript
// scripts/check-frontend-compliance.ts
function checkApiClient(filePath: string, content: string): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];

  // Check for NextAuth import
  if (!content.includes("from 'next-auth/react'")) {
    issues.push({
      file: filePath,
      line: 1,
      rule: "api-client-nextauth",
      message: "API client must import from 'next-auth/react'",
      fix: "Add: import { getSession } from 'next-auth/react';",
    });
  }

  // Check for Authorization header
  if (
    content.includes("fetch(") &&
    !content.match(/Authorization.*session\.accessToken/)
  ) {
    issues.push({
      file: filePath,
      rule: "api-client-auth-header",
      message: "API calls must include Authorization header",
      fix: "Add: headers: { Authorization: `Bearer ${session.accessToken}` }",
    });
  }

  return issues;
}
```

### 2.3 Organization-Scoped Hook Pattern (REQUIRED)

**CRITICAL**: All hooks that fetch organization-scoped data MUST accept `orgId` as a parameter and pass it explicitly in the API request.

**Why This Matters:** The JWT token does NOT contain `orgId` or role information. Relying on the Lambda authorizer to extract `orgId` from the JWT is unreliable and often fails. Hooks must explicitly pass `orgId` in the request.

**✅ CORRECT Pattern:**

```tsx
// Hook accepts orgId parameter
export interface UseOrgModuleConfigOptions {
  orgId: string | null;  // ✅ REQUIRED
  autoFetch?: boolean;
  onError?: (error: string) => void;
}

export function useOrgModuleConfig(options: UseOrgModuleConfigOptions) {
  const { orgId, autoFetch = true } = options;
  
  const fetchModules = useCallback(async () => {
    if (!orgId) {  // ✅ Check for orgId
      setError("Organization context required");
      return;
    }
    
    const response = await fetch(`${API_BASE}/admin/org/mgmt/modules`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Org-Id": orgId,  // ✅ Pass orgId explicitly in header
      },
    });
    
    // Handle response...
  }, [orgId, token]);
  
  return { modules, loading, error, refresh };
}
```

**Usage in page:**
```tsx
export default function OrgAdminPage() {
  const { currentOrganization: organization } = useOrganizationContext();
  
  // ✅ Pass orgId explicitly from context
  const { modules } = useOrgModuleConfig({
    orgId: organization?.orgId || null,
    autoFetch: !!organization?.orgId,
  });
  
  return <YourComponent modules={modules} />;
}
```

**❌ WRONG Pattern (DO NOT USE):**

```tsx
// ❌ No orgId parameter - relies on authorizer context
export interface UseOrgModuleConfigOptions {
  autoFetch?: boolean;
}

export function useOrgModuleConfig(options: UseOrgModuleConfigOptions = {}) {
  const fetchModules = useCallback(async () => {
    // ❌ Expects Lambda authorizer to extract orgId from JWT - UNRELIABLE
    const response = await fetch(`${API_BASE}/admin/org/mgmt/modules`, {
      headers: {
        Authorization: `Bearer ${token}`,
        // ❌ NO X-Org-Id header - relies on authorizer
      },
    });
  }, [token]);
}
```

**Why the wrong pattern fails:**

1. **Authorizer context extraction is unreliable** - The Lambda may not have access to JWT claims
2. **JWT doesn't contain orgId** - Only contains external user ID (Okta UID)
3. **Different auth strategies vary** - Some authorizers don't pass org context
4. **Explicit parameter passing is predictable** - Always works, easy to test
5. **Frontend knows the org context** - User selected it in the UI

**Backend Integration:**

The Lambda handler reads the `X-Org-Id` header as a fallback:

```python
elif path.startswith('/admin/org/'):
    # Try authorizer context first
    org_id = common.get_org_context_from_event(event)
    
    # Fallback to X-Org-Id header (sent by frontend hooks)
    if not org_id:
        headers = event.get('headers', {})
        org_id = headers.get('X-Org-Id') or headers.get('x-org-id')
    
    if not org_id:
        return common.bad_request_response('Organization ID required')
```

**Compliance Rule:** 

Hooks matching pattern `useOrg*` MUST:
1. Accept `orgId: string | null` parameter in options interface
2. Check for `orgId` presence before making API calls
3. Pass `orgId` via `X-Org-Id` header in all API requests
4. Include `orgId` in dependency arrays for useCallback/useEffect

---

## 3. Module Hook Standards

### 3.1 Data Fetching Hooks

**✅ CORRECT Pattern**:

```tsx
// packages/resume-module/frontend/hooks/useResumes.ts
import { useQuery } from "@tanstack/react-query";
import { useOrganizationContext } from "@/contexts/OrgContext";
import { resumeApi } from "../lib/api";

export function useResumes() {
  const { currentOrg } = useOrganizationContext();

  return useQuery({
    queryKey: ["resumes", currentOrg?.id],
    queryFn: () => resumeApi.getResumes(currentOrg!.id),
    enabled: !!currentOrg,
  });
}
```

**Key Requirements**:

1. **Import organization context**
   - `useOrganizationContext()` for multi-tenant data
   - Include `orgId` in queryKey for cache isolation

2. **Use React Query (or SWR)**
   - Standardize on one data fetching library
   - Consistent caching and refetch behavior

3. **Proper error handling**
   - Return error state from hook
   - Components handle error display

4. **Loading states**
   - Return loading state from hook
   - Components display skeleton/spinner

### 3.2 Form Hooks

**✅ CORRECT Pattern**:

```tsx
// packages/resume-module/frontend/hooks/useResumeForm.ts
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resumeSchema } from "../lib/validation";

export function useResumeForm(initialData?: Resume) {
  return useForm<Resume>({
    resolver: zodResolver(resumeSchema),
    defaultValues: initialData || {
      name: "",
      // ... other fields
    },
  });
}
```

**Requirements**:

1. **Standardize on react-hook-form**
2. **Use Zod for validation schemas**
3. **Type-safe form values**
4. **Reusable across components**

### 3.3 Compliance Rules

**Frontend Compliance Checker** must validate:

1. **Organization context usage**
   - Multi-tenant hooks must use `useOrganizationContext()`
   - Check for `currentOrg` or `organizationId` usage

2. **Query key includes org_id**
   - For React Query hooks
   - Ensures cache isolation between orgs

3. **Error boundary wrapped**
   - Check component tree for ErrorBoundary
   - All data-fetching components should be wrapped

---

## 4. Component Standards

### 4.1 Module Component Structure

**List Component** (`EntityList.tsx`):

```tsx
import { useEntity } from "../hooks/useEntity";
import { EntityCard } from "./EntityCard";
import { ErrorBoundary, LoadingSkeleton, EmptyState } from "@/components/common";

export function EntityList() {
  const { data: entities, isLoading, error } = useEntity();

  if (isLoading) return <LoadingSkeleton count={3} />;
  if (error) return <ErrorDisplay error={error} />;
  if (!entities?.length) return <EmptyState message="No entities found" />;

  return (
    <Stack spacing={2}>
      {entities.map((entity) => (
        <EntityCard key={entity.id} entity={entity} />
      ))}
    </Stack>
  );
}
```

**Card Component** (`EntityCard.tsx`):

```tsx
import { Card, CardContent, IconButton, Menu } from "@mui/material";
import { MoreVertIcon } from "@mui/icons-material";

interface EntityCardProps {
  entity: Entity;
  onEdit?: (entity: Entity) => void;
  onDelete?: (id: string) => void;
}

export function EntityCard({ entity, onEdit, onDelete }: EntityCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6">{entity.name}</Typography>

          {/* Three-dots menu for actions (UI standards compliant) */}
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVertIcon />
          </IconButton>
        </Box>

        {/* Card content */}
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => onEdit?.(entity)}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => onDelete?.(entity.id)}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
}
```

**Form Component** (`EntityForm.tsx`):

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField, Button, Stack } from "@mui/material";

interface EntityFormProps {
  initialData?: Entity;
  onSubmit: (data: Entity) => Promise<void>;
  onCancel: () => void;
}

export function EntityForm({ initialData, onSubmit, onCancel }: EntityFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Entity>({
    resolver: zodResolver(entitySchema),
    defaultValues: initialData,
  });

  return (
    <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={2}>
      <TextField
        label="Name"
        {...register("name")}
        error={!!errors.name}
        helperText={errors.name?.message}
        fullWidth
        required
      />

      {/* Other fields */}

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </Box>
    </Stack>
  );
}
```

### 4.2 Compliance Rules

**Frontend Compliance Checker** must validate:

1. **Standard component structure**
   - List, Card, Form, Detail components present
   - Follow naming conventions

2. **Material-UI usage**
   - No custom CSS classes (use sx prop)
   - Consistent MUI components

3. **Error boundaries**
   - All data-fetching components wrapped
   - Proper error display

4. **Loading states**
   - Skeleton loaders for initial load
   - Disabled buttons during submission

5. **Empty states**
   - Meaningful empty state messages
   - Primary CTA to add first item

6. **Icon usage compliance**
   - Check against icon mapping from `ui-standards.md`
   - Ensure consistent icons for same actions

---

## 5. Type Safety Standards

### 5.1 Module Type Definitions

**✅ CORRECT Pattern**:

```typescript
// packages/resume-module/frontend/types/index.ts

// Entity types
export interface Resume {
  id: string;
  org_id: string; // Required for multi-tenant
  user_id: string;
  name: string;
  data: ResumeData;
  created_at: string;
  updated_at: string;
}

export interface ResumeData {
  personal_info: PersonalInfo;
  work_history: WorkHistory[];
  education: Education[];
  skills: Skill[];
}

// API response types
export interface ResumeListResponse {
  success: boolean;
  data: {
    resumes: Resume[];
    total: number;
  };
}

export interface ResumeCreateRequest {
  name: string;
  data: ResumeData;
}

// Form types
export type ResumeFormData = Omit<Resume, "id" | "created_at" | "updated_at">;

// Export all types
export * from "./resume";
export * from "./api";
```

### 5.2 Compliance Rules

1. **Type exports**
   - All types exported from `types/index.ts`
   - No inline type definitions in components

2. **API response types**
   - Match backend response format
   - Include `success` boolean
   - Include `data` wrapper

3. **Multi-tenancy**
   - All entity types include `org_id`
   - All entity types include `user_id` (for ownership)

4. **Omit utility types**
   - Use for form data (omit server-generated fields)
   - Use for create requests (omit id, timestamps)

---

## 6. Integration Standards

### 6.1 Module Integration Points

Every module must export:

```typescript
// packages/resume-module/frontend/index.ts

// Components
export * from "./components";

// Hooks
export * from "./hooks";

// Types
export * from "./types";

// API client (for advanced usage)
export { resumeApi } from "./lib/api";

// Module metadata
export const resumeModule = {
  name: "resume-module",
  version: "1.0.0",
  routes: [
    { path: "/resumes", component: "ResumesPage" },
    { path: "/resumes/new", component: "NewResumePage" },
    { path: "/resumes/[id]", component: "ResumeDetailPage" },
  ],
  navigation: {
    label: "Resumes",
    icon: "DescriptionIcon",
    section: "MAIN",
  },
};
```

### 6.2 App Integration

**Main app imports module**:

```tsx
// apps/frontend/src/app/resumes/page.tsx
import { ResumeList } from "@/packages/resume-module/frontend";

export default function ResumesPage() {
  return (
    <ErrorBoundary>
      <ResumeList />
    </ErrorBoundary>
  );
}
```

### 6.3 Compliance Rules

1. **Barrel exports**
   - All public API exported from `index.ts`
   - No deep imports from modules

2. **Module metadata**
   - Include module name, version
   - Include route definitions
   - Include navigation metadata

3. **No circular dependencies**
   - Modules don't import from main app
   - Modules don't import other modules directly

---

## 7. UX Consistency Standards

### 7.1 Cross-Module Consistency

All modules must follow these UX patterns:

#### List Views

- **Layout**: Grid of cards OR DataGrid table
- **Actions**: Three-dots menu (space-limited contexts)
- **Empty State**: Icon + message + "Add [Entity]" CTA
- **Loading**: Skeleton cards (3-5 items)
- **Filters**: Search + filter dropdown + sort dropdown
- **Pagination**: Server-side pagination with page size selector

#### Detail Views

- **Layout**: Two-panel (info + actions) OR single panel with sections
- **Edit Mode**: Inline editing OR separate edit page
- **Actions**: Edit, Delete, Share, Export (context-appropriate)
- **Status Indicators**: Chips with semantic colors (success/error/warning)
- **Timestamps**: Relative time ("2 hours ago") with tooltip (absolute time)

#### Forms

- **Validation**: Real-time validation on blur
- **Required Fields**: Asterisk (*) after label
- **Help Text**: Below input field (muted color)
- **Buttons**: Cancel (left), Save/Submit (right, primary)
- **Error Messages**: Below input field (error color)
- **Success**: Toast notification + redirect OR stay on page

#### Modals/Dialogs

- **Size**: Small (400px), Medium (600px), Large (800px), Full-screen
- **Header**: Title + close button (top-right)
- **Content**: Scrollable if needed
- **Footer**: Actions (Cancel left, Primary right)
- **Focus**: Trap focus within modal
- **Close**: Escape key + click outside + close button

### 7.2 Icon Consistency

**Must use standard icon mapping** from `ui-standards.md`:

- Create/Add: `AddIcon`
- Edit: `EditIcon`
- Delete: `DeleteIcon`
- Save: `SaveIcon`
- Cancel: `CloseIcon`
- Upload: `CloudUploadIcon`
- Download: `DownloadIcon`
- Share: `ShareIcon`
- More Actions: `MoreVertIcon`

**Enforcement**: Frontend compliance checker validates icon usage.

### 7.3 Spacing Consistency

**Minimal padding approach** (from `ui-standards.md`):

- Default: `px: 2` (16px)
- Standard: `px: 3` (24px)
- Spacious: `px: 4` (32px)

**Enforcement**: Compliance checker validates spacing values.

### 7.4 Color Consistency

**Status colors** (semantic):

- Success/Active: `success` (green)
- Error/Expired: `error` (red)
- Warning/Expiring: `warning` (orange)
- Info/Neutral: `default` (gray)
- Primary/Selected: `primary` (blue)

**Enforcement**: Compliance checker validates Chip color usage.

---

## 8. Accessibility Compliance

### 8.1 WCAG 2.1 AA Requirements

All modules must meet:

1. **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
2. **Keyboard Navigation**: All interactive elements accessible via keyboard
3. **Screen Reader Support**: ARIA labels, regions, live regions
4. **Focus Indicators**: Visible focus ring on all interactive elements
5. **Form Labels**: All inputs have associated labels
6. **Error Identification**: Errors linked via `aria-describedby`

### 8.2 Component-Specific Requirements

**Buttons**:

- Icon-only buttons must have `aria-label`
- Disabled state must be programmatically detectable

**Forms**:

- Required fields indicated with `required` attribute
- Error messages linked to inputs
- Submit disabled during processing

**Modals**:

- Focus trap active when open
- Escape key closes modal
- Focus returns to trigger on close

**Lists**:

- Proper list semantics (`<ul>`, `<ol>`)
- List items have unique keys

**Tables**:

- Proper table headers (`<th>` with scope)
- Caption for complex tables
- Keyboard navigation within rows

### 8.3 Testing Requirements

All modules must pass:

- **axe DevTools**: No violations
- **Lighthouse Accessibility**: Score ≥ 95
- **Keyboard-only navigation**: Complete all workflows
- **Screen reader testing**: Test with NVDA/JAWS/VoiceOver

---

## 9. Performance Standards

### 9.1 Component Performance

**Requirements**:

1. **Initial Render**: < 100ms (p95)
2. **Re-renders**: Optimize with `React.memo`, `useMemo`, `useCallback`
3. **List Virtualization**: Use for lists > 50 items
4. **Image Optimization**: Use Next.js Image component
5. **Bundle Size**: Module bundle < 100KB (gzipped)

### 9.2 Data Fetching Performance

**Requirements**:

1. **Cache Appropriately**: React Query default staleTime
2. **Pagination**: Server-side pagination for large datasets
3. **Debounce Search**: 300ms debounce for search inputs
4. **Optimistic Updates**: Update UI before API response
5. **Background Refetch**: Refetch on window focus

### 9.3 Compliance Checks

- **Bundle size analysis**: Run on each module
- **Lighthouse Performance**: Score ≥ 90
- **React DevTools Profiler**: No performance warnings

---

## 10. Testing Standards

### 10.1 Unit Tests

**Requirements**:

- Coverage: ≥ 80%
- Test framework: Jest + React Testing Library
- Test file location: `__tests__/` directory OR adjacent `.test.tsx`

**What to test**:

- Component rendering
- User interactions (clicks, input)
- Conditional rendering (loading, error, empty states)
- Form validation
- API mocking

### 10.2 Integration Tests

**Requirements**:

- Test complete user flows
- Mock API responses
- Test error handling
- Test organization context switching

### 10.3 E2E Tests

**Requirements**:

- Test framework: Playwright OR Cypress
- Test critical paths
- Test cross-module interactions

---

## 11. Automated Compliance Checking

### 11.1 Frontend Compliance Checker

**Tool**: `scripts/check-frontend-compliance.ts`

**Checks**:

1. **API Client Pattern**
   - ✅ Uses NextAuth
   - ✅ Includes Authorization header
   - ✅ Includes org_id for multi-tenant endpoints
   - ✅ Handles errors

2. **Hook Patterns**
   - ✅ Uses `useOrganizationContext` for multi-tenant data
   - ✅ Includes org_id in React Query keys
   - ✅ Returns loading/error states

3. **Component Standards**
   - ✅ Uses MUI components (no custom CSS)
   - ✅ Follows naming conventions
   - ✅ Includes error boundaries
   - ✅ Includes loading skeletons
   - ✅ Includes empty states

4. **Type Safety**
   - ✅ All exports are typed
   - ✅ No `any` types (except in specific cases)
   - ✅ Types exported from `types/index.ts`

5. **Icon Usage**
   - ✅ Uses standard icon mapping
   - ✅ Icon-only buttons have `aria-label`

6. **Spacing Compliance**
   - ✅ Uses MUI spacing scale
   - ✅ Follows minimal padding approach

7. **Accessibility**
   - ✅ All interactive elements keyboard accessible
   - ✅ ARIA labels present
   - ✅ Form labels associated

### 11.2 ESLint Custom Rules

**File**: `.eslintrc.cora.js`

```javascript
module.exports = {
  extends: ["./eslint.config.mjs"],
  rules: {
    // Enforce NextAuth pattern
    "no-direct-fetch": "error",

    // Require org context
    "require-org-context": "error",

    // MUI only (no styled-components)
    "no-styled-components": "error",

    // No 'any' types
    "@typescript-eslint/no-explicit-any": "error",

    // Require aria-label for icon-only buttons
    "require-aria-label": "error",
  },
};
```

### 11.3 Pre-commit Hook

**Enhancement**: Add frontend checks to existing pre-commit hook

```bash
#!/bin/bash
# scripts/pre-commit-check.sh

# Backend checks (existing)
# ...

# Frontend checks (new)
echo "Running frontend compliance checks..."

# Check changed frontend files
frontend_files=$(git diff --cached --name-only --diff-filter=ACM | grep 'packages/.*/frontend/.*\\.tsx\\?$')

if [ -n "$frontend_files" ]; then
  # Run compliance checker on changed files
  npx ts-node scripts/check-frontend-compliance.ts --files "$frontend_files"

  if [ $? -ne 0 ]; then
    echo "❌ Frontend compliance check failed"
    exit 1
  fi
fi

echo "✅ All compliance checks passed"
exit 0
```

---

## 12. Migration Checklist

### For Existing Modules

- [ ] Audit current frontend code against standards
- [ ] Refactor API calls to NextAuth pattern
- [ ] Add organization context to data hooks
- [ ] Ensure consistent icon usage
- [ ] Add error boundaries
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Run accessibility audit
- [ ] Run performance profiling
- [ ] Update tests to meet coverage requirements

### For New Modules

- [ ] Use module generator script (creates compliant skeleton)
- [ ] Follow directory structure standard
- [ ] Implement API client with NextAuth pattern
- [ ] Create standard hooks (useEntity, useEntityForm)
- [ ] Create standard components (List, Card, Form, Detail)
- [ ] Export types from `types/index.ts`
- [ ] Add comprehensive tests
- [ ] Run compliance checker
- [ ] Run accessibility tests
- [ ] Run performance tests

---

## 13. Summary: What Gets Checked

### Backend Compliance (`check-api-compliance.py`)

✅ Already implemented:

- org_common import usage
- Standard response functions
- Error handling patterns

### Frontend Compliance (`check-frontend-compliance.ts`)

🆕 To be implemented:

1. **API Pattern Compliance**
   - NextAuth usage
   - Authorization headers
   - Organization context in calls

2. **Component Standards**
   - MUI component usage
   - Error boundary presence
   - Loading state handling
   - Empty state handling

3. **Hook Standards**
   - Organization context usage
   - React Query key structure
   - Return value consistency

4. **Type Safety**
   - Type exports
   - No `any` types
   - API response type matching

5. **UX Consistency**
   - Icon mapping compliance
   - Spacing compliance
   - Color semantic usage

6. **Accessibility**
   - ARIA label presence
   - Keyboard accessibility
   - Focus management

### Combined CI/CD Check

```yaml
# .github/workflows/cora-compliance.yml
name: CORA Compliance

on:
  pull_request:
    paths:
      - "packages/**/*.py"
      - "packages/**/*.tsx"
      - "packages/**/*.ts"

jobs:
  backend-compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Backend Compliance
        run: python3 scripts/check-api-compliance.py

  frontend-compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Frontend Compliance
        run: npx ts-node scripts/check-frontend-compliance.ts
```

---

---

## 14. Using the Compliance Checker

### 14.1 Running the Checker

**Manually (Full Scan)**:

```bash
# From project root
cd sts-career-stack
npx ts-node scripts/check-frontend-compliance.ts
```

**Output Example**:

```
Scanning frontend files in: /path/to/sts-career-stack

Found 50 frontend file(s)

Frontend Compliance Report

Total Files: 50
✅ Compliant: 42
❌ Non-Compliant: 8

Scanned Modules: certification-module, org-module, _module-template

--------------------------------------------------------------------------------
✅ COMPLIANT FILES
--------------------------------------------------------------------------------
  📦 certification-module (16 files)
     ✓ CampaignCard.tsx
     ✓ CampaignList.tsx
     ... and 14 more

--------------------------------------------------------------------------------
❌ NON-COMPLIANT FILES
--------------------------------------------------------------------------------
  📦 org-module (3 non-compliant)
     ✗ packages/org-module/frontend/hooks/useOrgMembers.ts
       ⚠️  Line 1: missing_org_context
          import { useOrganizationContext } ...
       � Add: import { useOrganizationContext } from "@sts-career/org-module-frontend"

     ✗ packages/org-module/frontend/components/org/OrgMembersList.tsx
       ⚠️  Line 223: missing_aria_label
          <IconButton
       💡 Add aria-label to IconButton: <IconButton aria-label="description">

--------------------------------------------------------------------------------
SUMMARY
--------------------------------------------------------------------------------
⚠️  Action Required: Fix non-compliant files

Quick Fix Guide:
1. API Calls: Use createAuthenticatedClient from @sts-career/api-client
2. Multi-tenant Hooks: Import useOrganizationContext from @sts-career/org-module-frontend
3. Authentication: Use useSession from next-auth/react
4. Styling: Use MUI sx prop instead of styled-components
5. Type Safety: Replace 'any' types with specific types
6. Accessibility: Add aria-label to IconButton components

See: docs/development/CORA-FRONTEND-STANDARDS.md
```

### 14.2 Automatic Checks

**Pre-commit Hook** (Automatic):

The compliance checker runs automatically on commit for changed frontend files:

```bash
# When you commit
git add packages/resume-module/frontend/components/ResumeList.tsx
git commit -m "Add resume list component"

# Output:
Running pre-commit checks...
Checking frontend compliance...
Found staged frontend files, running compliance checker...
❌ Frontend compliance check failed!
Fix compliance issues or use 'git commit --no-verify' to skip (not recommended)
```

**Skip Pre-commit (Not Recommended)**:

```bash
# Only use for emergencies/hotfixes
git commit --no-verify -m "Hotfix: critical bug"
```

**CI/CD Integration** (Automatic on PR):

The compliance checker runs on every pull request. PRs with non-compliant code will be blocked.

### 14.3 Interpreting Results

**Issue Types**:

| Issue Type | Severity | Description | Auto-Fix |
|------------|----------|-------------|----------|
| `direct_fetch` | ⚠️ High | Direct fetch() in components | Manual |
| `missing_org_context` | ⚠️ High | Missing organization context | Manual |
| `missing_use_session` | ⚠️ High | Missing NextAuth session | Manual |
| `styled_components` | ⚠️ Medium | Using styled-components | Manual |
| `any_type` | ⚠️ Medium | TypeScript any type | Manual |
| `missing_aria_label` | ⚠️ Medium | Missing accessibility label | Manual |
| `missing_error_handling` | ℹ️ Low | No error handling in component | Manual |
| `missing_loading_state` | ℹ️ Low | No loading state in component | Manual |

### 14.4 Common Fixes

#### Fix 1: Direct fetch() Call

**Problem**:
```tsx
// ❌ Non-compliant
export function MyComponent() {
  const fetchData = async () => {
    const res = await fetch('/api/data');
    return res.json();
  };
}
```

**Solution**:
```tsx
// ✅ Compliant - use API client
import { createAuthenticatedClient } from '@sts-career/api-client';
import { useSession } from 'next-auth/react';

export function MyComponent() {
  const { data: session } = useSession();
  
  const fetchData = async () => {
    if (!session?.accessToken) return;
    const client = createAuthenticatedClient(session.accessToken);
    return client.get('/data');
  };
}
```

#### Fix 2: Missing Organization Context

**Problem**:
```tsx
// ❌ Non-compliant
export function useResumes() {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: () => api.getResumes(),
  });
}
```

**Solution**:
```tsx
// ✅ Compliant
import { useOrganizationContext } from '@sts-career/org-module-frontend';

export function useResumes() {
  const { currentOrganization } = useOrganizationContext();
  
  return useQuery({
    queryKey: ['resumes', currentOrganization?.orgId],
    queryFn: () => api.getResumes(currentOrganization!.orgId),
    enabled: !!currentOrganization,
  });
}
```

#### Fix 3: Missing aria-label

**Problem**:
```tsx
// ❌ Non-compliant
<IconButton onClick={handleDelete}>
  <DeleteIcon />
</IconButton>
```

**Solution**:
```tsx
// ✅ Compliant
<IconButton onClick={handleDelete} aria-label="Delete item">
  <DeleteIcon />
</IconButton>
```

#### Fix 4: TypeScript any Type

**Problem**:
```tsx
// ❌ Non-compliant
function processData(data: any) {
  return data.map((item: any) => item.value);
}
```

**Solution**:
```tsx
// ✅ Compliant
interface DataItem {
  value: string;
}

function processData(data: DataItem[]) {
  return data.map((item) => item.value);
}
```

#### Fix 5: Missing Error Handling

**Problem**:
```tsx
// ❌ Non-compliant
export function DataComponent() {
  const { data } = useData();
  return <div>{data.map(...)}</div>;
}
```

**Solution**:
```tsx
// ✅ Compliant
export function DataComponent() {
  const { data, error, isLoading } = useData();
  
  if (error) return <ErrorDisplay error={error} />;
  if (isLoading) return <Skeleton count={3} />;
  if (!data?.length) return <EmptyState />;
  
  return <div>{data.map(...)}</div>;
}
```

### 14.5 Integration with TypeScript Error Analyzer

The compliance checker works alongside the TypeScript error analyzer:

**Workflow**:

1. **Fix TypeScript errors first**:
   ```bash
   ./scripts/analyze-typescript-errors.sh
   ```

2. **Then check frontend compliance**:
   ```bash
   npx ts-node scripts/check-frontend-compliance.ts
   ```

3. **Both run automatically on commit**:
   - TypeScript check (compilation)
   - Frontend compliance (standards)

**Why Two Checks?**

- **TypeScript Analyzer**: Ensures code compiles, types are correct
- **Compliance Checker**: Ensures code follows CORA architectural standards

Both are necessary for maintainable, consistent codebase.

### 14.6 Troubleshooting

**Issue**: `Command not found: npx`
```bash
# Install Node.js and npm
brew install node  # macOS
apt install nodejs npm  # Ubuntu
```

**Issue**: `Cannot find module 'ts-node'`
```bash
# Install dependencies
cd sts-career-stack
pnpm install
```

**Issue**: `No frontend files found`
```bash
# Ensure you're in the right directory
cd sts-career-stack
pwd  # Should show: /path/to/sts-career-stack
```

**Issue**: Pre-commit hook not running
```bash
# Reinstall hooks
rm -rf .git/hooks
npx husky install
```

---

**Status**: ✅ Compliance tooling implemented and documented  
**Last Updated**: November 9, 2025  
**Tools**: Frontend compliance checker, pre-commit hooks, CI/CD workflow
