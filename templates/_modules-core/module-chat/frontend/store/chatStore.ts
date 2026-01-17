/**
 * Module Chat - Zustand Store
 *
 * State management for chat sessions, messages, streaming, and UI state.
 * Uses the module-chat API client and types.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ChatSession,
  ChatMessage,
  ChatKBGrounding,
  ChatShare,
  Citation,
  TokenUsage,
  ListSessionsOptions,
  ListMessagesOptions,
  CreateSessionInput,
  UpdateSessionInput,
  KBInfo,
} from "../types";
import {
  listChats,
  createChat,
  getChatSession,
  updateChatSession,
  deleteChatSession,
  listMessages,
  streamMessage,
  listGroundedKbs,
  addKbGrounding,
  removeKbGrounding,
  getAvailableKbs,
  listChatShares,
  shareChat,
  updateSharePermission,
  removeShare,
  toggleFavorite,
  ChatApiError,
  type StreamCallbacks,
} from "../lib/api";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a meaningful title from the first user message
 */
function generateTitleFromMessage(message: string): string {
  if (!message || message.trim().length === 0) {
    return "New Chat";
  }

  const cleaned = message.trim();
  const sentences = cleaned.split(/[.!?]/);
  const firstSentence = sentences[0].trim();

  if (firstSentence.length > 0 && firstSentence.length <= 50) {
    return firstSentence;
  }

  if (firstSentence.length > 50) {
    return firstSentence.substring(0, 47).trim() + "...";
  }

  if (cleaned.length <= 50) {
    return cleaned;
  }

  return cleaned.substring(0, 47).trim() + "...";
}

/**
 * Create a temporary user message for optimistic updates
 */
