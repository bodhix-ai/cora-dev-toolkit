/**
 * Module Chat - Session-Specific Hook
 *
 * Hook for working with a specific chat session. Provides focused access
 * to a single session's state and operations.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useShallow } from "zustand/react/shallow";
import { useChatStore } from "../store/chatStore";
import type {
  ChatSession,
  ChatMessage,
  UpdateSessionInput,
  ChatKBGrounding,
  ChatShare,
} from "../types";

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseChatSessionOptions {
  /** Session ID to focus on */
  sessionId: string;
  /** Whether to auto-load session data on mount */
  autoLoad?: boolean;
  /** Whether to auto-load messages */
  loadMessages?: boolean;
  /** Whether to auto-load KB grounding */
  loadKBs?: boolean;
  /** Whether to auto-load shares */
  loadShares?: boolean;
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

export interface UseChatSessionReturn {
  // === Session State ===
  /** The session object */
  session: ChatSession | null;
  /** Whether session exists and is loaded */
  isLoaded: boolean;
  /** Whether current user is owner */
  isOwner: boolean;
  /** Whether current user can edit */
  canEdit: boolean;
  /** Whether current user can delete */
  canDelete: boolean;
  /** Whether session is favorited */
  isFavorited: boolean;

  // === Messages State ===
  /** Session messages */
  messages: ChatMessage[];
  /** Whether more messages available */
  hasMoreMessages: boolean;
  /** Message count */
  messageCount: number;

  // === KB State ===
  /** Grounded KBs */
  groundedKbs: ChatKBGrounding[];
  /** Available KBs for grounding */
  availableKbs: Array<{ id: string; name: string; description?: string }>;

  // === Sharing State ===
  /** Users session is shared with */
  shares: ChatShare[];
  /** Whether shared with workspace */
  isSharedWithWorkspace: boolean;

  // === Loading States ===
  /** Messages loading */
  messagesLoading: boolean;
  /** KBs loading */
  kbsLoading: boolean;
  /** Shares loading */
  sharesLoading: boolean;

  // === Error State ===
  /** Any error */
  error: string | null;

  // === Session Actions ===
  /** Update session (title, sharing) */
  update: (input: UpdateSessionInput) => Promise<void>;
  /** Delete the session */
  delete: () => Promise<void>;
  /** Toggle favorite */
  toggleFavorite: () => Promise<void>;
  /** Rename session */
  rename: (title: string) => Promise<void>;
  /** Toggle workspace sharing */
  toggleWorkspaceSharing: () => Promise<void>;

  // === Message Actions ===
  /** Send a message */
  sendMessage: (content: string, kbIds?: string[]) => Promise<void>;
  /** Load more messages */
  loadMoreMessages: () => Promise<void>;
  /** Reload messages */
  reloadMessages: () => Promise<void>;

  // === KB Actions ===
  /** Add KB to session */
  addKB: (kbId: string) => Promise<void>;
  /** Remove KB from session */
  removeKB: (kbId: string) => Promise<void>;
  /** Reload KBs */
  reloadKBs: () => Promise<void>;

