# CORA User Authentication & Provisioning

**Version:** 1.0  
**Date:** December 20, 2025  
**Status:** Standard for all CORA projects

---

## Overview

This document defines the standard authentication and user provisioning patterns for all CORA (Composable Organizational Resource Architecture) projects. It describes the 5 user login scenarios that every CORA application must support, with emphasis on optimizing for the common case (returning users) while gracefully handling first-time user provisioning.

### Key Principles

1. **Fast path for returning users** - 99% of logins are returning users; optimize for speed
2. **Automatic provisioning** - First-time users are auto-provisioned based on context (invitation, domain, or bootstrap)
3. **Org context required** - All users, including platform admins, require organization context for UI rendering
4. **Graceful access denial** - Users without authorization context see helpful messages, not errors

---

## Authentication Architecture

### High-Level Flow

```
User Login (IDP: Okta/Clerk/etc.)
    ↓
JWT Token Issued
    ↓
API Request with Bearer Token
    ↓
API Gateway Authorizer (validates JWT)
    ↓
Lambda Function (profiles endpoint)
    ├─ Extracts user claims from authorizer context
    ├─ Checks for existing profile
    ├─ If exists: return profile (FAST PATH)
    └─ If not exists: auto-provision (SLOW PATH, 5 scenarios)
```

### Key Components

- **IDP (Identity Provider)**: Okta, Clerk, or similar OAuth/OIDC provider
- **JWT Token**: Contains user claims (email, sub/user_id, name)
- **API Gateway Authorizer**: Validates JWT signature and expiration
- **Profiles Lambda**: Primary entry point, handles auto-provisioning
- **Database**: Stores profiles, org_members, org_invites, org.allowed_domain

---

## The 5 User Login Scenarios

Every user login follows one of these scenarios:

| Scenario | Trigger Condition | Provisioning Action | User Destination |
|----------|------------------|---------------------|------------------|
| **1. Standard Authorization** | Profile exists in database | Return existing profile | Org dashboard (current_org_id) |
| **2. First-Time Invited User** | Pending invitation for email | Provision user, assign to invited org | Invited org dashboard |
| **3. First-Time Domain User** | Email domain matches org's `allowed_domain` | Provision user, assign to matching org | Matched org dashboard |
| **4. Bootstrap** | No `platform_owner` exists yet | Create "Platform Admin" org, provision as platform_owner | Org settings page |
| **5. Denied Access** | No invitation, no domain match, platform initialized | Provision with `requires_invitation=true` | "Contact Admin" message |

---

## Scenario Details

### Scenario 1: Standard Authorization (Returning User)

**Frequency:** 99% of requests  
**Performance Target:** < 120ms

```
User authenticates via IDP
    ↓
GET /profiles/me
    ↓
Lambda queries: external_identities + profiles (JOIN or 2 queries)
    ↓
Profile found with current_org_id
    ↓
Return profile immediately
```

**Optimization:**
- Use single query with JOIN or database function
- Index on external_identities.external_id and provider_name
- Index on profiles.user_id

**Database Queries:**
```sql
-- Optimized single query
SELECT p.* 
FROM profiles p
INNER JOIN external_identities ei ON ei.auth_user_id = p.user_id
WHERE ei.external_id = :okta_uid 
  AND ei.provider_name = 'okta';
```

---

### Scenario 2: First-Time Invited User

**Trigger:** Pending invitation exists for user's email

```
User authenticates via IDP (first time)
    ↓
Lambda detects: no profile exists
    ↓
Check org_invites WHERE invited_email = user.email AND accepted_at IS NULL
    ↓
Invitation found
    ↓
Auto-provision:
    ├─ Create auth.users (Supabase Admin API)
    ├─ Create external_identities mapping
    ├─ Create profile with current_org_id = invitation.org_id
    ├─ Create org_members with role from invitation
    └─ Mark invitation accepted (accepted_at = NOW(), accepted_by = user_id)
    ↓
User lands in invited organization dashboard
```

**Key Points:**
- Invitation is checked BEFORE creating profile to set `current_org_id`
- Only ONE pending invitation per email (enforced by UNIQUE constraint)
- Invitation roles: `org_user`, `org_admin`, `org_owner`