function createOptimisticUserMessage(
  sessionId: string,
  content: string
): ChatMessage {
  return {
    id: `temp-${Date.now()}`,
    sessionId,
    role: "user",
    content,
    metadata: {},
    wasTruncated: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create a temporary assistant message for streaming
 */
function createStreamingAssistantMessage(sessionId: string): ChatMessage {
  return {
    id: `streaming-${Date.now()}`,
    sessionId,
    role: "assistant",
    content: "",
    metadata: {},
    wasTruncated: false,
    createdAt: new Date().toISOString(),
  };
}

// =============================================================================
// STORE TYPES
// =============================================================================

/** Streaming state for current message */
interface StreamingState {
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Accumulated content during streaming */
  content: string;
  /** Citations received during streaming */
  citations: Citation[];
  /** Session being streamed to */
  sessionId: string | null;
  /** Abort controller for cancellation */
  abortController: AbortController | null;
}

/** Filter state for session list */
interface SessionFilters {
  /** Current workspace ID (null for user-level) */
  workspaceId: string | null;
  /** Search query */
  search: string;
  /** Show only favorites */
  favoritesOnly: boolean;
  /** Sort field */
  sortBy: "createdAt" | "updatedAt" | "title";
  /** Sort direction */
  sortOrder: "asc" | "desc";
}

/** Chat store state */
interface ChatState {
  // === Session State ===
  /** All loaded sessions */
  sessions: ChatSession[];
  /** Currently active session ID */
  currentSessionId: string | null;
  /** Session loading state */
  sessionsLoading: boolean;
  /** Session error message */
  sessionsError: string | null;
  /** Session filters */
  sessionFilters: SessionFilters;
  /** Pagination state */
  sessionsPagination: {
    total: number;
    offset: number;
    hasMore: boolean;
  };

  // === Message State ===
  /** Messages for current session (keyed by session ID for caching) */
  messagesBySession: Record<string, ChatMessage[]>;
  /** Messages loading state */
  messagesLoading: boolean;
  /** Messages error */
  messagesError: string | null;
  /** Messages pagination per session */
  messagesPagination: Record<
    string,
    {
      total: number;
      offset: number;
      hasMore: boolean;
    }
  >;

  // === Streaming State ===
  /** Current streaming state */
  streaming: StreamingState;

  // === KB Grounding State ===
  /** Grounded KBs per session */
  groundedKbsBySession: Record<string, ChatKBGrounding[]>;
  /** Available KBs for current session */
  availableKbs: KBInfo[];
  /** KB loading state */
  kbsLoading: boolean;

  // === Sharing State ===
  /** Shares per session */
  sharesBySession: Record<string, ChatShare[]>;
  /** Sharing loading state */
  sharesLoading: boolean;

  // === Session Actions ===
  loadSessions: (token: string, options?: ListSessionsOptions) => Promise<void>;
  loadMoreSessions: (token: string) => Promise<void>;
  createSession: (
    token: string,
    input?: CreateSessionInput
  ) => Promise<ChatSession>;
  selectSession: (token: string, sessionId: string) => Promise<void>;
  updateSession: (
    token: string,
    sessionId: string,
    input: UpdateSessionInput
  ) => Promise<void>;
  deleteSession: (token: string, sessionId: string) => Promise<void>;
  toggleSessionFavorite: (token: string, sessionId: string) => Promise<void>;
  setSessionFilters: (filters: Partial<SessionFilters>) => void;
  clearSessions: () => void;

  // === Message Actions ===
  loadMessages: (
    token: string,
    sessionId: string,
    options?: ListMessagesOptions
  ) => Promise<void>;
  loadMoreMessages: (token: string, sessionId: string) => Promise<void>;
  sendMessage: (
    token: string,
    sessionId: string,
    content: string,
    kbIds?: string[]
  ) => Promise<void>;
  cancelStreaming: () => void;
  clearMessages: (sessionId: string) => void;

  // === KB Actions ===
  loadGroundedKbs: (token: string, sessionId: string) => Promise<void>;
  loadAvailableKbs: (token: string, sessionId: string) => Promise<void>;
  addKbToSession: (
    token: string,
    sessionId: string,
    kbId: string
  ) => Promise<void>;
  removeKbFromSession: (
    token: string,
    sessionId: string,
    kbId: string
  ) => Promise<void>;

  // === Sharing Actions ===
  loadShares: (token: string, sessionId: string) => Promise<void>;
  shareChatWithUser: (
    token: string,
    sessionId: string,
    email: string,
    permission: "view" | "edit"
  ) => Promise<void>;
  updateShare: (
    token: string,
    sessionId: string,
    shareId: string,
    permission: "view" | "edit"
  ) => Promise<void>;
  removeShareFromChat: (
    token: string,
    sessionId: string,
    shareId: string
  ) => Promise<void>;

  // === Utility Actions ===
  getCurrentSession: () => ChatSession | null;
  getCurrentMessages: () => ChatMessage[];
  getSessionById: (sessionId: string) => ChatSession | null;
  clearError: () => void;
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialStreamingState: StreamingState = {
  isStreaming: false,
  content: "",
  citations: [],
  sessionId: null,
  abortController: null,
};

const initialSessionFilters: SessionFilters = {
  workspaceId: null,
  search: "",
  favoritesOnly: false,
  sortBy: "updatedAt",
  sortOrder: "desc",
};

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // === Initial State ===
      sessions: [],
      currentSessionId: null,
      sessionsLoading: false,
      sessionsError: null,
      sessionFilters: initialSessionFilters,
      sessionsPagination: { total: 0, offset: 0, hasMore: false },

      messagesBySession: {},
      messagesLoading: false,
      messagesError: null,
      messagesPagination: {},

      streaming: initialStreamingState,

      groundedKbsBySession: {},
      availableKbs: [],
      kbsLoading: false,

      sharesBySession: {},
      sharesLoading: false,

      // === Session Actions ===

      loadSessions: async (token, options) => {
        const { sessionFilters } = get();

        set({ sessionsLoading: true, sessionsError: null });

        try {
          const mergedOptions: ListSessionsOptions = {
            workspaceId: sessionFilters.workspaceId || undefined,
            search: sessionFilters.search || undefined,
            favoritesOnly: sessionFilters.favoritesOnly || undefined,
            sortBy: sessionFilters.sortBy,
            sortOrder: sessionFilters.sortOrder,
            limit: 20,
            offset: 0,
            ...options,
          };

          const response = await listChats(token, mergedOptions);

          set({
            sessions: response.data,
            sessionsLoading: false,
            sessionsPagination: {
              total: response.pagination.total,
              offset: response.pagination.offset,
              hasMore: response.pagination.hasMore,
            },
          });
        } catch (error) {
          console.error("Failed to load sessions:", error);
          set({
            sessionsLoading: false,
            sessionsError:
              error instanceof Error
                ? error.message
                : "Failed to load sessions",
          });
        }
      },

      loadMoreSessions: async (token) => {
        const { sessionsPagination, sessions, sessionFilters, sessionsLoading } =
          get();

        if (sessionsLoading || !sessionsPagination.hasMore) return;

        set({ sessionsLoading: true });

        try {
          const response = await listChats(token, {
            workspaceId: sessionFilters.workspaceId || undefined,
            search: sessionFilters.search || undefined,
            favoritesOnly: sessionFilters.favoritesOnly || undefined,
            sortBy: sessionFilters.sortBy,
            sortOrder: sessionFilters.sortOrder,
            limit: 20,
            offset: sessionsPagination.offset + 20,
          });

          set({
            sessions: [...sessions, ...response.data],
            sessionsLoading: false,
            sessionsPagination: {
              total: response.pagination.total,
              offset: response.pagination.offset,
              hasMore: response.pagination.hasMore,
            },
          });
        } catch (error) {
          console.error("Failed to load more sessions:", error);
          set({
            sessionsLoading: false,
            sessionsError:
              error instanceof Error
                ? error.message
                : "Failed to load more sessions",
          });
        }
      },

      createSession: async (token, input) => {
        try {
          const session = await createChat(token, input);

          set((state) => ({
            sessions: [session, ...state.sessions],
            currentSessionId: session.id,
            messagesBySession: {
              ...state.messagesBySession,
              [session.id]: [],
            },
          }));

          return session;
        } catch (error) {
          console.error("Failed to create session:", error);
          set({
            sessionsError:
              error instanceof Error
                ? error.message
                : "Failed to create session",
          });
          throw error;
        }
      },

      selectSession: async (token, sessionId) => {
        const { messagesBySession } = get();

        // Set as current immediately
        set({ currentSessionId: sessionId, messagesError: null });

        // Load session details if not cached
        try {
          const session = await getChatSession(sessionId, token);

          // Update session in list
          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === sessionId ? session : s
            ),
          }));

          // Load messages if not cached
          if (!messagesBySession[sessionId]) {
            await get().loadMessages(token, sessionId);
          }
        } catch (error) {
          console.error("Failed to select session:", error);
          set({
            messagesError:
              error instanceof Error
                ? error.message
                : "Failed to load session",
          });
        }
      },

      updateSession: async (token, sessionId, input) => {
        // Optimistic update
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  title: input.title ?? s.title,
                  isSharedWithWorkspace:
                    input.isSharedWithWorkspace ?? s.isSharedWithWorkspace,
                }
              : s
          ),
        }));

        try {
          const updated = await updateChatSession(sessionId, token, input);

          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === sessionId ? { ...s, ...updated } : s
            ),
          }));
        } catch (error) {
          // Revert optimistic update
          console.error("Failed to update session:", error);
          await get().loadSessions(token);
          throw error;
        }
      },

      deleteSession: async (token, sessionId) => {
        const { currentSessionId, sessions } = get();

        // Optimistic removal
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          currentSessionId:
            state.currentSessionId === sessionId
              ? null
              : state.currentSessionId,
        }));

        try {
          await deleteChatSession(sessionId, token);

          // Clean up related state
          set((state) => {
            const { [sessionId]: _messages, ...restMessages } =
              state.messagesBySession;
            const { [sessionId]: _pagination, ...restPagination } =
              state.messagesPagination;
            const { [sessionId]: _kbs, ...restKbs } = state.groundedKbsBySession;
            const { [sessionId]: _shares, ...restShares } =
              state.sharesBySession;

            return {
              messagesBySession: restMessages,
              messagesPagination: restPagination,
              groundedKbsBySession: restKbs,
              sharesBySession: restShares,
            };
          });
        } catch (error) {
          // Revert optimistic removal
          console.error("Failed to delete session:", error);
          set({ sessions, currentSessionId });
          throw error;
        }
      },

      toggleSessionFavorite: async (token, sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) return;

        // Optimistic toggle
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, isFavorited: !s.isFavorited } : s
          ),
        }));

        try {
          const result = await toggleFavorite(sessionId, token);

          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === sessionId ? { ...s, isFavorited: result.isFavorited } : s
            ),
          }));
        } catch (error) {
          // Revert
          console.error("Failed to toggle favorite:", error);
          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === sessionId ? { ...s, isFavorited: session.isFavorited } : s
            ),
          }));
        }
      },

      setSessionFilters: (filters) => {
        set((state) => ({
          sessionFilters: { ...state.sessionFilters, ...filters },
        }));
      },

      clearSessions: () => {
        set({
          sessions: [],
          currentSessionId: null,
          sessionsPagination: { total: 0, offset: 0, hasMore: false },
        });
      },

      // === Message Actions ===

      loadMessages: async (token, sessionId, options) => {
        set({ messagesLoading: true, messagesError: null });

        try {
          const response = await listMessages(sessionId, token, {
            limit: 50,
            ...options,
          });

          set((state) => ({
            messagesBySession: {
              ...state.messagesBySession,
              [sessionId]: response.data,
            },
            messagesLoading: false,
            messagesPagination: {
              ...state.messagesPagination,
              [sessionId]: {
                total: response.pagination.total,
                offset: response.pagination.offset,
                hasMore: response.pagination.hasMore,
              },
            },
          }));
        } catch (error) {
          console.error("Failed to load messages:", error);
          set({
            messagesLoading: false,
            messagesError:
              error instanceof Error
                ? error.message
                : "Failed to load messages",
          });
        }
      },

      loadMoreMessages: async (token, sessionId) => {
        const { messagesPagination, messagesBySession, messagesLoading } = get();
        const pagination = messagesPagination[sessionId];

        if (messagesLoading || !pagination?.hasMore) return;

        set({ messagesLoading: true });

        try {
          const response = await listMessages(sessionId, token, {
            limit: 50,
            offset: pagination.offset + 50,
          });

          set((state) => ({
            messagesBySession: {
              ...state.messagesBySession,
              [sessionId]: [
                ...(state.messagesBySession[sessionId] || []),
                ...response.data,
              ],
            },
            messagesLoading: false,
            messagesPagination: {
              ...state.messagesPagination,
              [sessionId]: {
                total: response.pagination.total,
                offset: response.pagination.offset,
                hasMore: response.pagination.hasMore,
              },
            },
          }));
        } catch (error) {
          console.error("Failed to load more messages:", error);
          set({
            messagesLoading: false,
            messagesError:
              error instanceof Error
                ? error.message
                : "Failed to load more messages",
          });
        }
      },

      sendMessage: async (token, sessionId, content, kbIds) => {
        const { streaming, sessions } = get();

        // Don't allow sending while streaming
        if (streaming.isStreaming) {
          console.warn("Cannot send message while streaming");
          return;
        }

        // Create optimistic user message
        const userMessage = createOptimisticUserMessage(sessionId, content);
        const streamingMessage = createStreamingAssistantMessage(sessionId);
        const abortController = new AbortController();

        // Add user message and start streaming state
        set((state) => ({
          messagesBySession: {
            ...state.messagesBySession,
            [sessionId]: [
              ...(state.messagesBySession[sessionId] || []),
              userMessage,
              streamingMessage,
            ],
          },
          streaming: {
            isStreaming: true,
            content: "",
            citations: [],
            sessionId,
            abortController,
          },
        }));

        // Auto-generate title if session is "New Chat"
        const session = sessions.find((s) => s.id === sessionId);
        if (
          session &&
          (session.title === "New Chat" || session.title === "Untitled Chat")
        ) {
          const newTitle = generateTitleFromMessage(content);
          updateChatSession(sessionId, token, { title: newTitle })
            .then(() => {
              set((state) => ({
                sessions: state.sessions.map((s) =>
                  s.id === sessionId ? { ...s, title: newTitle } : s
                ),
              }));
            })
            .catch((err) => console.error("Failed to auto-title:", err));
        }

        // Set up streaming callbacks
        const callbacks: StreamCallbacks = {
          onToken: (tokenContent) => {
            set((state) => {
              const newContent = state.streaming.content + tokenContent;

              // Update streaming message content
              const messages = state.messagesBySession[sessionId] || [];
              const updatedMessages = messages.map((m) =>
                m.id === streamingMessage.id ? { ...m, content: newContent } : m
              );

              return {
                streaming: { ...state.streaming, content: newContent },
                messagesBySession: {
                  ...state.messagesBySession,
                  [sessionId]: updatedMessages,
                },
              };
            });
          },
          onCitation: (event) => {
            if (event.type === "citation") {
              set((state) => ({
                streaming: {
                  ...state.streaming,
                  citations: [...state.streaming.citations, event.data],
                },
              }));
            }
          },
          onDone: (messageId, usage) => {
            set((state) => {
              const messages = state.messagesBySession[sessionId] || [];

              // Replace streaming message with final message
              const finalMessages = messages.map((m) =>
                m.id === streamingMessage.id
                  ? {
                      ...m,
                      id: messageId,
                      content: state.streaming.content,
                      tokenUsage: usage,
                      metadata: {
                        ...m.metadata,
                        citations: state.streaming.citations,
                      },
                    }
                  : m
              );

              // Also replace the temp user message ID if needed
              // The API should return the real message IDs

              return {
                messagesBySession: {
                  ...state.messagesBySession,
                  [sessionId]: finalMessages,
                },
                streaming: initialStreamingState,
              };
            });
          },
          onError: (error) => {
            console.error("Streaming error:", error);

            set((state) => {
              // Remove streaming message on error
              const messages = state.messagesBySession[sessionId] || [];
              const filteredMessages = messages.filter(
                (m) => m.id !== streamingMessage.id
              );

              return {
                messagesBySession: {
                  ...state.messagesBySession,
                  [sessionId]: filteredMessages,
                },
                streaming: initialStreamingState,
                messagesError:
                  error instanceof Error ? error.message : "Streaming failed",
              };
            });
          },
        };

        // Start streaming
        try {
          streamMessage(sessionId, token, { message: content, kbIds }, callbacks);
        } catch (error) {
          callbacks.onError?.(
            error instanceof Error ? error : new Error(String(error))
          );
        }
      },

      cancelStreaming: () => {
        const { streaming } = get();

        if (streaming.abortController) {
          streaming.abortController.abort();
        }

        // Remove streaming message
        if (streaming.sessionId) {
          set((state) => {
            const messages =
              state.messagesBySession[streaming.sessionId!] || [];
            const filtered = messages.filter(
              (m) => !m.id.startsWith("streaming-")
            );

            return {
              messagesBySession: {
                ...state.messagesBySession,
                [streaming.sessionId!]: filtered,
              },
              streaming: initialStreamingState,
            };
          });
        } else {
          set({ streaming: initialStreamingState });
        }
      },

      clearMessages: (sessionId) => {
        set((state) => {
          const { [sessionId]: _, ...rest } = state.messagesBySession;
          const { [sessionId]: __, ...restPagination } = state.messagesPagination;
          return {
            messagesBySession: rest,
            messagesPagination: restPagination,
          };
        });
      },

      // === KB Actions ===

      loadGroundedKbs: async (token, sessionId) => {
        set({ kbsLoading: true });

        try {
          const response = await listGroundedKbs(sessionId, token);

          set((state) => ({
            groundedKbsBySession: {
              ...state.groundedKbsBySession,
              [sessionId]: response.kbs,
            },
            kbsLoading: false,
          }));
        } catch (error) {
          console.error("Failed to load grounded KBs:", error);
          set({ kbsLoading: false });
        }
      },

      loadAvailableKbs: async (token, sessionId) => {
        set({ kbsLoading: true });

        try {
          const response = await getAvailableKbs(sessionId, token);

          set({
            availableKbs: response.kbs,
            kbsLoading: false,
          });
        } catch (error) {
          console.error("Failed to load available KBs:", error);
          set({ kbsLoading: false });
        }
      },

      addKbToSession: async (token, sessionId, kbId) => {
        try {
          const grounding = await addKbGrounding(sessionId, token, { kbId });

          set((state) => ({
            groundedKbsBySession: {
              ...state.groundedKbsBySession,
              [sessionId]: [
                ...(state.groundedKbsBySession[sessionId] || []),
                grounding,
              ],
            },
          }));
        } catch (error) {
          console.error("Failed to add KB:", error);
          throw error;
        }
      },

      removeKbFromSession: async (token, sessionId, kbId) => {
        // Optimistic removal
        const previousKbs = get().groundedKbsBySession[sessionId] || [];

        set((state) => ({
          groundedKbsBySession: {
            ...state.groundedKbsBySession,
            [sessionId]: (state.groundedKbsBySession[sessionId] || []).filter(
              (kb) => kb.kbId !== kbId
            ),
          },
        }));

        try {
          await removeKbGrounding(sessionId, kbId, token);
        } catch (error) {
          // Revert
          console.error("Failed to remove KB:", error);
          set((state) => ({
            groundedKbsBySession: {
              ...state.groundedKbsBySession,
              [sessionId]: previousKbs,
            },
          }));
          throw error;
        }
      },

      // === Sharing Actions ===

      loadShares: async (token, sessionId) => {
        set({ sharesLoading: true });

        try {
          const response = await listChatShares(sessionId, token);

          set((state) => ({
            sharesBySession: {
              ...state.sharesBySession,
              [sessionId]: response.shares,
            },
            sharesLoading: false,
          }));
        } catch (error) {
          console.error("Failed to load shares:", error);
          set({ sharesLoading: false });
        }
      },

      shareChatWithUser: async (token, sessionId, email, permission) => {
        try {
          const share = await shareChat(sessionId, token, {
            email,
            permissionLevel: permission,
          });

          set((state) => ({
            sharesBySession: {
              ...state.sharesBySession,
              [sessionId]: [...(state.sharesBySession[sessionId] || []), share],
            },
          }));
        } catch (error) {
          console.error("Failed to share chat:", error);
          throw error;
        }
      },

      updateShare: async (token, sessionId, shareId, permission) => {
        try {
          const updated = await updateSharePermission(
            sessionId,
            shareId,
            token,
            permission
          );

          set((state) => ({
            sharesBySession: {
              ...state.sharesBySession,
              [sessionId]: (state.sharesBySession[sessionId] || []).map((s) =>
                s.id === shareId ? updated : s
              ),
            },
          }));
        } catch (error) {
          console.error("Failed to update share:", error);
          throw error;
        }
      },

      removeShareFromChat: async (token, sessionId, shareId) => {
        const previousShares = get().sharesBySession[sessionId] || [];

        // Optimistic removal
        set((state) => ({
          sharesBySession: {
            ...state.sharesBySession,
            [sessionId]: (state.sharesBySession[sessionId] || []).filter(
              (s) => s.id !== shareId
            ),
          },
        }));

        try {
          await removeShare(sessionId, shareId, token);
        } catch (error) {
          // Revert
          console.error("Failed to remove share:", error);
          set((state) => ({
            sharesBySession: {
              ...state.sharesBySession,
              [sessionId]: previousShares,
            },
          }));
          throw error;
        }
      },

      // === Utility Actions ===

      getCurrentSession: () => {
        const { sessions, currentSessionId } = get();
        return sessions.find((s) => s.id === currentSessionId) || null;
      },

      getCurrentMessages: () => {
        const { messagesBySession, currentSessionId } = get();
        if (!currentSessionId) return [];
        return messagesBySession[currentSessionId] || [];
      },

      getSessionById: (sessionId) => {
        return get().sessions.find((s) => s.id === sessionId) || null;
      },

      clearError: () => {
        set({
          sessionsError: null,
          messagesError: null,
        });
      },

      reset: () => {
        // Cancel any ongoing streaming
        const { streaming } = get();
        if (streaming.abortController) {
          streaming.abortController.abort();
        }

        set({
          sessions: [],
          currentSessionId: null,
          sessionsLoading: false,
          sessionsError: null,
          sessionFilters: initialSessionFilters,
          sessionsPagination: { total: 0, offset: 0, hasMore: false },
          messagesBySession: {},
          messagesLoading: false,
          messagesError: null,
          messagesPagination: {},
          streaming: initialStreamingState,
          groundedKbsBySession: {},
          availableKbs: [],
          kbsLoading: false,
          sharesBySession: {},
          sharesLoading: false,
        });
      },
    }),
    {
      name: "module-chat-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        sessionFilters: state.sessionFilters,
        messagesBySession: state.messagesBySession,
        // Don't persist: loading states, errors, streaming, abortController
      }),
      // Skip hydration of streaming state (always start fresh)
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.streaming = initialStreamingState;
          state.sessionsLoading = false;
          state.messagesLoading = false;
          state.kbsLoading = false;
          state.sharesLoading = false;
        }
      },
    }
  )
);

