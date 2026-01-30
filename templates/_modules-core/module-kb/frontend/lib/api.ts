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
 * List documents response wrapper
 * API returns nested structure: { documents: KbDocument[] }
 */
export interface ListDocumentsResponse {
  documents: KbDocument[];
}

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
    getKb: (wsId: string) => Promise<ApiResponse<KnowledgeBase | null>>;
    listDocuments: (wsId: string) => Promise<ApiResponse<ListDocumentsResponse>>;
    uploadDocument: (
      wsId: string,
      data: UploadDocumentInput
    ) => Promise<ApiResponse<UploadDocumentResponse>>;
    getDocument: (
      wsId: string,
      documentId: string
    ) => Promise<ApiResponse<KbDocument>>;
    deleteDocument: (
      wsId: string,
      documentId: string
    ) => Promise<ApiResponse<void>>;
    completeUpload: (
      wsId: string,
      documentId: string
    ) => Promise<ApiResponse<{ message: string; documentId: string; status: string }>>;
    downloadDocument: (
      wsId: string,
      documentId: string
    ) => Promise<ApiResponse<DownloadDocumentResponse>>;
    listAvailableKbs: (
      wsId: string
    ) => Promise<ApiResponse<AvailableKb[]>>;
    toggleKb: (
      wsId: string,
      kbId: string,
      data: ToggleKbInput
    ) => Promise<ApiResponse<void>>;
  };

  // Chat KB endpoints
  chat: {
    getKb: (chatId: string) => Promise<ApiResponse<KnowledgeBase | null>>;
    listDocuments: (chatId: string) => Promise<ApiResponse<ListDocumentsResponse>>;
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
    completeUpload: (
      chatId: string,
      documentId: string
    ) => Promise<ApiResponse<{ message: string; documentId: string; status: string }>>;
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
    listDocuments: (kbId: string) => Promise<ApiResponse<ListDocumentsResponse>>;
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
    listDocuments: (kbId: string) => Promise<ApiResponse<ListDocumentsResponse>>;
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
 * Create authenticated client from token
 * @param token - JWT access token
 * @returns AuthenticatedClient
 */
export function createAuthenticatedClient(token: string): AuthenticatedClient {
  const baseURL = process.env.NEXT_PUBLIC_CORA_API_URL || '';

  const fetchWithAuth = async <T>(
    method: string,
    url: string,
    data?: unknown
  ): Promise<ApiResponse<T>> => {
    const response = await fetch(`${baseURL}${url}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  return {
    get: <T>(url: string) => fetchWithAuth<T>('GET', url),
    post: <T>(url: string, data?: unknown) => fetchWithAuth<T>('POST', url, data),
    put: <T>(url: string, data?: unknown) => fetchWithAuth<T>('PUT', url, data),
    patch: <T>(url: string, data?: unknown) => fetchWithAuth<T>('PATCH', url, data),
    delete: <T>(url: string) => fetchWithAuth<T>('DELETE', url),
  };
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
      getKb: (wsId) =>
        authenticatedClient.get<KnowledgeBase | null>(
          `/ws/${wsId}/kb`
        ),

      listDocuments: (wsId) =>
        authenticatedClient.get<ListDocumentsResponse>(
          `/ws/${wsId}/kb/documents`
        ),

      uploadDocument: (wsId, data) =>
        authenticatedClient.post<UploadDocumentResponse>(
          `/ws/${wsId}/kb/documents`,
          data
        ),

      getDocument: (wsId, documentId) =>
        authenticatedClient.get<KbDocument>(
          `/ws/${wsId}/kb/documents/${documentId}`
        ),

      deleteDocument: (wsId, documentId) =>
        authenticatedClient.delete<void>(
          `/ws/${wsId}/kb/documents/${documentId}`
        ),

      completeUpload: (wsId, documentId) =>
        authenticatedClient.put<{ message: string; documentId: string; status: string }>(
          `/ws/${wsId}/kb/documents/${documentId}/complete`
        ),

      downloadDocument: (wsId, documentId) =>
        authenticatedClient.get<DownloadDocumentResponse>(
          `/ws/${wsId}/kb/documents/${documentId}/download`
        ),

      listAvailableKbs: (wsId) =>
        authenticatedClient.get<AvailableKb[]>(
          `/ws/${wsId}/available-kbs`
        ),

      toggleKb: (wsId, kbId, data) =>
        authenticatedClient.post<void>(
          `/ws/${wsId}/kbs/${kbId}/toggle`,
          data
        ),
    },

    // Chat KB endpoints
    chat: {
      getKb: (chatId) =>
        authenticatedClient.get<KnowledgeBase | null>(`/chats/${chatId}/kb`),

      listDocuments: (chatId) =>
        authenticatedClient.get<ListDocumentsResponse>(`/chats/${chatId}/kb/documents`),

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

      completeUpload: (chatId, documentId) =>
        authenticatedClient.put<{ message: string; documentId: string; status: string }>(
          `/chats/${chatId}/kb/documents/${documentId}/complete`
        ),

      listAvailableKbs: (chatId) =>
        authenticatedClient.get<AvailableKb[]>(`/chats/${chatId}/available-kbs`),

      toggleKb: (chatId, kbId, data) =>
        authenticatedClient.post<void>(`/chats/${chatId}/kbs/${kbId}/toggle`, data),
    },

    // Org Admin endpoints
    orgAdmin: {
      listKbs: () => authenticatedClient.get<KnowledgeBase[]>("/admin/org/kb"),

      createKb: (data) =>
        authenticatedClient.post<KnowledgeBase>("/admin/org/kb", data),

      getKb: (kbId) =>
        authenticatedClient.get<KnowledgeBase>(`/admin/org/kb/${kbId}`),

      updateKb: (kbId, data) =>
        authenticatedClient.patch<KnowledgeBase>(`/admin/org/kb/${kbId}`, data),

      deleteKb: (kbId) =>
        authenticatedClient.delete<void>(`/admin/org/kb/${kbId}`),

      listDocuments: (kbId) =>
        authenticatedClient.get<ListDocumentsResponse>(`/admin/org/kb/${kbId}/documents`),

      uploadDocument: (kbId, data) =>
        authenticatedClient.post<UploadDocumentResponse>(
          `/admin/org/kb/${kbId}/documents`,
          data
        ),

      deleteDocument: (kbId, documentId) =>
        authenticatedClient.delete<void>(
          `/admin/org/kb/${kbId}/documents/${documentId}`
        ),
    },

    // System Admin endpoints
    sysAdmin: {
      listKbs: () => authenticatedClient.get<KnowledgeBase[]>("/admin/sys/kb/bases"),

      createKb: (data) =>
        authenticatedClient.post<KnowledgeBase>("/admin/sys/kb/bases", data),

      getKb: (kbId) =>
        authenticatedClient.get<KnowledgeBase>(`/admin/sys/kb/${kbId}`),

      updateKb: (kbId, data) =>
        authenticatedClient.patch<KnowledgeBase>(`/admin/sys/kb/${kbId}`, data),

      deleteKb: (kbId) =>
        authenticatedClient.delete<void>(`/admin/sys/kb/${kbId}`),

      associateOrg: (kbId, data) =>
        authenticatedClient.post<void>(`/admin/sys/kb/${kbId}/orgs`, data),

      removeOrg: (kbId, orgId) =>
        authenticatedClient.delete<void>(`/admin/sys/kb/${kbId}/orgs/${orgId}`),

      listDocuments: (kbId) =>
        authenticatedClient.get<ListDocumentsResponse>(`/admin/sys/kb/${kbId}/documents`),

      uploadDocument: (kbId, data) =>
        authenticatedClient.post<UploadDocumentResponse>(
          `/admin/sys/kb/${kbId}/documents`,
          data
        ),

      deleteDocument: (kbId, documentId) =>
        authenticatedClient.delete<void>(
          `/admin/sys/kb/${kbId}/documents/${documentId}`
        ),
    },

    // RAG Search endpoint
    search: (data) =>
      authenticatedClient.post<KbSearchResult[]>("/kb/search", data),
  };
}
