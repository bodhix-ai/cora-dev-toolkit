# CORA Architecture Principles

**CORA** (Context-Oriented Resource Architecture) is a modular framework for building AI-powered applications with multi-tenant data isolation, comprehensive security, and rapid development.

## Core Principles

### 1. Authentication & Authorization Hierarchy

CORA implements a clear separation between **authentication** (who you are) and **authorization** (what you can do).

#### 1.1 Authentication Dependency

**Principle:** All CORA modules MUST use the NextAuth factory pattern for authentication.

**Rationale:**

- **Security**: No tokens in localStorage eliminates XSS vulnerabilities
- **Consistency**: Single authentication pattern across all modules
- **Token Management**: NextAuth automatically handles token refresh
- **Multi-tenant**: Session context includes organization information

**Required Pattern:**

```typescript
// ✅ CORRECT: API Client - Factory function ONLY
import type { AuthenticatedClient } from "@sts-career/api-client";

export function createModuleClient(client: AuthenticatedClient) {
  return {
    getData: () => client.get("/module/data"),
    createItem: (data) => client.post("/module/data", data),
  };
}

// ✅ CORRECT: Hook - Accepts client parameter
export function useModuleData(client: AuthenticatedClient | null) {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!client) return;

    const api = createModuleClient(client);
    api.getData().then(setData);
  }, [client]);

  return { data };
}

// ✅ CORRECT: Page - Uses NextAuth session
("use client");
import { useSession } from "next-auth/react";
import { createAuthenticatedClient } from "@sts-career/api-client";

export default function Page() {
  const { data: session } = useSession();

  const client = session?.accessToken
    ? createAuthenticatedClient(session.accessToken)
    : null;

  const { data } = useModuleData(client);
  // ...
}
```

**Anti-Patterns (NEVER DO THIS):**

❌ Direct API exports: `export const api = { getData: async () => {...} }`  
❌ localStorage tokens: `localStorage.getItem("access_token")`  
❌ Hooks without client parameter  
❌ Direct Okta integration: `useOktaAuth()`

**Documentation:**

- **[MODULE-NEXTAUTH-PATTERN.md](../development/MODULE-NEXTAUTH-PATTERN.md)** - Complete implementation guide
- **[ADR-004: NextAuth API Client Pattern](./ADR-004-NEXTAUTH-API-CLIENT.md)** - Architecture decision
- **[MODULE-DEVELOPMENT-CHECKLIST.md](../development/MODULE-DEVELOPMENT-CHECKLIST.md)** - Verification checklist

---

#### 1.2 Authorization Hierarchy (Two Layers)

**Principle:** CORA implements two distinct authorization layers with different purposes and patterns.

```
┌─────────────────────────────────────────────────────────────┐
│                   CORA Authorization Layers                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Admin Authorization                               │
│  ├─ Routes: /admin/sys/*, /admin/org/*, /admin/ws/*        │
│  ├─ Purpose: Module configuration and management            │
│  ├─ Functions: check_sys_admin, check_org_admin,           │
│  │             check_ws_admin, get_org_context_from_event   │
│  └─ Standards: ADR-019a (Frontend), ADR-019b (Backend)     │
│                                                              │
│  Layer 2: Resource Permissions                              │
│  ├─ Routes: /{module}/*                                     │
│  ├─ Purpose: User data access and operations                │
│  ├─ Functions: can_access_*, is_*_owner, is_*_member       │
│  └─ Standards: ADR-019c                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Why Two Layers:**

- **Layer 1 (Admin Auth)**: Controls who can *configure* modules (platform owners, org admins)
- **Layer 2 (Resource Perms)**: Controls who can *access data* (resource owners, shared users)
- **Separation of Concerns**: Admin roles do NOT grant automatic access to user data
- **Least Privilege**: Users can manage settings without accessing everyone's data

**Layer 1: Admin Authorization Pattern**

```python
# Backend: Admin route authorization
from org_common.auth_helpers import check_sys_admin, check_org_admin, get_org_context_from_event

