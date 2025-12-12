import type { paths, components } from "./openapi-types";

// Define a more specific type for the organization, suitable for both creation and retrieval
export type Organization =
  paths["/organizations"]["get"]["responses"]["200"]["content"]["application/json"][number] & {
    owner_name?: string;
    created_at: string;
    updated_at: string;
  };

export type Profile =
  paths["/profile"]["patch"]["responses"]["200"]["content"]["application/json"] & {
    organizations?: { id: string; name: string }[];
    org_members?: Member[];
    global_role?: string;
    current_org_id?: string | null;
  };

export type Project = components["schemas"]["Project"] & {
  is_favorited?: boolean;
  favorited_at?: string;
  user_role?: "owner" | "admin" | "user";
  chat_count?: number;
};
export type ProjectMember = components["schemas"]["ProjectMember"];

// Organization role type definition
export type OrgRole = "org_user" | "org_admin" | "org_owner";

export type Member = {
  org_id?: string;
  user_id: string;
  role: OrgRole | string; // Allow string for backwards compatibility
  profiles: {
    full_name: string;
    email: string;
    avatar_url?: string;
    phone?: string;
  };
  email?: string;
};

export type Invitation = {
  invited_email: string;
  token: string;
  role: OrgRole | string; // Allow string for backwards compatibility
  expires_at: string;
};

