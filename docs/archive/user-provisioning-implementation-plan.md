# User Provisioning Upon First Login - Implementation Plan

**⚠️ ARCHIVED - SUPERSEDED BY AUTHORITATIVE DOCUMENTATION**

**See:** [User Authentication & Provisioning (Standard)](./user-authentication-and-provisioning.md) - **Official CORA Standard**

---

**Original Date:** December 14, 2025  
**Completed:** December 17, 2025  
**Status:** ✅ **ARCHIVED** - This was a feature implementation plan that is now complete  
**Branch:** `feature/user-provisioning-on-login` (merged)  
**Purpose:** Historical record of the user provisioning implementation effort

---

## 📋 About This Document

This document was the **implementation plan** for developing user provisioning functionality. The work described here is **complete and working in production**.

**For current CORA projects, refer to:**
- [User Authentication & Provisioning](./user-authentication-and-provisioning.md) - Official standard documenting the 5 login scenarios

**This document is preserved for:**
- Historical context of the implementation effort
- Code examples and patterns used during development
- Timeline and progress tracking from December 2025

---

## 🎉 IMPLEMENTATION COMPLETE (December 17, 2025)

**User provisioning is COMPLETE and WORKING!**

### What Was Discovered

Upon investigation, the profiles Lambda already had complete auto-provisioning logic implemented:

1. ✅ **Auto-provision user on first login** - `auto_provision_user()` function
2. ✅ **Multiple provisioning strategies**:
   - Pending invite (fast path)
   - Email domain match (common path)
   - Platform initialization (first user)
   - Graceful error handling
3. ✅ **Complete user creation flow**:
   - Creates `auth.users` record via Supabase Admin API
   - Creates `external_identities` mapping
   - Creates `profiles` record with audit fields
   - Assigns default organization
   - Sets appropriate roles
4. ✅ **Schema updated with audit columns**:
   - `created_by` column added to profiles
   - `updated_by` column added to profiles
   - Migration file created for existing projects

### What Was Fixed (December 17, 2025)

**Issue:** Schema was missing `created_by` and `updated_by` columns that the Lambda code expected.

**Solution:**
1. ✅ Updated schema file (`003-profiles.sql`) to include both columns
2. ✅ Created migration file (`20251217111300_add_created_by_to_profiles.sql`)
3. ✅ Applied migration to ai-sec project
4. ✅ Verified user provisioning working end-to-end

### Current Status

- ✅ **Template Lambda**: Production-ready with clean logging
- ✅ **Schema**: Complete with audit columns
- ✅ **Migration**: Idempotent and tested
- ✅ **ai-sec Project**: User provisioning working
- ✅ **New Projects**: Template ready to use as-is

**User provisioning now works out of the box for new CORA projects!** 🎉

### What Was Implemented

The complete implementation covers all 5 user login scenarios now documented in the official [User Authentication & Provisioning](./user-authentication-and-provisioning.md) standard:

1. ✅ **Standard Authorization** - Returning users (optimized < 120ms)
2. ✅ **First-Time Invited User** - Auto-assigned to invited org
3. ✅ **First-Time Domain User** - Email domain-based auto-provisioning
4. ✅ **Bootstrap** - First user creates "Platform Admin" org automatically
5. ✅ **Denied Access** - Graceful handling with helpful messaging

---

## Executive Summary (Historical)

With dynamic IDP configuration complete and validated (Phase 7), the next critical feature is **automated user provisioning** that creates user profiles in the database upon first successful login, supporting both Clerk and Okta authentication providers.

**Prerequisites:**

- ✅ Dynamic IDP configuration system complete
- ✅ Unified auth hooks (`useUnifiedAuth`) implemented
- ✅ Project creation script fully functional
- ✅ Okta login tested and validated

**Goal:** Create a provider-agnostic user provisioning system that automatically provisions users on first login, ensuring consistent user profile creation regardless of authentication provider.

---

## Current State (Updated December 17, 2025)

**What Works:**

