/**
 * Module KB - Frontend Exports
 * 
 * Knowledge Base module for document management and RAG embeddings.
 */

// Types
export type {
  KbScope,
  DocumentStatus,
  KnowledgeBase,
  KbConfig,
  KbDocument,
  DocumentMetadata,
  KbChunk,
  ChunkMetadata,
  KbAccessSys,
  KbAccessOrg,
  KbAccessWs,
  KbAccessChat,
  AvailableKb,
  KbSearchResult,
  ApiResponse,
  CreateKbInput,
  UpdateKbInput,
  UploadDocumentInput,
  UploadDocumentResponse,
  DownloadDocumentResponse,
  KbSearchInput,
  ToggleKbInput,
  AssociateOrgInput,
  SupportedMimeType,
} from './types';

// Constants
export {
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE,
  DEFAULT_KB_CONFIG,
} from './types';

// API Client
export { createKbModuleClient, createAuthenticatedClient } from './lib/api';
export type { KbModuleApiClient } from './lib/api';

// Hooks
export {
  useKnowledgeBase,
  useKbDocuments,
  useOrgKbs,
  useSysKbs,
  useWorkspaceKB,
} from './hooks';

// Hook Types
export type {
  UseKnowledgeBaseOptions,
  UseKnowledgeBaseReturn,
  UseKbDocumentsOptions,
  UseKbDocumentsReturn,
  UseOrgKbsOptions,
  UseOrgKbsReturn,
  UseSysKbsOptions,
  UseSysKbsReturn,
  UseWorkspaceKBOptions,
  UseWorkspaceKBReturn,
} from './hooks';

// Components
export {
  // User Components
  KBToggleSelector,
  DocumentUploadZone,
  DocumentTable,
  DocumentStatusBadge,
  KBStatsCard,
  WorkspaceDataKBTab,
  // Admin Components
  OrgKBList,
  SysKBList,
  KBFormDialog,
  // Admin Page Components
  OrgKbAdmin,
  SysKbAdmin,
} from './components';

// Pages
export {
  OrgAdminKBPage,
  PlatformAdminKBPage,
} from './pages';

// Admin Cards
export {
  orgKnowledgeBaseCard,
  platformKnowledgeBaseCard,
} from './adminCard';
