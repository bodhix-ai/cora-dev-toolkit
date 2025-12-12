import {
  ApiResponse,
  Profile,
  Organization,
  CreateOrgInput,
  OrgMember,
  InviteMemberInput,
  User,
} from "../types";

/**
 * Transform snake_case API response to camelCase frontend types
 */
function transformProfileResponse(apiData: any): Profile {
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
 * @param authenticatedClient - Axios instance with authentication
 * @returns OrgModuleApiClient
 */
export function createOrgModuleClient(
  authenticatedClient: any
): OrgModuleApiClient {
  return {
    // Profile
    getProfile: async () => {
      const response = await authenticatedClient.get("/profiles/me");
      // Transform snake_case API response to camelCase
      if (response.success && response.data) {
        response.data = transformProfileResponse(response.data);
      }
      return response;
    },
    updateProfile: async (data) => {
      console.log("[API Client] updateProfile called with data:", data);
      try {
        const result = await authenticatedClient.put("/profiles/me", data);
        console.log("[API Client] updateProfile response:", result);
        return result;
      } catch (error) {
        console.error("[API Client] updateProfile error:", error);
        throw error;
      }
    },

    // Organizations
    getOrganizations: () => authenticatedClient.get("/orgs"),
    getOrganization: (id) => authenticatedClient.get(`/orgs/${id}`),
    createOrganization: (data) => authenticatedClient.post("/orgs", data),
    updateOrganization: (id, data) =>
      authenticatedClient.put(`/orgs/${id}`, data),
    deleteOrganization: (id) => authenticatedClient.delete(`/orgs/${id}`),

    // Members
    getMembers: (orgId) => authenticatedClient.get(`/orgs/${orgId}/members`),
    inviteMember: (orgId, data) =>
      authenticatedClient.post(`/orgs/${orgId}/members`, data),
    updateMemberRole: (orgId, memberId, role) =>
      authenticatedClient.put(`/orgs/${orgId}/members/${memberId}`, { role }),
    removeMember: (orgId, memberId) =>
      authenticatedClient.delete(`/orgs/${orgId}/members/${memberId}`),
  };
}
