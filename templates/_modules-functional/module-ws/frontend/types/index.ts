/**
 * Workspace Module - TypeScript Type Definitions
 *
 * This file defines all TypeScript interfaces and types used in the
 * Workspace Module frontend.
 */

// =============================================================================
// Core Workspace Types
// =============================================================================

/**
 * Workspace status
 */
export type WorkspaceStatus = 'active' | 'archived';

/**
 * Workspace member role
 */
export type WorkspaceRole = 'ws_owner' | 'ws_admin' | 'ws_user';

/**
 * Workspace entity
 */
export interface Workspace {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  tags: string[];
  status: WorkspaceStatus;
  deletedAt?: string;
  retentionDays: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  // Computed fields from API
  isFavorited?: boolean;
  favoritedAt?: string;
  userRole?: WorkspaceRole;
  memberCount?: number;
}

/**
 * Workspace member
 */
export interface WorkspaceMember {
  id: string;
  wsId: string;
  userId: string;
  wsRole: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
  profile?: UserProfile;
}

/**
 * User profile (from module-access)
 */
export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * Workspace favorite record
 */
export interface WorkspaceFavorite {
  id: string;
  wsId: string;
  userId: string;
  createdAt: string;
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Workspace module configuration
 */
export interface WorkspaceConfig {
  id: string;
  navLabelSingular: string;
  navLabelPlural: string;
  navIcon: string;
  enableFavorites: boolean;
  enableTags: boolean;
  enableColorCoding: boolean;
  defaultColor: string;
  defaultRetentionDays: number;
  maxTagsPerWorkspace: number;
  maxTagLength: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

// =============================================================================
// Request/Response Types
// =============================================================================

/**
 * Create workspace request
 */
export interface WorkspaceCreateRequest {
  org_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  tags?: string[];
}

/**
 * Update workspace request
 */
export interface WorkspaceUpdateRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  tags?: string[];
  status?: WorkspaceStatus;
}

/**
 * Add member request
 */
export interface AddMemberRequest {
  user_id: string;
  ws_role: WorkspaceRole;
}

/**
 * Update member request
 */
export interface UpdateMemberRequest {
  ws_role: WorkspaceRole;
}

/**
 * Workspace query parameters
 */
export interface WorkspaceQueryParams {
  org_id?: string;
  status?: WorkspaceStatus;
  favorites_only?: boolean;
  search?: string;
  tags?: string[];
  include_deleted?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Workspace list response
 */
export interface WorkspaceListResponse {
  workspaces: Workspace[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Favorite toggle response
 */
export interface FavoriteToggleResponse {
  isFavorited: boolean;
  favoritedAt?: string;
}

/**
 * Delete workspace response
 */
export interface DeleteWorkspaceResponse {
  success: boolean;
  deletedAt?: string;
  retentionDays?: number;
  permanent?: boolean;
}

// =============================================================================
// Admin Types
// =============================================================================

/**
 * Workspace statistics for admin dashboard
 */
export interface WorkspaceStats {
  total: number;
  active: number;
  archived: number;
  deleted: number;
  createdThisMonth: number;
}

/**
 * Organization workspace summary (for platform admin)
 */
export interface OrgWorkspaceSummary {
  orgId: string;
  orgName: string;
  totalWorkspaces: number;
  activeWorkspaces: number;
  avgPerUser: number;
  trendPercent: number;
}

/**
 * Feature adoption metrics
 */
export interface FeatureAdoption {
  favoritesPercent: number;
  tagsPercent: number;
  colorsPercent: number;
}

/**
 * Analytics data for workspace usage
 * 
 * Note: API returns flat structure with orgId context
 */
export interface WorkspaceAnalytics {
  // API response format (flat structure from /ws/admin/analytics)
  orgId?: string;
  totalWorkspaces?: number;
  activeWorkspaces?: number;
  archivedWorkspaces?: number;
  deletedWorkspaces?: number;
  totalMembers?: number;
  avgMembersPerWorkspace?: number;
  
  // Legacy format (for backwards compatibility)
  stats?: WorkspaceStats;
  workspacesOverTime?: TimeSeriesData[];
  statusDistribution?: StatusDistribution;
  mostActive?: WorkspaceActivity[];
  inactiveWorkspaces?: InactiveWorkspace[];
}

/**
 * Time series data point
 */
export interface TimeSeriesData {
  date: string;
  count: number;
}

/**
 * Status distribution
 */
export interface StatusDistribution {
  active: number;
  archived: number;
  deleted: number;
}

/**
 * Workspace activity for analytics
 */
export interface WorkspaceActivity {
  workspaceId: string;
  workspaceName: string;
  actionCount: number;
}

/**
 * Inactive workspace for cleanup suggestions
 */
export interface InactiveWorkspace {
  workspaceId: string;
  workspaceName: string;
  daysInactive: number;
  recommendation: 'archive' | 'delete' | 'review';
}

// =============================================================================
// UI State Types
// =============================================================================

/**
 * Workspace form values (for create/edit)
 */
export interface WorkspaceFormValues {
  name: string;
  description: string;
  color: string;
  icon: string;
  tags: string[];
  status?: WorkspaceStatus;
}

/**
 * Workspace form errors
 */
export interface WorkspaceFormErrors {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  tags?: string;
  status?: string;
}

/**
 * Filter state for workspace list
 */
export interface WorkspaceFilters {
  search: string;
  status: WorkspaceStatus | 'all';
  favoritesOnly: boolean;
  tags: string[];
}

/**
 * Sort options for workspace list
 */
export type WorkspaceSortField = 'name' | 'createdAt' | 'updatedAt' | 'memberCount';
export type SortDirection = 'asc' | 'desc';

export interface WorkspaceSortOptions {
  field: WorkspaceSortField;
  direction: SortDirection;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default workspace colors
 */
export const WORKSPACE_COLORS = [
  '#1976d2', // Blue
  '#388e3c', // Green
  '#f57c00', // Orange
  '#d32f2f', // Red
  '#7b1fa2', // Purple
  '#0097a7', // Cyan
  '#455a64', // Blue Grey
  '#5d4037', // Brown
  '#303f9f', // Indigo
  '#c2185b', // Pink
] as const;

/**
 * Available workspace icons (MUI icon names)
 */
export const WORKSPACE_ICONS = [
  'Workspaces',
  'Folder',
  'FolderOpen',
  'FolderSpecial',
  'Work',
  'Business',
  'Assessment',
  'Campaign',
  'Engineering',
  'Science',
  'School',
  'Groups',
  'Lightbulb',
  'Rocket',
  'Star',
] as const;

/**
 * Role display names
 */
export const WORKSPACE_ROLE_DISPLAY_NAMES: Record<WorkspaceRole, string> = {
  ws_owner: 'Owner',
  ws_admin: 'Admin',
  ws_user: 'Member',
};

/**
 * Role descriptions
 */
export const WORKSPACE_ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  ws_owner: 'Full control over workspace settings, members, and deletion',
  ws_admin: 'Can edit workspace settings but cannot manage members',
  ws_user: 'Can access workspace resources',
};

/**
 * Status display names
 */
export const STATUS_DISPLAY_NAMES: Record<WorkspaceStatus, string> = {
  active: 'Active',
  archived: 'Archived',
};

/**
 * Default form values for new workspace
 */
export const DEFAULT_WORKSPACE_FORM: WorkspaceFormValues = {
  name: '',
  description: '',
  color: '#1976d2',
  icon: 'Workspaces',
  tags: [],
};

/**
 * Default filter values
 */
export const DEFAULT_FILTERS: WorkspaceFilters = {
  search: '',
  status: 'all',
  favoritesOnly: false,
  tags: [],
};

/**
 * Default sort options
 */
export const DEFAULT_SORT: WorkspaceSortOptions = {
  field: 'updatedAt',
  direction: 'desc',
};