---

### Scenario 3: First-Time Domain User

**Trigger:** Email domain matches an organization's `allowed_domain`

```
User authenticates via IDP (first time)
    ↓
Lambda detects: no profile exists
    ↓
Check org_invites: no invitation found
    ↓
Extract domain from email (user@acme.com → "acme.com")
    ↓
Query: SELECT * FROM org WHERE allowed_domain = 'acme.com' AND allowed_domain IS NOT NULL
    ↓
Domain match found
    ↓
Auto-provision:
    ├─ Create auth.users
    ├─ Create external_identities mapping
    ├─ Create profile with current_org_id = matched_org.id
    └─ Create org_members with role = org.domain_default_role (default: 'org_user')
    ↓
User lands in matched organization dashboard
```

**Key Points:**
- Domain is globally unique (one org per domain)
- Default role is configurable per org (stored in `org.domain_default_role`)
- Org admins configure their allowed domain in org settings

---

### Scenario 4: Bootstrap (First User)

**Trigger:** No `platform_owner` exists in profiles table

```
User authenticates via IDP (first time)
    ↓
Lambda detects: no profile exists
    ↓
Check org_invites: no invitation
    ↓
Check allowed_domain: no match
    ↓
Query: SELECT * FROM profiles WHERE global_role = 'platform_owner'
    ↓
No platform_owner exists (bootstrap scenario)
    ↓
Auto-provision:
    ├─ Create auth.users
    ├─ Create external_identities mapping
    ├─ Create organization:
    │   ├─ name: "Platform Admin"
    │   ├─ slug: "platform-admin"
    │   └─ description: "Organization for platform administration"
    ├─ Create profile:
    │   ├─ global_role: 'platform_owner'
    │   └─ current_org_id: new_org.id
    └─ Create org_members:
        ├─ org_id: new_org.id
        ├─ user_id: new_user.id
        └─ role: 'org_owner'
    ↓
Frontend redirects to: /admin/organization (org settings page)
```

**Key Points:**
- "Platform Admin" org is created automatically (required for UI org context)
- User is both `platform_owner` (global) and `org_owner` (of Platform Admin org)
- User can configure org metadata (name can be changed if desired)
- Left sidebar and org selector become available with org context established

**Why Auto-Create Org:**
- ALL users require org context for UI rendering (navigation, permissions, etc.)
- Platform admins need a "home" organization for administrative functions
- Prevents broken UX with no org context

---

### Scenario 5: Denied Access

**Trigger:** No invitation, no domain match, and platform already initialized

```
User authenticates via IDP (first time)
    ↓
Lambda detects: no profile exists
    ↓
Check org_invites: no invitation
    ↓
Check allowed_domain: no match
    ↓
Query: SELECT * FROM profiles WHERE global_role = 'platform_owner'
    ↓
Platform owner exists (platform already initialized)
    ↓
Auto-provision:
    ├─ Create auth.users
    ├─ Create external_identities mapping
    └─ Create profile:
        ├─ global_role: 'global_user'
        ├─ current_org_id: NULL
        └─ requires_invitation: TRUE
    ↓
Frontend detects requires_invitation flag
    ↓
Display "Contact Admin" message (no dashboard access)
```

**Frontend Handling:**
```typescript
if (profile?.requiresInvitation) {
  return (
    <ContactAdminMessage 
      email={profile.email}
      supportEmail="support@example.com"
    />
  );
}
```

**Key Points:**
- User is authenticated but NOT provisioned to any org
- Profile created to track the access attempt
- User sees helpful message explaining how to gain access
- Prevents multiple platform owners from being created

---

## Decision Flowchart