def lambda_handler(event: dict, context: Any) -> dict:
    # Extract user
    user_id = common.get_supabase_user_id_from_external_uid(
        common.get_user_from_event(event)['user_id']
    )
    
    path = event.get('rawPath', '')
    
    # Centralized admin auth checks
    if path.startswith('/admin/sys/'):
        if not check_sys_admin(user_id):
            return common.forbidden_response('System admin role required')
    
    elif path.startswith('/admin/org/'):
        org_id = get_org_context_from_event(event)
        if not check_org_admin(org_id, user_id):
            return common.forbidden_response('Organization admin role required')
    
    # Route to handler
    return route_to_handler(user_id, event)
```

```typescript
// Frontend: Admin page authorization
'use client';
import { useRole, useOrganizationContext } from '@cora/auth';

export default function OrgAdminPage() {
  const { isOrgAdmin } = useRole();
  const { currentOrganization } = useOrganizationContext();
  
  if (!isOrgAdmin) {
    return <AccessDenied message="Organization admin role required" />;
  }
  
  return <AdminInterface orgId={currentOrganization.id} />;
}
```

**Layer 2: Resource Permission Pattern**

```python
# Backend: Resource access authorization
from org_common.resource_permissions import can_access_org_resource
# Module-specific permissions in module layers:
from chat_common.permissions import can_access_chat

def handle_get_chat(user_id: str, event: dict) -> dict:
    session_id = extract_path_param(event, 'session_id')
    
    # 1. Fetch resource
    session = common.find_one('chat_sessions', {'id': session_id})
    if not session:
        return common.not_found_response('Session not found')
    
    # 2. Verify org membership (prevent cross-org access)
    if not can_access_org_resource(user_id, session['org_id']):
        return common.forbidden_response('Not a member of this organization')
    
    # 3. Check resource permission (ownership/sharing)
    if not can_access_chat(user_id, session_id):
        return common.forbidden_response('Access denied')
    
    return common.success_response(common.format_record(session))
```

**CRITICAL: No Admin Override**

Admin roles (sys_admin, org_admin, ws_admin) do NOT automatically grant access to user resources:

```python
# ❌ WRONG - do NOT add admin override to resource permissions
def can_access_chat(user_id: str, session_id: str) -> bool:
    if is_chat_owner(user_id, session_id):
        return True
    
    # ❌ WRONG - violates least privilege
    # if is_org_admin(org_id, user_id):
    #     return True
    
    return False

# ✅ CORRECT - only ownership and sharing
def can_access_chat(user_id: str, session_id: str) -> bool:
    if is_chat_owner(user_id, session_id):
        return True
    
    if is_chat_shared_with(user_id, session_id):  # Future
        return True
    
    return False
```

**Why:** Principle of least privilege, compliance requirements, user trust.

**Module-Specific Permission Functions**

Each functional module implements its own permission layer to avoid adding dependencies to org-common:

```
module-chat/
└── backend/
    └── layers/
        └── chat_common/
            └── python/
                └── chat_common/
                    ├── __init__.py
                    └── permissions.py  # Chat-specific: can_access_chat(), can_edit_chat()

module-voice/
└── backend/
    └── layers/
        └── voice_common/
            └── python/
                └── voice_common/
                    └── permissions.py  # Voice-specific: can_access_voice()
