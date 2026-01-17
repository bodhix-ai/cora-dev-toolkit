/**
 * Module Chat - Sharing Hook
 *
 * Hook for managing chat sharing with other users.
 * Provides share list management, permission updates, and workspace sharing.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useShallow } from "zustand/react/shallow";
import { useChatStore } from "../store/chatStore";
import type { ChatShare, PermissionLevel } from "../types";

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseChatSharingOptions {
  /** Session ID to manage sharing for */
  sessionId: string;
  /** Whether to auto-load shares on mount */
  autoLoad?: boolean;
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

export interface UseChatSharingReturn {
  // === State ===
  /** List of shares for this chat */
  shares: ChatShare[];
  /** Whether loading shares */
  isLoading: boolean;
  /** Number of shares */
  shareCount: number;
  /** Whether chat has any shares */
  hasShares: boolean;

  // === Derived State ===
  /** Shares with view permission */
  viewOnlyShares: ChatShare[];
  /** Shares with edit permission */
  editShares: ChatShare[];
  /** Emails of all shared users */
  sharedEmails: string[];

  // === Actions ===
  /** Share chat with a user by email */
  share: (email: string, permission: PermissionLevel) => Promise<void>;
  /** Update a share's permission level */
  updatePermission: (shareId: string, permission: PermissionLevel) => Promise<void>;
  /** Remove a share */
  remove: (shareId: string) => Promise<void>;
  /** Reload shares from server */
  reload: () => Promise<void>;

  // === Helpers ===
  /** Check if chat is shared with a specific email */
  isSharedWith: (email: string) => boolean;
  /** Get permission level for a specific email */
  getPermissionFor: (email: string) => PermissionLevel | null;
  /** Get share ID for a specific email */
  getShareIdFor: (email: string) => string | null;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for managing chat sharing
 *
 * @example
 * ```tsx
 * function ShareChatDialog({ sessionId }: { sessionId: string }) {
 *   const {
 *     shares,
 *     shareCount,
 *     share,
 *     updatePermission,
 *     remove,
 *     isSharedWith,
 *   } = useChatSharing({ sessionId, autoLoad: true });
 *
 *   const [email, setEmail] = useState("");
 *   const [permission, setPermission] = useState<PermissionLevel>("view");
 *
 *   const handleShare = async () => {
 *     if (isSharedWith(email)) {
 *       alert("Already shared with this user");
 *       return;
 *     }
 *     await share(email, permission);
 *     setEmail("");
 *   };
 *
 *   return (
 *     <div>
 *       <h3>Shared with {shareCount} users</h3>
 *       <ShareList
 *         shares={shares}
 *         onUpdatePermission={updatePermission}
 *         onRemove={remove}
 *       />
 *       <div>
 *         <input value={email} onChange={(e) => setEmail(e.target.value)} />
 *         <select value={permission} onChange={(e) => setPermission(e.target.value)}>
 *           <option value="view">View</option>
 *           <option value="edit">Edit</option>
 *         </select>
 *         <button onClick={handleShare}>Share</button>
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useChatSharing(options: UseChatSharingOptions): UseChatSharingReturn {
  const { sessionId, autoLoad = false } = options;

  // Get auth token
  const { data: authSession } = useSession();
  const token = (authSession as { accessToken?: string } | null)?.accessToken ?? "";

  // Select state
  const shares = useChatStore(
    useShallow((state) => state.sharesBySession[sessionId] || [])
  );

  const sharesLoading = useChatStore((state) => state.sharesLoading);

  // Get store actions
  const storeActions = useChatStore(
    useShallow((state) => ({
      loadShares: state.loadShares,
      shareChatWithUser: state.shareChatWithUser,
      updateShare: state.updateShare,
      removeShareFromChat: state.removeShareFromChat,
    }))
  );

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && token && sessionId && shares.length === 0) {
      storeActions.loadShares(token, sessionId);
    }
  }, [autoLoad, token, sessionId, shares.length, storeActions]);

  // === Derived State ===

  const viewOnlyShares = useMemo(
    () => shares.filter((s) => s.permissionLevel === "view"),
    [shares]
  );

  const editShares = useMemo(
    () => shares.filter((s) => s.permissionLevel === "edit"),
    [shares]
  );

  const sharedEmails = useMemo(
    () => shares.map((s) => s.sharedWithEmail).filter(Boolean) as string[],
    [shares]
  );

  // === Actions ===

  const share = useCallback(
    async (email: string, permission: PermissionLevel) => {
      if (!token) return;
      await storeActions.shareChatWithUser(token, sessionId, email, permission);
    },
    [token, sessionId, storeActions]
  );

  const updatePermission = useCallback(
    async (shareId: string, permission: PermissionLevel) => {
      if (!token) return;
      await storeActions.updateShare(token, sessionId, shareId, permission);
    },
    [token, sessionId, storeActions]
  );

  const remove = useCallback(
    async (shareId: string) => {
      if (!token) return;
      await storeActions.removeShareFromChat(token, sessionId, shareId);
    },
    [token, sessionId, storeActions]
  );

  const reload = useCallback(async () => {
    if (!token) return;
    await storeActions.loadShares(token, sessionId);
  }, [token, sessionId, storeActions]);

  // === Helpers ===

  const isSharedWith = useCallback(
    (email: string) => {
      return sharedEmails.some(
        (e) => e.toLowerCase() === email.toLowerCase()
      );
    },
    [sharedEmails]
  );

  const getPermissionFor = useCallback(
    (email: string): PermissionLevel | null => {
      const shareObj = shares.find(
        (s) => s.sharedWithEmail?.toLowerCase() === email.toLowerCase()
      );
      return shareObj?.permissionLevel ?? null;
    },
    [shares]
  );

  const getShareIdFor = useCallback(
    (email: string): string | null => {
      const shareObj = shares.find(
        (s) => s.sharedWithEmail?.toLowerCase() === email.toLowerCase()
      );
      return shareObj?.id ?? null;
    },
    [shares]
  );

  // === Return ===

  return useMemo(
    () => ({
      // State
      shares,
      isLoading: sharesLoading,
      shareCount: shares.length,
      hasShares: shares.length > 0,

      // Derived
      viewOnlyShares,
      editShares,
      sharedEmails,

      // Actions
      share,
      updatePermission,
      remove,
      reload,

      // Helpers
      isSharedWith,
      getPermissionFor,
      getShareIdFor,
    }),
    [
      shares,
      sharesLoading,
      viewOnlyShares,
      editShares,
      sharedEmails,
      share,
      updatePermission,
      remove,
      reload,
      isSharedWith,
      getPermissionFor,
      getShareIdFor,
    ]
  );
}

export default useChatSharing;
