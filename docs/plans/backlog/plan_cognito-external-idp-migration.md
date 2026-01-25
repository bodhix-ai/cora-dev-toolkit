# Plan: Cognito + External IDP Migration

**Status:** PLANNED  
**Created:** January 2, 2026  
**Related ADR:** ADR-010-COGNITO-EXTERNAL-IDP-STRATEGY.md

---

## Overview

This plan outlines the migration from Clerk to AWS Cognito as the default authentication provider, with support for optional external Identity Providers (Okta, Google, Microsoft) for SSO.

### Strategic Goals

1. **Remove Clerk dependency** - Eliminate complexity of maintaining Clerk-specific code paths
2. **AWS-native default** - Use Cognito as cloud-native user management solution
3. **Enterprise flexibility** - Support customer-provided IDPs (Okta, Google Workspace, Microsoft 365)
4. **Simplified architecture** - Single auth adapter pattern for all providers via NextAuth

---

## Current State Assessment

### What Exists Today

- **NextAuth with Okta provider** - Fully implemented with token refresh
- **Clerk provider** - Exists but adds complexity
- **Lambda JWT Authorizer** - Validates tokens at API Gateway level
- **Auth adapters** - Abstraction layer for token management (Okta and Clerk adapters)
- **Admin UI** - IdpConfigCard for managing Clerk/Okta configuration

### Problems with Current Approach

- Clerk requires separate SDK and provider pattern
- Different token format than standard OIDC
- Conditional logic throughout codebase
- Not cloud-native for AWS deployments
- Vendor dependency for user management

---

## Target Architecture

### Authentication Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    CORA Project Authentication                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DEFAULT (Always Included)         OPTIONAL (Enable Per-Project) │
│  ─────────────────────────         ───────────────────────────── │
│                                                                  │
│  ┌──────────────────────┐         ┌──────────────────────────┐  │
│  │   AWS Cognito        │         │   External IDPs          │  │
│  │   User Pool          │         │                          │  │
│  │                      │         │   • Okta (Enterprise)    │  │
│  │   • User management  │         │   • Google (Workspace)   │  │
│  │   • Password auth    │         │   • Microsoft (Azure AD) │  │
│  │   • MFA              │         │                          │  │
│  │   • Admin APIs       │         │   (Customer brings their │  │
│  │                      │         │    own IDP for SSO)      │  │
│  └──────────────────────┘         └──────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Cognito is the default IDP** - Built into every CORA project
2. **External IDPs are optional** - Projects enable them for SSO
3. **Custom login UI** - Full control over UX/look and feel
4. **Multiple external IDPs** - Can enable Google, Microsoft, Okta simultaneously
5. **NextAuth as universal layer** - All providers output standard OIDC tokens

---

## Implementation Phases

### Phase 0: Database Foundation - IDP Table Migration (2-3h)

**Status:** ⏳ To be integrated from db-naming-migration plan  
**Goal:** Migrate IDP config tables to comply with database naming standards before implementing Cognito.

**Context:** This phase integrates scope from the db-naming-migration plan (Phase 1). By migrating these tables now as a prerequisite to Cognito implementation, we avoid touching module-access again later and ensure all auth infrastructure uses compliant naming.

**Related:** See `docs/plans/backlog/plan_db-naming-migration.md` - Phase 1 scope can be moved here.

#### Tables to Migrate

| Current Name | New Name | Type | Rationale |
|--------------|----------|------|-----------|
| `sys_idp_config` | `access_cfg_sys_idp` | Config | Module-access owns IDP config, follows `{module}_cfg_{scope}_{purpose}` pattern |
| `sys_idp_audit_log` | `access_log_idp_audit` | Log | Module-access owns IDP audit, follows `{module}_log_{purpose}` pattern |

**Note:** Using `access_` prefix (not `sys_`) because module-access owns these tables. The `sys` portion moves to the scope position per ADR-011.

#### Migration Steps

```sql
-- 1. Create new tables with correct naming
CREATE TABLE access_cfg_sys_idp (
    -- Copy structure from sys_idp_config
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_type VARCHAR(50) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    config JSONB NOT NULL,
    is_configured BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE access_log_idp_audit (
    -- Copy structure from sys_idp_audit_log
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idp_config_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    performed_by UUID NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    old_config JSONB,
    new_config JSONB
);

-- 2. Copy data
INSERT INTO access_cfg_sys_idp SELECT * FROM sys_idp_config;
INSERT INTO access_log_idp_audit SELECT * FROM sys_idp_audit_log;

-- 3. Update foreign keys
ALTER TABLE access_log_idp_audit
    DROP CONSTRAINT IF EXISTS sys_idp_audit_log_idp_config_id_fkey,
    ADD CONSTRAINT access_log_idp_audit_idp_config_id_fkey
        FOREIGN KEY (idp_config_id) REFERENCES access_cfg_sys_idp(id);

-- 4. Recreate indexes with correct naming
DROP INDEX IF EXISTS idx_sys_idp_audit_config;
CREATE INDEX idx_access_log_idp_audit_config ON access_log_idp_audit(idp_config_id);

DROP INDEX IF EXISTS idx_sys_idp_audit_performed_at;
CREATE INDEX idx_access_log_idp_audit_performed_at ON access_log_idp_audit(performed_at);

-- 5. Update RLS policies
ALTER TABLE access_cfg_sys_idp ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_log_idp_audit ENABLE ROW LEVEL SECURITY;

-- (Copy RLS policies from original tables)

-- 6. Create backward-compatible views (temporary)
CREATE VIEW sys_idp_config AS SELECT * FROM access_cfg_sys_idp;
CREATE VIEW sys_idp_audit_log AS SELECT * FROM access_log_idp_audit;
```