```

**Why module-specific layers:**
- org-common doesn't depend on optional modules
- New modules don't require org-common updates
- Each module controls its own permission logic

**Documentation:**

- **[ADR-019: CORA Authorization Standardization](../arch%20decisions/ADR-019-AUTH-STANDARDIZATION.md)** - Complete authorization strategy
- **[ADR-019a: Frontend Authorization](../arch%20decisions/ADR-019a-AUTH-FRONTEND.md)** - Frontend patterns
- **[ADR-019b: Backend Admin Authorization](../arch%20decisions/ADR-019b-AUTH-BACKEND.md)** - Admin auth patterns
- **[ADR-019c: Resource Permissions](../arch%20decisions/ADR-019c-AUTH-RESOURCE-PERMISSIONS.md)** - Resource permission patterns
- **[03_std_back_AUTH.md](./03_std_back_AUTH.md)** - Backend admin auth standard
- **[03_std_back_RESOURCE-PERMISSIONS.md](./03_std_back_RESOURCE-PERMISSIONS.md)** - Resource permission standard

---

### 2. Module-First Development

**Principle:** Every feature is a self-contained module with database + backend + frontend.

**Rationale:**

- **Reusability**: Modules can be used across multiple AI applications
- **Isolation**: Changes to one module don't affect others
- **Testability**: Each module can be tested independently
- **Scalability**: Modules can be deployed independently

**Example:**

```
packages/org-module/              # Foundation module
├── db/                           # PostgreSQL schema with RLS
│   ├── schema/                   # SQL files with RLS policies
│   │   ├── 001-enable-uuid.sql
│   │   ├── 002-auth-users-schema.sql
│   │   ├── 003-profiles.sql
│   │   ├── 004-org.sql
│   │   ├── 005-org-member.sql
│   │   ├── 006-rls-helper-functions.sql
│   │   ├── 007-rls-policies-profiles.sql
│   │   ├── 008-rls-policies-org.sql
│   │   ├── 009-rls-policies-org-member.sql
│   │   └── 010-audit-triggers.sql
│   └── migrations/               # Schema changes
├── backend/                      # Python Lambda functions
│   ├── layers/org-common/        # Shared utilities
│   └── lambdas/                  # 4 Lambda functions, 12 endpoints
│       ├── identities-management/
│       ├── profiles/
│       ├── orgs/
│       └── members/
├── frontend/                     # React components
│   ├── components/               # Sidebar, Dashboard, etc.
│   ├── hooks/                    # useProfile, useOrgs, etc.
│   ├── contexts/                 # UserContext, OrgContext
│   └── index.ts                  # Barrel export
├── infrastructure/               # Terraform configuration
│   ├── main.tf                   # Lambda functions, IAM roles
│   ├── outputs.tf                # API routes export
│   └── variables.tf
└── README.md                     # Module documentation
```

### 3. Apps as Composition Layers

**Principle:** `apps/` directories import and compose modules, containing minimal original code.

**Rationale:**

- **Simplicity**: Apps are thin wrappers around modules
- **Maintainability**: Most code lives in reusable modules
- **Clarity**: Clear separation between foundation and application

**Example:**

```typescript
// apps/frontend/app/layout.tsx
import { Sidebar, UserProvider } from "@org-module/frontend";
import { ResumeProvider } from "@resume-module/frontend";

export default function RootLayout({ children }) {
  return (
    <UserProvider>
      <ResumeProvider>
        <Sidebar />
        {children}
      </ResumeProvider>
    </UserProvider>
  );
}
```

**Key Insight:** If you find yourself writing a lot of code in `apps/`, you're probably missing a module.

### 4. Multi-Tenant by Default

**Principle:** All data is organization-scoped with Row-Level Security (RLS).

**Rationale:**

- **Data Isolation**: Org A cannot access Org B's data
- **Security**: Enforced at database level, not application level
- **Scalability**: Single database serves all organizations

**Example:**

```sql
-- Every table has org_id
CREATE TABLE staffing_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    -- ... other fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policy using helper functions from org-module
CREATE POLICY "candidates_select_policy"
  ON staffing_candidates
  FOR SELECT
  TO authenticated
  USING (can_access_org_data(org_id));

CREATE POLICY "candidates_insert_policy"
  ON staffing_candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "candidates_update_policy"
  ON staffing_candidates
  FOR UPDATE
  TO authenticated
  USING (can_modify_org_data(org_id))
  WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "candidates_delete_policy"
  ON staffing_candidates
  FOR DELETE
  TO authenticated
  USING (can_modify_org_data(org_id));
```

### 5. Infrastructure as Module Outputs

**Principle:** Modules provide Terraform configuration; main infrastructure imports and composes.

**Rationale:**

- **Self-contained**: Module infrastructure lives with module code
- **Composable**: Main infrastructure dynamically creates resources from module outputs
- **Versioned**: Infrastructure changes with module versions

**Example:**

```hcl
# In packages/staffing-module/infrastructure/outputs.tf
output "api_routes" {
  value = [
    {
      method      = "GET"
      path        = "/staffing/candidates"
      integration = aws_lambda_function.candidates.invoke_arn
    },
    {
      method      = "POST"
      path        = "/staffing/candidates"
      integration = aws_lambda_function.candidates.invoke_arn
    },
    # ... more routes
  ]
}

