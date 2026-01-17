/**
 * Voice Module Types
 * 
 * TypeScript type definitions for the voice module.
 */

// =============================================================================
// SESSION TYPES
// =============================================================================

export type VoiceSessionStatus = 
  | 'pending' 
  | 'ready' 
  | 'active' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface VoiceSession {
  id: string;
  orgId: string;
  workspaceId?: string | null;
  candidateName?: string | null;
  candidateEmail?: string | null;
  interviewType: string;
  configId?: string | null;
  status: VoiceSessionStatus;
  dailyRoomUrl?: string | null;
  dailyRoomName?: string | null;
  dailyRoomToken?: string | null;
  ecsTaskArn?: string | null;
  sessionMetadata: Record<string, unknown>;
  startedAt?: string | null;
  completedAt?: string | null;
  durationSeconds?: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string | null;
  config?: VoiceConfigSummary;
  kbAssociations?: VoiceSessionKb[];
}

export interface VoiceSessionSummary {
  id: string;
  workspaceId?: string | null;
  candidateName?: string | null;
  interviewType: string;
  status: VoiceSessionStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  durationSeconds?: number | null;
  createdAt: string;
}

// =============================================================================
// KB ASSOCIATION TYPES
// =============================================================================

export interface VoiceSessionKb {
  id: string;
  kbId: string;
  kbName?: string | null;
  kbScope?: 'workspace' | 'org' | 'system' | null;
  isEnabled: boolean;
  addedAt: string;
}

export interface AddVoiceSessionKbRequest {
  kbId: string;
  isEnabled?: boolean;
}

export interface ToggleVoiceSessionKbRequest {
  isEnabled: boolean;
}

export interface CreateVoiceSessionRequest {
  orgId: string;
  workspaceId?: string;
  interviewType: string;
  candidateName?: string;
  candidateEmail?: string;
  configId?: string;
  kbIds?: string[];
  sessionMetadata?: Record<string, unknown>;
}

export interface UpdateVoiceSessionRequest {
  candidateName?: string | null;
  candidateEmail?: string | null;
  status?: VoiceSessionStatus;
  sessionMetadata?: Record<string, unknown>;
}

// =============================================================================
// CONFIG TYPES
// =============================================================================

export interface VoiceConfig {
  id: string;
  orgId: string;
  name: string;
  interviewType: string;
  description?: string | null;
  configJson: VoiceConfigJson;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string | null;
}

export interface VoiceConfigSummary {
  id: string;
  name: string;
  interviewType: string;
}

export interface VoiceConfigJson {
  bot_name?: string;
  system_prompt?: string;
  initial_message?: string;
  voice?: {
    provider: string;
    voice_id: string;
    speed?: number;
  };
  transcription?: {
    provider: string;
    language?: string;
    model?: string;
  };
  llm?: {
    provider: string;
    model: string;
    temperature?: number;
    max_tokens?: number;
  };
  interview?: {
    max_duration_minutes?: number;
    questions?: VoiceConfigQuestion[];
    scoring_rubric?: {
      criteria: string[];
    };
  };
}

export interface VoiceConfigQuestion {
  id: string;
  text: string;
  type: 'open' | 'closed' | 'technical';
  follow_up_enabled?: boolean;
}

export interface CreateVoiceConfigRequest {
  orgId: string;
  name: string;
  interviewType: string;
  description?: string;
  configJson: VoiceConfigJson;
}

export interface UpdateVoiceConfigRequest {
  name?: string;
  interviewType?: string;
  description?: string | null;
  configJson?: VoiceConfigJson;
  isActive?: boolean;
}

// =============================================================================
// CREDENTIAL TYPES
// =============================================================================

export type VoiceServiceName = 'daily' | 'deepgram' | 'cartesia';

export interface VoiceCredential {
  id: string;
  orgId: string;
  serviceName: VoiceServiceName;
  configMetadata: Record<string, unknown>;
  isActive: boolean;
  lastValidatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string | null;
}

export interface CreateVoiceCredentialRequest {
  orgId: string;
  serviceName: VoiceServiceName;
  apiKey: string;
  configMetadata?: Record<string, unknown>;
}

// =============================================================================
// TRANSCRIPT TYPES
// =============================================================================

export interface VoiceTranscript {
  id: string;
  orgId: string;
  sessionId: string;
  transcriptText?: string | null;
  transcriptS3Url?: string | null;
  candidateName?: string | null;
  interviewType?: string | null;
  summary?: string | null;
  wordCount?: number | null;
  speakerSegments: SpeakerSegment[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string | null;
}

export interface SpeakerSegment {
  speaker: 'bot' | 'candidate';
  text: string;
  start_time: number;
  end_time: number;
  confidence?: number;
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface VoiceAnalytics {
  id: string;
  orgId: string;
  sessionId: string;
  transcriptId?: string | null;
  overallScore?: number | null;
  categoryScores: Record<string, CategoryScore>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  keyMoments: KeyMoment[];
  detailedAnalysis: Record<string, unknown>;
  modelUsed?: string | null;
  processingTimeMs?: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CategoryScore {
  score: number;
  weight: number;
  feedback?: string;
}

export interface KeyMoment {
  timestamp: number;
  type: 'strength' | 'concern' | 'highlight';
  description: string;
  quote?: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface VoiceApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface VoiceOrgStats {
  totalSessions: number;
  completedSessions: number;
  avgDurationSeconds?: number;
  avgScore?: number;
  sessionsThisMonth: number;
  sessionsThisWeek: number;
}

// =============================================================================
// WEBSOCKET TYPES
// =============================================================================

export interface TranscriptSegmentMessage {
  type: 'transcript_segment';
  sessionId: string;
  segment: SpeakerSegment;
}

export interface SessionStatusMessage {
  type: 'session_status';
  sessionId: string;
  status: VoiceSessionStatus;
}

export type VoiceWebSocketMessage = 
  | TranscriptSegmentMessage 
  | SessionStatusMessage;

// =============================================================================
// AVAILABLE KB TYPES (for KB selection UI)
// =============================================================================

export interface AvailableKb {
  id: string;
  name: string;
  scope: 'workspace' | 'org' | 'system';
  description?: string | null;
  isAlreadyGrounded?: boolean;
}

export interface ListAvailableKbsParams {
  sessionId: string;
  scope?: 'workspace' | 'org' | 'system' | 'all';
}