  // === Sharing Actions ===
  /** Share with a user */
  shareWithUser: (email: string, permission: "view" | "edit") => Promise<void>;
  /** Update share permission */
  updateSharePermission: (shareId: string, permission: "view" | "edit") => Promise<void>;
  /** Remove a share */
  removeShare: (shareId: string) => Promise<void>;
  /** Reload shares */
  reloadShares: () => Promise<void>;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for working with a specific chat session
 *
 * @example
 * ```tsx
 * function ChatSessionView({ sessionId }: { sessionId: string }) {
 *   const {
 *     session,
 *     messages,
 *     isOwner,
 *     sendMessage,
 *     toggleFavorite,
 *     groundedKbs,
 *   } = useChatSession({ sessionId, autoLoad: true, loadMessages: true });
 *
 *   if (!session) return <Loading />;
 *
 *   return (
 *     <div>
 *       <SessionHeader
 *         title={session.title}
 *         isOwner={isOwner}
 *         onToggleFavorite={toggleFavorite}
 *       />
 *       <KBGroundingBar kbs={groundedKbs} />
 *       <MessageList messages={messages} />
 *       <MessageInput onSend={sendMessage} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useChatSession(options: UseChatSessionOptions): UseChatSessionReturn {
  const {
    sessionId,
    autoLoad = false,
    loadMessages = false,
    loadKBs = false,
    loadShares = false,
  } = options;

  // Get auth token
  const { data: authSession } = useSession();
  const token = (authSession as { accessToken?: string } | null)?.accessToken ?? "";

  // Select session-specific state
  const session = useChatStore(
    useShallow((state) => state.sessions.find((s) => s.id === sessionId) || null)
  );

  const messages = useChatStore(
    useShallow((state) => state.messagesBySession[sessionId] || [])
  );

  const messagesPagination = useChatStore(
    useShallow((state) => state.messagesPagination[sessionId])
  );

  const groundedKbs = useChatStore(
    useShallow((state) => state.groundedKbsBySession[sessionId] || [])
  );

  const availableKbs = useChatStore(useShallow((state) => state.availableKbs));

  const shares = useChatStore(
    useShallow((state) => state.sharesBySession[sessionId] || [])
  );

  const { messagesLoading, kbsLoading, sharesLoading, messagesError } = useChatStore(
    useShallow((state) => ({
      messagesLoading: state.messagesLoading,
      kbsLoading: state.kbsLoading,
      sharesLoading: state.sharesLoading,
      messagesError: state.messagesError,
    }))
  );

  // Get store actions
  const storeActions = useChatStore(
    useShallow((state) => ({
      selectSession: state.selectSession,
      updateSession: state.updateSession,
      deleteSession: state.deleteSession,
      toggleSessionFavorite: state.toggleSessionFavorite,
      loadMessages: state.loadMessages,
      loadMoreMessages: state.loadMoreMessages,
      sendMessage: state.sendMessage,
      loadGroundedKbs: state.loadGroundedKbs,
      loadAvailableKbs: state.loadAvailableKbs,
      addKbToSession: state.addKbToSession,
      removeKbFromSession: state.removeKbFromSession,
      loadShares: state.loadShares,
      shareChatWithUser: state.shareChatWithUser,
      updateShare: state.updateShare,
      removeShareFromChat: state.removeShareFromChat,
    }))
  );

  // Auto-load on mount
  useEffect(() => {
    if (!token || !sessionId) return;

    if (autoLoad) {
      storeActions.selectSession(token, sessionId);
    }
    if (loadMessages && !messages.length) {
      storeActions.loadMessages(token, sessionId);
    }
    if (loadKBs && !groundedKbs.length) {
      storeActions.loadGroundedKbs(token, sessionId);
      storeActions.loadAvailableKbs(token, sessionId);
    }
    if (loadShares && !shares.length) {
      storeActions.loadShares(token, sessionId);
    }
  }, [
    token,
    sessionId,
    autoLoad,
    loadMessages,
    loadKBs,
    loadShares,
    messages.length,
    groundedKbs.length,
    shares.length,
    storeActions,
  ]);

  // === Derived State ===

  const isOwner = session?.isOwner ?? false;
  const canEdit = session?.canEdit ?? isOwner;
  const canDelete = session?.canDelete ?? isOwner;
  const isFavorited = session?.isFavorited ?? false;
  const isSharedWithWorkspace = session?.isSharedWithWorkspace ?? false;

  // === Wrapped Actions ===

  const update = useCallback(
    async (input: UpdateSessionInput) => {
      if (!token) return;
      await storeActions.updateSession(token, sessionId, input);
    },
    [token, sessionId, storeActions]
  );

  const deleteSession = useCallback(async () => {
    if (!token) return;
    await storeActions.deleteSession(token, sessionId);
  }, [token, sessionId, storeActions]);

  const toggleFavorite = useCallback(async () => {
    if (!token) return;
    await storeActions.toggleSessionFavorite(token, sessionId);
  }, [token, sessionId, storeActions]);

  const rename = useCallback(
    async (title: string) => {
      if (!token) return;
      await storeActions.updateSession(token, sessionId, { title });
    },
    [token, sessionId, storeActions]
  );

  const toggleWorkspaceSharing = useCallback(async () => {
    if (!token || !session) return;
    await storeActions.updateSession(token, sessionId, {
      isSharedWithWorkspace: !session.isSharedWithWorkspace,
    });
  }, [token, sessionId, session, storeActions]);

  const sendMessage = useCallback(
    async (content: string, kbIds?: string[]) => {
      if (!token) return;
      await storeActions.sendMessage(token, sessionId, content, kbIds);
    },
    [token, sessionId, storeActions]
  );

  const loadMoreMessagesAction = useCallback(async () => {
    if (!token) return;
    await storeActions.loadMoreMessages(token, sessionId);
  }, [token, sessionId, storeActions]);

  const reloadMessages = useCallback(async () => {
    if (!token) return;
    await storeActions.loadMessages(token, sessionId);
  }, [token, sessionId, storeActions]);

  const addKB = useCallback(
    async (kbId: string) => {
      if (!token) return;
      await storeActions.addKbToSession(token, sessionId, kbId);
    },
    [token, sessionId, storeActions]
  );

  const removeKB = useCallback(
    async (kbId: string) => {
      if (!token) return;
      await storeActions.removeKbFromSession(token, sessionId, kbId);
    },
    [token, sessionId, storeActions]
  );

  const reloadKBs = useCallback(async () => {
    if (!token) return;
    await storeActions.loadGroundedKbs(token, sessionId);
    await storeActions.loadAvailableKbs(token, sessionId);
  }, [token, sessionId, storeActions]);

  const shareWithUser = useCallback(
    async (email: string, permission: "view" | "edit") => {
      if (!token) return;
      await storeActions.shareChatWithUser(token, sessionId, email, permission);
    },
    [token, sessionId, storeActions]
  );

  const updateSharePermission = useCallback(
    async (shareId: string, permission: "view" | "edit") => {
      if (!token) return;
      await storeActions.updateShare(token, sessionId, shareId, permission);
    },
    [token, sessionId, storeActions]
  );

  const removeShareAction = useCallback(
    async (shareId: string) => {
      if (!token) return;
      await storeActions.removeShareFromChat(token, sessionId, shareId);
    },
    [token, sessionId, storeActions]
  );

  const reloadShares = useCallback(async () => {
    if (!token) return;
    await storeActions.loadShares(token, sessionId);
  }, [token, sessionId, storeActions]);

  // === Return ===

  return useMemo(
    () => ({
      // Session state
      session,
      isLoaded: !!session,
      isOwner,
      canEdit,
      canDelete,
      isFavorited,

      // Messages state
      messages,
      hasMoreMessages: messagesPagination?.hasMore ?? false,
      messageCount: messages.length,

      // KB state
      groundedKbs,
      availableKbs,

      // Sharing state
      shares,
      isSharedWithWorkspace,

      // Loading states
      messagesLoading,
      kbsLoading,
      sharesLoading,

      // Error
      error: messagesError,

      // Session actions
      update,
      delete: deleteSession,
      toggleFavorite,
      rename,
      toggleWorkspaceSharing,

      // Message actions
      sendMessage,
      loadMoreMessages: loadMoreMessagesAction,
      reloadMessages,

      // KB actions
      addKB,
      removeKB,
      reloadKBs,

      // Sharing actions
      shareWithUser,
      updateSharePermission,
      removeShare: removeShareAction,
      reloadShares,
    }),
    [
      session,
      isOwner,
      canEdit,
      canDelete,
      isFavorited,
      messages,
      messagesPagination,
      groundedKbs,
      availableKbs,
      shares,
      isSharedWithWorkspace,
      messagesLoading,
      kbsLoading,
      sharesLoading,
      messagesError,
      update,
      deleteSession,
      toggleFavorite,
      rename,
      toggleWorkspaceSharing,
      sendMessage,
      loadMoreMessagesAction,
      reloadMessages,
      addKB,
      removeKB,
      reloadKBs,
      shareWithUser,
      updateSharePermission,
      removeShareAction,
      reloadShares,
    ]
  );
}

export default useChatSession;
