"use client";
import { createContext, useContext } from 'react';

interface WorkspaceContextType {
  workspaceId: string | null;
  // Add other workspace properties as needed
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext must be used within WorkspaceProvider');
  }
  return context;
}

export { WorkspaceContext };