#### Code Changes

**Lambda:** `module-access/backend/lambdas/idp-config/lambda_function.py`
- Update all SQL queries: `sys_idp_config` → `access_cfg_sys_idp`
- Update all SQL queries: `sys_idp_audit_log` → `access_log_idp_audit`

**Template Schema Files:**
- Rename `module-access/db/schema/005-sys-idp-config.sql` → `005-access-cfg-sys-idp.sql`
- Update table creation statements

#### Testing

- [ ] Test IDP configuration read/write operations
- [ ] Test IDP audit logging
- [ ] Test auth flow end-to-end (if Okta is configured)
- [ ] Verify RLS policies work correctly
- [ ] Run validator: `python scripts/validate-db-naming.py`

#### Post-Migration

- [ ] Remove from whitelist: Delete `sys_idp_config` and `sys_idp_audit_log` from `LEGACY_WHITELIST` in `scripts/validate-db-naming.py`
- [ ] Verify validator passes with whitelist entries removed
- [ ] Update `plan_db-naming-migration.md` to mark Phase 1 as "Moved to Cognito/OIDC"

#### Rollback Plan

1. Drop new tables: `DROP TABLE access_cfg_sys_idp, access_log_idp_audit CASCADE;`
2. Revert Lambda code changes
3. Views ensure old code continues to work

---

### Phase 1: Fix Regression + Remove Clerk ✅ CURRENT TASK

**Goal:** Fix the immediate auth adapter regression and remove Clerk support.

**Tasks:**
- [x] Remove Clerk provider code
- [x] Remove Clerk auth adapter
- [x] Simplify OrgProviderWrapper to Okta-only
- [x] Update layout.tsx to use simplified wrapper
- [x] Remove Clerk from IdpConfigCard
- [x] Update ADR-007 to remove Clerk references
- [ ] Test regression fix in test-ws-04
- [ ] Verify navigation restoration

**Files to Modify:**
- `templates/_modules-core/module-access/frontend/providers/clerk.ts` - DELETE
- `templates/_modules-core/module-access/frontend/adapters/clerk-adapter.ts` - DELETE
- `templates/_project-stack-template/apps/web/components/OrgProviderWrapper.tsx` - Simplify
- `templates/_modules-core/module-access/frontend/components/admin/IdpConfigCard.tsx` - Remove Clerk fields
- `docs/arch decisions/ADR-007-CORA-AUTH-SHELL-STANDARD.md` - Update

### Phase 2: Add Cognito Provider Support

**Goal:** Implement Cognito as the default authentication provider.

**Tasks:**
- [ ] Create `cognito.ts` NextAuth provider configuration
- [ ] Create `cognito-adapter.ts` auth adapter
- [ ] Add infrastructure module for Cognito User Pool (`templates/_project-infra-template/modules/cognito/`)
- [ ] Update environment variable templates (`.env.example`)
- [ ] Update `OrgProviderWrapper` to support Cognito
- [ ] Update `AuthProvider` to use Cognito by default
- [ ] Test with new CORA project

**New Files:**
```
templates/_modules-core/module-access/frontend/providers/cognito.ts
templates/_modules-core/module-access/frontend/adapters/cognito-adapter.ts
templates/_project-infra-template/modules/cognito/
├── main.tf
├── variables.tf
├── outputs.tf
└── social-idps.tf (optional)
```

**Infrastructure Requirements:**
- Cognito User Pool with email verification
- App client with appropriate OAuth flows
- Password policy configuration
- MFA configuration (optional)
- CloudWatch logs for Cognito events

### Phase 3: Cognito User Management APIs

**Goal:** Enable platform admins to manage users via Cognito APIs.

**Backend API Endpoints:**
```
POST   /admin/users                    → Create user in Cognito
GET    /admin/users                    → List users from Cognito
GET    /admin/users/:id                → Get user details
PUT    /admin/users/:id                → Update user attributes
DELETE /admin/users/:id                → Delete user
POST   /admin/users/:id/reset-password → Trigger password reset
POST   /admin/users/:id/mfa            → Configure MFA
POST   /admin/users/bulk-import        → Bulk import users (CSV)
```

