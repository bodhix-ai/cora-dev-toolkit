/**
 * Module Chat - TypeScript Types
 *
 * Type definitions for chat sessions, messages, KB grounding, sharing, and streaming.
 * Aligned with CORA module-chat data model specification.
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Message role types */
export type MessageRole = "user" | "assistant" | "system";

/** Permission levels for chat sharing */
export type PermissionLevel = "view" | "edit";

/** Chat access types (how user gained access) */
export type ChatAccessType = "owner" | "shared" | "workspace";

/** SSE stream event types */
export type StreamEventType = "token" | "citation" | "done" | "error";

// =============================================================================
// CITATION TYPES
// =============================================================================

/**
 * Citation from a knowledge base document
 * Included in assistant messages when RAG is used
 */
export interface Citation {
  /** Knowledge base ID */
  kbId: string;
  /** Knowledge base name for display */
  kbName: string;
  /** Document ID */
  documentId: string;
  /** Document filename for display */
  documentName: string;
  /** Chunk index within the document */
  chunkIndex: number;
  /** Excerpt content from the chunk */
  content: string;
  /** Optional page number (for PDFs) */
  pageNumber?: number;
  /** Relevance score (0-1) */
  relevanceScore?: number;
}

// =============================================================================
// TOKEN USAGE TYPES
// =============================================================================

/**
 * Token usage statistics for a message or session
 */
export interface TokenUsage {
  /** Tokens used in the prompt */
  promptTokens: number;
  /** Tokens used in the completion */
  completionTokens: number;
  /** Total tokens used */
  totalTokens: number;
}

// =============================================================================
// CHAT MESSAGE TYPES
// =============================================================================

/**
 * Message metadata stored in JSONB
 */
export interface MessageMetadata {
  /** Citations from RAG (assistant messages) */
  citations?: Citation[];
  /** AI model used for generation */
  model?: string;
  /** Temperature setting used */
  temperature?: number;
  /** RAG context information */
  ragContext?: {
    /** Original query used for RAG search */
    queryUsed: string;
    /** Number of chunks retrieved */
    chunksRetrieved: number;
    /** KB IDs that were searched */
    kbsSearched: string[];
  };
}

/**
 * Chat message entity
 */
export interface ChatMessage {
  /** Unique message ID */
  id: string;
  /** Parent session ID */
  sessionId: string;
  /** Message role (user/assistant/system) */
  role: MessageRole;
  /** Message content (text) */
  content: string;
  /** Message metadata including citations */
  metadata: MessageMetadata;
  /** Token usage for this message */
  tokenUsage?: TokenUsage;
  /** Whether the response was truncated */
  wasTruncated: boolean;
  /** Creation timestamp */
  createdAt: string;
  /** Creator user ID (for user messages) */
  createdBy?: string;
}

/**
 * Input for creating a new user message
 */
export interface CreateMessageInput {
  /** Message content */
  content: string;
}

// =============================================================================
// CHAT SESSION TYPES
// =============================================================================

/**
 * Session metadata stored in JSONB
 */
export interface SessionMetadata {
  /** Timestamp of last message */
  lastMessageAt?: string;
  /** Total message count */
  messageCount?: number;
  /** Number of participants */
  participantCount?: number;
  /** Cumulative token usage */
  tokenUsage?: TokenUsage;
  /** Default AI model for this chat */
  model?: string;
  /** Default temperature setting */
  temperature?: number;
  /** Default max tokens setting */
  maxTokens?: number;
}

/**
 * Chat session entity
 */
export interface ChatSession {
  /** Unique session ID */
  id: string;
  /** Chat title */
  title: string;
  /** Workspace ID (null for user-level chats) */
  workspaceId: string | null;
  /** Organization ID */
  orgId: string;
  /** Creator user ID */
  createdBy: string;
  /** Whether shared with all workspace members */
  isSharedWithWorkspace: boolean;
  /** Session metadata */
  metadata: SessionMetadata;
  /** Soft delete flag */
  isDeleted: boolean;
  /** Deletion timestamp */
  deletedAt?: string;
  /** Who deleted the chat */
  deletedBy?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Last updater user ID */
  updatedBy?: string;

  // === Computed/Joined Fields ===

  /** Whether current user has favorited this chat */
  isFavorited?: boolean;
  /** When current user favorited (if favorited) */
  favoritedAt?: string;
  /** How the current user has access */
  accessType?: ChatAccessType;
  /** Whether current user is the owner */
  isOwner?: boolean;
  /** Whether current user can edit */
  canEdit?: boolean;
  /** Whether current user can delete */
  canDelete?: boolean;
  /** Messages (when fetched with session) */
  messages?: ChatMessage[];
  /** Grounded knowledge bases */
  groundedKbs?: ChatKBGrounding[];
  /** Share count (for owners) */
  shareCount?: number;
}

/**
 * Input for creating a new chat session
 */
export interface CreateSessionInput {
  /** Optional title (defaults to "New Chat") */
  title?: string;
  /** Workspace ID (omit for user-level chat) */
  workspaceId?: string;
  /** Initial KB IDs to ground the chat */
  kbIds?: string[];
}

/**
 * Input for updating a chat session
 */
export interface UpdateSessionInput {
  /** New title */
  title?: string;
  /** Whether to share with workspace */
  isSharedWithWorkspace?: boolean;
}

// =============================================================================
// KB GROUNDING TYPES
// =============================================================================

/**
 * Knowledge base grounding association
 */
