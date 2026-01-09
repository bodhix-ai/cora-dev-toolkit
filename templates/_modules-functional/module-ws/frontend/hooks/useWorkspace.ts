/**
 * useWorkspace Hook
 *
 * Fetches and manages a single workspace with its members.
 * Provides methods for updating workspace and managing members.
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { createWorkspaceApiClient } from "../lib/api";
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceUpdateRequest,
  AddMemberRequest,
  UpdateMemberRequest,
  WorkspaceRole,
} from "../types";

export interface UseWorkspaceOptions {
  /** Whether to auto-fetch on mount */
  autoFetch?: boolean;
  /** Whether to fetch members along with workspace */
  includeMembers?: boolean;
  /** Organization ID (optional - falls back to context) */
  orgId?: string;
}

export interface UseWorkspaceReturn {
  /** The workspace data */
  workspace: Workspace | null;
  /** List of workspace members */
  members: WorkspaceMember[];
  /** Loading state */
  loading: boolean;
  /** Members loading state */
  membersLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Current user's role in this workspace */
  userRole: WorkspaceRole | null;
  /** Whether current user is owner */
  isOwner: boolean;
  /** Whether current user is admin (owner or admin) */
  isAdmin: boolean;
  /** Refetch workspace data */
  refetch: () => Promise<void>;
  /** Update workspace */
  updateWorkspace: (data: WorkspaceUpdateRequest) => Promise<Workspace | null>;
  /** Delete workspace */
  deleteWorkspace: (permanent?: boolean) => Promise<boolean>;
  /** Restore workspace */
  restoreWorkspace: () => Promise<Workspace | null>;
  /** Toggle favorite */
  toggleFavorite: () => Promise<boolean>;
  /** Add member */
  addMember: (data: AddMemberRequest) => Promise<WorkspaceMember | null>;
  /** Update member role */
  updateMember: (memberId: string, data: UpdateMemberRequest) => Promise<WorkspaceMember | null>;
  /** Remove member */
  removeMember: (memberId: string) => Promise<boolean>;
}

export function useWorkspace(
  workspaceId: string | null,
  options: UseWorkspaceOptions = {}
): UseWorkspaceReturn {
  const { autoFetch = true, includeMembers = true, orgId: providedOrgId } = options;

  const { data: session } = useSession();
  const { currentOrganization } = useOrganizationContext();
  const orgId = providedOrgId || currentOrganization?.orgId || "";
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch workspace data
  const fetchWorkspace = useCallback(async () => {
    if (!session?.accessToken || !workspaceId || !orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      const ws = await client.getWorkspace(workspaceId, orgId);
      setWorkspace(ws);

      // Fetch members if requested
      if (includeMembers && ws) {
        setMembersLoading(true);
        try {
          const membersList = await client.listMembers(workspaceId, orgId);
          setMembers(membersList);
        } catch (err) {
          console.error("Failed to fetch members:", err);
        } finally {
          setMembersLoading(false);
        }
      }
    } catch (err) {
      console.error("Failed to fetch workspace:", err);
      setError(err instanceof Error ? err.message : "Failed to load workspace");
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, workspaceId, orgId, includeMembers]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchWorkspace();
    }
  }, [fetchWorkspace, autoFetch]);

  // Update workspace
  const updateWorkspace = useCallback(
    async (data: WorkspaceUpdateRequest): Promise<Workspace | null> => {
      if (!session?.accessToken || !workspaceId || !orgId) return null;

      try {
        const client = createWorkspaceApiClient(session.accessToken as string);
        const updated = await client.updateWorkspace(workspaceId, data, orgId);
        setWorkspace(updated);
        return updated;
      } catch (err) {
        console.error("Failed to update workspace:", err);
        throw err;
      }
    },
    [session?.accessToken, workspaceId, orgId]
  );

  // Delete workspace
  const deleteWorkspace = useCallback(
    async (permanent = false): Promise<boolean> => {
      if (!session?.accessToken || !workspaceId || !orgId) return false;

      try {
        const client = createWorkspaceApiClient(session.accessToken as string);
        await client.deleteWorkspace(workspaceId, orgId, permanent);
        return true;
      } catch (err) {
        console.error("Failed to delete workspace:", err);
        throw err;
      }
    },
    [session?.accessToken, workspaceId, orgId]
  );

  // Restore workspace
  const restoreWorkspace = useCallback(async (): Promise<Workspace | null> => {
    if (!session?.accessToken || !workspaceId || !orgId) return null;

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      const restored = await client.restoreWorkspace(workspaceId, orgId);
      setWorkspace(restored);
      return restored;
    } catch (err) {
      console.error("Failed to restore workspace:", err);
      throw err;
    }
  }, [session?.accessToken, workspaceId, orgId]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (): Promise<boolean> => {
    if (!session?.accessToken || !workspaceId || !workspace || !orgId) return false;

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);
      const result = await client.toggleFavorite(workspaceId, orgId);
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              is_favorited: result.is_favorited,
              favorited_at: result.favorited_at,
            }
          : null
      );
      return result.is_favorited;
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
      throw err;
    }
  }, [session?.accessToken, workspaceId, workspace, orgId]);

  // Add member
  const addMember = useCallback(
    async (data: AddMemberRequest): Promise<WorkspaceMember | null> => {
      if (!session?.accessToken || !workspaceId || !orgId) return null;

      try {
        const client = createWorkspaceApiClient(session.accessToken as string);
        const member = await client.addMember(workspaceId, data, orgId);
        setMembers((prev) => [...prev, member]);
        return member;
      } catch (err) {
        console.error("Failed to add member:", err);
        throw err;
      }
    },
    [session?.accessToken, workspaceId, orgId]
  );

  // Update member role
  const updateMember = useCallback(
    async (memberId: string, data: UpdateMemberRequest): Promise<WorkspaceMember | null> => {
      if (!session?.accessToken || !workspaceId || !orgId) return null;

      try {
        const client = createWorkspaceApiClient(session.accessToken as string);
        const updated = await client.updateMember(workspaceId, memberId, data, orgId);
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? updated : m))
        );
        return updated;
      } catch (err) {
        console.error("Failed to update member:", err);
        throw err;
      }
    },
    [session?.accessToken, workspaceId, orgId]
  );

  // Remove member
  const removeMember = useCallback(
    async (memberId: string): Promise<boolean> => {
      if (!session?.accessToken || !workspaceId || !orgId) return false;

      try {
        const client = createWorkspaceApiClient(session.accessToken as string);
        await client.removeMember(workspaceId, memberId, orgId);
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        return true;
      } catch (err) {
        console.error("Failed to remove member:", err);
        throw err;
      }
    },
    [session?.accessToken, workspaceId, orgId]
  );

  // Derived values
  const userRole = workspace?.user_role || null;
  const isOwner = userRole === "ws_owner";
  const isAdmin = userRole === "ws_owner" || userRole === "ws_admin";

  return {
    workspace,
    members,
    loading,
    membersLoading,
    error,
    userRole,
    isOwner,
    isAdmin,
    refetch: fetchWorkspace,
    updateWorkspace,
    deleteWorkspace,
    restoreWorkspace,
    toggleFavorite,
    addMember,
    updateMember,
    removeMember,
  };
}

export default useWorkspace;
