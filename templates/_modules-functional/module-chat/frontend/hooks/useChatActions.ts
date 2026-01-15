/**
 * Module Chat - Chat Actions Hook
 *
 * Hook for common chat actions used in menus and toolbars.
 * Mirrors the 3-dots menu pattern from pm-app-stack's ChatOptionsMenu.
 * Provides loading states for each action type.
 */

import { useCallback, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useShallow } from "zustand/react/shallow";
import { useChatStore } from "../store/chatStore";

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseChatActionsOptions {
  /** Optional callback when an error occurs */
  onError?: (error: string) => void;
  /** Optional callback on successful action */
  onSuccess?: (action: string, chatId: string) => void;
  /** Whether to auto-reload sessions after mutations */
  autoReload?: boolean;
}

// =============================================================================
// LOADING STATE TYPE
// =============================================================================

export interface ChatActionLoadingStates {
  /** Chat IDs currently having favorite toggled */
  favoriting: Set<string>;
  /** Chat IDs currently being renamed */
  renaming: Set<string>;
  /** Chat IDs currently being deleted */
  deleting: Set<string>;
  /** Chat IDs with sharing being toggled */
  sharing: Set<string>;
  /** Chat IDs with KB grounding being modified */
  kbGrounding: Set<string>;
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

export interface UseChatActionsReturn {
  // === Actions ===
  /** Toggle favorite status for a chat */
  toggleFavorite: (chatId: string) => Promise<void>;
  /** Rename a chat */
  rename: (chatId: string, newTitle: string) => Promise<void>;
  /** Delete a chat */
  deleteChat: (chatId: string) => Promise<void>;
  /** Toggle workspace sharing */
  toggleWorkspaceSharing: (chatId: string) => Promise<void>;
  /** Share chat with a user */
  shareWithUser: (chatId: string, email: string, permission: "view" | "edit") => Promise<void>;
  /** Remove a share */
  removeShare: (chatId: string, shareId: string) => Promise<void>;
  /** Copy chat link to clipboard */
  copyLink: (chatId: string) => Promise<void>;
  /** Add KB grounding to a chat */
  addKBGrounding: (chatId: string, kbId: string) => Promise<void>;
  /** Remove KB grounding from a chat */
  removeKBGrounding: (chatId: string, kbId: string) => Promise<void>;

  // === Loading State Checks ===
  /** Check if favorite is loading for a chat */
  isFavoriteLoading: (chatId: string) => boolean;
  /** Check if rename is loading for a chat */
  isRenameLoading: (chatId: string) => boolean;
  /** Check if delete is loading for a chat */
  isDeleteLoading: (chatId: string) => boolean;
  /** Check if sharing is loading for a chat */
  isSharingLoading: (chatId: string) => boolean;
  /** Check if KB grounding is loading for a chat */
  isKBGroundingLoading: (chatId: string) => boolean;
  /** Check if any action is loading for a chat */
  isAnyLoading: (chatId: string) => boolean;