**Cognito SDK Operations:**
- `AdminCreateUser` - Create user with temp password or invitation
- `ListUsers` - Paginated user list
- `AdminGetUser` - Get user details and attributes
- `AdminUpdateUserAttributes` - Update user profile
- `AdminDeleteUser` - Delete user account
- `AdminResetUserPassword` - Send password reset email
- `AdminSetUserMFAPreference` - Enable/disable MFA

**Tasks:**
- [ ] Create Lambda function for user management (`module-access/backend/lambdas/user-admin/`)
- [ ] Implement Cognito SDK integration
- [ ] Add API routes to modular API Gateway
- [ ] Update UsersTab component for full CRUD
- [ ] Create user creation dialog with Cognito options
- [ ] Add bulk import functionality
- [ ] Test user management workflows

### Phase 4: Update Admin UI for Cognito

**Goal:** Update admin interface to manage Cognito and external IDPs.

**IdpConfigCard Changes:**
- Show Cognito as default (always present, cannot be removed)
- Add Google provider configuration fields
- Add Microsoft provider configuration fields
- Keep Okta provider configuration
- Support multiple external IDPs enabled simultaneously
- Clear visual separation: "Default Authentication" vs "External SSO Providers"

**UsersTab Enhancements:**
- Show auth method per user (Cognito, Google SSO, Okta SSO, etc.)
- MFA status indicator
- Account status (Active, Pending verification, Disabled)
- Filter by auth method
- Bulk actions (enable/disable, delete)

**Tasks:**
- [ ] Update `IdpConfigCard.tsx` with new structure
- [ ] Add `CognitoConfigFields` component
- [ ] Add `GoogleConfigFields` component
- [ ] Add `MicrosoftConfigFields` component
- [ ] Update `UsersTab.tsx` for enhanced user management
- [ ] Create user creation dialog
- [ ] Add user detail/edit modal
- [ ] Test admin UI flows

### Phase 5: External IDP Support (Google, Microsoft)

**Goal:** Add optional Google and Microsoft SSO providers.

**Tasks:**
- [ ] Add Google NextAuth provider to `auth.ts`
- [ ] Add Microsoft (AzureAD) NextAuth provider to `auth.ts`
- [ ] Create adapters for Google and Microsoft
- [ ] Update login page to show available SSO options
- [ ] Add conditional rendering based on env vars
- [ ] Update documentation for configuring Google OAuth
- [ ] Update documentation for configuring Azure AD
- [ ] Test SSO flows

**Environment Variables:**
```env
# Google SSO (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft SSO (optional)
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
```

### Phase 6: Custom Login Page

**Goal:** Create fully customizable login page with conditional SSO buttons.

**Login Page Behavior:**
- Always show Cognito username/password form
- Conditionally show SSO buttons based on configured providers
- Custom styling matching project design system
- Support dark/light modes
- Responsive design
- Clear error messages

**Tasks:**
- [ ] Create custom `/auth/signin` page
- [ ] Implement username/password form for Cognito
- [ ] Add conditional SSO button rendering
- [ ] Add forgot password flow
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test login flows for all providers

### Phase 7: Documentation & Migration Guide

**Goal:** Document the new authentication architecture and provide migration guide.

**Tasks:**
- [ ] Update ADR-007 with Cognito + External IDP strategy
- [ ] Create migration guide for existing projects
- [ ] Document Cognito user pool setup
- [ ] Document Google OAuth setup
- [ ] Document Microsoft Azure AD setup
- [ ] Update project creation guide
- [ ] Create troubleshooting guide
- [ ] Add security best practices

---

## Configuration Model

### Environment Variables

```env
# Cognito (Default - always configured)
COGNITO_USER_POOL_ID=us-east-1_xxxxxx
COGNITO_CLIENT_ID=xxxxxxxxx
COGNITO_CLIENT_SECRET=xxxxxxxxx
COGNITO_REGION=us-east-1

# External IDPs (Optional - enable as needed)

# Okta SSO (Enterprise customers)
OKTA_CLIENT_ID=
OKTA_CLIENT_SECRET=
OKTA_ISSUER=

# Google SSO (Google Workspace customers)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft SSO (Microsoft 365 customers)
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
```

### NextAuth Configuration

```typescript
// auth.ts
providers: [
  // Default - always present
  CognitoProvider({
    clientId: process.env.COGNITO_CLIENT_ID!,
    clientSecret: process.env.COGNITO_CLIENT_SECRET!,
    issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
  }),
  
  // Optional - conditionally added based on env vars
  ...(process.env.OKTA_CLIENT_ID ? [OktaProvider({...})] : []),
  ...(process.env.GOOGLE_CLIENT_ID ? [GoogleProvider({...})] : []),
  ...(process.env.AZURE_AD_CLIENT_ID ? [AzureADProvider({...})] : []),
]
```

