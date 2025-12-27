"use client";

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from "react";
import useSWR from "swr";
import {
  createCoraAuthenticatedClient,
  CoraAuthAdapter,
} from "@{{PROJECT_NAME}}/api-client";
import { createOrgModuleClient } from "../lib/api";
import { Profile } from "../types";

interface UserContextType {
  profile: Profile | null;
  loading: boolean;
  isLoading: boolean; // Alias for compatibility
  error: string | null;
  isAuthenticated: boolean;
  authAdapter: CoraAuthAdapter;
  refreshUserContext: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export { UserContext };

export function UserProvider({
  children,
  authAdapter,
  isAuthenticated,
}: {
  children: ReactNode;
  authAdapter: CoraAuthAdapter;
  isAuthenticated: boolean;
}) {
  // Use SWR for profile fetching to avoid duplicate calls and provide better caching
  const { data, error, mutate } = useSWR(
    isAuthenticated ? "/profiles/me" : null,
    async () => {
      if (!isAuthenticated) return null;

      try {
        const token = await authAdapter.getToken();
        if (!token) {
          throw new Error("Could not retrieve auth token");
        }
        const client = createCoraAuthenticatedClient(token);
        const api = createOrgModuleClient(client);
        const response = await api.getProfile();

        if (response.success) {
          return response.data;
        } else {
          console.warn("Profile API not available yet:", response.error);
          return null;
        }
      } catch (err) {
        console.warn("Profile endpoint not available yet:", err);
        return null;
      }
    },
    {
      // Prevent duplicate calls from SWR's automatic revalidation
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
      // Don't retry on error since profile endpoint might not be available yet
      shouldRetryOnError: false,
    }
  );

  const refreshUserContext = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Memoize context value to prevent infinite re-render loops
  const contextValue = useMemo(() => ({
    profile: data || null,
    // CRITICAL FIX: Only show loading if user IS authenticated but profile not loaded yet
    // If user is NOT authenticated, loading should be false (not waiting for profile)
    // This prevents infinite loading state when "/" is public and user is unauthenticated
    loading: isAuthenticated && !error && !data,
    isLoading: isAuthenticated && !error && !data,
    error: error ? String(error) : null,
    isAuthenticated,
    authAdapter,
    refreshUserContext,
  }), [data, error, isAuthenticated, authAdapter, refreshUserContext]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