  // === Full Loading State ===
  /** All loading states (for custom checks) */
  loadingStates: ChatActionLoadingStates;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for chat actions typically used in 3-dots menus
 *
 * Mirrors the ChatOptionsMenu pattern from pm-app-stack, providing:
 * - Favorite toggle
 * - Rename
 * - Delete
 * - Workspace sharing toggle
 * - User sharing (share with colleague)
 * - Copy link
 * - KB grounding management
 *
 * @example
 * ```tsx
 * function ChatOptionsMenu({ chatId }: { chatId: string }) {
 *   const {
 *     toggleFavorite,
 *     rename,
 *     deleteChat,
 *     copyLink,
 *     isFavoriteLoading,
 *     isDeleteLoading,
 *   } = useChatActions({
 *     onError: (msg) => toast.error(msg),
 *     onSuccess: (action) => toast.success(`${action} successful`),
 *   });
 *
 *   return (
 *     <Menu>
 *       <MenuItem
 *         onClick={() => toggleFavorite(chatId)}
 *         disabled={isFavoriteLoading(chatId)}
 *       >
 *         Toggle Favorite
 *       </MenuItem>
 *       <MenuItem
 *         onClick={() => deleteChat(chatId)}
 *         disabled={isDeleteLoading(chatId)}
 *       >
 *         Delete
 *       </MenuItem>
 *       <MenuItem onClick={() => copyLink(chatId)}>
 *         Copy Link
 *       </MenuItem>
 *     </Menu>
 *   );
 * }
 * ```
 */
export function useChatActions(options: UseChatActionsOptions = {}): UseChatActionsReturn {
  const { onError, onSuccess, autoReload = false } = options;

  // Get auth token
  const { data: session } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken ?? "";

  // Loading states for each action type
  const [loadingStates, setLoadingStates] = useState<ChatActionLoadingStates>({
    favoriting: new Set(),
    renaming: new Set(),
    deleting: new Set(),
    sharing: new Set(),
    kbGrounding: new Set(),
  });

  // Get store actions
  const storeActions = useChatStore(
    useShallow((state) => ({
      toggleSessionFavorite: state.toggleSessionFavorite,
      updateSession: state.updateSession,
      deleteSession: state.deleteSession,
      loadSessions: state.loadSessions,
      shareChatWithUser: state.shareChatWithUser,
      removeShareFromChat: state.removeShareFromChat,
      addKbToSession: state.addKbToSession,
      removeKbFromSession: state.removeKbFromSession,
    }))
  );

  // Get session filters for reload
  const sessionFilters = useChatStore((state) => state.sessionFilters);

  // === Helper: Set loading state ===
  const setLoading = useCallback(
    (type: keyof ChatActionLoadingStates, chatId: string, isLoading: boolean) => {
      setLoadingStates((prev) => {
        const newSet = new Set(prev[type]);
        if (isLoading) {
          newSet.add(chatId);
        } else {
          newSet.delete(chatId);
        }
        return { ...prev, [type]: newSet };
      });
    },
    []
  );

  // === Helper: Reload sessions if autoReload ===
  const maybeReload = useCallback(async () => {
    if (autoReload && token) {
      await storeActions.loadSessions(token, {
        workspaceId: sessionFilters.workspaceId || undefined,
      });
    }
  }, [autoReload, token, storeActions, sessionFilters]);

  // === Actions ===

  const toggleFavorite = useCallback(
    async (chatId: string) => {
      if (!token) {
        onError?.("Not authenticated");
        return;
      }

      setLoading("favoriting", chatId, true);
      try {
        await storeActions.toggleSessionFavorite(token, chatId);
        onSuccess?.("favorite", chatId);
        await maybeReload();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to toggle favorite";
        onError?.(message);
      } finally {
        setLoading("favoriting", chatId, false);
      }
    },
    [token, storeActions, setLoading, onError, onSuccess, maybeReload]
  );

  const rename = useCallback(
    async (chatId: string, newTitle: string) => {
      if (!token) {
        onError?.("Not authenticated");
        return;
      }

      if (!newTitle.trim()) {
        onError?.("Title cannot be empty");
        return;
      }

      setLoading("renaming", chatId, true);
      try {
        await storeActions.updateSession(token, chatId, { title: newTitle.trim() });
        onSuccess?.("rename", chatId);
        await maybeReload();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to rename chat";
        onError?.(message);
        throw error; // Re-throw for dialog error handling
      } finally {
        setLoading("renaming", chatId, false);
      }
    },
    [token, storeActions, setLoading, onError, onSuccess, maybeReload]
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      if (!token) {
        onError?.("Not authenticated");
        return;
      }

      setLoading("deleting", chatId, true);
      try {
        await storeActions.deleteSession(token, chatId);
        onSuccess?.("delete", chatId);
        // No need to reload - store handles optimistic removal
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete chat";
        onError?.(message);
        throw error;
      } finally {
        setLoading("deleting", chatId, false);
      }
    },
    [token, storeActions, setLoading, onError, onSuccess]
  );

  const toggleWorkspaceSharing = useCallback(
    async (chatId: string) => {
      if (!token) {
        onError?.("Not authenticated");
        return;
      }

      setLoading("sharing", chatId, true);
      try {
        // Get current session to toggle
        const sessions = useChatStore.getState().sessions;
        const session = sessions.find((s) => s.id === chatId);
        const newValue = !(session?.isSharedWithWorkspace ?? false);

        await storeActions.updateSession(token, chatId, {
          isSharedWithWorkspace: newValue,
        });
        onSuccess?.("sharing", chatId);
        await maybeReload();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to toggle sharing";
        onError?.(message);
      } finally {
        setLoading("sharing", chatId, false);
      }
    },
    [token, storeActions, setLoading, onError, onSuccess, maybeReload]
  );

