/**
 * API Client
 * 
 * Provides a wrapper around fetch() that calls API Gateway directly.
 * Automatically injects Bearer token for authenticated requests.
 * 
 * Based on production patterns from career and policy stacks.
 */

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

interface RequestOptions extends RequestInit {
  token?: string;
}

/**
 * Make an authenticated API request to API Gateway
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, headers, ...restOptions } = options;

  // Construct full URL - calls API Gateway directly
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_GATEWAY_URL}${endpoint}`;

  // Build headers with authentication
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  // Add Bearer token if provided
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  // Make direct request to API Gateway
  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });

  // Handle errors
  if (!response.ok) {
    // Handle JWT expiration (401/403)
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
 * Create an authenticated API client with a token
 */
export function createApiClient(token: string) {
  return {
    get: <T>(endpoint: string) => request<T>(endpoint, { method: "GET", token }),
    post: <T>(endpoint: string, data?: unknown) =>
      request<T>(endpoint, {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    put: <T>(endpoint: string, data?: unknown) =>
      request<T>(endpoint, {
        method: "PUT",
        token,
        body: JSON.stringify(data),
      }),
    patch: <T>(endpoint: string, data?: unknown) =>
      request<T>(endpoint, {
        method: "PATCH",
        token,
        body: JSON.stringify(data),
      }),
    delete: <T>(endpoint: string) =>
      request<T>(endpoint, { method: "DELETE", token }),
  };
}
