# Module-Access Merge Plan: Auth Adapters & Okta Integration

**Date:** December 11, 2025  
**Author:** Claude (Cline Agent)  
**Purpose:** Plan for adding Okta adapter to module-access and automating auth setup

---

## Part 1: Current State Analysis

### Existing module-access Location

```
pm-app-stack/packages/module-access/
└── (to be analyzed in next session)

cora-dev-toolkit/templates/_cora-core-modules/module-access/
└── (template structure)
```

### Known Components

- **Frontend:** Auth hooks, session management
- **Backend:** Lambda authorizer, user context
- **Database:** profiles, organizations, organization_memberships

### Current Auth Provider Support

| Provider | Adapter Exists | Status                   |
| -------- | -------------- | ------------------------ |
| Clerk    | ✅ Yes         | Implemented              |
| Okta     | ❌ No          | **NEEDS IMPLEMENTATION** |

---

## Part 2: NextAuth vs Alternatives - Justification

### Why NextAuth.js for Okta?

| Approach            | Pros                                                                        | Cons                                            |
| ------------------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| **NextAuth.js**     | Standard for Next.js, built-in Okta provider, handles sessions/CSRF/cookies | Extra dependency, session management layer      |
| **Direct Okta SDK** | Okta-native, full control                                                   | More code to write, manual session handling     |
| **Auth.js v5**      | Newer, better edge support                                                  | Breaking changes from v4, less stable           |
| **Custom JWT**      | Full control, minimal deps                                                  | Security risks if done wrong, reinventing wheel |

### Recommendation

**For Okta + Next.js → Use NextAuth.js** because:

1. **Built-in Okta Provider** - `next-auth/providers/okta` works out of the box
2. **Session Management** - Handles JWT/session cookies securely
3. **CSRF Protection** - Automatic CSRF token validation
4. **API Route Protection** - Easy `getServerSession()` for API routes
5. **Community Proven** - Millions of installs, battle-tested

### When to Consider Alternatives

- **Clerk users**: Clerk has its own session management, skip NextAuth
- **API-only backends**: If no Next.js frontend, use Okta SDK directly
- **Edge Runtime**: Consider Auth.js v5 for edge functions

---

## Part 3: Okta Adapter Requirements

### What the Okta Adapter Needs

#### 2.1 NextAuth Provider Configuration

```typescript
// Example: OktaProvider for NextAuth
import OktaProvider from "next-auth/providers/okta";

export const oktaConfig = {
  providers: [
    OktaProvider({
      clientId: process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      issuer: process.env.OKTA_ISSUER!,
    }),
  ],
  // ... session and callbacks config
};
```

#### 2.2 JWT Verification for Lambda Authorizer

```python
# Lambda authorizer needs to verify Okta JWTs
# Requires: OKTA_ISSUER, OKTA_JWKS_URI
```

#### 2.3 User Sync to Supabase

- Map Okta user ID to Supabase profiles
- Handle organization context from Okta claims

---

## Part 4: Files to Create/Modify

### New Files

| File                                | Purpose                           |
| ----------------------------------- | --------------------------------- |
| `frontend/providers/okta.ts`        | NextAuth Okta provider config     |
| `frontend/adapters/okta-adapter.ts` | Okta-specific session handling    |
| `backend/auth/okta-verifier.py`     | Lambda JWT verification for Okta  |
| `backend/auth/okta-user-sync.py`    | Sync Okta users to profiles table |

### Files to Modify

| File                                            | Change                      |
| ----------------------------------------------- | --------------------------- |
| `frontend/providers/index.ts`                   | Export Okta alongside Clerk |
| `backend/lambdas/authorizer/lambda_function.py` | Support Okta JWT format     |
| `.env.example`                                  | Add Okta env vars           |

---

## Part 5: Automated Key Generation

### NextAuth Secret Auto-Generation

The `NEXTAUTH_SECRET` should be automatically generated during project creation. Update the setup flow:

#### 4.1 Update `create-cora-project.sh`

```bash
# Generate NextAuth secret automatically
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "Generated NEXTAUTH_SECRET"
```

#### 4.2 Update `setup-cora-database.py`

```python
def generate_nextauth_secret():
    """Generate a secure NextAuth secret."""
    import secrets
    return secrets.token_urlsafe(32)
```

#### 4.3 Update `setup.config.example.yaml`

```yaml
nextauth:
  # NEXTAUTH_SECRET - Auto-generated if left empty
  # Or generate manually: openssl rand -base64 32
  secret: "" # Will be auto-generated if empty
```

---

## Part 6: Environment Variables

### Required for Okta + NextAuth