- ✅ Users can authenticate with both Clerk and Okta
- ✅ OAuth flows complete successfully (OIDC, PKCE, state validation)
- ✅ Sessions managed correctly with NextAuth
- ✅ Unified auth interface abstracts provider differences
- ✅ **Automatic user profile creation in database** ✨
- ✅ **Organization membership assignment** ✨
- ✅ **Default role/permission setup** ✨
- ✅ **Invite-based provisioning** ✨
- ✅ **Domain-based provisioning** ✨
- ✅ **Platform owner provisioning (first user)** ✨

**What Was Missing (Now Fixed):**

- ✅ Schema columns (`created_by`, `updated_by`) - Added Dec 17
- ✅ Migration for existing projects - Created Dec 17
- ✅ Schema cache refresh documentation - Added Dec 17

---

## Goals

### 1. Clerk Integration Best Practices

- Extract user provisioning patterns from existing Clerk-based projects
- Identify webhook handlers and profile creation logic
- Document Clerk user provisioning flow
- Understand Clerk's user metadata structure

### 2. Okta Integration Best Practices

- Research Okta user provisioning patterns
- Implement NextAuth callbacks for profile creation
- Handle user attributes mapping (name, email, profile picture)
- Understand Okta's user claims structure

### 3. Unified User Provisioning

- Create provider-agnostic user provisioning system
- Support both Clerk and Okta user creation flows
- Ensure consistent user profile schema across providers
- Handle provider-specific edge cases gracefully

### 4. Database Integration

- Implement `user_profiles` table creation on first login
- Handle organization membership assignment
- Set default roles and permissions
- Ensure idempotent operations (handle re-authentication gracefully)

---

## Implementation Phases

### Phase 1: Research & Documentation (2 hours)

**Goal:** Analyze existing patterns and document best practices from both providers

#### Tasks

1. **Analyze Existing Clerk Implementations**

   - Review pm-app-stack Clerk webhook handlers
   - Document Clerk user object structure
   - Identify profile creation patterns
   - Map Clerk metadata to database schema

2. **Review Okta User Provisioning**

   - Study NextAuth documentation for user provisioning
   - Review Okta OIDC claims structure
   - Document Okta callback patterns
   - Identify attribute mapping requirements

3. **Document Common Patterns**
   - Identify common user attributes across providers
   - Define unified user profile schema
   - Document edge cases (missing data, duplicate users)
   - Create mapping tables for provider-specific fields

#### Deliverables

- [ ] Clerk user provisioning pattern documentation
- [ ] Okta user provisioning pattern documentation
- [ ] Unified user profile schema definition
- [ ] Provider attribute mapping table

---

### Phase 2: Design Unified System (2 hours)

**Goal:** Design provider-agnostic user provisioning architecture

#### Tasks

1. **Define Database Schema**

   ```sql
   -- User Profiles Table
   CREATE TABLE IF NOT EXISTS public.user_profiles (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     external_id TEXT UNIQUE NOT NULL, -- IDP user ID
     provider TEXT NOT NULL, -- 'clerk' | 'okta'
     email TEXT NOT NULL,
     full_name TEXT,
     profile_image_url TEXT,
     metadata JSONB DEFAULT '{}',
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Organization Memberships
   CREATE TABLE IF NOT EXISTS public.organization_memberships (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
     organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
     role TEXT DEFAULT 'member',
     created_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(user_id, organization_id)
   );
   ```

2. **Design Provisioning Service**

   - Create `UserProvisioningService` class/module
   - Define interface for provider-specific handlers
   - Implement idempotent user creation
   - Handle default organization assignment

3. **Plan Migration Path**
   - Strategy for existing users without profiles
   - Backfill process for legacy data
   - Migration scripts for existing databases

#### Deliverables

- [ ] Database schema design (005-user-provisioning.sql)
- [ ] User provisioning service architecture diagram
- [ ] Provider adapter interface definition
- [ ] Migration strategy document

---

### Phase 3: Implementation (4 hours)

**Goal:** Implement user provisioning for both Clerk and Okta

#### 3.1 Database Migrations (30 minutes)

