# NextAuth.js Authentication Architecture for Career App

**Last Updated**: 2025-11-01  
**Author**: Career App Team

## Overview

The STS Career Application uses **NextAuth.js v5** as the authentication layer, integrating with **Okta** as the identity provider. This document explains the authentication architecture, configuration, and implementation patterns.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Authentication Flow                          │
└─────────────────────────────────────────────────────────────────┘

1. User clicks "Login with Okta" in frontend
          ↓
2. NextAuth redirects to Okta authorization endpoint
          ↓
3. User authenticates with Okta (SSO)
          ↓
4. Okta redirects back to /api/auth/callback/okta with auth code
          ↓
5. NextAuth exchanges auth code for JWT tokens
          ↓
6. NextAuth creates encrypted session cookie
          ↓
7. Session cookie stored in browser
          ↓
8. Subsequent requests include session cookie
          ↓
9. NextAuth decrypts and validates session
          ↓
10. API calls include JWT in Authorization header
```

## Key Components

### 1. NextAuth.js (Frontend)

**Purpose**: Manages authentication state and session handling in the Next.js frontend

**Location**: `apps/frontend/pages/api/auth/[...nextauth].ts`

**Responsibilities**:

- OAuth 2.0 / OIDC integration with Okta
- Session cookie creation and management
- CSRF protection
- Callback handling
- Token refresh

### 2. Okta (Identity Provider)

**Purpose**: Provides user authentication and identity management

**Responsibilities**:

- User authentication (username/password, MFA)
- JWT token issuance
- User profile management
- Single Sign-On (SSO) across applications

### 3. Session Management

**Strategy**: Encrypted JWT sessions (no database)

**Why JWT sessions?**:

- ✅ No database required for session storage
- ✅ Stateless - scales horizontally easily
- ✅ Works with serverless architecture
- ✅ Fast - no database lookups
- ❌ Can't invalidate individual sessions server-side
- ❌ Logout only clears client cookie

### 4. API Gateway Authorization

**Purpose**: Validates JWT tokens for backend API access

**Flow**:

```
Frontend → API Gateway → Lambda Authorizer → Validates JWT → Lambda Function
```

**Lambda Authorizer**:

- Extracts JWT from Authorization header
- Validates signature using Okta's public keys (JWKS)
- Verifies issuer, audience, expiration
- Returns IAM policy (allow/deny)
- Passes user context to Lambda functions

## Session Cookie Details

### Cookie Name

`next-auth.session-token` (production)  
`__Secure-next-auth.session-token` (HTTPS)

### Cookie Attributes

```
HttpOnly: true     # Can't be accessed via JavaScript
Secure: true       # HTTPS only
SameSite: lax      # CSRF protection
Max-Age: 2592000   # 30 days (default)
```

### Session Data Structure

Encrypted cookie contains:

```json
{
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "sub": "okta-user-id"
  },
  "expires": "2025-12-01T00:00:00.000Z",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "idToken": "eyJhbGc..."
}
```

## NextAuth Configuration

### Environment Variables

#### Frontend (.env.local, Vercel)

```bash
# NextAuth Core
NEXTAUTH_SECRET=<cryptographically-secure-random-string>
NEXTAUTH_URL=http://localhost:3000  # Or production URL

