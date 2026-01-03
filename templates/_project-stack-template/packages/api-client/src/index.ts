/**
 * API Client Utility
 *
 * Provides a wrapper around fetch() that automatically injects
 * the Bearer token from NextAuth session for authenticated requests.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_CORA_API_URL ||
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
  "";

interface RequestOptions extends RequestInit {
  token?: string;
  orgId?: string;
}

/**
 * Make an authenticated API request
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, orgId, headers, ...restOptions } = options;

  // Construct full URL
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  // Build headers with authentication
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  // Add Bearer token if provided
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  // Add Org ID header if provided
  if (orgId) {
    requestHeaders["X-Org-Id"] = orgId;
  }

  // Make request
  // eslint-disable-next-line no-restricted-globals
  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });

  // Handle errors
  if (!response.ok) {
    // Handle JWT expiration (401/403) - sign out user
    if (response.status === 401 || response.status === 403) {
      throw new Error("Session expired. Please log in again.");
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API request failed: ${response.statusText}`
    );
  }

  // Parse response
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return response.text() as T;
}

/**
 * API Client
 *
 * Object with methods for common HTTP verbs.
 * Each method automatically injects the Bearer token if provided.
 */
export const apiClient = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, token?: string): Promise<T> => {
    return request<T>(endpoint, { method: "GET", token });
  },

  /**
   * POST request
   */
  post: <T>(endpoint: string, data: any, token?: string): Promise<T> => {
    return request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
  },

  /**
   * PUT request
   */
  put: <T>(endpoint: string, data: any, token?: string): Promise<T> => {
    return request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    });
  },

  /**
   * PATCH request
   */
  patch: <T>(endpoint: string, data: any, token?: string): Promise<T> => {
    return request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
  },

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, token?: string): Promise<T> => {
    return request<T>(endpoint, { method: "DELETE", token });
  },

  /**
   * Upload file (multipart/form-data)
   */
  upload: <T>(
    endpoint: string,
    formData: FormData,
    token?: string
  ): Promise<T> => {
    // eslint-disable-next-line no-restricted-globals
    return fetch(
      endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`,
      {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      }
    ).then((res) => {
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }
      return res.json();
    });
  },
};

/**
 * Create an authenticated API client with token pre-configured
 */
export function createAuthenticatedClient(token: string, orgId?: string) {
  const options = { token, orgId };
  return {
    get: <T>(endpoint: string) =>
      request<T>(endpoint, { method: "GET", ...options }),
    post: <T>(endpoint: string, data: any) =>
      request<T>(endpoint, {
        method: "POST",
        body: JSON.stringify(data),
        ...options,
      }),
    put: <T>(endpoint: string, data: any) =>
      request<T>(endpoint, {
        method: "PUT",
        body: JSON.stringify(data),
        ...options,
      }),
    patch: <T>(endpoint: string, data: any) =>
      request<T>(endpoint, {
        method: "PATCH",
        body: JSON.stringify(data),
        ...options,
      }),
    delete: <T>(endpoint: string) =>
      request<T>(endpoint, { method: "DELETE", ...options }),
    upload: <T>(endpoint: string, formData: FormData) => {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (orgId) headers["X-Org-Id"] = orgId;
      return apiClient.upload<T>(endpoint, formData, token); // upload needs special handling
    },
  };
}

/**
 * Type for authenticated API client
 */
export type AuthenticatedClient = ReturnType<typeof createAuthenticatedClient>;

/**
 * Create authenticated API client from NextAuth session
 * 
 * This is a convenience wrapper that extracts the token from the session
 * and creates an authenticated client.
 */
export function createAuthenticatedApiClient(session: any) {
  if (!session?.accessToken) {
    throw new Error("No access token in session");
  }
  
  // Extract orgId from session if available
  const orgId = session?.user?.orgId || session?.orgId;
  
  return createAuthenticatedClient(session.accessToken, orgId);
}

// Re-export CORA client for CORA API Gateway endpoints
export {
  createCoraAuthenticatedClient,
  coraFetch,
  type CoraAuthenticatedClient,
} from "./cora-client";

// Re-export CORA authentication adapters
export { type CoraAuthAdapter, type CreateAuthAdapter } from "./auth/types";
export {
  createClerkAuthAdapter,
  isClerkAuthenticated,
} from "./auth/adapters/clerk-adapter";
