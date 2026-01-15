import {
  ApiResponse,
  KnowledgeBase,
  KbDocument,
  AvailableKb,
  CreateKbInput,
  UpdateKbInput,
  UploadDocumentInput,
  UploadDocumentResponse,
  DownloadDocumentResponse,
  ToggleKbInput,
  AssociateOrgInput,
  KbSearchInput,
  KbSearchResult,
} from "../types";

/**
 * Authenticated client interface
 * Matches CORA authentication pattern
 */
interface AuthenticatedClient {
  get: <T>(url: string) => Promise<ApiResponse<T>>;
  post: <T>(url: string, data?: unknown) => Promise<ApiResponse<T>>;
  put: <T>(url: string, data?: unknown) => Promise<ApiResponse<T>>;
  patch: <T>(url: string, data?: unknown) => Promise<ApiResponse<T>>;
  delete: <T>(url: string) => Promise<ApiResponse<T>>;
}

/**
 * Knowledge Base Module API Client Interface
 */
export interface KbModuleApiClient {
  // Workspace KB endpoints
  workspace: {
    getKb: (workspaceId: string) => Promise<ApiResponse<KnowledgeBase | null>>;
    listDocuments: (workspaceId: string) => Promise<ApiResponse<KbDocument[]>>;
    uploadDocument: (
      workspaceId: string,
      data: UploadDocumentInput
    ) => Promise<ApiResponse<UploadDocumentResponse>>;
    getDocument: (
      workspaceId: string,
      documentId: string
    ) => Promise<ApiResponse<KbDocument>>;
    deleteDocument: (
      workspaceId: string,
      documentId: string
    ) => Promise<ApiResponse<void>>;
    downloadDocument: (
      workspaceId: string,
      documentId: string
    ) => Promise<ApiResponse<DownloadDocumentResponse>>;
    listAvailableKbs: (
      workspaceId: string
    ) => Promise<ApiResponse<AvailableKb[]>>;
    toggleKb: (
      workspaceId: string,
      kbId: string,
      data: ToggleKbInput
    ) => Promise<ApiResponse<void>>;
  };

  // Chat KB endpoints
  chat: {
    getKb: (chatId: string) => Promise<ApiResponse<KnowledgeBase | null>>;
    listDocuments: (chatId: string) => Promise<ApiResponse<KbDocument[]>>;
    uploadDocument: (
      chatId: string,
      data: UploadDocumentInput
    ) => Promise<ApiResponse<UploadDocumentResponse>>;
    getDocument: (
      chatId: string,
      documentId: string
    ) => Promise<ApiResponse<KbDocument>>;
    deleteDocument: (
      chatId: string,
      documentId: string
    ) => Promise<ApiResponse<void>>;
    listAvailableKbs: (chatId: string) => Promise<ApiResponse<AvailableKb[]>>;
    toggleKb: (
      chatId: string,
      kbId: string,
      data: ToggleKbInput
    ) => Promise<ApiResponse<void>>;
  };

  // Org Admin endpoints
  orgAdmin: {
    listKbs: () => Promise<ApiResponse<KnowledgeBase[]>>;
    createKb: (data: CreateKbInput) => Promise<ApiResponse<KnowledgeBase>>;
    getKb: (kbId: string) => Promise<ApiResponse<KnowledgeBase>>;
    updateKb: (
      kbId: string,
      data: UpdateKbInput
    ) => Promise<ApiResponse<KnowledgeBase>>;
    deleteKb: (kbId: string) => Promise<ApiResponse<void>>;
    listDocuments: (kbId: string) => Promise<ApiResponse<KbDocument[]>>;
    uploadDocument: (
      kbId: string,
      data: UploadDocumentInput
    ) => Promise<ApiResponse<UploadDocumentResponse>>;
    deleteDocument: (
      kbId: string,
      documentId: string
    ) => Promise<ApiResponse<void>>;
  };

  // System Admin endpoints
  sysAdmin: {
    listKbs: () => Promise<ApiResponse<KnowledgeBase[]>>;
    createKb: (data: CreateKbInput) => Promise<ApiResponse<KnowledgeBase>>;
    getKb: (kbId: string) => Promise<ApiResponse<KnowledgeBase>>;
    updateKb: (
      kbId: string,
      data: UpdateKbInput
    ) => Promise<ApiResponse<KnowledgeBase>>;
    deleteKb: (kbId: string) => Promise<ApiResponse<void>>;
    associateOrg: (
      kbId: string,
      data: AssociateOrgInput
    ) => Promise<ApiResponse<void>>;
    removeOrg: (kbId: string, orgId: string) => Promise<ApiResponse<void>>;
    listDocuments: (kbId: string) => Promise<ApiResponse<KbDocument[]>>;
    uploadDocument: (
      kbId: string,
      data: UploadDocumentInput
    ) => Promise<ApiResponse<UploadDocumentResponse>>;
    deleteDocument: (
      kbId: string,
      documentId: string
    ) => Promise<ApiResponse<void>>;
  };

  // RAG Search endpoint (internal)
  search: (data: KbSearchInput) => Promise<ApiResponse<KbSearchResult[]>>;
}

/**
 * Factory function to create KB module API client
 * @param authenticatedClient - Authenticated client with CORA auth
 * @returns KbModuleApiClient
 */
