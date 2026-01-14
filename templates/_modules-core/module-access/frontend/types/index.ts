// User & Profile Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  sysRole: "sys_user" | "sys_admin" | "sys_owner";
  currentOrgId: string | null;
  requiresInvitation?: boolean; // Flag for denied access scenario
  createdAt: string;
  updatedAt: string;
}

export interface Profile extends User {
  organizations: UserOrganization[];
}

// Organization Types
export interface Organization {
  id: string;
  name: string;
  slug?: string;
  ownerId: string;
  description?: string;
  websiteUrl?: string;
  logoUrl?: string;
  appName?: string;
  appIcon?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserOrganization {
  orgId: string;
  orgName: string;
  orgSlug?: string;
  role: OrgRole;
  isOwner: boolean;
  joinedAt?: string;
  logoUrl?: string;
  appName?: string | null;
  appIcon?: string | null;
}

export type OrgRole = "org_user" | "org_admin" | "org_owner";

// Organization Member Type (for org member management)
// Matches API response from GET /orgs/{id}/members
export interface OrgMember {
  id: string;
  userId: string;
  orgId: string;
  orgRole: OrgRole;
  role?: OrgRole; // Deprecated: use orgRole
  roleName?: OrgRole; // Deprecated: use orgRole
  createdAt: string;
  updatedAt?: string;
  joinedAt?: string; // Alias for createdAt (backwards compatibility)
  addedBy?: string;
  // User profile info (joined from user_profiles)
  profile?: {
    userId: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  };
  // Deprecated: use profile instead
  user?: {
    email: string;
    name?: string;
    fullName?: string;
    avatarUrl?: string;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Form Input Types
export interface CreateOrgInput {
  name: string;
  slug: string;
  description?: string;
  websiteUrl?: string;
}

export interface UpdateProfileInput {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  currentOrgId?: string;
}

export interface InviteMemberInput {
  email: string;
  role: "org_user" | "org_admin" | "org_owner";
}

// Org Icon Options (AI-related MUI icons)
export const ORG_ICON_OPTIONS = [
  { value: "AutoAwesomeOutlined", label: "Sparkles", default: true },
  { value: "PsychologyOutlined", label: "Brain" },
  { value: "SmartToyOutlined", label: "Robot" },
  { value: "AutoFixHighOutlined", label: "Magic Wand" },
  { value: "BoltOutlined", label: "Lightning" },
  { value: "HubOutlined", label: "Network" },
  { value: "MemoryOutlined", label: "Memory" },
  { value: "ModelTrainingOutlined", label: "Training" },
] as const;

export type OrgIconValue = typeof ORG_ICON_OPTIONS[number]["value"];