// =============================================================================
// SELECTORS (for performance optimization)
// =============================================================================

/** Select current session */
export const selectCurrentSession = (state: ChatState) =>
  state.sessions.find((s) => s.id === state.currentSessionId) || null;

/** Select current messages */
export const selectCurrentMessages = (state: ChatState) =>
  state.currentSessionId
    ? state.messagesBySession[state.currentSessionId] || []
    : [];

/** Select streaming state */
export const selectIsStreaming = (state: ChatState) =>
  state.streaming.isStreaming;

/** Select streaming content */
export const selectStreamingContent = (state: ChatState) =>
  state.streaming.content;

/** Select grounded KBs for current session */
export const selectCurrentGroundedKbs = (state: ChatState) =>
  state.currentSessionId
    ? state.groundedKbsBySession[state.currentSessionId] || []
    : [];

/** Select shares for current session */
export const selectCurrentShares = (state: ChatState) =>
  state.currentSessionId
    ? state.sharesBySession[state.currentSessionId] || []
    : [];

/** Select favorite sessions */
export const selectFavoriteSessions = (state: ChatState) =>
  state.sessions.filter((s) => s.isFavorited);

// =============================================================================
// DEVELOPMENT HELPERS
// =============================================================================

// Expose store for E2E testing
if (
  typeof window !== "undefined" &&
  (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")
) {
  (window as unknown as { useModuleChatStore: typeof useChatStore }).useModuleChatStore =
    useChatStore;
}