output "lambda_arns" {
  value = {
    candidates = aws_lambda_function.candidates.arn
    positions  = aws_lambda_function.positions.arn
  }
}
```

```hcl
# In sts-career-infra/terraform/environments/dev/main.tf
module "staffing_module" {
  source = "../../../sts-career-stack/packages/staffing-module/infrastructure"

  environment         = var.environment
  supabase_secret_arn = module.secrets.supabase_secret_arn
  # ... other variables
}

# Main infra creates API Gateway routes from module outputs
resource "aws_apigatewayv2_route" "staffing_module" {
  for_each = { for route in module.staffing_module.api_routes : "${route.method}-${route.path}" => route }

  api_id    = aws_apigatewayv2_api.main.id
  route_key = "${each.value.method} ${each.value.path}"
  target    = "integrations/${aws_apigatewayv2_integration.staffing_module[each.key].id}"

  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.okta.id
}
```

## When to Create a New Module

### Create a New Module When:

✅ **Feature is self-contained**: Has its own data model and UI  
✅ **Reusable across apps**: Could be used in other AI applications  
✅ **Independent lifecycle**: Can be developed/tested/deployed separately  
✅ **Clear boundaries**: Minimal dependencies on other modules

**Examples:**

- `resume-module` - Resume management with AI extraction
- `cert-module` - Certification tracking with Credly integration
- `staffing-module` - Candidate management and tracking
- `contract-module` - Contract past performance tracking
- `document-module` - Document processing and storage

### Extend an Existing Module When:

✅ **Tightly coupled**: Feature is intrinsically part of existing module  
✅ **Shares data model**: Uses same database tables  
✅ **No independent value**: Only makes sense within parent module

**Examples:**

- Add profile settings to `org-module` (not separate module)
- Add resume export to `resume-module` (not separate module)
- Add member permissions to `org-module` (not separate module)

## Module Dependencies

### Foundation Module (org-module)

**All modules depend on org-module** for:

- User authentication (via Okta SSO)
- Organization management (multi-tenancy)
- Multi-tenant data isolation (RLS helper functions)
- Audit logging (trigger functions)

**Example:**

```sql
-- In packages/resume-module/db/schema/001-resumes.sql
-- Assumes org-module is deployed (provides org table and RLS helpers)

CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT,
    content JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Use RLS helpers from org-module
CREATE POLICY "resumes_select_policy"
  ON resumes
  FOR SELECT
  TO authenticated
  USING (can_access_org_data(org_id));

CREATE POLICY "resumes_insert_policy"
  ON resumes
  FOR INSERT
  TO authenticated
  WITH CHECK (can_access_org_data(org_id));
```

### Feature Module Dependencies

**Feature modules should minimize dependencies on each other.**

**Good (Star topology):**

```
org-module (foundation)
  ↓
  ├── resume-module
  ├── cert-module
  ├── staffing-module
  └── contract-module
```

**Bad (avoid circular dependencies):**

```
resume-module ⇄ cert-module  ❌
```

**If modules need to share data, use:**

1. **API calls**: One module calls another's API
2. **Shared types**: Export TypeScript types for shared entities
3. **Database views**: Create read-only views across modules
4. **Message queues**: Publish events for async communication (future)

**Example of API-based communication:**

```typescript
// In cert-module/frontend/hooks/useCertifications.ts
import { useProfile } from "@org-module/frontend";

export function useCertifications() {
  const { profile } = useProfile(); // Import from org-module

  // Fetch certifications for current user
  const { data: certifications } = useSWR(
    `/certifications?userId=${profile?.id}`,
    fetcher
  );

  return { certifications };
}
```

## CORA Development Workflow

### 1. Design Phase

- Define module boundaries
- Document data model (entities, relationships)
- Sketch API endpoints
- Design UI components

### 2. Database Phase

- Create schema files in `packages/<module>/db/schema/`
- Add RLS policies using org-module helpers
- Apply audit triggers
- Test with sample data

**Example:**

```bash
cd packages/my-module/db/schema/
touch 001-entities.sql
touch 002-entities-rls.sql

