# Plan: Fix Test-WS-05 Build Errors Holistically

**Created:** January 2, 2026 
**Completed:** January 2, 2026  
**Status:** ✅ **COMPLETED**
**Estimated Time:** 55 minutes

---

## Executive Summary

The test-ws-05 project has build failures due to **two distinct categories of errors** that were initially conflated:

1. **Auth Pattern Errors (8 components)**: Components incorrectly calling HTTP methods on `authAdapter` instead of using `createCoraAuthenticatedClient(token)`
2. **Type Errors (6 errors)**: Unrelated TypeScript type mismatches in various components

**Previous Attempt Failed Because**: Shared type definitions (`OktaSession`) were modified to fix errors, creating cascading failures across modules.

**This Plan**: Fixes all errors without modifying shared types, following established patterns already in use elsewhere in the codebase.

---

## Root Cause Analysis

### Category 1: Auth Adapter Pattern Errors

**The Problem**: 8 components were written calling `authAdapter.get()`, `authAdapter.post()`, etc., but `CoraAuthAdapter` interface only has:
- `getToken(): Promise<string | null>`
- `signOut(): Promise<void>`
- `isAuthenticated(): boolean`

**The Correct Pattern** (already used correctly in `IdpConfigCard.tsx`):
```typescript
const token = await authAdapter.getToken();
if (!token) {
  setError("Authentication required");
  return;
}
const apiClient = createCoraAuthenticatedClient(token);
const response = await apiClient.get<ExpectedResponseType>("/endpoint");
```

**Components Requiring This Fix**:
1. `packages/module-access/frontend/components/admin/IdpTab.tsx`
2. `packages/module-access/frontend/components/admin/OrgMembersTab.tsx`
3. `packages/module-access/frontend/components/admin/OrgsTab.tsx`
4. `packages/module-access/frontend/components/admin/OrgDetails.tsx`
5. `packages/module-access/frontend/components/admin/OrgInvitesTab.tsx`
6. `packages/module-access/frontend/components/admin/OrgDomainsTab.tsx`
7. `packages/module-access/frontend/components/admin/OrgAIConfigTab.tsx`
8. `packages/module-access/frontend/components/admin/UsersTab.tsx`

### Category 2: Type Errors (Pre-existing)

| File | Line | Error | Root Cause | Correct Fix |
|------|------|-------|------------|-------------|
| `providers/okta.ts` | 134 | `string \| undefined` not assignable to `string` | `oktaToken.accessToken` can be undefined | Add fallback: `oktaToken.accessToken ?? ""` |
| `providers/okta.ts` | 135 | `string \| undefined` not assignable to `string` | `oktaToken.idToken` can be undefined | Add fallback: `oktaToken.idToken ?? ""` |
| `components/admin/OrgMgmt.tsx` | 82 | Interface extends issue with `allowed_domain` | `null` vs `undefined` type conflict | Remove `extends`, define all fields directly |
| `components/admin/OrgMgmt.tsx` | 123 | Type `{}` not assignable | Missing type parameter on `apiClient.get()` | Add type: `apiClient.get<Organization[]>()` |
| `components/org/OrgMembersList.tsx` | 228 | Duplicate `aria-label` | Two `aria-label` attributes on same element | Remove duplicate `aria-label="Action button"` |
| `components/profile/ProfileCard.tsx` | 99 | `platform_owner` not in role type | New role not handled | Add conditional: `role === "platform_owner" ? "Platform Owner" : getRoleDisplayName(role)` |

---

## Implementation Plan

### Phase 1: Document Plan ✅ (This File)

Create this comprehensive plan for implementation in a fresh task.

### Phase 2: Fix Auth Adapter Pattern (20 minutes)

For each of the 8 components, apply this transformation:

**Before (Wrong)**:
```typescript
const response = await authAdapter.get("/endpoint");
```

**After (Correct)**:
```typescript
// 1. Import createCoraAuthenticatedClient if not already imported
import { CoraAuthAdapter, createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";

// 2. Get token and create client
const token = await authAdapter.getToken();
if (!token) {
  setError("Authentication required");
  return;
}
const apiClient = createCoraAuthenticatedClient(token);

// 3. Call API with proper type
const response = await apiClient.get<{ success: boolean; data: ExpectedType }>("/endpoint");
```

**Checklist**:
- [ ] IdpTab.tsx
- [ ] OrgMembersTab.tsx
- [ ] OrgsTab.tsx
- [ ] OrgDetails.tsx
- [ ] OrgInvitesTab.tsx
- [ ] OrgDomainsTab.tsx
- [ ] OrgAIConfigTab.tsx
- [ ] UsersTab.tsx

