# ADR-004: NextAuth API Client Pattern for CORA Modules

## Status

**Accepted** - November 5, 2025

## Context

During the implementation of the certification module frontend, we discovered a critical authentication vulnerability caused by inconsistent authentication patterns across CORA modules:

### The Problem

1. **Security Vulnerability**: The certification module was using `localStorage` to store authentication tokens, which is vulnerable to XSS attacks
2. **Token Management Issues**: Direct token storage bypassed NextAuth's automatic token refresh mechanisms, leading to 401 Unauthorized errors
3. **Pattern Inconsistency**: Different modules used different authentication approaches:
   - Org module: ✅ Correct NextAuth pattern with factory functions
   - Certification module: ❌ Direct API exports with localStorage tokens
4. **Documentation Gap**: Existing documentation showed both Okta direct integration and NextAuth patterns without a clear standard

### Root Cause Analysis

The project uses NextAuth for authentication at the application level, but module developers were creating direct API clients with exported functions that bypassed the session management system. This created several problems:

- **XSS Vulnerability**: Tokens in localStorage can be stolen by malicious scripts
- **No Token Refresh**: Direct token access means no automatic refresh when tokens expire
- **Multi-tenant Issues**: Session context (including organization) was not properly propagated
- **Authentication Bypass**: Module code could make API calls without proper session validation
- **Maintenance Burden**: Each module implemented its own token management logic differently

### Business Impact

- Users experiencing 401 errors mid-session when tokens expired
- Security audit concerns about token storage patterns
- Development velocity slowed by inconsistent patterns
- Risk of production security incidents

## Decision

We will standardize on a **factory-only API client pattern** that integrates with NextAuth sessions. All CORA modules must follow this pattern:

### The Pattern

#### 1. API Client: Factory Function ONLY

```typescript
// ✅ CORRECT: Factory function that accepts an authenticated client
import type { AuthenticatedClient } from "@sts-career/api-client";

export interface ModuleApiClient {
  getData: () => Promise<any[]>;
  createItem: (data: any) => Promise<any>;
}

export function createModuleClient(
  client: AuthenticatedClient
): ModuleApiClient {
  return {
    getData: () => client.get("/module/data"),
    createItem: (data) => client.post("/module/data", data),
  };
}
```

```typescript
// ❌ WRONG: Direct API exports
export const moduleApi = {
  getData: async () => {
    const token = localStorage.getItem("access_token"); // NEVER DO THIS
    return fetch("/api/module/data", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
```

#### 2. Hooks: Accept Client Parameter

```typescript
// ✅ CORRECT: Hook accepts client as parameter
export function useModuleData(client: AuthenticatedClient | null) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }

    const api = createModuleClient(client);
    api
      .getData()
      .then(setData)
      .finally(() => setLoading(false));
  }, [client]);

  return { data, loading };
}
```

#### 3. Pages: Use NextAuth Session

```typescript
// ✅ CORRECT: Page uses NextAuth session
"use client";

import { useSession } from "next-auth/react";
import { createAuthenticatedClient } from "@sts-career/api-client";
import { useModuleData } from "@/hooks/useModuleData";

export default function ModulePage() {
  const { data: session } = useSession();

  const client = session?.accessToken
    ? createAuthenticatedClient(session.accessToken)
    : null;

  const { data, loading } = useModuleData(client);

  if (!session) return <div>Please log in</div>;
  if (loading) return <div>Loading...</div>;

  return <div>{/* Use data */}</div>;
}
```

### Key Principles

1. **No Direct API Exports**: Modules MUST NOT export pre-configured API objects
2. **Factory Functions Only**: API clients MUST be created via factory functions that accept an `AuthenticatedClient`
3. **Client Parameter Required**: All hooks that make API calls MUST accept a `client` parameter
4. **Session-Based Auth**: Pages MUST use `useSession()` to get authentication tokens
5. **Null Safety**: All code MUST handle the case where `client` is `null` (no session)

## Consequences

### Benefits

1. **Security Improvements**

   - No tokens in localStorage eliminates XSS vulnerability
   - Tokens only exist in memory during session lifetime
   - NextAuth handles secure token storage in httpOnly cookies

2. **Automatic Token Management**

   - NextAuth automatically refreshes tokens before expiration
   - No more 401 errors from expired tokens
   - Centralized token refresh logic

3. **Multi-tenant Support**

   - Session context includes organization information
   - Proper org context propagation to all API calls
   - Consistent tenant isolation

4. **Developer Experience**

   - Clear, documented pattern to follow
   - Type safety with TypeScript
   - Easier code review (one correct pattern)

5. **Maintainability**
   - Single source of truth for authentication
   - Easier to audit security practices
   - Centralized authentication logic updates

### Trade-offs

1. **Slightly More Verbose**: Factory pattern requires more boilerplate than direct exports
2. **Learning Curve**: Developers must understand factory pattern and NextAuth session flow
3. **Testing Complexity**: Must mock session in tests

## Alternatives Considered

### Alternative 1: Direct Okta Integration

**Why Rejected**: Couples modules tightly to Okta, no centralized token refresh, inconsistent with Next.js patterns

### Alternative 2: Direct API Exports with Auth Wrapper

**Why Rejected**: Hidden dependencies, difficult testing, no explicit dependency injection

### Alternative 3: React Context for Auth Client

**Why Rejected**: Adds extra layer when NextAuth already provides session, more difficult to test

## References

- [MODULE-NEXTAUTH-PATTERN.md](../development/MODULE-NEXTAUTH-PATTERN.md)
- [MODULE-DEVELOPMENT-CHECKLIST.md](../development/MODULE-DEVELOPMENT-CHECKLIST.md)
- [NextAuth.js Documentation](https://next-auth.js.org/)

---

**Last Updated**: November 5, 2025