# Edit 001-entities.sql
psql $DATABASE_URL -f 001-entities.sql
psql $DATABASE_URL -f 002-entities-rls.sql
```

### 3. Backend Phase

- Create Lambda layer for shared utilities
- Implement Lambda functions (CRUD operations)
- Write unit tests
- Build and package Lambdas

**Example:**

```bash
cd packages/my-module/backend/

# Create layer
mkdir -p layers/my-module-common/python/my_module_common
touch layers/my-module-common/python/my_module_common/__init__.py
touch layers/my-module-common/python/my_module_common/db.py

# Create Lambda function
mkdir -p lambdas/entities
touch lambdas/entities/lambda_function.py
touch lambdas/entities/requirements.txt

# Build
./build.sh
```

### 4. Frontend Phase

- Create TypeScript types
- Implement React hooks (data fetching)
- Build React components
- Create contexts for state management
- Export via barrel file (`index.ts`)

**Example:**

```bash
cd packages/my-module/frontend/

# Create structure
mkdir -p components hooks contexts lib types

# Create barrel export
touch index.ts
```

### 5. Infrastructure Phase

- Write Terraform configuration in `packages/<module>/infrastructure/`
- Define module variables and outputs
- Test module deployment in isolation

**Example:**

```bash
cd packages/my-module/infrastructure/

touch main.tf variables.tf outputs.tf

# Test
terraform init
terraform plan
terraform apply
```

### 6. Integration Phase

- Update main infrastructure to import module
- Add module routes to API Gateway
- Update `apps/frontend` to import module components
- Integration testing

**Example:**

```hcl
# In sts-career-infra/terraform/environments/dev/main.tf
module "my_module" {
  source = "../../../sts-career-stack/packages/my-module/infrastructure"
  # ... variables
}

# Create routes
resource "aws_apigatewayv2_route" "my_module" {
  for_each = { for route in module.my_module.api_routes : "${route.method}-${route.path}" => route }
  # ... route configuration
}
```

## Benefits of CORA

### For Development

✅ **Rapid Prototyping**: Pre-built foundation (auth, multi-tenancy, audit)  
✅ **Parallel Development**: Teams can work on different modules  
✅ **Clear Boundaries**: Reduces merge conflicts and confusion  
✅ **Testability**: Unit test modules independently  
✅ **Code Reuse**: Write once, use in multiple apps

### For Deployment

✅ **Independent Releases**: Deploy module updates without full app redeployment  
✅ **Rollback Safety**: Roll back single module if issues occur  
✅ **Environment Parity**: Modules tested independently before integration  
✅ **Blue-Green Deployments**: Deploy new module versions alongside old

### For Reusability

✅ **Cross-Application**: Use same modules in multiple AI apps  
✅ **Marketplace Potential**: Modules could be shared/sold as packages  
✅ **Consistency**: Same patterns across all applications  
✅ **Version Control**: Pin module versions per application

### For Maintenance

✅ **Isolated Changes**: Bug fixes in one module don't risk others  
✅ **Clear Ownership**: Teams own specific modules  
✅ **Easier Debugging**: Narrow scope when issues arise  
✅ **Documentation**: Module-level docs easier to maintain

## CORA vs. Monolith

### Monolithic Architecture (Legacy)

```
apps/backend/
├── lambda1.py                    # Handles users, orgs, resumes
├── lambda2.py                    # Handles certs, campaigns
├── lambda3.py                    # Handles documents
└── shared_utils.py

apps/frontend/
├── components/                   # All components mixed together
│   ├── UserProfile.tsx
│   ├── OrgSelector.tsx
│   ├── ResumeList.tsx
│   ├── CertList.tsx
│   └── ... 50+ components
└── pages/
    ├── dashboard.tsx             # Imports many components
    ├── profile.tsx
    └── ... 20+ pages