  const shareWithUser = useCallback(
    async (chatId: string, email: string, permission: "view" | "edit") => {
      if (!token) {
        onError?.("Not authenticated");
        return;
      }

      setLoading("sharing", chatId, true);
      try {
        await storeActions.shareChatWithUser(token, chatId, email, permission);
        onSuccess?.("share", chatId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to share chat";
        onError?.(message);
        throw error;
      } finally {
        setLoading("sharing", chatId, false);
      }
    },
    [token, storeActions, setLoading, onError, onSuccess]
  );

  const removeShare = useCallback(
    async (chatId: string, shareId: string) => {
      if (!token) {
        onError?.("Not authenticated");
        return;
      }

      setLoading("sharing", chatId, true);
      try {
        await storeActions.removeShareFromChat(token, chatId, shareId);
        onSuccess?.("unshare", chatId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to remove share";
        onError?.(message);
        throw error;
      } finally {
        setLoading("sharing", chatId, false);
      }
    },
    [token, storeActions, setLoading, onError, onSuccess]
  );

  const copyLink = useCallback(
    async (chatId: string) => {
      try {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        const url = `${baseUrl}/chat/${chatId}`;
        await navigator.clipboard.writeText(url);
        onSuccess?.("copyLink", chatId);
      } catch (error) {
        onError?.("Failed to copy link to clipboard");
      }
    },
    [onError, onSuccess]
  );

  const addKBGrounding = useCallback(
    async (chatId: string, kbId: string) => {
      if (!token) {
        onError?.("Not authenticated");
        return;
      }

      setLoading("kbGrounding", chatId, true);
      try {
        await storeActions.addKbToSession(token, chatId, kbId);
        onSuccess?.("addKB", chatId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add KB";
        onError?.(message);
        throw error;
      } finally {
        setLoading("kbGrounding", chatId, false);
      }
    },
    [token, storeActions, setLoading, onError, onSuccess]
  );

  const removeKBGrounding = useCallback(
    async (chatId: string, kbId: string) => {
      if (!token) {
        onError?.("Not authenticated");
        return;
      }

      setLoading("kbGrounding", chatId, true);
      try {
        await storeActions.removeKbFromSession(token, chatId, kbId);
        onSuccess?.("removeKB", chatId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to remove KB";
        onError?.(message);
        throw error;
      } finally {
        setLoading("kbGrounding", chatId, false);
      }
    },
    [token, storeActions, setLoading, onError, onSuccess]
  );

  // === Loading Checks ===

  const isFavoriteLoading = useCallback(
    (chatId: string) => loadingStates.favoriting.has(chatId),
    [loadingStates.favoriting]
  );

  const isRenameLoading = useCallback(
    (chatId: string) => loadingStates.renaming.has(chatId),
    [loadingStates.renaming]
  );

  const isDeleteLoading = useCallback(
    (chatId: string) => loadingStates.deleting.has(chatId),
    [loadingStates.deleting]
  );

  const isSharingLoading = useCallback(
    (chatId: string) => loadingStates.sharing.has(chatId),
    [loadingStates.sharing]
  );

  const isKBGroundingLoading = useCallback(
    (chatId: string) => loadingStates.kbGrounding.has(chatId),
    [loadingStates.kbGrounding]
  );

  const isAnyLoading = useCallback(
    (chatId: string) =>
      loadingStates.favoriting.has(chatId) ||
      loadingStates.renaming.has(chatId) ||
      loadingStates.deleting.has(chatId) ||
      loadingStates.sharing.has(chatId) ||
      loadingStates.kbGrounding.has(chatId),
    [loadingStates]
  );

  // === Return ===

  return useMemo(
    () => ({
      // Actions
      toggleFavorite,
      rename,
      deleteChat,
      toggleWorkspaceSharing,
      shareWithUser,
      removeShare,
      copyLink,
      addKBGrounding,
      removeKBGrounding,

      // Loading checks
      isFavoriteLoading,
      isRenameLoading,
      isDeleteLoading,
      isSharingLoading,
      isKBGroundingLoading,
      isAnyLoading,

      // Full state
      loadingStates,
    }),
    [
      toggleFavorite,
      rename,
      deleteChat,
      toggleWorkspaceSharing,
      shareWithUser,
      removeShare,
      copyLink,
      addKBGrounding,
      removeKBGrounding,
      isFavoriteLoading,
      isRenameLoading,
      isDeleteLoading,
      isSharingLoading,
      isKBGroundingLoading,
      isAnyLoading,
      loadingStates,
    ]
  );
}

export default useChatActions;
