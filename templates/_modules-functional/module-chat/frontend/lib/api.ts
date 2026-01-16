/**
 * Module Chat - API Client
 *
 * API client functions for chat sessions, messages, KB grounding, sharing, and streaming.
 * Uses the CORA API Gateway with Bearer token authentication.
 */

import type {
  ChatSession,
  ChatMessage,
  ChatKBGrounding,
  ChatShare,
  CreateSessionInput,
  UpdateSessionInput,
  CreateShareInput,
  AddKBGroundingInput,
  StreamMessageInput,
  StreamEvent,
  ListSessionsResponse,
  ListMessagesResponse,
  ListSessionsOptions,
  ListMessagesOptions,
  ConversationHistoryResponse,
  AvailableKBsResponse,
  TokenUsage,
  PermissionLevel,
} from "../types";

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Get the API base URL from environment
 * Uses CORA API Gateway URL, falls back to main API URL
 */
const getApiBase = (): string => {
  if (typeof window !== "undefined") {
    return (
      process.env.NEXT_PUBLIC_CORA_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "/api"
    );
  }
  return process.env.NEXT_PUBLIC_CORA_API_URL || "";
};

// =============================================================================
// HTTP HELPERS
// =============================================================================

/**
 * Standard API error class
 */
export class ChatApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ChatApiError";
  }
}

/**
 * Parse API response with error handling
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const responseText = await response.text();

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorCode: string | undefined;

    try {
      const json = JSON.parse(responseText);
      errorMessage = json.error || json.message || errorMessage;
      errorCode = json.code;
    } catch {
      // Use raw response text if not JSON
      if (responseText) {
        errorMessage = responseText;
      }
    }

    throw new ChatApiError(errorMessage, response.status, errorCode);
  }

  // Handle empty responses (204 No Content)
  if (!responseText || response.status === 204) {
    return {} as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new ChatApiError(
      `Failed to parse API response: ${responseText}`,
      response.status
    );
  }
}

/**
 * Build URL with query parameters
 */