```bash
# .env.local (for Next.js app)

# Okta Configuration
OKTA_DOMAIN=simpletech.okta.com
OKTA_CLIENT_ID=0oax0eaf3bgW5NP73697
OKTA_CLIENT_SECRET=your-secret-here
OKTA_ISSUER=https://simpletech.okta.com/oauth2/default
OKTA_JWKS_URI=https://simpletech.okta.com/oauth2/default/v1/keys

# NextAuth Configuration
NEXTAUTH_SECRET=auto-generated-or-manual
NEXTAUTH_URL=http://localhost:3000

# Supabase (for profile sync)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Lambda Environment Variables

```bash
# For API Gateway Authorizer Lambda
OKTA_ISSUER=https://simpletech.okta.com/oauth2/default
OKTA_JWKS_URI=https://simpletech.okta.com/oauth2/default/v1/keys
OKTA_CLIENT_ID=0oax0eaf3bgW5NP73697
```

---

## Part 7: Execution Plan

### Phase 1: Analysis ✅ COMPLETE

- [x] Read existing module-access in pm-app-stack
- [x] Identify Clerk adapter implementation patterns
- [x] Document auth flow from frontend to Lambda

### Phase 2: Create Auth Adapters ✅ COMPLETE

- [x] Create `frontend/providers/okta.ts` - NextAuth Okta configuration
- [x] Create `frontend/providers/clerk.ts` - Clerk configuration
- [x] Create `frontend/adapters/okta-adapter.ts` - Client & server adapters
- [x] Create `frontend/adapters/clerk-adapter.ts` - Client & server adapters
- [x] Create `frontend/adapters/types.ts` - AuthAdapter interface
- [x] Create `frontend/adapters/index.ts` - Export all adapters
- [x] Create `frontend/providers/index.ts` - Export all providers
- [x] Update `frontend/index.ts` - Export adapters and providers

### Phase 3: Lambda Authorizer ✅ ALREADY COMPLETE

- [x] Add Okta JWT verification to authorizer (already existed in pm-app-infra)
- [x] Support both Clerk and Okta tokens via PROVIDER env var
- [x] JWKS caching and validation implemented

### Phase 4: IDP Configuration Admin UI ✅ COMPLETE

- [x] Create `db/schema/004-idp-config.sql` - Platform IDP config tables
- [x] Create `backend/lambdas/idp-config/lambda_function.py` - CRUD API
- [x] Create `frontend/components/admin/IdpConfigCard.tsx` - Admin card
- [x] RLS policies for platform admin access only

### Phase 5: Environment Configuration ✅ COMPLETE

- [x] Update `create-cora-project.sh` to generate NEXTAUTH_SECRET
- [x] Create `.env.example` for documentation
- [x] Verify `setup.config.example.yaml` supports both Clerk and Okta
- [x] Create `local-secrets.tfvars.example` for Terraform

### Phase 6: Test with ai-sec Project (PENDING)

- [ ] Deploy module-access to ai-sec
- [ ] Test Okta login flow
- [ ] Verify JWT validation in Lambda
- [ ] Confirm profile sync to Supabase

---

## Part 8: Auth Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User clicks "Sign In"                                           │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐      ┌─────────────┐                           │
│  │  NextAuth   │ ───► │    Okta     │  OAuth redirect           │
│  │  (session)  │ ◄─── │    IDP      │  Returns tokens           │
│  └─────────────┘      └─────────────┘                           │
│         │                                                        │
│         ▼                                                        │
│  Session created with JWT (contains okta_uid)                   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ API Request with Bearer token
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       API GATEWAY                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Lambda Authorizer                        │ │
│  │  1. Extract Bearer token                                    │ │
│  │  2. Verify JWT signature (OKTA_JWKS_URI)                   │ │
│  │  3. Check token expiry                                     │ │
│  │  4. Extract okta_uid from claims                           │ │
│  │  5. Return IAM policy with context                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ Request with authorizer context
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND LAMBDA                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Extract okta_uid from event context                          │
│  2. Look up Supabase user by okta_uid                           │
│  3. Get organization context from profiles                       │
│  4. Process request with org_id scope                           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Part 9: Questions to Resolve

1. **User provisioning:** Should users be auto-created in Supabase on first Okta login, or require pre-provisioning?

2. **Organization mapping:** How does Okta org membership map to Supabase organization_memberships?

3. **Role mapping:** Should Okta groups/claims map to Supabase roles?

4. **Token refresh:** How to handle Okta token refresh in long-running sessions?

---

## Appendix: Okta Adapter vs Clerk Adapter Comparison

| Feature              | Clerk Adapter  | Okta Adapter (NEW) |
| -------------------- | -------------- | ------------------ |
| NextAuth required    | ❌ No          | ✅ Yes             |
| JWT verification lib | Clerk SDK      | jose / python-jose |
| User sync            | Clerk webhooks | Manual / Lambda    |
| Session management   | Clerk built-in | NextAuth           |
| MFA support          | Clerk built-in | Okta built-in      |

---

## Implementation Summary

### Files Created/Modified

**Frontend Auth Adapters:**

- `frontend/providers/okta.ts` - NextAuth.js Okta provider configuration
- `frontend/providers/clerk.ts` - Clerk provider configuration
- `frontend/providers/index.ts` - Provider exports
- `frontend/adapters/okta-adapter.ts` - Okta auth adapter (client + server)
- `frontend/adapters/clerk-adapter.ts` - Clerk auth adapter (client + server)
- `frontend/adapters/types.ts` - AuthAdapter interface
- `frontend/adapters/index.ts` - Adapter exports
- `frontend/index.ts` - Updated with adapter/provider exports

**Database Schema:**

- `db/schema/004-idp-config.sql` - IDP configuration tables + RLS policies

**Backend Lambda:**

- `backend/lambdas/idp-config/lambda_function.py` - IDP config CRUD API
- `backend/lambdas/idp-config/requirements.txt`

**Admin UI:**

- `frontend/components/admin/IdpConfigCard.tsx` - Platform admin IDP config card

**Configuration Templates:**

- `.env.example` - Environment variable documentation
- Updated `setup.config.example.yaml` - Already supported both providers
- `local-secrets.tfvars.example` - Terraform secrets template

**Scripts:**

- `create-cora-project.sh` - Updated to generate NEXTAUTH_SECRET

---

**Document Status:** Implementation Complete  
**Last Updated:** December 11, 2025  
**Next Session:** Deploy to ai-sec project and test Okta login flow
