/**
 * Module Chat - Frontend Index
 *
 * Main entry point for the chat module frontend.
 * Exports all types, hooks, API client, components, and pages.
 */

// Types
export * from "./types";

// API Client
export * from "./lib/api";

// Store
export { useChatStore } from "./store/chatStore";

// Hooks
export * from "./hooks";

// Components
export * from "./components";

// Pages (for app route integration)
export * from "./pages";

// Re-export commonly used types for convenience
export type {
  ChatSession,
  ChatMessage,
  ChatKBGrounding,
  ChatShare,
  ChatFavorite,
  MessageRole,
  PermissionLevel,
  ChatAccessType,
  Citation,
  TokenUsage,
  StreamEvent,
  CreateSessionInput,
  UpdateSessionInput,
  StreamMessageInput,
  ListSessionsOptions,
  ListMessagesOptions,
  KBInfo,
} from "./types";