function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const base = getApiBase();
  const url = new URL(endpoint, base.startsWith("http") ? base : `https://placeholder${base}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  // Return just the pathname + search if we used a placeholder
  if (!base.startsWith("http")) {
    return `${base}${url.pathname}${url.search}`;
  }
  return url.toString();
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${getApiBase()}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  // Add Content-Type for requests with body
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return parseResponse<T>(response);
}

// =============================================================================
// SESSION API - WORKSPACE SCOPED
// =============================================================================

/**
 * List chat sessions for a workspace
 * GET /workspaces/{workspaceId}/chats
 */
export async function listWorkspaceChats(
  workspaceId: string,
  token: string,
  options?: ListSessionsOptions
): Promise<ListSessionsResponse> {
  const params: Record<string, string | number | boolean | undefined> = {
    search: options?.search,
    favorites_only: options?.favoritesOnly,
    limit: options?.limit,
    offset: options?.offset,
    sort_by: options?.sortBy,
    sort_order: options?.sortOrder,
  };

  const url = buildUrl(`/workspaces/${workspaceId}/chats`, params);
  return apiRequest<ListSessionsResponse>(url, token);
}

/**
 * Create a new chat session in a workspace
 * POST /workspaces/{workspaceId}/chats
 */
export async function createWorkspaceChat(
  workspaceId: string,
  token: string,
  input?: CreateSessionInput
): Promise<ChatSession> {
  return apiRequest<ChatSession>(`/workspaces/${workspaceId}/chats`, token, {
    method: "POST",
    body: JSON.stringify({
      title: input?.title,
      kb_ids: input?.kbIds,
    }),
  });
}

// =============================================================================
// SESSION API - USER LEVEL
// =============================================================================

/**
 * List user-level chat sessions (personal chats)
 * GET /users/me/chats
 */
export async function listUserChats(
  token: string,
  options?: ListSessionsOptions
): Promise<ListSessionsResponse> {
  const params: Record<string, string | number | boolean | undefined> = {
    search: options?.search,
    favorites_only: options?.favoritesOnly,
    limit: options?.limit,
    offset: options?.offset,
    sort_by: options?.sortBy,
    sort_order: options?.sortOrder,
  };

  const url = buildUrl("/users/me/chats", params);
  return apiRequest<ListSessionsResponse>(url, token);
}

/**
 * Create a new user-level chat session
 * POST /users/me/chats
 */
export async function createUserChat(
  token: string,
  input?: CreateSessionInput
): Promise<ChatSession> {
  return apiRequest<ChatSession>("/users/me/chats", token, {
    method: "POST",
    body: JSON.stringify({
      title: input?.title,
      kb_ids: input?.kbIds,
    }),
  });
}

// =============================================================================
// SESSION API - BY ID
// =============================================================================

/**
 * Get a chat session by ID
 * GET /chats/{sessionId}
 */
export async function getChatSession(
  sessionId: string,
  token: string
): Promise<ChatSession> {
  return apiRequest<ChatSession>(`/chats/${sessionId}`, token);
}

/**
 * Update a chat session
 * PATCH /chats/{sessionId}
 */
export async function updateChatSession(
  sessionId: string,
  token: string,
  input: UpdateSessionInput
): Promise<ChatSession> {
  return apiRequest<ChatSession>(`/chats/${sessionId}`, token, {
    method: "PATCH",
    body: JSON.stringify({
      title: input.title,
      is_shared_with_workspace: input.isSharedWithWorkspace,
    }),
  });
}

/**
 * Delete a chat session (soft delete)
 * DELETE /chats/{sessionId}
 */
export async function deleteChatSession(
  sessionId: string,
  token: string
): Promise<void> {
  await apiRequest<void>(`/chats/${sessionId}`, token, {
    method: "DELETE",
  });
}

// =============================================================================
// MESSAGE API
// =============================================================================

/**
 * List messages for a chat session
 * GET /chats/{sessionId}/messages
 */
export async function listMessages(
  sessionId: string,
  token: string,
  options?: ListMessagesOptions
): Promise<ListMessagesResponse> {
  const params: Record<string, string | number | boolean | undefined> = {
    limit: options?.limit,
    offset: options?.offset,
    before_id: options?.beforeId,
  };

  const url = buildUrl(`/chats/${sessionId}/messages`, params);
  return apiRequest<ListMessagesResponse>(url, token);
}

/**
 * Get a specific message by ID
 * GET /chats/{sessionId}/messages/{messageId}
 */
export async function getMessage(
  sessionId: string,
  messageId: string,
  token: string
): Promise<ChatMessage> {
  return apiRequest<ChatMessage>(
    `/chats/${sessionId}/messages/${messageId}`,
    token
  );
}

/**
 * Get RAG context for a message (without sending)
 * POST /chats/{sessionId}/context
 */
export async function getMessageContext(
  sessionId: string,
  message: string,
  token: string,
  kbIds?: string[]
): Promise<{
  context: string;
  citations: Array<{
    kbId: string;
    kbName: string;
    documentId: string;
    documentName: string;
    content: string;
  }>;
}> {
  return apiRequest(`/chats/${sessionId}/context`, token, {
    method: "POST",
    body: JSON.stringify({
      message,
      kb_ids: kbIds,
    }),
  });
}

/**
 * Get conversation history (for context window)
 * GET /chats/{sessionId}/history
 */
export async function getConversationHistory(
  sessionId: string,
  token: string,
  limit?: number
): Promise<ConversationHistoryResponse> {
  const params = limit ? { limit } : undefined;
  const url = buildUrl(`/chats/${sessionId}/history`, params);
  return apiRequest<ConversationHistoryResponse>(url, token);
}

// =============================================================================
// STREAMING API (SSE)
// =============================================================================

/**
 * Callbacks for streaming events
 */
export interface StreamCallbacks {
  /** Called for each token received */
  onToken?: (content: string) => void;
  /** Called when a citation is received */
  onCitation?: (citation: StreamEvent & { type: "citation" }) => void;
  /** Called when streaming completes */
  onDone?: (messageId: string, usage: TokenUsage) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

/**
 * Stream a chat message with SSE
 * POST /chats/{sessionId}/stream
 *
 * @param sessionId - The chat session ID
 * @param token - Authentication token
 * @param input - Message input with optional KB IDs
 * @param callbacks - Event callbacks
 * @returns AbortController to cancel the stream
 */
export function streamMessage(
  sessionId: string,
  token: string,
  input: StreamMessageInput,
  callbacks: StreamCallbacks
): AbortController {
  const controller = new AbortController();
  const url = `${getApiBase()}/chats/${sessionId}/stream`;

  // Start the streaming request
  (async () => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message: input.message,
          kb_ids: input.kbIds,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Stream request failed: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText;
        }
        throw new ChatApiError(errorMessage, response.status);
      }

      // Check if response is SSE
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("text/event-stream")) {
        // Fallback: might be a regular JSON response
        const json = await response.json();
        if (json.content) {
          callbacks.onToken?.(json.content);
        }
        if (json.messageId && json.usage) {
          callbacks.onDone?.(json.messageId, json.usage);
        }
        return;
      }

      // Process SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const event: StreamEvent = JSON.parse(data);

              switch (event.type) {
                case "token":
                  callbacks.onToken?.(event.content);
                  break;
                case "citation":
                  callbacks.onCitation?.(event);
                  break;
                case "done":
                  callbacks.onDone?.(event.messageId, event.usage);
                  break;
                case "error":
                  callbacks.onError?.(
                    new ChatApiError(event.message, 500, event.code)
                  );
                  break;
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE event:", data, parseError);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Stream was cancelled, don't report as error
        return;
      }
      callbacks.onError?.(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  })();

  return controller;
}

/**
 * Helper function to stream and accumulate the full response
 */
export async function streamMessageAsync(
  sessionId: string,
  token: string,
  input: StreamMessageInput
): Promise<{
  content: string;
  messageId: string;
  usage: TokenUsage;
  citations: Array<StreamEvent & { type: "citation" }>;
}> {
  return new Promise((resolve, reject) => {
    let content = "";
    let messageId = "";
    let usage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    const citations: Array<StreamEvent & { type: "citation" }> = [];

    streamMessage(sessionId, token, input, {
      onToken: (token) => {
        content += token;
      },
      onCitation: (citation) => {
        citations.push(citation);
      },
      onDone: (id, tokenUsage) => {
        messageId = id;
        usage = tokenUsage;
        resolve({ content, messageId, usage, citations });
      },
      onError: (error) => {
        reject(error);
      },
    });
  });
}

// =============================================================================
// KB GROUNDING API
// =============================================================================

/**
 * List knowledge bases grounded to a chat
 * GET /chats/{sessionId}/kbs
 */
export async function listGroundedKbs(
  sessionId: string,
  token: string
): Promise<{ kbs: ChatKBGrounding[] }> {
  return apiRequest(`/chats/${sessionId}/kbs`, token);
}

/**
 * Add KB grounding to a chat
 * POST /chats/{sessionId}/kbs
 */
export async function addKbGrounding(
  sessionId: string,
  token: string,
  input: AddKBGroundingInput
): Promise<ChatKBGrounding> {
  return apiRequest<ChatKBGrounding>(`/chats/${sessionId}/kbs`, token, {
    method: "POST",
    body: JSON.stringify({
      kb_id: input.kbId,
    }),
  });
}

/**
 * Remove KB grounding from a chat
 * DELETE /chats/{sessionId}/kbs/{kbId}
 */
export async function removeKbGrounding(
  sessionId: string,
  kbId: string,
  token: string
): Promise<void> {
  await apiRequest<void>(`/chats/${sessionId}/kbs/${kbId}`, token, {
    method: "DELETE",
  });
}

/**
 * Get available KBs for grounding (based on user access)
 * GET /chats/{sessionId}/kbs/available
 */
export async function getAvailableKbs(
  sessionId: string,
  token: string
): Promise<AvailableKBsResponse> {
  return apiRequest(`/chats/${sessionId}/kbs/available`, token);
}

// =============================================================================
// SHARING API
// =============================================================================

/**
 * List shares for a chat session
 * GET /chats/{sessionId}/shares
 */
export async function listChatShares(
  sessionId: string,
  token: string
): Promise<{ shares: ChatShare[]; canManage: boolean }> {
  return apiRequest(`/chats/${sessionId}/shares`, token);
}

/**
 * Share a chat with a user
 * POST /chats/{sessionId}/shares
 */
export async function shareChat(
  sessionId: string,
  token: string,
  input: CreateShareInput
): Promise<ChatShare> {
  return apiRequest<ChatShare>(`/chats/${sessionId}/shares`, token, {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      permission_level: input.permissionLevel,
    }),
  });
}

/**
 * Update share permission
 * PATCH /chats/{sessionId}/shares/{shareId}
 */
export async function updateSharePermission(
  sessionId: string,
  shareId: string,
  token: string,
  permissionLevel: PermissionLevel
): Promise<ChatShare> {
  return apiRequest<ChatShare>(
    `/chats/${sessionId}/shares/${shareId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({
        permission_level: permissionLevel,
      }),
    }
  );
}

