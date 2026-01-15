/**
 * Module-KB Hooks
 * 
 * React hooks for knowledge base operations.
 */

// Generic KB hook (workspace/chat scope)
export { useKnowledgeBase } from './useKnowledgeBase';

// Document management hook
export { useKbDocuments } from './useKbDocuments';

// Admin hooks
export { useOrgKbs } from './useOrgKbs';
export { useSysKbs } from './useSysKbs';

// Type exports for hook consumers
export type {
  UseKnowledgeBaseOptions,
  UseKnowledgeBaseReturn,
} from './useKnowledgeBase';

export type {
  UseKbDocumentsOptions,
  UseKbDocumentsReturn,
} from './useKbDocuments';

export type {
  UseOrgKbsOptions,
  UseOrgKbsReturn,
} from './useOrgKbs';

export type {
  UseSysKbsOptions,
  UseSysKbsReturn,
} from './useSysKbs';
