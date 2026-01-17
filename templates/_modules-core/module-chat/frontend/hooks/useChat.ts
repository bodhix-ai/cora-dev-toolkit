/**
 * Module Chat - Main Chat Hook
 *
 * Primary hook for chat functionality. Provides access to sessions, messages,
 * streaming, and all chat operations. Uses the auth token from the session.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useShallow } from "zustand/react/shallow";
import {
  useChatStore,
  selectCurrentSession,
  selectCurrentMessages,
  selectIsStreaming,
  selectFavoriteSessions,
} from "../store/chatStore";
import type {
  ChatSession,
  ChatMessage,
  CreateSessionInput,
  UpdateSessionInput,
  ListSessionsOptions,
} from "../types";

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseChatOptions {
  /** Workspace ID for workspace-scoped chats (omit for user-level) */
  workspaceId?: string;
  /** Whether to auto-load sessions on mount */
  autoLoad?: boolean;
  /** Initial filters */
  initialFilters?: Partial<ListSessionsOptions>;
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

export interface UseChatReturn {
  // === State ===
  /** All loaded sessions */
  sessions: ChatSession[];
  /** Currently selected session */
  currentSession: ChatSession | null;
  /** Current session ID */
  currentSessionId: string | null;
  /** Messages for current session */
  messages: ChatMessage[];
  /** Favorite sessions */
  favorites: ChatSession[];
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Streaming content (partial response) */
  streamingContent: string;

  // === Loading States ===
  /** Sessions loading */
  sessionsLoading: boolean;
  /** Messages loading */
  messagesLoading: boolean;
  /** Any loading state */
  isLoading: boolean;

  // === Error States ===
  /** Sessions error */
  sessionsError: string | null;
  /** Messages error */
  messagesError: string | null;
  /** Any error */
  error: string | null;

  // === Pagination ===
  /** Whether more sessions available */
  hasMoreSessions: boolean;
  /** Whether more messages available */
  hasMoreMessages: boolean;
  /** Total session count */
  totalSessions: number;

  // === Session Actions ===
  /** Load sessions with optional filters */
  loadSessions: (options?: ListSessionsOptions) => Promise<void>;
  /** Load more sessions (pagination) */
  loadMoreSessions: () => Promise<void>;
  /** Create a new chat session */
  createSession: (input?: CreateSessionInput) => Promise<ChatSession>;
  /** Select/switch to a session */
  selectSession: (sessionId: string) => Promise<void>;
  /** Update session (title, workspace sharing) */
  updateSession: (
    sessionId: string,
    input: UpdateSessionInput
  ) => Promise<void>;
  /** Delete a session */
  deleteSession: (sessionId: string) => Promise<void>;
  /** Toggle favorite status */
  toggleFavorite: (sessionId: string) => Promise<void>;
  /** Clear all loaded sessions */
  clearSessions: () => void;

  // === Message Actions ===
  /** Send a message (starts streaming response) */
  sendMessage: (content: string, kbIds?: string[]) => Promise<void>;
  /** Cancel current streaming */
  cancelStreaming: () => void;
  /** Load more messages (pagination) */
  loadMoreMessages: () => Promise<void>;
  /** Clear current session messages */
  clearMessages: () => void;

  // === Filter Actions ===
  /** Set search filter */
  setSearch: (search: string) => void;
  /** Set favorites-only filter */
  setFavoritesOnly: (favoritesOnly: boolean) => void;
  /** Set sort options */
  setSort: (sortBy: "createdAt" | "updatedAt" | "title", sortOrder: "asc" | "desc") => void;
  /** Get current filters */
  filters: {
    workspaceId: string | null;
    search: string;
    favoritesOnly: boolean;
    sortBy: "createdAt" | "updatedAt" | "title";
    sortOrder: "asc" | "desc";
  };