# Okta Provider
OKTA_CLIENT_ID=0oaXXXXXXXXXXXXXXXX
OKTA_CLIENT_SECRET=<okta-client-secret>
OKTA_ISSUER=https://simpletech.okta.com/oauth2/default
OKTA_JWKS_URI=https://simpletech.okta.com/oauth2/default/v1/keys
```

#### Backend (.env.dev, .env.tst)

```bash
# JWT Validation (for Lambda Authorizer)
OKTA_ISSUER=https://simpletech.okta.com/oauth2/default
OKTA_JWKS_URI=https://simpletech.okta.com/oauth2/default/v1/keys
OKTA_CLIENT_ID=0oaXXXXXXXXXXXXXXXX
```

### NEXTAUTH_SECRET Details

**Purpose**: Master encryption key for NextAuth.js

**Used For**:

- Session cookie encryption (AES-GCM)
- CSRF token generation (HMAC-SHA256)
- Callback state signing
- JWT encryption (if enabled)

**Security Requirements**:

- Minimum 32 bytes (256 bits) of entropy
- Cryptographically secure random generation
- Different for each environment
- Never committed to version control
- Rotated every 3-6 months

**Generation**:

```bash
openssl rand -base64 32
```

**Environment-Specific Secrets**:

- **Local Development**: QRQ5tVtv+/WNI58rZwdeV84Jj2QrFPcbSXQGNoVDai0=
- **Dev Environment**: 3VrsjBhPR5/xl9/P26NQ2X1MiNOZma98YvcgZYnhJpw=
- **Test Environment**: hV0ohc2jxIkZ4FCZBl5hriqmUmgMfMDVChaNR/ekF9g=
- **Staging**: (Generate separately)
- **Production**: (Generate separately)

## Implementation Patterns

### 1. NextAuth Configuration File

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions } from "next-auth";
import OktaProvider from "next-auth/providers/okta";

export const authOptions: NextAuthOptions = {
  providers: [
    OktaProvider({
      clientId: process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      issuer: process.env.OKTA_ISSUER,
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt", // Use JWT sessions (no database)
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    // Runs when JWT is created or updated
    async jwt({ token, account, profile }) {
      // Initial sign in
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },

    // Runs when session is accessed (client-side)
    async session({ session, token }) {
      // Pass JWT access token to session
      session.accessToken = token.accessToken as string;
      session.user.id = token.sub!;
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin", // Custom sign-in page
    error: "/auth/error", // Error page
    newUser: "/onboarding", // First-time user page
  },
};

export default NextAuth(authOptions);
```

### 2. Frontend Session Access

```typescript
// Using React hooks
import { useSession, signIn, signOut } from "next-auth/react";

function ProfileComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <button onClick={() => signIn("okta")}>Login</button>;
  }

  return (
    <div>
      <p>Signed in as {session.user.email}</p>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}
```

### 3. Protected API Routes

```typescript
// pages/api/user/profile.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Make authenticated API call
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_GATEWAY_URL}/user/profile`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    }
  );

  const data = await response.json();
  return res.json(data);
}
```

### 4. Protected Pages (Server-Side)

```typescript
// pages/dashboard.tsx
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  return {
    props: { session },
  };
};

export default function Dashboard({ session }) {
  return <div>Welcome, {session.user.email}!</div>;
}
```

### 5. Client-Side Protected Routes

```typescript
// components/ProtectedRoute.tsx
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function ProtectedRoute({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "authenticated") {
    return <>{children}</>;
  }

  return null;
}
```

## Backend JWT Validation

### Lambda Authorizer Pattern

```python
# lambda_function.py (API Gateway Authorizer)
import jwt
import requests
from functools import lru_cache

# Cache JWKS keys for 1 hour
@lru_cache(maxsize=1)
def get_jwks():
    response = requests.get(os.environ['OKTA_JWKS_URI'])
    return response.json()

def lambda_handler(event, context):
    token = extract_token(event)

    try:
        # Get public keys from Okta
        jwks = get_jwks()

        # Decode and verify JWT
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            issuer=os.environ['OKTA_ISSUER'],
            audience=os.environ['OKTA_CLIENT_ID'],
        )

        # Extract user info
        email = payload.get('email')
        user_id = payload.get('sub')

        # Generate IAM policy
        return {
            'principalId': user_id,
            'policyDocument': generate_allow_policy(event['methodArn']),
            'context': {
                'email': email,
                'userId': user_id,
            }
        }
    except jwt.ExpiredSignatureError:
        raise Exception('Token expired')
    except jwt.InvalidTokenError:
        raise Exception('Invalid token')