/**
 * Remove a chat share
 * DELETE /chats/{sessionId}/shares/{shareId}
 */
export async function removeShare(
  sessionId: string,
  shareId: string,
  token: string
): Promise<void> {
  await apiRequest<void>(`/chats/${sessionId}/shares/${shareId}`, token, {
    method: "DELETE",
  });
}

// =============================================================================
// FAVORITES API
// =============================================================================

/**
 * Toggle favorite status for a chat
 * POST /chats/{sessionId}/favorite
 */
export async function toggleFavorite(
  sessionId: string,
  token: string
): Promise<{ isFavorited: boolean; sessionId: string }> {
  return apiRequest(`/chats/${sessionId}/favorite`, token, {
    method: "POST",
  });
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Create a chat session (auto-detects workspace vs user-level)
 */
export async function createChat(
  token: string,
  input?: CreateSessionInput
): Promise<ChatSession> {
  if (input?.workspaceId) {
    return createWorkspaceChat(input.workspaceId, token, input);
  }
  return createUserChat(token, input);
}

/**
 * List chats (auto-detects workspace vs user-level)
 */
export async function listChats(
  token: string,
  options?: ListSessionsOptions
): Promise<ListSessionsResponse> {
  if (options?.workspaceId) {
    return listWorkspaceChats(options.workspaceId, token, options);
  }
  return listUserChats(token, options);
}

/**
 * Send a message and get the response via streaming
 * This is the main function for sending chat messages
 */
export async function sendMessage(
  sessionId: string,
  message: string,
  token: string,
  options?: {
    kbIds?: string[];
    onToken?: (content: string) => void;
    onCitation?: (citation: StreamEvent & { type: "citation" }) => void;
  }
): Promise<{
  content: string;
  messageId: string;
  usage: TokenUsage;
  citations: Array<StreamEvent & { type: "citation" }>;
}> {
  return new Promise((resolve, reject) => {
    let content = "";
    let messageId = "";
    let usage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    const citations: Array<StreamEvent & { type: "citation" }> = [];

    streamMessage(
      sessionId,
      token,
      { message, kbIds: options?.kbIds },
      {
        onToken: (token) => {
          content += token;
          options?.onToken?.(token);
        },
        onCitation: (citation) => {
          citations.push(citation);
          options?.onCitation?.(citation);
        },
        onDone: (id, tokenUsage) => {
          messageId = id;
          usage = tokenUsage;
          resolve({ content, messageId, usage, citations });
        },
        onError: reject,
      }
    );
  });
}
