/**
 * Module Voice - Sessions Hook
 *
 * Hook for managing voice sessions list with pagination, filtering, and CRUD operations.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import type {
  VoiceSession,
  VoiceSessionSummary,
  CreateVoiceSessionRequest,
} from "../types";
import * as api from "../lib/api";

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseVoiceSessionsOptions {
  /** Organization ID (required) */
  orgId: string;
  /** Workspace ID (optional) - filter sessions by workspace */
  workspaceId?: string;
  /** Filter by status */
  status?: string;
  /** Filter by interview type */
  interviewType?: string;
  /** Items per page (default: 20) */
  pageSize?: number;
  /** Auto-load on mount (default: true) */
  autoLoad?: boolean;
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

export interface UseVoiceSessionsReturn {
  // === State ===
  /** List of sessions */
  sessions: VoiceSessionSummary[];
  /** Total count of sessions */
  totalCount: number;
  /** Current page (0-indexed) */
  page: number;
  /** Whether there are more pages */
  hasMore: boolean;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;

  // === Actions ===
  /** Refresh sessions list */
  refresh: () => Promise<void>;
  /** Load next page */
  loadMore: () => Promise<void>;
  /** Go to specific page */
  goToPage: (page: number) => Promise<void>;
  /** Create a new session */
  create: (input: CreateVoiceSessionRequest) => Promise<VoiceSession>;
  /** Delete a session */
  remove: (sessionId: string) => Promise<void>;

  // === Filter Actions ===
  /** Set status filter */
  setStatusFilter: (status: string | undefined) => void;
  /** Set interview type filter */
  setInterviewTypeFilter: (type: string | undefined) => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for managing voice sessions list
 *
 * @example
 * ```tsx
 * function SessionsList() {
 *   const { sessions, loading, error, create, refresh } = useVoiceSessions({
 *     orgId: currentOrg.id,
 *     workspaceId: currentWorkspace?.id,
 *   });
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <ErrorMessage message={error} />;
 *
 *   return (
 *     <div>
 *       <Button onClick={() => create({ orgId, interviewType: 'technical' })}>
 *         New Session
 *       </Button>
 *       {sessions.map(session => (
 *         <SessionCard key={session.id} session={session} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useVoiceSessions(options: UseVoiceSessionsOptions): UseVoiceSessionsReturn {
  const {
    orgId,
    workspaceId,
    status: initialStatus,
    interviewType: initialInterviewType,
    pageSize = 20,
    autoLoad = true,
  } = options;

  // Auth
  const { data: authSession } = useSession();
  const token = (authSession as { accessToken?: string } | null)?.accessToken ?? "";

  // State
  const [sessions, setSessions] = useState<VoiceSessionSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string | undefined>(initialStatus);
  const [interviewTypeFilter, setInterviewTypeFilter] = useState<string | undefined>(initialInterviewType);

  // Load sessions
  const loadSessions = useCallback(async (pageNum: number, append = false) => {
    if (!token || !orgId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.listSessions(token, {
        orgId,
        workspaceId,
        status: statusFilter,
        interviewType: interviewTypeFilter,
        limit: pageSize,
        offset: pageNum * pageSize,
      });

      if (append) {
        setSessions((prev) => [...prev, ...result]);
      } else {
        setSessions(result);
      }

      // Note: API should return total count in response for proper pagination
      // For now, infer hasMore from result length
      setTotalCount((prev) => append ? prev : result.length);
      setPage(pageNum);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load sessions";
      setError(message);
      console.error("Failed to load voice sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [token, orgId, workspaceId, statusFilter, interviewTypeFilter, pageSize]);

  // Auto-load on mount and when dependencies change
  useEffect(() => {
    if (autoLoad && token && orgId) {
      loadSessions(0);
    }
  }, [autoLoad, token, orgId, workspaceId, statusFilter, interviewTypeFilter, loadSessions]);

  // === Actions ===

  const refresh = useCallback(async () => {
    await loadSessions(0);
  }, [loadSessions]);

  const loadMore = useCallback(async () => {
    await loadSessions(page + 1, true);
  }, [loadSessions, page]);

  const goToPage = useCallback(async (pageNum: number) => {
    await loadSessions(pageNum);
  }, [loadSessions]);

  const create = useCallback(async (input: CreateVoiceSessionRequest): Promise<VoiceSession> => {
    if (!token) throw new Error("Not authenticated");

    setError(null);
    try {
      const session = await api.createSession(token, input);
      // Refresh list to include new session
      await loadSessions(0);
      return session;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create session";
      setError(message);
      throw err;
    }
  }, [token, loadSessions]);

  const remove = useCallback(async (sessionId: string) => {
    if (!token) throw new Error("Not authenticated");

    setError(null);
    try {
      await api.deleteSession(sessionId, token);
      // Remove from local state
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete session";
      setError(message);
      throw err;
    }
  }, [token]);

  // Computed
  const hasMore = useMemo(() => {
    return sessions.length >= (page + 1) * pageSize;
  }, [sessions.length, page, pageSize]);

  return {
    // State
    sessions,
    totalCount,
    page,
    hasMore,
    loading,
    error,

    // Actions
    refresh,
    loadMore,
    goToPage,
    create,
    remove,

    // Filter actions
    setStatusFilter,
    setInterviewTypeFilter,
  };
}

export default useVoiceSessions;
