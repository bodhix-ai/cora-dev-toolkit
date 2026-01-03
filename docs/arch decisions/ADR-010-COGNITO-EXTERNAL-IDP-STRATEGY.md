# ADR-010: AWS Cognito + External IDP Authentication Strategy

**Status:** ACCEPTED  
**Date:** January 2, 2026  
**Authors:** AI Development Team  
**Supersedes:** Clerk-based authentication approach  
**Related Plan:** plan_cognito-external-idp-migration.md

---

## Context

CORA projects currently support two authentication providers (Clerk and Okta) with conditional code paths throughout the application. This creates complexity, maintenance burden, and vendor lock-in. Additionally, NextAuth natively supports 40+ identity providers, but we're only utilizing a fraction of this capability.

### Current Challenges

1. **Vendor Lock-in:** Clerk requires proprietary SDK and specific token formats
2. **Code Complexity:** Maintaining separate code paths for Clerk vs Okta
3. **Limited Flexibility:** Customers cannot use their existing IDPs (Google Workspace, Microsoft 365)
4. **Non-Cloud-Native:** Clerk adds external dependency for AWS-deployed applications
5. **User Management:** Clerk's user management is external to our cloud infrastructure

### Business Requirements

1. **Cloud-Native Solution:** Deploy entirely on AWS without external dependencies
2. **Enterprise Flexibility:** Support customer-provided IDPs for SSO
3. **User Management Control:** Platform admins must manage users directly
4. **Custom UX:** Full control over login experience and branding
5. **No Vendor Lock-in:** Avoid proprietary authentication services

---

## Decision

We will adopt **AWS Cognito as the default authentication provider** with support for **optional external Identity Providers** (Okta, Google, Microsoft) via NextAuth.

### Architecture Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    CORA Authentication Architecture              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DEFAULT (Always Included)         OPTIONAL (Per-Deployment)     │
│  ─────────────────────────         ────────────────────────     │
│                                                                  │
│  ┌──────────────────────┐         ┌──────────────────────────┐  │
│  │   AWS Cognito        │         │   External IDPs          │  │
│  │   User Pool          │         │                          │  │
│  │                      │         │   • Okta (Enterprise)    │  │
│  │   • User directory   │         │   • Google (Workspace)   │  │
│  │   • Password auth    │         │   • Microsoft (365)      │  │
│  │   • MFA support      │         │                          │  │
│  │   • Admin APIs       │         │   Customer provides      │  │
│  │   • Email verify     │         │   credentials for SSO    │  │
│  └────────┬─────────────┘         └───────────┬──────────────┘  │
│           │                                   │                  │
│           └───────────────┬───────────────────┘                 │
│                           ▼                                      │
│                   ┌─────────────┐                                │
│                   │  NextAuth   │                                │
│                   │  (Universal │                                │
│                   │   OIDC)     │                                │
│                   └──────┬──────┘                                │
│                          ▼                                       │
│                   ┌─────────────┐                                │
│                   │ CORA App    │                                │
│                   │ (Standard   │                                │
│                   │  JWT tokens)│                                │
│                   └─────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Cognito is the Default IDP**
   - Every CORA project includes AWS Cognito User Pool
   - Platform admins manage users via Cognito APIs
   - No external service dependencies for core authentication

2. **External IDPs are Optional**
   - Customers can enable Okta, Google, or Microsoft SSO
   - Configured via environment variables only
   - Multiple external IDPs can be enabled simultaneously

3. **NextAuth as Universal Abstraction**
   - All providers (Cognito, Okta, Google, Microsoft) output standard OIDC tokens
   - Single Lambda JWT authorizer works for all providers
   - Single auth adapter pattern for all providers
   - No provider-specific conditional logic

4. **Custom Login UX**
   - Full control over login page design and branding
   - Conditional SSO button rendering based on configuration
   - Not dependent on third-party hosted UIs

5. **Per-Project Isolation**
   - Each CORA project has its own Cognito User Pool
   - No shared authentication infrastructure
   - Projects remain standalone and independent

---

## Consequences

### Positive

1. **✅ Cloud-Native:** Fully AWS-based authentication infrastructure
2. **✅ User Management:** Direct control via Cognito Admin APIs
3. **✅ Cost Reduction:** No Clerk subscription fees
4. **✅ Enterprise Ready:** Support for customer SSO via Okta/Google/Microsoft
5. **✅ Simplified Codebase:** Remove Clerk-specific code paths
6. **✅ Standard Tokens:** All providers output OIDC-compliant JWTs
7. **✅ Custom UX:** Full control over login page design
8. **✅ Flexibility:** Easy to add more providers (NextAuth supports 40+)