```

## Security Considerations

### 1. NEXTAUTH_SECRET Management

**Best Practices**:

- ✅ Generate using cryptographically secure methods
- ✅ Different for each environment
- ✅ Stored in environment variables (never in code)
- ✅ Rotated every 3-6 months
- ❌ Never committed to version control
- ❌ Never shared via insecure channels (email, Slack)

**Impact of Compromise**:

- Attacker can decrypt all session cookies
- Attacker can forge valid sessions
- Complete authentication bypass

**Rotation Impact**:

- All existing sessions invalidated
- All users must re-authenticate
- Plan for low-traffic period

### 2. Token Expiration

**Access Token**: 1 hour (Okta default)
**Session Cookie**: 30 days (NextAuth default)
**Refresh Token**: 90 days (Okta default)

**Token Refresh Strategy**:

- NextAuth automatically refreshes tokens before expiration
- Uses refresh token to get new access token
- Transparent to user (no re-authentication needed)

### 3. CSRF Protection

NextAuth provides built-in CSRF protection:

- CSRF token generated with each form submission
- Token signed with NEXTAUTH_SECRET
- Verified before processing requests
- Prevents cross-site request forgery attacks

### 4. Secure Cookie Flags

Production cookies use:

- `HttpOnly`: Prevents JavaScript access (XSS protection)
- `Secure`: HTTPS only
- `SameSite=lax`: CSRF protection (allows top-level navigation)

## Monitoring & Troubleshooting

### Common Issues

#### Issue: "Invalid NEXTAUTH_SECRET"

**Symptom**: Users can't log in, session errors  
**Cause**: NEXTAUTH_SECRET not set or incorrect  
**Solution**: Verify environment variable is set and correct

#### Issue: "All sessions invalidated"

**Symptom**: All users logged out simultaneously  
**Cause**: NEXTAUTH_SECRET was changed  
**Solution**: Expected behavior - users must re-authenticate

#### Issue: "Token expired"

**Symptom**: API calls fail with 401 after period of inactivity  
**Cause**: Access token expired, refresh failed  
**Solution**: Check refresh token validity, may need re-authentication

#### Issue: "CORS errors on API calls"

**Symptom**: API requests from frontend blocked  
**Cause**: API Gateway not configured for frontend origin  
**Solution**: Update API Gateway CORS settings

### Logging

**Frontend** (NextAuth debug mode):

```bash
# Enable in development
NEXTAUTH_DEBUG=true
```

**Backend** (CloudWatch):

```bash
# Lambda Authorizer logs
aws logs tail /aws/lambda/career-dev-api-gateway-authorizer --follow
```

### Metrics to Monitor

- Authentication success/failure rate
- Token validation errors
- Session duration
- Token refresh failures
- CSRF token mismatches

## Testing

### Local Testing

```bash
# Start dev server
cd apps/frontend
npm run dev

# Test login flow
open http://localhost:3000
# Click "Login with Okta"
# Authenticate
# Verify session created
```

### Verify Session Cookie

1. Open browser DevTools → Application → Cookies
2. Find `next-auth.session-token`
3. Copy value
4. Decode at jwt.io (after base64 decode + decryption)

### Test API Authentication

```bash
# Get session from browser
# Extract accessToken from session

export JWT_TOKEN="<access-token>"
export API_URL="<api-gateway-url>"

curl -H "Authorization: Bearer $JWT_TOKEN" \
  "${API_URL}/user/profile"
```

## Migration Considerations

### From Legacy Auth (if applicable)

1. **Parallel Operation**: Run both systems temporarily
2. **Session Migration**: Force re-authentication for all users
3. **API Updates**: Update API clients to use new JWT format
4. **Monitoring**: Watch for authentication errors

### Future Enhancements

- [ ] Implement refresh token rotation
- [ ] Add session database for server-side invalidation
- [ ] Implement rate limiting on auth endpoints
- [ ] Add multi-factor authentication (MFA) enforcement
- [ ] Implement device tracking and management

## Related Documentation

- [Okta App Creation Guide](../../sts-career-infra/docs/OKTA_APP_CREATION_GUIDE.md)
- [Okta Deployment Guide](../../sts-career-infra/docs/OKTA_DEPLOYMENT_GUIDE.md)
- [NextAuth.js Official Docs](https://next-auth.js.org/)
- [Okta Developer Docs](https://developer.okta.com/)

## Appendix: Environment Variable Checklist

### Local Development

- [x] NEXTAUTH_SECRET (generated)
- [x] NEXTAUTH_URL=http://localhost:3000
- [x] OKTA_CLIENT_ID
- [x] OKTA_CLIENT_SECRET
- [x] OKTA_ISSUER
- [x] OKTA_JWKS_URI

### Vercel Deployment

- [ ] Generate unique NEXTAUTH_SECRET per environment
- [ ] Set NEXTAUTH_URL per environment
- [ ] Configure OKTA credentials
- [ ] Test authentication flow