```
User Authenticates via IDP
    ↓
GET /profiles/me
    ↓
Profile exists? ──YES──> SCENARIO 1: Return profile (FAST PATH)
    ↓
   NO
    ↓
Check: org_invites WHERE email = user.email AND accepted_at IS NULL
    ↓
Invitation exists? ──YES──> SCENARIO 2: Provision with invited org
    ↓
   NO
    ↓
Extract domain from email
    ↓
Check: org WHERE allowed_domain = domain AND allowed_domain IS NOT NULL
    ↓
Domain match? ──YES──> SCENARIO 3: Provision with domain org
    ↓
   NO
    ↓
Check: profiles WHERE global_role = 'platform_owner'
    ↓
Platform owner exists?
    ↓                    ↓
   NO                   YES
    ↓                    ↓
SCENARIO 4:         SCENARIO 5:
Bootstrap           Denied Access
(create Platform    (requires_invitation = true)
Admin org)
```

---

## Database Schema Requirements

### Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,
  global_role VARCHAR(50) DEFAULT 'global_user',
  current_org_id UUID REFERENCES org(id),
  requires_invitation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_profiles_global_role ON profiles(global_role);
CREATE INDEX idx_profiles_requires_invitation ON profiles(requires_invitation) 
  WHERE requires_invitation = TRUE;
```

### External Identities Table

```sql
CREATE TABLE external_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id),
  provider_name VARCHAR(50) NOT NULL,  -- 'okta', 'clerk', etc.
  external_id TEXT NOT NULL,            -- IDP user ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_name, external_id)
);

CREATE INDEX idx_external_identities_lookup ON external_identities(external_id, provider_name);
```

### Organization Table

```sql
CREATE TABLE org (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  allowed_domain VARCHAR(255) UNIQUE,  -- For domain-based auto-provisioning
  domain_default_role VARCHAR(50) DEFAULT 'org_user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_org_allowed_domain ON org(allowed_domain) 
  WHERE allowed_domain IS NOT NULL;
```

### Organization Members Table

```sql
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name VARCHAR(50) NOT NULL DEFAULT 'org_user',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(org_id);
```

### Organization Invites Table

```sql
CREATE TABLE org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('org_user', 'org_admin', 'org_owner')),
  invited_by UUID REFERENCES auth.users(id),
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Only ONE pending invitation per email
  CONSTRAINT org_invites_pending_email_unique 
    EXCLUDE USING btree (invited_email WITH =) 
    WHERE (accepted_at IS NULL)
);

CREATE INDEX idx_org_invites_email ON org_invites(invited_email) 
  WHERE accepted_at IS NULL;