---

## User Management Features

### Admin Capabilities

1. **Create User**
   - Email-based account creation
   - Choose between invitation email or temp password
   - Assign to organization with role
   - Force password change on first login

2. **List Users**
   - Paginated user list
   - Filter by auth method, org, status
   - Search by email/name
   - View MFA status

3. **Update User**
   - Modify user attributes
   - Change organization assignment
   - Update roles
   - Enable/disable MFA

4. **Reset Password**
   - Trigger Cognito password reset email
   - For Cognito users only (not SSO users)

5. **Delete User**
   - Remove from Cognito User Pool
   - Cascade delete from CORA database

6. **Bulk Import**
   - CSV upload
   - Batch user creation
   - Email notifications

### User Self-Service (Future)

- Password reset flow
- MFA enrollment
- Profile updates
- Email verification

---

## Security Considerations

### Secrets Management

- All client secrets stored in AWS Secrets Manager
- Never expose secrets in frontend code
- Rotate secrets regularly
- Use least-privilege IAM roles

### Token Security

- JWTs validated by Lambda authorizer
- Short-lived access tokens (1 hour)
- Refresh token rotation
- Secure session storage (HTTP-only cookies)

### MFA

- Support TOTP (Google Authenticator, Authy)
- Optional SMS MFA
- Admin can enforce MFA per user
- Future: WebAuthn/FIDO2 support

### Password Policy

- Minimum 8 characters
- Require uppercase, lowercase, numbers
- Require special characters
- Password history (prevent reuse)
- Account lockout after failed attempts

---

## Testing Strategy

### Unit Tests

- Cognito adapter token retrieval
- User management API endpoints
- NextAuth provider configurations
- Admin UI components

### Integration Tests

- End-to-end login flows (Cognito, Okta, Google, Microsoft)
- User creation and management
- Password reset flow
- MFA enrollment
- Token refresh

### Manual Testing

- Create new CORA project with Cognito
- Configure external IDPs
- Test SSO flows
- Admin user management workflows
- Login page UX across providers

---

## Rollout Strategy

### For New Projects

- Use `create-cora-project.sh` with Cognito template
- Cognito User Pool automatically created
- Admin can configure external IDPs post-deployment

### For Existing Projects

- Migration guide for Clerk → Cognito
- Data migration scripts for user transfer
- Phased rollout with fallback
- No breaking changes to existing auth flows

---

## Success Metrics

- ✅ Clerk completely removed from codebase
- ✅ All projects use Cognito by default
- ✅ External IDP configuration via admin UI
- ✅ Zero auth-related regressions
- ✅ Custom login page with full UX control
- ✅ Admin can manage users via UI
- ✅ Documentation complete and tested

---

## Open Questions & Decisions

### Resolved

1. ✅ **Social IDP approach** - Direct NextAuth providers (not Cognito federation)
2. ✅ **User management** - Cognito provides user directory and management
3. ✅ **Login UX** - Custom page with conditional SSO buttons
4. ✅ **Cognito per project** - Each project has own User Pool (standalone)

### Pending

1. **Password Policy** - Configurable in admin UI or Terraform only?
   - Recommendation: Terraform (infrastructure level)
   - Reason: Password policy changes require User Pool updates

2. **User Import** - Bulk CSV upload capability?
   - Recommendation: Yes, Phase 3
   - Use case: Migrating existing user base

3. **Self-Registration** - Allow users to sign up themselves?
   - Recommendation: Optional, disabled by default
   - Configure via Cognito User Pool settings

4. **MFA Enforcement** - Required, optional, or per-user?
   - Recommendation: Configurable per deployment
   - Admin can enable/disable per user

---

## Timeline Estimate

- **Phase 1 (Clerk Removal):** 1 day ✅ CURRENT
- **Phase 2 (Cognito Provider):** 3 days
- **Phase 3 (User Management APIs):** 5 days
- **Phase 4 (Admin UI):** 4 days
- **Phase 5 (External IDPs):** 3 days
- **Phase 6 (Login Page):** 2 days
- **Phase 7 (Documentation):** 2 days

**Total:** ~20 days (4 weeks)

---

## Related Documents

- `ADR-010-COGNITO-EXTERNAL-IDP-STRATEGY.md` - Strategic decision
- `ADR-007-CORA-AUTH-SHELL-STANDARD.md` - Auth shell pattern (updated)
- `guide_cora-project-creation.md` - Project setup with Cognito
- `guide_USER-MANAGEMENT.md` - User management guide (to be created)

---

**Document Version:** 1.0  
**Last Updated:** January 2, 2026
