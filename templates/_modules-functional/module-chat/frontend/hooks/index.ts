/**
 * Module Chat - Hooks Export Barrel
 *
 * All React hooks for the module-chat frontend.
 */

// Main chat hook - primary interface for chat functionality
export { useChat, type UseChatOptions, type UseChatReturn } from "./useChat";

// Session-specific hook - focused operations on a single session
export {
  useChatSession,
  type UseChatSessionOptions,
  type UseChatSessionReturn,
} from "./useChatSession";

// Streaming hook - SSE streaming state and controls
export { useStreaming, type UseStreamingReturn } from "./useStreaming";

// Sharing hook - user sharing management
export {
  useChatSharing,
  type UseChatSharingOptions,
  type UseChatSharingReturn,
} from "./useChatSharing";

// KB Grounding hook - knowledge base grounding management
export {
  useChatKBGrounding,
  type UseChatKBGroundingOptions,
  type UseChatKBGroundingReturn,
} from "./useChatKBGrounding";

// Actions hook - menu actions with loading states (3-dots menu pattern)
export {
  useChatActions,
  type UseChatActionsOptions,
  type UseChatActionsReturn,
  type ChatActionLoadingStates,
} from "./useChatActions";
