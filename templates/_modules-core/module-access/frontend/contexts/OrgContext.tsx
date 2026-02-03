"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  CoraAuthAdapter,
  createCoraAuthenticatedClient,
} from "@{{PROJECT_NAME}}/api-client";
import { createOrgModuleClient, OrgModuleApiClient } from "../lib/api";
import { UserOrganization } from "../types";
import { useUser } from "./UserContext";

export interface OrgContextType {
  currentOrg: UserOrganization | null;
  organizations: UserOrganization[];
  setCurrentOrg: (org: UserOrganization) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  loading: boolean;
  api: OrgModuleApiClient | null;
}

export const OrgContext = createContext<OrgContextType | null>(null);

interface OrgProviderProps {
  authAdapter: CoraAuthAdapter;
  children: ReactNode;
}

export function OrgProvider({ authAdapter, children }: OrgProviderProps) {
  const { profile, loading: profileLoading } = useUser();
  const [currentOrg, setCurrentOrgState] = useState<UserOrganization | null>(
    null
  );
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [api, setApi] = useState<OrgModuleApiClient | null>(null);

  // Initialize API client with auth token
  useEffect(() => {
    let mounted = true;

    async function initializeApi() {
      try {
        const token = await authAdapter.getToken();
        if (mounted && token) {
          // Use CORA authenticated client (points to modular API Gateway)
          const authenticatedClient = createCoraAuthenticatedClient(token);
          const orgClient = createOrgModuleClient(authenticatedClient);
          setApi(orgClient);
        } else if (mounted) {
          setApi(null);
        }
      } catch (error) {
        console.error("Failed to initialize API client:", error);
        if (mounted) {
          setApi(null);
        }
      }
    }

    initializeApi();

    return () => {
      mounted = false;
    };
  }, [authAdapter]);

  const refreshOrganizations = useCallback(async () => {
    // Simply trigger a refresh of the user context
    // The profile data will flow through via the useEffect below
  }, []);

  const setCurrentOrg = useCallback(
    async (org: UserOrganization) => {
      console.log("[OrgContext] setCurrentOrg called with org:", org);
      console.log(
        "[OrgContext] API client status:",
        api ? "initialized" : "NULL"
      );

      setCurrentOrgState(org);

      // Update backend
      if (api) {
        console.log("[OrgContext] Attempting to call api.updateProfile with:", {
          currentOrgId: org.orgId,
        });
        try {
          const result = await api.updateProfile({
            currentOrgId: org.orgId,
          } as any);
          console.log("[OrgContext] api.updateProfile SUCCESS:", result);
        } catch (error) {
          console.error("[OrgContext] api.updateProfile FAILED:", error);
        }
      } else {
        console.error(
          "[OrgContext] Cannot update current org: API client not initialized. This is likely due to missing auth token."
        );
      }
    },
    [api]
  );

  // Update organizations when profile changes
  useEffect(() => {
    if (profile?.organizations) {
      const userOrgs = profile.organizations;
      setOrganizations(userOrgs);

      // Set current org if user has one selected
      if (profile.currentOrgId) {
        const newOrg = userOrgs.find(
          (org) => org.orgId === profile.currentOrgId
        );
        // Always use fresh org data to ensure fields like appName/appIcon are current
        setCurrentOrgState((prevOrg) => {
          if (!newOrg) return prevOrg;
          return newOrg;
        });
      } else if (userOrgs.length > 0) {
        // Default to first org if no current org set
        setCurrentOrgState((prevOrg) => {
          if (prevOrg) return prevOrg; // Keep existing org if one is set
          return userOrgs[0];
        });
      }
    } else {
      setOrganizations([]);
      setCurrentOrgState(null);
    }
  }, [profile]);

  return (
    <OrgContext.Provider
      value={{
        currentOrg,
        organizations,
        setCurrentOrg,
        refreshOrganizations,
        loading: profileLoading,
        api,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}