**File:** `templates/_cora-core-modules/module-access/db/schema/005-user-provisioning.sql`

```sql
-- User Profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('clerk', 'okta')),
  email TEXT NOT NULL,
  full_name TEXT,
  profile_image_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_profiles_external_id ON user_profiles(external_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_provider ON user_profiles(provider);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY user_profiles_select_own
  ON user_profiles
  FOR SELECT
  USING (external_id = auth.uid());

-- Platform admins can read all profiles
CREATE POLICY user_profiles_select_admin
  ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.user_id = user_profiles.id
      AND om.role IN ('platform_admin', 'organization_admin')
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();
```

#### 3.2 Clerk Webhook Handler (1 hour)

**File:** `templates/_project-stack-template/apps/web/app/api/webhooks/clerk/route.ts`

```typescript
import { headers } from "next/headers";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { provisionUser } from "@/lib/user-provisioning";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Missing CLERK_WEBHOOK_SECRET");
  }

  // Get headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing headers", { status: 400 });
  }

  // Verify webhook
  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle user.created event
  if (evt.type === "user.created") {
    try {
      await provisionUser({
        externalId: evt.data.id,
        provider: "clerk",
        email: evt.data.email_addresses[0]?.email_address || "",
        fullName: `${evt.data.first_name || ""} ${
          evt.data.last_name || ""
        }`.trim(),
        profileImageUrl: evt.data.image_url,
        metadata: {
          clerkMetadata: evt.data.public_metadata,
        },
      });

      console.log("✅ User provisioned:", evt.data.id);
    } catch (error) {
      console.error("❌ User provisioning failed:", error);
      return new Response("Provisioning failed", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}
```

#### 3.3 Okta Callback Handler (1 hour)

**File:** Update `templates/_project-stack-template/apps/web/app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { provisionUser } from "@/lib/user-provisioning";

const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "okta",
      name: "Okta",
      type: "oauth",
      clientId: process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      issuer: process.env.OKTA_ISSUER,
      wellKnown: `${process.env.OKTA_ISSUER}/.well-known/openid-configuration`,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token;
        token.profile = profile;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.id = token.sub;
      return session;
    },
    async signIn({ user, account, profile }) {
      // Provision user on first sign-in
      if (account?.provider === "okta") {
        try {
          await provisionUser({
            externalId: user.id,
            provider: "okta",
            email: user.email || "",
            fullName: user.name || "",
            profileImageUrl: user.image,
            metadata: {
              oktaProfile: profile,
            },
          });
          console.log("✅ User provisioned:", user.id);
        } catch (error) {
          console.error("❌ User provisioning failed:", error);
          // Allow sign-in even if provisioning fails (can retry later)
        }
      }
      return true;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

#### 3.4 Unified Provisioning Service (1.5 hours)

**File:** `templates/_project-stack-template/apps/web/lib/user-provisioning.ts`

```typescript
import { createClient } from "@/lib/supabase/server";