```

**Problems:**

- ❌ No clear boundaries between features
- ❌ Hard to reuse in other applications
- ❌ Difficult to test in isolation
- ❌ Tight coupling between features
- ❌ One team's changes can break another's work
- ❌ All code deployed together (higher risk)
- ❌ Difficult to understand what depends on what

### CORA Architecture (Current)

```
packages/org-module/              # Self-contained, 12 API endpoints
├── db/                           # Multi-tenant schema
├── backend/                      # 4 Lambda functions
├── frontend/                     # React components
└── infrastructure/               # Terraform

packages/resume-module/           # Self-contained
├── db/
├── backend/
├── frontend/
└── infrastructure/

packages/cert-module/             # Self-contained
├── db/
├── backend/
├── frontend/
└── infrastructure/

apps/frontend/                    # Thin composition layer
└── app/
    ├── layout.tsx                # Imports Sidebar from org-module
    └── resumes/
        └── page.tsx              # Imports ResumeList from resume-module
```

**Advantages:**

- ✅ Clear module boundaries
- ✅ Reusable across applications
- ✅ Easy to test independently
- ✅ Loose coupling between modules
- ✅ Teams can work independently
- ✅ Modules deployed independently (lower risk)
- ✅ Dependencies explicitly defined

## Real-World Example: Org-Module

The **org-module** is the reference implementation of CORA principles.

### What it Provides

**Database (10 SQL schema files):**

- `auth.users` table (Supabase authentication)
- `profiles` table (user profile data)
- `org` table (organizations)
- `org_member` table (membership relationships)
- RLS helper functions (`can_access_org_data()`, `can_modify_org_data()`, etc.)
- Audit triggers (`set_updated_at()`)

**Backend (4 Lambda functions, 12 API endpoints):**

- **identities-management**: User provisioning (POST /identities, GET /identities/{id}, DELETE /identities/{id})
- **profiles**: Profile CRUD (GET /profiles/me, PUT /profiles/me, DELETE /profiles/me)
- **orgs**: Organization CRUD (GET /organizations, POST /organizations, PUT /organizations/{id})
- **members**: Membership management (GET /organizations/{id}/members, POST /organizations/{id}/members, DELETE /organizations/{id}/members/{userId})

**Frontend (React components):**

- `Sidebar` - Main navigation sidebar
- `Dashboard` - Dashboard component
- `SidebarUserMenu` - User menu dropdown
- `CreateOrganization` - Org creation wizard
- `ProfileCard` - User profile card
- `OrgSelector` - Org switcher dropdown
- `OrgMembersList` - Members list table

**Frontend (React hooks):**

- `useProfile()` - Fetch/update user profile
- `useOrganizations()` - Fetch user's organizations
- `useCurrentOrg()` - Get/set current organization

**Frontend (React contexts):**

- `UserProvider` / `useUser()` - Current user state
- `OrgProvider` / `useOrg()` - Current organization state

### How Other Modules Use It

**Example: Resume-Module depends on Org-Module**

```typescript
// In packages/resume-module/frontend/hooks/useResumes.ts
import { useCurrentOrg } from "@org-module/frontend";

export function useResumes() {
  const { currentOrg } = useCurrentOrg(); // Get current org from org-module

  const { data: resumes } = useSWR(
    currentOrg ? `/resumes?orgId=${currentOrg.id}` : null,
    fetcher
  );

  return { resumes };
}
```

```sql
-- In packages/resume-module/db/schema/001-resumes.sql
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,  -- Foreign key to org-module
    person_id UUID NOT NULL REFERENCES auth.users(id),           -- Foreign key to org-module
    -- ... resume fields
);

-- Use RLS helper from org-module
CREATE POLICY "resumes_select_policy"
  ON resumes
  FOR SELECT
  TO authenticated
  USING (can_access_org_data(org_id));  -- Helper from org-module
```

## Common Pitfalls

### 1. Forgetting org_id in tables

**❌ Wrong:**

```sql
CREATE TABLE my_entities (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL
);
```

**✅ Correct:**

```sql
CREATE TABLE my_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,  -- Always include org_id
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. Not using RLS helpers

**❌ Wrong:**

```sql
CREATE POLICY "my_entities_select_policy"
  ON my_entities
  FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT org_id FROM org_member WHERE user_id = auth.uid()));  -- Don't reinvent the wheel
```

