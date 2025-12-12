import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  sendChatMessage,
  sendChatMessageStream,
  sendChatMessageWithSession,
  listChatSessions,
  getChatSession,
  createChatSession,
  updateChatSession,
  deleteChatSession,
  listKnowledgeBases,
  createKnowledgeBase,
  ChatMessage,
  ChatSession,
  ChatSessionMessage,
  KnowledgeBase,
} from "../lib/api";

// Helper function to generate a meaningful title from a message
function generateTitleFromMessage(message: string): string {
  if (!message || message.trim().length === 0) {
    return "New Chat";
  }

  // Remove leading/trailing whitespace
  const cleaned = message.trim();

  // Try to get first sentence (split by . ! ?)
  const sentences = cleaned.split(/[.!?]/);
  const firstSentence = sentences[0].trim();

  // If first sentence is reasonable length, use it
  if (firstSentence.length > 0 && firstSentence.length <= 50) {
    return firstSentence;
  }

  // If first sentence is too long, truncate to 50 chars
  if (firstSentence.length > 50) {
    return firstSentence.substring(0, 50).trim() + "...";
  }

  // If message is very short but has no sentence ending, use it
  if (cleaned.length <= 50) {
    return cleaned;
  }

  // Truncate long message without sentence endings
  return cleaned.substring(0, 50).trim() + "...";
}

