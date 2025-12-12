# Org-Module

Auth-agnostic, multi-tenant organization management for CORA.

## Overview

The org-module provides the foundational multi-tenant architecture for any CORA-based application, including:

- **User Authentication**: Agnostic via `CoraAuthAdapter` (works with Clerk, Okta, etc.)
- **User Profiles**: User profile management with global roles
- **Organizations**: Multi-tenant organization structure
- **Organization Membership**: Role-based organization membership
- **External Identity Mapping**: Map Okta users to Supabase users
- **Row Level Security**: Comprehensive RLS policies for data isolation
- **Audit Logging**: Track all data changes for compliance

## Architecture

```
org-module/
├── db/
│   ├── schema/          # Database schema files (9 files)
│   ├── migrations/      # Migration scripts
│   └── seed-data/       # Test/demo data
├── backend/
│   ├── layers/          # Lambda layers
│   │   └── org-common/  # Shared Python modules
│   └── lambdas/         # Lambda functions
│       ├── identities/  # User provisioning & identity mapping
│       ├── profiles/    # Profile CRUD operations
│       ├── orgs/        # Organization management
│       └── members/     # Membership management
└── frontend/
    ├── components/      # React components
    ├── hooks/          # React hooks
    ├── contexts/       # React contexts
    └── lib/            # Utility functions
```

## Database Schema

### Core Tables

1. **external_identities** - Maps Okta user IDs to Supabase auth.users
2. **profiles** - User profile information (one per auth.users record)
3. **org** - Organizations for multi-tenant data isolation
4. **org_members** - Organization membership with roles
5. **audit_log** - Audit trail for all data changes

### Schema Files (Apply in Order)

```bash
# 1. Enable UUID extension
packages/org-module/db/schema/001-enable-uuid.sql

# 2. Document Supabase auth.users structure
packages/org-module/db/schema/002-auth-users-schema.sql

# 3. Create external identities table
packages/org-module/db/schema/003-external-identities.sql

# 4. Create profiles table
packages/org-module/db/schema/004-profiles.sql

# 5. Create org table
packages/org-module/db/schema/005-orgs.sql

# 6. Create org_members table
packages/org-module/db/schema/006-org-members.sql

# 7. Create RLS helper functions
packages/org-module/db/schema/007-rls-helper-functions.sql

# 8. Create audit triggers
packages/org-module/db/schema/008-audit-triggers.sql

# 9. RLS policy documentation & testing
packages/org-module/db/schema/009-apply-rls-policies.sql
```

## Organization Roles

### Global Roles (profiles.global_role)

- **global_user**: Default role, standard access within organizations
- **global_admin**: System-wide administrator, can manage org settings across all organizations (cannot manage membership)
- **global_owner**: System-wide owner with full access including cross-organization membership management

### Organization Roles (org_members.role_name)

- **org_user**: Standard member access (default role)
- **org_admin**: Can manage org settings, but not membership
- **org_owner**: Organization creator, full control including membership management

**Note:** "Member" is a generic term meaning anyone with a role in an organization

## Row Level Security (RLS)

All tables have RLS enabled with policies based on:

- User authentication (auth.uid())
- Organization membership
- User roles (global and org-specific)

### Helper Functions

```sql
-- Organization membership
is_org_member(org_id UUID) → BOOLEAN         -- Any role (i.e., is a "member")
is_org_user(org_id UUID) → BOOLEAN           -- Has org_user role
is_org_admin(org_id UUID) → BOOLEAN          -- Has org_admin role
is_org_owner(org_id UUID) → BOOLEAN          -- Has org_owner role
has_org_admin_access(org_id UUID) → BOOLEAN  -- Has org_admin OR org_owner

-- Data access
can_access_org_data(org_id UUID) → BOOLEAN          -- Read access (any member or global_owner)
can_modify_org_settings(org_id UUID) → BOOLEAN      -- Settings access (org_admin/org_owner or global_admin/global_owner)
can_manage_org_membership(org_id UUID) → BOOLEAN    -- Membership access (org_owner or global_owner)

-- Global roles
is_global_user() → BOOLEAN                   -- Has global_user role
is_global_admin() → BOOLEAN                  -- Has global_admin role
is_global_owner() → BOOLEAN                  -- Has global_owner role
has_global_admin_access() → BOOLEAN          -- Has global_admin OR global_owner
```

## Authentication Flow

```
1. User logs in via any Identity Provider (IdP)
   ↓
2. Frontend `ClientProviders` creates a `CoraAuthAdapter`
   ↓
3. The adapter is passed to `UserProvider` and `OrgProvider`
   ↓
4. CORA modules use the adapter's `getToken()` method
   ↓
5. API Gateway Lambda receives IdP JWT
   ↓
6. Lambda validates JWT and maps to Supabase user via `external_identities`
   ↓
7. Backend operations use Supabase RLS policies
```

