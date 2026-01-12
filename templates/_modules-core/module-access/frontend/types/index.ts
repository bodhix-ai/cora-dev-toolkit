// User & Profile Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  globalRole: "global_user" | "global_admin" | "global_owner" | "platform_owner";
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
  slug: string;
  description: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  appName: string | null;
  appIcon: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string | null;
}

// Organization Membership Types
export interface OrgMember {
  id: string;
  orgId: string;
  personId: string;
  roleName: "org_user" | "org_admin" | "org_owner";
  joinedAt: string;
  invitedBy: string | null;
  user?: User;
}

// User Organization (for listing user's orgs)
export interface UserOrganization {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: "org_user" | "org_admin" | "org_owner";
  isOwner: boolean;
  joinedAt: string;
  logoUrl: string | null;
  appName: string | null;
  appIcon: string | null;
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
