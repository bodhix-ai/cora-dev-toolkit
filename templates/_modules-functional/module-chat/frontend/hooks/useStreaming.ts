/**
 * Module Chat - Streaming Hook
 *
 * Hook for managing SSE streaming state during AI response generation.
 * Provides streaming content, citations, and cancellation controls.
 */

import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useChatStore,
  selectIsStreaming,
  selectStreamingContent,
} from "../store/chatStore";
import type { Citation } from "../types";

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

export interface UseStreamingReturn {
  // === State ===
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Accumulated streaming content */
  content: string;
  /** Citations received during streaming */
  citations: Citation[];
  /** Session ID being streamed to */
  sessionId: string | null;
  /** Whether stream can be cancelled */
  canCancel: boolean;

  // === Derived State ===
  /** Word count of streaming content */
  wordCount: number;
  /** Character count of streaming content */
  charCount: number;
  /** Whether content is empty */
  isEmpty: boolean;
  /** Citation count */
  citationCount: number;

  // === Actions ===
  /** Cancel the current stream */
  cancel: () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for monitoring and controlling streaming state
 *
 * @example
 * ```tsx
 * function StreamingIndicator() {
 *   const {
 *     isStreaming,
 *     content,
 *     citations,
 *     wordCount,
 *     cancel,
 *   } = useStreaming();
 *
 *   if (!isStreaming) return null;
 *
 *   return (
 *     <div className="streaming-indicator">
 *       <span>Generating response...</span>
 *       <span>{wordCount} words</span>
 *       <span>{citations.length} citations</span>
 *       <button onClick={cancel}>Stop</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function StreamingResponse() {
 *   const { isStreaming, content, citations, isEmpty } = useStreaming();
 *
 *   if (!isStreaming || isEmpty) return null;
 *
 *   return (
 *     <div className="streaming-response">
 *       <MarkdownRenderer content={content} />
 *       {citations.length > 0 && (
 *         <CitationList citations={citations} />
 *       )}
 *       <TypingIndicator />
 *     </div>
 *   );
 * }
 * ```
 */
export function useStreaming(): UseStreamingReturn {
  // Select streaming state
  const streaming = useChatStore(
    useShallow((state) => state.streaming)
  );

  // Individual selectors for performance
  const isStreaming = useChatStore(selectIsStreaming);
  const content = useChatStore(selectStreamingContent);

  // Get cancel action
  const cancelStreaming = useChatStore((state) => state.cancelStreaming);

  // === Derived State ===

  const wordCount = useMemo(() => {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  const charCount = useMemo(() => {
    return content?.length ?? 0;
  }, [content]);

  const isEmpty = !content || content.trim().length === 0;
  const citationCount = streaming.citations.length;
  const canCancel = isStreaming && streaming.abortController !== null;

  // === Actions ===

  const cancel = useCallback(() => {
    if (canCancel) {
      cancelStreaming();
    }
  }, [canCancel, cancelStreaming]);

  // === Return ===

  return useMemo(
    () => ({
      // State
      isStreaming,
      content,
      citations: streaming.citations,
      sessionId: streaming.sessionId,
      canCancel,

      // Derived
      wordCount,
      charCount,
      isEmpty,
      citationCount,

      // Actions
      cancel,
    }),
    [
      isStreaming,
      content,
      streaming.citations,
      streaming.sessionId,
      canCancel,
      wordCount,
      charCount,
      isEmpty,
      citationCount,
      cancel,
    ]
  );
}

export default useStreaming;