## Multi-Tenancy Pattern

All org-scoped data tables should:

1. Include `org_id UUID NOT NULL` column
2. Reference `public.org(id) ON DELETE CASCADE`
3. Add index on `org_id`
4. Enable RLS with standard policies:
   - SELECT: `can_access_org_data(org_id)`
   - INSERT: `can_access_org_data(org_id)`
   - UPDATE: `can_modify_org_data(org_id)`
   - DELETE: `can_modify_org_data(org_id)`

## Dependencies

- **Supabase**: PostgreSQL + RLS
- **Any IdP**: Clerk, Okta, etc. for SSO authentication
- **AWS Lambda**: Backend processing
- **Next.js**: Frontend application

## Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Okta
OKTA_DOMAIN=your-domain.okta.com
OKTA_CLIENT_ID=your-client-id
OKTA_CLIENT_SECRET=your-client-secret
OKTA_API_TOKEN=your-api-token
```

## Backend Implementation

See `backend/README.md` for detailed documentation.

**Completed Components:**

- ✅ org-common Lambda layer (Supabase client, DB helpers, validators)
- ✅ identities-management Lambda (user provisioning)
- ✅ profiles Lambda (GET/PUT /profiles/me)
- ✅ orgs Lambda (5 CRUD endpoints)
- ✅ members Lambda (4 membership endpoints)

**Total:** 1 layer + 4 Lambda functions = 12 API endpoints

**Build & Deploy:**

```bash
# Build Lambda packages
cd packages/org-module/backend
./build.sh

# Deploy via Terraform
cd sts-career-infra/terraform/environments/dev
terraform apply
```

## Frontend Usage

### Installation

The org-module frontend is included in the monorepo workspace. Import components and hooks as needed:

```typescript
import {
  // Contexts & Providers
  UserProvider,
  OrgProvider,
  useUser,
  useCurrentOrg,

  // Hooks
  useProfile,
  useOrganizations,
  useOrgMembers,

  // Utilities
  canManageMembers,
  isOrgOwner,
  getRoleDisplayName,
  validateEmail,
  generateSlug,
} from "@sts-career/org-module-frontend";
```

### Quick Start

**1. Wrap your app with providers:**

```typescript
// app/components/ClientProviders.tsx
"use client";
import { useAuth } from "@clerk/nextjs"; // Or any other IdP hook
import { UserProvider, OrgProvider } from "@${project}/org-module-frontend";
import { createClerkAuthAdapter } from "@${project}/api-client";

export default function ClientProviders({ children }) {
  const { isSignedIn, ...clerkAuth } = useAuth();
  const authAdapter = createClerkAuthAdapter(clerkAuth);

  return (
    <UserProvider authAdapter={authAdapter} isAuthenticated={!!isSignedIn}>
      <OrgProvider authAdapter={authAdapter}>
        {children}
      </OrgProvider>
    </UserProvider>
  );
}
```

**2. Use hooks in your components:**

```typescript
import { useCurrentOrg, useUser } from "@sts-career/org-module-frontend";

function MyComponent() {
  const { profile } = useUser();
  const { currentOrg, organizations } = useCurrentOrg();

  return (
    <div>
      <p>Welcome, {profile?.name}!</p>
      <p>Current org: {currentOrg?.orgName}</p>
    </div>
  );
}
```

### React Contexts

#### UserProvider & useUser

Provides access to the current user's profile and organizations.

```typescript
const { profile, loading, error, refreshUserContext } = useUser();

// profile: Profile | null - User profile with organizations
// loading: boolean - Loading state
// error: string | null - Error message if any
// refreshUserContext: () => Promise<void> - Manually refresh profile
```

#### OrgProvider & useCurrentOrg

Manages the current organization context.

```typescript
const {
  currentOrg, // Current selected organization
  organizations, // All user's organizations
  setCurrentOrg, // Switch organization
  refreshOrganizations, // Refresh organization list
  loading,
  api, // Authenticated API client
} = useCurrentOrg();
```

### React Hooks

#### useProfile

Fetch and update user profile.

```typescript
const { profile, loading, error, refetch, updateProfile } = useProfile();

// Update profile
await updateProfile({ name: "John Doe", phone: "+1234567890" });
```

#### useOrganizations

Fetch user's organizations.

```typescript
const { organizations, loading, error, refetch } = useOrganizations();
```

#### useOrgMembers

Manage organization members.

```typescript
const {
  members,
  loading,
  error,
  refetch,
  inviteMember,
  updateMemberRole,
  removeMember,
} = useOrgMembers(orgId);

// Invite new member
await inviteMember({ email: "user@example.com", role: "org_user" });

// Update member role
await updateMemberRole(memberId, "org_admin");