  // === Utility ===
  /** Clear errors */
  clearError: () => void;
  /** Reset entire store */
  reset: () => void;
  /** Get session by ID */
  getSessionById: (sessionId: string) => ChatSession | null;
  /** Check if user is authenticated */
  isAuthenticated: boolean;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Main hook for chat functionality
 *
 * @example
 * ```tsx
 * function ChatPage() {
 *   const {
 *     sessions,
 *     currentSession,
 *     messages,
 *     isStreaming,
 *     sendMessage,
 *     createSession,
 *   } = useChat({ workspaceId: "ws-123", autoLoad: true });
 *
 *   const handleSend = async (text: string) => {
 *     if (!currentSession) {
 *       await createSession({ title: "New Chat" });
 *     }
 *     await sendMessage(text);
 *   };
 *
 *   return (
 *     <div>
 *       <SessionList sessions={sessions} />
 *       <MessageList messages={messages} isStreaming={isStreaming} />
 *       <MessageInput onSend={handleSend} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { workspaceId, autoLoad = false, initialFilters } = options;

  // Get auth token
  const { data: session, status } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
  const isAuthenticated = status === "authenticated" && !!token;

  // Select store state with shallow comparison for performance
  const {
    sessions,
    currentSessionId,
    sessionsLoading,
    sessionsError,
    sessionFilters,
    sessionsPagination,
    messagesBySession,
    messagesLoading,
    messagesError,
    messagesPagination,
    streaming,
  } = useChatStore(
    useShallow((state) => ({
      sessions: state.sessions,
      currentSessionId: state.currentSessionId,
      sessionsLoading: state.sessionsLoading,
      sessionsError: state.sessionsError,
      sessionFilters: state.sessionFilters,
      sessionsPagination: state.sessionsPagination,
      messagesBySession: state.messagesBySession,
      messagesLoading: state.messagesLoading,
      messagesError: state.messagesError,
      messagesPagination: state.messagesPagination,
      streaming: state.streaming,
    }))
  );

  // Get store actions
  const storeActions = useChatStore(
    useShallow((state) => ({
      loadSessions: state.loadSessions,
      loadMoreSessions: state.loadMoreSessions,
      createSession: state.createSession,
      selectSession: state.selectSession,
      updateSession: state.updateSession,
      deleteSession: state.deleteSession,
      toggleSessionFavorite: state.toggleSessionFavorite,
      setSessionFilters: state.setSessionFilters,
      clearSessions: state.clearSessions,
      loadMoreMessages: state.loadMoreMessages,
      sendMessage: state.sendMessage,
      cancelStreaming: state.cancelStreaming,
      clearMessages: state.clearMessages,
      clearError: state.clearError,
      reset: state.reset,
      getSessionById: state.getSessionById,
    }))
  );

  // Derived state
  const currentSession = useChatStore(selectCurrentSession);
  const messages = useChatStore(selectCurrentMessages);
  const isStreaming = useChatStore(selectIsStreaming);
  const favorites = useChatStore(selectFavoriteSessions);
  const streamingContent = streaming.content;

  // Current session pagination
  const currentMessagesPagination = currentSessionId
    ? messagesPagination[currentSessionId]
    : undefined;

  // Set workspace filter on mount if provided
  useEffect(() => {
    if (workspaceId !== undefined) {
      storeActions.setSessionFilters({ workspaceId });
    }
  }, [workspaceId, storeActions]);

  // Apply initial filters on mount
  useEffect(() => {
    if (initialFilters) {
      storeActions.setSessionFilters(initialFilters);
    }
  }, []); // Only on mount

  // Auto-load sessions on mount if enabled
  useEffect(() => {
    if (autoLoad && isAuthenticated && sessions.length === 0) {
      storeActions.loadSessions(token, { workspaceId });
    }
  }, [autoLoad, isAuthenticated, token, workspaceId, sessions.length, storeActions]);

  // === Wrapped Actions (inject token) ===

  const loadSessions = useCallback(
    async (opts?: ListSessionsOptions) => {
      if (!token) return;
      await storeActions.loadSessions(token, opts);
    },
    [token, storeActions]
  );

  const loadMoreSessions = useCallback(async () => {
    if (!token) return;
    await storeActions.loadMoreSessions(token);
  }, [token, storeActions]);

  const createSession = useCallback(
    async (input?: CreateSessionInput) => {
      if (!token) throw new Error("Not authenticated");
      return storeActions.createSession(token, {
        ...input,
        workspaceId: input?.workspaceId ?? workspaceId,
      });
    },
    [token, workspaceId, storeActions]
  );

  const selectSession = useCallback(
    async (sessionId: string) => {
      if (!token) return;
      await storeActions.selectSession(token, sessionId);
    },
    [token, storeActions]
  );

  const updateSession = useCallback(
    async (sessionId: string, input: UpdateSessionInput) => {
      if (!token) return;
      await storeActions.updateSession(token, sessionId, input);
    },
    [token, storeActions]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!token) return;
      await storeActions.deleteSession(token, sessionId);
    },
    [token, storeActions]
  );

  const toggleFavorite = useCallback(
    async (sessionId: string) => {
      if (!token) return;
      await storeActions.toggleSessionFavorite(token, sessionId);
    },
    [token, storeActions]
  );

  const sendMessage = useCallback(
    async (content: string, kbIds?: string[]) => {
      if (!token || !currentSessionId) return;
      await storeActions.sendMessage(token, currentSessionId, content, kbIds);
    },
    [token, currentSessionId, storeActions]
  );

  const loadMoreMessages = useCallback(async () => {
    if (!token || !currentSessionId) return;
    await storeActions.loadMoreMessages(token, currentSessionId);
  }, [token, currentSessionId, storeActions]);

  const clearMessages = useCallback(() => {
    if (!currentSessionId) return;
    storeActions.clearMessages(currentSessionId);
  }, [currentSessionId, storeActions]);

  // === Filter Actions ===

  const setSearch = useCallback(
    (search: string) => {
      storeActions.setSessionFilters({ search });
    },
    [storeActions]
  );

  const setFavoritesOnly = useCallback(
    (favoritesOnly: boolean) => {
      storeActions.setSessionFilters({ favoritesOnly });
    },
    [storeActions]
  );

  const setSort = useCallback(
    (sortBy: "createdAt" | "updatedAt" | "title", sortOrder: "asc" | "desc") => {
      storeActions.setSessionFilters({ sortBy, sortOrder });
    },
    [storeActions]
  );

  // === Memoized return value ===

  return useMemo(
    () => ({
      // State
      sessions,
      currentSession,
      currentSessionId,
      messages,
      favorites,
      isStreaming,
      streamingContent,

      // Loading
      sessionsLoading,
      messagesLoading,
      isLoading: sessionsLoading || messagesLoading || isStreaming,

      // Errors
      sessionsError,
      messagesError,
      error: sessionsError || messagesError,

      // Pagination
      hasMoreSessions: sessionsPagination.hasMore,
      hasMoreMessages: currentMessagesPagination?.hasMore ?? false,
      totalSessions: sessionsPagination.total,

      // Session actions
      loadSessions,
      loadMoreSessions,
      createSession,
      selectSession,
      updateSession,
      deleteSession,
      toggleFavorite,
      clearSessions: storeActions.clearSessions,

      // Message actions
      sendMessage,
      cancelStreaming: storeActions.cancelStreaming,
      loadMoreMessages,
      clearMessages,

      // Filter actions
      setSearch,
      setFavoritesOnly,
      setSort,
      filters: sessionFilters,

      // Utility
      clearError: storeActions.clearError,
      reset: storeActions.reset,
      getSessionById: storeActions.getSessionById,
      isAuthenticated,
    }),
    [
      sessions,
      currentSession,
      currentSessionId,
      messages,
      favorites,
      isStreaming,
      streamingContent,
      sessionsLoading,
      messagesLoading,
      sessionsError,
      messagesError,
      sessionsPagination,
      currentMessagesPagination,
      sessionFilters,
      loadSessions,
      loadMoreSessions,
      createSession,
      selectSession,
      updateSession,
      deleteSession,
      toggleFavorite,
      sendMessage,
      loadMoreMessages,
      clearMessages,
      setSearch,
      setFavoritesOnly,
      setSort,
      storeActions,
      isAuthenticated,
    ]
  );
}

export default useChat;
