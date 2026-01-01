"use client";

import { useContext } from "react";
import { OrgContext } from "../contexts/OrgContext";

/**
 * Compatibility hook for legacy useOrganizationContext
 * Provides backward-compatible API for existing components
 */
export function useOrganizationContext() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useOrganizationContext must be used within OrgProvider");
  }

  const { currentOrg, organizations, setCurrentOrg, loading } = context;

  return {
    organizations,
    currentOrganization: currentOrg,
    switchOrganization: async (orgId: string) => {
      console.log(
        "[useOrganizationContext] switchOrganization called with orgId:",
        orgId
      );
      const org = organizations.find((o) => o.orgId === orgId);
      if (org) {
        console.log(
          "[useOrganizationContext] Found org, calling setCurrentOrg:",
          org
        );
        await setCurrentOrg(org);
        console.log("[useOrganizationContext] setCurrentOrg completed");
      } else {
        console.error(
          "[useOrganizationContext] Org not found for orgId:",
          orgId
        );
      }
    },
    isLoading: loading,
  };
}