interface Message {
  id: string;
  message: string;
  isUser: boolean;
  timestamp?: string;
  userName?: string;
  tokenUsage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ChatState {
  // Current conversation state
  messages: Message[];
  conversationId: string | null; // For backward compatibility
  loading: boolean;
  error: string | null;
  streaming: boolean;
  streamingContent: string;
  cancelStream: (() => void) | null;
  streamingContentRef: string; // Reference for avoiding stale closures

  // Session management state
  sessions: ChatSession[];
  currentSessionId: string | null;
  sessionsLoading: boolean;
  sessionsError: string | null;
  lastLoadedOrganizationId: string | null; // Track which org sessions were loaded for

  // Knowledge base state
  knowledgeBases: KnowledgeBase[];
  currentKnowledgeBaseId: string | null;
  knowledgeBasesLoading: boolean;
  knowledgeBasesError: string | null;

  // Legacy actions
  sendMessage: (
    message: string,
    token: string,
    context?: { org_name?: string; role?: string }
  ) => Promise<void>;
  sendMessageStream: (
    message: string,
    token: string,
    context?: { org_name?: string; role?: string }
  ) => Promise<void>;
  clearMessages: () => void;
  setError: (error: string | null) => void;
  addMessage: (message: Message) => void;
  cancelCurrentStream: () => void;

  // Session management actions
  loadSessions: (
    token: string,
    organizationId?: string,
    forceReload?: boolean
  ) => Promise<void>;
  createSession: (
    token: string,
    organizationId: string,
    title?: string,
    projectId?: string,
    knowledgeBaseId?: string
  ) => Promise<ChatSession>;
  switchSession: (token: string, sessionId: string) => Promise<void>;
  deleteSession: (token: string, sessionId: string) => Promise<void>;
  renameSession: (
    token: string,
    sessionId: string,
    title: string
  ) => Promise<void>;

  // Knowledge base actions
  loadKnowledgeBases: (token: string) => Promise<void>;
  createKnowledgeBase: (
    token: string,
    name: string,
    organizationId: string,
    description?: string,
    scope?: "organization" | "project",
    projectId?: string
  ) => Promise<KnowledgeBase>;

  // Enhanced messaging with sessions
  sendMessageWithSession: (
    message: string,
    token: string,
    sessionId?: string,
    knowledgeBaseId?: string,
    context?: { org_name?: string; role?: string }
  ) => Promise<void>;

  // Utility actions
  getCurrentSession: () => ChatSession | null;
  getCurrentKnowledgeBase: () => KnowledgeBase | null;
  clearCurrentSession: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Current conversation state
      messages: [],
      conversationId: null,
      loading: false,
      error: null,
      streaming: false,
      streamingContent: "",
      cancelStream: null,
      streamingContentRef: "", // Initialize the ref

      // Session management state
      sessions: [],
      currentSessionId: null,
      sessionsLoading: false,
      sessionsError: null,
      lastLoadedOrganizationId: null,

      // Knowledge base state
      knowledgeBases: [],
      currentKnowledgeBaseId: null,
      knowledgeBasesLoading: false,
      knowledgeBasesError: null,

      // Legacy actions
      sendMessage: async (message, token, context) => {
        // Redirect to streaming method for better user experience
        return get().sendMessageStream(message, token, context);
      },

      sendMessageStream: async (message, token, context) => {
        const { currentSessionId } = get(); // Use current session ID instead of conversationId
        const userMessageContent = message; // Capture user message for title generation

        // Add user message immediately
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          message,
          isUser: true,
          timestamp: new Date().toISOString(),
          userName: context?.role || "You",
        };

        set((state) => ({
          messages: [...state.messages, userMessage],
          loading: true,
          streaming: true,
          streamingContent: "",
          error: null,
        }));

        // Auto-generate title IMMEDIATELY after user sends message (don't wait for AI response)
        // This happens while the AI is generating its response
        if (currentSessionId) {
          const session = get().getCurrentSession();
          if (
            session &&
            (session.title === "New Chat" || session.title === "Untitled Chat")
          ) {
            try {
              const newTitle = generateTitleFromMessage(userMessageContent);
              // Fire and forget - don't await, let it happen in background
              updateChatSession(session.id, newTitle, token)
                .then(() => {
                  // Update Zustand store with new title
                  const sessions = get().sessions;
                  const updatedSessions = sessions.map((s) =>
                    s.id === session.id ? { ...s, title: newTitle } : s
                  );
                  set({ sessions: updatedSessions });
                })
                .catch((error) => {
                  console.error("Failed to auto-generate title:", error);
                  // Non-critical error, don't block the flow
                });
            } catch (error) {
              console.error("Failed to generate title:", error);
            }
          }
        }

        try {
          // Use actual streaming functionality with proper session management
          const cancelStream = sendChatMessageStream(
            message,
            token,
            currentSessionId || undefined, // Use currentSessionId for session continuity
            context,
            // onChunk callback - FIXED: Use get() to avoid stale closure
            (chunk: string) => {
              // CRITICAL FIX: Use get() to access current state, not state parameter
              const currentContent = get().streamingContent;
              const newContent = currentContent + chunk;

              set({
                streamingContent: newContent,
              });
            },
            // onComplete callback
            async (finalMessage: ChatMessage) => {
              const aiMessage: Message = {
                id: finalMessage.id,
                message: finalMessage.message,
                isUser: false,
                timestamp: finalMessage.timestamp,
                tokenUsage: finalMessage.usage,
              };

              // Check if this is a newly created session
              const newSessionId = finalMessage.session_id;
              const previousSessionId = get().currentSessionId;
              const isNewSession =
                newSessionId && newSessionId !== previousSessionId;

              if (isNewSession) {
                // NEW SESSION: Fetch it and add to sessions array
                try {
                  const newSession = await getChatSession(newSessionId, token);

                  // Add new session to array and set as current
                  set((state) => ({
                    sessions: [newSession, ...state.sessions], // Prepend new session
                    currentSessionId: newSessionId,
                    conversationId: newSessionId, // For backward compatibility
                    messages: [...state.messages, aiMessage],
                    loading: false,
                    streaming: false,
                    streamingContent: "",
                    cancelStream: null,
                  }));

                  // Note: Title auto-generation now happens immediately after user sends message
                  // (see above in sendMessageStream), not here in onComplete
                } catch (error) {
                  console.error("Failed to fetch new session:", error);
                  // Still update the ID and message even if fetch fails
                  set((state) => ({
                    messages: [...state.messages, aiMessage],
                    currentSessionId: newSessionId,
                    conversationId: newSessionId,
                    loading: false,
                    streaming: false,
                    streamingContent: "",
                    cancelStream: null,
                  }));
                }
              } else {
                // EXISTING SESSION: Just update messages
                set((state) => ({
                  messages: [...state.messages, aiMessage],
                  loading: false,
                  streaming: false,
                  streamingContent: "",
                  cancelStream: null,
                }));

                // Note: Title auto-generation now happens immediately after user sends message
                // (see above in sendMessageStream), not here in onComplete
              }
            },
            // onError callback
            (error: Error) => {
              console.error("Streaming failed:", error);
              set({
                loading: false,
                streaming: false,
                streamingContent: "",
                cancelStream: null,
                error: error.message,
              });
            }
          );

          // Store the cancel function
          set({ cancelStream });
        } catch (error) {
          console.error("Failed to start streaming:", error);
          set({
            loading: false,
            streaming: false,
            streamingContent: "",
            error:
              error instanceof Error ? error.message : "Failed to send message",
          });
        }
      },

