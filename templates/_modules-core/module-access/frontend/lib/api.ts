import {
  ApiResponse,
  Profile,
  Organization,
  CreateOrgInput,
  OrgMember,
  InviteMemberInput,
  User,
  UserOrganization,
} from "../types";

/**
 * API response interface for profile data
 * 
 * Under CORA Option B (strict camelCase standard):
 * - Backend transforms snake_case → camelCase at the API boundary
 * - Frontend interfaces use pure camelCase
 * 
 * The transformProfileResponse() function maps API response to frontend Profile type.
 */
interface ProfileApiData {
  id: string | number;
  userId?: string;
  email: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  sysRole?: "sys_user" | "sys_admin" | "sys_owner";
  currentOrgId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  organizations?: UserOrganization[];
}

/**
 * Authenticated client interface
 */
interface AuthenticatedClient {
  get: <T>(url: string) => Promise<ApiResponse<T>>;
  post: <T>(url: string, data?: unknown) => Promise<ApiResponse<T>>;
  put: <T>(url: string, data?: unknown) => Promise<ApiResponse<T>>;
  delete: <T>(url: string) => Promise<ApiResponse<T>>;
}

/**
 * Transform API response to frontend Profile type
 * 
 * Under CORA Option B, backend returns camelCase, so this is a straightforward mapping.
 */
function transformProfileResponse(apiData: ProfileApiData): Profile {
  return {
    id: apiData.userId || String(apiData.id),
    email: apiData.email,
    name: apiData.fullName || null,
    firstName: apiData.firstName || null,
    lastName: apiData.lastName || null,
    phone: apiData.phone || null,
    sysRole: apiData.sysRole || "sys_user",
    currentOrgId: apiData.currentOrgId || null,
    createdAt: apiData.createdAt || "",
    updatedAt: apiData.updatedAt || "",
    organizations: apiData.organizations || [],
  };
}

export interface OrgModuleApiClient {
  // Profile endpoints
  getProfile: () => Promise<ApiResponse<Profile>>;
  updateProfile: (data: Partial<Profile>) => Promise<ApiResponse<Profile>>;

  // Organization endpoints
  getOrganizations: () => Promise<ApiResponse<Organization[]>>;
  getOrganization: (orgId: string) => Promise<ApiResponse<Organization>>;
  createOrganization: (
    data: CreateOrgInput
  ) => Promise<ApiResponse<Organization>>;
  updateOrganization: (
    orgId: string,
    data: Partial<Organization>
  ) => Promise<ApiResponse<Organization>>;
  deleteOrganization: (orgId: string) => Promise<ApiResponse<void>>;

  // Member endpoints
  getMembers: (orgId: string) => Promise<ApiResponse<OrgMember[]>>;
  inviteMember: (
    orgId: string,
    data: InviteMemberInput
  ) => Promise<ApiResponse<OrgMember>>;
  updateMemberRole: (
    orgId: string,
    memberId: string,
    role: string
  ) => Promise<ApiResponse<OrgMember>>;
  removeMember: (orgId: string, memberId: string) => Promise<ApiResponse<void>>;
}

/**
 * Factory function to create org-module API client
 * @param authenticatedClient - Authenticated client with CORA auth
 * @returns OrgModuleApiClient
 */
export function createOrgModuleClient(
  authenticatedClient: AuthenticatedClient
): OrgModuleApiClient {
  return {
    // Profile
    getProfile: async () => {
      const response = await authenticatedClient.get<ProfileApiData>("/profiles/me");
      // Transform snake_case API response to camelCase
      if (response.success && response.data) {
        const transformed = transformProfileResponse(response.data);
        return { success: response.success, data: transformed };
      }
      return { success: false, data: {} as Profile, error: "No data returned" };
    },
    updateProfile: async (data) => {
      console.log("[API Client] updateProfile called with data:", data);
      try {
        const result = await authenticatedClient.put<Profile>("/profiles/me", data);
        console.log("[API Client] updateProfile response:", result);
        return result;
      } catch (error) {
        console.error("[API Client] updateProfile error:", error);
        throw error;
      }
    },

    // Organizations
    getOrganizations: () => authenticatedClient.get<Organization[]>("/orgs"),
    getOrganization: (orgId) => authenticatedClient.get<Organization>(`/orgs/${orgId}`),
    createOrganization: (data) => authenticatedClient.post<Organization>("/orgs", data),
    updateOrganization: (orgId, data) =>
      authenticatedClient.put<Organization>(`/orgs/${orgId}`, data),
    deleteOrganization: (orgId) => authenticatedClient.delete<void>(`/orgs/${orgId}`),

    // Members
    getMembers: (orgId) => authenticatedClient.get<OrgMember[]>(`/orgs/${orgId}/members`),
    inviteMember: (orgId, data) =>
      authenticatedClient.post<OrgMember>(`/orgs/${orgId}/invites`, data),
    updateMemberRole: (orgId, memberId, role) =>
      authenticatedClient.put<OrgMember>(`/orgs/${orgId}/members/${memberId}`, { role }),
    removeMember: (orgId, memberId) =>
      authenticatedClient.delete<void>(`/orgs/${orgId}/members/${memberId}`),
  };
}

// =============================================================================
// ORG ADMIN API
// =============================================================================

/**
 * Get the API base URL from environment
 */
const getApiBase = (): string => {
  if (typeof window !== "undefined") {
    return (
      process.env.NEXT_PUBLIC_CORA_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "/api"
    );
  }
  return process.env.NEXT_PUBLIC_CORA_API_URL || "";
};

/**
 * Build URL with query parameters
 */
function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(endpoint, 'https://placeholder');
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return `${url.pathname}${url.search}`;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${getApiBase()}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorMessage;
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  if (!response.body || response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Org user interface for admin endpoints
 */
interface OrgUser {
  userId: string;
  email: string;
  fullName?: string;
  orgRole: string;
  createdAt: string;
  lastSigninAt?: string;
}

/**
 * Get organization users (org admin)
 * GET /admin/org/access/users?orgId={orgId}
 * 
 * ✅ STANDARD PATTERN: Accepts token string and orgId (extracted at page level)
 */
export async function getOrgAdminUsers(token: string, orgId: string): Promise<{ success: boolean; data: OrgUser[] }> {
  const url = buildUrl("/admin/org/access/users", { orgId });
  const data = await apiRequest<{ success: boolean; data: OrgUser[] }>(url, token);
  return data;
}

/**
 * Update organization user role (org admin)
 * PUT /admin/org/access/users/{userId}?orgId={orgId}
 * 
 * ✅ STANDARD PATTERN: Accepts token string and orgId (extracted at page level)
 */
export async function updateOrgUserRole(
  token: string,
  orgId: string,
  userId: string,
  role: string
): Promise<{ message: string }> {
  const url = buildUrl(`/admin/org/access/users/${userId}`, { orgId });
  return apiRequest(url, token, {
    method: "PUT",
    body: JSON.stringify({ org_role: role }),
  });
}

/**
 * Remove organization user (org admin)
 * DELETE /admin/org/access/users/{userId}?orgId={orgId}
 * 
 * ✅ STANDARD PATTERN: Accepts token string and orgId (extracted at page level)
 */
export async function removeOrgUser(
  token: string,
  orgId: string,
  userId: string
): Promise<{ message: string }> {
  const url = buildUrl(`/admin/org/access/users/${userId}`, { orgId });
  return apiRequest(url, token, {
    method: "DELETE",
  });
}
