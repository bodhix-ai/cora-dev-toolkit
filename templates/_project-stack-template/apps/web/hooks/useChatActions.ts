import { useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useChatStore } from "@/store/chatStore";
import { useOrganizationStore } from "@/store/organizationStore";
import { useChatFavorites } from "./useChatFavorites";
import { useChatProjectAssociation } from "./useChatProjectAssociation";

export interface ChatActionsManager {
  // Project Association
  associateWithProject: (chatId: string, projectId: string) => Promise<void>;
  removeFromProject: (chatId: string) => Promise<void>;

  // Sharing
  toggleSharing: (chatId: string, enabled: boolean) => Promise<void>;

  // Favorites
  toggleFavorite: (chatId: string) => Promise<void>;

  // Utilities
  isLoading: (chatId: string) => boolean;
  isFavoriteLoading: (chatId: string) => boolean;
  isProjectLoading: (chatId: string) => boolean;
  isSharingLoading: (chatId: string) => boolean;
}

/**
 * Centralized chat actions hook with consistent state management.
 * Automatically reloads Zustand store after mutations to ensure UI stays in sync.
 *
 * This hook consolidates all chat mutation operations and ensures they all
 * follow the same pattern:
 * 1. Call the underlying hook (useChatFavorites, useChatProjectAssociation)
 * 2. Reload the Zustand store with forceReload=true to bypass cache
 * 3. Handle errors consistently
 *
 * @param onError Optional callback for error handling (e.g., to show toast notifications)
 * @returns ChatActionsManager with all chat action methods
 *
 * @example
 * ```tsx
 * const chatActions = useChatActions((error) => setErrorMessage(error));
 *
 * // Associate chat with project
 * await chatActions.associateWithProject(chatId, projectId);
 *
 * // Toggle favorite
 * await chatActions.toggleFavorite(chatId);
 *
 * // Check if loading
 * const loading = chatActions.isLoading(chatId);
 * ```
 */
export function useChatActions(
  onError?: (error: string) => void
): ChatActionsManager {
  const { getToken } = useAuth();
  const { selectedOrganization } = useOrganizationStore();
  const { loadSessions } = useChatStore();
  const chatFavorites = useChatFavorites();
  const chatAssociations = useChatProjectAssociation();

  /**
   * Helper to reload sessions after mutation.
   * CRITICAL: Uses forceReload=true to bypass cache guard in chatStore.
   */
  const reloadSessions = useCallback(async () => {
    try {
      const token = await getToken({ template: "policy-supabase" });
      if (token && selectedOrganization) {
        // CRITICAL: Use forceReload=true to bypass cache guard
        // Without this, the cache guard will prevent reload if sessions already exist
        await loadSessions(token, selectedOrganization.id, true);
      }
    } catch (error) {
      console.error("[useChatActions] Failed to reload sessions:", error);
      // Don't throw - mutation already succeeded, this is just a UI sync issue
      // The next time sessions load naturally, the UI will be correct
    }
  }, [getToken, selectedOrganization, loadSessions]);

  const associateWithProject = useCallback(
    async (chatId: string, projectId: string) => {
      try {
        await chatAssociations.associateWithProject(chatId, projectId);
        await reloadSessions();
      } catch (error) {
        const message = "Failed to associate chat with project";
        console.error(`[useChatActions] ${message}:`, error);
        onError?.(message);
        throw error;
      }
    },
    [chatAssociations, reloadSessions, onError]
  );

  const removeFromProject = useCallback(
    async (chatId: string) => {
      try {
        await chatAssociations.removeFromProject(chatId);
        await reloadSessions();
      } catch (error) {
        const message = "Failed to remove chat from project";
        console.error(`[useChatActions] ${message}:`, error);
        onError?.(message);
        throw error;
      }
    },
    [chatAssociations, reloadSessions, onError]
  );

  const toggleSharing = useCallback(
    async (chatId: string, enabled: boolean) => {
      try {
        await chatAssociations.toggleSharing(chatId, enabled);
        await reloadSessions();
      } catch (error) {
        const message = "Failed to update sharing settings";
        console.error(`[useChatActions] ${message}:`, error);
        onError?.(message);
        throw error;
      }
    },
    [chatAssociations, reloadSessions, onError]
  );

  const toggleFavorite = useCallback(
    async (chatId: string) => {
      try {
        await chatFavorites.toggleFavorite(chatId);
        // Favorites hook updates Zustand directly, but reload to sync across all components
        // This ensures badges update consistently in all locations (sidebar, /chats, project page)
        await reloadSessions();
      } catch (error) {
        const message = "Failed to update favorite status";
        console.error(`[useChatActions] ${message}:`, error);
        onError?.(message);
        throw error;
      }
    },
    [chatFavorites, reloadSessions, onError]
  );

  // General loading state - true if any action is in progress
  const isLoading = useCallback(
    (chatId: string) => {
      return (
        chatAssociations.isAssociating(chatId) ||
        chatAssociations.isTogglingSharing(chatId) ||
        chatFavorites.isToggling(chatId)
      );
    },
    [chatAssociations, chatFavorites]
  );

  // Specific loading states for more granular control
  const isFavoriteLoading = useCallback(
    (chatId: string) => chatFavorites.isToggling(chatId),
    [chatFavorites]
  );

  const isProjectLoading = useCallback(
    (chatId: string) => chatAssociations.isAssociating(chatId),
    [chatAssociations]
  );

  const isSharingLoading = useCallback(
    (chatId: string) => chatAssociations.isTogglingSharing(chatId),
    [chatAssociations]
  );

  return {
    associateWithProject,
    removeFromProject,
    toggleSharing,
    toggleFavorite,
    isLoading,
    isFavoriteLoading,
    isProjectLoading,
    isSharingLoading,
  };
}
