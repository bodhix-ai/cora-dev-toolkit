/**
 * Auth Provider
 * 
 * Client component that initializes user authentication and profile fetching.
 * This should be used in the root layout to ensure user data is available
 * to all components (sidebar, menu, etc.).
 */

"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Call useAuth hook to fetch user profile and trigger auto-provisioning
  const { profile, isLoading, error } = useAuth();

  // Log auth state for debugging
  if (error) {
    console.error("[AuthProvider] Error:", error);
  }

  if (profile) {
    console.log("[AuthProvider] Profile loaded:", profile.email);
  }

  // Always render children - don't block on loading
  // Components can use useAuth hook directly if they need the profile data
  return <>{children}</>;
}
