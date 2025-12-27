import { useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useChatStore } from "@/store/chatStore";
import { createApiClient } from "@/lib/api-client";

export interface ChatAssociationState {
  [chatId: string]: {
    projectId?: string;
    sharedWithProjectMembers: boolean;
    isAssociating: boolean;
    isTogglingSharing: boolean;
    projectName?: string;
  };
}

export interface ChatProjectAssociationManager {
  associationState: ChatAssociationState;
  associateWithProject: (chatId: string, projectId: string) => Promise<void>;
  removeFromProject: (chatId: string) => Promise<void>;
  toggleSharing: (chatId: string, enabled: boolean) => Promise<void>;
  setAssociationState: (
    chatId: string,
    projectId?: string,
    sharedWithProjectMembers?: boolean,
    projectName?: string
  ) => void;
  initializeAssociations: (
    chats: Array<{
      id: string;
      project_id?: string;
      shared_with_project_members?: boolean;
      project?: { id: string; name: string };
    }>
  ) => void;
  isAssociating: (chatId: string) => boolean;
  isTogglingSharing: (chatId: string) => boolean;
  getProjectId: (chatId: string) => string | undefined;
  getProjectName: (chatId: string) => string | undefined;
  isShared: (chatId: string) => boolean;
}

/**
 * Hook for managing chat-project association state with optimistic updates
 * Handles project association, removal, and sharing toggle operations
 * Provides centralized state management for chat-project relationships
 */
