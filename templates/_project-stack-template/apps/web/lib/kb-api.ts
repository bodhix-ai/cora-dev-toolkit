/**
 * Knowledge Base API Client
 * Handles document upload, listing, and deletion for chat-scoped knowledge bases
 */

import { createApiClient } from "./api-client";

// Get the base URL from environment variables
// KB operations use the CORA modular API Gateway (NEXT_PUBLIC_CORA_API_URL)
// Falls back to main API URL if CORA URL not set
const API_BASE =
  process.env.NEXT_PUBLIC_CORA_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" ? "/api" : "");

/**
 * Document status types
 */
export type DocumentStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Knowledge Base Document type
 */
export type KBDocument = {
  id: string;
  kb_id: string;
  filename: string;
  orig_filename: string;
  file_type: string;
  file_size_bytes: number;
  file_hash: string;
  status: DocumentStatus;
  error_msg?: string;
  chunk_count?: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
};

/**
 * Upload a document to a chat session's knowledge base
 * @param sessionId The chat session ID
 * @param file The file to upload (PDF or DOCX)
 * @param token The user's JWT for authentication
 * @param orgId Optional organization ID for multi-tenant authorization
 * @returns A promise that resolves to the uploaded document metadata
 */
export async function uploadDocument(
  sessionId: string,
  file: File,
  token: string,
  orgId?: string
): Promise<KBDocument> {
  // CORA route - /chats/{chatId}/kb/documents (kb-document Lambda)
  const url = `${API_BASE}/chats/${sessionId}/kb/documents`;

  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    // Note: Don't set Content-Type header for FormData, browser will set it with boundary
  };

  // Add organization ID header if provided (required for API Gateway authorization)
  if (orgId) {
    headers["X-Org-Id"] = orgId;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }

    // Handle response structure { success: true, data: [...] }
    if (json.data) {
      if (Array.isArray(json.data) && json.data.length > 0) {
        return json.data[0] as KBDocument;
      }
      return json.data as KBDocument;
    }

    return json as KBDocument;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Get all documents for a chat session's knowledge base
 * @param sessionId The chat session ID
 * @param token The user's JWT for authentication
 * @returns A promise that resolves to an array of documents
 */
export async function getDocuments(
  sessionId: string,
  token: string
): Promise<KBDocument[]> {
  // CORA route - /chats/{chatId}/kb/documents (kb-document Lambda)
  const client = createApiClient(token);
  const response = await client.get<{
    documents?: KBDocument[];
    data?: KBDocument[];
  }>(`/chats/${sessionId}/kb/documents`);
  
  // Backend returns { documents: [...] } or { data: [...] }
  return (response.documents || response.data || []) as KBDocument[];
}

/**
 * Delete a document from a knowledge base
 * @param docId The document ID to delete
 * @param token The user's JWT for authentication
 * @returns A promise that resolves when the document is deleted
 */
export async function deleteDocument(
  docId: string,
  token: string,
  sessionId?: string
): Promise<void> {
  // CORA route - /chats/{chatId}/kb/documents/{docId} (kb-document Lambda)
  if (!sessionId) {
    throw new Error("sessionId is required for chat document deletion");
  }
  const client = createApiClient(token);
  await client.delete(`/chats/${sessionId}/kb/documents/${docId}`);
}

// ============================================================================
// PROJECT-LEVEL KB FUNCTIONS
// ============================================================================

/**
 * Upload a document to a project's knowledge base
 * @param projectId The project ID
 * @param file The file to upload (PDF or DOCX)
 * @param token The user's JWT for authentication
 * @returns A promise that resolves to the uploaded document metadata
 */
export async function uploadProjectDocument(
  projectId: string,
  file: File,
  token: string
): Promise<KBDocument> {
  const url = `${API_BASE}/projects/${projectId}/kb/documents`;

  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    // Note: Don't set Content-Type header for FormData, browser will set it with boundary
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }

    // Handle response structure { success: true, data: [...] }
    if (json.data) {
      if (Array.isArray(json.data) && json.data.length > 0) {
        return json.data[0] as KBDocument;
      }
      return json.data as KBDocument;
    }

    return json as KBDocument;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Get all documents for a project's knowledge base
 * @param projectId The project ID
 * @param token The user's JWT for authentication
 * @returns A promise that resolves to an array of documents
 */
export async function getProjectDocuments(
  projectId: string,
  token: string
): Promise<KBDocument[]> {
  const client = createApiClient(token);
  const response = await client.get<{
    documents?: KBDocument[];
    data?: KBDocument[];
  }>(`/projects/${projectId}/kb/documents`);
  
  // Backend returns { documents: [...] } or { data: [...] }
  return (response.documents || response.data || []) as KBDocument[];
}

/**
 * Delete a document from a project knowledge base
 * @param projectId The project ID
 * @param docId The document ID to delete
 * @param token The user's JWT for authentication
 * @returns A promise that resolves when the document is deleted
 */
export async function deleteProjectDocument(
  projectId: string,
  docId: string,
  token: string
): Promise<void> {
  const client = createApiClient(token);
  await client.delete(`/projects/${projectId}/kb/documents/${docId}`);
}

/**
 * Format file size for display
 * @param bytes File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Validate file before upload
 * @param file The file to validate
 * @param maxSizeMB Maximum file size in MB (default 10)
 * @returns Error message if invalid, null if valid
 */
export function validateFile(
  file: File,
  maxSizeMB: number = 10
): string | null {
  // Check file type
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const allowedExtensions = [".pdf", ".docx"];

  const hasValidType = allowedTypes.includes(file.type);
  const hasValidExtension = allowedExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidType && !hasValidExtension) {
    return "Only PDF and DOCX files are supported";
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File size must be less than ${maxSizeMB} MB`;
  }

  return null;
}
