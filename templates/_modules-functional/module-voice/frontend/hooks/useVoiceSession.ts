/**
 * Module Voice - Single Session Hook
 *
 * Hook for working with a specific voice session including real-time transcript
 * streaming, status management, and KB associations.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import type {
  VoiceSession,
  VoiceSessionKb,
  VoiceTranscript,
  VoiceAnalytics,
  UpdateVoiceSessionRequest,
  SpeakerSegment,
  AvailableKb,
} from "../types";
import * as api from "../lib/api";

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseVoiceSessionOptions {
  /** Session ID to load */
  sessionId: string;
  /** Organization ID (required for some operations) */
  orgId: string;
  /** Auto-load session on mount (default: true) */
  autoLoad?: boolean;
  /** Load transcript data (default: false) */
  loadTranscript?: boolean;
  /** Load analytics data (default: false) */
  loadAnalytics?: boolean;
  /** Load KB associations (default: false) */
  loadKbs?: boolean;
  /** Enable real-time WebSocket updates (default: false) */
  enableRealTime?: boolean;
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

export interface UseVoiceSessionReturn {
  // === Session State ===
  /** The session object */
  session: VoiceSession | null;
  /** Whether session is loaded */
  isLoaded: boolean;
  /** Session status */
  status: string | null;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;

  // === Transcript State ===
  /** Stored transcript */
  transcript: VoiceTranscript | null;
  /** Live transcript segments (real-time) */
  liveSegments: SpeakerSegment[];
  /** Transcript loading state */
  transcriptLoading: boolean;

  // === Analytics State ===
  /** Session analytics */
  analytics: VoiceAnalytics | null;
  /** Analytics loading state */
  analyticsLoading: boolean;

  // === KB State ===
  /** Grounded KBs */
  groundedKbs: VoiceSessionKb[];
  /** Available KBs for grounding */
  availableKbs: AvailableKb[];
  /** KBs loading state */
  kbsLoading: boolean;

  // === WebSocket State ===
  /** Whether WebSocket is connected */
  isConnected: boolean;

  // === Session Actions ===
  /** Refresh session data */
  refresh: () => Promise<void>;
  /** Update session */
  update: (input: UpdateVoiceSessionRequest) => Promise<void>;
  /** Delete session */
  remove: () => Promise<void>;
  /** Start session (creates Daily.co room and starts bot) */
  start: () => Promise<void>;

  // === KB Actions ===
  /** Add KB to session */
  addKb: (kbId: string) => Promise<void>;
  /** Remove KB from session */
  removeKb: (kbId: string) => Promise<void>;
  /** Toggle KB enabled status */
  toggleKb: (kbId: string, enabled: boolean) => Promise<void>;
  /** Reload KBs */
  reloadKbs: () => Promise<void>;