// Remove member
await removeMember(memberId);
```

### Utility Functions

#### Permission Helpers

```typescript
import {
  canManageMembers,
  canManageSettings,
  isOrgOwner,
  isOrgAdmin,
  hasOrgAdminAccess,
  isGlobalAdmin,
  getRoleDisplayName,
} from "@sts-career/org-module-frontend";

// Check permissions
if (canManageMembers(currentOrg)) {
  // Show invite member button
}

// Get role display name
const roleName = getRoleDisplayName("org_admin"); // "Admin"
```

#### Validation Helpers

```typescript
import {
  validateOrgName,
  validateSlug,
  generateSlug,
  validateEmail,
  validateUrl,
} from "@sts-career/org-module-frontend";

// Validate organization name
const error = validateOrgName(orgName);
if (error) {
  // Show error message
}

// Generate slug from name
const slug = generateSlug("My Organization"); // "my-organization"

// Validate email
const emailError = validateEmail(email);
```

### TypeScript Types

```typescript
import type {
  User,
  Profile,
  Organization,
  OrgMember,
  UserOrganization,
  ApiResponse,
  CreateOrgInput,
  UpdateProfileInput,
  InviteMemberInput,
} from "@sts-career/org-module-frontend";
```

### API Client

Direct API access for advanced use cases:

```typescript
import { createOrgModuleClient } from "@sts-career/org-module-frontend";
import { createAuthenticatedClient } from "@/lib/api-client";

const api = createOrgModuleClient(createAuthenticatedClient(accessToken));

// Use API methods
const profile = await api.getProfile();
const orgs = await api.getOrganizations();
const members = await api.getMembers(orgId);
```

### Example: Organization Switcher

```typescript
import { useCurrentOrg } from "@sts-career/org-module-frontend";

function OrgSwitcher() {
  const { currentOrg, organizations, setCurrentOrg } = useCurrentOrg();

  return (
    <select
      value={currentOrg?.orgId}
      onChange={(e) => {
        const org = organizations.find((o) => o.orgId === e.target.value);
        if (org) setCurrentOrg(org);
      }}
    >
      {organizations.map((org) => (
        <option key={org.orgId} value={org.orgId}>
          {org.orgName}
        </option>
      ))}
    </select>
  );
}
```

### Example: Member Management

```typescript
import {
  useOrgMembers,
  canManageMembers,
} from "@sts-career/org-module-frontend";

function MembersList() {
  const { currentOrg } = useCurrentOrg();
  const { members, loading, inviteMember } = useOrgMembers(currentOrg?.orgId);

  const handleInvite = async (email: string, role: string) => {
    await inviteMember({ email, role });
  };

  if (!canManageMembers(currentOrg)) {
    return <div>You don't have permission to manage members</div>;
  }

  return (
    <div>
      <h2>Members</h2>
      {members.map((member) => (
        <div key={member.id}>{member.user?.email}</div>
      ))}
    </div>
  );
}
```

## Next Steps

### Testing & Integration

- [ ] Write integration tests
- [ ] Test RLS policies with different roles
- [ ] Create module manifest
- [ ] Document API endpoints
- [ ] Create deployment guide

## API Endpoints

### Identities Management

```
POST   /identities/provision        # Provision Okta user → Supabase user
```

### User Profiles

```
GET    /profiles/me                 # Get current user profile
PUT    /profiles/me                 # Update current user profile
```

### Organizations

```
GET    /orgs                        # List user's organizations
POST   /orgs                        # Create new organization
GET    /orgs/:id                    # Get organization details
PUT    /orgs/:id                    # Update organization
DELETE /orgs/:id                    # Delete organization (org_owner only)
```

### Organization Membership

```
GET    /orgs/:id/members            # List organization members
POST   /orgs/:id/members            # Add member to organization (org_owner only)
PUT    /orgs/:id/members/:memberId  # Update member role (org_owner only)
DELETE /orgs/:id/members/:memberId  # Remove member (org_owner only)
```

**See `backend/README.md` for detailed API documentation including:**

- Request/response formats
- Authentication requirements
- Permission requirements
- Example requests

## Testing

```bash
# Apply schema to Supabase
psql $DATABASE_URL -f packages/org-module/db/schema/001-enable-uuid.sql
psql $DATABASE_URL -f packages/org-module/db/schema/002-auth-users-schema.sql
# ... (apply all 9 files)

# Verify tables exist
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"

# Verify RLS policies exist
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';"
```

## Module Status

✅ **Phase 1: Database Schema (Complete)**

- 9 SQL schema files
- 5 core tables
- RLS policies
- 15+ helper functions
- Audit triggers

✅ **Phase 2: Backend Lambdas (Complete)**

- org-common Lambda layer
- 4 Lambda functions
- 12 API endpoints
- Build script for deployment

⏳ **Phase 3: Frontend Components (Next)**

- React components
- Hooks & contexts

⏳ **Phase 4: Testing & Docs (Pending)**

- Integration tests
- API documentation

## License

Proprietary - STS Career App
