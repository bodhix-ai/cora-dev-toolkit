import { create } from "zustand";
import {
  Organization,
  getOrganizations,
  Profile,
  updateProfile,
} from "../lib/api";

interface OrganizationWithRole extends Organization {
  userRole?: string;
}

interface OrganizationState {
  // State
  organizations: OrganizationWithRole[];
  selectedOrganization: OrganizationWithRole | null;
  loading: boolean;
  error: string | null;
  authToken: string | null; // Store token for API calls

  // Actions
  loadOrganizations: (token: string, profile: Profile) => Promise<void>;
  setSelectedOrganization: (organization: OrganizationWithRole | null) => void;
  selectOrganizationById: (organizationId: string) => void;
  clearOrganizations: () => void;

  // Utilities
  getDefaultOrganization: () => OrganizationWithRole | null;
  persistSelectedOrganization: (
    organization: OrganizationWithRole | null
  ) => void;
  loadPersistedOrganization: () => OrganizationWithRole | null;
}

const STORAGE_KEY = "policymind_selected_organization";

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  // Initial state
  organizations: [],
  selectedOrganization: null,
  loading: false,
  error: null,
  authToken: null, // Store token for backend persistence

  // Load organizations from API - only user memberships
  loadOrganizations: async (token: string, profile: Profile) => {
    // Guard: Don't load if already loading
    const { loading: isCurrentlyLoading } = get();
    if (isCurrentlyLoading) {
      console.log("Organizations already loading, skipping duplicate request");
      return;
    }

    // Guard: Don't load if already have organizations (unless forced refresh needed)
    const { organizations: existingOrgs } = get();
    if (existingOrgs.length > 0) {
      console.log("Organizations already loaded, skipping duplicate request");
      return;
    }

    set({ loading: true, error: null, authToken: token }); // Store token for later use

    try {
      console.log("Loading user member organizations with token:", !!token);

      // Use profile passed from caller (already loaded by AppShell via provisionUser)
      // OPTIMIZATION: Removed redundant getProfile() call - profile is passed as parameter
      console.log("Using provided profile:", {
        email: profile.email,
        global_role: profile.global_role,
        org_members_count: profile.org_members?.length || 0,
      });

      // Get all organizations (this may return all orgs for super-admin)
      const allOrganizations = await getOrganizations(token, "user");
      console.log("API returned organizations:", allOrganizations.length);
      console.log(
        "Organization names:",
        allOrganizations.map((org) => org.name)
      );

      // Debug: Log the complete profile data structure
      console.log("Complete profile object:", JSON.stringify(profile, null, 2));
      console.log("Profile org_members:", profile.org_members);
      console.log("Profile user_id:", profile.user_id);
      console.log("Type of org_members:", typeof profile.org_members);
      console.log("Is org_members array?", Array.isArray(profile.org_members));

      // Also check if there are alternative fields for memberships
      console.log("Profile keys:", Object.keys(profile));
      console.log(
        'Any field containing "member":',
        Object.keys(profile).filter((key) =>
          key.toLowerCase().includes("member")
        )
      );
      console.log(
        'Any field containing "org":',
        Object.keys(profile).filter((key) => key.toLowerCase().includes("org"))
      );

      // Create a map of organization ID to user role
      const orgRoleMap = new Map<string, string>();

      // Get organization IDs and roles from profile memberships
      const memberOrgIds = new Set<string>();

      if (profile.org_members && profile.org_members.length > 0) {
        profile.org_members.forEach((member) => {
          console.log("Processing member:", member);
          if (
            member.org_id &&
            (member.role === "org_user" ||
              member.role === "org_member" ||
              member.role === "org_admin" ||
              member.role === "org_owner" ||
              // Legacy role names for backward compatibility
              member.role === "user" ||
              member.role === "admin" ||
              member.role === "owner")
          ) {
            memberOrgIds.add(member.org_id);
            orgRoleMap.set(member.org_id, member.role);
            console.log(
              `Added membership org ID: ${member.org_id} (role: ${member.role})`
            );
          }
        });
      } else {
        console.warn(
          "⚠️ org_members is undefined or empty! This may indicate a backend data issue."
        );
        console.warn(
          "Falling back to owner_id check, but roles may be incorrect."
        );
      }

      console.log(
        "Member organization IDs from profile:",
        Array.from(memberOrgIds)
      );

      // IMPORTANT: Also check orgs.owner_id as fallback for membership
      // NOTE: owner_id indicates who created the org, and owner should have org_owner role
      const ownedOrgIds = new Set<string>();
      if (profile.user_id) {
        allOrganizations.forEach((org) => {
          if (org.owner_id === profile.user_id) {
            ownedOrgIds.add(org.id);
            // Only set role from owner_id if NOT already set from org_members
            if (!orgRoleMap.has(org.id)) {
              // Owner should have org_owner role
              orgRoleMap.set(org.id, "org_owner");
              console.log(
                `Added owned org ID: ${org.id} (${org.name}) - setting role to org_owner (owner_id match)`
              );
            } else {
              console.log(
                `Org ${org.id} (${org.name}) - role already set from org_members: ${orgRoleMap.get(org.id)}`
              );
            }
          }
        });
      }

      console.log("Owned organization IDs:", Array.from(ownedOrgIds));

      // Combine member and owned organization IDs for access
      const accessibleOrgIds = new Set([...memberOrgIds, ...ownedOrgIds]);
      console.log(
        "All accessible organization IDs:",
        Array.from(accessibleOrgIds)
      );

      // Filter organizations and add user role information
      let memberOrganizations: OrganizationWithRole[];

      if (accessibleOrgIds.size > 0) {
        memberOrganizations = allOrganizations
          .filter((org) => accessibleOrgIds.has(org.id))
          .map((org) => ({
            ...org,
            userRole: orgRoleMap.get(org.id) || "org_member",
          }));
        console.log(
          "Filtered by memberships and ownership:",
          memberOrganizations.length,
          "organizations"
        );
      } else {
        console.warn(
          "No accessible organizations found! This may indicate a data issue."
        );
        console.log(
          "Available organization IDs from API:",
          allOrganizations.map((org) => org.id)
        );
        // Emergency fallback - show first organization to avoid empty state
        memberOrganizations = allOrganizations.slice(0, 1).map((org) => ({
          ...org,
          userRole: "org_member",
        }));
        console.log(
          "Using emergency fallback:",
          memberOrganizations.length,
          "organizations"
        );
      }

      console.log(
        "Final accessible organization names:",
        memberOrganizations.map((org) => org.name)
      );

      set({ organizations: memberOrganizations, loading: false, error: null });

      // Auto-select organization logic
      const { selectedOrganization } = get();

      if (!selectedOrganization && memberOrganizations.length > 0) {
        // PRIORITY 1: Use profile's current_org_id (backend is source of truth)
        let orgToSelect: OrganizationWithRole | null = null;

        if (profile.current_org_id) {
          orgToSelect =
            memberOrganizations.find(
              (org) => org.id === profile.current_org_id
            ) || null;
          if (orgToSelect) {
            console.log(
              "Auto-selecting from profile.current_org_id:",
              orgToSelect.name
            );
          } else {
            console.warn(
              "⚠️ profile.current_org_id not found in member orgs:",
              profile.current_org_id
            );
          }
        }

        // PRIORITY 2: Fall back to localStorage (for backward compatibility)
        if (!orgToSelect) {
          const persistedOrg = get().loadPersistedOrganization();
          if (persistedOrg) {
            orgToSelect =
              memberOrganizations.find((org) => org.id === persistedOrg.id) ||
              null;
            if (orgToSelect) {
              console.log(
                "Auto-selecting from localStorage:",
                orgToSelect.name
              );
            }
          }
        }

        // PRIORITY 3: Default to first organization
        if (!orgToSelect) {
          orgToSelect = memberOrganizations[0];
          console.log("Auto-selecting first organization:", orgToSelect.name);
        }

        console.log(
          "Final auto-selection:",
          orgToSelect.name,
          "with role:",
          orgToSelect.userRole
        );
        get().setSelectedOrganization(orgToSelect);
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
      set({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load organizations",
      });
    }
  },

  // Set selected organization with persistence (localStorage + backend)
  setSelectedOrganization: async (organization) => {
    const { selectedOrganization: currentSelected, authToken } = get();

    console.log("Setting selected organization:", organization?.name || "none");

    // Check if organization is actually changing
    const isActualChange = organization?.id !== currentSelected?.id;

    set({ selectedOrganization: organization });

    // Persist to localStorage
    get().persistSelectedOrganization(organization);

    // Only persist to backend if the organization is actually changing
    if (authToken && isActualChange) {
      try {
        await updateProfile(authToken, {
          currentOrgId: organization?.id || null,
        });
        console.log(
          "✅ Successfully persisted current org to backend:",
          organization?.id
        );
      } catch (error) {
        console.error("❌ Failed to persist current org to backend:", error);
        // Don't throw - localStorage persistence is still useful as fallback
      }
    } else if (!isActualChange) {
      console.log(
        "⏭️  Skipping backend persistence - org unchanged:",
        organization?.id
      );
    } else {
      console.warn("⚠️ No auth token available, skipping backend persistence");
    }
  },

  // Select organization by ID
  selectOrganizationById: (organizationId: string) => {
    const { organizations } = get();
    const organization = organizations.find((org) => org.id === organizationId);
    if (organization) {
      get().setSelectedOrganization(organization);
    }
  },

  // Clear all organization data
  clearOrganizations: () => {
    set({
      organizations: [],
      selectedOrganization: null,
      loading: false,
      error: null,
    });
    localStorage.removeItem(STORAGE_KEY);
  },

  // Get default organization (first one)
  getDefaultOrganization: () => {
    const { organizations } = get();
    return organizations.length > 0 ? organizations[0] : null;
  },

  // Persist selected organization to localStorage
  persistSelectedOrganization: (organization) => {
    try {
      if (organization) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            id: organization.id,
            name: organization.name,
            owner_id: organization.owner_id,
          })
        );
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.warn("Failed to persist selected organization:", error);
    }
  },

  // Load persisted organization from localStorage
  loadPersistedOrganization: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Organization) : null;
    } catch (error) {
      console.warn("Failed to load persisted organization:", error);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },
}));

// Expose store on window object for E2E testing (development/test only)
if (
  typeof window !== "undefined" &&
  (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")
) {
  (window as any).useOrganizationStore = useOrganizationStore;
}