```

---

## Performance Optimization

### Returning Users (99% of Traffic)

**Goal:** < 120ms response time

**Optimization Strategies:**

1. **Single Query Approach:**
```sql
CREATE OR REPLACE FUNCTION get_profile_by_idp_user(
  p_external_id TEXT,
  p_provider_name TEXT
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  name TEXT,
  global_role VARCHAR(50),
  current_org_id UUID,
  requires_invitation BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.user_id, p.email, p.name, p.global_role, p.current_org_id, p.requires_invitation
  FROM profiles p
  INNER JOIN external_identities ei ON ei.auth_user_id = p.user_id
  WHERE ei.external_id = p_external_id
    AND ei.provider_name = p_provider_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

2. **Critical Indexes:**
```sql
CREATE INDEX idx_external_identities_lookup ON external_identities(external_id, provider_name);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
```

3. **Lambda Handler Pattern:**
```python
def handle_get_profile(user_id: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
    # FAST PATH: Single query for returning users
    profile = supabase.rpc('get_profile_by_idp_user', {
        'p_external_id': user_id,
        'p_provider_name': 'okta'
    }).execute()
    
    if profile.data and len(profile.data) > 0:
        # Returning user - FAST PATH (99% of requests)
        return success_response(profile.data[0])
    
    # SLOW PATH: New user - auto-provision
    profile = auto_provision_user(user_info)
    return success_response(profile)
```

---

## Implementation Checklist

### Backend Implementation

- [ ] **Profiles Lambda:**
  - [ ] `GET /profiles/me` endpoint
  - [ ] `auto_provision_user()` function implementing 5 scenarios
  - [ ] `check_pending_invitation()` helper
  - [ ] `check_domain_match()` helper
  - [ ] `check_platform_owner_exists()` helper
  - [ ] `create_bootstrap_org()` function (creates "Platform Admin" org)
  
- [ ] **Database:**
  - [ ] All 5 tables created (profiles, external_identities, org, org_members, org_invites)
  - [ ] Indexes on critical columns
  - [ ] Database function for fast profile lookup
  - [ ] RLS policies configured

- [ ] **API Gateway Authorizer:**
  - [ ] JWT validation from IDP
  - [ ] Claims extraction (email, sub, name)
  - [ ] Fallback to `sub` claim if `email` missing

### Frontend Implementation

- [ ] **Auth Hooks:**
  - [ ] `useUser()` hook to fetch `/profiles/me`
  - [ ] `useOrganizationContext()` for current org
  
- [ ] **Routing:**
  - [ ] Redirect returning users to org dashboard
  - [ ] Redirect bootstrap users to org settings (`/admin/organization`)
  - [ ] Show "Contact Admin" for `requiresInvitation=true` users
  
- [ ] **UI Components:**
  - [ ] Org selector in left sidebar
  - [ ] "Contact Admin" message component
  - [ ] Org settings/edit page

### Testing

- [ ] **Scenario 1 (Returning User):**
  - [ ] User logs in, profile exists, lands on dashboard
  - [ ] Performance < 120ms
  
- [ ] **Scenario 2 (Invited User):**
  - [ ] Create invitation, user logs in, assigned to correct org
  - [ ] Invitation marked as accepted
  
- [ ] **Scenario 3 (Domain User):**
  - [ ] Configure org with `allowed_domain`
  - [ ] User with matching domain logs in, assigned to org
  
- [ ] **Scenario 4 (Bootstrap):**
  - [ ] First user logs in
  - [ ] "Platform Admin" org created
  - [ ] User assigned as platform_owner and org_owner
  - [ ] User lands on org settings page
  - [ ] Left sidebar visible with org context
  
- [ ] **Scenario 5 (Denied Access):**
  - [ ] User without invitation/domain match logs in
  - [ ] Profile created with `requires_invitation=true`
  - [ ] "Contact Admin" message displayed

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/profiles/me` | GET | Get current user profile (auto-provisions if needed) |
| `/profiles/me` | PUT | Update current user profile |
| `/orgs/:id` | GET | Get organization details |
| `/orgs/:id` | PUT | Update organization (name, domain, etc.) |
| `/orgs/:id/invitations` | GET | List organization invitations |
| `/orgs/:id/invitations` | POST | Create/update invitation |
| `/orgs/:id/invitations/:id` | DELETE | Cancel invitation |

---

## Security Considerations

1. **JWT Validation:** Always validate JWT signature and expiration at API Gateway
2. **RLS Policies:** Enforce row-level security on all tables
3. **Service Role Usage:** Lambda functions use Supabase service role to bypass RLS for provisioning
4. **Domain Verification:** Consider requiring DNS verification before allowing domain auto-provisioning
5. **Audit Trail:** Track all user provisioning events in audit logs

---

## Troubleshooting

### Issue: User lands on wrong page after login

**Check:**
- User's `current_org_id` is set correctly
- Frontend routing logic checks for `requiresInvitation` flag
- Bootstrap users are redirected to org settings

### Issue: Performance degradation for returning users

**Check:**
- Indexes on `external_identities(external_id, provider_name)`
- Database function `get_profile_by_idp_user()` is being used
- CloudWatch metrics for Lambda duration

### Issue: Bootstrap org not created

**Check:**
- Lambda function has `create_bootstrap_org()` logic
- Organization table has no unique constraint blocking "Platform Admin" name
- Lambda logs for any error during org creation

---

## References

- [IDP Configuration Integration Plan](./idp-config-integration-plan.md)
- [NextAuth Authentication](./nextauth-authentication.md)
- [User Invitation Flow (Legacy)](./auth/USER-INVITATION-FLOW.md)
- [Org Creation Gating (Legacy)](./auth/ORG-CREATION-GATING-AND-DOMAIN-ASSIGNMENT-PLAN.md)

---

**Document Version:** 1.0  
**Created:** December 20, 2025  
**Maintained by:** CORA Development Team  
**Status:** ✅ Standard for all CORA projects