// Organization Profile Types
export type OrgProfile = {
  org_id: string;
  display_name: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  default_timezone: string;
  default_language: string;
  created_at: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

// Organization Config Types
export type OrgConfig = {
  org_id: string;
  subscription_tier: "basic" | "professional" | "enterprise";
  billing_email: string | null;
  max_knowledge_bases: number;
  max_documents_total: number;
  max_monthly_processing_gb: number;
  max_users: number;
  daily_processing_limit_gb: number;
  max_file_size_mb: number;
  max_search_results: number;
  max_context_tokens: number;
  processing_timeout_minutes: number;
  allowed_file_types: string[];
  available_embedding_models: string[];
  available_chunking_strategies: string[];
  feature_flags: Record<string, any>;
  created_at: string | null;
  updated_at: string | null;
  configured_by: string | null;
  can_edit?: boolean; // Added by backend to indicate if user can edit
};

// Get the base URL from environment variables
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" ? "/api" : "");

/**
 * Fetches all organizations for the authenticated user.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to an array of organization objects.
 */
/**
 * Fetches the user's profile.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the profile object.
 */
export async function getProfile(token: string): Promise<Profile> {
  const url = `${API_BASE}/profile`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      // Throw a detailed error from the API response
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as Profile;
  } catch (err) {
    if (!res.ok) {
      // If parsing fails but the status was bad, throw a generic error
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    // This case should ideally not be reached if the API always returns JSON
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

export async function getProfiles(token: string): Promise<Profile[]> {
  const url = `${API_BASE}/profiles`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      // Throw a detailed error from the API response
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as Profile[];
  } catch (err) {
    if (!res.ok) {
      // If parsing fails but the status was bad, throw a generic error
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    // This case should ideally not be reached if the API always returns JSON
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

export async function getOrganizations(
  token: string,
  scope?: "user"
): Promise<Organization[]> {
  let url = `${API_BASE}/organizations`;
  if (scope) {
    url += `?scope=${scope}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  // Robust error handling
  const responseText = await res.text();

  if (!res.ok) {
    // Try to parse error response JSON
    let errorMessage: string;
    try {
      const json = JSON.parse(responseText);
      errorMessage = json.error || `Request failed with status ${res.status}`;
    } catch (parseErr) {
      // If JSON parsing fails, use the raw response
      errorMessage = `${res.status} - ${responseText}`;
    }
    throw new Error(`API Error: ${errorMessage}`);
  }

  // Success case - parse the JSON response
  try {
    return JSON.parse(responseText) as Organization[];
  } catch (parseErr) {
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Updates the user's profile.
 * @param token The user's JWT for authentication.
 * @param formData The profile data to update, including avatar.
 * @returns A promise that resolves to the updated profile object.
 */
export async function updateProfile(
  token: string,
  profileData: {
    full_name?: string;
    phone?: string;
    email?: string;
    currentOrgId?: string | null;
  }
): Promise<Profile> {
  console.log("[API Client] updateProfile called with:", {
    profileData,
    hasToken: !!token,
    tokenLength: token?.length,
  });

  // IMPORTANT: /profiles/me endpoint is on the CORA API Gateway, not the legacy gateway
  const CORA_API_BASE = process.env.NEXT_PUBLIC_CORA_API_URL || API_BASE;

  console.log("[API Client] Environment variables:", {
    NEXT_PUBLIC_CORA_API_URL: process.env.NEXT_PUBLIC_CORA_API_URL,
    CORA_API_BASE,
    API_BASE,
  });

  const url = `${CORA_API_BASE}/profiles/me`;

  console.log("[API Client] Full URL:", url);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify(profileData);

  console.log("[API Client] Sending PUT request to:", url);
  console.log("[API Client] Request body:", body);

  const res = await fetch(url, { method: "PUT", headers, body });

  console.log("[API Client] Response status:", res.status);
  console.log("[API Client] Response ok:", res.ok);

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      // Throw a detailed error from the API response
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as Profile;
  } catch (err) {
    if (!res.ok) {
      // If parsing fails but the status was bad, throw a generic error
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    // This case should ideally not be reached if the API always returns JSON
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Updates an organization.
 * @param orgId The ID of the organization to update.
 * @param name The new name of the organization.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the updated organization object.
 */
export async function updateOrganization(
  orgId: string,
  name: string,
  owner_id: string,
  token: string
): Promise<Organization> {
  const url = `${API_BASE}/organizations/${orgId}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify({ name, owner_id });

  const res = await fetch(url, { method: "PUT", headers, body });

  // Robust error handling
  const responseText = await res.text();

  if (!res.ok) {
    // Try to parse error response JSON
    let errorMessage: string;
    try {
      const json = JSON.parse(responseText);
      errorMessage = json.error || `Request failed with status ${res.status}`;
    } catch (parseErr) {
      // If JSON parsing fails, use the raw response
      errorMessage = `${res.status} - ${responseText}`;
    }
    throw new Error(`API Error: ${errorMessage}`);
  }

  // Success case - parse the JSON response
  try {
    return JSON.parse(responseText) as Organization;
  } catch (parseErr) {
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Fetches a single organization by its ID.
 * @param orgId The ID of the organization to fetch.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the organization object.
 */
export async function getOrganization(
  orgId: string,
  token: string
): Promise<Organization> {
  const url = `${API_BASE}/organizations/${orgId}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  // Robust error handling
  const responseText = await res.text();

  if (!res.ok) {
    // Try to parse error response JSON
    let errorMessage: string;
    try {
      const json = JSON.parse(responseText);
      errorMessage = json.error || `Request failed with status ${res.status}`;
    } catch (parseErr) {
      // If JSON parsing fails, use the raw response
      errorMessage = `${res.status} - ${responseText}`;
    }
    throw new Error(`API Error: ${errorMessage}`);
  }

  // Success case - parse the JSON response
  try {
    return JSON.parse(responseText) as Organization;
  } catch (parseErr) {
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Deletes an organization.
 * @param orgId The ID of the organization to delete.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves when the organization is deleted.
 */
export async function deleteOrganization(
  orgId: string,
  token: string
): Promise<void> {
  const url = `${API_BASE}/organizations/${orgId}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "DELETE", headers });

  if (!res.ok) {
    const responseText = await res.text();
    let errorMessage: string;
    try {
      const json = JSON.parse(responseText);
      errorMessage = json.error || `Request failed with status ${res.status}`;
    } catch (parseErr) {
      errorMessage = `${res.status} - ${responseText}`;
    }
    throw new Error(`API Error: ${errorMessage}`);
  }
}

/**
 * Fetches a single organization member by their ID.
 * @param orgId The ID of the organization to fetch the member from.
 * @param userId The ID of the user to fetch.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the member object.
 */
export async function getOrganizationMember(
  orgId: string,
  userId: string,
  token: string
): Promise<Member> {
  const url = `${API_BASE}/organizations/${orgId}/members/${userId}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      // Throw a detailed error from the API response
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as Member;
  } catch (err) {
    if (!res.ok) {
      // If parsing fails but the status was bad, throw a generic error
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    // This case should ideally not be reached if the API always returns JSON
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Fetches a single invitation by its ID.
 * @param invitationId The ID of the invitation to fetch.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the invitation object.
 */
export async function getInvitation(
  invitationId: string,
  token: string
): Promise<any> {
  const url = `${API_BASE}/invitations/${invitationId}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      // Throw a detailed error from the API response
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      // If parsing fails but the status was bad, throw a generic error
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    // This case should ideally not be reached if the API always returns JSON
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Fetches all members for an organization.
 * @param orgId The ID of the organization to fetch members for.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to an array of member objects.
 */
export async function getMembers(
  orgId: string,
  token: string
): Promise<{ members: Member[]; invitations: Invitation[] }> {
  const url = `${API_BASE}/organizations/${orgId}/members`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      // Throw a detailed error from the API response
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as { members: Member[]; invitations: Invitation[] };
  } catch (err) {
    if (!res.ok) {
      // If parsing fails but the status was bad, throw a generic error
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    // This case should ideally not be reached if the API always returns JSON
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Creates an invitation for a new member.
 * @param orgId The ID of the organization to invite the member to.
 * @param email The email of the new member.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the invitation link.
 */
export async function createInvitation(
  orgId: string,
  email: string,
  role: string,
  expires_at: string,
  token: string
): Promise<{ invitation_link: string }> {
  const url = `${API_BASE}/invitations`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify({
    org_id: orgId,
    email,
    role,
    expires_at,
  });

  const res = await fetch(url, { method: "POST", headers, body });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      // Throw a detailed error from the API response
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      // If parsing fails but the status was bad, throw a generic error
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    // This case should ideally not be reached if the API always returns JSON
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Adds a member to an organization.
 * @param orgId The ID of the organization to add the member to.
 * @param userId The ID of the user to add.
 * @param role The role of the new member.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves when the member is added.
 */
export async function addMember(
  orgId: string,
  userId: string,
  role: string,
  token: string
): Promise<void> {
  const url = `${API_BASE}/organizations/${orgId}/members`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify({ userId, role });

  const res = await fetch(url, { method: "POST", headers, body });

  if (!res.ok) {
    const responseText = await res.text();
    try {
      const json = JSON.parse(responseText);
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    } catch (err) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
  }
}

/**
 * Removes an invitation.
 * @param invitationToken The token of the invitation to remove.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves when the invitation is removed.
 */
export async function removeInvitation(
  invitationToken: string,
  token: string
): Promise<void> {
  const url = `${API_BASE}/invitations/${invitationToken}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "DELETE", headers });

  if (!res.ok) {
    const responseText = await res.text();
    try {
      const json = JSON.parse(responseText);
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    } catch (err) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
  }
}

/**
 * Removes a member from an organization.
 * @param orgId The ID of the organization to remove the member from.
 * @param userId The ID of the user to remove.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves when the member is removed.
 */
export async function removeMember(
  orgId: string,
  userId: string,
  token: string
): Promise<void> {
  const url = `${API_BASE}/organizations/${orgId}/members`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify({ userId });

  const res = await fetch(url, { method: "DELETE", headers, body });

  if (!res.ok) {
    const responseText = await res.text();
    try {
      const json = JSON.parse(responseText);
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    } catch (err) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
  }
}

/**
 * Updates a member's role in an organization.
 * @param orgId The ID of the organization.
 * @param userId The ID of the user to update.
 * @param role The new role for the member.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves when the member's role is updated.
 */
export async function updateMemberRole(
  orgId: string,
  userId: string,
  role: string,
  token: string
): Promise<void> {
  const url = `${API_BASE}/organizations/${orgId}/members/${userId}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify({ role });

  const res = await fetch(url, { method: "PATCH", headers, body });

  if (!res.ok) {
    const responseText = await res.text();
    try {
      const json = JSON.parse(responseText);
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    } catch (err) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
  }
}

/**
 * Invite a member to an organization by email.
 * @param orgId The ID of the organization.
 * @param email The email of the user to invite.
 * @param role The role for the invited member.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the invitation details.
 */
export async function inviteMemberByEmail(
  orgId: string,
  email: string,
  role: string,
  token: string
): Promise<{
  message: string;
  type?: "direct_add" | "invitation";
  invitation?: Invitation;
  user_id?: string;
}> {
  const url = `${API_BASE}/organizations/${orgId}/members/invite`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify({ email, role });

  const res = await fetch(url, { method: "POST", headers, body });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Cancel a pending invitation by email.
 * @param orgId The ID of the organization.
 * @param email The email of the invited user.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves when the invitation is cancelled.
 */
export async function cancelInvitationByEmail(
  orgId: string,
  email: string,
  token: string
): Promise<{ message: string }> {
  const url = `${API_BASE}/organizations/${orgId}/invitations/${encodeURIComponent(email)}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "DELETE", headers });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Resend a pending invitation by email.
 * @param orgId The ID of the organization.
 * @param email The email of the invited user.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the updated invitation.
 */
export async function resendInvitationByEmail(
  orgId: string,
  email: string,
  token: string
): Promise<{ message: string; invitation: Invitation }> {
  const url = `${API_BASE}/organizations/${orgId}/invitations/${encodeURIComponent(email)}/resend`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "POST", headers });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Creates a new organization for the authenticated user.
 * @param name The name of the new organization.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the newly created organization object.
 */
export async function createOrganization(
  name: string,
  token: string,
  owner_id: string
): Promise<Organization> {
  const url = `${API_BASE}/organizations`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify({ name, owner_id });

  const res = await fetch(url, { method: "POST", headers, body });

  // Robust error handling
  const responseText = await res.text();

  if (!res.ok) {
    // Try to parse error response JSON
    let json;
    try {
      json = JSON.parse(responseText);
    } catch (parseErr) {
      // If JSON parsing fails, create a generic error
      const error = new Error(
        `API Error: ${res.status} - ${responseText}`
      ) as any;
      error.response = {
        status: res.status,
        data: { error: responseText },
      };
      throw error;
    }

    // JSON parsing succeeded, create structured error
    const error = new Error(
      `API Error: ${json.error || `Request failed with status ${res.status}`}`
    ) as any;
    error.response = {
      status: res.status,
      data: json,
    };
    throw error;
  }

  // Success case - parse the JSON response
  try {
    return JSON.parse(responseText) as Organization;
  } catch (parseErr) {
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Fetches all projects for the authenticated user.
 * @param token The user's JWT for authentication.
 * @param organizationId The ID of the organization to fetch projects for.
 * @returns A promise that resolves to an array of project objects.
 */
export async function getProjects(
  token: string,
  organizationId: string
): Promise<Project[]> {
  const url = `${API_BASE}/projects?org_id=${organizationId}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      // Throw a detailed error from the API response
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as Project[];
  } catch (err) {
    if (!res.ok) {
      // If parsing fails but the status was bad, throw a generic error
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    // This case should ideally not be reached if the API always returns JSON
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

// Enhanced Projects API with Favorites Filtering and Sorting

export type ProjectsFilterOptions = {
  favoritesOnly?: boolean;
  favoritesFirst?: boolean;
  sortBy?: "name" | "created_at" | "updated_at" | "favorites_first";
  groupByFavorites?: boolean;
};

export type EnhancedProjectsResponse = {
  projects: Project[];
  favorites: Project[];
  others: Project[];
  totalCount: number;
  favoriteCount: number;
};

/**
 * Fetches projects with enhanced filtering and sorting options.
 * @param token The user's JWT for authentication.
 * @param organizationId The ID of the organization to fetch projects for.
 * @param options Optional filtering and sorting parameters.
 * @returns A promise that resolves to projects or enhanced response based on grouping.
 */
export async function getProjectsWithFavoritesEnhancement(
  token: string,
  organizationId: string,
  options: ProjectsFilterOptions = {}
): Promise<Project[] | EnhancedProjectsResponse> {
  const params = new URLSearchParams();
  params.append("org_id", organizationId);

  if (options.favoritesOnly !== undefined) {
    params.append("favorites_only", options.favoritesOnly.toString());
  }
  if (options.favoritesFirst !== undefined) {
    params.append("favorites_first", options.favoritesFirst.toString());
  }
  if (options.sortBy) {
    params.append("sort_by", options.sortBy);
  }
  if (options.groupByFavorites !== undefined) {
    params.append("group_by_favorites", options.groupByFavorites.toString());
  }

  const url = `${API_BASE}/projects?${params.toString()}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }

    // If groupByFavorites was requested, return the enhanced response structure
    if (options.groupByFavorites) {
      return json as EnhancedProjectsResponse;
    }

    // Otherwise return the projects array
    return json as Project[];
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

// Organization Profile & Config API Functions

/**
 * Get organization profile (branding, display info).
 * @param organizationId The ID of the organization.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the organization profile.
 */
export async function getOrganizationProfile(
  organizationId: string,
  token: string
): Promise<OrgProfile> {
  const url = `${API_BASE}/organizations/${organizationId}/profile`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as OrgProfile;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Update organization profile.
 * @param organizationId The ID of the organization.
 * @param profileData The profile data to update.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the updated organization profile.
 */
export async function updateOrganizationProfile(
  organizationId: string,
  profileData: {
    display_name?: string;
    description?: string;
    logo_base64?: string;
    website_url?: string;
    default_timezone?: string;
    default_language?: string;
  },
  token: string
): Promise<{ message: string; profile: OrgProfile }> {
  const url = `${API_BASE}/organizations/${organizationId}/profile`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify(profileData);

  const res = await fetch(url, { method: "PUT", headers, body });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Get organization configuration (subscription tier, quotas).
 * @param organizationId The ID of the organization.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the organization config.
 */
export async function getOrganizationConfig(
  organizationId: string,
  token: string
): Promise<OrgConfig> {
  const url = `${API_BASE}/organizations/${organizationId}/config`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as OrgConfig;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Update organization configuration.
 * @param organizationId The ID of the organization.
 * @param configData The configuration data to update.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the updated organization config.
 */
export async function updateOrganizationConfig(
  organizationId: string,
  configData: {
    subscription_tier?: "basic" | "professional" | "enterprise";
    billing_email?: string;
    max_knowledge_bases?: number;
    max_documents_total?: number;
    max_monthly_processing_gb?: number;
    max_users?: number;
    daily_processing_limit_gb?: number;
    max_file_size_mb?: number;
    max_search_results?: number;
    max_context_tokens?: number;
    processing_timeout_minutes?: number;
    allowed_file_types?: string[];
    available_embedding_models?: string[];
    available_chunking_strategies?: string[];
    feature_flags?: Record<string, any>;
  },
  token: string
): Promise<{ message: string; config: OrgConfig }> {
  const url = `${API_BASE}/organizations/${organizationId}/config`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify(configData);

  const res = await fetch(url, { method: "PUT", headers, body });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Creates a new project for the authenticated user.
 * @param name The name of the new project.
 * @param description The description of the new project.
 * @param token The user's JWT for authentication.
 * @param organizationId The ID of the organization to create the project in.
 * @returns A promise that resolves to the newly created project object.
 */
export async function createProject(
  name: string,
  description: string,
  token: string,
  organizationId: string
): Promise<Project> {
  const url = `${API_BASE}/projects`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify({
    name,
    description,
    org_id: organizationId,
  });

  const res = await fetch(url, { method: "POST", headers, body });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      // Throw a detailed error from the API response
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as Project;
  } catch (err) {
    if (!res.ok) {
      // If parsing fails but the status was bad, throw a generic error
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    // This case should ideally not be reached if the API always returns JSON
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Fetches a single project by its ID.
 * @param projectId The ID of the project to fetch.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the project object.
 */
export async function getProject(
  projectId: string,
  token: string
): Promise<Project> {
  const url = `${API_BASE}/projects/${projectId}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      // Throw a detailed error from the API response
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as Project;
  } catch (err) {
    if (!res.ok) {
      // If parsing fails but the status was bad, throw a generic error
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    // This case should ideally not be reached if the API always returns JSON
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Updates a project.
 * @param projectId The ID of the project to update.
 * @param name The new name of the project.
 * @param description The new description of the project.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the updated project object.
 */
export async function updateProject(
  projectId: string,
  projectData: { name?: string; description?: string },
  token: string
): Promise<Project> {
  const url = `${API_BASE}/projects/${projectId}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify(projectData);

  const res = await fetch(url, { method: "PATCH", headers, body });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      // Throw a detailed error from the API response
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as Project;
  } catch (err) {
    if (!res.ok) {
      // If parsing fails but the status was bad, throw a generic error
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    // This case should ideally not be reached if the API always returns JSON
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Provisions a user in the backend and returns their full profile.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the user's profile object.
 */
export async function provisionUser(token: string): Promise<Profile> {
  const url = `${API_BASE}/identities/provision`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "POST", headers });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as Profile;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Deletes a project.
 * @param projectId The ID of the project to delete.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves when the project is deleted.
 */
export async function deleteProject(
  projectId: string,
  token: string
): Promise<void> {
  const url = `${API_BASE}/projects/${projectId}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "DELETE", headers });

  if (!res.ok) {
    const responseText = await res.text();
    try {
      const json = JSON.parse(responseText);
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    } catch (err) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
  }
}

export async function getProjectMembers(
  projectId: string,
  token: string
): Promise<ProjectMember[]> {
  const url = `${API_BASE}/projects/${projectId}/members`;
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const res = await fetch(url, { method: "GET", headers });
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      throw new Error(`API Error: ${json.error || res.status}`);
    }
    return json as ProjectMember[];
  } catch (err) {
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: string,
  token: string
): Promise<ProjectMember> {
  const url = `${API_BASE}/projects/${projectId}/members`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const body = JSON.stringify({ user_id: userId, role });
  const res = await fetch(url, { method: "POST", headers, body });
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      throw new Error(`API Error: ${json.error || res.status}`);
    }
    return json as ProjectMember;
  } catch (err) {
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

export async function removeProjectMember(
  projectId: string,
  memberId: string,
  token: string
): Promise<void> {
  const url = `${API_BASE}/projects/${projectId}/members/${memberId}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const res = await fetch(url, { method: "DELETE", headers });
  if (!res.ok) {
    const responseText = await res.text();
    try {
      const json = JSON.parse(responseText);
      throw new Error(`API Error: ${json.error || res.status}`);
    } catch (err) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
  }
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: string,
  token: string
): Promise<ProjectMember> {
  const url = `${API_BASE}/projects/${projectId}/members/${userId}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const body = JSON.stringify({ role });
  const res = await fetch(url, { method: "PATCH", headers, body });
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      throw new Error(`API Error: ${json.error || res.status}`);
    }
    return json as ProjectMember;
  } catch (err) {
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Toggles a project's favorite status for the current user.
 * @param projectId The ID of the project to toggle favorite status for.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the new favorite status.
 */
export async function toggleProjectFavorite(
  projectId: string,
  token: string
): Promise<{ is_favorited: boolean; project_id: string }> {
  const url = `${API_BASE}/projects/${projectId}/favorite`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch(url, { method: "POST", headers });
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      throw new Error(`API Error: ${json.error || res.status}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Gets all favorite projects for the current user.
 * @param token The user's JWT for authentication.
 * @param organizationId Optional filter by organization ID.
 * @param limit Optional limit for number of results (default 50).
 * @param offset Optional offset for pagination (default 0).
 * @returns A promise that resolves to an array of favorite projects.
 */
export async function getFavoriteProjects(
  token: string,
  organizationId?: string,
  limit?: number,
  offset?: number
): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    org_id: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
    favorited_at: string;
    org_name: string;
  }>
> {
  let url = `${API_BASE}/projects/favorites`;

  const params = new URLSearchParams();
  if (organizationId) params.append("org_id", organizationId);
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());

  const paramString = params.toString();
  if (paramString) {
    url += `?${paramString}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch(url, { method: "GET", headers });
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      throw new Error(`API Error: ${json.error || res.status}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Gets all favorite chat sessions for the current user.
 * @param token The user's JWT for authentication.
 * @param organizationId Optional filter by organization ID.
 * @param limit Optional limit for number of results (default 50).
 * @param offset Optional offset for pagination (default 0).
 * @returns A promise that resolves to favorite chat sessions with pagination info.
 */
export async function getFavoriteChats(
  token: string,
  organizationId?: string,
  limit?: number,
  offset?: number
): Promise<{
  data: ChatSession[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}> {
  let url = `${API_BASE}/chat/favorites`;

  const params = new URLSearchParams();
  if (organizationId) params.append("org_id", organizationId);
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());

  const paramString = params.toString();
  if (paramString) {
    url += `?${paramString}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch(url, { method: "GET", headers });
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      throw new Error(`API Error: ${json.error || res.status}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

// Chat API Types
export type ChatMessage = {
  id: string;
  message: string;
  conversation_id?: string; // For backward compatibility
  session_id?: string;
  timestamp: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type ChatConversation = {
  conversation_id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
};

// Access type for chat sessions (how the user has access)
export type AccessType = "owner" | "direct_shared" | "project_shared";

// Permission level for direct shares
export type PermissionLevel = "read" | "comment" | "edit";

export type ChatSession = {
  id: string;
  title: string;
  knowledge_base_id: string;
  org_id: string;
  project_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_favorited?: boolean;
  favorited_at?: string;
  shared_with_project_members?: boolean;
  knowledge_bases?: {
    name: string;
    description?: string;
  };
  messages?: ChatSessionMessage[];

  // Access metadata from backend
  access_type?: AccessType;
  is_owner?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_add_messages?: boolean;
  can_share?: boolean;
  context_type?: "user" | "project";
  project_name?: string;

  // Direct share metadata (when user receives a direct share)
  // Standardized 4-field structure
  direct_share_permission?: PermissionLevel;
  direct_share_by_user_id?: string;
  direct_share_by_email?: string;
  direct_share_by_name?: string; // Full name of user who shared the chat

  // Project share metadata (when user receives via project sharing)
  // Standardized 4-field structure matching direct shares
  project_share_permission?: PermissionLevel; // Always "read" for project shares
  project_share_by_user_id?: string; // Chat owner's ID
  project_share_by_email?: string; // Chat owner's email
  project_share_by_name?: string; // Chat owner's full name

  // Dual access flag (user has both project/owner AND direct share access)
  has_direct_share_access?: boolean;

  // Outgoing shares flag (owner has shared with others)
  has_outgoing_shares?: boolean;
};

export type ChatSessionMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: any;
  created_at: string;
};

export type KnowledgeBase = {
  id: string;
  name: string;
  description?: string;
  scope: "organization" | "project";
  org_id: string;
  project_id?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type ChatRequest = {
  message: string;
  conversation_id?: string; // For backward compatibility (legacy)
  session_id?: string;
  knowledge_base_id?: string;
  context?: {
    org_name?: string;
    role?: string;
  };
};

/**
 * Send a chat message to ${project_display_name} AI.
 * @param message The user's message.
 * @param token The user's JWT for authentication.
 * @param conversationId Optional conversation ID for context.
 * @param context Optional user context for better responses.
 * @returns A promise that resolves to the chat response.
 */
export async function sendChatMessage(
  message: string,
  token: string,
  conversationId?: string,
  context?: { org_name?: string; role?: string }
): Promise<ChatMessage> {
  const url = `${API_BASE}/chat`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body: ChatRequest = {
    message,
    session_id: conversationId, // Fixed: use session_id instead of conversation_id
    context,
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as ChatMessage;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Send a streaming chat message to ${project_display_name} AI via WebSocket.
 * @param message The user's message.
 * @param token The user's JWT for authentication.
 * @param conversationId Optional conversation ID for context.
 * @param context Optional user context for better responses.
 * @param onChunk Callback function to handle streaming chunks.
 * @param onComplete Callback function when streaming is complete.
 * @param onError Callback function for error handling.
 * @returns A function to cancel the stream.
 */
export function sendChatMessageStream(
  message: string,
  token: string,
  conversationId: string | undefined,
  context: { org_name?: string; role?: string } | undefined,
  onChunk: (chunk: string) => void,
  onComplete: (finalMessage: ChatMessage) => void,
  onError: (error: Error) => void
): () => void {
  // Validate inputs before proceeding
  if (!token || token.trim() === "") {
    console.error("Invalid token provided to sendChatMessageStream:", token);
    onError(new Error("Authentication token is required"));
    return () => {};
  }

  if (!message || message.trim() === "") {
    console.error(
      "Invalid message provided to sendChatMessageStream:",
      message
    );
    onError(new Error("Message is required"));
    return () => {};
  }

  // WebSocket endpoint - replace with your actual WebSocket API Gateway URL
  const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "wss://localhost:3001";
  const wsUrl = `${WS_BASE}?token=${encodeURIComponent(token)}`;

  let websocket: WebSocket | null = null;
  let isCompleted = false;

  try {
    websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        onError(new Error("WebSocket connection lost during setup"));
        return;
      }

      // Send chat message with authentication token - ensure all required fields are present
      const chatMessage = {
        action: "chat_message",
        message: message,
        session_id: conversationId || undefined,
        context: context || {},
        token: token, // Explicitly include token in message for authentication
      };

      // Verify the message structure before sending
      if (!chatMessage.token) {
        console.error(
          "CRITICAL: Token missing from message after construction!"
        );
        onError(new Error("Token validation failed before sending"));
        return;
      }

      websocket.send(JSON.stringify(chatMessage));
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "session") {
          // Session created/confirmed - handled silently
        } else if (data.type === "chunk" && data.content) {
          // Streaming content chunk
          onChunk(data.content);
        } else if (data.type === "complete" && data.message) {
          // Streaming complete
          isCompleted = true;
          onComplete(data.message);

          // Close WebSocket connection
          if (websocket) {
            websocket.close();
          }
        } else if (data.type === "error") {
          // Error from server
          console.error("WebSocket server error:", data.error);
          onError(new Error(data.error || "Unknown streaming error"));
        }
      } catch (parseError) {
        console.error(
          "Failed to parse WebSocket message:",
          event.data,
          parseError
        );
        onError(new Error("Invalid message format received"));
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      if (!isCompleted) {
        onError(new Error("WebSocket connection error"));
      }
    };

    websocket.onclose = (event) => {
      if (!isCompleted && event.code !== 1000) {
        // Connection closed unexpectedly (not a normal close)
        onError(
          new Error(
            `WebSocket closed unexpectedly: ${event.code} ${event.reason}`
          )
        );
      }
    };
  } catch (error) {
    console.error("Failed to create WebSocket:", error);
    onError(
      error instanceof Error
        ? error
        : new Error("Failed to create WebSocket connection")
    );
  }

  // Return cancel function
  return () => {
    if (websocket) {
      websocket.close(1000, "User cancelled");
      websocket = null;
    }
  };
}

/**
 * Get chat history for a conversation.
 * @param conversationId The conversation ID.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the conversation history.
 */
export async function getChatHistory(
  conversationId: string,
  token: string
): Promise<ChatConversation> {
  const url = `${API_BASE}/chat/conversations/${conversationId}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as ChatConversation;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Get all chat conversations for the authenticated user.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to an array of conversations.
 */
export async function getChatConversations(
  token: string
): Promise<{ conversations: ChatConversation[]; total: number }> {
  const url = `${API_BASE}/chat/conversations`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  // Robust error handling
  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * List chat sessions for the authenticated user with organization context support.
 * @param token The user's JWT for authentication.
 * @param options Optional query parameters including organization context filters.
 * @returns A promise that resolves to an array of chat sessions.
 */
export async function listChatSessions(
  token: string,
  options?: {
    limit?: number;
    offset?: number;
    search?: string;
    org_id?: string;
    context_type?: "user" | "project" | "all";
  }
): Promise<{
  sessions: ChatSession[];
  total: number;
  limit: number;
  offset: number;
  filters?: {
    org_id?: string;
    context_type?: string;
    search?: string;
  };
}> {
  let url = `${API_BASE}/chat/sessions`;

  if (options) {
    const params = new URLSearchParams();
    if (options.limit) params.append("limit", options.limit.toString());
    if (options.offset) params.append("offset", options.offset.toString());
    if (options.search) params.append("search", options.search);
    if (options.org_id) params.append("org_id", options.org_id);
    if (options.context_type)
      params.append("context_type", options.context_type);

    const paramString = params.toString();
    if (paramString) {
      url += `?${paramString}`;
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Get a specific chat session with its messages.
 * @param sessionId The ID of the session to fetch.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the chat session with messages.
 */
export async function getChatSession(
  sessionId: string,
  token: string
): Promise<ChatSession> {
  const url = `${API_BASE}/chat/sessions/${sessionId}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as ChatSession;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Create a new chat session with organization and project context support.
 * @param token The user's JWT for authentication.
 * @param organizationId The organization context for the session (required).
 * @param title Optional title for the session.
 * @param projectId Optional project ID for project context sessions.
 * @param knowledgeBaseId Optional knowledge base ID (for future KB integration).
 * @returns A promise that resolves to the created chat session.
 */
export async function createChatSession(
  token: string,
  organizationId: string,
  title?: string,
  projectId?: string,
  knowledgeBaseId?: string
): Promise<ChatSession> {
  const url = `${API_BASE}/chat/sessions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify({
    title: title || undefined,
    org_id: organizationId,
    project_id: projectId || undefined,
    knowledge_base_id: knowledgeBaseId || undefined,
  });

  const res = await fetch(url, { method: "POST", headers, body });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as ChatSession;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Update a chat session (rename).
 * @param sessionId The ID of the session to update.
 * @param title The new title for the session.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the updated chat session.
 */
export async function updateChatSession(
  sessionId: string,
  title: string,
  token: string
): Promise<ChatSession> {
  const url = `${API_BASE}/chat/sessions/${sessionId}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify({ title });

  const res = await fetch(url, { method: "PATCH", headers, body });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as ChatSession;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Delete a chat session.
 * @param sessionId The ID of the session to delete.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves when the session is deleted.
 */
export async function deleteChatSession(
  sessionId: string,
  token: string
): Promise<void> {
  const url = `${API_BASE}/chat/sessions/${sessionId}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "DELETE", headers });

  if (!res.ok) {
    const responseText = await res.text();
    try {
      const json = JSON.parse(responseText);
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    } catch (err) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
  }
}

// Chat Direct Sharing API Types
export type ChatShare = {
  user_id: string;
  email: string;
  full_name: string; // User's full name
  permission_level: PermissionLevel;
  created_at: string;
  updated_at: string; // Last updated timestamp
};

// Project member sharing info (when chat is shared with project members)
export type ChatProjectMemberInfo = {
  user_id: string;
  email: string;
  full_name: string;
  role: string; // project role
  shared_at: string; // when project sharing was enabled
};

/**
 * Share a chat session with a specific user (direct sharing).
 * @param sessionId The ID of the chat session to share.
 * @param sharedWithEmail The email of the user to share with.
 * @param permissionLevel The permission level ('read', 'comment', or 'edit').
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the updated chat session.
 */
export async function shareChat(
  sessionId: string,
  sharedWithEmail: string,
  permissionLevel: PermissionLevel,
  token: string
): Promise<ChatSession> {
  const url = `${API_BASE}/chat/sessions/${sessionId}/share`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify({
    shared_with_email: sharedWithEmail,
    permission_level: permissionLevel,
  });

  const res = await fetch(url, { method: "POST", headers, body });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as ChatSession;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Update permission level for an existing chat share.
 * @param sessionId The ID of the chat session.
 * @param userId The ID of the user whose permission to update.
 * @param permissionLevel The new permission level ('read', 'comment', or 'edit').
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to a success message.
 */
export async function updateSharePermission(
  sessionId: string,
  userId: string,
  permissionLevel: PermissionLevel,
  token: string
): Promise<{ message: string }> {
  const url = `${API_BASE}/chat/sessions/${sessionId}/share/${userId}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify({ permission_level: permissionLevel });

  const res = await fetch(url, { method: "PATCH", headers, body });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Remove a chat share (unshare with specific user).
 * @param sessionId The ID of the chat session.
 * @param userId The ID of the user to unshare with.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves when the share is removed.
 */
export async function deleteShare(
  sessionId: string,
  userId: string,
  token: string
): Promise<void> {
  const url = `${API_BASE}/chat/sessions/${sessionId}/share/${userId}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "DELETE", headers });

  if (!res.ok) {
    const responseText = await res.text();
    try {
      const json = JSON.parse(responseText);
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    } catch (err) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
  }
}

/**
 * List all shares for a chat session (owner-only endpoint).
 * @param sessionId The ID of the chat session.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the list of shares, project members, and management permission.
 */
export async function listChatShares(
  sessionId: string,
  token: string
): Promise<{
  shares: ChatShare[];
  can_manage_shares: boolean;
  project_members?: ChatProjectMemberInfo[];
}> {
  const url = `${API_BASE}/chat/sessions/${sessionId}/shares`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Toggle project member sharing for a chat session.
 * @param sessionId The ID of the chat session.
 * @param enabled Whether to enable or disable project sharing.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the updated chat session.
 */
export async function toggleProjectMemberSharing(
  sessionId: string,
  enabled: boolean,
  token: string
): Promise<ChatSession> {
  const url = `${API_BASE}/chat/sessions/${sessionId}/sharing`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify({
    shared_with_project_members: enabled,
  });

  const res = await fetch(url, { method: "PATCH", headers, body });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json.data as ChatSession;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * List knowledge bases available to the authenticated user.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to an array of knowledge bases.
 */
export async function listKnowledgeBases(
  token: string
): Promise<{ knowledge_bases: KnowledgeBase[] }> {
  const url = `${API_BASE}/knowledge-bases`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Create a new knowledge base.
 * @param name The name of the knowledge base.
 * @param organizationId The ID of the organization.
 * @param token The user's JWT for authentication.
 * @param description Optional description.
 * @param scope The scope of the knowledge base ('organization' or 'project').
 * @param projectId Optional project ID (required if scope is 'project').
 * @returns A promise that resolves to the created knowledge base.
 */
export async function createKnowledgeBase(
  name: string,
  organizationId: string,
  token: string,
  description?: string,
  scope: "organization" | "project" = "organization",
  projectId?: string
): Promise<KnowledgeBase> {
  const url = `${API_BASE}/knowledge-bases`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify({
    name,
    description: description || undefined,
    scope,
    org_id: organizationId,
    project_id: projectId || undefined,
  });

  const res = await fetch(url, { method: "POST", headers, body });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as KnowledgeBase;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Send a chat message with session support.
 * @param message The user's message.
 * @param token The user's JWT for authentication.
 * @param sessionId Optional session ID for context.
 * @param knowledgeBaseId Optional knowledge base ID (required if no sessionId).
 * @param context Optional user context for better responses.
 * @returns A promise that resolves to the chat response.
 */
export async function sendChatMessageWithSession(
  message: string,
  token: string,
  sessionId?: string,
  knowledgeBaseId?: string,
  context?: { org_name?: string; role?: string }
): Promise<ChatMessage> {
  const url = `${API_BASE}/chat`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body: ChatRequest = {
    message,
    session_id: sessionId,
    knowledge_base_id: knowledgeBaseId,
    context,
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as ChatMessage;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

// RAG Configuration Types
export type RAGConfiguration = {
  // Document Processing
  max_file_size_mb: number;
  allowed_extensions: string[];
  virus_scanning: boolean;
  content_filtering: boolean;
  ocr_enabled: boolean;

  // Chunking Strategy
  chunking_strategy: string;
  target_chunk_size: number;
  min_chunk_size: number;
  max_chunk_size: number;
  overlap_percentage: number;
  preserve_structure: boolean;

  // Embedding
  embedding_model: string;
  dimensions: number;
  batch_size: number;
  max_tokens_per_chunk: number;

  // Search & Retrieval
  similarity_threshold: number;
  max_results_per_query: number;
  hybrid_search_enabled: boolean;
  hybrid_weights: { vector_similarity: number; text_relevance: number };
  reranking_enabled: boolean;
  cache_results: boolean;
  cache_ttl_minutes: number;

  // Context Generation
  max_context_tokens: number;
  citation_style: string;
  include_metadata: boolean;
  relevance_cutoff: number;
  max_sources_per_response: number;

  // Performance
  concurrent_processing_jobs: number;
  processing_timeout_minutes: number;
  rate_limiting: string;

  // Platform constraints
  max_search_results: number;
  allowed_file_types: string[];

  // Organization settings
  knowledge_bases_enabled: boolean;
  search_quality: "fast" | "balanced" | "comprehensive";
  default_similarity_threshold: number;
  max_results_per_search: number;
  preferred_embedding_model?: string;
  preferred_chunking_strategy?: string;

  // Metadata
  _resolved_at: string;
  _version: string;
};

export type RAGOrganizationSettings = {
  org_id: string;
  knowledge_bases_enabled: boolean;
  search_quality: "fast" | "balanced" | "comprehensive";
  default_similarity_threshold: number;
  max_results_per_search: number;
  citation_style: "inline" | "numbered" | "apa" | "mla";
  preferred_embedding_model?: string;
  preferred_chunking_strategy?: string;
  ocr_enabled: boolean;
  custom_config?: any;
  last_modified_by?: string;
  updated_at?: string;
};

export type UsageMetrics = {
  org_id: string;
  current_knowledge_bases: number;
  current_documents_total: number;
  current_users: number;
  monthly_document_uploads: number;
  monthly_processing_gb: number;
  monthly_api_calls: number;
  monthly_search_queries: number;
  daily_processing_gb: number;
  daily_api_calls: number;
  daily_search_queries: number;
  monthly_reset_date: string;
  daily_reset_timestamp: string;
  last_quota_warning_sent?: string;
  updated_at: string;
};

export type PlatformLimits = {
  org_id: string;
  subscription_tier: "basic" | "professional" | "enterprise";
  max_knowledge_bases: number;
  max_documents_total: number;
  max_users: number;
  max_monthly_processing_gb: number;
  daily_processing_limit_gb: number;
  monthly_api_call_limit: number;
  max_file_size_mb: number;
  max_search_results: number;
  max_context_tokens: number;
  processing_timeout_minutes: number;
  allowed_file_types: string[];
  available_embedding_models: string[];
  available_chunking_strategies: string[];
  feature_flags: any;
  billing_contact_email: string;
  contract_start_date: string;
  contract_end_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type QuotaStatus = {
  knowledge_bases?: {
    percentage_used: number;
    status: "ok" | "warning" | "critical";
    current: number;
    limit: number;
  };
  documents?: {
    percentage_used: number;
    status: "ok" | "warning" | "critical";
    current: number;
    limit: number;
  };
  monthly_processing?: {
    percentage_used: number;
    status: "ok" | "warning" | "critical";
    current: number;
    limit: number;
  };
  users?: {
    percentage_used: number;
    status: "ok" | "warning" | "critical";
    current: number;
    limit: number;
  };
  overall: "ok" | "warning" | "critical";
};

export type UsageData = {
  current_usage: UsageMetrics;
  limits: PlatformLimits;
  quota_status: QuotaStatus;
  next_reset_dates: {
    daily: string;
    monthly: string;
  };
};

/**
 * Get resolved RAG configuration for an organization.
 * @param organizationId The ID of the organization.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the organization's RAG configuration.
 */
export async function getOrganizationRAGConfig(
  organizationId: string,
  token: string
): Promise<RAGConfiguration> {
  const url = `${API_BASE}/organizations/${organizationId}/rag/config`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as RAGConfiguration;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Update organization RAG settings.
 * @param organizationId The ID of the organization.
 * @param settings The RAG settings to update.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the updated RAG configuration.
 */
export async function updateOrganizationRAGSettings(
  organizationId: string,
  settings: Partial<RAGOrganizationSettings>,
  token: string
): Promise<RAGConfiguration> {
  const url = `${API_BASE}/organizations/${organizationId}/rag/settings`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const body = JSON.stringify(settings);

  const res = await fetch(url, { method: "PUT", headers, body });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as RAGConfiguration;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}

/**
 * Get usage metrics and quota status for an organization.
 * @param organizationId The ID of the organization.
 * @param token The user's JWT for authentication.
 * @returns A promise that resolves to the organization's usage data.
 */
export async function getOrganizationUsageMetrics(
  organizationId: string,
  token: string
): Promise<UsageData> {
  const url = `${API_BASE}/organizations/${organizationId}/rag/usage`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { method: "GET", headers });

  const responseText = await res.text();
  try {
    const json = JSON.parse(responseText);
    if (!res.ok) {
      const errorMessage =
        json.error || `Request failed with status ${res.status}`;
      throw new Error(`API Error: ${errorMessage}`);
    }
    return json as UsageData;
  } catch (err) {
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} - ${responseText}`);
    }
    throw new Error(`Failed to parse API response: ${responseText}`);
  }
}