### Negative

1. **❌ Migration Work:** Existing Clerk-based projects need migration
2. **❌ Learning Curve:** Team needs Cognito expertise
3. **❌ Infrastructure Complexity:** Managing Cognito User Pools per project
4. **❌ Loss of Clerk Features:** Some Clerk-specific features unavailable

### Neutral

1. **⚖️ MFA:** Cognito supports MFA but requires setup
2. **⚖️ Password Policies:** Managed at Terraform level (less dynamic)
3. **⚖️ User Import:** Requires custom tooling (bulk import via Cognito APIs)

---

## Comparison of Options

### Option 1: Continue with Clerk (Rejected)

**Pros:**
- No migration needed
- Managed service with good UX
- Easy user management dashboard

**Cons:**
- ❌ Vendor lock-in
- ❌ External dependency
- ❌ Additional cost
- ❌ Proprietary SDK and token format
- ❌ Complexity in codebase (conditional logic)

**Verdict:** Rejected due to vendor lock-in and lack of cloud-native architecture.

---

### Option 2: Okta as Default (Rejected)

**Pros:**
- Enterprise-grade
- Already implemented
- Standard OIDC

**Cons:**
- ❌ Requires Okta account per project
- ❌ Not cloud-native (external SaaS)
- ❌ Cost per project
- ❌ Not suitable for small deployments

**Verdict:** Rejected. Better as optional SSO, not default.

---

### Option 3: AWS Cognito + External IDPs (Accepted) ✅

**Pros:**
- ✅ Cloud-native (AWS-based)
- ✅ Direct user management control
- ✅ Cost-effective (free tier + pay-as-you-grow)
- ✅ Support for external SSO (Okta, Google, Microsoft)
- ✅ Standard OIDC tokens
- ✅ Custom login UX
- ✅ Simplified codebase (no Clerk conditionals)

**Cons:**
- Requires infrastructure setup per project
- Need to build user management UI
- Migration work for existing projects

**Verdict:** Accepted as best balance of cloud-native, flexibility, and control.

---

## Implementation Strategy

### Phase 1: Remove Clerk (Immediate)
- Delete Clerk provider and adapter code
- Simplify authentication logic to Okta-only
- Fix current regression in test projects

### Phase 2: Add Cognito (Near-term)
- Create Cognito NextAuth provider
- Create Cognito auth adapter
- Add Terraform module for Cognito User Pool
- Deploy to new test project

### Phase 3: User Management (Near-term)
- Implement Cognito Admin APIs for user CRUD
- Build admin UI for user management
- Add bulk import capability

### Phase 4: External IDPs (Future)
- Add Google and Microsoft provider support
- Update login page with conditional SSO buttons
- Documentation for configuring external IDPs

### Phase 5: Migration (Future)
- Create migration guide for Clerk → Cognito
- Provide data export/import scripts
- Support existing projects during transition

---

## Technical Details

### Authentication Flow

```
┌────────┐                  ┌─────────────┐
│ User   │                  │ Login Page  │
│        │──(1) Visit)──────▶ (Custom UI) │
└────────┘                  └──────┬──────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              (2a) Username  (2b) Okta SSO  (2c) Google
                    ▼              ▼              ▼
            ┌─────────────┐ ┌────────────┐ ┌────────────┐
            │  Cognito    │ │    Okta    │ │   Google   │
            │  User Pool  │ │    OIDC    │ │   OAuth    │
            └──────┬──────┘ └──────┬─────┘ └──────┬─────┘
                   │                │              │
                   └────────────────┼──────────────┘
                                    │
                            (3) OIDC Token
                                    ▼
                          ┌──────────────────┐
                          │    NextAuth      │
                          │  (Session Mgmt)  │
                          └────────┬─────────┘
                                   │
                           (4) JWT Session
                                   ▼
                          ┌──────────────────┐
                          │   CORA App       │
                          │   (Protected)    │
                          └────────┬─────────┘
                                   │
                           (5) API Request
                                   ▼
                          ┌──────────────────┐
                          │  API Gateway     │
                          │  Lambda Auth     │
                          │  (JWT Validate)  │
                          └──────────────────┘
```

### Environment Configuration

