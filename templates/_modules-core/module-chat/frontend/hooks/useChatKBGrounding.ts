/**
 * Module Chat - KB Grounding Hook
 *
 * Hook for managing knowledge base grounding in chat sessions.
 * Provides KB list management, adding/removing KBs, and available KB discovery.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useShallow } from "zustand/react/shallow";
import { useChatStore } from "../store/chatStore";
import type { ChatKBGrounding, KBInfo } from "../types";

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseChatKBGroundingOptions {
  /** Session ID to manage KB grounding for */
  sessionId: string;
  /** Whether to auto-load grounded KBs on mount */
  autoLoad?: boolean;
  /** Whether to also load available KBs */
  loadAvailable?: boolean;
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

export interface UseChatKBGroundingReturn {
  // === State ===
  /** List of grounded KBs for this chat */
  groundedKbs: ChatKBGrounding[];
  /** List of available KBs that can be added */
  availableKbs: KBInfo[];
  /** Whether loading KBs */
  isLoading: boolean;
  /** Number of grounded KBs */
  groundedCount: number;
  /** Whether chat has any grounded KBs */
  hasGroundedKbs: boolean;

  // === Derived State ===
  /** IDs of grounded KBs */
  groundedKbIds: string[];
  /** Names of grounded KBs */
  groundedKbNames: string[];
  /** KBs available but not yet grounded */
  ungroundedAvailableKbs: KBInfo[];

  // === Actions ===
  /** Add a KB to the chat */
  add: (kbId: string) => Promise<void>;
  /** Remove a KB from the chat */
  remove: (kbId: string) => Promise<void>;
  /** Toggle a KB (add if not grounded, remove if grounded) */
  toggle: (kbId: string) => Promise<void>;
  /** Reload grounded KBs from server */
  reload: () => Promise<void>;
  /** Reload available KBs from server */
  reloadAvailable: () => Promise<void>;