export function createKbModuleClient(
  authenticatedClient: AuthenticatedClient
): KbModuleApiClient {
  return {
    // Workspace KB endpoints
    workspace: {
      getKb: (workspaceId) =>
        authenticatedClient.get<KnowledgeBase | null>(
          `/workspaces/${workspaceId}/kb`
        ),

      listDocuments: (workspaceId) =>
        authenticatedClient.get<KbDocument[]>(
          `/workspaces/${workspaceId}/kb/documents`
        ),

      uploadDocument: (workspaceId, data) =>
        authenticatedClient.post<UploadDocumentResponse>(
          `/workspaces/${workspaceId}/kb/documents`,
          data
        ),

      getDocument: (workspaceId, documentId) =>
        authenticatedClient.get<KbDocument>(
          `/workspaces/${workspaceId}/kb/documents/${documentId}`
        ),

      deleteDocument: (workspaceId, documentId) =>
        authenticatedClient.delete<void>(
          `/workspaces/${workspaceId}/kb/documents/${documentId}`
        ),

      downloadDocument: (workspaceId, documentId) =>
        authenticatedClient.get<DownloadDocumentResponse>(
          `/workspaces/${workspaceId}/kb/documents/${documentId}/download`
        ),

      listAvailableKbs: (workspaceId) =>
        authenticatedClient.get<AvailableKb[]>(
          `/workspaces/${workspaceId}/available-kbs`
        ),

      toggleKb: (workspaceId, kbId, data) =>
        authenticatedClient.post<void>(
          `/workspaces/${workspaceId}/kbs/${kbId}/toggle`,
          data
        ),
    },

    // Chat KB endpoints
    chat: {
      getKb: (chatId) =>
        authenticatedClient.get<KnowledgeBase | null>(`/chats/${chatId}/kb`),

      listDocuments: (chatId) =>
        authenticatedClient.get<KbDocument[]>(`/chats/${chatId}/kb/documents`),

      uploadDocument: (chatId, data) =>
        authenticatedClient.post<UploadDocumentResponse>(
          `/chats/${chatId}/kb/documents`,
          data
        ),

      getDocument: (chatId, documentId) =>
        authenticatedClient.get<KbDocument>(
          `/chats/${chatId}/kb/documents/${documentId}`
        ),

      deleteDocument: (chatId, documentId) =>
        authenticatedClient.delete<void>(
          `/chats/${chatId}/kb/documents/${documentId}`
        ),

      listAvailableKbs: (chatId) =>
        authenticatedClient.get<AvailableKb[]>(`/chats/${chatId}/available-kbs`),

      toggleKb: (chatId, kbId, data) =>
        authenticatedClient.post<void>(`/chats/${chatId}/kbs/${kbId}/toggle`, data),
    },

    // Org Admin endpoints
    orgAdmin: {
      listKbs: () => authenticatedClient.get<KnowledgeBase[]>("/admin/org/kbs"),

      createKb: (data) =>
        authenticatedClient.post<KnowledgeBase>("/admin/org/kbs", data),

      getKb: (kbId) =>
        authenticatedClient.get<KnowledgeBase>(`/admin/org/kbs/${kbId}`),

      updateKb: (kbId, data) =>
        authenticatedClient.patch<KnowledgeBase>(`/admin/org/kbs/${kbId}`, data),

      deleteKb: (kbId) =>
        authenticatedClient.delete<void>(`/admin/org/kbs/${kbId}`),

      listDocuments: (kbId) =>
        authenticatedClient.get<KbDocument[]>(`/admin/org/kbs/${kbId}/documents`),

      uploadDocument: (kbId, data) =>
        authenticatedClient.post<UploadDocumentResponse>(
          `/admin/org/kbs/${kbId}/documents`,
          data
        ),

      deleteDocument: (kbId, documentId) =>
        authenticatedClient.delete<void>(
          `/admin/org/kbs/${kbId}/documents/${documentId}`
        ),
    },

    // System Admin endpoints
    sysAdmin: {
      listKbs: () => authenticatedClient.get<KnowledgeBase[]>("/admin/sys/kbs"),

      createKb: (data) =>
        authenticatedClient.post<KnowledgeBase>("/admin/sys/kbs", data),

      getKb: (kbId) =>
        authenticatedClient.get<KnowledgeBase>(`/admin/sys/kbs/${kbId}`),

      updateKb: (kbId, data) =>
        authenticatedClient.patch<KnowledgeBase>(`/admin/sys/kbs/${kbId}`, data),

      deleteKb: (kbId) =>
        authenticatedClient.delete<void>(`/admin/sys/kbs/${kbId}`),

      associateOrg: (kbId, data) =>
        authenticatedClient.post<void>(`/admin/sys/kbs/${kbId}/orgs`, data),

      removeOrg: (kbId, orgId) =>
        authenticatedClient.delete<void>(`/admin/sys/kbs/${kbId}/orgs/${orgId}`),

      listDocuments: (kbId) =>
        authenticatedClient.get<KbDocument[]>(`/admin/sys/kbs/${kbId}/documents`),

      uploadDocument: (kbId, data) =>
        authenticatedClient.post<UploadDocumentResponse>(
          `/admin/sys/kbs/${kbId}/documents`,
          data
        ),

      deleteDocument: (kbId, documentId) =>
        authenticatedClient.delete<void>(
          `/admin/sys/kbs/${kbId}/documents/${documentId}`
        ),
    },

    // RAG Search endpoint
    search: (data) =>
      authenticatedClient.post<KbSearchResult[]>("/kb/search", data),
  };
}