### Phase 3: Fix Type Errors (15 minutes)

#### 3.1 Fix `providers/okta.ts` Session Callback

**Location**: Line 128-137

**Before**:
```typescript
async session({ session, token }): Promise<OktaSession> {
  const oktaToken = token as OktaJWT;

  return {
    ...session,
    accessToken: oktaToken.accessToken,  // Error: might be undefined
    idToken: oktaToken.idToken,          // Error: might be undefined
    oktaUserId: oktaToken.oktaUserId,
    error: oktaToken.error,
  };
},
```

**After**:
```typescript
async session({ session, token }): Promise<OktaSession> {
  const oktaToken = token as OktaJWT;

  return {
    ...session,
    accessToken: oktaToken.accessToken ?? "",  // Provide empty string fallback
    idToken: oktaToken.idToken ?? "",          // Provide empty string fallback
    oktaUserId: oktaToken.oktaUserId,
    error: oktaToken.error,
  };
},
```

**Important**: DO NOT change the `OktaSession` interface. Keep it as:
```typescript
export interface OktaSession extends Session {
  accessToken: string;  // Required
  idToken: string;      // Required
  expiresAt: number;
  oktaUserId?: string;
  error?: string;
}
```

#### 3.2 Fix `components/admin/OrgMgmt.tsx`

**Fix 1 - Line 82**: Remove `extends` from `UpdateOrganizationPayload`

**Before**:
```typescript
interface UpdateOrganizationPayload extends CreateOrganizationPayload {
  allowed_domain?: string | null;
  domain_default_role?: "org_user" | "org_admin" | "org_owner" | null;
}
```

**After**:
```typescript
interface UpdateOrganizationPayload {
  name: string;
  slug: string;
  description?: string;
  allowed_domain?: string;
  domain_default_role?: "org_user" | "org_admin" | "org_owner";
}
```

**Fix 2 - Line 117**: Add type parameter to `apiClient.get()`

**Before**:
```typescript
const response = await apiClient.get("/orgs");
```

**After**:
```typescript
const response = await apiClient.get<Organization[]>("/orgs");
```

**Fix 3 - Lines 366-367**: Change `null` to `undefined`

**Before**:
```typescript
allowed_domain: formData.allowed_domain || null,
domain_default_role: formData.allowed_domain ? formData.domain_default_role : null,
```

**After**:
```typescript
allowed_domain: formData.allowed_domain || undefined,
domain_default_role: formData.allowed_domain ? formData.domain_default_role : undefined,
```

#### 3.3 Fix `components/org/OrgMembersList.tsx` (Line 228)

**Before**:
```typescript
<IconButton aria-label="Action button"
  size="small"
  color="error"
  onClick={() => handleRemoveMember(member.id)}
  disabled={removingMemberId === member.id}
  aria-label={`Remove ${member.user?.email}`}
>
```

**After**:
```typescript
<IconButton
  size="small"
  color="error"
  onClick={() => handleRemoveMember(member.id)}
  disabled={removingMemberId === member.id}
  aria-label={`Remove ${member.user?.email}`}
>
```

#### 3.4 Fix `components/profile/ProfileCard.tsx` (Line 99)

**Before**:
```typescript
{getRoleDisplayName(profile.globalRole)}
```

**After**:
```typescript
{profile.globalRole === "platform_owner" 
  ? "Platform Owner" 
  : getRoleDisplayName(profile.globalRole)}
```

### Phase 4: Verify Build (5 minutes)

Run build to ensure all errors are fixed:
```bash
cd /Users/aaron/code/sts/test-ws-05/ai-sec-stack
pnpm build
```

Expected result: All packages build successfully with no TypeScript errors.

### Phase 5: Apply Fixes to Templates (15 minutes)

Copy all fixed files from test-ws-05 to the templates:

```bash
# From test-ws-05 to templates
cp /Users/aaron/code/sts/test-ws-05/ai-sec-stack/packages/module-access/frontend/providers/okta.ts \
   templates/_modules-core/module-access/frontend/providers/okta.ts

cp /Users/aaron/code/sts/test-ws-05/ai-sec-stack/packages/module-access/frontend/components/admin/IdpTab.tsx \
   templates/_modules-core/module-access/frontend/components/admin/IdpTab.tsx

# ... repeat for all 12 fixed files
```