export interface ChatKBGrounding {
  /** Association ID */
  id: string;
  /** Chat session ID */
  sessionId: string;
  /** Knowledge base ID */
  kbId: string;
  /** Whether KB is currently active for this chat */
  isEnabled: boolean;
  /** When KB was added */
  addedAt: string;
  /** Who added the KB */
  addedBy: string;

  // === Joined Fields ===

  /** KB name (for display) */
  kbName?: string;
  /** KB description */
  kbDescription?: string;
  /** Document count in KB */
  documentCount?: number;
}

/**
 * Input for adding KB grounding
 */
export interface AddKBGroundingInput {
  /** Knowledge base ID to add */
  kbId: string;
}

// =============================================================================
// CHAT SHARE TYPES
// =============================================================================

/**
 * Chat share with a specific user
 */
export interface ChatShare {
  /** Share ID */
  id: string;
  /** Chat session ID */
  sessionId: string;
  /** User ID who received access */
  sharedWithUserId: string;
  /** Permission level */
  permissionLevel: PermissionLevel;
  /** Who created the share */
  createdBy: string;
  /** When share was created */
  createdAt: string;

  // === Joined Fields ===

  /** Shared user's email */
  sharedWithEmail?: string;
  /** Shared user's full name */
  sharedWithName?: string;
  /** Sharer's email */
  createdByEmail?: string;
  /** Sharer's full name */
  createdByName?: string;
}

/**
 * Input for creating a chat share
 */
export interface CreateShareInput {
  /** Email of user to share with */
  email: string;
  /** Permission level */
  permissionLevel: PermissionLevel;
}

// =============================================================================
// CHAT FAVORITE TYPES
// =============================================================================

/**
 * Chat favorite for a user
 */
export interface ChatFavorite {
  /** Favorite ID */
  id: string;
  /** Chat session ID */
  sessionId: string;
  /** User who favorited */
  userId: string;
  /** When favorited */
  createdAt: string;
}

// =============================================================================
// SSE STREAMING TYPES
// =============================================================================

/**
 * Base SSE event
 */
interface BaseStreamEvent {
  type: StreamEventType;
}

/**
 * Token streaming event
 */
export interface TokenStreamEvent extends BaseStreamEvent {
  type: "token";
  /** Token content */
  content: string;
}

/**
 * Citation event (sent during streaming)
 */
export interface CitationStreamEvent extends BaseStreamEvent {
  type: "citation";
  /** Citation data */
  data: Citation;
}

/**
 * Stream completion event
 */
export interface DoneStreamEvent extends BaseStreamEvent {
  type: "done";
  /** Final message ID */
  messageId: string;
  /** Token usage for the response */
  usage: TokenUsage;
}

/**
 * Stream error event
 */
export interface ErrorStreamEvent extends BaseStreamEvent {
  type: "error";
  /** Error message */
  message: string;
  /** Error code (optional) */
  code?: string;
}

/**
 * Union type for all stream events
 */
export type StreamEvent =
  | TokenStreamEvent
  | CitationStreamEvent
  | DoneStreamEvent
  | ErrorStreamEvent;

/**
 * Input for streaming a message
 */
export interface StreamMessageInput {
  /** User message content */
  message: string;
  /** Optional KB IDs to use (overrides session grounding) */
  kbIds?: string[];
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  /** Data items */
  data: T[];
  /** Pagination info */
  pagination: {
    /** Total count */
    total: number;
    /** Page limit */
    limit: number;
    /** Current offset */
    offset: number;
    /** Whether more results exist */
    hasMore: boolean;
  };
}

/**
 * List sessions response
 */
export interface ListSessionsResponse extends PaginatedResponse<ChatSession> {
  /** Applied filters */
  filters?: {
    workspaceId?: string;
    search?: string;
    favoritesOnly?: boolean;
  };
}

/**
 * List messages response
 */
export interface ListMessagesResponse extends PaginatedResponse<ChatMessage> {}

/**
 * Conversation history response (for streaming context)
 */
export interface ConversationHistoryResponse {
  /** Session ID */
  sessionId: string;
  /** Recent messages (last N for context) */
  messages: ChatMessage[];
  /** Total message count */
  totalMessages: number;
}

// =============================================================================
// FILTER & QUERY TYPES
// =============================================================================

/**
 * Options for listing sessions
 */
export interface ListSessionsOptions {
  /** Filter by workspace (omit for user-level) */
  workspaceId?: string;
  /** Search in title */
  search?: string;
  /** Only show favorites */
  favoritesOnly?: boolean;
  /** Page limit */
  limit?: number;
  /** Page offset */
  offset?: number;
  /** Sort field */
  sortBy?: "createdAt" | "updatedAt" | "title";
  /** Sort direction */
  sortOrder?: "asc" | "desc";
}

/**
 * Options for listing messages
 */
export interface ListMessagesOptions {
  /** Page limit */
  limit?: number;
  /** Page offset */
  offset?: number;
  /** Only messages before this ID (for infinite scroll) */
  beforeId?: string;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * User info (minimal, for display)
 */
export interface UserInfo {
  /** User ID */
  id: string;
  /** Email */
  email: string;
  /** Full name */
  fullName?: string;
  /** Avatar URL */
  avatarUrl?: string;
}

/**
 * Knowledge base info (minimal, for selection)
 */
export interface KBInfo {
  /** KB ID */
  id: string;
  /** KB name */
  name: string;
  /** KB description */
  description?: string;
  /** Scope (system/org/workspace) */
  scope: "system" | "org" | "workspace";
  /** Document count */
  documentCount?: number;
}

/**
 * Available KBs response (for KB grounding selection)
 */
export interface AvailableKBsResponse {
  /** KBs available for grounding */
  kbs: KBInfo[];
}
