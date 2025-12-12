"use client";

import { useContext } from "react";
import { OrgContext } from "../contexts/OrgContext";

/**
 * Hook to access current organization context
 * Must be used within OrgProvider
 */
export function useCurrentOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useCurrentOrg must be used within OrgProvider");
  }
  return context;
}
