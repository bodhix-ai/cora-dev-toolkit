import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  ChatShare,
  ChatProjectMemberInfo,
  PermissionLevel,
  listChatShares,
  shareChat,
  updateSharePermission,
  deleteShare,
  toggleProjectMemberSharing,
} from "../lib/api";

interface UseChatSharingReturn {
  shares: ChatShare[];
  projectMembers: ChatProjectMemberInfo[];
  isLoading: boolean;
  error: string | null;
  addShare: (email: string, permission: PermissionLevel) => Promise<void>;
  updatePermission: (
    userId: string,
    permission: PermissionLevel
  ) => Promise<void>;
  removeShare: (userId: string) => Promise<void>;
  toggleProjectSharing: (enabled: boolean) => Promise<void>;
  refreshShares: () => Promise<void>;
  canManageShares: boolean;
}

export function useChatSharing(sessionId: string): UseChatSharingReturn {
  const { getToken } = useAuth();
  const [shares, setShares] = useState<ChatShare[]>([]);
  const [projectMembers, setProjectMembers] = useState<ChatProjectMemberInfo[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManageShares, setCanManageShares] = useState(false);

  const fetchShares = useCallback(async () => {
    if (!sessionId) return;

    try {
      setIsLoading(true);
      setError(null);
      const token = await getToken();

      if (!token) {
        throw new Error("Authentication required");
      }

      const {
        shares: fetchedShares,
        can_manage_shares,
        project_members,
      } = await listChatShares(sessionId, token);
      setShares(fetchedShares);
      setProjectMembers(project_members || []);
      setCanManageShares(can_manage_shares);
    } catch (err) {
      console.error("Failed to fetch chat shares:", err);
      // Don't show error if it's just a permission issue (viewer)
      if (err instanceof Error && !err.message.includes("403")) {
        setError(err.message);
      }
      setCanManageShares(false);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, getToken]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const addShare = async (email: string, permission: PermissionLevel) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication required");

      await shareChat(sessionId, email, permission, token);
      await fetchShares(); // Refresh list
    } catch (err) {
      console.error("Failed to add share:", err);
      throw err;
    }
  };

  const updatePermission = async (
    userId: string,
    permission: PermissionLevel
  ) => {
    try {
      // Optimistic update
      setShares((prev) =>
        prev.map((s) =>
          s.user_id === userId ? { ...s, permission_level: permission } : s
        )
      );

      const token = await getToken();
      if (!token) throw new Error("Authentication required");

      await updateSharePermission(sessionId, userId, permission, token);
    } catch (err) {
      console.error("Failed to update permission:", err);
      await fetchShares(); // Revert on error
      throw err;
    }
  };

  const removeShare = async (userId: string) => {
    try {
      // Optimistic update
      setShares((prev) => prev.filter((s) => s.user_id !== userId));

      const token = await getToken();
      if (!token) throw new Error("Authentication required");

      await deleteShare(sessionId, userId, token);
    } catch (err) {
      console.error("Failed to remove share:", err);
      await fetchShares(); // Revert on error
      throw err;
    }
  };

  const toggleProjectSharing = async (enabled: boolean) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication required");

      await toggleProjectMemberSharing(sessionId, enabled, token);
    } catch (err) {
      console.error("Failed to toggle project sharing:", err);
      throw err;
    }
  };

  return {
    shares,
    projectMembers,
    isLoading,
    error,
    addShare,
    updatePermission,
    removeShare,
    toggleProjectSharing,
    refreshShares: fetchShares,
    canManageShares,
  };
}
