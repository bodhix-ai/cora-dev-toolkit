/**
 * Workspace Module - API Client
 *
 * Provides type-safe API methods for interacting with the Workspace Lambda.
 * Uses CORA-compliant authentication via the api-client package.
 * 
 * IMPORTANT: All routes require org_id for security (org boundary enforcement).
 */

import { createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";
import type {
  Workspace,
  WorkspaceConfig,
  WorkspaceMember,
  WorkspaceCreateRequest,
  WorkspaceUpdateRequest,
  WorkspaceQueryParams,
  WorkspaceListResponse,
  AddMemberRequest,
  UpdateMemberRequest,
  FavoriteToggleResponse,
  DeleteWorkspaceResponse,
  WorkspaceStats,
  WorkspaceAnalytics,
} from "../types";

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Workspace API Client
 *
 * All methods require org_id for security - enforces organization boundaries.
 */
export class WorkspaceApiClient {
  private client: ReturnType<typeof createCoraAuthenticatedClient>;

  constructor(token: string) {
    this.client = createCoraAuthenticatedClient(token);
  }

  // ===========================================================================
  // Workspace CRUD
  // ===========================================================================

  /**
   * List workspaces for the current user
   */
  async listWorkspaces(params?: WorkspaceQueryParams): Promise<WorkspaceListResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.org_id) queryParams.set("org_id", params.org_id);
      if (params?.status) queryParams.set("status", params.status);
      if (params?.favorites_only) queryParams.set("favorites_only", "true");
      if (params?.search) queryParams.set("search", params.search);
      if (params?.tags?.length) queryParams.set("tags", params.tags.join(","));
      if (params?.include_deleted) queryParams.set("include_deleted", "true");
      if (params?.limit) queryParams.set("limit", String(params.limit));
      if (params?.offset) queryParams.set("offset", String(params.offset));

      const queryString = queryParams.toString();
      const url = queryString ? `/ws?${queryString}` : "/ws";

      const response = await this.client.get<ApiResponse<WorkspaceListResponse>>(url);
      return response?.data || { workspaces: [], total: 0, limit: 50, offset: 0 };
    } catch (error) {
      console.error("Failed to list workspaces:", error);
      throw new Error("Failed to load workspaces");
    }
  }

  /**
   * Get a single workspace by ID
   */
  async getWorkspace(workspaceId: string, orgId: string): Promise<Workspace | null> {
    try {
      const response = await this.client.get<ApiResponse<{ workspace: Workspace }>>(`/ws/${workspaceId}?org_id=${orgId}`);
      return response?.data?.workspace || null;
    } catch (error) {
      console.error(`Failed to get workspace ${workspaceId}:`, error);
      return null;
    }
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(data: WorkspaceCreateRequest): Promise<Workspace> {
    try {
      // org_id is included in data.org_id
      const response = await this.client.post<ApiResponse<Workspace>>("/ws", data);
      if (!response?.data) {
        throw new Error(response?.error || "Failed to create workspace");
      }
      return response.data;
    } catch (error) {
      console.error("Failed to create workspace:", error);
      throw new Error("Failed to create workspace");
    }
  }

  /**
   * Update a workspace
   */
  async updateWorkspace(workspaceId: string, data: WorkspaceUpdateRequest, orgId: string): Promise<Workspace> {
    try {
      const response = await this.client.put<ApiResponse<Workspace>>(`/ws/${workspaceId}?org_id=${orgId}`, data);
      if (!response?.data) {
        throw new Error(response?.error || "Failed to update workspace");
      }
      return response.data;
    } catch (error) {
      console.error(`Failed to update workspace ${workspaceId}:`, error);
      throw new Error("Failed to update workspace");
    }
  }

  /**
   * Delete a workspace (soft delete by default)
   */
  async deleteWorkspace(workspaceId: string, orgId: string, permanent = false): Promise<DeleteWorkspaceResponse> {
    try {
      const params = new URLSearchParams({ org_id: orgId });
      if (permanent) params.set("permanent", "true");
      const response = await this.client.delete<ApiResponse<DeleteWorkspaceResponse>>(`/ws/${workspaceId}?${params.toString()}`);
      return response?.data || { success: true };
    } catch (error) {
      console.error(`Failed to delete workspace ${workspaceId}:`, error);
      throw new Error("Failed to delete workspace");
    }
  }

  /**
   * Restore a soft-deleted workspace
   */
  async restoreWorkspace(workspaceId: string, orgId: string): Promise<Workspace> {
    try {
      const response = await this.client.post<ApiResponse<Workspace>>(
        `/ws/${workspaceId}/restore?org_id=${orgId}`,
        {}
      );
      if (!response?.data) {
        throw new Error(response?.error || "Failed to restore workspace");
      }
      return response.data;
    } catch (error) {
      console.error(`Failed to restore workspace ${workspaceId}:`, error);
      throw new Error("Failed to restore workspace");
    }
  }

  // ===========================================================================
  // Member Management
  // ===========================================================================

  /**
   * List members of a workspace
   */
  async listMembers(workspaceId: string, orgId: string): Promise<WorkspaceMember[]> {
    try {
      const response = await this.client.get<ApiResponse<{ members: WorkspaceMember[]; totalCount: number }>>(
        `/ws/${workspaceId}/members?org_id=${orgId}`
      );
      return response?.data?.members || [];
    } catch (error) {
      console.error(`Failed to list members for workspace ${workspaceId}:`, error);
      return [];
    }
  }

  /**
   * Add a member to a workspace
   */
  async addMember(workspaceId: string, data: AddMemberRequest, orgId: string): Promise<WorkspaceMember> {
    try {
      const response = await this.client.post<ApiResponse<WorkspaceMember>>(
        `/ws/${workspaceId}/members?org_id=${orgId}`,
        data
      );
      if (!response?.data) {
        throw new Error(response?.error || "Failed to add member");
      }
      return response.data;
    } catch (error) {
      console.error(`Failed to add member to workspace ${workspaceId}:`, error);
      throw new Error("Failed to add member");
    }
  }

  /**
   * Update a member's role
   */
  async updateMember(
    workspaceId: string,
    memberId: string,
    data: UpdateMemberRequest,
    orgId: string
  ): Promise<WorkspaceMember> {
    try {
      const response = await this.client.put<ApiResponse<WorkspaceMember>>(
        `/ws/${workspaceId}/members/${memberId}?org_id=${orgId}`,
        data
      );
      if (!response?.data) {
        throw new Error(response?.error || "Failed to update member");
      }
      return response.data;
    } catch (error) {
      console.error(`Failed to update member ${memberId} in workspace ${workspaceId}:`, error);
      throw new Error("Failed to update member role");
    }
  }

  /**
   * Remove a member from a workspace
   */
  async removeMember(workspaceId: string, memberId: string, orgId: string): Promise<void> {
    try {
      await this.client.delete(`/ws/${workspaceId}/members/${memberId}?org_id=${orgId}`);
    } catch (error) {
      console.error(`Failed to remove member ${memberId} from workspace ${workspaceId}:`, error);
      throw new Error("Failed to remove member");
    }
  }

  // ===========================================================================
  // Favorites
  // ===========================================================================

  /**
   * Toggle favorite status for a workspace
   */
  async toggleFavorite(workspaceId: string, orgId: string): Promise<FavoriteToggleResponse> {
    try {
      const response = await this.client.post<ApiResponse<FavoriteToggleResponse & { isFavorited?: boolean; favoritedAt?: string }>>(
        `/ws/${workspaceId}/favorite?org_id=${orgId}`,
        {}
      );
      
      // Normalize camelCase API response to snake_case (API may return either format)
      const data = response?.data;
      if (data) {
        return {
          is_favorited: data.is_favorited ?? data.isFavorited ?? false,
          favorited_at: data.favorited_at ?? data.favoritedAt,
        };
      }
      return { is_favorited: false };
    } catch (error) {
      console.error(`Failed to toggle favorite for workspace ${workspaceId}:`, error);
      throw new Error("Failed to update favorite status");
    }
  }

  /**
   * Get user's favorite workspaces
   */
  async getFavorites(orgId: string): Promise<Workspace[]> {
    try {
      const response = await this.client.get<ApiResponse<Workspace[]>>(`/ws/favorites?org_id=${orgId}`);
      return response?.data || [];
    } catch (error) {
      console.error("Failed to get favorites:", error);
      return [];
    }
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Get workspace module configuration
   */
  async getConfig(orgId: string): Promise<WorkspaceConfig | null> {
    try {
      const response = await this.client.get<ApiResponse<WorkspaceConfig>>(`/ws/config?org_id=${orgId}`);
      return response?.data || null;
    } catch (error) {
      console.error("Failed to get workspace config:", error);
      return null;
    }
  }

  /**
   * Update workspace module configuration (platform admin only)
   */
  async updateConfig(data: Partial<WorkspaceConfig>, orgId: string): Promise<WorkspaceConfig> {
    try {
      const response = await this.client.put<ApiResponse<WorkspaceConfig>>(
        `/ws/config?org_id=${orgId}`,
        data
      );
      if (!response?.data) {
        throw new Error(response?.error || "Failed to update configuration");
      }
      return response.data;
    } catch (error) {
      console.error("Failed to update workspace config:", error);
      throw new Error("Failed to update configuration");
    }
  }

  // ===========================================================================
  // Admin Endpoints
  // ===========================================================================

  /**
   * Get workspace statistics (org admin)
   */
  async getStats(orgId: string): Promise<WorkspaceStats> {
    try {
      const response = await this.client.get<ApiResponse<WorkspaceStats>>(
        `/ws/admin/stats?org_id=${orgId}`
      );
      return response?.data || { total: 0, active: 0, archived: 0, deleted: 0, created_this_month: 0 };
    } catch (error) {
      console.error("Failed to get workspace stats:", error);
      throw new Error("Failed to load statistics");
    }
  }

  /**
   * Get workspace analytics (org admin)
   */
  async getAnalytics(orgId: string, dateRange?: string): Promise<WorkspaceAnalytics | null> {
    try {
      const params = new URLSearchParams({ org_id: orgId });
      if (dateRange) params.set("date_range", dateRange);

      const response = await this.client.get<ApiResponse<WorkspaceAnalytics>>(
        `/ws/admin/analytics?${params.toString()}`
      );
      return response?.data || null;
    } catch (error) {
      console.error("Failed to get workspace analytics:", error);
      return null;
    }
  }

  /**
   * List all workspaces in org (admin view - includes non-member workspaces)
   */
  async adminListWorkspaces(
    orgId: string,
    params?: WorkspaceQueryParams
  ): Promise<WorkspaceListResponse> {
    try {
      const queryParams = new URLSearchParams({ org_id: orgId });
      if (params?.status) queryParams.set("status", params.status);
      if (params?.search) queryParams.set("search", params.search);
      if (params?.include_deleted) queryParams.set("include_deleted", "true");
      if (params?.limit) queryParams.set("limit", String(params.limit));
      if (params?.offset) queryParams.set("offset", String(params.offset));

      const response = await this.client.get<ApiResponse<WorkspaceListResponse>>(
        `/ws/admin/workspaces?${queryParams.toString()}`
      );
      return response?.data || { workspaces: [], total: 0, limit: 50, offset: 0 };
    } catch (error) {
      console.error("Failed to list admin workspaces:", error);
      throw new Error("Failed to load workspaces");
    }
  }

  /**
   * Admin restore workspace (org owner only)
   */
  async adminRestoreWorkspace(workspaceId: string, orgId: string): Promise<Workspace> {
    try {
      const response = await this.client.post<ApiResponse<Workspace>>(
        `/ws/admin/workspaces/${workspaceId}/restore?org_id=${orgId}`,
        {}
      );
      if (!response?.data) {
        throw new Error(response?.error || "Failed to restore workspace");
      }
      return response.data;
    } catch (error) {
      console.error(`Failed to admin restore workspace ${workspaceId}:`, error);
      throw new Error("Failed to restore workspace");
    }
  }

  /**
   * Admin force delete workspace (org owner only)
   */
  async adminForceDelete(workspaceId: string, orgId: string): Promise<void> {
    try {
      await this.client.delete(`/ws/admin/workspaces/${workspaceId}?org_id=${orgId}&force=true`);
    } catch (error) {
      console.error(`Failed to force delete workspace ${workspaceId}:`, error);
      throw new Error("Failed to delete workspace");
    }
  }
}

/**
 * Create a new Workspace API client instance
 *
 * @param token - JWT access token from CORA authAdapter
 */
export function createWorkspaceApiClient(token: string): WorkspaceApiClient {
  return new WorkspaceApiClient(token);
}

/**
 * Default export for convenience
 */
export default WorkspaceApiClient;
