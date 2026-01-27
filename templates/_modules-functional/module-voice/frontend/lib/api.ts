/**
 * Module Voice - API Client
 *
 * API client functions for voice sessions, configs, credentials, transcripts,
 * analytics, and KB grounding. Uses the CORA API Gateway with Bearer token authentication.
 */

import type {
  VoiceSession,
  VoiceSessionSummary,
  VoiceConfig,
  VoiceCredential,
  VoiceTranscript,
  VoiceAnalytics,
  VoiceSessionKb,
  VoiceApiResponse,
  VoiceOrgStats,
  CreateVoiceSessionRequest,
  UpdateVoiceSessionRequest,
  CreateVoiceConfigRequest,
  UpdateVoiceConfigRequest,
  CreateVoiceCredentialRequest,
  AddVoiceSessionKbRequest,
  ToggleVoiceSessionKbRequest,
  AvailableKb,
} from "../types";

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Get the API base URL from environment
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
export class VoiceApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "VoiceApiError";
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
      if (responseText) {
        errorMessage = responseText;
      }
    }

    throw new VoiceApiError(errorMessage, response.status, errorCode);
  }

  // Handle empty responses (204 No Content)
  if (!responseText || response.status === 204) {
    return {} as T;
  }

  try {
    const json = JSON.parse(responseText);
    // Handle CORA API response wrapper: { success: boolean, data: T }
    // If response has success=true and data field, unwrap it
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data as T;
    }
    return json as T;
  } catch {
    throw new VoiceApiError(
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
// SESSION API
// =============================================================================

export interface ListSessionsOptions {
  orgId: string;
  workspaceId?: string;
  status?: string;
  interviewType?: string;
  limit?: number;
  offset?: number;
}

/**
 * List voice sessions
 * GET /voice/sessions
 */
export async function listSessions(
  token: string,
  options: ListSessionsOptions
): Promise<VoiceSessionSummary[]> {
  const params: Record<string, string | number | boolean | undefined> = {
    orgId: options.orgId,
    workspaceId: options.workspaceId,
    status: options.status,
    interviewType: options.interviewType,
    limit: options.limit,
    offset: options.offset,
  };

  const url = buildUrl("/voice/sessions", params);
  return apiRequest<VoiceSessionSummary[]>(url, token);
}

/**
 * Get a voice session by ID
 * GET /voice/sessions/{sessionId}
 */
export async function getSession(
  sessionId: string,
  token: string
): Promise<VoiceSession> {
  return apiRequest<VoiceSession>(`/voice/sessions/${sessionId}`, token);
}

/**
 * Create a new voice session
 * POST /voice/sessions
 */
export async function createSession(
  token: string,
  input: CreateVoiceSessionRequest
): Promise<VoiceSession> {
  return apiRequest<VoiceSession>("/voice/sessions", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Update a voice session
 * PUT /voice/sessions/{sessionId}
 */
export async function updateSession(
  sessionId: string,
  token: string,
  input: UpdateVoiceSessionRequest
): Promise<VoiceSession> {
  return apiRequest<VoiceSession>(`/voice/sessions/${sessionId}`, token, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/**
 * Delete a voice session
 * DELETE /voice/sessions/{sessionId}
 */
export async function deleteSession(
  sessionId: string,
  token: string
): Promise<void> {
  await apiRequest<void>(`/voice/sessions/${sessionId}`, token, {
    method: "DELETE",
  });
}

/**
 * Start a voice session (creates Daily.co room and starts bot)
 * POST /voice/sessions/{sessionId}/start
 */
export async function startSession(
  sessionId: string,
  token: string
): Promise<VoiceSession> {
  return apiRequest<VoiceSession>(`/voice/sessions/${sessionId}/start`, token, {
    method: "POST",
  });
}

// =============================================================================
// SESSION KB API
// =============================================================================

/**
 * List KB associations for a session
 * GET /voice/sessions/{sessionId}/kbs
 */
export async function listSessionKbs(
  sessionId: string,
  token: string
): Promise<VoiceSessionKb[]> {
  return apiRequest<VoiceSessionKb[]>(`/voice/sessions/${sessionId}/kbs`, token);
}

/**
 * Add a KB to a session
 * POST /voice/sessions/{sessionId}/kbs
 */
export async function addSessionKb(
  sessionId: string,
  token: string,
  input: AddVoiceSessionKbRequest
): Promise<VoiceSessionKb> {
  return apiRequest<VoiceSessionKb>(`/voice/sessions/${sessionId}/kbs`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Toggle KB enabled status for a session
 * PUT /voice/sessions/{sessionId}/kbs/{kbId}
 */
export async function toggleSessionKb(
  sessionId: string,
  kbId: string,
  token: string,
  input: ToggleVoiceSessionKbRequest
): Promise<VoiceSessionKb> {
  return apiRequest<VoiceSessionKb>(`/voice/sessions/${sessionId}/kbs/${kbId}`, token, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/**
 * Remove a KB from a session
 * DELETE /voice/sessions/{sessionId}/kbs/{kbId}
 */
export async function removeSessionKb(
  sessionId: string,
  kbId: string,
  token: string
): Promise<void> {
  await apiRequest<void>(`/voice/sessions/${sessionId}/kbs/${kbId}`, token, {
    method: "DELETE",
  });
}

/**
 * Get available KBs for a session (workspace + org scope)
 * This calls module-kb API to get KBs available to the user
 */
export async function getAvailableKbs(
  orgId: string,
  workspaceId: string | undefined,
  token: string
): Promise<AvailableKb[]> {
  const params: Record<string, string | undefined> = {
    orgId,
    workspaceId,
    scope: workspaceId ? "workspace" : "org",
  };
  
  const url = buildUrl("/kb/bases", params);
  
  interface KbBase {
    id: string;
    name: string;
    scope: "workspace" | "org" | "system";
    description?: string | null;
  }
  
  const kbs = await apiRequest<KbBase[]>(url, token);
  return kbs.map((kb) => ({
    id: kb.id,
    name: kb.name,
    scope: kb.scope,
    description: kb.description,
  }));
}

// =============================================================================
// CONFIG API
// =============================================================================

export interface ListConfigsOptions {
  orgId: string;
  interviewType?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * List voice configs
 * GET /voice/configs
 */
export async function listConfigs(
  token: string,
  options: ListConfigsOptions
): Promise<VoiceConfig[]> {
  const params: Record<string, string | number | boolean | undefined> = {
    orgId: options.orgId,
    interviewType: options.interviewType,
    isActive: options.isActive,
    limit: options.limit,
    offset: options.offset,
  };

  const url = buildUrl("/voice/configs", params);
  return apiRequest<VoiceConfig[]>(url, token);
}

/**
 * Get a voice config by ID
 * GET /voice/configs/{configId}
 */
export async function getConfig(
  configId: string,
  token: string
): Promise<VoiceConfig> {
  return apiRequest<VoiceConfig>(`/voice/configs/${configId}`, token);
}

/**
 * Create a new voice config
 * POST /voice/configs
 */
export async function createConfig(
  token: string,
  input: CreateVoiceConfigRequest
): Promise<VoiceConfig> {
  return apiRequest<VoiceConfig>("/voice/configs", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Update a voice config
 * PUT /voice/configs/{configId}
 */
export async function updateConfig(
  configId: string,
  token: string,
  input: UpdateVoiceConfigRequest
): Promise<VoiceConfig> {
  return apiRequest<VoiceConfig>(`/voice/configs/${configId}`, token, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/**
 * Delete a voice config
 * DELETE /voice/configs/{configId}
 */
export async function deleteConfig(
  configId: string,
  token: string
): Promise<void> {
  await apiRequest<void>(`/voice/configs/${configId}`, token, {
    method: "DELETE",
  });
}

// =============================================================================
// CREDENTIAL API
// =============================================================================

export interface ListCredentialsOptions {
  orgId: string;
  serviceName?: string;
  isActive?: boolean;
}

/**
 * List voice credentials
 * GET /voice/credentials
 */
export async function listCredentials(
  token: string,
  options: ListCredentialsOptions
): Promise<VoiceCredential[]> {
  const params: Record<string, string | number | boolean | undefined> = {
    orgId: options.orgId,
    serviceName: options.serviceName,
    isActive: options.isActive,
  };

  const url = buildUrl("/voice/credentials", params);
  return apiRequest<VoiceCredential[]>(url, token);
}

/**
 * Get a voice credential by ID
 * GET /voice/credentials/{credentialId}
 */
export async function getCredential(
  credentialId: string,
  token: string
): Promise<VoiceCredential> {
  return apiRequest<VoiceCredential>(`/voice/credentials/${credentialId}`, token);
}

/**
 * Create a new voice credential
 * POST /voice/credentials
 */
export async function createCredential(
  token: string,
  input: CreateVoiceCredentialRequest
): Promise<VoiceCredential> {
  return apiRequest<VoiceCredential>("/voice/credentials", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Delete a voice credential
 * DELETE /voice/credentials/{credentialId}
 */
export async function deleteCredential(
  credentialId: string,
  token: string
): Promise<void> {
  await apiRequest<void>(`/voice/credentials/${credentialId}`, token, {
    method: "DELETE",
  });
}

// =============================================================================
// TRANSCRIPT API
// =============================================================================

export interface ListTranscriptsOptions {
  orgId: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

/**
 * List voice transcripts
 * GET /voice/transcripts
 */
export async function listTranscripts(
  token: string,
  options: ListTranscriptsOptions
): Promise<VoiceTranscript[]> {
  const params: Record<string, string | number | boolean | undefined> = {
    orgId: options.orgId,
    sessionId: options.sessionId,
    limit: options.limit,
    offset: options.offset,
  };

  const url = buildUrl("/voice/transcripts", params);
  return apiRequest<VoiceTranscript[]>(url, token);
}

/**
 * Get a voice transcript by ID
 * GET /voice/transcripts/{transcriptId}
 */
export async function getTranscript(
  transcriptId: string,
  token: string
): Promise<VoiceTranscript> {
  return apiRequest<VoiceTranscript>(`/voice/transcripts/${transcriptId}`, token);
}

/**
 * Get transcript for a session
 * GET /voice/transcripts?sessionId={sessionId}
 */
export async function getSessionTranscript(
  sessionId: string,
  orgId: string,
  token: string
): Promise<VoiceTranscript | null> {
  const transcripts = await listTranscripts(token, { orgId, sessionId, limit: 1 });
  return transcripts.length > 0 ? transcripts[0] : null;
}

// =============================================================================
// ANALYTICS API
// =============================================================================

export interface ListAnalyticsOptions {
  orgId: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

/**
 * List voice analytics
 * GET /voice/analytics
 */
export async function listAnalytics(
  token: string,
  options: ListAnalyticsOptions
): Promise<VoiceAnalytics[]> {
  const params: Record<string, string | number | boolean | undefined> = {
    orgId: options.orgId,
    sessionId: options.sessionId,
    limit: options.limit,
    offset: options.offset,
  };

  const url = buildUrl("/voice/analytics", params);
  return apiRequest<VoiceAnalytics[]>(url, token);
}

/**
 * Get voice analytics by ID
 * GET /voice/analytics/{analyticsId}
 */
export async function getAnalytics(
  analyticsId: string,
  token: string
): Promise<VoiceAnalytics> {
  return apiRequest<VoiceAnalytics>(`/voice/analytics/${analyticsId}`, token);
}

/**
 * Get analytics for a session
 * GET /voice/analytics?sessionId={sessionId}
 */
export async function getSessionAnalytics(
  sessionId: string,
  orgId: string,
  token: string
): Promise<VoiceAnalytics | null> {
  const analytics = await listAnalytics(token, { orgId, sessionId, limit: 1 });
  return analytics.length > 0 ? analytics[0] : null;
}

/**
 * Get organization voice stats
 * GET /voice/analytics/stats
 */
export async function getOrgStats(
  orgId: string,
  token: string
): Promise<VoiceOrgStats> {
  return apiRequest<VoiceOrgStats>(`/voice/analytics/stats?orgId=${orgId}`, token);
}

// =============================================================================
// WEBSOCKET HELPERS
// =============================================================================

/**
 * Get WebSocket URL for real-time transcript streaming
 */
export function getWebSocketUrl(sessionId: string, token: string): string {
  const wsBase = process.env.NEXT_PUBLIC_VOICE_WS_URL || "";
  if (!wsBase) {
    console.warn("NEXT_PUBLIC_VOICE_WS_URL not configured");
    return "";
  }
  return `${wsBase}?sessionId=${sessionId}&token=${token}`;
}

/**
 * WebSocket message handler type
 */
export interface WebSocketCallbacks {
  onTranscript?: (segment: {
    speaker: "bot" | "candidate";
    text: string;
    startTime: number;
    endTime: number;
    confidence?: number;
  }) => void;
  onStatus?: (status: string, message?: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

/**
 * Connect to WebSocket for real-time transcript streaming
 */
export function connectWebSocket(
  sessionId: string,
  token: string,
  callbacks: WebSocketCallbacks
): WebSocket | null {
  const url = getWebSocketUrl(sessionId, token);
  if (!url) {
    callbacks.onError?.(new Error("WebSocket URL not configured"));
    return null;
  }

  const ws = new WebSocket(url);

  ws.onopen = () => {
    console.log(`WebSocket connected for session ${sessionId}`);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === "transcript_segment") {
        callbacks.onTranscript?.(data.segment);
      } else if (data.type === "session_status") {
        callbacks.onStatus?.(data.status, data.message);
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  };

  ws.onerror = (event) => {
    console.error("WebSocket error:", event);
    callbacks.onError?.(new Error("WebSocket connection error"));
  };

  ws.onclose = () => {
    console.log(`WebSocket disconnected for session ${sessionId}`);
    callbacks.onClose?.();
  };

  return ws;
}
