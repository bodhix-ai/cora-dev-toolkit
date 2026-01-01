"use client";

import { useState, useEffect, useCallback } from "react";
import { createAuthenticatedClient, CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";
import { useUser } from "../contexts/UserContext";
import { createOrgModuleClient, OrgModuleApiClient } from "../lib/api";
import { OrgMember, InviteMemberInput } from "../types";

async function getApiClient(
  authAdapter: CoraAuthAdapter
): Promise<OrgModuleApiClient | null> {
  if (!authAdapter) return null;
  const token = await authAdapter.getToken();
  if (!token) return null;
  return createOrgModuleClient(createAuthenticatedClient(token));
}

export function useOrgMembers(orgId: string | null) {
  const { authAdapter, isAuthenticated } = useUser();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!isAuthenticated || !orgId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const api = await getApiClient(authAdapter);
      if (!api) throw new Error("Could not create API client");
      const response = await api.getMembers(orgId);
      if (response.success) {
        setMembers(response.data);
      } else {
        setError(response.error || "Failed to fetch members");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch members");
      console.error("Error fetching members:", err);
    } finally {
      setLoading(false);
    }
  }, [authAdapter, orgId, isAuthenticated]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const inviteMember = useCallback(
    async (data: InviteMemberInput) => {
      if (!orgId) return null;

      try {
        const api = await getApiClient(authAdapter);
        if (!api) throw new Error("Could not create API client");
        const response = await api.inviteMember(orgId, data);
        if (response.success) {
          await fetchMembers();
          return response.data;
        } else {
          setError(response.error || "Failed to invite member");
          return null;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to invite member"
        );
        throw err;
      }
    },
    [authAdapter, orgId, fetchMembers]
  );

  const updateMemberRole = useCallback(
    async (memberId: string, role: string) => {
      if (!orgId) return null;

      try {
        const api = await getApiClient(authAdapter);
        if (!api) throw new Error("Could not create API client");
        const response = await api.updateMemberRole(orgId, memberId, role);
        if (response.success) {
          await fetchMembers();
          return response.data;
        } else {
          setError(response.error || "Failed to update member role");
          return null;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update member role"
        );
        throw err;
      }
    },
    [authAdapter, orgId, fetchMembers]
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      if (!orgId) return false;

      try {
        const api = await getApiClient(authAdapter);
        if (!api) throw new Error("Could not create API client");
        const response = await api.removeMember(orgId, memberId);
        if (response.success) {
          await fetchMembers();
          return true;
        } else {
          setError(response.error || "Failed to remove member");
          return false;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove member"
        );
        throw err;
      }
    },
    [authAdapter, orgId, fetchMembers]
  );

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
    inviteMember,
    updateMemberRole,
    removeMember,
  };
}
