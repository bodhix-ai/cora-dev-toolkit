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
  org_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  tags: string[];
  status: WorkspaceStatus;
  deleted_at?: string;
  retention_days: number;
  created_at: string;
  updated_at: string;
  created_by: string;

  // Computed fields from API
  is_favorited?: boolean;
  favorited_at?: string;
  user_role?: WorkspaceRole;
  member_count?: number;
}

/**
 * Workspace member
 */
export interface WorkspaceMember {
  id: string;
  ws_id: string;
  user_id: string;
  ws_role: WorkspaceRole;
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
}

/**
 * User profile (from module-access)
 */
export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
}

/**
 * Workspace favorite record
 */
export interface WorkspaceFavorite {
  id: string;
  ws_id: string;
  user_id: string;
  created_at: string;
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Workspace module configuration
 */
export interface WorkspaceConfig {
  id: string;
  nav_label_singular: string;
  nav_label_plural: string;
  nav_icon: string;
  enable_favorites: boolean;
  enable_tags: boolean;
  enable_color_coding: boolean;
  default_color: string;
  default_retention_days: number;
  max_tags_per_workspace: number;
  max_tag_length: number;
  created_at: string;
  updated_at: string;
  updated_by?: string;
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
  is_favorited: boolean;
  favorited_at?: string;
}

/**
 * Delete workspace response
 */
export interface DeleteWorkspaceResponse {
  success: boolean;
  deleted_at?: string;
  retention_days?: number;
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
  created_this_month: number;
}

/**
 * Organization workspace summary (for platform admin)
 */
export interface OrgWorkspaceSummary {
  org_id: string;
  org_name: string;
  total_workspaces: number;
  active_workspaces: number;
  avg_per_user: number;
  trend_percent: number;
}

/**
 * Feature adoption metrics
 */
export interface FeatureAdoption {
  favorites_percent: number;
  tags_percent: number;
  colors_percent: number;
}

/**
 * Analytics data for workspace usage
 */
export interface WorkspaceAnalytics {
  stats: WorkspaceStats;
  workspaces_over_time: TimeSeriesData[];
  status_distribution: StatusDistribution;
  most_active: WorkspaceActivity[];
  inactive_workspaces: InactiveWorkspace[];
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
  workspace_id: string;
  workspace_name: string;
  action_count: number;
}

/**
 * Inactive workspace for cleanup suggestions
 */
export interface InactiveWorkspace {
  workspace_id: string;
  workspace_name: string;
  days_inactive: number;
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
export type WorkspaceSortField = 'name' | 'created_at' | 'updated_at' | 'member_count';
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
export const ROLE_DISPLAY_NAMES: Record<WorkspaceRole, string> = {
  ws_owner: 'Owner',
  ws_admin: 'Admin',
  ws_user: 'Member',
};

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
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
  field: 'updated_at',
  direction: 'desc',
};
