"use client";

import { useCallback } from "react";
import { createAuthenticatedClient } from "@${project}/api-client";
import { useUser } from "../contexts/UserContext";
import { createOrgModuleClient } from "../lib/api";
import { Profile } from "../types";

/**
 * Hook for managing the user's profile.
 * It uses the UserContext as the source of truth and provides
 * a function to update the profile.
 */
export function useProfile() {
  const { profile, loading, error, authAdapter, refreshUserContext } =
    useUser();

  const updateProfile = useCallback(
    async (data: Partial<Profile>) => {
      if (!authAdapter) return null;

      try {
        const token = await authAdapter.getToken();
        if (!token) {
          throw new Error("Authentication token not found");
        }
        const client = createAuthenticatedClient(token);
        const api = createOrgModuleClient(client);

        const response = await api.updateProfile(data);

        if (response.success) {
          await refreshUserContext(); // Refresh context to get updated profile
          return response.data;
        } else {
          console.error("Failed to update profile:", response.error);
          return null;
        }
      } catch (err) {
        console.error("Error updating profile:", err);
        return null;
      }
    },
    [authAdapter, refreshUserContext]
  );

  return {
    profile,
    loading,
    error,
    refetch: refreshUserContext,
    updateProfile,
  };
}