```env
# Default Authentication (Cognito)
COGNITO_USER_POOL_ID=us-east-1_xxxxxx
COGNITO_CLIENT_ID=xxxxxxxxx
COGNITO_CLIENT_SECRET=xxxxxxxxx  # Stored in AWS Secrets Manager
COGNITO_REGION=us-east-1

# External SSO (Optional)
OKTA_CLIENT_ID=              # Enable Okta SSO
OKTA_CLIENT_SECRET=
OKTA_ISSUER=

GOOGLE_CLIENT_ID=            # Enable Google SSO
GOOGLE_CLIENT_SECRET=

AZURE_AD_CLIENT_ID=          # Enable Microsoft SSO
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
```

### User Management APIs

Platform admins will manage Cognito users via:

```
POST   /admin/users                    - Create user
GET    /admin/users                    - List users
GET    /admin/users/:id                - Get user details
PUT    /admin/users/:id                - Update user
DELETE /admin/users/:id                - Delete user
POST   /admin/users/:id/reset-password - Reset password
POST   /admin/users/:id/mfa            - Configure MFA
POST   /admin/users/bulk-import        - Bulk import (CSV)
```

Backend calls Cognito SDK:
- `AdminCreateUser`
- `ListUsers`
- `AdminGetUser`
- `AdminUpdateUserAttributes`
- `AdminDeleteUser`
- `AdminResetUserPassword`
- `AdminSetUserMFAPreference`

---

## Security Considerations

### Secrets Management
- Client secrets stored in AWS Secrets Manager
- Never exposed in frontend code
- Regular secret rotation via Terraform
- Least-privilege IAM roles

### Token Security
- JWTs validated by Lambda authorizer
- Short-lived access tokens (1 hour)
- Refresh token rotation
- HTTP-only cookies for sessions

### MFA
- TOTP support (Google Authenticator, Authy)
- Optional SMS MFA
- Admin can enforce per-user
- Future: WebAuthn/FIDO2

### Password Policy
- Cognito User Pool password policy:
  - Minimum 8 characters
  - Require: uppercase, lowercase, numbers, special chars
  - Password history (prevent reuse)
  - Account lockout after failed attempts

---

## Migration Path

### For New Projects
- Use `create-cora-project.sh` with Cognito template
- Cognito User Pool created automatically via Terraform
- Admin configures external IDPs as needed

### For Existing Projects
1. Deploy Cognito User Pool to existing infrastructure
2. Export users from Clerk (CSV)
3. Import users to Cognito (bulk import API)
4. Test authentication with both providers
5. Switch environment variable to Cognito
6. Remove Clerk configuration
7. Monitor and verify

---

## Success Criteria

- ✅ Clerk completely removed from codebase
- ✅ All new projects use Cognito by default
- ✅ External IDPs configurable via environment variables
- ✅ Platform admins can manage users via UI
- ✅ Custom login page with full branding control
- ✅ Zero authentication-related regressions
- ✅ Documentation complete and tested
- ✅ Migration guide for existing projects

---

## Alternatives Considered

### Cognito Federated Identities
Using Cognito as an aggregator for Google/Microsoft via identity federation.

**Why Rejected:**
- Forces use of Cognito Hosted UI (less UX control)
- More complex configuration
- Preference for direct NextAuth provider integration

### Auth0
Similar managed service to Clerk.

**Why Rejected:**
- Same vendor lock-in issues as Clerk
- External dependency
- Additional cost
- Not cloud-native for AWS

### Roll Our Own
Custom authentication system without Cognito.

**Why Rejected:**
- Security risk (authentication is complex)
- Maintenance burden
- Reinventing the wheel
- Cognito provides battle-tested solution

---

## References

### NextAuth Documentation
- [Cognito Provider](https://next-auth.js.org/providers/cognito)
- [Google Provider](https://next-auth.js.org/providers/google)
- [Azure AD Provider](https://next-auth.js.org/providers/azure-ad)
- [Okta Provider](https://next-auth.js.org/providers/okta)

### AWS Cognito
- [User Pool Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [Admin API Reference](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/Welcome.html)
- [Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/best-practices.html)

### Industry Standards
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [OIDC Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## Timeline

- **Phase 1 (Clerk Removal):** 1 day
- **Phase 2 (Cognito Implementation):** 1 week
- **Phase 3 (User Management):** 1 week
- **Phase 4 (External IDPs):** 3 days
- **Phase 5 (Migration Tools):** 3 days

**Total:** ~4 weeks for complete implementation

---

## Related Documents

- `plan_cognito-external-idp-migration.md` - Detailed implementation plan
- `ADR-007-CORA-AUTH-SHELL-STANDARD.md` - Auth shell pattern (to be updated)
- `guide_cora-project-creation.md` - Project creation (to be updated)

---

**Document Version:** 1.0  
**Status:** ACCEPTED  
**Last Updated:** January 2, 2026
