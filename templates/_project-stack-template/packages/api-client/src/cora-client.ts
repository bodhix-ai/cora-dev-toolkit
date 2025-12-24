/**
 * CORA API Client
 *
 * Provides authenticated fetch wrapper for CORA API Gateway endpoints.
 * Uses NextAuth session for Bearer token authentication.
 *
 * IMPORTANT: This client points to the CORA API Gateway, not the legacy monolith.
 * Use this for all CORA-migrated endpoints (AI providers, AI config, etc.)
 */

const CORA_API_BASE_URL =
  process.env.NEXT_PUBLIC_CORA_API_URL ||
  process.env.NEXT_PUBLIC_CORA_API_GATEWAY_URL ||
  "";

interface CoraRequestOptions extends RequestInit {
  token?: string;
  orgId?: string;
}

/**
 * Make an authenticated request to CORA API Gateway
 */
async function coraRequest<T>(
  endpoint: string,
  options: CoraRequestOptions = {}
): Promise<T> {
  const { token, orgId, headers, ...restOptions } = options;

  if (!CORA_API_BASE_URL) {
    throw new Error(
      "CORA API URL not configured. Please set NEXT_PUBLIC_CORA_API_URL environment variable."
    );
  }

  // Construct full URL
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${CORA_API_BASE_URL}${endpoint}`;

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
    // Only handle 401 (Unauthorized) as session expired
    // 403 (Forbidden) means insufficient permissions, not expired session
    if (response.status === 401) {
      // Auto-logout on token expiration
      // This handles the case where the user's session expired but they're still using the app
      if (typeof window !== "undefined") {
        // We're in the browser - trigger logout and redirect
        console.warn(
          "[CORA Client] Session expired (401). Redirecting to login..."
        );

        // Use NextAuth signOut if available - NO ERROR PARAM to avoid redirect loops
        if (typeof window !== "undefined" && "next-auth" in window) {
          // Dynamic import to avoid server-side issues
          import("next-auth/react")
            .then(({ signOut }) => {
              signOut({ callbackUrl: "/auth/signin" });
            })
            .catch(() => {
              // Fallback: redirect manually if NextAuth import fails
              window.location.href = "/auth/signin";
            });
        } else {
          // Fallback: redirect manually
          window.location.href = "/auth/signin";
        }
      }

      throw new Error("Session expired. Please log in again.");
    }

    // For 403, include error details from response
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message ||
        errorData.error ||
        `CORA API request failed: ${response.statusText}`
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
 * Create an authenticated CORA API client with token pre-configured
 *
 * This client automatically points to the CORA API Gateway and injects
 * the Bearer token from NextAuth session into all requests.
 *
 * @param token - JWT access token from NextAuth session
 * @param orgId - Optional organization ID for multi-tenant operations
 * @returns Authenticated CORA API client with HTTP methods
 */
export function createCoraAuthenticatedClient(token: string, orgId?: string) {
  const options = { token, orgId };

  return {
    get: <T>(endpoint: string) =>
      coraRequest<T>(endpoint, { method: "GET", ...options }),

    post: <T>(endpoint: string, data?: any) =>
      coraRequest<T>(endpoint, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      }),

    put: <T>(endpoint: string, data: any) =>
      coraRequest<T>(endpoint, {
        method: "PUT",
        body: JSON.stringify(data),
        ...options,
      }),

    patch: <T>(endpoint: string, data: any) =>
      coraRequest<T>(endpoint, {
        method: "PATCH",
        body: JSON.stringify(data),
        ...options,
      }),

    delete: <T>(endpoint: string) =>
      coraRequest<T>(endpoint, { method: "DELETE", ...options }),

    upload: <T>(endpoint: string, formData: FormData) => {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (orgId) headers["X-Org-Id"] = orgId;

      const url = endpoint.startsWith("http")
        ? endpoint
        : `${CORA_API_BASE_URL}${endpoint}`;

      // eslint-disable-next-line no-restricted-globals
      return fetch(url, {
        method: "POST",
        headers,
        body: formData,
      }).then((res) => {
        if (!res.ok) {
          throw new Error(`Upload failed: ${res.statusText}`);
        }
        return res.json();
      });
    },
  };
}

/**
 * Type for CORA authenticated API client
 */
export type CoraAuthenticatedClient = ReturnType<
  typeof createCoraAuthenticatedClient
>;

/**
 * Convenience wrapper for making CORA API calls with automatic session handling
 *
 * Usage in React components:
 * ```tsx
 * import { useSession } from 'next-auth/react';
 * import { coraFetch } from '@pm-app/api-client';
 *
 * const { data: session } = useSession();
 * const data = await coraFetch('/providers', session?.accessToken);
 * ```
 */
export async function coraFetch<T>(
  endpoint: string,
  token?: string,
  options?: Omit<CoraRequestOptions, "token">
): Promise<T> {
  return coraRequest<T>(endpoint, { ...options, token });
}