**Files to copy**:
1. `providers/okta.ts`
2. `components/admin/IdpTab.tsx`
3. `components/admin/OrgMembersTab.tsx`
4. `components/admin/OrgsTab.tsx`
5. `components/admin/OrgDetails.tsx`
6. `components/admin/OrgInvitesTab.tsx`
7. `components/admin/OrgDomainsTab.tsx`
8. `components/admin/OrgAIConfigTab.tsx`
9. `components/admin/UsersTab.tsx`
10. `components/admin/OrgMgmt.tsx`
11. `components/org/OrgMembersList.tsx`
12. `components/profile/ProfileCard.tsx`

**Important**: Replace `@ai-sec` with `@{{PROJECT_NAME}}` placeholders when copying to templates.

---

## Critical Rules to Avoid Cascading Errors

### ✅ DO:
1. **Follow existing patterns**: Use `IdpConfigCard.tsx` as the reference implementation
2. **Add type parameters**: Always specify generic types for `apiClient.get<Type>()`
3. **Provide fallbacks**: Use `??` operator for potentially undefined values
4. **Keep shared types stable**: Don't modify interfaces like `OktaSession` that other modules depend on

### ❌ DON'T:
1. **Don't make shared types optional**: Changing `accessToken: string` to `accessToken?: string` breaks consumers
2. **Don't extend interfaces with incompatible types**: `null` vs `undefined` causes TypeScript errors
3. **Don't skip type parameters**: `apiClient.get()` without `<Type>` causes inference errors
4. **Don't modify types to fix errors**: Fix the code, not the types

---

## Testing Checklist

After implementation, verify:

- [ ] `pnpm build` succeeds in test-ws-05/ai-sec-stack
- [ ] No TypeScript errors in `module-access`
- [ ] No TypeScript errors in `module-ws`
- [ ] No TypeScript errors in `module-mgmt`
- [ ] All 12 files copied to templates with placeholders
- [ ] Create new test project from templates to verify fixes propagate

---

## Files Modified Summary

### In `test-ws-05/ai-sec-stack/packages/module-access/frontend/`:

| File | Lines Changed | Type of Fix |
|------|---------------|-------------|
| `providers/okta.ts` | 134-135 | Add fallback values |
| `components/admin/IdpTab.tsx` | Multiple | Auth pattern fix |
| `components/admin/OrgMembersTab.tsx` | Multiple | Auth pattern fix |
| `components/admin/OrgsTab.tsx` | Multiple | Auth pattern fix |
| `components/admin/OrgDetails.tsx` | Multiple | Auth pattern fix |
| `components/admin/OrgInvitesTab.tsx` | Multiple | Auth pattern fix |
| `components/admin/OrgDomainsTab.tsx` | Multiple | Auth pattern fix |
| `components/admin/OrgAIConfigTab.tsx` | Multiple | Auth pattern fix |
| `components/admin/UsersTab.tsx` | Multiple | Auth pattern fix |
| `components/admin/OrgMgmt.tsx` | 82, 117, 366-367 | Type fixes |
| `components/org/OrgMembersList.tsx` | 228 | Remove duplicate aria-label |
| `components/profile/ProfileCard.tsx` | 99 | Add platform_owner conditional |

---

## Time Estimate Breakdown

| Phase | Task | Time |
|-------|------|------|
| 1 | Document plan (this file) | 0 min (done) |
| 2 | Fix 8 auth adapter components | 20 min |
| 3 | Fix 6 type errors | 15 min |
| 4 | Verify build | 5 min |
| 5 | Copy to templates | 15 min |
| **Total** | | **55 minutes** |

---

## Success Criteria

1. ✅ All packages in test-ws-05 build without TypeScript errors
2. ✅ All 12 files copied to templates with correct placeholders
3. ✅ New test project created from templates builds successfully
4. ✅ No shared type definitions modified (OktaSession, Session, etc.)
5. ✅ Auth adapter pattern consistent across all components

---

## Related Documentation

- **ADR-004**: NextAuth API Client Pattern (establishes the correct pattern)
- **Task Context**: See original task description in chat history
- **Reference Implementation**: `IdpConfigCard.tsx` (shows correct pattern)

---

## Notes

- The previous attempt failed because it modified `OktaSession` to make fields optional, which broke `useUnifiedAuth.ts` and created cascading errors across modules.
- This plan explicitly avoids modifying shared types and instead fixes the calling code.
- All fixes follow patterns already established in the codebase (e.g., `IdpConfigCard.tsx`).
