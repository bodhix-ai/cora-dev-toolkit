// Auth Adapters
export {
  createClerkAuthAdapter,
  createClerkAuthAdapterWithOptions,
  createClerkServerAdapter,
  createOktaAuthAdapter,
  createOktaServerAdapter,
} from "./adapters";
export type { AuthAdapter, AuthConfig } from "./adapters";
export type { AuthProvider as AuthProviderType } from "./adapters";

// Auth Providers
export {
  createOktaAuthOptions,
  getOktaConfig,
  getClerkConfig,
  isClerkConfigured,
  clerkRoutes,
  clerkPublicRoutes,
  getActiveAuthProvider,
} from "./providers";
export type {
  OktaConfig,
  OktaSession,
  OktaJWT,
  ClerkConfig,
} from "./providers";

// Unified Auth (Dynamic Clerk/Okta Support)
export { useUnifiedAuth } from "./hooks/useUnifiedAuth";
export type { UnifiedAuthState } from "./hooks/useUnifiedAuth";
export { AuthProvider } from "./components/AuthProvider";
export { SessionTracking } from "./components/SessionTracking";

// Contexts
export { UserProvider, useUser } from "./contexts/UserContext";
export { UserProviderWrapper } from "./components/UserProviderWrapper";
export { OrgProvider } from "./contexts/OrgContext";

// Hooks
export { useProfile } from "./hooks/useProfile";
export { useOrganizations } from "./hooks/useOrganizations";
export { useCurrentOrg } from "./hooks/useCurrentOrg";
export { useOrgMembers } from "./hooks/useOrgMembers";

// Compatibility hooks for legacy components
export { useOrganizationContext } from "./hooks/useOrganizationContext";
export { useRole } from "./hooks/useRole";

// Types
export type {
  User,
  Profile,
  Organization,
  OrgMember,
  UserOrganization,
  ApiResponse,
  CreateOrgInput,
  UpdateProfileInput,
  InviteMemberInput,
} from "./types";

// API
export { createOrgModuleClient } from "./lib/api";
export type { OrgModuleApiClient } from "./lib/api";

// Utilities - Permissions
export {
  canManageMembers,
  canManageSettings,
  isOrgOwner,
  isOrgAdmin,
  hasOrgAdminAccess,
  isGlobalAdmin,
  getRoleDisplayName,
} from "./lib/permissions";

// Utilities - Validation
export {
  validateOrgName,
  validateSlug,
  generateSlug,
  validateEmail,
  validateUrl,
} from "./lib/validation";

// Components - Onboarding
export { CreateOrganization } from "./components/onboarding/CreateOrganization";

// Components - Layout
export { NavLink } from "./components/layout/NavLink";
export { ResizeHandle } from "./components/layout/ResizeHandle";
export { Sidebar } from "./components/layout/Sidebar";
export { SidebarUserMenu } from "./components/layout/SidebarUserMenu";
export { Dashboard } from "./components/layout/Dashboard";

// Components - Profile
export { ProfileCard } from "./components/profile/ProfileCard";

// Components - Organization
export { OrgSelector } from "./components/org/OrgSelector";
export { OrgMembersList } from "./components/org/OrgMembersList";
export { InviteMemberDialog } from "./components/org/InviteMemberDialog";

// Navigation
export { orgNavigation, orgUtilityNavigation } from "./navigation";

// Admin Components (Platform Admins only)
// Note: IdpConfigCard uses MUI components (@mui/material)
export { IdpConfigCard } from "./components/admin/IdpConfigCard";
