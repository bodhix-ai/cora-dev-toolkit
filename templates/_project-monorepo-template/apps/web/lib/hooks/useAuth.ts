/**
 * useAuth Hook
 * 
 * Syncs NextAuth session with user profile from backend database.
 * Automatically fetches user profile on authentication, triggering
 * auto-provisioning if the user doesn't exist.
 * 
 * This hook should be used in the root layout or a top-level client component
 * to initialize user state from the backend.
 * 
 * Flow:
 * 1. NextAuth provides authentication and access token
 * 2. This hook uses the token to fetch user profile from API Gateway
 * 3. API Gateway → Lambda Authorizer validates token
 * 4. Profiles Lambda checks if user exists
 * 5. If no profile: Lambda auto-provisions user
 * 6. Profile data is returned and stored in state
 * 
 * Based on production patterns from career and policy stacks.
 */

"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { createApiClient } from "../api-client";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  auth_provider: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface UseAuthResult {
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export function useAuth(): UseAuthResult {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserProfile() {
      // Reset state when unauthenticated
      if (status === "unauthenticated") {
        setProfile(null);
        setError(null);
        return;
      }

      // Wait for authentication to complete
      if (status === "loading") {
        return;
      }

      // Fetch profile when authenticated
      if (status === "authenticated" && session?.idToken) {
        try {
          setError(null);

          // Create authenticated API client
          // This calls API Gateway directly (no Next.js proxy)
          const client = createApiClient(session.idToken);

          // Fetch user profile from backend
          // The Profiles Lambda will auto-provision the user if needed
          const response = await client.get<{ success: boolean; data: Profile }>(
            "/profiles/me"
          );

          if (response.success) {
            setProfile(response.data);
            console.log("[useAuth] User profile fetched:", response.data);
          } else {
            throw new Error("Failed to fetch user profile");
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to load user profile";
          setError(errorMessage);
          console.error("[useAuth] Error fetching profile:", errorMessage);
        }
      }
    }

    fetchUserProfile();
  }, [session, status]);

  return {
    profile,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated" && !!profile,
    error,
  };
}