**✅ Correct:**

```sql
CREATE POLICY "my_entities_select_policy"
  ON my_entities
  FOR SELECT
  TO authenticated
  USING (can_access_org_data(org_id));  -- Use helper from org-module
```

### 3. Hardcoding routes

**❌ Wrong:**

```hcl
# In main infrastructure
resource "aws_apigatewayv2_route" "my_module_route1" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /my-module/entities"  -- Hardcoded
  # ...
}

resource "aws_apigatewayv2_route" "my_module_route2" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /my-module/entities"  -- Hardcoded
  # ...
}
```

**✅ Correct:**

```hcl
# Module outputs routes
output "api_routes" {
  value = [
    { method = "GET", path = "/my-module/entities", integration = aws_lambda_function.entities.invoke_arn },
    { method = "POST", path = "/my-module/entities", integration = aws_lambda_function.entities.invoke_arn },
  ]
}

# Main infrastructure dynamically creates routes
resource "aws_apigatewayv2_route" "my_module" {
  for_each = { for route in module.my_module.api_routes : "${route.method}-${route.path}" => route }
  # ...
}
```

### 4. Missing barrel exports

**❌ Wrong:**

```typescript
// In apps/frontend/
import { Sidebar } from "@org-module/frontend/components/layout/Sidebar"; // Deep import
import { useProfile } from "@org-module/frontend/hooks/useProfile"; // Deep import
```

**✅ Correct:**

```typescript
// Module exports everything via index.ts
export { Sidebar } from "./components/layout/Sidebar";
export { useProfile } from "./hooks/useProfile";

// In apps/frontend/
import { Sidebar, useProfile } from "@org-module/frontend"; // Clean import
```

### 5. Skipping tests

**❌ Wrong:**

```typescript
// No tests written, "I'll add them later"
```

**✅ Correct:**

```typescript
// packages/org-module/frontend/__tests__/hooks/useProfile.test.ts
describe("useProfile", () => {
  it("fetches profile on mount", async () => {
    // ... test
  });

  it("updates profile", async () => {
    // ... test
  });
});
```

## Migration Strategy: Monolith → CORA

### Step 1: Deploy Foundation (org-module)

1. Apply org-module database schema
2. Deploy org-module Lambda functions
3. Create org-module frontend components
4. Update app to use org-module

### Step 2: Extract Feature Modules

For each feature (e.g., resumes, certifications):

1. **Identify boundaries**: What tables, endpoints, components belong to this feature?
2. **Create module structure**: `packages/resume-module/`
3. **Migrate database schema**: Move SQL files, update foreign keys
4. **Migrate backend**: Move Lambda functions, update imports
5. **Migrate frontend**: Move components, create hooks
6. **Update infrastructure**: Create module Terraform, update main infra
7. **Test**: Verify module works independently
8. **Deploy**: Apply schema, deploy Lambdas, update app

### Step 3: Retire Monolith

1. Verify all features migrated to modules
2. Delete legacy `apps/backend/` code
3. Simplify `apps/frontend/` to composition layer

## Decision Tree: Should I Create a New Module?

```
Start
  │
  ├─ Is this feature used across multiple apps? ─── YES ──→ Create new module
  │                                              └── NO
  │                                                  │
  ├─ Does this feature have its own data model? ─── YES ──→ Create new module
  │                                              └── NO
  │                                                  │
  ├─ Can this feature be developed/tested ────────── YES ──→ Create new module
  │  independently?                              └── NO
  │                                                  │
  └─ If all NO ─────────────────────────────────────────→ Extend existing module
```

## Further Reading

- [Module Integration Specification](./module-integration-spec.md) - Technical specification
- [Creating Modules Guide](../development/creating-modules.md) - Step-by-step tutorial
- [Backend Architecture](./backend.md) - Module backend patterns
- [Frontend Architecture](./frontend.md) - Module frontend patterns
- [Database Architecture](./database.md) - Multi-tenant schema design
- [Org-Module README](../../packages/org-module/README.md) - Reference implementation

---

**Last Updated**: November 4, 2025
