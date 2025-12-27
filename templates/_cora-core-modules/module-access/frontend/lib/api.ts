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
 * API response interface (snake_case from backend)
 */
interface ProfileApiData {
  id: string;
  email: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  global_role?: "global_user" | "global_admin" | "global_owner" | "platform_owner";
  current_org_id?: string | null;
  created_at: string;
  updated_at: string;
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
 * Transform snake_case API response to camelCase frontend types
 */
function transformProfileResponse(apiData: ProfileApiData): Profile {
  return {
    id: apiData.id,
    email: apiData.email,
    name: apiData.full_name || null,
    firstName: apiData.first_name || null,
    lastName: apiData.last_name || null,
    phone: apiData.phone || null,
    globalRole: apiData.global_role || "global_user",
    currentOrgId: apiData.current_org_id || null,
    createdAt: apiData.created_at,
    updatedAt: apiData.updated_at,
    organizations: apiData.organizations || [],
  };
}

export interface OrgModuleApiClient {
  // Profile endpoints
  getProfile: () => Promise<ApiResponse<Profile>>;
  updateProfile: (data: Partial<Profile>) => Promise<ApiResponse<Profile>>;

  // Organization endpoints
  getOrganizations: () => Promise<ApiResponse<Organization[]>>;
  getOrganization: (id: string) => Promise<ApiResponse<Organization>>;
  createOrganization: (
    data: CreateOrgInput
  ) => Promise<ApiResponse<Organization>>;
  updateOrganization: (
    id: string,
    data: Partial<Organization>
  ) => Promise<ApiResponse<Organization>>;
  deleteOrganization: (id: string) => Promise<ApiResponse<void>>;

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
    getOrganization: (id) => authenticatedClient.get<Organization>(`/orgs/${id}`),
    createOrganization: (data) => authenticatedClient.post<Organization>("/orgs", data),
    updateOrganization: (id, data) =>
      authenticatedClient.put<Organization>(`/orgs/${id}`, data),
    deleteOrganization: (id) => authenticatedClient.delete<void>(`/orgs/${id}`),

    // Members
    getMembers: (orgId) => authenticatedClient.get<OrgMember[]>(`/orgs/${orgId}/members`),
    inviteMember: (orgId, data) =>
      authenticatedClient.post<OrgMember>(`/orgs/${orgId}/members`, data),
    updateMemberRole: (orgId, memberId, role) =>
      authenticatedClient.put<OrgMember>(`/orgs/${orgId}/members/${memberId}`, { role }),
    removeMember: (orgId, memberId) =>
      authenticatedClient.delete<void>(`/orgs/${orgId}/members/${memberId}`),
  };
}