      clearMessages: () => {
        set({
          messages: [],
          conversationId: null,
          error: null,
          streaming: false,
          streamingContent: "",
        });
      },

      setError: (error) => {
        set({ error });
      },

      addMessage: (message) => {
        set((state) => ({
          messages: [...state.messages, message],
        }));
      },

      cancelCurrentStream: () => {
        const { cancelStream } = get();
        if (cancelStream) {
          cancelStream();
          set({
            streaming: false,
            streamingContent: "",
            cancelStream: null,
          });
        }
      },

      // Session management actions
      loadSessions: async (token, organizationId, forceReload = false) => {
        // Guard: Don't load if already loading
        const {
          sessionsLoading: isCurrentlyLoading,
          lastLoadedOrganizationId,
        } = get();
        if (isCurrentlyLoading) {
          return;
        }

        // Auto force reload if organization changed (critical for cache invalidation)
        const organizationChanged =
          organizationId && organizationId !== lastLoadedOrganizationId;
        const shouldForceReload = forceReload || organizationChanged;

        // Guard: Don't load if already have sessions for this SAME organization (unless force reload)
        const { sessions: existingSessions } = get();
        if (existingSessions.length > 0 && !shouldForceReload) {
          return;
        }

        set({ sessionsLoading: true, sessionsError: null });

        try {
          const options = organizationId
            ? { org_id: organizationId, context_type: "all" as const }
            : undefined;

          const response = await listChatSessions(token, options);

          set({
            sessions: [...response.sessions], // Create new array reference to trigger React re-renders
            sessionsLoading: false,
            sessionsError: null,
            lastLoadedOrganizationId: organizationId || null, // Track which org we loaded for
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

      createSession: async (
        token,
        organizationId,
        title,
        projectId,
        knowledgeBaseId
      ) => {
        try {
          const newSession = await createChatSession(
            token,
            organizationId,
            title,
            projectId,
            knowledgeBaseId
          );

          set((state) => ({
            sessions: [newSession, ...state.sessions],
            currentSessionId: newSession.id,
            currentKnowledgeBaseId: knowledgeBaseId || null,
          }));

          return newSession;
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

      switchSession: async (token, sessionId) => {
        try {
          const session = await getChatSession(sessionId, token);

          // Convert ChatSessionMessage[] to Message[]
          const messages: Message[] =
            session.messages?.map((msg) => ({
              id: msg.id,
              message: msg.content,
              isUser: msg.role === "user",
              timestamp: msg.created_at,
              userName:
                msg.role === "user"
                  ? (msg as any).created_by_name || "You"
                  : undefined,
              tokenUsage: msg.metadata?.usage,
            })) || [];

          set({
            currentSessionId: sessionId,
            currentKnowledgeBaseId: session.knowledge_base_id,
            messages,
            conversationId: sessionId, // For backward compatibility
            error: null,
          });
        } catch (error) {
          console.error("Failed to switch session:", error);
          set({
            sessionsError:
              error instanceof Error
                ? error.message
                : "Failed to switch session",
          });
        }
      },

      deleteSession: async (token, sessionId) => {
        try {
          await deleteChatSession(sessionId, token);

          set((state) => {
            const updatedSessions = state.sessions.filter(
              (s) => s.id !== sessionId
            );
            const isCurrentSession = state.currentSessionId === sessionId;

            return {
              sessions: updatedSessions,
              currentSessionId: isCurrentSession
                ? null
                : state.currentSessionId,
              messages: isCurrentSession ? [] : state.messages,
              conversationId: isCurrentSession ? null : state.conversationId,
            };
          });
        } catch (error) {
          console.error("Failed to delete session:", error);
          set({
            sessionsError:
              error instanceof Error
                ? error.message
                : "Failed to delete session",
          });
        }
      },

      renameSession: async (token, sessionId, title) => {
        try {
          const updatedSession = await updateChatSession(
            sessionId,
            title,
            token
          );

          set((state) => ({
            sessions: state.sessions.map((s) => {
              if (s.id === sessionId) {
                // Only update specific fields from API response, preserve everything else
                return {
                  ...s, // Keep all existing data (includes favorites, sharing, etc.)
                  // Only override fields that API actually returns
                  title: updatedSession.title,
                  updated_at: updatedSession.updated_at,
                };
              }
              return s;
            }),
          }));
        } catch (error) {
          console.error("Failed to rename session:", error);
          set({
            sessionsError:
              error instanceof Error
                ? error.message
                : "Failed to rename session",
          });
        }
      },

      // Knowledge base actions
      loadKnowledgeBases: async (token) => {
        set({ knowledgeBasesLoading: true, knowledgeBasesError: null });

        try {
          const response = await listKnowledgeBases(token);
          set({
            knowledgeBases: response.knowledge_bases,
            knowledgeBasesLoading: false,
            knowledgeBasesError: null,
          });
        } catch (error) {
          console.error("Failed to load knowledge bases:", error);
          set({
            knowledgeBasesLoading: false,
            knowledgeBasesError:
              error instanceof Error
                ? error.message
                : "Failed to load knowledge bases",
          });
        }
      },

      createKnowledgeBase: async (
        token,
        name,
        organizationId,
        description,
        scope,
        projectId
      ) => {
        try {
          const newKnowledgeBase = await createKnowledgeBase(
            name,
            organizationId,
            token,
            description,
            scope,
            projectId
          );

          set((state) => ({
            knowledgeBases: [...state.knowledgeBases, newKnowledgeBase],
          }));

          return newKnowledgeBase;
        } catch (error) {
          console.error("Failed to create knowledge base:", error);
          set({
            knowledgeBasesError:
              error instanceof Error
                ? error.message
                : "Failed to create knowledge base",
          });
          throw error;
        }
      },

      // Enhanced messaging with sessions (using streaming for better UX)
      sendMessageWithSession: async (
        message,
        token,
        sessionId,
        knowledgeBaseId,
        context
      ) => {
        // Set the session context and use streaming method
        set((state) => ({
          currentSessionId: sessionId || state.currentSessionId,
          currentKnowledgeBaseId:
            knowledgeBaseId || state.currentKnowledgeBaseId,
        }));

        // Use the streaming method for consistent user experience
        return get().sendMessageStream(message, token, context);
      },

      // Utility actions
      getCurrentSession: () => {
        const { sessions, currentSessionId } = get();
        return sessions.find((s) => s.id === currentSessionId) || null;
      },

      getCurrentKnowledgeBase: () => {
        const { knowledgeBases, currentKnowledgeBaseId } = get();
        return (
          knowledgeBases.find((kb) => kb.id === currentKnowledgeBaseId) || null
        );
      },

      clearCurrentSession: () => {
        set({
          messages: [],
          currentSessionId: null,
          conversationId: null,
          error: null,
          streaming: false,
          streamingContent: "",
        });
      },
    }),
    {
      name: "chat-storage", // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data, not transient UI state
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        messages: state.messages,
        conversationId: state.conversationId,
        knowledgeBases: state.knowledgeBases,
        currentKnowledgeBaseId: state.currentKnowledgeBaseId,
        lastLoadedOrganizationId: state.lastLoadedOrganizationId, // Persist to track org changes
        // Don't persist: loading, error, streaming states, cancelStream
      }),
    }
  )
);

// Expose store on window object for E2E testing (development/test only)
if (
  typeof window !== "undefined" &&
  (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")
) {
  (window as any).useChatStore = useChatStore;
}