interface ProvisionUserParams {
  externalId: string;
  provider: "clerk" | "okta";
  email: string;
  fullName: string;
  profileImageUrl?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Provision a new user in the database upon first login
 * Idempotent - safe to call multiple times for the same user
 */
export async function provisionUser(params: ProvisionUserParams) {
  const supabase = createClient();

  // Check if user already exists
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("external_id", params.externalId)
    .single();

  if (existing) {
    console.log("User already provisioned:", params.externalId);
    return existing;
  }

  // Create user profile
  const { data: user, error } = await supabase
    .from("user_profiles")
    .insert({
      external_id: params.externalId,
      provider: params.provider,
      email: params.email,
      full_name: params.fullName,
      profile_image_url: params.profileImageUrl,
      metadata: params.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create user profile:", error);
    throw new Error(`User provisioning failed: ${error.message}`);
  }

  // Assign to default organization (if exists)
  await assignDefaultOrganization(user.id);

  return user;
}

/**
 * Assign user to default organization with member role
 */
async function assignDefaultOrganization(userId: string) {
  const supabase = createClient();

  // Get default organization (could be from env var or database)
  const defaultOrgId = process.env.DEFAULT_ORGANIZATION_ID;

  if (!defaultOrgId) {
    console.warn("No default organization configured");
    return;
  }

  const { error } = await supabase.from("organization_memberships").insert({
    user_id: userId,
    organization_id: defaultOrgId,
    role: "member",
  });

  if (error && error.code !== "23505") {
    // Ignore duplicate key errors (already a member)
    console.error("Failed to assign default organization:", error);
  }
}
```

#### 3.5 Hook Integration (30 minutes)

**File:** Update `templates/_cora-core-modules/module-access/frontend/hooks/useUserProfile.ts`

```typescript
"use client";

import { useEffect, useState } from "react";
import { useUnifiedAuth } from "./useUnifiedAuth";

interface UserProfile {
  id: string;
  externalId: string;
  provider: string;
  email: string;
  fullName: string;
  profileImageUrl?: string;
  metadata?: Record<string, any>;
}

export function useUserProfile() {
  const { userId, isSignedIn } = useUnifiedAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn || !userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    async function loadProfile() {
      try {
        const response = await fetch(`/api/user/profile`);
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [userId, isSignedIn]);

  return { profile, loading };
}
```

#### Checklist

- [ ] Create database schema (005-user-provisioning.sql)
- [ ] Implement Clerk webhook handler
- [ ] Implement Okta callback handler
- [ ] Create unified provisioning service
- [ ] Add useUserProfile hook
- [ ] Update project creation script to include new schema
- [ ] Add environment variables documentation

---

### Phase 4: Testing & Validation (2 hours)

**Goal:** Validate user provisioning works correctly for both providers

#### Test Cases

**Clerk Testing:**

1. **New User Sign-Up**

   - [ ] User signs up via Clerk
   - [ ] Webhook received successfully
   - [ ] User profile created in database
   - [ ] Default organization assigned
   - [ ] User can access application

2. **Existing User Sign-In**

   - [ ] Existing user signs in
   - [ ] No duplicate profile created
   - [ ] User data remains consistent
   - [ ] Organization memberships preserved

3. **Edge Cases**
   - [ ] Missing email address
   - [ ] Missing name fields
   - [ ] Webhook delivery failure (retry handling)
   - [ ] Database connection failure

**Okta Testing:**

1. **New User First Login**

   - [ ] User logs in via Okta
   - [ ] Callback executes successfully
   - [ ] User profile created in database
   - [ ] Default organization assigned
   - [ ] User can access application

2. **Existing User Login**

   - [ ] Existing user logs in
   - [ ] No duplicate profile created
   - [ ] User data remains consistent
   - [ ] Organization memberships preserved

3. **Edge Cases**
   - [ ] Missing user attributes
   - [ ] Profile image unavailable
   - [ ] Callback failure (graceful degradation)
   - [ ] Database connection failure

**Integration Testing:**

1. **Provider Switching**

   - [ ] User can switch between providers
   - [ ] Profile data remains consistent
   - [ ] Organization memberships preserved

2. **Admin Operations**
   - [ ] Admins can view all user profiles
   - [ ] Admins can update user roles
   - [ ] Admins can manage organization memberships

#### Validation Checklist

- [ ] All test cases pass for Clerk
- [ ] All test cases pass for Okta
- [ ] Edge cases handled gracefully
- [ ] Database constraints enforced
- [ ] RLS policies work correctly
- [ ] No duplicate user profiles created
- [ ] Default organization assignment works
- [ ] Error logging captures all failures

---

## Timeline Estimate

| Phase                         | Estimated Hours | Status      |
| ----------------------------- | --------------- | ----------- |
| Phase 1: Research & Docs      | 2 hours         | ⏳ Planned  |
| Phase 2: Design               | 2 hours         | ⏳ Planned  |
| Phase 3: Implementation       | 4 hours         | ⏳ Planned  |
| Phase 4: Testing & Validation | 2 hours         | ⏳ Planned  |
| **Total**                     | **10 hours**    | **0% Done** |

---

## Success Criteria

### Must Have

- ✅ User profile automatically created on first login (Clerk)
- ✅ User profile automatically created on first login (Okta)
- ✅ User attributes correctly mapped from IDP to database
- ✅ Default organization membership assigned
- ✅ Default roles and permissions set
- ✅ Duplicate user handling works correctly
- ✅ System works with both new and existing users

### Nice to Have

- ⏳ User profile update on subsequent logins (sync changes)
- ⏳ Organization invitation flow integration
- ⏳ Role-based provisioning (different roles for different users)
- ⏳ Multi-organization support

---

## Risk Assessment

### High Risk

1. **Webhook Delivery Failures (Clerk)**
   - **Risk:** Webhooks may fail to deliver, leaving users without profiles
   - **Mitigation:** Implement fallback provisioning on first API call
   - **Fallback:** Admin tool to manually provision missing users

### Medium Risk

2. **Database Constraint Violations**

   - **Risk:** Duplicate key errors if provisioning called multiple times
   - **Mitigation:** Use INSERT...ON CONFLICT or check existence first
   - **Fallback:** Idempotent operations that safely handle duplicates

3. **Provider Data Inconsistencies**
   - **Risk:** Different providers may have different required fields
   - **Mitigation:** Make most fields optional in schema
   - **Fallback:** Provide sensible defaults for missing data

### Low Risk

4. **Performance Impact**
   - **Risk:** Provisioning adds latency to first login
   - **Mitigation:** Async processing where possible
   - **Fallback:** Acceptable for one-time first login delay

---

## Files to Create

1. `templates/_cora-core-modules/module-access/db/schema/005-user-provisioning.sql`
2. `templates/_project-stack-template/apps/web/lib/user-provisioning.ts`
3. `templates/_project-stack-template/apps/web/app/api/webhooks/clerk/route.ts`
4. `templates/_cora-core-modules/module-access/frontend/hooks/useUserProfile.ts`

## Files to Modify

1. `templates/_project-stack-template/apps/web/app/api/auth/[...nextauth]/route.ts` - Add signIn callback
2. `templates/_project-stack-template/apps/web/.env.example` - Add webhook secret docs
3. `templates/_project-stack-template/apps/web/package.json` - Add svix dependency
4. `scripts/create-cora-project.sh` - Include 005 schema in setup

---

## Next Steps

### Immediate

1. Begin Phase 1: Research & Documentation
2. Analyze existing Clerk implementations
3. Review NextAuth callback documentation
4. Define unified user profile schema

### Follow-on

- Complete Phase 2: Design
- Begin Phase 3: Implementation
- Test with both providers
- Deploy to ai-sec project for validation

---

## References

**Current Documentation:**
- [User Authentication & Provisioning](./user-authentication-and-provisioning.md) - ✅ **Official CORA Standard**
- [IDP Config Integration Plan](./idp-config-integration-plan.md) - ✅ COMPLETE

**External References:**
- [Clerk Webhooks Documentation](https://clerk.com/docs/integrations/webhooks)
- [NextAuth.js Callbacks](https://next-auth.js.org/configuration/callbacks)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

---

## Related Documentation

For understanding how this implementation fits into the broader CORA authentication architecture, see:
- [User Authentication & Provisioning](./user-authentication-and-provisioning.md) - The 5 login scenarios explained
- [ORG-CREATION-GATING-AND-DOMAIN-ASSIGNMENT-PLAN.md](./auth/ORG-CREATION-GATING-AND-DOMAIN-ASSIGNMENT-PLAN.md) - Org gating implementation details
- [USER-INVITATION-FLOW.md](./auth/USER-INVITATION-FLOW.md) - Invitation system details

---

**Document Version:** 1.1 (Archived)  
**Created:** December 14, 2025 - 9:50 PM EST  
**Completed:** December 17, 2025  
**Archived:** December 20, 2025  
**Status:** 📦 **ARCHIVED** - See [user-authentication-and-provisioning.md](./user-authentication-and-provisioning.md) for current standard  
**Branch:** `feature/user-provisioning-on-login` (merged)