  // === WebSocket Actions ===
  /** Connect to WebSocket for real-time updates */
  connect: () => void;
  /** Disconnect from WebSocket */
  disconnect: () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for working with a specific voice session
 *
 * @example
 * ```tsx
 * function SessionDetail({ sessionId }: { sessionId: string }) {
 *   const {
 *     session,
 *     liveSegments,
 *     status,
 *     start,
 *     connect,
 *     isConnected,
 *   } = useVoiceSession({
 *     sessionId,
 *     orgId: currentOrg.id,
 *     enableRealTime: true,
 *   });
 *
 *   useEffect(() => {
 *     if (session?.status === 'active') {
 *       connect();
 *     }
 *   }, [session?.status]);
 *
 *   return (
 *     <div>
 *       <SessionHeader session={session} onStart={start} />
 *       <LiveTranscript segments={liveSegments} />
 *       <DailyFrame roomUrl={session?.dailyRoomUrl} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useVoiceSession(options: UseVoiceSessionOptions): UseVoiceSessionReturn {
  const {
    sessionId,
    orgId,
    autoLoad = true,
    loadTranscript = false,
    loadAnalytics = false,
    loadKbs = false,
    enableRealTime = false,
  } = options;

  // Auth
  const { data: authSession } = useSession();
  const token = (authSession as { accessToken?: string } | null)?.accessToken ?? "";

  // Session state
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transcript state
  const [transcript, setTranscript] = useState<VoiceTranscript | null>(null);
  const [liveSegments, setLiveSegments] = useState<SpeakerSegment[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<VoiceAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // KB state
  const [groundedKbs, setGroundedKbs] = useState<VoiceSessionKb[]>([]);
  const [availableKbs, setAvailableKbs] = useState<AvailableKb[]>([]);
  const [kbsLoading, setKbsLoading] = useState(false);

  // WebSocket state
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Load session
  const loadSession = useCallback(async () => {
    if (!token || !sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.getSession(sessionId, token);
      setSession(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load session";
      setError(message);
      console.error("Failed to load voice session:", err);
    } finally {
      setLoading(false);
    }
  }, [token, sessionId]);

  // Load transcript
  const loadTranscriptData = useCallback(async () => {
    if (!token || !sessionId || !orgId) return;

    setTranscriptLoading(true);
    try {
      const data = await api.getSessionTranscript(sessionId, orgId, token);
      setTranscript(data);
    } catch (err) {
      console.error("Failed to load transcript:", err);
    } finally {
      setTranscriptLoading(false);
    }
  }, [token, sessionId, orgId]);

  // Load analytics
  const loadAnalyticsData = useCallback(async () => {
    if (!token || !sessionId || !orgId) return;

    setAnalyticsLoading(true);
    try {
      const data = await api.getSessionAnalytics(sessionId, orgId, token);
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [token, sessionId, orgId]);

  // Load KBs
  const loadKbsData = useCallback(async () => {
    if (!token || !sessionId || !orgId) return;

    setKbsLoading(true);
    try {
      const [grounded, available] = await Promise.all([
        api.listSessionKbs(sessionId, token),
        api.getAvailableKbs(orgId, session?.workspaceId ?? undefined, token),
      ]);
      setGroundedKbs(grounded);
      
      // Mark already grounded KBs
      const groundedIds = new Set(grounded.map((kb) => kb.kbId));
      setAvailableKbs(
        available.map((kb) => ({
          ...kb,
          isAlreadyGrounded: groundedIds.has(kb.id),
        }))
      );
    } catch (err) {
      console.error("Failed to load KBs:", err);
    } finally {
      setKbsLoading(false);
    }
  }, [token, sessionId, orgId, session?.workspaceId]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && token && sessionId) {
      loadSession();
    }
  }, [autoLoad, token, sessionId, loadSession]);

  // Load additional data when session loads
  useEffect(() => {
    if (session && token) {
      if (loadTranscript) {
        loadTranscriptData();
      }
      if (loadAnalytics) {
        loadAnalyticsData();
      }
      if (loadKbs) {
        loadKbsData();
      }
    }
  }, [session, token, loadTranscript, loadAnalytics, loadKbs, loadTranscriptData, loadAnalyticsData, loadKbsData]);

  // === Session Actions ===

  const refresh = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  const update = useCallback(async (input: UpdateVoiceSessionRequest) => {
    if (!token || !sessionId) throw new Error("Not ready");

    setError(null);
    try {
      const updated = await api.updateSession(sessionId, token, input);
      setSession(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update session";
      setError(message);
      throw err;
    }
  }, [token, sessionId]);

  const remove = useCallback(async () => {
    if (!token || !sessionId) throw new Error("Not ready");

    setError(null);
    try {
      await api.deleteSession(sessionId, token);
      setSession(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete session";
      setError(message);
      throw err;
    }
  }, [token, sessionId]);

  const start = useCallback(async () => {
    if (!token || !sessionId) throw new Error("Not ready");

    setError(null);
    try {
      const updated = await api.startSession(sessionId, token);
      setSession(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start session";
      setError(message);
      throw err;
    }
  }, [token, sessionId]);

  // === KB Actions ===

  const addKb = useCallback(async (kbId: string) => {
    if (!token || !sessionId) throw new Error("Not ready");

    try {
      const newKb = await api.addSessionKb(sessionId, token, { kbId });
      setGroundedKbs((prev) => [...prev, newKb]);
      setAvailableKbs((prev) =>
        prev.map((kb) =>
          kb.id === kbId ? { ...kb, isAlreadyGrounded: true } : kb
        )
      );
    } catch (err) {
      console.error("Failed to add KB:", err);
      throw err;
    }
  }, [token, sessionId]);

  const removeKb = useCallback(async (kbId: string) => {
    if (!token || !sessionId) throw new Error("Not ready");

    try {
      await api.removeSessionKb(sessionId, kbId, token);
      setGroundedKbs((prev) => prev.filter((kb) => kb.kbId !== kbId));
      setAvailableKbs((prev) =>
        prev.map((kb) =>
          kb.id === kbId ? { ...kb, isAlreadyGrounded: false } : kb
        )
      );
    } catch (err) {
      console.error("Failed to remove KB:", err);
      throw err;
    }
  }, [token, sessionId]);

  const toggleKb = useCallback(async (kbId: string, enabled: boolean) => {
    if (!token || !sessionId) throw new Error("Not ready");

    try {
      await api.toggleSessionKb(sessionId, kbId, token, { isEnabled: enabled });
      setGroundedKbs((prev) =>
        prev.map((kb) =>
          kb.kbId === kbId ? { ...kb, isEnabled: enabled } : kb
        )
      );
    } catch (err) {
      console.error("Failed to toggle KB:", err);
      throw err;
    }
  }, [token, sessionId]);

  const reloadKbs = useCallback(async () => {
    await loadKbsData();
  }, [loadKbsData]);

  // === WebSocket ===

  const connect = useCallback(() => {
    if (!token || !sessionId || !enableRealTime) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = api.connectWebSocket(sessionId, token, {
      onTranscript: (segment) => {
        setLiveSegments((prev) => [
          ...prev,
          {
            speaker: segment.speaker,
            text: segment.text,
            start_time: segment.startTime,
            end_time: segment.endTime,
            confidence: segment.confidence,
          },
        ]);
      },
      onStatus: (status) => {
        setSession((prev) => (prev ? { ...prev, status: status as VoiceSession["status"] } : prev));
      },
      onError: (err) => {
        console.error("WebSocket error:", err);
        setIsConnected(false);
      },
      onClose: () => {
        setIsConnected(false);
      },
    });

    if (ws) {
      wsRef.current = ws;
      setIsConnected(true);
    }
  }, [token, sessionId, enableRealTime]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Derived state
  const isLoaded = session !== null;
  const status = session?.status ?? null;

  return {
    // Session state
    session,
    isLoaded,
    status,
    loading,
    error,

    // Transcript state
    transcript,
    liveSegments,
    transcriptLoading,

    // Analytics state
    analytics,
    analyticsLoading,

    // KB state
    groundedKbs,
    availableKbs,
    kbsLoading,

    // WebSocket state
    isConnected,

    // Session actions
    refresh,
    update,
    remove,
    start,

    // KB actions
    addKb,
    removeKb,
    toggleKb,
    reloadKbs,

    // WebSocket actions
    connect,
    disconnect,
  };
}

export default useVoiceSession;