export function useChatProjectAssociation(): ChatProjectAssociationManager {
  const { getToken } = useAuth();
  const [associationState, setAssociationState] =
    useState<ChatAssociationState>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize association state from chats data
  const initializeAssociations = useCallback(
    (
      chats: Array<{
        id: string;
        project_id?: string;
        shared_with_project_members?: boolean;
        project?: { id: string; name: string };
      }>
    ) => {
      const newState: ChatAssociationState = {};
      chats.forEach((chat) => {
        newState[chat.id] = {
          projectId: chat.project_id,
          sharedWithProjectMembers: chat.shared_with_project_members || false,
          isAssociating: false,
          isTogglingSharing: false,
          projectName: chat.project?.name,
        };
      });
      setAssociationState(newState);
    },
    []
  );

  // Set individual association state (useful for external updates)
  const setAssociationStateIndividual = useCallback(
    (
      chatId: string,
      projectId?: string,
      sharedWithProjectMembers?: boolean,
      projectName?: string
    ) => {
      setAssociationState((prev) => ({
        ...prev,
        [chatId]: {
          projectId,
          sharedWithProjectMembers: sharedWithProjectMembers || false,
          isAssociating: false,
          isTogglingSharing: false,
          projectName,
        },
      }));
    },
    []
  );

  // Associate chat with project
  const associateWithProject = useCallback(
    async (chatId: string, projectId: string) => {
      try {
        // Prevent multiple simultaneous requests for the same chat
        if (associationState[chatId]?.isAssociating) {
          return;
        }

        // Cancel any previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        // Optimistic update - immediately update UI
        setAssociationState((prev) => ({
          ...prev,
          [chatId]: {
            ...prev[chatId],
            projectId,
            isAssociating: true,
            sharedWithProjectMembers: false, // Default to not shared when associating
          },
        }));

        // Make API call
        const token = await getToken({ template: "policy-supabase" });
        if (!token) {
          throw new Error("Authentication token not available");
        }

        const client = createApiClient(token);
        const result = await client.put<{
          project_id: string;
          shared_with_project_members: boolean;
          project?: { name: string };
        }>(`/chat/sessions/${chatId}/project`, { project_id: projectId });

        // Update local state (backend returns complete session data including favorites)
        setAssociationState((prev) => ({
          ...prev,
          [chatId]: {
            ...prev[chatId],
            projectId: result.project_id,
            sharedWithProjectMembers:
              result.shared_with_project_members || false,
            isAssociating: false,
            projectName: result.project?.name,
          },
        }));
      } catch (error) {
        // Revert optimistic update on error
        setAssociationState((prev) => ({
          ...prev,
          [chatId]: {
            ...prev[chatId],
            projectId: prev[chatId]?.projectId,
            isAssociating: false,
          },
        }));

        // Re-throw error for component handling
        throw error;
      }
    },
    [associationState, getToken]
  );

  // Remove chat from project
  const removeFromProject = useCallback(
    async (chatId: string) => {
      try {
        // Prevent multiple simultaneous requests for the same chat
        if (associationState[chatId]?.isAssociating) {
          return;
        }

        // Cancel any previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        const previousState = associationState[chatId];

        // Optimistic update - immediately update UI
        setAssociationState((prev) => ({
          ...prev,
          [chatId]: {
            ...prev[chatId],
            projectId: undefined,
            sharedWithProjectMembers: false,
            isAssociating: true,
            projectName: undefined,
          },
        }));

        // Make API call
        const token = await getToken({ template: "policy-supabase" });
        if (!token) {
          throw new Error("Authentication token not available");
        }

        const client = createApiClient(token);
        await client.delete(`/chat/sessions/${chatId}/project`);

        // Update local state (backend returns complete session data including favorites)
        setAssociationState((prev) => ({
          ...prev,
          [chatId]: {
            ...prev[chatId],
            projectId: undefined,
            sharedWithProjectMembers: false,
            isAssociating: false,
            projectName: undefined,
          },
        }));
      } catch (error) {
        // Revert optimistic update on error
        setAssociationState((prev) => ({
          ...prev,
          [chatId]: {
            ...prev[chatId],
            projectId: prev[chatId]?.projectId,
            sharedWithProjectMembers:
              prev[chatId]?.sharedWithProjectMembers || false,
            isAssociating: false,
            projectName: prev[chatId]?.projectName,
          },
        }));

        // Re-throw error for component handling
        throw error;
      }
    },
    [associationState, getToken]
  );

  // Toggle sharing with project members
  const toggleSharing = useCallback(
    async (chatId: string, enabled: boolean) => {
      try {
        // Prevent multiple simultaneous requests for the same chat
        if (associationState[chatId]?.isTogglingSharing) {
          return;
        }

        // Cancel any previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        // Optimistic update - immediately update UI
        setAssociationState((prev) => ({
          ...prev,
          [chatId]: {
            ...prev[chatId],
            sharedWithProjectMembers: enabled,
            isTogglingSharing: true,
          },
        }));

        // Make API call
        const token = await getToken({ template: "policy-supabase" });
        if (!token) {
          throw new Error("Authentication token not available");
        }

        const client = createApiClient(token);
        const result = await client.patch<{
          shared_with_project_members: boolean;
        }>(`/chat/sessions/${chatId}/sharing`, {
          shared_with_project_members: enabled,
        });

        // Update local state (backend returns complete session data including favorites)
        setAssociationState((prev) => ({
          ...prev,
          [chatId]: {
            ...prev[chatId],
            sharedWithProjectMembers: result.shared_with_project_members,
            isTogglingSharing: false,
          },
        }));
      } catch (error) {
        // Revert optimistic update on error
        setAssociationState((prev) => ({
          ...prev,
          [chatId]: {
            ...prev[chatId],
            sharedWithProjectMembers:
              prev[chatId]?.sharedWithProjectMembers || false,
            isTogglingSharing: false,
          },
        }));

        // Re-throw error for component handling
        throw error;
      }
    },
    [associationState, getToken]
  );

  // Helper functions
  const isAssociating = useCallback(
    (chatId: string) => {
      return associationState[chatId]?.isAssociating || false;
    },
    [associationState]
  );

  const isTogglingSharing = useCallback(
    (chatId: string) => {
      return associationState[chatId]?.isTogglingSharing || false;
    },
    [associationState]
  );

  const getProjectId = useCallback(
    (chatId: string) => {
      return associationState[chatId]?.projectId;
    },
    [associationState]
  );

  const getProjectName = useCallback(
    (chatId: string) => {
      return associationState[chatId]?.projectName;
    },
    [associationState]
  );

  const isShared = useCallback(
    (chatId: string) => {
      return associationState[chatId]?.sharedWithProjectMembers || false;
    },
    [associationState]
  );

  return {
    associationState,
    associateWithProject,
    removeFromProject,
    toggleSharing,
    setAssociationState: setAssociationStateIndividual,
    initializeAssociations,
    isAssociating,
    isTogglingSharing,
    getProjectId,
    getProjectName,
    isShared,
  };
}
