# API Gateway Authorizer Migration & User Onboarding Documentation

**Last Updated**: December 8, 2025  
**Status**: Complete  
**Related ADR**: [ADR-001-AUTHORIZER-MIGRATION.md](../../../sts-career-infra/docs/ADR-001-AUTHORIZER-MIGRATION.md)

---

## Table of Contents

1. [Authorizer Migration Summary](#authorizer-migration-summary)
2. [Current Authentication Architecture](#current-authentication-architecture)
3. [User Onboarding Flow](#user-onboarding-flow)
4. [Invitation System](#invitation-system)
5. [Organization Creation Gating](#organization-creation-gating)

---

## Authorizer Migration Summary

### What Changed

The API Gateway Lambda Authorizer was **migrated from `sts-career-stack` to `sts-career-infra`** on November 2, 2025.

**Previous Location** (REMOVED ✅):
```
sts-career-stack/packages/org-module/backend/lambdas/authorizer/
```

**Current Location** (ACTIVE):
```
sts-career-infra/lambdas/api-gateway-authorizer/
```

### Why the Migration

The authorizer is **infrastructure**, not a feature module. It:
- Validates JWT tokens for ALL API routes across ALL modules
- Provides authorization context to ALL Lambda functions
- Is configured at the API Gateway level (infrastructure layer)

Having it in org-module created false coupling, suggesting other modules depend on org-module for authentication.

### Impact of Removal

**✅ ZERO IMPACT** - The legacy authorizer directory removal has NO impact on the application:

1. **No Terraform references** - org-module infrastructure never referenced it
2. **No build script references** - Auto-discovery means no hardcoded paths
3. **No deployment impact** - Active authorizer deploys from infra repo
4. **Clean module boundaries** - org-module is now purely business logic

### Cleanup Completed (December 8, 2025)

- ✅ Legacy authorizer directory removed from org-module
- ✅ Documentation updated (this file)
- ✅ ADR-001 status confirmed as implemented

---

## Current Authentication Architecture

### High-Level Flow

```
User Login (Okta)
    ↓
JWT Token Issued
    ↓
API Request with Bearer Token
    ↓
API Gateway Lambda Authorizer (sts-career-infra)
    ├─ Validates JWT signature
    ├─ Checks token expiration
    ├─ Extracts user claims (email, name, etc.)
    └─ Returns Allow/Deny policy
    ↓
Lambda Function (sts-career-stack)
    ├─ Receives user claims in event context
    ├─ Auto-provisions user if first login
    ├─ Processes invitation if exists
    └─ Returns response
```

### Authorizer Responsibilities

**Location**: `sts-career-infra/lambdas/api-gateway-authorizer/lambda_function.py`

**What It Does**:
1. Validates JWT token from Okta
2. Verifies token signature using JWKS
3. Checks token expiration and time-based claims
4. Extracts user information from JWT claims
5. Returns IAM policy (Allow/Deny)
6. Passes user claims to downstream Lambdas

**What It Does NOT Do**:
- ❌ User provisioning (handled by Profiles Lambda)
- ❌ Organization lookup (handled by Profiles Lambda)  
- ❌ Database queries
- ❌ Business logic

### Email Extraction Enhancement (December 8, 2025)

**Critical Fix**: Authorizer now falls back to `sub` claim when `email` claim is missing.

```python
# BEFORE: Only checked 'email' claim
if 'email' in claims:
    auth_response['context']['email'] = str(claims['email'])

# AFTER: Fallback to 'sub' claim (Okta sometimes puts email there)
email_value = claims.get('email') or claims.get('sub', '')
if email_value and '@' in email_value:  # Validate it looks like an email
    auth_response['context']['email'] = str(email_value)
```

**Why This Matters**: Some Okta configurations don't include the `email` claim in JWT tokens. The `sub` claim often contains the email address when `email` is missing. This fix prevents 500 errors during user provisioning.

---

## User Onboarding Flow

### First-Time User Login (Auto-Provisioning)

When a user authenticates via Okta for the first time:

```
1. User logs in with Okta
2. JWT token issued by Okta
3. Frontend calls GET /profiles/me
4. Authorizer validates JWT and passes claims
5. Profiles Lambda:
   ├─ Extracts email and Okta UID from claims
   ├─ Checks if user exists in database
   ├─ NOT FOUND → Triggers auto-provisioning:
   │   ├─ Creates user in auth.users (Supabase)
   │   ├─ Creates external_identities mapping
   │   ├─ Checks for pending invitation by email
   │   ├─ Creates profile record
   │   │   └─ If invitation: sets current_org_id
   │   ├─ If invitation exists:
   │   │   ├─ Creates org_members record
   │   │   └─ Marks invitation as accepted
   │   └─ Returns profile with org assignment
   └─ Returns profile to frontend
```

### Auto-Provisioning Requirements

**Profiles Lambda** (`packages/org-module/backend/lambdas/profiles/lambda_function.py`):

```python
def auto_provision_user(user_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Auto-provision a new user from Okta authentication
    
    Creates:
    1. User in auth.users (via Supabase Admin API)
    2. Mapping in external_identities  
    3. Profile in profiles
    4. Organization membership if pending invitation exists
    """
    email = user_info.get('email')
    okta_uid = user_info.get('user_id')  # Okta UID from JWT

    if not email or not okta_uid:
        raise ValueError("Email and Okta UID are required for user provisioning.")
    
    # ... creates auth.users record
    # ... creates external_identities mapping
    # ... checks for pending invitation
    # ... creates profile with current_org_id if invitation exists
    # ... creates org_members record if invitation exists
    # ... marks invitation as accepted
```

**Key Points**:
- Email and Okta UID are REQUIRED (now extracted from `email` or `sub` claims)
- Invitation is checked BEFORE creating profile (to set `current_org_id`)
- If invitation exists, user is immediately assigned to organization
- If NO invitation, user has no org assignment initially

---

## Invitation System

### How Invitations Work

**See**: [USER-INVITATION-FLOW.md](../USER-INVITATION-FLOW.md)

**Key Features**:
1. Org owners can invite users by email before they create an account
2. Each email can only have ONE pending invitation at a time (across all orgs)
3. When invited user logs in for first time, they are auto-assigned to the organization
4. Invitations expire after configurable days (default: 7 days)

### Database Schema

**Table**: `org_invites`

```sql
CREATE TABLE org_invites (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES org(id),
  invited_email TEXT NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('org_user', 'org_admin', 'org_owner')),
  invited_by UUID REFERENCES profiles(user_id),
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,  -- NULL until accepted
  accepted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  
  -- Constraint: Only ONE pending invitation per email (across all orgs)
  CONSTRAINT org_invites_pending_email_unique 
    EXCLUDE USING btree (invited_email WITH =) 
    WHERE (accepted_at IS NULL)
);
```

### Invitation Acceptance Flow

```
1. Admin creates invitation: POST /orgs/{id}/invitations
   └─ Record created with accepted_at = NULL

2. Invited user logs in via Okta (first time)
   └─ Triggers auto-provisioning in Profiles Lambda

3. Auto-provisioning checks for invitation:
   └─ SELECT FROM org_invites WHERE invited_email = ? AND accepted_at IS NULL

4. If invitation found:
   ├─ Create profile with current_org_id = invitation.org_id
   ├─ Create org_members record
   └─ UPDATE org_invites SET accepted_at = NOW(), accepted_by = user_id

5. User immediately lands in organization dashboard
```

---

## Organization Creation Gating

### Current Behavior (Bootstrap Flow)

**EXISTING**: When a user logs in and has NO organization membership:
1. Profile created without `current_org_id`
2. Frontend shows "Create Your Organization" page
3. User can create organization and becomes owner with `platform_owner` role
4. This is the **bootstrap flow** for initial platform setup

### Required Enhancement: Prevent Multiple Platform Owners

**PROBLEM**: Currently, multiple users can each create their own organizations and all become platform owners.

**DESIRED BEHAVIOR** (Option B from user feedback):
1. ✅ **First user** creates organization → becomes `platform_owner`
2. ❌ **Subsequent users** WITHOUT invitation → cannot create org
3. ✅ **Subsequent users** WITH invitation → auto-assigned to org
4. ℹ️ **Graceful message** for users without invitation

### Implementation Requirements

#### 1. Backend Change: Profiles Lambda

**File**: `packages/org-module/backend/lambdas/profiles/lambda_function.py`

**Enhancement**: In `auto_provision_user()` function, after checking for invitation:

```python
def auto_provision_user(user_info: Dict[str, Any]) -> Dict[str, Any]:
    # ... existing code to extract email, okta_uid
    # ... existing code to create auth.users record
    # ... existing code to create external_identities mapping
    
    # Check for pending invitation
    invitation = check_pending_invitation(email)
    
    # NEW: If NO invitation, check if platform already has an owner
    if not invitation:
        # Check if ANY platform owner exists (across all orgs)
        platform_owner_exists = common.find_one(
            table='profiles',
            filters={'global_role': 'platform_owner'}
        )
        
        if platform_owner_exists:
            # Platform already initialized - user needs invitation
            # Create profile WITHOUT org assignment
            profile = common.insert_one(
                table='profiles',
                data={
                    'user_id': auth_user_id,
                    'email': email,
                    'name': name,
                    'global_role': 'global_user',
                    'current_org_id': None,  # No org assignment
                    'requires_invitation': True,  # NEW FLAG
                    'created_by': auth_user_id,
                    'updated_by': auth_user_id
                }
            )
            return profile
    
    # EXISTING: Create profile with org assignment if invitation exists
    # ... rest of existing code
```

#### 2. Frontend Change: Onboarding Page

**File**: `apps/frontend/src/app/onboarding/create-organization/page.tsx` (or similar)

**Enhancement**: Check `requires_invitation` flag in profile:

```tsx
export default function OnboardingPage() {
  const { user, profile } = useUser();

  // If user requires invitation, show message instead of org creation form
  if (profile?.requires_invitation) {
    return (
      <Container>
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h4" gutterBottom>
            Welcome to the Platform
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            Your email address is not associated with an invitation.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Please contact your administrator to receive an invitation to join an organization.
          </Typography>
          <Button
            variant="outlined"
            sx={{ mt: 4 }}
            href="mailto:support@example.com"
          >
            Contact Support
          </Button>
        </Box>
      </Container>
    );
  }

  // EXISTING: Show org creation form for first user (platform bootstrap)
  return <OrganizationCreationForm />;
}
```

#### 3. Database Migration: Add Flag Column

**File**: `sql/migrations/XXX_add_requires_invitation_flag.sql`

```sql
-- Add requires_invitation flag to profiles table
ALTER TABLE profiles 
ADD COLUMN requires_invitation BOOLEAN DEFAULT FALSE;

-- Comment for documentation
COMMENT ON COLUMN profiles.requires_invitation IS 
  'True if user attempted login without invitation and platform already has owner';

-- Index for quick lookups
CREATE INDEX idx_profiles_requires_invitation 
ON profiles(requires_invitation) 
WHERE requires_invitation = TRUE;
```

### Decision Tree: New User Login

```
User logs in via Okta (first time)
    ↓
Check for pending invitation by email
    ↓
    ├─ INVITATION FOUND
    │   ├─ Create profile with current_org_id
    │   ├─ Create org_members record
    │   ├─ Mark invitation accepted
    │   └─ User lands in org dashboard ✅
    │
    └─ NO INVITATION FOUND
        ↓
        Check if platform_owner exists
        ↓
        ├─ NO PLATFORM OWNER
        │   ├─ Create profile with global_role='platform_owner'
        │   ├─ User sees "Create Organization" page
        │   └─ Bootstrap flow ✅
        │
        └─ PLATFORM OWNER EXISTS
            ├─ Create profile with requires_invitation=TRUE
            ├─ User sees "Contact Admin" message
            └─ Cannot create org ❌
```

### Test Scenarios

#### Scenario 1: First User (Bootstrap)
```
Given: No platform owner exists
When: User logs in via Okta
Then: 
  ✓ Profile created with global_role='platform_owner'
  ✓ User can create organization
  ✓ Becomes org owner
```

#### Scenario 2: Invited User
```
Given: Platform owner exists
  And: Invitation exists for user@example.com
When: user@example.com logs in via Okta
Then:
  ✓ Profile created with current_org_id from invitation
  ✓ org_members record created
  ✓ Invitation marked accepted
  ✓ User lands in org dashboard
```

#### Scenario 3: Non-Invited User (Gated)
```
Given: Platform owner exists
  And: NO invitation exists for user@example.com
When: user@example.com logs in via Okta
Then:
  ✓ Profile created with requires_invitation=TRUE
  ✓ User sees "Contact Admin" message
  ✗ Cannot create organization
```

### Error Messages

**User-Friendly Messages**:

| Scenario | Message |
|----------|---------|
| **No invitation + Platform initialized** | "Your email address is not associated with an invitation. Please contact your administrator to receive an invitation to join an organization." |
| **Expired invitation** | "Your invitation has expired. Please contact your administrator to send a new invitation." |
| **Already member** | "You are already a member of this organization." |

---

## API Endpoints Summary

### Authentication (Infra)
- `*` (All routes) → Validated by `sts-career-infra/lambdas/api-gateway-authorizer`

### User Provisioning (Org Module)
- `GET /profiles/me` → Auto-provisions user if not exists
- `PUT /profiles/me` → Update profile
- `PUT /profiles/me/current-organization` → Switch org

### Invitations (Org Module)
- `GET /orgs/{id}/invitations` → List invitations
- `POST /orgs/{id}/invitations` → Create/update invitation
- `DELETE /orgs/{id}/invitations/{invitationId}` → Cancel invitation
- `GET /invitations/pending` → Get current user's pending invitation

### Organizations (Org Module)
- `POST /orgs` → Create organization (requires platform_owner or no existing owner)
- `GET /orgs` → List user's organizations
- `GET /orgs/{id}` → Get organization details
- `PUT /orgs/{id}` → Update organization
- `DELETE /orgs/{id}` → Delete organization

---

## Migration History

### Phase 1: Authorizer Migration (Nov 2, 2025)
- Moved authorizer from org-module to infra repo
- Deployed to dev environment
- Documented in ADR-001

### Phase 2: Email Extraction Fix (Dec 8, 2025)
- Enhanced authorizer to fallback to `sub` claim for email
- Fixed user provisioning errors
- Deployed via Terraform

### Phase 3: Legacy Cleanup (Dec 8, 2025)
- Removed legacy authorizer directory from org-module
- Verified zero impact on deployments
- Updated documentation

### Phase 4: Invitation System (Dec 8, 2025)
- Implemented org_invites table
- Enhanced Profiles Lambda to check invitations
- Auto-assignment to org on first login
- Complete invitation-to-dashboard flow verified

### Phase 5: Organization Gating (Pending)
- Add `requires_invitation` flag to profiles table
- Implement platform_owner check in auto-provisioning
- Update frontend to show appropriate messages
- Test all user scenarios

---

## References

### Documentation
- [USER-INVITATION-FLOW.md](../USER-INVITATION-FLOW.md) - Detailed invitation system docs
- [ADR-001-AUTHORIZER-MIGRATION.md](../../../sts-career-infra/docs/ADR-001-AUTHORIZER-MIGRATION.md) - Migration decision record
- [OKTA-DEPLOYMENT-GUIDE.md](../../../sts-career-infra/docs/OKTA-DEPLOYMENT-GUIDE.md) - Okta configuration

### Code Locations
- **Authorizer**: `sts-career-infra/lambdas/api-gateway-authorizer/lambda_function.py`
- **Profiles Lambda**: `packages/org-module/backend/lambdas/profiles/lambda_function.py`
- **Invitations Lambda**: `packages/org-module/backend/lambdas/invitations/lambda_function.py`
- **Database Migration**: `sql/migrations/009_create_org_invites.sql`

### Deployment
- **Build Script**: `sts-career-infra/scripts/build-lambdas.sh`
- **Deploy Script**: `sts-career-infra/scripts/deploy-tf.sh`
- **Last Deployment**: December 8, 2025, 4:36 PM EST

---

**Prepared by**: Infrastructure Team  
**Approved by**: Development Team  
**Next Review**: After Phase 5 implementation