  // === Helpers ===
  /** Check if a KB is grounded */
  isGrounded: (kbId: string) => boolean;
  /** Get grounding info for a KB */
  getGrounding: (kbId: string) => ChatKBGrounding | null;
  /** Get KB info by ID (from available or grounded) */
  getKBInfo: (kbId: string) => KBInfo | null;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for managing KB grounding in a chat session
 *
 * @example
 * ```tsx
 * function KBGroundingSelector({ sessionId }: { sessionId: string }) {
 *   const {
 *     groundedKbs,
 *     availableKbs,
 *     ungroundedAvailableKbs,
 *     add,
 *     remove,
 *     toggle,
 *     isGrounded,
 *   } = useChatKBGrounding({
 *     sessionId,
 *     autoLoad: true,
 *     loadAvailable: true,
 *   });
 *
 *   return (
 *     <div>
 *       <h4>Grounded Knowledge Bases</h4>
 *       <div className="grounded-kbs">
 *         {groundedKbs.map((kb) => (
 *           <Chip
 *             key={kb.kbId}
 *             label={kb.kbName}
 *             onDelete={() => remove(kb.kbId)}
 *           />
 *         ))}
 *       </div>
 *
 *       <h4>Available Knowledge Bases</h4>
 *       <div className="available-kbs">
 *         {ungroundedAvailableKbs.map((kb) => (
 *           <button key={kb.id} onClick={() => add(kb.id)}>
 *             + {kb.name}
 *           </button>
 *         ))}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function KBToggleList({ sessionId }: { sessionId: string }) {
 *   const { availableKbs, isGrounded, toggle, isLoading } = useChatKBGrounding({
 *     sessionId,
 *     autoLoad: true,
 *     loadAvailable: true,
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       {availableKbs.map((kb) => (
 *         <label key={kb.id}>
 *           <input
 *             type="checkbox"
 *             checked={isGrounded(kb.id)}
 *             onChange={() => toggle(kb.id)}
 *           />
 *           {kb.name}
 *         </label>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useChatKBGrounding(
  options: UseChatKBGroundingOptions
): UseChatKBGroundingReturn {
  const { sessionId, autoLoad = false, loadAvailable = false } = options;

  // Get auth token
  const { data: authSession } = useSession();
  const token = (authSession as { accessToken?: string } | null)?.accessToken ?? "";

  // Select state
  const groundedKbs = useChatStore(
    useShallow((state) => state.groundedKbsBySession[sessionId] || [])
  );

  const availableKbs = useChatStore(
    useShallow((state) => state.availableKbs)
  );

  const kbsLoading = useChatStore((state) => state.kbsLoading);

  // Get store actions
  const storeActions = useChatStore(
    useShallow((state) => ({
      loadGroundedKbs: state.loadGroundedKbs,
      loadAvailableKbs: state.loadAvailableKbs,
      addKbToSession: state.addKbToSession,
      removeKbFromSession: state.removeKbFromSession,
    }))
  );

  // Auto-load on mount
  useEffect(() => {
    if (!token || !sessionId) return;

    if (autoLoad && groundedKbs.length === 0) {
      storeActions.loadGroundedKbs(token, sessionId);
    }
    if (loadAvailable && availableKbs.length === 0) {
      storeActions.loadAvailableKbs(token, sessionId);
    }
  }, [
    token,
    sessionId,
    autoLoad,
    loadAvailable,
    groundedKbs.length,
    availableKbs.length,
    storeActions,
  ]);

  // === Derived State ===

  const groundedKbIds = useMemo(
    () => groundedKbs.map((kb) => kb.kbId),
    [groundedKbs]
  );

  const groundedKbNames = useMemo(
    () => groundedKbs.map((kb) => kb.kbName).filter(Boolean) as string[],
    [groundedKbs]
  );

  const ungroundedAvailableKbs = useMemo(
    () => availableKbs.filter((kb) => !groundedKbIds.includes(kb.id)),
    [availableKbs, groundedKbIds]
  );

  // === Actions ===

  const add = useCallback(
    async (kbId: string) => {
      if (!token) return;
      await storeActions.addKbToSession(token, sessionId, kbId);
    },
    [token, sessionId, storeActions]
  );

  const remove = useCallback(
    async (kbId: string) => {
      if (!token) return;
      await storeActions.removeKbFromSession(token, sessionId, kbId);
    },
    [token, sessionId, storeActions]
  );

  const toggle = useCallback(
    async (kbId: string) => {
      if (groundedKbIds.includes(kbId)) {
        await remove(kbId);
      } else {
        await add(kbId);
      }
    },
    [groundedKbIds, add, remove]
  );

  const reload = useCallback(async () => {
    if (!token) return;
    await storeActions.loadGroundedKbs(token, sessionId);
  }, [token, sessionId, storeActions]);

  const reloadAvailable = useCallback(async () => {
    if (!token) return;
    await storeActions.loadAvailableKbs(token, sessionId);
  }, [token, sessionId, storeActions]);

  // === Helpers ===

  const isGrounded = useCallback(
    (kbId: string) => groundedKbIds.includes(kbId),
    [groundedKbIds]
  );

  const getGrounding = useCallback(
    (kbId: string): ChatKBGrounding | null => {
      return groundedKbs.find((kb) => kb.kbId === kbId) || null;
    },
    [groundedKbs]
  );

  const getKBInfo = useCallback(
    (kbId: string): KBInfo | null => {
      // First check available KBs
      const available = availableKbs.find((kb) => kb.id === kbId);
      if (available) return available;

      // Fall back to grounded KB info
      const grounded = groundedKbs.find((kb) => kb.kbId === kbId);
      if (grounded) {
        return {
          id: grounded.kbId,
          name: grounded.kbName || "",
          description: grounded.kbDescription,
          scope: "workspace", // Default - actual scope unknown from grounding
          documentCount: grounded.documentCount,
        };
      }

      return null;
    },
    [availableKbs, groundedKbs]
  );

  // === Return ===

  return useMemo(
    () => ({
      // State
      groundedKbs,
      availableKbs,
      isLoading: kbsLoading,
      groundedCount: groundedKbs.length,
      hasGroundedKbs: groundedKbs.length > 0,

      // Derived
      groundedKbIds,
      groundedKbNames,
      ungroundedAvailableKbs,

      // Actions
      add,
      remove,
      toggle,
      reload,
      reloadAvailable,

      // Helpers
      isGrounded,
      getGrounding,
      getKBInfo,
    }),
    [
      groundedKbs,
      availableKbs,
      kbsLoading,
      groundedKbIds,
      groundedKbNames,
      ungroundedAvailableKbs,
      add,
      remove,
      toggle,
      reload,
      reloadAvailable,
      isGrounded,
      getGrounding,
      getKBInfo,
    ]
  );
}

export default useChatKBGrounding;
