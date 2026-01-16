// Knowledge Base Types

/**
 * KB Scope levels matching the 4-level hierarchy
 */
export type KbScope = "sys" | "org" | "workspace" | "chat";

/**
 * Document processing status
 */
export type DocumentStatus = "pending" | "processing" | "indexed" | "failed";

/**
 * Knowledge Base entity (kb_bases)
 * Represents a container for documents at one of four scope levels
 */
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  scope: KbScope;
  orgId: string | null;
  workspaceId: string | null;
  chatSessionId: string | null;
  config: KbConfig;
  isEnabled: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string | null;
  // Stats (computed, not in DB)
  documentCount?: number;
  chunkCount?: number;
  totalSize?: number;
}

/**
 * KB Configuration (JSONB field in kb_bases)
 */
export interface KbConfig {
  whoCanUpload: "admin" | "all_members";
  autoIndex: boolean;
  chunkSize: number;
  chunkOverlap: number;
  maxDocuments: number;
  maxFileSize: number;
}

/**
 * Document entity (kb_docs)
 * Represents an uploaded document with processing status
 */
export interface KbDocument {
  id: string;
  kbId: string;
  filename: string;
  s3Key: string;
  s3Bucket: string;
  fileSize: number;
  mimeType: string | null;
  status: DocumentStatus;
  errorMessage: string | null;
  chunkCount: number;
  metadata: DocumentMetadata;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

/**
 * Document metadata (JSONB field in kb_docs)
 */
export interface DocumentMetadata {
  pageCount?: number;
  author?: string;
  title?: string;
  createdDate?: string;
  wordCount?: number;
  language?: string;
}

/**
 * Chunk entity (kb_chunks)
 * Represents a text chunk with embedding for RAG
 */
export interface KbChunk {
  id: string;
  kbId: string;
  documentId: string;
  content: string;
  embedding: number[] | null;
  chunkIndex: number;
  tokenCount: number | null;
  metadata: ChunkMetadata;
  embeddingModel: string | null;
  createdAt: string;
}

/**
 * Chunk metadata (JSONB field in kb_chunks)
 */
export interface ChunkMetadata {
  pageNumber?: number;
  heading?: string;
  startChar?: number;
  endChar?: number;
  paragraphIndex?: number;
  sentenceCount?: number;
}

/**
 * System KB access (kb_access_sys)
 * Platform admin shares system KB with org
 */
export interface KbAccessSys {
  id: string;
  knowledgeBaseId: string;
  orgId: string;
  isEnabled: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

/**
 * Org KB access (kb_access_orgs)
 * Org admin enables KB at org level
 */
export interface KbAccessOrg {
  id: string;
  knowledgeBaseId: string;
  orgId: string;
  isEnabled: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

/**
 * Workspace KB access (kb_access_ws)
 * Workspace admin enables KB for workspace
 */
export interface KbAccessWs {
  id: string;
  knowledgeBaseId: string;
  workspaceId: string;
  isEnabled: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

/**
 * Chat KB access (kb_access_chats)
 * User enables KB for chat session
 */
export interface KbAccessChat {
  id: string;
  knowledgeBaseId: string;
  chatSessionId: string;
  isEnabled: boolean;
  isOverride: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Available KB item (returned by list-available-kbs endpoints)
 * Combines KB data with enablement status
 */
export interface AvailableKb {
  kb: KnowledgeBase;
  isEnabled: boolean;
  source: "workspace" | "org" | "system";
  enabledAt?: string;
}

/**
 * Search result for RAG retrieval
 */
export interface KbSearchResult {
  chunk: KbChunk;
  document: KbDocument;
  similarity: number;
  citation: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Form Input Types

/**
 * Create KB input (org/system admin)
 */
export interface CreateKbInput {
  name: string;
  description?: string;
  scope: "org" | "sys";
  orgId?: string; // Required for org scope
  config?: Partial<KbConfig>;
}

/**
 * Update KB input
 */
export interface UpdateKbInput {
  name?: string;
  description?: string;
  config?: Partial<KbConfig>;
  isEnabled?: boolean;
}

/**
 * Document upload request input
 */
export interface UploadDocumentInput {
  filename: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Document upload response with presigned URL
 */
export interface UploadDocumentResponse {
  document: KbDocument;
  uploadUrl: string;
  expiresIn: number; // seconds
}

/**
 * Document download response with presigned URL
 */
export interface DownloadDocumentResponse {
  downloadUrl: string;
  expiresIn: number; // seconds
}

/**
 * KB search input
 */
export interface KbSearchInput {
  query: string;
  chatSessionId?: string;
  workspaceId?: string;
  kbIds?: string[]; // Specific KBs to search (optional)
  limit?: number;
  similarityThreshold?: number;
}

/**
 * KB toggle input
 */
export interface ToggleKbInput {
  knowledgeBaseId: string;
  isEnabled: boolean;
}

/**
 * Org association input (system KB)
 */
export interface AssociateOrgInput {
  orgId: string;
}

// Supported MIME types for document upload
export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "text/plain",
  "text/markdown",
  "application/msword", // DOC
] as const;

export type SupportedMimeType = typeof SUPPORTED_MIME_TYPES[number];

// File size limits
export const MAX_FILE_SIZE = 52428800; // 50 MB in bytes

// Default KB config values
export const DEFAULT_KB_CONFIG: KbConfig = {
  whoCanUpload: "admin",
  autoIndex: true,
  chunkSize: 1000,
  chunkOverlap: 200,
  maxDocuments: 100,
  maxFileSize: MAX_FILE_SIZE,
};
