"use client";
import { createContext, useContext } from 'react';

interface OrgContextType {
  orgId: string | null;
  // Add other org properties as needed
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function useOrgContext() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrgContext must be used within OrgProvider');
  }
  return context;
}

export { OrgContext };
